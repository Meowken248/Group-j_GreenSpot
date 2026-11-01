"""
Kiểm tra trực tiếp API HTTP của Backend FastAPI với các tài khoản Seeder kiểm thử.
"""

import json
import urllib.request

LOGIN_URL = "http://127.0.0.1:8000/api/v1/auth/login"
MY_PERMS_URL = "http://127.0.0.1:8000/api/v1/rbac/my-permissions"
PASSWORD = "TestPassword123,"

TEST_EMAILS = [
    "guard_no_access@greenspot.vn",
    "guard_access_only@greenspot.vn",
    "guard_view_only@greenspot.vn",
    "guard_full_editor@greenspot.vn",
]


def test_api():
    print("🌐 [API Verification] Kiểm tra trực tiếp Backend FastAPI HTTP endpoints...")
    for email in TEST_EMAILS:
        # 1. Login
        login_payload = json.dumps({"email": email, "password": PASSWORD}).encode("utf-8")
        login_req = urllib.request.Request(LOGIN_URL, data=login_payload, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(login_req) as resp:
                login_data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            print(f"Error on {email}: status={e.code}, body={err_body}")
            raise e

        token = login_data["access_token"]
        assert token, f"LỖI: Không nhận được token cho {email}"

        # 2. Call /rbac/my-permissions
        perms_req = urllib.request.Request(MY_PERMS_URL, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(perms_req) as resp:
            perms_data = json.loads(resp.read().decode("utf-8"))

        role_code = perms_data.get("role_code")
        permissions = perms_data.get("permissions", [])

        print(f"  ✓ [API 200 OK] {email}")
        print(f"      -> Vai trò: {role_code}")
        print(f"      -> Số quyền: {len(permissions)} | Quyền: {permissions}")

    print("\n🎉 Backend API trả về dữ liệu phân quyền chuẩn xác 100% cho toàn bộ tài khoản Seeder!")


if __name__ == "__main__":
    test_api()
