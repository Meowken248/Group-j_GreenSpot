import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# SCHEMAS CHO CHỨC NĂNG 28: QUẢN LÝ VÒNG ĐỜI BẢN TIN CẢNH BÁO Ô NHIỄM
# ==============================================================================

class AlertCreateRequest(BaseModel):
    title: str = Field(..., max_length=255, description="Tiêu đề bản tin cảnh báo")
    category: str = Field("AIR", description="Phân loại: AIR, WATER, WASTE, HAZARDOUS")
    severity_level: str = Field("YELLOW", description="Mức độ: YELLOW (Cấp 1), ORANGE (Cấp 2), RED (Cấp 3)")
    affected_districts: Optional[List[str]] = Field(default=[], description="Danh sách Quận/Huyện hoặc Phường chịu ảnh hưởng")
    description: str = Field(..., description="Mô tả hiện trạng và nguyên nhân sự cố")
    safety_advice: str = Field(..., description="Khuyến cáo phòng hộ an toàn cho nhân dân")
    template_code: Optional[str] = Field(None, description="Mã bản tin mẫu nếu sử dụng")
    expires_at: Optional[datetime] = Field(None, description="Thời hạn cảnh báo tự động hết hiệu lực")
    publish_now: bool = Field(False, description="True nếu muốn phát hành ngay lập tức, False để lưu nháp")


class AlertUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    category: Optional[str] = None
    severity_level: Optional[str] = None
    affected_districts: Optional[List[str]] = None
    description: Optional[str] = None
    safety_advice: Optional[str] = None
    expires_at: Optional[datetime] = None
    amendment_note: Optional[str] = Field(None, description="Ghi chú đính chính nếu cập nhật bản tin đã phát hành")


class AlertResolveRequest(BaseModel):
    resolved_note: str = Field(..., min_length=5, description="Thông điệp công bố kết thúc cảnh báo / an toàn cho nhân dân")


class AlertRevokeRequest(BaseModel):
    revoke_reason: str = Field(..., min_length=5, description="Lý do thu hồi bản tin cảnh báo")


class AlertResponse(BaseModel):
    alert_id: uuid.UUID
    alert_code: str
    title: str
    category: str
    severity_level: str
    status: str
    affected_districts: List[str] = []
    description: str
    safety_advice: str
    template_code: Optional[str] = None
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolved_note: Optional[str] = None
    revoked_at: Optional[datetime] = None
    revoke_reason: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    active_count: int
    draft_count: int
    resolved_count: int
    revoked_count: int


class AlertTemplate(BaseModel):
    code: str
    title: str
    category: str
    severity_level: str
    default_description: str
    default_safety_advice: str


# ==============================================================================
# SCHEMAS CHO CHỨC NĂNG 29: ĐIỀU PHỐI THÔNG BÁO ĐẨY THỜI GIAN THỰC
# ==============================================================================

class NotificationResponse(BaseModel):
    notification_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    alert_id: Optional[uuid.UUID] = None
    incident_id: Optional[uuid.UUID] = None
    notification_type: str
    severity: str
    title: str
    message: str
    target_url: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    unread_count: int
    total: int


class NotificationMarkReadRequest(BaseModel):
    notification_ids: Optional[List[uuid.UUID]] = Field(default=None, description="Danh sách ID cần đọc, nếu None thì đánh dấu tất cả")


class PushStatsResponse(BaseModel):
    total_notifications_sent: int
    unread_count: int
    read_count: int
    open_rate_percentage: float


# ==============================================================================
# SCHEMAS CHO CHỨC NĂNG 30: CỔNG TRA CỨU CÔNG KHAI TIẾN ĐỘ SỰ CỐ
# ==============================================================================

class TimelineStep(BaseModel):
    step_key: str
    title: str
    is_completed: bool
    is_current: bool
    timestamp: Optional[datetime] = None
    description: str


class PublicIncidentDetailResponse(BaseModel):
    incident_id: uuid.UUID
    tracking_code: str
    title: str
    description: str
    category_name: str
    category_code: str
    severity: str
    status: str
    address_text: str
    latitude: float
    longitude: float
    reported_at: datetime
    sla_deadline: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    is_sla_met: Optional[bool] = None
    reporter_phone_masked: Optional[str] = None
    before_images: List[str] = []
    after_images: List[str] = []
    timeline: List[TimelineStep] = []
    official_feedback: Optional[str] = None
    verification_stats: dict = {"clean_count": 0, "dirty_count": 0}


class PublicSubscribeRequest(BaseModel):
    tracking_code: str = Field(..., description="Mã tra cứu sự cố")
    contact_type: str = Field("EMAIL", description="Loại liên hệ: EMAIL hoặc PHONE")
    contact_value: str = Field(..., min_length=5, description="Địa chỉ email hoặc số điện thoại")


class PublicVerificationRequest(BaseModel):
    tracking_code: str = Field(..., description="Mã tra cứu sự cố")
    is_clean_confirmed: bool = Field(..., description="True nếu đã sạch, False nếu vẫn còn rác")
    comment: Optional[str] = Field(None, max_length=500, description="Ý kiến kiểm chứng của người dân tại hiện trường")
