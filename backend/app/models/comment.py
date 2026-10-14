import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.rbac import User
    from app.models.post import Post


class Comment(Base, TimestampMixin):
    """
    Bình luận & Trả lời bình luận (Feature STT 14):
    - comment_id: UUID khóa chính
    - post_id: ID bài viết được bình luận
    - user_id: ID người tạo bình luận
    - parent_id: ID bình luận gốc (NULL nếu là bình luận cấp 1; NOT NULL nếu là trả lời cấp 1)
    - reply_to_user_id: ID người dùng được tag / trả lời (tùy chọn)
    - content: Nội dung bình luận (tối đa 500 ký tự theo đặc tả)
    - replies_count: Số lượng phản hồi của bình luận gốc
    - likes_count: Số lượng thả cảm xúc / thích
    - version: Optimistic locking (Rule 7)
    - deleted_at: Soft delete (Rule 6)
    """
    __tablename__ = "comments"

    comment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("posts.post_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("comments.comment_id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    reply_to_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )
    content: Mapped[str] = mapped_column(String(500), nullable=False)
    replies_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    likes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="comments")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="selectin")
    reply_to_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reply_to_user_id], lazy="selectin")

    replies: Mapped[List["Comment"]] = relationship(
        "Comment",
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="Comment.created_at.asc()"
    )
    parent: Mapped[Optional["Comment"]] = relationship(
        "Comment",
        back_populates="replies",
        remote_side=[comment_id]
    )


class PostShare(Base):
    """
    Lịch sử chia sẻ bài viết (Feature STT 14 Màn 3):
    - share_type: 'FEED', 'FRIENDS', 'GROUP', 'LINK'
    - target_ids: JSON list of friend_ids or group_ids
    """
    __tablename__ = "post_shares"

    share_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("posts.post_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    share_type: Mapped[str] = mapped_column(String(20), nullable=False)
    caption: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    target_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_post_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("posts.post_id", ondelete="SET NULL"),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    post: Mapped["Post"] = relationship("Post", foreign_keys=[post_id])
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="selectin")
