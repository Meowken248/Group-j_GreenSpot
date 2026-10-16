"""
Pydantic Schemas cho STT 43: Trung tâm điều phối tác nghiệp và phân công lệnh xử lý hiện trường
(Operations Dispatch Center)
"""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class IncidentComboboxItem(BaseModel):
    """Sự cố môi trường sẵn sàng để điều phối lập lệnh (Màn 2/6)"""
    incident_id: uuid.UUID
    incident_code: str
    title: str
    category: str
    urgency: str
    location_address: str
    district: str
    ward: Optional[str] = None
    latitude: float
    longitude: float

    model_config = ConfigDict(from_attributes=True)


class TeamOptionItem(BaseModel):
    """Đội phản ứng cơ động hiện trường (Màn 1, 2, 3)"""
    team_id: str
    team_name: str
    phone: str
    current_status: str  # AVAILABLE, BUSY, EN_ROUTE
    distance_km: float
    distance_label: str  # VD: "Cách hiện trường 1.8km (Đang rảnh)"
    is_busy_with_urgent: bool = False
    latitude: float
    longitude: float

    model_config = ConfigDict(from_attributes=True)


class DispatchOrderItem(BaseModel):
    """Hàng dữ liệu bảng tổng hợp lệnh xử lý hiện trường (Màn 1/6)"""
    order_id: uuid.UUID
    order_code: str
    incident_id: uuid.UUID
    incident_title: str
    incident_type: str
    team_id: str
    team_name: str
    team_phone: str
    status: str  # ASSIGNED, EN_ROUTE, IN_PROGRESS, COMPLETED, CANCELLED
    status_label: str
    status_color: str
    priority: str
    priority_label: str
    deadline: datetime
    assigned_at: datetime
    location_address: str
    district: str
    version: int

    model_config = ConfigDict(from_attributes=True)


class DispatchListFilter(BaseModel):
    """Bộ lọc danh sách lệnh (Màn 1/6)"""
    status: Optional[str] = "ALL"  # ALL, ASSIGNED, EN_ROUTE, IN_PROGRESS, COMPLETED, CANCELLED
    team_id: Optional[str] = "ALL"
    district: Optional[str] = "ALL"


class DispatchListResponse(BaseModel):
    """Kết quả trả về danh sách lệnh điều phối"""
    orders: List[DispatchOrderItem]
    total_count: int
    has_results: bool
    empty_message: Optional[str] = None


class CreateDispatchOrderRequest(BaseModel):
    """Yêu cầu khởi tạo và giao lệnh điều phối mới (Màn 2/6)"""
    incident_id: uuid.UUID = Field(..., description="ID sự cố môi trường cần xử lý")
    team_id: str = Field(..., min_length=1, description="Mã đội phản ứng cơ động được chỉ định")
    priority: str = Field("MEDIUM", description="Mức ưu tiên: LOW, MEDIUM, HIGH, URGENT")
    deadline: datetime = Field(..., description="Thời hạn SLA hoàn thành xử lý sự cố")


class EditDispatchOrderRequest(BaseModel):
    """Yêu cầu điều chỉnh và tái phân bổ lệnh xử lý (Màn 3/6)"""
    team_id: Optional[str] = None
    deadline: Optional[datetime] = None
    adjustment_notes: Optional[str] = None
    version: int = Field(..., description="Phiên bản OCC ngăn chặn xung đột đồng thời")


class CancelDispatchOrderRequest(BaseModel):
    """Yêu cầu thu hồi và huỷ bỏ lệnh điều phối (Màn 4/6)"""
    cancel_reason: str = Field(..., min_length=3, description="Lý do huỷ lệnh giải trình bắt buộc")
    version: int = Field(..., description="Phiên bản OCC")


class CloseDispatchOrderRequest(BaseModel):
    """Yêu cầu nghiệm thu và đóng lệnh hiện trường (Màn 6/6)"""
    version: int
    notes: Optional[str] = None


class StepperStage(BaseModel):
    """Bước tiến trình xử lý hiện trường"""
    key: str  # ASSIGNED, EN_ROUTE, IN_PROGRESS, COMPLETED
    label: str
    is_current: bool
    is_passed: bool
    timestamp: Optional[datetime] = None


class FieldTrackingResponse(BaseModel):
    """Dữ liệu giám sát thực địa theo thời gian thực (Màn 6/6)"""
    order_id: uuid.UUID
    order_code: str
    status: str
    status_label: str
    priority: str
    deadline: datetime

    # Khối Bản đồ
    incident_title: str
    incident_address: str
    incident_lat: float
    incident_lng: float
    incident_radius_meters: float

    team_name: str
    team_phone: str
    team_lat: float
    team_lng: float
    eta_minutes: int
    is_gps_active: bool
    gps_lost_warning: Optional[str] = None

    # Khối Tiến độ
    stepper: List[StepperStage]
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    can_close_order: bool = False
    missing_after_image_warning: Optional[str] = None

    version: int


class DispatchActionResult(BaseModel):
    """Phản hồi chung cho các hành động tác nghiệp (Giao lệnh, Huỷ, Cập nhật, Đóng lệnh)"""
    success: bool
    message: str
    order_code: Optional[str] = None
    order_id: Optional[uuid.UUID] = None
    version: Optional[int] = None
