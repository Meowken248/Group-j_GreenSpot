from typing import List, Optional
from geoalchemy2 import Geometry
from sqlalchemy import ARRAY, Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class AdministrativeUnit(Base, TimestampMixin):
    __tablename__ = "administrative_units"

    unit_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    unit_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    level: Mapped[str] = mapped_column(String(20), nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"))
    boundary = mapped_column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True)
    centroid = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    area_km2: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    population: Mapped[Optional[int]] = mapped_column(Integer)

    parent: Mapped[Optional["AdministrativeUnit"]] = relationship("AdministrativeUnit", remote_side=[unit_id], back_populates="children")
    children: Mapped[List["AdministrativeUnit"]] = relationship("AdministrativeUnit", back_populates="parent")


class EssentialFacility(Base, TimestampMixin):
    __tablename__ = "essential_facilities"

    facility_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    facility_name: Mapped[str] = mapped_column(String(200), nullable=False)
    facility_type: Mapped[str] = mapped_column(String(50), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id"))
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20))
    capacity_people: Mapped[Optional[int]] = mapped_column(Integer)
    vulnerability_level: Mapped[str] = mapped_column(String(20), default="HIGH")
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)


class RecyclingFacility(Base, TimestampMixin):
    __tablename__ = "recycling_facilities"

    facility_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    facility_code: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id"))
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    accepted_waste_types: Mapped[List[str]] = mapped_column(ARRAY(Text), nullable=False)
    operating_hours: Mapped[Optional[str]] = mapped_column(String(100))
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20))
    managing_org: Mapped[Optional[str]] = mapped_column(String(150))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
