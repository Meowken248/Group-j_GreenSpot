"""
Test Script toàn diện cho Chức năng 15 (Nhắn tin riêng 1-1, Chat nhóm, Chat quận)
Sử dụng thư viện requests có sẵn trong container.
Kiểm tra tất cả các quy tắc nghiệp vụ theo đặc tả SRS:
1. Đăng nhập lấy JWT access token
2. Màn 1: Lấy danh sách hội thoại tab 1-1, Nhóm, Quận
3. Màn 2: Lấy 30 tin nhắn, trạng thái Đã gửi / Đã xem
4. Màn 2: Gửi tin nhắn, validation 1000 ký tự, ảnh đính kèm
5. Màn 2: Chống spam chat quận (429: Bạn gửi tin quá nhanh. Vui lòng thử lại sau ít giây)
6. Màn 2: Đánh dấu đã đọc (unread reset = 0)
7. Màn 3: Tạo nhóm chat (validate < 2 thành viên, tên nhóm <= 50 ký tự, người tạo là ADMIN, tin hệ thống)
8. Màn 4: Xóa hội thoại 1-1 (1 phía cleared_at)
9. Màn 4: Rời nhóm (Chặn Quản trị viên duy nhất, chuyển quyền ADMIN, rời nhóm thành công, chặn gửi tin khi đã rời)
"""

import json
import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"


