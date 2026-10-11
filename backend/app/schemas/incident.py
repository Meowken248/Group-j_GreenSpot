import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class WasteCategoryResponse(BaseModel):
    category_id: int
    category_code: str
    name: str
    description: Optional[str] = None
    default_severity: str = "MEDIUM"
    sla_hours: int = 48
    color_hex: str = "#22C55E"
    icon_name: str = "trash-2"
    is_active: bool = True

    class Config:
        from_attributes = True


class MediaUploadResponse(BaseModel):
    media_id: str
    file_url: str
    thumbnail_url: str
    media_type: str  # IMAGE / VIDEO
    file_size_bytes: int
    mime_type: str
    watermark_applied: bool = True
    watermark_text: Optional[str] = None


class IncidentMediaItem(BaseModel):
    file_url: str
    thumbnail_url: Optional[str] = None
    media_type: str = "IMAGE"
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None


class IncidentCreateRequest(BaseModel):
    category_id: int = Field(..., description="ID danh mục sự cố")
    title: str = Field(..., min_length=1, max_length=100, description="Tiêu đề sự cố tối đa 100 ký tự")
    description: str = Field(..., min_length=1, max_length=500, description="Mô tả sự cố tối đa 500 ký tự")
    severity: str = Field(default="MEDIUM", description="Mức khẩn cấp: LOW, MEDIUM, HIGH, CRITICAL")
    latitude: float = Field(..., ge=-90, le=90, description="Vĩ độ GPS")
    longitude: float = Field(..., ge=-180, le=180, description="Kinh độ GPS")
    address_text: str = Field(..., min_length=1, max_length=500, description="Địa chỉ giải mã từ GPS")
    media: List[IncidentMediaItem] = Field(default_factory=list, description="Danh sách tệp bằng chứng đính kèm (tối đa 5)")
    is_anonymous: bool = Field(default=False, description="Báo cáo ẩn danh")
    reporter_phone: Optional[str] = Field(default=None, description="Số điện thoại người báo cáo")


class IncidentCreateResponse(BaseModel):
    incident_id: str
    tracking_code: str
    title: str
    category_name: str
    category_code: str
    sla_hours: int
    sla_deadline: Optional[datetime]
    status: str
    address_text: str
    latitude: float
    longitude: float
    unit_name: Optional[str] = None
    green_points_awarded: int = 20
    created_at: datetime
    message: str


class DuplicateIncidentItem(BaseModel):
    incident_id: str
    tracking_code: str
    title: str
    category_name: str
    address_text: str
    latitude: float
    longitude: float
    distance_meters: float
    created_at: datetime
    status: str


class DuplicateCheckRequest(BaseModel):
    latitude: float
    longitude: float
    category_id: Optional[int] = None
    radius_meters: float = 100.0


class DuplicateCheckResponse(BaseModel):
    has_duplicate: bool
    duplicate_count: int
    duplicates: List[DuplicateIncidentItem] = []


class IncidentDetailResponse(BaseModel):
    incident_id: str
    tracking_code: str
    title: str
    description: str
    severity: str
    status: str
    address_text: str
    latitude: float
    longitude: float
    category: WasteCategoryResponse
    unit_id: Optional[int] = None
    unit_name: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    sla_hours: int = 48
    created_at: datetime
    media: List[IncidentMediaItem] = []
    upvotes_count: int = 0
    is_anonymous: bool = False
    reporter_phone_masked: Optional[str] = None


class IncidentListItem(BaseModel):
    incident_id: str
    tracking_code: str
    title: str
    description: str
    severity: str
    status: str
    address_text: str
    latitude: float
    longitude: float
    category_id: int
    category_name: str
    unit_id: Optional[int] = None
    unit_name: Optional[str] = None
    is_anonymous: bool = False
    reporter_name: Optional[str] = None
    reporter_phone_masked: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    is_sla_overdue: bool = False
    created_at: datetime
    thumbnail_url: Optional[str] = None
    media: List[IncidentMediaItem] = []


class IncidentManagementSummaryStats(BaseModel):
    total: int = 0
    unverified: int = 0
    in_progress: int = 0
    resolved: int = 0
    rejected: int = 0
    critical: int = 0
    sla_warning: int = 0


class IncidentListResponse(BaseModel):
    items: List[IncidentListItem] = []
    total: int = 0
    page: int = 1
    limit: int = 20
    stats: IncidentManagementSummaryStats


class IncidentVerifyRequest(BaseModel):
    action: str = Field(..., description="Hành động kiểm chứng: VERIFY (Xác nhận) hoặc REJECT (Từ chối)")
    note: Optional[str] = Field(None, description="Ghi chú kiểm duyệt hoặc lý do từ chối")


class IncidentStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Trạng thái mới: PENDING, IN_PROGRESS, RESOLVED, CLOSED, REJECTED")
    note: Optional[str] = Field(None, description="Ghi chú điều phối hoặc hoàn thành")

