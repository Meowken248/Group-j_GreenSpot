# 🏛️ ĐẶC TẢ KỸ THUẬT STT 42: DASHBOARD PHÂN TÍCH RỦI RO ĐÔ THỊ
## (URBAN ENVIRONMENTAL RISK EXECUTIVE DASHBOARD)

> **Cấp độ áp dụng:** Bắt buộc 100% tuân thủ Clean Architecture, SOLID (DIP), Explicit SQL, Soft-Delete & Optimistic Locking (OCC).  
> **Đối tượng sử dụng:** Lãnh đạo Sở Tài nguyên & Môi trường TP.HCM, Ban Chỉ huy Phòng chống thiên tai & Tìm kiếm cứu nạn TP.HCM, Quản trị viên (ADMIN).  
> **Mục tiêu:** Cung cấp bức tranh tổng thể và kịp thời cho các cấp lãnh đạo ra quyết định điều hành vĩ mô, chủ động phân bổ ngân sách và điều động phương tiện cơ giới xử lý các điểm nóng môi trường.

---

## 1. KIẾN TRÚC TỔNG THỂ & MA TRẬN PHÂN TẦNG CLEAN ARCHITECTURE

```
BackEnd/
├── app/
│   ├── models/
│   │   └── risk_dashboard/
│   │       ├── __init__.py
│   │       └── risk_snapshot.py                 # [TẦNG 1] Entity DistrictRiskSnapshot (OCC Version + Soft Delete)
│   ├── schemas/
│   │   └── risk_dashboard/schemas.py            # [TẦNG 2] Pydantic DTO (Overview, Filter, Comparison, DistrictDetail)
│   ├── interface/
│   │   └── risk_dashboard/
│   │       └── risk_dashboard_interface.py      # [TẦNG 3] IRiskDashboardRepository (DIP Abstract Base Class)
│   ├── crud/
│   │   └── risk_dashboard/
│   │       └── risk_dashboard_repository.py     # [TẦNG 4] RiskDashboardRepository (100% Explicit SQL)
│   ├── services/
│   │   └── risk_dashboard/
│   │       └── risk_dashboard_service.py        # [TẦNG 5] RiskDashboardService (Business Logic Use Cases)
│   └── api/v1/
│       └── risk_dashboard/
│           └── router.py                        # [TẦNG 6] FastAPI Router (/api/v1/risk-dashboard/...)
└── tests/
    └── risk_dashboard/
        ├── __init__.py
        └── test_urban_risk_dashboard.py         # Bộ kiểm thử TDD Unit & Integration (100% Pass)
```

---

## 2. ĐẶC TẢ CHI TIẾT 3 MÀN HÌNH THEO PROTOTYPE

### Màn 1/3: Tổng quan rủi ro đô thị (Executive Overview)
- **Khung chung:** Header (Logo, Menu quản trị, Chuông cảnh báo, Avatar) & Footer (Bản quyền, Liên hệ, Chính sách).
- **Phần giữa (3 khối ngang):**
  1. **Khối CHỈ SỐ (Cột trái):**
     - *Điểm rủi ro chung:* Thang điểm trung bình toàn đô thị (VD: `58/100 - Mức rủi ro trung bình`).
     - *Số khu vực nguy cơ cao:* Số lượng quận/huyện ở mức báo động cam hoặc đỏ (VD: `4 quận nguy cơ cao`).
     - *Sự cố đang mở:* Tổng số bãi rác tự phát và điểm ngập úng chưa xử lý xong (VD: `128 sự cố đang mở`).
  2. **Khối BIỂU ĐỒ (Cột giữa):**
     - *Biểu đồ cột:* Điểm số rủi ro xếp theo 22 quận/huyện và TP. Thủ Đức.
     - *Biểu đồ đường:* Chuỗi thời gian xu hướng tăng/giảm chỉ số rủi ro trong 30 ngày gần nhất.
  3. **Khối CẢNH BÁO (Cột phải):**
     - *Top khu vực nguy cơ:* Top 5 quận/huyện có điểm số cao nhất (VD: Bình Tân, Quận 8, Hóc Môn, Thủ Đức, Bình Thạnh).
     - *Quy tắc:* Nhấp vào bất kỳ quận nào trong danh sách cảnh báo hoặc cột biểu đồ sẽ kích hoạt mở **Màn 3 (Popup chi tiết quận)**.
