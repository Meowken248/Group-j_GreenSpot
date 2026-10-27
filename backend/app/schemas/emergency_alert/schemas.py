"""
Pydantic v2 DTO Schemas cho STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí & Safety Check
(Màn 1/4: Broadcast Console, Màn 2/4: Alert Modal, Màn 3/4: Safety Check, Màn 4/4: Result Modal)
"""

from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field, ConfigDict


# =========================================================================
# 1. SCHEMAS CHO MÀN 1/4: EMERGENCY BROADCAST CONSOLE
# =========================================================================

class AlertEstimateRequest(BaseModel):
    """Yêu cầu ước tính số người nhận theo tâm ghim và bán kính"""
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Tọa độ Vĩ độ tâm ghim")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Tọa độ Kinh độ tâm ghim")
    radius_meters: float = Field(..., ge=100.0, le=50000.0, description="Bán kính phát sóng (mét)")


class AlertEstimateResponse(BaseModel):
    """Kết quả ước tính người dân trong vùng ảnh hưởng"""
    center_latitude: float
    center_longitude: float
    radius_meters: float
    radius_km: float
    estimated_recipients: int
    message: str


class BroadcastAlertRequest(BaseModel):
    """Soạn thảo và phát lệnh cảnh báo khẩn cấp (Cán bộ quản trị / Ban chỉ huy)"""
    alert_type: str = Field(..., description="Loại cảnh báo: FLOOD, STORM, TIDE, POLLUTION")
    title: str = Field(..., min_length=5, max_length=255, description="Tiêu đề mang tính báo động cao")
    content: str = Field(..., min_length=10, description="Nội dung chi tiết khuyến cáo người dân")
    center_latitude: float = Field(..., ge=-90.0, le=90.0)
    center_longitude: float = Field(..., ge=-180.0, le=180.0)
    radius_meters: float = Field(..., ge=100.0, le=50000.0)
    severity_level: str = Field(default="CRITICAL", description="Mức độ nghiêm trọng: CRITICAL, HIGH, WARNING")


class BroadcastAlertResponse(BaseModel):
    """Kết quả phát lệnh cảnh báo khẩn cấp"""
    success: bool
    alert_id: uuid.UUID
    alert_code: str
    alert_type: str
    title: str
    actual_sent_count: int
    message: str


class BroadcastHistoryItem(BaseModel):
    """Thông tin tóm tắt lệnh cảnh báo trong lịch sử phát sóng"""
    alert_id: uuid.UUID
    alert_code: str
    alert_type: str
    title: str
    content: str
    center_latitude: float
    center_longitude: float
    radius_meters: float
    severity_level: str
    actual_sent_count: int
    status: str
    broadcasted_at: datetime
    version: int

    model_config = ConfigDict(from_attributes=True)


class CancelAlertRequest(BaseModel):
    """Yêu cầu hủy phát lệnh cảnh báo khẩn cấp với Optimistic Locking"""
    version: int = Field(..., description="Phiên bản OCC hiện tại của lệnh cảnh báo")


# =========================================================================
# 2. SCHEMAS CHO MÀN 2/4: EMERGENCY ALERT MODAL (USER VIEW)
# =========================================================================

class UserActiveAlertResponse(BaseModel):
    """Thông tin cảnh báo khẩn cấp đang bao phủ vị trí của người dùng"""
    has_active_alert: bool
    alert_id: Optional[uuid.UUID] = None
    alert_type: Optional[str] = None
    title: Optional[str] = None
    situation_message: Optional[str] = None
    content: Optional[str] = None
    severity_level: Optional[str] = None
    radius_meters: Optional[float] = None
    distance_to_center_meters: Optional[float] = None
    is_safe_marked: Optional[bool] = False
    message: Optional[str] = None


class EmergencySOSRequest(BaseModel):
    """Yêu cầu cứu nạn khẩn cấp (SOS) từ người dùng trong vùng thiên tai"""
    alert_id: Optional[uuid.UUID] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    location_address: str = Field(..., min_length=3, description="Địa chỉ hiện tại của người gặp nạn")
    phone_number: Optional[str] = None
    notes: Optional[str] = None


class EmergencySOSResponse(BaseModel):
    """Phản hồi sau khi tiếp nhận tín hiệu cứu nạn SOS"""
    success: bool
    sos_id: uuid.UUID
    message: str
    hotline: str = "114 / 115"


# =========================================================================
# 3. SCHEMAS CHO MÀN 3/4: COMMUNITY DISASTER SAFETY CHECK
# =========================================================================

class FriendCheckboxItem(BaseModel):
    """Thông tin bạn bè trong danh sách tích chọn báo an toàn"""
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    is_selected: bool = True
    push_notification_enabled: bool = True


class SafetyCheckInitResponse(BaseModel):
    """Dữ liệu ban đầu tải màn hình Safety Check"""
    user_id: uuid.UUID
    latitude: float
    longitude: float
    location_address: str
    is_gps_verified: bool = True
    is_already_safe: bool = False
    friends: List[FriendCheckboxItem]
    message: str


class MarkSafeSelfRequest(BaseModel):
    """Công dân bấm 'Tôi an toàn' tại hồ sơ / Màn 3/4"""
    latitude: float
    longitude: float
    location_address: str
    alert_id: Optional[uuid.UUID] = None
    status_message: Optional[str] = "Tôi an toàn trong đợt thiên tai này."


class MarkSafeSelfResponse(BaseModel):
    """Phản hồi đánh dấu an toàn thành công"""
    success: bool
    check_id: uuid.UUID
    is_safe: bool = True
    message: str


class SendSafetyCheckToFriendsRequest(BaseModel):
    """Gửi thông báo an toàn cho danh sách bạn bè đã chọn"""
    friend_user_ids: List[uuid.UUID] = Field(..., description="Danh sách ID bạn bè nhận thông báo")
    latitude: float
    longitude: float
    location_address: str
    alert_id: Optional[uuid.UUID] = None
    status_message: Optional[str] = "Tôi an toàn trong đợt thiên tai này."


# =========================================================================
# 4. SCHEMAS CHO MÀN 4/4: MODAL POPUP CONFIRMATION
# =========================================================================

class SafetyCheckModalConfirmation(BaseModel):
    """Cấu trúc dữ liệu hiển thị trên Popup hoàn tất báo an toàn"""
    modal_title: str = "ĐÃ BÁO AN TOÀN"
    modal_message: str = "Bạn bè đã nhận thông báo"
    modal_sub_message: str
    modal_note: Optional[str] = None
    close_redirect_url: str = "/feed"


class SendSafetyCheckToFriendsResponse(BaseModel):
    """Kết quả toàn trình phân phối thông báo an toàn"""
    success: bool
    check_id: uuid.UUID
    total_sent: int
    sms_fallback_count: int
    message: str
    modal: SafetyCheckModalConfirmation


class UserLocationPingRequest(BaseModel):
    """Cập nhật vị trí GPS thiết bị người dùng (Background ping)"""
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address_text: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
