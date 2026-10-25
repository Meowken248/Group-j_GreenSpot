import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class EventBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=100, description="Tên sự kiện")
    description: str = Field(..., min_length=10, max_length=2000, description="Mô tả chi tiết và vật dụng mang theo")
    cover_image_url: str = Field(..., max_length=500, description="Đường dẫn ảnh bìa")
    start_time: datetime = Field(..., description="Thời gian bắt đầu sự kiện")
    end_time: Optional[datetime] = Field(None, description="Thời gian kết thúc sự kiện")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Vĩ độ điểm tập trung")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Kinh độ điểm tập trung")
    address: str = Field(..., min_length=5, max_length=255, description="Địa chỉ điểm tập trung")
    district: str = Field(..., min_length=2, max_length=100, description="Quận/huyện thuộc TP.HCM")
    max_participants: int = Field(50, ge=5, le=500, description="Số lượng người tham gia tối đa (5-500)")


class EventCreate(EventBase):
    @field_validator("max_participants")
    @classmethod
    def validate_max_participants(cls, v: int) -> int:
        if v < 5 or v > 500:
            raise ValueError("Số người tham gia tối đa phải từ 5 đến 500 người")
        return v


class EventReviewRequest(BaseModel):
    status: str = Field(..., description="APPROVED hoặc REJECTED")
    reject_reason: Optional[str] = Field(None, max_length=500, description="Lý do từ chối nếu có")


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
