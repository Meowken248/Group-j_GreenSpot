"""
API Router cho STT 43: Trung tâm điều phối tác nghiệp và phân công lệnh xử lý hiện trường
(Operations Dispatch Center)
Tuân thủ bảo vệ RBAC, Dependency Injection qua FastAPI Depends.
"""

from typing import Optional, List
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from app.core.localization import get_current_language
from app.services.translation.translation_service import translation_service
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
    UpdateTeamLocationRequest,
)

from app.api.v1.rbac import require_roles_or_permission
from app.models.rbac import User

router = APIRouter(prefix="/dispatch", tags=["Operations Dispatch Center (STT 43)"])


# Dependency Inversion: Khởi tạo service với repository
def get_dispatch_service() -> DispatchService:
    repo = DispatchRepository()
    return DispatchService(repo)


DISPATCH_VIEW_ROLES = {"ADMIN", "OFFICER", "COORDINATOR", "DISTRICT_MANAGER", "RESPONDER"}
DISPATCH_COMMAND_ROLES = {"ADMIN", "OFFICER", "COORDINATOR", "DISTRICT_MANAGER"}

verify_dispatch_access = require_roles_or_permission(
    allowed_roles=DISPATCH_VIEW_ROLES,
    module="DISPATCH_TASKS",
    action="VIEW",
    deny_message="Chỉ Quản trị viên, Cán bộ điều phối và Đội phản ứng tác nghiệp mới có quyền truy cập chức năng này.",
)

verify_dispatch_command_access = require_roles_or_permission(
    allowed_roles=DISPATCH_COMMAND_ROLES,
    module="DISPATCH_TASKS",
    action="UPDATE",
    deny_message="Chỉ Quản trị viên và Cán bộ điều phối tác nghiệp mới có quyền lập, chỉnh sửa, huỷ hoặc đóng lệnh.",
)


@router.get("/orders", response_model=DispatchListResponse)
async def get_dispatch_orders(
    request: Request,
    status: Optional[str] = Query("ALL", description="Lọc trạng thái: ALL, ASSIGNED, EN_ROUTE, IN_PROGRESS, COMPLETED, CANCELLED"),
    team_id: Optional[str] = Query("ALL", description="Lọc theo đội cơ động"),
    district: Optional[str] = Query("ALL", description="Lọc theo quận/huyện"),
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 1/6: Bảng dữ liệu tổng hợp các lệnh xử lý hiện trường kèm bộ lọc"""
    filters = DispatchListFilter(status=status, team_id=team_id, district=district)
    result = await service.get_dispatch_orders(db, filters)
    lang = get_current_language(request)
    if lang == "en":
        result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
        translated = await translation_service.translate_data(result_dict, target_lang="en", source_lang="vi")
        return translated
    return result


@router.get("/incidents", response_model=List[IncidentComboboxItem])
async def get_available_incidents(
    request: Request,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 2/6: Danh sách sự cố chưa phân công sẵn sàng để điều phối"""
    result = await service.get_available_incidents(db)
    lang = get_current_language(request)
    if lang == "en":
        if isinstance(result, list):
            result_dict = [item.model_dump() if hasattr(item, 'model_dump') else item for item in result]
        else:
            result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
        translated = await translation_service.translate_data(result_dict, target_lang="en", source_lang="vi")
        return translated
    return result


@router.get("/teams", response_model=List[TeamOptionItem])
async def get_response_teams(
    request: Request,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Danh sách các đội phản ứng cơ động hiện trường kèm cự ly & trạng thái"""
    result = await service.get_response_teams(db)
    lang = get_current_language(request)
    if lang == "en":
        if isinstance(result, list):
            result_dict = [item.model_dump() if hasattr(item, 'model_dump') else item for item in result]
        else:
            result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
        translated = await translation_service.translate_data(result_dict, target_lang="en", source_lang="vi")
        return translated
    return result


@router.post("/orders", response_model=DispatchActionResult)
async def create_dispatch_order(
    request: CreateDispatchOrderRequest,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: User = Depends(verify_dispatch_command_access),
):
    """Màn 2/6: Khởi tạo và giao lệnh điều động tác nghiệp mới"""
    return await service.create_dispatch_order(db, request)


@router.put("/orders/{order_id}", response_model=DispatchActionResult)
async def edit_dispatch_order(
    order_id: uuid.UUID,
    request: EditDispatchOrderRequest,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: User = Depends(verify_dispatch_command_access),
):
    """Màn 3/6: Điều chỉnh đội cơ động hoặc gia hạn thời gian lệnh"""
    return await service.edit_dispatch_order(db, order_id, request)


@router.post("/orders/{order_id}/cancel", response_model=DispatchActionResult)
async def cancel_dispatch_order(
    order_id: uuid.UUID,
    request: CancelDispatchOrderRequest,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: User = Depends(verify_dispatch_command_access),
):
    """Màn 4/6 & 5/6: Thu hồi và huỷ bỏ lệnh điều phối kèm lý do giải trình"""
    return await service.cancel_dispatch_order(db, order_id, request)


@router.post("/orders/{order_id}/close", response_model=DispatchActionResult)
async def close_dispatch_order(
    order_id: uuid.UUID,
    request: CloseDispatchOrderRequest,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: User = Depends(verify_dispatch_command_access),
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


@router.post("/orders/{order_id}/gps", response_model=DispatchActionResult)
async def update_team_location(
    order_id: uuid.UUID,
    request: UpdateTeamLocationRequest,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 6/6: Cập nhật tọa độ định vị GPS của đội hiện trường đang di chuyển"""
    return await service.update_team_location(db, order_id, request)


@router.post("/orders/{order_id}/accept", response_model=DispatchActionResult)
async def accept_dispatch_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 6/6: Đội phản ứng hiện trường xác nhận tiếp nhận lệnh điều phối"""
    return await service.accept_dispatch_order(db, order_id)


@router.post("/orders/{order_id}/arrive", response_model=DispatchActionResult)
async def arrive_dispatch_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    service: DispatchService = Depends(get_dispatch_service),
    _user: Optional[dict] = Depends(verify_dispatch_access),
):
    """Màn 6/6: Đội phản ứng hiện trường xác nhận đã đến nơi sự cố"""
    return await service.arrive_dispatch_order(db, order_id)


