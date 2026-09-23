from typing import Optional
from fastapi import APIRouter, Query
from app.services.weather_service import WeatherService
from app.schemas.weather import LiveWeatherResponse

router = APIRouter(prefix="/weather", tags=["Live Weather & Air Quality"])


@router.get("/current", response_model=LiveWeatherResponse)
async def get_current_weather(
    lat: Optional[float] = Query(10.7765, description="Vĩ độ (GPS)"),
    lng: Optional[float] = Query(106.7009, description="Kinh độ (GPS)"),
):
    """
    API cung cấp dữ liệu Thời tiết, Thủy triều & Chỉ số AQI thời gian thực theo tọa độ GPS.
    """
    return await WeatherService.get_current_weather(lat=lat, lng=lng)


@router.get("/heatmap")
async def get_weather_heatmap():
    """
    API trả về GeoJSON FeatureCollection phục vụ hiển thị Bản đồ nhiệt thời tiết (Weather Heatmap),
    bao gồm Nhiệt độ (°C) và Chất lượng không khí (AQI) trên phạm vi toàn quốc Việt Nam.
    """
    return await WeatherService.get_weather_heatmap_geojson()
