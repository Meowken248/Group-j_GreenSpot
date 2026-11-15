"""
Domain Models cho STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí
(Emergency Broadcast Alert & Geofencing System)
Tuân thủ Clean Architecture, Soft-Delete và Optimistic Concurrency Control (OCC).
"""

import uuid
from datetime import datetime
from typing import Optional
from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class UserDeviceLocation(Base, TimestampMixin):
    """
    Bảng vị trí địa lý của thiết bị người dùng (GPS Geofencing).
    Lưu vết vị trí định vị mới nhất phục vụ truy vấn vùng đệm phát sóng khẩn cấp.
    """
    __tablename__ = "user_device_locations"

    location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address_text: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    ward: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    last_ping_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    
    # Soft delete
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class EmergencyBroadcastAlert(Base, TimestampMixin):
    """
    Bảng Lệnh phát sóng cảnh báo thiên tai khẩn cấp (Emergency Broadcast Alert).
    Do Cán bộ quản trị / Ban Chỉ huy PCTT & TKCN khởi tạo (Màn 1/4).
    """
    __tablename__ = "emergency_broadcast_alerts"

    alert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # FLOOD, STORM, TIDE, POLLUTION
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Tâm ghim bản đồ và bán kính Geofencing
    center_location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    center_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    center_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    radius_meters: Mapped[float] = mapped_column(Float, nullable=False)
    severity_level: Mapped[str] = mapped_column(String(50), default="CRITICAL", nullable=False)
    
    # Thống kê phân phối
    estimated_recipients: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    actual_sent_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="BROADCASTED", nullable=False, index=True)  # BROADCASTED, CANCELLED, EXPIRED
    
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    broadcasted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    # Optimistic locking & Soft delete
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    recipients = relationship("EmergencyAlertRecipient", back_populates="alert", cascade="all, delete-orphan")


class EmergencyAlertRecipient(Base, TimestampMixin):
    """
    Bảng vết người dùng trong bán kính nhận cảnh báo và phản hồi hành động.
    """
    __tablename__ = "emergency_alert_recipients"

    recipient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("emergency_broadcast_alerts.alert_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    user_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    user_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    distance_meters: Mapped[float] = mapped_column(Float, nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), default="DELIVERED", nullable=False)  # DELIVERED, ACKNOWLEDGED, SAFE, SOS
    action_taken: Mapped[str] = mapped_column(String(50), default="NONE", nullable=False)  # SAFE, SOS, VIEW_DETAILS, NONE
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    action_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    alert = relationship("EmergencyBroadcastAlert", back_populates="recipients")


class EmergencySOSSignal(Base, TimestampMixin):
    """
    Bảng Tín hiệu cứu nạn khẩn cấp (SOS) từ người dùng (Màn 2/4).
    Chuyển tiếp đến Trung tâm điều phối ứng cứu STT 43 và cơ quan chức năng.
    """
    __tablename__ = "emergency_sos_signals"

    sos_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("emergency_broadcast_alerts.alert_id", ondelete="SET NULL"), nullable=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_address: Mapped[str] = mapped_column(String(500), nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, DISPATCHED, RESOLVED

    # Optimistic locking & Soft delete
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
