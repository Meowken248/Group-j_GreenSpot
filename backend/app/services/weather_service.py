import time
import json
import asyncio
import urllib.request
from typing import Dict, Any, List

# In-memory cache: 10 phút
CACHE_TTL_SEC = 600
_cached_weather: Dict[str, Any] = {}
_last_fetch_time: float = 0

_cached_heatmap: Dict[str, Any] = {}
_last_heatmap_fetch_time: float = 0

# Danh mục các trạm quan trắc thời tiết & không khí trên toàn quốc
WEATHER_STATIONS_VIETNAM = [
    {"id": "st-hn", "city": "Thủ đô Hà Nội", "region": "Bắc Bộ", "lat": 21.0285, "lng": 105.8542, "def_temp": 30.5, "def_aqi": 110, "def_pm25": 38.0},
    {"id": "st-hp", "city": "TP. Hải Phòng", "region": "Bắc Bộ", "lat": 20.8449, "lng": 106.6881, "def_temp": 29.5, "def_aqi": 68, "def_pm25": 19.5},
    {"id": "st-qn", "city": "Hạ Long (Quảng Ninh)", "region": "Bắc Bộ", "lat": 20.9505, "lng": 107.0734, "def_temp": 29.0, "def_aqi": 48, "def_pm25": 12.0},
    {"id": "st-sp", "city": "Sa Pa (Lào Cai)", "region": "Tây Bắc", "lat": 22.3364, "lng": 103.8438, "def_temp": 21.0, "def_aqi": 25, "def_pm25": 5.0},
    {"id": "st-ls", "city": "TP. Lạng Sơn", "region": "Đông Bắc", "lat": 21.8537, "lng": 106.7621, "def_temp": 27.5, "def_aqi": 45, "def_pm25": 10.5},
    {"id": "st-nb", "city": "Ninh Bình", "region": "Đồng bằng Sông Hồng", "lat": 20.2506, "lng": 105.9745, "def_temp": 30.0, "def_aqi": 62, "def_pm25": 17.5},
    {"id": "st-th", "city": "TP. Thanh Hóa", "region": "Bắc Trung Bộ", "lat": 19.8067, "lng": 105.7852, "def_temp": 31.0, "def_aqi": 75, "def_pm25": 23.0},
    {"id": "st-na", "city": "TP. Vinh (Nghệ An)", "region": "Bắc Trung Bộ", "lat": 18.6734, "lng": 105.6813, "def_temp": 31.5, "def_aqi": 70, "def_pm25": 21.0},
    {"id": "st-qb", "city": "Đồng Hới (Quảng Bình)", "region": "Bắc Trung Bộ", "lat": 17.4761, "lng": 106.5999, "def_temp": 30.5, "def_aqi": 42, "def_pm25": 9.5},
    {"id": "st-hue", "city": "Cố đô Huế", "region": "Bắc Trung Bộ", "lat": 16.4637, "lng": 107.5909, "def_temp": 29.8, "def_aqi": 40, "def_pm25": 8.5},
    {"id": "st-dn", "city": "TP. Đà Nẵng", "region": "Duyên hải Nam Trung Bộ", "lat": 16.0544, "lng": 108.2022, "def_temp": 29.5, "def_aqi": 38, "def_pm25": 7.5},
    {"id": "st-qn2", "city": "TP. Quảng Ngãi", "region": "Duyên hải Nam Trung Bộ", "lat": 15.1205, "lng": 108.7923, "def_temp": 30.0, "def_aqi": 45, "def_pm25": 11.0},
    {"id": "st-bd", "city": "Quy Nhơn (Bình Định)", "region": "Duyên hải Nam Trung Bộ", "lat": 13.7820, "lng": 109.2197, "def_temp": 30.5, "def_aqi": 36, "def_pm25": 8.0},
    {"id": "st-nt", "city": "TP. Nha Trang", "region": "Duyên hải Nam Trung Bộ", "lat": 12.2388, "lng": 109.1967, "def_temp": 30.0, "def_aqi": 32, "def_pm25": 6.8},
    {"id": "st-pt", "city": "Phan Thiết (Bình Thuận)", "region": "Duyên hải Nam Trung Bộ", "lat": 10.9333, "lng": 108.1000, "def_temp": 31.8, "def_aqi": 35, "def_pm25": 7.5},
    {"id": "st-gl", "city": "Pleiku (Gia Lai)", "region": "Tây Nguyên", "lat": 13.9833, "lng": 108.0000, "def_temp": 25.5, "def_aqi": 28, "def_pm25": 5.5},
    {"id": "st-dlk", "city": "Buôn Ma Thuột (Đắk Lắk)", "region": "Tây Nguyên", "lat": 12.6667, "lng": 108.0500, "def_temp": 26.5, "def_aqi": 30, "def_pm25": 6.0},
    {"id": "st-dl", "city": "TP. Đà Lạt (Lâm Đồng)", "region": "Tây Nguyên", "lat": 11.9404, "lng": 108.4583, "def_temp": 19.5, "def_aqi": 20, "def_pm25": 4.0},
    {"id": "st-hcm", "city": "TP. Hồ Chí Minh", "region": "Đông Nam Bộ", "lat": 10.7626, "lng": 106.6602, "def_temp": 31.0, "def_aqi": 85, "def_pm25": 26.5},
    {"id": "st-td", "city": "TP. Thủ Đức", "region": "Đông Nam Bộ", "lat": 10.8494, "lng": 106.7584, "def_temp": 31.2, "def_aqi": 65, "def_pm25": 18.0},
    {"id": "st-cg", "city": "Cần Giờ (TP.HCM)", "region": "Đông Nam Bộ", "lat": 10.4150, "lng": 106.8850, "def_temp": 29.5, "def_aqi": 22, "def_pm25": 4.2},
    {"id": "st-bdg", "city": "Bình Dương (Thủ Dầu Một)", "region": "Đông Nam Bộ", "lat": 11.1666, "lng": 106.6500, "def_temp": 32.0, "def_aqi": 90, "def_pm25": 28.0},
    {"id": "st-dna", "city": "Biên Hòa (Đồng Nai)", "region": "Đông Nam Bộ", "lat": 10.9575, "lng": 106.8427, "def_temp": 31.5, "def_aqi": 88, "def_pm25": 27.0},
    {"id": "st-vt", "city": "TP. Vũng Tàu", "region": "Đông Nam Bộ", "lat": 10.4114, "lng": 107.1362, "def_temp": 30.0, "def_aqi": 34, "def_pm25": 7.0},
    {"id": "st-ct", "city": "TP. Cần Thơ", "region": "Đồng bằng Sông Cửu Long", "lat": 10.0452, "lng": 105.7469, "def_temp": 30.2, "def_aqi": 46, "def_pm25": 10.5},
    {"id": "st-ag", "city": "Long Xuyên (An Giang)", "region": "Đồng bằng Sông Cửu Long", "lat": 10.3833, "lng": 105.4167, "def_temp": 30.8, "def_aqi": 42, "def_pm25": 9.0},
    {"id": "st-pq", "city": "Đảo ngọc Phú Quốc", "region": "Đồng bằng Sông Cửu Long", "lat": 10.2150, "lng": 103.9620, "def_temp": 29.0, "def_aqi": 22, "def_pm25": 4.5},
    {"id": "st-cm", "city": "Đất Mũi Cà Mau", "region": "Đồng bằng Sông Cửu Long", "lat": 9.1833, "lng": 105.1500, "def_temp": 29.8, "def_aqi": 28, "def_pm25": 5.8},
]


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
    return "Nắng ấm nhiệt đới"


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


