"""
Integration & Business Logic Test Suite cho Chức năng STT 17:
Banner "Sinh nhật hôm nay" trên Bảng tin & Thiệp xanh sinh thái.

Tuân thủ các ca kiểm thử theo đặc tả Báo cáo Đồ án Web 1 (trang 142 - 147).

Cách chạy (trong container backend):
    docker exec ecoreport_backend python -m tests.test_feature_17_birthdays

Ghi chú: trước khi kiểm thử, bộ test "hoàn tác" các lời chúc/thiệp đã tạo trong
hôm nay (xoá mềm + trả lại điểm xanh + xoá nhật ký hoạt động) để có thể chạy
lặp lại nhiều lần mà không vi phạm quy tắc chống trùng.
"""

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import asyncio
import os
from datetime import date, datetime, timedelta, timezone

import asyncpg
import requests

from app.core.config import settings

BASE_URL = "http://127.0.0.1:8000/api/v1"
VN_TZ = timezone(timedelta(hours=7))
CITIZEN_EMAIL = "citizen@ecoreport.gov.vn"
ADMIN_EMAIL = "admin@gmail.com"
TUAN_EMAIL = "friend_tuan@ecoreport.gov.vn"
NGAN_EMAIL = "friend_ngan@ecoreport.gov.vn"
HIDDEN_EMAIL = "req_an@ecoreport.gov.vn"          # Đã tắt hiển thị ngày sinh
LOCKED_EMAIL = "friend_dung_locked@ecoreport.gov.vn"  # Tài khoản bị khoá


def print_step(title: str):
    print(f"\n👉 {title}")


def login(email: str, password: str = "Password123@") -> dict:
    """Đăng nhập và trả về header Authorization"""
    res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, f"Đăng nhập {email} thất bại: {res.text}"
    data = res.json()
    token = data.get("access_token") or data.get("data", {}).get("access_token")
    assert token, f"Không tìm thấy access_token: {data}"
    return {"Authorization": f"Bearer {token}"}


def error_code(res) -> str:
    """Bóc error_code trong cấu trúc lỗi {error_code, message}"""
    body = res.json()
    detail = body.get("detail")
    if isinstance(detail, dict):
        return detail.get("error_code", "")
    return ""


async def reset_today_wishes():
    """Hoàn tác dữ liệu kiểm thử của hôm nay để bộ test chạy lại được nhiều lần"""
    db_url = os.environ.get("DATABASE_URL", str(settings.DATABASE_URL))
    clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://").split("?")[0]
    conn = await asyncpg.connect(clean_url)
    try:
        rows = await conn.fetch(
            """
            SELECT wish_id, sender_id, recipient_id, points_awarded
            FROM birthday_wishes
            WHERE birthday_date = CURRENT_DATE AND deleted_at IS NULL;
            """
        )
        if not rows:
            return 0

        # 1. Trả lại điểm xanh đã cộng cho người gửi và người nhận
        points_by_user = {}
        for row in rows:
            pts = int(row["points_awarded"] or 0)
            if pts > 0:
                points_by_user[row["sender_id"]] = points_by_user.get(row["sender_id"], 0) + pts
                points_by_user[row["recipient_id"]] = points_by_user.get(row["recipient_id"], 0) + pts
        for user_id, pts in points_by_user.items():
            await conn.execute(
                "UPDATE users SET total_green_points = GREATEST(total_green_points - $1, 0) WHERE user_id = $2;",
                pts,
                user_id,
            )

        # 2. Xoá nhật ký hoạt động phát sinh từ thiệp xanh hôm nay
        await conn.execute(
            """
            DELETE FROM user_activities
            WHERE activity_type IN ('BIRTHDAY_CARD_SENT', 'BIRTHDAY_CARD_RECEIVED')
              AND created_at >= date_trunc('day', now());
            """
        )

        # 3. Xoá mềm toàn bộ lời chúc của hôm nay
        await conn.execute(
            """
            UPDATE birthday_wishes
            SET deleted_at = now(), updated_at = now()
            WHERE birthday_date = CURRENT_DATE AND deleted_at IS NULL;
            """
        )
        return len(rows)
    finally:
        await conn.close()


