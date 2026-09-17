from fastapi import APIRouter
from app.services.weather_service import WeatherService
from app.schemas.weather import LiveWeatherResponse

router = APIRouter(prefix="/weather", tags=["Live Weather & Air Quality"])


@router.get("/current", response_model=LiveWeatherResponse)
async def get_current_weather():
    """
    API cung cấp dữ liệu Thời tiết & Chỉ số AQI thời gian thực của TP.HCM.
    Đã chuẩn hóa: Gọi qua WeatherService.
    """
    return await WeatherService.get_current_weather()
