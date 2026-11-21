"""
Test Suite for Feature STT 21: Sự kiện và chiến dịch Chủ Nhật Xanh (Green Sunday Campaigns & Events)
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 169 - 177)

Nguyên tắc cô lập dữ liệu (đã sửa lỗi rò rỉ dữ liệu test vào CSDL dev):
- Mọi User/Event/Checkin do test tạo ra đều được dọn sạch trong ``asyncTearDown``.
- User test dùng role CITIZEN (không còn gán nhầm role ADMIN role_id=1).

Danh sách ca kiểm thử:
1.  TC-01: Bắt buộc thời gian bắt đầu sau hiện tại ít nhất 24 giờ.
2.  TC-02: Số người tham gia tối đa trong khoảng 5 - 500.
3.  TC-03: Tiêu đề tối đa 100 ký tự, mô tả tối đa 2000 ký tự.
4.  TC-04: Tạo thành công - PENDING, người tạo là participant đầu tiên, version = 1.
5.  TC-05: Phân quyền hiển thị PENDING/REJECTED (chỉ người tạo & Admin).
6.  TC-06: Lọc theo quận/huyện và thời gian.
7.  TC-07: Toggle Quan tâm + chặn sự kiện đã kết thúc.
8.  TC-08: Toggle Tham gia / Huỷ tham gia.
9.  TC-09: Chặn tham gia khi đủ số người.
10. TC-10: Check-in hợp lệ - cộng 50 GP và ghi sổ cái.
11. TC-11: Chặn check-in ngoài bán kính / sai số GPS.
12. TC-12: Chặn check-in sai khung giờ hoặc lặp lại.
13. TC-13: Chỉnh sửa sự kiện - optimistic locking + quay lại PENDING + thông báo.
14. TC-14: Huỷ sự kiện - thông báo người tham gia, chặn tương tác sau huỷ.
15. TC-15: Giới hạn Điểm Xanh theo ngày (150 GP/ngày).
16. TC-16: Nhắc nhở sự kiện - chống gửi trùng (dedupe).
17. TC-17: Duyệt sự kiện - tạo thông báo cho người tạo.
18. TC-18: Quyền duyệt theo RBAC (CAMPAIGNS:UPDATE) - xem & lọc được sự kiện PENDING.
"""

import unittest
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import delete, select

from app.database import AsyncSessionLocal, engine
from app.models.event import (
    Event,
    EventCheckin,
    EventInterest,
    EventParticipant,
    EventStatus,
)
from app.models.notification import Notification
from app.models.rbac import Permission, Role, RolePermission, User
from app.schemas.event import CheckinRequest, EventCreate, EventReviewRequest, EventUpdate
from app.services.event_service import (
    DAILY_GP_CAP,
    EventService,
    calculate_haversine_distance,
    send_due_reminders,
)


