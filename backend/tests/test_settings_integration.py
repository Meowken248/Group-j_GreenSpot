"""
Integration Test Suite for User Settings & Security Domain (Chức năng 7)
Target: Kiểm thử trực tiếp luồng SettingsService và tương tác AsyncSession với DB thực tế.
"""

import unittest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, UserSession
from app.models.settings import UserSettings
from app.services.settings_service import SettingsService
from app.schemas.settings import (
    UpdateUserPreferencesRequest,
    ChangePasswordRequest,
)
from app.utils.security import verify_password, hash_password


class TestSettingsDomainIntegration(unittest.IsolatedAsyncioTestCase):
    """Kiểm thử tích hợp cho Chức năng 7: Cài đặt tài khoản & Bảo mật"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

        # Tạo một User độc lập có password_hash thật để kiểm thử
        self.test_user_id = uuid.uuid4()
        self.initial_password = "CurrentPassword@123"
        self.test_user = User(
            user_id=self.test_user_id,
            email=f"settings_test_{self.test_user_id.hex[:8]}@ecoreport.gov.vn",
            phone_number=f"098{self.test_user_id.hex[:7]}",
            password_hash=hash_password(self.initial_password),
            full_name="Nguyễn Thành Đạt (Test Settings)",
            role_id=4,
            status="ACTIVE",
        )
        self.session.add(self.test_user)
        await self.session.commit()

    async def asyncTearDown(self):
        try:
            await self.session.rollback()
            # Dọn dẹp dữ liệu test
            await self.session.execute(
                delete(UserSettings).where(UserSettings.user_id == self.test_user_id)
            )
            await self.session.execute(
                delete(UserSession).where(UserSession.user_id == self.test_user_id)
            )
            await self.session.execute(
                delete(User).where(User.user_id == self.test_user_id)
            )
            await self.session.commit()
            await self.session.close()
        except Exception:
            pass
        await engine.dispose()

    async def test_01_get_user_preferences_default_fallback(self):
        """Kiểm tra lấy cấu hình giao diện & ngôn ngữ mặc định (LIGHT / VI / v1) khi mới tạo"""
        prefs = await SettingsService.get_user_preferences(self.test_user.user_id, self.session)
        self.assertIsNotNone(prefs)
        self.assertEqual(prefs.theme, "LIGHT")
        self.assertEqual(prefs.language, "VI")
        self.assertEqual(prefs.version, 1)

    async def test_02_update_user_preferences_success(self):
        """Kiểm tra cập nhật theme=DARK & language=EN thành công, version tăng lên 2"""
        # Khởi tạo bản ghi mặc định
        current_prefs = await SettingsService.get_user_preferences(self.test_user.user_id, self.session)

        req = UpdateUserPreferencesRequest(
            theme="DARK",
            language="EN",
            version=current_prefs.version,
        )

        updated = await SettingsService.update_user_preferences(self.test_user.user_id, req, self.session)
        self.assertEqual(updated.theme, "DARK")
        self.assertEqual(updated.language, "EN")
        self.assertEqual(updated.version, 2)

        # Re-query DB xác nhận lưu chính xác
        recheck = await SettingsService.get_user_preferences(self.test_user.user_id, self.session)
        self.assertEqual(recheck.theme, "DARK")
        self.assertEqual(recheck.language, "EN")
        self.assertEqual(recheck.version, 2)

    async def test_03_update_user_preferences_optimistic_locking_conflict(self):
        """Kiểm tra Optimistic Locking (OCC): gửi version cũ -> báo lỗi 409 CONCURRENT_UPDATE_CONFLICT"""
        # Cập nhật version lên 2 trước
        req1 = UpdateUserPreferencesRequest(theme="DARK", language="VI", version=1)
        await SettingsService.update_user_preferences(self.test_user.user_id, req1, self.session)

        # Gửi lại với version 1 (stale)
        req_stale = UpdateUserPreferencesRequest(theme="LIGHT", language="EN", version=1)

        with self.assertRaises(HTTPException) as ctx:
            await SettingsService.update_user_preferences(self.test_user.user_id, req_stale, self.session)

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.detail.get("error_code"), "CONCURRENT_UPDATE_CONFLICT")

    async def test_04_change_password_wrong_current_password(self):
        """Kiểm tra khi người dùng nhập sai mật khẩu hiện tại -> báo lỗi 400 WRONG_CURRENT_PASSWORD"""
        req = ChangePasswordRequest(
            current_password="WrongPass@999",
            new_password="NewValidPassword@2026",
            confirm_password="NewValidPassword@2026",
        )

        with self.assertRaises(HTTPException) as ctx:
            await SettingsService.change_password(self.test_user, req, self.session)

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail.get("error_code"), "WRONG_CURRENT_PASSWORD")

    async def test_05_change_password_mismatch_confirm(self):
        """Kiểm tra mật khẩu xác nhận không khớp -> báo lỗi 400 CONFIRM_PASSWORD_MISMATCH"""
        req = ChangePasswordRequest(
            current_password=self.initial_password,
            new_password="NewValidPassword@2026",
            confirm_password="DifferentPassword@2026",
        )

        with self.assertRaises(HTTPException) as ctx:
            await SettingsService.change_password(self.test_user, req, self.session)

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail.get("error_code"), "CONFIRM_PASSWORD_MISMATCH")

    async def test_06_change_password_same_as_old(self):
        """Kiểm tra mật khẩu mới trùng mật khẩu cũ -> báo lỗi 400 SAME_AS_OLD_PASSWORD"""
        req = ChangePasswordRequest(
            current_password=self.initial_password,
            new_password=self.initial_password,
            confirm_password=self.initial_password,
        )

        with self.assertRaises(HTTPException) as ctx:
            await SettingsService.change_password(self.test_user, req, self.session)

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail.get("error_code"), "SAME_AS_OLD_PASSWORD")

    async def test_07_change_password_success_and_revocation(self):
        """Kiểm tra đổi mật khẩu thành công: hash mới được lưu, toàn bộ session của user bị thu hồi"""
        # Tạo session đang hoạt động cho user
        test_session_id = uuid.uuid4()
        test_session = UserSession(
            session_id=test_session_id,
            user_id=self.test_user_id,
            refresh_token_hash="fake_hash_123",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            ip_address="127.0.0.1",
            user_agent="Unit-Test-Agent",
        )
        self.session.add(test_session)
        await self.session.commit()

        new_pass = "UpdatedPass@2026!"
        req = ChangePasswordRequest(
            current_password=self.initial_password,
            new_password=new_pass,
            confirm_password=new_pass,
        )

        # Thực hiện đổi mật khẩu
        resp = await SettingsService.change_password(self.test_user, req, self.session)
        self.assertTrue(resp.success)
        self.assertIn("đăng nhập lại", resp.message)

        # Kiểm tra user trong DB đã có password_hash mới
        res_user = await self.session.execute(
            select(User.password_hash).where(User.user_id == self.test_user_id)
        )
        new_hash = res_user.scalar_one()
        self.assertTrue(verify_password(new_pass, new_hash))

        # Kiểm tra session của user đã bị revoke
        res_session = await self.session.execute(
            select(UserSession.revoked_at).where(UserSession.session_id == test_session_id)
        )
        revoked_at_val = res_session.scalar_one()
        self.assertIsNotNone(revoked_at_val, "Phiên làm việc phải được gắn revoked_at")


if __name__ == "__main__":
    unittest.main()
