import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class IncidentAuditLog(Base, TimestampMixin):
    """
    Nhật ký kiểm toán sự cố môi trường (Human-in-the-loop & AI Decision Audit Log).
    Ghi nhận đầy đủ vết can thiệp của thuật toán AI và cán bộ thẩm định, điều phối viên.
    Tuân thủ Quy tắc 6 (Soft Delete) & Quy tắc 7 (Optimistic Locking).
    """
    __tablename__ = "incident_audit_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Loại hành động: AI_TRIAGE_GENERATED, AI_TRIAGE_REGENERATED, PRIORITY_ACCEPTED, PRIORITY_OVERRIDDEN, FACILITY_ALERT_SENT, CALL_INITIATED, DIRECTIONS_REQUESTED
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Chi tiết biến động mức ưu tiên
    old_priority: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_priority: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    
    # Điểm số rủi ro AI tại thời điểm ghi nhận
    risk_score: Mapped[Optional[float]] = mapped_column(Integer, nullable=True)
    
    # Lý do giải trình bắt buộc (tối đa 200 ký tự theo đặc tả giao diện Màn 3/3)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Người thực hiện (None nếu là hệ thống AI)
    performed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    
    # Dữ liệu bổ sung: chi tiết các factors, kết quả gửi SMS/Email cảnh báo cơ sở, cự ly cơ sở...
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)

    # Optimistic locking & Soft delete (Tuân thủ Quy tắc 6 & 7)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    incident = relationship("Incident", foreign_keys=[incident_id], lazy="selectin")
    operator = relationship("User", foreign_keys=[performed_by], lazy="selectin")
