import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class GreenChallenge(Base):
    """
    Chức năng 25: Thử thách xanh trong tuần (nhiệm vụ nhỏ) nhận điểm thưởng.
    Định nghĩa danh mục các nhiệm vụ xanh theo tuần (phân loại rác, trả pin, báo bãi rác, đi xe đạp...).
    """
    __tablename__ = "green_challenges"

    challenge_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    points_reward: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="DAILY_HABIT", nullable=False)
    icon: Mapped[str] = mapped_column(String(50), default="leaf", nullable=False)
    requirements: Mapped[str] = mapped_column(Text, nullable=False)
    is_auto_verify: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    participations: Mapped[list["UserChallenge"]] = relationship(back_populates="challenge", cascade="all, delete-orphan")


class UserChallenge(Base):
    """
    Bảng theo dõi tiến độ nộp minh chứng và nhận thưởng thử thách theo tuần của từng công dân.
    Trạng thái: NOT_STARTED, PENDING, COMPLETED.
    """
    __tablename__ = "user_challenges"
    __table_args__ = (
        UniqueConstraint("user_id", "challenge_id", "week_year", name="uq_user_challenge_week"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id: Mapped[str] = mapped_column(ForeignKey("green_challenges.challenge_id", ondelete="CASCADE"), nullable=False, index=True)
    week_year: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # vd: "2026-W41"
    status: Mapped[str] = mapped_column(String(30), default="NOT_STARTED", nullable=False)  # NOT_STARTED | PENDING | COMPLETED
    evidence_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_note: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    challenge: Mapped["GreenChallenge"] = relationship(back_populates="participations")
    user: Mapped["User"] = relationship()
