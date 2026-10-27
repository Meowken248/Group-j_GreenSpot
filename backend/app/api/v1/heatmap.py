"""
GreenSpot API Router - Bản đồ nhiệt môi trường và khí hậu đa chế độ: AQI, nhiệt độ, điểm số rủi ro (Chức năng 33)
Endpoints:
- GET /api/v1/map/heatmap-data?mode=AQI|TEMPERATURE|RISK
- GET /api/v1/map/heatmap-data/zone/{district_code}
"""

from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.heatmap_service import HeatmapService
from app.schemas.heatmap import (
    MultiModeHeatmapResponse,
    DistrictZoneDetail,
)

router = APIRouter(prefix="/map/heatmap-data", tags=["Bản đồ nhiệt môi trường & khí hậu (33)"])

@router.get("", response_model=MultiModeHeatmapResponse, summary="Dữ liệu bản đồ nhiệt đa chế độ (AQI, Nhiệt độ, Điểm rủi ro)")
async def get_heatmap_data(
    mode: str = Query("AQI", description="Chế độ hiển thị bản đồ nhiệt: AQI | TEMPERATURE | RISK"),
    db: AsyncSession = Depends(get_db),
):
    return await HeatmapService.get_heatmap_data(db, mode)

@router.get("/zone/{district_code}", response_model=DistrictZoneDetail, summary="Chi tiết 4 thông số môi trường của một quận/huyện")
async def get_zone_detail(
    district_code: str = Path(..., description="Mã định danh quận/huyện, ví dụ: QUAN_1, BINH_THANH"),
    db: AsyncSession = Depends(get_db),
):
    return await HeatmapService.get_zone_detail(db, district_code)
