"""
Integration & Business Logic Test Suite cho Chức năng 16:
Tạo nhóm theo quận, theo phường hoặc theo chủ đề (Community Groups)
Tuân thủ 100% các ca kiểm thử theo đặc tả Báo cáo Đồ án Web 1 (pp. 137-141).
"""

import sys
import uuid
import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"


def print_step(title: str):
    print(f"\n👉 {title}")


def main():
    print("=" * 70)
    print("🧪 [FEATURE 16 INTEGRATION TEST] BẮT ĐẦU KIỂM THỬ CHỨC NĂNG TẠO NHÓM CỘNG ĐỒNG")
    print("=" * 70)

    # 1. Đăng nhập citizen@ecoreport.gov.vn
    print_step("1. Đăng nhập citizen@ecoreport.gov.vn để lấy JWT access token")
    login_res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "citizen@ecoreport.gov.vn", "password": "Password123@"},
    )
    if login_res.status_code != 200:
        # Thử tài khoản admin@gmail.com
        login_res = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "admin@gmail.com", "password": "Password123@"},
        )
    assert login_res.status_code == 200, f"Đăng nhập thất bại: {login_res.text}"
    res_data = login_res.json()
    token = res_data.get("access_token") or res_data.get("data", {}).get("access_token")
    assert token, f"Không tìm thấy access_token trong response: {res_data}"
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Đăng nhập thành công! Đã lấy token.")

    # 2. Metadata đơn vị hành chính và chủ đề
    print_step("2. Lấy metadata tỉnh/thành phố, quận/huyện, phường/xã và chủ đề (GET /groups/metadata)")
    meta_res = requests.get(f"{BASE_URL}/groups/metadata")
    assert meta_res.status_code == 200, f"Lấy metadata thất bại: {meta_res.text}"
    meta = meta_res.json()
    assert "Thành phố Hồ Chí Minh" in meta["provinces"], "Thiếu TP.HCM trong danh sách tỉnh thành"
    assert "Thành phố Hà Nội" in meta["provinces"], "Thiếu Hà Nội trong danh sách tỉnh thành"
    assert "Quận Ba Đình" in meta["districts_by_province"]["Thành phố Hà Nội"], "Thiếu Quận Ba Đình trong Hà Nội"
    assert "Quận 1" in meta["districts"], "Thiếu Quận 1 trong danh sách quận"
    assert "Phân loại rác" in meta["theme_topics"], "Thiếu chủ đề Phân loại rác"
    print(f"✅ Metadata hợp lệ: {len(meta['provinces'])} tỉnh/thành phố, {len(meta['districts'])} quận/huyện TP.HCM, {len(meta['theme_topics'])} chủ đề.")

    # 3. Lấy danh sách nhóm của tôi (Màn 1)
    print_step("3. Lấy danh sách Nhóm của tôi (GET /groups/my-groups)")
    my_res = requests.get(f"{BASE_URL}/groups/my-groups", headers=headers)
    assert my_res.status_code == 200, f"Lấy my-groups thất bại: {my_res.text}"
    my_groups = my_res.json()
    initial_admin_count = my_groups["admin_groups_count"]
    print(f"✅ Lấy thành công: {my_groups['total']} nhóm, số nhóm làm Admin: {initial_admin_count}/5")

    # 4. Khám phá nhóm theo bộ lọc (GET /groups/explore)
    print_step("4. Khám phá nhóm theo bộ lọc Tỉnh/Thành phố & Quận 1 (GET /groups/explore)")
    exp_res = requests.get(f"{BASE_URL}/groups/explore?province=Thành phố Hồ Chí Minh&district=Quận 1", headers=headers)
    assert exp_res.status_code == 200, f"Explore thất bại: {exp_res.text}"
    exp_data = exp_res.json()
    assert exp_data["total"] >= 1, "Cần có ít nhất 1 nhóm mẫu Quận 1 từ seeder"
    assert exp_data["items"][0]["province"] == "Thành phố Hồ Chí Minh"
    print(f"✅ Khám phá thành công: Tìm thấy {exp_data['total']} nhóm tại Quận 1, TP. Hồ Chí Minh.")

    # 5. Validation: Để trống tên nhóm -> Bị chặn
    print_step("5. Kiểm tra để trống tên nhóm -> Phải báo lỗi validation")
    err_res1 = requests.post(
        f"{BASE_URL}/groups",
        json={"name": "   ", "group_type": "DISTRICT", "district": "Quận 1"},
        headers=headers,
    )
    assert err_res1.status_code in (400, 422), f"Kỳ vọng 400/422 nhưng nhận: {err_res1.status_code}"
    print("✅ Chặn tên nhóm để trống thành công!")

    # 6. Validation: Tên nhóm vượt quá 50 ký tự -> Bị chặn
    print_step("6. Kiểm tra tên nhóm vượt quá 50 ký tự -> Phải báo lỗi validation")
    long_name = "Nhóm Hành Động Vì Môi Trường Đô Thị Xanh Sạch Đẹp Thành Phố Hồ Chí Minh 2026"
    err_res2 = requests.post(
        f"{BASE_URL}/groups",
        json={"name": long_name, "group_type": "DISTRICT", "district": "Quận 1"},
        headers=headers,
    )
    assert err_res2.status_code in (400, 422), f"Kỳ vọng 400/422 nhưng nhận: {err_res2.status_code}"
    print("✅ Chặn tên nhóm > 50 ký tự thành công!")

    # 7. Validation: Mô tả vượt quá 300 ký tự -> Bị chặn
    print_step("7. Kiểm tra mô tả vượt quá 300 ký tự -> Phải báo lỗi validation")
    long_desc = "Mô tả " * 60  # > 300 ký tự
    err_res3 = requests.post(
        f"{BASE_URL}/groups",
        json={"name": "Nhóm Thử Nghiệm", "description": long_desc, "group_type": "THEME", "theme_topic": "Cây xanh"},
        headers=headers,
    )
    assert err_res3.status_code in (400, 422), f"Kỳ vọng 400/422 nhưng nhận: {err_res3.status_code}"
    print("✅ Chặn mô tả > 300 ký tự thành công!")

    # 8. Validation: Tên nhóm chứa từ ngữ cấm ("Tên nhóm chứa nội dung không phù hợp")
    print_step("8. Kiểm tra tên nhóm chứa từ ngữ bị cấm -> Phải báo 'Tên nhóm chứa nội dung không phù hợp'")
    err_res4 = requests.post(
        f"{BASE_URL}/groups",
        json={"name": "Nhóm lừa đảo người dân", "group_type": "THEME", "theme_topic": "Cây xanh"},
        headers=headers,
    )
    assert err_res4.status_code in (400, 422), f"Kỳ vọng 400/422 nhưng nhận: {err_res4.status_code}"
    print("✅ Chặn tên nhóm chứa từ ngữ cấm thành công!")

    # 9. Validation: Thiếu phạm vi khi chọn theo quận / phường / chủ đề
    print_step("9. Kiểm tra thiếu phạm vi hoạt động -> Phải báo lỗi 'Vui lòng chọn phạm vi cho nhóm'")
    err_res5 = requests.post(
        f"{BASE_URL}/groups",
        json={"name": "Nhóm Không Phạm Vi", "group_type": "DISTRICT", "district": ""},
        headers=headers,
    )
    assert err_res5.status_code == 400, f"Kỳ vọng 400 nhưng nhận: {err_res5.status_code}"
    assert "Vui lòng chọn phạm vi cho nhóm" in err_res5.json()["detail"]
    print("✅ Chặn thiếu phạm vi thành công!")

    # 10. Tạo nhóm thành công (Theo chủ đề)
    unique_suffix = uuid.uuid4().hex[:6]
    created_group_name = f"Chiến Binh Xanh {unique_suffix}"
    print_step(f"10. Tạo nhóm mới hợp lệ: '{created_group_name}'")
    create_res = requests.post(
        f"{BASE_URL}/groups",
        json={
            "name": created_group_name,
            "description": "Nhóm thử nghiệm kiểm thử tự động quy chuẩn doanh nghiệp",
            "group_type": "THEME",
            "theme_topic": "Tái chế & Zero-waste",
            "privacy": "PUBLIC",
        },
        headers=headers,
    )
    assert create_res.status_code == 201, f"Tạo nhóm thất bại: {create_res.text}"
    created_group = create_res.json()
    new_group_id = created_group["group_id"]
    assert created_group["name"] == created_group_name
    assert created_group["is_member"] is True
    assert created_group["my_role"] == "ADMIN", "Người tạo phải tự động là Quản trị nhóm (ADMIN)"
    print(f"✅ Tạo nhóm thành công! ID: {new_group_id}, Role: {created_group['my_role']}")

    # 11. Kiểm tra trùng tên nhóm trong cùng phạm vi
    print_step("11. Thử tạo lại nhóm cùng tên trong cùng chủ đề -> Phải báo 'Tên nhóm đã tồn tại'")
    dup_res = requests.post(
        f"{BASE_URL}/groups",
        json={
            "name": created_group_name,
            "description": "Thử tạo trùng",
            "group_type": "THEME",
            "theme_topic": "Tái chế & Zero-waste",
        },
        headers=headers,
    )
    assert dup_res.status_code == 400, f"Kỳ vọng 400 nhưng nhận: {dup_res.status_code}"
    assert "Tên nhóm đã tồn tại" in dup_res.json()["detail"]
    print("✅ Kiểm tra chống trùng tên nhóm thành công!")

    # 12. Chi tiết nhóm (GET /groups/{group_id})
    print_step("12. Xem chi tiết nhóm vừa tạo (GET /groups/{group_id})")
    detail_res = requests.get(f"{BASE_URL}/groups/{new_group_id}", headers=headers)
    assert detail_res.status_code == 200, f"Lấy chi tiết thất bại: {detail_res.text}"
    detail = detail_res.json()
    assert detail["name"] == created_group_name
    print(f"✅ Chi tiết nhóm chính xác: {detail['name']}, Thành viên: {detail['members_count']}")

    # 12b. Tạo nhóm Quận có phân cấp Tỉnh / Thành phố
    hanoi_group_name = f"Sống Xanh Ba Đình {unique_suffix}"
    print_step(f"12b. Tạo nhóm Quận có phân cấp Tỉnh/Thành phố: '{hanoi_group_name}'")
    hanoi_res = requests.post(
        f"{BASE_URL}/groups",
        json={
            "name": hanoi_group_name,
            "description": "Nhóm bảo vệ môi trường quận Ba Đình, Hà Nội",
            "group_type": "DISTRICT",
            "province": "Thành phố Hà Nội",
            "district": "Quận Ba Đình",
            "privacy": "PUBLIC",
        },
        headers=headers,
    )
    assert hanoi_res.status_code == 201, f"Tạo nhóm Hà Nội thất bại: {hanoi_res.text}"
    hanoi_group = hanoi_res.json()
    assert hanoi_group["province"] == "Thành phố Hà Nội"
    assert hanoi_group["district"] == "Quận Ba Đình"
    print(f"✅ Tạo nhóm theo Quận có phân cấp Tỉnh/Thành phố thành công! ID: {hanoi_group['group_id']}")

    # Dọn dẹp nhóm Hà Nội
    requests.post(
        f"{BASE_URL}/groups/{hanoi_group['group_id']}/disband",
        json={"confirmation_name": hanoi_group_name},
        headers=headers,
    )

    # 13. Rời nhóm khi là ADMIN duy nhất -> Bị chặn
    print_step("13. Thử rời nhóm khi là Quản trị nhóm duy nhất -> Phải bị chặn")
    leave_err = requests.post(f"{BASE_URL}/groups/{new_group_id}/leave", headers=headers)
    assert leave_err.status_code == 400, f"Kỳ vọng 400 nhưng nhận: {leave_err.status_code}"
    assert "quản trị nhóm duy nhất" in leave_err.json()["detail"].lower()
    print("✅ Chặn ADMIN duy nhất rời nhóm thành công!")

    # 14. Giải tán nhóm: Nhập sai tên xác nhận -> Bị chặn
    print_step("14. Giải tán nhóm với tên xác nhận sai -> Phải báo 'Tên nhóm không khớp'")
    disband_err = requests.post(
        f"{BASE_URL}/groups/{new_group_id}/disband",
        json={"confirmation_name": "Tên Hoàn Toàn Sai"},
        headers=headers,
    )
    assert disband_err.status_code == 400, f"Kỳ vọng 400 nhưng nhận: {disband_err.status_code}"
    assert "Tên nhóm không khớp" in disband_err.json()["detail"]
    print("✅ Chặn giải tán khi tên không khớp thành công!")

    # 15. Giải tán nhóm thành công
    print_step("15. Giải tán nhóm với tên chính xác 100% -> Thành công")
    disband_ok = requests.post(
        f"{BASE_URL}/groups/{new_group_id}/disband",
        json={"confirmation_name": created_group_name},
        headers=headers,
    )
    assert disband_ok.status_code == 200, f"Giải tán thất bại: {disband_ok.text}"
    assert "Đã giải tán nhóm" in disband_ok.json()["message"]
    print("✅ Giải tán nhóm thành công!")

    # 16. Kiểm tra nhóm sau khi giải tán không còn truy cập được (404)
    print_step("16. Truy cập nhóm đã giải tán -> Phải trả về 404 'Nhóm không còn tồn tại'")
    check_404 = requests.get(f"{BASE_URL}/groups/{new_group_id}", headers=headers)
    assert check_404.status_code == 404, f"Kỳ vọng 404 nhưng nhận: {check_404.status_code}"
    print("✅ Xác nhận nhóm đã giải tán biến mất hoàn toàn khỏi hệ thống!")

    # 17. Lấy danh sách bài viết trong nhóm mẫu (GET /groups/{group_id}/posts)
    print_step("17. Lấy danh sách bài viết trong nhóm mẫu (GET /groups/{group_id}/posts)")
    sample_group_id = "77777777-0001-0000-0000-000000000001"
    posts_res = requests.get(f"{BASE_URL}/groups/{sample_group_id}/posts", headers=headers)
    assert posts_res.status_code == 200, f"Lấy bài viết thất bại: {posts_res.text}"
    posts_data = posts_res.json()
    assert "items" in posts_data
    assert len(posts_data["items"]) >= 1, "Kỳ vọng ít nhất 1 bài viết mẫu trong nhóm"
    print(f"✅ Lấy thành công {len(posts_data['items'])} bài viết trong nhóm mẫu!")

    # 18. Lấy danh sách thành viên trong nhóm mẫu (GET /groups/{group_id}/members)
    print_step("18. Lấy danh sách thành viên trong nhóm mẫu (GET /groups/{group_id}/members)")
    members_res = requests.get(f"{BASE_URL}/groups/{sample_group_id}/members", headers=headers)
    assert members_res.status_code == 200, f"Lấy thành viên thất bại: {members_res.text}"
    members_data = members_res.json()
    assert "items" in members_data
    assert len(members_data["items"]) >= 1
    print(f"✅ Lấy thành công {len(members_data['items'])} thành viên trong nhóm mẫu!")

    # 19. Đăng bài vào nhóm mẫu khi là thành viên (POST /posts)
    print_step("19. Đăng bài viết vào nhóm khi là thành viên (POST /posts)")
    new_post_payload = {
        "content": "Hoạt động dọn rác cuối tuần cùng nhóm sống xanh Quận 1 #CleanUp",
        "group_id": sample_group_id,
        "visibility": "PUBLIC",
    }
    create_post_res = requests.post(f"{BASE_URL}/posts", json=new_post_payload, headers=headers)
    assert create_post_res.status_code == 201, f"Đăng bài vào nhóm thất bại: {create_post_res.text}"
    created_post = create_post_res.json()
    assert created_post.get("group_id") == sample_group_id
    print("✅ Đăng bài vào nhóm thành công!")

    # 20. Đăng bài vào nhóm không tồn tại hoặc chưa tham gia -> Phải bị chặn 403/404
    print_step("20. Đăng bài vào nhóm không tồn tại -> Phải bị chặn 404")
    fake_group_id = "00000000-0000-0000-0000-000000000000"
    fake_post_res = requests.post(
        f"{BASE_URL}/posts",
        json={"content": "Test bài viết nhóm giả", "group_id": fake_group_id},
        headers=headers,
    )
    assert fake_post_res.status_code == 404, f"Kỳ vọng 404 nhưng nhận: {fake_post_res.status_code}"
    print("✅ Chặn đăng bài vào nhóm không tồn tại thành công!")

    print("\n" + "=" * 70)
    print("🎉 TẤT CẢ 20/20 BÀI KIỂM THỬ BACKEND CHO CHỨC NĂNG 16 ĐÃ VƯỢT QUA 100%!")
    print("=" * 70)


if __name__ == "__main__":
    main()
