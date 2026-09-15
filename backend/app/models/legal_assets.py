import uuid
from datetime import date, datetime
from typing import List, Optional
from geoalchemy2 import Geometry
from sqlalchemy import ARRAY, BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class PenaltyRegulation(Base):
    __tablename__ = "penalty_regulations"

    regulation_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    decree_reference: Mapped[str] = mapped_column(String(100), default="Nghị định 45/2022/NĐ-CP")
    article_clause: Mapped[str] = mapped_column(String(50), nullable=False)
    violation_behavior: Mapped[str] = mapped_column(Text, nullable=False)
    min_fine_vnd: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    max_fine_vnd: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    remedial_measures: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ViolationRecord(Base, TimestampMixin):
    __tablename__ = "violation_records"

    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    incident_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("incidents.incident_id", ondelete="SET NULL"))
    regulation_id: Mapped[int] = mapped_column(ForeignKey("penalty_regulations.regulation_id"), nullable=False)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id"))
    offender_name: Mapped[Optional[str]] = mapped_column(String(150))
    offender_id_card: Mapped[Optional[str]] = mapped_column(String(20))
    offender_vehicle_plate: Mapped[Optional[str]] = mapped_column(String(30))
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    recorded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    fine_amount_vnd: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING_PAYMENT")
    evidence_media_urls: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text))
    payment_deadline: Mapped[Optional[date]] = mapped_column(Date)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    notes: Mapped[Optional[str]] = mapped_column(Text)


class SystemTranslation(Base, TimestampMixin):
    __tablename__ = "system_translations"

    translation_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    locale: Mapped[str] = mapped_column(String(10), nullable=False)
    translation_key: Mapped[str] = mapped_column(String(150), nullable=False)
    translation_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="UI")


class FileStorageAsset(Base):
    __tablename__ = "file_storage_assets"

    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    storage_provider: Mapped[str] = mapped_column(String(30), default="MINIO")
    bucket_name: Mapped[str] = mapped_column(String(100), default="ecoreport-media")
    file_path: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    cdn_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    virus_scan_status: Mapped[str] = mapped_column(String(20), default="CLEAN")
    uploader_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EnvironmentalSubscription(Base):
    __tablename__ = "environmental_subscriptions"

    subscription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    topic: Mapped[str] = mapped_column(String(50), nullable=False)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    subscribed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    unsubscribed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class AIKnowledgeEmbedding(Base):
    __tablename__ = "ai_knowledge_embeddings"

    knowledge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_title: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    chunk_content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)
    embedding_dimension: Mapped[int] = mapped_column(Integer, default=1536)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
