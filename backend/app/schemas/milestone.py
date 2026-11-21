"""
GreenSpot Pydantic Schemas - Milestone Celebration & Tier Progression (Chức năng 36)
Quy chuẩn dữ liệu: Lộ trình thăng cấp danh hiệu, hiệu ứng chúc mừng lên cấp,
tự tạo bài viết vinh danh chia sẻ lên bảng tin cộng đồng.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class TierBenefitItem(BaseModel):
    """Thông tin chi tiết từng đặc quyền của cấp bậc"""
    title: str
    description: Optional[str] = None


class TierDetailItem(BaseModel):
    """Chi tiết nấc thang danh hiệu trong lộ trình cấp bậc"""
    tier_code: str
    tier_name: str
    min_points: int
    badge_icon: str
    color_hex: str
    bg_gradient: str
    description: str
    benefits: List[str]
    is_current: bool = False
    is_unlocked: bool = False


class MilestoneProgressionResponse(BaseModel):
    """Dữ liệu toàn diện lộ trình các cấp (Màn 3) và ngữ cảnh chúc mừng (Màn 1)"""
    current_points: int
    current_tier: TierDetailItem
    next_tier: Optional[TierDetailItem] = None
    points_needed: int = 0
    progress_percent: float = 0.0
    is_max_tier: bool = False
    max_tier_message: Optional[str] = None
    all_tiers: List[TierDetailItem]
    congratulation_message: str
    default_post_content: str


class CreateMilestonePostRequest(BaseModel):
    """Yêu cầu đăng bài chúc mừng vinh danh tự tạo lên bảng tin (Màn 2)"""
    tier_code: str = Field(..., description="Mã cấp bậc đạt được (BRONZE, SILVER, GOLD, DIAMOND)")
    content: str = Field(..., min_length=5, max_length=1000, description="Nội dung bài chia sẻ vinh danh")
    privacy: str = Field(default="PUBLIC", description="Quyền riêng tư: PUBLIC, FRIENDS, PRIVATE")


class MilestonePostItem(BaseModel):
    """Thông tin bài viết vinh danh trên Bảng tin cộng đồng"""
    post_id: str
    user_id: str
    user_name: str
    avatar_url: Optional[str] = None
    tier_code: str
    tier_name: str
    badge_icon: str
    color_hex: str
    content: str
    privacy: str
    category: str
    likes_count: int
    created_at: datetime


class CreateMilestonePostResponse(BaseModel):
    """Phản hồi sau khi đăng bài vinh danh thành công"""
    success: bool
    message: str
    post: MilestonePostItem


class MilestonePostListResponse(BaseModel):
    """Danh sách các bài viết vinh danh thăng cấp trên bảng tin"""
    total: int
    items: List[MilestonePostItem]
