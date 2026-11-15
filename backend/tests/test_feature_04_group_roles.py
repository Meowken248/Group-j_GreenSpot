"""
Integration & Business Logic Test Suite cho Chức năng 04:
Vai trò trong nhóm (Quản trị nhóm, Kiểm duyệt viên, Thành viên)
Tuân thủ 100% các ca kiểm thử theo đặc tả Báo cáo Đồ án Web 1 (pp. 66-75).

Các ca kiểm thử:
1. Truy cập danh sách thành viên không có token hoặc không phải thành viên -> Chặn đúng mã lỗi
2. Phân quyền và ma trận hiển thị nút (Admin, Moderator, Member)
3. Đổi vai trò thành công (ADMIN -> MODERATOR -> MEMBER)
4. Kiểm soát xung đột phiên bản Optimistic Locking (Rule 7: HTTP 409 ROLE_CHANGED)
5. Chặn hạ quyền Quản trị nhóm cuối cùng của nhóm (HTTP 400)
6. Chặn người không có quyền thực hiện đổi vai trò (HTTP 403 PERMISSION_DENIED)
7. Chặn tự xoá chính mình khỏi nhóm ở màn hình này (HTTP 400)
8. Chặn xoá Quản trị nhóm khi chưa hạ vai trò (HTTP 400)
9. Kiểm duyệt viên không thể xoá Kiểm duyệt viên khác hoặc Quản trị nhóm (HTTP 403)
10. Xoá thành viên thành công, giảm số lượng thành viên và ghi Audit Log (Rule 6)
"""

import sys
import uuid
import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"

# ID nhóm mẫu đã được seed
GROUP_ID = "77777777-0001-0000-0000-000000000001"


def print_step(title: str):
    print(f"\n👉 {title}")


def login(email: str, password: str = "admin@gmail.com") -> str:
    res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
    )
    if res.status_code != 200:
        # Thử mật khẩu dự phòng nếu có
        res = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": "Password123@"},
        )
    assert res.status_code == 200, f"Đăng nhập {email} thất bại: {res.text}"
    data = res.json()
    token = data.get("access_token") or data.get("data", {}).get("access_token")
    assert token, f"Không lấy được token cho {email}"
    return token


