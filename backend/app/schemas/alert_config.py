import uuid
from typing import List, Optional
from pydantic import BaseModel, Field


class ThresholdRuleItem(BaseModel):
    severity_level: str = Field(..., description="Cấp độ cảnh báo: YELLOW, ORANGE, RED")
    severity_name: str = Field(..., description="Tên cấp độ (Chú ý, Nguy cơ, Khẩn cấp)")
    radius_km: float = Field(..., description="Bán kính cảnh báo (km), giới hạn 0.5km - 10.0km")
    default_safety_advice: str = Field(..., description="Mẫu khuyến cáo y tế phòng hộ an toàn cho dân")
    color_hex: str = Field(default="#EAB308")
    min_aqi_threshold: Optional[int] = Field(default=None, description="Ngưỡng chỉ số AQI kích hoạt")
    description: Optional[str] = Field(default="")


class AlertConfigResponse(BaseModel):
    rules: List[ThresholdRuleItem]
    default_radius_km: float = 2.0
    hotline_number: str = "1800-1090"
    updated_at: Optional[str] = None
    note: str = "Quy chuẩn cảnh báo theo quy định của Bộ Tài nguyên & Môi trường"


class UpdateThresholdsRequest(BaseModel):
    rules: List[ThresholdRuleItem]
    hotline_number: Optional[str] = "1800-1090"
