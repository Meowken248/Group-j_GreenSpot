"""
Unit Test Suite for Posts Domain (Chức năng STT 9: Đăng bài kèm toạ độ, ảnh, video, gắn thẻ bạn bè hoặc đăng vào nhóm)
Kiểm thử toàn diện theo chuẩn TDD dựa trên Đặc tả nghiệp vụ:
1. Màn 1: Soạn thảo bài đăng (nội dung tối đa 3000 ký tự, hashtag, tối đa 5 ảnh hoặc 1 video MP4, validation điều kiện bài viết)
2. Màn 2: Định vị không gian địa lý (gắn toạ độ GPS, reverse geocoding địa chỉ, kiểm tra phạm vi hỗ trợ)
3. Màn 3: Popup gắn thẻ bạn bè / Chọn nhóm (tối đa 10 bạn bè, dedup bạn bè, chọn nhóm tình nguyện)
4. Màn 4: Popup đã đăng bài & Quy tắc hệ thống (Soft delete, Optimistic Locking version conflict)
"""

import unittest
import uuid
from datetime import datetime, timezone
from pydantic import ValidationError
from fastapi import HTTPException

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User
from app.models.post import Post, PostTaggedFriend
from app.services.post_service import PostService
from app.schemas.post import (
    CreatePostRequest,
    UpdatePostRequest,
    PostDetailResponse,
    MediaItemInput,
    MediaTypeEnum,
)


