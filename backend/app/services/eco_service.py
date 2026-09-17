import asyncio
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.eco_crud import (
    query_incidents,
    query_green_spots,
    query_recycling_facilities,
    query_iot_sensor_stations,
)


class EcoService:
    @staticmethod
    async def get_eco_locations(
        db: AsyncSession,
        category: Optional[str] = None,
        district: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Nghiệp vụ tổng hợp địa điểm môi trường:
        - Tải có chọn lọc theo category.
        - Chạy song song asyncio.gather khi cần nhiều bảng.
        - Tối ưu hóa tính toán khoảng cách bằng PostGIS (ST_DistanceSphere) nếu có lat/lng.
        """
        locations: List[Dict[str, Any]] = []
        query_all = category is None or category == "all"
        tasks = []

        # 1. Sự cố môi trường
        async def handle_incidents():
            rows = await query_incidents(db, lat=lat, lng=lng)
            res = []
            for row in rows:
                st = row["status"]
                if st == "PENDING":
                    status_code, status_text = "pending", "Chờ đội phản ứng nhanh"
                elif st == "IN_PROGRESS":
                    status_code, status_text = "processing", "Đang xử lý tại hiện trường"
                elif st == "RESOLVED":
                    status_code, status_text = "resolved", "Đã nghiệm thu xử lý"
                else:
                    status_code, status_text = "warning", "Cảnh báo khẩn"

                item = {
                    "id": row["id"],
                    "name": row["name"],
                    "category": "incident",
                    "district": row["district"],
                    "address": row["address"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "status": status_code,
                    "statusText": status_text,
                    "metricLabel": "Điểm rủi ro ô nhiễm",
                    "metricValue": f"{row['risk_score']} / 100",
                    "severity": row["severity"],
                    "description": row["description"],
                    "trackingCode": row["tracking_code"],
                    "upvotes": row["upvotes_count"],
                    "wasteType": row["category_name"],
                    "reportedAt": "Hôm nay, 08:30",
                }
                if "distance_km" in row:
                    item["distanceKm"] = round(float(row["distance_km"]), 2)
                res.append(item)
            return res

        # 2. Điểm xanh & công viên
        async def handle_green_spots():
            rows = await query_green_spots(db, lat=lat, lng=lng)
            res = []
            for row in rows:
                meta = row["metadata"] or {}
                item = {
                    "id": f"green-{row['id']}",
                    "name": row["name"],
                    "category": "green_spot",
                    "district": row["district"],
                    "address": row["address"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "status": "optimal",
                    "statusText": row["status_text"],
                    "metricLabel": "Độ phủ xanh / Quy mô",
                    "metricValue": f"{meta.get('area_m2', 100000):,} m²",
                    "rating": meta.get("rating", 4.8),
                    "description": f"{row['name']} - {row['address']}. Không gian xanh công cộng bảo vệ môi trường đô thị TP.HCM.",
                }
                if "distance_km" in row:
                    item["distanceKm"] = round(float(row["distance_km"]), 2)
                res.append(item)
            return res

        # 3. Trạm tái chế
        async def handle_recycling():
            rows = await query_recycling_facilities(db, lat=lat, lng=lng)
            res = []
            for row in rows:
                accepted = ", ".join(row["accepted_waste_types"] or [])
                is_act = row["is_active"]
                item = {
                    "id": f"rec-{row['id']}",
                    "name": row["name"],
                    "category": "recycling",
                    "district": row["district"],
                    "address": row["address"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "status": "active" if is_act else "warning",
                    "statusText": "Đang mở cửa tiếp nhận" if is_act else "Tạm dừng tiếp nhận",
                    "metricLabel": "Thời gian hoạt động",
                    "metricValue": row["operating_hours"] or "08:00 - 17:00",
                    "acceptedTypes": accepted,
                    "contactPhone": row["contact_phone"],
                    "managingOrg": row["managing_org"],
                    "description": f"Điểm tiếp nhận phân loại chất thải tái chế: {accepted}. Quản lý bởi: {row['managing_org'] or 'UBND'}.",
                }
                if "distance_km" in row:
                    item["distanceKm"] = round(float(row["distance_km"]), 2)
                res.append(item)
            return res

        # 4. Trạm cảm biến IoT
        async def handle_sensors():
            rows = await query_iot_sensor_stations(db, lat=lat, lng=lng)
            res = []
            for row in rows:
                meta = row["metadata"] or {}
                st_type = row["station_type"]
                status_label = meta.get("status", "Hoạt động tốt")

                if "aqi" in meta:
                    m_label = "Chỉ số AQI"
                    m_val = f"AQI {meta['aqi']} ({meta.get('status', 'Tốt')})"
                elif "water_level_cm" in meta:
                    m_label = "Mực nước ngập"
                    m_val = f"{meta['water_level_cm']} cm"
                elif "tide_level_m" in meta:
                    m_label = "Thủy triều ven sông"
                    m_val = f"{meta['tide_level_m']} m"
                else:
                    m_label = "Trạng thái viễn trắc"
                    m_val = "Bình thường"

                item = {
                    "id": f"sensor-{row['id']}",
                    "name": row["name"],
                    "category": "sensor",
                    "district": row["district"],
                    "address": row["address"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "status": "active",
                    "statusText": f"Online • {status_label}",
                    "metricLabel": m_label,
                    "metricValue": m_val,
                    "sensorType": st_type,
                    "metrics": meta,
                    "description": f"{row['name']} - Trạm cảm biến truyền dữ liệu viễn trắc thời gian thực về Trung tâm điều hành EcoReport.",
                }
                if "distance_km" in row:
                    item["distanceKm"] = round(float(row["distance_km"]), 2)
                res.append(item)
            return res

        if query_all or category == "incident":
            tasks.append(handle_incidents())
        if query_all or category == "green_spot":
            tasks.append(handle_green_spots())
        if query_all or category == "recycling":
            tasks.append(handle_recycling())
        if query_all or category == "sensor":
            tasks.append(handle_sensors())

        results = await asyncio.gather(*tasks)
        for res_list in results:
            locations.extend(res_list)

        counts = {
            "all": len(locations),
            "incident": sum(1 for x in locations if x["category"] == "incident"),
            "green_spot": sum(1 for x in locations if x["category"] == "green_spot"),
            "recycling": sum(1 for x in locations if x["category"] == "recycling"),
            "sensor": sum(1 for x in locations if x["category"] == "sensor"),
        }

        filtered = locations
        if district:
            filtered = [x for x in filtered if district.lower() in x["district"].lower()]

        if lat is not None and lng is not None:
            # Sort all combined locations by distance
            filtered.sort(key=lambda x: x.get("distanceKm", 9999))

        return {
            "success": True,
            "total": len(filtered),
            "counts": counts,
            "data": filtered,
        }
