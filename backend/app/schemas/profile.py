import re
import uuid
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# =========================================================================
# 1. CÁC SCHEMA MÀN 1: PROFILE TIMELINE
# =========================================================================

class CitizenLevelInfo(BaseModel):
    level_id: int
    level_name: str
    min_points: int
    badge_icon_url: Optional[str] = None
    sort_order: int = 1


class BadgeHighlightInfo(BaseModel):
    badge_id: int
    badge_code: str
    name: str
    icon_url: str
    earned_at: datetime


class UserProfileResponse(BaseModel):
    user_id: uuid.UUID
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    bio: Optional[str] = None
    friends_count: int = 0
    activated_at: datetime
    current_level: Optional[CitizenLevelInfo] = None
    highlight_badges: List[BadgeHighlightInfo] = []
    total_badges_count: int = 0
    is_own_profile: bool = False
    total_green_points: int = 0
    date_of_birth: Optional[date] = None
    version: int = 1


class PostItemResponse(BaseModel):
    post_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    media_urls: Optional[List[str]] = None
    thumbnail_url: Optional[str] = None
    reactions_count: int = 0
    comments_count: int = 0
    is_hidden: bool = False
    created_at: datetime
    relative_time: Optional[str] = None


class PostListResponse(BaseModel):
    items: List[PostItemResponse]
    total: int
    has_more: bool
    page: int
    limit: int


# =========================================================================
# 2. CÁC SCHEMA MÀN 2: GREEN PASSPORT & HUY HIỆU
# =========================================================================

class GreenPassportResponse(BaseModel):
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    passport_code: str  # GP-000123
    current_level: str  # Tên cấp, e.g. "Lá Xanh"
    total_green_points: int
    progress_percentage: int
    points_to_next_level: int
    next_level_name: Optional[str] = None
    is_max_level: bool = False
    activated_at: datetime


class BadgeEarnedItem(BaseModel):
    badge_id: int
    badge_code: str
    name: str
    description: str
    icon_url: str
    earned_at: datetime


class BadgeLockedItem(BaseModel):
    badge_id: int
    badge_code: str
    name: str
    description: str
    icon_url: str
    unlock_condition: str
    sort_order: int


class UserBadgesResponse(BaseModel):
    earned_badges: List[BadgeEarnedItem]
    locked_badges: Optional[List[BadgeLockedItem]] = None
    is_own_profile: bool = False


# =========================================================================
# 3. CÁC SCHEMA MÀN 3: LỊCH SỬ ĐÓNG GÓP
# =========================================================================

class ActivityItemResponse(BaseModel):
    activity_id: uuid.UUID
    activity_type: str
    title: str
    description: Optional[str] = None
    points: int = 0
    created_at: datetime


class ActivityListResponse(BaseModel):
    items: List[ActivityItemResponse]
    total_activities: int
    total_points: int
    has_more: bool
    limit: int
    offset: int


# =========================================================================
# 4. CÁC SCHEMA MÀN 4: CẬP NHẬT HỒ SƠ (OCC & VALIDATION)
# =========================================================================

class UpdateProfileRequest(BaseModel):
    full_name: str = Field(..., description="Họ tên 2-50 ký tự, chỉ gồm chữ cái và khoảng trắng")
    bio: Optional[str] = Field(None, description="Đoạn giới thiệu tối đa 200 ký tự")
    date_of_birth: Optional[date] = Field(None, description="Ngày sinh không ở tương lai, không trước 1900-01-01")
    avatar_url: Optional[str] = Field(None, description="Đường dẫn hoặc Data URL Base64 của ảnh avatar")
    cover_image_url: Optional[str] = Field(None, description="Đường dẫn hoặc Data URL Base64 của ảnh bìa")
    version: int = Field(..., description="Version hiện tại để kiểm tra Optimistic Locking")

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if v is None:
            raise ValueError("Vui lòng nhập họ tên")
        # Chuẩn hóa khoảng trắng đầu cuối và khoảng trắng thừa giữa các từ
        v = re.sub(r"\s+", " ", v.strip())
        if not v:
            raise ValueError("Vui lòng nhập họ tên")
        if not (2 <= len(v) <= 50):
            raise ValueError("Họ tên phải từ 2 đến 50 ký tự, chỉ gồm chữ cái và khoảng trắng")
        if not re.match(r"^[a-zA-ZÀ-ỹà-ỹ\s]+$", v):
            raise ValueError("Họ tên phải từ 2 đến 50 ký tự, chỉ gồm chữ cái và khoảng trắng")
        return v

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 200:
            return v[:200]
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        if v is not None:
            if v > date.today():
                raise ValueError("Ngày sinh không được ở tương lai")
            if v < date(1900, 1, 1):
                raise ValueError("Ngày sinh không hợp lệ")
        return v


class UpdateProfileResponse(BaseModel):
    success: bool
    message: str
    new_version: int
    user: UserProfileResponse
