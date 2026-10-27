from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class RecyclingFacilityItem(BaseModel):
    facility_id: int
    facility_code: str
    name: str
    address: str
    unit_id: Optional[int] = None
    district_name: Optional[str] = None
    unit_name: Optional[str] = None
    latitude: float
    longitude: float
    accepted_waste_types: List[str]
    operating_hours: Optional[str] = None
    open_time: Optional[str] = "07:30"
    close_time: Optional[str] = "17:00"
    qr_code: Optional[str] = None
    contact_phone: Optional[str] = None
    managing_org: Optional[str] = None
    is_active: bool
    version: int = 1
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RecyclingFacilityCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Tên trạm tái chế")
    address: str = Field(..., min_length=1, max_length=200, description="Địa chỉ trạm")
    unit_id: int = Field(..., description="ID quận/huyện thuộc TP.HCM")
    latitude: float = Field(..., ge=-90, le=90, description="Vĩ độ WGS84")
    longitude: float = Field(..., ge=-180, le=180, description="Kinh độ WGS84")
    accepted_waste_types: List[str] = Field(..., min_length=1, description="Các loại rác tiếp nhận")
    open_time: str = Field(..., description="Giờ mở cửa (HH:MM)")
    close_time: str = Field(..., description="Giờ đóng cửa (HH:MM)")
    contact_phone: Optional[str] = Field(None, max_length=20)
    managing_org: Optional[str] = Field(None, max_length=150)

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Vui lòng nhập tên trạm")
        if len(clean) > 100:
            raise ValueError("Tên tối đa 100 ký tự")
        return clean

    @field_validator("address")
    def validate_address(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Vui lòng nhập địa chỉ")
        if len(clean) > 200:
            raise ValueError("Địa chỉ tối đa 200 ký tự")
        return clean

    @field_validator("accepted_waste_types")
    def validate_waste_types(cls, v: List[str]) -> List[str]:
        if not v or len(v) == 0:
            raise ValueError("Vui lòng chọn ít nhất 1 loại rác")
        return v

    @field_validator("close_time")
    def validate_operating_times(cls, v: str, values) -> str:
        open_t = values.data.get("open_time")
        if open_t and v <= open_t:
            raise ValueError("Giờ đóng cửa phải sau giờ mở cửa")
        return v


class RecyclingFacilityUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    address: str = Field(..., min_length=1, max_length=200)
    unit_id: int
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accepted_waste_types: List[str] = Field(..., min_length=1)
    open_time: str
    close_time: str
    is_active: bool
    version: Optional[int] = None
    contact_phone: Optional[str] = Field(None, max_length=20)
    managing_org: Optional[str] = Field(None, max_length=150)

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Vui lòng nhập tên trạm")
        if len(clean) > 100:
            raise ValueError("Tên tối đa 100 ký tự")
        return clean

    @field_validator("address")
    def validate_address(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Vui lòng nhập địa chỉ")
        if len(clean) > 200:
            raise ValueError("Địa chỉ tối đa 200 ký tự")
        return clean

    @field_validator("accepted_waste_types")
    def validate_waste_types(cls, v: List[str]) -> List[str]:
        if not v or len(v) == 0:
            raise ValueError("Vui lòng chọn ít nhất 1 loại rác")
        return v

    @field_validator("close_time")
    def validate_operating_times(cls, v: str, values) -> str:
        open_t = values.data.get("open_time")
        if open_t and v <= open_t:
            raise ValueError("Giờ đóng cửa phải sau giờ mở cửa")
        return v


class RecyclingFacilityListResponse(BaseModel):
    items: List[RecyclingFacilityItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    active_count: int
    inactive_count: int


class FacilityValidationCheckResponse(BaseModel):
    is_valid: bool
    message: Optional[str] = None
    conflict_facility_name: Optional[str] = None

