"""
Business Logic Service cho Cài đặt tài khoản (Feature STT 7)
Xử lý các nghiệp vụ:
- Lấy và đồng bộ cấu hình giao diện & ngôn ngữ (Preferences)
- Kiểm soát tương tranh Optimistic Locking (OCC)
- Đổi mật khẩu tài khoản an toàn & thu hồi toàn bộ phiên đăng nhập
"""

import re
import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rbac import User, UserSession
from app.models.settings import UserSettings
from app.schemas.settings import (
    UserPreferencesResponse,
    UpdateUserPreferencesRequest,
    ChangePasswordRequest,
    ChangePasswordResponse,
)
from app.utils.security import hash_password, verify_password


class SettingsService:
    """Service xử lý các nghiệp vụ Cài đặt tài khoản và An toàn mật khẩu"""

    @staticmethod
    def validate_password_strength(password: str) -> bool:
        """
        Kiểm tra độ mạnh mật khẩu theo đặc tả:
        - Tối thiểu 8 ký tự
        - Chứa ít nhất một chữ hoa [A-Z]
        - Chứa ít nhất một chữ thường [a-z]
        - Chứa ít nhất một chữ số [0-9]
        - Chứa ít nhất một ký tự đặc biệt
        """
        if not password or len(password) < 8:
            return False
        has_upper = bool(re.search(r"[A-Z]", password))
        has_lower = bool(re.search(r"[a-z]", password))
        has_digit = bool(re.search(r"\d", password))
        has_special = bool(re.search(r"[@$!%*?&_\-#^+=()<>[\]{}|~]", password))
        return has_upper and has_lower and has_digit and has_special

    @staticmethod
    async def get_user_preferences(user_id: uuid.UUID, db: AsyncSession) -> UserPreferencesResponse:
        """Lấy cấu hình giao diện & ngôn ngữ hiện tại của người dùng"""
        stmt = select(UserSettings).where(UserSettings.user_id == user_id)
        result = await db.execute(stmt)
        setting = result.scalar_one_or_none()

        if not setting:
            # Tạo bản ghi mặc định (LIGHT/VI) nếu chưa từng có
            setting = UserSettings(
                setting_id=uuid.uuid4(),
                user_id=user_id,
                theme="LIGHT",
                language="VI",
                version=1,
            )
            db.add(setting)
            await db.commit()
            await db.refresh(setting)

        return UserPreferencesResponse(
            theme=setting.theme,  # type: ignore
            language=setting.language,  # type: ignore
            version=setting.version,
            updated_at=setting.updated_at,
        )

    @staticmethod
    async def update_user_preferences(
        user_id: uuid.UUID,
        payload: UpdateUserPreferencesRequest,
        db: AsyncSession,
    ) -> UserPreferencesResponse:
        """Cập nhật cấu hình giao diện & ngôn ngữ với kiểm tra Optimistic Locking (OCC)"""
        stmt = select(UserSettings).where(UserSettings.user_id == user_id)
        result = await db.execute(stmt)
        setting = result.scalar_one_or_none()

        if not setting:
            # Nếu chưa có cấu hình, tạo mới với version = payload.version
            setting = UserSettings(
                setting_id=uuid.uuid4(),
                user_id=user_id,
                theme=payload.theme,
                language=payload.language,
                version=payload.version + 1,
            )
            db.add(setting)
        else:
            # Kiểm tra xung đột phiên (Optimistic Locking)
            if setting.version != payload.version:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "error_code": "CONCURRENT_UPDATE_CONFLICT",
                        "message": "Cấu hình đã được cập nhật từ một thiết bị khác. Vui lòng tải lại dữ liệu mới nhất.",
                    },
                )

            setting.theme = payload.theme
            setting.language = payload.language
            setting.version = setting.version + 1

        await db.commit()
        await db.refresh(setting)

        return UserPreferencesResponse(
            theme=setting.theme,  # type: ignore
            language=setting.language,  # type: ignore
            version=setting.version,
            updated_at=setting.updated_at,
        )

    @staticmethod
    async def change_password(
        user: User,
        payload: ChangePasswordRequest,
        db: AsyncSession,
    ) -> ChangePasswordResponse:
        """
        Nghiệp vụ Đổi mật khẩu an toàn theo ma trận đặc tả Màn 2:
        1. Kiểm tra tài khoản nội bộ (có mật khẩu)
        2. Kiểm tra mật khẩu hiện tại chính xác
        3. Kiểm tra mật khẩu mới đạt chuẩn bảo mật
        4. Kiểm tra mật khẩu mới không trùng mật khẩu cũ
        5. Kiểm tra mật khẩu xác nhận trùng khớp
        6. Cập nhật hash và thu hồi toàn bộ phiên làm việc của user
        """
        # 1. Kiểm tra tài khoản có mật khẩu nội bộ hay không
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "SSO_ACCOUNT_NOT_SUPPORTED",
                    "message": "Tài khoản liên kết Google/SSO không sử dụng mật khẩu nội bộ. Vui lòng quản lý qua tài khoản Google.",
                },
            )

        # 2. Kiểm tra mật khẩu hiện tại có đúng không
        if not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "WRONG_CURRENT_PASSWORD",
                    "message": "Mật khẩu hiện tại không đúng",
                },
            )

        # 3. Kiểm tra độ mạnh của mật khẩu mới
        if not SettingsService.validate_password_strength(payload.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "PASSWORD_TOO_WEAK",
                    "message": "Mật khẩu phải từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
                },
            )

        # 4. Kiểm tra mật khẩu mới không được trùng mật khẩu cũ
        if verify_password(payload.new_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "SAME_AS_OLD_PASSWORD",
                    "message": "Mật khẩu mới không được trùng với mật khẩu hiện tại",
                },
            )

        # 5. Kiểm tra mật khẩu xác nhận khớp với mật khẩu mới
        if payload.new_password != payload.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "CONFIRM_PASSWORD_MISMATCH",
                    "message": "Mật khẩu xác nhận không trùng khớp",
                },
            )

        # 6. Cập nhật mật khẩu mới và tăng version tài khoản
        user.password_hash = hash_password(payload.new_password)
        user.version = user.version + 1

        # 7. Thu hồi toàn bộ phiên làm việc đang hoạt động (yêu cầu đăng nhập lại)
        await db.execute(
            update(UserSession)
            .where(
                UserSession.user_id == user.user_id,
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=func.now())
        )

        await db.commit()
        await db.refresh(user)

        return ChangePasswordResponse(
            success=True,
            message="Đổi mật khẩu thành công. Vui lòng đăng nhập lại",
        )