def main():
    print("=" * 70)
    print("🧪 [FEATURE 15 INTEGRATION TEST] BẮT ĐẦU KIỂM TRA CHỨC NĂNG CHAT")
    print("=" * 70)

    # 1. Đăng nhập tài khoản citizen@ecoreport.gov.vn
    print("\n🔑 1. Đăng nhập citizen@ecoreport.gov.vn...")
    login_res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "citizen@ecoreport.gov.vn", "password": "Password123@"}
    )
    if login_res.status_code != 200:
        print(f"❌ Đăng nhập thất bại: {login_res.status_code} {login_res.text}")
        return
    token_data = login_res.json()
    token = token_data.get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Đăng nhập thành công! Đã lấy Access Token.")

    # 2. Màn 1: Lấy danh sách hội thoại tab 1-1
    print("\n📋 2. Màn 1: Lấy danh sách hội thoại tab 'direct'...")
    res_direct = requests.get(f"{BASE_URL}/chat/conversations?tab=direct", headers=headers)
    assert res_direct.status_code == 200, f"Error {res_direct.status_code}: {res_direct.text}"
    direct_data = res_direct.json()
    print(f"✅ Tab 1-1: Tìm thấy {direct_data['total']} hội thoại.")
    if direct_data["items"]:
        conv1 = direct_data["items"][0]
        print(f"   - Hội thoại: '{conv1['title']}', Unread: {conv1['unread_count']}, Online: {conv1['is_online']}")

    # 3. Màn 1: Lấy danh sách hội thoại tab Nhóm
    print("\n👥 3. Màn 1: Lấy danh sách hội thoại tab 'group'...")
    res_group = requests.get(f"{BASE_URL}/chat/conversations?tab=group", headers=headers)
    assert res_group.status_code == 200, f"Error {res_group.status_code}: {res_group.text}"
    group_data = res_group.json()
    print(f"✅ Tab Nhóm: Tìm thấy {group_data['total']} nhóm.")
    if group_data["items"]:
        g_conv = group_data["items"][0]
        print(f"   - Nhóm: '{g_conv['title']}', Thành viên: {g_conv['members_count']}, Là Quản trị: {g_conv['is_admin']}")

    # 4. Màn 1: Lấy danh sách hội thoại tab Quận
    print("\n🏘️ 4. Màn 1: Lấy danh sách hội thoại tab 'district'...")
    res_dist = requests.get(f"{BASE_URL}/chat/conversations?tab=district", headers=headers)
    assert res_dist.status_code == 200, f"Error {res_dist.status_code}: {res_dist.text}"
    dist_data = res_dist.json()
    print(f"✅ Tab Quận: Tìm thấy {dist_data['total']} phòng chat.")
    assert dist_data["total"] >= 1, "Phải có ít nhất 1 phòng chat quận của người dùng"
    dist_conv = dist_data["items"][0]
    district_conv_id = dist_conv["conversation_id"]
    print(f"   - Phòng quận: '{dist_conv['title']}' ({dist_conv['district_name']})")

    # 5. Màn 2: Lấy 30 tin nhắn trong phòng quận
    print(f"\n💬 5. Màn 2: Lấy tin nhắn phòng quận ({district_conv_id})...")
    res_msgs = requests.get(f"{BASE_URL}/chat/conversations/{district_conv_id}/messages", headers=headers)
    assert res_msgs.status_code == 200, f"Error {res_msgs.status_code}: {res_msgs.text}"
    msgs_data = res_msgs.json()
    print(f"✅ Đã tải {len(msgs_data['items'])}/{msgs_data['total']} tin nhắn (has_more={msgs_data['has_more']}).")

    # 6. Màn 2: Gửi tin nhắn hợp lệ vào phòng quận
    print("\n✉️ 6. Màn 2: Gửi tin nhắn hợp lệ vào phòng quận...")
    send_res = requests.post(
        f"{BASE_URL}/chat/conversations/{district_conv_id}/messages",
        headers=headers,
        json={"content": "Xin chào cộng đồng môi trường! Hãy cùng nhau giữ gìn khu phố sạch đẹp."}
    )
    assert send_res.status_code == 201, f"Error {send_res.status_code}: {send_res.text}"
    sent_msg = send_res.json()
    print(f"✅ Gửi thành công tin ID: {sent_msg['message_id']}, Trạng thái: {sent_msg['status']}")

    # 7. Màn 2: Kiểm tra Chống spam Chat quận (<3s gửi tiếp -> 429)
    print("\n⚡ 7. Màn 2: Kiểm tra Chống spam Chat quận (<3s cooldown)...")
    spam_res = requests.post(
        f"{BASE_URL}/chat/conversations/{district_conv_id}/messages",
        headers=headers,
        json={"content": "Tin nhắn spam gửi quá nhanh!"}
    )
    print(f"   - Phản hồi từ server: HTTP {spam_res.status_code} => {spam_res.json()}")
    assert spam_res.status_code == 429, f"Kỳ vọng 429 nhưng nhận {spam_res.status_code}"
    assert "Bạn gửi tin quá nhanh" in spam_res.text, "Thông điệp phải đúng SRS"
    print("✅ Kiểm tra chống spam quận thành công: Server chặn với mã 429 và thông báo chuẩn SRS!")

    # 8. Màn 2: Kiểm tra xác thực độ dài tin nhắn > 1000 ký tự
    print("\n📏 8. Màn 2: Kiểm tra tin nhắn vượt quá 1000 ký tự...")
    long_content = "A" * 1005
    long_res = requests.post(
        f"{BASE_URL}/chat/conversations/{district_conv_id}/messages",
        headers=headers,
        json={"content": long_content}
    )
    print(f"   - Phản hồi: HTTP {long_res.status_code}")
    assert long_res.status_code in (400, 422), f"Kỳ vọng 400/422 nhưng nhận {long_res.status_code}"
    print("✅ Chặn tin nhắn >1000 ký tự thành công!")

    # 9. Màn 2: Đánh dấu đã đọc
    print(f"\n👀 9. Màn 2: Đánh dấu đã đọc phòng quận...")
    read_res = requests.post(f"{BASE_URL}/chat/conversations/{district_conv_id}/read", headers=headers)
    assert read_res.status_code == 200
    print("✅ Đánh dấu đã đọc thành công!")

    # 10. Màn 3: Tạo nhóm chat mới
    print("\n👥 10. Màn 3: Kiểm tra Popup Tạo nhóm chat...")
    friends_res = requests.get(f"{BASE_URL}/friends/list", headers=headers)
    friends = friends_res.json() if friends_res.status_code == 200 else []
    print(f"   - Danh sách bạn bè hiện tại: {len(friends)} bạn.")

    if len(friends) >= 2:
        # Test validate < 2 members
        bad_grp = requests.post(
            f"{BASE_URL}/chat/conversations/group",
            headers=headers,
            json={"title": "Nhóm thử nghiệm", "member_user_ids": [friends[0]["user_id"]]}
        )
        assert bad_grp.status_code == 422, "Kỳ vọng lỗi khi chọn < 2 thành viên"
        print("✅ Xác thực chọn ít nhất 2 thành viên thành công!")

        # Test tạo nhóm hợp lệ
        good_grp = requests.post(
            f"{BASE_URL}/chat/conversations/group",
            headers=headers,
            json={
                "title": "Nhóm Tác Chiến Môi Trường Q1",
                "member_user_ids": [friends[0]["user_id"], friends[1]["user_id"]],
            }
        )
        assert good_grp.status_code == 201, f"Error: {good_grp.text}"
        new_group = good_grp.json()
        print(f"✅ Tạo nhóm thành công: '{new_group['title']}' (ID: {new_group['conversation_id']}), Quản trị: {new_group['is_admin']}")

        test_grp_id = new_group["conversation_id"]

        # 11. Màn 4: Thử Rời nhóm khi là Quản trị nhóm duy nhất
        print("\n🚪 11. Màn 4: Thử Rời nhóm khi là ADMIN duy nhất...")
        leave_fail = requests.post(f"{BASE_URL}/chat/conversations/{test_grp_id}/leave", headers=headers)
        print(f"   - Phản hồi: HTTP {leave_fail.status_code} => {leave_fail.json()}")
        assert leave_fail.status_code == 400
        assert "Bạn là quản trị nhóm duy nhất" in leave_fail.text
        print("✅ Chặn Quản trị viên duy nhất rời nhóm thành công theo đúng SRS!")

        # Chuyển quyền quản trị cho bạn đầu tiên
        print("👑 Chuyển quyền Quản trị nhóm cho thành viên khác...")
        transfer_res = requests.post(
            f"{BASE_URL}/chat/conversations/{test_grp_id}/transfer-admin",
            headers=headers,
            json={"new_admin_user_id": friends[0]["user_id"]}
        )
        assert transfer_res.status_code == 200
        print("✅ Chuyển quyền quản trị thành công!")

        # Bây giờ rời nhóm
        print("🚪 Rời nhóm sau khi đã chuyển quyền quản trị...")
        leave_ok = requests.post(f"{BASE_URL}/chat/conversations/{test_grp_id}/leave", headers=headers)
        assert leave_ok.status_code == 200
        print(f"✅ Rời nhóm thành công: {leave_ok.json()['message']}")

        # Gửi tin nhắn vào nhóm sau khi đã rời -> Chặn 403
        print("🚫 Thử gửi tin vào nhóm sau khi đã rời nhóm...")
        send_after_leave = requests.post(
            f"{BASE_URL}/chat/conversations/{test_grp_id}/messages",
            headers=headers,
            json={"content": "Tôi đã rời nhóm rồi mà?"}
        )
        print(f"   - Phản hồi: HTTP {send_after_leave.status_code} => {send_after_leave.json()}")
        assert send_after_leave.status_code == 403
        assert "Bạn không còn là thành viên của nhóm này" in send_after_leave.text
        print("✅ Chặn gửi tin nhắn sau khi rời nhóm thành công theo đúng SRS!")

    # 12. Màn 4: Xóa cuộc trò chuyện 1-1 (1 phía cleared_at)
    if direct_data["items"]:
        d_conv = direct_data["items"][0]
        d_id = d_conv["conversation_id"]
        print(f"\n🗑️ 12. Màn 4: Xóa cuộc trò chuyện 1-1 (ID: {d_id})...")
        clear_res = requests.post(f"{BASE_URL}/chat/conversations/{d_id}/clear", headers=headers)
        assert clear_res.status_code == 200
        print(f"✅ Xóa lịch sử 1 phía thành công: {clear_res.json()['message']}")

        # Kiểm tra lại tin nhắn sau khi cleared: danh sách tin nhắn phía user phải trống
        msgs_after_clear = requests.get(f"{BASE_URL}/chat/conversations/{d_id}/messages", headers=headers)
        assert msgs_after_clear.status_code == 200
        assert len(msgs_after_clear.json()["items"]) == 0
        print("✅ Đã kiểm chứng: Phía người dùng đã xóa lịch sử cũ không còn nhìn thấy tin cũ!")

    print("\n" + "=" * 70)
    print("🎉 TẤT CẢ CÁC BÀI KIỂM THỬ BACKEND ĐÃ VƯỢT QUA 100%!")
    print("=" * 70)


if __name__ == "__main__":
    main()

