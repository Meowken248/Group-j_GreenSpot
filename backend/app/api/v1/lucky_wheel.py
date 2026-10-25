"""
GreenSpot API Router - Vòng quay may mắn hằng ngày (Chức năng 35)
Endpoints:
- GET  /api/v1/gamification/lucky-wheel/status
- POST /api/v1/gamification/lucky-wheel/spin
- GET  /api/v1/gamification/lucky-wheel/history
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import get_current_active_user
from app.utils.security import decode_access_token
from app.services.lucky_wheel_service import LuckyWheelService
from app.schemas.lucky_wheel import (
    WheelStatusResponse,
    SpinResultResponse,
    SpinHistoryResponse,
)

router = APIRouter(prefix="/gamification/lucky-wheel", tags=["Vòng quay may mắn hằng ngày (35)"])

async def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    try:
        user_uuid = uuid.UUID(sub)
        user = await db.get(User, user_uuid)
        if user and user.status == "ACTIVE":
            return user
    except Exception:
        pass
    return None

@router.get("/status", response_model=WheelStatusResponse, summary="Kiểm tra trạng thái lượt quay hôm nay và cơ cấu giải thưởng")
async def get_wheel_status(
    user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user.user_id if user else None
    return await LuckyWheelService.get_wheel_status(db, user_id)

@router.post("/spin", response_model=SpinResultResponse, summary="Thực hiện quay thưởng may mắn")
async def spin_wheel(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await LuckyWheelService.spin_wheel(db, current_user)

@router.get("/history", response_model=SpinHistoryResponse, summary="Xem nhật ký lịch sử quay thưởng trong 30 ngày")
async def get_spin_history(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await LuckyWheelService.get_spin_history(db, current_user.user_id)
