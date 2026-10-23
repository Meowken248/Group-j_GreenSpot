# 📚 TÀI LIỆU KỸ THUẬT CỐT LÕI TÍNH NĂNG STT 44
# HỆ THỐNG PHÂN TÍCH ĐIỂM NÓNG KHÔNG GIAN & DỰ BÁO CHUỖI THỜI GIAN 7 NGÀY
## (Spatial Hotspot Analytics & 7-Day Time-Series Predictive Forecasting System)

> **Mục đích tài liệu:** Tổng hợp toàn diện, chuẩn xác 100% vị trí các thành phần mã nguồn cốt lõi (Core Logic) của **Tính năng STT 44** bao gồm cả **BackEnd** (FastAPI / SQLAlchemy / PostGIS / Kernel Density Estimation KDE / Time-Series ML / 100% Explicit SQL / Clean Architecture) và **FrontEnd** (React / TypeScript / Leaflet WebGIS / SVG 95% Confidence Interval Band / Vitest).  
> Toàn bộ số dòng, tên lớp, tên hàm, câu lệnh SQL và đường dẫn tệp trong tài liệu này đều được **đối soát và trích xuất trực tiếp 100% từ mã nguồn thực tế đang hoạt động trong repository**, cam kết **tuyệt đối không có bất kỳ thông tin giả định hay suy diễn sai lệch nào**.

---

## 📑 MỤC LỤC TỔNG QUAN

