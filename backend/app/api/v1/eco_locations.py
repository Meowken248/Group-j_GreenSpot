from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.services.flood_engine import flood_engine
from app.services.tide_service import tide_engine
from app.services.weather_service import weather_service

router = APIRouter(prefix="/eco-locations", tags=["Eco Locations"])


@router.get("")
async def get_eco_locations(
    category: Optional[str] = Query(None, description="Lọc theo loại: incident, green_spot, recycling, sensor"),
    district: Optional[str] = Query(None, description="Lọc theo quận/huyện"),
    db: AsyncSession = Depends(get_db),
):
    """
    API tải danh sách toàn bộ các địa điểm môi trường TP.HCM từ PostgreSQL/PostGIS:
    - Sự cố ô nhiễm (incidents)
    - Điểm xanh & công viên sinh thái (essential_facilities)
    - Trạm thu gom rác tái chế & pin cũ (recycling_facilities)
    - Trạm cảm biến quan trắc IoT (iot_sensor_stations)
    """
    locations: List[Dict[str, Any]] = []

    # 1. Truy vấn Sự cố Môi trường
    inc_query = """
        SELECT 
            i.incident_id::text as id,
            i.title as name,
            'incident' as category,
            COALESCE(u.name, 'TP. Hồ Chí Minh') as district,
            i.address_text as address,
            i.latitude::float as latitude,
            i.longitude::float as longitude,
            i.status,
            i.severity,
            i.risk_score::float as risk_score,
            i.description,
            i.tracking_code,
            i.upvotes_count,
            wc.name as category_name
        FROM incidents i
        LEFT JOIN administrative_units u ON i.unit_id = u.unit_id
        LEFT JOIN waste_categories wc ON i.category_id = wc.category_id
        ORDER BY i.created_at DESC;
    """
    inc_rows = await db.execute(text(inc_query))
    for row in inc_rows.mappings():
        st = row["status"]
        if st == "PENDING":
            status_code = "pending"
            status_text = "Chờ đội phản ứng nhanh"
        elif st == "IN_PROGRESS":
            status_code = "processing"
            status_text = "Đang xử lý tại hiện trường"
        elif st == "RESOLVED":
            status_code = "resolved"
            status_text = "Đã nghiệm thu xử lý"
        else:
            status_code = "warning"
            status_text = "Cảnh báo khẩn"

        locations.append({
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
        })

    # 2. Truy vấn Điểm xanh & Công viên sinh thái
    green_query = """
        SELECT 
            f.facility_id::text as id,
            f.facility_name as name,
            'green_spot' as category,
            COALESCE(u.name, 'TP. Hồ Chí Minh') as district,
            f.address,
            ST_Y(f.location)::float as latitude,
            ST_X(f.location)::float as longitude,
            COALESCE(f.metadata->>'status', 'Không gian xanh trong lành') as status_text,
            f.vulnerability_level,
            f.metadata
        FROM essential_facilities f
        LEFT JOIN administrative_units u ON f.unit_id = u.unit_id
        WHERE f.facility_type IN ('PARK', 'BOTANICAL_GARDEN', 'ECO_TOURISM', 'BIOSPHERE_RESERVE')
        ORDER BY f.facility_id ASC;
    """
    green_rows = await db.execute(text(green_query))
    for row in green_rows.mappings():
        meta = row["metadata"] or {}
        locations.append({
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
        })

    # 3. Truy vấn Trạm thu gom & Tái chế
    rec_query = """
        SELECT 
            r.facility_id::text as id,
            r.name,
            'recycling' as category,
            COALESCE(u.name, 'TP. Hồ Chí Minh') as district,
            r.address,
            ST_Y(r.location)::float as latitude,
            ST_X(r.location)::float as longitude,
            r.is_active,
            r.accepted_waste_types,
            r.operating_hours,
            r.contact_phone,
            r.managing_org
        FROM recycling_facilities r
        LEFT JOIN administrative_units u ON r.unit_id = u.unit_id
        ORDER BY r.facility_id ASC;
    """
    rec_rows = await db.execute(text(rec_query))
    for row in rec_rows.mappings():
        accepted = ", ".join(row["accepted_waste_types"] or [])
        is_act = row["is_active"]
        locations.append({
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
        })

    # 4. Truy vấn Trạm quan trắc IoT
    iot_query = """
        SELECT 
            s.station_id::text as id,
            s.station_name as name,
            'sensor' as category,
            COALESCE(u.name, 'TP. Hồ Chí Minh') as district,
            s.address,
            ST_Y(s.location)::float as latitude,
            ST_X(s.location)::float as longitude,
            s.station_type,
            s.status,
            s.metadata
        FROM iot_sensor_stations s
        LEFT JOIN administrative_units u ON s.unit_id = u.unit_id
        ORDER BY s.station_id ASC;
    """
    iot_rows = await db.execute(text(iot_query))
    for row in iot_rows.mappings():
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

        locations.append({
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
        })

    # 5. Truy vấn Điểm đen ngập lụt & Triều cường đô thị (Tính toán rủi ro động Realtime)
    curr_tide = tide_engine.get_current_tide("PHU_AN")
    curr_weather = await weather_service.get_hcm_rainfall()
    tide_m = float(curr_tide["water_level_m"])
    rain_mmh = float(curr_weather.get("rainfall_current_mmh", 0.0))

    flood_query = """
        SELECT 
            h.hotspot_id::text as id,
            h.hotspot_code,
            h.street_name,
            h.ward_name,
            COALESCE(h.district_name, 'TP. Hồ Chí Minh') as district,
            CONCAT(h.street_name, COALESCE(', ' || h.ward_name, ''), ', ', h.district_name) as address,
            ST_Y(h.location)::float as latitude,
            ST_X(h.location)::float as longitude,
            h.threshold_tide_meters::float as threshold_tide,
            h.threshold_rain_mm_per_hour::float as threshold_rain,
            h.historical_max_depth_cm::float as max_depth,
            h.drainage_system_rating,
            h.primary_cause
        FROM flood_hotspots h
        WHERE h.is_active = TRUE
        ORDER BY h.hotspot_id ASC;
    """
    flood_rows = await db.execute(text(flood_query))
    for row in flood_rows.mappings():
        class TempH:
            hotspot_id = row["id"]
            hotspot_code = row["hotspot_code"]
            street_name = row["street_name"]
            ward_name = row["ward_name"]
            district_name = row["district"]
            threshold_tide_meters = row["threshold_tide"]
            threshold_rain_mm_per_hour = row["threshold_rain"]
            drainage_system_rating = row["drainage_system_rating"]
            historical_max_depth_cm = row["max_depth"]
            primary_cause = row["primary_cause"]

        risk_data = flood_engine.calculate_hotspot_risk(TempH(), tide_m, rain_mmh)
        depth_cm = risk_data["predicted_depth_cm"]
        severity = risk_data["severity_level"]
        
        # Ánh xạ status frontend: optimal / pending / processing / warning
        if severity in ("SEVERE", "IMPASSABLE"):
            loc_status = "warning"
            status_text = f"Cảnh báo: Ngập sâu {depth_cm}cm"
        elif severity == "MODERATE":
            loc_status = "processing"
            status_text = f"Ngập vừa {depth_cm}cm"
        elif severity == "MINOR":
            loc_status = "pending"
            status_text = f"Ngập nhẹ {depth_cm}cm"
        else:
            loc_status = "optimal"
            status_text = "Khô ráo • An toàn"

        cause_desc = "Triều cường" if row["primary_cause"] == "TIDAL" else "Mưa lớn" if row["primary_cause"] == "RAINFALL" else "Mưa kết hợp Triều cường"

        locations.append({
            "id": f"flood-{row['id']}",
            "name": f"Điểm ngập {row['street_name']}",
            "category": "flood",
            "district": row["district"],
            "address": row["address"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "status": loc_status,
            "statusText": status_text,
            "metricLabel": "Độ sâu ngập / Nguy cơ",
            "metricValue": f"{depth_cm} cm ({severity})",
            "severityLevel": severity,
            "causeType": row["primary_cause"],
            "causeDesc": cause_desc,
            "riskScore": risk_data["risk_score"],
            "isImpassableBikes": risk_data["is_impassable_for_bikes"],
            "isImpassableCars": risk_data["is_impassable_for_cars"],
            "description": f"{risk_data['advisory_notice']} (Nguyên nhân chính: {cause_desc}, Ngưỡng triều: {row['threshold_tide']}m, Ngưỡng mưa: {row['threshold_rain']}mm/h).",
        })

    # Tính toán tổng số lượng theo từng danh mục
    counts = {
        "all": len(locations),
        "incident": sum(1 for x in locations if x["category"] == "incident"),
        "green_spot": sum(1 for x in locations if x["category"] == "green_spot"),
        "recycling": sum(1 for x in locations if x["category"] == "recycling"),
        "sensor": sum(1 for x in locations if x["category"] == "sensor"),
        "flood": sum(1 for x in locations if x["category"] == "flood"),
    }

    # Lọc nếu có query param
    filtered_locations = locations
    if category and category != "all":
        filtered_locations = [x for x in filtered_locations if x["category"] == category]
    if district:
        filtered_locations = [x for x in filtered_locations if district.lower() in x["district"].lower()]

    return {
        "success": True,
        "total": len(filtered_locations),
        "counts": counts,
        "data": filtered_locations,
    }
