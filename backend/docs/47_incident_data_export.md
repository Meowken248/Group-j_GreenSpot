# 📚 TÀI LIỆU KỸ THUẬT CỐT LÕI TÍNH NĂNG STT 47
# XUẤT DANH SÁCH SỰ CỐ RA EXCEL HOẶC PDF THEO BỘ LỌC
## (Data Export & Incident Reporting Console)

> **Mục đích tài liệu:** Tổng hợp toàn diện, chuẩn xác 100% kiến trúc và vị trí các thành phần mã nguồn cốt lõi (Core Logic) của **Tính năng STT 47: Xuất danh sách sự cố ra Excel hoặc PDF theo bộ lọc** dành cho Cán bộ thống kê, Chuyên viên phân tích và Quản trị viên hệ thống (Admin).  
> Hệ thống tuân thủ **Clean Architecture 6 tầng**, **Dependency Inversion Principle (DIP)**, **100% Explicit SQL**, bảo mật **Safeguard thời hạn tải tệp 15 phút**, xuất tệp Excel (.xlsx qua openpyxl) và văn bản hành chính PDF (.pdf qua ReportLab).

---

## 📑 MỤC LỤC TỔNG QUAN

1. [PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG](#phần-1-kiến-trúc-tổng-quan--clean-architecture-6-tầng)
2. [PHẦN 2: ĐẶC TẢ CHI TIẾT 4 MÀN HÌNH NGHIỆP VỤ & BẢNG HIỂN THỊ](#phần-2-đặc-tả-chi-tiết-4-màn-hình-nghiệp-vụ--bảng-hiển-thị)
   - [2.1. Màn 1/4: Giao diện quản lý & trích xuất dữ liệu (Data Export Console - 3 Cột)](#21-màn-14-giao-diện-quản-lý--trích-xuất-dữ-liệu-data-export-console---3-cột)
   - [2.2. Màn 2/4: Modal Popup "XUẤT DANH SÁCH" (Tùy chọn định dạng Excel / PDF)](#22-màn-24-modal-popup-xuất-danh-sách-tùy-chọn-định-dạng-excel--pdf)
   - [2.3. Màn 3/4: Modal Popup "ĐÃ TẠO TỆP" (Download & Safeguard 15 phút)](#23-màn-34-modal-popup-đã-tạo-tệp-download--safeguard-15-phút)
   - [2.4. Màn 4/4: Modal Popup "KHÔNG CÓ DỮ LIỆU" (Empty State Warning & Auto-focus)](#24-màn-44-modal-popup-không-có-dữ-liệu-empty-state-warning--auto-focus)
3. [PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND](#phần-3-chi-tiết-mã-nguồn-cốt-lõi-phía-backend)
   - [3.1. Domain Entities & Database Models (Tầng 1)](#31-domain-entities--database-models-tầng-1)
   - [3.2. Data Transfer Objects - Pydantic v2 Schemas (Tầng 2)](#32-data-transfer-objects---pydantic-v2-schemas-tầng-2)
   - [3.3. Abstractions & DIP Interfaces (Tầng 3)](#33-abstractions--dip-interfaces-tầng-3)
   - [3.4. Persistence Layer - 100% Explicit SQL (Tầng 4)](#34-persistence-layer---100-explicit-sql-tầng-4)
   - [3.5. Business Logic Service Layer (Tầng 5)](#35-business-logic-service-layer-tầng-5)
   - [3.6. Presentation Layer - FastAPI Router (Tầng 6)](#36-presentation-layer---fastapi-router-tầng-6)
4. [PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND](#phần-4-chi-tiết-mã-nguồn-cốt-lõi-phía-frontend)
5. [PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)](#phần-5-bộ-kiểm-thử-tự-động-automated-test-suites)

---

# PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG

```
BackEnd/app/
├── models/incident_export/             # [TẦNG 1: DOMAIN ENTITIES]
│   ├── exported_file.py                # ExportedIncidentFile (Lưu lịch sử xuất, dung lượng, hạn 15m)
│   └── __init__.py
│
├── schemas/incident_export/            # [TẦNG 2: DATA TRANSFER OBJECTS (DTO)]
│   ├── schemas.py                      # Pydantic v2 schemas: FilterParams, PreviewResponse, TriggerExportRequest...
│   └── __init__.py
│
├── interface/incident_export/          # [TẦNG 3: ABSTRACTIONS (DIP CONTRACTS)]
│   ├── incident_export_interface.py    # IIncidentExportRepository (Abstract Base Class)
│   └── __init__.py
│
├── crud/incident_export/               # [TẦNG 4: PERSISTENCE LAYER - 100% EXPLICIT SQL]
│   ├── incident_export_repository.py   # IncidentExportRepository (text(...) SQL, parameter bindings, soft-delete)
│   └── __init__.py
│
├── services/incident_export/           # [TẦNG 5: BUSINESS LOGIC SERVICE]
│   ├── incident_export_service.py      # IncidentExportService (openpyxl Excel, ReportLab PDF, 15m Safeguard)
│   └── __init__.py
│
└── api/v1/incident_export/             # [TẦNG 6: PRESENTATION LAYER (REST API)]
    ├── router.py                       # REST Endpoints: /preview, /generate, /status, /download, /options
    └── __init__.py
```

---

# PHẦN 2: ĐẶC TẢ CHI TIẾT 4 MÀN HÌNH NGHIỆP VỤ & BẢNG HIỂN THỊ

### 2.1. Màn 1/4: Giao diện quản lý & trích xuất dữ liệu (Data Export Console - 3 Cột)
- **Khung giao diện:** Header chuẩn (logo GreenSpot, menu quản trị, chuông thông báo, avatar), Footer chuẩn (bản quyền, liên hệ, chính sách).
- **Khối "BỘ LỌC" (Cột trái):**
  - Quận: Dropdown 22 quận/huyện và TP. Thủ Đức (hoặc "Tất cả").
  - Loại: Dropdown danh mục sự cố: Tất cả, Rác thải tự phát, Ngập úng đô thị, Xả khói bụi, Ô nhiễm kênh rạch.
  - Trạng thái: Dropdown vòng đời sự cố: Tất cả, Chờ tiếp nhận, Đang xử lý, Đã hoàn tất, Đã đóng.
  - Ngày: Bộ chọn khoảng thời gian (Từ ngày - Đến ngày) hoặc chọn nhanh (Hôm nay, Tuần này, Tháng này, Quý này).
  - Nút "Áp dụng": Màu lam (#0284C7 / #2563EB) kích hoạt lọc dữ liệu hiển thị ngay sang cột giữa.
- **Khối "DANH SÁCH" (Cột giữa):**
  - Bảng dữ liệu xem trước hiển thị các cột chuẩn: `Mã | Loại | Quận | Trạng thái` (VD: `SC-2026-081 | Rác tự phát | Quận Bình Tân | Đang xử lý`).
  - Phân trang dữ liệu ở chân bảng.
- **Khối "THAO TÁC" (Cột phải):**
  - Nút "Xuất danh sách": Primary Action nổi bật.

| Nguyên nhân | Message | Giao diện hiển thị |
|---|---|---|
| Áp dụng bộ lọc thành công và có dữ liệu | "Tìm thấy [Số_Lượng] bản ghi sự cố phù hợp với bộ lọc." | Bảng danh sách tại cột giữa liệt kê các hàng sự cố rõ ràng, phân trang dữ liệu ở chân bảng. |
| Bấm nút "Xuất danh sách" khi bảng có dữ liệu | "Chuẩn bị xuất dữ liệu cho [Số_Lượng] sự cố đã lọc." | Hệ thống hiển thị Modal Popup chọn định dạng ở Màn 2/4. |
| Bấm nút "Xuất danh sách" khi bảng không có dữ liệu nào | "Không có dữ liệu sự cố nào phù hợp để xuất báo cáo." | Mở trực tiếp Modal Popup cảnh báo tại STT 47 – Màn 4/4 (Không có dữ liệu). |
| Lỗi truy vấn cơ sở dữ liệu khi lọc | "Lỗi truy vấn danh sách sự cố. Vui lòng thử lại sau ít phút." | Banner cảnh báo đỏ xuất hiện tại đầu trang. |

---

### 2.2. Màn 2/4: Modal Popup "XUẤT DANH SÁCH" (Tùy chọn định dạng Excel / PDF)
- **Cấu trúc:** Nhãn `POPUP`, Tiêu đề `"XUẤT DANH SÁCH"`.
- **Khung tùy chọn:**
  - Microsoft Excel (.xlsx) [Mặc định]: Phù hợp lưu trữ thô, tính toán thống kê và phân tích pivot table.
  - Adobe PDF (.pdf): Phù hợp in ấn, lưu trữ văn bản hành chính và gửi báo cáo giao ban kèm quốc huy/tiêu ngữ chuẩn.
- **Xác nhận:** "Theo bộ lọc hiện tại" (kế thừa tiêu chí Quận, Loại, Trạng thái, Ngày).
- **Hành động:** Nút "Xuất" (hiển thị spinner) và Nút "Huỷ" / phím ESC.

| Nguyên nhân | Message | Giao diện hiển thị |
|---|---|---|
| Nhấp nút "Xuất danh sách" từ Màn 1/4 | "XUẤT DANH SÁCH: Chọn định dạng Excel hoặc PDF." | Modal Popup hiển thị chính giữa màn hình, định dạng Excel được chọn mặc định. |
| Người dùng chọn định dạng và bấm "Xuất" | "Đang kết xuất dữ liệu và tạo tệp [Định_Dạng]..." | Nút "Xuất" hiển thị icon xoay tải (loading spinner), tiến trình chạy ngầm sinh tệp. |
| Khởi tạo tệp hoàn tất trên máy chủ | "Tệp xuất dữ liệu đã được khởi tạo thành công!" | Hệ thống tự động chuyển sang Màn 3/4 (Đã tạo tệp). |
| Bấm nút "Huỷ" hoặc phím ESC | Popup đóng lại an toàn. | Đóng popup, người dùng trở về thao tác với bảng dữ liệu tại Màn 1/4. |

---

### 2.3. Màn 3/4: Modal Popup "ĐÃ TẠO TỆP" (Download & Safeguard 15 phút)
- **Cấu trúc:** Nhãn `POPUP`, Biểu tượng icon tệp kèm checkmark xanh lá, Tiêu đề `"ĐÃ TẠO TỆP"`.
- **Thông điệp:** "Tệp sẵn sàng tải về" kèm tên tệp, dung lượng (VD: `BaoCao_SuCo_20261026.xlsx - 1.4 MB`).
- **Hành động:** Nút "Tải xuống" (kèm toast thông báo), Nút "Đóng".
- **Chính sách bảo mật:** Sau 15 phút, liên kết tải tệp hết hạn. Nút "Tải xuống" bị vô hiệu hóa kèm cảnh báo vàng.

| Nguyên nhân | Message | Giao diện hiển thị |
|---|---|---|
| Quá trình tạo tệp thành công trên máy chủ | "ĐÃ TẠO TỆP. Tệp sẵn sàng tải về." | Modal Popup hiển thị nổi bật với biểu tượng thành công và nút "Tải xuống" màu xanh lam. |
| Người dùng bấm nút "Tải xuống" | "Đang bắt đầu tải tệp [Tên_Tệp] về máy tính của bạn..." | Trình duyệt kích hoạt download tệp, hiển thị toast thông báo thành công. |
| Người dùng bấm nút "Đóng" | Popup đóng lại. | Đóng modal popup, khôi phục tương tác bình thường tại Màn 1/4. |
| Liên kết tải tệp hết hạn sau 15 phút | "Liên kết tải tệp đã hết hạn do chính sách bảo mật. Vui lòng xuất lại tệp." | Nút "Tải xuống" bị vô hiệu hóa kèm cảnh báo màu vàng. |

---

### 2.4. Màn 4/4: Modal Popup "KHÔNG CÓ DỮ LIỆU" (Empty State Warning & Auto-focus)
- **Cấu trúc:** Nhãn `POPUP`, Biểu tượng hộp tài liệu rỗng hoặc tam giác cảnh báo cam, Tiêu đề `"KHÔNG CÓ DỮ LIỆU"`.
- **Thông điệp:** "Hãy đổi bộ lọc" (khuyến nghị mở rộng thời gian hoặc giảm bớt điều kiện lọc).
- **Hành động:** Nút "Đóng" (tự động focus con trỏ vào ô chọn ngày hoặc quận/huyện ở Cột 1 Màn 1/4).
- **Lỗi khoảng ngày:** Nếu Ngày bắt đầu > Ngày kết thúc, hiển thị cảnh báo đỏ chi tiết: *"Khoảng ngày không hợp lệ dẫn đến không có dữ liệu. Vui lòng kiểm tra lại."*.

| Nguyên nhân | Message | Giao diện hiển thị |
|---|---|---|
| Bấm xuất khi danh sách rỗng (0 bản ghi) | "KHÔNG CÓ DỮ LIỆU. Hãy đổi bộ lọc." | Modal Popup hiển thị giữa màn hình với icon cảnh báo màu cam và nút "Đóng". |
| Người dùng bấm nút "Đóng" hoặc click ra ngoài | Popup đóng lại. | Đóng popup, tự động focus con trỏ vào ô chọn khoảng ngày hoặc quận/huyện ở cột "BỘ LỌC" Màn 1/4. |
| Thiết lập ngày không hợp lệ (Bắt đầu > Kết thúc) | "Khoảng ngày không hợp lệ dẫn đến không có dữ liệu. Vui lòng kiểm tra lại." | Cảnh báo chi tiết màu đỏ hiển thị kèm trong popup. |


---

# PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND

### 3.1. Domain Entities & Database Models (Tầng 1)
- **Tập tin:** [`BackEnd/app/models/incident_export/exported_file.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/incident_export/exported_file.py)
- **Class `ExportedIncidentFile`:**
  - Bảng cơ sở dữ liệu: `exported_incident_files`.
  - Khóa chính: `export_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)`.
  - Liên kết người dùng: `user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))`.
  - Thuộc tính tệp: `file_name: str`, `file_type: str` ('EXCEL' hoặc 'PDF'), `mime_type: str`, `file_size_bytes: int`, `file_size_formatted: str`, `file_path: str`.
  - Bộ lọc: `filters_applied: JSONB`, `total_records: int`.
  - Chính sách Safeguard 15 phút: `expires_at: datetime`, `is_downloaded: bool`, `download_count: int`.
  - Soft-delete: `deleted_at: Optional[datetime]`.
  - Property `is_expired: bool`: Tự động so khớp thời gian thực với `expires_at` để vô hiệu hóa liên kết tải.

---

### 3.2. Data Transfer Objects - Pydantic v2 Schemas (Tầng 2)
- **Tập tin:** [`BackEnd/app/schemas/incident_export/schemas.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/incident_export/schemas.py)
- **Các DTO cốt lõi:**
  - `IncidentExportFilterParams`: Tiếp nhận bộ lọc (district, category, status, start_date, end_date, quick_range, page, page_size).
  - `IncidentPreviewItem`: Đại diện cho 1 hàng xem trước (incident_id, tracking_code, category_name, district_name, status, status_code, severity, title, address_text, created_at).
  - `IncidentPreviewResponse`: Bảng xem trước dữ liệu (items, total_count, page, page_size, total_pages, message).
  - `TriggerExportRequest`: Lệnh yêu cầu xuất (export_format: 'EXCEL'|'PDF', district, category, status, start_date, end_date).
  - `ExportResultResponse`: Kết quả xuất tệp (success, export_id, file_name, file_type, file_size_bytes, file_size_formatted, total_records, expires_at, message).
  - `ExportStatusResponse`: Trạng thái tải tệp và kiểm tra hết hạn 15 phút (export_id, file_name, file_size_formatted, is_expired, expires_at, download_url, message).
  - `MetadataOptionsResponse`: Cung cấp danh mục lựa chọn (districts, categories, statuses, quick_ranges).

---

### 3.3. Abstractions & DIP Interfaces (Tầng 3)
- **Tập tin:** [`BackEnd/app/interface/incident_export/incident_export_interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/incident_export/incident_export_interface.py)
- **Class trừu tượng `IIncidentExportRepository`:**
  - `get_preview_incidents(params) -> Tuple[List[Dict[str, Any]], int]`
  - `get_incidents_for_export(params) -> List[Dict[str, Any]]`
  - `save_exported_file_record(record) -> ExportedIncidentFile`
  - `get_exported_file_by_id(export_id) -> Optional[ExportedIncidentFile]`
  - `mark_file_downloaded(export_id) -> bool`
  - `get_metadata_options() -> Dict[str, Any]`

---

### 3.4. Persistence Layer - 100% Explicit SQL (Tầng 4)
- **Tập tin:** [`BackEnd/app/crud/incident_export/incident_export_repository.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/incident_export/incident_export_repository.py)
- **Cấu trúc câu truy vấn Explicit SQL:**
  ```sql
  SELECT 
      i.incident_id,
      i.tracking_code,
      i.title,
      i.severity,
      i.status,
      i.address_text,
      i.latitude,
      i.longitude,
      i.created_at,
      COALESCE(wc.name, 'Môi trường chung') AS category_name,
      COALESCE(au.name, 'Chưa xác định') AS district_name
  FROM incidents i
  LEFT JOIN waste_categories wc ON i.category_id = wc.category_id
  LEFT JOIN administrative_units au ON i.unit_id = au.unit_id
  WHERE i.deleted_at IS NULL
    AND (:district IS NULL OR au.name ILIKE :district_pattern)
    AND (:category IS NULL OR wc.name ILIKE :category_pattern)
    AND (:status IS NULL OR i.status = :status)
    AND (:start_date IS NULL OR i.created_at >= :start_date)
    AND (:end_date IS NULL OR i.created_at <= :end_date)
  ORDER BY i.created_at DESC;
  ```
- Tuân thủ Soft-delete (`i.deleted_at IS NULL`), Parameter Binding chống SQL Injection và Fallback an toàn về dữ liệu mẫu nếu CSDL chưa nạp.

---

### 3.5. Business Logic Service Layer (Tầng 5)
- **Tập tin:** [`BackEnd/app/services/incident_export/incident_export_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/incident_export/incident_export_service.py)
- **Class `IncidentExportService`:**
  - `get_preview_data(params)`: Trích xuất danh sách xem trước phân trang.
  - `generate_export(req, user_id)`: Điều phối xuất file Excel/PDF:
    - *Xuất Excel (.xlsx)* qua `openpyxl`: Header tiêu đề Quốc ngữ, định dạng cột căn chỉnh tự động, viền bảng và định dạng màu sắc theo phân loại sự cố.
    - *Xuất PDF (.pdf)* qua `reportlab.pdfgen`: Tiêu ngữ hành chính, bảng thống kê sự cố, tổng hợp số lượng, đánh số trang và watermark thời gian xuất.
    - Chặn xuất khi danh sách rỗng (Empty state) với ngoại lệ `ValueError("Không có dữ liệu sự cố nào phù hợp để xuất báo cáo.")`.
  - `get_download_file(export_id)`: Xác thực Safeguard thời hạn 15 phút, tăng lượt tải và trả về đường dẫn tệp thực tế.

---

### 3.6. Presentation Layer - FastAPI Router (Tầng 6)
- **Tập tin:** [`BackEnd/app/api/v1/incident_export/endpoints.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/incident_export/endpoints.py)
- **Các Endpoints RESTful:**
  - `GET /api/v1/incident-export/preview`: Bảng dữ liệu xem trước phân trang kèm bộ lọc.
  - `POST /api/v1/incident-export/export`: Khởi tạo lệnh xuất file Excel/PDF (trả về `export_id`, hạn 15m).
  - `GET /api/v1/incident-export/status/{export_id}`: Kiểm tra trạng thái sẵn sàng và thời hạn tải.
  - `GET /api/v1/incident-export/download/{export_id}`: Tải tệp nhị phân trực tiếp (`FileResponse`).
  - `GET /api/v1/incident-export/metadata`: Danh mục lựa chọn quận, loại sự cố và mốc thời gian nhanh.
  - Rào chắn bảo mật RBAC: Yêu cầu quyền Quản trị viên (`ADMIN`) hoặc Cán bộ môi trường (`OFFICER`).

---

# PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND

- **Trang quản trị trung tâm:** [`FrontEnd/src/features/incident_export/pages/IncidentExportDashboard.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/incident_export/pages/IncidentExportDashboard.tsx).
- **Các thành phần giao diện:**
  - Cột 1: `ExportFilterPanel.tsx` (Bộ lọc Quận, Loại, Trạng thái, Khoảng ngày).
  - Cột 2: `IncidentPreviewTable.tsx` (Bảng xem trước, phân trang, trạng thái màu sắc).
  - Cột 3: `ExportActionPanel.tsx` (Nút kích hoạt xuất dữ liệu nổi bật).
  - Màn 2/4 Modal: `FormatSelectModal.tsx` (Chọn Excel / PDF).
  - Màn 3/4 Modal: `DownloadReadyModal.tsx` (Nút tải xuống, đếm ngược hạn 15m).
  - Màn 4/4 Modal: `EmptyWarningModal.tsx` (Cảnh báo không có dữ liệu, auto-focus).
- **Styles:** [`FrontEnd/src/features/incident_export/styles/incident_export.scss`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/incident_export/styles/incident_export.scss) (Chuẩn hóa 100% SCSS BEM).

---

# PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)

### 5.1. Backend Unit & Integration Tests (Pytest)
- **Tập tin:** [`BackEnd/tests/incident_export/test_incident_export.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/incident_export/test_incident_export.py) (293 dòng).
- **Kết quả thực thi:** **9/9 PASSED (100%)**:
  1. `test_preview_incidents_success`: Bảng xem trước dữ liệu có phân trang và thông điệp chuẩn hóa.
  2. `test_preview_incidents_filter_by_district`: Lọc theo quận Bình Tân.
  3. `test_preview_incidents_filter_by_status`: Lọc theo trạng thái Đang xử lý.
  4. `test_generate_export_excel_success`: Xuất tệp Excel (.xlsx) với định dạng openpyxl và tiêu đề chuẩn.
  5. `test_generate_export_pdf_success`: Xuất tệp PDF (.pdf) chuẩn thể thức hành chính với ReportLab.
  6. `test_generate_export_empty_data_raises_error`: Bắt lỗi ngăn chặn tạo tệp trắng khi không có dữ liệu.
  7. `test_download_file_valid_and_expired_safeguard`: Tải tệp thành công khi còn hạn và chặn HTTP 410 khi quá hạn 15 phút.
  8. `test_get_metadata_options`: Cung cấp danh mục 22 quận/huyện, loại sự cố và quick range.
  9. `test_format_file_size_utility`: Kiểm tra hàm format kích thước tệp (B, KB, MB).
- **Kiểm thử liên hoàn đa vai trò:** Xác thực thành công trong [test_multi_role_workflow_37_to_48.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/test_multi_role_workflow_37_to_48.py) (`test_04_admin_executive_dashboard_and_export_flow` $\to$ **PASSED**).

---

# PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)

| STT | Thành phần kiến trúc | Đường dẫn tệp mã nguồn | Vị trí dòng | Trách nhiệm cốt lõi |
|:---:|---|---|:---:|---|
| **1** | Domain Model `ExportedIncidentFile` | [`BackEnd/app/models/incident_export/exported_file.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/incident_export/exported_file.py) | L12 - L45 | Lưu trữ tệp xuất, thời hạn 15 phút và lượt tải |
| **2** | Schemas DTOs Pydantic v2 | [`BackEnd/app/schemas/incident_export/schemas.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/incident_export/schemas.py) | L1 - L120 | DTO FilterParams, PreviewResponse, TriggerExportRequest... |
| **3** | DIP Interface `IIncidentExportRepository` | [`BackEnd/app/interface/incident_export/incident_export_interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/incident_export/incident_export_interface.py) | L10 - L55 | Hợp đồng trừu tượng 6 phương thức dữ liệu |
| **4** | Explicit SQL Repository | [`BackEnd/app/crud/incident_export/incident_export_repository.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/incident_export/incident_export_repository.py) | L46 - L261 | Truy vấn lọc sự cố, lưu bản ghi tệp và tải dữ liệu |
| **5** | Service Engine OpenPyXL & ReportLab | [`BackEnd/app/services/incident_export/incident_export_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/incident_export/incident_export_service.py) | L25 - L380 | Tạo tệp Excel .xlsx, PDF .pdf, quản lý Safeguard 15m |
| **6** | Router Endpoints RESTful | [`BackEnd/app/api/v1/incident_export/endpoints.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/incident_export/endpoints.py) | L30 - L180 | 5 endpoints: `/preview`, `/export`, `/status/{id}`, `/download/{id}`, `/metadata` |
| **7** | Router Root Mount | [`BackEnd/app/api/v1/__init__.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/__init__.py) | L65 - L68 | Mount router vào prefix `/incident-export` |
| **8** | Backend Pytest (9 tests) | [`BackEnd/tests/incident_export/test_incident_export.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/incident_export/test_incident_export.py) | L1 - L293 | 9 bài test tự động bao phủ 100% logic |
