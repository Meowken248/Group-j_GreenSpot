"""
Seeder: Dữ liệu mẫu cho Chức năng STT 17 - Sinh nhật bạn bè & Thiệp xanh sinh thái
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 142 - 147)

Cách chạy (trong container backend):
    python -m app.seeds.seed_birthdays
hoặc chạy kèm toàn bộ hệ thống:
    python -m app.seeds.seed_all      # seeder này là bước cuối (BƯỚC 10/10)

Dữ liệu nạp:
1. Gán ngày sinh rơi đúng vào "hôm nay" cho nhóm bạn bè mẫu của
   citizen@ecoreport.gov.vn và admin@gmail.com (kèm cờ hiển thị ngày sinh).
   Đồng thời gán ngày sinh cho 2 tài khoản chính (citizen@ecoreport.gov.vn,
   admin@gmail.com) để bạn bè của họ cũng thấy banner sinh nhật.
2. Giữ lại các trường hợp biên để kiểm thử bộ lọc:
   - friend_dung_locked@... : tài khoản bị khoá (SUSPENDED) -> không hiển thị.
   - sug_duc@...            : chưa kết bạn                -> không hiển thị.
   - req_an@...             : đã tắt hiển thị ngày sinh   -> không hiển thị.
3. Nạp lời chúc / thiệp xanh của mùa sinh nhật năm trước để Hộp thư lời chúc
   có dữ liệu thật: đủ 4 mẫu thiệp xanh, có cả lời chúc CHƯA ĐỌC (badge hộp thư)
   và điểm thưởng +5 được cộng nhất quán cho cả người gửi & người nhận
   (kèm 2 bản ghi nhật ký user_activities giống luồng gửi thật).

Lưu ý: seeder idempotent (chạy lại nhiều lần không nhân đôi dữ liệu/điểm xanh):
- Ngày sinh được UPDATE theo ngày hiện tại.
- Lời chúc quá khứ chỉ nạp khi cặp bạn bè chưa từng có lời chúc/thiệp cùng loại.
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
from typing import Dict, List, Optional

import asyncpg

from app.core.config import settings

VN_TZ = timezone(timedelta(hours=7))

# Điểm thưởng thiệp xanh (đồng bộ với birthday_service.BIRTHDAY_CARD_POINTS)
BIRTHDAY_CARD_POINTS = 5

# (email, năm sinh, bật hiển thị ngày sinh)
BIRTHDAY_USERS = [
    # Bạn của citizen@ecoreport.gov.vn và admin@gmail.com
    ("friend_tuan@ecoreport.gov.vn", 1994, True),
    ("friend_ngan@ecoreport.gov.vn", 1996, True),
    ("friend_tri@ecoreport.gov.vn", 1993, True),
    # Bạn của admin@gmail.com
    ("citizen_a@ecoreport.gov.vn", 1999, True),
    ("req_mai@ecoreport.gov.vn", 1995, True),
    # Tài khoản chính: để bạn bè của họ cũng thấy banner "Sinh nhật hôm nay"
    ("citizen@ecoreport.gov.vn", 1995, True),
    ("admin@gmail.com", 1992, True),
    # Trường hợp biên cho bộ lọc hiển thị
    ("req_an@ecoreport.gov.vn", 1997, False),             # Đã TẮT hiển thị ngày sinh
    ("friend_dung_locked@ecoreport.gov.vn", 1992, True),  # Tài khoản bị khoá
    ("sug_duc@ecoreport.gov.vn", 1998, True),             # Chưa kết bạn
]

# Các tài khoản demo dùng để in thống kê sau khi nạp dữ liệu
SUMMARY_ACCOUNTS = [
    "citizen@ecoreport.gov.vn",
    "admin@gmail.com",
    "friend_tuan@ecoreport.gov.vn",
]

# Lời chúc / thiệp xanh của mùa sinh nhật năm trước
PAST_WISHES: List[Dict[str, object]] = [
    {
        "sender": "admin@gmail.com",
        "recipient": "friend_tri@ecoreport.gov.vn",
        "wish_type": "CARD",
        "card_id": "TREE_OF_HOPE",
        "is_read": True,
        "message": (
            "Chúc Trí một tuổi mới thật nhiều sức khoẻ và luôn giữ tinh thần "
            "sống xanh nhé! 🌱"
        ),
    },
    {
        "sender": "friend_tuan@ecoreport.gov.vn",
        "recipient": "citizen@ecoreport.gov.vn",
        "wish_type": "CARD",
        "card_id": "EARTH_GUARDIAN",
        "is_read": False,  # Chưa đọc -> demo badge "Hộp thư lời chúc"
        "message": (
            "Sinh nhật vui vẻ Đạt ơi! Mong năm nay mình cùng nhau làm thêm nhiều "
            "việc tốt cho môi trường. ♻️"
        ),
    },
    {
        "sender": "friend_ngan@ecoreport.gov.vn",
        "recipient": "citizen@ecoreport.gov.vn",
        "wish_type": "MESSAGE",
        "card_id": None,
        "is_read": False,
        "message": (
            "Chúc Đạt sinh nhật thật ấm áp, năm mới nhiều chuyến đi xanh và thật "
            "nhiều niềm vui nhé! 🌸"
        ),
    },
    {
        "sender": "citizen@ecoreport.gov.vn",
        "recipient": "friend_ngan@ecoreport.gov.vn",
        "wish_type": "CARD",
        "card_id": "RECYCLE_HERO",
        "is_read": True,
        "message": (
            "Happy birthday Ngân! Chúc bạn năm mới ngập tràn niềm vui và thật nhiều "
            "chuyến đi xanh. 🌸"
        ),
    },
    {
        "sender": "friend_tuan@ecoreport.gov.vn",
        "recipient": "admin@gmail.com",
        "wish_type": "CARD",
        "card_id": "BLOOMING_FUTURE",
        "is_read": False,
        "message": (
            "Chúc anh Quân sinh nhật rực rỡ! Cảm ơn anh đã luôn dẫn dắt cộng đồng "
            "GreenSpot sống xanh mỗi ngày. 🌿"
        ),
    },
    {
        "sender": "friend_tri@ecoreport.gov.vn",
        "recipient": "admin@gmail.com",
        "wish_type": "MESSAGE",
        "card_id": None,
        "is_read": True,
        "message": (
            "Chúc mừng sinh nhật anh Quân! Chúc anh thật nhiều sức khoẻ và thành "
            "công trong công việc. 🎂"
        ),
    },
    {
        "sender": "citizen@ecoreport.gov.vn",
        "recipient": "friend_tuan@ecoreport.gov.vn",
        "wish_type": "MESSAGE",
        "card_id": None,
        "is_read": False,
        "message": (
            "Chúc Tuấn sinh nhật vui vẻ! Năm mới tiếp tục là chiến binh IoT xanh "
            "của Thủ Đức nhé. 🌱"
        ),
    },
    {
        "sender": "req_mai@ecoreport.gov.vn",
        "recipient": "admin@gmail.com",
        "wish_type": "CARD",
        "card_id": "TREE_OF_HOPE",
        "is_read": True,
        "message": (
            "Chúc anh Quân tuổi mới bình an, vạn điều như ý và mãi lan toả lối "
            "sống xanh! 🌱"
        ),
    },
]


def birthday_date_for(year: int, today: date) -> date:
    """Tạo ngày sinh rơi đúng vào ngày/tháng của hôm nay (bỏ qua 29/02 ở năm không nhuận)"""
    try:
        return date(year, today.month, today.day)
    except ValueError:
        return date(year, today.month, 28)


async def _load_user_map(conn: asyncpg.Connection) -> Dict[str, Dict[str, object]]:
    """Nạp nhanh user_id + họ tên của các tài khoản liên quan"""
    emails = {row[0] for row in BIRTHDAY_USERS}
    emails.update(str(w["sender"]) for w in PAST_WISHES)
    emails.update(str(w["recipient"]) for w in PAST_WISHES)
    emails.update(SUMMARY_ACCOUNTS)

    rows = await conn.fetch(
        """
        SELECT user_id, email, full_name
        FROM users
        WHERE email = ANY($1::text[]) AND deleted_at IS NULL;
        """,
        sorted(emails),
    )
    return {
        row["email"]: {"user_id": row["user_id"], "full_name": row["full_name"]}
        for row in rows
    }


async def _past_wish_exists(
    conn: asyncpg.Connection,
    sender_id: uuid.UUID,
    recipient_id: uuid.UUID,
    wish_type: str,
) -> bool:
    """Cặp bạn bè đã từng có lời chúc/thiệp cùng loại trong quá khứ hay chưa"""
    found = await conn.fetchval(
        """
        SELECT 1
        FROM birthday_wishes
        WHERE sender_id = $1 AND recipient_id = $2 AND wish_type = $3
          AND birthday_date < CURRENT_DATE AND deleted_at IS NULL
        LIMIT 1;
        """,
        sender_id,
        recipient_id,
        wish_type,
    )
    return found is not None


async def seed_birthdays():
    print("🎂 Bắt đầu nạp dữ liệu mẫu cho Chức năng 17: Sinh nhật bạn bè & Thiệp xanh...")

    db_url = os.environ.get("DATABASE_URL", str(settings.DATABASE_URL))
    clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://").split("?")[0]
    conn = await asyncpg.connect(clean_url)

    try:
        today = datetime.now(VN_TZ).date()

        # 1. CẬP NHẬT NGÀY SINH & CỜ HIỂN THỊ NGÀY SINH
        print(" 🎈 [1/3] Cập nhật ngày sinh cho nhóm bạn bè mẫu...")
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

        # 2. NẠP LỜI CHÚC / THIỆP XANH CỦA NĂM TRƯỚC (hộp thư + điểm thưởng + nhật ký)
        print(" 💌 [2/3] Nạp lời chúc & thiệp xanh của mùa sinh nhật năm trước...")
        users = await _load_user_map(conn)
        inserted = skipped = 0
        wish_date = birthday_date_for(today.year - 1, today)
        created_at = datetime(
            wish_date.year, wish_date.month, wish_date.day, 9, 30, tzinfo=VN_TZ
        )

        for wish in PAST_WISHES:
            sender = users.get(str(wish["sender"]))
            recipient = users.get(str(wish["recipient"]))
            if sender is None or recipient is None:
                print(
                    f"   ⚠️  Bỏ qua: chưa có tài khoản {wish['sender']} hoặc {wish['recipient']}"
                )
                skipped += 1
                continue

            wish_type = str(wish["wish_type"])
            if await _past_wish_exists(
                conn, sender["user_id"], recipient["user_id"], wish_type
            ):
                skipped += 1
                continue

            points = BIRTHDAY_CARD_POINTS if wish_type == "CARD" else 0
            is_read = bool(wish["is_read"])
            message = str(wish["message"])
            read_at = created_at + timedelta(days=1) if is_read else None

            new_wish_id = await conn.fetchval(
                """
                INSERT INTO birthday_wishes (
                    wish_id, sender_id, recipient_id, wish_type, card_template_id,
                    message, birthday_date, points_awarded, is_read, read_at,
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
                ON CONFLICT DO NOTHING
                RETURNING wish_id;
                """,
                uuid.uuid4(),
                sender["user_id"],
                recipient["user_id"],
                wish_type,
                wish["card_id"],
                message,
                wish_date,
                points,
                is_read,
                read_at,
                created_at,
            )
            if new_wish_id is None:
                skipped += 1
                continue

            inserted += 1
            if points > 0:
                # Cộng điểm thưởng thiệp xanh cho cả người gửi & người nhận (như luồng thật)
                await conn.execute(
                    """
                    UPDATE users
                    SET total_green_points = total_green_points + $1,
                        updated_at = now()
                    WHERE user_id = ANY($2::uuid[]);
                    """,
                    points,
                    [sender["user_id"], recipient["user_id"]],
                )
                await conn.executemany(
                    """
                    INSERT INTO user_activities (
                        activity_id, user_id, activity_type, title, description, points, created_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7);
                    """,
                    [
                        (
                            uuid.uuid4(),
                            sender["user_id"],
                            "BIRTHDAY_CARD_SENT",
                            f"Tặng thiệp xanh sinh nhật cho {recipient['full_name']}",
                            message,
                            points,
                            created_at,
                        ),
                        (
                            uuid.uuid4(),
                            recipient["user_id"],
                            "BIRTHDAY_CARD_RECEIVED",
                            f"Nhận thiệp xanh sinh nhật từ {sender['full_name']}",
                            message,
                            points,
                            created_at,
                        ),
                    ],
                )
        print(
            f"   → Đã thêm {inserted}/{len(PAST_WISHES)} lời chúc/thiệp xanh "
            f"(bỏ qua {skipped} bản ghi đã tồn tại)."
        )

        # 3. THỐNG KÊ NHANH BANNER + HỘP THƯ LỜI CHÚC
        print(" 📊 [3/3] Thống kê dữ liệu Chức năng 17 sau khi nạp...")
        count_birthdays_sql = """
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
        inbox_sql = """
            SELECT count(*) AS total,
                   count(*) FILTER (WHERE NOT is_read) AS unread
            FROM birthday_wishes
            WHERE recipient_id = $1 AND deleted_at IS NULL;
        """
        total_wishes = await conn.fetchval(
            "SELECT count(*) FROM birthday_wishes WHERE deleted_at IS NULL;"
        )
        print(f"   • Tổng số lời chúc/thiệp xanh trong CSDL: {total_wishes}")

        for email in SUMMARY_ACCOUNTS:
            user = users.get(email)
            if user is None:
                continue
            birthdays = await conn.fetchval(
                count_birthdays_sql, email, today.month, today.day
            )
            inbox = await conn.fetchrow(inbox_sql, user["user_id"])
            print(
                f"   • {email:<38} banner {birthdays} bạn sinh nhật | "
                f"hộp thư {inbox['total']} lời chúc ({inbox['unread']} chưa đọc)"
            )

        print(
            f" 🎉 Hoàn tất nạp dữ liệu mẫu Chức năng 17 cho ngày {today.strftime('%d/%m/%Y')}!"
        )
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_birthdays())
