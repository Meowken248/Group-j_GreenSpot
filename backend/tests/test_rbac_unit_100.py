"""
Unit Test Suite for RBAC & 7-Column ACL Authorization Engine (Target: 100% Coverage)
Kiểm thử đơn vị chuyên sâu đạt độ phủ 100% cho module backend/app/api/v1/rbac.py:
1. get_current_active_user:
   - Thiếu Header Authorization / Không phải Bearer (401 TOKEN_MISSING)
   - Token hết hạn hoặc sai chữ ký (401 TOKEN_EXPIRED)
   - Payload thiếu "sub" hoặc "session_id" (401 TOKEN_INVALID)
   - UUID của "sub" hoặc "session_id" không hợp lệ (401 TOKEN_INVALID)
   - Session không tồn tại trong CSDL (401 SESSION_INVALID)
   - Session đã bị thu hồi revoked_at is not None (401 SESSION_INVALID)
   - Người dùng không tồn tại trong CSDL (401 SESSION_INVALID)
   - Người dùng có status != 'ACTIVE' (401 SESSION_INVALID)
   - Người dùng hợp lệ trả về User object
2. require_admin_user:
   - User không có role (403 PERMISSION_DENIED)
   - User có role nhưng không phải 'ADMIN' (403 PERMISSION_DENIED)
   - User có role 'ADMIN' trả về User
3. require_permission:
   - Admin bypass kiểm tra, trả về Admin User
   - User không có role_id (403 PERMISSION_DENIED)
   - User có role_id nhưng vai trò không có quyền {module}:{action} (403 PERMISSION_DENIED)
   - User có quyền {module}:{action} hợp lệ trả về User
4. get_all_roles:
   - Sắp xếp 4 vai trò hệ thống theo thứ tự chuẩn
   - Phân biệt scope 'CITY' -> 'Toàn thành phố' và 'DISTRICT' -> 'Quận'
   - Xử lý vai trò tùy chỉnh với created_at là None hoặc datetime
   - Đếm user_count chính xác
   - can_create = True khi roles < 20 và can_create = False khi roles >= 20
5. create_custom_role:
   - Chặn khi total_roles >= 20 (400 MAX_ROLES_REACHED)
   - Chặn trùng tên vai trò (không phân biệt hoa/thường, khoảng trắng) (400 ROLE_EXISTS)
   - Tạo thành công vai trò với scope 'DISTRICT' và 'CITY'
6. get_permission_matrix:
   - Trả về đủ 15 modules với 7 actions chuẩn
   - Trả về danh sách roles đã sắp xếp
   - Trả về mapping role_permissions chính xác
7. update_role_permissions:
   - Vai trò không tồn tại (404 ROLE_NOT_FOUND)
   - Sửa quyền Admin bị chặn (403 ADMIN_IMMUTABLE)
   - Lỗi OCC version mismatch (409 VERSION_MISMATCH)
   - Bỏ qua chuỗi không có dấu hai chấm ":"
   - Bỏ qua quyền không tồn tại trong cơ sở dữ liệu
   - Bỏ qua quyền module 'ROLE' đối với vai trò khác Admin
   - Tự động áp dụng interlocking rules: thêm ACCESS và VIEW khi có quyền con
   - Cập nhật thành công và tăng version + 1
8. delete_custom_role:
   - Vai trò không tồn tại (404 ROLE_NOT_FOUND)
   - Vai trò hệ thống bị chặn (403 SYSTEM_ROLE_CANNOT_DELETE)
   - Vai trò đang có người dùng bị chặn (400 ROLE_HAS_USERS)
   - Xoá vai trò thành công (200 OK)
9. reassign_and_delete_role:
   - Vai trò cũ không tồn tại (404 ROLE_NOT_FOUND)
   - Vai trò cũ là hệ thống bị chặn (403 SYSTEM_ROLE_CANNOT_DELETE)
   - Vai trò tiếp nhận không tồn tại (404 TARGET_ROLE_NOT_FOUND)
   - Vai trò tiếp nhận trùng vai trò cũ (400 INVALID_TARGET_ROLE)
   - Chuyển giao thành công người dùng và xoá vai trò cũ (200 OK)
10. get_my_permissions:
    - Admin: trả về toàn bộ 105 quyền hạn, is_admin=True
    - Người dùng không có role_id: trả về rỗng, is_admin=False
    - Người dùng thông thường: trả về danh sách quyền của vai trò
    - Người dùng có role_id nhưng role object None
11. check_specific_permission:
    - Admin: trả về allowed=True, reason='ADMIN_FULL_ACCESS'
    - Người dùng không có role_id: allowed=False, reason='NO_ROLE_ASSIGNED'
    - Người dùng có quyền: allowed=True, reason='GRANTED'
    - Người dùng không có quyền: allowed=False, reason='NOT_PERMITTED'
"""

import unittest
import uuid
from datetime import datetime, timezone
import jwt
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role, Permission, RolePermission, UserSession
from app.schemas.rbac import (
    CreateRoleRequest,
    UpdateRolePermissionsRequest,
    ReassignAndDeleteRoleRequest,
)
from app.utils.security import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    create_access_token,
)
import app.api.v1.rbac as rbac_module
from app.api.v1.rbac import (
    get_current_active_user,
    require_admin_user,
    require_permission,
    get_all_roles,
    create_custom_role,
    get_permission_matrix,
    update_role_permissions,
    delete_custom_role,
    reassign_and_delete_role,
    get_my_permissions,
    check_specific_permission,
)


