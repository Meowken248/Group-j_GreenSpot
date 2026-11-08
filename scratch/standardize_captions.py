# -*- coding: utf-8 -*-
import re

md_path = r"c:\wamp64\www\Group-j_GreenSpot\DANH_SACH_CHUC_NANG_DU_AN_GREENSPOT.md"

with open(md_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add academic typography guideline header right after the title
typography_header = """> **QUY CHUẨN ĐỊNH DẠNG HỌC THUẬN & TRÌNH BÀY BÁO CÁO (THESIS STYLE GUIDE)**:
> - **Phông chữ chuẩn (Font Family)**: Times New Roman (áp dụng cho in ấn luận văn) hoặc Segoe UI / Inter (áp dụng cho báo cáo điện tử).
> - **Cỡ chữ phân cấp (Font Sizes)**: Tiêu đề Báo cáo cấp 1 (`#`): **18pt, In Hoa Đậm**; Tiêu đề Mục lớn cấp 2 (`##`): **14pt, In Hoa Đậm**; Tiêu đề Phân hệ cấp 3 (`###`): **13pt, In Đậm**; Tiêu đề Chức năng cấp 4 (`####`): **13pt, In Đậm Nghiêng**; Nội dung văn bản (Body text): **12pt**, Giãn dòng 1.3 - 1.5; Bảng biểu & Chú thích: **11pt**.
> - **Quy tắc In Đậm (Bold)**: Dùng cho từ khóa định danh, mã chức năng, tác nhân chính, nhãn dữ liệu và các mốc thời gian cam kết.
> - **Quy tắc In Nghiêng (Italic)**: Dùng cho thuật ngữ kỹ thuật tiếng Anh trong ngoặc đơn, Chú thích Hình/Bảng, và câu văn bản thông điệp Modal/Thông báo hiển thị.
> - **Quy tắc Inline Code (`...`)**: Dùng cho mã phần tử giao diện (`UI_ID`), mã thông báo lỗi (`ERR_CODE`), tên trường / bảng CSDL và đường dẫn API.
> - **Đánh số Bảng & Hình chuẩn IEEE/ISO**: Hình ảnh được đánh số `*Hình 4.XX: ...*` (đặt dưới hình); Bảng đặc tả được đánh số `*Bảng 4.XX.1: Đặc tả thành phần giao diện...*` và `*Bảng 4.XX.2: Quy tắc kiểm tra và thông báo lỗi...*` (đặt trên bảng), loại bỏ hoàn toàn trùng lặp số hiệu.
"""

# 2. Update table numbering in Section I, II, III, IV
# Check Section I
content = content.replace(
    "## I. BẢNG TỔNG QUAN PHÂN CÔNG 4 THÀNH VIÊN (48 CHỨC NĂNG)\n\n| STT |",
    "## I. BẢNG TỔNG QUAN PHÂN CÔNG 4 THÀNH VIÊN (48 CHỨC NĂNG)\n\n*Bảng 1.1: Bảng tổng quan phân công nhiệm vụ 4 thành viên (48 chức năng nghiệp vụ)*\n| STT |"
)

# Section II
content = content.replace(
    "### Bảng tiến độ Chức năng 13 → 24 (Huỳnh Anh Tú)\n\n| STT |",
    "### Bảng tiến độ Chức năng 13 → 24 (Huỳnh Anh Tú)\n\n*Bảng 2.1: Kế hoạch tiến độ thực hiện phân hệ Cộng đồng Xanh (Huỳnh Anh Tú - Chức năng 13 → 24)*\n| STT |"
)

# Section III
content = content.replace(
    "### Bảng tiến độ Chức năng 25 → 36 (Bùi Nguyễn Minh Quân)\n\n| STT |",
    "### Bảng tiến độ Chức năng 25 → 36 (Bùi Nguyễn Minh Quân)\n\n*Bảng 3.1: Kế hoạch tiến độ thực hiện phân hệ Cổng cảnh báo & Giám sát công khai (Bùi Nguyễn Minh Quân - Chức năng 25 → 36)*\n| STT |"
)

# Section IV
content = content.replace(
    "## IV. BẢNG KIỂM TRA ĐỐI CHIẾU CHÉO (0% TRÙNG LẶP GIỮA CẢ 4 THÀNH VIÊN)\n\n| Tiêu Chí So Sánh |",
    "## IV. BẢNG KIỂM TRA ĐỐI CHIẾU CHÉO (0% TRÙNG LẶP GIỮA CẢ 4 THÀNH VIÊN)\n\n*Bảng 4.1: Bảng ma trận đối chiếu chéo tính độc lập và chống trùng lặp dữ liệu (0% trùng lặp giữa 4 thành viên)*\n| Tiêu Chí So Sánh |"
)

# 3. Standardize Table Captions for Tu's Functions (13 to 24)
# From Bảng 1 .. Bảng 24 -> Bảng 4.13.1 .. Bảng 4.24.2
tu_tables = [
    ("*Bảng 1: Đặc tả thành phần giao diện chức năng 13", "*Bảng 4.13.1: Đặc tả thành phần giao diện chức năng 13"),
    ("*Bảng 2: Quy tắc kiểm tra và thông báo lỗi chức năng 13", "*Bảng 4.13.2: Quy tắc kiểm tra và thông báo lỗi chức năng 13"),
    ("*Bảng 3: Đặc tả thành phần giao diện chức năng 14", "*Bảng 4.14.1: Đặc tả thành phần giao diện chức năng 14"),
    ("*Bảng 4: Quy tắc kiểm tra và thông báo lỗi chức năng 14", "*Bảng 4.14.2: Quy tắc kiểm tra và thông báo lỗi chức năng 14"),
    ("*Bảng 5: Đặc tả thành phần giao diện chức năng 15", "*Bảng 4.15.1: Đặc tả thành phần giao diện chức năng 15"),
    ("*Bảng 6: Quy tắc kiểm tra và thông báo lỗi chức năng 15", "*Bảng 4.15.2: Quy tắc kiểm tra và thông báo lỗi chức năng 15"),
    ("*Bảng 7: Đặc tả thành phần giao diện chức năng 16", "*Bảng 4.16.1: Đặc tả thành phần giao diện chức năng 16"),
    ("*Bảng 8: Quy tắc kiểm tra và thông báo lỗi chức năng 16", "*Bảng 4.16.2: Quy tắc kiểm tra và thông báo lỗi chức năng 16"),
    ("*Bảng 9: Đặc tả thành phần giao diện chức năng 17", "*Bảng 4.17.1: Đặc tả thành phần giao diện chức năng 17"),
    ("*Bảng 10: Quy tắc kiểm tra và thông báo lỗi chức năng 17", "*Bảng 4.17.2: Quy tắc kiểm tra và thông báo lỗi chức năng 17"),
    ("*Bảng 11: Đặc tả thành phần giao diện chức năng 18", "*Bảng 4.18.1: Đặc tả thành phần giao diện chức năng 18"),
    ("*Bảng 12: Quy tắc kiểm tra và thông báo lỗi chức năng 18", "*Bảng 4.18.2: Quy tắc kiểm tra và thông báo lỗi chức năng 18"),
    ("*Bảng 13: Đặc tả thành phần giao diện chức năng 19", "*Bảng 4.19.1: Đặc tả thành phần giao diện chức năng 19"),
    ("*Bảng 14: Quy tắc kiểm tra và thông báo lỗi chức năng 19", "*Bảng 4.19.2: Quy tắc kiểm tra và thông báo lỗi chức năng 19"),
    ("*Bảng 15: Đặc tả thành phần giao diện chức năng 20", "*Bảng 4.20.1: Đặc tả thành phần giao diện chức năng 20"),
    ("*Bảng 16: Quy tắc kiểm tra và thông báo lỗi chức năng 20", "*Bảng 4.20.2: Quy tắc kiểm tra và thông báo lỗi chức năng 20"),
    ("*Bảng 17: Đặc tả thành phần giao diện chức năng 21", "*Bảng 4.21.1: Đặc tả thành phần giao diện chức năng 21"),
    ("*Bảng 18: Quy tắc kiểm tra và thông báo lỗi chức năng 21", "*Bảng 4.21.2: Quy tắc kiểm tra và thông báo lỗi chức năng 21"),
    ("*Bảng 19: Đặc tả thành phần giao diện chức năng 22", "*Bảng 4.22.1: Đặc tả thành phần giao diện chức năng 22"),
    ("*Bảng 20: Quy tắc kiểm tra và thông báo lỗi chức năng 22", "*Bảng 4.22.2: Quy tắc kiểm tra và thông báo lỗi chức năng 22"),
    ("*Bảng 21: Đặc tả thành phần giao diện chức năng 23", "*Bảng 4.23.1: Đặc tả thành phần giao diện chức năng 23"),
    ("*Bảng 22: Quy tắc kiểm tra và thông báo lỗi chức năng 23", "*Bảng 4.23.2: Quy tắc kiểm tra và thông báo lỗi chức năng 23"),
    ("*Bảng 23: Đặc tả thành phần giao diện chức năng 24", "*Bảng 4.24.1: Đặc tả thành phần giao diện chức năng 24"),
    ("*Bảng 24: Quy tắc kiểm tra và thông báo lỗi chức năng 24", "*Bảng 4.24.2: Quy tắc kiểm tra và thông báo lỗi chức năng 24")
]

# We need to replace only in Tu's section first (before Quan's section)
quan_marker = "### 2. Phân hệ Bùi Nguyễn Minh Quân (25 → 36)"
pos_quan = content.find(quan_marker)

tu_part = content[:pos_quan]
quan_part = content[pos_quan:]

for old_cap, new_cap in tu_tables:
    tu_part = tu_part.replace(old_cap, new_cap, 1)

# 4. Standardize Table Captions for Quan's Functions (25 to 36)
quan_tables = [
    ("*Bảng 1: Đặc tả thành phần giao diện chức năng 25", "*Bảng 4.25.1: Đặc tả thành phần giao diện chức năng 25"),
    ("*Bảng 2: Quy tắc kiểm tra và thông báo lỗi chức năng 25", "*Bảng 4.25.2: Quy tắc kiểm tra và thông báo lỗi chức năng 25"),
    ("*Bảng 3: Đặc tả thành phần giao diện chức năng 26", "*Bảng 4.26.1: Đặc tả thành phần giao diện chức năng 26"),
    ("*Bảng 4: Quy tắc kiểm tra và thông báo lỗi chức năng 26", "*Bảng 4.26.2: Quy tắc kiểm tra và thông báo lỗi chức năng 26"),
    ("*Bảng 5: Đặc tả thành phần giao diện chức năng 27", "*Bảng 4.27.1: Đặc tả thành phần giao diện chức năng 27"),
    ("*Bảng 6: Quy tắc kiểm tra và thông báo lỗi chức năng 27", "*Bảng 4.27.2: Quy tắc kiểm tra và thông báo lỗi chức năng 27"),
    ("*Bảng 7: Đặc tả thành phần giao diện chức năng 28", "*Bảng 4.28.1: Đặc tả thành phần giao diện chức năng 28"),
    ("*Bảng 8: Quy tắc kiểm tra và thông báo lỗi chức năng 28", "*Bảng 4.28.2: Quy tắc kiểm tra và thông báo lỗi chức năng 28"),
    ("*Bảng 9: Đặc tả thành phần giao diện chức năng 29", "*Bảng 4.29.1: Đặc tả thành phần giao diện chức năng 29"),
    ("*Bảng 10: Quy tắc kiểm tra và thông báo lỗi chức năng 29", "*Bảng 4.29.2: Quy tắc kiểm tra và thông báo lỗi chức năng 29"),
    ("*Bảng 11: Đặc tả thành phần giao diện chức năng 30", "*Bảng 4.30.1: Đặc tả thành phần giao diện chức năng 30"),
    ("*Bảng 12: Quy tắc kiểm tra và thông báo lỗi chức năng 30", "*Bảng 4.30.2: Quy tắc kiểm tra và thông báo lỗi chức năng 30"),
    ("*Bảng 13: Đặc tả thành phần giao diện chức năng 31", "*Bảng 4.31.1: Đặc tả thành phần giao diện chức năng 31"),
    ("*Bảng 14: Quy tắc kiểm tra và thông báo lỗi chức năng 31", "*Bảng 4.31.2: Quy tắc kiểm tra và thông báo lỗi chức năng 31"),
    ("*Bảng 15: Đặc tả thành phần giao diện chức năng 32", "*Bảng 4.32.1: Đặc tả thành phần giao diện chức năng 32"),
    ("*Bảng 16: Quy tắc kiểm tra và thông báo lỗi chức năng 32", "*Bảng 4.32.2: Quy tắc kiểm tra và thông báo lỗi chức năng 32"),
    ("*Bảng 17: Đặc tả thành phần giao diện chức năng 33", "*Bảng 4.33.1: Đặc tả thành phần giao diện chức năng 33"),
    ("*Bảng 18: Quy tắc kiểm tra và thông báo lỗi chức năng 33", "*Bảng 4.33.2: Quy tắc kiểm tra và thông báo lỗi chức năng 33"),
    ("*Bảng 19: Đặc tả thành phần giao diện chức năng 34", "*Bảng 4.34.1: Đặc tả thành phần giao diện chức năng 34"),
    ("*Bảng 20: Quy tắc kiểm tra và thông báo lỗi chức năng 34", "*Bảng 4.34.2: Quy tắc kiểm tra và thông báo lỗi chức năng 34"),
    ("*Bảng 21: Đặc tả thành phần giao diện chức năng 35", "*Bảng 4.35.1: Đặc tả thành phần giao diện chức năng 35"),
    ("*Bảng 22: Quy tắc kiểm tra và thông báo lỗi chức năng 35", "*Bảng 4.35.2: Quy tắc kiểm tra và thông báo lỗi chức năng 35"),
    ("*Bảng 23: Đặc tả thành phần giao diện chức năng 36", "*Bảng 4.36.1: Đặc tả thành phần giao diện chức năng 36"),
    ("*Bảng 24: Quy tắc kiểm tra và thông báo lỗi chức năng 36", "*Bảng 4.36.2: Quy tắc kiểm tra và thông báo lỗi chức năng 36")
]

for old_cap, new_cap in quan_tables:
    quan_part = quan_part.replace(old_cap, new_cap, 1)

# Recombine content
content = tu_part + quan_part

# Insert typography_header after line 5
if "## I. BẢNG TỔNG QUAN" in content:
    content = content.replace("## I. BẢNG TỔNG QUAN", typography_header + "\n---\n\n## I. BẢNG TỔNG QUAN")

with open(md_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully standardized all captions and typography guidelines in markdown!")
