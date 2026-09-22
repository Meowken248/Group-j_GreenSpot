"""
Urban Flood Risk Assessment & Navigation Engine
Động cơ tính toán rủi ro ngập úng đô thị đa nhân tố: Thủy triều + Cường độ mưa + Địa hình & Thoát nước.
Thiết kế theo chuẩn Clean Architecture, hỗ trợ đánh giá realtime và kiểm tra lộ trình né ngập.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flood import (
    FloodCauseType,
    FloodHotspot,
    FloodSeverityLevel,
    RouteSafetyStatus,
    TideAlertLevel,
)
from app.services.tide_service import tide_engine
from app.services.weather_service import weather_service


class FloodRiskEngine:
    """Động cơ phân tích rủi ro ngập lụt và cảnh báo lộ trình"""

    @classmethod
    def calculate_hotspot_risk(
        cls,
        hotspot: FloodHotspot,
        tide_water_level_m: float,
        rainfall_mmh: float,
    ) -> Dict[str, Any]:
        """
        Đánh giá mức độ rủi ro ngập tại một điểm đen ngập úng dựa trên số liệu thủy văn hiện tại.
        Trả về Risk Score (0 - 10), độ sâu ngập ước tính (cm), phân loại nghiêm trọng và cảnh báo phương tiện.
        """
        tide_threshold = float(hotspot.threshold_tide_meters or 1.50)
        rain_threshold = float(hotspot.threshold_rain_mm_per_hour or 25.0)
        drainage_rating = int(hotspot.drainage_system_rating or 3)
        max_depth_hist = float(hotspot.historical_max_depth_cm or 40.0)

        # 1. Thành phần triều cường (Tidal Component)
        tide_delta = tide_water_level_m - tide_threshold
        tide_score = 0.0
        tide_depth_cm = 0.0

        if tide_delta > 0:
            # Nước triều bắt đầu tràn mặt đường (Cứ mỗi 10cm triều vượt ngưỡng tương ứng ~ 10-15cm nước ngập)
            tide_score = min(5.5, (tide_delta / 0.10) * 1.5)
            tide_depth_cm = tide_delta * 100.0  # chuyển đổi sang cm

        # 2. Thành phần mưa (Rainfall Component)
        rain_ratio = rainfall_mmh / rain_threshold
        rain_score = 0.0
        rain_depth_cm = 0.0

        if rain_ratio > 0.5:
            rain_score = min(4.5, (rain_ratio - 0.5) * 2.5)
            rain_depth_cm = (rainfall_mmh - (rain_threshold * 0.5)) * 0.8

        # 3. Hệ số suy giảm thoát nước (Hạ tầng kém cống rác nghẹt làm ngập nặng hơn)
        # drainage_rating từ 1 (Kém) đến 5 (Tốt)
        drainage_factor = 1.0 + (3 - drainage_rating) * 0.15

        # 4. Tính toán rủi ro tổng hợp (Combined Risk Score 0.0 - 10.0)
        raw_risk = (tide_score + rain_score) * drainage_factor
        risk_score = round(max(0.0, min(10.0, raw_risk)), 2)

        # 5. Ước tính độ sâu ngập mặt đường (cm)
        total_depth_cm = round(max(0.0, min(max_depth_hist, (tide_depth_cm + rain_depth_cm) * drainage_factor)), 1)

        # 6. Phân cấp mức độ ngập lụt
        severity = FloodSeverityLevel.SAFE
        is_impassable_bikes = False
        is_impassable_cars = False
        advisory = "Đường khô ráo, lưu thông thuận tiện."

        if total_depth_cm >= 45.0 or risk_score >= 8.5:
            severity = FloodSeverityLevel.IMPASSABLE
            is_impassable_bikes = True
            is_impassable_cars = True
            advisory = "NGẬP CỰC NẶNG (>45cm)! Cấm tuyệt đối xe máy và ô tô con gầm thấp lưu thông."
        elif total_depth_cm >= 25.0 or risk_score >= 6.5:
            severity = FloodSeverityLevel.SEVERE
            is_impassable_bikes = True
            is_impassable_cars = True
            advisory = "NGẬP SÂU (25 - 45cm). Xe máy ngập ống xả nguy cơ chết máy cao. Nên né tuyến đường này."
        elif total_depth_cm >= 15.0 or risk_score >= 4.5:
            severity = FloodSeverityLevel.MODERATE
            is_impassable_bikes = False
            is_impassable_cars = True
            advisory = "Ngập vừa (15 - 25cm). Ô tô gầm thấp tránh đi, xe máy đi chậm sát dải phân cách giữa."
        elif total_depth_cm >= 5.0 or risk_score >= 2.5:
            severity = FloodSeverityLevel.MINOR
            is_impassable_bikes = False
            is_impassable_cars = False
            advisory = "Ngập nhẹ mấp mé (5 - 15cm). Phương tiện chú ý giảm tốc độ tránh bắn nước."

        return {
            "hotspot_id": hotspot.hotspot_id,
            "hotspot_code": hotspot.hotspot_code,
            "street_name": hotspot.street_name,
            "ward_name": hotspot.ward_name,
            "district_name": hotspot.district_name,
            "cause_type": hotspot.primary_cause.value if hasattr(hotspot.primary_cause, "value") else str(hotspot.primary_cause),
            "risk_score": risk_score,
            "predicted_depth_cm": total_depth_cm,
            "severity_level": severity.value,
            "is_impassable_for_bikes": is_impassable_bikes,
            "is_impassable_for_cars": is_impassable_cars,
            "advisory_notice": advisory,
        }

    @classmethod
    async def evaluate_all_hotspots(
        cls,
        db: AsyncSession,
        tide_level_override: Optional[float] = None,
        rainfall_override: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Đánh giá realtime toàn bộ các điểm đen ngập lụt tại TP.HCM.
        Hỗ trợ tham số override phục vụ mô phỏng kịch bản (Scenario Testing/Simulation).
        """
        # 1. Lấy dữ liệu thủy triều hiện tại
        if tide_level_override is not None:
            tide_m = tide_level_override
        else:
            curr_tide = tide_engine.get_current_tide("PHU_AN")
            tide_m = float(curr_tide["water_level_m"])

        # 2. Lấy dữ liệu lượng mưa hiện tại
        if rainfall_override is not None:
            rain_mmh = rainfall_override
        else:
            weather_data = await weather_service.get_hcm_rainfall()
            rain_mmh = float(weather_data.get("rainfall_current_mmh", 0.0))

        # 3. Truy vấn các điểm đen ngập đang theo dõi
        stmt = (
            select(
                FloodHotspot,
                text("ST_X(location)::float as lng"),
                text("ST_Y(location)::float as lat"),
                text("ST_AsGeoJSON(road_corridor)::json as corridor"),
            )
            .where(FloodHotspot.is_active == True)
            .order_by(FloodHotspot.hotspot_id)
        )
        result = await db.execute(stmt)
        rows = result.all()

        evaluations: List[Dict[str, Any]] = []
        for hotspot, lng, lat, corridor in rows:
            eval_data = cls.calculate_hotspot_risk(hotspot, tide_m, rain_mmh)
            eval_data["longitude"] = round(lng, 6)
            eval_data["latitude"] = round(lat, 6)
            eval_data["road_corridor"] = corridor
            evaluations.append(eval_data)

        return evaluations

    @classmethod
    async def check_route_for_flood_hazards(
        cls,
        db: AsyncSession,
        coordinates: List[List[float]],  # [[lng, lat], [lng, lat], ...]
        buffer_meters: float = 60.0,
        tide_level_override: Optional[float] = None,
        rainfall_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Kiểm tra tuyến đường (chuỗi tọa độ [lng, lat]) có đi qua hoặc gần điểm đen ngập lụt không.
        Sử dụng PostGIS ST_DWithin với đoạn hành lang đường ngập road_corridor LineString.
        """
        if len(coordinates) < 2:
            return {
                "is_safe": True,
                "hazard_level": "CLEAR",
                "hazard_count": 0,
                "hazards": [],
                "recommendation": "Lộ trình quá ngắn hoặc không hợp lệ.",
            }

        # Tạo chuỗi WKT LINESTRING từ mảng tọa độ
        points_str = ", ".join(f"{pt[0]} {pt[1]}" for pt in coordinates)
        linestring_wkt = f"LINESTRING({points_str})"

        # Lấy thông số triều và mưa hiện tại
        if tide_level_override is not None:
            tide_m = tide_level_override
        else:
            curr_tide = tide_engine.get_current_tide("PHU_AN")
            tide_m = float(curr_tide["water_level_m"])

        if rainfall_override is not None:
            rain_mmh = rainfall_override
        else:
            weather_data = await weather_service.get_hcm_rainfall()
            rain_mmh = float(weather_data.get("rainfall_current_mmh", 0.0))

        # Truy vấn các điểm ngập nằm trong bán kính buffer_meters so với lộ trình
        query = text("""
            SELECT 
                h.hotspot_id,
                h.hotspot_code,
                h.street_name,
                h.district_name,
                h.threshold_tide_meters::float as threshold_tide_meters,
                h.threshold_rain_mm_per_hour::float as threshold_rain_mm_per_hour,
                h.historical_max_depth_cm::float as historical_max_depth_cm,
                h.drainage_system_rating,
                h.primary_cause,
                ST_X(h.location)::float as lng,
                ST_Y(h.location)::float as lat,
                ST_AsGeoJSON(h.road_corridor)::json as road_corridor,
                ST_Distance(
                    COALESCE(h.road_corridor, h.location)::geography,
                    ST_GeomFromText(:route_wkt, 4326)::geography
                ) as distance_to_route_meters
            FROM flood_hotspots h
            WHERE h.is_active = TRUE
              AND ST_DWithin(
                  h.location::geography,
                  ST_GeomFromText(:route_wkt, 4326)::geography,
                  :buffer_meters
              )
            ORDER BY distance_to_route_meters ASC;
        """)

        result = await db.execute(query, {
            "route_wkt": linestring_wkt,
            "buffer_meters": buffer_meters,
        })
        rows = result.mappings().all()

        hazards: List[Dict[str, Any]] = []
        max_severity = FloodSeverityLevel.SAFE
        has_blocker = False

        for r in rows:
            # Tạo mock hotspot để tính rủi ro
            class TempHotspot:
                hotspot_id = r["hotspot_id"]
                hotspot_code = r["hotspot_code"]
                street_name = r["street_name"]
                ward_name = None
                district_name = r["district_name"]
                threshold_tide_meters = r["threshold_tide_meters"]
                threshold_rain_mm_per_hour = r["threshold_rain_mm_per_hour"]
                drainage_system_rating = r["drainage_system_rating"]
                historical_max_depth_cm = r["historical_max_depth_cm"]
                primary_cause = r["primary_cause"]

            risk = cls.calculate_hotspot_risk(TempHotspot(), tide_m, rain_mmh)
            risk["latitude"] = r["lat"]
            risk["longitude"] = r["lng"]
            risk["distance_to_route_meters"] = round(r["distance_to_route_meters"], 1)

            # Chỉ cảnh báo nếu điểm đó có rủi ro ngập từ MINOR trở lên
            if risk["severity_level"] in (
                FloodSeverityLevel.MINOR.value,
                FloodSeverityLevel.MODERATE.value,
                FloodSeverityLevel.SEVERE.value,
                FloodSeverityLevel.IMPASSABLE.value,
            ):
                hazards.append(risk)
                if risk["severity_level"] in (FloodSeverityLevel.SEVERE.value, FloodSeverityLevel.IMPASSABLE.value):
                    has_blocker = True

        safety_status = RouteSafetyStatus.CLEAR
        recommendation = "Lộ trình an toàn, không có đoạn ngập úng đáng kể."

        if has_blocker:
            safety_status = RouteSafetyStatus.AVOID
            recommendation = (
                f"CẢNH BÁO: Phát hiện {len(hazards)} điểm ngập trên lộ trình, "
                f"trong đó có điểm ngập sâu gây nguy cơ thủy kích/chết máy. "
                f"Khuyến nghị hệ thống kích hoạt lộ trình né tránh!"
            )
        elif len(hazards) > 0:
            safety_status = RouteSafetyStatus.CAUTION
            recommendation = (
                f"CHÚ Ý: Phát hiện {len(hazards)} điểm ngập nhẹ lân cận lộ trình. "
                f"Phương tiện có thể lưu thông nhưng cần giảm tốc độ."
            )

        return {
            "status": safety_status.value,
            "is_safe": safety_status == RouteSafetyStatus.CLEAR,
            "current_conditions": {
                "tide_water_level_m": tide_m,
                "rainfall_mmh": rain_mmh,
            },
            "hazard_count": len(hazards),
            "hazards": hazards,
            "recommendation": recommendation,
        }


flood_engine = FloodRiskEngine()
