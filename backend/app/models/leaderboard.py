from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class CommunityGroup(Base):
    """
    Chức năng 32: Bảng xếp hạng vinh danh Top Công dân Xanh - Nhóm / Đội tình nguyện.
    """
    __tablename__ = "community_groups"

    group_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    member_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    weekly_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    monthly_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DistrictEnvironmentalStat(Base):
    """
    Chức năng 32 & 33: Chỉ số môi trường quận/huyện & Bản đồ nhiệt đa chế độ (AQI, Nhiệt độ, Điểm rủi ro).
    """
    __tablename__ = "district_environmental_stats"

    district_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    district_name: Mapped[str] = mapped_column(String(100), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    aqi_value: Mapped[int] = mapped_column(Integer, nullable=False)
    temperature_c: Mapped[float] = mapped_column(Float, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    cleanup_rate: Mapped[float] = mapped_column(Float, default=90.0, nullable=False)
    resolved_incidents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    green_index: Mapped[float] = mapped_column(Float, default=80.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
