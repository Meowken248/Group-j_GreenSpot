"""
GreenSpot Domain Seeder: Cài đặt tài khoản (Feature STT 7)
Khởi tạo cấu hình cài đặt mẫu cho người dùng:
- Giao diện (LIGHT / DARK)
- Ngôn ngữ (VI / EN)
- Optimistic locking version (1)
Đảm bảo tính Idempotent (không tạo trùng nếu đã có).
"""

import sys
import uuid
import asyncio
from pathlib import Path
from sqlalchemy import select

# Đảm bảo UTF-8 cho console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User
from app.models.settings import UserSettings


# Danh sách cấu hình mặc định mẫu cho các tài khoản tiêu biểu
PRESET_SETTINGS = [
    {
        "email": "citizen@ecoreport.gov.vn",
        "theme": "LIGHT",
        "language": "VI",
    },
    {
        "email": "admin@gmail.com",
        "theme": "DARK",
        "language": "VI",
    },
    {
        "email": "friend_tuan@ecoreport.gov.vn",
        "theme": "DARK",
        "language": "EN",
    },
]


async def seed_user_settings():
    print("🌱 Bắt đầu seed dữ liệu Cài đặt tài khoản (User Settings)...")
    async with AsyncSessionLocal() as session:
        # 1. Lấy tất cả user hiện có
        users_result = await session.execute(select(User))
        all_users = users_result.scalars().all()
        user_by_email = {u.email: u for u in all_users}

        count_created = 0
        count_skipped = 0

        # 2. Xử lý cho danh sách định sẵn
        for preset in PRESET_SETTINGS:
            user = user_by_email.get(preset["email"])
            if not user:
                continue

            existing = await session.execute(
                select(UserSettings).where(UserSettings.user_id == user.user_id)
            )
            if existing.scalar_one_or_none() is not None:
                count_skipped += 1
                continue

            new_setting = UserSettings(
                setting_id=uuid.uuid4(),
                user_id=user.user_id,
                theme=preset["theme"],
                language=preset["language"],
                version=1,
            )
            session.add(new_setting)
            count_created += 1

        # 3. Tạo cấu hình mặc định (LIGHT/VI) cho các user khác chưa có
        for user in all_users:
            if user.email in [p["email"] for p in PRESET_SETTINGS]:
                continue

            existing = await session.execute(
                select(UserSettings).where(UserSettings.user_id == user.user_id)
            )
            if existing.scalar_one_or_none() is not None:
                count_skipped += 1
                continue

            new_setting = UserSettings(
                setting_id=uuid.uuid4(),
                user_id=user.user_id,
                theme="LIGHT",
                language="VI",
                version=1,
            )
            session.add(new_setting)
            count_created += 1

        await session.commit()
        print(f"✅ Hoàn tất seed User Settings: Tạo mới {count_created} bản ghi, Bỏ qua {count_skipped} bản ghi đã có.")


if __name__ == "__main__":
    asyncio.run(seed_user_settings())
