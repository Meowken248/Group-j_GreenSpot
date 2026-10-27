import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class DistrictRiskSnapshot(Base, TimestampMixin):
    """
    Bảng lưu trữ chỉ số rủi ro môi trường tổng hợp định kỳ theo từng Quận/Huyện.
    Hỗ trợ trực quan hóa Dashboard phân tích rủi ro đô thị (STT 42),
    vẽ biểu đồ xu hướng 30 ngày và so sánh theo chu kỳ (tháng, quý).
    Tuân thủ Clean Architecture, Soft-delete và Optimistic Concurrency Control (OCC).
    """
    __tablename__ = "district_risk_snapshots"

    snapshot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"), nullable=True, index=True)
    district_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Điểm số rủi ro tổng hợp (0 - 100)
    risk_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(30), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL

    # Số lượng sự cố theo phân loại
    open_incidents_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    spontaneous_dumps_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Bãi rác tự phát
    flood_points_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)       # Điểm ngập úng
    air_pollution_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)       # Ô nhiễm khói bụi
    hazardous_waste_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)     # Rác nguy hại y tế/công nghiệp
    domestic_waste_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)      # Rác sinh hoạt ùn ứ

    # Cơ sở thiết yếu bị đe dọa (Buffer Zone 300m)
    schools_at_risk: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    hospitals_at_risk: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_facilities_at_risk: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Thống kê định lượng & SLA
    estimated_waste_volume_m3: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    sla_on_time_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=100.00, nullable=False)  # % xử lý đúng hạn

    # Optimistic locking & Soft delete (Tuân thủ Quy tắc 6 & 7)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    unit = relationship("AdministrativeUnit", foreign_keys=[unit_id], lazy="selectin")
