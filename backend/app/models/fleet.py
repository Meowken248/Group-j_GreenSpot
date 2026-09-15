import uuid
from datetime import date, datetime, time
from typing import List, Optional
from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class WasteCollectionRoute(Base, TimestampMixin):
    __tablename__ = "waste_collection_routes"

    route_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    route_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    route_name: Mapped[str] = mapped_column(String(150), nullable=False)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"))
    assigned_team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("work_teams.team_id", ondelete="SET NULL"))
    route_path = mapped_column(Geometry(geometry_type="MULTILINESTRING", srid=4326), nullable=False)
    total_distance_km: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    estimated_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    operating_days: Mapped[str] = mapped_column(String(50), default="2,4,6")
    start_time_scheduled: Mapped[time] = mapped_column(Time, default=time(5, 0))
    end_time_scheduled: Mapped[time] = mapped_column(Time, default=time(11, 0))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    checkpoints: Mapped[List["RouteCheckpoint"]] = relationship(back_populates="route", cascade="all, delete-orphan")


class RouteCheckpoint(Base):
    __tablename__ = "route_checkpoints"

    checkpoint_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    route_id: Mapped[int] = mapped_column(ForeignKey("waste_collection_routes.route_id", ondelete="CASCADE"), nullable=False)
    checkpoint_name: Mapped[str] = mapped_column(String(150), nullable=False)
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    expected_arrival_time: Mapped[Optional[time]] = mapped_column(Time)
    expected_waste_volume_m3: Mapped[float] = mapped_column(Numeric(6, 2), default=1.5)
    stop_duration_minutes: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    route: Mapped["WasteCollectionRoute"] = relationship(back_populates="checkpoints")


class VehicleFuelLog(Base):
    __tablename__ = "vehicle_fuel_logs"

    log_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("work_teams.team_id", ondelete="CASCADE"), nullable=False)
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_odometer_km: Mapped[float] = mapped_column(Numeric(9, 2), nullable=False)
    end_odometer_km: Mapped[float] = mapped_column(Numeric(9, 2), nullable=False)
    distance_traveled_km: Mapped[float] = mapped_column(Numeric(7, 2))
    fuel_liters_added: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    fuel_cost_vnd: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
