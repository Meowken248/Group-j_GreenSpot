import uuid
from datetime import date, datetime
from typing import Optional
from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class IoTSensorStation(Base, TimestampMixin):
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


class IoTSensorTelemetry(Base):
    __tablename__ = "iot_sensor_telemetry"

    telemetry_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("iot_sensor_stations.station_id", ondelete="CASCADE"), nullable=False)
    aqi_index: Mapped[Optional[int]] = mapped_column(Integer)
    pm2_5: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    pm10: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    co2_ppm: Mapped[Optional[float]] = mapped_column(Numeric(7, 2))
    temperature_c: Mapped[Optional[float]] = mapped_column(Numeric(4, 1))
    humidity_percent: Mapped[Optional[float]] = mapped_column(Numeric(4, 1))
    water_level_cm: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    water_ph: Mapped[Optional[float]] = mapped_column(Numeric(4, 2))
    dissolved_oxygen_mg_l: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IoTSensorAlert(Base):
    __tablename__ = "iot_sensor_alerts"

    alert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    station_id: Mapped[int] = mapped_column(ForeignKey("iot_sensor_stations.station_id", ondelete="CASCADE"), nullable=False)
    parameter_name: Mapped[str] = mapped_column(String(50), nullable=False)
    measured_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    threshold_limit: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    qcvn_standard: Mapped[str] = mapped_column(String(50), default="QCVN 05:2023/BTNM")
    alert_level: Mapped[str] = mapped_column(String(20), default="WARNING")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
