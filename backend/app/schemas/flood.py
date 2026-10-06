"""
Pydantic Schemas: Thủy triều, Dự báo ngập úng GloFAS & Báo cáo cộng đồng
Tích hợp toàn diện cả 3 nguồn dữ liệu:
1. Open-Meteo GloFAS & Weather Heatmap
2. Mô hình phân tích sóng triều Phú An & Nhà Bè (Harmonic Tide Engine)
3. Điểm đen ngập lụt, hành lang đường ngập và báo cáo hiện trường từ cộng đồng
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ----------------------------------------
# 1. GeoJSON Hotspots & GloFAS Schemas
# ----------------------------------------

class FloodHotspotProperties(BaseModel):
    id: str
    name: str
    street: str
    district: str
    cause: str  # TRIỀU CƯỜNG, MƯA LỚN, MƯA KẾT HỢP TRIỀU CƯỜNG
    historical_depth_cm: int
    length_m: int
    pump_station: Optional[str] = None
    detour_advice: Optional[str] = None
    source: str = "Cổng Dữ liệu Mở TP.HCM & Sở Xây dựng"

    # Chỉ số động thời gian thực (Smart Weather & GloFAS)
    current_risk_level: str  # SAFE, ALERT, WARNING, CRITICAL
    current_risk_label: str
    current_rainfall_mm: float
    estimated_depth_cm: int
    glofas_discharge_m3s: Optional[float] = None
    segment_color: str = "#0284c7"
    updated_at: str


class FloodPointGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [lng, lat]


class FloodHotspotFeature(BaseModel):
    type: str = "Feature"
    id: str
    geometry: FloodPointGeometry
    properties: FloodHotspotProperties


class FloodSegmentGeometry(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]  # [[lng, lat], [lng, lat], ...]


class FloodSegmentProperties(BaseModel):
    id: str
    spot_id: str
    name: str
    street: str
    district: str
    risk_level: str  # SAFE, ALERT, WARNING, CRITICAL
    risk_label: str
    color: str  # #ef4444, #f97316, #eab308, #0284c7
    glow_color: str
    estimated_depth_cm: int
    historical_depth_cm: int
    length_m: int
    detour_advice: Optional[str] = None


class FloodSummary(BaseModel):
    totalHotspots: int
    safeCount: int
    alertCount: int
    warningCount: int
    criticalCount: int
    currentRainfallMm: float
    saigonRiverDischargeM3s: float
    maxEstimatedDepthCm: int
    statusEvaluation: str


class FloodHotspotsGeoJSONResponse(BaseModel):
    success: bool
    type: str = "FeatureCollection"
    total: int
    summary: FloodSummary
    features: List[FloodHotspotFeature]
    road_segments: List[Any]


class GloFASForecastDay(BaseModel):
    date: str
    discharge: float
    discharge_max: float
    discharge_min: float


class GloFASForecastResponse(BaseModel):
    success: bool
    latitude: float
    longitude: float
    river_name: str
    current_discharge_m3s: float
    flood_danger_level: str
    flood_danger_label: str
    forecast_7d: List[GloFASForecastDay]
    source: str = "Open-Meteo Global Flood API (Copernicus GloFAS)"
    note: str


# ----------------------------------------
# 2. Schemas Thủy Triều (Tide Schemas)
# ----------------------------------------

class TideCurrentResponse(BaseModel):
    station_code: str = Field(..., description="Mã trạm thủy văn (VD: PHU_AN)")
    station_name: str = Field(..., description="Tên trạm quan trắc")
    river_system: str = Field(..., description="Hệ thống sông liên kết")
    water_level_m: float = Field(..., description="Mực nước hiện tại (m)")
    rate_m_per_hour: float = Field(..., description="Tốc độ nước dâng/rút (m/h)")
    state: str = Field(..., description="Trạng thái (RISING, FALLING, HIGH_TIDE, LOW_TIDE)")
    state_label: str = Field(..., description="Mô tả trạng thái tiếng Việt")
    alert_level: str = Field(..., description="Cấp báo động (NORMAL, ALERT_1, ALERT_2, ALERT_3)")
    alert_label: str = Field(..., description="Mô tả cấp báo động tiếng Việt")
    is_flood_risk: bool = Field(..., description="Có nguy cơ ngập do triều cường không")
    timestamp: str = Field(..., description="Thời gian cập nhật (ISO 8601 UTC+7)")


class TideForecastPoint(BaseModel):
    time: str = Field(..., description="Giờ:Phút (HH:MM)")
    datetime: str = Field(..., description="Thời gian đầy đủ ISO 8601")
    water_level_m: float = Field(..., description="Mực nước dự báo (m)")
    state: str = Field(..., description="Trạng thái con nước")
    alert_level: str = Field(..., description="Cấp báo động")


class TideExtremaPoint(BaseModel):
    water_level_m: float
    time: str
    alert_level: str


class TideExtremaInfo(BaseModel):
    next_peak: TideExtremaPoint
    next_trough: TideExtremaPoint


class TideForecastResponse(BaseModel):
    station_code: str
    station_name: str
    hours: int
    interval_minutes: int
    extrema: TideExtremaInfo
    forecast: List[TideForecastPoint]


# ----------------------------------------
# 3. Schemas Điểm Ngập Danh sách (Flood Hotspot Schemas)
# ----------------------------------------

class FloodHotspotItem(BaseModel):
    hotspot_id: int
    hotspot_code: str
    street_name: str
    ward_name: Optional[str] = None
    district_name: Optional[str] = None
    cause_type: str
    latitude: float
    longitude: float
    risk_score: float
    predicted_depth_cm: float
    severity_level: str
    is_impassable_for_bikes: bool
    is_impassable_for_cars: bool
    advisory_notice: str


class FloodHotspotsListResponse(BaseModel):
    success: bool = True
    total_count: int
    conditions: Dict[str, Any]
    hotspots: List[FloodHotspotItem]


# ----------------------------------------
# 4. Schemas Kiểm tra Lộ trình (Route Check Schemas)
# ----------------------------------------

class CheckRouteRequest(BaseModel):
    coordinates: List[List[float]] = Field(
        ...,
        description="Danh sách tọa độ polyline lộ trình [[lng, lat], [lng, lat], ...]",
        min_length=2,
    )
    buffer_meters: Optional[float] = Field(
        default=150.0,
        description="Bán kính quét điểm đen ngập quanh lộ trình (mét)",
        ge=20.0,
        le=1000.0,
    )


class CheckRouteResponse(BaseModel):
    status: str = Field(..., description="CLEAR, CAUTION, hoặc AVOID")
    is_safe: bool = Field(..., description="True nếu lộ trình an toàn")
    current_conditions: Dict[str, float]
    hazard_count: int
    hazards: List[Dict[str, Any]]
    recommendation: str


# ----------------------------------------
# 5. Schemas Báo cáo từ cộng đồng (Crowdsourced Report)
# ----------------------------------------

class CreateFloodReportRequest(BaseModel):
    hotspot_id: Optional[int] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address_description: str = Field(..., min_length=3, max_length=255)
    actual_depth_cm: Optional[float] = Field(default=15.0, ge=0.0, le=200.0)
    can_motorbike_pass: bool = True
    can_car_pass: bool = True
    note: Optional[str] = None
    image_url: Optional[str] = None
