"""
Comprehensive Test Suite for Feature 36:
- Chức năng 36: Hiệu ứng thăng cấp danh hiệu (Milestone Celebration & Tier Progression)
Target: 100% Logic and Coverage across Service, Models & Schemas according to Tables 149-151.
"""

import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role
from app.models.milestone import MilestonePost
from app.services.milestone_service import MilestoneService
from app.schemas.milestone import CreateMilestonePostRequest


class TestFeature36(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await engine.dispose()
        self.db = AsyncSessionLocal()

        # 1. Setup Role and Test User
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
            email=f"tester_36_{self.test_user_id.hex[:8]}@example.com",
            password_hash="fake_hash",
            full_name="Nguyễn Văn Xanh",
            role_id=citizen_role.role_id,
            status="ACTIVE",
            green_points=1200,
        )
        self.db.add(self.test_user)
        await self.db.commit()
        await self.db.refresh(self.test_user)

    async def asyncTearDown(self):
        try:
            await self.db.rollback()
            await self.db.execute(delete(MilestonePost).where(MilestonePost.user_id == self.test_user_id))
            await self.db.execute(delete(User).where(User.user_id == self.test_user_id))
            await self.db.commit()
            await self.db.close()
        except Exception:
            pass
        await engine.dispose()

    async def test_01_tier_progression_gold(self):
        """[Chức năng 36 - Table 149 & 151] Kiểm tra tính toán lộ trình cấp bậc khi đạt Hạng Vàng (1200 điểm)"""
        service = MilestoneService(self.db)
        progression = await service.get_tier_progression(self.test_user_id)

        self.assertEqual(progression.current_tier.tier_code, "GOLD")
        self.assertEqual(progression.current_tier.tier_name, "Hạng Vàng")
        self.assertEqual(progression.next_tier.tier_code, "DIAMOND")
        self.assertEqual(progression.points_needed, 800)  # 2000 - 1200 = 800
        self.assertFalse(progression.is_max_tier)
        self.assertIn("Chúc mừng bạn đã thăng lên cấp Hạng Vàng!", progression.congratulation_message)
        self.assertIn("Tôi vừa chính thức thăng cấp lên Hạng Vàng!", progression.default_post_content)
        self.assertEqual(len(progression.all_tiers), 4)

    async def test_02_tier_progression_diamond_max(self):
        """[Chức năng 36 - Table 151] Người dùng đạt Cấp 4 (Kim Cương cao nhất) hiển thị thông báo max tier"""
        self.test_user.green_points = 2500
        await self.db.commit()

        service = MilestoneService(self.db)
        progression = await service.get_tier_progression(self.test_user_id)

        self.assertEqual(progression.current_tier.tier_code, "DIAMOND")
        self.assertIsNone(progression.next_tier)
        self.assertTrue(progression.is_max_tier)
        self.assertEqual(progression.progress_percent, 100.0)
        self.assertEqual(
            progression.max_tier_message,
            "Bạn đã đạt danh hiệu cao nhất: Đại sứ Môi trường Kim Cương!"
        )

    async def test_03_create_milestone_post_success(self):
        """[Chức năng 36 - Table 150] Đăng bài chúc mừng tự tạo lên bảng tin cộng đồng"""
        service = MilestoneService(self.db)
        req = CreateMilestonePostRequest(
            tier_code="GOLD",
            content="Tôi vừa chính thức thăng cấp lên Hạng Vàng! Cùng chung tay vì môi trường nhé! 🌱",
            privacy="PUBLIC"
        )
        res = await service.create_milestone_post(self.test_user_id, req)

        self.assertTrue(res.success)
        self.assertEqual(res.message, "Đã đăng bài chia sẻ thành tích lên bảng tin")
        self.assertEqual(res.post.tier_code, "GOLD")
        self.assertEqual(res.post.category, "Vinh danh lên cấp")
        self.assertEqual(res.post.user_name, "Nguyễn Văn Xanh")

    async def test_04_get_milestone_posts_and_like(self):
        """[Chức năng 36] Lấy danh sách bài vinh danh và thả cảm xúc sinh thái"""
        service = MilestoneService(self.db)
        # Create a post
        req = CreateMilestonePostRequest(
            tier_code="GOLD",
            content="Bài viết vinh danh kiểm thử cộng đồng",
            privacy="PUBLIC"
        )
        created = await service.create_milestone_post(self.test_user_id, req)
        post_id = uuid.UUID(created.post.post_id)

        # Get list
        posts = await service.get_milestone_posts(limit=10, offset=0)
        self.assertGreaterEqual(posts.total, 1)
        found = any(p.post_id == str(post_id) for p in posts.items)
        self.assertTrue(found)

        # Like post
        new_likes = await service.like_milestone_post(post_id)
        self.assertEqual(new_likes, 1)

    async def test_05_user_not_found_exception(self):
        """[Chức năng 36] Ngoại lệ khi không tìm thấy người dùng"""
        service = MilestoneService(self.db)
        non_existent_id = uuid.uuid4()
        with self.assertRaises(HTTPException) as ctx:
            await service.get_tier_progression(non_existent_id)
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
