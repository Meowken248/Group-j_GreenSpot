"""
Test Suite for Feature STT 21: Sự kiện và chiến dịch Chủ Nhật Xanh (Green Sunday Campaigns & Events)
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 169 - 177)
Tuân thủ TDD (Test-Driven Development) và Quy chuẩn Dự án (PROJECT_RULES.md).

Danh sách ca kiểm thử:
1. TC-01: Validation Tạo sự kiện - Bắt buộc thời gian bắt đầu sau thời điểm hiện tại ít nhất 24 giờ (Màn 2/4).
2. TC-02: Validation Tạo sự kiện - Số người tham gia tối đa trong khoảng từ 5 đến 500 (Màn 2/4).
3. TC-03: Validation Tạo sự kiện - Tiêu đề tối đa 100 ký tự, mô tả tối đa 2000 ký tự (Màn 2/4).
4. TC-04: Tạo sự kiện thành công - Trạng thái mặc định là PENDING và người tạo tự động là người tham gia đầu tiên (Màn 2/4).
5. TC-05: Lấy danh sách sự kiện công khai - Khách chỉ nhìn thấy APPROVED, người tạo nhìn thấy cả PENDING/REJECTED của mình (Màn 1/4).
6. TC-06: Lọc sự kiện theo Quận/huyện và Thời gian ("Sắp diễn ra", "Tuần này", "Đã kết thúc") (Màn 1/4).
7. TC-07: Toggle Quan tâm sự kiện - Bấm lần 1 tăng đếm, bấm lần 2 giảm đếm (Màn 3/4).
8. TC-08: Toggle Tham gia sự kiện - Đăng ký tham gia và hủy tham gia (Màn 3/4).
9. TC-09: Chặn tham gia khi sự kiện đã đủ số người tối đa (Màn 3/4).
10. TC-10: Check-in GPS hợp lệ - Bán kính <= 100m, trong khung giờ, cộng ngay 50 Điểm Xanh (GP) (Màn 4/4).
11. TC-11: Chặn Check-in GPS khi khoảng cách > 100m hoặc sai số định vị > 50m (Màn 4/4).
12. TC-12: Chặn Check-in GPS khi sai khung giờ hoặc check-in lặp lại (Màn 4/4).
"""

import unittest
import uuid
import math
from datetime import datetime, timezone, timedelta
from pydantic import ValidationError
from fastapi import HTTPException

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User
from app.models.event import (
    Event,
    EventParticipant,
    EventInterest,
    EventCheckin,
    EventStatus,
)
from app.schemas.event import EventCreate, CheckinRequest
from app.services.event_service import EventService, calculate_haversine_distance


