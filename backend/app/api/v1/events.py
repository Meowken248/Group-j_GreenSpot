"""
Router API cho Chức năng 21: Sự kiện và chiến dịch Chủ Nhật Xanh
Tài liệu căn cứ: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 169 - 177)
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Header, status

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.api.v1.rbac import get_current_active_user as get_current_user, require_permission
from app.api.v1.auth import decode_access_token
from app.models.rbac import User
from app.schemas.event import (
    EventCreate,
    EventResponse,
    EventListResponse,
    EventUpdate,
    ParticipantItem,
    CheckinRequest,
    CheckinResponse,
    EventReviewRequest,
)
from app.services.event_service import EventService


router = APIRouter(prefix="/events", tags=["Green Sunday Events - Feature 21"])


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Dependency lấy người dùng hiện tại nếu có token (không bắt buộc)"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id_str = payload.get("sub")
    if not user_id_str:
        return None
    try:
        u_uuid = uuid.UUID(user_id_str)
        res = await db.execute(select(User).where(User.user_id == u_uuid, User.deleted_at.is_(None)))
        return res.scalar_one_or_none()
    except Exception:
        return None


@router.get(
    "",
    response_model=EventListResponse,
    summary="Lấy danh sách sự kiện Chủ Nhật Xanh kèm bộ lọc (Màn 1/4)",
)
async def list_events(
    district: Optional[str] = Query(None, description="Lọc theo 22 quận/huyện TP.HCM"),
    time_filter: Optional[str] = Query("upcoming", description="upcoming, this_week, past, all"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tiêu đề hoặc địa chỉ sự kiện"),
    my_events: bool = Query(False, description="Lọc sự kiện của tôi (do tôi tạo hoặc tham gia)"),
    status: Optional[str] = Query(
        None, description="Lọc theo trạng thái (chỉ Quản trị viên được xem PENDING/REJECTED)"
    ),
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(12, ge=1, le=50, description="Số mục mỗi trang"),
    db: AsyncSession = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user),
):
    service = EventService(db)
    current_user_id = optional_user.user_id if optional_user else None
    is_admin = await service.is_admin(current_user_id)
    return await service.list_events(
        current_user_id=current_user_id,
        district=district,
        time_filter=time_filter,
        search=search,
        my_events=my_events,
        page=page,
        page_size=page_size,
        status_filter=status,
        is_admin=is_admin,
    )



@router.post(
    "",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo sự kiện Chủ Nhật Xanh mới (Màn 2/4)",
)
async def create_event(
    data: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = EventService(db)
    return await service.create_event(current_user.user_id, data)


@router.patch(
    "/{event_id}",
    response_model=EventResponse,
    summary="Người tổ chức chỉnh sửa sự kiện (Màn 3/4, optimistic locking)",
)
async def update_event(
    event_id: uuid.UUID,
    data: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = EventService(db)
    return await service.update_event(event_id, current_user.user_id, data)



@router.get(
    "/{event_id}",
    response_model=EventResponse,
    summary="Xem chi tiết sự kiện và trạng thái tương tác (Màn 3/4)",
)
async def get_event_detail(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user),
):
    service = EventService(db)
    current_user_id = optional_user.user_id if optional_user else None
    return await service.get_event_detail(event_id, current_user_id=current_user_id)


@router.get(
    "/{event_id}/participants",
    response_model=List[ParticipantItem],
    summary="Lấy toàn bộ danh sách người tham gia sự kiện (Màn 3/4)",
)
async def get_event_participants(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user),
):
    service = EventService(db)
    return await service.get_event_participants(
        event_id, viewer_id=optional_user.user_id if optional_user else None
    )



@router.post(
    "/{event_id}/interest",
    summary="Toggle đánh dấu Quan tâm sự kiện (Màn 3/4)",
)
async def toggle_interest(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = EventService(db)
    return await service.toggle_interest(event_id, current_user.user_id)


@router.post(
    "/{event_id}/join",
    summary="Toggle Đăng ký tham gia / Hủy tham gia sự kiện (Màn 3/4)",
)
async def toggle_join(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = EventService(db)
    return await service.toggle_join(event_id, current_user.user_id)


@router.post(
    "/{event_id}/checkin",
    response_model=CheckinResponse,
    summary="Gửi tọa độ GPS Check-in tại hiện trường & Nhận +50 GP (Màn 4/4)",
)
async def checkin_event(
    event_id: uuid.UUID,
    req: CheckinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = EventService(db)
    return await service.checkin_event(event_id, current_user.user_id, req)


@router.patch(
    "/{event_id}/review",
    response_model=EventResponse,
    summary="Quản trị viên phê duyệt hoặc từ chối sự kiện",
)
async def review_event(
    event_id: uuid.UUID,
    data: EventReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("CAMPAIGNS", "UPDATE")),
):
    # Phân quyền theo RBAC: ADMIN luôn được bypass; các vai trò khác cần quyền
    # CAMPAIGNS:UPDATE mới được phê duyệt sự kiện (không còn kiểm tra qua email).
    service = EventService(db)
    return await service.review_event(event_id, current_user.user_id, data)



@router.patch(
    "/{event_id}/cancel",
    summary="Hủy sự kiện (Người tạo hoặc Admin)",
)
async def cancel_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = EventService(db)
    return await service.cancel_event(event_id, current_user.user_id)
