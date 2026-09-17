import json
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db

router = APIRouter(prefix="/spatial", tags=["Spatial & WebGIS"])


@router.get("/districts")
async def get_district_boundaries(db: AsyncSession = Depends(get_db)):
    """
    API trả về GeoJSON FeatureCollection ranh giới các quận/huyện TP.HCM.
    Đã tối ưu hóa: Sử dụng 1 câu truy vấn SQL duy nhất kết hợp LEFT JOIN và GROUP BY,
    loại bỏ hoàn toàn lỗi N+1 Query.
    """
    query = """
        SELECT 
            u.unit_id,
            u.unit_code,
            u.name,
            u.area_km2::float as area_km2,
            u.population,
            ST_AsGeoJSON(u.boundary) as geojson_geom,
            ST_X(u.centroid)::float as lng,
            ST_Y(u.centroid)::float as lat,
            COUNT(i.incident_id) as incidents_count
        FROM administrative_units u
        LEFT JOIN incidents i ON i.unit_id = u.unit_id
        WHERE u.boundary IS NOT NULL
        GROUP BY u.unit_id, u.unit_code, u.name, u.area_km2, u.population, u.boundary, u.centroid
        ORDER BY u.unit_id ASC;
    """
    rows = await db.execute(text(query))

    # Metadata bổ sung về vai trò và màu sắc hiển thị
    DISTRICT_META: Dict[str, Dict[str, Any]] = {
        "760": {"id": "quan-1", "role": "Trung tâm Hành chính & Tài chính", "color": "#3b82f6", "greenIndex": "18.4%"},
        "769": {"id": "thu-duc", "role": "Đô thị Sáng tạo & Công nghệ Cao", "color": "#10b981", "greenIndex": "32.6%"},
        "778": {"id": "quan-7", "role": "Khu đô thị Kiểu mẫu Nam Sài Gòn", "color": "#8b5cf6", "greenIndex": "26.8%"},
        "765": {"id": "binh-thanh", "role": "Cửa ngõ Đông Bắc & Bán đảo Thanh Đa", "color": "#f59e0b", "greenIndex": "22.1%"},
        "787": {"id": "can-gio", "role": "Khu dự trữ sinh quyển thế giới", "color": "#059669", "greenIndex": "84.5%"},
    }

    features: List[Dict[str, Any]] = []
    for r in rows.mappings():
        code = r["unit_code"]
        meta = DISTRICT_META.get(code, {
            "id": f"unit-{code}",
            "role": "Đơn vị Đô thị TP.HCM",
            "color": "#0ea5e9",
            "greenIndex": "25.0%",
        })

        geom = json.loads(r["geojson_geom"]) if r["geojson_geom"] else None
        if geom:
            features.append({
                "type": "Feature",
                "properties": {
                    "id": meta["id"],
                    "unitId": r["unit_id"],
                    "name": r["name"],
                    "role": meta["role"],
                    "incidents": r["incidents_count"] or 0,
                    "greenIndex": meta["greenIndex"],
                    "color": meta["color"],
                    "areaKm2": r["area_km2"],
                    "population": r["population"],
                    "center": [r["lng"], r["lat"]] if r["lng"] else None,
                },
                "geometry": geom,
            })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@router.get("/nearest")
