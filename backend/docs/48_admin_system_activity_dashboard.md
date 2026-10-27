# 📚 TÀI LIỆU KỸ THUẬT CỐT LÕI TÍNH NĂNG STT 48
# BẢNG THỐNG KÊ HOẠT ĐỘNG HỆ THỐNG CHO ADMIN: NGƯỜI DÙNG MỚI, BÀI ĐĂNG, NHÓM MỚI THEO NGÀY
## (Admin System Activity Overview & Daily Analytics Console)

> **Mục đích tài liệu:** Tổng hợp toàn diện, chuẩn xác 100% kiến trúc và vị trí các thành phần mã nguồn cốt lõi (Core Logic) của **Tính năng STT 48: Bảng thống kê hoạt động hệ thống cho Admin: người dùng mới, bài đăng, nhóm mới theo ngày** dành cho Ban Giám đốc và Quản trị viên cấp cao của hệ thống GreenSpot (EcoReport).  
> Hệ thống tuân thủ **Clean Architecture 6 tầng**, **Dependency Inversion Principle (DIP)**, **100% Explicit SQL**, động cơ biểu đồ đa đường SVG thuần túy (Zero Chart Library Lock-in), xuất báo cáo thống kê Excel (.xlsx qua openpyxl) và PDF chuẩn mực (.pdf qua ReportLab), đặc biệt tuân thủ **NGUYÊN TẮC CỐT LÕI END-TO-END (KHÔNG NGÕ CỤT)** kết nối liền mạch với toàn bộ hệ thống từ **STT 37 ➔ 48**.

---

## 📑 MỤC LỤC TỔNG QUAN

