"""
Unit & Integration Tests cho STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí & Safety Check
(Bao phủ 100% 4 màn hình nghiệp vụ, Geofencing, SQL tường minh, OCC và Fallback)
"""

import os
import sys
import unittest
import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.main import app
from app.database import AsyncSessionLocal, engine
from app.models.rbac import User
from app.models.friends import Friendship
from app.models.emergency_alert.alert import (
    UserDeviceLocation,
    EmergencyBroadcastAlert,
    EmergencyAlertRecipient,
    EmergencySOSSignal,
)
from app.models.emergency_alert.safety_check import (
    UserSafetyCheck,
    SafetyCheckFriendDelivery,
)
from app.schemas.emergency_alert.schemas import (
    AlertEstimateRequest,
    BroadcastAlertRequest,
    CancelAlertRequest,
    EmergencySOSRequest,
    MarkSafeSelfRequest,
    SendSafetyCheckToFriendsRequest,
)
from app.crud.emergency_alert.alert_repository import (
    EmergencyAlertRepository,
    SafetyCheckRepository,
)
from app.services.emergency_alert.alert_service import EmergencyAlertService
from app.utils.security import create_access_token


class TestEmergencyAlertSTT45(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử toàn trình cho STT 45 sử dụng IsolatedAsyncioTestCase chuẩn Python 3.11"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

    async def asyncTearDown(self):
        await self.session.close()
        await engine.dispose()

    async def setup_test_users_and_locations(self):
        """Khởi tạo người dùng, liên kết bạn bè và tọa độ thiết bị GPS"""
        admin_id = uuid.uuid4()
        citizen_1_id = uuid.uuid4()
        citizen_2_id = uuid.uuid4()
        citizen_3_id = uuid.uuid4()

        # Tạo Users
        admin_user = User(
            user_id=admin_id,
            email=f"admin_{admin_id.hex[:6]}@greenspot.vn",
            full_name="Đại tá Nguyễn Văn An (Ban Chỉ huy PCTT)",
            password_hash="fakehash",
            role_id=1,
        )
        c1 = User(
            user_id=citizen_1_id,
            email=f"c1_{citizen_1_id.hex[:6]}@greenspot.vn",
            full_name="Trần Thị Bích",
            password_hash="fakehash",
            role_id=2,
        )
        c2 = User(
            user_id=citizen_2_id,
            email=f"c2_{citizen_2_id.hex[:6]}@greenspot.vn",
            full_name="Lê Hoàng Nam",
            password_hash="fakehash",
            role_id=2,
        )
        c3 = User(
            user_id=citizen_3_id,
            email=f"c3_{citizen_3_id.hex[:6]}@greenspot.vn",
            full_name="Phạm Minh Tuấn",
            password_hash="fakehash",
            role_id=2,
        )
        self.session.add_all([admin_user, c1, c2, c3])
        await self.session.flush()

        # Tạo Friendships
        u1, u2 = sorted([citizen_1_id, citizen_2_id])
        f1 = Friendship(user_id_1=u1, user_id_2=u2)
        u1, u3 = sorted([citizen_1_id, citizen_3_id])
        f2 = Friendship(user_id_1=u1, user_id_2=u3)
        self.session.add_all([f1, f2])

        # Vị trí thiết bị: c1 và c2 ở An Dương Vương Q5 (10.7580, 106.6750)
        loc1 = UserDeviceLocation(
            user_id=citizen_1_id,
            latitude=10.7580,
            longitude=106.6750,
            location="SRID=4326;POINT(106.6750 10.7580)",
            address_text="Số 120 Đường An Dương Vương, Phường 3, Quận 5",
            district="Quận 5",
            ward="Phường 3",
            is_active=True,
        )
        loc2 = UserDeviceLocation(
            user_id=citizen_2_id,
            latitude=10.7590,
            longitude=106.6760,
            location="SRID=4326;POINT(106.6760 10.7590)",
            address_text="Số 45 Đường Huỳnh Mẫn Đạt, Phường 3, Quận 5",
            district="Quận 5",
            ward="Phường 3",
            is_active=True,
        )
        # c3 ở xa tại Thủ Đức (10.8500, 106.7700)
        loc3 = UserDeviceLocation(
            user_id=citizen_3_id,
            latitude=10.8500,
            longitude=106.7700,
            location="SRID=4326;POINT(106.7700 10.8500)",
            address_text="Khu Công nghệ cao, TP. Thủ Đức",
            district="TP. Thủ Đức",
            is_active=True,
        )
        self.session.add_all([loc1, loc2, loc3])
        await self.session.commit()

        return {
            "admin": admin_user,
            "c1": c1,
            "c2": c2,
            "c3": c3,
        }

    # =========================================================================
    # 1. KIỂM THỬ MÀN 1/4: EMERGENCY BROADCAST CONSOLE
    # =========================================================================

    async def test_01_estimate_recipients_geofence(self):
        """Kiểm tra ước tính số người nhận trong bán kính ghim bản đồ"""
        users = await self.setup_test_users_and_locations()
        service = EmergencyAlertService(EmergencyAlertRepository(), SafetyCheckRepository())

        req = AlertEstimateRequest(
            latitude=10.7580,
            longitude=106.6750,
            radius_meters=1000.0,
        )
        res = await service.estimate_recipients(self.session, req)
        self.assertGreaterEqual(res.estimated_recipients, 2)
        self.assertEqual(res.radius_km, 1.0)
        self.assertIn("Đã xác định vùng cảnh báo", res.message)
        self.assertIn("người dân trong bán kính 1.0 km", res.message)

    async def test_02_broadcast_alert_success_and_validation(self):
        """Kiểm tra phát lệnh cảnh báo thành công và bắt lỗi nhập liệu thiếu sót"""
        users = await self.setup_test_users_and_locations()
        service = EmergencyAlertService(EmergencyAlertRepository(), SafetyCheckRepository())

        # 1. Thành công
        req_valid = BroadcastAlertRequest(
            alert_type="FLOOD",
            title="BÁO ĐỘNG NGẬP SÂU TRÊN 0.8M TẠI ĐƯỜNG AN DƯƠNG VƯƠNG",
            content="Khu vực đang ngập sâu do triều cường kết hợp mưa lớn. Người dân tránh di chuyển qua khu vực.",
            center_latitude=10.7580,
            center_longitude=106.6750,
            radius_meters=2000.0,
            severity_level="CRITICAL",
        )
        res = await service.broadcast_alert(self.session, req_valid, creator_id=users["admin"].user_id)
        self.assertTrue(res.success)
        self.assertGreaterEqual(res.actual_sent_count, 2)
        self.assertIn("Phát lệnh cảnh báo khẩn cấp thành công!", res.message)
        self.assertTrue(res.alert_code.startswith("EBA-"))

        # 2. Thất bại do rỗng (kiểm tra Service validation)
        req_invalid = BroadcastAlertRequest.model_construct(
            alert_type="FLOOD",
            title="12",
            content="ngắn",
            center_latitude=10.7580,
            center_longitude=106.6750,
            radius_meters=50.0,
        )
        with self.assertRaises(Exception) as ctx:
            await service.broadcast_alert(self.session, req_invalid)
        self.assertIn("Vui lòng nhập nội dung cảnh báo và chọn phạm vi ảnh hưởng trên bản đồ.", str(ctx.exception))

    async def test_03_cancel_alert_with_optimistic_locking(self):
        """Kiểm tra hủy lệnh cảnh báo khẩn cấp với khóa lạc quan OCC version"""
        users = await self.setup_test_users_and_locations()
        service = EmergencyAlertService(EmergencyAlertRepository(), SafetyCheckRepository())

        req = BroadcastAlertRequest(
            alert_type="STORM",
            title="CẢNH BÁO GIÔNG LỐC NGUY HIỂM",
            content="Khuyến nghị chằng chống nhà cửa và tìm chỗ trú ẩn kiên cố.",
            center_latitude=10.7580,
            center_longitude=106.6750,
            radius_meters=3000.0,
        )
        alert = await service.broadcast_alert(self.session, req, creator_id=users["admin"].user_id)

        # 1. OCC Conflict (version sai = 99)
        with self.assertRaises(Exception) as ctx:
            await service.cancel_alert(self.session, alert.alert_id, CancelAlertRequest(version=99))
        self.assertIn("409", str(ctx.exception))

        # 2. Version đúng = 1 -> Thành công
        cancel_res = await service.cancel_alert(self.session, alert.alert_id, CancelAlertRequest(version=1))
        self.assertTrue(cancel_res["success"])
        self.assertIn("Đã hủy lệnh cảnh báo", cancel_res["message"])

    # =========================================================================
    # 2. KIỂM THỬ MÀN 2/4: EMERGENCY ALERT MODAL
    # =========================================================================

    async def test_04_user_active_alert_geofencing(self):
        """Kiểm tra người dùng trong vùng đệm nhận được Modal cảnh báo"""
        users = await self.setup_test_users_and_locations()
        service = EmergencyAlertService(EmergencyAlertRepository(), SafetyCheckRepository())

        req = BroadcastAlertRequest(
            alert_type="FLOOD",
            title="BÁO ĐỘNG NGẬP SÂU TRÊN 0.8M TẠI ĐƯỜNG AN DƯƠNG VƯƠNG",
            content="Khuyến cáo người dân di dời phương tiện lên nơi cao ráo.",
            center_latitude=10.7580,
            center_longitude=106.6750,
            radius_meters=2000.0,
        )
        await service.broadcast_alert(self.session, req, creator_id=users["admin"].user_id)

        # c2 cách tâm 150m -> Nhận được
        user_alert = await service.get_active_alert_for_user(
            self.session, user_id=users["c2"].user_id, lat=10.7590, lng=106.6760
        )
        self.assertTrue(user_alert.has_active_alert)
        self.assertEqual(user_alert.title, "CẢNH BÁO KHẨN CẤP")
        self.assertIn("Ngập nặng trong bán kính 2.0 km quanh bạn", user_alert.situation_message)

        # c3 cách 15km -> Không nhận được
        outside_alert = await service.get_active_alert_for_user(
            self.session, user_id=users["c3"].user_id, lat=10.8500, lng=106.7700
        )
        self.assertFalse(outside_alert.has_active_alert)

    async def test_05_modal_actions_sos_and_navigation(self):
        """Kiểm tra cụm 3 nút hành động trên Modal: SOS, Tôi an toàn, Xem chi tiết"""
        users = await self.setup_test_users_and_locations()
        service = EmergencyAlertService(EmergencyAlertRepository(), SafetyCheckRepository())

        req_alert = BroadcastAlertRequest(
            alert_type="FLOOD",
            title="BÁO ĐỘNG NGẬP KHẨN CẤP",
            content="Ngập sâu nguy hiểm",
            center_latitude=10.7580,
            center_longitude=106.6750,
            radius_meters=2000.0,
        )
        alert = await service.broadcast_alert(self.session, req_alert)

        # 1. Nút "Cần giúp đỡ" (SOS)
        sos_req = EmergencySOSRequest(
            alert_id=alert.alert_id,
            latitude=10.7585,
            longitude=106.6755,
            location_address="Đường An Dương Vương, P3, Q5",
            phone_number="0988777666",
            notes="Cần hỗ trợ đưa người già đi bệnh viện",
        )
        sos_res = await service.trigger_emergency_sos(self.session, user_id=users["c1"].user_id, req=sos_req)
        self.assertTrue(sos_res.success)
        self.assertIn("Đã gửi tín hiệu cứu nạn khẩn cấp", sos_res.message)
        self.assertEqual(sos_res.hotline, "114 / 115")

        # 2. Nút "Tôi an toàn"
        safe_ack = await service.acknowledge_alert_action(
            self.session, alert_id=alert.alert_id, user_id=users["c1"].user_id, action_taken="SAFE"
        )
        self.assertEqual(safe_ack["message"], "Đang chuyển đến màn hình chia sẻ trạng thái an toàn...")

        # 3. Nút "Xem chi tiết"
        nav_ack = await service.acknowledge_alert_action(
            self.session, alert_id=alert.alert_id, user_id=users["c1"].user_id, action_taken="VIEW_DETAILS"
        )
        self.assertEqual(nav_ack["message"], "Đang mở bản đồ điều hướng tránh ngập an toàn...")
        self.assertEqual(nav_ack["redirect_url"], "/navigation")

    # =========================================================================
    # 3. KIỂM THỬ MÀN 3/4 & 4/4: COMMUNITY SAFETY CHECK
    # =========================================================================

    async def test_06_safety_check_init_and_mark_safe_self(self):
        """Kiểm tra khởi tạo Safety Check và bấm 'Tôi an toàn' tại hồ sơ"""
        users = await self.setup_test_users_and_locations()
        service = EmergencyAlertService(EmergencyAlertRepository(), SafetyCheckRepository())

        # 1. Khởi tạo hợp lệ
        init_res = await service.init_safety_check(
            self.session, user_id=users["c1"].user_id, lat=10.7580, lng=106.6750
        )
        self.assertTrue(init_res.is_gps_verified)
        self.assertIn("Vị trí hiện tại của bạn đã được xác định", init_res.message)
        self.assertGreaterEqual(len(init_res.friends), 2)

        # 2. Bấm "Tôi an toàn"
        mark_req = MarkSafeSelfRequest(
            latitude=10.7580,
            longitude=106.6750,
            location_address="Đường An Dương Vương, Phường 3, Quận 5",
        )
        mark_res = await service.mark_safe_self(self.session, user_id=users["c1"].user_id, req=mark_req)
        self.assertTrue(mark_res.success)
        self.assertIn("Bạn đã được đánh dấu là AN TOÀN", mark_res.message)

        # 3. Khởi tạo thiếu GPS -> Báo lỗi
        with self.assertRaises(Exception) as ctx:
            await service.init_safety_check(self.session, user_id=users["c1"].user_id, lat=None, lng=None)
        self.assertIn("Không thể xác định vị trí hiện tại", str(ctx.exception))

    async def test_07_send_safety_check_to_friends_and_modal_4_4(self):
        """Kiểm tra gửi thông báo an toàn đến bạn bè và hiển thị Popup Màn 4/4"""
        users = await self.setup_test_users_and_locations()
        service = EmergencyAlertService(EmergencyAlertRepository(), SafetyCheckRepository())

        # 1. Gửi thành công đến bạn bè
        req = SendSafetyCheckToFriendsRequest(
            friend_user_ids=[users["c2"].user_id, users["c3"].user_id],
            latitude=10.7580,
            longitude=106.6750,
            location_address="Đường An Dương Vương, Phường 3, Quận 5",
        )
        res = await service.send_safety_check_to_friends(self.session, user_id=users["c1"].user_id, req=req)
        self.assertTrue(res.success)
        self.assertEqual(res.total_sent, 2)
        self.assertEqual(res.message, "Đang gửi thông báo an toàn đến bạn bè...")

        # Modal Popup Màn 4/4
        modal = res.modal
        self.assertEqual(modal.modal_title, "ĐÃ BÁO AN TOÀN")
        self.assertEqual(modal.modal_message, "Bạn bè đã nhận thông báo")
        self.assertIn("Thông báo trạng thái an toàn của bạn đã được gửi thành công đến 2 bạn bè", modal.modal_sub_message)
        self.assertEqual(modal.close_redirect_url, "/feed")

        # 2. Lỗi chưa chọn bạn bè
        empty_req = SendSafetyCheckToFriendsRequest(
            friend_user_ids=[],
            latitude=10.7580,
            longitude=106.6750,
            location_address="Đường An Dương Vương, Phường 3, Quận 5",
        )
        with self.assertRaises(Exception) as ctx:
            await service.send_safety_check_to_friends(self.session, user_id=users["c1"].user_id, req=empty_req)
        self.assertIn("Vui lòng chọn ít nhất một người bạn để gửi thông báo an toàn.", str(ctx.exception))


class TestEmergencyAlertHttpEndpoints(unittest.TestCase):
    """Kiểm thử HTTP REST API Endpoints đồng bộ qua TestClient"""

    @classmethod
    def setUpClass(cls):
        import asyncio

        async def get_or_create_test_user():
            async with AsyncSessionLocal() as s:
                res = await s.execute(select(User).limit(1))
                u = res.scalars().first()
                if not u:
                    u = User(
                        user_id=uuid.uuid4(),
                        email="test_citizen_http@greenspot.vn",
                        full_name="Nguyễn Văn Test HTTP",
                        role_id=2,
                        password_hash="fakehash",
                    )
                    s.add(u)
                    await s.commit()
                    await s.refresh(u)
                return u

        cls.test_user = asyncio.run(get_or_create_test_user())

    def test_08_http_api_endpoints_coverage(self):
        """Kiểm tra các endpoint RESTful /api/v1/emergency-alerts phủ trọn 4 màn hình"""
        from app.api.v1.rbac import get_current_active_user

        citizen_user = self.test_user
        citizen_id = citizen_user.user_id

        admin_token = create_access_token(
            user_id=str(citizen_id),
            email=citizen_user.email,
            role="ADMIN",
            session_id=str(uuid.uuid4()),
        )
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        citizen_token = create_access_token(
            user_id=str(citizen_id),
            email=citizen_user.email,
            role="CITIZEN",
            session_id=str(uuid.uuid4()),
        )
        headers_citizen = {"Authorization": f"Bearer {citizen_token}"}

        app.dependency_overrides[get_current_active_user] = lambda: citizen_user
        try:
            with TestClient(app) as client:
                # 1. POST /api/v1/emergency-alerts/estimate-recipients (Màn 1/4)
                res_est = client.post(
                    "/api/v1/emergency-alerts/estimate-recipients",
                    json={"latitude": 10.7580, "longitude": 106.6750, "radius_meters": 1500.0},
                )
                self.assertEqual(res_est.status_code, 200)
                self.assertIn("estimated_recipients", res_est.json())

                # 2. POST /api/v1/emergency-alerts/location/ping (GPS Tracking)
                res_ping = client.post(
                    "/api/v1/emergency-alerts/location/ping",
                    json={
                        "latitude": 10.7580,
                        "longitude": 106.6750,
                        "address_text": "An Dương Vương, Q5",
                        "district": "Quận 5",
                    },
                    headers=headers_citizen,
                )
                self.assertEqual(res_ping.status_code, 200)
                self.assertTrue(res_ping.json()["success"])

                # 3. POST /api/v1/emergency-alerts/broadcast (Màn 1/4 Admin)
                res_bc = client.post(
                    "/api/v1/emergency-alerts/broadcast",
                    json={
                        "alert_type": "FLOOD",
                        "title": "BÁO ĐỘNG NGẬP SÂU TRÊN 0.8M TẠI ĐƯỜNG AN DƯƠNG VƯƠNG",
                        "content": "Khu vực đang ngập sâu, đề nghị người dân hạn chế di chuyển qua các điểm trũng.",
                        "center_latitude": 10.7580,
                        "center_longitude": 106.6750,
                        "radius_meters": 2000.0,
                    },
                    headers=headers_admin,
                )
                self.assertEqual(res_bc.status_code, 201)
                data_bc = res_bc.json()
                self.assertTrue(data_bc["success"])
                alert_id = data_bc["alert_id"]

                # 4. GET /api/v1/emergency-alerts/active-for-user (Màn 2/4 Modal Popup)
                res_active = client.get(
                    "/api/v1/emergency-alerts/active-for-user?lat=10.7580&lng=106.6750",
                    headers=headers_citizen,
                )
                self.assertEqual(res_active.status_code, 200)
                self.assertTrue(res_active.json()["has_active_alert"])
                self.assertEqual(res_active.json()["situation_message"], "Ngập nặng trong bán kính 2.0 km quanh bạn")

                # 5. POST /api/v1/emergency-alerts/sos (Màn 2/4 Nút Cần giúp đỡ)
                res_sos = client.post(
                    "/api/v1/emergency-alerts/sos",
                    json={
                        "alert_id": alert_id,
                        "latitude": 10.7580,
                        "longitude": 106.6750,
                        "location_address": "120 An Dương Vương, P3, Q5",
                        "phone_number": "0912345678",
                        "notes": "Cần hỗ trợ đưa người già đi bệnh viện",
                    },
                    headers=headers_citizen,
                )
                self.assertEqual(res_sos.status_code, 201)
                self.assertTrue(res_sos.json()["success"])

                # 6. POST /api/v1/emergency-alerts/{alert_id}/acknowledge (Màn 2/4 Nút Tôi an toàn)
                res_ack = client.post(
                    f"/api/v1/emergency-alerts/{alert_id}/acknowledge?action_taken=SAFE",
                    headers=headers_citizen,
                )
                self.assertEqual(res_ack.status_code, 200)
                self.assertIn("Đang chuyển đến màn hình chia sẻ trạng thái an toàn...", res_ack.json()["message"])

                # 7. GET /api/v1/emergency-alerts/history (Màn 1/4 Lịch sử phát sóng)
                res_hist = client.get(
                    "/api/v1/emergency-alerts/history?limit=5",
                    headers=headers_admin,
                )
                self.assertEqual(res_hist.status_code, 200)
                self.assertGreaterEqual(len(res_hist.json()), 1)

                # 8. GET /api/v1/emergency-alerts/safety-check/init (Màn 3/4 Khởi tạo Safety Check)
                res_sc_init = client.get(
                    "/api/v1/emergency-alerts/safety-check/init?lat=10.7580&lng=106.6750",
                    headers=headers_citizen,
                )
                self.assertEqual(res_sc_init.status_code, 200)
                self.assertTrue(res_sc_init.json()["is_gps_verified"])

                # 9. POST /api/v1/emergency-alerts/safety-check/mark-safe (Màn 3/4 Nút Tôi an toàn)
                res_ms = client.post(
                    "/api/v1/emergency-alerts/safety-check/mark-safe",
                    json={
                        "alert_id": alert_id,
                        "latitude": 10.7580,
                        "longitude": 106.6750,
                        "location_address": "120 An Dương Vương, P3, Q5",
                        "safety_status": "SAFE",
                    },
                    headers=headers_citizen,
                )
                self.assertEqual(res_ms.status_code, 200)
                self.assertTrue(res_ms.json()["is_safe"])
                self.assertTrue(res_ms.json()["success"])

                # 10. POST /api/v1/emergency-alerts/{alert_id}/cancel (Màn 1/4 Hủy lệnh phát sóng)
                res_cancel = client.post(
                    f"/api/v1/emergency-alerts/{alert_id}/cancel",
                    json={"cancellation_reason": "Nước đã rút hoàn toàn", "version": 1},
                    headers=headers_admin,
                )
                self.assertEqual(res_cancel.status_code, 200)
                self.assertTrue(res_cancel.json()["success"])
        finally:
            app.dependency_overrides.clear()


