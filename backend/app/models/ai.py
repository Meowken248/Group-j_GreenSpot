import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import ARRAY, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AIAnalysisResult(Base):
    __tablename__ = "ai_analysis_results"

    analysis_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incident_media.media_id", ondelete="CASCADE"), nullable=False)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), default="yolov8x-environment-v2.1")
    detected_classes: Mapped[List[str]] = mapped_column(ARRAY(Text), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    bounding_boxes: Mapped[dict] = mapped_column(JSONB, nullable=False)
    estimated_volume_m3: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))
    estimated_weight_kg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))
    suggested_severity: Mapped[Optional[str]] = mapped_column(String(20))
    suggested_category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("waste_categories.category_id"))
    raw_response: Mapped[Optional[dict]] = mapped_column(JSONB)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AIDuplicateGroup(Base):
    __tablename__ = "ai_duplicate_groups"

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    primary_incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False)
    duplicate_incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False)
    similarity_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    spatial_distance_meters: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    time_delta_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    ai_confidence: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    is_confirmed_by_officer: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AIIncidentSummary(Base):
    __tablename__ = "ai_incident_summaries"

    summary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), unique=True, nullable=False)
    ai_executive_summary: Mapped[str] = mapped_column(Text, nullable=False)
    key_environmental_threats: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text))
    suggested_priority: Mapped[Optional[str]] = mapped_column(String(20))
    recommended_equipment: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text))
    estimated_cleanup_time_hours: Mapped[Optional[float]] = mapped_column(Numeric(4, 1))
    model_name: Mapped[str] = mapped_column(String(50), default="Gemini-1.5-Pro")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