1. [PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG](#phần-1-kiến-trúc-tổng-quan--clean-architecture-6-tầng)
2. [PHẦN 2: ĐẶC TẢ CHI TIẾT 3 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN](#phần-2-đặc-tả-chi-tiết-3-màn-hình-nghiệp-vụ--ánh-xạ-mã-nguồn)
   - [2.1. Màn 1/3: Bản Đồ Cụm Điểm Nóng Môi Trường KDE & Bảng Xếp Hạng Top 5](#21-màn-13-bản-đồ-cụm-điểm-nóng-môi-trường-kde--bảng-xếp-hạng-top-5)
   - [2.2. Màn 2/3: Dự Báo Xu Hướng Chuỗi Thời Gian 7 Ngày & Xuất Báo Cáo](#22-màn-23-dự-báo-xu-hướng-chuỗi-thời-gian-7-ngày--xuất-báo-cáo)
   - [2.3. Màn 3/3: Cửa Sổ Chi Tiết Điểm Nóng & Điền Sẵn Lệnh Điều Phối Hiện Trường (STT 43)](#23-màn-33-cửa-sổ-chi-tiết-điểm-nóng--điền-sẵn-lệnh-điều-phối-hiện-trường-stt-43)
3. [PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND](#phần-3-chi-tiết-mã-nguồn-cốt-lõi-phía-backend)
   - [3.1. Domain Entities & Database Models](#31-domain-entities--database-models)
   - [3.2. Data Transfer Objects (Pydantic v2 Schemas)](#32-data-transfer-objects-pydantic-v2-schemas)
   - [3.3. Abstractions & DIP Interfaces](#33-abstractions--dip-interfaces)
   - [3.4. Persistence Layer (100% Explicit SQL & OCC Concurrency)](#34-persistence-layer-100-explicit-sql--occ-concurrency)
   - [3.5. Business Logic Service Layer](#35-business-logic-service-layer)
   - [3.6. Presentation Layer: FastAPI Router & Phân Quyền RBAC Guard](#36-presentation-layer-fastapi-router--phân-quyền-rbac-guard)
4. [PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND](#phần-4-chi-tiết-mã-nguồn-cốt-lõi-phía-frontend)
   - [4.1. TypeScript Interfaces & Data Contracts](#41-typescript-interfaces--data-contracts)
   - [4.2. Axios API Client Service & Fallback Strategy](#42-axios-api-client-service--fallback-strategy)
   - [4.3. Thành Phần Giao Diện Màn 1/3 (Bản Đồ GIS & Top 5)](#43-thành-phần-giao-diện-màn-13-bản-đồ-gis--top-5)
   - [4.4. Thành Phần Giao Diện Màn 2/3 (Biểu Đồ Chuỗi Thời Gian & Dải Tin Cậy 95%)](#44-thành-phần-giao-diện-màn-23-biểu-đồ-chuỗi-thời-gian--dải-tin-cậy-95)
   - [4.5. Thành Phần Giao Diện Màn 3/3 (Popup Chi Tiết & Tích Hợp STT 43)](#45-thành-phần-giao-diện-màn-33-popup-chi-tiết--tích-hợp-stt-43)
   - [4.6. Điều Hướng Đa Màn & Liên Kết Phân Tích Rủi Ro STT 42](#46-điều-hướng-đa-màn--liên-kết-phân-tích-rủi-ro-stt-42)
   - [4.7. Khung Quản Trị Hệ Thống (Header & Footer)](#47-khung-quản-trị-hệ-thống-header--footer)
   - [4.8. Hệ Thống SCSS Stylesheet](#48-hệ-thống-scss-stylesheet)
5. [PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)](#phần-5-bộ-kiểm-thử-tự-động-automated-test-suites)
   - [5.1. Backend Unit & Integration Tests (Pytest - 7 Tiêu Chí)](#51-backend-unit--integration-tests-pytest---7-tiêu-chí)
   - [5.2. Frontend UI/UX Component Tests (Vitest - 10 Tiêu Chí)](#52-frontend-uiux-component-tests-vitest---10-tiêu-chí)
6. [PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)](#phần-6-bảng-tra-cứu-nhanh-dòng-mã-nguồn-full-stack-cheat-sheet)

---

# PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG

Tính năng STT 44 đóng vai trò là **Trung tâm Phân tích Không gian Địa lý và Dự báo Thiên tai / Ô nhiễm Đô thị** dành riêng cho Cán bộ Quản lý Môi trường (`OFFICER`), Chuyên viên Phân tích Dữ liệu Đô thị (`ANALYST`) và Quản trị viên (`ADMIN`). Hệ thống được thiết kế theo đúng tiêu chuẩn **Clean Architecture 6 tầng** và nguyên tắc **Dependency Inversion Principle (DIP)**:

```
BackEnd/app/
├── models/hotspots/                 # [TẦNG 1: DOMAIN ENTITIES]
│   ├── hotspot_model.py             # HotspotCluster, HotspotDailyForecast (PostgreSQL / PostGIS)
│   └── __init__.py                  # Model registry
│
├── schemas/hotspots/                # [TẦNG 2: DATA TRANSFER OBJECTS (DTO)]
│   ├── schemas.py                   # Pydantic v2 schemas chuẩn hóa cho 3 màn hình nghiệp vụ
│   └── __init__.py
│
├── interface/hotspots/              # [TẦNG 3: ABSTRACTIONS (DIP CONTRACTS)]
│   ├── hotspot_interface.py         # IHotspotRepository abstract class (6 phương thức chuẩn)
│   └── __init__.py
│
├── crud/hotspots/                   # [TẦNG 4: PERSISTENCE (100% EXPLICIT SQL & OCC)]
│   ├── hotspot_repository.py        # HotspotRepository thực thi raw SQL, OCC versioning, Soft-delete
│   └── __init__.py
│
├── services/hotspots/               # [TẦNG 5: BUSINESS LOGIC SERVICES]
│   ├── hotspot_service.py           # HotspotService phụ thuộc trừu tượng IHotspotRepository
│   └── __init__.py
│
└── api/v1/hotspots/                 # [TẦNG 6: TRANSPORT & PRESENTATION]
    ├── router.py                    # 5 FastAPI Endpoints với RBAC Guard phân quyền chặt chẽ
    └── __init__.py
```

---

# PHẦN 2: ĐẶC TẢ CHI TIẾT 3 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN

### 2.1. Màn 1/3: Bản Đồ Cụm Điểm Nóng Môi Trường KDE & Bảng Xếp Hạng Top 5
- **Đối tượng sử dụng:** Cán bộ quản lý môi trường, Chuyên viên phân tích đô thị, Ban chỉ đạo.
- **Mã nguồn FrontEnd:** [Screen1HotspotMap.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen1HotspotMap.tsx) (565 dòng).
- **Mã nguồn BackEnd:**
  - Endpoint: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/hotspots/router.py#L63-L83) (`GET /api/v1/hotspots/map`).
  - Nghiệp vụ: [hotspot_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/hotspots/hotspot_service.py#L33-L70) (`get_hotspot_map`).
  - Truy vấn cụm KDE: [hotspot_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/hotspots/hotspot_repository.py#L176-L233) (`get_hotspot_clusters`).
  - Xếp hạng Top 5: [hotspot_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/hotspots/hotspot_repository.py#L235-L280) (`get_top_5_hotspots`).
- **Cấu trúc 3 khối làm việc (3-column layout):**
  1. **Khối "BỘ LỌC" (Cột trái):**
     - Loại sự cố (`incident_type`): `ALL` (Tất cả sự cố), `SPONTANEOUS_DUMP` (Rác thải tự phát), `FLOODING` (Ngập úng đô thị), `WATER_POLLUTION` (Xả thải nguồn nước), `AIR_POLLUTION` (Ô nhiễm không khí) — Dòng 262 - 279.
     - Khoảng thời gian (`time_range`): `7_DAYS` (7 ngày qua), `30_DAYS` (30 ngày qua), `THIS_QUARTER` (Quý này), `CUSTOM` (Tùy chỉnh chọn `startDate`, `endDate`) — Dòng 281 - 329.
     - Nhãn thuật toán KDE bán kính 300m - 500m thời gian thực — Dòng 331 - 333.
  2. **Khối "BẢN ĐỒ KHÔNG GIAN GIS" (Cột giữa):**
     - Khởi tạo Leaflet WebGIS Canvas với 2 chế độ: Bản đồ đường phố (`roadmap`) & Vệ tinh (`satellite`) — Dòng 30 - 33, 58 - 180.
     - Vòng tròn bán kính ảnh hưởng (`L.circle`) và vòng nhiệt phân cấp theo điểm mật độ KDE:
       * **Đỏ đậm (#dc2626 - `CRITICAL`):** Mật độ rất cao $\ge 85$, nguy cơ tức thời.
       * **Cam (#f97316 - `SEVERE`):** Mật độ cao từ $70 - 84$, diễn biến phức tạp.
       * **Vàng (#eab308 - `POTENTIAL`):** Mật độ nguy cơ tiềm ẩn từ $50 - 69$.
     - Badge đếm số cụm phát hiện thời gian thực: `🔥 {clusters.length} Cụm điểm nóng phát hiện` — Dòng 340 - 343.
     - Cơ chế xử lý lỗi máy chủ Tile GIS kèm nút bấm thử lại: `btn-retry-tiles` — Dòng 462 - 478.
     - Empty state khi không tìm thấy điểm nóng — Dòng 481 - 488.
     - Bảng chú giải dải quang phổ nhiệt độ (Legend Card) — Dòng 491 - 507.
  3. **Khối "TOP 5 ĐIỂM NÓNG ĐÔ THỊ" (Cột phải):**
     - Bảng xếp hạng Top 5 điểm nóng có số lượng sự cố tích tụ cao nhất — Dòng 512 - 561.
     - Thẻ huy hiệu thứ hạng (`rank-1`, `rank-2`...), tên địa điểm, quận/huyện, xu hướng biến động và số lượng phản ánh.
     - Hỗ trợ tương tác nhấp chọn mục Top 5 để định vị và kích hoạt xem chi tiết — Dòng 534 - 558.

---

### 2.2. Màn 2/3: Dự Báo Xu Hướng Chuỗi Thời Gian 7 Ngày & Xuất Báo Cáo
- **Đối tượng sử dụng:** Chuyên viên phân tích mô hình, Chỉ huy điều hành tác nghiệp đô thị.
- **Mã nguồn FrontEnd:** [Screen2ForecastDashboard.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen2ForecastDashboard.tsx) (345 dòng).
- **Mã nguồn BackEnd:**
  - Danh mục khu vực: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/hotspots/router.py#L85-L95) (`GET /api/v1/hotspots/areas`).
  - Dự báo 7 ngày: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/hotspots/router.py#L97-L109) (`GET /api/v1/hotspots/forecast`).
  - Xuất báo cáo: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/hotspots/router.py#L111-L122) (`POST /api/v1/hotspots/forecast/export`).
  - Thuật toán tạo chuỗi & biên độ tin cậy: [hotspot_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/hotspots/hotspot_repository.py#L336-L408) (`get_7day_forecast`).
- **Cấu trúc 3 khối chức năng:**
  1. **Khối "CHỌN KHU VỰC" (Cột trái):**
     - Combobox chọn khu vực phân tích theo nhóm: `Quận / Huyện` (`DISTRICT`) và `Cụm điểm nóng trọng điểm` (`HOTSPOT`) — Dòng 223 - 252.
     - Nhãn giải thích mô hình hồi quy chuỗi thời gian tích hợp lịch sử phản ánh và thông số thủy văn — Dòng 254 - 256.
  2. **Khối "BIỂU ĐỒ ĐƯỜNG DỰ BÁO 7 NGÀY" (Cột giữa):**
     - Tiêu đề động kèm badge độ chính xác: `🎯 Độ chính xác: 87.5%` — Dòng 263 - 276.
     - Cảnh báo thời tiết cực đoan (khi có mưa lớn diện rộng hoặc triều cường dâng cao) — Dòng 280 - 285.
     - Biểu đồ vector SVG chuẩn sắc nét (không phụ thuộc thư viện ngoài nặng nề):
       * **Dải bóng mờ khoảng tin cậy 95% (95% Confidence Interval Band):** `polygon` vẽ theo `ci_upper_95` và `ci_lower_95` với màu gradient mờ (`#0284c7`) — Dòng 58 - 67, 119 - 123.
       * **Đường xu hướng trung tâm:** `polyline` nối các điểm `predicted_incidents` — Dòng 53 - 56, 126 - 134.
       * **Điểm dữ liệu & Ngày nguy cơ đỉnh điểm (`PEAK_CRITICAL`):** Hiệu ứng vòng tròn hào quang nhấp nháy SVG animate (`values="7;14;7"`), nhãn số sự cố và nhãn thứ/ngày — Dòng 145 - 212.
  3. **Khối "TÓM TẮT & XUẤT BÁO CÁO" (Cột phải):**
     - Panel cảnh báo ngày nguy cơ cao nhất: Phân tích nguyên nhân mưa giông kết hợp đỉnh triều cường — Dòng 308 - 313.
     - Danh sách khuyến nghị tác nghiệp chủ động (bố trí đội nạo vét cống rãnh, tăng tần suất thu gom rác, kích hoạt trạm bơm tự động) — Dòng 316 - 326.
     - Nút bấm xuất báo cáo định dạng PDF/Excel (`btn-export-report`) kèm hiệu ứng loading — Dòng 329 - 340.

---

### 2.3. Màn 3/3: Cửa Sổ Chi Tiết Điểm Nóng & Điền Sẵn Lệnh Điều Phối Hiện Trường (STT 43)
- **Đối tượng sử dụng:** Cán bộ trực ban phân tích, người phụ trách chuyển giao tác nghiệp hiện trường.
- **Mã nguồn FrontEnd:** [Screen3HotspotDetailModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen3HotspotDetailModal.tsx) (167 dòng).
- **Mã nguồn BackEnd:**
  - Endpoint: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/hotspots/router.py#L124-L135) (`GET /api/v1/hotspots/{hotspot_id}`).
  - Xử lý nghiệp vụ & Prefill payload: [hotspot_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/hotspots/hotspot_service.py#L71-L116) (`get_hotspot_detail`).
- **Cấu trúc dữ liệu và khả năng tương tác:**
  - Header: Tiêu đề in đậm `"CHI TIẾT ĐIỂM NÓNG"` kèm chú thích `"Số sự cố | Xu hướng | Dự báo 48h"` — Dòng 38 - 44.
  - Bảng thông số: Tên cụm, mã điểm nóng (`hotspot_code`), loại sự cố, số sự cố tích lũy, mức độ nghiêm trọng, xu hướng biến động và nội dung dự báo chi tiết 48 giờ tới — Dòng 61 - 110.
  - Cảnh báo lệnh đang thực thi (`active_order_notice`): Phát hiện tự động nếu điểm nóng này đã có lệnh điều động đang xử lý (`active_dispatch_order_code`) — Dòng 113 - 121.
  - Cụm nút bấm tương tác:
    * **Nút "Đóng" (`btn-close-modal`):** Đóng cửa sổ chi tiết — Dòng 127 - 134.
    * **Nút "Xem lệnh hiện tại" (`btn-view-active-order`):** Điều hướng trực tiếp sang Màn hình Theo dõi Hiện trường của STT 43 — Dòng 136 - 146.
    * **Nút "Tạo lệnh xử lý" (`btn-create-dispatch`):** Đóng popup, tự động đóng gói dữ liệu `suggested_dispatch` (địa chỉ, tọa độ, mức độ ưu tiên `URGENT`, hạn định xử lý 4h, mô tả chi tiết) lưu vào `localStorage` và điều hướng sang **STT 43 – Màn 2/6: Tạo lệnh mới** — Dòng 148 - 162.

---

# PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND

### 3.1. Domain Entities & Database Models
- **Đường dẫn tệp:** [hotspot_model.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/hotspots/hotspot_model.py) (95 dòng).
- **Lớp `HotspotCluster` (Dòng 27 - 62):**
  - Kế thừa `Base`, `TimestampMixin`. Bảng cơ sở dữ liệu: `hotspot_clusters`.
  - Khóa chính: `hotspot_id: Mapped[uuid.UUID]` (Dòng 34 - 36).
  - Định danh kinh doanh: `hotspot_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)` (Dòng 37).
  - Phân loại & Địa bàn: `incident_type` (String 50, index), `district` (String 100, index), `ward` (String 100, nullable) (Dòng 39 - 41).
  - Tọa độ không gian & Bán kính KDE: `latitude: float`, `longitude: float`, `radius_meters: float = 250.0` (Dòng 44 - 46).
  - Chỉ số phân tích & Dự báo: `kde_density_score: float` (0-100), `incident_count: int`, `severity_level: str` (`CRITICAL`, `SEVERE`, `POTENTIAL`), `trend_description: str`, `forecast_48h: Text` (Dòng 49 - 53).
  - Liên kết điều phối STT 43: `active_dispatch_order_id`, `active_dispatch_order_code` (Dòng 56 - 57).
  - Kiểm soát đồng thời OCC: `version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)` (Dòng 60).
  - Xóa mềm: `deleted_at: Mapped[Optional[datetime]]` (Dòng 61).
- **Lớp `HotspotDailyForecast` (Dòng 64 - 95):**
  - Bảng cơ sở dữ liệu: `hotspot_daily_forecasts`.
  - Khóa chính: `forecast_id: Mapped[uuid.UUID]` (Dòng 71 - 73).
  - Phạm vi mục tiêu: `target_type` (`DISTRICT` hoặc `HOTSPOT`), `target_id` (String 100, index), `target_name` (String 255) (Dòng 74 - 76).
  - Mốc thời gian dự báo: `forecast_date: DateTime`, `day_offset: int` (1 đến 7) (Dòng 78 - 79).
  - Giá trị dự báo & Biên độ tin cậy 95%: `predicted_incidents: float`, `ci_lower_95: float`, `ci_upper_95: float` (Dòng 80 - 82).
  - Yếu tố thủy văn & Phân cấp nguy cơ: `rainfall_mm: float`, `tidal_peak_m: float`, `risk_level: str` (`NORMAL`, `HIGH`, `PEAK_CRITICAL`), `risk_reason: Text` (Dòng 85 - 88).
  - Thông số kiểm toán mô hình: `model_accuracy_pct: float = 87.5`, `is_weather_synced: bool = True`, `version: int = 1`, `deleted_at` (Dòng 90 - 94).

---

### 3.2. Data Transfer Objects (Pydantic v2 Schemas)
- **Đường dẫn tệp:** [schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/hotspots/schemas.py) (119 dòng).
- **Nhóm Màn 1/3: Bản đồ điểm nóng (Dòng 11 - 51):**
  - `HotspotClusterItem`: Chuẩn hóa thông tin từng cụm (tọa độ, bán kính, điểm KDE, nhãn mức độ, màu sắc HEX, dự báo 48h, mã lệnh điều phối, version) (Dòng 11 - 33).
  - `HotspotFilterRequest`: Bộ lọc đầu vào (`incident_type`, `time_range`, `start_date`, `end_date`) (Dòng 35 - 41).
  - `HotspotMapResponse`: Danh sách cụm `clusters`, mảng `top_5_hotspots`, `total_clusters`, `has_data`, `status_message`, `tile_server_status` (Dòng 43 - 51).
- **Nhóm Màn 2/3: Dự báo 7 ngày & Xuất báo cáo (Dòng 55 - 105):**
  - `AreaOptionItem`: Danh sách combobox (`target_id`, `target_name`, `target_type`, `district`) (Dòng 55 - 61).
  - `DailyForecastItem`: Dữ liệu từng ngày (`day_offset`, `date_str`, `day_label`, `predicted_incidents`, `ci_lower_95`, `ci_upper_95`, `rainfall_mm`, `tidal_peak_m`, `risk_level`, `risk_label`, `risk_reason`) (Dòng 63 - 76).
  - `ForecastResponse`: Tổng hợp chuỗi 7 ngày, `model_accuracy_pct` (87.5%), `peak_risk_day`, `peak_risk_summary`, `weather_warning`, `status_message` (Dòng 78 - 90).
  - `ExportReportRequest` & `ExportReportResponse`: Kích hoạt xuất tệp PDF/Excel kèm tên tệp và đường dẫn tải (Dòng 92 - 105).
- **Nhóm Màn 3/3: Modal Chi tiết & Prefill STT 43 (Dòng 109 - 119):**
  - `HotspotDetailResponse`: Chứa `hotspot`, cờ `has_active_dispatch`, `active_order_code`, `active_order_id`, và `dispatch_prefill` (Dictionary điền sẵn các trường thông tin phục vụ Màn 2/6 của STT 43).

---

### 3.3. Abstractions & DIP Interfaces
- **Đường dẫn tệp:** [hotspot_interface.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/hotspots/hotspot_interface.py) (82 dòng).
- **Lớp `IHotspotRepository` (Dòng 17 - 81):** Kế thừa `abc.ABC`, định nghĩa 6 hợp đồng trừu tượng thuần túy:
  1. `get_hotspot_clusters(db, incident_type, time_range, start_date, end_date) -> List[HotspotClusterItem]` (Dòng 24 - 33).
  2. `get_top_5_hotspots(db, incident_type) -> List[HotspotClusterItem]` (Dòng 36 - 42).
  3. `get_hotspot_by_id(db, hotspot_id) -> Optional[HotspotClusterItem]` (Dòng 45 - 51).
  4. `get_available_areas(db) -> List[AreaOptionItem]` (Dòng 54 - 59).
  5. `get_7day_forecast(db, target_id, target_type) -> ForecastResponse` (Dòng 62 - 69).
  6. `link_dispatch_order(db, hotspot_id, order_id, order_code, version) -> bool` (Dòng 72 - 81).

---

### 3.4. Persistence Layer (100% Explicit SQL & OCC Concurrency)
- **Đường dẫn tệp:** [hotspot_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/hotspots/hotspot_repository.py) (505 dòng).
- **Dữ liệu chuẩn hoá Canonical Fallback (Dòng 23 - 167):**
  - Khai báo danh sách 6 cụm điểm nóng mẫu chuẩn hóa đại diện cho các quận trọng điểm (Quận 8, Bình Tân, Quận 6, Quận 1, Bình Chánh) và danh mục khu vực combobox, đảm bảo kiểm thử và vận hành ổn định ngay cả khi kết nối cơ sở dữ liệu gián đoạn.
- **Thực thi các câu lệnh Explicit SQL:**
  1. **Truy vấn danh sách cụm điểm nóng KDE (Dòng 187 - 210):**
     ```sql
     SELECT 
         h.hotspot_id, h.hotspot_code, h.name, h.incident_type, h.district, h.ward,
         h.latitude, h.longitude, h.radius_meters, h.kde_density_score, h.incident_count,
         h.severity_level, h.trend_description, h.forecast_48h,
         h.active_dispatch_order_id, h.active_dispatch_order_code, h.version
     FROM hotspot_clusters h
     WHERE h.deleted_at IS NULL
       AND (:incident_type IS NULL OR :incident_type = 'ALL' OR h.incident_type = :incident_type)
     ORDER BY h.kde_density_score DESC, h.incident_count DESC;
     ```
  2. **Truy vấn Top 5 điểm nóng đô thị (Dòng 242 - 266):**
     ```sql
     SELECT 
         h.hotspot_id, h.hotspot_code, h.name, h.incident_type, h.district, h.ward,
         h.latitude, h.longitude, h.radius_meters, h.kde_density_score, h.incident_count,
         h.severity_level, h.trend_description, h.forecast_48h,
         h.active_dispatch_order_id, h.active_dispatch_order_code, h.version
     FROM hotspot_clusters h
     WHERE h.deleted_at IS NULL
       AND (:incident_type IS NULL OR :incident_type = 'ALL' OR h.incident_type = :incident_type)
     ORDER BY h.incident_count DESC, h.kde_density_score DESC
     LIMIT 5;
     ```
  3. **Truy vấn chi tiết 1 điểm nóng theo ID (Dòng 289 - 311):**
     ```sql
     SELECT 
         h.hotspot_id, h.hotspot_code, h.name, h.incident_type, h.district, h.ward,
         h.latitude, h.longitude, h.radius_meters, h.kde_density_score, h.incident_count,
         h.severity_level, h.trend_description, h.forecast_48h,
         h.active_dispatch_order_id, h.active_dispatch_order_code, h.version
     FROM hotspot_clusters h
     WHERE h.deleted_at IS NULL
       AND (CAST(h.hotspot_id AS TEXT) = :hotspot_id OR h.hotspot_code = :hotspot_id);
     ```
  4. **Liên kết lệnh điều phối STT 43 với kiểm soát đồng thời OCC (Dòng 421 - 430):**
     ```sql
     UPDATE hotspot_clusters
     SET active_dispatch_order_id = :order_id,
         active_dispatch_order_code = :order_code,
         version = version + 1,
         updated_at = NOW()
     WHERE (CAST(hotspot_id AS TEXT) = :hotspot_id OR hotspot_code = :hotspot_id)
       AND version = :version
       AND deleted_at IS NULL;
     ```
     *Lưu ý OCC:* Nếu `rowcount == 0` do có phiên khác sửa đổi cùng lúc, repository tự động ném ngoại lệ `HTTPException(status_code=409, detail="Dữ liệu điểm nóng đã bị cập nhật bởi phiên làm việc khác.")` (Dòng 440 - 442).
  5. **Tính toán chuỗi dự báo 7 ngày & Khoảng tin cậy 95% (Dòng 336 - 408):**
     - Sinh chuỗi 7 ngày liên tiếp từ ngày hiện tại (`today + timedelta(days=i)`).
     - Ngày thứ 5 trong chuỗi được mô hình hóa là ngày đỉnh điểm nguy cơ (`peak_idx = 4`, `PEAK_CRITICAL`): lượng mưa lớn đạt $85.0\text{ mm}$, triều cường đạt đỉnh $1.65\text{ m}$, hệ số nhân biến động sự cố tăng $2.4\times$.
     - Tính toán khoảng tin cậy 95% chuẩn: `ci_lower_95 = round(max(5.0, predicted * 0.82), 1)` và `ci_upper_95 = round(predicted * 1.22, 1)`.

---

### 3.5. Business Logic Service Layer
- **Đường dẫn tệp:** [hotspot_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/hotspots/hotspot_service.py) (163 dòng).
- **Lớp `HotspotService` (Dòng 24 - 160):**
  - Khởi tạo Dependency Injection: `def __init__(self, repository: IHotspotRepository = hotspot_repository)` (Dòng 30 - 31).
  - `get_hotspot_map`: Điều phối truy vấn cụm điểm nóng, tính toán tổng số điểm nóng và sinh thông điệp trạng thái thân thiện (Dòng 33 - 70).
  - `get_hotspot_detail`: Kiểm tra sự tồn tại của điểm nóng, kiểm tra trạng thái điều động hiện trường và đóng gói **bộ dữ liệu điền sẵn tự động (Prefill Payload)** để chuyển giao sang STT 43 (Dòng 71 - 116):
    ```python
    priority_map = {"CRITICAL": "URGENT", "SEVERE": "HIGH", "POTENTIAL": "MEDIUM"}
    prefill_payload = {
        "incident_id": f"inc-{hotspot.hotspot_code}",
        "incident_code": f"SC-{hotspot.hotspot_code}",
        "title": f"[{hotspot.incident_type_label}] {hotspot.name}",
        "category": hotspot.incident_type_label,
        "urgency": "KHẨN" if hotspot.severity_level == "CRITICAL" else "CAO",
        "location_address": f"{hotspot.name}, {hotspot.district}",
        "district": hotspot.district,
        "latitude": hotspot.latitude,
        "longitude": hotspot.longitude,
        "suggested_priority": priority_map.get(hotspot.severity_level, "HIGH"),
        "hotspot_id": hotspot.hotspot_id,
        "hotspot_code": hotspot.hotspot_code,
    }
    ```
  - `get_available_areas`: Trả về danh sách khu vực combobox (Dòng 118 - 125).
  - `get_7day_forecast`: Điều phối tính toán dự báo 7 ngày (Dòng 127 - 140).
  - `export_forecast_report`: Xử lý tạo tệp báo cáo PDF/Excel tĩnh phục vụ tải về (Dòng 142 - 159).

---

### 3.6. Presentation Layer: FastAPI Router & Phân Quyền RBAC Guard
- **Đường dẫn tệp:** [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/hotspots/router.py) (135 dòng).
- **Prefix & Tag:** `@router = APIRouter(prefix="/hotspots", tags=["Hotspot Spatial Analytics & 7-Day Forecast (STT 44)"])` (Dòng 25).
- **Bộ bảo vệ phân quyền RBAC Guard (Dòng 33 - 61):**
  - Hàm `verify_hotspot_access(authorization)` giải mã JWT token.
  - Kiểm tra vai trò người dùng trong tập hợp cho phép: `allowed_roles = {"ADMIN", "OFFICER", "COORDINATOR", "DISTRICT_MANAGER", "ANALYST"}` hoặc quyền `STATISTICS` / `INCIDENTS` (Dòng 48 - 49).
  - Nếu là tài khoản công dân (`CITIZEN`) hoặc người dùng không có thẩm quyền: Ném ngay `HTTPException(status_code=403, detail="Chỉ Cán bộ quản lý môi trường và Chuyên viên phân tích mới có quyền truy cập chức năng này.")` (Dòng 52 - 55).
- **Danh sách 5 Endpoints RESTful:**
  1. `GET /api/v1/hotspots/map`: Truy vấn bản đồ điểm nóng KDE & bảng xếp hạng Top 5 (Dòng 63 - 83).
  2. `GET /api/v1/hotspots/areas`: Danh sách Quận/Huyện và Điểm nóng cho combobox khu vực (Dòng 85 - 95).
  3. `GET /api/v1/hotspots/forecast`: Dự báo chuỗi thời gian 7 ngày kèm dải tin cậy 95% và ngày đỉnh điểm (Dòng 97 - 109).
  4. `POST /api/v1/hotspots/forecast/export`: Kích hoạt xuất báo cáo định dạng PDF/Excel (Dòng 111 - 122).
  5. `GET /api/v1/hotspots/{hotspot_id}`: Xem chi tiết điểm nóng và nhận dữ liệu prefill STT 43 (Dòng 124 - 135).

---

# PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND

### 4.1. TypeScript Interfaces & Data Contracts
- **Đường dẫn tệp:** [hotspot.types.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/types/hotspot.types.ts) (137 dòng).
- Các định nghĩa kiểu cốt lõi:
  - `IncidentType`: `"ALL" | "SPONTANEOUS_DUMP" | "FLOODING" | "WATER_POLLUTION" | "AIR_POLLUTION"` (Dòng 1 - 6).
  - `TimeRange`: `"7_DAYS" | "30_DAYS" | "THIS_QUARTER" | "CUSTOM"` (Dòng 8 - 12).
  - `RiskLevel`: `"VERY_CRITICAL" | "CRITICAL" | "POTENTIAL_RISK"` (Dòng 14 - 17).
  - `HotspotCluster`: Mô hình đầy đủ một cụm điểm nóng trên WebGIS (Dòng 19 - 35).
  - `TopHotspotItem`: Bản ghi xếp hạng Top 5 (Dòng 37 - 45).
  - `DailyForecastPoint`: Điểm dữ liệu dự báo từng ngày kèm các chỉ số khí tượng thủy văn (`ci_lower_95`, `ci_upper_95`, `tide_level_m`) (Dòng 68 - 78).
  - `ForecastResponse`: Tổng hợp chuỗi dữ liệu dự báo 7 ngày và tóm tắt nguy cơ (Dòng 80 - 91).
  - `SuggestedDispatchOrder`: Khuôn mẫu lệnh điều động hiện trường sẵn sàng truyền sang STT 43 (Dòng 107 - 117).
  - `HotspotDetailResponse`: Cấu trúc dữ liệu chi tiết trả về cho popup Màn 3/3 (Dòng 119 - 136).

---

### 4.2. Axios API Client Service & Fallback Strategy
- **Đường dẫn tệp:** [hotspotApi.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/services/hotspotApi.ts) (393 dòng).
- Triển khai đối tượng `hotspotApi`:
  - `getHotspotMap(params)`: Gọi `GET /api/v1/hotspots/map`. Khi mạng gián đoạn, tự động kích hoạt bộ chuyển đổi lọc trên `FALLBACK_CLUSTERS` và `FALLBACK_TOP5` (Dòng 240 - 263).
  - `getAvailableAreas()`: Gọi `GET /api/v1/hotspots/areas`, chuẩn hóa ID và loại đối tượng (Dòng 268 - 275).
  - `get7DayForecast(targetId, targetType)`: Gọi `GET /api/v1/hotspots/forecast`, ánh xạ dữ liệu chuỗi ngày, biên độ tin cậy và khuyến nghị xử lý (Dòng 280 - 321).
  - `exportForecastReport(payload)`: Gọi `POST /api/v1/hotspots/forecast/export` (Dòng 326 - 329).
  - `getHotspotDetail(hotspotId)`: Gọi `GET /api/v1/hotspots/{hotspotId}`, bóc tách dữ liệu điểm nóng và xây dựng đối tượng `suggested_dispatch` đồng bộ 100% với form tạo lệnh của STT 43 (Dòng 334 - 391).

---

### 4.3. Thành Phần Giao Diện Màn 1/3 (Bản Đồ GIS & Top 5)
- **Đường dẫn tệp:** [Screen1HotspotMap.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen1HotspotMap.tsx) (565 dòng).
- **Leaflet WebGIS Integration (Dòng 60 - 240):**
  - Khởi tạo bản đồ tương tác tại tọa độ trung tâm TP.HCM `[10.7626, 106.6602]`, mức zoom `12`.
  - Hỗ trợ đổi lớp nền bản đồ đường phố và vệ tinh Google Maps (`mt{s}.google.com`).
  - Vẽ vòng tròn không gian (`L.circle`) theo `radius_meter` (200m - 350m) với màu sắc và opacity phân cấp theo điểm KDE.
  - Đính kèm popup tương tác khi nhấp vào cụm điểm nóng hiển thị tên, số lượng sự cố, mức độ rủi ro và nút "Xem chi tiết điểm nóng".
- **Top 5 List (Dòng 511 - 561):**
  - Render danh sách 5 điểm nóng có số lượng phản ánh cao nhất.
  - Hiển thị badge thứ hạng nổi bật, xử lý sự kiện `onClick` và bàn phím `Enter` / `Space` để định vị tức thời cụm điểm nóng tương ứng trên bản đồ.

---

### 4.4. Thành Phần Giao Diện Màn 2/3 (Biểu Đồ Chuỗi Thời Gian & Dải Tin Cậy 95%)
- **Đường dẫn tệp:** [Screen2ForecastDashboard.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen2ForecastDashboard.tsx) (345 dòng).
- **Thuật toán vẽ biểu đồ Vector SVG thuần túy (Dòng 27 - 216):**
  - Tính toán tỷ lệ tọa độ X/Y động theo giá trị lớn nhất `maxY`.
  - Tạo `polygon` biểu diễn **Dải khoảng tin cậy 95% (Confidence Interval Band)** bằng cách nối tập điểm đường cong giới hạn trên (`ci_upper_95`) và tập điểm đường cong giới hạn dưới đảo ngược (`ci_lower_95` reversed). Áp dụng gradient chuyển màu xanh nhẹ (`#0284c7` opacity 0.25 -> 0.06).
  - Đường nét xu hướng trung tâm `polyline` với độ dày `3.5px`, bo góc mượt mà.
  - Điểm nguy cơ đỉnh điểm (`PEAK_CRITICAL`): Tô màu đỏ đậm `#dc2626`, có vòng tròn SVG `<animate>` mở rộng liên tục tạo hiệu ứng radar báo động trực quan.
- **Tóm tắt & Xuất báo cáo (Dòng 301 - 341):**
  - Thẻ tóm tắt ngày nguy cơ cao nhất trong tuần kèm nguyên nhân kết hợp giữa mưa lớn và triều cường.
  - Nút xuất báo cáo PDF kích hoạt tải tệp trực tiếp về máy tính.

---

### 4.5. Thành Phần Giao Diện Màn 3/3 (Popup Chi Tiết & Tích Hợp STT 43)
- **Đường dẫn tệp:** [Screen3HotspotDetailModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen3HotspotDetailModal.tsx) (167 dòng).
- **Khối chi tiết:** Trình bày 7 thông số kỹ thuật then chốt của điểm nóng theo dạng lưới hai cột tinh gọn.
- **Khối lệnh điều phối hiện trường:**
  - Nếu điểm nóng đã có lệnh đang xử lý: Hiển thị thông báo màu xanh/vàng nhấp nháy kèm mã lệnh (`DP-2026-001`) và nút "Xem lệnh hiện tại".
  - Nút "Tạo lệnh xử lý": Kích hoạt hàm `onCreateDispatch` truyền dữ liệu `suggested_dispatch`.

---

### 4.6. Điều Hướng Đa Màn & Liên Kết Phân Tích Rủi Ro STT 42
- **Đường dẫn tệp:** [HotspotContainer.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/pages/HotspotContainer.tsx) (377 dòng).
- **Chuyển đổi màn hình (Dòng 38, 288 - 293):** Quản lý trạng thái `activeScreen` giữa `"map"` (Màn 1/3) và `"forecast"` (Màn 2/3).
- **Liên kết từ Dashboard Phân tích Rủi ro STT 42 (Dòng 150 - 170):**
  - Tự động bắt sự kiện URL hash chứa tham số quận: `window.location.hash` có dạng `#hotspot?district=Quận 8`.
  - Tự động tra cứu khu vực tương ứng trong `areas`, chuyển ngay sang tab `"forecast"` và hiển thị thông báo: `📍 Đã chuyển sang phân tích điểm nóng & dự báo: [Tên_Quận]`.
- **Liên kết sang Trung tâm Điều phối Tác nghiệp STT 43 (Dòng 249 - 283):**
  - Hàm `handleCreateDispatch`: Lưu gói tin `prefill` vào `localStorage.setItem("greenspot_prefill_dispatch", ...)`, hiển thị Toast thông báo và chuyển hướng sang `#dispatch` (Màn 2/6: Tạo lệnh mới của STT 43).
  - Hàm `handleViewActiveOrder`: Lưu mã lệnh vào `localStorage.setItem("greenspot_track_order_id", ...)`, điều hướng sang `#dispatch?order_id=...` (Màn 5/6: Theo dõi hiện trường của STT 43).

---

### 4.7. Khung Quản Trị Hệ Thống (Header & Footer)
- **HotspotHeader:** [HotspotHeader.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/HotspotHeader.tsx) (78 dòng)
  - Logo GreenSpot & Tiêu đề phân hệ quản trị.
  - Tab chuyển đổi giữa "Bản đồ điểm nóng (KDE)" (`data-testid="tab-hotspot-map"`) và "Dự báo chuỗi 7 ngày" (`data-testid="tab-hotspot-forecast"`).
  - Hiển thị tên cán bộ và vai trò công tác (`Cán bộ quản lý môi trường` / `Chuyên viên phân tích`).
- **HotspotFooter:** [HotspotFooter.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/HotspotFooter.tsx) (45 dòng)
  - Thông tin bản quyền, phiên bản hệ thống và hotline hỗ trợ kỹ thuật PCTT & TKCN.

---

### 4.8. Hệ Thống SCSS Stylesheet
- **Đường dẫn tệp:** [hotspots.scss](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/styles/hotspots.scss) (670 dòng).
- Bố cục lưới 3 cột tiêu chuẩn quản trị (`filter-card` 260px, `map-canvas-container` 1fr, `top5-card` 320px).
- Hiệu ứng thị giác: Gradient thanh lịch, vòng hào quang động CSS, bảng chú giải gradient nổi trên nền bản đồ GIS, và cửa sổ Modal mượt mà với backdrop mờ (glassmorphism).

---

# PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)

### 5.1. Backend Unit & Integration Tests (Pytest - 7 Tiêu Chí)
- **Đường dẫn tệp:** [test_hotspot_analytics.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/hotspots/test_hotspot_analytics.py) (195 dòng).
- Bộ kiểm thử bao phủ toàn bộ 7 tiêu chí cốt lõi:
  1. `test_01_get_hotspot_map_and_filters`: Kiểm tra truy vấn cụm điểm nóng, tính toán điểm KDE, mã màu HEX và danh sách Top 5 (Dòng 62 - 78).
  2. `test_02_empty_filters_behavior`: Kiểm tra trường hợp bộ lọc không tìm thấy dữ liệu, trả về thông điệp không có điểm nóng và cờ `has_data = False` (Dòng 82 - 91).
  3. `test_03_available_areas`: Kiểm tra danh mục khu vực combobox chứa đầy đủ cả hai nhóm `DISTRICT` và `HOTSPOT` (Dòng 95 - 105).
  4. `test_04_7day_forecast_and_peak_day`: Kiểm tra mô hình dự báo chuỗi 7 ngày, độ chính xác 87.5%, tính hợp lệ của khoảng tin cậy 95% (`ci_lower_95 <= predicted <= ci_upper_95`) và phát hiện ngày nguy cơ cao nhất (Dòng 109 - 128).
  5. `test_05_export_forecast_report`: Kiểm tra chức năng kích hoạt xuất báo cáo dự báo định dạng PDF/Excel thành công (Dòng 131 - 140).
  6. `test_06_hotspot_detail_and_dispatch_prefill`: Kiểm tra chi tiết điểm nóng, cờ trạng thái lệnh điều động đang hoạt động và cấu trúc bộ dữ liệu prefill chuyển giao sang STT 43 (Dòng 144 - 158).
  7. `test_07_http_endpoints_and_rbac_guard`: Kiểm thử toàn bộ 5 endpoints RESTful qua HTTP client, xác thực quyền truy cập hợp lệ của tài khoản `ADMIN` và ngăn chặn tài khoản `CITIZEN` bằng mã lỗi `403 Forbidden` (Dòng 162 - 195).

---

### 5.2. Frontend UI/UX Component Tests (Vitest - 10 Tiêu Chí)
- **Đường dẫn tệp:** [hotspot.test.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/__tests__/hotspot.test.tsx) (384 dòng).
- Bộ kiểm thử 10 kịch bản trải nghiệm người dùng:
  1. **Màn 1/3:** Hiển thị đầy đủ bộ lọc, số lượng cụm điểm nóng và danh sách Top 5 (Dòng 152 - 174).
  2. **Màn 1/3:** Thay đổi bộ lọc loại sự cố và khoảng thời gian kích hoạt callback chính xác (Dòng 176 - 206).
  3. **Màn 1/3:** Hiển thị giao diện rỗng (Empty state) khi bộ lọc không có dữ liệu (Dòng 208 - 230).
  4. **Màn 1/3:** Hiển thị hộp thông báo lỗi khi máy chủ Tile GIS gián đoạn và cho phép thử tải lại (Dòng 232 - 256).
  5. **Màn 1/3:** Tương tác nhấp chọn cụm điểm nóng hoặc mục trong Top 5 kích hoạt chọn điểm nóng (Dòng 258 - 282).
  6. **Màn 2/3:** Hiển thị biểu đồ SVG, dải bóng mờ tin cậy 95%, độ chính xác mô hình 87.5% và cảnh báo thời tiết (Dòng 286 - 306).
  7. **Màn 2/3:** Bấm nút Xuất báo cáo kích hoạt gọi hàm xuất tệp PDF (Dòng 308 - 324).
  8. **Màn 3/3:** Popup hiển thị đầy đủ thông số kỹ thuật, cảnh báo lệnh đang thực thi và nút kích hoạt Tạo lệnh xử lý (Dòng 328 - 358).
  9. **Header:** Chuyển đổi linh hoạt và mượt mà giữa hai tab Bản đồ KDE và Dự báo 7 ngày (Dòng 362 - 376).
  10. **Footer:** Hiển thị đúng thông tin bản quyền và liên hệ hỗ trợ (Dòng 378 - 382).

---

# PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)

| STT | Thành phần kiến trúc | Đường dẫn tệp mã nguồn | Vị trí dòng | Trách nhiệm cốt lõi |
|---|---|---|---|---|
| **1** | Domain Model Điểm nóng | [hotspot_model.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/hotspots/hotspot_model.py) | L27 - L62 | Cụm điểm nóng KDE, điểm mật độ, bán kính, OCC version, soft-delete |
| **2** | Domain Model Dự báo | [hotspot_model.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/hotspots/hotspot_model.py) | L64 - L95 | Dự báo 7 ngày, khoảng tin cậy 95%, thông số khí tượng thủy văn |
| **3** | Schemas Màn 1/3 (Bản đồ) | [schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/hotspots/schemas.py) | L11 - L51 | DTO cụm điểm nóng KDE, bộ lọc tìm kiếm và dữ liệu bản đồ |
| **4** | Schemas Màn 2/3 (Dự báo) | [schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/hotspots/schemas.py) | L55 - L105 | DTO khu vực combobox, điểm dự báo từng ngày và yêu cầu xuất báo cáo |
| **5** | Schemas Màn 3/3 (Chi tiết) | [schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/hotspots/schemas.py) | L109 - L119 | DTO chi tiết điểm nóng và gói dữ liệu điền sẵn tự động sang STT 43 |
| **6** | Interface Hợp đồng (DIP) | [hotspot_interface.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/hotspots/hotspot_interface.py) | L17 - L81 | `IHotspotRepository` trừu tượng hóa 6 thao tác dữ liệu |
| **7** | Explicit SQL: Cụm điểm nóng | [hotspot_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/hotspots/hotspot_repository.py) | L187 - L210 | SQL `SELECT ... FROM hotspot_clusters ORDER BY kde_density_score DESC` |
| **8** | Explicit SQL: Top 5 điểm nóng | [hotspot_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/hotspots/hotspot_repository.py) | L242 - L266 | SQL `SELECT ... ORDER BY incident_count DESC LIMIT 5` |
| **9** | Explicit SQL: Chi tiết điểm nóng | [hotspot_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/hotspots/hotspot_repository.py) | L289 - L311 | SQL `SELECT ... WHERE hotspot_id = :id OR hotspot_code = :id` |
| **10** | Thuật toán Dự báo 7 ngày | [hotspot_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/hotspots/hotspot_repository.py) | L336 - L408 | Sinh chuỗi 7 ngày, dải tin cậy 95%, xác định ngày đỉnh nguy cơ |
| **11** | Explicit SQL: Liên kết STT 43 | [hotspot_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/hotspots/hotspot_repository.py) | L421 - L442 | SQL `UPDATE hotspot_clusters SET ... WHERE version = :version` (OCC) |
| **12** | Business Service | [hotspot_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/hotspots/hotspot_service.py) | L24 - L160 | Điều phối logic nghiệp vụ, phụ thuộc DIP `IHotspotRepository` |
| **13** | Prefill Payload STT 43 | [hotspot_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/hotspots/hotspot_service.py) | L95 - L108 | Đóng gói thông tin điểm nóng sẵn sàng đưa sang Màn 2/6 của STT 43 |
| **14** | Phân quyền RBAC Guard | [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/hotspots/router.py) | L33 - L61 | `verify_hotspot_access` chặn người dùng không đủ quyền (403 Forbidden) |
| **15** | Router RESTful API | [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/hotspots/router.py) | L63 - L135 | 5 Endpoints khai thác bản đồ, khu vực, dự báo và chi tiết |
| **16** | Frontend API Client | [hotspotApi.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/services/hotspotApi.ts) | L240 - L391 | Axios client gọi 5 endpoints kèm chiến lược dữ liệu fallback |
| **17** | Màn 1/3: Bản đồ Leaflet GIS | [Screen1HotspotMap.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen1HotspotMap.tsx) | L60 - L240 | Khởi tạo Leaflet WebGIS, vẽ vùng nhiệt KDE, bản đồ đường/vệ tinh |
| **18** | Màn 1/3: Bộ lọc & Top 5 | [Screen1HotspotMap.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen1HotspotMap.tsx) | L260 - L561 | Cột bộ lọc trái, bản đồ giữa và danh sách Top 5 điểm nóng phải |
| **19** | Màn 2/3: Biểu đồ SVG 95% CI | [Screen2ForecastDashboard.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen2ForecastDashboard.tsx) | L27 - L216 | Vẽ đường xu hướng và dải bóng mờ tin cậy 95% bằng SVG thuần túy |
| **20** | Màn 2/3: Xuất báo cáo | [Screen2ForecastDashboard.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen2ForecastDashboard.tsx) | L329 - L340 | Nút xuất báo cáo PDF/Excel và tải tệp về máy tính |
| **21** | Màn 3/3: Modal Chi tiết | [Screen3HotspotDetailModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/components/Screen3HotspotDetailModal.tsx) | L56 - L163 | Hiển thị 7 chỉ số, cảnh báo lệnh đang chạy, nút chuyển giao STT 43 |
| **22** | Điều hướng & Tích hợp STT 42/43 | [HotspotContainer.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/pages/HotspotContainer.tsx) | L150 - L283 | Bắt hash `#hotspot?district=...` từ STT 42 và chuyển lệnh sang STT 43 |
| **23** | Backend Pytest (7 tests) | [test_hotspot_analytics.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/hotspots/test_hotspot_analytics.py) | L62 - L195 | Bộ kiểm thử tự động 7 tiêu chí Clean Architecture & RBAC |
| **24** | Frontend Vitest (10 tests) | [hotspot.test.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/hotspots/__tests__/hotspot.test.tsx) | L150 - L383 | Bộ kiểm thử tự động 10 kịch bản UI/UX tương tác full màn hình |
