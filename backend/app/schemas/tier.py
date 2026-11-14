"""
GreenSpot Pydantic Schemas - Gamification Citizen Tiers & Milestone Thresholds (Chức năng 28, 32, 36)
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class TierInfo(BaseModel):
    tier_id: Optional[int] = None
    tier_code: str
    tier_name: str
    min_points: int
    badge_icon: str
    color_hex: str
    bg_gradient: str
    discount_percent: int = 0
    description: Optional[str] = None
    benefits: List[str] = []
    order_index: int = 0
    is_active: bool = True
    users_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TierCreateRequest(BaseModel):
    tier_code: str = Field(..., min_length=2, max_length=50, description="Mã định danh duy nhất (ví dụ: PLATINUM, RUBY)")
    tier_name: str = Field(..., min_length=2, max_length=100, description="Tên cấp bậc hiển thị (ví dụ: Hạng Bạch Kim)")
    min_points: int = Field(..., ge=0, description="Cột mốc điểm số tối thiểu để đạt hạng")
    badge_icon: str = Field(..., min_length=1, max_length=20, description="Biểu tượng huy hiệu (emoji hoặc icon)")
    color_hex: str = Field("#10b981", min_length=4, max_length=20, description="Mã màu HEX đại diện")
    bg_gradient: Optional[str] = Field(
        "linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)",
        description="Mã CSS Gradient làm nền thẻ vinh danh",
    )
    discount_percent: int = Field(0, ge=0, le=100, description="Tỷ lệ % giảm điểm khi đổi quà tặng")
    description: Optional[str] = Field(None, max_length=500, description="Mô tả ý nghĩa danh hiệu")
    benefits: List[str] = Field(default_factory=list, description="Danh sách các quyền lợi đặc quyền của cấp bậc")
    order_index: Optional[int] = Field(0, description="Thứ tự hiển thị ưu tiên")
    is_active: bool = Field(True, description="Trạng thái kích hoạt")


class TierUpdateRequest(BaseModel):
    tier_name: Optional[str] = Field(None, min_length=2, max_length=100)
    min_points: Optional[int] = Field(None, ge=0)
    badge_icon: Optional[str] = Field(None, min_length=1, max_length=20)
    color_hex: Optional[str] = Field(None, min_length=4, max_length=20)
    bg_gradient: Optional[str] = None
    discount_percent: Optional[int] = Field(None, ge=0, le=100)
    description: Optional[str] = Field(None, max_length=500)
    benefits: Optional[List[str]] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class TierListResponse(BaseModel):
    total: int
    tiers: List[TierInfo]


class TierAdminResponse(BaseModel):
    tier: TierInfo
    message: str
