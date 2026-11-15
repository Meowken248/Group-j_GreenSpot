"""
Test Suite for Feature STT 13: Sửa, xoá và ẩn bài viết của chính mình
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 123 - 127)
Kiểm thử các nghiệp vụ:
1. Màn 1/5 & 2/5: Sửa bài viết, giới hạn 2.000 ký tự, kiểm soát Optimistic Concurrency Control (OCC version).
2. Màn 3/5 & 4/5: Xoá bài viết (Soft Delete với deleted_at, chặn người khác xoá).
3. Màn 5/5: Ẩn và Hiện lại bài viết (chỉ tác giả mới có quyền, cập nhật is_hidden).
"""

import unittest
import uuid
from datetime import datetime, timezone
from pydantic import ValidationError
from fastapi import HTTPException
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User
from app.models.post import Post, PostTaggedFriend
from app.services.post_service import PostService
from app.schemas.post import (
    CreatePostRequest,
    UpdatePostRequest,
    ToggleHidePostRequest,
)


class TestFeature13PostManagement(unittest.IsolatedAsyncioTestCase):
    """Kiểm thử tự động cho Chức năng 13 (Sửa, xoá và ẩn bài viết)"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()
        self.service = PostService()

        # Lấy hoặc tạo role hợp lệ
        from app.models.rbac import Role
        r_stmt = select(Role.role_id).limit(1)
        r_res = await self.session.execute(r_stmt)
        valid_role_id = r_res.scalar()
        if not valid_role_id:
            role_cit = Role(
                role_id=4,
                role_code="CITIZEN",
                role_name="Công dân",
                description="Vai trò công dân",
                is_system=True,
                scope="CITY",
                version=1,
            )
            self.session.add(role_cit)
            await self.session.flush()
            valid_role_id = 4

        # Tìm hoặc tạo 2 tài khoản tác giả và người lạ
        stmt = select(User).where(User.deleted_at.is_(None)).limit(2)
        res = await self.session.execute(stmt)
        users = res.scalars().all()
        if users and len(users) >= 2:
            self.author_id = users[0].user_id
            self.stranger_id = users[1].user_id
        else:
            self.author_id = uuid.UUID("13131313-0001-0000-0000-000000000001")
            self.stranger_id = uuid.UUID("13131313-0002-0000-0000-000000000002")
            u1 = User(
                user_id=self.author_id,
                email="author_f13@ecoreport.gov.vn",
                phone_number="0913000001",
                password_hash="hashed_pw",
                full_name="Nguyễn Văn Tác Giả",
                role_id=valid_role_id,
                status="ACTIVE",
            )
            u2 = User(
                user_id=self.stranger_id,
                email="stranger_f13@ecoreport.gov.vn",
                phone_number="0913000002",
                password_hash="hashed_pw",
                full_name="Trần Thị Người Lạ",
                role_id=valid_role_id,
                status="ACTIVE",
            )
            self.session.add_all([u1, u2])
            await self.session.commit()

        # Tạo sẵn một bài viết kiểm thử
        req = CreatePostRequest(
            content="Bài viết ban đầu để kiểm thử Chức năng 13 #SaiGonXanh",
            visibility="PUBLIC",
        )
        self.test_post = await self.service.create_post(
            db=self.session,
            author_id=self.author_id,
            request=req,
        )

    async def asyncTearDown(self):
        # Dọn dẹp bài viết kiểm thử
        if hasattr(self, "test_post") and self.test_post:
            await self.session.execute(
                select(Post).where(Post.post_id == self.test_post.post_id)
            )
            # Xoá cứng để sạch DB test
            from sqlalchemy import delete
            await self.session.execute(
                delete(PostTaggedFriend).where(PostTaggedFriend.post_id == self.test_post.post_id)
            )
            await self.session.execute(
                delete(Post).where(Post.post_id == self.test_post.post_id)
            )
            await self.session.commit()
        await self.session.close()

    # -------------------------------------------------------------------------
    # 1. KIỂM THỬ SỬA BÀI VIẾT (Màn 2/5)
    # -------------------------------------------------------------------------
    async def test_update_post_success(self):
        """Tác giả sửa bài thành công, version tăng lên 2, có nhãn is_edited"""
        old_version = self.test_post.version
        update_req = UpdatePostRequest(
            content="Nội dung đã được cập nhật chuẩn xác bởi tác giả #CapNhat",
            version=old_version,
        )
        updated = await self.service.update_post(
            db=self.session,
            post_id=self.test_post.post_id,
            user_id=self.author_id,
            request=update_req,
        )
        self.assertEqual(updated.content, "Nội dung đã được cập nhật chuẩn xác bởi tác giả #CapNhat")
        self.assertEqual(updated.version, old_version + 1)
        self.assertIsNotNone(updated.updated_at)

        formatted = self.service.format_post_response(updated)
        self.assertTrue(formatted.is_edited or (updated.updated_at != updated.created_at))

    async def test_update_post_full_fields(self):
        """Kiểm thử sửa bài với đầy đủ các trường: vị trí, gắn thẻ bạn bè, chế độ hiển thị"""
        old_version = self.test_post.version
        update_req = UpdatePostRequest(
            content="Cập nhật toàn diện bài viết kèm toạ độ và bạn bè",
            latitude=10.7769,
            longitude=106.7009,
            address="Đường Lê Lợi, Bến Nghé, Quận 1, TP.HCM",
            tagged_friend_ids=[self.stranger_id],
            visibility="FRIENDS",
            version=old_version,
        )
        updated = await self.service.update_post(
            db=self.session,
            post_id=self.test_post.post_id,
            user_id=self.author_id,
            request=update_req,
        )
        self.assertEqual(updated.latitude, 10.7769)
        self.assertEqual(updated.address, "Đường Lê Lợi, Bến Nghé, Quận 1, TP.HCM")
        self.assertEqual(updated.visibility, "FRIENDS")
        self.assertEqual(len(updated.tagged_friends), 1)
        self.assertEqual(updated.tagged_friends[0].friend_user_id, self.stranger_id)

    async def test_update_post_clear_location(self):
        """Kiểm thử gỡ bỏ vị trí khi cập nhật bài viết"""
        old_version = self.test_post.version
        # Bước 1: Gắn vị trí trước
        await self.service.update_post(
            db=self.session,
            post_id=self.test_post.post_id,
            user_id=self.author_id,
            request=UpdatePostRequest(
                latitude=10.8231,
                longitude=106.6297,
                address="Hẻm 85 Võ Văn Ngân, Thủ Đức",
                version=old_version,
            ),
        )
        # Bước 2: Gỡ vị trí
        cleared = await self.service.update_post(
            db=self.session,
            post_id=self.test_post.post_id,
            user_id=self.author_id,
            request=UpdatePostRequest(
                clear_location=True,
                version=old_version + 1,
            ),
        )
        self.assertIsNone(cleared.latitude)
        self.assertIsNone(cleared.longitude)
        self.assertIsNone(cleared.address)

    def test_update_post_exceeds_2000_chars(self):
        """Nội dung bài viết vượt quá 2.000 ký tự phải bị chặn bởi Schema validation"""
        too_long = "A" * 2001
        with self.assertRaises(ValidationError):
            UpdatePostRequest(
                content=too_long,
                version=1,
            )

    async def test_update_post_occ_conflict(self):
        """Sửa bài với version cũ/không khớp phải trả về HTTP 409 Conflict"""
        update_req = UpdatePostRequest(
            content="Cố tình sửa với version sai để test OCC",
            version=999,
        )
        with self.assertRaises(HTTPException) as ctx:
            await self.service.update_post(
                db=self.session,
                post_id=self.test_post.post_id,
                user_id=self.author_id,
                request=update_req,
            )
        self.assertEqual(ctx.exception.status_code, 409)

    async def test_update_post_stranger_forbidden(self):
        """Người lạ sửa bài của tác giả phải bị chặn với HTTP 403 Forbidden"""
        update_req = UpdatePostRequest(
            content="Người lạ cố tình sửa bài",
            version=self.test_post.version,
        )
        with self.assertRaises(HTTPException) as ctx:
            await self.service.update_post(
                db=self.session,
                post_id=self.test_post.post_id,
                user_id=self.stranger_id,
                request=update_req,
            )
        self.assertEqual(ctx.exception.status_code, 403)

    # -------------------------------------------------------------------------
    # 2. KIỂM THỬ ẨN VÀ HIỆN LẠI BÀI VIẾT (Màn 5/5)
    # -------------------------------------------------------------------------
    async def test_toggle_hide_post_by_author(self):
        """Tác giả có quyền ẩn (is_hidden=True) và hiện lại (is_hidden=False)"""
        # 1. Ẩn bài
        hidden_post = await self.service.toggle_hide_post(
            db=self.session,
            post_id=self.test_post.post_id,
            user_id=self.author_id,
            is_hidden=True,
        )
        self.assertTrue(hidden_post.is_hidden)

        # 2. Hiện lại bài
        unhidden_post = await self.service.toggle_hide_post(
            db=self.session,
            post_id=self.test_post.post_id,
            user_id=self.author_id,
            is_hidden=False,
        )
        self.assertFalse(unhidden_post.is_hidden)

    async def test_toggle_hide_post_stranger_forbidden(self):
        """Người lạ cố ẩn bài của tác giả phải bị chặn với HTTP 403 Forbidden"""
        with self.assertRaises(HTTPException) as ctx:
            await self.service.toggle_hide_post(
                db=self.session,
                post_id=self.test_post.post_id,
                user_id=self.stranger_id,
                is_hidden=True,
            )
        self.assertEqual(ctx.exception.status_code, 403)

    # -------------------------------------------------------------------------
    # 3. KIỂM THỬ XOÁ MỀM BÀI VIẾT (Màn 3/5 & 4/5)
    # -------------------------------------------------------------------------
    async def test_soft_delete_post_by_author(self):
        """Tác giả xoá bài -> Đánh dấu deleted_at (Soft delete), không lấy được qua get_post_by_id"""
        success = await self.service.soft_delete_post(
            db=self.session,
            post_id=self.test_post.post_id,
            user_id=self.author_id,
        )
        self.assertTrue(success)

        # get_post_by_id phải trả về 404
        with self.assertRaises(HTTPException) as ctx:
            await self.service.get_post_by_id(self.session, self.test_post.post_id)
        self.assertEqual(ctx.exception.status_code, 404)

    async def test_soft_delete_post_stranger_forbidden(self):
        """Người lạ xoá bài của tác giả phải bị chặn với HTTP 403 Forbidden"""
        with self.assertRaises(HTTPException) as ctx:
            await self.service.soft_delete_post(
                db=self.session,
                post_id=self.test_post.post_id,
                user_id=self.stranger_id,
            )
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
