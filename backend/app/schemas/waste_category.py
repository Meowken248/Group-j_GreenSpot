from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class WasteCategoryItem(BaseModel):
    category_id: int
    category_code: str
    name: str
    description: Optional[str] = None
    default_severity: str
    sla_hours: int
    sla_warning_hours: int
    color_hex: str
    icon_name: str
    is_active: bool
    unresolved_incidents_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WasteCategoryListResponse(BaseModel):
    items: List[WasteCategoryItem]
    total: int
    page: int
    limit: int
    total_pages: int
    active_count: int
    inactive_count: int


class WasteCategoryCreateRequest(BaseModel):
    category_code: str = Field(..., max_length=20, description="Mã danh mục, tối đa 20 ký tự (chữ hoa, số, gạch dưới)")
    name: str = Field(..., max_length=100, description="Tên loại rác, tối đa 100 ký tự")
    description: Optional[str] = Field(None, max_length=500, description="Mô tả loại rác, tối đa 500 ký tự")
    default_severity: str = Field("MEDIUM", description="Mức ưu tiên: LOW, MEDIUM, HIGH, CRITICAL")
    sla_hours: int = Field(..., ge=1, le=720, description="Thời hạn SLA (1 - 720 giờ)")
    sla_warning_hours: int = Field(..., ge=0, description="Cảnh báo trước hạn SLA (giờ)")
    color_hex: Optional[str] = Field("#22C55E", max_length=10)
    icon_name: Optional[str] = Field("trash-2", max_length=50)

    @field_validator("category_code")
    @classmethod
    def validate_category_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Vui lòng nhập mã danh mục")
        if len(v) > 20:
            raise ValueError("Mã chỉ gồm chữ hoa, số, dấu gạch dưới (tối đa 20 ký tự)")
        import re
        if not re.match(r"^[A-Z0-9_]+$", v):
            raise ValueError("Mã chỉ gồm chữ hoa, số, dấu gạch dưới (tối đa 20 ký tự)")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Vui lòng nhập tên loại rác")
        if len(v) > 100:
            raise ValueError("Tên tối đa 100 ký tự")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 500:
            raise ValueError("Mô tả tối đa 500 ký tự")
        return v

    @field_validator("sla_hours")
    @classmethod
    def validate_sla_hours(cls, v: int) -> int:
        if v < 1 or v > 720:
            raise ValueError("Thời hạn SLA phải là số nguyên từ 1 đến 720 giờ")
        return v

    @field_validator("sla_warning_hours")
    @classmethod
    def validate_warning_hours(cls, v: int, info) -> int:
        sla = info.data.get("sla_hours")
        if sla is not None and v >= sla:
            raise ValueError("Thời gian cảnh báo phải nhỏ hơn thời hạn SLA")
        return v

    @field_validator("default_severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        valid_severities = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        v = v.upper()
        if v not in valid_severities:
            raise ValueError("Vui lòng chọn mức ưu tiên hợp lệ (LOW, MEDIUM, HIGH, CRITICAL)")
        return v


class WasteCategoryUpdateRequest(BaseModel):
    name: str = Field(..., max_length=100, description="Tên loại rác, tối đa 100 ký tự")
    description: Optional[str] = Field(None, max_length=500, description="Mô tả loại rác, tối đa 500 ký tự")
    default_severity: str = Field("MEDIUM", description="Mức ưu tiên: LOW, MEDIUM, HIGH, CRITICAL")
    sla_hours: int = Field(..., ge=1, le=720, description="Thời hạn SLA (1 - 720 giờ)")
    sla_warning_hours: int = Field(..., ge=0, description="Cảnh báo trước hạn SLA (giờ)")
    is_active: bool = Field(True, description="Trạng thái áp dụng")
    color_hex: Optional[str] = Field(None, max_length=10)
    icon_name: Optional[str] = Field(None, max_length=50)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Vui lòng nhập tên loại rác")
        if len(v) > 100:
            raise ValueError("Tên tối đa 100 ký tự")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 500:
            raise ValueError("Mô tả tối đa 500 ký tự")
        return v

    @field_validator("sla_hours")
    @classmethod
    def validate_sla_hours(cls, v: int) -> int:
        if v < 1 or v > 720:
            raise ValueError("Thời hạn SLA phải là số nguyên từ 1 đến 720 giờ")
        return v

    @field_validator("sla_warning_hours")
    @classmethod
    def validate_warning_hours(cls, v: int, info) -> int:
        sla = info.data.get("sla_hours")
        if sla is not None and v >= sla:
            raise ValueError("Thời gian cảnh báo phải nhỏ hơn thời hạn SLA")
        return v

    @field_validator("default_severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        valid_severities = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        v = v.upper()
        if v not in valid_severities:
            raise ValueError("Vui lòng chọn mức ưu tiên hợp lệ (LOW, MEDIUM, HIGH, CRITICAL)")
        return v


class ValidationCheckResponse(BaseModel):
    is_valid: bool
    message: Optional[str] = None
