"""
GreenSpot Domain Model - Milestone Celebration & Tier Progression (Chức năng 36)
Mô hình dữ liệu lưu trữ bài chúc mừng vinh danh lên cấp trên Bảng tin cộng đồng.
"""

import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.rbac import User


class MilestonePost(Base):
    """Bảng lưu trữ bài viết vinh danh thăng cấp danh hiệu lên Bảng tin cộng đồng (Chức năng 36)"""
    __tablename__ = "milestone_posts"

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    tier_code: Mapped[str] = mapped_column(String(20), nullable=False)
    tier_name: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    privacy: Mapped[str] = mapped_column(String(20), default="PUBLIC", nullable=False)  # PUBLIC, FRIENDS, PRIVATE
    category: Mapped[str] = mapped_column(String(50), default="Vinh danh lên cấp", nullable=False)
    likes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    user: Mapped[Optional["User"]] = relationship("User", lazy="joined")
