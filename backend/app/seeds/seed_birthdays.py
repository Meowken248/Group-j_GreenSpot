"""
Seeder: Dữ liệu mẫu cho Chức năng STT 17 - Sinh nhật bạn bè & Thiệp xanh sinh thái
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 142 - 147)

Cách chạy (trong container backend):
    python -m app.seeds.seed_birthdays

Dữ liệu nạp:
1. Gán ngày sinh rơi đúng vào "hôm nay" cho nhóm bạn bè mẫu của
   citizen@ecoreport.gov.vn và admin@gmail.com (kèm cờ hiển thị ngày sinh).
2. Giữ lại các trường hợp biên để kiểm thử bộ lọc:
   - friend_dung_locked@... : tài khoản bị khoá (SUSPENDED) -> không hiển thị.
   - sug_duc@...            : chưa kết bạn                -> không hiển thị.
   - req_an@...             : đã tắt hiển thị ngày sinh   -> không hiển thị.
3. Nạp một vài lời chúc cũ (năm trước) để hộp thư lời chúc có dữ liệu thật.
"""

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import asyncio
import os
import uuid
from datetime import date, datetime, timedelta, timezone

import asyncpg

from app.core.config import settings

VN_TZ = timezone(timedelta(hours=7))

# (email, năm sinh, bật hiển thị ngày sinh)
BIRTHDAY_USERS = [
    ("friend_tuan@ecoreport.gov.vn", 1994, True),          # Bạn của citizen@ và admin@
    ("friend_ngan@ecoreport.gov.vn", 1996, True),          # Bạn của citizen@ và admin@
    ("friend_tri@ecoreport.gov.vn", 1993, True),           # Bạn của citizen@ và admin@
    ("citizen_a@ecoreport.gov.vn", 1999, True),            # Bạn của admin@
    ("req_mai@ecoreport.gov.vn", 1995, True),              # Bạn của admin@
    ("req_an@ecoreport.gov.vn", 1997, False),              # Đã TẮT hiển thị ngày sinh
    ("friend_dung_locked@ecoreport.gov.vn", 1992, True),   # Tài khoản bị khoá
    ("sug_duc@ecoreport.gov.vn", 1998, True),              # Chưa kết bạn
]

# (email người gửi, email người nhận, lời chúc, số năm trước)
PAST_WISHES = [
    (
        "admin@gmail.com",
        "friend_tri@ecoreport.gov.vn",
        "Chúc Trí một tuổi mới thật nhiều sức khoẻ và luôn giữ tinh thần sống xanh nhé! 🌱",
        1,
    ),
    (
        "friend_tuan@ecoreport.gov.vn",
        "citizen@ecoreport.gov.vn",
        "Sinh nhật vui vẻ Đạt ơi! Mong năm nay mình cùng nhau làm thêm nhiều việc tốt cho môi trường. ♻️",
        1,
    ),
    (
        "citizen@ecoreport.gov.vn",
        "friend_ngan@ecoreport.gov.vn",
        "Happy birthday Ngân! Chúc bạn năm mới ngập tràn niềm vui và thật nhiều chuyến đi xanh. 🌸",
        1,
    ),
]


def birthday_date_for(year: int, today: date) -> date:
    """Tạo ngày sinh rơi đúng vào ngày/tháng của hôm nay (bỏ qua 29/02 ở năm không nhuận)"""
    try:
        return date(year, today.month, today.day)
    except ValueError:
        return date(year, today.month, 28)



async def seed_birthdays():
    print("🎂 Bắt đầu nạp dữ liệu mẫu cho Chức năng 17: Sinh nhật bạn bè & Thiệp xanh...")

    db_url = os.environ.get("DATABASE_URL", str(settings.DATABASE_URL))
    clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://").split("?")[0]
    conn = await asyncpg.connect(clean_url)

    try:
        today = datetime.now(VN_TZ).date()

        # 1. CẬP NHẬT NGÀY SINH & CỜ HIỂN THỊ NGÀY SINH
        print(" 🎈 [1/2] Cập nhật ngày sinh cho nhóm bạn bè mẫu...")
        updated = 0
        for email, birth_year, show_birthday in BIRTHDAY_USERS:
            dob = birthday_date_for(birth_year, today)
            result = await conn.execute(
                """
                UPDATE users
                SET date_of_birth = $1,
                    show_birthday = $2,
                    updated_at = now()
                WHERE email = $3 AND deleted_at IS NULL;
                """,
                dob,
                show_birthday,
                email,
            )
            if result != "UPDATE 0":
                updated += 1
                status = "hiển thị" if show_birthday else "ẩn"
                print(f"   • {email:<38} sinh nhật {dob.strftime('%d/%m')} ({status})")
        print(f"   → Đã cập nhật {updated}/{len(BIRTHDAY_USERS)} tài khoản.")

        # 2. NẠP LỜI CHÚC CŨ ĐỂ HỘP THƯ CÓ DỮ LIỆU THẬT
        print(" 💌 [2/2] Nạp lời chúc sinh nhật của năm trước...")
        inserted = 0
        for sender_email, recipient_email, message, years_ago in PAST_WISHES:
            wish_date = birthday_date_for(today.year - years_ago, today)
            created_at = datetime(
                wish_date.year, wish_date.month, wish_date.day, 9, 30, tzinfo=VN_TZ
            )
            result = await conn.execute(
                """
                INSERT INTO birthday_wishes (
                    wish_id, sender_id, recipient_id, wish_type, card_template_id,
                    message, birthday_date, points_awarded, is_read, created_at, updated_at
                )
                SELECT $1, s.user_id, r.user_id, 'MESSAGE', NULL, $2, $3, 0, true, $4, $4
                FROM users s, users r
                WHERE s.email = $5 AND r.email = $6
                  AND s.deleted_at IS NULL AND r.deleted_at IS NULL
                ON CONFLICT DO NOTHING;
                """,
                uuid.uuid4(),
                message,
                wish_date,
                created_at,
                sender_email,
                recipient_email,
            )
            if result != "INSERT 0 0":
                inserted += 1
        print(f"   → Đã thêm {inserted}/{len(PAST_WISHES)} lời chúc cũ (bỏ qua bản ghi đã có).")

        # 3. THỐNG KÊ NHANH SỐ BẠN SINH NHẬT HÔM NAY
        count_sql = """
            SELECT count(*) FROM users u
            JOIN friendships f
              ON (f.user_id_1 = u.user_id OR f.user_id_2 = u.user_id) AND f.deleted_at IS NULL
            JOIN users me
              ON me.user_id = CASE WHEN f.user_id_1 = u.user_id THEN f.user_id_2 ELSE f.user_id_1 END
            WHERE me.email = $1
              AND u.deleted_at IS NULL AND u.status = 'ACTIVE' AND u.show_birthday
              AND u.date_of_birth IS NOT NULL
              AND EXTRACT(MONTH FROM u.date_of_birth) = $2
              AND EXTRACT(DAY FROM u.date_of_birth) = $3;
        """
        visible_citizen = await conn.fetchval(
            count_sql, "citizen@ecoreport.gov.vn", today.month, today.day
        )
        visible_admin = await conn.fetchval(
            count_sql, "admin@gmail.com", today.month, today.day
        )
        print(
            f" 📊 Hôm nay ({today.strftime('%d/%m/%Y')}): "
            f"citizen@ecoreport.gov.vn thấy {visible_citizen} bạn, "
            f"admin@gmail.com thấy {visible_admin} bạn sinh nhật."
        )
        print("🎉 Hoàn tất nạp dữ liệu mẫu Chức năng 17!")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_birthdays())
