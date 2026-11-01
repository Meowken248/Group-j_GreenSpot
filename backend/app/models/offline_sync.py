import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class OfflineSubmission(Base, TimestampMixin):
    """
    Biên nhận đồng bộ phản ánh ngoại tuyến (STT 19 - Chế độ Offline-First).
    Đảm bảo tính Idempotent (chống gửi lặp, chống tạo trùng sự cố và chống cộng lặp điểm).
    """
    __tablename__ = "offline_submissions"

    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_submission_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    incident_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("incidents.incident_id", ondelete="SET NULL"), nullable=True, index=True
    )
    idempotency_key: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(30), default="PROCESSED", nullable=False, index=True
    )
    client_timestamp: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    server_received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    response_payload: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    version: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False
    )

    user = relationship("User", foreign_keys=[user_id], lazy="selectin")
    incident = relationship("Incident", foreign_keys=[incident_id], lazy="selectin")
    media_uploads: Mapped[List["OfflineMediaUpload"]] = relationship(
        "OfflineMediaUpload", back_populates="submission", cascade="all, delete-orphan", lazy="selectin"
    )


class OfflineMediaUpload(Base):
    """
    Theo dõi lưu trữ tệp đa phương tiện của yêu cầu đồng bộ ngoại tuyến.
    Hỗ trợ đối soát và đóng mộc thời gian chụp thực tế ngoại tuyến.
    """
    __tablename__ = "offline_media_uploads"

    upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    submission_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("offline_submissions.submission_id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_file_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    media_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # IMAGE, VIDEO, AUDIO
    media_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("incident_media.media_id", ondelete="SET NULL"), nullable=True
    )
    captured_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    file_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    file_hash: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )
    file_size_bytes: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(30), default="COMPLETED", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    submission: Mapped["OfflineSubmission"] = relationship(
        "OfflineSubmission", back_populates="media_uploads"
    )
