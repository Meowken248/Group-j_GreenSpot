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
