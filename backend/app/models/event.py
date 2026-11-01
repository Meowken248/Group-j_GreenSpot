import enum
import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.rbac import User


class EventStatus(str, enum.Enum):
    """Trạng thái vòng đời sự kiện Chủ Nhật Xanh (Feature 21)"""
    PENDING = "PENDING"       # Chờ duyệt (sau khi người dùng tạo mới)
    APPROVED = "APPROVED"     # Đã duyệt (hiển thị công khai trên danh sách)
    REJECTED = "REJECTED"     # Bị từ chối duyệt
    CANCELLED = "CANCELLED"   # Người tạo hoặc Admin hủy bỏ


class Event(Base, TimestampMixin):
    """
    Bảng Sự kiện và Chiến dịch Chủ Nhật Xanh (Feature 21: Mục 4.2.21, trang 169 - 177)
    - title: Tên sự kiện (tối đa 100 ký tự)
    - description: Mô tả chi tiết (hoạt động, vật dụng mang theo, tối đa 2000 ký tự)
    - cover_image_url: Ảnh bìa (JPG/PNG max 5MB)
    - start_time: Ngày giờ bắt đầu (phải sau thời điểm tạo ít nhất 24 giờ)
    - end_time: Ngày giờ kết thúc dự kiến
    - latitude, longitude: Tọa độ điểm tập trung (tâm vùng check-in)
    - address: Địa chỉ tập trung chi tiết
    - district: Thuộc 22 quận/huyện TP.HCM
    - max_participants: Số người tối đa (5 đến 500)
    - current_participants: Số người đã tham gia (khởi đầu = 1 là người tạo)
    - interested_count: Số người quan tâm
    - creator_id: Khóa ngoại trỏ đến users(user_id)
    - status: PENDING, APPROVED, REJECTED, CANCELLED
    - checkin_radius_meters: Bán kính cho phép check-in (mặc định 100m)
    - version: Optimistic locking (Quy tắc 2 của PROJECT_RULES.md)
    - is_deleted: Soft delete (Quy tắc 1 của PROJECT_RULES.md)
    """
    __tablename__ = "events"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    cover_image_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    end_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    address: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    district: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    max_participants: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=50
    )

    current_participants: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )

    interested_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    creator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default=EventStatus.PENDING.value,
        nullable=False
    )

    reject_reason: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )

    checkin_radius_meters: Mapped[int] = mapped_column(
        Integer,
        default=100,
        nullable=False
    )

    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False
    )

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    # Relationships
    creator: Mapped["User"] = relationship(
        "User",
        foreign_keys=[creator_id]
    )

    participants: Mapped[List["EventParticipant"]] = relationship(
        "EventParticipant",
        back_populates="event",
        cascade="all, delete-orphan"
    )

    interests: Mapped[List["EventInterest"]] = relationship(
        "EventInterest",
        back_populates="event",
        cascade="all, delete-orphan"
    )

    checkins: Mapped[List["EventCheckin"]] = relationship(
        "EventCheckin",
        back_populates="event",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_events_status_start_time", "status", "start_time"),
        Index("idx_events_creator_id", "creator_id"),
        Index("idx_events_district", "district"),
        Index("idx_events_is_deleted", "is_deleted"),
    )


class EventParticipant(Base):
    """Bảng thành viên đăng ký tham gia sự kiện (Màn 3/4)"""
    __tablename__ = "event_participants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.event_id", ondelete="CASCADE"),
        nullable=False
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )

    is_creator: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    event: Mapped["Event"] = relationship(
        "Event",
        back_populates="participants"
    )

    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id]
    )

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_participant"),
        Index("idx_event_participants_user_id", "user_id"),
        Index("idx_event_participants_event_id", "event_id"),
    )


class EventInterest(Base):
    """Bảng người dùng bấm quan tâm sự kiện (Màn 3/4)"""
    __tablename__ = "event_interests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.event_id", ondelete="CASCADE"),
        nullable=False
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    event: Mapped["Event"] = relationship(
        "Event",
        back_populates="interests"
    )

    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id]
    )

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_interest"),
        Index("idx_event_interests_event_id", "event_id"),
        Index("idx_event_interests_user_id", "user_id"),
    )


class EventCheckin(Base):
    """Bảng lưu trữ thông tin check-in GPS tại hiện trường (Màn 4/4)"""
    __tablename__ = "event_checkins"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.event_id", ondelete="CASCADE"),
        nullable=False
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )

    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    distance_meters: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    accuracy_meters: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    points_awarded: Mapped[int] = mapped_column(
        Integer,
        default=50,
        nullable=False
    )

    checkin_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    device_info: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )

    # Relationships
    event: Mapped["Event"] = relationship(
        "Event",
        back_populates="checkins"
    )

    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id]
    )

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_checkin"),
        Index("idx_event_checkins_event_user", "event_id", "user_id"),
    )