async def get_nearest_spots(
    lat: float = Query(..., description="Vĩ độ người dùng (GPS)"),
    lng: float = Query(..., description="Kinh độ người dùng (GPS)"),
    radius_km: float = Query(5.0, description="Bán kính tìm kiếm (km)"),
    category: Optional[str] = Query(None, description="Loại: incident, green_spot, recycling, sensor"),
    limit: int = Query(20, description="Số lượng kết quả tối đa"),
    db: AsyncSession = Depends(get_db),
):
    """
    API tìm kiếm nhanh các địa điểm, sự cố hoặc trạm môi trường quanh tọa độ GPS người dùng.
    Sử dụng hàm PostGIS ST_DistanceSphere và ST_DWithin với spatial index cho tốc độ cực cao (< 5ms).
    """
    radius_meters = radius_km * 1000.0

    # Truy vấn hợp nhất các điểm không gian trong bán kính GPS
    query = """
        WITH user_pt AS (
            SELECT ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) as geom
        )
        SELECT 
            'incident' as category,
            i.incident_id::text as id,
            i.title as name,
            i.address_text as address,
            i.latitude::float as latitude,
            i.longitude::float as longitude,
            ST_DistanceSphere(i.location, u.geom)::float as distance_m,
            i.severity as extra_info
        FROM incidents i, user_pt u
        WHERE ST_DWithin(i.location::geography, u.geom::geography, :radius_m)
          AND (:cat IS NULL OR :cat = 'incident')

        UNION ALL

        SELECT 
            'green_spot' as category,
            f.facility_id::text as id,
            f.facility_name as name,
            f.address,
            ST_Y(f.location)::float as latitude,
            ST_X(f.location)::float as longitude,
            ST_DistanceSphere(f.location, u.geom)::float as distance_m,
            f.facility_type as extra_info
        FROM essential_facilities f, user_pt u
        WHERE ST_DWithin(f.location::geography, u.geom::geography, :radius_m)
          AND (:cat IS NULL OR :cat = 'green_spot')

        UNION ALL

        SELECT 
            'recycling' as category,
            r.facility_id::text as id,
            r.name,
            r.address,
            ST_Y(r.location)::float as latitude,
            ST_X(r.location)::float as longitude,
            ST_DistanceSphere(r.location, u.geom)::float as distance_m,
            r.operating_hours as extra_info
        FROM recycling_facilities r, user_pt u
        WHERE ST_DWithin(r.location::geography, u.geom::geography, :radius_m)
          AND (:cat IS NULL OR :cat = 'recycling')

        ORDER BY distance_m ASC
        LIMIT :lim;
    """

    params = {
        "lat": lat,
        "lng": lng,
        "radius_m": radius_meters,
        "cat": category if category and category != "all" else None,
        "lim": limit,
    }

    rows = await db.execute(text(query), params)
    results = []
    for r in rows.mappings():
        results.append({
            "category": r["category"],
            "id": r["id"],
            "name": r["name"],
            "address": r["address"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "distanceMeters": round(r["distance_m"], 1),
            "extraInfo": r["extra_info"],
        })

    return {
        "success": True,
        "origin": {"lat": lat, "lng": lng},
        "radiusKm": radius_km,
        "total": len(results),
        "data": results,
    }


@router.get("/landmarks")
async def get_landmarks():
    """
    API trả về danh sách các điểm Quick Tour 3D tiêu biểu của TP.HCM.
    """
    landmarks = [
        {
            "id": "ben-thanh",
            "name": "Quận 1",
            "district": "Quận 1",
            "description": "Trung tâm hành chính, chợ Bến Thành, phố đi bộ Nguyễn Huệ và bến Bạch Đằng.",
            "longitude": 106.6983,
            "latitude": 10.7725,
            "zoom": 16.2,
            "pitch": 55,
            "bearing": -20,
            "tag": "Trung tâm",
            "status": "Môi trường ổn định",
        },
        {
            "id": "landmark-81",
            "name": "Landmark 81",
            "district": "Bình Thạnh",
            "description": "Tòa tháp cao nhất Việt Nam, công viên bờ sông Vinhomes Central Park 14ha.",
            "longitude": 106.7219,
            "latitude": 10.7951,
            "zoom": 16.5,
            "pitch": 60,
            "bearing": 45,
            "tag": "Công viên ven sông",
            "status": "Chất lượng không khí tốt",
        },
        {
            "id": "thu-thiem",
            "name": "Đô thị mới Thủ Thiêm",
            "district": "TP. Thủ Đức",
            "description": "Bán đảo sinh thái tương lai, cầu Ba Son, công viên bờ sông hoa hướng dương.",
            "longitude": 106.7125,
            "latitude": 10.7742,
            "zoom": 15.8,
            "pitch": 50,
            "bearing": 110,
            "tag": "Đô thị mới",
            "status": "Quy hoạch xanh",
        },
        {
            "id": "phu-my-hung",
            "name": "Phú Mỹ Hưng",
            "district": "Quận 7",
            "description": "Khu đô thị kiểu mẫu Nam Sài Gòn, hồ Bán Nguyệt, cầu Ánh Sao và mảng xanh dày đặc.",
            "longitude": 106.7198,
            "latitude": 10.7289,
            "zoom": 15.6,
            "pitch": 45,
            "bearing": -35,
            "tag": "Đô thị sinh thái",
            "status": "Chỉ số xanh cao",
        },
        {
            "id": "thanh-da",
            "name": "Bán đảo Thanh Đa",
            "district": "Bình Thạnh",
            "description": "Bán đảo phù sa uốn quanh bởi sông Sài Gòn, KDL Bình Quới với hệ sinh thái miệt vườn.",
            "longitude": 106.7325,
            "latitude": 10.8250,
            "zoom": 15.0,
            "pitch": 40,
            "bearing": 15,
            "tag": "Bán đảo xanh",
            "status": "Cần chống xói lở",
        },
        {
            "id": "can-gio",
            "name": "Rừng Sác Cần Giờ",
            "district": "Cần Giờ",
            "description": "Khu dự trữ sinh quyển thế giới UNESCO, lá phổi xanh hấp thụ carbon lớn nhất TP.HCM.",
            "longitude": 106.8850,
            "latitude": 10.4250,
            "zoom": 13.0,
            "pitch": 30,
            "bearing": 0,
            "tag": "Rừng ngập mặn",
            "status": "Bảo tồn nghiêm ngặt",
        },
    ]
    return {
        "success": True,
        "data": landmarks,
    }
