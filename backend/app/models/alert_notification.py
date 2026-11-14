import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class AlertSeverity(str, enum.Enum):
    YELLOW = "YELLOW"    # Chú ý (Cấp 1)
    ORANGE = "ORANGE"    # Nguy cơ cao (Cấp 2)
    RED = "RED"          # Khẩn cấp nguy hại (Cấp 3)


class AlertStatus(str, enum.Enum):
    DRAFT = "DRAFT"          # Bản nháp
    ACTIVE = "ACTIVE"        # Đang hiệu lực cảnh báo
    RESOLVED = "RESOLVED"    # Đã kết thúc / Công bố an toàn
    REVOKED = "REVOKED"      # Đã thu hồi do nhầm lẫn


class NotificationType(str, enum.Enum):
    POLLUTION_ALERT = "POLLUTION_ALERT"
    INCIDENT_UPDATE = "INCIDENT_UPDATE"
    SYSTEM = "SYSTEM"


class EnvironmentalAlert(Base, TimestampMixin):
    """
    Chức năng 28: Trung tâm Biên tập và Quản lý Vòng đời Bản tin Cảnh báo Ô nhiễm Môi trường Khẩn cấp
    """
    __tablename__ = "environmental_alerts"

    alert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="AIR")  # AIR, WATER, WASTE, HAZARDOUS
    severity_level: Mapped[str] = mapped_column(String(20), nullable=False, default=AlertSeverity.YELLOW.value)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=AlertStatus.DRAFT.value)
    
    # Danh sách các Quận/Huyện, Phường/Xã chịu tác động (JSON list hoặc text)
    affected_districts: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    safety_advice: Mapped[str] = mapped_column(Text, nullable=False)
    template_code: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Quản lý thời hạn & vòng đời
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    resolved_note: Mapped[Optional[str]] = mapped_column(Text)
    
    # Thu hồi cảnh báo
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    revoke_reason: Mapped[Optional[str]] = mapped_column(Text)
    
    # Cán bộ phụ trách
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    
    # Quan hệ với các thông báo đẩy đã phát hành
    notifications: Mapped[List["Notification"]] = relationship(back_populates="alert", cascade="all, delete-orphan")


class Notification(Base):
    """
    Chức năng 29: Hệ thống Điều phối Thông báo Đẩy (Push Notification) Cảnh báo Ô nhiễm theo Thời gian thực
    """
    __tablename__ = "notifications"

    notification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True, index=True)
    alert_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("environmental_alerts.alert_id", ondelete="CASCADE"), nullable=True)
    incident_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=True)
    
    notification_type: Mapped[str] = mapped_column(String(50), default=NotificationType.POLLUTION_ALERT.value)
    severity: Mapped[str] = mapped_column(String(20), default="INFO")  # INFO, WARNING, CRITICAL
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    target_url: Mapped[Optional[str]] = mapped_column(String(255))
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    alert: Mapped[Optional["EnvironmentalAlert"]] = relationship(back_populates="notifications")


class IncidentSubscription(Base):
    """
    Chức năng 30 (Nâng cấp tương tác): Đăng ký nhận thông báo cập nhật tiến độ sự cố công khai
    """
    __tablename__ = "incident_subscriptions"

    subscription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False, index=True)
    contact_type: Mapped[str] = mapped_column(String(20), nullable=False)  # EMAIL hoặc PHONE
    contact_value: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class IncidentVerification(Base):
    """
    Chức năng 30 (Nâng cấp tương tác): Cộng đồng kiểm chứng hiện trường sau khi dọn sạch (Citizen Double-Check)
    """
    __tablename__ = "incident_verifications"

    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False, index=True)
    is_clean_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)  # True: Đã sạch, False: Vẫn còn bẩn
    comment: Mapped[Optional[str]] = mapped_column(Text)
    citizen_ip: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
