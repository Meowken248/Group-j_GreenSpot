"""
Pydantic Schemas: Sinh nhật bạn bè & thiệp xanh sinh thái (Feature STT 17)
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 142 - 147)
"""

import uuid
from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

MAX_WISH_LENGTH = 200


# =========================================================================
# 1. KHỐI "SINH NHẬT HÔM NAY" TRÊN BẢNG TIN
# =========================================================================

class BirthdayFriendItem(BaseModel):
    """Một người bạn có sinh nhật hôm nay"""

    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    date_of_birth: date
    age: int
    citizen_level_name: Optional[str] = None
    card_sent_today: bool = False
    wish_sent_today: bool = False


class BirthdayCardTemplate(BaseModel):
    """Mẫu thiệp xanh sinh thái (chỉ là cấu hình hiển thị, không lưu DB)"""

    card_id: str
    name: str
    tagline: str
    icon: str
    gradient_from: str
    gradient_to: str
    accent_color: str
    suggestion: str


class BirthdayTodayResponse(BaseModel):
    """Danh sách bạn bè sinh nhật hôm nay kèm hạn mức điểm thưởng"""

    items: List[BirthdayFriendItem] = Field(default_factory=list)
    total: int = 0
    has_more: bool = False
    limit: int = 3
    today: date
    points_per_card: int = 5
    daily_points_cap: int = 25
    daily_points_earned: int = 0
    daily_reward_limit_reached: bool = False
    card_templates: List[BirthdayCardTemplate] = Field(default_factory=list)
    default_suggestion: str


# =========================================================================
# 2. GỬI LỜI CHÚC / TẶNG THIỆP XANH
# =========================================================================

class BirthdayWishSendRequest(BaseModel):
    """Payload gửi lời chúc hoặc tặng thiệp xanh sinh nhật"""

    recipient_id: uuid.UUID
    wish_type: Literal["MESSAGE", "CARD"] = "MESSAGE"
    card_template_id: Optional[str] = None
    message: str

    @field_validator("message", mode="before")
    @classmethod
    def normalize_message(cls, value):
        """Gộp khoảng trắng thừa và cắt khoảng trắng đầu/cuối"""
        if not isinstance(value, str):
            return value
        return " ".join(value.split())

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        if not value:
            raise ValueError("Vui lòng nhập lời chúc")
        if len(value) > MAX_WISH_LENGTH:
            raise ValueError(f"Lời chúc tối đa {MAX_WISH_LENGTH} ký tự")
        return value


class BirthdayWishSendResponse(BaseModel):
    """Kết quả gửi lời chúc / thiệp xanh"""

    success: bool = True
    wish_id: uuid.UUID
    wish_type: str
    recipient_id: uuid.UUID
    recipient_name: str
    message: str
    points_awarded: int = 0
    daily_limit_reached: bool = False
    sender_total_green_points: int = 0


# =========================================================================
# 3. HỘP THƯ LỜI CHÚC ĐÃ NHẬN (hiển thị trên trang cá nhân / chuông thông báo)
# =========================================================================

class BirthdayWishItem(BaseModel):
    wish_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    sender_avatar_url: Optional[str] = None
    wish_type: str
    card_template_id: Optional[str] = None
    message: str
    points_awarded: int = 0
    is_read: bool = False
    birthday_date: date
    created_at: datetime

    model_config = {"from_attributes": True}


class BirthdayWishListResponse(BaseModel):
    items: List[BirthdayWishItem] = Field(default_factory=list)
    total: int = 0
    unread_count: int = 0
    has_more: bool = False
    limit: int = 20
    offset: int = 0


class BirthdayWishReadRequest(BaseModel):
    """Đánh dấu đã đọc (rỗng = đánh dấu toàn bộ)"""

    wish_ids: Optional[List[uuid.UUID]] = None


class BirthdayWishReadResponse(BaseModel):
    success: bool = True
    marked_count: int = 0
    unread_count: int = 0
