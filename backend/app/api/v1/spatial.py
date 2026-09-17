import json
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db

router = APIRouter(prefix="/spatial", tags=["Spatial & WebGIS"])


@router.get("/districts")
async def get_district_boundaries(db: AsyncSession = Depends(get_db)):
    """
    API trả về GeoJSON FeatureCollection ranh giới các quận/huyện TP.HCM
    được lưu trữ trực tiếp dưới dạng PostGIS MultiPolygon trong PostgreSQL.
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
            ST_Y(u.centroid)::float as lat
        FROM administrative_units u
        WHERE u.boundary IS NOT NULL
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
        
        # Đếm số sự cố thuộc quận
        inc_count_query = text("SELECT count(*) FROM incidents WHERE unit_id = :uid")
        inc_count = await db.scalar(inc_count_query, {"uid": r["unit_id"]}) or 0

        geom = json.loads(r["geojson_geom"]) if r["geojson_geom"] else None
        if geom:
            features.append({
                "type": "Feature",
                "properties": {
                    "id": meta["id"],
                    "unitId": r["unit_id"],
                    "name": r["name"],
                    "role": meta["role"],
                    "incidents": inc_count,
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