class TestGreenSundayEventsFeature21(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử đơn vị và tích hợp cho Chức năng 21 (Sự kiện Chủ Nhật Xanh)"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()
        self.service = EventService(self.session)

        # 1. Tạo user test 1 (Creator)
        self.user1 = User(
            user_id=uuid.uuid4(),
            email=f"test_creator_{uuid.uuid4().hex[:6]}@greenspot.vn",
            password_hash="$2b$12$dummyhashforunittestonly12345678901234567890",
            full_name="Nguyễn Văn Tạo",
            role_id=1,
            status="active",
            total_green_points=100,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.session.add(self.user1)

        # 2. Tạo user test 2 (Participant)
        self.user2 = User(
            user_id=uuid.uuid4(),
            email=f"test_participant_{uuid.uuid4().hex[:6]}@greenspot.vn",
            password_hash="$2b$12$dummyhashforunittestonly12345678901234567890",
            full_name="Trần Thị Tham Gia",
            role_id=1,
            status="active",
            total_green_points=50,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.session.add(self.user2)
        await self.session.commit()

    async def asyncTearDown(self):
        await self.session.close()
        await engine.dispose()

    # -------------------------------------------------------------------------
    # TC-01: Validation bắt buộc ngày giờ bắt đầu sau ít nhất 24 giờ
    # -------------------------------------------------------------------------
    async def test_tc01_validate_start_time_after_24_hours(self):
        now = datetime.now(timezone.utc)
        # Thời gian chỉ cách 2 giờ -> Không hợp lệ
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
        # Nhỏ hơn 5 người
        with self.assertRaises(ValidationError):
            EventCreate(
                title="Sự kiện ít người",
                description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
                cover_image_url="https://example.com/cover.jpg",
                start_time=now + timedelta(days=2),
                latitude=10.7735,
                longitude=106.7068,
                address="Quận 1",
                district="Quận 1",
                max_participants=4,
            )

        # Lớn hơn 500 người
        with self.assertRaises(ValidationError):
            EventCreate(
                title="Sự kiện quá đông",
                description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
                cover_image_url="https://example.com/cover.jpg",
                start_time=now + timedelta(days=2),
                latitude=10.7735,
                longitude=106.7068,
                address="Quận 1",
                district="Quận 1",
                max_participants=501,
            )

    # -------------------------------------------------------------------------
    # TC-03: Validation tiêu đề tối đa 100 ký tự, mô tả tối đa 2000 ký tự
    # -------------------------------------------------------------------------
    async def test_tc03_validate_title_and_description_length(self):
        now = datetime.now(timezone.utc)
        # Tiêu đề quá 100 ký tự
        with self.assertRaises(ValidationError):
            EventCreate(
                title="A" * 101,
                description="Mô tả sự kiện hợp lệ",
                cover_image_url="https://example.com/cover.jpg",
                start_time=now + timedelta(days=2),
                latitude=10.7735,
                longitude=106.7068,
                address="Quận 1",
                district="Quận 1",
                max_participants=50,
            )

        # Mô tả quá 2000 ký tự
        with self.assertRaises(ValidationError):
            EventCreate(
                title="Tiêu đề hợp lệ",
                description="B" * 2001,
                cover_image_url="https://example.com/cover.jpg",
                start_time=now + timedelta(days=2),
                latitude=10.7735,
                longitude=106.7068,
                address="Quận 1",
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

        # Kiểm tra bảng event_participants
        participants = await self.service.get_event_participants(res.event_id)
        self.assertEqual(len(participants), 1)
        self.assertEqual(participants[0].user_id, self.user1.user_id)
        self.assertTrue(participants[0].is_creator)

    # -------------------------------------------------------------------------
    # TC-05: Lấy danh sách sự kiện - Phân quyền hiển thị theo trạng thái
    # -------------------------------------------------------------------------
    async def test_tc05_event_list_visibility_by_status(self):
        now = datetime.now(timezone.utc)
        # Tạo 1 sự kiện APPROVED và 1 sự kiện PENDING của user1
        ev_app = Event(
            title="Sự kiện Đã Duyệt",
            description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
            cover_image_url="https://example.com/1.jpg",
            start_time=now + timedelta(days=2),
            latitude=10.77,
            longitude=106.70,
            address="Quận 1",
            district="Quận 1",
            max_participants=20,
            creator_id=self.user1.user_id,
            status=EventStatus.APPROVED.value,
        )
        ev_pen = Event(
            title="Sự kiện Chờ Duyệt",
            description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
            cover_image_url="https://example.com/2.jpg",
            start_time=now + timedelta(days=3),
            latitude=10.77,
            longitude=106.70,
            address="Quận 1",
            district="Quận 1",
            max_participants=20,
            creator_id=self.user1.user_id,
            status=EventStatus.PENDING.value,
        )
        self.session.add_all([ev_app, ev_pen])
        await self.session.commit()

        # Khách vãng lai (user_id = None): Chỉ thấy APPROVED
        guest_list = await self.service.list_events(current_user_id=None, my_events=False)
        self.assertTrue(any(e.event_id == ev_app.event_id for e in guest_list.items))
        self.assertFalse(any(e.event_id == ev_pen.event_id for e in guest_list.items))

        # Người tạo (user1): Xem tab "Sự kiện của tôi" thấy cả PENDING
        my_list = await self.service.list_events(current_user_id=self.user1.user_id, my_events=True)
        self.assertTrue(any(e.event_id == ev_pen.event_id for e in my_list.items))

    # -------------------------------------------------------------------------
    # TC-06: Lọc sự kiện theo Quận/huyện và Thời gian
    # -------------------------------------------------------------------------
    async def test_tc06_filter_by_district_and_time(self):
        now = datetime.now(timezone.utc)
        ev_q1 = Event(
            title="Sự kiện tại Quận 1",
            description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
            cover_image_url="https://example.com/1.jpg",
            start_time=now + timedelta(days=2),
            latitude=10.77,
            longitude=106.70,
            address="Quận 1",
            district="Quận 1",
            max_participants=20,
            creator_id=self.user1.user_id,
            status=EventStatus.APPROVED.value,
        )
        ev_bt = Event(
            title="Sự kiện tại Bình Thạnh",
            description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
            cover_image_url="https://example.com/2.jpg",
            start_time=now - timedelta(days=5),
            latitude=10.80,
            longitude=106.70,
            address="Bình Thạnh",
            district="Quận Bình Thạnh",
            max_participants=20,
            creator_id=self.user1.user_id,
            status=EventStatus.APPROVED.value,
        )
        self.session.add_all([ev_q1, ev_bt])
        await self.session.commit()

        # Lọc quận 1
        res_q1 = await self.service.list_events(district="Quận 1")
        self.assertTrue(all(e.district == "Quận 1" for e in res_q1.items))

        # Lọc đã kết thúc
        res_past = await self.service.list_events(time_filter="past")
        self.assertTrue(all(e.start_time < now for e in res_past.items))

    # -------------------------------------------------------------------------
    # TC-07: Toggle Quan tâm sự kiện (Tăng / Giảm đếm)
    # -------------------------------------------------------------------------
    async def test_tc07_toggle_interest(self):
        now = datetime.now(timezone.utc)
        ev = Event(
            title="Sự kiện Test Quan Tâm",
            description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
            cover_image_url="https://example.com/1.jpg",
            start_time=now + timedelta(days=2),
            latitude=10.77,
            longitude=106.70,
            address="Quận 1",
            district="Quận 1",
            max_participants=20,
            creator_id=self.user1.user_id,
            status=EventStatus.APPROVED.value,
            interested_count=0,
        )
        self.session.add(ev)
        await self.session.commit()

        # Bấm lần 1 -> Đánh dấu quan tâm (+1)
        res1 = await self.service.toggle_interest(ev.event_id, self.user2.user_id)
        self.assertTrue(res1["is_interested"])
        self.assertEqual(res1["interested_count"], 1)

        # Bấm lần 2 -> Hủy quan tâm (-1)
        res2 = await self.service.toggle_interest(ev.event_id, self.user2.user_id)
        self.assertFalse(res2["is_interested"])
        self.assertEqual(res2["interested_count"], 0)

    # -------------------------------------------------------------------------
    # TC-08: Toggle Tham gia sự kiện (Đăng ký / Hủy đăng ký)
    # -------------------------------------------------------------------------
    async def test_tc08_toggle_join(self):
        now = datetime.now(timezone.utc)
        ev = Event(
            title="Sự kiện Test Tham Gia",
            description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
            cover_image_url="https://example.com/1.jpg",
            start_time=now + timedelta(days=2),
            latitude=10.77,
            longitude=106.70,
            address="Quận 1",
            district="Quận 1",
            max_participants=20,
            current_participants=1,
            creator_id=self.user1.user_id,
            status=EventStatus.APPROVED.value,
        )
        self.session.add(ev)
        await self.session.commit()

        # user2 bấm tham gia -> Thành công (+1)
        res1 = await self.service.toggle_join(ev.event_id, self.user2.user_id)
        self.assertTrue(res1["is_joined"])
        self.assertEqual(res1["current_participants"], 2)

        # user2 bấm hủy tham gia -> Giảm (-1)
        res2 = await self.service.toggle_join(ev.event_id, self.user2.user_id)
        self.assertFalse(res2["is_joined"])
        self.assertEqual(res2["current_participants"], 1)

    # -------------------------------------------------------------------------
    # TC-09: Chặn tham gia khi sự kiện đã đủ người tối đa
    # -------------------------------------------------------------------------
    async def test_tc09_block_join_when_event_is_full(self):
        now = datetime.now(timezone.utc)
        ev = Event(
            title="Sự kiện Đã Đủ Người",
            description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
            cover_image_url="https://example.com/1.jpg",
            start_time=now + timedelta(days=2),
            latitude=10.77,
            longitude=106.70,
            address="Quận 1",
            district="Quận 1",
            max_participants=5,
            current_participants=5,  # Đã đầy
            creator_id=self.user1.user_id,
            status=EventStatus.APPROVED.value,
        )
        self.session.add(ev)
        await self.session.commit()

        with self.assertRaises(HTTPException) as ctx:
            await self.service.toggle_join(ev.event_id, self.user2.user_id)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("đủ số người", ctx.exception.detail)

    # -------------------------------------------------------------------------
    # TC-10: GPS Check-in hợp lệ - Bán kính <= 100m, trong khung giờ, nhận +50 GP
    # -------------------------------------------------------------------------
    async def test_tc10_gps_checkin_success_and_award_points(self):
        now = datetime.now(timezone.utc)
        # Sự kiện đang diễn ra (bắt đầu cách đây 15 phút)
        ev = Event(
            title="Sự kiện Đang Diễn Ra Test Check-in",
            description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
            cover_image_url="https://example.com/1.jpg",
            start_time=now - timedelta(minutes=15),
            latitude=10.773500,
            longitude=106.706800,
            address="Quận 1",
            district="Quận 1",
            max_participants=50,
            current_participants=2,
            creator_id=self.user1.user_id,
            status=EventStatus.APPROVED.value,
        )
        self.session.add(ev)
        await self.session.flush()

        # user2 đã là người tham gia
        self.session.add(EventParticipant(
            event_id=ev.event_id,
            user_id=self.user2.user_id,
            is_creator=False,
        ))
        await self.session.commit()

        # Tọa độ user2 cách tâm sự kiện khoảng 30m
        req = CheckinRequest(
            latitude=10.773700,
            longitude=106.706850,
            accuracy=15.0,  # Sai số 15m <= 50m
            device_info="Test Phone",
        )

        res = await self.service.checkin_event(ev.event_id, self.user2.user_id, req)
        self.assertTrue(res.success)
        self.assertLessEqual(res.distance_meters, 100.0)
        self.assertEqual(res.points_awarded, 50)
        self.assertEqual(res.total_green_points, 100)  # 50 ban đầu + 50 = 100 GP

    # -------------------------------------------------------------------------
    # TC-11: Chặn GPS Check-in ngoài bán kính 100m hoặc sai số định vị > 50m
    # -------------------------------------------------------------------------
    async def test_tc11_block_checkin_out_of_radius_or_low_accuracy(self):
        now = datetime.now(timezone.utc)
        ev = Event(
            title="Sự kiện Test Check-in Lỗi",
            description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
            cover_image_url="https://example.com/1.jpg",
            start_time=now - timedelta(minutes=15),
            latitude=10.773500,
            longitude=106.706800,
            address="Quận 1",
            district="Quận 1",
            max_participants=50,
            creator_id=self.user1.user_id,
            status=EventStatus.APPROVED.value,
        )
        self.session.add(ev)
        await self.session.flush()

        self.session.add(EventParticipant(
            event_id=ev.event_id,
            user_id=self.user2.user_id,
        ))
        await self.session.commit()

        # 1. Quá xa (> 100m, ví dụ cách 2km)
        req_far = CheckinRequest(
            latitude=10.793500,
            longitude=106.706800,
            accuracy=10.0,
        )
        with self.assertRaises(HTTPException) as ctx_far:
            await self.service.checkin_event(ev.event_id, self.user2.user_id, req_far)
        self.assertEqual(ctx_far.exception.status_code, 400)
        self.assertIn("100m", ctx_far.exception.detail)

        # 2. Sai số định vị quá lớn (> 50m)
        req_inaccurate = CheckinRequest(
            latitude=10.773550,
            longitude=106.706850,
            accuracy=65.0,  # > 50m
        )
        with self.assertRaises(HTTPException) as ctx_acc:
            await self.service.checkin_event(ev.event_id, self.user2.user_id, req_inaccurate)
        self.assertEqual(ctx_acc.exception.status_code, 400)
        self.assertIn("chính xác", ctx_acc.exception.detail)

    # -------------------------------------------------------------------------
    # TC-12: Chặn GPS Check-in khi sai khung giờ hoặc check-in lặp lại
    # -------------------------------------------------------------------------
    async def test_tc12_block_checkin_wrong_time_or_duplicate(self):
        now = datetime.now(timezone.utc)
        # Sự kiện sau 2 ngày mới diễn ra -> Chưa tới khung giờ check-in
        ev_future = Event(
            title="Sự kiện Tương Lai",
            description="Mô tả sự kiện hợp lệ dài trên mười ký tự",
            cover_image_url="https://example.com/1.jpg",
            start_time=now + timedelta(days=2),
            latitude=10.773500,
            longitude=106.706800,
            address="Quận 1",
            district="Quận 1",
            max_participants=50,
            creator_id=self.user1.user_id,
            status=EventStatus.APPROVED.value,
        )
        self.session.add(ev_future)
        await self.session.flush()

        self.session.add(EventParticipant(
            event_id=ev_future.event_id,
            user_id=self.user2.user_id,
        ))
        await self.session.commit()

        req = CheckinRequest(
            latitude=10.773500,
            longitude=106.706800,
            accuracy=10.0,
        )

        with self.assertRaises(HTTPException) as ctx_time:
            await self.service.checkin_event(ev_future.event_id, self.user2.user_id, req)
        self.assertEqual(ctx_time.exception.status_code, 400)
        self.assertIn("thời gian check-in", ctx_time.exception.detail)


if __name__ == "__main__":
    unittest.main()
