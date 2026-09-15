import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class SLAPolicy(Base, TimestampMixin):
    __tablename__ = "sla_policies"

    policy_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("waste_categories.category_id", ondelete="CASCADE"))
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    response_time_hours: Mapped[int] = mapped_column(Integer, default=4)
    resolution_time_hours: Mapped[int] = mapped_column(Integer, default=48)
    warning_threshold_percentage: Mapped[int] = mapped_column(Integer, default=80)
    penalty_points_per_hour: Mapped[float] = mapped_column(Numeric(4, 2), default=0.5)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    record_id: Mapped[Optional[str]] = mapped_column(String(100))
    old_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    new_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    request_uri: Mapped[Optional[str]] = mapped_column(String(500))
    is_suspicious: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class KPIEvaluation(Base):
    __tablename__ = "kpi_evaluations"

    evaluation_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("work_teams.team_id", ondelete="CASCADE"), nullable=False)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"))
    evaluation_month: Mapped[int] = mapped_column(Integer, nullable=False)
    evaluation_year: Mapped[int] = mapped_column(Integer, nullable=False)
    total_assigned: Mapped[int] = mapped_column(Integer, default=0)
    completed_on_time: Mapped[int] = mapped_column(Integer, default=0)
    completed_overdue: Mapped[int] = mapped_column(Integer, default=0)
    sla_compliance_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=100.00)
    average_cleanliness_score: Mapped[float] = mapped_column(Numeric(3, 2), default=5.00)
    penalty_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00)
    bonus_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00)
    final_kpi_score: Mapped[float] = mapped_column(Numeric(5, 2), default=100.00)
    rank_grade: Mapped[str] = mapped_column(String(20), default="EXCELLENT")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
