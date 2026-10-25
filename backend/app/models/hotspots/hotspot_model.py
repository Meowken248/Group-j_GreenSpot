"""
Hotspot Spatial Analytics & 7-Day Forecasting Domain Models
Tuân thủ Clean Architecture, Explicit SQL, OCC Versioning, Soft-delete.
STT 44: Phân tích điểm nóng + dự báo 7 ngày
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import TimestampMixin


class HotspotCluster(Base, TimestampMixin):
    """
    Entity cụm điểm nóng môi trường (Hotspot Cluster)
    Được tính toán qua thuật toán Kernel Density Estimation (KDE)
    """
    __tablename__ = "hotspot_clusters"

    hotspot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    hotspot_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    incident_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # SPONTANEOUS_DUMP, FLOODING, WATER_POLLUTION, AIR_POLLUTION
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    ward: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Tọa độ trung tâm và bán kính ảnh hưởng KDE
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    radius_meters: Mapped[float] = mapped_column(Float, default=250.0, nullable=False)
    
    # Chỉ số phân tích KDE & Mật độ
    kde_density_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False) # 0 - 100
    incident_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    severity_level: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False) # CRITICAL (Đỏ đậm), SEVERE (Cam), POTENTIAL (Vàng)
    trend_description: Mapped[str] = mapped_column(String(255), nullable=False)
    forecast_48h: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Trạng thái điều phối liên kết STT 43
    active_dispatch_order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    active_dispatch_order_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # OCC & Soft delete
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class HotspotDailyForecast(Base, TimestampMixin):
    """
    Entity dự báo xu hướng 7 ngày (7-Day Predictive Analytics)
    Dựa trên Time-series ML + Dữ liệu khí tượng thủy văn
    """
    __tablename__ = "hotspot_daily_forecasts"

    forecast_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    target_type: Mapped[str] = mapped_column(String(20), nullable=False) # DISTRICT hoặc HOTSPOT
    target_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # mã quận hoặc hotspot_id
    target_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    forecast_date: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, index=True)
    day_offset: Mapped[int] = mapped_column(Integer, nullable=False) # 1 đến 7
    predicted_incidents: Mapped[float] = mapped_column(Float, nullable=False)
    ci_lower_95: Mapped[float] = mapped_column(Float, nullable=False) # Khoảng tin cậy dưới 95%
    ci_upper_95: Mapped[float] = mapped_column(Float, nullable=False) # Khoảng tin cậy trên 95%
    
    # Yếu tố khí tượng thủy văn
    rainfall_mm: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tidal_peak_m: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False) # LOW, NORMAL, HIGH, PEAK_CRITICAL
    risk_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    model_accuracy_pct: Mapped[float] = mapped_column(Float, default=87.5, nullable=False)
    is_weather_synced: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
