import time
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, update, func, desc, asc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.post import Post
from app.models.comment import Comment, PostShare
from app.models.rbac import User
from app.schemas.comment import (
    AuthorSummary,
    CreateCommentRequest,
    CreateReplyRequest,
    CommentItemResponse,
    ReplyItemResponse,
    CommentListResponse,
    ReplyListResponse,
    SharePostRequest,
    SharePostResponse,
)


class CommentService:
    """Service xử lý nghiệp vụ Bình luận, Trả lời bình luận 1 cấp và Chia sẻ bài viết (Feature STT 14)"""

    def __init__(self):
        # Bộ đệm thời gian chống spam bình luận liên tiếp (Anti-Spam Cooldown)
        self._user_last_action: Dict[uuid.UUID, float] = {}
        self.COOLDOWN_SECONDS: float = 3.0

    def check_rate_limit(self, user_id: uuid.UUID) -> None:
        """Kiểm tra tần suất gửi bình luận / trả lời để chống spam"""
        now = time.time()
        last_time = self._user_last_action.get(user_id, 0.0)
        if now - last_time < self.COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Bạn bình luận quá nhanh. Vui lòng thử lại sau ít giây",
            )
        self._user_last_action[user_id] = now

    def _format_author(self, user: Optional[User]) -> AuthorSummary:
        """Chuẩn hóa thông tin tác giả bình luận"""
        if not user:
            return AuthorSummary(
                user_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                full_name="Người dùng GreenSpot",
                avatar_url=None,
                role="CITIZEN",
            )
        return AuthorSummary(
            user_id=user.user_id,
            full_name=user.full_name or user.email or "Công dân sinh thái",
            avatar_url=getattr(user, "avatar_url", None),
            role="CITIZEN",
        )

    def _format_reply_item(self, reply: Comment) -> ReplyItemResponse:
        """Chuẩn hóa dữ liệu một câu trả lời thụt lề"""
        return ReplyItemResponse(
            comment_id=reply.comment_id,
            parent_id=reply.parent_id or reply.comment_id,
            author=self._format_author(reply.user),
            reply_to_user=self._format_author(reply.reply_to_user) if reply.reply_to_user else None,
            content=reply.content,
            likes_count=reply.likes_count,
            created_at=reply.created_at,
        )

    async def get_post_comments(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        page: int = 1,
        limit: int = 10,
        sort: str = "relevant",
    ) -> CommentListResponse:
        """
        Lấy danh sách bình luận cấp 1 theo đặc tả Màn 1:
        - Kiểm tra bài viết tồn tại và chưa bị xóa mềm
        - Sắp xếp theo sort:
            + "relevant": Phù hợp nhất (tổng tương tác likes_count + replies_count và mới nhất)
            + "newest": Mới nhất ở trên (created_at DESC)
            + "all": Tất cả bình luận theo thứ tự thời gian (created_at ASC)
        - Phân trang 10 bình luận mỗi lần tải
        - Kèm theo tối đa 3 câu trả lời ban đầu (cũ nhất ở trên ASC)
        """
        # 1. Kiểm tra bài viết gốc
        post_stmt = select(Post).where(Post.post_id == post_id, Post.deleted_at.is_(None))
        post_res = await db.execute(post_stmt)
        post = post_res.scalar_one_or_none()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài viết không còn tồn tại",
            )

        # 2. Đếm tổng số bình luận cấp 1
        count_stmt = select(func.count(Comment.comment_id)).where(
            Comment.post_id == post_id,
            Comment.parent_id.is_(None),
            Comment.deleted_at.is_(None),
        )
        total_res = await db.execute(count_stmt)
        total_count = total_res.scalar_one() or 0

        # 3. Lấy danh sách bình luận cấp 1 theo thứ tự sắp xếp
        offset = (page - 1) * limit
        if sort == "newest":
            order_clause = [desc(Comment.created_at)]
        elif sort == "all":
            order_clause = [asc(Comment.created_at)]
        else:  # "relevant" (mặc định)
            order_clause = [
                desc(Comment.likes_count + Comment.replies_count),
                desc(Comment.created_at),
            ]

        comments_stmt = (
            select(Comment)
            .options(selectinload(Comment.user))
            .where(
                Comment.post_id == post_id,
                Comment.parent_id.is_(None),
                Comment.deleted_at.is_(None),
            )
            .order_by(*order_clause)
            .offset(offset)
            .limit(limit)
        )
        comments_res = await db.execute(comments_stmt)
        comments = comments_res.scalars().all()

        # 4. Lấy 3 câu trả lời ban đầu cho mỗi bình luận cấp 1 (sắp xếp cũ nhất trước ASC theo đặc tả Màn 2)
        items: List[CommentItemResponse] = []
        for c in comments:
            replies_stmt = (
                select(Comment)
                .options(selectinload(Comment.user), selectinload(Comment.reply_to_user))
                .where(
                    Comment.parent_id == c.comment_id,
                    Comment.deleted_at.is_(None),
                )
                .order_by(asc(Comment.created_at))
                .limit(3)
            )
            replies_res = await db.execute(replies_stmt)
            replies = replies_res.scalars().all()

            formatted_replies = [self._format_reply_item(r) for r in replies]

            items.append(
                CommentItemResponse(
                    comment_id=c.comment_id,
                    post_id=c.post_id,
                    author=self._format_author(c.user),
                    content=c.content,
                    replies_count=c.replies_count,
                    likes_count=c.likes_count,
                    created_at=c.created_at,
                    initial_replies=formatted_replies,
                )
            )

        has_more = (offset + len(items)) < total_count

        return CommentListResponse(
            items=items,
            total=total_count,
            page=page,
            limit=limit,
            has_more=has_more,
        )

    async def get_comment_replies(
        self,
        db: AsyncSession,
        comment_id: uuid.UUID,
    ) -> ReplyListResponse:
        """
        Lấy toàn bộ câu trả lời của một bình luận gốc (Màn 2):
        - Sắp xếp cũ nhất ở trên (created_at ASC)
        """
        # Kiểm tra bình luận gốc
        parent_stmt = select(Comment).where(
            Comment.comment_id == comment_id,
            Comment.deleted_at.is_(None),
        )
        parent_res = await db.execute(parent_stmt)
        parent = parent_res.scalar_one_or_none()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bình luận gốc không còn tồn tại",
            )

        # Lấy toàn bộ câu trả lời
        replies_stmt = (
            select(Comment)
            .options(selectinload(Comment.user), selectinload(Comment.reply_to_user))
            .where(
                Comment.parent_id == comment_id,
                Comment.deleted_at.is_(None),
            )
            .order_by(asc(Comment.created_at))
        )
        replies_res = await db.execute(replies_stmt)
        replies = replies_res.scalars().all()

        return ReplyListResponse(
            comment_id=comment_id,
            items=[self._format_reply_item(r) for r in replies],
            total=len(replies),
        )

    async def create_comment(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        post_id: uuid.UUID,
        payload: CreateCommentRequest,
    ) -> CommentItemResponse:
        """
        Tạo bình luận cấp 1 mới:
        - Kiểm tra chống spam rate-limit
        - Kiểm tra bài viết tồn tại
        - Tăng comments_count của bài viết
        """
        self.check_rate_limit(user_id)

        post_stmt = select(Post).where(Post.post_id == post_id, Post.deleted_at.is_(None))
        post_res = await db.execute(post_stmt)
        post = post_res.scalar_one_or_none()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài viết không còn tồn tại",
            )

        new_comment = Comment(
            comment_id=uuid.uuid4(),
            post_id=post_id,
            user_id=user_id,
            parent_id=None,
            reply_to_user_id=None,
            content=payload.content,
            replies_count=0,
            likes_count=0,
            version=1,
            deleted_at=None,
        )
        db.add(new_comment)

        # Tăng số lượng bình luận bài viết
        post.comments_count += 1
        await db.commit()

        # Eager load user
        reloaded_stmt = (
            select(Comment)
            .options(selectinload(Comment.user))
            .where(Comment.comment_id == new_comment.comment_id)
        )
        reloaded = (await db.execute(reloaded_stmt)).scalar_one()

        return CommentItemResponse(
            comment_id=reloaded.comment_id,
            post_id=reloaded.post_id,
            author=self._format_author(reloaded.user),
            content=reloaded.content,
            replies_count=0,
            likes_count=0,
            created_at=reloaded.created_at,
            initial_replies=[],
        )

    async def create_reply(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        comment_id: uuid.UUID,
        payload: CreateReplyRequest,
    ) -> ReplyItemResponse:
        """
        Tạo câu trả lời (Màn 2):
        - Kiểm tra chống spam rate-limit
        - Ép buộc quy tắc 1 cấp duy nhất: Nếu bấm trả lời vào câu trả lời con,
          vẫn gắn vào parent_id của bình luận gốc và tag author của reply con đó!
        - Tăng replies_count của bình luận gốc và comments_count của bài viết
        """
        self.check_rate_limit(user_id)

        target_stmt = select(Comment).where(
            Comment.comment_id == comment_id,
            Comment.deleted_at.is_(None),
        )
        target_res = await db.execute(target_stmt)
        target_comment = target_res.scalar_one_or_none()
        if not target_comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bình luận gốc không còn tồn tại",
            )

        # Quy tắc 1 cấp duy nhất (Strict 1-Level Threading)
        if target_comment.parent_id is not None:
            # Đối tượng được click là câu trả lời con -> tìm bình luận gốc thực sự
            root_id = target_comment.parent_id
            actual_reply_to_user_id = target_comment.user_id
            root_stmt = select(Comment).where(
                Comment.comment_id == root_id,
                Comment.deleted_at.is_(None),
            )
            root_res = await db.execute(root_stmt)
            root_comment = root_res.scalar_one_or_none()
            if not root_comment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Bình luận gốc không còn tồn tại",
                )
        else:
            root_comment = target_comment
            root_id = target_comment.comment_id
            actual_reply_to_user_id = payload.reply_to_user_id or target_comment.user_id

        # Kiểm tra bài viết gốc
        post_stmt = select(Post).where(Post.post_id == root_comment.post_id, Post.deleted_at.is_(None))
        post = (await db.execute(post_stmt)).scalar_one_or_none()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài viết không còn tồn tại",
            )

        new_reply = Comment(
            comment_id=uuid.uuid4(),
            post_id=root_comment.post_id,
            user_id=user_id,
            parent_id=root_id,
            reply_to_user_id=actual_reply_to_user_id,
            content=payload.content,
            replies_count=0,
            likes_count=0,
            version=1,
            deleted_at=None,
        )
        db.add(new_reply)

        # Cập nhật số lượng phản hồi và bình luận
        root_comment.replies_count += 1
        post.comments_count += 1
        await db.commit()

        # Eager load thông tin tác giả và người được tag
        reloaded_stmt = (
            select(Comment)
            .options(selectinload(Comment.user), selectinload(Comment.reply_to_user))
            .where(Comment.comment_id == new_reply.comment_id)
        )
        reloaded = (await db.execute(reloaded_stmt)).scalar_one()

        return self._format_reply_item(reloaded)

    async def soft_delete_comment(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        comment_id: uuid.UUID,
        is_admin: bool = False,
    ) -> bool:
        """Xóa mềm bình luận theo chuẩn Rule 6"""
        stmt = select(Comment).where(Comment.comment_id == comment_id, Comment.deleted_at.is_(None))
        comment = (await db.execute(stmt)).scalar_one_or_none()
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bình luận không còn tồn tại",
            )

        if comment.user_id != user_id and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa bình luận này",
            )

        comment.deleted_at = datetime.now(timezone.utc)

        # Giảm số lượng
        post_stmt = select(Post).where(Post.post_id == comment.post_id)
        post = (await db.execute(post_stmt)).scalar_one_or_none()
        if post:
            if comment.parent_id is None:
                post.comments_count = max(0, post.comments_count - (1 + comment.replies_count))
            else:
                post.comments_count = max(0, post.comments_count - 1)

        if comment.parent_id is not None:
            parent_stmt = select(Comment).where(Comment.comment_id == comment.parent_id)
            parent = (await db.execute(parent_stmt)).scalar_one_or_none()
            if parent:
                parent.replies_count = max(0, parent.replies_count - 1)

        await db.commit()
        return True

    async def share_post(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        post_id: uuid.UUID,
        payload: SharePostRequest,
    ) -> SharePostResponse:
        """
        Chia sẻ bài viết theo đặc tả Màn 3:
        - Kiểm tra bảo mật: Bài viết PRIVATE hoặc FRIENDS thì không được phép chia sẻ
        - Hỗ trợ 4 loại: FEED, FRIENDS, GROUP, LINK
        """
        post_stmt = select(Post).where(Post.post_id == post_id, Post.deleted_at.is_(None))
        post = (await db.execute(post_stmt)).scalar_one_or_none()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài viết không còn tồn tại",
            )

        # Kiểm tra Quyền riêng tư: Chỉ bài viết PUBLIC mới được chia sẻ
        vis = (post.visibility or "PUBLIC").upper()
        if vis in ("ONLY_ME", "PRIVATE", "FRIENDS"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bài viết này không thể chia sẻ",
            )

        share_type = payload.share_type
        new_post_id: Optional[uuid.UUID] = None
        message: str = ""

        if share_type == "FEED":
            # Chia sẻ lên bảng tin -> Tạo bài viết mới dạng repost có shared_post_id
            new_post = Post(
                post_id=uuid.uuid4(),
                user_id=user_id,
                content=payload.caption or "",
                media_urls=None,
                group_id=None,
                visibility="PUBLIC",
                is_hidden=False,
                reactions_count=0,
                comments_count=0,
                shares_count=0,
                shared_post_id=post.post_id,
                version=1,
                deleted_at=None,
            )
            db.add(new_post)
            new_post_id = new_post.post_id
            post.shares_count += 1
            message = "Đã chia sẻ bài viết lên bảng tin"

        elif share_type == "FRIENDS":
            # Gửi cho danh sách bạn bè
            count_friends = len(payload.target_friend_ids or [])
            if count_friends == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng chọn ít nhất 1 người nhận",
                )
            post.shares_count += count_friends
            message = f"Đã gửi bài viết cho {count_friends} người"

        elif share_type == "GROUP":
            # Đăng vào nhóm
            count_groups = len(payload.target_group_ids or [])
            if count_groups == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng chọn ít nhất 1 nhóm để đăng",
                )
            post.shares_count += count_groups
            message = "Đã chia sẻ bài viết vào nhóm"

        elif share_type == "LINK":
            post.shares_count += 1
            message = "Đã sao chép liên kết"

        # Ghi nhận bản ghi lịch sử chia sẻ
        share_rec = PostShare(
            share_id=uuid.uuid4(),
            post_id=post_id,
            user_id=user_id,
            share_type=share_type,
            caption=payload.caption,
            target_ids=json.dumps([str(x) for x in (payload.target_friend_ids or payload.target_group_ids or [])]),
            new_post_id=new_post_id,
        )
        db.add(share_rec)

        await db.commit()

        return SharePostResponse(
            success=True,
            message=message,
            shares_count=post.shares_count,
            share_id=share_rec.share_id,
            new_post_id=new_post_id,
        )
