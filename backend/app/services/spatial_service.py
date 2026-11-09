import json
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.spatial_crud import query_district_boundaries, query_nearest_spots

# Metadata quận/huyện & tỉnh thành
DISTRICT_META: Dict[str, Dict[str, Any]] = {
    # TP.HCM
    "760": {"id": "quan-1", "role": "Trung tâm Hành chính & Tài chính", "color": "#3b82f6", "greenIndex": "18.4%"},
    "769": {"id": "thu-duc", "role": "Đô thị Sáng tạo & Công nghệ Cao", "color": "#10b981", "greenIndex": "32.6%"},
    "778": {"id": "quan-7", "role": "Khu đô thị Kiểu mẫu Nam Sài Gòn", "color": "#8b5cf6", "greenIndex": "26.8%"},
    "765": {"id": "binh-thanh", "role": "Cửa ngõ Đông Bắc & Bán đảo Thanh Đa", "color": "#f59e0b", "greenIndex": "22.1%"},
    "787": {"id": "can-gio", "role": "Khu dự trữ sinh quyển thế giới", "color": "#059669", "greenIndex": "84.5%"},
    "79": {"id": "tp-hcm", "role": "Đại đô thị Kinh tế & Đổi mới sáng tạo phía Nam", "color": "#2563eb", "greenIndex": "28.5%"},
    # Hà Nội
    "01": {"id": "ha-noi", "role": "Thủ đô Ngàn năm Văn hiến & Trung tâm Chính trị", "color": "#dc2626", "greenIndex": "24.2%"},
    "001": {"id": "ba-dinh", "role": "Trung tâm Chính trị - Ba Đình", "color": "#ea580c", "greenIndex": "29.1%"},
    "002": {"id": "hoan-kiem", "role": "Trái tim Lịch sử & Phố cổ Hoàn Kiếm", "color": "#e11d48", "greenIndex": "21.5%"},
    "005": {"id": "cau-giay", "role": "Trung tâm Công nghệ & Giáo dục Cầu Giấy", "color": "#0284c7", "greenIndex": "23.0%"},
    # Đà Nẵng
    "48": {"id": "da-nang", "role": "Thành phố Đáng sống & Đô thị Biển Miền Trung", "color": "#06b6d4", "greenIndex": "36.4%"},
    "490": {"id": "hai-chau", "role": "Trung tâm Đô thị Hải Châu", "color": "#0891b2", "greenIndex": "25.8%"},
    "492": {"id": "son-tra", "role": "Khu Bảo tồn Sinh thái & Biển Sơn Trà", "color": "#10b981", "greenIndex": "62.3%"},
    # Hải Phòng & Quảng Ninh
    "31": {"id": "hai-phong", "role": "Thành phố Cảng & Đô thị Công nghiệp Hoa Phượng Đỏ", "color": "#d97706", "greenIndex": "27.0%"},
    "303": {"id": "hong-bang", "role": "Quận Trung tâm Cảng Hồng Bàng", "color": "#b45309", "greenIndex": "22.4%"},
    "22": {"id": "quang-ninh", "role": "Vùng Di sản Thiên nhiên Thế giới Vịnh Hạ Long", "color": "#0d9488", "greenIndex": "58.2%"},
    # Thừa Thiên Huế
    "46": {"id": "thua-thien-hue", "role": "Cố đô Di sản & Thành phố Festival Xanh", "color": "#9333ea", "greenIndex": "45.0%"},
    # Cần Thơ
    "92": {"id": "can-tho", "role": "Thủ phủ Miền Tây Đô thị Sông nước", "color": "#16a34a", "greenIndex": "34.8%"},
    "916": {"id": "ninh-kieu", "role": "Trung tâm Sầm uất Bến Ninh Kiều", "color": "#15803d", "greenIndex": "30.2%"},
    # Khánh Hòa & Lâm Đồng
    "56": {"id": "khanh-hoa", "role": "Đô thị Biển Nhiệt đới Vịnh Nha Trang", "color": "#0284c7", "greenIndex": "42.0%"},
    "68": {"id": "lam-dong", "role": "Cao nguyên Ngàn hoa & Khí hậu Ôn đới Đà Lạt", "color": "#047857", "greenIndex": "68.5%"},
    # Vũng Tàu, Bình Dương, Đồng Nai
    "77": {"id": "ba-ria-vung-tau", "role": "Đô thị Cảng biển & Du lịch Nghỉ dưỡng", "color": "#0369a1", "greenIndex": "38.2%"},
    "74": {"id": "binh-duong", "role": "Thủ phủ Công nghiệp Thông minh", "color": "#c026d3", "greenIndex": "26.5%"},
    "75": {"id": "dong-nai", "role": "Cửa ngõ Công nghiệp & Rừng Cát Tiên", "color": "#4f46e5", "greenIndex": "44.1%"},
}

