import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class FriendRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class FriendRequest(Base, TimestampMixin):
    """Bảng Lời mời kết bạn giữa hai công dân xanh"""
    __tablename__ = "friend_requests"

    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    receiver_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default=FriendRequestStatus.PENDING.value,
        nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Quan hệ ORM
    sender = relationship("User", foreign_keys=[sender_id], lazy="joined")
    receiver = relationship("User", foreign_keys=[receiver_id], lazy="joined")

    __table_args__ = (
        CheckConstraint("sender_id != receiver_id", name="ck_friend_requests_not_self"),
        Index("idx_friend_requests_receiver_status", "receiver_id", "status", "deleted_at"),
        Index("idx_friend_requests_sender_status", "sender_id", "status", "deleted_at"),
    )


class Friendship(Base):
    """Bảng Quan hệ bạn bè 2 chiều (Chuẩn hóa user_id_1 < user_id_2)"""
    __tablename__ = "friendships"

    friendship_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id_1: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id_2: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Quan hệ ORM
    user_1 = relationship("User", foreign_keys=[user_id_1], lazy="joined")
    user_2 = relationship("User", foreign_keys=[user_id_2], lazy="joined")

    __table_args__ = (
        CheckConstraint("user_id_1 < user_id_2", name="ck_friendships_ordered_users"),
        UniqueConstraint("user_id_1", "user_id_2", name="uq_friendships_user1_user2"),
        Index("idx_friendships_user_id_1", "user_id_1", "deleted_at"),
        Index("idx_friendships_user_id_2", "user_id_2", "deleted_at"),
    )


class UserFollow(Base):
    """Bảng Theo dõi một chiều giữa hai người dùng"""
    __tablename__ = "user_follows"

    follow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    follower_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    following_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Quan hệ ORM
    follower = relationship("User", foreign_keys=[follower_id], lazy="joined")
    following = relationship("User", foreign_keys=[following_id], lazy="joined")

    __table_args__ = (
        CheckConstraint("follower_id != following_id", name="ck_user_follows_not_self"),
        UniqueConstraint("follower_id", "following_id", name="uq_user_follows_pair"),
        Index("idx_user_follows_follower", "follower_id", "deleted_at"),
        Index("idx_user_follows_following", "following_id", "deleted_at"),
    )
