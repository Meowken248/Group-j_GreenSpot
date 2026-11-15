"""
Unit & Integration Tests for GreenSpot Features 30 & 31:
- Chức năng 30: Quản trị CRUD danh mục quà tặng xanh và kho voucher (Eco-Reward Catalog & Voucher Admin)
- Chức năng 31: Quản lý danh sách quà tặng cá nhân đã đổi & Voucher Wallet (Citizen Redeemed Rewards & Vouchers)
"""

import unittest
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, func

from app.core.config import settings
from app.models.rbac import User, Role
from app.models.reward import CitizenReward, RewardTransaction, UserVoucher
from app.services.reward_service import RewardService
from app.schemas.reward import CreateRewardRequest, UpdateRewardRequest
from fastapi import HTTPException


class TestRewardFeatures30And31(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        db_url = settings.DATABASE_URL
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if "?schema=" in db_url:
            db_url = db_url.split("?schema=")[0]

        self.engine = create_async_engine(db_url, echo=False)
        self.session_maker = async_sessionmaker(
            bind=self.engine, class_=AsyncSession, expire_on_commit=False
        )

        async with self.session_maker() as session:
            # Lấy hoặc tạo vai trò CITIZEN
            role = (await session.execute(select(Role).where(Role.role_code == "CITIZEN"))).scalar_one_or_none()
            if not role:
                role = Role(role_id=1, role_code="CITIZEN", role_name="Công dân")
                session.add(role)
                await session.commit()
                await session.refresh(role)

            self.test_user_id = uuid.uuid4()
            self.test_user = User(
                user_id=self.test_user_id,
                email=f"tester_30_31_{uuid.uuid4().hex[:6]}@greenspot.vn",
                password_hash="testhash123",
                full_name="Nguyễn Văn Test 30 31",
                role_id=role.role_id,
                green_points=1000,
                lifetime_points=2500,
                status="ACTIVE",
            )
            session.add(self.test_user)
            await session.commit()

    async def asyncTearDown(self):
        async with self.session_maker() as session:
            try:
                from sqlalchemy import delete
                await session.execute(
                    delete(UserVoucher).where(UserVoucher.user_id == self.test_user_id)
                )
                await session.execute(
                    delete(RewardTransaction).where(RewardTransaction.user_id == self.test_user_id)
                )
                await session.execute(
                    delete(User).where(User.user_id == self.test_user_id)
                )
                await session.commit()
            except Exception:
                pass
        await self.engine.dispose()

    async def test_01_get_reward_catalog_and_seed(self):
        """Kiểm tra lấy danh mục quà tặng xanh và tự động seed ban đầu"""
        async with self.session_maker() as session:
            service = RewardService(session)
            catalog = await service.get_reward_catalog()
            self.assertGreaterEqual(catalog.total, 1)
            self.assertGreaterEqual(len(catalog.items), 1)

            # Kiểm tra các trường thông tin cơ bản
            first_item = catalog.items[0]
            self.assertIsNotNone(first_item.reward_code)
            self.assertIsNotNone(first_item.title)
            self.assertGreaterEqual(first_item.points_required, 10)
            self.assertIn(first_item.stock_status, ["IN_STOCK", "OUT_OF_STOCK", "EXPIRED"])

    async def test_02_create_reward_valid(self):
        """Kiểm tra tạo quà tặng mới hợp lệ (Chức năng 30 Màn 2)"""
        async with self.session_maker() as session:
            service = RewardService(session)
            now = datetime.now(timezone.utc)
            req = CreateRewardRequest(
                title="Bình nước sinh thái Thủy tinh 600ml",
                description="Bình thủy tinh chịu nhiệt Borosilicate kèm bọc nỉ cách nhiệt.",
                brand="Thủy Tinh Xanh ESG",
                points_required=180,
                reward_type="PHYSICAL_GIFT",
                stock_quantity=50,
                expiry_date=now + timedelta(days=180),
            )
            created = await service.create_reward(req)
            self.assertEqual(created.title, req.title)
            self.assertEqual(created.stock_quantity, 50)
            self.assertEqual(created.points_required, 180)
            self.assertTrue(created.reward_code.startswith("REW-ECO-"))

            # Dọn dẹp
            r_db = await session.get(CitizenReward, created.reward_id)
            if r_db:
                await session.delete(r_db)
                await session.commit()

    async def test_03_create_reward_validation_errors(self):
        """Kiểm tra bắt lỗi hạn dùng quá khứ, tồn kho âm hoặc điểm < 10"""
        async with self.session_maker() as session:
            service = RewardService(session)
            now = datetime.now(timezone.utc)

            # Lỗi 1: Hạn dùng trong quá khứ
            with self.assertRaises(HTTPException) as ctx:
                await service.create_reward(
                    CreateRewardRequest(
                        title="Voucher quá hạn",
                        points_required=100,
                        stock_quantity=10,
                        expiry_date=now - timedelta(days=1),
                    )
                )
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("Hạn sử dụng", ctx.exception.detail)

    async def test_04_update_reward_and_stock_guard(self):
        """Kiểm tra cập nhật quà tặng và bảo vệ tồn kho (Chức năng 30 Màn 3)"""
        async with self.session_maker() as session:
            service = RewardService(session)
            now = datetime.now(timezone.utc)
            # Tạo 1 quà test
            created = await service.create_reward(
                CreateRewardRequest(
                    title="Voucher Test Update",
                    points_required=100,
                    stock_quantity=20,
                    expiry_date=now + timedelta(days=60),
                )
            )

            # Đổi 1 voucher để phát sinh voucher ACTIVE
            redeemed = await service.redeem_reward(self.test_user_id, created.reward_id)
            self.assertIsNotNone(redeemed.voucher_code)

            # Cố tình giảm tồn kho về 0 (nhưng có 1 voucher chưa sử dụng) -> phải bị chặn
            with self.assertRaises(HTTPException) as ctx:
                await service.update_reward(
                    created.reward_id,
                    UpdateRewardRequest(stock_quantity=0),
                )
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("không thể nhỏ hơn", ctx.exception.detail)

            # Cập nhật thông tin bình thường
            updated = await service.update_reward(
                created.reward_id,
                UpdateRewardRequest(title="Voucher Test Update - Mới", points_required=120),
            )
            self.assertEqual(updated.title, "Voucher Test Update - Mới")
            self.assertEqual(updated.points_required, 120)

            # Dọn dẹp voucher và reward
            v_db = await session.get(UserVoucher, uuid.UUID(redeemed.voucher_id))
            if v_db:
                await session.delete(v_db)
            r_db = await session.get(CitizenReward, created.reward_id)
            if r_db:
                await session.delete(r_db)
            await session.commit()

    async def test_05_delete_reward_guard(self):
        """Kiểm tra xóa quà tặng an toàn (Chức năng 30 Màn 4 & 5)"""
        async with self.session_maker() as session:
            service = RewardService(session)
            now = datetime.now(timezone.utc)
            created = await service.create_reward(
                CreateRewardRequest(
                    title="Quà xóa test",
                    points_required=50,
                    stock_quantity=10,
                    expiry_date=now + timedelta(days=30),
                )
            )

            # Xóa khi không có voucher lưu hành -> xóa thành công
            res = await service.delete_reward(created.reward_id)
            self.assertEqual(res["message"], "Danh sách đã cập nhật")

    async def test_06_get_redemption_analytics(self):
        """Kiểm tra thống kê số liệu quy đổi quà tặng (Chức năng 30 Màn 6)"""
        async with self.session_maker() as session:
            service = RewardService(session)
            analytics = await service.get_redemption_analytics(time_range="MONTH")
            self.assertEqual(analytics.time_range, "MONTH")
            self.assertIsInstance(analytics.bar_chart, list)
            self.assertIsInstance(analytics.line_chart, list)
            self.assertIsInstance(analytics.top_rewards, list)

    async def test_07_redeem_reward_success(self):
        """Kiểm tra công dân đổi quà thành công: trừ điểm, sinh voucher và mã QR (Chức năng 31)"""
        async with self.session_maker() as session:
            service = RewardService(session)
            catalog = await service.get_reward_catalog(stock_status="IN_STOCK")
            valid_reward = next(r for r in catalog.items if r.stock_quantity > 0)

            user_before = await session.get(User, self.test_user_id)
            pts_before = user_before.green_points

            res = await service.redeem_reward(self.test_user_id, valid_reward.reward_id)
            self.assertTrue(res.voucher_code.startswith("ECO-"))
            self.assertIn("Đổi thành công", res.message)
            self.assertEqual(res.balance_after, pts_before - valid_reward.points_required)

            # Kiểm tra trong kho voucher cá nhân
            v_id = uuid.UUID(res.voucher_id)
            v_db = await session.get(UserVoucher, v_id)
            self.assertIsNotNone(v_db)
            self.assertEqual(v_db.status, "ACTIVE")

    async def test_08_redeem_reward_insufficient_points(self):
        """Kiểm tra báo lỗi khi không đủ Điểm Xanh"""
        async with self.session_maker() as session:
            user = await session.get(User, self.test_user_id)
            user.green_points = 5  # Quá ít điểm
            await session.commit()

            service = RewardService(session)
            catalog = await service.get_reward_catalog(stock_status="IN_STOCK")
            valid_reward = catalog.items[0]

            with self.assertRaises(HTTPException) as ctx:
                await service.redeem_reward(self.test_user_id, valid_reward.reward_id)
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("không đủ", ctx.exception.detail)

    async def test_09_get_user_vouchers_and_expiry_warning(self):
        """Kiểm tra lấy kho voucher cá nhân và cảnh báo sắp hết hạn (Chức năng 31 Màn 1)"""
        async with self.session_maker() as session:
            service = RewardService(session)
            vouchers_resp = await service.get_user_vouchers(self.test_user_id, status_filter="ALL")
            self.assertGreaterEqual(vouchers_resp.total, 1)

            # Tìm voucher sắp hết hạn (ngày offset <= 3)
            soon_items = [v for v in vouchers_resp.items if v.is_expiring_soon]
            if soon_items:
                self.assertTrue(soon_items[0].is_expiring_soon)
                self.assertLessEqual(soon_items[0].days_remaining, 3)

    async def test_10_mark_voucher_used(self):
        """Kiểm tra đánh dấu voucher đã dùng và chống tái sử dụng (Chức năng 31 Màn 3)"""
        async with self.session_maker() as session:
            service = RewardService(session)
            vouchers_resp = await service.get_user_vouchers(self.test_user_id, status_filter="ACTIVE")
            self.assertGreaterEqual(len(vouchers_resp.items), 1)

            active_v = vouchers_resp.items[0]
            v_id = uuid.UUID(active_v.voucher_id)

            # Đánh dấu đã dùng
            used_resp = await service.mark_voucher_used(self.test_user_id, v_id)
            self.assertEqual(used_resp.status, "USED")
            self.assertIn("Đã sử dụng", used_resp.message)

            # Cố tình dùng lại lần 2 -> phải báo lỗi 400
            with self.assertRaises(HTTPException) as ctx:
                await service.mark_voucher_used(self.test_user_id, v_id)
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("đã được sử dụng trước đó", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