DYNAMIC_COLORS = [
    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4",
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"
]

VIETNAM_LANDMARKS = [
    {
        "id": "hoan-kiem",
        "name": "Hồ Hoàn Kiếm",
        "district": "Quận Hoàn Kiếm, Hà Nội",
        "description": "Trái tim lịch sử ngàn năm văn hiến của thủ đô, Tháp Rùa và Đền Ngọc Sơn.",
        "longitude": 105.8524,
        "latitude": 21.0298,
        "zoom": 16.0,
        "pitch": 50,
        "bearing": 15,
        "tag": "Thủ đô Hà Nội",
        "status": "Môi trường văn hóa xanh",
    },
    {
        "id": "ha-long",
        "name": "Vịnh Hạ Long",
        "district": "TP. Hạ Long, Quảng Ninh",
        "description": "Di sản Thiên nhiên Thế giới UNESCO với hàng ngàn đảo đá vôi kỳ vĩ và hang động.",
        "longitude": 107.0734,
        "latitude": 20.9505,
        "zoom": 14.5,
        "pitch": 45,
        "bearing": -30,
        "tag": "Kỳ quan Thế giới",
        "status": "Bảo tồn biển nghiêm ngặt",
    },
    {
        "id": "kinh-thanh-hue",
        "name": "Kinh Thành Huế",
        "district": "TP. Huế, Thừa Thiên Huế",
        "description": "Quần thể di tích Cố đô Huế thơ mộng bên dòng sông Hương hiền hòa.",
        "longitude": 107.5795,
        "latitude": 16.4695,
        "zoom": 15.5,
        "pitch": 40,
        "bearing": 20,
        "tag": "Cố đô Di sản",
        "status": "Thành phố xanh du lịch",
    },
    {
        "id": "cau-rong",
        "name": "Cầu Rồng Sông Hàn",
        "district": "Hải Châu / Sơn Trà, Đà Nẵng",
        "description": "Biểu tượng năng động của thành phố đáng sống nhất Việt Nam, hướng ra biển Đông.",
        "longitude": 108.2275,
        "latitude": 16.0610,
        "zoom": 16.2,
        "pitch": 55,
        "bearing": 45,
        "tag": "Đô thị Biển",
        "status": "Không khí trong lành",
    },
    {
        "id": "ho-xuan-huong",
        "name": "Hồ Xuân Hương",
        "district": "TP. Đà Lạt, Lâm Đồng",
        "description": "Viên ngọc bích giữa lòng thành phố sương mù, rừng thông reo và đồi hoa nhiệt đới.",
        "longitude": 108.4450,
        "latitude": 11.9425,
        "zoom": 15.4,
        "pitch": 45,
        "bearing": -10,
        "tag": "Cao nguyên Xanh",
        "status": "Khí hậu ôn đới lý tưởng",
    },
    {
        "id": "ben-thanh",
        "name": "Quận 1 & Bến Bạch Đằng",
        "district": "Quận 1, TP.HCM",
        "description": "Trung tâm hành chính, chợ Bến Thành, phố đi bộ Nguyễn Huệ và bến tàu thủy ven sông.",
        "longitude": 106.6983,
        "latitude": 10.7725,
        "zoom": 16.2,
        "pitch": 55,
        "bearing": -20,
        "tag": "Trung tâm TP.HCM",
        "status": "Môi trường ổn định",
    },
    {
        "id": "landmark-81",
        "name": "Landmark 81 Central Park",
        "district": "Bình Thạnh, TP.HCM",
        "description": "Tòa tháp cao nhất Việt Nam, công viên bờ sông Vinhomes Central Park 14ha rợp bóng cây.",
        "longitude": 106.7219,
        "latitude": 10.7951,
        "zoom": 16.5,
        "pitch": 60,
        "bearing": 45,
        "tag": "Công viên ven sông",
        "status": "Chất lượng không khí tốt",
    },
    {
        "id": "cho-thu-duc",
        "name": "Chợ Thủ Đức",
        "district": "TP. Thủ Đức, TP.HCM",
        "description": "Khu vực trũng ngã 5 Chợ Thủ Đức: Võ Văn Ngân, Tô Ngọc Vân, Hồ Văn Tư, Dương Văn Cam.",
        "longitude": 106.7585,
        "latitude": 10.8506,
        "zoom": 16.5,
        "pitch": 45,
        "bearing": -10,
        "tag": "Điểm ngập úng",
        "status": "Đoạn đường ngập úng trọng điểm",
    },
    {
        "id": "can-gio",
        "name": "Rừng Sác Cần Giờ",
        "district": "Cần Giờ, TP.HCM",
        "description": "Khu dự trữ sinh quyển thế giới UNESCO, lá phổi xanh hấp thụ carbon lớn nhất Nam Bộ.",
        "longitude": 106.8850,
        "latitude": 10.4250,
        "zoom": 13.0,
        "pitch": 30,
        "bearing": 0,
        "tag": "Rừng ngập mặn",
        "status": "Bảo tồn nghiêm ngặt",
    },
    {
        "id": "ben-ninh-kieu",
        "name": "Bến Ninh Kiều Cần Thơ",
        "district": "Ninh Kiều, TP. Cần Thơ",
        "description": "Biểu tượng miền sông nước Cửu Long, ngắm dòng sông Hậu và cầu Cần Thơ hùng vĩ.",
        "longitude": 105.7890,
        "latitude": 10.0355,
        "zoom": 15.8,
        "pitch": 45,
        "bearing": 60,
        "tag": "Thủ phủ Miền Tây",
        "status": "Sinh thái sông nước",
    },
]


