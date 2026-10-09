"""FastAPI Air Quality Analytics REST API
Enterprise-Grade Architecture: 100% backend business logic & data aggregation
serving typed JSON to the Native React Frontend.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.services.air_quality_analytics_service import AirQualityAnalyticsService
from app.services.runtime_sync_service import get_live_environment_runtime

router = APIRouter(prefix="/air-quality", tags=["Air Quality Analytics"])


@router.get("/provinces")
def list_provinces() -> List[Dict[str, Any]]:
    """Danh sách 34 tỉnh/thành phố có dữ liệu trạm quan trắc & phân tích khí tượng."""
    return AirQualityAnalyticsService.list_provinces()


@router.get("/overview")
def get_overview(
    province_slug: Optional[str] = Query(None, description="Slug của tỉnh (vd: ho_chi_minh, ha_noi) hoặc để trống cho toàn quốc"),
    time_range: str = Query("24h", description="Khung thời gian: 24h, 7d, 30d, 2025"),
) -> Dict[str, Any]:
    """Tổng quan chất lượng không khí: Thẻ KPI Hero, khuyến nghị sức khỏe, 6 chất ô nhiễm,
    biểu đồ phân bổ mức độ AQI, và top 5 tỉnh sạch nhất / ô nhiễm nhất."""
    return AirQualityAnalyticsService.get_overview(province_slug=province_slug, time_range=time_range)


@router.get("/provinces/{province_slug}/trend")
def get_trend(
    province_slug: str,
    time_range: str = Query("24h", description="Khung thời gian: 24h, 7d, 30d, 2025"),
) -> Dict[str, Any]:
    """Chuỗi thời gian diễn biến AQI, PM2.5, PM10, O3, NO2, SO2, CO, và các yếu tố khí tượng theo từng giờ."""
    return AirQualityAnalyticsService.get_trend(province_slug=province_slug, time_range=time_range)


@router.get("/provinces/{province_slug}/pollutants")
def get_pollutant_details(
    province_slug: str,
    time_range: str = Query("24h", description="Khung thời gian: 24h, 7d, 30d, 2025"),
    selected_pollutant: str = Query("pm2_5", description="Chất ô nhiễm cần so sánh (pm2_5, pm10, o3, no2, so2, co)"),
) -> Dict[str, Any]:
    """Phân tích chuyên sâu chất ô nhiễm: So sánh 34 tỉnh thành và ma trận tương quan nhiệt 6 chất."""
    return AirQualityAnalyticsService.get_pollutant_details(
        province_slug=province_slug,
        time_range=time_range,
        selected_pollutant=selected_pollutant,
    )


@router.get("/weather")
def get_weather_analytics(
    province_slug: Optional[str] = Query(None, description="Slug của tỉnh hoặc để trống cho toàn quốc"),
    season: str = Query("Tất cả", description="Mùa hoặc tháng"),
) -> Dict[str, Any]:
    """Phân tích khí tượng học: Thẻ chỉ số nhiệt/ẩm/gió/mưa, xu hướng 12 tháng, và biểu đồ phân tán Nhiệt độ vs Lượng mưa."""
    return AirQualityAnalyticsService.get_weather_analytics(province_slug=province_slug, season=season)


@router.get("/interaction")
def get_interaction_analytics(
    province_slug: Optional[str] = Query(None, description="Slug của tỉnh hoặc để trống cho toàn quốc"),
    region: str = Query("Tất cả", description="Vùng miền (Tất cả, Miền Bắc, Miền Trung, Miền Nam)"),
) -> Dict[str, Any]:
    """Tương tác Khí tượng - Ô nhiễm: Đường cong làm sạch của gió, đường cong rửa trôi của mưa, hệ số tương quan và tỉnh tự làm sạch tốt nhất."""
    return AirQualityAnalyticsService.get_interaction_analytics(province_slug=province_slug, region=region)


@router.get("/table")
def get_provinces_summary_table() -> List[Dict[str, Any]]:
    """Bảng dữ liệu tương tác đầy đủ 34 tỉnh/thành cho tìm kiếm, lọc và sắp xếp."""
    return AirQualityAnalyticsService.get_provinces_summary_table()


@router.get("/provinces/{province_slug}/latest")
async def get_latest_aqi(province_slug: str) -> Dict[str, Any]:
    """Lấy dữ liệu AQI và chỉ số khí tượng thời gian thực (Live Runtime) của một tỉnh/thành."""
    provinces = AirQualityAnalyticsService.list_provinces()
    target = next((p for p in provinces if p["slug"] == province_slug), None)

    lat = target["lat"] if target else None
    lon = target["lon"] if target else None

    if lat is not None and lon is not None:
        try:
            live_res = await get_live_environment_runtime(lat, lon)
            if live_res and live_res.get("aqi") is not None:
                from app.services.air_quality_analytics_service import get_aqi_meta
                aqi_val = float(live_res["aqi"])
                live_res["province"] = target["name"] if target else province_slug
                live_res["pollution_level_info"] = get_aqi_meta(aqi_val)
                return {
                    "province_slug": province_slug,
                    "data": live_res,
                    "status": "success",
                    "mode": "live_realtime",
                }
        except Exception:
            pass

    # Fallback to latest Parquet row
    df = AirQualityAnalyticsService._load_province_df(province_slug)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"Dữ liệu không tìm thấy cho tỉnh '{province_slug}'")

    from app.services.air_quality_analytics_service import get_aqi_meta
    latest_row = df.iloc[-1].to_dict()
    if "timestamp" in latest_row and hasattr(latest_row["timestamp"], "isoformat"):
        latest_row["timestamp"] = latest_row["timestamp"].isoformat()

    aqi_val = float(latest_row.get("aqi", 0)) if latest_row.get("aqi") is not None else None
    latest_row["pollution_level_info"] = get_aqi_meta(aqi_val)
    latest_row["is_live_runtime"] = False

    return {
        "province_slug": province_slug,
        "data": latest_row,
        "status": "success",
        "mode": "historical_fallback",
    }