- **Quy tắc cảnh báo khẩn cấp:**
  - Nếu có quận vượt ngưỡng rủi ro > 80: Thông báo `"Cảnh báo khẩn cấp: {tên quận} có điểm rủi ro vượt mức an toàn"`, thẻ chỉ số nhấp nháy viền đỏ, chuông Header kích hoạt.

### Màn 2/3: Lọc & phân tích chuyên sâu (Deep-dive Risk Analysis & Periodic Comparison)
- **Khối BỘ LỌC (Cột trái):**
  - *Quận/huyện:* Chọn 1 hoặc nhiều quận/huyện cụ thể.
  - *Loại rủi ro:* Rác sinh hoạt ùn ứ, Rác nguy hại y tế/công nghiệp, Điểm ngập nước, Ô nhiễm khói bụi.
  - *Khoảng thời gian:* "Tháng này", "Quý này", "6 tháng qua", hoặc khoảng ngày tùy chỉnh.
  - *Nút "Áp dụng":* Thực thi lọc và làm mới cột kết quả.
  - *Xuất dữ liệu:* Nút "Xuất Excel / CSV" và "Xuất PDF".
- **Khối KẾT QUẢ (Cột giữa):**
  - *Bảng số liệu định lượng:* Tổng số sự cố, Khối lượng rác ước tính ($m^3$), Tỷ lệ xử lý đúng hạn SLA (%).
  - *Biểu đồ tròn theo loại:* Tỷ lệ phần trăm cơ cấu giữa các dạng rủi ro môi trường.
- **Khối SO SÁNH (Cột phải):**
  - *Kỳ này vs kỳ trước:* Thể hiện % tăng trưởng/suy giảm so với cùng kỳ tháng/quý trước.
  - Đánh giá màu xanh lá: `"Tích cực: Chỉ số rủi ro môi trường đã giảm {x}%"`.
  - Đánh giá màu đỏ cảnh báo nếu rủi ro tăng.

### Màn 3/3: Chi tiết quận (Popup Modal)
- **Hiển thị:** Popup căn giữa màn hình, backdrop mờ phủ toàn bộ nền, đóng bằng nút "Đóng", phím Esc hoặc click ngoài.
- **Dữ liệu hiển thị:**
  - Tiêu đề nhỏ `"POPUP"`, in đậm `"CHI TIẾT QUẬN"`.
  - Tên quận (VD: `"Quận Bình Tân"`).
  - Điểm rủi ro (VD: `"Điểm rủi ro: 78/100 - Mức báo động cam"`).
  - Sự cố tồn đọng (VD: `"24 bãi rác tự phát, 3 điểm ngập úng sâu"`).
  - Cơ sở thiết yếu bị đe dọa (VD: `"5 trường học, 2 trạm y tế nằm trong vùng nguy cơ"`).
- **Hành động:**
  - Nút `"Xem bản đồ"`: Điều hướng trực tiếp sang Bản đồ nhiệt không gian GIS (STT 33) tại vị trí quận.
  - Nút `"Đóng"`: Đóng popup, giữ nguyên trạng thái Dashboard.

---

## 3. DANH SÁCH REST API ENDPOINTS

| Phương thức | Đường dẫn | Phân quyền | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/risk-dashboard/overview` | Admin / Officer / Manager | Lấy số liệu Màn 1/3 (chỉ số, biểu đồ cột 22 quận + Thủ Đức, xu hướng 30 ngày, top cảnh báo) |
| `POST` | `/api/v1/risk-dashboard/analysis` | Admin / Officer / Manager | Lọc chuyên sâu Màn 2/3 (bảng số liệu, biểu đồ tròn, so sánh kỳ trước) |
| `GET` | `/api/v1/risk-dashboard/analysis` | Admin / Officer / Manager | Hỗ trợ truy vấn GET với Query Parameters |
| `GET` | `/api/v1/risk-dashboard/district/{id_or_name}` | Admin / Officer / Manager | Lấy dữ liệu Màn 3/3 Popup chi tiết quận |
| `POST` | `/api/v1/risk-dashboard/export` | Admin / Officer / Manager | Xuất tệp báo cáo CSV/Excel hoặc PDF |