class SpatialService:
    @staticmethod
    async def get_district_boundaries_geojson(db: AsyncSession) -> Dict[str, Any]:
        """Lấy danh sách ranh giới quận/tỉnh và định dạng GeoJSON chuẩn."""
        rows = await query_district_boundaries(db)

        features: List[Dict[str, Any]] = []
        for r in rows:
            code = r["unit_code"]
            meta = DISTRICT_META.get(code)
            if not meta:
                color_idx = abs(hash(code)) % len(DYNAMIC_COLORS)
                meta = {
                    "id": f"unit-{code}",
                    "role": f"Đơn vị Hành chính {r['name']}",
                    "color": DYNAMIC_COLORS[color_idx],
                    "greenIndex": "30.0%",
                }

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

    @staticmethod
    async def get_nearest_spots_service(
        db: AsyncSession,
        lat: float,
        lng: float,
        radius_km: float = 5.0,
        category: Optional[str] = None,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Tìm các điểm xung quanh tọa độ GPS với PostGIS."""
        radius_meters = radius_km * 1000.0
        spots = await query_nearest_spots(
            db=db,
            lat=lat,
            lng=lng,
            radius_meters=radius_meters,
            category=category,
            limit=limit,
        )

        return {
            "success": True,
            "center": {"lat": lat, "lng": lng},
            "radius_km": radius_km,
            "total": len(spots),
            "data": spots,
        }

    @staticmethod
    def get_landmarks_service() -> Dict[str, Any]:
        """Danh sách danh lam thắng cảnh Quick Tour trên toàn quốc Việt Nam."""
        return {
            "success": True,
            "total": len(VIETNAM_LANDMARKS),
            "data": VIETNAM_LANDMARKS,
        }
