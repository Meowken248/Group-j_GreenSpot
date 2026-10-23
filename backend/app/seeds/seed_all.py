"""
EcoReport Master Seeder (Nạp toàn bộ dữ liệu hệ thống)
Chạy lần lượt:
1. Đồng bộ ma trận phân quyền RBAC (Roles, 105 Permissions, 15 Modules)
2. Nạp dữ liệu nền tảng TP.HCM (Admin Units, Waste Categories, Incidents, Green Spots, Recycling, IoT, Flood, Tides)
3. Nạp dữ liệu Hồ sơ Công dân & Hộ chiếu Xanh (Citizen Levels, Badges, User Activities, Timeline Posts)
"""

import asyncio
import sys
import os

from app.seeds.seed_rbac_matrix import run_rbac_migration
from app.seeds.seed_clean import run_clean_seed
from app.seeds.seed_profile_data import seed_profile_data


async def run_seed_all():
    print("=" * 65)
    print("🚀 BẮT ĐẦU NẠP TOÀN BỘ CƠ SỞ DỮ LIỆU ECOREPORT / GREENSPOT")
    print("=" * 65)

    print("\n👉 [BƯỚC 1/3] Đồng bộ ma trận phân quyền RBAC...")
    await run_rbac_migration()

    print("\n👉 [BƯỚC 2/3] Nạp dữ liệu nền tảng TP.HCM (GIS, Sự cố, Điểm xanh, Trạm IoT, Ngập lụt)...")
    await run_clean_seed()

    print("\n👉 [BƯỚC 3/3] Nạp dữ liệu Hồ sơ Công dân & Hộ chiếu Xanh (Green Passport)...")
    await seed_profile_data()

    print("\n" + "=" * 65)
    print("🎉 HOÀN TẤT NẠP TOÀN BỘ CƠ SỞ DỮ LIỆU THÀNH CÔNG 100%!")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_seed_all())

