"""
Shortcut để chạy seed admin trực tiếp từ thư mục BackEnd:
    python seed_admin.py
"""

import asyncio
from app.seeds.seed_admin import seed_admin

if __name__ == "__main__":
    asyncio.run(seed_admin())
