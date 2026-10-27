import enum
import uuid
from datetime import date, datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.rbac import User


class FundraiserStatus(str, enum.Enum):
    """Trạng thái chiến dịch gây quỹ cộng đồng (Mục 4.2.20, trang 160 - 168)"""
    PENDING = "pending"        # Chờ duyệt (người dùng vừa tạo)
    APPROVED = "approved"      # Đang gây quỹ (Admin đã duyệt, hiển thị công khai)
    REJECTED = "rejected"      # Bị từ chối duyệt kèm lý do
    COMPLETED = "completed"    # Đã hoàn thành (đạt hoặc vượt mục tiêu tiền)
    CLOSED = "closed"          # Đã kết thúc (hết hạn hoặc người tạo kết thúc sớm)


class FundraiserCampaign(Base, TimestampMixin):
    """
    Bảng Chiến dịch Gây quỹ Cộng đồng (Fundraiser Campaign)
    Tuân thủ đặc tả Mục 4.2.20 - Báo cáo đồ án trang 160 - 168
    """
    __tablename__ = "fundraiser_campaigns"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    target_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_donated: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    donation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_spent: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    district: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Thông tin tài khoản nhận tiền (Bảo mật: Chỉ Quản trị viên xem được)
    bank_account_name: Mapped[str] = mapped_column(String(100), nullable=False)
    bank_account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)

    status: Mapped[str] = mapped_column(
        String(20), default=FundraiserStatus.PENDING.value, nullable=False, index=True
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    # Relationships
    creator: Mapped["User"] = relationship("User", foreign_keys=[creator_id])
    donations: Mapped[List["FundraiserDonation"]] = relationship(
        "FundraiserDonation", back_populates="campaign", cascade="all, delete-orphan"
    )
    expenses: Mapped[List["FundraiserExpense"]] = relationship(
        "FundraiserExpense", back_populates="campaign", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_fundraiser_status_end_date", "status", "end_date"),
        Index("idx_fundraiser_district_status", "district", "status"),
    )


class FundraiserDonation(Base, TimestampMixin):
    """
    Bảng Lượt Quyên góp Tài chính (Donation)
    Lưu vết các giao dịch đóng góp cho từng chiến dịch
    """
    __tablename__ = "fundraiser_donations"

    donation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fundraiser_campaigns.campaign_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    donor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    donor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    message: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    payment_status: Mapped[str] = mapped_column(
        String(20), default="completed", nullable=False
    )
    transaction_code: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True
    )

    # Relationships
    campaign: Mapped["FundraiserCampaign"] = relationship(
        "FundraiserCampaign", back_populates="donations"
    )
    donor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[donor_id])


class FundraiserExpense(Base, TimestampMixin):
    """
    Bảng Khoản Chi Báo cáo Sử dụng Quỹ (Expense Report)
    Minh bạch tài chính: Khoản chi đã tạo KHÔNG ĐƯỢC PHÉP sửa hoặc xóa
    """
    __tablename__ = "fundraiser_expenses"

    expense_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fundraiser_campaigns.campaign_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    proof_image_url: Mapped[str] = mapped_column(String(500), nullable=False)

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    # Relationships
    campaign: Mapped["FundraiserCampaign"] = relationship(
        "FundraiserCampaign", back_populates="expenses"
    )
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
