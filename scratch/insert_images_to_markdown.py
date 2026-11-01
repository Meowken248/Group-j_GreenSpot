# -*- coding: utf-8 -*-
import os

md_path = r"c:\wamp64\www\Group-j_GreenSpot\DANH_SACH_CHUC_NANG_DU_AN_GREENSPOT.md"

with open(md_path, "r", encoding="utf-8") as f:
    content = f.read()

images_data = [
    {
        "func": "Chức năng 25",
        "img_num": "4.25",
        "file": "docs/images/quan/hinh_4_25.png",
        "title": "Giao diện phác thảo Cổng xác thực tập trung đa nền tảng và Quản lý phiên JWT an toàn",
        "anchor": "*Bảng 1: Đặc tả thành phần giao diện chức năng 25"
    },
    {
        "func": "Chức năng 26",
        "img_num": "4.26",
        "file": "docs/images/quan/hinh_4_26.png",
        "title": "Giao diện phác thảo Quản trị người dùng và Ma trận phân quyền động RBAC đa cấp độ",
        "anchor": "*Bảng 3: Đặc tả thành phần giao diện chức năng 26"
    },
    {
        "func": "Chức năng 27",
        "img_num": "4.27",
        "file": "docs/images/quan/hinh_4_27.png",
        "title": "Giao diện phác thảo Nhật ký kiểm toán an ninh Audit Log và Giám sát truy vết biến động dữ liệu",
        "anchor": "*Bảng 5: Đặc tả thành phần giao diện chức năng 27"
    },
    {
        "func": "Chức năng 28",
        "img_num": "4.28",
        "file": "docs/images/quan/hinh_4_28.png",
        "title": "Giao diện phác thảo Trung tâm Biên tập và Phát hành Bản tin Cảnh báo Ô nhiễm Môi trường Khẩn cấp",
        "anchor": "*Bảng 7: Đặc tả thành phần giao diện chức năng 28"
    },
    {
        "func": "Chức năng 29",
        "img_num": "4.29",
        "file": "docs/images/quan/hinh_4_29.png",
        "title": "Giao diện phác thảo Điều phối Thông báo Đẩy (Push Notification) Cảnh báo Ô nhiễm theo Thời gian thực",
        "anchor": "*Bảng 9: Đặc tả thành phần giao diện chức năng 29"
    },
    {
        "func": "Chức năng 30",
        "img_num": "4.30",
        "file": "docs/images/quan/hinh_4_30.png",
        "title": "Giao diện phác thảo Cổng Tra cứu Công khai Tiến độ và Lịch sử Xử lý Sự cố Dành cho Người Dân",
        "anchor": "*Bảng 11: Đặc tả thành phần giao diện chức năng 30"
    },
    {
        "func": "Chức năng 31",
        "img_num": "4.31",
        "file": "docs/images/quan/hinh_4_31.png",
        "title": "Giao diện phác thảo Bản đồ Giám sát Hiện trạng Điểm Cảnh báo Ô nhiễm Trực quan cho Cộng đồng",
        "anchor": "*Bảng 13: Đặc tả thành phần giao diện chức năng 31"
    },
    {
        "func": "Chức năng 32",
        "img_num": "4.32",
        "file": "docs/images/quan/hinh_4_32.png",
        "title": "Giao diện phác thảo Cơ chế Đăng ký Nhận Tin Cảnh báo Cá nhân hóa theo Khu Vực Cư Trú",
        "anchor": "*Bảng 15: Đặc tả thành phần giao diện chức năng 32"
    },
    {
        "func": "Chức năng 33",
        "img_num": "4.33",
        "file": "docs/images/quan/hinh_4_33.png",
        "title": "Giao diện phác thảo Bảng Tổng quan Chỉ số Hiện trạng Môi trường Đô thị Công cộng (Public Environmental Dashboard)",
        "anchor": "*Bảng 17: Đặc tả thành phần giao diện chức năng 33"
    },
    {
        "func": "Chức năng 34",
        "img_num": "4.34",
        "file": "docs/images/quan/hinh_4_34.png",
        "title": "Giao diện phác thảo Quản trị Ngưỡng Kích hoạt Cảnh báo và Phân loại Mức độ Nghiêm trọng Sự cố",
        "anchor": "*Bảng 19: Đặc tả thành phần giao diện chức năng 34"
    },
    {
        "func": "Chức năng 35",
        "img_num": "4.35",
        "file": "docs/images/quan/hinh_4_35.png",
        "title": "Giao diện phác thảo Kênh Tiếp nhận Tín hiệu Cứu nạn Môi trường Khẩn cấp (SOS Environmental Alert Channel)",
        "anchor": "*Bảng 21: Đặc tả thành phần giao diện chức năng 35"
    },
    {
        "func": "Chức năng 36",
        "img_num": "4.36",
        "file": "docs/images/quan/hinh_4_36.png",
        "title": "Giao diện phác thảo Trung tâm Kết xuất Bản tin Báo cáo Hiện trạng Môi trường Công khai (PDF/Excel)",
        "anchor": "*Bảng 23: Đặc tả thành phần giao diện chức năng 36"
    }
]

for item in images_data:
    anchor = item["anchor"]
    if anchor not in content:
        print(f"Error: Anchor not found for {item['func']}: {anchor}")
        continue
    
    img_markdown = f"\n![Hình {item['img_num']}: {item['title']}]({item['file']})\n*Hình {item['img_num']}: {item['title']}*\n\n"
    content = content.replace(anchor, img_markdown + anchor)
    print(f"Inserted image for function {item['img_num']}")

with open(md_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Finished inserting all images into markdown!")