class TestPostsDomainTDD(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử đơn vị theo chuẩn TDD cho Đăng bài cộng đồng (Feature STT 9)"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()
        self.service = PostService()

        # Lấy hoặc tạo user tác giả kiểm thử hợp lệ trong DB
        from sqlalchemy import select
        stmt = select(User).where(User.deleted_at.is_(None)).limit(3)
        res = await self.session.execute(stmt)
        users = res.scalars().all()
        if users and len(users) >= 2:
            self.test_author_id = users[0].user_id
            self.test_friend_1 = users[1].user_id
            self.test_friend_2 = users[2].user_id if len(users) > 2 else users[1].user_id
        else:
            # Tạo user test nếu DB trống
            u1 = User(
                user_id=uuid.UUID("99999999-0001-0000-0000-000000000001"),
                email="author_test@ecoreport.gov.vn",
                phone_number="0909999001",
                password_hash="test_hash",
                full_name="Tác giả Test",
                status="ACTIVE",
            )
            u2 = User(
                user_id=uuid.UUID("99999999-0002-0000-0000-000000000002"),
                email="friend_test@ecoreport.gov.vn",
                phone_number="0909999002",
                password_hash="test_hash",
                full_name="Bạn bè Test",
                status="ACTIVE",
            )
            self.session.add_all([u1, u2])
            await self.session.commit()
            self.test_author_id = u1.user_id
            self.test_friend_1 = u2.user_id
            self.test_friend_2 = u2.user_id


    async def asyncTearDown(self):
        try:
            await self.session.rollback()
            await self.session.close()
        except Exception:
            pass
        await engine.dispose()

    # =========================================================================
    # I. KIỂM THỬ MÀN 1: SOẠN THẢO NỘI DUNG & ĐÍNH KÈM MEDIA
    # =========================================================================

    def test_r1_empty_content_and_media_raises_validation_error(self):
        """[R1] Để trống cả nội dung và ảnh/video -> Lỗi 'Vui lòng nhập nội dung hoặc thêm ảnh/video'"""
        with self.assertRaises(ValidationError) as ctx:
            CreatePostRequest(
                content="",
                media_urls=[],
            )
        self.assertIn("Vui lòng nhập nội dung hoặc thêm ảnh/video", str(ctx.exception))

    def test_r2_text_only_post_is_valid(self):
        """[R2] Bài viết chỉ có chữ (không có ảnh/video) -> Hợp lệ"""
        req = CreatePostRequest(
            content="Chiến dịch dọn rác sáng nay rất thành công! #SaiGonXanh",
            media_urls=[],
        )
        self.assertEqual(req.content, "Chiến dịch dọn rác sáng nay rất thành công! #SaiGonXanh")
        self.assertEqual(len(req.media_urls), 0)

    def test_r3_media_only_post_is_valid(self):
        """[R3] Bài viết chỉ có ảnh/video (nội dung chữ để trống hoặc khoảng trắng) -> Hợp lệ"""
        req = CreatePostRequest(
            content="",
            media_urls=[
                MediaItemInput(url="https://example.com/trash1.jpg", media_type=MediaTypeEnum.IMAGE)
            ],
        )
        self.assertEqual(len(req.media_urls), 1)

    def test_r4_both_text_and_media_is_valid(self):
        """[R4] Bài viết có cả chữ và ảnh/video -> Hợp lệ"""
        req = CreatePostRequest(
            content="Điểm tập kết rác kênh Nhiêu Lộc #CanXuLy",
            media_urls=[
                MediaItemInput(url="https://example.com/img1.jpg", media_type=MediaTypeEnum.IMAGE)
            ],
        )
        self.assertTrue(bool(req.content))
        self.assertEqual(len(req.media_urls), 1)

    def test_r5_content_exceeds_3000_chars_raises_error(self):
        """[R5] Nội dung vượt quá 3.000 ký tự -> Báo lỗi 'Nội dung bài viết tối đa 3000 ký tự'"""
        long_content = "A" * 3001
        with self.assertRaises(ValidationError) as ctx:
            CreatePostRequest(content=long_content)
        self.assertIn("Nội dung bài viết tối đa 3000 ký tự", str(ctx.exception))

    def test_r6_content_exact_3000_chars_is_valid(self):
        """[R6] Nội dung chính xác 3.000 ký tự -> Hợp lệ"""
        exact_content = "X" * 3000
        req = CreatePostRequest(content=exact_content)
        self.assertEqual(len(req.content), 3000)

    def test_r7_content_with_environmental_hashtags(self):
        """[R7] Hỗ trợ trích xuất hoặc lưu trữ hashtag môi trường"""
        req = CreatePostRequest(
            content="Chung tay phân loại rác tại nguồn #ZeroWaste #ChủNhậtXanh #SongXanh"
        )
        self.assertIn("#ZeroWaste", req.content)
        self.assertIn("#ChủNhậtXanh", req.content)

    def test_r8_max_5_images_is_valid(self):
        """[R8] Đính kèm tối đa 5 ảnh -> Hợp lệ"""
        images = [
            MediaItemInput(url=f"https://example.com/img{i}.jpg", media_type=MediaTypeEnum.IMAGE)
            for i in range(5)
        ]
        req = CreatePostRequest(content="5 ảnh môi trường", media_urls=images)
        self.assertEqual(len(req.media_urls), 5)

    def test_r9_exceed_5_images_raises_error(self):
        """[R9] Đính kèm vượt quá 5 ảnh (6 ảnh) -> Lỗi 'Chỉ được đăng tối đa 5 ảnh hoặc 1 video'"""
        images = [
            MediaItemInput(url=f"https://example.com/img{i}.jpg", media_type=MediaTypeEnum.IMAGE)
            for i in range(6)
        ]
        with self.assertRaises(ValidationError) as ctx:
            CreatePostRequest(content="Quá nhiều ảnh", media_urls=images)
        self.assertIn("Chỉ được đăng tối đa 5 ảnh hoặc 1 video", str(ctx.exception))

    def test_r10_single_mp4_video_is_valid(self):
        """[R10] Đính kèm 1 video ngắn định dạng MP4 -> Hợp lệ"""
        video = [
            MediaItemInput(url="https://example.com/clip.mp4", media_type=MediaTypeEnum.VIDEO)
        ]
        req = CreatePostRequest(content="Video dọn rác", media_urls=video)
        self.assertEqual(len(req.media_urls), 1)
        self.assertEqual(req.media_urls[0].media_type, MediaTypeEnum.VIDEO)

    def test_r11_mixed_images_and_video_raises_error(self):
        """[R11] Đính kèm vừa ảnh vừa video -> Lỗi 'Chỉ được đăng tối đa 5 ảnh hoặc 1 video'"""
        mixed = [
            MediaItemInput(url="https://example.com/img1.jpg", media_type=MediaTypeEnum.IMAGE),
            MediaItemInput(url="https://example.com/clip.mp4", media_type=MediaTypeEnum.VIDEO),
        ]
        with self.assertRaises(ValidationError) as ctx:
            CreatePostRequest(content="Hỗn hợp", media_urls=mixed)
        self.assertIn("Chỉ được đăng tối đa 5 ảnh hoặc 1 video", str(ctx.exception))

    # =========================================================================
    # II. KIỂM THỬ MÀN 2: ĐỊNH VỊ KHÔNG GIAN ĐỊA LÝ & BẢN ĐỒ
    # =========================================================================

    def test_r12_location_with_valid_coordinates_and_address(self):
        """[R12] Gắn tọa độ GPS hợp lệ tại TP.HCM và địa chỉ tự động -> Hợp lệ"""
        req = CreatePostRequest(
            content="Bãi rác tự phát chân cầu Thị Nghè",
            latitude=10.7915,
            longitude=106.6972,
            address="Chân cầu Thị Nghè, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
        )
        self.assertAlmostEqual(req.latitude, 10.7915)
        self.assertAlmostEqual(req.longitude, 106.6972)
        self.assertIn("Quận 1", req.address)

    def test_r13_location_outside_supported_bounds_raises_error(self):
        """[R13] Tọa độ nằm ngoài phạm vi hỗ trợ của hệ thống (ngoài Việt Nam) -> Báo lỗi"""
        with self.assertRaises(ValidationError) as ctx:
            CreatePostRequest(
                content="Vị trí ở Bắc Cực",
                latitude=85.0, # Ngoài lãnh thổ Việt Nam
                longitude=10.0,
            )
        self.assertIn("Vị trí nằm ngoài khu vực hỗ trợ của hệ thống", str(ctx.exception))

    def test_r14_location_optional_none_is_valid(self):
        """[R14] Người dùng không bấm gắn vị trí -> Tọa độ None vẫn hợp lệ"""
        req = CreatePostRequest(content="Bài viết không gắn GPS")
        self.assertIsNone(req.latitude)
        self.assertIsNone(req.longitude)
        self.assertIsNone(req.address)

    # =========================================================================
    # III. KIỂM THỬ MÀN 3: GẮN THẺ BẠN BÈ & CHỌN NHÓM
    # =========================================================================

    def test_r15_tag_friends_up_to_10_is_valid(self):
        """[R15] Gắn thẻ tối đa 10 bạn bè -> Hợp lệ"""
        friends = [uuid.uuid4() for _ in range(10)]
        req = CreatePostRequest(
            content="Đi dọn rác cùng bạn bè",
            tagged_friend_ids=friends,
        )
        self.assertEqual(len(req.tagged_friend_ids), 10)

    def test_r16_tag_friends_exceed_10_raises_error(self):
        """[R16] Gắn thẻ vượt quá 10 bạn bè (11 người) -> Lỗi 'Chỉ được gắn thẻ tối đa 10 bạn bè'"""
        friends = [uuid.uuid4() for _ in range(11)]
        with self.assertRaises(ValidationError) as ctx:
            CreatePostRequest(
                content="Gắn thẻ quá nhiều bạn bè",
                tagged_friend_ids=friends,
            )
        self.assertIn("Chỉ được gắn thẻ tối đa 10 bạn bè", str(ctx.exception))

    def test_r17_tag_friends_deduplication(self):
        """[R17] Danh sách gắn thẻ có ID trùng lặp -> Tự động loại bỏ trùng lặp"""
        same_friend = uuid.uuid4()
        req = CreatePostRequest(
            content="Gắn thẻ trùng lặp",
            tagged_friend_ids=[same_friend, same_friend, uuid.uuid4()],
        )
        # Hệ thống phải tự động chuẩn hóa dedup còn 2 bạn bè duy nhất
        self.assertEqual(len(req.tagged_friend_ids), 2)

    def test_r18_select_single_group_is_valid(self):
        """[R18] Chọn đăng vào 01 nhóm tình nguyện -> Hợp lệ"""
        group_id = uuid.uuid4()
        req = CreatePostRequest(
            content="Đăng vào nhóm CLB Tái Chế",
            group_id=group_id,
        )
        self.assertEqual(req.group_id, group_id)

    # =========================================================================
    # IV. KIỂM THỬ LOGIC SERVICE: TẠO BÀI, OPTIMISTIC LOCKING, SOFT DELETE
    # =========================================================================

    async def test_r19_service_create_post_success(self):
        """[R19] Service tạo bài viết thành công, lưu DB và khởi tạo version=1"""
        req = CreatePostRequest(
            content="Bài viết kiểm thử qua Service",
            latitude=10.7769,
            longitude=106.7009,
            address="Quận 1, TP.HCM",
            tagged_friend_ids=[self.test_friend_1],
        )

        post = await self.service.create_post(
            db=self.session,
            author_id=self.test_author_id,
            request=req,
        )

        self.assertIsNotNone(post.post_id)
        self.assertEqual(post.user_id, self.test_author_id)
        self.assertEqual(post.content, "Bài viết kiểm thử qua Service")
        self.assertEqual(post.version, 1)
        self.assertIsNone(post.deleted_at)
        self.assertEqual(len(post.tagged_friends), 1)

    async def test_r20_service_optimistic_locking_conflict_409(self):
        """[R20] Cập nhật bài viết với version không khớp -> Ném lỗi HTTP 409 Conflict (Rule 7)"""
        req = CreatePostRequest(content="Bài gốc cần sửa")
        post = await self.service.create_post(
            db=self.session,
            author_id=self.test_author_id,
            request=req,
        )

        update_req = UpdatePostRequest(
            content="Nội dung đã sửa",
            version=999, # Version sai lệch
        )

        with self.assertRaises(HTTPException) as ctx:
            await self.service.update_post(
                db=self.session,
                post_id=post.post_id,
                user_id=self.test_author_id,
                request=update_req,
            )
        self.assertEqual(ctx.exception.status_code, 409)

    async def test_r21_service_soft_delete_post(self):
        """[R21] Xóa bài viết là Soft delete (deleted_at != None), không xóa vật lý (Rule 6)"""
        req = CreatePostRequest(content="Bài viết sẽ bị xóa mềm")
        post = await self.service.create_post(
            db=self.session,
            author_id=self.test_author_id,
            request=req,
        )

        # Thực hiện xóa mềm
        success = await self.service.soft_delete_post(
            db=self.session,
            post_id=post.post_id,
            user_id=self.test_author_id,
        )
        self.assertTrue(success)

        # Lấy lại bài viết -> Không tìm thấy vì đã bị soft delete
        with self.assertRaises(HTTPException) as ctx:
            await self.service.get_post_by_id(
                db=self.session,
                post_id=post.post_id,
            )
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
