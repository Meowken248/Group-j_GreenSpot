"""
Domain Models cho STT 45: Community Disaster Safety Check
(Màn 3/4: Xác nhận an toàn & Màn 4/4: Phân phối thông báo tới mạng lưới bạn bè)
Tuân thủ Clean Architecture, Soft-Delete và Optimistic Concurrency Control (OCC).
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class UserSafetyCheck(Base, TimestampMixin):
    """
    Bảng Ghi nhận trạng thái an toàn thiên tai của công dân (Màn 3/4).
    Hiển thị huy hiệu đã an toàn trên hồ sơ và Bảng tin Geo-Feed.
    """
    __tablename__ = "user_safety_checks"

    check_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    alert_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("emergency_broadcast_alerts.alert_id", ondelete="SET NULL"), nullable=True, index=True)
    is_safe: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status_message: Mapped[str] = mapped_column(String(255), default="Đã an toàn", nullable=False)
    
    # Tọa độ và địa chỉ GPS xác thực tại thời điểm báo an toàn
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_address: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Thống kê phân phối bạn bè
    shared_with_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sms_fallback_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Optimistic locking & Soft delete
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    deliveries = relationship("SafetyCheckFriendDelivery", back_populates="safety_check", cascade="all, delete-orphan")


class SafetyCheckFriendDelivery(Base, TimestampMixin):
    """
    Bảng Chi tiết phân phối thông báo an toàn đến từng bạn bè (Màn 4/4).
    Lưu vết kênh gửi (Push Notification hoặc SMS Fallback).
    """
    __tablename__ = "safety_check_deliveries"

    delivery_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    check_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user_safety_checks.check_id", ondelete="CASCADE"), nullable=False, index=True)
    friend_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    delivery_channel: Mapped[str] = mapped_column(String(50), default="PUSH_NOTIFICATION", nullable=False)  # PUSH_NOTIFICATION, SMS_FALLBACK
    is_delivered: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    delivered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    safety_check = relationship("UserSafetyCheck", back_populates="deliveries")
