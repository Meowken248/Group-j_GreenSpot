"""
Pydantic Schemas for Flood-Aware Navigation Routing (STT 41).
Includes strict typing, vehicle thresholds, hazard representations, and turn-by-turn steps.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VehicleType(str, Enum):
    MOTORBIKE = "MOTORBIKE"          # Xe máy (ngưỡng 25cm)
    CAR = "CAR"                      # Ô tô (ngưỡng 35cm)
    BICYCLE = "BICYCLE"              # Xe đạp (ngưỡng 15cm)
    WASTE_TRUCK = "WASTE_TRUCK"      # Xe ép rác chuyên dụng (ngưỡng 55cm)


# Ngưỡng chịu ngập tiêu chuẩn theo phương tiện (cm)
VEHICLE_FLOOD_THRESHOLDS: Dict[VehicleType, float] = {
    VehicleType.BICYCLE: 15.0,
    VehicleType.MOTORBIKE: 25.0,
    VehicleType.CAR: 35.0,
    VehicleType.WASTE_TRUCK: 55.0,
}


class GeoPoint(BaseModel):
    name: str = Field(..., description="Tên địa danh hoặc địa chỉ hiển thị")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class FloodHazardInfo(BaseModel):
    hazard_id: str = Field(..., description="Mã định danh điểm ngập")
    street_name: str = Field(..., description="Tên tuyến đường bị ngập")
    latitude: float
    longitude: float
    predicted_depth_cm: float = Field(..., description="Độ sâu ngập ước tính (cm)")
    water_level_display: str = Field(..., description="Mô tả mức nước và cảnh báo")
    severity_level: str = Field(..., description="Mức độ nghiêm trọng: MINOR, MODERATE, SEVERE, IMPASSABLE")
    distance_from_origin_meters: Optional[float] = None
    is_blocker_for_vehicle: bool = Field(False, description="Có vượt ngưỡng chịu tải của phương tiện không")


class TurnStep(BaseModel):
    step_number: int
    instruction: str = Field(..., description="Chỉ dẫn rẽ hoặc đi thẳng chi tiết")
    distance_meters: float
    duration_seconds: int
    street_name: str
    maneuver: str = Field("straight", description="straight, turn-left, turn-right, arrive, depart")
    avoid_reason: Optional[str] = Field(None, description="Lý do bẻ lái né điểm ngập (nếu có)")


class RouteOption(BaseModel):
    route_id: str
    route_type: str = Field(..., description="FASTEST hoặc SAFEST")
    duration_minutes: int
    distance_km: float
    duration_formatted: str = Field(..., description="vd: '25 phút | 7.2 km'")
    hazard_count: int
    max_depth_cm: float
    status: str = Field("CLEAR", description="CLEAR, CAUTION, AVOID, IMPASSABLE")
    coordinates: List[List[float]] = Field(..., description="Danh sách [lng, lat]")
    turn_steps: List[TurnStep] = Field(default_factory=list)
    hazards_on_route: List[FloodHazardInfo] = Field(default_factory=list)
    avoided_hazards: List[FloodHazardInfo] = Field(default_factory=list)


class CalculateRouteRequest(BaseModel):
    origin: GeoPoint
    destination: GeoPoint
    vehicle_type: VehicleType = Field(VehicleType.MOTORBIKE, description="Loại phương tiện di chuyển")


class NavigationPlanResponse(BaseModel):
    origin: GeoPoint
    destination: GeoPoint
    vehicle_type: VehicleType
    vehicle_threshold_cm: float
    fastest_route: RouteOption
    safest_route: RouteOption
    all_clear: bool = Field(False, description="Tất cả các tuyến đều an toàn, không có ngập")
    all_flooded: bool = Field(False, description="Cảnh báo: Toàn bộ lộ trình đều có điểm ngập sâu")
    summary_message: Optional[str] = None
    advisory_recommendation: Optional[str] = None


class RerouteRequest(BaseModel):
    current_location: GeoPoint
    destination: GeoPoint
    vehicle_type: VehicleType = Field(VehicleType.MOTORBIKE)
    avoid_hazard_id: Optional[str] = None


class EarlyWarningCheckRequest(BaseModel):
    current_latitude: float
    current_longitude: float
    heading: Optional[float] = None
    route_coordinates: List[List[float]] = Field(..., description="Mảng [lng, lat] của tuyến đang đi")
    vehicle_type: VehicleType = Field(VehicleType.MOTORBIKE)


class EarlyWarningResponse(BaseModel):
    has_hazard_ahead: bool = Field(False)
    hazard: Optional[FloodHazardInfo] = None
    distance_ahead_meters: Optional[float] = None
    alert_title: str = "CẢNH BÁO NGẬP"
    alert_message: Optional[str] = None
    water_level_display: Optional[str] = None
    voice_announcement: Optional[str] = None
    suggested_reroute_available: bool = True
