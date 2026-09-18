from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.flood import (
    FloodLevel,
    FloodPointResponse,
    FloodGeoJSONResponse,
    FloodGeoJSONFeature,
    FloodGeoJSONGeometry,
    FloodGeoJSONFeatureProperties,
)

router = APIRouter(prefix="/flood", tags=["Flood Monitoring"])


# ---------------------------------------------------------------------------
# DỮ LIỆU DEMO — thay bằng truy vấn FloodZoneMonitoring khi có DB thật
# ---------------------------------------------------------------------------
FLOOD_POINTS: list[FloodPointResponse] = [
    FloodPointResponse(
        id=1,
        road="Nguyễn Hữu Cảnh",
        district="Bình Thạnh",
        lat=10.79065,
        lng=106.71810,
        water_depth_cm=28,
        level="HIGH",
        source="Demo",
        description="Điểm dữ liệu minh họa cho giao diện.",
        updated_at="2026-09-18T13:40:00+07:00",
    ),
    FloodPointResponse(
        id=2,
        road="Quốc Hương",
        district="Thủ Đức",
        lat=10.80526,
        lng=106.73475,
        water_depth_cm=18,
        level="MEDIUM",
        source="Demo",
        description="Điểm dữ liệu minh họa cho giao diện.",
        updated_at="2026-09-18T13:35:00+07:00",
    ),
    FloodPointResponse(
        id=3,
        road="Huỳnh Tấn Phát",
        district="Quận 7",
        lat=10.73583,
        lng=106.72130,
        water_depth_cm=36,
        level="EMERGENCY",
        source="Demo",
        description="Điểm dữ liệu minh họa cho giao diện.",
        updated_at="2026-09-18T13:30:00+07:00",
    ),
    FloodPointResponse(
        id=4,
        road="Phan Huy Ích",
        district="Gò Vấp",
        lat=10.83775,
        lng=106.63576,
        water_depth_cm=10,
        level="LOW",
        source="Demo",
        description="Điểm dữ liệu minh họa cho giao diện.",
        updated_at="2026-09-18T13:15:00+07:00",
    ),
    FloodPointResponse(
        id=5,
        road="Lê Văn Lương",
        district="Nhà Bè",
        lat=10.70450,
        lng=106.70244,
        water_depth_cm=22,
        level="MEDIUM",
        source="Demo",
        description="Điểm dữ liệu minh họa cho giao diện.",
        updated_at="2026-09-18T13:10:00+07:00",
    ),
]


# ---------------------------------------------------------------------------
# ENDPOINTS
# ---------------------------------------------------------------------------


@router.get("-points", response_model=list[FloodPointResponse])
async def get_flood_points(
    level: Optional[FloodLevel] = Query(default=None),
    district: Optional[str] = Query(default=None),
):
    """Lấy danh sách các điểm ngập, có thể lọc theo mức độ hoặc quận/huyện."""
    result = FLOOD_POINTS

    if level:
        result = [item for item in result if item.level == level]

    if district:
        keyword = district.strip().lower()
        result = [item for item in result if keyword in item.district.lower()]

    return result


@router.get("-points/{point_id}", response_model=FloodPointResponse)
async def get_flood_point(point_id: int):
    """Lấy chi tiết một điểm ngập theo ID."""
    for item in FLOOD_POINTS:
        if item.id == point_id:
            return item
    raise HTTPException(status_code=404, detail="Không tìm thấy điểm ngập")


@router.get("-geojson", response_model=FloodGeoJSONResponse)
async def get_flood_geojson(
    level: Optional[FloodLevel] = Query(default=None),
):
    """Trả về dữ liệu GeoJSON FeatureCollection các điểm ngập cho hiển thị bản đồ."""
    items = FLOOD_POINTS
    if level:
        items = [item for item in items if item.level == level]

    features = [
        FloodGeoJSONFeature(
            geometry=FloodGeoJSONGeometry(coordinates=[item.lng, item.lat]),
            properties=FloodGeoJSONFeatureProperties(
                id=item.id,
                road=item.road,
                district=item.district,
                water_depth_cm=item.water_depth_cm,
                level=item.level,
                source=item.source,
                description=item.description,
                updated_at=item.updated_at,
            ),
        )
        for item in items
    ]

    return FloodGeoJSONResponse(features=features)
