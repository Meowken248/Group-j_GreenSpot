"""
Seed file tạo tài khoản Quản trị viên (Admin) cho hệ thống GreenSpot:
- Email: admin@gmail.com
- Password: admin@gmail.com
- Role: ADMIN (Toàn quyền quản trị hệ thống)
- Status: ACTIVE
"""

import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path

# Đảm bảo UTF-8 cho console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Thêm thư mục gốc BackEnd vào sys.path để có thể chạy script độc lập
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.database import AsyncSessionLocal, engine, Base
import app.models  # Nạp toàn bộ models
from app.utils.security import hash_password

ADMIN_EMAIL = "admin@gmail.com"
ADMIN_PASSWORD = "admin@gmail.com"
ADMIN_FULL_NAME = "Quản trị viên Hệ thống (Admin)"

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


async def seed_admin():
    print("=" * 60)
    print("🚀 [GreenSpot Seeder] Bắt đầu khởi tạo tài khoản Admin...")
    print("=" * 60)

    # 1. Đồng bộ cấu trúc bảng và cột bổ sung
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Cập nhật các cột schema mới nếu thiếu
        await session.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'DISTRICT';"))
        await session.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;"))
        await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500);"))
        await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(200);"))
        await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;"))
        await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE DEFAULT now();"))
        await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS total_green_points INTEGER DEFAULT 0;"))
        await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS friends_count INTEGER DEFAULT 0;"))
        await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;"))
        await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;"))
        await session.commit()
        print("✅ [1/5] Đồng bộ schema bảng [roles] và [users] thành công.")

        # 2. Khởi tạo / cập nhật vai trò ADMIN
        res_role = await session.execute(
            text("SELECT role_id FROM roles WHERE role_code = 'ADMIN'")
        )
        admin_role_id = res_role.scalar_one_or_none()

        if not admin_role_id:
            res_new_role = await session.execute(
                text("""
                    INSERT INTO roles (role_code, role_name, description, is_system, scope, version)
                    VALUES ('ADMIN', 'Quản trị viên Hệ thống', 'Toàn quyền quản trị hệ thống, cấu hình tham số và phân quyền bảo mật', TRUE, 'CITY', 1)
                    RETURNING role_id
                """)
            )
            admin_role_id = res_new_role.scalar_one()
            print(f"✅ [2/5] Tạo mới vai trò [ADMIN] với ID = {admin_role_id}")
        else:
            await session.execute(
                text("""
                    UPDATE roles
                    SET role_name = 'Quản trị viên Hệ thống',
                        description = 'Toàn quyền quản trị hệ thống, cấu hình tham số và phân quyền bảo mật',
                        is_system = TRUE,
                        scope = 'CITY'
                    WHERE role_id = :role_id
                """),
                {"role_id": admin_role_id}
            )
            print(f"✅ [2/5] Đã tìm thấy vai trò [ADMIN] với ID = {admin_role_id}")

        # 3. Đồng bộ permissions cho hệ thống
        perm_count = 0
        for mod in MODULE_DEFINITIONS:
            for act in mod["actions"]:
                perm_code = f"{mod['code']}:{act}"
                desc = f"Quyền {act} đối với {mod['name']}"
                await session.execute(
                    text("""
                        INSERT INTO permissions (permission_code, module, action, description)
                        VALUES (:code, :mod, :act, :desc)
                        ON CONFLICT (permission_code) DO UPDATE
                        SET module = :mod, action = :act, description = :desc
                    """),
                    {"code": perm_code, "mod": mod["code"], "act": act, "desc": desc}
                )
                perm_count += 1
        await session.commit()
        print(f"✅ [3/5] Đã đồng bộ {perm_count} quyền hạn (Permissions) cho hệ thống.")

        # 4. Gán toàn bộ quyền cho vai trò ADMIN
        all_perms_res = await session.execute(text("SELECT permission_id FROM permissions"))
        perm_ids = [row[0] for row in all_perms_res.fetchall()]

        for p_id in perm_ids:
            await session.execute(
                text("""
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES (:r_id, :p_id)
                    ON CONFLICT DO NOTHING
                """),
                {"r_id": admin_role_id, "p_id": p_id}
            )
        await session.commit()
        print(f"✅ [4/5] Gán toàn bộ {len(perm_ids)} quyền cho vai trò [ADMIN].")

        # 5. Tạo hoặc cập nhật tài khoản admin@gmail.com
        hashed_pwd = hash_password(ADMIN_PASSWORD)

        res_user = await session.execute(
            text("SELECT user_id FROM users WHERE email = :email"),
            {"email": ADMIN_EMAIL}
        )
        existing_user_id = res_user.scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if existing_user_id:
            await session.execute(
                text("""
                    UPDATE users
                    SET password_hash = :pwd,
                        full_name = :fname,
                        role_id = :r_id,
                        status = 'ACTIVE',
                        reputation_score = 100,
                        updated_at = :now
                    WHERE user_id = :u_id
                """),
                {
                    "pwd": hashed_pwd,
                    "fname": ADMIN_FULL_NAME,
                    "r_id": admin_role_id,
                    "now": now,
                    "u_id": existing_user_id
                }
            )
            user_id = existing_user_id
            action_desc = "Cập nhật thành công tài khoản Admin sẵn có"
        else:
            user_id = uuid.uuid4()
            await session.execute(
                text("""
                    INSERT INTO users (
                        user_id, email, password_hash, full_name,
                        role_id, status, reputation_score, total_green_points,
                        friends_count, version, activated_at, created_at, updated_at
                    )
                    VALUES (
                        :u_id, :email, :pwd, :fname,
                        :r_id, 'ACTIVE', 100, 0,
                        0, 1, :now, :now, :now
                    )
                """),
                {
                    "u_id": user_id,
                    "email": ADMIN_EMAIL,
                    "pwd": hashed_pwd,
                    "fname": ADMIN_FULL_NAME,
                    "r_id": admin_role_id,
                    "now": now
                }
            )
            action_desc = "Tạo mới tài khoản Admin"

        # Mở khóa nếu tài khoản đang bị rate limit / lock do nhập sai trước đó
        await session.execute(
            text("DELETE FROM login_attempts WHERE email = :email"),
            {"email": ADMIN_EMAIL}
        )
        await session.commit()

        print(f"✅ [5/5] {action_desc}!")
        print("=" * 60)
        print("🎉 THÔNG TIN TÀI KHOẢN ADMIN ĐÃ ĐƯỢC THIẾT LẬP:")
        print(f"  • Email:       {ADMIN_EMAIL}")
        print(f"  • Mật khẩu:    {ADMIN_PASSWORD}")
        print(f"  • Họ tên:      {ADMIN_FULL_NAME}")
        print(f"  • Vai trò:     ADMIN (Role ID: {admin_role_id})")
        print(f"  • Trạng thái:  ACTIVE")
        print(f"  • Quyền hạn:   {len(perm_ids)} quyền (Full Permissions)")
        print(f"  • User ID:     {user_id}")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_admin())
