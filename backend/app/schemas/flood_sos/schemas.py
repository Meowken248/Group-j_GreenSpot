"""
Pydantic v2 DTO Schemas cho STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
(Màn 1/5: Phát tín hiệu, Màn 2/5: Xác nhận gửi, Màn 3/5: Tình nguyện viên nhận, Màn 4/5: Live Tracking, Màn 5/5: Huỷ SOS)
"""

from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field, ConfigDict


# =========================================================================
# 1. SCHEMAS CHO MÀN 1/5 & MÀN 2/5: PHÁT TÍN HIỆU CẤP CỨU KHẨN CẤP
# =========================================================================

class CreateFloodSosRequest(BaseModel):
    """
    Yêu cầu phát tín hiệu cứu hộ SOS từ người dân (Màn 1/5 và 2/5).
    Validation nghiêm ngặt: Bắt buộc số người cần cứu >= 1, vị trí GPS và mô tả.
    """
    victim_name: Optional[str] = Field(default="Người dân gặp nạn", description="Tên người cần cứu")
    victim_phone: Optional[str] = Field(default="112", description="Số điện thoại liên lạc khẩn cấp")

    # Khối TÌNH HUỐNG
    total_victims: int = Field(..., ge=1, description="Ước tính số người cần cứu hộ (bắt buộc >= 1)")
    elderly_count: int = Field(default=0, ge=0, description="Số người già")
    children_count: int = Field(default=0, ge=0, description="Số trẻ nhỏ")
    medical_urgent_count: int = Field(default=0, ge=0, description="Số người bệnh cần hỗ trợ y tế")
    description: str = Field(..., min_length=3, description="Mô tả chi tiết tình trạng hiện thời")
    image_url: Optional[str] = Field(default=None, description="URL hoặc Base64 ảnh hiện trường")

    # Khối VỊ TRÍ
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Vĩ độ GPS của nạn nhân")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Kinh độ GPS của nạn nhân")
    address_text: str = Field(..., min_length=2, description="Địa chỉ ước tính hoặc tự nhập")
    district: Optional[str] = Field(default=None, description="Quận/Huyện")
    ward: Optional[str] = Field(default=None, description="Phường/Xã")

    # Độ sâu & Mức độ
    severity_level: str = Field(default="CRITICAL", description="Mức độ nguy hiểm: CRITICAL, URGENT, HIGH")
    flood_depth_meters: Optional[float] = Field(default=1.0, ge=0.0, description="Độ sâu ngập ước tính (m)")


class CreateFloodSosResponse(BaseModel):
    """Kết quả phát lệnh cấp cứu SOS thành công (Màn 2/5)"""
    success: bool
    request_id: uuid.UUID
    sos_code: str
    status: str
    message: str
    estimated_nearby_volunteers: int = Field(default=0, description="Số tình nguyện viên quét được trong bán kính 3km")
    broadcast_radius_km: float = Field(default=3.0)


# =========================================================================
# 2. SCHEMAS CHO MÀN 3/5: GIAO DIỆN PHÂN BỔ CỨU HỘ CHO TÌNH NGUYỆN VIÊN
# =========================================================================

class VolunteerNearbySosQuery(BaseModel):
    """Truy vấn các ca cứu hộ SOS gần vị trí tình nguyện viên (bán kính 3km)"""
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    radius_km: float = Field(default=3.0, ge=0.5, le=20.0, description="Bán kính quét (mặc định 3km)")


class VolunteerSosCardResponse(BaseModel):
    """Thẻ thông tin yêu cầu cứu hộ hiển thị trên bảng điều khiển TNV (Màn 3/5)"""
    request_id: uuid.UUID
    sos_code: str
    victim_name: str
    victim_phone: str
    total_victims: int
    elderly_count: int
    children_count: int
    medical_urgent_count: int
    description: str
    image_url: Optional[str] = None
    latitude: float
    longitude: float
    address_text: str
    district: Optional[str] = None
    severity_level: str
    flood_depth_meters: Optional[float] = None
    distance_meters: float = Field(..., description="Khoảng cách từ TNV đến người gặp nạn (mét)")
    distance_text: str = Field(..., description="Định dạng hiển thị: Cách bạn [Cự_ly] m/km")
    status: str
    created_at: datetime
    version: int

    model_config = ConfigDict(from_attributes=True)


