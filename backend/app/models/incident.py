import uuid
from datetime import datetime
from typing import List, Optional
from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class WasteCategory(Base, TimestampMixin):
    """Danh mục phân loại sự cố môi trường & rác thải đô thị"""
    __tablename__ = "waste_categories"

    category_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    default_severity: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    sla_hours: Mapped[int] = mapped_column(Integer, default=48)
    color_hex: Mapped[str] = mapped_column(String(10), default="#22C55E")
    icon_name: Mapped[str] = mapped_column(String(50), default="trash-2")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    incidents: Mapped[List["Incident"]] = relationship(back_populates="category")


class Incident(Base, TimestampMixin):
    """Sự cố ô nhiễm môi trường do người dân hoặc cán bộ báo cáo"""
    __tablename__ = "incidents"

    incident_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    reporter_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    category_id: Mapped[int] = mapped_column(ForeignKey("waste_categories.category_id"), nullable=False)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    address_text: Mapped[str] = mapped_column(String(500), nullable=False)
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    risk_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00)
    estimated_volume_m3: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    reporter_phone_masked: Mapped[Optional[str]] = mapped_column(String(20))
    upvotes_count: Mapped[int] = mapped_column(Integer, default=0)
    sla_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    category: Mapped["WasteCategory"] = relationship(back_populates="incidents")
    media: Mapped[List["IncidentMedia"]] = relationship(back_populates="incident", cascade="all, delete-orphan")


class IncidentMedia(Base):
    """Hình ảnh / Video minh chứng sự cố môi trường"""
    __tablename__ = "incident_media"

    media_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False)
    media_type: Mapped[str] = mapped_column(String(20), nullable=False)
    phase: Mapped[str] = mapped_column(String(20), default="BEFORE")
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500))
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    uploader_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    incident: Mapped["Incident"] = relationship(back_populates="media")
