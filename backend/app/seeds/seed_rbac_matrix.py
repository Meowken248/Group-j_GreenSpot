"""
Script Migration & Seeding cho Chức năng 3: Phân quyền vai trò RBAC & Ma trận phân quyền động
- Cập nhật schema: scope, version trong bảng roles
- Nạp chuẩn 4 Vai trò hệ thống: Admin, District Manager, Responder, Citizen
- Nạp 15 Module chức năng và 54 quyền hạn (Permissions)
- Gán quyền mặc định cho các vai trò
- Gán vai trò ADMIN cho tài khoản thử nghiệm của Đạt
"""

import asyncio
from sqlalchemy import text
from app.database import engine, AsyncSessionLocal


ACTIONS_LIST = ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"]

MODULE_DEFINITIONS = [
    {"code": "GIS_MAP", "name": "Bản đồ số WebGIS", "actions": ACTIONS_LIST},
    {"code": "INCIDENTS", "name": "Báo cáo sự cố môi trường", "actions": ACTIONS_LIST},
    {"code": "GREEN_SPOTS", "name": "Điểm xanh & Công viên sinh thái", "actions": ACTIONS_LIST},
    {"code": "RECYCLING_FACILITIES", "name": "Trạm thu gom & Điểm tái chế", "actions": ACTIONS_LIST},
    {"code": "IOT_SENSORS", "name": "Trạm quan trắc IoT & Cảm biến", "actions": ACTIONS_LIST},
    {"code": "FLOOD_WARNINGS", "name": "Cảnh báo ngập lụt & Triều cường", "actions": ACTIONS_LIST},
    {"code": "AIR_QUALITY", "name": "Chỉ số chất lượng không khí AQI", "actions": ACTIONS_LIST},
    {"code": "WEATHER", "name": "Khí tượng & Dự báo thời tiết", "actions": ACTIONS_LIST},
    {"code": "DISPATCH_TASKS", "name": "Phân công & Điều phối hiện trường", "actions": ACTIONS_LIST},
    {"code": "CITIZEN_FEEDBACK", "name": "Phản ánh & Đóng góp ý kiến", "actions": ACTIONS_LIST},
    {"code": "CAMPAIGNS", "name": "Chiến dịch môi trường & Điểm xanh", "actions": ACTIONS_LIST},
    {"code": "USER_MANAGEMENT", "name": "Quản lý người dùng & Tài khoản", "actions": ACTIONS_LIST},
    {"code": "ROLE", "name": "Phân quyền vai trò", "actions": ACTIONS_LIST},
    {"code": "STATISTICS", "name": "Thống kê & Báo cáo tổng hợp", "actions": ACTIONS_LIST},
    {"code": "AUDIT_LOG", "name": "Nhật ký kiểm toán hệ thống", "actions": ACTIONS_LIST},
]

SYSTEM_ROLES = [
    {
        "role_code": "ADMIN",
        "role_name": "Admin",
        "description": "Toàn quyền quản trị hệ thống, cấu hình tham số và phân quyền bảo mật",
        "is_system": True,
        "scope": "CITY",
        "version": 1,
    },
    {
        "role_code": "DISTRICT_MANAGER",
        "role_name": "District Manager",
        "description": "Quản lý, điều phối và giám sát các chỉ số môi trường cấp quận",
        "is_system": True,
        "scope": "DISTRICT",
        "version": 1,
    },
    {
        "role_code": "RESPONDER",
        "role_name": "Responder",
        "description": "Cán bộ hiện trường, tiếp nhận xử lý sự cố và cập nhật tiến độ xử lý",
        "is_system": True,
        "scope": "DISTRICT",
        "version": 1,
    },
    {
        "role_code": "CITIZEN",
        "role_name": "Citizen",
        "description": "Công dân sinh thái, gửi phản ánh sự cố và nhận điểm thưởng xanh",
        "is_system": True,
        "scope": "CITY",
        "version": 1,
    },
]


