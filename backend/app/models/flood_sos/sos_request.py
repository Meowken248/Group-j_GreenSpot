"""
Domain Models cho STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
(Emergency SOS Dispatch, Volunteer Coordination & Live Tracking System)
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


class FloodSosRequest(Base, TimestampMixin):
    """
    Bảng Yêu cầu cứu hộ ngập lụt khẩn cấp (Emergency SOS Request).
    Do người dân đang mắc kẹt phát tín hiệu (Màn 1/5 và Màn 2/5).
    """
    __tablename__ = "flood_sos_requests"

    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sos_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    
    # Nạn nhân kêu cứu
    victim_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    victim_name: Mapped[str] = mapped_column(String(200), nullable=False)
    victim_phone: Mapped[str] = mapped_column(String(50), nullable=False)

    # Khối TÌNH HUỐNG
    total_victims: Mapped[int] = mapped_column(Integer, nullable=False)  # Bắt buộc >= 1
    elderly_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    children_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    medical_urgent_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Khối VỊ TRÍ
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address_text: Mapped[str] = mapped_column(String(500), nullable=False)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    ward: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Mức độ & độ sâu ngập
    severity_level: Mapped[str] = mapped_column(String(50), default="CRITICAL", nullable=False)  # CRITICAL, URGENT, HIGH
    flood_depth_meters: Mapped[Optional[float]] = mapped_column(Float, default=1.0, nullable=True)

    # Tiến trình cứu hộ: PENDING (Đã gửi) -> ACCEPTED (Đã nhận) -> EN_ROUTE (Đang đến) -> COMPLETED (Hoàn tất) / CANCELLED (Đã huỷ)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False, index=True)

    # Thông tin tình nguyện viên / đội phản ứng tiếp nhận
    assigned_volunteer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_team_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    assigned_vehicle_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assigned_rescuer_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    assigned_rescuer_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Vị trí hiện tại của người cứu hộ (phục vụ live tracking Màn 4/5)
    rescuer_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rescuer_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rescuer_distance_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rescuer_eta_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Nghiệm thu & Hoàn tất
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    feedback_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Huỷ yêu cầu (Màn 5/5)
    cancel_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Optimistic Concurrency Control (OCC) & Soft delete
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Quan hệ
    messages = relationship("FloodSosChatMessage", back_populates="sos_request", cascade="all, delete-orphan")


class VolunteerProfile(Base, TimestampMixin):
    """
    Bảng Hồ sơ Tình nguyện viên & Đội phản ứng nhanh cứu trợ ngập lụt (Màn 3/5).
    """
    __tablename__ = "volunteer_profiles"

    volunteer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    team_name: Mapped[str] = mapped_column(String(200), default="Đội Phản ứng nhanh cơ sở", nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(100), default="Xuồng máy cứu nạn", nullable=False)
    phone_number: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Trạng thái sẵn sàng
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    
    # Vị trí thời gian thực của tình nguyện viên
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    current_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    current_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    last_ping_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    # Thống kê đóng góp
    completed_missions_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rating_average: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)

    # Optimistic Concurrency Control (OCC) & Soft delete
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class FloodSosChatMessage(Base, TimestampMixin):
    """
    Bảng Tin nhắn trao đổi trực tiếp giữa Nạn nhân và Người cứu hộ (Màn 4/5).
    """
    __tablename__ = "flood_sos_chat_messages"

    message_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("flood_sos_requests.request_id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    
    sender_type: Mapped[str] = mapped_column(String(20), nullable=False)  # VICTIM, RESCUER, SYSTEM
    sender_name: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    sos_request = relationship("FloodSosRequest", back_populates="messages")
