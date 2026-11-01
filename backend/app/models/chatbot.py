import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class ChatbotSenderType(str, enum.Enum):
    USER = "user"
    AI = "ai"


class ChatbotConversation(Base, TimestampMixin):
    """
    Bảng Cuộc trò chuyện với Trợ lý AI (Chức năng 24):
    - conversation_id: Mã định danh UUID cuộc trò chuyện
    - user_id: Khóa ngoại trỏ đến tài khoản người dùng
    - title: Tiêu đề cuộc trò chuyện (lấy từ câu hỏi đầu, tối đa 40 ký tự)
    - message_count: Tổng số tin nhắn đã trao đổi trong cuộc hội thoại
    - last_message_at: Thời điểm phát sinh tin nhắn cuối cùng
    - version: Phiên bản hỗ trợ Optimistic Locking (Quy tắc 7)
    """
    __tablename__ = "chatbot_conversations"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(100), nullable=False, default="Cuộc trò chuyện mới"
    )
    message_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    last_message_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    version: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False
    )
    is_pinned: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Quan hệ thực thể
    user = relationship("User", foreign_keys=[user_id], lazy="selectin")
    messages: Mapped[List["ChatbotMessage"]] = relationship(
        "ChatbotMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatbotMessage.created_at.asc()",
        lazy="selectin",
    )

    __table_args__ = (
        Index("idx_chatbot_conv_user_updated", "user_id", "updated_at"),
    )


class ChatbotMessage(Base):
    """
    Bảng Tin nhắn Trợ lý AI (Chức năng 24):
    - message_id: Mã định danh UUID của tin nhắn
    - conversation_id: Khóa ngoại trỏ về cuộc trò chuyện
    - sender_type: 'user' hoặc 'ai'
    - content: Nội dung tin nhắn (user tối đa 500 ký tự, AI không giới hạn)
    - is_out_of_scope: Đánh dấu nếu câu hỏi nằm ngoài phạm vi môi trường/hệ thống
    - is_stopped: Đánh dấu nếu người dùng bấm "Dừng trả lời" (Abort)
    - created_at: Thời điểm gửi tin nhắn
    """
    __tablename__ = "chatbot_messages"

    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chatbot_conversations.conversation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ChatbotSenderType.USER.value
    )
    content: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    is_out_of_scope: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    is_stopped: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Quan hệ thực thể
    conversation: Mapped["ChatbotConversation"] = relationship(
        "ChatbotConversation", back_populates="messages"
    )

    __table_args__ = (
        Index("idx_chatbot_msg_conv_created", "conversation_id", "created_at"),
    )

