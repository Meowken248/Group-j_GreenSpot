import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role
from app.models.system_config import SystemConfig
from app.models.incident import Incident
from app.models.reward import UserVoucher
from app.schemas.alert_config import UpdateThresholdsRequest, ThresholdRuleItem
from app.schemas.sos_alert import SOSSubmitRequest, ToggleSOSBannerRequest
from app.services.alert_config_service import AlertConfigService
from app.services.sos_service import SOSService
from app.services.public_reports_service import PublicReportsService
from app.services.lucky_wheel_service import LuckyWheelService, WHEEL_SLOTS


class TestOfficialFeatures34_35_36(unittest.IsolatedAsyncioTestCase):
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

        self.test_user_id = uuid.uuid4()
        self.test_user = User(
            user_id=self.test_user_id,
            email=f"tester_official_{self.test_user_id.hex[:8]}@example.com",
            password_hash="fake_hash",
            full_name="Nguyễn Văn Nghiệp Vụ",
            role_id=citizen_role.role_id,
            status="ACTIVE",
            green_points=150,
        )
        self.db.add(self.test_user)
        await self.db.commit()

        # Reset threshold configs for clean test slate
        await AlertConfigService.reset_to_default(self.db)

    async def asyncTearDown(self):
        try:
            await self.db.rollback()
            await self.db.execute(delete(UserVoucher).where(UserVoucher.user_id == self.test_user_id))
            await self.db.execute(delete(Incident).where(Incident.reporter_phone_masked == "0912345678"))
            await self.db.execute(delete(User).where(User.user_id == self.test_user_id))
            await self.db.commit()
            await self.db.close()
        except Exception:
            pass

    # -------------------------------------------------------------
    # FEATURE 34: QUẢN TRỊ NGƯỠNG CẢNH BÁO & BÁN KÍNH PHÁT TIN
    # -------------------------------------------------------------
    async def test_feature_34_get_threshold_configs(self):
        cfg = await AlertConfigService.get_threshold_configs(self.db)
        self.assertIsNotNone(cfg)
        self.assertTrue(len(cfg.rules) >= 3)
        severities = [r.severity_level for r in cfg.rules]
        self.assertIn("YELLOW", severities)
        self.assertIn("RED", severities)

    async def test_feature_34_update_threshold_valid(self):
        valid_rules = [
            ThresholdRuleItem(
                severity_level="YELLOW",
                severity_name="Mức Chú Ý",
                radius_km=1.5,
                default_safety_advice="Đóng kín cửa sổ khi đi ngủ.",
            ),
            ThresholdRuleItem(
                severity_level="ORANGE",
                severity_name="Mức Nguy Cơ",
                radius_km=3.0,
                default_safety_advice="Đeo khẩu trang phòng hộ.",
            ),
            ThresholdRuleItem(
                severity_level="RED",
                severity_name="Mức Nguy Hại",
                radius_km=8.0,
                default_safety_advice="Di tản khẩn cấp theo hướng dẫn của chính quyền.",
            ),
        ]
        req = UpdateThresholdsRequest(rules=valid_rules, hotline_number="1800-1111")
        res = await AlertConfigService.update_threshold_configs(self.db, req, actor_id=self.test_user_id)
        self.assertEqual(res.hotline_number, "1800-1111")
        self.assertEqual(res.rules[0].radius_km, 1.5)
        self.assertEqual(len(res.rules), 3)

    async def test_feature_34_validation_rule_001_too_small_radius(self):
        invalid_rules = [
            ThresholdRuleItem(
                severity_level="YELLOW",
                severity_name="Mức Chú Ý",
                radius_km=0.2,  # Nhỏ hơn 0.5km -> RULE_001
                default_safety_advice="Khuyến cáo an toàn",
            )
        ]
        req = UpdateThresholdsRequest(rules=invalid_rules)
        with self.assertRaises(HTTPException) as ctx:
            await AlertConfigService.update_threshold_configs(self.db, req)
        self.assertIn("RULE_001", ctx.exception.detail)

    async def test_feature_34_validation_rule_002_too_large_radius(self):
        invalid_rules = [
            ThresholdRuleItem(
                severity_level="RED",
                severity_name="Mức Đỏ",
                radius_km=15.0,  # Lớn hơn 10.0km -> RULE_002
                default_safety_advice="Khuyến cáo an toàn",
            )
        ]
        req = UpdateThresholdsRequest(rules=invalid_rules)
        with self.assertRaises(HTTPException) as ctx:
            await AlertConfigService.update_threshold_configs(self.db, req)
        self.assertIn("RULE_002", ctx.exception.detail)

    # -------------------------------------------------------------
    # FEATURE 35: KÊNH TIẾP NHẬN TÍN HIỆU SOS & BANNER KHẨN CẤP
    # -------------------------------------------------------------
    async def test_feature_35_submit_sos_success(self):
        req = SOSSubmitRequest(
            phone_number="0912345678",
            incident_type="CHAY_DOC",
            latitude=10.8494,
            longitude=106.7584,
            address_text="Khu phố 3, Phường Linh Trung, TP. Thủ Đức",
            note="Khói bốc mùi khét lan rộng",
        )
        res = await SOSService.submit_sos_incident(self.db, req)
        self.assertTrue(res.success)
        self.assertTrue(res.tracking_code.startswith("SOS-"))
        self.assertEqual(res.severity, "CRITICAL")

        # Kiểm tra rate limit SOS_003 (gửi liên tiếp trong 5 phút)
        with self.assertRaises(HTTPException) as ctx:
            await SOSService.submit_sos_incident(self.db, req)
        self.assertIn("SOS_003", ctx.exception.detail)

    async def test_feature_35_toggle_broadcast_banner(self):
        req = ToggleSOSBannerRequest(
            is_active=True,
            title="BÁO ĐỘNG ĐỎ: RÒ RỈ HÓA CHẤT",
            message="Yêu cầu người dân trong bán kính 2km đóng kín cửa sổ.",
            affected_areas=["Phường Linh Trung", "Hiệp Bình Chánh"],
        )
        res = await SOSService.toggle_broadcast_banner(self.db, req, actor_id=self.test_user_id)
        self.assertTrue(res.is_active)
        self.assertEqual(res.title, "BÁO ĐỘNG ĐỎ: RÒ RỈ HÓA CHẤT")

        # Đọc lại trạng thái công khai
        active = await SOSService.get_broadcast_banner(self.db)
        self.assertTrue(active.is_active)
        self.assertEqual(len(active.affected_areas), 2)

        # Tắt banner
        req_off = ToggleSOSBannerRequest(is_active=False)
        off_res = await SOSService.toggle_broadcast_banner(self.db, req_off)
        self.assertFalse(off_res.is_active)

    # -------------------------------------------------------------
    # FEATURE 36: TRUNG TÂM KẾT XUẤT BÁO CÁO DỮ LIỆU MỞ (PDF/EXCEL)
    # -------------------------------------------------------------
    async def test_feature_36_get_public_summary(self):
        summary = await PublicReportsService.get_public_summary(self.db, year=2026, month=10)
        self.assertIsNotNone(summary)
        self.assertEqual(summary.period_code, "2026-10")
        self.assertGreaterEqual(summary.total_incidents, 0)
        self.assertGreaterEqual(summary.resolution_rate, 0.0)

    async def test_feature_36_open_data_privacy_check(self):
        records = await PublicReportsService.get_open_data_records(self.db, year=2026, month=10, limit=10)
        self.assertIsInstance(records, list)
        for r in records:
            # Nguyên tắc OPEN_001: Tuyệt đối không chứa Họ tên, SĐT, Email
            self.assertFalse(hasattr(r, "reporter_name"))
            self.assertFalse(hasattr(r, "phone_number"))
            self.assertFalse(hasattr(r, "email"))

    async def test_feature_36_excel_bytes_generation(self):
        summary = await PublicReportsService.get_public_summary(self.db, year=2026, month=10)
        records = await PublicReportsService.get_open_data_records(self.db, year=2026, month=10, limit=5)
        excel_data = PublicReportsService.generate_excel_bytes(summary, records)
        self.assertIsInstance(excel_data, bytes)
        self.assertGreater(len(excel_data), 100)