class TestGreenSundayEventsFeature21(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử đơn vị và tích hợp cho Chức năng 21 (Sự kiện Chủ Nhật Xanh)."""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()
        self.service = EventService(self.session)
        self.notify_start = datetime.now(timezone.utc)
        self.user_ids = []
        self.temp_role_ids = []

        role_rows = (await self.session.execute(select(Role.role_code, Role.role_id))).all()
        self.roles = {code: rid for code, rid in role_rows}
        self.assertIn("CITIZEN", self.roles, "Thiếu role CITIZEN - hãy chạy seed RBAC trước khi test")

        self.user1 = await self._make_user("creator", "Nguyễn Văn Tạo", "CITIZEN", 100)
        self.user2 = await self._make_user("participant", "Trần Thị Tham Gia", "CITIZEN", 50)
        self.admin = await self._make_user("admin", "Quản Trị Viên", "ADMIN", 0)
        await self.session.commit()

    async def asyncTearDown(self):
        try:
            event_ids = (
                await self.session.execute(
                    select(Event.event_id).where(Event.creator_id.in_(self.user_ids))
                )
            ).scalars().all()
            if event_ids:
                for model in (EventParticipant, EventInterest, EventCheckin):
                    await self.session.execute(
                        delete(model).where(model.event_id.in_(event_ids))
                    )
                await self.session.execute(delete(Event).where(Event.event_id.in_(event_ids)))
            for model in (EventParticipant, EventInterest, EventCheckin):
                await self.session.execute(
                    delete(model).where(model.user_id.in_(self.user_ids))
                )
            await self.session.execute(
                delete(Notification).where(Notification.user_id.in_(self.user_ids))
            )
            # Dọn thông báo nhắc nhở có thể phát sinh cho dữ liệu seed trong lúc test
            await self.session.execute(
                delete(Notification).where(Notification.created_at >= self.notify_start)
            )
            await self.session.execute(delete(User).where(User.user_id.in_(self.user_ids)))
            # Dọn vai trò tạm dùng cho test phân quyền RBAC (sau khi đã xoá user)
            if self.temp_role_ids:
                await self.session.execute(
                    delete(RolePermission).where(RolePermission.role_id.in_(self.temp_role_ids))
                )
                await self.session.execute(
                    delete(Role).where(Role.role_id.in_(self.temp_role_ids))
                )
            await self.session.commit()
        finally:
            await self.session.close()
            await engine.dispose()

    async def _make_user(self, prefix: str, full_name: str, role_code: str, points: int) -> User:
        user = User(
            user_id=uuid.uuid4(),
            email=f"test_{prefix}_{uuid.uuid4().hex[:8]}@greenspot.vn",
            password_hash="$2b$12$dummyhashforunittestonly12345678901234567890",
            full_name=full_name,
            role_id=self.roles[role_code],
            status="active",
            total_green_points=points,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.session.add(user)
        self.user_ids.append(user.user_id)
        return user

    async def _make_role_with_permission(self, permission_code: str) -> Role:
        """Tạo vai trò tạm (dọn dẹp trong tearDown) gắn đúng 1 mã quyền RBAC."""
        perm_id = (
            await self.session.execute(
                select(Permission.permission_id).where(
                    Permission.permission_code == permission_code
                )
            )
        ).scalar_one_or_none()
        self.assertIsNotNone(
            perm_id,
            f"Thiếu quyền {permission_code} trong CSDL - hãy chạy seed RBAC trước khi test",
        )

        now = datetime.now(timezone.utc)
        role = Role(
            role_code=f"TEST_REVIEWER_{uuid.uuid4().hex[:6].upper()}",
            role_name="Kiểm duyệt viên thử nghiệm",
            description="Vai trò tạm chỉ dùng cho unit test Feature 21",
            is_system=False,
            scope="DISTRICT",
            version=1,
            created_at=now,
            updated_at=now,
        )
        self.session.add(role)
        await self.session.flush()

        self.temp_role_ids.append(role.role_id)
        self.session.add(RolePermission(role_id=role.role_id, permission_id=perm_id))
        await self.session.flush()
        return role

    async def _make_user_with_role(self, prefix: str, full_name: str, role_id: int) -> User:
        user = User(
            user_id=uuid.uuid4(),
            email=f"test_{prefix}_{uuid.uuid4().hex[:8]}@greenspot.vn",
            password_hash="$2b$12$dummyhashforunittestonly12345678901234567890",
            full_name=full_name,
            role_id=role_id,
            status="active",
            total_green_points=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.session.add(user)
        self.user_ids.append(user.user_id)
        return user

    async def _make_event(self, **overrides) -> Event:
        now = datetime.now(timezone.utc)
        data = dict(
            title=f"Sự kiện kiểm thử {uuid.uuid4().hex[:6]}",
            description="Mô tả sự kiện kiểm thử đủ dài theo quy định",
            cover_image_url="https://example.com/cover.jpg",
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2, hours=3),
            latitude=10.7735,
            longitude=106.7068,
            address="Công viên Tao Đàn, Quận 1",
            district="Quận 1",
            max_participants=50,
            current_participants=1,
            interested_count=0,
            creator_id=self.user1.user_id,
            status=EventStatus.APPROVED.value,
            checkin_radius_meters=100,
            version=1,
            is_deleted=False,
        )
        data.update(overrides)
        event = Event(**data)
        self.session.add(event)
        await self.session.flush()
        return event

    async def _add_participant(self, event: Event, user: User) -> EventParticipant:
        p = EventParticipant(
            id=uuid.uuid4(),
            event_id=event.event_id,
            user_id=user.user_id,
            is_creator=False,
            joined_at=datetime.now(timezone.utc),
        )
        self.session.add(p)
        return p

    # -------------------------------------------------------------------------
    # TC-01: Validation bắt buộc ngày giờ bắt đầu sau ít nhất 24 giờ
    # -------------------------------------------------------------------------
    async def test_tc01_validate_start_time_after_24_hours(self):
        now = datetime.now(timezone.utc)
        invalid_data = EventCreate(
            title="Chiến dịch dọn rác gấp trong ngày",
            description="Dọn dẹp nhanh rác thải khu vực công viên",
            cover_image_url="https://example.com/cover.jpg",
            start_time=now + timedelta(hours=2),
            latitude=10.7735,
            longitude=106.7068,
            address="Công viên Tao Đàn, Quận 1",
            district="Quận 1",
            max_participants=20,
        )

        with self.assertRaises(HTTPException) as ctx:
            await self.service.create_event(self.user1.user_id, invalid_data)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("24 giờ", ctx.exception.detail)

    # -------------------------------------------------------------------------
    # TC-02: Validation số người tham gia tối đa từ 5 đến 500
    # -------------------------------------------------------------------------
    async def test_tc02_validate_max_participants_range(self):
        now = datetime.now(timezone.utc)
        for invalid_value in (4, 501):
            with self.assertRaises(ValidationError):
                EventCreate(
                    title="Sự kiện kiểm thử quy mô",
                    description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
                    cover_image_url="https://example.com/cover.jpg",
                    start_time=now + timedelta(days=2),
                    latitude=10.7735,
                    longitude=106.7068,
                    address="Công viên Tao Đàn, Quận 1",
                    district="Quận 1",
                    max_participants=invalid_value,
                )

    # -------------------------------------------------------------------------
    # TC-03: Validation tiêu đề / mô tả (spec chỉ quy định max, không min 5)
    # -------------------------------------------------------------------------
    async def test_tc03_validate_title_and_description_length(self):
        now = datetime.now(timezone.utc)
        with self.assertRaises(ValidationError):
            EventCreate(
                title="A" * 101,
                description="Mô tả sự kiện hợp lệ",
                cover_image_url="https://example.com/cover.jpg",
                start_time=now + timedelta(days=2),
                latitude=10.7735,
                longitude=106.7068,
                address="Công viên Tao Đàn, Quận 1",
                district="Quận 1",
                max_participants=50,
            )

        with self.assertRaises(ValidationError):
            EventCreate(
                title="Tiêu đề hợp lệ",
                description="B" * 2001,
                cover_image_url="https://example.com/cover.jpg",
                start_time=now + timedelta(days=2),
                latitude=10.7735,
                longitude=106.7068,
                address="Công viên Tao Đàn, Quận 1",
                district="Quận 1",
                max_participants=50,
            )

        # Tiêu đề ngắn (1 ký tự) vẫn hợp lệ theo đặc tả
        short_title = EventCreate(
            title="A",
            description="Mô tả sự kiện hợp lệ",
            cover_image_url="https://example.com/cover.jpg",
            start_time=now + timedelta(days=2),
            latitude=10.7735,
            longitude=106.7068,
            address="Công viên Tao Đàn, Quận 1",
            district="Quận 1",
            max_participants=50,
        )
        self.assertEqual(short_title.title, "A")

        # Thời gian kết thúc phải sau thời gian bắt đầu
        with self.assertRaises(ValidationError):
            EventCreate(
                title="Sự kiện sai thời gian",
                description="Mô tả sự kiện hợp lệ",
                cover_image_url="https://example.com/cover.jpg",
                start_time=now + timedelta(days=2),
                end_time=now + timedelta(days=1),
                latitude=10.7735,
                longitude=106.7068,
                address="Công viên Tao Đàn, Quận 1",
                district="Quận 1",
                max_participants=50,
            )

    # -------------------------------------------------------------------------
    # TC-04: Tạo sự kiện thành công - PENDING & người tạo là participant đầu tiên
    # -------------------------------------------------------------------------
    async def test_tc04_create_event_success_defaults(self):
        now = datetime.now(timezone.utc)
        valid_data = EventCreate(
            title="Chủ Nhật Xanh Phường Bến Nghé",
            description="Chung tay thu gom rác thải nhựa và lá cây ven đường",
            cover_image_url="https://example.com/cover.jpg",
            start_time=now + timedelta(days=3),
            end_time=now + timedelta(days=3, hours=3),
            latitude=10.7735,
            longitude=106.7068,
            address="Công viên Bến Bạch Đằng, Quận 1",
            district="Quận 1",
            max_participants=50,
        )

        res = await self.service.create_event(self.user1.user_id, valid_data)
        self.assertEqual(res.status, EventStatus.PENDING.value)
        self.assertEqual(res.current_participants, 1)
        self.assertEqual(res.creator_id, self.user1.user_id)
        self.assertEqual(res.version, 1)
        self.assertFalse(res.is_ended)

        participants = await self.service.get_event_participants(
            res.event_id, viewer_id=self.user1.user_id
        )
        self.assertEqual(len(participants), 1)
        self.assertTrue(participants[0].is_creator)

    # -------------------------------------------------------------------------
    # TC-05: Phân quyền hiển thị sự kiện chưa duyệt
    # -------------------------------------------------------------------------
    async def test_tc05_event_visibility_by_status(self):
        ev_pending = await self._make_event(status=EventStatus.PENDING.value)
        ev_approved = await self._make_event(status=EventStatus.APPROVED.value)
        await self.session.commit()

        public = await self.service.list_events(current_user_id=None)
        public_ids = {e.event_id for e in public.items}
        self.assertNotIn(ev_pending.event_id, public_ids)
        self.assertIn(ev_approved.event_id, public_ids)

        mine = await self.service.list_events(
            current_user_id=self.user1.user_id, my_events=True
        )
        mine_ids = {e.event_id for e in mine.items}
        self.assertIn(ev_pending.event_id, mine_ids)
        self.assertIn(ev_approved.event_id, mine_ids)

        # Người ngoài không xem được chi tiết sự kiện PENDING (404, không lộ sự tồn tại)
        with self.assertRaises(HTTPException) as ctx:
            await self.service.get_event_detail(ev_pending.event_id, current_user_id=None)
        self.assertEqual(ctx.exception.status_code, 404)
        with self.assertRaises(HTTPException) as ctx2:
            await self.service.get_event_detail(
                ev_pending.event_id, current_user_id=self.user2.user_id
            )
        self.assertEqual(ctx2.exception.status_code, 404)

        # Người tạo và Admin xem được
        creator_view = await self.service.get_event_detail(
            ev_pending.event_id, current_user_id=self.user1.user_id
        )
        self.assertEqual(creator_view.status, EventStatus.PENDING.value)
        admin_view = await self.service.get_event_detail(
            ev_pending.event_id, current_user_id=self.admin.user_id
        )
        self.assertEqual(admin_view.event_id, ev_pending.event_id)

        # Admin lọc danh sách theo trạng thái phục vụ màn duyệt
        admin_pending = await self.service.list_events(
            current_user_id=self.admin.user_id, status_filter="PENDING"
        )
        self.assertIn(ev_pending.event_id, {e.event_id for e in admin_pending.items})

        # Người không có quyền duyệt không được lọc theo trạng thái (tránh lộ PENDING)
        with self.assertRaises(HTTPException) as ctx_status:
            await self.service.list_events(
                current_user_id=self.user2.user_id,
                status_filter="PENDING",
                can_review=False,
            )
        self.assertEqual(ctx_status.exception.status_code, 403)

    # -------------------------------------------------------------------------
    # TC-06: Lọc theo quận/huyện và thời gian
    # -------------------------------------------------------------------------
    async def test_tc06_filter_by_district_and_time(self):
        now = datetime.now(timezone.utc)
        ev_q1 = await self._make_event(district="Quận 1", start_time=now + timedelta(days=1))
        ev_bt = await self._make_event(
            district="Quận Bình Thạnh",
            start_time=now + timedelta(days=1),
            end_time=now + timedelta(days=1, hours=3),
        )
        await self._make_event(
            district="Quận 3",
            start_time=now - timedelta(days=5),
            end_time=now - timedelta(days=5) + timedelta(hours=3),
        )
        await self.session.commit()

        by_district = await self.service.list_events(district="Bình Thạnh")
        district_ids = {e.event_id for e in by_district.items}
        self.assertIn(ev_bt.event_id, district_ids)
        self.assertNotIn(ev_q1.event_id, district_ids)


        upcoming = await self.service.list_events(time_filter="upcoming")
        upcoming_ids = {e.event_id for e in upcoming.items}
        self.assertIn(ev_q1.event_id, upcoming_ids)
        self.assertIn(ev_bt.event_id, upcoming_ids)

        past = await self.service.list_events(time_filter="past")
        self.assertNotIn(ev_q1.event_id, {e.event_id for e in past.items})
        self.assertTrue(past.items)
        self.assertTrue(all(e.is_ended for e in past.items))

        # Tìm kiếm theo địa chỉ (không chỉ tiêu đề)
        by_address = await self.service.list_events(search="Tao Đàn")
        self.assertIn(ev_q1.event_id, {e.event_id for e in by_address.items})

    # -------------------------------------------------------------------------
    # TC-07: Toggle Quan tâm + chặn sự kiện đã kết thúc
    # -------------------------------------------------------------------------
    async def test_tc07_toggle_interest_and_block_ended(self):
        ev = await self._make_event()
        await self.session.commit()

        res1 = await self.service.toggle_interest(ev.event_id, self.user2.user_id)
        self.assertTrue(res1["is_interested"])
        self.assertEqual(res1["interested_count"], 1)

        res2 = await self.service.toggle_interest(ev.event_id, self.user2.user_id)
        self.assertFalse(res2["is_interested"])
        self.assertEqual(res2["interested_count"], 0)

        now = datetime.now(timezone.utc)
        ended = await self._make_event(
            start_time=now - timedelta(days=2),
            end_time=now - timedelta(days=2) + timedelta(hours=2),
        )
        await self.session.commit()
        with self.assertRaises(HTTPException) as ctx:
            await self.service.toggle_interest(ended.event_id, self.user2.user_id)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("kết thúc", ctx.exception.detail)

    # -------------------------------------------------------------------------
    # TC-08: Toggle Tham gia / Huỷ tham gia
    # -------------------------------------------------------------------------
    async def test_tc08_toggle_join(self):
        ev = await self._make_event(current_participants=1)
        await self.session.commit()

        joined = await self.service.toggle_join(ev.event_id, self.user2.user_id)
        self.assertTrue(joined["is_joined"])
        self.assertEqual(joined["current_participants"], 2)

        left = await self.service.toggle_join(ev.event_id, self.user2.user_id)
        self.assertFalse(left["is_joined"])
        self.assertEqual(left["current_participants"], 1)

        # Người tạo không thể tự huỷ tham gia
        self.session.add(
            EventParticipant(
                id=uuid.uuid4(),
                event_id=ev.event_id,
                user_id=self.user1.user_id,
                is_creator=True,
                joined_at=datetime.now(timezone.utc),
            )
        )
        await self.session.commit()
        with self.assertRaises(HTTPException) as ctx:
            await self.service.toggle_join(ev.event_id, self.user1.user_id)
        self.assertIn("người tổ chức", ctx.exception.detail)

    # -------------------------------------------------------------------------
    # TC-09: Chặn tham gia khi đủ số người
    # -------------------------------------------------------------------------
    async def test_tc09_block_join_when_full(self):
        ev = await self._make_event(max_participants=5, current_participants=5)
        await self.session.commit()

        with self.assertRaises(HTTPException) as ctx:
            await self.service.toggle_join(ev.event_id, self.user2.user_id)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("đủ số người", ctx.exception.detail)

    # -------------------------------------------------------------------------
    # TC-10: Check-in hợp lệ - +50 GP, lưu sổ cái, thông báo
    # -------------------------------------------------------------------------
    async def test_tc10_checkin_success_awards_points(self):
        now = datetime.now(timezone.utc)
        ev = await self._make_event(
            start_time=now - timedelta(minutes=30),
            end_time=now + timedelta(hours=2),
            latitude=10.773500,
            longitude=106.706800,
            current_participants=2,
        )
        await self._add_participant(ev, self.user2)
        await self.session.commit()

        req = CheckinRequest(latitude=10.773550, longitude=106.706850, accuracy=10.0)
        res = await self.service.checkin_event(ev.event_id, self.user2.user_id, req)

        self.assertTrue(res.success)
        self.assertLessEqual(res.distance_meters, 100.0)
        self.assertEqual(res.points_awarded, 50)
        self.assertEqual(res.total_green_points, 100)  # 50 ban đầu + 50
        self.assertEqual(res.daily_points_cap, DAILY_GP_CAP)

        record = (
            await self.session.execute(
                select(EventCheckin).where(
                    EventCheckin.event_id == ev.event_id,
                    EventCheckin.user_id == self.user2.user_id,
                )
            )
        ).scalar_one()
        self.assertEqual(record.points_awarded, 50)

        notif = (
            await self.session.execute(
                select(Notification).where(
                    Notification.user_id == self.user2.user_id,
                    Notification.notification_type == "EVENT_CHECKIN",
                )
            )
        ).scalars().all()
        self.assertTrue(notif)

    # -------------------------------------------------------------------------
    # TC-11: Chặn GPS ngoài bán kính 100m hoặc sai số > 50m
    # -------------------------------------------------------------------------
    async def test_tc11_block_checkin_out_of_radius_or_low_accuracy(self):
        now = datetime.now(timezone.utc)
        ev = await self._make_event(
            start_time=now - timedelta(minutes=15),
            latitude=10.773500,
            longitude=106.706800,
            current_participants=2,
        )
        await self._add_participant(ev, self.user2)
        await self.session.commit()

        req_far = CheckinRequest(latitude=10.793500, longitude=106.706800, accuracy=10.0)
        with self.assertRaises(HTTPException) as ctx_far:
            await self.service.checkin_event(ev.event_id, self.user2.user_id, req_far)
        self.assertEqual(ctx_far.exception.status_code, 400)
        self.assertIn("100m", ctx_far.exception.detail)

        req_inaccurate = CheckinRequest(
            latitude=10.773550, longitude=106.706850, accuracy=65.0
        )
        with self.assertRaises(HTTPException) as ctx_acc:
            await self.service.checkin_event(ev.event_id, self.user2.user_id, req_inaccurate)
        self.assertEqual(ctx_acc.exception.status_code, 400)
        self.assertIn("chính xác", ctx_acc.exception.detail)

    # -------------------------------------------------------------------------
    # TC-12: Chặn check-in sai khung giờ hoặc lặp lại
    # -------------------------------------------------------------------------
    async def test_tc12_block_checkin_wrong_time_or_duplicate(self):
        now = datetime.now(timezone.utc)
        ev_future = await self._make_event(
            start_time=now + timedelta(days=2),
            latitude=10.773500,
            longitude=106.706800,
            current_participants=2,
        )
        await self._add_participant(ev_future, self.user2)
        await self.session.commit()

        req = CheckinRequest(latitude=10.773500, longitude=106.706800, accuracy=10.0)
        with self.assertRaises(HTTPException) as ctx_time:
            await self.service.checkin_event(ev_future.event_id, self.user2.user_id, req)
        self.assertEqual(ctx_time.exception.status_code, 400)
        self.assertIn("thời gian check-in", ctx_time.exception.detail)

        # Đã qua cửa sổ 3 giờ sau giờ bắt đầu
        ev_old = await self._make_event(
            start_time=now - timedelta(hours=5),
            end_time=now - timedelta(hours=1),
            latitude=10.773500,
            longitude=106.706800,
            current_participants=2,
        )
        await self._add_participant(ev_old, self.user2)
        await self.session.commit()
        with self.assertRaises(HTTPException) as ctx_old:
            await self.service.checkin_event(ev_old.event_id, self.user2.user_id, req)
        self.assertEqual(ctx_old.exception.status_code, 400)
        self.assertIn("hết thời gian", ctx_old.exception.detail)

        # Check-in lặp lại
        ev_now = await self._make_event(
            start_time=now - timedelta(minutes=10),
            latitude=10.773500,
            longitude=106.706800,
            current_participants=2,
        )
        await self._add_participant(ev_now, self.user2)
        await self.session.commit()
        await self.service.checkin_event(ev_now.event_id, self.user2.user_id, req)
        with self.assertRaises(HTTPException) as ctx_dup:
            await self.service.checkin_event(ev_now.event_id, self.user2.user_id, req)
        self.assertIn("đã check-in", ctx_dup.exception.detail)

    # -------------------------------------------------------------------------
    # TC-13: Chỉnh sửa sự kiện - optimistic locking + quay lại PENDING
    # -------------------------------------------------------------------------
    async def test_tc13_update_event_optimistic_locking(self):
        ev = await self._make_event(status=EventStatus.APPROVED.value)
        await self._add_participant(ev, self.user2)
        ev.current_participants = 2
        await self.session.commit()

        new_start = datetime.now(timezone.utc) + timedelta(days=4)
        updated = await self.service.update_event(
            ev.event_id,
            self.user1.user_id,
            EventUpdate(
                version=1,
                title="Sự kiện đã chỉnh sửa tiêu đề",
                start_time=new_start,
                end_time=new_start + timedelta(hours=3),
            ),
        )
        self.assertEqual(updated.status, EventStatus.PENDING.value)
        self.assertEqual(updated.version, 2)
        self.assertEqual(updated.title, "Sự kiện đã chỉnh sửa tiêu đề")

        # Người tham gia nhận thông báo cập nhật
        notif = (
            await self.session.execute(
                select(Notification).where(
                    Notification.user_id == self.user2.user_id,
                    Notification.notification_type == "EVENT_UPDATED",
                )
            )
        ).scalars().all()
        self.assertTrue(notif)

        # Version cũ -> 409 Conflict
        with self.assertRaises(HTTPException) as ctx:
            await self.service.update_event(
                ev.event_id,
                self.user1.user_id,
                EventUpdate(version=1, title="Ghi đè bằng dữ liệu cũ"),
            )
        self.assertEqual(ctx.exception.status_code, 409)

        # Người ngoài không được sửa
        with self.assertRaises(HTTPException) as ctx_perm:
            await self.service.update_event(
                ev.event_id,
                self.user2.user_id,
                EventUpdate(version=2, title="Người ngoài sửa"),
            )
        self.assertEqual(ctx_perm.exception.status_code, 403)

    # -------------------------------------------------------------------------
    # TC-13b: Chỉnh sửa nội dung sự kiện diễn ra trong 24 giờ (không đổi giờ)
    # -------------------------------------------------------------------------
    async def test_tc13b_update_content_of_imminent_event(self):
        now = datetime.now(timezone.utc)
        same_start = now + timedelta(hours=6)
        ev = await self._make_event(
            status=EventStatus.APPROVED.value,
            start_time=same_start,
            end_time=now + timedelta(hours=9),
        )
        await self.session.commit()

        # Frontend luôn gửi kèm start_time hiện tại => backend phải so sánh giá trị
        # để không chặn nhầm việc chỉ sửa nội dung.
        updated = await self.service.update_event(
            ev.event_id,
            self.user1.user_id,
            EventUpdate(
                version=1,
                title="Đổi tiêu đề, giữ nguyên khung giờ cũ",
                start_time=same_start,
                end_time=now + timedelta(hours=9),
            ),
        )
        self.assertEqual(updated.title, "Đổi tiêu đề, giữ nguyên khung giờ cũ")
        self.assertEqual(updated.status, EventStatus.PENDING.value)
        self.assertEqual(updated.version, 2)

        # Nhưng nếu dời giờ bắt đầu vào trong 24 giờ tới thì bị chặn
        with self.assertRaises(HTTPException) as ctx_soon:
            await self.service.update_event(
                ev.event_id,
                self.user1.user_id,
                EventUpdate(version=2, start_time=now + timedelta(hours=2)),
            )
        self.assertEqual(ctx_soon.exception.status_code, 400)

    # -------------------------------------------------------------------------
    # TC-14: Huỷ sự kiện - thông báo người tham gia, chặn tương tác sau huỷ
    # -------------------------------------------------------------------------
    async def test_tc14_cancel_event_notifies_and_blocks(self):
        ev = await self._make_event(status=EventStatus.APPROVED.value)
        await self._add_participant(ev, self.user2)
        ev.current_participants = 2
        await self.session.commit()

        res = await self.service.cancel_event(ev.event_id, self.user1.user_id)
        self.assertTrue(res["success"])
        self.assertEqual(res["notified_count"], 1)

        notif = (
            await self.session.execute(
                select(Notification).where(
                    Notification.user_id == self.user2.user_id,
                    Notification.notification_type == "EVENT_CANCELLED",
                )
            )
        ).scalars().all()
        self.assertTrue(notif)

        with self.assertRaises(HTTPException) as ctx:
            await self.service.toggle_join(ev.event_id, self.user2.user_id)
        self.assertEqual(ctx.exception.status_code, 400)

        # Không thể huỷ 2 lần
        with self.assertRaises(HTTPException) as ctx_dup:
            await self.service.cancel_event(ev.event_id, self.user1.user_id)
        self.assertEqual(ctx_dup.exception.status_code, 400)

    # -------------------------------------------------------------------------
    # TC-15: Giới hạn Điểm Xanh theo ngày (150 GP/ngày)
    # -------------------------------------------------------------------------
    async def test_tc15_daily_points_cap(self):
        now = datetime.now(timezone.utc)
        # 3 check-in trước đó trong ngày = 150 GP (đã đạt hạn mức)
        for i in range(3):
            prev = await self._make_event(
                title=f"Sự kiện đã check-in {i}",
                start_time=now - timedelta(days=1),
                end_time=now - timedelta(days=1) + timedelta(hours=2),
            )
            self.session.add(
                EventCheckin(
                    id=uuid.uuid4(),
                    event_id=prev.event_id,
                    user_id=self.user2.user_id,
                    latitude=prev.latitude,
                    longitude=prev.longitude,
                    distance_meters=5.0,
                    accuracy_meters=5.0,
                    points_awarded=50,
                    checkin_time=now - timedelta(minutes=30 + i),
                )
            )

        target = await self._make_event(
            start_time=now - timedelta(minutes=10),
            latitude=10.773500,
            longitude=106.706800,
            current_participants=2,
        )
        await self._add_participant(target, self.user2)
        await self.session.commit()

        req = CheckinRequest(latitude=10.773500, longitude=106.706800, accuracy=10.0)
        res = await self.service.checkin_event(target.event_id, self.user2.user_id, req)
        self.assertTrue(res.success)
        self.assertEqual(res.points_awarded, 0)
        self.assertEqual(res.daily_points_earned, DAILY_GP_CAP)
        self.assertEqual(res.total_green_points, 50)  # không thay đổi

    # -------------------------------------------------------------------------
    # TC-16: Nhắc nhở sự kiện - chống gửi trùng (dedupe)
    # -------------------------------------------------------------------------
    async def test_tc16_event_reminders_are_deduplicated(self):
        now = datetime.now(timezone.utc)
        ev = await self._make_event(
            title="Sự kiện sắp diễn ra trong 2 giờ",
            start_time=now + timedelta(hours=2),
            end_time=now + timedelta(hours=5),
        )
        await self._add_participant(ev, self.user2)
        self.session.add(
            EventParticipant(
                id=uuid.uuid4(),
                event_id=ev.event_id,
                user_id=self.user1.user_id,
                is_creator=True,
                joined_at=now,
            )
        )
        ev.current_participants = 2
        await self.session.commit()


        first = await send_due_reminders(self.session)
        self.assertGreaterEqual(first, 2)

        reminders = (
            await self.session.execute(
                select(Notification).where(
                    Notification.notification_type == "EVENT_REMINDER_24H",
                    Notification.reference_id == f"{ev.event_id}:EVENT_REMINDER_24H",
                )
            )
        ).scalars().all()
        self.assertEqual(len(reminders), 2)  # người tạo + người tham gia

        second = await send_due_reminders(self.session)
        self.assertEqual(second, 0)

    # -------------------------------------------------------------------------
    # TC-17: Duyệt sự kiện - thông báo cho người tạo
    # -------------------------------------------------------------------------
    async def test_tc17_review_event_notifies_creator(self):
        ev = await self._make_event(status=EventStatus.PENDING.value)
        await self.session.commit()

        reviewed = await self.service.review_event(
            ev.event_id,
            self.admin.user_id,
            EventReviewRequest(status="APPROVED"),
        )
        self.assertEqual(reviewed.status, EventStatus.APPROVED.value)
        self.assertEqual(reviewed.version, 2)

        notif = (
            await self.session.execute(
                select(Notification).where(
                    Notification.user_id == self.user1.user_id,
                    Notification.notification_type == "EVENT_APPROVED",
                )
            )
        ).scalars().all()
        self.assertTrue(notif)

        # Từ chối bắt buộc có lý do
        with self.assertRaises(ValidationError):
            EventReviewRequest(status="REJECTED", reject_reason="")

    # -------------------------------------------------------------------------
    # TC-18: Quyền duyệt theo RBAC (CAMPAIGNS:UPDATE) - không chỉ ADMIN
    # -------------------------------------------------------------------------
    async def test_tc18_reviewer_permission_via_rbac(self):
        reviewer_role = await self._make_role_with_permission("CAMPAIGNS:UPDATE")
        reviewer = await self._make_user_with_role(
            "reviewer", "Lê Thị Kiểm Duyệt", reviewer_role.role_id
        )
        pending_ev = await self._make_event(status=EventStatus.PENDING.value)
        await self.session.commit()

        # Vai trò tạm có CAMPAIGNS:UPDATE nhưng không phải ADMIN
        self.assertFalse(await self.service.is_admin(reviewer.user_id))
        self.assertTrue(await self.service.can_review(reviewer.user_id))
        # Người dùng CITIZEN thường và khách vãng lai không có quyền duyệt
        self.assertFalse(await self.service.can_review(self.user2.user_id))
        self.assertFalse(await self.service.can_review(None))

        # Người duyệt xem được chi tiết sự kiện PENDING, người khác thì không (404)
        detail = await self.service.get_event_detail(
            pending_ev.event_id, current_user_id=reviewer.user_id
        )
        self.assertEqual(detail.event_id, pending_ev.event_id)
        with self.assertRaises(HTTPException) as ctx_detail:
            await self.service.get_event_detail(
                pending_ev.event_id, current_user_id=self.user2.user_id
            )
        self.assertEqual(ctx_detail.exception.status_code, 404)

        # Màn duyệt sự kiện: lọc theo trạng thái (không truyền can_review => tự suy ra)
        reviewer_pending = await self.service.list_events(
            current_user_id=reviewer.user_id,
            status_filter="PENDING",
            time_filter="all",
            page=1,
            page_size=50,
        )
        self.assertIn(pending_ev.event_id, {e.event_id for e in reviewer_pending.items})

        with self.assertRaises(HTTPException) as ctx_list:
            await self.service.list_events(
                current_user_id=self.user2.user_id,
                status_filter="PENDING",
                time_filter="all",
            )
        self.assertEqual(ctx_list.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()







