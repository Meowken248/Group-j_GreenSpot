from typing import Optional
from fastapi import APIRouter, Query
from app.services.flood_service import FloodService
from app.schemas.flood import FloodHotspotsGeoJSONResponse, GloFASForecastResponse

router = APIRouter(prefix="/flood", tags=["Smart Flood Watch & GloFAS"])


@router.get("/hotspots", response_model=FloodHotspotsGeoJSONResponse)
async def get_flood_hotspots(
    rain_mm: Optional[float] = Query(None, description="Lượng mưa giả định (mm/h) để kiểm thử mô phỏng cảnh báo ngập")
):
    """
    API trả về GeoJSON FeatureCollection các điểm đen ngập lụt tại TP.HCM:
    - NGUỒN 1: Open-Meteo Global Flood API (Lưu lượng GloFAS m³/s).
    - NGUỒN 2: Dữ liệu Cổng Mở TP.HCM (Sở Xây dựng & UDC) - 30+ điểm ngập, độ sâu chuẩn, trạm bơm.
    - NGUỒN 3: Cảnh báo Thời tiết Thông minh - Đánh giá độ sâu ngập thực tế & cấp độ nguy cơ.
    """
    return await FloodService.get_flood_hotspots_geojson(force_rain_mm=rain_mm)


@router.get("/forecast", response_model=GloFASForecastResponse)
async def get_glofas_flood_forecast(
    lat: float = Query(10.7765, description="Vĩ độ (GPS)"),
    lng: float = Query(106.7009, description="Kinh độ (GPS)"),
):
    """
    NGUỒN 1: API Tra cứu Dự báo Nguy cơ Lũ lụt & Lưu lượng dòng chảy sông ngòi (GloFAS 7 ngày)
    trên toàn lãnh thổ Việt Nam từ Open-Meteo Global Flood API.
    """
    return await FloodService.get_open_meteo_flood_forecast(lat=lat, lng=lng)


@router.get("/summary")
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
