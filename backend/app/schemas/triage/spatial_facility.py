from datetime import datetime
from typing import List, Optional, Dict
import uuid
from pydantic import BaseModel, Field, ConfigDict, field_validator


class FacilityBufferQueryRequest(BaseModel):
    """Tham số lọc vùng đệm bán kính GIS STT 40 Màn 1/3"""
    incident_id: uuid.UUID
    radius_meters: float = Field(1000.0, description="Bán kính quét (m): 500, 1000, 2000")
    facility_types: List[str] = Field(
        default=["Trường học", "Bệnh viện", "Trạm y tế"],
        description="Danh sách loại cơ sở cần quét"
    )

    @field_validator("facility_types")
    @classmethod
    def validate_types_not_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Vui lòng chọn ít nhất một loại cơ sở thiết yếu")
        return v


class FacilityItemResponse(BaseModel):
    """Mỗi dòng cơ sở thiết yếu trong danh sách Màn 2/3"""
    model_config = ConfigDict(from_attributes=True)

    facility_id: int
    facility_name: str
    facility_type: str
    address: str
    distance_meters: float
    distance_display: str  # VD: "Cách 180m", "Cách 650m"
    is_danger_proximity: bool = Field(False, description="Khoảng cách sát sườn < 200m tô viền đỏ")
    is_immediate_risk: bool = Field(False, description="Khoảng cách < 100m nhấp nháy cảnh báo đỏ")
    contact_phone: Optional[str] = None
    vulnerability_level: str
    latitude: float
    longitude: float


class FacilityListResponse(BaseModel):
    """Danh sách tổng hợp cơ sở và bộ đếm filter Màn 2/3"""
    incident_id: uuid.UUID
    incident_title: str
    incident_lat: float
    incident_lng: float
    radius_meters: float
    total_found: int
    type_counts: Dict[str, int]
    has_critical_nearby: bool = Field(False, description="Cảnh báo: Có trường học/bệnh viện sát điểm ô nhiễm (< 100m)")
    facilities: List[FacilityItemResponse]


class FacilityDetailProfileResponse(BaseModel):
    """Hồ sơ chi tiết mức độ phơi nhiễm môi trường và liên hệ khẩn cấp Màn 3/3"""
    model_config = ConfigDict(from_attributes=True)

    facility_id: int
    facility_name: str
    facility_type: str
    address: str
    contact_phone: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    capacity_people: Optional[int] = None
    vulnerability_level: str
    incident_distance_meters: Optional[float] = None
    incident_distance_display: Optional[str] = None
    directions_url: str  # URL dẫn đường Google Maps hoặc bản đồ nội bộ
    can_call: bool
    can_alert: bool


class SendEmergencyAlertRequest(BaseModel):
    """Yêu cầu gửi tin nhắn cảnh báo môi trường khẩn cấp"""
    incident_id: uuid.UUID
    facility_id: int
    message_text: str = Field(..., max_length=500)


class SendEmergencyAlertResponse(BaseModel):
    """Kết quả gửi tin nhắn cảnh báo"""
    success: bool
    message: str
    facility_id: int
    facility_name: str
    sent_at: datetime
