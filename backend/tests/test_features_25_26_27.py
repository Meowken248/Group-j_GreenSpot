"""
Comprehensive Test Suite for Features 25, 26 & 27:
- Chức năng 25: Thử thách xanh trong tuần (nhiệm vụ nhỏ) nhận điểm thưởng
- Chức năng 26: Nhật ký kiểm toán Audit Log: ghi lại thao tác quan trọng
- Chức năng 27: Thư viện sống xanh: cẩm nang phân loại rác
Target: 100% Logic and Coverage across Services & Models
"""

import unittest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role
from app.models.challenge import GreenChallenge, UserChallenge
from app.models.audit import AuditLog
from app.models.waste_handbook import WasteHandbookItem
from app.services.challenge_service import ChallengeService, get_current_week_str, get_week_time_left
from app.services.audit_service import AuditService, mask_sensitive, parse_device_info
from app.services.waste_handbook_service import WasteHandbookService
from app.schemas.challenge import ChallengeSubmitRequest
from app.schemas.audit import AuditExportRequest

class TestFeatures252627(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await engine.dispose()
        self.db = AsyncSessionLocal()

        # 1. Setup CITIZEN Role and User
        role_stmt = select(Role).where(Role.role_code == "CITIZEN")
        citizen_role = (await self.db.execute(role_stmt)).scalar_one_or_none()
        if not citizen_role:
            citizen_role = Role(
                role_code="CITIZEN",
                role_name="Công dân",
                description="Công dân",
                is_system=True,
            )
            self.db.add(citizen_role)
            await self.db.commit()
            await self.db.refresh(citizen_role)

        self.test_user_id = uuid.uuid4()
        self.test_user = User(
            user_id=self.test_user_id,
            email=f"test_citizen_{self.test_user_id.hex[:8]}@example.com",
            password_hash="fake_hash",
            full_name="Đặng Thử Thách",
            role_id=citizen_role.role_id,
            status="ACTIVE",
        )
        self.db.add(self.test_user)

        # 2. Setup ADMIN Role and User
        admin_role_stmt = select(Role).where(Role.role_code == "ADMIN")
        admin_role = (await self.db.execute(admin_role_stmt)).scalar_one_or_none()
        if not admin_role:
            admin_role = Role(
                role_code="ADMIN",
                role_name="Quản trị viên",
                description="Quản trị viên",
                is_system=True,
            )
            self.db.add(admin_role)
            await self.db.commit()
            await self.db.refresh(admin_role)

        self.test_admin_id = uuid.uuid4()
        self.test_admin = User(
            user_id=self.test_admin_id,
            email=f"test_admin_{self.test_admin_id.hex[:8]}@example.com",
            password_hash="fake_hash",
            full_name="Quản Trị Viên An Ninh",
            role_id=admin_role.role_id,
            status="ACTIVE",
        )
        self.db.add(self.test_admin)
        await self.db.commit()

    async def asyncTearDown(self):
        # Cleanup
        await self.db.execute(delete(UserChallenge).where(UserChallenge.user_id == self.test_user_id))
        await self.db.execute(delete(AuditLog).where(AuditLog.user_id.in_([self.test_user_id, self.test_admin_id])))
        await self.db.execute(delete(User).where(User.user_id.in_([self.test_user_id, self.test_admin_id])))
        await self.db.commit()
        await self.db.close()

    # ==========================================
    # TESTS FOR FEATURE 25: WEEKLY CHALLENGES
    # ==========================================
    async def test_feature_25_get_weekly_challenges(self):
        """Test retrieving weekly challenges, countdown string, and user progress"""
        resp = await ChallengeService.get_weekly_challenges(self.db, self.test_user_id)
        self.assertTrue(resp.total_count >= 5)
        self.assertIn("Còn", resp.time_left_str)
        self.assertEqual(resp.completed_count, 0)
        self.assertEqual(resp.progress_percentage, 0)
        self.assertFalse(resp.is_all_completed)

    async def test_feature_25_submit_challenge_auto_verify(self):
        """Test submitting evidence for auto-verifiable challenge: +30 points awarded"""
        payload = ChallengeSubmitRequest(
            evidence_image_url="https://example.com/proof-sort-waste.jpg",
            evidence_note="Đã phân loại rác hữu cơ và tái chế riêng"
        )
        res = await ChallengeService.submit_challenge(
            db=self.db,
            challenge_id="CHALLENGE_SORT_WASTE",
            user_id=self.test_user_id,
            payload=payload
        )
        self.assertEqual(res.status, "COMPLETED")
        self.assertEqual(res.points_awarded, 30)
        self.assertIn("30 điểm xanh", res.message)

        # Check progress updated
        resp = await ChallengeService.get_weekly_challenges(self.db, self.test_user_id)
        self.assertGreaterEqual(resp.completed_count, 1)

    async def test_feature_25_duplicate_submission_rejected(self):
        """Test that submitting an already completed challenge raises 400 Bad Request"""
        payload = ChallengeSubmitRequest(
            evidence_image_url="https://example.com/proof1.jpg",
            evidence_note="Lần nộp 1"
        )
        await ChallengeService.submit_challenge(
            db=self.db,
            challenge_id="CHALLENGE_SORT_WASTE",
            user_id=self.test_user_id,
            payload=payload
        )

        # Submit second time
        with self.assertRaises(HTTPException) as ctx:
            await ChallengeService.submit_challenge(
                db=self.db,
                challenge_id="CHALLENGE_SORT_WASTE",
                user_id=self.test_user_id,
                payload=payload
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("đã hoàn thành", ctx.exception.detail)

    async def test_feature_25_manual_review_challenge(self):
        """Test submitting challenge requiring manual review: transitions to PENDING"""
        payload = ChallengeSubmitRequest(
            evidence_image_url="https://example.com/no-plastic-bag.jpg",
            evidence_note="Dùng túi vải khi mua sắm"
        )
        res = await ChallengeService.submit_challenge(
            db=self.db,
            challenge_id="CHALLENGE_NO_PLASTIC_BAG",
            user_id=self.test_user_id,
            payload=payload
        )
        self.assertEqual(res.status, "PENDING")
        self.assertEqual(res.points_awarded, 0)
        self.assertIn("24h", res.message)

    # ==========================================
    # TESTS FOR FEATURE 26: AUDIT LOGS
    # ==========================================
    async def test_feature_26_date_range_validation(self):
        """Test audit log date range validation rules (start > end, future dates, max 365 days)"""
        now = datetime.now(timezone.utc)

        # Start after end
        with self.assertRaises(HTTPException) as ctx:
            AuditService.validate_date_range(now, now - timedelta(days=2))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("trước ngày kết thúc", ctx.exception.detail)

        # Future date
        with self.assertRaises(HTTPException) as ctx:
            AuditService.validate_date_range(now + timedelta(days=5), now + timedelta(days=10))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("tương lai", ctx.exception.detail)

        # Exceeds 365 days
        with self.assertRaises(HTTPException) as ctx:
            AuditService.validate_date_range(now - timedelta(days=400), now)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("365 ngày", ctx.exception.detail)

    async def test_feature_26_sensitive_data_masking(self):
        """Test that passwords, tokens, and secrets are masked to ****** in audit diff"""
        sample_data = {
            "user_id": str(uuid.uuid4()),
            "email": "user@example.com",
            "password": "SuperSecretPassword123!",
            "refresh_token": "secret_jwt_payload_here",
            "points": 100
        }
        masked = mask_sensitive(sample_data)
        self.assertEqual(masked["password"], "******")
        self.assertEqual(masked["refresh_token"], "******")
        self.assertEqual(masked["email"], "user@example.com")
        self.assertEqual(masked["points"], 100)

    async def test_feature_26_query_and_detail(self):
        """Test querying audit logs and viewing detailed diff"""
        # Create a test audit log
        log = AuditLog(
            user_id=self.test_admin_id,
            action="UPDATE_ROLE",
            table_name="roles",
            record_id="role-test-99",
            old_data={"role_code": "CITIZEN", "access_token": "old_tok"},
            new_data={"role_code": "ADMIN", "access_token": "new_tok"},
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0",
            request_uri="/api/v1/admin/roles/assign",
            is_suspicious=False
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)

        # Query logs
        logs_resp = await AuditService.get_audit_logs(
            db=self.db,
            action="UPDATE_ROLE",
            actor_query="Quản Trị Viên An Ninh",
            page=1,
            limit=10
        )
        self.assertGreaterEqual(logs_resp.total, 1)

        # Get detail
        detail = await AuditService.get_audit_log_detail(self.db, log.log_id)
        self.assertEqual(detail.action, "UPDATE_ROLE")
        self.assertEqual(detail.actor_name, "Quản Trị Viên An Ninh")
        self.assertEqual(detail.old_data["access_token"], "******")
        self.assertEqual(detail.new_data["access_token"], "******")
        self.assertTrue(detail.has_data_changes)
        self.assertIn("Windows", detail.device_info)

    async def test_feature_26_export_audit_logs(self):
        """Test exporting audit logs records export operation into the audit log"""
        payload = AuditExportRequest(
            format="EXCEL",
            action="ALL"
        )
        export_res = await AuditService.export_audit_logs(
            db=self.db,
            payload=payload,
            admin_user_id=self.test_admin_id
        )
        self.assertEqual(export_res.format, "EXCEL")
        self.assertGreaterEqual(export_res.total_records, 1)
        self.assertIn("thành công", export_res.message)

    # ==========================================
    # TESTS FOR FEATURE 27: WASTE HANDBOOK
    # ==========================================
    async def test_feature_27_get_overview(self):
        """Test waste handbook overview returns 4 national categories and items"""
        overview = await WasteHandbookService.get_overview(self.db)
        self.assertEqual(len(overview.categories), 4)
        cat_codes = [c.code for c in overview.categories]
        self.assertIn("ORGANIC", cat_codes)
        self.assertIn("RECYCLABLE", cat_codes)
        self.assertIn("HAZARDOUS", cat_codes)
        self.assertIn("OTHER", cat_codes)
        self.assertGreaterEqual(len(overview.featured_items), 4)

    async def test_feature_27_search_items(self):
        """Test searching waste items by keyword and category"""
        results = await WasteHandbookService.search_items(self.db, query="pin")
        self.assertTrue(len(results) >= 1)
        self.assertEqual(results[0].category_code, "HAZARDOUS")

        results_cat = await WasteHandbookService.search_items(self.db, category="RECYCLABLE")
        self.assertTrue(len(results_cat) >= 1)

    async def test_feature_27_get_item_detail(self):
        """Test item detail contains sorting instructions, correct bin, and station shortcut"""
        detail = await WasteHandbookService.get_item_detail(self.db, "ITEM_OLD_BATTERY")
        self.assertEqual(detail.name, "Pin đã qua sử dụng & Ắc quy")
        self.assertEqual(detail.category_code, "HAZARDOUS")
        self.assertEqual(detail.station_action_label, "Tìm điểm thu gom")
        self.assertTrue(detail.has_dedicated_station)
        self.assertIn("đỏ", detail.bin_name.lower())

if __name__ == '__main__':
    unittest.main()