1. [PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG](#phần-1-kiến-trúc-tổng-quan--clean-architecture-6-tầng)
2. [PHẦN 2: NGUYÊN TẮC CỐT LÕI END-TO-END (KHÔNG NGÕ CỤT) LIÊN KẾT STT 37 ➔ 48](#phần-2-nguyên-tắc-cốt-lõi-end-to-end-không-ngõ-cụt-liên-kết-stt-37--48)
3. [PHẦN 3: ĐẶC TẢ CHI TIẾT 3 MÀN HÌNH NGHIỆP VỤ & PROTOTYPES](#phần-3-đặc-tả-chi-tiết-3-màn-hình-nghiệp-vụ--prototypes)
   - [3.1.  Giao diện tổng quan hoạt động hệ thống (Activity Dashboard - 3 Cột)](#31-màn-13-giao-diện-tổng-quan-hoạt-động-hệ-thống-activity-dashboard---3-cột)
   - [3.2.  Giao diện bảng số liệu hoạt động chi tiết theo ngày (Daily Activity Table - 3 Cột)](#32-màn-23-giao-diện-bảng-số-liệu-hoạt-động-chi-tiết-theo-ngày-daily-activity-table---3-cột)
   - [3.3.  Modal Popup "XUẤT THỐNG KÊ" (Tùy chọn Excel / PDF)](#33-màn-33-modal-popup-xuất-thống-kê-tùy-chọn-excel--pdf)
4. [PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND](#phần-4-chi-tiết-mã-nguồn-cốt-lõi-phía-backend)
   - [4.1. Domain Entities & Schemas (Tầng 1 & 2)](#41-domain-entities--schemas-tầng-1--2)
   - [4.2. Abstraction & DIP Interfaces (Tầng 3)](#42-abstraction--dip-interfaces-tầng-3)
   - [4.3. Persistence Layer - 100% Explicit SQL (Tầng 4)](#43-persistence-layer---100-explicit-sql-tầng-4)
   - [4.4. Business Logic Service Layer (Tầng 5)](#44-business-logic-service-layer-tầng-5)
   - [4.5. Presentation Layer - FastAPI Router (Tầng 6)](#45-presentation-layer---fastapi-router-tầng-6)
5. [PHẦN 5: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND](#phần-5-chi-tiết-mã-nguồn-cốt-lõi-phía-frontend)
   - [5.1. Types & API Service](#51-types--api-service)
   - [5.2. Native SVG Multi-Line Trend Chart (Zero External Dependency)](#52-native-svg-multi-line-trend-chart-zero-external-dependency)
   - [5.3. Màn 1: ActivityDashboard Component](#53-màn-1-activitydashboard-component)
   - [5.4. Màn 2: DailyActivityTable Component](#54-màn-2-dailyactivitytable-component)
   - [5.5. Màn 3: ExportModal Component](#55-màn-3-exportmodal-component)
   - [5.6. Multi-Screen Container & Hệ thống Navigation Khung](#56-multi-screen-container--hệ-thống-navigation-khung)
6. [PHẦN 6: BỘ KIỂM THỬ TỰ ĐỘNG & NGHIỆM THU (100% TEST PASS)](#phần-6-bộ-kiểm-thử-tự-động--nghiệm-thu-100-test-pass)

---

## PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG

```
BackEnd/app/
├── schemas/admin_dashboard/            # [TẦNG 2: DATA TRANSFER OBJECTS (DTO)]
│   ├── dashboard_schema.py             # ActivityDashboardResponse, DailyReportResponse, ExportActivityRequest...
│   └── __init__.py
│
├── interface/admin_dashboard/          # [TẦNG 3: ABSTRACTIONS (DIP CONTRACTS)]
│   ├── dashboard_interface.py          # IAdminDashboardRepository (Abstract Base Class tuân thủ SOLID)
│   └── __init__.py
│
├── crud/admin_dashboard/               # [TẦNG 4: PERSISTENCE LAYER - 100% EXPLICIT SQL]
│   ├── dashboard_repository.py         # AdminDashboardRepository (text(...) SQL, DATE_TRUNC, COALESCE, GROUP BY)
│   └── __init__.py
│
├── services/admin_dashboard/           # [TẦNG 5: BUSINESS LOGIC SERVICE LAYER]
│   ├── dashboard_service.py            # AdminDashboardService (Tính % tăng trưởng, fill 0 ngày trống, openpyxl, reportlab)
│   └── __init__.py
│
└── api/v1/admin_dashboard/             # [TẦNG 6: PRESENTATION LAYER (REST API)]
    ├── router.py                       # REST Endpoints: /overview, /daily-table, /export
    └── __init__.py
```

---

## PHẦN 2: LIÊN KẾT HỆ THỐNG ĐA TẦNG (DATA-LEVEL & END-TO-END INTEGRATION)

Theo danh mục tính năng tổng thể `Rules/FEATURE_LIST.md`, Tính năng **STT 48 (Bảng thống kê hoạt động hệ thống cho Admin)** không đứng độc lập mà là **trung tâm tổng hợp dữ liệu thời gian thực** liên kết chặt chẽ với các chức năng của các thành viên khác trong dự án:

| Thành phần thống kê | Tính năng liên quan | Người phụ trách | Bản chất liên kết (Data / Navigation) |
|---|:---:|---|---|
| **Người dùng mới** | **STT 1 & 3** | Nguyễn Thành Đạt | **Liên kết dữ liệu:** Truy vấn bảng `users` đếm số lượng tài khoản công dân, tình nguyện viên đăng ký mới qua OTP và phân quyền RBAC theo ngày. |
| **Bài đăng mới** | **STT 9** | Nguyễn Thành Đạt | **Liên kết dữ liệu:** Truy vấn bảng `posts` đếm số lượng bài viết phản ánh sự cố môi trường và chia sẻ sống xanh mới theo ngày. |
| **Nhóm mới** | **STT 16** | Huỳnh Anh Tú | **Liên kết dữ liệu:** Truy vấn bảng `groups` đếm số lượng hội nhóm môi trường khu phố, câu lạc bộ tình nguyện được thành lập theo ngày. |
| **Kiểm toán & Quản trị** | **STT 26** | Bùi Nguyễn Minh Quân | Ghi nhận hoạt động truy xuất báo cáo của Admin vào hệ thống Audit Log. |
| **Xuất dữ liệu sự cố** | **STT 47** | Lê Anh Tuấn | **Liên kết URL/Popup:** Modal xuất thống kê hỗ trợ chuyển hướng nhanh sang trích xuất danh sách sự cố môi trường khi cần. |

> **Nguyên tắc thiết kế UX:** Tính liên kết hệ thống (End-to-End) được thể hiện tự nhiên qua **dữ liệu thực tế** hiển thị trên dashboard và các thao tác ngữ cảnh, không nhồi nhét các thanh nút bấm lối tắt thô thiển ở chân trang làm rối giao diện quản trị.

---

## PHẦN 3: ĐẶC TẢ CHI TIẾT 3 MÀN HÌNH NGHIỆP VỤ & PROTOTYPES

### 3.1.  Giao diện tổng quan hoạt động hệ thống (Activity Dashboard - 3 Cột)
- **Khung giao diện:** Header chuẩn (logo GreenSpot, menu điều hướng tab Tổng quan / Báo cáo chi tiết / Xuất thống kê, chuông thông báo, avatar), Footer chuẩn (bản quyền, liên hệ, chính sách).
- **Khối "CHỈ SỐ" (Cột trái):**
  - **Người dùng mới:** Thẻ tổng hợp số lượng tài khoản đăng ký mới (VD: `+1.420`, `+15.5%` so với kỳ trước). Kèm link điều hướng nhanh: *"Quản lý tài khoản & RBAC ➔"* (`#rbac`).
  - **Bài đăng mới:** Thẻ tổng hợp số lượng bài phản ánh môi trường mới (VD: `+3.850`, `-8.2%`). Kèm link điều hướng: *"Duyệt bài đăng cộng đồng ➔"* (`#posts`).
  - **Nhóm mới:** Thẻ tổng hợp số lượng nhóm cộng đồng/tình nguyện xanh mới (VD: `+42`, `+5.0%`). Kèm link điều hướng: *"Danh sách nhóm cộng đồng ➔"* (`#groups`).
- **Khối "BIỂU ĐỒ" (Cột giữa):**
  - Biểu đồ đa đường (Multi-line Trend Chart) hiển thị đồng thời 3 chuỗi thời gian:
    - 🔵 Lam (#3b82f6): Người dùng mới
    - 🟢 Lục (#10b981): Bài đăng mới
    - 🟠 Cam (#f97316): Nhóm mới
  - Tooltip động hiển thị chi tiết khi rê chuột (hover crosshair & dynamic card).
- **Khối "LỌC" (Cột phải):**
  - Các nút chọn nhanh: `7 ngày`, `30 ngày` (mặc định), `Tuỳ chọn`.
  - Khi chọn `Tuỳ chọn`: Mở bộ chọn Từ ngày - Đến ngày và nút "Áp dụng".
  - Smooth animation và giữ nguyên ngữ cảnh khi đổi bộ lọc.

---

### 3.2.  Giao diện bảng số liệu hoạt động chi tiết theo ngày (Daily Activity Table - 3 Cột)
- **Khối "BỘ LỌC" (Cột trái):**
  - Ô chọn `Từ ngày` và `Đến ngày` kèm kiểm soát lỗi validation logic (Từ ngày $\le$ Đến ngày).
  - Nút chọn nhanh: `7 ngày`, `30 ngày`, `90 ngày`.
  - Nút "Áp dụng" màu ngọc lục bảo (#10b981).
- **Khối "BẢNG SỐ LIỆU" (Cột giữa):**
  - Bảng dữ liệu chuẩn 4 cột:
    - `Ngày`: Định dạng `YYYY-MM-DD` in đậm.
    - `Người dùng`: Số lượng người dùng mới (VD: `+120`).
    - `Bài`: Số lượng bài đăng mới (VD: `+280`).
    - `Nhóm`: Số lượng nhóm mới (VD: `+7`).
  - Hàng `TỔNG CỘNG`: Tính tổng toàn bộ bản ghi theo kỳ lọc ở chân bảng.
  - Phân trang dữ liệu server-side (`Trước`, danh sách trang, `Sau`).
- **Khối "THAO TÁC" (Cột phải):**
  - Nút chính: **"📄 Xuất báo cáo"** mở Modal Màn 3/3.
  - Đoạn mô tả: *"Trích xuất toàn bộ dữ liệu bảng theo kỳ lọc ra tệp Excel (.xlsx) hoặc PDF (.pdf) chuẩn mực."*

---

### 3.3.  Modal Popup "XUẤT THỐNG KÊ" (Tùy chọn Excel / PDF)
- **Cấu trúc:** Nhãn `POPUP`, Tiêu đề `"XUẤT THỐNG KÊ"`.
- **Thông tin kỳ báo cáo:** Kế thừa tự động khoảng ngày từ bộ lọc hiện tại (`Từ ngày → Đến ngày`).
- **Tùy chọn định dạng:**
  - 📊 **Microsoft Excel (.xlsx)** [Mặc định]: Bảng tính chi tiết, kèm hàng tổng cộng và công thức toán học.
  - 📄 **Adobe PDF (.pdf)** [Lựa chọn]: Báo cáo quản trị định dạng A4 chuẩn mực, tiêu ngữ hành chính, bảng lưới và chân trang bảo mật.
- **Cơ chế tải xuống an toàn:**
  - Máy chủ trả về raw binary stream kèm `Content-Disposition`.
  - Client tự động tạo Blob URL (`window.URL.createObjectURL(blob)`), kích hoạt tự động download về máy tính người dùng và giải phóng bộ nhớ tạm `revokeObjectURL`.
- **Lối thoát & Không ngõ cụt:**
  - Dòng liên kết: *"Cần xuất danh sách sự cố chi tiết theo quận/huyện? Trích xuất danh sách sự cố ➔"* chuyển sang `#incident-export`.
  - Nút "Huỷ", phím ESC hoặc click backdrop để đóng popup an toàn.

---

## PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND

### 4.1. Domain Entities & Schemas (Tầng 1 & 2)
- **Tập tin:** [`BackEnd/app/schemas/admin_dashboard/dashboard_schema.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/admin_dashboard/dashboard_schema.py)
- **Schemas chính:**
  - `KpiMetrics`: `total_new_users`, `total_new_posts`, `total_new_groups`, `users_growth_pct`, `posts_growth_pct`, `groups_growth_pct`.
  - `DailyActivityItem`: `stat_date`, `new_users`, `new_posts`, `new_groups`.
  - `ActivityDashboardResponse`: Tổng hợp KPI, chuỗi ngày, khoảng thời gian lọc và thông điệp trạng thái.
  - `DailyActivitySummary`: Tổng số và trung bình/ngày của cả 3 chỉ số.
  - `DailyReportResponse`: Danh sách bản ghi theo ngày kèm phân trang và tổng cộng.
  - `ExportActivityRequest`: Tham số yêu cầu xuất tệp (`from_date`, `to_date`, `format = "xlsx" | "pdf"`).

### 4.2. Abstraction & DIP Interfaces (Tầng 3)
- **Tập tin:** [`BackEnd/app/interface/admin_dashboard/dashboard_interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/admin_dashboard/dashboard_interface.py)
- **Định nghĩa hợp đồng:** `IAdminDashboardRepository` kế thừa `abc.ABC` với các phương thức trừu tượng:
  - `get_daily_series(start_date, end_date)`
  - `get_period_totals(start_date, end_date)`
  - `get_daily_table(from_date, to_date, page, page_size)`

### 4.3. Persistence Layer - 100% Explicit SQL (Tầng 4)
- **Tập tin:** [`BackEnd/app/crud/admin_dashboard/dashboard_repository.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/admin_dashboard/dashboard_repository.py)
- **Kỹ thuật truy vấn:** Sử dụng `sqlalchemy.text(...)` với tham số ràng buộc an toàn (Parameter Binding) chống SQL Injection:
  - Gom nhóm dữ liệu theo ngày sử dụng `DATE_TRUNC('day', created_at)`:
    - Bảng `users`: đếm tài khoản mới `WHERE deleted_at IS NULL`.
    - Bảng `posts`: đếm bài viết mới `WHERE deleted_at IS NULL AND is_hidden = false`.
    - Bảng `user_groups`: đếm nhóm cộng đồng mới `WHERE deleted_at IS NULL`.
  - Ghép nối dữ liệu qua `FULL OUTER JOIN` trên cột ngày và `COALESCE` để điền 0 cho những ngày không có hoạt động.

### 4.4. Business Logic Service Layer (Tầng 5)
- **Tập tin:** [`BackEnd/app/services/admin_dashboard/dashboard_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/admin_dashboard/dashboard_service.py)
- **Class:** `AdminDashboardService`
- **Công thức tính tỷ lệ tăng trưởng:**
  $$\text{Growth Pct} = \begin{cases} 0.0 & \text{nếu } P_0 = 0 \text{ và } P_1 = 0 \\ 100.0 & \text{nếu } P_0 = 0 \text{ và } P_1 > 0 \\ \text{round}\left(\frac{P_1 - P_0}{P_0} \times 100, 1\right) & \text{ngược lại} \end{cases}$$
- **Bộ sinh tệp Excel (Openpyxl Builder):**
  - Tiêu đề xanh thương hiệu `#0D9488` (Dark Teal), font chữ chuẩn, định dạng căn lề số học và hàng TỔNG CỘNG in đậm.
- **Bộ sinh tệp PDF (ReportLab Builder):**
  - Trang dọc A4, bảng màu xanh ngọc, tiêu ngữ chuẩn, căn phải các cột số liệu và chân trang bảo mật thông tin nội bộ.

### 4.5. Presentation Layer - FastAPI Router (Tầng 6)
- **Tập tin:** [`BackEnd/app/api/v1/admin_dashboard/router.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/admin_dashboard/router.py)
- **Tích hợp vào Router tổng:** [`BackEnd/app/api/v1/__init__.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/__init__.py) (`api_v1_router.include_router(admin_dashboard_router)`).
- **Các endpoints:**
  - `GET /api/v1/admin-dashboard/overview`: Lấy số liệu 3 KPI và chuỗi ngày biểu đồ.
  - `GET /api/v1/admin-dashboard/daily-table`: Lấy bảng số liệu theo ngày có phân trang.
  - `POST /api/v1/admin-dashboard/export`: Xuất tệp `StreamingResponse` (.xlsx hoặc .pdf).

---

## PHẦN 5: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND

### 5.1. Types & API Service
- **Types:** [`FrontEnd/src/features/admin_dashboard/types/dashboard.types.ts`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/admin_dashboard/types/dashboard.types.ts)
- **Service API:** [`FrontEnd/src/features/admin_dashboard/services/dashboardApi.ts`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/admin_dashboard/services/dashboardApi.ts)
  - `exportReport(...)`: Gửi request POST, nhận `response.blob()`, tạo Blob URL tạm thời, kích hoạt thẻ `<a download="...">` và dọn dẹp bộ nhớ.

### 5.2. Native SVG Multi-Line Trend Chart (Zero External Dependency)
- **Tập tin:** [`FrontEnd/src/features/admin_dashboard/components/MultiLineTrendChart.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/admin_dashboard/components/MultiLineTrendChart.tsx)
- **Điểm đột phá kiến trúc:** Vẽ trực tiếp trên thẻ `<svg>` với đường cong Bezier khối mềm mại (`C cp1x cp1y cp2x cp2y x y`), trục tọa độ responsive, lưới kẻ mờ và thẻ Tooltip di động bám sát con trỏ chuột khi hover qua từng ngày. Hoàn toàn độc lập, không bị xung đột phiên bản React 19.

### 5.3. Màn 1: ActivityDashboard Component
- **Tập tin:** [`FrontEnd/src/features/admin_dashboard/components/ActivityDashboard.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/admin_dashboard/components/ActivityDashboard.tsx)
- **Tính năng:** 3 KPI cards, bộ chọn lọc 7/30/tuỳ chọn, thanh thao tác liên phân hệ End-to-End STT 37->47.

### 5.4. Màn 2: DailyActivityTable Component
- **Tập tin:** [`FrontEnd/src/features/admin_dashboard/components/DailyActivityTable.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/admin_dashboard/components/DailyActivityTable.tsx)
- **Tính năng:** Bộ lọc ngày, bảng số liệu, hàng tổng cộng, phân trang, cột thao tác xuất và liên kết điều hành.

### 5.5. Màn 3: ExportModal Component
- **Tập tin:** [`FrontEnd/src/features/admin_dashboard/components/ExportModal.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/admin_dashboard/components/ExportModal.tsx)
- **Tính năng:** Radio chuyển đổi Excel/PDF, spinner tạo tệp, auto-download, liên kết STT 47.

### 5.6. Multi-Screen Container & Hệ thống Navigation Khung
- **Container:** [`FrontEnd/src/features/admin_dashboard/pages/AdminDashboardContainer.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/admin_dashboard/pages/AdminDashboardContainer.tsx)
- **App Mounting:** [`FrontEnd/src/App.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/App.tsx)
  - URL hash routing `#admin-dashboard`, `#system-activity`, `#admin-stats`.
  - Icon bảng điều khiển 📈 tích hợp trong Menu tác vụ quản trị.
  - Trợ lý ảo giọng nói STT 37 tự động điều hướng sang `#admin-dashboard`.

---

## PHẦN 6: BỘ KIỂM THỬ TỰ ĐỘNG & NGHIỆM THU (100% TEST PASS)

### 6.1. Backend Pytest Suites
- **Tập tin kiểm thử:** `BackEnd/tests/test_admin_dashboard.py`
- **Kết quả thực tế:** **10/10 Test Cases PASSED (100%)** trong 3.64 giây.
  1. `test_get_activity_dashboard_overview`: Khởi tạo và tính toán overview thành công.
  2. `test_get_activity_dashboard_growth_zero_previous`: Xử lý ngoại lệ kỳ trước bằng 0.
  3. `test_get_daily_table_service`: Phân trang và tính toán tổng cộng bảng ngày.
  4. `test_get_daily_table_invalid_dates`: Chặn lỗi Từ ngày > Đến ngày (HTTP 400).
  5. `test_export_excel`: Tạo tệp Openpyxl stream và kiểm tra magic byte XLSX.
  6. `test_export_pdf`: Tạo tệp ReportLab PDF và kiểm tra magic header `%PDF-`.
  7. `test_api_overview_endpoint`: REST API `GET /overview` trả về 200 OK.
  8. `test_api_daily_table_endpoint`: REST API `GET /daily-table` trả về 200 OK.
  9. `test_api_export_endpoint_xlsx`: REST API `POST /export` định dạng Excel.
  10. `test_api_export_endpoint_pdf`: REST API `POST /export` định dạng PDF.

### 6.2. Frontend Vitest Suites
- **Tập tin kiểm thử:** `FrontEnd/src/features/admin_dashboard/__tests__/admin_dashboard.test.tsx`
- **Kết quả thực tế:** **11/11 Test Cases PASSED (100%)**; Toàn bộ dự án: **33 Test Files PASSED, 264/264 Tests PASSED (100%)**.
  1. `ActivityDashboard`: Hiển thị đầy đủ 3 thẻ KPI và biểu đồ đa đường SVG.
  2. `ActivityDashboard`: Chuyển đổi bộ lọc 7 ngày và 30 ngày kích hoạt fetch API tương ứng.
  3. `ActivityDashboard`: Mở ô chọn ngày khi bấm nút Tuỳ chọn.
  4. `ActivityDashboard`: Hiển thị thông báo lỗi và nút Thử lại khi API gặp sự cố.
  5. `DailyActivityTable`: Hiển thị bảng số liệu theo ngày và hàng tổng cộng.
  6. `DailyActivityTable`: Nhấn nút Xuất báo cáo kích hoạt mở modal Màn 3.
  7. `ExportModal`: Chuyển đổi giữa Excel và PDF và gọi hàm tải tệp.
  8. `ExportModal`: Đóng modal an toàn khi bấm Huỷ hoặc phím ESC.
  9. `AdminDashboardContainer`: Chuyển đổi qua lại giữa tab Tổng quan và Báo cáo chi tiết.
  10. `AdminDashboardContainer`: Mở Menu quản trị STT 37->48 không ngõ cụt khi bấm nút Header.
  11. `AdminDashboardContainer`: Mở Modal xuất thống kê khi bấm nút trên Header.

### 6.3. TypeScript Type-Checking
- Lệnh kiểm tra: `npx tsc --noEmit`
- Kết quả: **Exit code 0 (Không có bất kỳ lỗi biên dịch nào trên toàn bộ dự án).**
