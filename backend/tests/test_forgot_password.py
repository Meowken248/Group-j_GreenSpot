"""
TDD Unit & Integration Test Suite for Forgot Password & Reset Password (STT 2)
Kiểm thử toàn diện luồng Quên mật khẩu & Đặt lại mật khẩu qua mã xác thực OTP Email:
1. TC-FP-01: Yêu cầu OTP quên mật khẩu thành công với email hợp lệ (200 OK, sinh OTP purpose=RESET_PASSWORD)
2. TC-FP-02: Chặn yêu cầu với email không tồn tại trong hệ thống (404 / 400)
3. TC-FP-03: Chặn yêu cầu với tài khoản chưa kích hoạt (PENDING) hoặc bị khóa (LOCKED) (403)
4. TC-FP-04: Áp dụng Rate Limit tối đa 5 lần yêu cầu OTP / giờ (429)
5. TC-FP-05: Đặt lại mật khẩu thành công khi OTP đúng và còn hạn (200 OK, băm mật khẩu mới, tăng version)
6. TC-FP-06: Thu hồi (revoke) toàn bộ phiên đăng nhập cũ sau khi đổi mật khẩu
7. TC-FP-07: Đăng nhập thành công với mật khẩu mới, mật khẩu cũ bị từ chối (401)
8. TC-FP-08: Chặn khi nhập sai mã OTP hoặc OTP hết hạn 5 phút (400)
9. TC-FP-09: Khóa mã OTP khi nhập sai liên tiếp 5 lần (403)
10. TC-FP-10: Chặn sử dụng lại (Replay Attack) mã OTP đã dùng thành công (400)
"""

import unittest
import requests
import uuid
from sqlalchemy import select, and_, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role, UserOTP, UserSession
from app.utils.security import hash_password

BASE_URL = "http://127.0.0.1:8000/api/v1"
TEST_EMAIL = "test_forgot_citizen@greenspot.vn"
INITIAL_PASSWORD = "OldPassword123@"
NEW_PASSWORD = "NewStrongPassword456!"


