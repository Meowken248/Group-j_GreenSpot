"""
Router API cho Chức năng 21: Sự kiện và chiến dịch Chủ Nhật Xanh
Tài liệu căn cứ: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 169 - 177)
"""

import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, Header, UploadFile, status

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import UPLOAD_DIR
from app.database import get_db
from app.api.v1.rbac import get_current_active_user as get_current_user, require_permission
from app.api.v1.auth import decode_access_token
from app.models.rbac import User
from app.schemas.event import (
    EventCoverUploadResponse,
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

ALLOWED_COVER_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024  # 5MB theo đặc tả Màn 2/4


@router.post(
    "/cover",
    response_model=EventCoverUploadResponse,
    summary="Tải lên ảnh bìa sự kiện (JPG/PNG, tối đa 5MB)",
)
async def upload_event_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Lưu ảnh bìa vào thư mục uploads/events và trả về URL tương đối."""
    original_name = file.filename or "cover"
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in ALLOWED_COVER_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh bìa phải có định dạng JPG hoặc PNG.",
        )

    content = await file.read()
    if len(content) > MAX_COVER_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh bìa vượt quá dung lượng cho phép 5MB.",
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp ảnh bìa rỗng, vui lòng chọn ảnh khác.",
        )

    folder = os.path.join(UPLOAD_DIR, "events")
    os.makedirs(folder, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(folder, unique_name), "wb") as out_file:
        out_file.write(content)

    return EventCoverUploadResponse(
        url=f"/uploads/events/{unique_name}",
        file_name=original_name,
        size_bytes=len(content),
    )



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
        None,
        description=(
            "Lọc theo trạng thái (chỉ Quản trị viên hoặc vai trò có quyền "
            "CAMPAIGNS:UPDATE được xem PENDING/REJECTED)"
        ),
    ),
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(12, ge=1, le=50, description="Số mục mỗi trang"),
    db: AsyncSession = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user),
):
    service = EventService(db)
    current_user_id = optional_user.user_id if optional_user else None
    can_review = await service.can_review(current_user_id)
    return await service.list_events(
        current_user_id=current_user_id,
        district=district,
        time_filter=time_filter,
        search=search,
        my_events=my_events,
        page=page,
        page_size=page_size,
        status_filter=status,
        can_review=can_review,
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
