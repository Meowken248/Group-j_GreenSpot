"""
API Router: Thủy triều, Dự báo Ngập lụt & Kiểm tra Lộ trình An toàn
Phục vụ WebGIS Frontend và Ứng dụng Di động EcoReport / GreenSpot.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.models.flood import FloodCommunityReport, FloodSeverityLevel
from app.schemas.flood import (
    CheckRouteRequest,
    CheckRouteResponse,
    CreateFloodReportRequest,
    FloodHotspotsListResponse,
    TideCurrentResponse,
    TideForecastResponse,
)
from app.services.flood_engine import flood_engine
from app.services.tide_service import tide_engine
from app.services.weather_service import weather_service

router = APIRouter(prefix="/flood", tags=["Flood Prediction & Tide Engine"])


# ------------------------------------------------------------------
# 1. API THỦY TRIỀU (TIDE APIS)
# ------------------------------------------------------------------

@router.get(
    "/tide/current",
    response_model=TideCurrentResponse,
    summary="Lấy trạng thái & mực nước thủy triều hiện tại của TP.HCM",
)
async def get_current_tide(
    station_code: str = Query("PHU_AN", description="Mã trạm quan trắc: PHU_AN hoặc NHA_BE"),
):
    """
    Tính toán mực nước và cấp báo động triều cường thời gian thực bằng thuật toán giải tích sóng Harmonic Engine.
    - **PHU_AN**: Trạm Thủy văn Phú An (Sông Sài Gòn)
    - **NHA_BE**: Trạm Thủy văn Nhà Bè (Sông Đồng Điền)
    """
    data = tide_engine.get_current_tide(station_code.upper())
    return data


@router.get(
    "/tide/forecast",
    response_model=TideForecastResponse,
    summary="Dự báo mực nước triều cường theo chuỗi thời gian (24h - 48h)",
)
async def get_tide_forecast(
    station_code: str = Query("PHU_AN", description="Mã trạm quan trắc"),
    hours: int = Query(24, ge=6, le=72, description="Khoảng thời gian dự báo (giờ)"),
    interval_minutes: int = Query(60, ge=15, le=180, description="Bước nhảy thời gian (phút)"),
):
    """
    Cung cấp chuỗi điểm dữ liệu con nước lên/xuống liên tục để Frontend vẽ đồ thị biểu diễn sóng triều.
    Kèm theo thời điểm và mực nước của đỉnh triều (High Tide) và chân triều (Low Tide) gần nhất.
    """
    code = station_code.upper()
    forecast_points = tide_engine.get_tide_forecast(
        hours=hours,
        interval_minutes=interval_minutes,
        station_code=code,
    )
    extrema = tide_engine.find_upcoming_extrema(window_hours=hours, station_code=code)
    station_info = tide_engine.get_current_tide(code)

    return {
        "station_code": code,
        "station_name": station_info["station_name"],
        "hours": hours,
        "interval_minutes": interval_minutes,
        "extrema": extrema,
        "forecast": forecast_points,
    }


# ------------------------------------------------------------------
# 2. API ĐIỂM ĐEN NGẬP ÚNG (FLOOD HOTSPOTS APIS)
# ------------------------------------------------------------------

@router.get(
    "/hotspots",
    response_model=FloodHotspotsListResponse,
    summary="Danh sách các điểm đen ngập lụt kèm điểm số rủi ro động realtime",
)
async def get_flood_hotspots(
    db: AsyncSession = Depends(get_db),
    tide_level_override: Optional[float] = Query(None, description="Mô phỏng mực nước triều (m)"),
    rainfall_override: Optional[float] = Query(None, description="Mô phỏng lượng mưa (mm/h)"),
):
    """
    Trả về toàn bộ các điểm đen ngập lụt tại TP.HCM (tọa độ GPS, cấp độ ngập, độ sâu ước tính, cảnh báo).
    Thuật toán kết hợp tự động giữa:
    - Mực nước triều hiện tại của trạm Phú An
    - Lượng mưa realtime đo được từ Open-Meteo
    - Ngưỡng chịu tải và cao độ của từng tuyến đường
    """
    evaluations = await flood_engine.evaluate_all_hotspots(
        db=db,
        tide_level_override=tide_level_override,
        rainfall_override=rainfall_override,
    )

    curr_tide = tide_engine.get_current_tide("PHU_AN")
    curr_weather = await weather_service.get_hcm_rainfall()

    return {
        "success": True,
        "total_count": len(evaluations),
        "conditions": {
            "tide_water_level_m": tide_level_override if tide_level_override is not None else curr_tide["water_level_m"],
            "tide_state": curr_tide["state"],
            "rainfall_mmh": rainfall_override if rainfall_override is not None else curr_weather.get("rainfall_current_mmh", 0.0),
            "is_raining": curr_weather.get("is_raining", False),
        },
        "hotspots": evaluations,
    }


# ------------------------------------------------------------------
# 3. API KIỂM TRA LỘ TRÌNH (NAVIGATION & REROUTING APIS)
# ------------------------------------------------------------------

@router.post(
    "/check-route",
    response_model=CheckRouteResponse,
    summary="Kiểm tra lộ trình di chuyển xem có đi qua điểm ngập lụt nguy hiểm không",
)
async def check_route_for_flooding(
    payload: CheckRouteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Client gửi mảng tọa độ Polyline `[[lng, lat], [lng, lat], ...]`.
    Backend dùng PostGIS `ST_DWithin` phát hiện các điểm ngập nguy hiểm lân cận lộ trình.
    - Nếu có điểm ngập sâu (SEVERE / IMPASSABLE) $\rightarrow$ Đề xuất `AVOID` và né cung đường.
    - Nếu khô ráo $\rightarrow$ Trả về `CLEAR`.
    """
    result = await flood_engine.check_route_for_flood_hazards(
        db=db,
        coordinates=payload.coordinates,
        buffer_meters=payload.buffer_meters or 150.0,
    )
    return result


