import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, BigInteger, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class AuditLog(Base):
    """
    Chức năng 26: Nhật ký kiểm toán Audit Log (Bảng 11 trong báo cáo).
    Ghi nhận bất biến các thao tác quan trọng (đăng nhập, đổi quyền, sửa dữ liệu, cộng/trừ điểm).
    """
    __tablename__ = "audit_logs"

    log_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # LOGIN, UPDATE_ROLE, UPDATE_DATA, REWARD_POINTS, EXPORT_AUDIT_LOG
    table_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    record_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    old_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    new_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    request_uri: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_suspicious: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    user: Mapped[Optional["User"]] = relationship()
