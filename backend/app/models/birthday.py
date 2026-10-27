"""
Miền nghiệp vụ Sinh nhật bạn bè (Birthday Domain - Feature STT 17)
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 142 - 147)

Bao gồm:
- BirthdayWish: lời chúc / thiệp xanh sinh nhật do bạn bè gửi cho nhau.
"""

import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class BirthdayWishType(str, enum.Enum):
    """Loại lời chúc sinh nhật (Màn hình Sinh nhật bạn bè - STT 17)"""

    MESSAGE = "MESSAGE"  # Chỉ gửi lời chúc (không kèm điểm thưởng)
    CARD = "CARD"        # Tặng thiệp xanh kèm khung thiệp sinh thái (có điểm thưởng)


class BirthdayWish(Base, TimestampMixin):
    """
    Lời chúc / thiệp xanh sinh nhật bạn bè.

    Ràng buộc nghiệp vụ (SRS trang 143 - 147):
    - Chỉ người dùng là bạn bè (Friendship chưa bị xoá) mới gửi được lời chúc.
    - Mỗi cặp bạn bè chỉ gửi tối đa 01 lời chúc và 01 thiệp xanh trong ngày sinh nhật.
    - Lời chúc dài tối đa 200 ký tự.
    """

    __tablename__ = "birthday_wishes"

    wish_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    wish_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default=BirthdayWishType.MESSAGE.value
    )
    card_template_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # Ngày sinh nhật của người nhận tại thời điểm gửi (chống gửi trùng theo ngày)
    birthday_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    # Điểm xanh thực tế được cộng cho người gửi & người nhận (0 nếu chạm hạn mức ngày)
    points_awarded: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_id])

    __table_args__ = (
        CheckConstraint("sender_id <> recipient_id", name="ck_birthday_wishes_not_self"),
        CheckConstraint(
            "wish_type IN ('MESSAGE', 'CARD')", name="ck_birthday_wishes_type"
        ),
        CheckConstraint(
            "char_length(message) BETWEEN 1 AND 200", name="ck_birthday_wishes_message_length"
        ),
        CheckConstraint("points_awarded >= 0", name="ck_birthday_wishes_points"),
        # Mỗi cặp bạn bè tối đa 01 lời chúc + 01 thiệp xanh trong cùng một ngày sinh nhật
        Index(
            "uq_birthday_wishes_sender_recipient_day_type",
            "sender_id",
            "recipient_id",
            "birthday_date",
            "wish_type",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("idx_birthday_wishes_recipient_date", "recipient_id", "birthday_date"),
        Index("idx_birthday_wishes_sender_date", "sender_id", "birthday_date"),
    )


# Tránh lỗi import vòng khi SQLAlchemy resolve chuỗi quan hệ
from app.models.rbac import User  # noqa: E402,F401