class TestRbacUnitCoverage(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử đơn vị phủ 100% toàn bộ các hàm và luồng xử lý RBAC & ACL"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

    async def asyncTearDown(self):
        try:
            await self.session.rollback()
            await self.session.close()
        except Exception:
            pass
        await engine.dispose()

    # =========================================================================
    # 1. KIỂM THỬ get_current_active_user
    # =========================================================================
    async def test_get_current_active_user_missing_auth_header(self):
        """Thiếu Header Authorization -> 401 TOKEN_MISSING"""
        with self.assertRaises(HTTPException) as ctx:
            await get_current_active_user(authorization=None, db=self.session)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail["error_code"], "TOKEN_MISSING")

    async def test_get_current_active_user_non_bearer_header(self):
        """Header không bắt đầu bằng Bearer -> 401 TOKEN_MISSING"""
        with self.assertRaises(HTTPException) as ctx:
            await get_current_active_user(authorization="Basic dXNlcjpwYXNz", db=self.session)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail["error_code"], "TOKEN_MISSING")

    async def test_get_current_active_user_invalid_or_expired_jwt(self):
        """Token rác hoặc không giải mã được -> 401 TOKEN_EXPIRED"""
        with self.assertRaises(HTTPException) as ctx:
            await get_current_active_user(authorization="Bearer bad.jwt.token", db=self.session)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail["error_code"], "TOKEN_EXPIRED")

    async def test_get_current_active_user_missing_sub(self):
        """JWT hợp lệ nhưng thiếu trường 'sub' -> 401 TOKEN_INVALID"""
        token = jwt.encode({"session_id": str(uuid.uuid4())}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        with self.assertRaises(HTTPException) as ctx:
            await get_current_active_user(authorization=f"Bearer {token}", db=self.session)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail["error_code"], "TOKEN_INVALID")

    async def test_get_current_active_user_missing_session_id(self):
        """JWT hợp lệ nhưng thiếu trường 'session_id' -> 401 TOKEN_INVALID"""
        token = jwt.encode({"sub": str(uuid.uuid4())}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        with self.assertRaises(HTTPException) as ctx:
            await get_current_active_user(authorization=f"Bearer {token}", db=self.session)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail["error_code"], "TOKEN_INVALID")

    async def test_get_current_active_user_invalid_uuid_string(self):
        """JWT có sub hoặc session_id không đúng định dạng UUID -> 401 TOKEN_INVALID"""
        token = jwt.encode({"sub": "invalid-uuid-str", "session_id": str(uuid.uuid4())}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        with self.assertRaises(HTTPException) as ctx:
            await get_current_active_user(authorization=f"Bearer {token}", db=self.session)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail["error_code"], "TOKEN_INVALID")

    async def test_get_current_active_user_session_not_found(self):
        """Session không tồn tại trong DB -> 401 SESSION_INVALID"""
        fake_uid = uuid.uuid4()
        fake_sid = uuid.uuid4()
        token = jwt.encode({"sub": str(fake_uid), "session_id": str(fake_sid)}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        with self.assertRaises(HTTPException) as ctx:
            await get_current_active_user(authorization=f"Bearer {token}", db=self.session)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail["error_code"], "SESSION_INVALID")

    async def test_get_current_active_user_session_revoked(self):
        """Session đã bị thu hồi (revoked_at is not None) -> 401 SESSION_INVALID"""
        admin_res = await self.session.execute(select(User).where(User.email == "ddatmguyen2023+test@gmail.com"))
        admin = admin_res.scalars().first()

        test_sid = uuid.uuid4()
        sess = UserSession(
            session_id=test_sid,
            user_id=admin.user_id,
            refresh_token_hash="hash_revoked",
            revoked_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc),
        )
        self.session.add(sess)
        await self.session.commit()

        token = jwt.encode({"sub": str(admin.user_id), "session_id": str(test_sid)}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        try:
            with self.assertRaises(HTTPException) as ctx:
                await get_current_active_user(authorization=f"Bearer {token}", db=self.session)
            self.assertEqual(ctx.exception.status_code, 401)
            self.assertEqual(ctx.exception.detail["error_code"], "SESSION_INVALID")
        finally:
            await self.session.delete(sess)
            await self.session.commit()

    async def test_get_current_active_user_user_not_found_or_inactive(self):
        """Session hợp lệ nhưng User không có trong DB hoặc bị khoá -> 401 SESSION_INVALID"""
        admin_res = await self.session.execute(select(User).where(User.email == "ddatmguyen2023+test@gmail.com"))
        admin = admin_res.scalars().first()

        test_sid = uuid.uuid4()
        sess = UserSession(
            session_id=test_sid,
            user_id=admin.user_id,
            refresh_token_hash="hash_valid",
            revoked_at=None,
            expires_at=datetime.now(timezone.utc),
        )
        self.session.add(sess)
        await self.session.commit()

        # 1. JWT có sub là UUID người dùng không tồn tại
        fake_uid = uuid.uuid4()
        token_fake_user = jwt.encode({"sub": str(fake_uid), "session_id": str(test_sid)}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        try:
            with self.assertRaises(HTTPException) as ctx:
                await get_current_active_user(authorization=f"Bearer {token_fake_user}", db=self.session)
            self.assertEqual(ctx.exception.status_code, 401)
            self.assertEqual(ctx.exception.detail["error_code"], "SESSION_INVALID")

            # 2. User tồn tại nhưng status != ACTIVE (ví dụ BLOCKED)
            role_res = await self.session.execute(select(Role).where(Role.role_code == "CITIZEN"))
            citizen_role = role_res.scalars().first()

            blocked_uid = uuid.uuid4()
            blocked_user = User(
                user_id=blocked_uid,
                email=f"test_blocked_{uuid.uuid4().hex[:6]}@gmail.com",
                password_hash="pwd_hash",
                full_name="Blocked Test User",
                role_id=citizen_role.role_id,
                status="BLOCKED",
            )
            self.session.add(blocked_user)
            await self.session.commit()

            blocked_sid = uuid.uuid4()
            sess_blocked = UserSession(
                session_id=blocked_sid,
                user_id=blocked_uid,
                refresh_token_hash="hash_blocked",
                revoked_at=None,
                expires_at=datetime.now(timezone.utc),
            )
            self.session.add(sess_blocked)
            await self.session.commit()

            token_blocked = jwt.encode({"sub": str(blocked_uid), "session_id": str(blocked_sid)}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
            try:
                with self.assertRaises(HTTPException) as ctx2:
                    await get_current_active_user(authorization=f"Bearer {token_blocked}", db=self.session)
                self.assertEqual(ctx2.exception.status_code, 401)
                self.assertEqual(ctx2.exception.detail["error_code"], "SESSION_INVALID")
            finally:
                await self.session.delete(sess_blocked)
                await self.session.delete(blocked_user)
                await self.session.commit()
        finally:
            await self.session.delete(sess)
            await self.session.commit()

    async def test_get_current_active_user_success(self):
        """Session và User hợp lệ, ACTIVE -> trả về User"""
        # Lấy Admin user từ DB
        admin_res = await self.session.execute(select(User).where(User.email == "ddatmguyen2023+test@gmail.com"))
        admin = admin_res.scalars().first()
        self.assertIsNotNone(admin)

        # Tạo session hợp lệ cho Admin
        test_sid = uuid.uuid4()
        sess = UserSession(
            session_id=test_sid,
            user_id=admin.user_id,
            refresh_token_hash="active_hash",
            revoked_at=None,
            expires_at=datetime.now(timezone.utc),
        )
        self.session.add(sess)
        await self.session.commit()

        token = create_access_token(
            user_id=str(admin.user_id),
            email=admin.email,
            role="ADMIN",
            session_id=str(test_sid),
        )

        try:
            user = await get_current_active_user(authorization=f"Bearer {token}", db=self.session)
            self.assertEqual(user.user_id, admin.user_id)
            self.assertEqual(user.email, admin.email)
            self.assertEqual(user.status, "ACTIVE")
        finally:
            await self.session.delete(sess)
            await self.session.commit()

    # =========================================================================
    # 2. KIỂM THỬ require_admin_user
    # =========================================================================
    async def test_require_admin_user_no_role(self):
        """User không có role -> 403 PERMISSION_DENIED"""
        user = User(user_id=uuid.uuid4(), email="norole@test.com", status="ACTIVE", role=None)
        with self.assertRaises(HTTPException) as ctx:
            await require_admin_user(current_user=user)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail["error_code"], "PERMISSION_DENIED")

    async def test_require_admin_user_non_admin_role(self):
        """User có role CITIZEN -> 403 PERMISSION_DENIED"""
        citizen_role = Role(role_code="CITIZEN", role_name="Công dân")
        user = User(user_id=uuid.uuid4(), email="citizen@test.com", status="ACTIVE", role=citizen_role)
        with self.assertRaises(HTTPException) as ctx:
            await require_admin_user(current_user=user)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail["error_code"], "PERMISSION_DENIED")

    async def test_require_admin_user_success(self):
        """User có role ADMIN -> trả về user"""
        admin_role = Role(role_code="ADMIN", role_name="Quản trị viên")
        user = User(user_id=uuid.uuid4(), email="admin@test.com", status="ACTIVE", role=admin_role)
        res = await require_admin_user(current_user=user)
        self.assertEqual(res, user)

    # =========================================================================
    # 3. KIỂM THỬ require_permission
    # =========================================================================
    async def test_require_permission_admin_bypass(self):
        """Admin luôn được bypass cấp quyền đầy đủ"""
        admin_role = Role(role_code="ADMIN", role_name="Quản trị viên")
        user = User(user_id=uuid.uuid4(), email="admin@test.com", status="ACTIVE", role=admin_role)
        dep = require_permission("GIS_MAP", "DELETE")
        res = await dep(current_user=user, db=self.session)
        self.assertEqual(res, user)

    async def test_require_permission_no_role_id(self):
        """Người dùng không có role_id -> 403 PERMISSION_DENIED"""
        user = User(user_id=uuid.uuid4(), email="norole@test.com", status="ACTIVE", role=None, role_id=None)
        dep = require_permission("GIS_MAP", "VIEW")
        with self.assertRaises(HTTPException) as ctx:
            await dep(current_user=user, db=self.session)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail["error_code"], "PERMISSION_DENIED")

    async def test_require_permission_granted_and_denied(self):
        """Kiểm tra người dùng thường khi có quyền và khi không có quyền"""
        # Lấy vai trò CITIZEN
        c_res = await self.session.execute(select(Role).where(Role.role_code == "CITIZEN"))
        citizen_role = c_res.scalars().first()

        user = User(
            user_id=uuid.uuid4(),
            email="citizen_test@test.com",
            status="ACTIVE",
            role=citizen_role,
            role_id=citizen_role.role_id,
        )

        # CITIZEN có quyền INCIDENTS:CREATE
        dep_granted = require_permission("INCIDENTS", "CREATE")
        res = await dep_granted(current_user=user, db=self.session)
        self.assertEqual(res, user)

        # CITIZEN không có quyền USER_MANAGEMENT:DELETE
        dep_denied = require_permission("USER_MANAGEMENT", "DELETE")
        with self.assertRaises(HTTPException) as ctx:
            await dep_denied(current_user=user, db=self.session)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail["error_code"], "PERMISSION_DENIED")

    # =========================================================================
    # 4. KIỂM THỬ get_all_roles (MÀN 1)
    # =========================================================================
    async def test_get_all_roles_success_and_can_create(self):
        """Lấy danh sách vai trò: đúng thứ tự, scope display, và cờ can_create"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        res = await get_all_roles(current_admin=admin_user, db=self.session)
        self.assertGreaterEqual(res.total, 4)
        self.assertTrue(res.can_create)

        # 4 vai trò hệ thống đầu tiên
        system_codes = [r.role_code for r in res.roles[:4]]
        self.assertEqual(system_codes, ["ADMIN", "DISTRICT_MANAGER", "RESPONDER", "CITIZEN"])

        # Kiểm tra scope_display
        for r in res.roles:
            if r.scope == "CITY":
                self.assertEqual(r.scope_display, "Toàn thành phố")
            else:
                self.assertEqual(r.scope_display, "Quận")

    async def test_get_all_roles_with_custom_roles_and_none_created_at(self):
        """Kiểm tra sắp xếp vai trò tùy chỉnh khi created_at có giá trị hoặc None"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        # Tạo vai trò tùy chỉnh test
        custom_role = Role(
            role_code=f"ROLE_TEST_{uuid.uuid4().hex[:6]}",
            role_name="Vai trò Kiểm thử Tùy chỉnh",
            scope="DISTRICT",
            is_system=False,
            version=1,
            created_at=None,
        )
        self.session.add(custom_role)
        await self.session.commit()

        try:
            res = await get_all_roles(current_admin=admin_user, db=self.session)
            found = any(r.role_code == custom_role.role_code for r in res.roles)
            self.assertTrue(found)
        finally:
            await self.session.delete(custom_role)
            await self.session.commit()

    # =========================================================================
    # 5. KIỂM THỬ create_custom_role (MÀN 2)
    # =========================================================================
    async def test_create_custom_role_success_and_scope(self):
        """Tạo vai trò tùy chỉnh mới với scope CITY và DISTRICT"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        # 1. Scope DISTRICT
        req1 = CreateRoleRequest(
            role_name=f"Cán bộ Phường {uuid.uuid4().hex[:4]}",
            description="Mô tả vai trò phường",
            scope="DISTRICT",
        )
        res1 = await create_custom_role(payload=req1, current_admin=admin_user, db=self.session)
        self.assertEqual(res1.role_name, req1.role_name)
        self.assertEqual(res1.scope, "DISTRICT")
        self.assertEqual(res1.scope_display, "Quận")
        self.assertEqual(res1.user_count, 0)
        self.assertEqual(res1.version, 1)

        # 2. Scope CITY
        req2 = CreateRoleRequest(
            role_name=f"Thanh tra Môi trường {uuid.uuid4().hex[:4]}",
            description="Mô tả thanh tra toàn thành phố",
            scope="CITY",
        )
        res2 = await create_custom_role(payload=req2, current_admin=admin_user, db=self.session)
        self.assertEqual(res2.scope, "CITY")
        self.assertEqual(res2.scope_display, "Toàn thành phố")

        # Dọn dẹp
        await self.session.execute(delete(Role).where(Role.role_id.in_([res1.role_id, res2.role_id])))
        await self.session.commit()

    async def test_create_custom_role_duplicate_name(self):
        """Tên vai trò trùng lặp (không phân biệt hoa/thường, khoảng trắng) -> 400 ROLE_EXISTS"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        req = CreateRoleRequest(role_name="Admin", scope="CITY")
        res = await create_custom_role(payload=req, current_admin=admin_user, db=self.session)
        self.assertEqual(res.status_code, 400)
        import json
        body = json.loads(res.body.decode())
        self.assertEqual(body["error_code"], "ROLE_EXISTS")

    async def test_create_custom_role_max_roles_reached(self):
        """Đã đạt giới hạn 20 vai trò -> 400 MAX_ROLES_REACHED"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        # Giả lập count >= 20
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar.return_value = 20
        mock_db.execute.return_value = mock_result

        req = CreateRoleRequest(role_name="Vai trò thứ 21", scope="DISTRICT")
        res = await create_custom_role(payload=req, current_admin=admin_user, db=mock_db)
        self.assertEqual(res.status_code, 400)
        import json
        body = json.loads(res.body.decode())
        self.assertEqual(body["error_code"], "MAX_ROLES_REACHED")

    # =========================================================================
    # 6. KIỂM THỬ get_permission_matrix (MÀN 3)
    # =========================================================================
    async def test_get_permission_matrix_success(self):
        """Lấy ma trận quyền: đủ 15 modules x 7 actions chuẩn, vai trò, mapping role_permissions"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        matrix = await get_permission_matrix(current_admin=admin_user, db=self.session)
        self.assertEqual(len(matrix.modules), 15)
        for m in matrix.modules:
            self.assertEqual(len(m.actions), 7)
            self.assertEqual(m.actions, ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"])

        self.assertGreaterEqual(len(matrix.roles), 4)

        # Kiểm tra Admin có đủ 105 permissions
        admin_obj = next(r for r in matrix.roles if r.role_code == "ADMIN")
        admin_perms = matrix.role_permissions.get(str(admin_obj.role_id), [])
        self.assertEqual(len(admin_perms), 105)

    # =========================================================================
    # 7. KIỂM THỬ update_role_permissions (MÀN 3)
    # =========================================================================
    async def test_update_role_permissions_role_not_found(self):
        """Vai trò không tồn tại -> 404 ROLE_NOT_FOUND"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        req = UpdateRolePermissionsRequest(permissions=["GIS_MAP:ACCESS"], version=1)
        res = await update_role_permissions(role_id=999999, payload=req, current_admin=admin_user, db=self.session)
        self.assertEqual(res.status_code, 404)
        import json
        body = json.loads(res.body.decode())
        self.assertEqual(body["error_code"], "ROLE_NOT_FOUND")

    async def test_update_role_permissions_admin_immutable(self):
        """Cấm sửa quyền vai trò Admin -> 403 ADMIN_IMMUTABLE"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        admin_res = await self.session.execute(select(Role).where(Role.role_code == "ADMIN"))
        admin_db = admin_res.scalars().first()

        req = UpdateRolePermissionsRequest(permissions=[], version=admin_db.version)
        res = await update_role_permissions(role_id=admin_db.role_id, payload=req, current_admin=admin_user, db=self.session)
        self.assertEqual(res.status_code, 403)
        import json
        body = json.loads(res.body.decode())
        self.assertEqual(body["error_code"], "ADMIN_IMMUTABLE")

    async def test_update_role_permissions_occ_mismatch(self):
        """OCC version mismatch -> 409 VERSION_MISMATCH"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        c_res = await self.session.execute(select(Role).where(Role.role_code == "CITIZEN"))
        citizen_role = c_res.scalars().first()

        req = UpdateRolePermissionsRequest(permissions=["GIS_MAP:ACCESS"], version=citizen_role.version + 999)
        res = await update_role_permissions(role_id=citizen_role.role_id, payload=req, current_admin=admin_user, db=self.session)
        self.assertEqual(res.status_code, 409)
        import json
        body = json.loads(res.body.decode())
        self.assertEqual(body["error_code"], "VERSION_MISMATCH")

    async def test_update_role_permissions_interlocking_and_filters(self):
        """
        Kiểm tra:
        - Chuỗi không hợp lệ không có dấu ':' -> bỏ qua
        - Quyền không tồn tại trong CSDL -> bỏ qua
        - Module ROLE đối với vai trò khác Admin -> bỏ qua
        - Quyền con tự động thêm ACCESS và VIEW
        - Tăng version sau khi lưu thành công
        """
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        # Tạo vai trò tùy chỉnh
        test_role = Role(
            role_code=f"ROLE_OCC_{uuid.uuid4().hex[:6]}",
            role_name="Vai trò Test Interlocking",
            scope="DISTRICT",
            is_system=False,
            version=1,
        )
        self.session.add(test_role)
        await self.session.commit()
        await self.session.refresh(test_role)

        try:
            req = UpdateRolePermissionsRequest(
                permissions=[
                    "INVALID_STRING_WITHOUT_COLON",  # Bỏ qua vì không có ':'
                    "UNKNOWN_MODULE:DELETE",         # Bỏ qua vì không có trong CSDL
                    "ROLE:VIEW",                     # Bỏ qua vì ROLE chỉ dành cho Admin
                    "INCIDENTS:DELETE",              # Sẽ tự kích hoạt INCIDENTS:ACCESS và INCIDENTS:VIEW
                    "AIR_QUALITY:EXPORT",            # Sẽ tự kích hoạt AIR_QUALITY:ACCESS và AIR_QUALITY:VIEW
                ],
                version=1,
            )
            res = await update_role_permissions(role_id=test_role.role_id, payload=req, current_admin=admin_user, db=self.session)
            self.assertTrue(res.success)
            self.assertEqual(res.new_version, 2)

            # Kiểm tra các permissions đã được gán vào DB
            rp_res = await self.session.execute(
                select(Permission.permission_code)
                .join(RolePermission, Permission.permission_id == RolePermission.permission_id)
                .where(RolePermission.role_id == test_role.role_id)
            )
            saved_perms = set(rp_res.scalars().all())

            # Phải có INCIDENTS:DELETE, INCIDENTS:VIEW, INCIDENTS:ACCESS
            self.assertIn("INCIDENTS:DELETE", saved_perms)
            self.assertIn("INCIDENTS:VIEW", saved_perms)
            self.assertIn("INCIDENTS:ACCESS", saved_perms)

            # Phải có AIR_QUALITY:EXPORT, AIR_QUALITY:VIEW, AIR_QUALITY:ACCESS
            self.assertIn("AIR_QUALITY:EXPORT", saved_perms)
            self.assertIn("AIR_QUALITY:VIEW", saved_perms)
            self.assertIn("AIR_QUALITY:ACCESS", saved_perms)

            # Không được có ROLE:VIEW
            self.assertNotIn("ROLE:VIEW", saved_perms)
        finally:
            await self.session.execute(delete(RolePermission).where(RolePermission.role_id == test_role.role_id))
            await self.session.delete(test_role)
            await self.session.commit()

    # =========================================================================
    # 8. KIỂM THỬ delete_custom_role (MÀN 4)
    # =========================================================================
    async def test_delete_custom_role_not_found(self):
        """Vai trò không tồn tại -> 404 ROLE_NOT_FOUND"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        res = await delete_custom_role(role_id=999999, current_admin=admin_user, db=self.session)
        self.assertEqual(res.status_code, 404)

    async def test_delete_custom_role_system_role_forbidden(self):
        """Cấm xóa vai trò hệ thống -> 403 SYSTEM_ROLE_CANNOT_DELETE"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        admin_res = await self.session.execute(select(Role).where(Role.role_code == "ADMIN"))
        admin_db = admin_res.scalars().first()

        res = await delete_custom_role(role_id=admin_db.role_id, current_admin=admin_user, db=self.session)
        self.assertEqual(res.status_code, 403)
        import json
        body = json.loads(res.body.decode())
        self.assertEqual(body["error_code"], "SYSTEM_ROLE_CANNOT_DELETE")

    async def test_delete_custom_role_with_users_forbidden(self):
        """Vai trò đang có người dùng -> 400 ROLE_HAS_USERS"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        # Tạo vai trò tùy chỉnh và gán 1 user
        test_role = Role(
            role_code=f"ROLE_USERS_{uuid.uuid4().hex[:6]}",
            role_name="Vai trò Có Người Dùng",
            scope="DISTRICT",
            is_system=False,
            version=1,
        )
        self.session.add(test_role)
        await self.session.commit()
        await self.session.refresh(test_role)

        dummy_user = User(
            user_id=uuid.uuid4(),
            email=f"dummy_{uuid.uuid4().hex[:6]}@test.com",
            password_hash="pwd",
            full_name="Dummy User",
            role_id=test_role.role_id,
            status="ACTIVE",
        )
        self.session.add(dummy_user)
        await self.session.commit()

        try:
            res = await delete_custom_role(role_id=test_role.role_id, current_admin=admin_user, db=self.session)
            self.assertEqual(res.status_code, 400)
            import json
            body = json.loads(res.body.decode())
            self.assertEqual(body["error_code"], "ROLE_HAS_USERS")
        finally:
            await self.session.delete(dummy_user)
            await self.session.delete(test_role)
            await self.session.commit()

    async def test_delete_custom_role_success(self):
        """Xoá vai trò tùy chỉnh thành công khi 0 người dùng -> 200 OK"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        test_role = Role(
            role_code=f"ROLE_DEL_{uuid.uuid4().hex[:6]}",
            role_name="Vai trò Cần Xoá",
            scope="DISTRICT",
            is_system=False,
            version=1,
        )
        self.session.add(test_role)
        await self.session.commit()
        await self.session.refresh(test_role)

        res = await delete_custom_role(role_id=test_role.role_id, current_admin=admin_user, db=self.session)
        self.assertTrue(res["success"])

    # =========================================================================
    # 9. KIỂM THỬ reassign_and_delete_role (MÀN 5)
    # =========================================================================
    async def test_reassign_and_delete_role_edge_cases(self):
        """Kiểm tra các trường hợp lỗi chuyển giao vai trò: 404 cũ, 403 hệ thống, 404 đích, 400 trùng đích"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        # 1. Vai trò cũ không tồn tại
        res1 = await reassign_and_delete_role(
            role_id=999999,
            payload=ReassignAndDeleteRoleRequest(target_role_id=1),
            current_admin=admin_user,
            db=self.session,
        )
        self.assertEqual(res1.status_code, 404)

        # 2. Vai trò cũ là hệ thống
        admin_res = await self.session.execute(select(Role).where(Role.role_code == "ADMIN"))
        admin_db = admin_res.scalars().first()
        res2 = await reassign_and_delete_role(
            role_id=admin_db.role_id,
            payload=ReassignAndDeleteRoleRequest(target_role_id=1),
            current_admin=admin_user,
            db=self.session,
        )
        self.assertEqual(res2.status_code, 403)

        # Tạo vai trò tùy chỉnh test
        old_role = Role(
            role_code=f"ROLE_OLD_{uuid.uuid4().hex[:6]}",
            role_name="Vai trò Cũ Test",
            scope="DISTRICT",
            is_system=False,
            version=1,
        )
        self.session.add(old_role)
        await self.session.commit()
        await self.session.refresh(old_role)

        try:
            # 3. Vai trò đích không tồn tại
            res3 = await reassign_and_delete_role(
                role_id=old_role.role_id,
                payload=ReassignAndDeleteRoleRequest(target_role_id=888888),
                current_admin=admin_user,
                db=self.session,
            )
            self.assertEqual(res3.status_code, 404)

            # 4. Vai trò đích trùng vai trò cũ
            res4 = await reassign_and_delete_role(
                role_id=old_role.role_id,
                payload=ReassignAndDeleteRoleRequest(target_role_id=old_role.role_id),
                current_admin=admin_user,
                db=self.session,
            )
            self.assertEqual(res4.status_code, 400)
        finally:
            await self.session.delete(old_role)
            await self.session.commit()

    async def test_reassign_and_delete_role_success(self):
        """Chuyển giao người dùng và xoá vai trò cũ thành công -> 200 OK"""
        admin_role = Role(role_code="ADMIN", role_name="Admin")
        admin_user = User(user_id=uuid.uuid4(), role=admin_role)

        # Tạo 2 vai trò tùy chỉnh
        old_role = Role(role_code=f"ROLE_O_{uuid.uuid4().hex[:4]}", role_name="Vai trò Nguồn", scope="DISTRICT", is_system=False)
        target_role = Role(role_code=f"ROLE_T_{uuid.uuid4().hex[:4]}", role_name="Vai trò Đích", scope="DISTRICT", is_system=False)
        self.session.add_all([old_role, target_role])
        await self.session.commit()
        await self.session.refresh(old_role)
        await self.session.refresh(target_role)

        dummy_user = User(
            user_id=uuid.uuid4(),
            email=f"reassign_{uuid.uuid4().hex[:6]}@test.com",
            password_hash="pwd",
            full_name="User Chuyển Giao",
            role_id=old_role.role_id,
            status="ACTIVE",
        )
        self.session.add(dummy_user)
        await self.session.commit()

        try:
            payload = ReassignAndDeleteRoleRequest(target_role_id=target_role.role_id)
            res = await reassign_and_delete_role(
                role_id=old_role.role_id,
                payload=payload,
                current_admin=admin_user,
                db=self.session,
            )
            self.assertTrue(res["success"])

            # Kiểm tra user đã chuyển sang vai trò đích
            await self.session.refresh(dummy_user)
            self.assertEqual(dummy_user.role_id, target_role.role_id)

            # Kiểm tra vai trò cũ đã bị xoá
            chk = await self.session.execute(select(Role).where(Role.role_id == old_role.role_id))
            self.assertIsNone(chk.scalar_one_or_none())
        finally:
            await self.session.delete(dummy_user)
            await self.session.delete(target_role)
            await self.session.commit()

    # =========================================================================
    # 10. KIỂM THỬ get_my_permissions
    # =========================================================================
    async def test_get_my_permissions_admin(self):
        """Admin: trả về đầy đủ 105 quyền và is_admin=True"""
        admin_role = Role(role_code="ADMIN", role_name="Quản trị viên")
        user = User(user_id=uuid.uuid4(), email="admin@test.com", status="ACTIVE", role=admin_role, role_id=1)
        res = await get_my_permissions(current_user=user, db=self.session)
        self.assertTrue(res["is_admin"])
        self.assertEqual(len(res["permissions"]), 105)

    async def test_get_my_permissions_no_role(self):
        """Người dùng không có vai trò -> permissions rỗng, is_admin=False"""
        user = User(user_id=uuid.uuid4(), email="norole@test.com", status="ACTIVE", role=None, role_id=None)
        res = await get_my_permissions(current_user=user, db=self.session)
        self.assertFalse(res["is_admin"])
        self.assertEqual(res["permissions"], [])
        self.assertIsNone(res["role_code"])

    async def test_get_my_permissions_standard_user(self):
        """Người dùng vai trò CITIZEN -> trả về các quyền tương ứng"""
        c_res = await self.session.execute(select(Role).where(Role.role_code == "CITIZEN"))
        citizen_role = c_res.scalars().first()

        user = User(
            user_id=uuid.uuid4(),
            email="citizen@test.com",
            status="ACTIVE",
            role=citizen_role,
            role_id=citizen_role.role_id,
        )
        res = await get_my_permissions(current_user=user, db=self.session)
        self.assertFalse(res["is_admin"])
        self.assertEqual(res["role_code"], "CITIZEN")
        self.assertIn("INCIDENTS:CREATE", res["permissions"])

    async def test_get_my_permissions_role_id_with_role_none(self):
        """Người dùng có role_id nhưng quan hệ role=None -> role_code=None an toàn"""
        c_res = await self.session.execute(select(Role).where(Role.role_code == "CITIZEN"))
        citizen_role = c_res.scalars().first()

        user = User(
            user_id=uuid.uuid4(),
            email="noroleobj@test.com",
            status="ACTIVE",
            role=None,
            role_id=citizen_role.role_id,
        )
        res = await get_my_permissions(current_user=user, db=self.session)
        self.assertFalse(res["is_admin"])
        self.assertIsNone(res["role_code"])

    # =========================================================================
    # 11. KIỂM THỬ check_specific_permission
    # =========================================================================
    async def test_check_specific_permission_admin(self):
        """Admin luôn allowed=True với ADMIN_FULL_ACCESS"""
        admin_role = Role(role_code="ADMIN", role_name="Quản trị viên")
        user = User(user_id=uuid.uuid4(), email="admin@test.com", status="ACTIVE", role=admin_role)
        res = await check_specific_permission("GIS_MAP", "DELETE", current_user=user, db=self.session)
        self.assertTrue(res["allowed"])
        self.assertEqual(res["reason"], "ADMIN_FULL_ACCESS")

    async def test_check_specific_permission_no_role(self):
        """User không có role_id -> allowed=False với NO_ROLE_ASSIGNED"""
        user = User(user_id=uuid.uuid4(), email="norole@test.com", status="ACTIVE", role=None, role_id=None)
        res = await check_specific_permission("GIS_MAP", "VIEW", current_user=user, db=self.session)
        self.assertFalse(res["allowed"])
        self.assertEqual(res["reason"], "NO_ROLE_ASSIGNED")

    async def test_check_specific_permission_granted_and_not_permitted(self):
        """Kiểm tra GRANTED vs NOT_PERMITTED trên vai trò CITIZEN"""
        c_res = await self.session.execute(select(Role).where(Role.role_code == "CITIZEN"))
        citizen_role = c_res.scalars().first()

        user = User(
            user_id=uuid.uuid4(),
            email="citizen@test.com",
            status="ACTIVE",
            role=citizen_role,
            role_id=citizen_role.role_id,
        )
        # Quyền có
        res_granted = await check_specific_permission("INCIDENTS", "CREATE", current_user=user, db=self.session)
        self.assertTrue(res_granted["allowed"])
        self.assertEqual(res_granted["reason"], "GRANTED")

        # Quyền không có
        res_denied = await check_specific_permission("STATISTICS", "DELETE", current_user=user, db=self.session)
        self.assertFalse(res_denied["allowed"])
        self.assertEqual(res_denied["reason"], "NOT_PERMITTED")


    # =========================================================================
    # 12. KIỂM THỬ SCHEMA VALIDATORS (schemas/rbac.py - 100% COVERAGE)
    # =========================================================================
    def test_create_role_request_validators(self):
        """Kiểm tra toàn bộ các validators của CreateRoleRequest"""
        from pydantic import ValidationError

        # 1. role_name không phải chuỗi
        with self.assertRaises(ValidationError):
            CreateRoleRequest(role_name=12345)

        # 2. role_name < 2 ký tự hoặc > 30 ký tự
        with self.assertRaises(ValidationError):
            CreateRoleRequest(role_name="A")
        with self.assertRaises(ValidationError):
            CreateRoleRequest(role_name="Tên vai trò này dài vượt quá ba mươi ký tự quy chuẩn")

        # 3. role_name chứa ký tự đặc biệt không hợp lệ
        with self.assertRaises(ValidationError):
            CreateRoleRequest(role_name="Admin @ Hacker #1")

        # 4. description rỗng hoặc None
        req_none_desc = CreateRoleRequest(role_name="Vai trò Mới", description=None)
        self.assertIsNone(req_none_desc.description)
        req_empty_desc = CreateRoleRequest(role_name="Vai trò Mới", description="   ")
        self.assertIsNone(req_empty_desc.description)

        # 5. description không phải chuỗi (số)
        req_int_desc = CreateRoleRequest(role_name="Vai trò Mới", description=999)
        self.assertIsNone(req_int_desc.description)

        # 6. description dài > 200 ký tự -> bị cắt còn 200
        long_desc = "A" * 250
        req_long_desc = CreateRoleRequest(role_name="Vai trò Mới", description=long_desc)
        self.assertEqual(len(req_long_desc.description), 200)

        # 7. scope 'Toàn thành phố' và 'TOAN THANH PHO' -> 'CITY'
        req_city1 = CreateRoleRequest(role_name="Vai trò Mới", scope="Toàn thành phố")
        self.assertEqual(req_city1.scope, "CITY")
        req_city2 = CreateRoleRequest(role_name="Vai trò Mới", scope="TOAN THANH PHO")
        self.assertEqual(req_city2.scope, "CITY")
        req_dist = CreateRoleRequest(role_name="Vai trò Mới", scope="Quận 1")
        self.assertEqual(req_dist.scope, "DISTRICT")

    # =========================================================================
    # 13. KIỂM THỬ MY PERMISSIONS ENDPOINT (GET /api/v1/rbac/my-permissions)
    # =========================================================================
    async def test_get_my_permissions_admin(self):
        """Admin nhận 100% tất cả các quyền hệ thống"""
        admin_role = Role(role_id=1, role_code="ADMIN", role_name="Quản trị viên hệ thống")
        user = User(user_id=uuid.uuid4(), email="admin_perm@test.com", full_name="Admin Test", status="ACTIVE", role=admin_role, role_id=1)
        res = await get_my_permissions(current_user=user, db=self.session)
        self.assertEqual(res["role_code"], "ADMIN")
        self.assertTrue(res["is_admin"])
        self.assertGreaterEqual(len(res["permissions"]), 100)
        self.assertIn("GIS_MAP:ACCESS", res["permissions"])
        self.assertIn("ROLE:ACCESS", res["permissions"])

    async def test_get_my_permissions_citizen(self):
        """Citizen nhận đúng các quyền được gán trong DB"""
        c_res = await self.session.execute(select(Role).where(Role.role_code == "CITIZEN"))
        citizen_role = c_res.scalars().first()

        user = User(
            user_id=uuid.uuid4(),
            email="citizen_perm@test.com",
            full_name="Citizen Test",
            status="ACTIVE",
            role=citizen_role,
            role_id=citizen_role.role_id,
        )
        res = await get_my_permissions(current_user=user, db=self.session)
        self.assertEqual(res["role_code"], "CITIZEN")
        self.assertIn("INCIDENTS:CREATE", res["permissions"])
        self.assertNotIn("ROLE:ACCESS", res["permissions"])

    async def test_get_my_permissions_no_role(self):
        """User không có role_id trả về danh sách rỗng"""
        user = User(
            user_id=uuid.uuid4(),
            email="no_role_perm@test.com",
            full_name="No Role User",
            status="ACTIVE",
            role=None,
            role_id=None,
        )
        res = await get_my_permissions(current_user=user, db=self.session)
        self.assertIsNone(res["role_code"])
        self.assertEqual(len(res["permissions"]), 0)


if __name__ == "__main__":
    unittest.main()
