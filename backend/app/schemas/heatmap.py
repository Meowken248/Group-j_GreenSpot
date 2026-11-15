from typing import Optional, List
from pydantic import BaseModel

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
    has_alert: bool
    alert_message: Optional[str] = None
