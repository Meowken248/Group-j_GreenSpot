import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class ExportedIncidentFile(Base, TimestampMixin):
    """
    Thực thể lưu trữ siêu dữ liệu và tệp xuất báo cáo sự cố (Excel/PDF).
    Tuân thủ quy chuẩn bảo mật: Liên kết tải có thời hạn lưu tạm (15 phút).
    """
    __tablename__ = "exported_incident_files"

    export_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'EXCEL' hoặc 'PDF'
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    file_size_formatted: Mapped[str] = mapped_column(String(50), default="0 KB", nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Bộ lọc đã áp dụng lúc xuất dữ liệu
    filters_applied: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    total_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Quản lý thời hạn tải (Safeguard 15 phút)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_downloaded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    download_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Soft delete & Version
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def is_expired(self) -> bool:
        now = datetime.now(timezone.utc)
        if self.expires_at.tzinfo is None:
            return datetime.utcnow() > self.expires_at
        return now > self.expires_at
