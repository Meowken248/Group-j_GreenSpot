"""
Bộ kiểm thử tự động toàn diện cho Chức năng 28, 29, 30 (Phân hệ Bùi Nguyễn Minh Quân)
- Chức năng 28: Trung tâm Biên tập và Quản lý Vòng đời Bản tin Cảnh báo Ô nhiễm (Full CRUD)
- Chức năng 29: Hệ thống Điều phối Thông báo Đẩy Thời gian thực (Push Dispatching)
- Chức năng 30: Cổng Tra cứu Công khai Tiến độ & Minh bạch Hồ sơ (Public Tracking)
"""

import unittest
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete
from geoalchemy2.elements import WKTElement

from app.database import AsyncSessionLocal, engine, Base
from app.models.alert_notification import (
    AlertSeverity,
    AlertStatus,
    EnvironmentalAlert,
    Notification,
    IncidentSubscription,
    IncidentVerification,
)
from app.models.incident import Incident, IncidentMedia, WasteCategory
from app.models.rbac import User, Role
from app.schemas.alert_notification import (
    AlertCreateRequest,
    AlertResolveRequest,
    AlertRevokeRequest,
    AlertUpdateRequest,
    PublicSubscribeRequest,
    PublicVerificationRequest,
)
from app.services.alert_service import AlertService
from app.services.notification_service import NotificationService
from app.services.public_tracking_service import PublicTrackingService


