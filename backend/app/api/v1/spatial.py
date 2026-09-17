from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.spatial_service import SpatialService
from app.schemas.spatial import NearestResponse, LandmarksResponse

router = APIRouter(prefix="/spatial", tags=["Spatial & WebGIS"])


@router.get("/districts")
async def get_district_boundaries(db: AsyncSession = Depends(get_db)):
    """
    API trả về GeoJSON FeatureCollection ranh giới các quận/huyện TP.HCM.
    Đã chuẩn hóa: Gọi qua SpatialService và SpatialCRUD (không viết SQL trong API).
    """
    return await SpatialService.get_district_boundaries_geojson(db)


@router.get("/nearest", response_model=NearestResponse)
async def get_nearest_spots(
    lat: float = Query(..., description="Vĩ độ người dùng (GPS)"),
    lng: float = Query(..., description="Kinh độ người dùng (GPS)"),
    radius_km: float = Query(5.0, description="Bán kính tìm kiếm (km)"),
    category: Optional[str] = Query(None, description="Loại: incident, green_spot, recycling, sensor"),
    limit: int = Query(20, description="Số lượng kết quả tối đa"),
    db: AsyncSession = Depends(get_db),
):
    """
    API tìm kiếm nhanh các địa điểm quanh tọa độ GPS người dùng.
    Gọi qua SpatialService và PostGIS spatial index.
    """
    return await SpatialService.get_nearest_spots_service(
        db=db,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        category=category,
        limit=limit,
    )


@router.get("/landmarks", response_model=LandmarksResponse)
async def get_landmarks():
    """
    API trả về danh sách các điểm Quick Tour 3D tiêu biểu của TP.HCM.
    """
    return SpatialService.get_landmarks_service()
