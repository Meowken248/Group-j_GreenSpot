from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database import get_db
from app.models.rbac import User
from app.models.spatial import AdministrativeUnit
from app.api.v1.rbac import require_admin_user
from app.schemas.recycling_facility import (
    RecyclingFacilityItem,
    RecyclingFacilityCreateRequest,
    RecyclingFacilityUpdateRequest,
    RecyclingFacilityListResponse,
    FacilityValidationCheckResponse,
)
from app.services.recycling_facility_service import (
    list_facilities,
    get_facility_by_id,
    create_facility,
    update_facility,
    delete_facility,
    check_name_unique,
    check_proximity,
)

router = APIRouter(prefix="/recycling-facilities", tags=["Recycling Facilities Management"])


@router.get("", response_model=RecyclingFacilityListResponse)
async def get_all_facilities(
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng mục trên mỗi trang"),
    status: str = Query("ALL", description="Lọc trạng thái: ALL, ACTIVE, INACTIVE"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo mã hoặc tên trạm"),
    unit_id: Optional[int] = Query(None, description="Lọc theo quận/huyện"),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 1: Lấy danh sách trạm tái chế và điểm tiếp nhận rác phân trang.
    Chỉ Quản trị viên (Admin) mới có quyền truy cập.
    """
    return await list_facilities(
        db=db,
        page=page,
        limit=limit,
        status_filter=status,
        search=search,
        unit_id=unit_id,
    )


@router.get("/districts/list")
async def get_hcmc_districts(
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách các quận/huyện TP.HCM phục vụ dropdown chọn quận"""
    stmt = (
        select(AdministrativeUnit.unit_id, AdministrativeUnit.name, AdministrativeUnit.unit_code)
        .where(AdministrativeUnit.level == "DISTRICT")
        .order_by(AdministrativeUnit.name.asc())
    )
    res = await db.execute(stmt)
    return [
        {
            "unit_id": r[0],
            "unit_name": r[1],
            "name": r[1],
            "unit_code": r[2],
        }
        for r in res.fetchall()
    ]


@router.get("/validate/check-name", response_model=FacilityValidationCheckResponse)
async def validate_facility_name(
    name: str = Query(..., description="Tên trạm cần kiểm tra"),
    unit_id: int = Query(..., description="ID quận/huyện"),
    exclude_id: Optional[int] = Query(None, description="ID trạm loại trừ khi sửa"),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Kiểm tra tên trạm có duy nhất trong cùng quận/huyện hay không"""
    return await check_name_unique(db=db, name=name, unit_id=unit_id, exclude_id=exclude_id)


@router.get("/validate/check-proximity", response_model=FacilityValidationCheckResponse)
async def validate_facility_proximity(
    lat: float = Query(..., description="Vĩ độ WGS84"),
    lng: float = Query(..., description="Kinh độ WGS84"),
    exclude_id: Optional[int] = Query(None, description="ID trạm loại trừ khi sửa"),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Kiểm tra toạ độ trong TP.HCM và bán kính 20m không bị trùng trạm khác"""
    return await check_proximity(db=db, lat=lat, lng=lng, exclude_id=exclude_id)


@router.get("/{facility_id}", response_model=RecyclingFacilityItem)
async def get_facility_detail(
    facility_id: int,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Màn 3: Lấy chi tiết thông tin trạm tái chế để điền sẵn vào form sửa"""
    return await get_facility_by_id(db=db, facility_id=facility_id)


@router.post("", response_model=RecyclingFacilityItem, status_code=status.HTTP_201_CREATED)
async def create_new_facility(
    req: RecyclingFacilityCreateRequest,
    request: Request,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 2: Thêm mới trạm tái chế & điểm tiếp nhận.
    Tự động sinh mã trạm và mã QR, ghi nhận vào Nhật ký kiểm toán (Audit Log).
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await create_facility(
        db=db,
        user=current_admin,
        req=req,
        client_ip=client_ip,
        user_agent=user_agent,
    )


@router.put("/{facility_id}", response_model=RecyclingFacilityItem)
async def update_existing_facility(
    facility_id: int,
    req: RecyclingFacilityUpdateRequest,
    request: Request,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 3: Cập nhật thông tin trạm tái chế.
    Mã trạm và mã QR giữ nguyên 100%, ghi nhận vào Nhật ký kiểm toán (Audit Log).
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await update_facility(
        db=db,
        user=current_admin,
        facility_id=facility_id,
        req=req,
        client_ip=client_ip,
        user_agent=user_agent,
    )


@router.delete("/{facility_id}")
async def delete_existing_facility(
    facility_id: int,
    request: Request,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 4 & Màn 5: Xóa mềm trạm tái chế.
    Trạm ẩn khỏi bản đồ công dân, mã QR vô hiệu hóa nhưng bảo toàn lịch sử quét điểm thưởng.
    Tự động ghi nhận vào Nhật ký kiểm toán (Audit Log).
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await delete_facility(
        db=db,
        user=current_admin,
        facility_id=facility_id,
        client_ip=client_ip,
        user_agent=user_agent,
    )

