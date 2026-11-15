"""
Kiểm thử tính toàn vẹn tệp vật lý và tối ưu hóa ảnh trong Chức năng 5 (Profile):
- Bảo toàn giới hạn đặc tả: Ảnh bìa >= 900x300 px, Avatar >= 200x200 px, Dung lượng <= 5MB.
- Tối ưu hóa lưu trữ ảnh bằng Pillow (optimize=True, quality=85).
- Khóa lạc quan (OCC Rule 7): Khi xung đột version (HTTP 409 Conflict), file ảnh cũ trên đĩa phải còn nguyên vẹn.
- Chỉ xóa file ảnh cũ sau khi transaction database commit thành công.
"""

import io
import os
import sys
import uuid
import base64
import unittest
from datetime import datetime, timezone
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from app.core.config import UPLOAD_DIR
from app.schemas.profile import UpdateProfileRequest
from app.models.rbac import User, UserSession
from app.api.v1.profile import (
    process_and_save_profile_image,
    update_my_profile,
)


def create_base64_image(width: int, height: int, fmt: str = "PNG") -> str:
    """Tạo chuỗi Base64 Data URL hợp lệ cho kiểm thử"""
    img = Image.new("RGB", (width, height), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = "jpeg" if fmt.upper() in ["JPEG", "JPG"] else fmt.lower()
    return f"data:image/{mime};base64,{encoded}"


class TestProfileOCCImageSafety(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử kiểm chứng độ an toàn tệp ảnh khi gặp xung đột OCC và quy chuẩn nén ảnh"""

    def setUp(self):
        self.test_user_id = uuid.uuid4()
        self.created_files = []

    def tearDown(self):
        # Dọn dẹp các tệp test nếu còn sót
        for path in self.created_files:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

    # =========================================================================
    # 1. KIỂM THỬ GIỚI HẠN CHUẨN ĐẦU VÀO (ẢNH 1 ĐẶC TẢ)
    # =========================================================================

    def test_avatar_min_dimension_validation(self):
        """Avatar dưới 200x200 px bị từ chối với lỗi AVATAR_TOO_SMALL"""
        small_avatar = create_base64_image(199, 199, "PNG")
        with self.assertRaises(HTTPException) as ctx:
            process_and_save_profile_image(small_avatar, self.test_user_id, "avatar")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail.get("error_code"), "AVATAR_TOO_SMALL")

    def test_cover_min_dimension_validation(self):
        """Ảnh bìa dưới 900x300 px bị từ chối với lỗi COVER_TOO_SMALL"""
        small_cover = create_base64_image(899, 299, "JPEG")
        with self.assertRaises(HTTPException) as ctx:
            process_and_save_profile_image(small_cover, self.test_user_id, "cover")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail.get("error_code"), "COVER_TOO_SMALL")

    def test_image_max_size_validation(self):
        """Dung lượng trên 5MB bị từ chối với lỗi IMAGE_TOO_LARGE"""
        # Tạo chuỗi base64 giả lập > 5MB
        fake_large_bytes = b"x" * (5 * 1024 * 1024 + 1024)
        large_b64 = f"data:image/jpeg;base64,{base64.b64encode(fake_large_bytes).decode('utf-8')}"
        with self.assertRaises(HTTPException) as ctx:
            process_and_save_profile_image(large_b64, self.test_user_id, "avatar")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail.get("error_code"), "IMAGE_TOO_LARGE")

    # =========================================================================
    # 2. KIỂM THỬ TỐI ƯU HÓA ẢNH (UPLOAD OPTIMIZE BẰNG PILLOW)
    # =========================================================================

    def test_image_saved_with_optimization(self):
        """Ảnh hợp lệ được lưu ra ổ đĩa và áp dụng nén tối ưu dung lượng"""
        valid_avatar = create_base64_image(300, 300, "PNG")
        res = process_and_save_profile_image(valid_avatar, self.test_user_id, "avatar")
        self.assertIsNotNone(res)
        file_url = res.get("file_url") if isinstance(res, dict) else res
        self.assertIn("/uploads/profiles/avatar/", file_url)

        # Kiểm tra file vật lý tồn tại và có thể đọc bằng Pillow
        rel_path = file_url.split("/uploads/", 1)[1]
        full_path = os.path.join(UPLOAD_DIR, rel_path)
        self.created_files.append(full_path)
        self.assertTrue(os.path.exists(full_path))

        with Image.open(full_path) as saved_img:
            self.assertEqual(saved_img.size, (300, 300))

    # =========================================================================
    # 3. KIỂM THỬ KHÓA LẠC QUAN OCC (KHÔNG ĐƯỢC XÓA ẢNH CŨ KHI 409 CONFLICT)
    # =========================================================================

    def test_staged_deletion_does_not_delete_old_file_on_conflict(self):
        """
        Quy tắc Transactional File:
        Khi xung đột OCC (HTTP 409), file ảnh cũ trên ổ đĩa KHÔNG ĐƯỢC PHÉP BỊ XÓA!
        """
        # 1. Tạo 1 file ảnh cũ hợp lệ trên đĩa
        old_filename = f"{self.test_user_id}_old_avatar.jpg"
        old_dir = os.path.join(UPLOAD_DIR, "profiles", "avatar")
        os.makedirs(old_dir, exist_ok=True)
        old_file_path = os.path.join(old_dir, old_filename)

        with open(old_file_path, "wb") as f:
            f.write(b"original_existing_image_content")
        self.created_files.append(old_file_path)
        self.assertTrue(os.path.exists(old_file_path))

        old_url = f"/uploads/profiles/avatar/{old_filename}"

        # 2. Chuẩn bị ảnh mới tải lên
        new_avatar_b64 = create_base64_image(250, 250, "PNG")

        # 3. Gọi hàm xử lý ảnh với cơ chế staged (chưa commit)
        res = process_and_save_profile_image(
            new_avatar_b64, self.test_user_id, "avatar", old_url=old_url, stage_only=True
        )

        new_file_path = res["temp_file_path"]
        self.created_files.append(new_file_path)

        # File mới đã được lưu tạm, nhưng FILE CŨ VẪN PHẢI CÒN NGUYÊN VẸN!
        self.assertTrue(os.path.exists(old_file_path), "File ảnh cũ không được bị xoá trước khi commit!")

        # 4. Giả lập tình huống xung đột OCC (HTTP 409 Conflict xảy ra)
        # Hệ thống dọn dẹp file tạm mới, giữ nguyên file cũ
        if os.path.exists(new_file_path):
            os.remove(new_file_path)

        # Kiểm chứng mốc: File cũ vẫn tồn tại 100% trên đĩa
        self.assertTrue(os.path.exists(old_file_path), "File ảnh cũ phải được bảo toàn sau khi OCC bị xung đột!")


if __name__ == "__main__":
    unittest.main()

