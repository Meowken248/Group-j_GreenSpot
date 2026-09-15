import uuid
from datetime import datetime
from typing import List, Optional
from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class WorkTeam(Base, TimestampMixin):
    __tablename__ = "work_teams"

    team_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    team_name: Mapped[str] = mapped_column(String(150), nullable=False)
    leader_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"))
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20))
    vehicle_plate: Mapped[Optional[str]] = mapped_column(String(30))
    vehicle_type: Mapped[str] = mapped_column(String(50), default="COMPACTOR_TRUCK")
    capacity_tons: Mapped[float] = mapped_column(Numeric(5, 2), default=5.0)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    members: Mapped[List["TeamMember"]] = relationship(back_populates="team", cascade="all, delete-orphan")
    assignments: Mapped[List["Assignment"]] = relationship(back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    membership_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("work_teams.team_id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    role_in_team: Mapped[str] = mapped_column(String(50), default="WORKER")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    team: Mapped["WorkTeam"] = relationship(back_populates="members")


class WorkerLocation(Base):
    __tablename__ = "worker_locations"

    location_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("work_teams.team_id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    current_location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    speed_kmh: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    heading_degrees: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    battery_percentage: Mapped[Optional[int]] = mapped_column(Integer)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Assignment(Base, TimestampMixin):
    __tablename__ = "assignments"

    assignment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False)
    team_id: Mapped[int] = mapped_column(ForeignKey("work_teams.team_id"), nullable=False)
    assigned_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    dispatch_notes: Mapped[Optional[str]] = mapped_column(Text)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="ASSIGNED")
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    team: Mapped["WorkTeam"] = relationship(back_populates="assignments")
    verification: Mapped[Optional["Verification"]] = relationship(back_populates="assignment", uselist=False)


class Verification(Base):
    __tablename__ = "verifications"

    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assignments.assignment_id", ondelete="CASCADE"), unique=True, nullable=False)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False)
    verified_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    cleanliness_score: Mapped[Optional[int]] = mapped_column(Integer)
    before_media_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("incident_media.media_id", ondelete="SET NULL"))
    after_media_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("incident_media.media_id", ondelete="SET NULL"))
    actual_waste_volume_m3: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))
    actual_disposal_method: Mapped[Optional[str]] = mapped_column(String(100))
    feedback_notes: Mapped[Optional[str]] = mapped_column(Text)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assignment: Mapped["Assignment"] = relationship(back_populates="verification")
