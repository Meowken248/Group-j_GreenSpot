"""
Domain Model cho STT 43: Trung tâm điều phối tác nghiệp và phân công lệnh xử lý hiện trường
(Operations Dispatch Center)
Tuân thủ Clean Architecture, Soft-Delete và Optimistic Concurrency Control (OCC).
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String,
    DateTime,
    Float,
    Integer,
    Boolean,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class DispatchOrder(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Thực thể Lệnh điều phối tác nghiệp xử lý hiện trường (Operations Dispatch Order).
    Liên kết sự cố ô nhiễm/ngập úng với đội phản ứng cơ động hiện trường.
    """
    __tablename__ = "dispatch_orders"

    # Mã định danh lệnh nghiệp vụ (VD: LX-1042, LX-1043)
    order_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Sự cố liên kết
    incident_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    incident_title: Mapped[str] = mapped_column(String(255), nullable=False)
    incident_type: Mapped[str] = mapped_column(String(100), default="DOMESTIC_WASTE", nullable=False)

    # Thông tin vị trí sự cố
    location_address: Mapped[str] = mapped_column(String(500), nullable=False)
    district: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    ward: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Đội phản ứng cơ động phụ trách
    team_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    team_name: Mapped[str] = mapped_column(String(200), nullable=False)
    team_phone: Mapped[str] = mapped_column(String(50), default="0912.345.678", nullable=False)
    team_distance_km: Mapped[float] = mapped_column(Float, default=1.8, nullable=False)
    team_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    team_longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Trạng thái vòng đời lệnh: ASSIGNED (Đã giao), EN_ROUTE (Đang đến), IN_PROGRESS (Đang xử lý), COMPLETED (Hoàn tất), CANCELLED (Đã huỷ)
    status: Mapped[str] = mapped_column(String(50), default="ASSIGNED", index=True, nullable=False)

    # Mức độ ưu tiên: LOW (Thấp), MEDIUM (Trung bình), HIGH (Cao), URGENT (Khẩn cấp / Hỏa tốc)
    priority: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False)

    # Hạn hoàn thành SLA (Deadline)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Thời gian phân công & hoàn tất
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Lý do huỷ lệnh (bắt buộc khi trạng thái là CANCELLED)
    cancel_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Ghi chú chỉ đạo hoặc lý do thay đổi đội / hạn
    adjustment_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Minh chứng hiện trường: Trước xử lý & Sau xử lý
    before_image_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    after_image_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    # Giám sát GPS thời gian thực của đội
    is_gps_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_gps_update: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Optimistic Concurrency Control (OCC)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Soft Delete
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
