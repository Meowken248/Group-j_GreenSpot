"""
Comprehensive Test Suite for Features 28 & 29:
- Chức năng 28: Cơ chế tích lũy điểm thưởng Công dân Xanh (Green Points Earning & Policy)
- Chức năng 29: Ví điểm và lịch sử biến động điểm xanh (Green Wallet & Transaction History)
Target: 100% Logic and Coverage across Service & Endpoints
"""

import unittest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role
from app.models.reward import RewardTransaction
from app.services.reward_service import (
    RewardService,
    calculate_tier_details,
    format_transaction_code,
    ACTION_CONFIG,
    TIERS_CONFIG,
)
from app.schemas.reward import (
    ClaimPointRequest,
    TransactionHistoryFilter,
)


class TestRewardFeatures28And29(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await engine.dispose()
        self.db = AsyncSessionLocal()
        # Tạo test role nếu chưa có
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

        # Tạo user test riêng biệt
        self.test_user_id = uuid.uuid4()
        self.test_user = User(
            user_id=self.test_user_id,
            email=f"test_citizen_{self.test_user_id.hex[:8]}@example.com",
            password_hash="fake_hash",
            full_name="Nguyễn Văn Xanh",
            role_id=citizen_role.role_id,
            status="ACTIVE",
            green_points=100,
            lifetime_points=250,
        )
        self.db.add(self.test_user)
        await self.db.commit()
        await self.db.refresh(self.test_user)

        self.service = RewardService(self.db)

    async def asyncTearDown(self):
        try:
            # Dọn dẹp dữ liệu giao dịch và test user
            await self.db.execute(
                delete(RewardTransaction).where(RewardTransaction.user_id == self.test_user_id)
            )
            await self.db.execute(delete(User).where(User.user_id == self.test_user_id))
            await self.db.commit()
            await self.db.close()
        except Exception:
            pass
        await engine.dispose()

    # --------------------------------------------------------------------------
    # CHỨC NĂNG 28 TESTS: CƠ CHẾ TÍCH LŨY ĐIỂM
    # --------------------------------------------------------------------------

    async def test_01_get_points_policy_public(self):
        """Kiểm tra xem chính sách tích điểm công khai (không cần login)"""
        policy = await self.service.get_points_policy(user_id=None)
        self.assertIsNotNone(policy.policy_title)
        self.assertGreaterEqual(len(policy.actions), 6)
        self.assertEqual(len(policy.tiers), 4)
        self.assertIsNone(policy.user_summary)

        # Kiểm tra tỷ lệ điểm chuẩn theo báo cáo: Báo cáo +50, Nghiệm thu +100
        action_map = {a.action_type: a.points for a in policy.actions}
        self.assertEqual(action_map.get("REPORT_INCIDENT"), 50)
        self.assertEqual(action_map.get("VERIFY_INCIDENT"), 100)
        self.assertEqual(action_map.get("EVENT_CHECKIN"), 50)
        self.assertEqual(action_map.get("ECO_REACTION"), 2)

    async def test_02_get_points_policy_authenticated(self):
        """Kiểm tra chính sách tích điểm khi đã đăng nhập: Cột phải có thông tin user"""
        policy = await self.service.get_points_policy(user_id=self.test_user_id)
        self.assertIsNotNone(policy.user_summary)
        summary = policy.user_summary
        self.assertEqual(summary["user_id"], str(self.test_user_id))
        self.assertEqual(summary["green_points"], 100)
        self.assertEqual(summary["tier_name"], "Hạng Đồng")
        self.assertEqual(summary["points_to_next_tier"], 400)  # Cần 500 để lên Bạc

    async def test_03_get_daily_limits_policy(self):
        """Kiểm tra các quy định hạn mức 24h và chế tài chống gian lận"""
        limits_policy = await self.service.get_daily_limits_policy()
        self.assertGreaterEqual(len(limits_policy.limits), 4)
        self.assertGreaterEqual(len(limits_policy.fraud_rules), 3)

        # Kiểm tra luật Fake GPS
        fraud_types = [r.rule_type for r in limits_policy.fraud_rules]
        self.assertIn("GPS_SPOOFING", fraud_types)
        self.assertIn("FAKE_EVIDENCE", fraud_types)

    async def test_04_claim_points_success_and_tier_upgrade(self):
        """Kiểm tra nhận điểm thưởng và tự động thăng hạng danh hiệu"""
        # Đặt điểm ban đầu là 480 (cận Hạng Bạc 500)
        self.test_user.green_points = 480
        await self.db.commit()

        req = ClaimPointRequest(
            action_type="REPORT_INCIDENT",
            description="Báo cáo bãi rác tự phát đường số 8",
            latitude=10.8500,
            longitude=106.7700,
        )
        res = await self.service.claim_points(self.test_user_id, req)

        self.assertTrue(res.success)
        self.assertEqual(res.points_awarded, 50)
        self.assertEqual(res.new_balance, 530)
        self.assertEqual(res.current_tier.tier_code, "SILVER")
        self.assertTrue(res.tier_upgraded)
        self.assertEqual(res.upgraded_tier_name, "Hạng Bạc")
        self.assertTrue(res.transaction_code.startswith("#TX-"))

    async def test_05_claim_points_reject_fake_gps(self):
        """Kiểm tra chặn gian lận GPS nếu tọa độ nằm ngoài phạm vi thực tế"""
        req = ClaimPointRequest(
            action_type="REPORT_INCIDENT",
            latitude=21.0285,  # Hà Nội (ngoài TP.HCM)
            longitude=105.8542,
        )
        with self.assertRaises(HTTPException) as ctx:
            await self.service.claim_points(self.test_user_id, req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("tọa độ không hợp lệ", ctx.exception.detail.lower())

    async def test_06_claim_points_daily_cap_enforcement(self):
        """Kiểm tra cơ chế chặn khi đạt trần điểm thưởng trong ngày"""
        req = ClaimPointRequest(action_type="EVENT_CHECKIN")  # cap = 50

        # Lần 1: Thành công nhận 50 điểm
        res1 = await self.service.claim_points(self.test_user_id, req)
        self.assertEqual(res1.points_awarded, 50)

        # Lần 2: Đã đạt trần 50 điểm trong ngày -> Báo 429 Too Many Requests
        with self.assertRaises(HTTPException) as ctx:
            await self.service.claim_points(self.test_user_id, req)
        self.assertEqual(ctx.exception.status_code, 429)

    # --------------------------------------------------------------------------
    # CHỨC NĂNG 29 TESTS: VÍ ĐIỂM VÀ LỊCH SỬ BIẾN ĐỘNG
    # --------------------------------------------------------------------------

    async def test_07_wallet_summary(self):
        """Kiểm tra thông tin ví điểm: Số dư, cấp bậc, tuần này, điểm đã dùng"""
        # Thêm 1 giao dịch cộng điểm và 1 giao dịch trừ điểm
        tx1 = RewardTransaction(
            transaction_id=uuid.uuid4(),
            user_id=self.test_user_id,
            transaction_type="VERIFY_INCIDENT",
            points_amount=100,
            balance_after=200,
            description="Nghiệm thu dọn sạch",
            created_at=datetime.now(timezone.utc),
        )
        tx2 = RewardTransaction(
            transaction_id=uuid.uuid4(),
            user_id=self.test_user_id,
            transaction_type="REDEEM_GIFT",
            points_amount=-50,
            balance_after=150,
            description="Đổi voucher trà xanh",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add_all([tx1, tx2])
        self.test_user.green_points = 150
        await self.db.commit()

        summary = await self.service.get_wallet_summary(self.test_user_id)
        self.assertEqual(summary.green_points, 150)
        self.assertEqual(summary.points_earned_this_week, 100)
        self.assertEqual(summary.points_spent_total, 50)
        self.assertEqual(summary.total_transactions_count, 2)
        self.assertEqual(summary.current_tier.tier_code, "BRONZE")

    async def test_08_transaction_history_filter(self):
        """Kiểm tra sao kê lịch sử biến động điểm kèm bộ lọc Cộng / Trừ"""
        tx_earn = RewardTransaction(
            transaction_id=uuid.uuid4(),
            user_id=self.test_user_id,
            transaction_type="REPORT_INCIDENT",
            points_amount=50,
            balance_after=150,
            created_at=datetime.now(timezone.utc),
        )
        tx_redeem = RewardTransaction(
            transaction_id=uuid.uuid4(),
            user_id=self.test_user_id,
            transaction_type="REDEEM_GIFT",
            points_amount=-80,
            balance_after=70,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add_all([tx_earn, tx_redeem])
        await self.db.commit()

        # Lọc chỉ điểm cộng (EARN)
        f_earn = TransactionHistoryFilter(flow_type="EARN", page=1, page_size=10)
        res_earn = await self.service.get_transaction_history(self.test_user_id, f_earn)
        self.assertEqual(res_earn.total, 1)
        self.assertTrue(res_earn.items[0].is_positive)

        # Lọc chỉ điểm trừ (REDEEM)
        f_redeem = TransactionHistoryFilter(flow_type="REDEEM", page=1, page_size=10)
        res_redeem = await self.service.get_transaction_history(self.test_user_id, f_redeem)
        self.assertEqual(res_redeem.total, 1)
        self.assertFalse(res_redeem.items[0].is_positive)

    async def test_09_transaction_detail_popup(self):
        """Kiểm tra xem chứng từ chi tiết giao dịch (Popup Màn 3)"""
        tx_id = uuid.uuid4()
        tx = RewardTransaction(
            transaction_id=tx_id,
            user_id=self.test_user_id,
            transaction_type="VERIFY_INCIDENT",
            points_amount=100,
            balance_after=200,
            description="Nghiệm thu dọn sạch bãi rác Lê Lợi",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(tx)
        await self.db.commit()

        detail = await self.service.get_transaction_detail(tx_id, self.test_user_id)
        self.assertEqual(detail.transaction_id, str(tx_id))
        self.assertEqual(detail.transaction_code, format_transaction_code(tx_id))
        self.assertEqual(detail.status, "Thành công")
        self.assertEqual(detail.points_amount, 100)
        self.assertIsNotNone(detail.audit_note)

    async def test_10_tier_calculation_utility(self):
        """Kiểm tra hàm tiện ích tính toán các cấp bậc danh hiệu"""
        cur, nxt, needed, prog = calculate_tier_details(0)
        self.assertEqual(cur.tier_code, "BRONZE")
        self.assertEqual(nxt.tier_code, "SILVER")
        self.assertEqual(needed, 500)

        cur, nxt, needed, prog = calculate_tier_details(1450)
        self.assertEqual(cur.tier_code, "GOLD")
        self.assertEqual(nxt.tier_code, "DIAMOND")
        self.assertEqual(needed, 550)

        cur, nxt, needed, prog = calculate_tier_details(3000)
        self.assertEqual(cur.tier_code, "DIAMOND")
        self.assertIsNone(nxt)
        self.assertEqual(needed, 0)
        self.assertEqual(prog, 100.0)


if __name__ == "__main__":
    unittest.main()
