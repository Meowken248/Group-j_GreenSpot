"""
API Router: Thủy triều (Tide Engine), Dự báo Ngập lụt (GloFAS + Open-Meteo),
Bản đồ GeoJSON Điểm đen ngập lụt, Kiểm tra Lộ trình An toàn & Báo cáo Cộng đồng.
Phục vụ WebGIS Frontend và Ứng dụng Di động EcoReport / GreenSpot.
"""

from __future__ import annotations

import json
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.flood import FloodCommunityReport, FloodSeverityLevel
from app.schemas.flood import (
    CheckRouteRequest,
    CheckRouteResponse,
    CreateFloodReportRequest,
    FloodHotspotsGeoJSONResponse,
    FloodHotspotsListResponse,
    GloFASForecastResponse,
    TideCurrentResponse,
    TideForecastResponse,
)
from app.services.flood_engine import flood_engine
from app.services.flood_service import FloodService
from app.services.tide_service import tide_engine
from app.services.weather_service import weather_service

router = APIRouter(prefix="/flood", tags=["Smart Flood Watch & Tide Engine"])


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
# 2. API ĐIỂM ĐEN NGẬP LỤT (FLOOD HOTSPOTS - GEOJSON & LIST)
# ------------------------------------------------------------------

@router.get(
    "/hotspots",
    response_model=FloodHotspotsGeoJSONResponse,
    summary="Bản đồ GeoJSON điểm đen ngập úng & đoạn đường ngập (Tích hợp 3 nguồn)",
)
async def get_flood_hotspots_geojson(
    rain_mm: Optional[float] = Query(None, description="Lượng mưa giả định (mm/h) để kiểm thử mô phỏng cảnh báo ngập"),
):
    """
    API trả về GeoJSON FeatureCollection các điểm đen ngập lụt tại TP.HCM:
    - NGUỒN 1: Open-Meteo Global Flood API (Lưu lượng GloFAS m³/s).
    - NGUỒN 2: Dữ liệu Cổng Mở TP.HCM (Sở Xây dựng & UDC) - 30+ điểm ngập, độ sâu chuẩn, trạm bơm.
    - NGUỒN 3: Cảnh báo Thời tiết Thông minh - Đánh giá độ sâu ngập thực tế & cấp độ nguy cơ.
    """
    return await FloodService.get_flood_hotspots_geojson(force_rain_mm=rain_mm)


@router.get(
    "/hotspots/list",
    response_model=FloodHotspotsListResponse,
    summary="Danh sách các điểm đen ngập lụt kèm điểm số rủi ro động realtime từ CSDL",
)
async def get_flood_hotspots_list(
    db: AsyncSession = Depends(get_db),
    tide_level_override: Optional[float] = Query(None, description="Mô phỏng mực nước triều (m)"),
    rainfall_override: Optional[float] = Query(None, description="Mô phỏng lượng mưa (mm/h)"),
):
    """
    Trả về toàn bộ các điểm đen ngập lụt tại TP.HCM (tọa độ GPS, cấp độ ngập, độ sâu ước tính, cảnh báo).
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


@router.get("/forecast", response_model=GloFASForecastResponse, summary="Dự báo ngập lụt GloFAS toàn cầu 7 ngày")
async def get_glofas_flood_forecast(
    lat: float = Query(10.7765, description="Vĩ độ (GPS)"),
    lng: float = Query(106.7009, description="Kinh độ (GPS)"),
):
    """
    NGUỒN 1: API Tra cứu Dự báo Nguy cơ Lũ lụt & Lưu lượng dòng chảy sông ngòi (GloFAS 7 ngày)
    trên toàn lãnh thổ Việt Nam từ Open-Meteo Global Flood API.
    """
    return await FloodService.get_open_meteo_flood_forecast(lat=lat, lng=lng)


@router.get("/summary", summary="Tóm tắt tình hình ngập lụt đô thị")
async def get_flood_summary():
    """
    API Tóm tắt tình trạng ngập lụt đô thị và số lượng điểm ngập theo từng cấp độ rủi ro.
    """
    data = await FloodService.get_flood_hotspots_geojson()
    return {
        "success": True,
        "summary": data.get("summary", {}),
        "updatedAt": "Thời gian thực (3 Nguồn tích hợp)",
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

    # Khởi tạo thuật toán OSRM bám đường động (Dynamic Snap-to-Road)
    start_lng, start_lat = payload.longitude - 0.0005, payload.latitude - 0.0005
    end_lng, end_lat = payload.longitude + 0.0005, payload.latitude + 0.0005
    osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson"

    road_corridor_wkt = f"LINESTRING({payload.longitude - 0.0001} {payload.latitude - 0.0001}, {payload.longitude + 0.0001} {payload.latitude + 0.0001})"
    try:
        req = urllib.request.Request(osrm_url, headers={"User-Agent": "EcoReport-FloodWatch/1.0"})
        with urllib.request.urlopen(req, timeout=3) as response:
            route_data = json.loads(response.read().decode())
            if "routes" in route_data and len(route_data["routes"]) > 0:
                coords = route_data["routes"][0]["geometry"]["coordinates"]
                road_corridor_wkt = "LINESTRING(" + ", ".join([f"{c[0]} {c[1]}" for c in coords]) + ")"
    except Exception:
        pass

    # 1. Tạo điểm đen ngập lụt ĐỘNG (Dynamic Hotspot)
    dynamic_hotspot_code = f"FL-DYN-{uuid.uuid4().hex[:6].upper()}"
    insert_hotspot_query = text("""
        INSERT INTO flood_hotspots (
            hotspot_code, street_name, ward_name, district_name,
            location, road_corridor, elevation_meters, primary_cause,
            threshold_tide_meters, threshold_rain_mm_per_hour,
            historical_max_depth_cm, drainage_system_rating, is_active
        ) VALUES (
            :code, :street, NULL, 'Cộng đồng báo cáo',
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
            ST_SetSRID(ST_GeomFromText(:wkt), 4326),
            1.0, 'RAINFALL', 0.0, 0.0, :depth, 1, TRUE
        ) RETURNING hotspot_id;
    """)

    result = await db.execute(insert_hotspot_query, {
        "code": dynamic_hotspot_code,
        "street": payload.address_description or "Đường chưa rõ tên",
        "lng": payload.longitude,
        "lat": payload.latitude,
        "wkt": road_corridor_wkt,
        "depth": payload.actual_depth_cm or 30.0,
    })
    new_hotspot_id = result.scalar()

    # 2. Lưu báo cáo cộng đồng
    insert_report_query = text("""
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
    await db.execute(insert_report_query, {
        "report_id": report_id,
        "hotspot_id": new_hotspot_id,
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
