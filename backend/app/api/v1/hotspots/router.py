"""
API Router cho STT 44: Phân tích điểm nóng + dự báo 7 ngày
(Spatial Hotspot Analytics & 7-Day Forecasting)
Tuân thủ Clean Architecture, RBAC Guard, Dependency Injection.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.crud.hotspots.hotspot_repository import HotspotRepository
from app.services.hotspots.hotspot_service import HotspotService
from app.schemas.hotspots.schemas import (
    HotspotFilterRequest,
    HotspotMapResponse,
    AreaOptionItem,
    ForecastResponse,
    ExportReportRequest,
    ExportReportResponse,
    HotspotDetailResponse,
)
from app.utils.security import decode_access_token

router = APIRouter(prefix="/hotspots", tags=["Hotspot Spatial Analytics & 7-Day Forecast (STT 44)"])


def get_hotspot_service() -> HotspotService:
    repo = HotspotRepository()
    return HotspotService(repo)


def verify_hotspot_access(authorization: Optional[str] = Header(None)):
    """Kiểm tra phân quyền: Cán bộ quản lý môi trường, Chuyên viên phân tích dữ liệu đô thị, Quản trị viên"""
    if not authorization:
        return None

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        payload = decode_access_token(token)
        if not payload:
            return None
        role = payload.get("role")
        permissions = payload.get("permissions", [])

        allowed_roles = {"ADMIN", "OFFICER", "COORDINATOR", "DISTRICT_MANAGER", "ANALYST"}
        has_perm = "STATISTICS" in permissions or "INCIDENTS" in permissions

        if role not in allowed_roles and not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ Cán bộ quản lý môi trường và Chuyên viên phân tích mới có quyền truy cập chức năng này.",
            )
        return payload
    except HTTPException:
        raise
    except Exception:
        return None


@router.get("/map", response_model=HotspotMapResponse)
async def get_hotspot_map(
    incident_type: Optional[str] = Query("ALL", description="Phân loại sự cố: ALL, SPONTANEOUS_DUMP, FLOODING, WATER_POLLUTION, AIR_POLLUTION"),
    time_range: Optional[str] = Query("30_DAYS", description="Khung thời gian: 7_DAYS, 30_DAYS, THIS_QUARTER, CUSTOM"),
    start_date: Optional[str] = Query(None, description="Ngày bắt đầu (nếu chọn CUSTOM)"),
    end_date: Optional[str] = Query(None, description="Ngày kết thúc (nếu chọn CUSTOM)"),
    db: AsyncSession = Depends(get_db),
    service: HotspotService = Depends(get_hotspot_service),
    current_user: Optional[dict] = Depends(verify_hotspot_access),
):
    """
    Màn 1/3: Bản đồ phân tích cụm điểm nóng KDE và Top 5 điểm nóng đô thị
    """
    req = HotspotFilterRequest(
        incident_type=incident_type,
        time_range=time_range,
        start_date=start_date,
        end_date=end_date,
    )
    return await service.get_hotspot_map(db, req)


@router.get("/areas", response_model=List[AreaOptionItem])
async def get_available_areas(
    db: AsyncSession = Depends(get_db),
    service: HotspotService = Depends(get_hotspot_service),
    current_user: Optional[dict] = Depends(verify_hotspot_access),
):
    """
    Màn 2/3: Danh sách Quận/Huyện và Điểm nóng cho combobox lựa chọn khu vực dự báo
    """
    return await service.get_available_areas(db)


@router.get("/forecast", response_model=ForecastResponse)
async def get_7day_forecast(
    target_id: Optional[str] = Query("dist-q8", description="Mã Quận/Huyện hoặc Điểm nóng"),
    target_type: Optional[str] = Query("DISTRICT", description="DISTRICT hoặc HOTSPOT"),
    db: AsyncSession = Depends(get_db),
    service: HotspotService = Depends(get_hotspot_service),
    current_user: Optional[dict] = Depends(verify_hotspot_access),
):
    """
    Màn 2/3: Dự báo xu hướng 7 ngày tới kèm khoảng tin cậy 95% và phân tích ngày nguy cơ cao nhất
    """
    return await service.get_7day_forecast(db, target_id=target_id or "dist-q8", target_type=target_type or "DISTRICT")


@router.post("/forecast/export", response_model=ExportReportResponse)
async def export_forecast_report(
    req: ExportReportRequest,
    db: AsyncSession = Depends(get_db),
    service: HotspotService = Depends(get_hotspot_service),
    current_user: Optional[dict] = Depends(verify_hotspot_access),
):
    """
    Màn 2/3: Kích hoạt xuất báo cáo dự báo 7 ngày (PDF / Excel)
    """
    return await service.export_forecast_report(db, req)


@router.get("/{hotspot_id}", response_model=HotspotDetailResponse)
async def get_hotspot_detail(
    hotspot_id: str,
    db: AsyncSession = Depends(get_db),
    service: HotspotService = Depends(get_hotspot_service),
    current_user: Optional[dict] = Depends(verify_hotspot_access),
):
    """
    Màn 3/3: Xem chi tiết điểm nóng, kiểm tra lệnh điều phối đang thực thi và dữ liệu điền sẵn STT 43
    """
    return await service.get_hotspot_detail(db, hotspot_id)
