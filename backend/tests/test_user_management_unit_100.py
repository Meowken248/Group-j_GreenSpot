"""
Unit Test Suite for User Management & Admin Account Creation (Target: 100% Coverage)
Kiểm thử toàn diện 100% các chức năng quản lý người dùng và tạo tài khoản của Admin:
1. GET /api/v1/users/roles-options: Lấy danh sách vai trò cho dropdown
2. GET /api/v1/users: Tìm kiếm, lọc theo vai trò, trạng thái, phân trang, thống kê
3. POST /api/v1/users: Admin tạo tài khoản cho các vai trò khác (validate trùng email, phone, role)
4. PUT /api/v1/users/{id}/role: Admin đổi vai trò, chặn tự tước quyền của chính mình
5. PUT /api/v1/users/{id}/status: Admin khóa / mở khóa, chặn tự khóa chính mình
6. POST /api/v1/users/{id}/reset-password: Admin đặt lại mật khẩu mới
7. DELETE /api/v1/users/{id}: Admin xóa tài khoản, chặn tự xóa chính mình
8. Schemas Validation: Full-name, email, phone, password, status
"""

import unittest
import uuid
from datetime import datetime, timezone
from pydantic import ValidationError
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role, UserSession
from app.schemas.user_management import (
    CreateUserRequest,
    ChangeUserRoleRequest,
    ChangeUserStatusRequest,
    AdminResetPasswordRequest,
)
from app.api.v1.user_management import (
    get_roles_options,
    list_users,
    create_user_by_admin,
    change_user_role,
    change_user_status,
    reset_user_password,
    delete_user_by_admin,
)
from app.utils.security import hash_password, verify_password


