from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.eco_service import EcoService
from app.schemas.eco_locations import EcoLocationsResponse

router = APIRouter(prefix="/eco-locations", tags=["Eco Locations"])


@router.get("", response_model=EcoLocationsResponse)
async def get_eco_locations(
    category: Optional[str] = Query(None, description="Lọc theo loại: incident, green_spot, recycling, sensor"),
    district: Optional[str] = Query(None, description="Lọc theo quận/huyện"),
    lat: Optional[float] = Query(None, description="Vĩ độ người dùng (GPS)"),
    lng: Optional[float] = Query(None, description="Kinh độ người dùng (GPS)"),
    db: AsyncSession = Depends(get_db),
):
    """
    API tải danh sách các địa điểm môi trường TP.HCM.
    Đã chuẩn hóa: Gọi qua EcoService và EcoCRUD (không viết SQL trong API).
    """
    return await EcoService.get_eco_locations(
        db=db,
        category=category,
        district=district,
        lat=lat,
        lng=lng,
    )
