"""
Weather & Rainfall Integration Service
Kết nối dữ liệu khí tượng Open-Meteo phục vụ phân tích lượng mưa và nguy cơ ngập úng TP.HCM.
Tích hợp cơ chế In-Memory Caching (TTL 10 phút) để tối ưu hiệu năng và tránh chạm hạn mức rate-limit.
"""

from __future__ import annotations

import asyncio
import json
import time
import urllib.request
from typing import Any, Dict, Optional


class WeatherRainfallService:
    """Service trích xuất lượng mưa và điều kiện thời tiết đô thị TP.HCM"""

    CACHE_TTL_SECONDS = 600  # 10 phút
    HCM_LATITUDE = 10.7765
    HCM_LONGITUDE = 106.7009

    def __init__(self):
        self._cached_rain_data: Optional[Dict[str, Any]] = None
        self._last_fetch_time: float = 0.0

    def _fetch_http_json(self, url: str, timeout: float = 4.0) -> Dict[str, Any]:
        req = urllib.request.Request(url, headers={"User-Agent": "GreenSpot-FloodEngine/2.0"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))

    async def get_hcm_rainfall(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Lấy lượng mưa hiện tại (mm/h) và dự báo mưa trong 1-3 giờ tới tại TP.HCM.
        """
        now = time.time()
        if not force_refresh and self._cached_rain_data and (now - self._last_fetch_time < self.CACHE_TTL_SECONDS):
            return self._cached_rain_data

        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={self.HCM_LATITUDE}&longitude={self.HCM_LONGITUDE}"
            f"&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m"
            f"&hourly=precipitation_probability,precipitation"
            f"&forecast_hours=6&timezone=Asia%2FHo_Chi_Minh"
        )

        try:
            raw_data = await asyncio.to_thread(self._fetch_http_json, url)
            current = raw_data.get("current", {})
            hourly = raw_data.get("hourly", {})

            rain_current = float(current.get("rain", current.get("precipitation", 0.0)))
            precip_probs = hourly.get("precipitation_probability", [0, 0, 0])
            next_1h_prob = precip_probs[1] if len(precip_probs) > 1 else precip_probs[0] if precip_probs else 0
            
            # Phân loại mức mưa theo thang khí tượng thủy văn Việt Nam
            rain_category = "KHÔNG_MƯA"
            if rain_current > 50.0:
                rain_category = "MƯA_RẤT_TO"
            elif rain_current > 25.0:
                rain_category = "MƯA_TO"
            elif rain_current > 10.0:
                rain_category = "MƯA_VỪA"
            elif rain_current > 0.2:
                rain_category = "MƯA_NHỎ"

            result = {
                "success": True,
                "rainfall_current_mmh": round(rain_current, 1),
                "rainfall_category": rain_category,
                "precipitation_prob_next_1h": next_1h_prob,
                "temperature_c": round(current.get("temperature_2m", 30.0), 1),
                "humidity_percent": round(current.get("relative_humidity_2m", 70.0)),
                "weather_code": current.get("weather_code", 0),
                "is_raining": rain_current >= 0.5,
                "is_heavy_rain": rain_current >= 25.0,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S+07:00", time.localtime()),
            }

            self._cached_rain_data = result
            self._last_fetch_time = now
            return result

        except Exception as err:
            # Fallback an toàn khi không có kết nối internet ngoại mạng
            if self._cached_rain_data:
                return self._cached_rain_data

            return {
                "success": False,
                "error": str(err),
                "rainfall_current_mmh": 0.0,
                "rainfall_category": "KHÔNG_MƯA",
                "precipitation_prob_next_1h": 20,
                "temperature_c": 29.5,
                "humidity_percent": 72,
                "weather_code": 1,
                "is_raining": False,
                "is_heavy_rain": False,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S+07:00", time.localtime()),
            }


weather_service = WeatherRainfallService()
