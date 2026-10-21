"""
API Router: Sinh nhật bạn bè & Thiệp xanh sinh thái (Feature STT 17)
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 142 - 147)
"""

import uuid
from typing import List, Optional, Tuple

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user_and_session
from app.database import get_db
from app.models.rbac import User, UserSession
from app.schemas.birthday import (
    BirthdayCardTemplate,
    BirthdayTodayResponse,
    BirthdayWishListResponse,
    BirthdayWishReadRequest,
    BirthdayWishReadResponse,
    BirthdayWishSendRequest,
    BirthdayWishSendResponse,
)
from app.services import birthday_service

router = APIRouter(prefix="/birthday", tags=["Sinh nhật bạn bè (Feature 17)"])


@router.get("/today", response_model=BirthdayTodayResponse)
async def get_today_birthdays(
    limit: int = Query(3, ge=1, le=50, description="Số bạn bè sinh nhật hiển thị"),
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Khối "SINH NHẬT HÔM NAY" trên Bảng tin Geo-Feed.

    Chỉ trả về bạn bè đang hoạt động, còn quan hệ bạn bè và đã bật hiển thị ngày sinh.
    Kèm danh sách mẫu thiệp xanh, điểm thưởng và hạn mức điểm trong ngày.
    """
    current_user, _ = auth_data
    return await birthday_service.get_today_birthdays(db, current_user, limit=limit)


@router.get("/card-templates", response_model=List[BirthdayCardTemplate])
async def get_card_templates(
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
):
    """Danh sách mẫu thiệp xanh sinh thái dùng cho popup tặng thiệp"""
    return birthday_service.BIRTHDAY_CARD_TEMPLATES


@router.post("/wishes", response_model=BirthdayWishSendResponse, status_code=201)
async def send_birthday_wish(
    payload: BirthdayWishSendRequest,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Gửi lời chúc xanh (MESSAGE) hoặc tặng thiệp xanh sinh thái (CARD).

    - MESSAGE: chỉ gửi lời chúc, không cộng điểm.
    - CARD: bắt buộc chọn mẫu thiệp, cộng điểm thưởng nhỏ cho cả hai bên
      (tối đa 25 điểm/ngày/người gửi).
    - Mỗi nội dung chỉ gửi được một lần cho một người bạn trong ngày sinh nhật.
    """
    current_user, _ = auth_data
    return await birthday_service.send_birthday_wish(
        db=db,
        sender=current_user,
        recipient_id=payload.recipient_id,
        wish_type=payload.wish_type,
        message=payload.message,
        card_template_id=payload.card_template_id,
    )


@router.get("/wishes/received", response_model=BirthdayWishListResponse)
async def get_received_wishes(
    limit: int = Query(20, ge=1, le=50, description="Số lời chúc mỗi lần tải"),
    offset: int = Query(0, ge=0, description="Vị trí bắt đầu"),
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Hộp thư lời chúc / thiệp xanh sinh nhật mà người dùng đã nhận"""
    current_user, _ = auth_data
    return await birthday_service.get_received_wishes(
        db, current_user, limit=limit, offset=offset
    )


@router.post("/wishes/read", response_model=BirthdayWishReadResponse)
async def mark_wishes_read(
    payload: Optional[BirthdayWishReadRequest] = Body(default=None),
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Đánh dấu đã đọc lời chúc (rỗng = đánh dấu toàn bộ hộp thư)"""
    current_user, _ = auth_data
    wish_ids: Optional[List[uuid.UUID]] = payload.wish_ids if payload else None
    return await birthday_service.mark_wishes_read(db, current_user, wish_ids=wish_ids)
