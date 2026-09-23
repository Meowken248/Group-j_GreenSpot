import uuid
from datetime import date, datetime
from typing import Optional
from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
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