async def run_rbac_migration():
    print("🚀 [RBAC Migration] Bắt đầu đồng bộ cơ sở dữ liệu RBAC...")
    
    async with AsyncSessionLocal() as session:
        # 1. Bổ sung cột scope và version vào bảng roles nếu chưa có
        await session.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'DISTRICT';"))
        await session.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;"))
        await session.commit()
        print("✅ [1/5] Đã cập nhật bảng [roles] với cột [scope] và [version].")

        # 2. Đồng bộ 4 Vai trò hệ thống
        for r in SYSTEM_ROLES:
            # Kiểm tra xem role_code đã tồn tại chưa
            chk = await session.execute(
                text("SELECT role_id FROM roles WHERE role_code = :code"),
                {"code": r["role_code"]}
            )
            existing_id = chk.scalar_one_or_none()
            if existing_id:
                await session.execute(text("""
                    UPDATE roles
                    SET role_name = :name,
                        description = :desc,
                        is_system = :is_sys,
                        scope = :scope,
                        version = COALESCE(version, 1)
                    WHERE role_code = :code
                """), {
                    "name": r["role_name"],
                    "desc": r["description"],
                    "is_sys": r["is_system"],
                    "scope": r["scope"],
                    "code": r["role_code"],
                })
            else:
                await session.execute(text("""
                    INSERT INTO roles (role_code, role_name, description, is_system, scope, version)
                    VALUES (:code, :name, :desc, :is_sys, :scope, :ver)
                """), {
                    "code": r["role_code"],
                    "name": r["role_name"],
                    "desc": r["description"],
                    "is_sys": r["is_system"],
                    "scope": r["scope"],
                    "ver": r["version"],
                })
        await session.commit()
        print("✅ [2/5] Đã đồng bộ 4 vai trò hệ thống chuẩn (Admin, District Manager, Responder, Citizen).")

        # 3. Đồng bộ 54 Permissions cho 15 Modules chức năng
        perm_count = 0
        for mod in MODULE_DEFINITIONS:
            for act in mod["actions"]:
                perm_code = f"{mod['code']}:{act}"
                desc = f"Quyền {act} đối với {mod['name']}"
                await session.execute(text("""
                    INSERT INTO permissions (permission_code, module, action, description)
                    VALUES (:code, :mod, :act, :desc)
                    ON CONFLICT (permission_code) DO UPDATE
                    SET module = :mod, action = :act, description = :desc
                """), {
                    "code": perm_code,
                    "mod": mod["code"],
                    "act": act,
                    "desc": desc,
                })
                perm_count += 1
        await session.commit()
        print(f"✅ [3/5] Đã nạp {perm_count} quyền hạn tương ứng 15 modules chức năng.")

        # Lấy ID của 4 roles
        roles_res = await session.execute(text("SELECT role_id, role_code FROM roles WHERE is_system = TRUE"))
        role_map = {row[1]: row[0] for row in roles_res.fetchall()}

        admin_role_id = role_map.get("ADMIN")
        dm_role_id = role_map.get("DISTRICT_MANAGER")
        resp_role_id = role_map.get("RESPONDER")
        cit_role_id = role_map.get("CITIZEN")

        # Lấy toàn bộ permission_ids
        all_perms_res = await session.execute(text("SELECT permission_id, permission_code FROM permissions"))
        all_perms = {row[1]: row[0] for row in all_perms_res.fetchall()}

        # 4. Gán quyền cho các vai trò hệ thống
        # 4.1 ADMIN: Có tất cả mọi quyền
        if admin_role_id:
            for p_code, p_id in all_perms.items():
                await session.execute(text("""
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES (:r_id, :p_id)
                    ON CONFLICT DO NOTHING
                """), {"r_id": admin_role_id, "p_id": p_id})

        # 4.2 DISTRICT_MANAGER: Quản lý môi trường cấp quận
        if dm_role_id:
            dm_allowed_modules = [
                "GIS_MAP", "INCIDENTS", "GREEN_SPOTS", "RECYCLING_FACILITIES",
                "IOT_SENSORS", "FLOOD_WARNINGS", "AIR_QUALITY", "WEATHER",
                "DISPATCH_TASKS", "CITIZEN_FEEDBACK", "CAMPAIGNS", "USER_MANAGEMENT", "STATISTICS", "AUDIT_LOG"
            ]
            for p_code, p_id in all_perms.items():
                mod, act = p_code.split(":")
                if mod in dm_allowed_modules and mod != "ROLE":
                    await session.execute(text("""
                        INSERT INTO role_permissions (role_id, permission_id)
                        VALUES (:r_id, :p_id)
                        ON CONFLICT DO NOTHING
                    """), {"r_id": dm_role_id, "p_id": p_id})

        # 4.3 RESPONDER: Cán bộ hiện trường
        if resp_role_id:
            responder_perms = [
                "GIS_MAP:VIEW", "INCIDENTS:VIEW", "INCIDENTS:UPDATE",
                "DISPATCH_TASKS:VIEW", "DISPATCH_TASKS:UPDATE",
                "CITIZEN_FEEDBACK:VIEW", "FLOOD_WARNINGS:VIEW",
                "AIR_QUALITY:VIEW", "WEATHER:VIEW"
            ]
            for p_code in responder_perms:
                if p_code in all_perms:
                    await session.execute(text("""
                        INSERT INTO role_permissions (role_id, permission_id)
                        VALUES (:r_id, :p_id)
                        ON CONFLICT DO NOTHING
                    """), {"r_id": resp_role_id, "p_id": all_perms[p_code]})

        # 4.4 CITIZEN: Công dân sinh thái
        if cit_role_id:
            citizen_perms = [
                "GIS_MAP:VIEW", "INCIDENTS:VIEW", "INCIDENTS:CREATE",
                "GREEN_SPOTS:VIEW", "RECYCLING_FACILITIES:VIEW",
                "FLOOD_WARNINGS:VIEW", "AIR_QUALITY:VIEW", "WEATHER:VIEW",
                "CITIZEN_FEEDBACK:VIEW", "CITIZEN_FEEDBACK:CREATE", "CAMPAIGNS:VIEW"
            ]
            for p_code in citizen_perms:
                if p_code in all_perms:
                    await session.execute(text("""
                        INSERT INTO role_permissions (role_id, permission_id)
                        VALUES (:r_id, :p_id)
                        ON CONFLICT DO NOTHING
                    """), {"r_id": cit_role_id, "p_id": all_perms[p_code]})

        await session.commit()
        print("✅ [4/5] Đã gán ma trận quyền mặc định cho 4 vai trò hệ thống.")

        # 5. Đảm bảo tài khoản kiểm thử ddatmguyen2023+test@gmail.com có quyền ADMIN
        if admin_role_id:
            await session.execute(text("""
                UPDATE users
                SET role_id = :admin_id, status = 'ACTIVE'
                WHERE email IN ('ddatmguyen2023+test@gmail.com', 'admin@ecoreport.gov.vn')
            """), {"admin_id": admin_role_id})

        # Đảm bảo các tài khoản khác gán CITIZEN nếu cần
        if cit_role_id:
            await session.execute(text("""
                UPDATE users
                SET role_id = :cit_id
                WHERE email NOT IN ('ddatmguyen2023+test@gmail.com', 'admin@ecoreport.gov.vn')
                  AND role_id NOT IN (:admin_id, :dm_id, :resp_id)
            """), {
                "cit_id": cit_role_id,
                "admin_id": admin_role_id,
                "dm_id": dm_role_id or 0,
                "resp_id": resp_role_id or 0
            })

        await session.commit()
        print("✅ [5/5] Đã gán vai trò ADMIN cho tài khoản kiểm thử ddatmguyen2023+test@gmail.com.")

    print("🎉 Hoàn tất Giai đoạn 1: Database & Security Migration thành công 100%!")


if __name__ == "__main__":
    asyncio.run(run_rbac_migration())
