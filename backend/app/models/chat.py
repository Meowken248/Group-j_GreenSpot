import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class ConversationType(str, enum.Enum):
    DIRECT = "DIRECT"        # Chat 1-1
    GROUP = "GROUP"          # Chat nhóm (2 - 50 bạn bè)
    DISTRICT = "DISTRICT"    # Chat quận thời gian thực


class MemberRole(str, enum.Enum):
    ADMIN = "ADMIN"          # Quản trị nhóm
    MEMBER = "MEMBER"        # Thành viên thường


class Conversation(Base, TimestampMixin):
    """
    Bảng Cuộc trò chuyện / Hội thoại (Chức năng 15):
    - type: DIRECT (1-1), GROUP (Nhóm), DISTRICT (Quận)
    - title: Tên cuộc trò chuyện (với Nhóm hoặc Quận)
    - district_name: Tên quận tương ứng (cho Tab Quận)
    - last_message_preview: Tóm tắt tin nhắn cuối để hiển thị ở Màn 1
    """
    __tablename__ = "conversations"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    type: Mapped[str] = mapped_column(
        String(20), default=ConversationType.DIRECT.value, nullable=False, index=True
    )
    title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    district_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    last_message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    last_message_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    last_message_preview: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    members: Mapped[List["ConversationMember"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )
    messages: Mapped[List["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )


class ConversationMember(Base):
    """
    Bảng Thành viên trong cuộc trò chuyện:
    - unread_count: Đếm số tin chưa đọc cho Màn 1
    - cleared_at: Mốc thời gian xóa lịch sử phía người dùng (Màn 4 - 1-1)
    - left_at: Mốc thời gian rời nhóm (Màn 4 - Group)
    """
    __tablename__ = "conversation_members"

    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.conversation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(20), default=MemberRole.MEMBER.value, nullable=False
    )
    unread_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_read_message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    cleared_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    left_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User", foreign_keys=[user_id], lazy="joined")

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_user"),
        Index("idx_conversation_members_user_left", "user_id", "left_at"),
    )


class Message(Base):
    """
    Bảng Tin nhắn trao đổi (Màn 2):
    - content: Tối đa 1000 ký tự theo đặc tả
    - media_url: Ảnh đính kèm (JPG, PNG <= 5MB)
    - is_system_message: Thông báo hệ thống (tạo nhóm, rời nhóm...)
    """
    __tablename__ = "messages"

    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.conversation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    media_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_system_message: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], lazy="joined")

    __table_args__ = (
        Index("idx_messages_conversation_created", "conversation_id", "created_at"),
    )


class UserBlock(Base):
    """
    Bảng Chặn người dùng (Phục vụ Màn 2: 'Bạn không thể nhắn tin cho người này')
    """
    __tablename__ = "user_blocks"

    block_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    blocker_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    blocked_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_user_blocks_pair"),
        CheckConstraint("blocker_id != blocked_id", name="ck_user_blocks_not_self"),
    )