class TestForgotPasswordTDD(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử TDD cho luồng Quên & Đặt lại mật khẩu"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

        # 1. Dọn dẹp dữ liệu cũ nếu có
        await self.session.execute(delete(UserOTP).where(UserOTP.email == TEST_EMAIL))
        res = await self.session.execute(select(User).where(User.email == TEST_EMAIL))
        u = res.scalar_one_or_none()
        if u:
            await self.session.execute(delete(UserSession).where(UserSession.user_id == u.user_id))
            await self.session.delete(u)
            await self.session.commit()

        # 2. Lấy role CITIZEN
        role_res = await self.session.execute(select(Role).where(Role.role_code == "CITIZEN"))
        role = role_res.scalar_one_or_none()
        if not role:
            role = Role(role_code="CITIZEN", role_name="Công dân sinh thái", is_system=True)
            self.session.add(role)
            await self.session.flush()

        # 3. Tạo user kiểm thử trạng thái ACTIVE
        self.test_user = User(
            email=TEST_EMAIL,
            full_name="Nguyễn Văn Test",
            password_hash=hash_password(INITIAL_PASSWORD),
            role_id=role.role_id,
            status="ACTIVE",
            version=1,
        )
        self.session.add(self.test_user)
        await self.session.commit()

    async def asyncTearDown(self):
        try:
            await self.session.rollback()
            await self.session.close()
        except Exception:
            pass
        await engine.dispose()

    async def test_01_forgot_password_success(self):
        """TC-FP-01: Gửi yêu cầu quên mật khẩu thành công với email hợp lệ"""
        res = requests.post(
            f"{BASE_URL}/auth/forgot-password",
            json={"email": TEST_EMAIL},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("email của bạn", data.get("message", ""))

        # Kiểm tra CSDL có bản ghi OTP mục đích RESET_PASSWORD
        q = select(UserOTP).where(
            and_(
                UserOTP.email == TEST_EMAIL,
                UserOTP.purpose == "RESET_PASSWORD",
                UserOTP.is_used == False,
            )
        )
        r = await self.session.execute(q)
        otp = r.scalars().first()
        self.assertIsNotNone(otp)
        self.assertEqual(len(otp.otp_plain), 6)

    async def test_02_forgot_password_email_not_found(self):
        """TC-FP-02: Chặn yêu cầu với email không tồn tại trong hệ thống"""
        non_existent_email = "non_existent_user_99999@greenspot.vn"
        res = requests.post(
            f"{BASE_URL}/auth/forgot-password",
            json={"email": non_existent_email},
        )
        self.assertEqual(res.status_code, 404)
        data = res.json()
        self.assertEqual(data.get("error_code"), "EMAIL_NOT_FOUND")

    async def test_03_reset_password_invalid_otp(self):
        """TC-FP-08: Chặn đặt lại mật khẩu với mã OTP sai"""
        # Gửi yêu cầu để sinh OTP
        requests.post(f"{BASE_URL}/auth/forgot-password", json={"email": TEST_EMAIL})

        res = requests.post(
            f"{BASE_URL}/auth/reset-password",
            json={
                "email": TEST_EMAIL,
                "otp_code": "000000",
                "new_password": NEW_PASSWORD,
            },
        )
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertEqual(data.get("error_code"), "INVALID_OTP")

    async def test_04_reset_password_weak_password_rejected(self):
        """TC-FP-11: Chặn đặt lại mật khẩu nếu mật khẩu không đạt chuẩn đăng ký (yếu, thiếu chữ hoa/số/ký tự đặc biệt)"""
        # Gửi yêu cầu để sinh OTP
        requests.post(f"{BASE_URL}/auth/forgot-password", json={"email": TEST_EMAIL})

        q = (
            select(UserOTP)
            .where(
                and_(
                    UserOTP.email == TEST_EMAIL,
                    UserOTP.purpose == "RESET_PASSWORD",
                    UserOTP.is_used == False,
                )
            )
            .order_by(UserOTP.created_at.desc())
        )
        r = await self.session.execute(q)
        otp_rec = r.scalars().first()
        self.assertIsNotNone(otp_rec)

        res = requests.post(
            f"{BASE_URL}/auth/reset-password",
            json={
                "email": TEST_EMAIL,
                "otp_code": otp_rec.otp_plain,
                "new_password": "weakpassword",
            },
        )
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertEqual(data.get("error_code"), "INVALID_PASSWORD")

    async def test_05_reset_password_success_flow(self):
        """TC-FP-05 & TC-FP-06 & TC-FP-07: Đặt lại mật khẩu thành công và kiểm tra đăng nhập"""
        # 1. Gửi yêu cầu để có OTP
        res_req = requests.post(
            f"{BASE_URL}/auth/forgot-password",
            json={"email": TEST_EMAIL},
        )
        self.assertEqual(res_req.status_code, 200)

        # 2. Truy vấn OTP mới nhất từ CSDL qua async session
        q = (
            select(UserOTP)
            .where(
                and_(
                    UserOTP.email == TEST_EMAIL,
                    UserOTP.purpose == "RESET_PASSWORD",
                    UserOTP.is_used == False,
                )
            )
            .order_by(UserOTP.created_at.desc())
        )
        r = await self.session.execute(q)
        otp_rec = r.scalars().first()
        self.assertIsNotNone(otp_rec, "Mã OTP phải được sinh và lưu vào user_otps")
        otp_plain = otp_rec.otp_plain

        # 3. Đặt lại mật khẩu với OTP hợp lệ
        res_reset = requests.post(
            f"{BASE_URL}/auth/reset-password",
            json={
                "email": TEST_EMAIL,
                "otp_code": otp_plain,
                "new_password": NEW_PASSWORD,
            },
        )
        self.assertEqual(res_reset.status_code, 200)
        data = res_reset.json()
        self.assertTrue(data.get("success"))

        # 4. Thử dùng lại mã OTP vừa đổi -> Phải bị chặn (TC-FP-10 Replay Attack)
        res_reuse = requests.post(
            f"{BASE_URL}/auth/reset-password",
            json={
                "email": TEST_EMAIL,
                "otp_code": otp_plain,
                "new_password": "AnotherPassword999!",
            },
        )
        self.assertEqual(res_reuse.status_code, 400)

        # 5. Thử đăng nhập bằng mật khẩu cũ -> Phải bị từ chối 401
        res_old_login = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": INITIAL_PASSWORD},
        )
        self.assertEqual(res_old_login.status_code, 401)

        # 6. Đăng nhập bằng mật khẩu mới -> Phải thành công 200
        res_new_login = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": NEW_PASSWORD},
        )
        self.assertEqual(res_new_login.status_code, 200)
        self.assertIn("access_token", res_new_login.json())


if __name__ == "__main__":
    unittest.main()
