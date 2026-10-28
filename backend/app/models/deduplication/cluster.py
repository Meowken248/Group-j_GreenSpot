import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class IncidentDuplicateCluster(Base, TimestampMixin):
    """
    Cụm báo cáo trùng lặp phát hiện bởi AI (AI Deduplication Cluster).
    Kết hợp 3 yếu tố đối soát:
    1. Khoảng cách tọa độ GPS (< 50m)
    2. Khoảng cách thời gian (< 48 giờ)
    3. Độ tương đồng hình ảnh hiện trường (Computer Vision Image Embedding > 80%)
    """
    __tablename__ = "incident_duplicate_clusters"

    cluster_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    cluster_name: Mapped[str] = mapped_column(String(150), nullable=False)  # "Nhóm 1", "Nhóm 2"
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"), nullable=True)
    district_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    incident_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False)
    incident_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False)

    report_count: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    similarity_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)  # VD: 92.00, 85.00
    gps_distance_m: Mapped[float] = mapped_column(Numeric(8, 2), default=0.0)      # < 50m
    time_diff_hours: Mapped[float] = mapped_column(Numeric(8, 2), default=0.0)     # < 48 giờ
    visual_similarity: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)   # > 80%
    ai_conclusion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(30), default="PENDING_REVIEW", nullable=False)  # PENDING_REVIEW, MERGED, SEPARATED
    master_incident_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("incidents.incident_id", ondelete="SET NULL"), nullable=True)

    # Optimistic Concurrency Control (Quy tắc 7)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Soft Delete (Quy tắc 6)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # ORM Relationships
    incident_a = relationship("Incident", foreign_keys=[incident_a_id], lazy="selectin")
    incident_b = relationship("Incident", foreign_keys=[incident_b_id], lazy="selectin")
    unit = relationship("AdministrativeUnit", foreign_keys=[unit_id], lazy="selectin")
    master_incident = relationship("Incident", foreign_keys=[master_incident_id], lazy="selectin")
