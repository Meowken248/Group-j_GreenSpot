"""
API Router cho STT 43: Trung tâm điều phối tác nghiệp và phân công lệnh xử lý hiện trường
(Operations Dispatch Center)
Tuân thủ bảo vệ RBAC, Dependency Injection qua FastAPI Depends.
"""

from typing import Optional, List
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.crud.dispatch.dispatch_repository import DispatchRepository
from app.services.dispatch.dispatch_service import DispatchService
from app.schemas.dispatch.schemas import (
    DispatchListFilter,
    DispatchListResponse,
    IncidentComboboxItem,
    TeamOptionItem,
    CreateDispatchOrderRequest,
    EditDispatchOrderRequest,
    CancelDispatchOrderRequest,
    CloseDispatchOrderRequest,
    FieldTrackingResponse,
    DispatchActionResult,
)
from app.utils.auth_middleware import get_current_user_optional

router = APIRouter(prefix="/dispatch", tags=["Operations Dispatch Center (STT 43)"])

# Dependency Inversion: Khởi tạo service với repository
def get_dispatch_service() -> DispatchService:
    repo = DispatchRepository()
    return DispatchService(repo)


def verify_dispatch_access(current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Kiểm tra phân quyền: Chỉ Quản trị viên, Cán bộ điều phối, Cán bộ quận được thao tác"""
    if not current_user:
        return None

    role = current_user.get("role")
    permissions = current_user.get("permissions", [])

    allowed_roles = {"ADMIN", "OFFICER", "COORDINATOR", "DISTRICT_MANAGER"}
    has_perm = "INCIDENTS" in permissions or "STATISTICS" in permissions

    if role not in allowed_roles and not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên và Cán bộ điều phối tác nghiệp mới có quyền truy cập chức năng này.",
        )
    return current_user


@router.get("/orders", response_model=DispatchListResponse)
async def get_dispatch_orders(
    status: Optional[str] = Query("ALL", description="Lọc trạng thái: ALL, ASSIGNED, EN_ROUTE, IN_PROGRESS, COMPLETED, CANCELLED"),
    team_id: Optional[str] = Query("ALL", description="Lọc theo đội cơ động"),
    district: Optional[str] = Query("ALL", description="Lọc theo quận/huyện"),
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 1/6: Bảng dữ liệu tổng hợp các lệnh xử lý hiện trường kèm bộ lọc"""
    filters = DispatchListFilter(status=status, team_id=team_id, district=district)
    return await service.get_dispatch_orders(db, filters)


@router.get("/incidents", response_model=List[IncidentComboboxItem])
async def get_available_incidents(
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 2/6: Danh sách sự cố chưa phân công sẵn sàng để điều phối"""
    return await service.get_available_incidents(db)


@router.get("/teams", response_model=List[TeamOptionItem])
async def get_response_teams(
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Danh sách các đội phản ứng cơ động hiện trường kèm cự ly & trạng thái"""
    return await service.get_response_teams(db)


@router.post("/orders", response_model=DispatchActionResult)
async def create_dispatch_order(
    request: CreateDispatchOrderRequest,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 2/6: Khởi tạo và giao lệnh điều động tác nghiệp mới"""
    return await service.create_dispatch_order(db, request)


@router.put("/orders/{order_id}", response_model=DispatchActionResult)
async def edit_dispatch_order(
    order_id: uuid.UUID,
    request: EditDispatchOrderRequest,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 3/6: Điều chỉnh đội cơ động hoặc gia hạn thời gian lệnh"""
    return await service.edit_dispatch_order(db, order_id, request)


@router.post("/orders/{order_id}/cancel", response_model=DispatchActionResult)
async def cancel_dispatch_order(
    order_id: uuid.UUID,
    request: CancelDispatchOrderRequest,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 4/6 & 5/6: Thu hồi và huỷ bỏ lệnh điều phối kèm lý do giải trình"""
    return await service.cancel_dispatch_order(db, order_id, request)


@router.post("/orders/{order_id}/close", response_model=DispatchActionResult)
async def close_dispatch_order(
    order_id: uuid.UUID,
    request: CloseDispatchOrderRequest,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 6/6: Nghiệm thu và đóng lệnh xử lý hiện trường"""
    return await service.close_dispatch_order(db, order_id, request)


@router.get("/orders/{order_id}/tracking", response_model=FieldTrackingResponse)
async def get_field_tracking_data(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 6/6: Dữ liệu giám sát thực địa theo thời gian thực (GPS, lộ trình, stepper, ảnh)"""
    return await service.get_field_tracking_data(db, order_id)