class AcceptSosRequest(BaseModel):
    """Tình nguyện viên bấm Nhận yêu cầu cứu hộ (có OCC version lock)"""
    version: int = Field(..., description="Phiên bản OCC của ca cứu hộ để tránh race condition")
    volunteer_latitude: float = Field(..., ge=-90.0, le=90.0)
    volunteer_longitude: float = Field(..., ge=-180.0, le=180.0)
    team_name: Optional[str] = Field(default=None)
    vehicle_type: Optional[str] = Field(default="Xuồng máy cứu nạn")


class SkipSosRequest(BaseModel):
    """Tình nguyện viên bấm Bỏ qua yêu cầu"""
    reason: Optional[str] = Field(default="Bận hoặc không đủ phương tiện")


# =========================================================================
# 3. SCHEMAS CHO MÀN 4/5: TRUNG TÂM THEO DÕI TIẾN ĐỘ & LIVE TRACKING
# =========================================================================

class ChatMessageItem(BaseModel):
    message_id: uuid.UUID
    sender_type: str  # VICTIM, RESCUER, SYSTEM
    sender_name: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SendChatMessageRequest(BaseModel):
    sender_type: str = Field(default="VICTIM", description="VICTIM hoặc RESCUER")
    sender_name: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1, max_length=1000)


class UpdateSosProgressRequest(BaseModel):
    """Cập nhật tiến trình di chuyển của người cứu hộ (Màn 4/5)"""
    status: str = Field(..., description="ACCEPTED, EN_ROUTE, COMPLETED")
    rescuer_latitude: float = Field(..., ge=-90.0, le=90.0)
    rescuer_longitude: float = Field(..., ge=-180.0, le=180.0)
    version: int = Field(..., description="OCC version")


class SosTrackingDetailResponse(BaseModel):
    """Toàn bộ thông tin chi tiết ca cứu hộ phục vụ Màn 4/5"""
    request_id: uuid.UUID
    sos_code: str
    status: str  # PENDING, ACCEPTED, EN_ROUTE, COMPLETED, CANCELLED
    status_step: int  # 1: Đã gửi, 2: Đã nhận, 3: Đang đến, 4: Hoàn tất
    
    # Thông tin nạn nhân
    victim_name: str
    victim_phone: str
    total_victims: int
    elderly_count: int
    children_count: int
    medical_urgent_count: int
    description: str
    image_url: Optional[str] = None
    latitude: float
    longitude: float
    address_text: str

    # Thông tin người cứu hộ (nếu đã được nhận)
    assigned_rescuer_name: Optional[str] = None
    assigned_rescuer_phone: Optional[str] = None
    assigned_team_name: Optional[str] = None
    assigned_vehicle_type: Optional[str] = None
    rescuer_latitude: Optional[float] = None
    rescuer_longitude: Optional[float] = None
    rescuer_distance_meters: Optional[float] = None
    rescuer_eta_minutes: Optional[int] = None
    distance_display: Optional[str] = None

    # Lịch sử tin nhắn
    messages: List[ChatMessageItem] = Field(default_factory=list)

    # Đánh giá hoàn tất
    rating: Optional[int] = None
    feedback_notes: Optional[str] = None

    # Huỷ
    cancel_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None

    created_at: datetime
    updated_at: Optional[datetime] = None
    version: int

    model_config = ConfigDict(from_attributes=True)


class CompleteSosRatingRequest(BaseModel):
    """Nạn nhân đánh giá sau khi hoàn tất cứu hộ"""
    rating: int = Field(..., ge=1, le=5)
    feedback_notes: Optional[str] = Field(default=None, max_length=500)


# =========================================================================
# 4. SCHEMAS CHO MÀN 5/5: POPUP HUỶ YÊU CẦU SOS
# =========================================================================

class CancelSosRequest(BaseModel):
    """Nạn nhân bấm Huỷ yêu cầu SOS (Màn 5/5)"""
    version: int = Field(..., description="OCC version")
    cancel_reason: Optional[str] = Field(default="Nước đã rút / Đã tự di chuyển an toàn", description="Lý do huỷ")
    is_confirmed_near: bool = Field(default=False, description="Xác nhận thêm khi người cứu hộ đã đến gần < 100m")


class CancelSosResponse(BaseModel):
    success: bool
    requires_near_confirmation: bool = False
    warning_message: Optional[str] = None
    message: str
