"""
Seeder Dữ Liệu Kiểm Thử: Universal RBAC Guard Framework
Tạo 4 vai trò và 4 tài khoản thử nghiệm đặc thù để kiểm thử 3 tầng bảo vệ RBAC:
1. GUARD_NO_ACCESS      : Không có quyền ACCESS trên GIS_MAP (Test AccessDeniedView)
2. GUARD_ACCESS_ONLY    : Có ACCESS nhưng KHÔNG CÓ VIEW trên GIS_MAP (Test ModuleViewLockedView)
3. GUARD_VIEW_ONLY      : Có ACCESS + VIEW nhưng KHÔNG CÓ CREATE (Test khóa chuột phải báo cáo ngập)
4. GUARD_FULL_EDITOR    : Có toàn bộ 7 cột quyền trên GIS_MAP (Test Full Editor mode)
"""

import asyncio
import uuid
from sqlalchemy import text
from app.database import AsyncSessionLocal
from app.utils.security import hash_password

GUARD_TEST_ROLES = [
    {
        "role_code": "GUARD_NO_ACCESS",
        "role_name": "Kiểm thử - Chặn truy cập (No Access)",
        "description": "Không có quyền ACCESS trên GIS_MAP để kiểm thử màn hình 403 AccessDeniedView",
        "scope": "DISTRICT",
        "permissions": ["WEATHER:ACCESS", "WEATHER:VIEW"],
        "user_email": "guard_no_access@greenspot.vn",
        "full_name": "Tester Chặn Truy Cập",
    },
    {
        "role_code": "GUARD_ACCESS_ONLY",
        "role_name": "Kiểm thử - Chỉ truy cập (Access Only)",
        "description": "Có quyền ACCESS nhưng thiếu VIEW trên GIS_MAP để kiểm thử ModuleViewLockedView",
        "scope": "DISTRICT",
        "permissions": ["GIS_MAP:ACCESS"],
        "user_email": "guard_access_only@greenspot.vn",
        "full_name": "Tester Khóa Xem Dữ Liệu",
    },
    {
        "role_code": "GUARD_VIEW_ONLY",
        "role_name": "Kiểm thử - Chỉ xem (View Only)",
        "description": "Có quyền ACCESS và VIEW nhưng thiếu CREATE để kiểm thử khóa menu chuột phải",
        "scope": "DISTRICT",
        "permissions": ["GIS_MAP:ACCESS", "GIS_MAP:VIEW", "FLOOD_WARNINGS:ACCESS", "FLOOD_WARNINGS:VIEW"],
        "user_email": "guard_view_only@greenspot.vn",
        "full_name": "Tester Chỉ Xem Không Sửa",
    },
    {
        "role_code": "GUARD_FULL_EDITOR",
        "role_name": "Kiểm thử - Toàn quyền (Full Editor)",
        "description": "Có toàn bộ 7 cột quyền trên GIS_MAP để kiểm thử mở mọi thao tác",
        "scope": "CITY",
        "permissions": [
            "GIS_MAP:ACCESS",
            "GIS_MAP:VIEW",
            "GIS_MAP:CREATE",
            "GIS_MAP:UPDATE",
            "GIS_MAP:DELETE",
            "GIS_MAP:IMPORT",
            "GIS_MAP:EXPORT",
            "FLOOD_WARNINGS:ACCESS",
            "FLOOD_WARNINGS:VIEW",
            "FLOOD_WARNINGS:CREATE",
        ],
        "user_email": "guard_full_editor@greenspot.vn",
        "full_name": "Tester Biên Tập Viên Đầy Đủ",
    },
]

DEFAULT_PASSWORD = "TestPassword123,"


async def seed_guard_test_data():
    print("🚀 [Step 1: Database & Seeder] Khởi tạo dữ liệu kiểm thử RBAC Guard Framework...")
    password_hash = hash_password(DEFAULT_PASSWORD)

    async with AsyncSessionLocal() as session:
        # 1. Lấy bản đồ permission_code -> permission_id
        res_perms = await session.execute(text("SELECT permission_id, permission_code FROM permissions"))
        perm_map = {row[1]: row[0] for row in res_perms.fetchall()}
        print(f"  -> Đã tải {len(perm_map)} quyền hạn từ cơ sở dữ liệu.")

        for item in GUARD_TEST_ROLES:
            role_code = item["role_code"]
            role_name = item["role_name"]
            desc = item["description"]
            scope = item["scope"]
            user_email = item["user_email"]
            full_name = item["full_name"]

            # Kiểm tra vai trò đã tồn tại chưa
            res_role = await session.execute(
                text("SELECT role_id FROM roles WHERE role_code = :code"),
                {"code": role_code}
            )
            existing_role_id = res_role.scalar_one_or_none()

            if existing_role_id:
                role_id = existing_role_id
                await session.execute(
                    text("""
                        UPDATE roles 
                        SET role_name = :name, description = :desc, scope = :scope, version = 1
                        WHERE role_id = :r_id
                    """),
                    {"name": role_name, "desc": desc, "scope": scope, "r_id": role_id}
                )
                # Xóa quyền cũ của role này
                await session.execute(
                    text("DELETE FROM role_permissions WHERE role_id = :r_id"),
                    {"r_id": role_id}
                )
            else:
                res_ins = await session.execute(
                    text("""
                        INSERT INTO roles (role_code, role_name, description, is_system, scope, version)
                        VALUES (:code, :name, :desc, FALSE, :scope, 1)
                        RETURNING role_id
                    """),
                    {"code": role_code, "name": role_name, "desc": desc, "scope": scope}
                )
                role_id = res_ins.scalar_one()

            # Gán quyền tương ứng
            for p_code in item["permissions"]:
                if p_code in perm_map:
                    p_id = perm_map[p_code]
                    await session.execute(
                        text("""
                            INSERT INTO role_permissions (role_id, permission_id)
                            VALUES (:r_id, :p_id)
                            ON CONFLICT DO NOTHING
                        """),
                        {"r_id": role_id, "p_id": p_id}
                    )

            # Tạo hoặc cập nhật tài khoản kiểm thử
            res_u = await session.execute(
                text("SELECT user_id FROM users WHERE email = :email"),
                {"email": user_email}
            )
            existing_user_id = res_u.scalar_one_or_none()

            if existing_user_id:
                await session.execute(
                    text("""
                        UPDATE users
                        SET role_id = :r_id, status = 'ACTIVE', password_hash = :pwd, full_name = :fname
                        WHERE user_id = :u_id
                    """),
                    {"r_id": role_id, "pwd": password_hash, "fname": full_name, "u_id": existing_user_id}
                )
            else:
                new_u_id = uuid.uuid4()
                await session.execute(
                    text("""
                        INSERT INTO users (user_id, email, password_hash, full_name, role_id, status, reputation_score)
                        VALUES (:u_id, :email, :pwd, :fname, :r_id, 'ACTIVE', 100)
                    """),
                    {"u_id": new_u_id, "email": user_email, "pwd": password_hash, "fname": full_name, "r_id": role_id}
                )

            print(f"  -> [OK] Đã nạp vai trò [{role_code}] (ID: {role_id}) & Người dùng [{user_email}] ({len(item['permissions'])} quyền)")

        await session.commit()
    print("✅ Hoàn tất nạp Seeder kiểm thử RBAC Guard Framework thành công 100%!")


if __name__ == "__main__":
    asyncio.run(seed_guard_test_data())

