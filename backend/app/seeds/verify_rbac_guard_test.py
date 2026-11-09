"""
Script Kiểm Thử Tự Động Bước 1: Xác Thực Dữ Liệu Seeder RBAC Guard
Kiểm tra tính toàn vẹn của 4 vai trò và 4 tài khoản thử nghiệm trên cơ sở dữ liệu và Backend API.
"""

import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal
from app.utils.security import verify_password

GUARD_VERIFICATION_SPECS = {
    "guard_no_access@greenspot.vn": {
        "role_code": "GUARD_NO_ACCESS",
        "has_access": False,
        "has_view": False,
        "can_create": False,
        "required_perms": ["WEATHER:ACCESS", "WEATHER:VIEW"],
        "forbidden_perms": ["GIS_MAP:ACCESS", "GIS_MAP:VIEW", "GIS_MAP:CREATE"],
    },
    "guard_access_only@greenspot.vn": {
        "role_code": "GUARD_ACCESS_ONLY",
        "has_access": True,
        "has_view": False,
        "can_create": False,
        "required_perms": ["GIS_MAP:ACCESS"],
        "forbidden_perms": ["GIS_MAP:VIEW", "GIS_MAP:CREATE", "GIS_MAP:DELETE"],
    },
    "guard_view_only@greenspot.vn": {
        "role_code": "GUARD_VIEW_ONLY",
        "has_access": True,
        "has_view": True,
        "can_create": False,
        "required_perms": ["GIS_MAP:ACCESS", "GIS_MAP:VIEW"],
        "forbidden_perms": ["GIS_MAP:CREATE", "GIS_MAP:UPDATE", "GIS_MAP:DELETE"],
    },
    "guard_full_editor@greenspot.vn": {
        "role_code": "GUARD_FULL_EDITOR",
        "has_access": True,
        "has_view": True,
        "can_create": True,
        "required_perms": [
            "GIS_MAP:ACCESS",
            "GIS_MAP:VIEW",
            "GIS_MAP:CREATE",
            "GIS_MAP:UPDATE",
            "GIS_MAP:DELETE",
            "GIS_MAP:IMPORT",
            "GIS_MAP:EXPORT",
        ],
        "forbidden_perms": [],
    },
}

PASSWORD = "TestPassword123,"


async def verify_guard_test_data():
    print("🔍 [Step 1: Verification] Bắt đầu kiểm thử tính toàn vẹn của Seeder RBAC Guard...")
    success_count = 0
    total_tests = len(GUARD_VERIFICATION_SPECS)

    async with AsyncSessionLocal() as session:
        for email, spec in GUARD_VERIFICATION_SPECS.items():
            print(f"\n--- Kiểm tra tài khoản: {email} (Vai trò: {spec['role_code']}) ---")
            
            # 1. Kiểm tra User tồn tại và mật khẩu khớp
            res_user = await session.execute(
                text("""
                    SELECT u.user_id, u.email, u.password_hash, u.status, r.role_id, r.role_code, r.role_name
                    FROM users u
                    JOIN roles r ON u.role_id = r.role_id
                    WHERE u.email = :email
                """),
                {"email": email}
            )
            user_row = res_user.fetchone()
            assert user_row is not None, f"LỖI: Không tìm thấy người dùng {email} trong CSDL!"
            assert user_row[5] == spec["role_code"], f"LỖI: Vai trò không khớp! Mong muốn {spec['role_code']}, thực tế {user_row[5]}"
            assert verify_password(PASSWORD, user_row[2]), f"LỖI: Mật khẩu xác thực thất bại cho {email}"
            assert user_row[3] == "ACTIVE", f"LỖI: Trạng thái tài khoản không phải ACTIVE"
            print("  ✓ [Pass] Người dùng tồn tại, mật khẩu băm PBKDF2 khớp, trạng thái ACTIVE")

            # 2. Kiểm tra danh sách quyền hạn thực tế được gán trong role_permissions
            res_perms = await session.execute(
                text("""
                    SELECT p.permission_code
                    FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.permission_id
                    WHERE rp.role_id = :r_id
                """),
                {"r_id": user_row[4]}
            )
            assigned_perms = set(row[0] for row in res_perms.fetchall())
            print(f"  ✓ [Pass] Danh sách quyền gán ({len(assigned_perms)}): {sorted(list(assigned_perms))}")

            # 3. Kiểm tra các quyền bắt buộc có (required_perms)
            for req in spec["required_perms"]:
                assert req in assigned_perms, f"LỖI: Quyền bắt buộc '{req}' KHÔNG có trong danh sách quyền gán!"
            print(f"  ✓ [Pass] Toàn bộ {len(spec['required_perms'])} quyền bắt buộc đều tồn tại đầy đủ")

            # 4. Kiểm tra các quyền bị cấm (forbidden_perms)
            for frb in spec["forbidden_perms"]:
                assert frb not in assigned_perms, f"LỖI: Quyền bị cấm '{frb}' lại xuất hiện trong danh sách quyền gán!"
            if spec["forbidden_perms"]:
                print(f"  ✓ [Pass] Các quyền cấm ({len(spec['forbidden_perms'])}) đều được chặn chính xác")

            # 5. Kiểm tra 3 trạng thái Guard cốt lõi cho GIS_MAP
            gis_access = "GIS_MAP:ACCESS" in assigned_perms
            gis_view = "GIS_MAP:VIEW" in assigned_perms
            gis_create = "GIS_MAP:CREATE" in assigned_perms

            assert gis_access == spec["has_access"], f"LỖI hasAccess: mong muốn {spec['has_access']}, thực tế {gis_access}"
            assert gis_view == spec["has_view"], f"LỖI hasView: mong muốn {spec['has_view']}, thực tế {gis_view}"
            assert gis_create == spec["can_create"], f"LỖI canCreate: mong muốn {spec['can_create']}, thực tế {gis_create}"

            print(f"  ✓ [Pass] Trạng thái 3 tầng Guard: hasAccess={gis_access}, hasView={gis_view}, canCreate={gis_create}")
            success_count += 1

    print("\n" + "=" * 65)
    print(f"🎉 KẾT QUẢ: {success_count}/{total_tests} kịch bản kiểm thử Seeder ĐẠT 100%!")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(verify_guard_test_data())
