"""
GreenSpot Domain Model - Citizen Tier & Ranking Milestone (Chức năng 28, 32 & 36)
Quản trị cột mốc cấp bậc danh hiệu công dân xanh:
- Hỗ trợ CRUD toàn diện cho Admin
- Tùy biến cột mốc điểm số xếp hạng (min_points)
- Tùy biến biểu tượng huy hiệu, bảng màu, quyền lợi và tỷ lệ ưu đãi
"""

from datetime import datetime
from typing import Optional, List
import json
from sqlalchemy import (
    String,
    Integer,
    Boolean,
    Text,
    DateTime,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CitizenTier(Base):
    """
    Bảng danh mục các Cột Mốc Cấp Bậc / Danh Hiệu Công Dân Xanh (Gamification Tiers):
    Cho phép quản trị viên thêm, sửa, xóa, và điều chỉnh điểm số xếp hạng linh hoạt.
    """
    __tablename__ = "citizen_tiers"

    tier_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tier_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    tier_name: Mapped[str] = mapped_column(String(100), nullable=False)
    min_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
    badge_icon: Mapped[str] = mapped_column(String(20), nullable=False, default="🌱")
    color_hex: Mapped[str] = mapped_column(String(20), nullable=False, default="#10b981")
    bg_gradient: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)",
    )
    discount_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    benefits: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def get_benefits_list(self) -> List[str]:
        if not self.benefits:
            return []
        try:
            parsed = json.loads(self.benefits)
            if isinstance(parsed, list):
                return parsed
            return [str(parsed)]
        except Exception:
            return [b.strip() for b in self.benefits.split("\n") if b.strip()]

    def set_benefits_list(self, benefits_list: List[str]):
        self.benefits = json.dumps(benefits_list, ensure_ascii=False)
