"""
GreenSpot Domain Model: Penalty Regulations (Quy định xử phạt vi phạm hành chính môi trường)
Tuân thủ đầy đủ các quy tắc:
- Soft delete (deleted_at)
- Optimistic locking (version)
- UUIDv4 Primary Key
- Hỗ trợ tra cứu nhanh danh mục, lọc lĩnh vực, nhân đôi tiền phạt cho Tổ chức
"""

import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    String,
    Text,
    BigInteger,
    Integer,
    Date,
    DateTime,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class PenaltyRegulation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Bảng lưu trữ danh mục quy định xử phạt vi phạm hành chính về môi trường
    (Trích xuất theo Nghị định 45/2022/NĐ-CP và các văn bản quy phạm pháp luật liên quan)
    """
    __tablename__ = "penalty_regulations"

    # Tên / Tóm lược hành vi vi phạm (VD: "Vứt rác sinh hoạt trên vỉa hè, lòng đường")
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )

    # Chuyên đề / Lĩnh vực môi trường (Rác thải sinh hoạt, Rác công nghiệp/nguy hại, Nước thải, Khí thải, Tiếng ồn)
    domain: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )

    # Thẻ danh mục nhanh Màn 1 (Xả rác, Đốt rác, Nước thải, Tiếng ồn)
    quick_category: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True
    )

    # Khung tiền phạt đối với CÁ NHÂN (VND)
    min_fine_individual: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0
    )
    max_fine_individual: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0
    )
    avg_fine_individual: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0
    )

    # Khung tiền phạt đối với TỔ CHỨC (Luật định = 2 lần mức phạt của cá nhân) (VND)
    min_fine_organization: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0
    )
    max_fine_organization: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0
    )
    avg_fine_organization: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0
    )

    # Trích xuất nguyên văn mô tả hành vi theo điều luật
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    # Tình tiết tăng nặng / Tái phạm nhiều lần
    aggravating_circumstances: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Biện pháp xử lý bổ sung & khắc phục hậu quả (Tịch thu tang vật, buộc khôi phục tình trạng môi trường...)
    supplementary_measures: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Số hiệu căn cứ pháp lý (VD: "Khoản 2 Điều 25 Nghị định 45/2022/NĐ-CP")
    legal_basis: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )

    # Ngày có hiệu lực thi hành
    effective_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )

    # Nhãn cảnh báo nếu điều khoản đã có văn bản sửa đổi/bổ sung mới
    amendment_warning: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )

    # Từ khóa tìm kiếm bổ sung mở rộng (hỗ trợ phân tách từ khóa phổ biến không dấu / có dấu)
    keywords: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # =========================================================================
    # TUÂN THỦ PROJECT_RULES (Soft Delete & Optimistic Locking)
    # =========================================================================
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        default=None
    )

    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )

    __table_args__ = (
        Index("ix_penalty_search_composite", "deleted_at", "domain", "quick_category"),
    )
