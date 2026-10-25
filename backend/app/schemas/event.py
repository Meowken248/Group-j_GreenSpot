import uuid
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class EventBase(BaseModel):
    # Đặc tả Trang 169: Tên sự kiện tối đa 100 ký tự (không quy định độ dài tối thiểu)
    title: str = Field(..., min_length=1, max_length=100, description="Tên sự kiện")
    description: str = Field(..., min_length=10, max_length=2000, description="Mô tả chi tiết và vật dụng mang theo")
    cover_image_url: str = Field(..., min_length=1, max_length=500, description="Đường dẫn ảnh bìa")
    start_time: datetime = Field(..., description="Thời gian bắt đầu sự kiện")
    end_time: Optional[datetime] = Field(None, description="Thời gian kết thúc sự kiện")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Vĩ độ điểm tập trung")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Kinh độ điểm tập trung")
    address: str = Field(..., min_length=5, max_length=255, description="Địa chỉ điểm tập trung")
    district: str = Field(..., min_length=2, max_length=100, description="Quận/huyện thuộc TP.HCM")
    max_participants: int = Field(50, ge=5, le=500, description="Số lượng người tham gia tối đa (5-500)")

    @field_validator("title", "description", "cover_image_url", "address", "district", mode="before")
    @classmethod
    def strip_text(cls, v):
        return v.strip() if isinstance(v, str) else v

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.end_time and self.end_time <= self.start_time:
            raise ValueError("Thời gian kết thúc phải sau thời gian bắt đầu sự kiện")
        return self


class EventCreate(EventBase):
    @field_validator("max_participants")
    @classmethod
    def validate_max_participants(cls, v: int) -> int:
        if v < 5 or v > 500:
            raise ValueError("Số người tham gia tối đa phải từ 5 đến 500 người")
        return v


class EventUpdate(BaseModel):
    """Payload chỉnh sửa sự kiện (Màn 3/4 - chỉ người tạo, trước khi sự kiện diễn ra)."""

    version: int = Field(..., ge=1, description="Phiên bản hiện tại để chống ghi đè (optimistic locking)")

    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    cover_image_url: Optional[str] = Field(None, min_length=1, max_length=500)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    address: Optional[str] = Field(None, min_length=5, max_length=255)
    district: Optional[str] = Field(None, min_length=2, max_length=100)
    max_participants: Optional[int] = Field(None, ge=5, le=500)

    @field_validator("title", "description", "cover_image_url", "address", "district", mode="before")
    @classmethod
    def strip_text(cls, v):
        return v.strip() if isinstance(v, str) else v


class EventReviewRequest(BaseModel):
    status: Literal["APPROVED", "REJECTED"] = Field(..., description="APPROVED hoặc REJECTED")
    reject_reason: Optional[str] = Field(None, max_length=500, description="Lý do từ chối nếu có")

    @model_validator(mode="after")
    def validate_reason(self):
        if self.status == "REJECTED" and not (self.reject_reason or "").strip():
            raise ValueError("Vui lòng nhập lý do từ chối sự kiện")
        return self



class ParticipantItem(BaseModel):
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    joined_at: datetime
    is_creator: bool = False

    class Config:
        from_attributes = True


class EventResponse(EventBase):
    event_id: uuid.UUID
    creator_id: uuid.UUID
    creator_name: Optional[str] = None
    creator_avatar: Optional[str] = None
    current_participants: int
    interested_count: int
    status: str
    reject_reason: Optional[str] = None
    checkin_radius_meters: int = 100
    created_at: datetime
    updated_at: datetime
    version: int = 1
    is_ended: bool = False

    # Trạng thái cá nhân của người đang gọi API (nếu đã đăng nhập)
    is_joined: bool = False
    is_interested: bool = False
    is_checked_in: bool = False

    # Danh sách tối đa 10 người tham gia đầu tiên (Màn 3/4)
    participants_preview: List[ParticipantItem] = []

    class Config:
        from_attributes = True



class EventListResponse(BaseModel):
    items: List[EventResponse]
    total: int
    page: int
    page_size: int


class CheckinRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Tọa độ GPS hiện tại (vĩ độ)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Tọa độ GPS hiện tại (kinh độ)")
    accuracy: float = Field(..., ge=0.0, description="Bán kính sai số GPS tính bằng mét")
    device_info: Optional[str] = Field(None, max_length=255, description="Thông tin thiết bị")


class CheckinResponse(BaseModel):
    success: bool
    message: str
    event_id: uuid.UUID
    checkin_time: datetime
    distance_meters: float
    accuracy_meters: float
    points_awarded: int = 50
    total_green_points: int
    daily_points_earned: int = 0
    daily_points_cap: int = 150

