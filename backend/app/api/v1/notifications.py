import uuid
from typing import Tuple, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User, UserSession
from app.models.notification import Notification
from app.api.v1.auth import get_current_user_and_session
from app.schemas.notification import NotificationListResponse, NotificationItem

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def get_my_notifications(
    limit: int = Query(20, ge=1, le=100),
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách thông báo của người dùng hiện tại (mới nhất xếp trước)
    """
    user, _ = auth_data

    # Đếm tổng số thông báo chưa đọc
    unread_stmt = select(func.count(Notification.notification_id)).where(
        Notification.user_id == user.user_id,
        Notification.is_read == False,
    )
    unread_count = (await db.execute(unread_stmt)).scalar() or 0

    # Đếm tổng số
    total_stmt = select(func.count(Notification.notification_id)).where(
        Notification.user_id == user.user_id,
    )
    total = (await db.execute(total_stmt)).scalar() or 0

    # Lấy danh sách
    stmt = (
        select(Notification)
        .where(Notification.user_id == user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    records = (await db.execute(stmt)).scalars().all()

    items = [NotificationItem.model_validate(r) for r in records]

    return NotificationListResponse(
        items=items,
        total=total,
        unread_count=unread_count,
    )


@router.patch("/{notification_id}/read", response_model=NotificationItem)
async def mark_notification_as_read(
    notification_id: uuid.UUID,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Đánh dấu 1 thông báo cụ thể là đã đọc
    """
    user, _ = auth_data

    stmt = select(Notification).where(
        Notification.notification_id == notification_id,
        Notification.user_id == user.user_id,
    )
    notif = (await db.execute(stmt)).scalar_one_or_none()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo.",
        )

    notif.is_read = True
    await db.commit()
    await db.refresh(notif)

    return NotificationItem.model_validate(notif)


@router.post("/mark-all-read")
async def mark_all_notifications_as_read(
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Đánh dấu tất cả thông báo của người dùng là đã đọc
    """
    user, _ = auth_data

    stmt = (
        update(Notification)
        .where(
            Notification.user_id == user.user_id,
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()

    return {"message": "Đã đánh dấu tất cả thông báo là đã đọc."}
