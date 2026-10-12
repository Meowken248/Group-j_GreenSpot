import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, Integer, Float, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.rbac import User


class Post(Base, TimestampMixin):
    """
    Bài viết cộng đồng & dòng thời gian (Feature STT 9):
    - content: Nội dung soạn thảo (tối đa 3000 ký tự)
    - media_urls: Danh sách URL ảnh/video (tối đa 5 ảnh hoặc 1 video) lưu dưới dạng JSON string
    - latitude, longitude: Tọa độ GPS gắn từ bản đồ số Màn 2
    - address: Tên số nhà, đường, quận/phường (Reverse Geocoding)
    - group_id: ID nhóm tình nguyện (tùy chọn)
    - version: Optimistic locking (Rule 7)
    - deleted_at: Soft delete (Rule 6)
    """
    __tablename__ = "posts"

    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    media_urls: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    group_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    visibility: Mapped[str] = mapped_column(String(20), default="PUBLIC", nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reactions_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Các trường định vị không gian địa lý (Màn 2)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Optimistic locking & Soft delete
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    tagged_friends: Mapped[List["PostTaggedFriend"]] = relationship(
        "PostTaggedFriend",
        back_populates="post",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class PostTaggedFriend(Base):
    """
    Danh sách bạn bè được gắn thẻ trong bài viết (Feature STT 9 - Màn 3):
    - Tối đa 10 bạn bè cho mỗi bài viết
    - Ràng buộc duy nhất uq_post_tagged_friend chống gắn thẻ trùng lặp
    """
    __tablename__ = "post_tagged_friends"

    tag_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("posts.post_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    friend_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    post: Mapped["Post"] = relationship("Post", back_populates="tagged_friends")
    friend: Mapped["User"] = relationship("User", foreign_keys=[friend_user_id], lazy="selectin")

    __table_args__ = (
        UniqueConstraint("post_id", "friend_user_id", name="uq_post_tagged_friend"),
    )
