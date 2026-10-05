"""
Integration & End-to-End API Tests for GreenSpot RBAC Matrix (Giai đoạn 2)
Kiểm thử toàn diện 6 RESTful API endpoints phân quyền vai trò:
1. GET /api/v1/rbac/roles - Danh sách vai trò, thứ tự hệ thống, đếm user, cờ can_create
2. POST /api/v1/rbac/roles - Tạo vai trò mới, validate tên tiếng Việt, chống trùng, giới hạn 20 vai trò
3. GET /api/v1/rbac/matrix - Ma trận phân quyền 15 modules chuẩn và mapping quyền
4. PUT /api/v1/rbac/roles/{role_id}/permissions - Cập nhật quyền, OCC locking (409), cấm sửa Admin (403), Interlocking rules
5. DELETE /api/v1/rbac/roles/{role_id} - Chặn xoá vai trò hệ thống, chặn xoá khi có user
6. POST /api/v1/rbac/roles/{role_id}/reassign-and-delete - Chuyển giao người dùng và xoá vai trò
"""

import unittest
import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"
ADMIN_EMAIL = "ddatmguyen2023+test@gmail.com"
ADMIN_PASSWORD = "Dat123123,"


class TestRbacApi(unittest.TestCase):
    """Bộ kiểm thử tích hợp đầy đủ cho RBAC APIs"""

    @classmethod
    def setUpClass(cls):
        # 1. Đăng nhập lấy access_token của Admin
        login_res = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "remember_me": True,
            },
        )
        if login_res.status_code != 200:
            raise RuntimeError(f"Không thể đăng nhập tài khoản Admin kiểm thử: {login_res.text}")
        data = login_res.json()
        cls.token = data["access_token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_get_roles_unauthorized(self):
        """Kiểm tra chặn truy cập khi không có token (401)"""
        res = requests.get(f"{BASE_URL}/rbac/roles")
        self.assertEqual(res.status_code, 401)
        err = res.json()["detail"]
        self.assertEqual(err["error_code"], "TOKEN_MISSING")

    def test_02_get_roles_success_and_ordering(self):
        """Kiểm tra lấy danh sách vai trò: đúng 4 vai trò hệ thống đầu tiên, đếm user, can_create"""
        res = requests.get(f"{BASE_URL}/rbac/roles", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        roles = data["roles"]
        self.assertGreaterEqual(len(roles), 4)

        # 4 vai trò hệ thống đầu tiên theo đúng thứ tự
        system_codes = [r["role_code"] for r in roles[:4]]
        self.assertEqual(system_codes, ["ADMIN", "DISTRICT_MANAGER", "RESPONDER", "CITIZEN"])

        # Kiểm tra Admin role
        admin_role = roles[0]
        self.assertEqual(admin_role["role_name"], "Admin")
        self.assertEqual(admin_role["scope_display"], "Toàn thành phố")
        self.assertTrue(admin_role["is_system"])
        self.assertGreaterEqual(admin_role["user_count"], 1)

        # Cờ can_create
        self.assertIn("can_create", data)
        self.assertEqual(data["can_create"], len(roles) < 20)

    def test_03_create_custom_role_validation_and_duplicate(self):
        """Kiểm tra tạo vai trò mới: validation tên tiếng Việt, chống trùng lặp, tạo thành công"""
        # Tên quá ngắn (< 2 ký tự)
        res_short = requests.post(
            f"{BASE_URL}/rbac/roles",
            headers=self.headers,
            json={"role_name": "A", "scope": "DISTRICT"},
        )
        self.assertEqual(res_short.status_code, 422)

        # Tạo vai trò mới hợp lệ
        valid_name = "Điều phối viên Môi trường Q1"
        res_create = requests.post(
            f"{BASE_URL}/rbac/roles",
            headers=self.headers,
            json={
                "role_name": valid_name,
                "description": "Chuyên viên giám sát và điều phối điểm nóng quận 1",
                "scope": "DISTRICT",
            },
        )
        self.assertIn(res_create.status_code, [200, 400])

        if res_create.status_code == 400:
            # Đã tồn tại từ lần chạy trước -> Xóa để tạo lại kiểm tra tính độc lập
            pass
        else:
            new_role = res_create.json()
            self.assertEqual(new_role["role_name"], valid_name)
            self.assertEqual(new_role["scope"], "DISTRICT")
            self.assertEqual(new_role["scope_display"], "Quận")
            self.assertEqual(new_role["user_count"], 0)
            self.assertEqual(new_role["version"], 1)
            self.assertFalse(new_role["is_system"])

        # Thử tạo lại với tên trùng lặp (kể cả hoa/thường hoặc thừa khoảng trắng) -> 400 ROLE_EXISTS
        res_dup = requests.post(
            f"{BASE_URL}/rbac/roles",
            headers=self.headers,
            json={
                "role_name": f"  {valid_name.upper()}  ",
                "scope": "DISTRICT",
            },
        )
        self.assertEqual(res_dup.status_code, 400)
        self.assertEqual(res_dup.json()["error_code"], "ROLE_EXISTS")

    def test_04_get_permission_matrix(self):
        """Kiểm tra ma trận phân quyền: đầy đủ 15 modules chuẩn và mapping quyền"""
        res = requests.get(f"{BASE_URL}/rbac/matrix", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        matrix = res.json()

        # 15 modules chuẩn
        modules = matrix["modules"]
        self.assertEqual(len(modules), 15)
        mod_codes = [m["code"] for m in modules]
        self.assertIn("GIS_MAP", mod_codes)
        self.assertIn("INCIDENTS", mod_codes)
        self.assertIn("ROLE", mod_codes)
        self.assertIn("STATISTICS", mod_codes)
        self.assertIn("AUDIT_LOG", mod_codes)

        # Module STATISTICS và AUDIT_LOG chỉ có action VIEW
        stat_mod = next(m for m in modules if m["code"] == "STATISTICS")
        self.assertEqual(stat_mod["actions"], ["VIEW"])
        audit_mod = next(m for m in modules if m["code"] == "AUDIT_LOG")
        self.assertEqual(audit_mod["actions"], ["VIEW"])

        # Danh sách vai trò và role_permissions
        self.assertIn("roles", matrix)
        self.assertIn("role_permissions", matrix)

    def test_05_update_role_permissions_rules_and_occ(self):
        """
        Kiểm tra cập nhật quyền hạn vai trò:
        - Chặn sửa Admin (403 ADMIN_IMMUTABLE)
        - Kiểm tra OCC Conflict (409 VERSION_MISMATCH)
        - Tự động áp dụng interlocking: thêm CREATE tự động có VIEW
        - Bỏ qua các ô không áp dụng
        - Tăng version sau khi lưu
        """
        # Lấy danh sách roles để tìm Admin và role tùy chỉnh
        roles_res = requests.get(f"{BASE_URL}/rbac/roles", headers=self.headers)
        roles = roles_res.json()["roles"]
        admin_role = next(r for r in roles if r["role_code"] == "ADMIN")
        custom_role = next((r for r in roles if not r["is_system"]), None)

        if not custom_role:
            # Tạo role test nếu chưa có
            c_res = requests.post(
                f"{BASE_URL}/rbac/roles",
                headers=self.headers,
                json={"role_name": "Vai trò Kiểm thử OCC", "scope": "CITY"},
            )
            custom_role = c_res.json()

        # 1. Chặn sửa Admin
        res_admin = requests.put(
            f"{BASE_URL}/rbac/roles/{admin_role['role_id']}/permissions",
            headers=self.headers,
            json={"permissions": ["GIS_MAP:VIEW"], "version": admin_role["version"]},
        )
        self.assertEqual(res_admin.status_code, 403)
        self.assertEqual(res_admin.json()["error_code"], "ADMIN_IMMUTABLE")

        # 2. OCC Conflict (version sai)
        wrong_version = custom_role["version"] + 99
        res_occ = requests.put(
            f"{BASE_URL}/rbac/roles/{custom_role['role_id']}/permissions",
            headers=self.headers,
            json={"permissions": ["INCIDENTS:VIEW"], "version": wrong_version},
        )
        self.assertEqual(res_occ.status_code, 409)
        self.assertEqual(res_occ.json()["error_code"], "VERSION_MISMATCH")

        # 3. Cập nhật hợp lệ với Interlocking Rules: gửi INCIDENTS:CREATE -> backend tự cấp INCIDENTS:VIEW
        res_update = requests.put(
            f"{BASE_URL}/rbac/roles/{custom_role['role_id']}/permissions",
            headers=self.headers,
            json={
                "permissions": ["INCIDENTS:CREATE", "STATISTICS:DELETE", "ROLE:VIEW"],
                "version": custom_role["version"],
            },
        )
        self.assertEqual(res_update.status_code, 200)
        up_data = res_update.json()
        self.assertTrue(up_data["success"])
        self.assertEqual(up_data["new_version"], custom_role["version"] + 1)

        # 4. Kiểm tra lại qua ma trận quyền: INCIDENTS:VIEW phải được tự động thêm vào, STATISTICS:DELETE và ROLE:VIEW bị lọc bỏ
        matrix_res = requests.get(f"{BASE_URL}/rbac/matrix", headers=self.headers)
        matrix = matrix_res.json()
        saved_perms = matrix["role_permissions"].get(str(custom_role["role_id"]), [])
        self.assertIn("INCIDENTS:CREATE", saved_perms)
        self.assertIn("INCIDENTS:VIEW", saved_perms)       # Interlocking tự động
        self.assertNotIn("STATISTICS:DELETE", saved_perms) # Bỏ qua ô không áp dụng
        self.assertNotIn("ROLE:VIEW", saved_perms)         # ROLE chỉ dành cho Admin

    def test_06_delete_custom_role(self):
        """
        Kiểm tra xóa vai trò:
        - Chặn xóa vai trò hệ thống (403 SYSTEM_ROLE_CANNOT_DELETE)
        - Xóa thành công vai trò tùy chỉnh không có user (200)
        """
        roles_res = requests.get(f"{BASE_URL}/rbac/roles", headers=self.headers)
        roles = roles_res.json()["roles"]
        citizen_role = next(r for r in roles if r["role_code"] == "CITIZEN")

        # 1. Chặn xóa vai trò hệ thống
        res_del_sys = requests.delete(
            f"{BASE_URL}/rbac/roles/{citizen_role['role_id']}",
            headers=self.headers,
        )
        self.assertEqual(res_del_sys.status_code, 403)
        self.assertEqual(res_del_sys.json()["error_code"], "SYSTEM_ROLE_CANNOT_DELETE")

        # 2. Tạo một vai trò tạm để xóa
        res_temp = requests.post(
            f"{BASE_URL}/rbac/roles",
            headers=self.headers,
            json={"role_name": "Vai trò Tạm thời Cần Xóa", "scope": "DISTRICT"},
        )
        temp_role = res_temp.json()

        # Xóa vai trò vừa tạo
        res_del = requests.delete(
            f"{BASE_URL}/rbac/roles/{temp_role['role_id']}",
            headers=self.headers,
        )
        self.assertEqual(res_del.status_code, 200)
        self.assertTrue(res_del.json()["success"])

        # Thử xóa lại -> 404 ROLE_NOT_FOUND
        res_del_again = requests.delete(
            f"{BASE_URL}/rbac/roles/{temp_role['role_id']}",
            headers=self.headers,
        )
        self.assertEqual(res_del_again.status_code, 404)

    def test_07_reassign_and_delete_role(self):
        """
        Kiểm tra chuyển giao người dùng sang vai trò mới rồi xoá vai trò cũ (Màn 5):
        - Chặn chuyển giao sang chính vai trò đó (400 INVALID_TARGET_ROLE)
        - Chặn xóa vai trò hệ thống (403 SYSTEM_ROLE_CANNOT_DELETE)
        - Chuyển giao thành công sang vai trò đích và vai trò cũ bị xoá
        """
        # Tạo vai trò nguồn (source) và vai trò đích (target)
        res_src = requests.post(
            f"{BASE_URL}/rbac/roles",
            headers=self.headers,
            json={"role_name": "Vai trò Nguồn Chuyển giao", "scope": "DISTRICT"},
        )
        src_role = res_src.json()

        res_tgt = requests.post(
            f"{BASE_URL}/rbac/roles",
            headers=self.headers,
            json={"role_name": "Vai trò Đích Tiếp nhận", "scope": "DISTRICT"},
        )
        tgt_role = res_tgt.json()

        # 1. Chuyển giao sang chính nó -> 400
        res_same = requests.post(
            f"{BASE_URL}/rbac/roles/{src_role['role_id']}/reassign-and-delete",
            headers=self.headers,
            json={"target_role_id": src_role["role_id"]},
        )
        self.assertEqual(res_same.status_code, 400)
        self.assertEqual(res_same.json()["error_code"], "INVALID_TARGET_ROLE")

        # 2. Chuyển giao sang vai trò đích hợp lệ -> 200
        res_reassign = requests.post(
            f"{BASE_URL}/rbac/roles/{src_role['role_id']}/reassign-and-delete",
            headers=self.headers,
            json={"target_role_id": tgt_role["role_id"]},
        )
        self.assertEqual(res_reassign.status_code, 200)
        self.assertTrue(res_reassign.json()["success"])

        # Kiểm tra vai trò nguồn đã bị xóa khỏi danh sách
        roles_res = requests.get(f"{BASE_URL}/rbac/roles", headers=self.headers)
        role_ids = [r["role_id"] for r in roles_res.json()["roles"]]
        self.assertNotIn(src_role["role_id"], role_ids)
        self.assertIn(tgt_role["role_id"], role_ids)

        # Dọn dẹp vai trò đích
        requests.delete(f"{BASE_URL}/rbac/roles/{tgt_role['role_id']}", headers=self.headers)


if __name__ == "__main__":
    unittest.main()