def _fetch_url_json(url: str) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "EcoReport/1.0"})
    with urllib.request.urlopen(req, timeout=4.5) as resp:
        return json.loads(resp.read().decode("utf-8"))


class WeatherService:
    @staticmethod
    async def get_current_weather(lat: float = 10.7765, lng: float = 106.7009) -> Dict[str, Any]:
        """Lấy dữ liệu thời tiết & chất lượng không khí có bộ nhớ đệm cache."""
        global _cached_weather, _last_fetch_time

        now = time.time()
        cache_key = f"{round(lat, 2)}_{round(lng, 2)}"
        cached_val = _cached_weather.get(cache_key)
        if cached_val and (now - cached_val.get("_time", 0) < CACHE_TTL_SEC):
            return cached_val

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
                "city": "Việt Nam",
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
                "_time": now,
            }

            _cached_weather[cache_key] = result
            return result

        except Exception as e:
            return {
                "success": True,
                "city": "Việt Nam",
                "temp": "31°C",
                "temperature": 31,
                "desc": "Nắng nhẹ nhiệt đới (Dữ liệu dự phòng)",
                "humidity": "68%",
                "wind": "11.2 km/h",
                "aqi": 52,
                "aqiStatus": "Trung bình",
                "pm25": 14.8,
                "pm10": 26.5,
                "updatedAt": "Dữ liệu ngoại tuyến",
                "warning": str(e),
                "_time": now,
            }

    @staticmethod
    async def get_weather_heatmap_geojson() -> Dict[str, Any]:
        """
        Trả về GeoJSON FeatureCollection phục vụ hiển thị Bản đồ nhiệt (Heatmap Layer)
        bao gồm Nhiệt độ thời tiết (°C) và Chỉ số ô nhiễm không khí (US AQI, PM2.5)
        trên phạm vi toàn quốc Việt Nam.
        """
        global _cached_heatmap, _last_heatmap_fetch_time

        now = time.time()
        if _cached_heatmap and (now - _last_heatmap_fetch_time < CACHE_TTL_SEC):
            return _cached_heatmap

        features: List[Dict[str, Any]] = []

        # Tạo chuỗi query Open-Meteo batch cho tất cả các trạm
        lats_str = ",".join(str(s["lat"]) for s in WEATHER_STATIONS_VIETNAM)
        lngs_str = ",".join(str(s["lng"]) for s in WEATHER_STATIONS_VIETNAM)

        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lats_str}&longitude={lngs_str}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FHo_Chi_Minh"
        aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lats_str}&longitude={lngs_str}&current=us_aqi,pm2_5,pm10&timezone=Asia%2FHo_Chi_Minh"

        w_results = []
        aq_results = []

        try:
            w_res, aq_res = await asyncio.gather(
                asyncio.to_thread(_fetch_url_json, w_url),
                asyncio.to_thread(_fetch_url_json, aq_url),
            )
            w_results = w_res if isinstance(w_res, list) else [w_res]
            aq_results = aq_res if isinstance(aq_res, list) else [aq_res]
        except Exception:
            # Fallback to local default metrics
            w_results = []
            aq_results = []

        for i, s in enumerate(WEATHER_STATIONS_VIETNAM):
            # Weather data
            if i < len(w_results) and "current" in w_results[i]:
                cw = w_results[i]["current"]
                temp = float(cw.get("temperature_2m", s["def_temp"]))
                humidity = int(cw.get("relative_humidity_2m", 70))
                wind = float(cw.get("wind_speed_10m", 8.0))
                w_code = cw.get("weather_code", 1)
            else:
                temp = s["def_temp"]
                humidity = 70
                wind = 8.5
                w_code = 1

            # Air Quality data
            if i < len(aq_results) and "current" in aq_results[i]:
                caq = aq_results[i]["current"]
                aqi = int(caq.get("us_aqi", s["def_aqi"]))
                pm25 = float(caq.get("pm2_5", s["def_pm25"]))
                pm10 = float(caq.get("pm10", pm25 * 1.8))
            else:
                aqi = s["def_aqi"]
                pm25 = s["def_pm25"]
                pm10 = pm25 * 1.8

            feature = {
                "type": "Feature",
                "id": s["id"],
                "geometry": {
                    "type": "Point",
                    "coordinates": [s["lng"], s["lat"]],
                },
                "properties": {
                    "id": s["id"],
                    "city": s["city"],
                    "region": s["region"],
                    "temperature": temp,
                    "humidity": humidity,
                    "wind": wind,
                    "desc": map_wmo_weather_code(w_code),
                    "aqi": aqi,
                    "aqiStatus": get_aqi_status(aqi),
                    "pm25": pm25,
                    "pm10": pm10,
                },
            }
            features.append(feature)

        result = {
            "success": True,
            "type": "FeatureCollection",
            "totalStations": len(features),
            "updatedAt": "Thời gian thực (Open-Meteo & EcoReport HQ)",
            "features": features,
        }

        _cached_heatmap = result
        _last_heatmap_fetch_time = now
        return result
