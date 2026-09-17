import time
import json
import asyncio
import urllib.request
from typing import Dict, Any

# In-memory cache: 10 phút
CACHE_TTL_SEC = 600
_cached_weather: Dict[str, Any] = {}
_last_fetch_time: float = 0


def map_wmo_weather_code(code: int) -> str:
    """Chuyển đổi mã WMO thời tiết sang mô tả tiếng Việt thân thiện."""
    if code == 0:
        return "Trời nắng trong lành"
    elif code in (1, 2):
        return "Nắng nhẹ ven sông"
    elif code == 3:
        return "Nhiều mây râm mát"
    elif code in (45, 48):
        return "Sương mù nhẹ sáng sớm"
    elif code in (51, 53, 55):
        return "Mưa phùn lất phất"
    elif code in (61, 63, 65):
        return "Mưa rào nhiệt đới"
    elif code in (80, 81, 82):
        return "Mưa dông cục bộ"
    elif code in (95, 96, 99):
        return "Dông bão sấm sét"
    return "Nắng ấm Nam Bộ"


def get_aqi_status(aqi: int) -> str:
    """Đánh giá mức độ ô nhiễm không khí theo tiêu chuẩn US AQI."""
    if aqi <= 50:
        return "Tốt"
    elif aqi <= 100:
        return "Trung bình"
    elif aqi <= 150:
        return "Kém đối với người nhạy cảm"
    elif aqi <= 200:
        return "Xấu"
    return "Rất nguy hại"


def _fetch_url_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "EcoReport/1.0"})
    with urllib.request.urlopen(req, timeout=3.5) as resp:
        return json.loads(resp.read().decode("utf-8"))


class WeatherService:
    @staticmethod
    async def get_current_weather() -> Dict[str, Any]:
        """Lấy dữ liệu thời tiết & chất lượng không khí có bộ nhớ đệm cache."""
        global _cached_weather, _last_fetch_time

        now = time.time()
        if _cached_weather and (now - _last_fetch_time < CACHE_TTL_SEC):
            return _cached_weather

        # Tọa độ trung tâm TP.HCM: 10.7765°N, 106.7009°E
        lat, lng = 10.7765, 106.7009
        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FHo_Chi_Minh"
        aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lng}&current=us_aqi,pm2_5,pm10&timezone=Asia%2FHo_Chi_Minh"

        try:
            w_data, aq_data = await asyncio.gather(
                asyncio.to_thread(_fetch_url_json, w_url),
                asyncio.to_thread(_fetch_url_json, aq_url),
            )

            curr_w = w_data.get("current", {})
            curr_aq = aq_data.get("current", {})

            temp_c = round(curr_w.get("temperature_2m", 29.0))
            w_code = curr_w.get("weather_code", 1)
            humidity = round(curr_w.get("relative_humidity_2m", 70.0))
            wind = round(curr_w.get("wind_speed_10m", 8.5), 1)

            us_aqi = round(curr_aq.get("us_aqi", 42))
            pm25 = round(curr_aq.get("pm2_5", 11.5), 1)
            pm10 = round(curr_aq.get("pm10", 22.0), 1)

            result = {
                "success": True,
                "city": "TP. Hồ Chí Minh",
                "temp": f"{temp_c}°C",
                "temperature": temp_c,
                "desc": map_wmo_weather_code(w_code),
                "humidity": f"{humidity}%",
                "wind": f"{wind} km/h",
                "aqi": us_aqi,
                "aqiStatus": get_aqi_status(us_aqi),
                "pm25": pm25,
                "pm10": pm10,
                "updatedAt": "Thời gian thực (Open-Meteo HQ)",
            }

            _cached_weather = result
            _last_fetch_time = now
            return result

        except Exception as e:
            # Fallback nếu gọi Open-Meteo bị gián đoạn
            return {
                "success": True,
                "city": "TP. Hồ Chí Minh",
                "temp": "31°C",
                "temperature": 31,
                "desc": "Nắng nhẹ ven sông (Dữ liệu dự phòng)",
                "humidity": "68%",
                "wind": "11.2 km/h",
                "aqi": 52,
                "aqiStatus": "Trung bình",
                "pm25": 14.8,
                "pm10": 26.5,
                "updatedAt": "Dữ liệu ngoại tuyến",
                "warning": str(e),
            }
