# -*- coding: utf-8 -*-
import os
import shutil

source_dir = r"c:\wamp64\www\Group-j_GreenSpot\extracted_images"
target_dir = r"c:\wamp64\www\Group-j_GreenSpot\docs\images\tu"
os.makedirs(target_dir, exist_ok=True)

tu_images_mapping = {
    "hinh_4_13.png": "image67.png", # Màn hình 37: Cơ chế tích lũy Điểm thưởng Công dân Xanh
    "hinh_4_14.png": "image6.png",  # Màn hình 38: Xem số dư ví điểm và Lịch sử biến động điểm xanh
    "hinh_4_15.png": "image47.png", # Màn hình 39: Danh mục quà tặng xanh và Vật phẩm quy đổi
    "hinh_4_16.png": "image33.png", # Màn hình 40: Thực hiện đổi điểm lấy quà tặng / Voucher
    "hinh_4_17.png": "image48.png", # Màn hình 41: Quản lý danh sách quà tặng cá nhân đã đổi
    "hinh_4_18.png": "image12.png", # Màn hình 42: Bảng xếp hạng vinh danh Top Công dân Xanh
    "hinh_4_19.png": "image54.png", # Màn hình 43: Xem danh sách các Chiến dịch ra quân dọn rác
    "hinh_4_22.png": "image52.png", # Màn hình 46: Đánh giá mức độ hài lòng (1-5 sao) sau khi dọn sạch
    "hinh_4_23.png": "image62.png", # Màn hình 47: Gửi ý kiến đóng góp và Sáng kiến bảo vệ môi trường
    "hinh_4_24.png": "image3.png",  # Màn hình 48: Cẩm nang hướng dẫn phân loại rác và Sống xanh
}

for target_name, src_name in tu_images_mapping.items():
    src_path = os.path.join(source_dir, src_name)
    dst_path = os.path.join(target_dir, target_name)
    if os.path.exists(src_path):
        shutil.copy2(src_path, dst_path)
        print(f"Copied {src_name} -> {target_name}")
    else:
        print(f"Source not found: {src_path}")

print("Done copying available images for Tu!")