class TestUserManagementUnitCoverage(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử đơn vị bao phủ 100% module user_management.py và schemas"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

        # Lấy tài khoản Admin thật từ CSDL
        admin_res = await self.session.execute(
            select(User).where(User.email == "ddatmguyen2023+test@gmail.com")
        )
        self.admin = admin_res.scalars().first()
        self.assertIsNotNone(self.admin, "Cần có tài khoản Admin mẫu trong CSDL")

        # Lấy vai trò ADMIN và CITIZEN
        r_admin = await self.session.execute(select(Role).where(Role.role_code == "ADMIN"))
        self.role_admin = r_admin.scalars().first()
        r_citizen = await self.session.execute(select(Role).where(Role.role_code == "CITIZEN"))
        self.role_citizen = r_citizen.scalars().first()

    async def asyncTearDown(self):
        try:
            await self.session.rollback()
            await self.session.close()
        except Exception:
            pass
        await engine.dispose()

    # =========================================================================
    # 1. KIỂM THỬ get_roles_options
    # =========================================================================
    async def test_get_roles_options(self):
        """Lấy danh sách vai trò cho dropdown: đúng 4 vai trò hệ thống đầu tiên, scope display"""
        opts = await get_roles_options(current_admin=self.admin, db=self.session)
        self.assertGreaterEqual(len(opts), 4)

        # 4 vai trò đầu tiên đúng thứ tự
        codes = [o.role_code for o in opts[:4]]
        self.assertEqual(codes, ["ADMIN", "DISTRICT_MANAGER", "RESPONDER", "CITIZEN"])

        # Kiểm tra scope display
        for o in opts:
            if o.scope == "CITY":
                self.assertEqual(o.scope_display, "Toàn thành phố")
            else:
                self.assertEqual(o.scope_display, "Quận")

    # =========================================================================
    # 2. KIỂM THỬ list_users (Tìm kiếm, lọc, phân trang, thống kê)
    # =========================================================================
    async def test_list_users_all_and_pagination(self):
        """Lấy danh sách người dùng đầy đủ và phân trang"""
        res = await list_users(
            page=1,
            limit=5,
            search=None,
            role_id=None,
            status_filter=None,
            current_admin=self.admin,
            db=self.session,
        )
        self.assertGreaterEqual(res.total, 1)
        self.assertLessEqual(len(res.users), 5)
        self.assertGreaterEqual(res.total_pages, 1)
        self.assertIn("total_all", res.stats)
        self.assertIn("total_active", res.stats)
        self.assertIn("total_blocked", res.stats)

    async def test_list_users_search_filter(self):
        """Tìm kiếm người dùng theo tên, email, sđt"""
        # Tìm kiếm theo email của admin
        res = await list_users(
            page=1,
            limit=10,
            search=self.admin.email[:10],
            role_id=None,
            status_filter=None,
            current_admin=self.admin,
            db=self.session,
        )
        self.assertGreaterEqual(res.total, 1)
        self.assertTrue(any(u.email == self.admin.email for u in res.users))

    async def test_list_users_filter_role_and_status(self):
        """Lọc người dùng theo vai trò và trạng thái"""
        res_admin_only = await list_users(
            page=1,
            limit=10,
            search=None,
            role_id=self.role_admin.role_id,
            status_filter="ACTIVE",
            current_admin=self.admin,
            db=self.session,
        )
        self.assertGreaterEqual(res_admin_only.total, 1)
        for u in res_admin_only.users:
            self.assertEqual(u.role_id, self.role_admin.role_id)
            self.assertEqual(u.status, "ACTIVE")

    # =========================================================================
    # 3. KIỂM THỬ create_user_by_admin (Chỉ Admin tạo tài khoản cho quyền khác)
    # =========================================================================
    async def test_create_user_role_not_found(self):
        """Tạo người dùng với vai trò không tồn tại -> 404 ROLE_NOT_FOUND"""
        req = CreateUserRequest(
            full_name="Nguyễn Văn A",
            email=f"test_n_{uuid.uuid4().hex[:6]}@gmail.com",
            password="Password123,",
            role_id=999999,
        )
        res = await create_user_by_admin(payload=req, current_admin=self.admin, db=self.session)
        self.assertEqual(res.status_code, 404)
        import json
        self.assertEqual(json.loads(res.body.decode())["error_code"], "ROLE_NOT_FOUND")

    async def test_create_user_duplicate_email(self):
        """Tạo người dùng trùng Email -> 400 EMAIL_EXISTS"""
        req = CreateUserRequest(
            full_name="Người Dùng Trùng",
            email=self.admin.email,
            password="Password123,",
            role_id=self.role_citizen.role_id,
        )
        res = await create_user_by_admin(payload=req, current_admin=self.admin, db=self.session)
        self.assertEqual(res.status_code, 400)
        import json
        self.assertEqual(json.loads(res.body.decode())["error_code"], "EMAIL_EXISTS")

    async def test_create_user_duplicate_phone(self):
        """Tạo người dùng trùng Số điện thoại -> 400 PHONE_EXISTS"""
        # Tạo trước một user có số điện thoại
        test_phone = f"09{uuid.uuid4().int % 100000000:08d}"
        user1 = User(
            user_id=uuid.uuid4(),
            email=f"u1_{uuid.uuid4().hex[:6]}@gmail.com",
            phone_number=test_phone,
            password_hash=hash_password("Pass123456"),
            full_name="User Phone 1",
            role_id=self.role_citizen.role_id,
            status="ACTIVE",
        )
        self.session.add(user1)
        await self.session.commit()

        try:
            req = CreateUserRequest(
                full_name="User Phone 2",
                email=f"u2_{uuid.uuid4().hex[:6]}@gmail.com",
                phone_number=test_phone,
                password="Password123,",
                role_id=self.role_citizen.role_id,
            )
            res = await create_user_by_admin(payload=req, current_admin=self.admin, db=self.session)
            self.assertEqual(res.status_code, 400)
            import json
            self.assertEqual(json.loads(res.body.decode())["error_code"], "PHONE_EXISTS")
        finally:
            await self.session.delete(user1)
            await self.session.commit()

    async def test_create_user_success_with_and_without_phone(self):
        """Admin tạo thành công người dùng với các vai trò khác (ACTIVE ngay)"""
        # 1. Có số điện thoại
        test_phone = f"09{uuid.uuid4().int % 100000000:08d}"
        email1 = f"officer_{uuid.uuid4().hex[:6]}@greenspot.vn"
        req1 = CreateUserRequest(
            full_name="Trần Văn Cán Bộ",
            email=email1,
            phone_number=test_phone,
            password="StrongPass123!",
            role_id=self.role_citizen.role_id,
            status="ACTIVE",
        )
        res1 = await create_user_by_admin(payload=req1, current_admin=self.admin, db=self.session)
        self.assertEqual(res1.email, email1)
        self.assertEqual(res1.phone_number, test_phone)
        self.assertEqual(res1.status, "ACTIVE")
        self.assertEqual(res1.role_code, "CITIZEN")

        # 2. Không có số điện thoại
        email2 = f"responder_{uuid.uuid4().hex[:6]}@greenspot.vn"
        req2 = CreateUserRequest(
            full_name="Lê Đội Trưởng",
            email=email2,
            phone_number=None,
            password="StrongPass123!",
            role_id=self.role_citizen.role_id,
        )
        res2 = await create_user_by_admin(payload=req2, current_admin=self.admin, db=self.session)
        self.assertEqual(res2.email, email2)
        self.assertIsNone(res2.phone_number)

        # Dọn dẹp
        u1_uuid = uuid.UUID(res1.user_id)
        u2_uuid = uuid.UUID(res2.user_id)
        await self.session.execute(delete(User).where(User.user_id.in_([u1_uuid, u2_uuid])))
        await self.session.commit()

    # =========================================================================
    # 4. KIỂM THỬ change_user_role
    # =========================================================================
    async def test_change_user_role_edge_cases(self):
        """Kiểm tra đổi vai trò: UUID sai, user 404, role 404, tự hạ quyền Admin 400"""
        # 1. UUID sai
        res1 = await change_user_role(
            user_id="invalid-uuid",
            payload=ChangeUserRoleRequest(role_id=1),
            current_admin=self.admin,
            db=self.session,
        )
        self.assertEqual(res1.status_code, 400)

        # 2. User 404
        res2 = await change_user_role(
            user_id=str(uuid.uuid4()),
            payload=ChangeUserRoleRequest(role_id=self.role_citizen.role_id),
            current_admin=self.admin,
            db=self.session,
        )
        self.assertEqual(res2.status_code, 404)

        # 3. Role 404
        res3 = await change_user_role(
            user_id=str(self.admin.user_id),
            payload=ChangeUserRoleRequest(role_id=999999),
            current_admin=self.admin,
            db=self.session,
        )
        self.assertEqual(res3.status_code, 404)

        # 4. Admin tự tước quyền của chính mình -> 400 CANNOT_DEMOTE_SELF
        res4 = await change_user_role(
            user_id=str(self.admin.user_id),
            payload=ChangeUserRoleRequest(role_id=self.role_citizen.role_id),
            current_admin=self.admin,
            db=self.session,
        )
        self.assertEqual(res4.status_code, 400)
        import json
        self.assertEqual(json.loads(res4.body.decode())["error_code"], "CANNOT_DEMOTE_SELF")

    async def test_change_user_role_success(self):
        """Đổi vai trò người dùng thành công và thu hồi phiên cũ"""
        # Tạo test user
        test_uid = uuid.uuid4()
        test_user = User(
            user_id=test_uid,
            email=f"changerole_{uuid.uuid4().hex[:6]}@test.com",
            password_hash="pwd",
            full_name="User Đổi Vai Trò",
            role_id=self.role_citizen.role_id,
            status="ACTIVE",
        )
        self.session.add(test_user)

        # Tạo session để kiểm tra thu hồi phiên
        sess = UserSession(
            session_id=uuid.uuid4(),
            user_id=test_uid,
            refresh_token_hash="hash",
            revoked_at=None,
            expires_at=datetime.now(timezone.utc),
        )
        self.session.add(sess)
        await self.session.commit()

        try:
            req = ChangeUserRoleRequest(role_id=self.role_admin.role_id)
            res = await change_user_role(
                user_id=str(test_uid),
                payload=req,
                current_admin=self.admin,
                db=self.session,
            )
            self.assertEqual(res.role_id, self.role_admin.role_id)
            self.assertEqual(res.role_code, "ADMIN")

            # Phiên phải bị thu hồi (revoked_at is not None)
            await self.session.refresh(sess)
            self.assertIsNotNone(sess.revoked_at)
        finally:
            await self.session.delete(sess)
            await self.session.delete(test_user)
            await self.session.commit()

    # =========================================================================
    # 5. KIỂM THỬ change_user_status (Khóa / Mở khóa)
    # =========================================================================
    async def test_change_user_status_edge_cases(self):
        """Kiểm tra thay đổi trạng thái: UUID sai, 404, Admin tự khóa mình 400"""
        # 1. UUID sai
        res1 = await change_user_status(
            user_id="invalid-uuid",
            payload=ChangeUserStatusRequest(status="BLOCKED"),
            current_admin=self.admin,
            db=self.session,
        )
        self.assertEqual(res1.status_code, 400)

        # 2. User 404
        res2 = await change_user_status(
            user_id=str(uuid.uuid4()),
            payload=ChangeUserStatusRequest(status="BLOCKED"),
            current_admin=self.admin,
            db=self.session,
        )
        self.assertEqual(res2.status_code, 404)

        # 3. Admin tự khóa chính mình -> 400 CANNOT_BLOCK_SELF
        res3 = await change_user_status(
            user_id=str(self.admin.user_id),
            payload=ChangeUserStatusRequest(status="BLOCKED"),
            current_admin=self.admin,
            db=self.session,
        )
        self.assertEqual(res3.status_code, 400)
        import json
        self.assertEqual(json.loads(res3.body.decode())["error_code"], "CANNOT_BLOCK_SELF")

    async def test_change_user_status_success(self):
        """Khóa và Mở khóa tài khoản thành công"""
        test_uid = uuid.uuid4()
        test_user = User(
            user_id=test_uid,
            email=f"status_{uuid.uuid4().hex[:6]}@test.com",
            password_hash="pwd",
            full_name="User Trạng Thái",
            role_id=self.role_citizen.role_id,
            status="ACTIVE",
        )
        self.session.add(test_user)
        await self.session.commit()

        try:
            # 1. Khóa tài khoản -> BLOCKED
            res_block = await change_user_status(
                user_id=str(test_uid),
                payload=ChangeUserStatusRequest(status="BLOCKED"),
                current_admin=self.admin,
                db=self.session,
            )
            self.assertEqual(res_block.status, "BLOCKED")

            # 2. Mở khóa tài khoản -> ACTIVE
            res_active = await change_user_status(
                user_id=str(test_uid),
                payload=ChangeUserStatusRequest(status="ACTIVE"),
                current_admin=self.admin,
                db=self.session,
            )
            self.assertEqual(res_active.status, "ACTIVE")
        finally:
            await self.session.delete(test_user)
            await self.session.commit()

    # =========================================================================
    # 6. KIỂM THỬ reset_user_password
    # =========================================================================
    async def test_reset_user_password(self):
        """Admin đặt lại mật khẩu mới cho người dùng"""
        # 1. UUID sai
        res1 = await reset_user_password(
            user_id="invalid-uuid",
            payload=AdminResetPasswordRequest(new_password="NewPassword123!"),
            current_admin=self.admin,
            db=self.session,
        )
        self.assertEqual(res1.status_code, 400)

        # 2. User 404
        res2 = await reset_user_password(
            user_id=str(uuid.uuid4()),
            payload=AdminResetPasswordRequest(new_password="NewPassword123!"),
            current_admin=self.admin,
            db=self.session,
        )
        self.assertEqual(res2.status_code, 404)

        # 3. Đặt lại mật khẩu thành công
        test_uid = uuid.uuid4()
        test_user = User(
            user_id=test_uid,
            email=f"resetpwd_{uuid.uuid4().hex[:6]}@test.com",
            password_hash=hash_password("OldPassword123!"),
            full_name="User Đổi Mật Khẩu",
            role_id=self.role_citizen.role_id,
            status="ACTIVE",
        )
        self.session.add(test_user)
        await self.session.commit()

        try:
            res_ok = await reset_user_password(
                user_id=str(test_uid),
                payload=AdminResetPasswordRequest(new_password="NewSecretPass123!"),
                current_admin=self.admin,
                db=self.session,
            )
            self.assertTrue(res_ok["success"])

            # Xác thực mật khẩu mới bằng verify_password
            await self.session.refresh(test_user)
            self.assertTrue(verify_password("NewSecretPass123!", test_user.password_hash))
            self.assertFalse(verify_password("OldPassword123!", test_user.password_hash))
        finally:
            await self.session.delete(test_user)
            await self.session.commit()

    # =========================================================================
    # 7. KIỂM THỬ delete_user_by_admin
    # =========================================================================
    async def test_delete_user_edge_cases_and_success(self):
        """Xóa người dùng: UUID sai, 404, Admin tự xóa chính mình 400, xóa thành công"""
        # 1. UUID sai
        res1 = await delete_user_by_admin(user_id="invalid-uuid", current_admin=self.admin, db=self.session)
        self.assertEqual(res1.status_code, 400)

        # 2. User 404
        res2 = await delete_user_by_admin(user_id=str(uuid.uuid4()), current_admin=self.admin, db=self.session)
        self.assertEqual(res2.status_code, 404)

        # 3. Admin tự xóa chính mình -> 400 CANNOT_DELETE_SELF
        res3 = await delete_user_by_admin(user_id=str(self.admin.user_id), current_admin=self.admin, db=self.session)
        self.assertEqual(res3.status_code, 400)
        import json
        self.assertEqual(json.loads(res3.body.decode())["error_code"], "CANNOT_DELETE_SELF")

        # 4. Xóa người dùng thành công
        del_uid = uuid.uuid4()
        del_user = User(
            user_id=del_uid,
            email=f"del_{uuid.uuid4().hex[:6]}@test.com",
            password_hash="pwd",
            full_name="User Cần Xóa",
            role_id=self.role_citizen.role_id,
            status="ACTIVE",
        )
        self.session.add(del_user)
        await self.session.commit()

        res_del = await delete_user_by_admin(user_id=str(del_uid), current_admin=self.admin, db=self.session)
        self.assertTrue(res_del["success"])

        # Kiểm tra đã bị xóa khỏi DB
        chk = await self.session.execute(select(User).where(User.user_id == del_uid))
        self.assertIsNone(chk.scalar_one_or_none())

    # =========================================================================
    # 8. KIỂM THỬ SCHEMAS VALIDATION (schemas/user_management.py - 100% COVERAGE)
    # =========================================================================
    def test_schemas_validation(self):
        """Kiểm tra toàn diện tất cả các validators trong schemas/user_management.py"""
        # full_name
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name=123, email="a@b.com", password="Password1!", role_id=1)
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name="A", email="a@b.com", password="Password1!", role_id=1)

        # email
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name="Tên Hợp Lệ", email=123, password="Password1!", role_id=1)
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name="Tên Hợp Lệ", email="invalid-email-format", password="Password1!", role_id=1)

        # phone_number
        req_p1 = CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", phone_number=None, password="Password1!", role_id=1)
        self.assertIsNone(req_p1.phone_number)
        req_p2 = CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", phone_number="   ", password="Password1!", role_id=1)
        self.assertIsNone(req_p2.phone_number)
        req_p3 = CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", phone_number=999, password="Password1!", role_id=1)
        self.assertIsNone(req_p3.phone_number)
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", phone_number="12345", password="Password1!", role_id=1)
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", phone_number="1234567890", password="Password1!", role_id=1)

        # password
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", password=123, role_id=1)
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", password="short", role_id=1)
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", password="nouppercase1", role_id=1)
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", password="NOLOWERCASE1", role_id=1)
        with self.assertRaises(ValidationError):
            CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", password="NoDigitsHere!", role_id=1)

        # status
        req_s1 = CreateUserRequest(full_name="Tên Hợp Lệ", email="a@b.com", password="Password1!", role_id=1, status="UNKNOWN")
        self.assertEqual(req_s1.status, "ACTIVE")

        # ChangeUserStatusRequest
        req_cs = ChangeUserStatusRequest(status="blocked")
        self.assertEqual(req_cs.status, "BLOCKED")
        with self.assertRaises(ValidationError):
            ChangeUserStatusRequest(status="INVALID_STATUS")

        # AdminResetPasswordRequest
        with self.assertRaises(ValidationError):
            AdminResetPasswordRequest(new_password=123)
        with self.assertRaises(ValidationError):
            AdminResetPasswordRequest(new_password="short")
        with self.assertRaises(ValidationError):
            AdminResetPasswordRequest(new_password="nouppercase1")
        with self.assertRaises(ValidationError):
            AdminResetPasswordRequest(new_password="NOLOWERCASE1")
        with self.assertRaises(ValidationError):
            AdminResetPasswordRequest(new_password="NoDigitsHere!")
        req_pwd = AdminResetPasswordRequest(new_password="ValidPass123!")
        self.assertEqual(req_pwd.new_password, "ValidPass123!")


if __name__ == "__main__":
    unittest.main()
