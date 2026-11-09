"""
API Router cho Cài đặt tài khoản (Feature STT 7)
Endpoints:
- GET  /api/v1/settings/preferences     : Lấy cấu hình giao diện & ngôn ngữ
- PUT  /api/v1/settings/preferences     : Lưu/cập nhật cấu hình giao diện & ngôn ngữ (kèm OCC)
- POST /api/v1/settings/change-password : Đổi mật khẩu tài khoản nội bộ
"""

from typing import Tuple
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User, UserSession
from app.api.v1.auth import get_current_user_and_session
from app.schemas.settings import (
    UserPreferencesResponse,
    UpdateUserPreferencesRequest,
    ChangePasswordRequest,
    ChangePasswordResponse,
)
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["User Settings & Security"])


@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_preferences(
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Lấy cấu hình giao diện (Sáng/Tối) và ngôn ngữ (Việt/Anh) của người dùng hiện tại"""
    current_user, _ = auth_data
    return await SettingsService.get_user_preferences(current_user.user_id, db)


@router.put("/preferences", response_model=UserPreferencesResponse)
async def update_preferences(
    payload: UpdateUserPreferencesRequest,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật cấu hình giao diện và ngôn ngữ (Hỗ trợ Optimistic Locking qua trường version)"""
    current_user, _ = auth_data
    return await SettingsService.update_user_preferences(current_user.user_id, payload, db)


@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    payload: ChangePasswordRequest,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Đổi mật khẩu tài khoản nội bộ và tự động thu hồi toàn bộ phiên làm việc"""
    current_user, _ = auth_data
    return await SettingsService.change_password(current_user, payload, db)
