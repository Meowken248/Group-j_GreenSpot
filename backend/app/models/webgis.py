import uuid
from datetime import datetime
from typing import Optional
from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class UserWatchArea(Base, TimestampMixin):
    __tablename__ = "user_watch_areas"

    area_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    area_name: Mapped[str] = mapped_column(String(150), nullable=False)
    center_point = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    radius_meters: Mapped[int] = mapped_column(Integer, default=500)
    geofence_polygon = mapped_column(Geometry(geometry_type="POLYGON", srid=4326), nullable=True)
    notify_push: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_email: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class IncidentClusterHotspot(Base):
    __tablename__ = "incident_clusters_hotspots"

    cluster_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"))
    cluster_type: Mapped[str] = mapped_column(String(30), default="HOTSPOT")
    centroid = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    boundary = mapped_column(Geometry(geometry_type="POLYGON", srid=4326), nullable=True)
    incident_count: Mapped[int] = mapped_column(Integer, default=1)
    average_risk_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00)
    dominant_waste_category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("waste_categories.category_id"))
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    first_detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserMapFavorite(Base):
    __tablename__ = "user_map_favorites"

    favorite_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    filter_params: Mapped[dict] = mapped_column(JSONB, nullable=False)
    viewport_center = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    zoom_level: Mapped[int] = mapped_column(Integer, default=14)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FloodZoneMonitoring(Base, TimestampMixin):
    __tablename__ = "flood_zones_monitoring"

    zone_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    zone_name: Mapped[str] = mapped_column(String(200), nullable=False)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id"))
    boundary = mapped_column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=False)
    rainfall_mm: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    flood_depth_cm: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    risk_level: Mapped[str] = mapped_column(String(20), default="LOW")
    blocked_drainage_points_count: Mapped[int] = mapped_column(Integer, default=0)
    is_actively_flooded: Mapped[bool] = mapped_column(Boolean, default=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SafeRouteCache(Base):
    __tablename__ = "safe_routes_cache"

    route_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    origin_point = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    destination_point = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    fastest_route_geom = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=True)
    fastest_distance_km: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    fastest_duration_mins: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    fastest_risk_index: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    safest_route_geom = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=True)
    safest_distance_km: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    safest_duration_mins: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    safest_risk_index: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    hazards_avoided_count: Mapped[int] = mapped_column(Integer, default=0)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
