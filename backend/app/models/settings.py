"""
Model thực thể Cài đặt người dùng (User Settings & Preferences)
Thuộc Chức năng 7: Cài đặt tài khoản (Đổi chế độ Sáng/Tối, Đổi ngôn ngữ Việt/Anh)
"""
import uuid
from sqlalchemy import String, ForeignKey, Integer, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class UserSettings(Base, TimestampMixin):
    """
    Bảng lưu cấu hình cài đặt cá nhân hóa của người dùng:
    - theme: 'LIGHT' hoặc 'DARK' (mặc định 'LIGHT')
    - language: 'VI' hoặc 'EN' (mặc định 'VI')
    - version: Số nguyên phục vụ Optimistic Locking (mặc định 1)
    """
    __tablename__ = "user_settings"

    setting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )
    theme: Mapped[str] = mapped_column(
        String(10), default="LIGHT", nullable=False
    )
    language: Mapped[str] = mapped_column(
        String(10), default="VI", nullable=False
    )
    version: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False
    )

    user = relationship("User", backref="settings")

    __table_args__ = (
        CheckConstraint("theme IN ('LIGHT', 'DARK')", name="check_user_settings_theme"),
        CheckConstraint("language IN ('VI', 'EN')", name="check_user_settings_language"),
    )
