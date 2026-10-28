import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role
from app.models.system_config import SystemConfig
from app.schemas.alert_subscription import AlertSubscriptionRequest
from app.services.alert_subscription_service import AlertSubscriptionService
from app.services.public_reports_service import PublicReportsService
from app.api.v1.alerts import get_live_map_points


class TestFeatures313233Official(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await engine.dispose()
        self.db = AsyncSessionLocal()

        role_stmt = select(Role).where(Role.role_code == "CITIZEN")
        citizen_role = (await self.db.execute(role_stmt)).scalar_one_or_none()
        if not citizen_role:
            citizen_role = Role(role_code="CITIZEN", role_name="Công dân", is_system=True)
            self.db.add(citizen_role)
            await self.db.commit()
            await self.db.refresh(citizen_role)

        self.test_user_id = str(uuid.uuid4())
        self.test_user = User(
            user_id=uuid.UUID(self.test_user_id),
            email=f"tester313233_{self.test_user_id[:8]}@example.com",
            password_hash="fake_hash",
            full_name="Nguyễn Văn Kiểm Thử",
            role_id=citizen_role.role_id,
            status="ACTIVE",
            green_points=100,
        )
        self.db.add(self.test_user)
        await self.db.commit()

    async def asyncTearDown(self):
        try:
            await self.db.rollback()
            await self.db.execute(delete(SystemConfig).where(SystemConfig.config_key == f"ALERT_SUB_{self.test_user_id}"))
            await self.db.execute(delete(User).where(User.user_id == uuid.UUID(self.test_user_id)))
            await self.db.commit()
            await self.db.close()
        except Exception:
            pass

    # =====================================================================
    # CHỨC NĂNG 31: BẢN ĐỒ CẢNH BÁO Ô NHIỄM TRỰC QUAN (MAP_001)
    # =====================================================================
    async def test_live_map_points_structure_and_coordinates(self):
        """Kiểm tra danh sách điểm cảnh báo và ràng buộc MAP_001 (Tọa độ GPS chuẩn)"""
        points = await get_live_map_points(category=None, severity=None, db=self.db)
        self.assertIsInstance(points, list)
        self.assertGreater(len(points), 0)

        for p in points:
            self.assertIn("point_id", p)
            self.assertIn("title", p)
            self.assertIn("category", p)
            self.assertIn("severity_level", p)
            self.assertIn("latitude", p)
            self.assertIn("longitude", p)
            self.assertIn("safety_advice", p)

            # MAP_001: Tọa độ hợp lệ trong dải [-90, 90] và [-180, 180]
            lat = p["latitude"]
            lng = p["longitude"]
            self.assertTrue(-90.0 <= lat <= 90.0, f"Vĩ độ {lat} vượt ngưỡng MAP_001")
            self.assertTrue(-180.0 <= lng <= 180.0, f"Kinh độ {lng} vượt ngưỡng MAP_001")

    async def test_live_map_points_category_and_severity_filter(self):
        """Kiểm tra bộ lọc chuyên đề lớp ô nhiễm (MAP_LAYER_FILTER)"""
        points_air = await get_live_map_points(category="AIR", severity=None, db=self.db)
        for p in points_air:
            self.assertEqual(p["category"], "AIR")

        points_red = await get_live_map_points(category=None, severity="RED", db=self.db)
        for p in points_red:
            self.assertEqual(p["severity_level"], "RED")

    # =====================================================================
    # CHỨC NĂNG 32: ĐĂNG KÝ NHẬN TIN CÁ NHÂN HÓA (SUB_001, SUB_002, SUB_003)
    # =====================================================================
    async def test_get_alert_subscription_default(self):
        """Lấy cấu hình đăng ký nhận tin ban đầu"""
        data = await AlertSubscriptionService.get_subscription(self.db, self.test_user_id)
        self.assertIsNotNone(data)
        self.assertIsInstance(data.subscribed_districts, list)
        self.assertEqual(data.min_severity_level, "ALL")
        self.assertTrue(data.notify_in_app)

    async def test_update_alert_subscription_success(self):
        """Cập nhật sở thích nhận tin hợp lệ"""
        req = AlertSubscriptionRequest(
            subscribed_districts=["QUAN_1", "QUAN_3", "TP_THU_DUC"],
            min_severity_level="ORANGE_RED",
            notify_in_app=True,
            notify_email=True,
            email_address="citizen_test@greenspot.vn",
            is_muted=False,
        )
        data = await AlertSubscriptionService.update_subscription(self.db, self.test_user_id, req)
        self.assertEqual(len(data.subscribed_districts), 3)
        self.assertEqual(data.min_severity_level, "ORANGE_RED")
        self.assertTrue(data.notify_in_app)
        self.assertEqual(data.email_address, "citizen_test@greenspot.vn")

    async def test_sub_001_exceed_max_districts(self):
        """SUB_001: Không được chọn quá 5 khu vực địa bàn"""
        with self.assertRaises(ValueError) as ctx:
            AlertSubscriptionRequest(
                subscribed_districts=["QUAN_1", "QUAN_3", "TP_THU_DUC", "BINH_THANH", "GO_VAP", "QUAN_7"],
                min_severity_level="ALL",
                notify_in_app=True,
                notify_email=False,
            )
        self.assertIn("SUB_001", str(ctx.exception))

    async def test_sub_002_mute_all_channels_without_mute_flag(self):
        """SUB_002: Bắt buộc giữ ít nhất một kênh nhận tin (Web hoặc Email) hoạt động"""
        req = AlertSubscriptionRequest(
            subscribed_districts=["QUAN_1"],
            min_severity_level="ALL",
            notify_in_app=False,
            notify_email=False,
            is_muted=False,
        )
        with self.assertRaises(HTTPException) as ctx:
            await AlertSubscriptionService.update_subscription(self.db, self.test_user_id, req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("SUB_002", ctx.exception.detail)

    async def test_sub_003_invalid_email_format(self):
        """SUB_003: Nếu bật nhận email, email phải đúng định dạng"""
        req = AlertSubscriptionRequest(
            subscribed_districts=["QUAN_1"],
            min_severity_level="ALL",
            notify_in_app=True,
            notify_email=True,
            email_address="email_sai_dinh_dang",
            is_muted=False,
        )
        with self.assertRaises(HTTPException) as ctx:
            await AlertSubscriptionService.update_subscription(self.db, self.test_user_id, req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("SUB_003", ctx.exception.detail)

    # =====================================================================
    # CHỨC NĂNG 33: BẢNG TỔNG QUAN CHỈ SỐ MÔI TRƯỜNG ĐÔ THỊ CÔNG CỘNG
    # =====================================================================
    async def test_public_dashboard_metrics(self):
        """Kiểm tra dữ liệu bảng điều khiển công cộng (Dashboard Dân Sinh)"""
        data = await PublicReportsService.get_public_dashboard(self.db)

        # 4 Thẻ KPI: DSH_CARD_ACTIVE_ALERTS, DSH_CARD_RESOLVED, DSH_CARD_SAFETY_RATE, DSH_CARD_AVG_TIME
        self.assertGreater(data.active_alerts_count, 0)
        self.assertGreater(data.resolved_incidents_count, 0)
        self.assertGreaterEqual(data.safety_rate_pct, 0.0)
        self.assertEqual(data.avg_response_hours, 3.5)

        # Biểu đồ tròn cơ cấu loại ô nhiễm: DSH_CHART_PIE_TYPE
        self.assertGreater(len(data.pollution_distribution), 0)
        for item in data.pollution_distribution:
            self.assertIsNotNone(item.category)
            self.assertGreater(item.percentage, 0.0)
            self.assertTrue(item.color.startswith("#"))

        # Biểu đồ cột theo quận huyện: DSH_CHART_BAR_DISTRICT
        self.assertGreater(len(data.district_comparison), 0)
        for d in data.district_comparison:
            self.assertIsNotNone(d.district)
            self.assertGreaterEqual(d.clean_rate, 0.0)

        # Bảng vinh danh Top Phường Xanh: DSH_TBL_TOP_GREEN
        self.assertEqual(len(data.top_green_wards), 5)
        for w in data.top_green_wards:
            self.assertIsNotNone(w.ward)
            self.assertGreater(w.green_score, 80.0)
            self.assertIsNotNone(w.badge)


if __name__ == "__main__":
    unittest.main()
