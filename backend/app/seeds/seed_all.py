"""
EcoReport Master Seeder (Nạp toàn bộ dữ liệu hệ thống)
Chạy lần lượt:
1. Đồng bộ ma trận phân quyền RBAC (Roles, 105 Permissions, 15 Modules)
2. Nạp dữ liệu nền tảng TP.HCM (Admin Units, Waste Categories, Incidents, Green Spots, Recycling, IoT, Flood, Tides)
3. Nạp dữ liệu Hồ sơ Công dân & Hộ chiếu Xanh (Citizen Levels, Badges, User Activities, Timeline Posts)
4. Nạp dữ liệu Bạn bè, Theo dõi & Gợi ý kết bạn (STT 07)
5. Nạp dữ liệu Bảng tin Mạng xã hội Geo-Feed (STT 08 & 09)
6. Nạp danh mục Quy định xử phạt môi trường NĐ 45/2022/NĐ-CP (STT 11)
7. Nạp cấu hình Cài đặt giao diện & Ngôn ngữ (STT 25)
8. Nạp dữ liệu cụm phát hiện Báo cáo trùng lặp AI (STT 20)
"""

import asyncio
import sys
import os

from app.seeds.seed_rbac_matrix import run_rbac_migration
from app.seeds.seed_clean import run_clean_seed
from app.seeds.seed_profile_data import seed_profile_data
from app.seeds.seed_friends_data import seed_friends_data
from app.seeds.seed_posts_data import seed_posts_data
from app.seeds.seed_penalty_regulations import seed_penalty_regulations
from app.seeds.seed_settings_data import seed_user_settings
from app.seeds.deduplication.seed_data import seed_deduplication
from app.seeds.seed_real_reactions_and_comments import seed_and_sync


async def run_seed_all():
    print("=" * 70)
    print("🚀 BẮT ĐẦU NẠP TOÀN BỘ CƠ SỞ DỮ LIỆU ECOREPORT / GREENSPOT")
    print("=" * 70)

    print("\n👉 [BƯỚC 1/9] Đồng bộ ma trận phân quyền RBAC (Roles & Permissions)...")
    await run_rbac_migration()

    print("\n👉 [BƯỚC 2/9] Nạp dữ liệu nền tảng TP.HCM (GIS, Sự cố, Điểm xanh, Trạm IoT, Ngập lụt)...")
    await run_clean_seed()

    print("\n👉 [BƯỚC 3/9] Nạp dữ liệu Hồ sơ Công dân & Hộ chiếu Xanh (Green Passport)...")
    await seed_profile_data()

    print("\n👉 [BƯỚC 4/9] Nạp dữ liệu Bạn bè, Lời mời kết bạn & Đang theo dõi (STT 07)...")
    await seed_friends_data()

    print("\n👉 [BƯỚC 5/9] Nạp dữ liệu Bảng tin Mạng xã hội Geo-Feed kèm toạ độ & gắn thẻ (STT 08 & 09)...")
    await seed_posts_data()

    print("\n👉 [BƯỚC 6/9] Nạp danh mục Quy định xử phạt môi trường NĐ 45/2022/NĐ-CP (STT 11)...")
    await seed_penalty_regulations()

    print("\n👉 [BƯỚC 7/9] Nạp cấu hình Cài đặt người dùng & Theme giao diện (STT 25)...")
    await seed_user_settings()

    print("\n👉 [BƯỚC 8/9] Nạp dữ liệu cụm phát hiện Báo cáo trùng lặp AI (STT 20)...")
    await seed_deduplication()

    print("\n👉 [BƯỚC 9/9] Đồng bộ hóa cảm xúc sinh thái (Eco-Reactions) & Bình luận thực tế (STT 10 & 14)...")
    await seed_and_sync()

    print("\n" + "=" * 70)
    print("🎉 HOÀN TẤT NẠP TOÀN BỘ CƠ SỞ DỮ LIỆU TOÀN HỆ THỐNG THÀNH CÔNG 100%!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_seed_all())

