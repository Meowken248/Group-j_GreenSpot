import uuid
from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User, UserSession
from app.models.alert_notification import Notification
from app.api.v1.auth import get_current_user_and_session
from app.schemas.alert_notification import (
    NotificationListResponse,
    NotificationMarkReadRequest,
    NotificationResponse,
    PushStatsResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Chức năng 29: Điều phối Thông báo Đẩy Thời gian thực & Notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    user_id: Optional[uuid.UUID] = Query(None, description="ID người dùng để lấy thông báo riêng (nếu có)"),
    only_unread: bool = Query(False, description="Chỉ lấy tin chưa đọc"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách thông báo (phục vụ biểu tượng Chuông Header và Trang trung tâm thông báo).
    """
    skip = (page - 1) * limit
    items, unread_count, total = await NotificationService.list_notifications(
        db,
        user_id=user_id,
        only_unread=only_unread,
        limit=limit,
        skip=skip,
    )
    formatted_items = [NotificationResponse.model_validate(item) for item in items]
    return NotificationListResponse(
        items=formatted_items,
        unread_count=unread_count,
        total=total,
    )


@router.post("/mark-read")
async def mark_notifications_read(
    req: NotificationMarkReadRequest,
    user_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Đánh dấu một hoặc nhiều thông báo (hoặc tất cả) là đã đọc"""
    updated_count = await NotificationService.mark_as_read(
        db,
        user_id=user_id,
        notification_ids=req.notification_ids,
    )
    return {"status": "success", "marked_read_count": updated_count}


@router.patch("/{notification_id}/read")
async def patch_notification_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Đánh dấu 1 thông báo cụ thể là đã đọc"""
    updated_count = await NotificationService.mark_as_read(
        db,
        notification_ids=[notification_id],
    )
    return {"status": "success", "marked_read_count": updated_count}


@router.post("/mark-all-read")
async def mark_all_notifications_as_read(
    user_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Đánh dấu tất cả thông báo là đã đọc"""
    updated_count = await NotificationService.mark_as_read(
        db,
        user_id=user_id,
        notification_ids=None,
    )
    return {"status": "success", "message": "Đã đánh dấu tất cả thông báo là đã đọc.", "marked_read_count": updated_count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: uuid.UUID,
    user_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Xóa một thông báo khỏi hòm thư cá nhân"""
    await NotificationService.delete_notification(db, notification_id, user_id=user_id)
    return {"status": "success", "message": "Đã xóa thông báo thành công"}


@router.get("/stats", response_model=PushStatsResponse)
async def get_push_notification_stats(
    db: AsyncSession = Depends(get_db),
):
    """Báo cáo thống kê hiệu quả điều phối thông báo đẩy cho Cán bộ Quản trị"""
    stats = await NotificationService.get_push_stats(db)
    return PushStatsResponse(**stats)