# ------------------------------------------------------------------
# 4. API BÁO CÁO NGẬP TỪ CỘNG ĐỒNG (CROWDSOURCED FLOOD REPORT)
# ------------------------------------------------------------------

@router.post(
    "/report",
    summary="Người dân gửi báo cáo điểm ngập thực tế trên đường",
    status_code=status.HTTP_201_CREATED,
)
async def submit_flood_report(
    payload: CreateFloodReportRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Người đi đường bấm 1 chạm báo cáo vị trí đang bị ngập nước.
    Dữ liệu này được lưu để xác thực chéo và cảnh báo các phương tiện khác.
    """
    severity = FloodSeverityLevel.MINOR
    if payload.actual_depth_cm:
        if payload.actual_depth_cm >= 40.0:
            severity = FloodSeverityLevel.IMPASSABLE
        elif payload.actual_depth_cm >= 25.0:
            severity = FloodSeverityLevel.SEVERE
        elif payload.actual_depth_cm >= 15.0:
            severity = FloodSeverityLevel.MODERATE

    expires_at = datetime.now(timezone.utc) + timedelta(hours=3)

    insert_query = text("""
        INSERT INTO flood_community_reports (
            report_id, hotspot_id, location, address_description,
            actual_depth_cm, severity_level, can_motorbike_pass,
            can_car_pass, note, image_url, upvotes, downvotes, is_verified, expires_at
        )
        VALUES (
            :report_id, :hotspot_id,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
            :address, :depth, :severity, :can_bike, :can_car,
            :note, :image_url, 1, 0, FALSE, :expires_at
        )
        RETURNING report_id;
    """)

    report_id = uuid.uuid4()
    await db.execute(insert_query, {
        "report_id": report_id,
        "hotspot_id": payload.hotspot_id,
        "lng": payload.longitude,
        "lat": payload.latitude,
        "address": payload.address_description,
        "depth": payload.actual_depth_cm,
        "severity": severity.value,
        "can_bike": payload.can_motorbike_pass,
        "can_car": payload.can_car_pass,
        "note": payload.note,
        "image_url": payload.image_url,
        "expires_at": expires_at,
    })
    await db.commit()

    return {
        "success": True,
        "message": "Cảm ơn bạn đã gửi báo cáo ngập lụt! Dữ liệu đã được ghi nhận vào bản đồ thời gian thực.",
        "report_id": str(report_id),
    }
