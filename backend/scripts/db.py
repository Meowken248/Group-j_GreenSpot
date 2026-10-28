"""
Công cụ tiện ích quản lý Database GreenSpot (EcoReport)
Thư mục: BackEnd/scripts/db.py

Cách sử dụng (từ thư mục BackEnd):
    python scripts/db.py up        -> Bật Database PostgreSQL (Docker)
    python scripts/db.py down      -> Tắt Database
    python scripts/db.py studio    -> Mở giao diện Web xem dữ liệu (Prisma Studio)
    python scripts/db.py seed      -> Nạp dữ liệu Admin và báo cáo trùng AI mẫu
    python scripts/db.py migrate   -> Cập nhật cấu trúc bảng mới (Alembic)
    python scripts/db.py pull      -> Kéo cấu trúc bảng từ PostgreSQL về Prisma schema
"""

import sys
import subprocess
from pathlib import Path

# Đảm bảo UTF-8 cho console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# scripts_dir -> BackEnd -> Root
scripts_dir = Path(__file__).resolve().parent
backend_dir = scripts_dir.parent
root_dir = backend_dir.parent


def run_cmd(cmd, cwd=backend_dir):
    print(f"\n🚀 Đang thực thi: {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=str(cwd))
    return res.returncode


def db_up():
    print("📦 Khởi động Database PostgreSQL (Docker)...")
    run_cmd("docker compose up -d db", cwd=root_dir)


def db_down():
    print("🛑 Dừng Database PostgreSQL...")
    run_cmd("docker compose stop db", cwd=root_dir)


def db_studio():
    print("🌐 Mở giao diện trực quan Prisma Studio (cổng 5555)...")
    run_cmd("prisma studio", cwd=backend_dir)


def db_seed():
    print("🌱 Nạp toàn bộ dữ liệu mẫu (Admin + 3 cụm AI Deduplication + STT 39 & 40 Triage & Spatial)...")
    run_cmd("python app/seeds/seed_admin.py", cwd=backend_dir)
    run_cmd("python app/seeds/deduplication/seed_data.py", cwd=backend_dir)
    run_cmd("python -m app.seeds.triage_spatial_seed", cwd=backend_dir)


def db_migrate():
    print("🔄 Cập nhật cấu trúc bảng CSDL (Alembic upgrade head)...")
    run_cmd("alembic upgrade head", cwd=backend_dir)


def db_pull():
    print("📥 Kéo cấu trúc bảng từ PostgreSQL về Prisma schema...")
    run_cmd("prisma db pull", cwd=backend_dir)


def print_help():
    print("\n" + "=" * 60)
    print("🌿 BỘ LỆNH TẮT QUẢN LÝ DATABASE GREENSPOT")
    print("=" * 60)
    print("  python scripts/db.py up       : Bật Database (Docker)")
    print("  python scripts/db.py down     : Tắt Database")
    print("  python scripts/db.py studio   : Mở giao diện Web xem dữ liệu (Prisma Studio)")
    print("  python scripts/db.py seed     : Nạp dữ liệu mẫu (Admin + Báo cáo trùng AI)")
    print("  python scripts/db.py migrate  : Cập nhật cấu trúc bảng mới")
    print("  python scripts/db.py pull     : Tự động kéo cấu trúc bảng về Prisma schema")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_help()
        sys.exit(0)

    action = sys.argv[1].lower()
    if action == "up":
        db_up()
    elif action == "down":
        db_down()
    elif action == "studio":
        db_studio()
    elif action == "seed":
        db_seed()
    elif action == "migrate":
        db_migrate()
    elif action == "pull":
        db_pull()
    else:
        print(f"❌ Lệnh không hợp lệ: {action}")
        print_help()