async def fetch_user_id(email: str) -> str:
    """Lấy user_id theo email (dùng cho tài khoản trùng họ tên với người khác)"""
    db_url = os.environ.get("DATABASE_URL", str(settings.DATABASE_URL))
    clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://").split("?")[0]
    conn = await asyncpg.connect(clean_url)
    try:
        user_id = await conn.fetchval(
            "SELECT user_id FROM users WHERE email = $1 AND deleted_at IS NULL;", email
        )
        assert user_id, f"Không tìm thấy tài khoản {email} trong cơ sở dữ liệu"
        return str(user_id)
    finally:
        await conn.close()


def find_friend(friends: list, keyword: str) -> dict:
    """Tìm một người bạn theo một phần họ tên"""
    for item in friends:
        if keyword in item["full_name"]:
            return item
    raise AssertionError(f"Không tìm thấy bạn '{keyword}' trong danh sách bạn bè")


def main():
    print("=" * 70)
    print("🧪 [FEATURE 17 INTEGRATION TEST] BANNER SINH NHẬT & THIỆP XANH SINH THÁI")
    print("=" * 70)

    cleared = asyncio.run(reset_today_wishes())
    print(f"🧹 Đã dọn {cleared} lời chúc của hôm nay để chạy kiểm thử sạch.")

    # 1. Đăng nhập
    print_step("1. Đăng nhập citizen@ecoreport.gov.vn để lấy JWT access token")
    headers = login(CITIZEN_EMAIL)
    print("✅ Đăng nhập thành công!")

    # 2. Mẫu thiệp xanh
    print_step("2. Lấy danh sách mẫu thiệp xanh (GET /birthday/card-templates)")
    tpl_res = requests.get(f"{BASE_URL}/birthday/card-templates", headers=headers)
    assert tpl_res.status_code == 200, f"Lấy mẫu thiệp thất bại: {tpl_res.text}"
    templates = tpl_res.json()
    assert len(templates) == 4, f"Kỳ vọng 4 mẫu thiệp, nhận {len(templates)}"
    for tpl in templates:
        assert tpl["card_id"] and tpl["name"] and tpl["icon"]
        assert tpl["gradient_from"].startswith("#") and tpl["gradient_to"].startswith("#")
        assert "{name}" in tpl["suggestion"], "Gợi ý lời chúc phải có chỗ điền tên"
    print("✅ 4 mẫu thiệp hợp lệ: " + ", ".join(t["name"] for t in templates))

    # 3. Banner sinh nhật hôm nay
    print_step("3. Khối 'Sinh nhật hôm nay' (GET /birthday/today)")
    today_res = requests.get(f"{BASE_URL}/birthday/today", headers=headers)
    assert today_res.status_code == 200, f"Lấy banner thất bại: {today_res.text}"
    today = today_res.json()
    assert today["total"] >= 3, f"Seeder cần tối thiểu 3 bạn sinh nhật hôm nay, nhận {today['total']}"
    assert today["points_per_card"] == 5 and today["daily_points_cap"] == 25
    assert today["daily_points_earned"] == 0 and today["daily_reward_limit_reached"] is False
    today_date = date.fromisoformat(today["today"])
    assert today_date == datetime.now(VN_TZ).date(), "Ngày phải tính theo múi giờ Việt Nam"
    names = [item["full_name"] for item in today["items"]]
    assert not any("Bùi Tiến Dũng" in n for n in names), "Tài khoản bị khoá không được xuất hiện"
    assert not any("Nguyễn Văn An" in n for n in names), "Người tắt hiển thị ngày sinh không được xuất hiện"
    for item in today["items"]:
        dob = date.fromisoformat(item["date_of_birth"])
        assert (dob.month, dob.day) == (today_date.month, today_date.day)
        assert item["age"] >= 1, "Tuổi phải được tính từ ngày sinh"
        assert item["card_sent_today"] is False and item["wish_sent_today"] is False
    assert len(today["card_templates"]) == 4
    print(f"✅ Banner hiển thị {len(today['items'])}/{today['total']} bạn: {', '.join(names)}")

    # 4. Giới hạn hiển thị
    print_step("4. Giới hạn hiển thị banner (GET /birthday/today?limit=1)")
    one_res = requests.get(f"{BASE_URL}/birthday/today?limit=1", headers=headers)
    assert one_res.status_code == 200, one_res.text
    assert len(one_res.json()["items"]) == 1, "limit=1 phải chỉ trả về 1 bạn"
    assert one_res.json()["has_more"] is True, "Còn bạn khác nên has_more phải là True"
    print("✅ Giới hạn limit hoạt động đúng, cờ has_more = True.")

    # 5. Xác định người nhận thật
    print_step("5. Lấy danh sách bạn bè (GET /friends/list) để chọn người nhận")
    friends_res = requests.get(f"{BASE_URL}/friends/list", headers=headers)
    assert friends_res.status_code == 200, f"Lấy bạn bè thất bại: {friends_res.text}"
    friends = friends_res.json()
    tri = find_friend(friends, "Nguyễn Công Trí")
    tuan = find_friend(friends, "Hoàng Văn Tuấn")
    ngan = find_friend(friends, "Đỗ Bích Ngân")
    locked = find_friend(friends, "Bùi Tiến Dũng")
    print(f"✅ Có {len(friends)} bạn bè, chọn Trí (lời chúc), Tuấn (thiệp), Ngân (thiếu mẫu thiệp).")

    me_before = requests.get(f"{BASE_URL}/profile/me", headers=headers).json()["total_green_points"]
    tuan_before = requests.get(
        f"{BASE_URL}/profile/{tuan['user_id']}", headers=headers
    ).json()["total_green_points"]

    # 6. Gửi lời chúc xanh
    print_step("6. Gửi lời chúc xanh (MESSAGE) cho bạn Trí (POST /birthday/wishes)")
    message_payload = {
        "recipient_id": tri["user_id"],
        "wish_type": "MESSAGE",
        "message": "Chúc Trí sinh nhật vui vẻ, năm mới nhiều sức khoẻ và luôn sống xanh nhé!",
    }
    wish_res = requests.post(f"{BASE_URL}/birthday/wishes", json=message_payload, headers=headers)
    assert wish_res.status_code == 201, f"Gửi lời chúc thất bại: {wish_res.text}"
    wish = wish_res.json()
    assert wish["success"] is True
    assert wish["wish_type"] == "MESSAGE"
    assert wish["points_awarded"] == 0, "Lời chúc thường không cộng điểm"
    assert wish["recipient_name"] == tri["full_name"]
    assert "Đã gửi lời chúc xanh" in wish["message"]
    print(f"✅ Đã gửi lời chúc cho {wish['recipient_name']} (điểm thưởng: {wish['points_awarded']}).")

    # 7. Chống gửi trùng lời chúc
    print_step("7. Gửi lại lời chúc cho cùng bạn Trí trong ngày -> Phải báo ALREADY_SENT (409)")
    dup_res = requests.post(f"{BASE_URL}/birthday/wishes", json=message_payload, headers=headers)
    assert dup_res.status_code == 409, f"Kỳ vọng 409 nhưng nhận {dup_res.status_code}: {dup_res.text}"
    assert error_code(dup_res) == "ALREADY_SENT"
    print("✅ Chặn gửi trùng lời chúc thành công!")

    # 8. Tặng thiệp xanh
    print_step("8. Tặng thiệp xanh (CARD) cho bạn Tuấn kèm mẫu thiệp + điểm thưởng")
    card_payload = {
        "recipient_id": tuan["user_id"],
        "wish_type": "CARD",
        "card_template_id": templates[0]["card_id"],
        "message": templates[0]["suggestion"].replace("{name}", "Tuấn"),
    }
    card_res = requests.post(f"{BASE_URL}/birthday/wishes", json=card_payload, headers=headers)
    assert card_res.status_code == 201, f"Tặng thiệp thất bại: {card_res.text}"
    card = card_res.json()
    assert card["wish_type"] == "CARD"
    assert card["points_awarded"] == 5, "Thiệp xanh phải cộng +5 điểm"
    assert card["sender_total_green_points"] == me_before + 5
    assert "+5 điểm xanh" in card["message"]
    tuan_after = requests.get(
        f"{BASE_URL}/profile/{tuan['user_id']}", headers=headers
    ).json()["total_green_points"]
    assert tuan_after == tuan_before + 5, "Người nhận cũng phải được +5 điểm xanh"
    print(f"✅ Tặng thiệp thành công: người gửi {me_before} → {card['sender_total_green_points']}, "
          f"người nhận {tuan_before} → {tuan_after}.")

    # 9. Chống tặng trùng thiệp
    print_step("9. Tặng lại thiệp cho cùng bạn Tuấn trong ngày -> Phải báo ALREADY_SENT (409)")
    dup_card = requests.post(f"{BASE_URL}/birthday/wishes", json=card_payload, headers=headers)
    assert dup_card.status_code == 409, f"Kỳ vọng 409 nhưng nhận {dup_card.status_code}: {dup_card.text}"
    assert error_code(dup_card) == "ALREADY_SENT"
    print("✅ Chặn tặng trùng thiệp thành công!")

    # 10. Thiệp xanh thiếu mẫu thiệp
    print_step("10. Gửi thiệp xanh nhưng không chọn mẫu -> Phải báo CARD_TEMPLATE_REQUIRED")
    no_tpl = requests.post(
        f"{BASE_URL}/birthday/wishes",
        json={"recipient_id": ngan["user_id"], "wish_type": "CARD", "message": "Chúc mừng sinh nhật Ngân!"},
        headers=headers,
    )
    assert no_tpl.status_code == 400, f"Kỳ vọng 400 nhưng nhận {no_tpl.status_code}: {no_tpl.text}"
    assert error_code(no_tpl) == "CARD_TEMPLATE_REQUIRED"
    print("✅ Chặn thiệp thiếu mẫu thành công!")

    # 11. Mẫu thiệp không hợp lệ
    print_step("11. Chọn mẫu thiệp không tồn tại -> Phải báo CARD_TEMPLATE_INVALID")
    bad_tpl = requests.post(
        f"{BASE_URL}/birthday/wishes",
        json={
            "recipient_id": ngan["user_id"],
            "wish_type": "CARD",
            "card_template_id": "MAU_THIEP_KHONG_TON_TAI",
            "message": "Chúc mừng sinh nhật Ngân!",
        },
        headers=headers,
    )
    assert bad_tpl.status_code == 400, f"Kỳ vọng 400 nhưng nhận {bad_tpl.status_code}: {bad_tpl.text}"
    assert error_code(bad_tpl) == "CARD_TEMPLATE_INVALID"
    print("✅ Chặn mẫu thiệp không hợp lệ thành công!")

    # 12. Lọc nội dung không phù hợp
    print_step("12. Lời chúc chứa nội dung không phù hợp -> Phải báo INAPPROPRIATE_CONTENT")
    banned_res = requests.post(
        f"{BASE_URL}/birthday/wishes",
        json={"recipient_id": ngan["user_id"], "wish_type": "MESSAGE", "message": "Đồ ngu, chúc mừng sinh nhật!"},
        headers=headers,
    )
    assert banned_res.status_code == 400, f"Kỳ vọng 400 nhưng nhận {banned_res.status_code}: {banned_res.text}"
    assert error_code(banned_res) == "INAPPROPRIATE_CONTENT"
    print("✅ Bộ lọc nội dung xấu hoạt động đúng!")

    # 13. Giới hạn độ dài 200 ký tự
    print_step("13. Lời chúc dài 201 ký tự -> Phải bị chặn bởi validation")
    long_res = requests.post(
        f"{BASE_URL}/birthday/wishes",
        json={"recipient_id": ngan["user_id"], "wish_type": "MESSAGE", "message": "A" * 201},
        headers=headers,
    )
    assert long_res.status_code == 422, f"Kỳ vọng 422 nhưng nhận {long_res.status_code}: {long_res.text}"
    print("✅ Chặn lời chúc vượt 200 ký tự thành công!")

    # 14. Không được để trống lời chúc
    print_step("14. Lời chúc rỗng -> Phải bị chặn bởi validation")
    empty_res = requests.post(
        f"{BASE_URL}/birthday/wishes",
        json={"recipient_id": ngan["user_id"], "wish_type": "MESSAGE", "message": "   "},
        headers=headers,
    )
    assert empty_res.status_code == 422, f"Kỳ vọng 422 nhưng nhận {empty_res.status_code}: {empty_res.text}"
    print("✅ Chặn lời chúc rỗng thành công!")

    # 15. Không thể gửi cho người không còn là bạn bè / tài khoản bị khoá
    print_step("15. Gửi cho bạn đang bị khoá tài khoản -> Phải báo RECIPIENT_NOT_FRIEND")
    locked_res = requests.post(
        f"{BASE_URL}/birthday/wishes",
        json={"recipient_id": locked["user_id"], "wish_type": "MESSAGE", "message": "Chúc mừng sinh nhật!"},
        headers=headers,
    )
    assert locked_res.status_code == 409, f"Kỳ vọng 409 nhưng nhận {locked_res.status_code}: {locked_res.text}"
    assert error_code(locked_res) == "RECIPIENT_NOT_FRIEND"
    print("✅ Chặn gửi cho tài khoản bị khoá thành công!")

    # 16. Không thể tự chúc mừng chính mình
    print_step("16. Tự gửi lời chúc cho chính mình -> Phải bị chặn")
    me_id = requests.get(f"{BASE_URL}/profile/me", headers=headers).json()["user_id"]
    self_res = requests.post(
        f"{BASE_URL}/birthday/wishes",
        json={"recipient_id": me_id, "wish_type": "MESSAGE", "message": "Tự chúc mừng sinh nhật mình!"},
        headers=headers,
    )
    assert self_res.status_code == 409, f"Kỳ vọng 409 nhưng nhận {self_res.status_code}: {self_res.text}"
    assert error_code(self_res) == "RECIPIENT_NOT_FRIEND"
    print("✅ Chặn tự chúc mừng bản thân thành công!")

    # 17. Người đã tắt hiển thị ngày sinh
    print_step("17. Gửi cho người đã tắt hiển thị ngày sinh -> Phải báo BIRTHDAY_HIDDEN")
    hidden_id = asyncio.run(fetch_user_id(HIDDEN_EMAIL))
    admin_headers = login(ADMIN_EMAIL, "admin@gmail.com")
    hidden_res = requests.post(
        f"{BASE_URL}/birthday/wishes",
        json={"recipient_id": hidden_id, "wish_type": "MESSAGE", "message": "Chúc mừng sinh nhật bạn!"},
        headers=admin_headers,
    )
    assert hidden_res.status_code == 400, f"Kỳ vọng 400 nhưng nhận {hidden_res.status_code}: {hidden_res.text}"
    assert error_code(hidden_res) == "BIRTHDAY_HIDDEN"
    print("✅ Tôn trọng quyền riêng tư ngày sinh thành công!")

    # 18. Trạng thái đã chúc trên banner
    print_step("18. Banner cập nhật trạng thái đã chúc / đã tặng thiệp (GET /birthday/today)")
    after = requests.get(f"{BASE_URL}/birthday/today", headers=headers).json()
    by_id = {item["user_id"]: item for item in after["items"]}
    assert by_id[tri["user_id"]]["wish_sent_today"] is True, "Trí phải được đánh dấu đã nhận lời chúc"
    assert by_id[tri["user_id"]]["card_sent_today"] is False
    assert by_id[tuan["user_id"]]["card_sent_today"] is True, "Tuấn phải được đánh dấu đã nhận thiệp"
    assert by_id[ngan["user_id"]]["card_sent_today"] is False
    assert after["daily_points_earned"] == 5, "Điểm thưởng trong ngày phải là 5"
    assert after["daily_reward_limit_reached"] is False
    print("✅ Banner hiển thị đúng trạng thái đã chúc và điểm thưởng trong ngày (5/25).")

    # 19. Banner của một tài khoản khác
    print_step("19. Banner của admin@gmail.com (GET /birthday/today) -> không lộ người tắt hiển thị")
    admin_today = requests.get(f"{BASE_URL}/birthday/today", headers=admin_headers)
    assert admin_today.status_code == 200, admin_today.text
    admin_data = admin_today.json()
    admin_names = [item["full_name"] for item in admin_data["items"]]
    assert admin_data["total"] >= 4, f"Admin phải có tối thiểu 4 bạn sinh nhật, nhận {admin_data['total']}"
    assert admin_data["has_more"] is True, "Danh sách vượt limit nên has_more phải là True"
    assert "Nguyễn Văn An" not in admin_names, "Người tắt hiển thị ngày sinh không được lộ ra"
    print(f"✅ Admin thấy {len(admin_names)}/{admin_data['total']} bạn: {', '.join(admin_names)}")

    # 20. Hộp thư lời chúc đã nhận
    print_step("20. Bạn Tuấn mở hộp thư lời chúc (GET /birthday/wishes/received)")
    tuan_headers = login(TUAN_EMAIL)
    inbox_res = requests.get(f"{BASE_URL}/birthday/wishes/received", headers=tuan_headers)
    assert inbox_res.status_code == 200, f"Lấy hộp thư thất bại: {inbox_res.text}"
    inbox = inbox_res.json()
    assert inbox["total"] >= 1, "Hộp thư phải có thiệp xanh vừa nhận"
    assert inbox["unread_count"] >= 1, "Phải có lời chúc chưa đọc"
    new_items = [
        item
        for item in inbox["items"]
        if item["wish_type"] == "CARD" and item["card_template_id"] == templates[0]["card_id"]
    ]
    assert new_items, "Không tìm thấy thiệp xanh vừa tặng trong hộp thư"
    assert new_items[0]["sender_name"] == "Nguyễn Thành Đạt"
    assert new_items[0]["points_awarded"] == 5, "Thiệp xanh nhận được phải ghi nhận +5 điểm"
    new_wish_id = new_items[0]["wish_id"]
    print(f"✅ Hộp thư có {inbox['total']} lời chúc, {inbox['unread_count']} chưa đọc.")

    # 21. Đánh dấu đã đọc một lời chúc cụ thể
    print_step("21. Đánh dấu đã đọc một lời chúc cụ thể (POST /birthday/wishes/read)")
    read_one = requests.post(
        f"{BASE_URL}/birthday/wishes/read", json={"wish_ids": [new_wish_id]}, headers=tuan_headers
    )
    assert read_one.status_code == 200, read_one.text
    assert read_one.json()["success"] is True
    assert read_one.json()["marked_count"] >= 1, "Phải đánh dấu được ít nhất 1 lời chúc"
    print("✅ Đánh dấu đã đọc theo danh sách wish_ids thành công!")

    # 22. Đánh dấu đã đọc toàn bộ hộp thư
    print_step("22. Đánh dấu đã đọc toàn bộ hộp thư -> unread_count phải về 0")
    read_all = requests.post(f"{BASE_URL}/birthday/wishes/read", json={}, headers=tuan_headers)
    assert read_all.status_code == 200, read_all.text
    assert read_all.json()["unread_count"] == 0, "Sau khi đọc hết, unread_count phải bằng 0"
    inbox_after = requests.get(f"{BASE_URL}/birthday/wishes/received", headers=tuan_headers).json()
    assert inbox_after["unread_count"] == 0
    assert all(item["is_read"] for item in inbox_after["items"])
    print("✅ Hộp thư đã được đánh dấu đọc toàn bộ!")

    print("\n" + "=" * 70)
    print("🎉 TẤT CẢ 22/22 BÀI KIỂM THỬ BACKEND CHO CHỨC NĂNG 17 ĐÃ VƯỢT QUA 100%!")
    print("=" * 70)


if __name__ == "__main__":
    main()
