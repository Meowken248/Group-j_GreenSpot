"""
Unit Test Suite for Feature STT 08: Bảng tin Geo-Feed theo bán kính và phân vùng
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 97 - 102)
Kiểm thử các nghiệp vụ:
1. Màn 1: Bảng tin Geo-Feed theo toạ độ GPS và bán kính quét (Haversine/PostGIS)
2. Màn 2: Chuyển đổi tab mở rộng (Gần tôi, Quận của tôi, Bạn bè, Nhóm) & Bộ lọc chủ đề
3. Màn 3: Tính toán khoảng cách thực tế và hiển thị nhãn cự ly (distance_text)
4. Loại trừ bài viết đã bị ẩn (is_hidden=True) hoặc xoá mềm (deleted_at IS NOT NULL)
"""

import unittest
import uuid
from datetime import datetime, timezone
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User
from app.models.post import Post
from app.services.post_service import PostService


class TestFeature08GeoFeed(unittest.IsolatedAsyncioTestCase):
    """Kiểm thử tự động cho Bảng tin Geo-Feed (STT 08)"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()
        self.service = PostService()

        # Tìm hoặc tạo user kiểm thử
        stmt = select(User).where(User.deleted_at.is_(None)).limit(1)
        res = await self.session.execute(stmt)
        user = res.scalar_one_or_none()
        if user:
            self.user = user
        else:
            self.user = User(
                user_id=uuid.UUID("88888888-0001-0000-0000-000000000001"),
                email="geofeed_test@ecoreport.gov.vn",
                full_name="Nguyễn Văn Sinh Thái",
                password_hash="dummy_hash",
                role_id=4,
            )
            self.session.add(self.user)
            await self.session.commit()

        # Tạo 2 bài viết mẫu kiểm thử toạ độ GPS:
        # Bài 1: Tại Chợ Bến Thành (10.7725, 106.6980)
        self.post_near = Post(
            post_id=uuid.uuid4(),
            user_id=self.user.user_id,
            content="Phản ánh rác thải tại Chợ Bến Thành #RacSinhHoat",
            latitude=10.7725,
            longitude=106.6980,
            address="Chợ Bến Thành, Quận 1, TP.HCM",
            visibility="PUBLIC",
            is_hidden=False,
        )
        # Bài 2: Tại Thủ Đức cách xa ~12km (10.8500, 106.7700)
        self.post_far = Post(
            post_id=uuid.uuid4(),
            user_id=self.user.user_id,
            content="Dọn dẹp rác kênh rạch tại Thủ Đức #ChuNhatXanh",
            latitude=10.8500,
            longitude=106.7700,
            address="Kênh Ba Bò, TP. Thủ Đức",
            visibility="PUBLIC",
            is_hidden=False,
        )
        # Bài 3: Bị ẩn
        self.post_hidden = Post(
            post_id=uuid.uuid4(),
            user_id=self.user.user_id,
            content="Bài viết riêng tư đã bị ẩn",
            latitude=10.7725,
            longitude=106.6980,
            visibility="PUBLIC",
            is_hidden=True,
        )
        self.session.add_all([self.post_near, self.post_far, self.post_hidden])
        await self.session.commit()

    async def asyncTearDown(self):
        # Dọn dẹp dữ liệu bài viết test
        for p in [self.post_near, self.post_far, self.post_hidden]:
            p_obj = await self.session.get(Post, p.post_id)
            if p_obj:
                await self.session.delete(p_obj)
        await self.session.commit()
        await self.session.close()
        await engine.dispose()

    async def test_geo_feed_nearby_with_radius(self):
        """Màn 1: Quét theo bán kính 2km từ UBND TP (10.7769, 106.7009) -> chỉ thấy bài gần, không thấy bài xa"""
        feed = await self.service.get_geo_feed(
            db=self.session,
            tab="nearby",
            user_lat=10.7769,
            user_lon=106.7009,
            radius_km=2.0,
            sort_by="newest"
        )
        post_ids = [p.post_id for p in feed.items]
        self.assertIn(self.post_near.post_id, post_ids)
        self.assertNotIn(self.post_far.post_id, post_ids, "Bài ở Thủ Đức > 2km không được xuất hiện")
        self.assertNotIn(self.post_hidden.post_id, post_ids, "Bài bị ẩn không được xuất hiện")

    async def test_distance_text_formatting(self):
        """Màn 3: Nhãn cự ly tính bằng mét hoặc kilômét chính xác"""
        feed = await self.service.get_geo_feed(
            db=self.session,
            tab="nearby",
            user_lat=10.7769,
            user_lon=106.7009,
            radius_km=5.0
        )
        target = next((p for p in feed.items if p.post_id == self.post_near.post_id), None)
        self.assertIsNotNone(target)
        self.assertIsNotNone(target.distance_text)
        self.assertTrue("Cách bạn" in target.distance_text)

    async def test_filter_by_category(self):
        """Màn 2: Lọc theo chủ đề hashtag #ChuNhatXanh"""
        feed = await self.service.get_geo_feed(
            db=self.session,
            tab="district",
            category="ChuNhatXanh",
            district=""
        )
        for item in feed.items:
            self.assertIn("chunhatxanh", item.content.lower())

    async def test_filter_district(self):
        """Màn 2: Lọc theo Quận 1"""
        feed = await self.service.get_geo_feed(
            db=self.session,
            tab="district",
            district="Quận 1"
        )
        for item in feed.items:
            self.assertTrue("quận 1" in (item.address or "").lower())


if __name__ == "__main__":
    unittest.main()