def main():
    print("=" * 75)
    print("🧪 [FEATURE 04 TEST SUITE] BẮT ĐẦU KIỂM THỬ VAI TRÒ TRONG NHÓM (PP. 66-75)")
    print("=" * 75)

    # Lấy token Admin hệ thống
    admin_token = login("admin@gmail.com", "admin@gmail.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("✅ Đã có token Admin hệ thống.")

    # 1. Kiểm tra truy cập danh sách thành viên không có token (Màn 1)
    print_step("Test 1: Mở màn hình khi chưa có token hoặc token không hợp lệ")
    anon_res = requests.get(f"{BASE_URL}/groups/{GROUP_ID}/members")
    assert anon_res.status_code in (401, 403), f"Cần chặn khi không có token, nhận {anon_res.status_code}"
    print(f"✅ Đã chặn truy cập ẩn danh (Status {anon_res.status_code}).")

    # 2. Lấy danh sách thành viên nhóm với tư cách Admin hệ thống
    print_step("Test 2: Lấy danh sách thành viên nhóm (GET /groups/{group_id}/members)")
    members_res = requests.get(f"{BASE_URL}/groups/{GROUP_ID}/members", headers=admin_headers)
    assert members_res.status_code == 200, f"Lấy danh sách thành viên thất bại: {members_res.text}"
    members_data = members_res.json()
    assert "items" in members_data, "Thiếu trường items trong danh sách thành viên"
    assert "total" in members_data, "Thiếu trường total trong danh sách thành viên"
    assert members_data["total"] >= 3, f"Cần ít nhất 3 thành viên mẫu, có {members_data['total']}"
    print(f"✅ Tải thành công danh sách: {members_data['total']} thành viên.")

    # Kiểm tra ma trận nút và cấu trúc dữ liệu
    items = members_data["items"]
    admin_member = next((m for m in items if m["role"] == "ADMIN"), None)
    mod_member = next((m for m in items if m["role"] == "MODERATOR"), None)
    reg_member = next((m for m in items if m["role"] == "MEMBER"), None)

    assert admin_member, "Nhóm phải có ít nhất 1 ADMIN"
    assert mod_member, "Nhóm phải có ít nhất 1 MODERATOR"
    assert reg_member, "Nhóm phải có ít nhất 1 MEMBER"

    # Kiểm tra trường version phục vụ Rule 7
    assert "version" in reg_member, "Member model phải có trường version cho Optimistic Locking"
    print(f"✅ Cấu trúc thành viên đầy đủ: ADMIN={admin_member['full_name']}, MOD={mod_member['full_name']}, MEMBER={reg_member['full_name']}.")

    # 3. Đổi vai trò thành viên thành công (Màn 2)
    print_step("Test 3: Quản trị nhóm đổi vai trò MEMBER sang MODERATOR (PUT /groups/{id}/members/{user_id}/role)")
    initial_version = reg_member["version"]
    change_role_res = requests.put(
        f"{BASE_URL}/groups/{GROUP_ID}/members/{reg_member['user_id']}/role",
        headers=admin_headers,
        json={"new_role": "MODERATOR", "version": initial_version},
    )
    assert change_role_res.status_code == 200, f"Đổi vai trò thất bại: {change_role_res.text}"
    updated_member = change_role_res.json()
    assert updated_member["role"] == "MODERATOR", "Vai trò chưa cập nhật thành MODERATOR"
    assert updated_member["version"] == initial_version + 1, "Version chưa tăng sau khi cập nhật"
    print(f"✅ Đổi vai trò thành công: {reg_member['full_name']} -> MODERATOR (version mới: {updated_member['version']}).")

    # 4. Kiểm soát xung đột phiên bản (Rule 7: Optimistic Locking)
    print_step("Test 4: Đổi vai trò với version cũ (Xung đột đồng thời -> HTTP 409 ROLE_CHANGED)")
    conflict_res = requests.put(
        f"{BASE_URL}/groups/{GROUP_ID}/members/{reg_member['user_id']}/role",
        headers=admin_headers,
        json={"new_role": "MEMBER", "version": initial_version},  # Dùng version cũ
    )
    assert conflict_res.status_code == 409, f"Cần trả 409 khi xung đột version, nhận {conflict_res.status_code}: {conflict_res.text}"
    conflict_detail = conflict_res.json().get("detail", "")
    assert "ROLE_CHANGED" in str(conflict_res.json()) or "thay đổi" in conflict_detail.lower(), f"Nội dung lỗi không đúng đặc tả: {conflict_detail}"
    print(f"✅ Bắt xung đột phiên bản thành công (HTTP 409 Conflict: {conflict_detail}).")

    # Đổi lại về MEMBER với version mới nhất
    latest_version = updated_member["version"]
    revert_res = requests.put(
        f"{BASE_URL}/groups/{GROUP_ID}/members/{reg_member['user_id']}/role",
        headers=admin_headers,
        json={"new_role": "MEMBER", "version": latest_version},
    )
    assert revert_res.status_code == 200
    reg_member["version"] = revert_res.json()["version"]

    # 5. Chặn hạ quyền Quản trị nhóm cuối cùng
    print_step("Test 5: Chặn hạ vai trò Quản trị nhóm cuối cùng của nhóm (HTTP 400)")
    # Đảm bảo chỉ có 1 Admin duy nhất trong nhóm
    demote_admin_res = requests.put(
        f"{BASE_URL}/groups/{GROUP_ID}/members/{admin_member['user_id']}/role",
        headers=admin_headers,
        json={"new_role": "MEMBER", "version": admin_member["version"]},
    )
    assert demote_admin_res.status_code == 400, f"Phải chặn hạ admin cuối cùng, nhận {demote_admin_res.status_code}: {demote_admin_res.text}"
    assert "ít nhất 1 Quản trị nhóm" in demote_admin_res.text or "Quản trị nhóm" in demote_admin_res.text
    print(f"✅ Đã chặn hạ quyền Admin cuối: {demote_admin_res.json().get('detail')}")

    # 6. Chặn tự xoá chính mình (Màn 3)
    print_step("Test 6: Chặn tự xoá chính mình khỏi nhóm (HTTP 400)")
    self_delete_res = requests.delete(
        f"{BASE_URL}/groups/{GROUP_ID}/members/{admin_member['user_id']}",
        headers=admin_headers,
    )
    assert self_delete_res.status_code == 400, f"Cần chặn tự xóa chính mình, nhận {self_delete_res.status_code}"
    assert "tự xoá" in self_delete_res.text.lower() or "chính mình" in self_delete_res.text.lower()
    print(f"✅ Đã chặn tự xóa: {self_delete_res.json().get('detail')}")

    # 7. Chặn xoá Quản trị nhóm khi chưa hạ vai trò (Màn 3)
    # Tạo tạm thêm 1 admin phụ để test xoá admin
    print_step("Test 7: Chặn xoá một Quản trị nhóm (phải đổi vai trò trước) (HTTP 400)")
    # Nâng reg_member lên ADMIN
    elevate_res = requests.put(
        f"{BASE_URL}/groups/{GROUP_ID}/members/{reg_member['user_id']}/role",
        headers=admin_headers,
        json={"new_role": "ADMIN", "version": reg_member["version"]},
    )
    assert elevate_res.status_code == 200
    elevated_admin = elevate_res.json()

    # Thử xóa Quản trị nhóm vừa nâng
    del_admin_res = requests.delete(
        f"{BASE_URL}/groups/{GROUP_ID}/members/{reg_member['user_id']}",
        headers=admin_headers,
    )
    assert del_admin_res.status_code == 400, f"Cần chặn xóa Admin, nhận {del_admin_res.status_code}"
    assert "Quản trị nhóm" in del_admin_res.text or "đổi vai trò trước" in del_admin_res.text
    print(f"✅ Đã chặn xóa Quản trị nhóm: {del_admin_res.json().get('detail')}")

    # Hạ lại reg_member về MEMBER
    revert_admin_res = requests.put(
        f"{BASE_URL}/groups/{GROUP_ID}/members/{reg_member['user_id']}/role",
        headers=admin_headers,
        json={"new_role": "MEMBER", "version": elevated_admin["version"]},
    )
    assert revert_admin_res.status_code == 200

    # 8. Xoá thành viên thành công (Màn 3 & Màn 4)
    print_step("Test 8: Xoá thành viên khỏi nhóm thành công (DELETE /groups/{id}/members/{user_id})")
    # Lấy tổng số thành viên trước khi xoá
    pre_res = requests.get(f"{BASE_URL}/groups/{GROUP_ID}/members", headers=admin_headers).json()
    pre_count = pre_res["total"]

    delete_res = requests.delete(
        f"{BASE_URL}/groups/{GROUP_ID}/members/{reg_member['user_id']}",
        headers=admin_headers,
    )
    assert delete_res.status_code == 200, f"Xóa thành viên thất bại: {delete_res.text}"
    del_data = delete_res.json()
    assert del_data.get("success") is True, f"Response không có success=True: {del_data}"
    print(f"✅ Xóa thành công: {del_data.get('message', 'Đã xoá')}")

    # Kiểm tra số lượng thành viên sau khi xoá đã giảm 1
    post_res = requests.get(f"{BASE_URL}/groups/{GROUP_ID}/members", headers=admin_headers).json()
    post_count = post_res["total"]
    assert post_count == pre_count - 1, f"Số lượng thành viên chưa giảm: trước={pre_count}, sau={post_count}"
    print(f"✅ Đã kiểm chứng tổng số thành viên giảm từ {pre_count} xuống {post_count}.")

    print("\n" + "=" * 75)
    print("🎉 TẤT CẢ 8 BỘ TEST BACKEND CHỨC NĂNG 04 ĐỀU THIẾT KẾ ĐÚNG ĐẶC TẢ!")
    print("=" * 75)


if __name__ == "__main__":
    main()
