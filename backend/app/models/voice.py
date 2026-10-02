"""
Domain Model: Quản lý Trợ lý giọng nói rảnh tay (Hands-free Voice Assistant)
Bao gồm:
1. VoiceSampleCommand: Danh mục câu lệnh mẫu và cấu hình Intent/Hành động.
2. VoiceInteractionLog: Lịch sử tương tác giọng nói, chuẩn hóa AI và phản hồi.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
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


class VoiceActionType(str, enum.Enum):
    """Loại hành động mà trợ lý thực thi"""
    LOOKUP = "LOOKUP"            # Tra cứu thông tin, số liệu (AQI, số dư điểm...)
    NAVIGATION = "NAVIGATION"    # Điều hướng mở chức năng (Báo cáo sự cố, bản đồ...)
    UNKNOWN = "UNKNOWN"          # Không xác định / Fallback


class VoiceCategory(str, enum.Enum):
    """Phân loại nhóm câu lệnh trợ lý"""
    INCIDENT = "INCIDENT"        # Báo cáo sự cố môi trường / rác thải
    FLOOD = "FLOOD"              # Tra cứu ngập lụt & tuyến đường an toàn
    AIR_QUALITY = "AIR_QUALITY"  # Tra cứu chất lượng không khí & thời tiết
    REWARD = "REWARD"            # Ví điểm xanh & đổi quà
    GENERAL = "GENERAL"          # Lệnh điều hướng hệ thống chung


class VoiceSampleCommand(Base, TimestampMixin):
    """
    Bảng danh mục câu lệnh mẫu và cấu hình Intent cho trợ lý ảo.
    Hiển thị gợi ý tại Màn 1 và làm cơ sở nhận dạng Intent tại Màn 3.
    """
    __tablename__ = "voice_sample_commands"

    command_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=VoiceCategory.GENERAL.value,
        index=True,
    )
    command_text: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
    )
    intent_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    action_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=VoiceActionType.LOOKUP.value,
    )
    action_target: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    default_response: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    __table_args__ = (
        Index("idx_voice_sample_active_order", "is_active", "display_order"),
    )


class VoiceInteractionLog(Base):
    """
    Bảng lưu vết lịch sử câu lệnh giọng nói, chuẩn hóa AI và phản hồi thực thi.
    Giám sát độ trễ và độ chính xác của hệ thống AI NLU.
    """
    __tablename__ = "voice_interaction_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    raw_transcript: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    normalized_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    detected_intent: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    confidence_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
    )
    action_type: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    response_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    is_success: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    session_source: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="VOICE",
    )
    processing_time_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        Index("idx_voice_log_created_at", "created_at"),
    )
