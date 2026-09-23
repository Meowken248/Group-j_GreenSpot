from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field


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


class FloodRoadSegmentFeature(BaseModel):
    type: str = "Feature"
    id: str
    geometry: FloodSegmentGeometry
    properties: FloodSegmentProperties


class FloodHotspotsGeoJSONResponse(BaseModel):
    success: bool
    type: str = "FeatureCollection"
    total: int
    summary: Dict[str, Any]
    features: List[FloodHotspotFeature]
    road_segments: List[FloodRoadSegmentFeature] = []


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
