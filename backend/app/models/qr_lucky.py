import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Date,
    Text,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

class EcoQRCode(Base):
    """Mã QR dán tại trạm thu gom rác, thùng thu pin hoặc sự kiện sinh thái (Chức năng 34)"""
    __tablename__ = "eco_qr_codes"

    qr_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    location_name = Column(String(255), nullable=False)
    point_reward = Column(Integer, default=20, nullable=False)
    qr_type = Column(String(50), default="RECYCLING_STATION", nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    max_distance_meters = Column(Float, default=50.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    scans = relationship("UserQRScan", back_populates="qr_code", cascade="all, delete-orphan")


class UserQRScan(Base):
    """Nhật ký quét mã QR nhận điểm của công dân (Chức năng 34)"""
    __tablename__ = "user_qr_scans"

    scan_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    qr_id = Column(UUID(as_uuid=True), ForeignKey("eco_qr_codes.qr_id", ondelete="CASCADE"), nullable=False, index=True)
    scanned_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    scan_date = Column(Date, default=date.today, nullable=False)
    points_earned = Column(Integer, nullable=False)
    user_lat = Column(Float, nullable=True)
    user_lng = Column(Float, nullable=True)
    distance_meters = Column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "qr_id", "scan_date", name="uq_user_qr_per_day"),
    )

    qr_code = relationship("EcoQRCode", back_populates="scans")


class LuckyWheelSpin(Base):
    """Lịch sử lượt quay may mắn hằng ngày của công dân (Chức năng 35)"""
    __tablename__ = "lucky_wheel_spins"

    spin_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    spin_date = Column(Date, default=date.today, nullable=False)
    slot_index = Column(Integer, nullable=False)
    reward_type = Column(String(50), nullable=False) # POINTS | BADGE | VOUCHER | LUCK
    reward_name = Column(String(255), nullable=False)
    points_won = Column(Integer, default=0, nullable=False)
    badge_won = Column(String(100), nullable=True)
    voucher_code = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