class TestFeatures282930(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await engine.dispose()
        self.db = AsyncSessionLocal()

        # Tạo category test cho Incident
        cat_stmt = select(WasteCategory).where(WasteCategory.category_code == "TEST_AIR")
        cat = (await self.db.execute(cat_stmt)).scalar_one_or_none()
        if not cat:
            cat = WasteCategory(
                category_code="TEST_AIR",
                name="Khói bụi công nghiệp",
                description="Khói bụi ô nhiễm không khí",
                default_severity="HIGH",
                sla_hours=24,
            )
            self.db.add(cat)
            await self.db.commit()
            await self.db.refresh(cat)
        self.category = cat

        # Tạo role test
        role_stmt = select(Role).where(Role.role_code == "CITIZEN")
        role = (await self.db.execute(role_stmt)).scalar_one_or_none()
        if not role:
            role = Role(
                role_code="CITIZEN",
                role_name="Công dân",
                description="Công dân",
                is_system=True,
            )
            self.db.add(role)
            await self.db.commit()
            await self.db.refresh(role)
        self.role = role

        # Tạo test user
        self.test_user_id = uuid.uuid4()
        self.test_user = User(
            user_id=self.test_user_id,
            email=f"tester_{self.test_user_id.hex[:6]}@example.com",
            password_hash="test_pw_hash",
            full_name="Nguyễn Văn Test",
            role_id=self.role.role_id,
            status="ACTIVE",
        )
        self.db.add(self.test_user)
        await self.db.commit()

    async def asyncTearDown(self):
        try:
            await self.db.execute(delete(User).where(User.user_id == self.test_user_id))
            await self.db.commit()
        except Exception:
            pass
        finally:
            await self.db.close()

    # ==========================================================================
    # 1. KIỂM THỬ CHỨC NĂNG 28: QUẢN LÝ VÒNG ĐỜI BẢN TIN CẢNH BÁO (FULL CRUD)
    # ==========================================================================

    async def test_01_alert_templates(self):
        """Kiểm tra danh mục mẫu bản tin chuẩn hóa"""
        templates = AlertService.get_templates()
        self.assertGreater(len(templates), 0)
        pm25 = next((t for t in templates if t.code == "TMP_PM25_HIGH"), None)
        self.assertIsNotNone(pm25)
        self.assertEqual(pm25.category, "AIR")
        self.assertEqual(pm25.severity_level, "ORANGE")

    async def test_02_alert_create_draft_and_publish(self):
        """Kiểm tra tạo bản tin nháp và sau đó phát hành sang ACTIVE"""
        req = AlertCreateRequest(
            title="Cảnh báo khí thải khẩn cấp tại KCN Linh Trung",
            category="AIR",
            severity_level="RED",
            affected_districts=["Thủ Đức", "Quận 9"],
            description="Phát hiện nồng độ khí độc SO2 tăng gấp 4 lần tiêu chuẩn cho phép lúc 14:00.",
            safety_advice="Người dân đóng kín cửa nhà, hạn chế ra ngoài, đeo khẩu trang than hoạt tính.",
            publish_now=False,
        )
        alert = await AlertService.create_alert(self.db, req, creator_id=self.test_user_id)
        self.assertIsNotNone(alert.alert_id)
        self.assertTrue(alert.alert_code.startswith("ALT-"))
        self.assertEqual(alert.status, AlertStatus.DRAFT.value)
        self.assertIsNone(alert.published_at)

        # Phát hành bản tin
        published = await AlertService.publish_alert(self.db, alert.alert_id, publisher_id=self.test_user_id)
        self.assertEqual(published.status, AlertStatus.ACTIVE.value)
        self.assertIsNotNone(published.published_at)

    async def test_03_alert_amendment_update(self):
        """Kiểm tra cập nhật đính chính thông tin bản tin cảnh báo đang hoạt động"""
        req = AlertCreateRequest(
            title="Cảnh báo ô nhiễm rác thải tự phát tuyến đường số 10",
            category="WASTE",
            severity_level="YELLOW",
            affected_districts=["Quận Bình Thạnh"],
            description="Điểm tập kết rác tự phát gây cản trở dòng chảy kênh rạch.",
            safety_advice="Không vứt rác bừa bãi ra kênh.",
            publish_now=True,
        )
        alert = await AlertService.create_alert(self.db, req)
        self.assertEqual(alert.status, AlertStatus.ACTIVE.value)

        # Đính chính
        update_req = AlertUpdateRequest(
            severity_level="ORANGE",
            amendment_note="Bãi rác có dấu hiệu bốc mùi hóa chất nồng nặc hơn dự kiến ban đầu.",
        )
        updated = await AlertService.update_alert(self.db, alert.alert_id, update_req)
        self.assertEqual(updated.severity_level, "ORANGE")
        self.assertIn("[ĐÍNH CHÍNH LÚC", updated.description)

    async def test_04_alert_resolve_all_clear(self):
        """Kiểm tra kết thúc cảnh báo / công bố an toàn cho nhân dân"""
        req = AlertCreateRequest(
            title="Cảnh báo tràn dầu nhẹ trên sông Sài Gòn",
            category="WATER",
            severity_level="ORANGE",
            affected_districts=["Quận 1", "Quận 4"],
            description="Vết dầu loang diện hẹp từ sà lan chở hàng.",
            safety_advice="Tạm dừng lấy nước sinh hoạt ven sông.",
            publish_now=True,
        )
        alert = await AlertService.create_alert(self.db, req)

        resolve_req = AlertResolveRequest(
            resolved_note="Lực lượng chức năng đã thu gom 100% váng dầu, nguồn nước đã trở lại bình thường an toàn.",
        )
        resolved = await AlertService.resolve_alert(self.db, alert.alert_id, resolve_req)
        self.assertEqual(resolved.status, AlertStatus.RESOLVED.value)
        self.assertIsNotNone(resolved.resolved_at)
        self.assertEqual(resolved.resolved_note, resolve_req.resolved_note)

    async def test_05_alert_revoke_misleading(self):
        """Kiểm tra thu hồi khẩn cấp bản tin do sai sót"""
        req = AlertCreateRequest(
            title="Cảnh báo phát nhầm thông tin thử nghiệm nội bộ",
            category="AIR",
            severity_level="RED",
            affected_districts=["Quận 3"],
            description="Bản tin test do cán bộ kỹ thuật gửi nhầm hệ thống.",
            safety_advice="Không cần thực hiện biện pháp phòng ngừa.",
            publish_now=True,
        )
        alert = await AlertService.create_alert(self.db, req)

        revoke_req = AlertRevokeRequest(
            revoke_reason="Bản tin gửi nhầm trong quá trình diễn tập kỹ thuật",
        )
        revoked = await AlertService.revoke_alert(self.db, alert.alert_id, revoke_req)
        self.assertEqual(revoked.status, AlertStatus.REVOKED.value)
        self.assertIsNotNone(revoked.revoked_at)
        self.assertEqual(revoked.revoke_reason, revoke_req.revoke_reason)

    async def test_06_alert_list_and_stats(self):
        """Kiểm tra bộ lọc danh sách và thống kê trạng thái cảnh báo"""
        # Tạo trước 1 alert để bảo đảm có dữ liệu
        req = AlertCreateRequest(
            title="Bản tin kiểm tra bộ lọc danh sách",
            category="AIR",
            severity_level="YELLOW",
            affected_districts=["Quận 1"],
            description="Nội dung kiểm tra lọc danh sách.",
            safety_advice="Lưu ý theo dõi.",
            publish_now=True,
        )
        await AlertService.create_alert(self.db, req)

        items, total, stats = await AlertService.list_alerts(
            self.db,
            status_filter="ALL",
            severity_filter="ALL",
            limit=50,
        )
        self.assertIsInstance(items, list)
        self.assertGreaterEqual(total, 1)
        self.assertIn("active_count", stats)
        self.assertIn("resolved_count", stats)

    # ==========================================================================
    # 2. KIỂM THỬ CHỨC NĂNG 29: ĐIỀU PHỐI THÔNG BÁO ĐẨY THỜI GIAN THỰC
    # ==========================================================================

    async def test_07_notification_auto_dispatch(self):
        """Kiểm tra tự động phát sinh thông báo đẩy khi cảnh báo được phát hành"""
        req = AlertCreateRequest(
            title="Cảnh báo cháy bãi rác Nam Sơn",
            category="HAZARDOUS",
            severity_level="RED",
            affected_districts=["Huyện Sóc Sơn"],
            description="Khói độc lan rộng cần sơ tán người già.",
            safety_advice="Đeo khẩu trang N95.",
            publish_now=True,
        )
        alert = await AlertService.create_alert(self.db, req)

        # Lấy thông báo của test user
        items, unread_count, total = await NotificationService.list_notifications(
            self.db,
            user_id=self.test_user_id,
        )
        self.assertGreater(len(items), 0)
        matching_noti = next((n for n in items if n.alert_id == alert.alert_id), None)
        self.assertIsNotNone(matching_noti)
        self.assertEqual(matching_noti.severity, "CRITICAL")
        self.assertFalse(matching_noti.is_read)

    async def test_08_notification_mark_read_and_delete(self):
        """Kiểm tra đánh dấu đã đọc và xóa thông báo cá nhân"""
        # Tạo 1 alert để sinh thông báo
        req = AlertCreateRequest(
            title="Bản tin thử nghiệm đánh dấu đọc",
            category="AIR",
            severity_level="YELLOW",
            affected_districts=["Quận 1"],
            description="Thử nghiệm đọc thông báo cảnh báo môi trường.",
            safety_advice="Người dân chú ý theo dõi các bản tin an toàn tiếp theo.",
            publish_now=True,
        )
        await AlertService.create_alert(self.db, req)

        items, unread_before, _ = await NotificationService.list_notifications(
            self.db,
            user_id=self.test_user_id,
            only_unread=True,
        )
        if items:
            target_id = items[0].notification_id
            marked = await NotificationService.mark_as_read(
                self.db,
                user_id=self.test_user_id,
                notification_ids=[target_id],
            )
            self.assertEqual(marked, 1)

            # Xóa thông báo
            deleted = await NotificationService.delete_notification(self.db, target_id)
            self.assertTrue(deleted)

    async def test_09_notification_stats(self):
        """Kiểm tra thống kê tỷ lệ truyền nhận thông báo đẩy"""
        # Tạo alert để đảm bảo có thông báo
        req = AlertCreateRequest(
            title="Bản tin kiểm tra thống kê thông báo",
            category="AIR",
            severity_level="RED",
            affected_districts=["Quận 1"],
            description="Thử nghiệm thu thập số liệu thống kê truyền dẫn thông báo.",
            safety_advice="Đeo khẩu trang bảo hộ khi ra đường.",
            publish_now=True,
        )
        await AlertService.create_alert(self.db, req)

        stats = await NotificationService.get_push_stats(self.db)
        self.assertIn("total_notifications_sent", stats)
        self.assertIn("open_rate_percentage", stats)
        self.assertGreaterEqual(stats["total_notifications_sent"], 1)

    # ==========================================================================
    # 3. KIỂM THỬ CHỨC NĂNG 30: CỔNG TRA CỨU CÔNG KHAI TIẾN ĐỘ SỰ CỐ
    # ==========================================================================

    async def test_10_public_incident_tracking(self):
        """Kiểm tra tra cứu công khai tiến độ sự cố bằng tracking_code"""
        code = f"INC-2026-{uuid.uuid4().hex[:4].upper()}"
        point_geom = WKTElement("POINT(106.7000 10.7700)", srid=4326)

        incident = Incident(
            tracking_code=code,
            category_id=self.category.category_id,
            title="Bãi rác tự phát chân cầu Sài Gòn",
            description="Bãi rác sinh hoạt lớn tồn đọng nhiều ngày chưa được dọn dẹp.",
            address_text="Gầm cầu Sài Gòn, Phường 22, Bình Thạnh",
            location=point_geom,
            latitude=10.7700,
            longitude=106.7000,
            severity="MEDIUM",
            status="RESOLVED",
            reporter_phone_masked="0987654321",
            sla_deadline=datetime.now(timezone.utc) + timedelta(hours=24),
            resolved_at=datetime.now(timezone.utc),
        )
        self.db.add(incident)
        await self.db.commit()
        await self.db.refresh(incident)

        # Thêm ảnh minh chứng Before và After
        before_media = IncidentMedia(
            incident_id=incident.incident_id,
            media_type="IMAGE",
            phase="BEFORE",
            file_url="https://example.com/before.jpg",
        )
        after_media = IncidentMedia(
            incident_id=incident.incident_id,
            media_type="IMAGE",
            phase="AFTER",
            file_url="https://example.com/after.jpg",
        )
        self.db.add_all([before_media, after_media])
        await self.db.commit()

        # Thực hiện tra cứu công khai
        res = await PublicTrackingService.track_incident(self.db, code)
        self.assertEqual(res.tracking_code, code)
        self.assertEqual(res.category_name, self.category.name)
        self.assertEqual(res.reporter_phone_masked, "098****321")  # Masked bảo mật
        self.assertIn("https://example.com/before.jpg", res.before_images)
        self.assertIn("https://example.com/after.jpg", res.after_images)
        self.assertEqual(len(res.timeline), 4)
        self.assertTrue(res.timeline[3].is_completed)  # Bước 4 hoàn thành vì status=RESOLVED

    async def test_11_public_subscription_and_verification(self):
        """Kiểm tra người dân đăng ký nhận tin và gửi ý kiến kiểm chứng hiện trường"""
        code = f"INC-2026-{uuid.uuid4().hex[:4].upper()}"
        point_geom = WKTElement("POINT(106.6900 10.7800)", srid=4326)

        incident = Incident(
            tracking_code=code,
            category_id=self.category.category_id,
            title="Điểm tập kết phế thải xây dựng",
            description="Gạch đá vỡ tràn xuống lòng đường.",
            address_text="Số 45 Nam Kỳ Khởi Nghĩa, Quận 1",
            location=point_geom,
            latitude=10.7800,
            longitude=106.6900,
            severity="LOW",
            status="RESOLVED",
        )
        self.db.add(incident)
        await self.db.commit()

        # 1. Đăng ký nhận tin
        sub_req = PublicSubscribeRequest(
            tracking_code=code,
            contact_type="EMAIL",
            contact_value="citizen_resident@gmail.com",
        )
        sub = await PublicTrackingService.subscribe_incident(self.db, sub_req)
        self.assertIsNotNone(sub.subscription_id)
        self.assertEqual(sub.contact_value, "citizen_resident@gmail.com")

        # 2. Người dân gửi kiểm chứng hiện trường đã sạch
        verif_req = PublicVerificationRequest(
            tracking_code=code,
            is_clean_confirmed=True,
            comment="Đội dọn dẹp rất sạch và khử mùi hôi chu đáo.",
        )
        verif = await PublicTrackingService.verify_incident(self.db, verif_req, client_ip="192.168.1.100")
        self.assertIsNotNone(verif.verification_id)
        self.assertTrue(verif.is_clean_confirmed)

        # 3. Tra cứu lại để xác nhận thống kê kiểm chứng tăng lên
        res = await PublicTrackingService.track_incident(self.db, code)
        self.assertEqual(res.verification_stats["clean_count"], 1)

    async def test_12_warn_001_to_004_validations(self):
        """Kiểm tra toàn bộ các quy tắc ràng buộc WARN_001 đến WARN_004 cho Chức năng 28"""
        from fastapi import HTTPException

        # WARN_001: Tiêu đề < 10 ký tự
        req_short_title = AlertCreateRequest(
            title="Quá ngắn",
            category="AIR",
            severity_level="YELLOW",
            affected_districts=["Quận 1"],
            description="Mô tả sự cố chi tiết đầy đủ trên mười ký tự.",
            safety_advice="Khuyến cáo an toàn phòng hộ đầy đủ.",
        )
        with self.assertRaises(HTTPException) as ctx:
            await AlertService.create_alert(self.db, req_short_title)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("WARN_001", ctx.exception.detail)

        # WARN_002: Mức độ cảnh báo sai
        req_invalid_sev = AlertCreateRequest(
            title="Tiêu đề hợp lệ từ 10 ký tự trở lên",
            category="AIR",
            severity_level="PURPLE_UNKNOWN",
            affected_districts=["Quận 1"],
            description="Mô tả sự cố chi tiết đầy đủ trên mười ký tự.",
            safety_advice="Khuyến cáo an toàn phòng hộ đầy đủ.",
        )
        with self.assertRaises(HTTPException) as ctx:
            await AlertService.create_alert(self.db, req_invalid_sev)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("WARN_002", ctx.exception.detail)

        # WARN_003: Phát hành ngay nhưng không chọn quận/huyện
        req_no_dist = AlertCreateRequest(
            title="Tiêu đề hợp lệ từ 10 ký tự trở lên",
            category="AIR",
            severity_level="RED",
            affected_districts=[],
            description="Mô tả sự cố chi tiết đầy đủ trên mười ký tự.",
            safety_advice="Khuyến cáo an toàn phòng hộ đầy đủ.",
            publish_now=True,
        )
        with self.assertRaises(HTTPException) as ctx:
            await AlertService.create_alert(self.db, req_no_dist)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("WARN_003", ctx.exception.detail)

        # WARN_004: Khuyến cáo an toàn để trống hoặc dưới 10 ký tự
        req_short_advice = AlertCreateRequest(
            title="Tiêu đề hợp lệ từ 10 ký tự trở lên",
            category="AIR",
            severity_level="ORANGE",
            affected_districts=["Quận 1"],
            description="Mô tả sự cố chi tiết đầy đủ trên mười ký tự.",
            safety_advice="Ngắn",
            publish_now=False,
        )
        with self.assertRaises(HTTPException) as ctx:
            await AlertService.create_alert(self.db, req_short_advice)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("WARN_004", ctx.exception.detail)

    async def test_13_push_001_deduplication(self):
        """Kiểm tra cơ chế Deduplication trong 5 phút (PUSH_001) cho Chức năng 29"""
        req = AlertCreateRequest(
            title="Bản tin kiểm tra tính năng chống trùng lặp Deduplication",
            category="AIR",
            severity_level="ORANGE",
            affected_districts=["Quận 1"],
            description="Mô tả bản tin phục vụ kiểm tra tính năng chống spam push notification.",
            safety_advice="Đeo khẩu trang an toàn khi ra đường.",
            publish_now=True,
        )
        alert = await AlertService.create_alert(self.db, req)

        # Thử dispatch đợt 2 ngay lập tức cho cùng alert
        duplicate_notis = await NotificationService.dispatch_alert_push(self.db, alert)
        self.assertEqual(len(duplicate_notis), 0)  # Đã bị loại trừ tự động theo PUSH_001

    async def test_14_trk_001_to_004_validations(self):
        """Kiểm tra toàn bộ các quy tắc ràng buộc TRK_001 đến TRK_004 cho Chức năng 30"""
        from fastapi import HTTPException

        # TRK_001: Để trống
        with self.assertRaises(HTTPException) as ctx:
            await PublicTrackingService.track_incident(self.db, "")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("TRK_001", ctx.exception.detail)

        # TRK_002: Sai regex định dạng chuẩn (không bắt đầu bằng INC-)
        with self.assertRaises(HTTPException) as ctx:
            await PublicTrackingService.track_incident(self.db, "WRONG-CODE-FORMAT")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("TRK_002", ctx.exception.detail)

        # TRK_003: Không tìm thấy hồ sơ
        with self.assertRaises(HTTPException) as ctx:
            await PublicTrackingService.track_incident(self.db, "INC-9999-NOTFOUND")
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("TRK_003", ctx.exception.detail)

        # TRK_004: Hồ sơ bị ẩn/bảo mật nghiệp vụ
        hidden_code = f"INC-2026-HIDDEN-{uuid.uuid4().hex[:4].upper()}"
        point_geom = WKTElement("POINT(106.6900 10.7800)", srid=4326)
        hidden_incident = Incident(
            tracking_code=hidden_code,
            category_id=self.category.category_id,
            title="Sự cố môi trường đang được điều tra bảo mật",
            description="Hồ sơ nhạy cảm cần bảo mật nghiệp vụ.",
            address_text="Khu vực kiểm tra bí mật",
            location=point_geom,
            latitude=10.7800,
            longitude=106.6900,
            severity="HIGH",
            status="HIDDEN",
        )
        self.db.add(hidden_incident)
        await self.db.commit()

        with self.assertRaises(HTTPException) as ctx:
            await PublicTrackingService.track_incident(self.db, hidden_code)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("TRK_004", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
