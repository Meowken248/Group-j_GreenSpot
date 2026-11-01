"""
GreenSpot Domain Model - Green Points & Rewards (Chức năng 28, 29, 30 & 31)
Mô hình dữ liệu cơ chế tích lũy điểm thưởng, Sổ cái ví điểm điện tử,
Quản trị danh mục quà tặng / kho voucher (Chức năng 30)
và Kho voucher cá nhân đã đổi (Chức năng 31).
"""

import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import (
    String,
    Integer,
    Boolean,
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
    from app.models.incident import Incident


class CitizenReward(Base):
    """
    Bảng danh mục vật phẩm quà tặng xanh & E-Voucher quy đổi (Chức năng 30):
    Bình giữ nhiệt Eco, Voucher Co.opmart, Chậu cây lọc khí, v.v.
    Hỗ trợ quản trị CRUD, theo dõi tồn kho, hạn dùng và đối tác tài trợ ESG.
    """
    __tablename__ = "citizen_rewards"

    reward_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reward_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(100), default="GreenSpot ESG", nullable=True)
    points_required: Mapped[int] = mapped_column(Integer, nullable=False)
    reward_type: Mapped[str] = mapped_column(String(50), default="VOUCHER", nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_redeemed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    expiry_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    transactions: Mapped[List["RewardTransaction"]] = relationship(
        back_populates="reward", cascade="all, delete-orphan"
    )
    vouchers: Mapped[List["UserVoucher"]] = relationship(
        back_populates="reward", cascade="all, delete-orphan"
    )


class UserVoucher(Base):
    """
    Kho voucher và quà tặng cá nhân của công dân đã đổi từ Điểm Xanh (Chức năng 31):
    Mã voucher định danh, QR code, thời hạn sử dụng, điều kiện sử dụng,
    và trạng thái (ACTIVE: Còn hạn, USED: Đã dùng, EXPIRED: Hết hạn).
    """
    __tablename__ = "user_vouchers"

    voucher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    reward_id: Mapped[int] = mapped_column(
        ForeignKey("citizen_rewards.reward_id", ondelete="CASCADE"), nullable=False, index=True
    )
    voucher_code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    points_spent: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="ACTIVE", nullable=False, index=True
    )
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    qr_data: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    redeemed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="vouchers")
    reward: Mapped["CitizenReward"] = relationship(back_populates="vouchers")


class RewardTransaction(Base):
    """
    Sổ cái biến động Điểm Thưởng Công Dân Xanh (Point Statement Ledger):
    Lưu trữ đầy đủ các giao dịch cộng/trừ điểm với mã giao dịch UUID/TX,
    số điểm biến động, số dư sau giao dịch, thời điểm và nội dung đối soát.
    """
    __tablename__ = "reward_transactions"

    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    reward_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("citizen_rewards.reward_id", ondelete="SET NULL"), nullable=True
    )
    incident_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("incidents.incident_id", ondelete="SET NULL"), nullable=True
    )
    transaction_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    points_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="reward_transactions")
    reward: Mapped[Optional["CitizenReward"]] = relationship(back_populates="transactions")
