import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select, update, delete, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import UPLOAD_DIR
from app.models.post import Post, PostTaggedFriend
from app.models.rbac import User
from app.schemas.post import (
    CreatePostRequest,
    UpdatePostRequest,
    PostDetailResponse,
    MediaItemInput,
    MediaTypeEnum,
    AuthorSummary,
    TaggedFriendInfo,
    MediaUploadResponse,
)


class PostService:
    """Service xử lý nghiệp vụ Đăng bài cộng đồng (Feature STT 9)"""

    def __init__(self):
        self.upload_dir = os.path.join(UPLOAD_DIR, "posts")
        os.makedirs(self.upload_dir, exist_ok=True)

    async def create_post(
        self,
        db: AsyncSession,
        author_id: uuid.UUID,
        request: CreatePostRequest,
    ) -> Post:
        """
        Tạo bài đăng mới:
        - Chuẩn hóa media_urls sang định dạng JSON string
        - Khởi tạo version = 1 cho Optimistic Locking
        - Lưu các bạn bè được gắn thẻ vào bảng post_tagged_friends
        """
        # Serialize media_urls nếu có
        media_json = None
        if request.media_urls and len(request.media_urls) > 0:
            media_json = json.dumps([m.model_dump() for m in request.media_urls])

        post = Post(
            post_id=uuid.uuid4(),
            user_id=author_id,
            content=request.content or "",
            media_urls=media_json,
            group_id=request.group_id,
            visibility=request.visibility or "PUBLIC",
            is_hidden=False,
            reactions_count=0,
            comments_count=0,
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address,
            version=1,
            deleted_at=None,
        )
        db.add(post)
        await db.flush()

        # Lưu danh sách bạn bè được gắn thẻ (lọc an toàn chỉ các user thật sự tồn tại)
        if request.tagged_friend_ids:
            valid_users_stmt = select(User.user_id).where(
                User.user_id.in_(request.tagged_friend_ids),
                User.deleted_at.is_(None)
            )
            valid_users_res = await db.execute(valid_users_stmt)
            valid_user_ids = set(valid_users_res.scalars().all())

            for friend_id in request.tagged_friend_ids:
                if friend_id in valid_user_ids:
                    tag = PostTaggedFriend(
                        tag_id=uuid.uuid4(),
                        post_id=post.post_id,
                        friend_user_id=friend_id,
                        deleted_at=None,
                    )
                    db.add(tag)

        await db.commit()

        # Tải lại bài viết kèm relationship
        stmt = (
            select(Post)
            .options(
                selectinload(Post.tagged_friends).selectinload(PostTaggedFriend.friend),
                selectinload(Post.user),
            )
            .where(Post.post_id == post.post_id)
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    async def get_post_by_id(self, db: AsyncSession, post_id: uuid.UUID) -> Post:
        """Lấy bài viết theo ID (chỉ lấy bài chưa bị xóa mềm)"""
        stmt = (
            select(Post)
            .options(
                selectinload(Post.tagged_friends).selectinload(PostTaggedFriend.friend),
                selectinload(Post.user),
            )
            .where(
                and_(
                    Post.post_id == post_id,
                    Post.deleted_at.is_(None),
                )
            )
        )
        res = await db.execute(stmt)
        post = res.scalars().first()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "POST_NOT_FOUND", "message": "Bài viết không tồn tại hoặc đã bị xóa"}
            )
        return post

    async def update_post(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        request: UpdatePostRequest,
    ) -> Post:
        """
        Cập nhật bài viết với Optimistic Locking (Rule 7):
        - Kiểm tra quyền tác giả
        - Kiểm tra version hiện tại, nếu không khớp trả về HTTP 409 Conflict
        - Tự động tăng version + 1
        """
        stmt = select(Post).where(
            and_(
                Post.post_id == post_id,
                Post.deleted_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        post = res.scalars().first()

        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "POST_NOT_FOUND", "message": "Bài viết không tồn tại"}
            )

        if post.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "PERMISSION_DENIED", "message": "Bạn không có quyền sửa bài viết này"}
            )

        # Kiểm tra Optimistic Locking OCC
        if post.version != request.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "DATA_CONFLICT",
                    "message": "Dữ liệu bài viết đã được cập nhật bởi thao tác khác. Vui lòng tải lại trang.",
                    "current_version": post.version,
                }
            )

        # Cập nhật các trường
        if request.content is not None:
            post.content = request.content
        if request.media_urls is not None:
            post.media_urls = json.dumps([m.model_dump() for m in request.media_urls])
        
        # Cập nhật hoặc gỡ bỏ vị trí
        if request.clear_location:
            post.latitude = None
            post.longitude = None
            post.address = None
        else:
            if request.latitude is not None:
                post.latitude = request.latitude
            if request.longitude is not None:
                post.longitude = request.longitude
            if request.address is not None:
                post.address = request.address

        if request.group_id is not None:
            post.group_id = request.group_id
        if request.visibility is not None:
            post.visibility = request.visibility

        # Cập nhật danh sách bạn bè được gắn thẻ nếu có gửi lên (lọc an toàn chỉ các user thật sự tồn tại)
        if request.tagged_friend_ids is not None:
            await db.execute(
                delete(PostTaggedFriend).where(PostTaggedFriend.post_id == post.post_id)
            )
            if request.tagged_friend_ids:
                valid_users_stmt = select(User.user_id).where(
                    User.user_id.in_(request.tagged_friend_ids),
                    User.deleted_at.is_(None)
                )
                valid_users_res = await db.execute(valid_users_stmt)
                valid_user_ids = set(valid_users_res.scalars().all())

                for friend_id in request.tagged_friend_ids:
                    if friend_id in valid_user_ids:
                        tag = PostTaggedFriend(
                            tag_id=uuid.uuid4(),
                            post_id=post.post_id,
                            friend_user_id=friend_id,
                            deleted_at=None,
                        )
                        db.add(tag)

        post.updated_at = datetime.now(timezone.utc)
        post.version += 1
        await db.commit()
        await db.refresh(post)
        return await self.get_post_by_id(db, post.post_id)

    async def toggle_hide_post(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        is_hidden: bool,
    ) -> Post:
        """Ẩn hoặc hiện lại bài viết của chính mình (Feature STT 13 Màn 5/5)"""
        stmt = select(Post).where(
            and_(
                Post.post_id == post_id,
                Post.deleted_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        post = res.scalars().first()

        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "POST_NOT_FOUND", "message": "Bài viết không tồn tại hoặc đã bị xóa"}
            )

        if post.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "PERMISSION_DENIED", "message": "Bạn không có quyền ẩn/hiện bài viết này"}
            )

        post.is_hidden = is_hidden
        post.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(post)
        return await self.get_post_by_id(db, post.post_id)

    async def soft_delete_post(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """Xóa mềm bài viết (Rule 6: deleted_at, Feature STT 13 Màn 3/5 & 4/5)"""
        stmt = select(Post).where(
            and_(
                Post.post_id == post_id,
                Post.deleted_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        post = res.scalars().first()

        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "POST_NOT_FOUND", "message": "Bài viết không tồn tại hoặc đã bị xóa"}
            )

        if post.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "PERMISSION_DENIED", "message": "Bạn không có quyền xóa bài viết này"}
            )

        now = datetime.now(timezone.utc)
        post.deleted_at = now

        # Soft delete các lượt gắn thẻ liên quan
        await db.execute(
            update(PostTaggedFriend)
            .where(PostTaggedFriend.post_id == post_id)
            .values(deleted_at=now)
        )

        await db.commit()
        return True

    async def save_uploaded_media(self, file: UploadFile) -> MediaUploadResponse:
        """
        Xử lý tải lên tệp ảnh hoặc video từ thiết bị:
        - Giới hạn: Ảnh tối đa 10MB (JPG/PNG), Video MP4 tối đa 50MB
        - Lưu vào thư mục uploads/posts/
        """
        filename = file.filename or "unknown"
        ext = os.path.splitext(filename)[1].lower()

        ALLOWED_IMG = {".jpg", ".jpeg", ".png", ".webp"}
        ALLOWED_VID = {".mp4", ".mov"}

        if ext in ALLOWED_IMG:
            media_type = MediaTypeEnum.IMAGE
            max_size = 10 * 1024 * 1024 # 10MB
        elif ext in ALLOWED_VID:
            media_type = MediaTypeEnum.VIDEO
            max_size = 50 * 1024 * 1024 # 50MB
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "INVALID_FILE_TYPE", "message": "Tệp không hợp lệ (ảnh tối đa 10MB, video MP4 tối đa 50MB)"}
            )

        content = await file.read()
        file_size = len(content)

        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "FILE_TOO_LARGE", "message": "Tệp không hợp lệ (ảnh tối đa 10MB, video MP4 tối đa 50MB)"}
            )

        # Lưu file với UUID duy nhất
        unique_name = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(self.upload_dir, unique_name)

        with open(filepath, "wb") as out_file:
            out_file.write(content)


        # Trả về URL tương đối phục vụ qua endpoint /uploads
        relative_url = f"/uploads/posts/{unique_name}"

        return MediaUploadResponse(
            url=relative_url,
            media_type=media_type,
            file_name=filename,
            size_bytes=file_size,
        )

    def format_post_response(self, post: Post) -> PostDetailResponse:
        """Chuyển đổi ORM Model Post sang PostDetailResponse Schema"""
        parsed_media = []
        if post.media_urls:
            try:
                raw_items = json.loads(post.media_urls)
                parsed_media = [MediaItemInput(**item) for item in raw_items]
            except Exception:
                parsed_media = []

        tagged_list = []
        if hasattr(post, "tagged_friends") and post.tagged_friends:
            for tf in post.tagged_friends:
                if tf.deleted_at is None and tf.friend:
                    tagged_list.append(
                        TaggedFriendInfo(
                            user_id=tf.friend.user_id,
                            full_name=tf.friend.full_name or "Người dùng",
                            avatar_url=tf.friend.avatar_url,
                            email=tf.friend.email,
                        )
                    )

        author_info = None
        if hasattr(post, "user") and post.user:
            author_info = AuthorSummary(
                user_id=post.user.user_id,
                email=post.user.email,
                full_name=post.user.full_name or "Công dân sinh thái",
                avatar_url=post.user.avatar_url,
            )

        # Tính toán cờ is_edited nếu bài viết đã được cập nhật
        is_edited = False
        if post.updated_at and post.created_at:
            try:
                diff_sec = abs((post.updated_at - post.created_at).total_seconds())
                is_edited = diff_sec > 2
            except Exception:
                is_edited = False

        return PostDetailResponse(
            post_id=post.post_id,
            user_id=post.user_id,
            author=author_info,
            content=post.content,
            media_urls=parsed_media,
            latitude=post.latitude,
            longitude=post.longitude,
            address=post.address,
            group_id=post.group_id,
            visibility=post.visibility,
            is_hidden=post.is_hidden,
            is_edited=is_edited,
            reactions_count=post.reactions_count,
            comments_count=post.comments_count,
            version=post.version,
            created_at=post.created_at,
            updated_at=post.updated_at,
            tagged_friends=tagged_list,
        )
