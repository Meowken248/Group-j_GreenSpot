import uuid
from datetime import date, datetime
from typing import Optional
from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class IoTSensorStation(Base, TimestampMixin):
    """Trạm cảm biến quan trắc môi trường IoT (Air/Water/Weather)"""
    __tablename__ = "iot_sensor_stations"

    station_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    station_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    station_name: Mapped[str] = mapped_column(String(150), nullable=False)
    station_type: Mapped[str] = mapped_column(String(50), nullable=False)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"))
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    installation_date: Mapped[Optional[date]] = mapped_column(Date)
    firmware_version: Mapped[str] = mapped_column(String(50), default="v1.4.2")
    battery_powered: Mapped[bool] = mapped_column(Boolean, default=False)
    solar_powered: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(30), default="ONLINE")
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)


class AirQualityRecord(Base):
    """Bản ghi quan trắc chất lượng không khí & khí tượng thực tế theo giờ (ECMWF & CAMS)"""
    __tablename__ = "air_quality_records"

    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    province: Mapped[str] = mapped_column(String(100), index=True)
    location_name: Mapped[Optional[str]] = mapped_column(String(150), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    aqi: Mapped[Optional[float]] = mapped_column(Float)
    temp: Mapped[Optional[float]] = mapped_column(Float)
    humidity: Mapped[Optional[float]] = mapped_column(Float)
    rain: Mapped[Optional[float]] = mapped_column(Float)
    wind_speed: Mapped[Optional[float]] = mapped_column(Float)
    wind_dir: Mapped[Optional[float]] = mapped_column(Float)
    pressure: Mapped[Optional[float]] = mapped_column(Float)
    cloud: Mapped[Optional[float]] = mapped_column(Float)
    pm2_5: Mapped[Optional[float]] = mapped_column(Float)
    pm10: Mapped[Optional[float]] = mapped_column(Float)
    co: Mapped[Optional[float]] = mapped_column(Float)
    no2: Mapped[Optional[float]] = mapped_column(Float)
    o3: Mapped[Optional[float]] = mapped_column(Float)
    so2: Mapped[Optional[float]] = mapped_column(Float)
    pollution_level: Mapped[Optional[str]] = mapped_column(String(50))
    pollution_class: Mapped[Optional[float]] = mapped_column(Float)

