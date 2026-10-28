from typing import Optional, List
from pydantic import BaseModel, Field

class HeatmapPoint(BaseModel):
    district_code: str
    district_name: str
    lat: float
    lng: float
    value: float
    color_hex: str
    level_label: str
    is_warning: bool = False
    warning_message: Optional[str] = None

class HeatmapLegendItem(BaseModel):
    label: str
    range_text: str
    color_hex: str

class MultiModeHeatmapResponse(BaseModel):
    mode: str # AQI | TEMPERATURE | RISK
    timestamp: str
    total_districts: int
    simulated_hour: Optional[int] = None
    hour_label: Optional[str] = None
    summary_headline: Optional[str] = None
    points: List[HeatmapPoint]
    legends: List[HeatmapLegendItem]

class DistrictZoneDetail(BaseModel):
    district_code: str
    district_name: str
    lat: float
    lng: float
    aqi_value: int
    aqi_level: str
    aqi_color: str
    temperature_c: float
    temperature_level: str
    temperature_color: str
    risk_score: int
    risk_level: str
    risk_color: str
    cleanup_rate: float
    resolved_incidents: int
    green_index: float
    primary_pollutant: Optional[str] = "PM2.5"
    health_advice: Optional[str] = None
    has_alert: bool
    alert_message: Optional[str] = None

class AdminUpdateZoneDetailRequest(BaseModel):
    aqi_value: Optional[int] = Field(None, ge=0, le=500, description="Chỉ số AQI")
    temperature_c: Optional[float] = Field(None, ge=15.0, le=50.0, description="Nhiệt độ °C")
    risk_score: Optional[int] = Field(None, ge=0, le=100, description="Điểm rủi ro ô nhiễm 0-100")
    cleanup_rate: Optional[float] = Field(None, ge=0.0, le=100.0, description="Tỷ lệ giải quyết rác %")
    resolved_incidents: Optional[int] = Field(None, ge=0, description="Số sự cố đã xử lý")
    green_index: Optional[float] = Field(None, ge=0.0, le=100.0, description="Chỉ số xanh")
    primary_pollutant: Optional[str] = Field(None, description="Chất gây ô nhiễm chính: PM2.5, NO2, O3, CO")
    health_advice: Optional[str] = Field(None, description="Khuyến cáo sức khỏe y tế / WHO")
