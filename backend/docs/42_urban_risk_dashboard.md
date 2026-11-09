# 📚 TÀI LIỆU KỸ THUẬT CỐT LÕI TÍNH NĂNG STT 42
# DASHBOARD PHÂN TÍCH RỦI RO ĐÔ THỊ DÀNH CHO LÃNH ĐẠO & BAN CHỈ HUY PCTT
## (Urban Environmental Risk Executive Analytics Dashboard)

> **Mục đích tài liệu:** Tổng hợp toàn diện, chuẩn xác 100% vị trí các thành phần mã nguồn cốt lõi (Core Logic) của **Tính năng STT 42** bao gồm cả **BackEnd** (FastAPI / SQLAlchemy / PostGIS / 100% Explicit SQL / Optimistic Concurrency Control OCC / Clean Architecture) và **FrontEnd** (React / TypeScript / Bar Chart 22 Quận + Thủ Đức / Trend Line Chart / Donut Chart / Popup Modal / Vitest).  
> Toàn bộ số dòng, tên lớp, tên hàm, câu lệnh SQL và đường dẫn tệp trong tài liệu này đều được **đối soát và trích xuất trực tiếp 100% từ mã nguồn thực tế đang hoạt động trong repository**, cam kết **tuyệt đối không có bất kỳ thông tin giả định hay suy diễn sai lệch nào**.

---

## 📑 MỤC LỤC TỔNG QUAN

1. [PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG](#phần-1-kiến-trúc-tổng-quan--clean-architecture-6-tầng)
2. [PHẦN 2: ĐẶC TẢ CHI TIẾT 3 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN](#phần-2-đặc-tả-chi-tiết-3-màn-hình-nghiệp-vụ--ánh-xạ-mã-nguồn)
   - [2.1.  Dashboard Tổng Quan Rủi Ro Đô Thị Toàn Thành Phố (3 Khối: CHỈ SỐ, BIỂU ĐỒ, CẢNH BÁO)](#21-màn-13-dashboard-tổng-quan-rủi-ro-đô-thị-toàn-thành-phố-3-khối-chỉ-số-biểu-đồ-cảnh-báo)
   - [2.2.  Lọc & Phân Tích Chuyên Sâu Theo Địa Bàn & Loại Rủi Ro (3 Khối: BỘ LỌC, KẾT QUẢ, SO SÁNH)](#22-màn-23-lọc--phân-tích-chuyên-sâu-theo-địa-bàn--loại-rủi-ro-3-khối-bộ-lọc-kết-quả-so-sánh)
   - [2.3.  Popup Chi Tiết Quận & Lối Tắt Điều Hướng Bản Đồ GIS (STT 33 / STT 44 / STT 43)](#23-màn-33-popup-chi-tiết-quận--lối-tắt-điều-hướng-bản-đồ-gis-stt-33--stt-44--stt-43)
3. [PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND](#phần-3-chi-tiết-mã-nguồn-cốt-lõi-phía-backend)
   - [3.1. Domain Entities & Database Models](#31-domain-entities--database-models)
   - [3.2. Data Transfer Objects (Pydantic v2 Schemas)](#32-data-transfer-objects-pydantic-v2-schemas)
   - [3.3. Abstractions & DIP Interfaces](#33-abstractions--dip-interfaces)
   - [3.4. Persistence Layer (100% Explicit SQL & OCC Concurrency)](#34-persistence-layer-100-explicit-sql--occ-concurrency)
   - [3.5. Business Logic Service Layer](#35-business-logic-service-layer)
   - [3.6. Presentation Layer: FastAPI Router & Phân Quyền RBAC Guard](#36-presentation-layer-fastapi-router--phân-quyền-rbac-guard)
4. [PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND](#phần-4-chi-tiết-mã-nguồn-cốt-lõi-phía-frontend)
   - [4.1. TypeScript Interfaces & Data Contracts](#41-typescript-interfaces--data-contracts)
   - [4.2. Axios API Client Service](#42-axios-api-client-service)
   - [4.3. Thành Phần Giao Diện Màn 1/3 (Screen1Overview, BarChart, TrendLineChart)](#43-thành-phần-giao-diện-màn-13-screen1overview-barchart-trendlinechart)
   - [4.4. Thành Phần Giao Diện Màn 2/3 (Screen2Analysis, DonutPieChart)](#44-thành-phần-giao-diện-màn-23-screen2analysis-donutpiechart)
   - [4.5. Thành Phần Giao Diện Màn 3/3 (Screen3DistrictPopup)](#45-thành-phần-giao-diện-màn-33-screen3districtpopup)
   - [4.6. Khung Quản Trị Hệ Thống (ExecutiveHeader & ExecutiveFooter)](#46-khung-quản-trị-hệ-thống-executiveheader--executivefooter)
   - [4.7. Điều Hướng Liên Phân Hệ (STT 44 Điểm Nóng & STT 43 Điều Phối)](#47-điều-hướng-liên-phân-hệ-stt-44-điểm-nóng--stt-43-điều-phối)
   - [4.8. Hệ Thống SCSS Stylesheet](#48-hệ-thống-scss-stylesheet)
5. [PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)](#phần-5-bộ-kiểm-thử-tự-động-automated-test-suites)
   - [5.1. Backend Unit & Integration Tests (Pytest - 7 Tiêu Chí)](#51-backend-unit--integration-tests-pytest---7-tiêu-chí)
   - [5.2. Frontend UI/UX Component Tests (Vitest - 5 Tiêu Chí)](#52-frontend-uiux-component-tests-vitest---5-tiêu-chí)
6. [PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)](#phần-6-bảng-tra-cứu-nhanh-dòng-mã-nguồn-full-stack-cheat-sheet)

---

# PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG

Tính năng STT 42 đóng vai trò là **Dashboard Phân tích Rủi ro Đô thị Cấp Lãnh đạo (Executive Urban Environmental Risk Dashboard)** dành riêng cho Lãnh đạo UBND Thành phố, Lãnh đạo Sở Tài nguyên & Môi trường, Ban Chỉ huy Phòng chống thiên tai & Tìm kiếm cứu nạn (`ADMIN`, `OFFICER`, `DISTRICT_MANAGER`, `COORDINATOR`). Hệ thống được thiết kế theo chuẩn mực **Clean Architecture 6 tầng** và nguyên tắc **Dependency Inversion Principle (DIP)**:

```
BackEnd/app/
├── models/risk_dashboard/           # [TẦNG 1: DOMAIN ENTITIES]
│   ├── risk_snapshot.py             # DistrictRiskSnapshot (Chỉ số 22 quận/huyện, OCC version, soft-delete)
│   └── __init__.py                  # Model registry export
│
├── schemas/risk_dashboard/          # [TẦNG 2: DATA TRANSFER OBJECTS (DTO)]
│   ├── schemas.py                   # Pydantic v2 schemas chuẩn hóa cho 3 màn hình nghiệp vụ
│   └── __init__.py
│
├── interface/risk_dashboard/        # [TẦNG 3: ABSTRACTIONS (DIP CONTRACTS)]
│   ├── risk_dashboard_interface.py  # IRiskDashboardRepository trừu tượng hóa 6 nghiệp vụ truy xuất
│   └── __init__.py
│
├── crud/risk_dashboard/             # [TẦNG 4: PERSISTENCE (100% EXPLICIT SQL & OCC)]
│   ├── risk_dashboard_repository.py # RiskDashboardRepository thực thi raw SQL text(...), baseline 22 quận
│   └── __init__.py
│
├── services/risk_dashboard/         # [TẦNG 5: BUSINESS LOGIC SERVICES]
│   ├── risk_dashboard_service.py    # RiskDashboardService tính ngưỡng > 80, bóc tách chu kỳ, so sánh %
│   └── __init__.py
│
└── api/v1/risk_dashboard/           # [TẦNG 6: TRANSPORT & PRESENTATION]
    ├── router.py                    # 5 FastAPI Endpoints bảo vệ phân quyền RBAC Guard
    └── __init__.py
```

---

# PHẦN 2: ĐẶC TẢ CHI TIẾT 3 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN

### 2.1.  Dashboard Tổng Quan Rủi Ro Đô Thị Toàn Thành Phố (3 Khối: CHỈ SỐ, BIỂU ĐỒ, CẢNH BÁO)
- **Đối tượng sử dụng:** Lãnh đạo Sở, Ban Giám đốc, Ban Chỉ huy PCTT & TKCN.
- **Mã nguồn FrontEnd:** [Screen1Overview.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/Screen1Overview.tsx) (157 dòng).
- **Mã nguồn BackEnd:**
  - Endpoint: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/risk_dashboard/router.py#L75-L95) (`GET /api/v1/risk-dashboard/overview`).
  - Logic dịch vụ: [risk_dashboard_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/risk_dashboard/risk_dashboard_service.py#L35-L91) (`get_overview_dashboard`).
  - Explicit SQL: [risk_dashboard_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py#L43-L104) (`get_citywide_overview_metrics`), [L106-L181](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py#L106-L181) (`get_district_risk_rankings`), [L183-L234](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py#L183-L234) (`get_30_day_risk_trends`).
- **Cấu trúc 3 khối làm việc ngang (3-column layout):**
  1. **Khối "CHỈ SỐ" (Cột trái):**
     - Thẻ 1: **Điểm rủi ro chung đô thị:** Hiển thị thang điểm $0 - 100$ (VD: `58/100`), nhãn diễn giải (`"Mức rủi ro trung bình"`), hiệu ứng nhấp nháy đỏ (`danger-pulsing`) khi có cảnh báo khẩn cấp — Dòng 31–38.
     - Thẻ 2: **Khu vực nguy cơ cao:** Số lượng quận/huyện nằm trong mức báo động Cam ($\ge 60$) hoặc Đỏ ($> 80$) (VD: `4 quận/huyện`) — Dòng 41–48.
     - Thẻ 3: **Sự cố đang mở:** Tổng số bãi rác tự phát và điểm ngập úng chưa xử lý dứt điểm trên toàn thành phố (VD: `128 vụ việc`) — Dòng 51–58.
  2. **Khối "BIỂU ĐỒ" (Cột giữa):**
     - **Biểu đồ cột (Bar Chart):** Hiển thị xếp hạng điểm rủi ro môi trường của toàn bộ 22 quận/huyện và TP. Thủ Đức. Đường ngưỡng cảnh báo đỏ nét đứt tại mốc $80\text{ điểm}$ (`Ngưỡng khẩn cấp: > 80`). Các cột quận vượt ngưỡng được tô màu đỏ `#ef4444`, mức cao màu cam `#f59e0b`, trung bình màu vàng `#eab308` — Dòng 74–82.
     - **Biểu đồ đường (Trend Line Chart):** Đường biểu diễn xu hướng chỉ số rủi ro môi trường và số lượng sự cố tích tụ trong 30 ngày gần nhất — Dòng 85–90.
  3. **Khối "CẢNH BÁO" (Cột phải):**
     - Bảng xếp hạng Top 5 khu vực khẩn cấp nhất: Badge thứ tự ($1 \to 5$), tên quận (Quận Bình Tân, Quận 8, Huyện Hóc Môn, TP. Thủ Đức, Quận Bình Thạnh), số lượng bãi rác và điểm ngập, huy hiệu điểm rủi ro — Dòng 95–153.
     - Tương tác: Nhấp chuột vào bất kỳ quận nào trong danh sách cảnh báo hoặc biểu đồ cột để mở ngay ** Popup Chi tiết quận** — Dòng 115, 156.

---

### 2.2.  Lọc & Phân Tích Chuyên Sâu Theo Địa Bàn & Loại Rủi Ro (3 Khối: BỘ LỌC, KẾT QUẢ, SO SÁNH)
- **Đối tượng sử dụng:** Chuyên viên phân tích dữ liệu, Cán bộ tham mưu tổng hợp.
- **Mã nguồn FrontEnd:** [Screen2Analysis.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/Screen2Analysis.tsx) (380 dòng).
- **Mã nguồn BackEnd:**
  - Endpoint POST: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/risk_dashboard/router.py#L98-L115) (`POST /api/v1/risk-dashboard/analysis`).
  - Endpoint GET: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/risk_dashboard/router.py#L118-L144) (`GET /api/v1/risk-dashboard/analysis`).
  - Nghiệp vụ: [risk_dashboard_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/risk_dashboard/risk_dashboard_service.py#L93-L159) (`get_filtered_analysis`).
  - Explicit SQL: [risk_dashboard_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py#L258-L382) (`get_filtered_analysis`).
- **Cấu trúc 3 khối làm việc ngang (3-column layout):**
  1. **Khối "BỘ LỌC" (Cột trái):**
     - **Địa bàn:** Dropdown chọn toàn thành phố hoặc lọc riêng từng quận trong danh sách 22 Quận/Huyện & TP. Thủ Đức.
     - **Loại rủi ro (Multi-select Checkbox):** Rác sinh hoạt ùn ứ (`DOMESTIC_WASTE`), Rác nguy hại y tế/công nghiệp (`HAZARDOUS_WASTE`), Điểm ngập nước (`FLOOD`), Ô nhiễm khói bụi (`AIR_POLLUTION`).
     - **Khoảng thời gian:** Tháng này (`THIS_MONTH`), Quý này (`THIS_QUARTER`), 6 tháng gần nhất (`LAST_6_MONTHS`), Tùy chỉnh (`CUSTOM` chọn `start_date`, `end_date`).
     - Cụm nút: "Áp dụng bộ lọc" (`btn-apply-filter`), "Xuất Excel" (`btn-export-excel`), "Xuất PDF" (`btn-export-pdf`).
  2. **Khối "KẾT QUẢ" (Cột giữa):**
     - **Bảng số liệu định lượng:** Tổng số sự cố phát sinh (`total_incidents`), Khối lượng rác thải ước tính (`estimated_waste_volume_m3` - $m^3$), Tỷ lệ xử lý đúng hạn SLA (`sla_on_time_rate_percent` - %).
     - **Biểu đồ tròn cơ cấu (Donut Chart - [DonutPieChart.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/DonutPieChart.tsx)):** Trực quan hóa tỷ lệ phần trăm giữa các dạng rủi ro môi trường (Rác sinh hoạt $45.1\%$, Điểm ngập nước $26.8\%$, Rác nguy hại $15.5\%$, Ô nhiễm khói bụi $12.6\%$).
  3. **Khối "SO SÁNH" (Cột phải):**
     - So sánh chỉ số rủi ro kỳ này so với kỳ trước (tháng trước hoặc quý trước).
     - Phân tích xu hướng: Nếu rủi ro giảm, hiển thị màu xanh lá tích cực: `Giảm 14.5% so với tháng trước` kèm thông điệp: `"Tích cực: Chỉ số rủi ro môi trường đã giảm 14.5%"`. Nếu rủi ro tăng, hiển thị màu đỏ cảnh báo.

---

### 2.3.  Popup Chi Tiết Quận & Lối Tắt Điều Hướng Bản Đồ GIS (STT 33 / STT 44 / STT 43)
- **Đối tượng sử dụng:** Lãnh đạo khi cần chỉ đạo xử lý trọng điểm từng địa bàn.
- **Mã nguồn FrontEnd:** [Screen3DistrictPopup.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/Screen3DistrictPopup.tsx) (155 dòng).
- **Mã nguồn BackEnd:**
  - Endpoint: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/risk_dashboard/router.py#L147-L170) (`GET /api/v1/risk-dashboard/district/{district_id_or_name}`).
  - Nghiệp vụ: [risk_dashboard_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/risk_dashboard/risk_dashboard_service.py#L160-L188) (`get_district_detail`).
  - Truy vấn dữ liệu: [risk_dashboard_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py#L384-L440) (`get_district_detail_by_id_or_name`).
- **Cấu trúc cửa sổ Modal & Trải nghiệm tương tác:**
  - Thiết kế: Căn giữa màn hình, backdrop mờ che phủ toàn bộ nền (`district-popup-overlay`), hỗ trợ phím `Escape` để đóng nhanh và đóng khi click ngoài vùng card (`handleOverlayClick`) — Dòng 20–40.
  - Nhãn tiêu đề: Dòng chữ nhỏ in hoa `"POPUP"`, tiêu đề chính in đậm `"CHI TIẾT QUẬN"` kèm biểu tượng ghim và tên quận: `📍 Quận Bình Tân` — Dòng 59–69.
  - Lưới 3 nhóm thông số kỹ thuật:
    1. **Điểm rủi ro:** Điểm số và mức cảnh báo (VD: `"Điểm rủi ro: 78/100 - Mức báo động cam"` tô màu cam `#f59e0b`) — Dòng 74–79.
    2. **Sự cố tồn đọng:** Số bãi rác tự phát và điểm ngập sâu (VD: `"⚠️ 24 bãi rác tự phát, 3 điểm ngập úng sâu"` tô màu đỏ `#ef4444`) — Dòng 82–87.
    3. **Cơ sở thiết yếu bị đe dọa:** Bán kính ảnh hưởng (Buffer Zone 300m) bao quanh trường học và bệnh viện (VD: `"🏥 5 trường học, 2 trạm y tế nằm trong vùng nguy cơ"` tô màu hổ phách `#d97706`) — Dòng 90–95.
  - Khung nút hành động liên kết đa phân hệ:
    - **Nút "Xem bản đồ":** Điều hướng sang Bản đồ nhiệt không gian GIS (STT 33) tại tọa độ của quận (`onNavigateToMap`) — Dòng 101–109.
    - **Nút "Xem điểm nóng":** Điều hướng trực tiếp sang **Phân tích điểm nóng KDE & Dự báo 7 ngày (STT 44)** với hash URL: `#hotspots?district=Quận Bình Tân` — Dòng 112–124.
    - **Nút "Xem điều phối":** Điều hướng trực tiếp sang **Trung tâm điều phối tác nghiệp (STT 43)** với hash URL: `#dispatch?district=Quận Bình Tân` — Dòng 126–139.
    - **Nút "Đóng":** Đóng popup, giữ nguyên trạng thái làm việc hiện tại — Dòng 142–148.

---

# PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND

### 3.1. Domain Entities & Database Models
- **Đường dẫn tệp:** [risk_snapshot.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/risk_dashboard/risk_snapshot.py) (52 dòng).
- **Lớp `DistrictRiskSnapshot` (Dòng 12 - 52):**
  - Kế thừa `Base`, `TimestampMixin`. Tên bảng cơ sở dữ liệu: `district_risk_snapshots`.
  - Khóa chính: `snapshot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)` (Dòng 21).
  - Khóa ngoại đơn vị hành chính: `unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id", ondelete="SET NULL"), nullable=True, index=True)` (Dòng 22).
  - Địa bàn & Ngày ghi nhận: `district_name: str` (index), `snapshot_date: date` (index) (Dòng 23–24).
  - Thang điểm rủi ro: `risk_score: float = Numeric(5, 2)`, `risk_level: str` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) (Dòng 27–28).
  - Phân loại số lượng sự cố: `open_incidents_count`, `spontaneous_dumps_count`, `flood_points_count`, `air_pollution_count`, `hazardous_waste_count`, `domestic_waste_count` (Dòng 31–36).
  - Cơ sở thiết yếu bị đe dọa (Buffer Zone 300m): `schools_at_risk`, `hospitals_at_risk`, `total_facilities_at_risk` (Dòng 39–41).
  - Chỉ số định lượng & SLA: `estimated_waste_volume_m3: float`, `sla_on_time_rate: float` (% đúng hạn) (Dòng 44–45).
  - Kiểm soát đồng thời & Xóa mềm: `version: int = 1`, `deleted_at: DateTime` (Dòng 48–49).
  - Quan hệ liên kết: `unit = relationship("AdministrativeUnit", foreign_keys=[unit_id], lazy="selectin")` (Dòng 51).

---

### 3.2. Data Transfer Objects (Pydantic v2 Schemas)
- **Đường dẫn tệp:** [schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/risk_dashboard/schemas.py) (124 dòng).
- **Danh sách DTOs chính:**
  - `DistrictRiskItem` (Dòng 6–19): Điểm số, cấp độ, số sự cố, bãi rác, điểm ngập, cơ sở đe dọa và tọa độ của từng quận.
  - `DailyTrendPoint` (Dòng 21–26): Điểm dữ liệu xu hướng theo ngày (`date`, `average_risk_score`, `open_incidents`).
  - `TopDistrictAlertItem` (Dòng 28–41): Cấu trúc dòng cảnh báo Top 5 kèm cờ `urgent_action_required: bool`.
  - `OverviewMetricsResponse` (Dòng 43–57): Toàn bộ gói tin Màn 1/3 (`overall_risk_score`, `high_risk_district_count`, `open_incident_count`, `district_risks`, `trend_30_days`, `top_alert_districts`, `has_critical_alert`, `critical_alert_message`).
  - `FilterAnalysisRequest` (Dòng 59–66): Bộ lọc Màn 2/3 (`district_ids`, `risk_types`, `period`, `start_date`, `end_date`).
  - `QuantitativeStats` (Dòng 68–75): Thống kê định lượng (`total_incidents`, `estimated_waste_volume_m3`, `sla_on_time_rate_percent`, `open_incidents`, `resolved_incidents`).
  - `RiskTypeDistributionItem` (Dòng 77–84): Cơ cấu phần trăm (`type_code`, `type_name`, `count`, `percentage`, `color_hex`).
  - `PeriodComparisonStats` (Dòng 86–95): So sánh biến động kỳ này vs kỳ trước (`change_percent`, `trend_direction`, `is_positive`, `comparison_text`, `message`).
  - `FilterAnalysisResponse` (Dòng 97–105): Phản hồi Màn 2/3 tổng hợp số liệu, biểu đồ tròn và so sánh.
  - `DistrictDetailResponse` (Dòng 107–124): Phản hồi Màn 3/3 Popup chi tiết quận.

---

### 3.3. Abstractions & DIP Interfaces
- **Đường dẫn tệp:** [risk_dashboard_interface.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/risk_dashboard/risk_dashboard_interface.py) (56 dòng).
- **Lớp trừu tượng `IRiskDashboardRepository` (Dòng 7–56):** Định nghĩa 6 phương thức hợp đồng thuần túy:
  1. `get_citywide_overview_metrics(db) -> Dict[str, Any]` (Dòng 14–16).
  2. `get_district_risk_rankings(db) -> List[Dict[str, Any]]` (Dòng 18–21).
  3. `get_30_day_risk_trends(db) -> List[Dict[str, Any]]` (Dòng 23–26).
  4. `get_top_alert_districts(db, limit=5) -> List[Dict[str, Any]]` (Dòng 28–31).
  5. `get_filtered_analysis(db, district_ids, risk_types, start_date, end_date, prev_start_date, prev_end_date) -> Dict[str, Any]` (Dòng 34–45).
  6. `get_district_detail_by_id_or_name(db, unit_id, district_name) -> Optional[Dict[str, Any]]` (Dòng 48–55).

---

### 3.4. Persistence Layer (100% Explicit SQL & OCC Concurrency)
- **Đường dẫn tệp:** [risk_dashboard_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py) (444 dòng).
- **Bộ dữ liệu chuẩn hóa 22 Quận/Huyện & TP. Thủ Đức (`HCMC_DISTRICTS_CANONICAL` - Dòng 14–37):**
  - Khai báo đầy đủ tên quận, tọa độ tâm (`lat`, `lng`), điểm rủi ro cơ sở (`base_risk`), số lượng sự cố đang mở, bãi rác tự phát, điểm ngập sâu và số cơ sở thiết yếu (trường học, trạm y tế).
- **Thực thi các câu lệnh Explicit SQL:**
  1. **Thống kê toàn thành phố (Dòng 46–70):**
     ```sql
     SELECT
         COUNT(i.incident_id) AS total_incidents,
         SUM(CASE WHEN i.status IN ('PENDING', 'IN_PROGRESS', 'REPORTED') THEN 1 ELSE 0 END) AS open_incidents,
         AVG(COALESCE(i.risk_score, 50.0)) AS avg_risk_score
     FROM incidents i
     WHERE i.deleted_at IS NULL;
     ```
  2. **Truy vấn bảng xếp hạng rủi ro theo đơn vị hành chính và PostGIS (Dòng 109–123):**
     ```sql
     SELECT
         u.unit_id,
         u.name AS district_name,
         COUNT(i.incident_id) AS incident_count,
         SUM(CASE WHEN i.status IN ('PENDING', 'IN_PROGRESS', 'REPORTED') THEN 1 ELSE 0 END) AS open_incidents,
         AVG(COALESCE(i.risk_score, 50.0)) AS avg_incident_risk,
         ST_X(u.centroid)::float AS lng,
         ST_Y(u.centroid)::float AS lat
     FROM administrative_units u
     LEFT JOIN incidents i ON i.unit_id = u.unit_id AND i.deleted_at IS NULL
     WHERE (u.level = 'DISTRICT' OR u.name LIKE '%Quận%' OR u.name LIKE '%Huyện%' OR u.name LIKE '%Thủ Đức%')
     GROUP BY u.unit_id, u.name, u.centroid
     ORDER BY avg_incident_risk DESC;
     ```
  3. **Truy vấn xu hướng rủi ro 30 ngày từ bảng snapshot (Dòng 189–200):**
     ```sql
     SELECT
         s.snapshot_date,
         AVG(s.risk_score) AS avg_score,
         SUM(s.open_incidents_count) AS total_open
     FROM district_risk_snapshots s
     WHERE s.deleted_at IS NULL
       AND s.snapshot_date >= :start_date
       AND s.snapshot_date <= :end_date
     GROUP BY s.snapshot_date
     ORDER BY s.snapshot_date ASC;
     ```
  4. **Thống kê định lượng và so sánh chu kỳ (Dòng 270–292):**
     ```sql
     SELECT 
         COUNT(i.incident_id) AS total_incidents,
         SUM(CASE WHEN i.status IN ('PENDING', 'IN_PROGRESS', 'REPORTED') THEN 1 ELSE 0 END) AS open_incidents,
         SUM(CASE WHEN i.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS resolved_incidents,
         SUM(COALESCE(i.estimated_volume_m3, 0.0)) AS total_volume,
         SUM(CASE WHEN i.resolved_at IS NOT NULL AND (i.sla_deadline IS NULL OR i.resolved_at <= i.sla_deadline) THEN 1 ELSE 0 END) AS sla_met_count,
         AVG(COALESCE(i.risk_score, 50.0)) AS avg_risk_score
     FROM incidents i
     WHERE i.deleted_at IS NULL
       AND i.created_at >= :start_date
       AND i.created_at <= :end_date;
     ```

---

### 3.5. Business Logic Service Layer
- **Đường dẫn tệp:** [risk_dashboard_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/risk_dashboard/risk_dashboard_service.py) (191 dòng).
- **Lớp `RiskDashboardService` (Dòng 26–189):**
  - Khởi tạo Dependency Injection: `def __init__(self, repository: IRiskDashboardRepository = risk_dashboard_repository)` (Dòng 32–33).
  - **Kiểm tra quy tắc ngưỡng rủi ro khẩn cấp (> 80 điểm) (Dòng 69–76):** Quét toàn bộ danh sách quận, nếu phát hiện quận có `risk_score > 80.0` (VD: Quận Bình Tân $84.5$, Quận 8 $81.2$), tự động kích hoạt `has_critical_alert = True` và tạo thông điệp khẩn cấp: `"Cảnh báo khẩn cấp: {item.district_name} có điểm rủi ro vượt mức an toàn"`.
  - **Tính toán mốc thời gian bóc tách chu kỳ (Dòng 101–131):** Hỗ trợ tính chính xác ngày bắt đầu và kết thúc của kỳ hiện tại và kỳ đối chiếu tương ứng cho `THIS_MONTH`, `THIS_QUARTER`, `LAST_6_MONTHS`, `CUSTOM`.
  - **Tính tỷ lệ % biến động so với kỳ trước (Dòng 145–158):** Xác định `trend_direction` (`DECREASE`, `INCREASE`, `STABLE`) và `is_positive` (rủi ro giảm là tích cực `True`, rủi ro tăng là cảnh báo `False`).
  - **Trích xuất dữ liệu chi tiết quận cho Màn 3/3 (Dòng 160–188).**

---

### 3.6. Presentation Layer: FastAPI Router & Phân Quyền RBAC Guard
- **Đường dẫn tệp:** [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/risk_dashboard/router.py) (232 dòng).
- **Prefix:** `@router = APIRouter(prefix="/risk-dashboard", tags=["Urban Environmental Risk Executive Dashboard (STT 42)"])` (Dòng 30).
- **Bộ bảo vệ phân quyền RBAC (`verify_risk_dashboard_access` - Dòng 35–73):**
  - Chỉ cho phép các vai trò quản trị và lãnh đạo: `ALLOWED_ROLES = {"ADMIN", "OFFICER", "DISTRICT_MANAGER", "COORDINATOR"}` (Dòng 32).
  - Tài khoản người dân (`CITIZEN`) bị chặn với mã lỗi `403 Forbidden`: *"Chỉ Quản trị viên (Admin) hoặc Lãnh đạo cơ quan ban ngành mới có quyền truy cập Dashboard này"* (Dòng 63–67).
- **5 Endpoints RESTful:**
  1. `GET /overview`: Tổng quan rủi ro đô thị toàn thành phố (Dòng 75–95).
  2. `POST /analysis`: Lọc & phân tích chuyên sâu đa tiêu chí (Dòng 98–115).
  3. `GET /analysis`: Hỗ trợ truy vấn phân tích qua Query Parameters (Dòng 118–144).
  4. `GET /district/{district_id_or_name}`: Popup Chi tiết quận khi nhấp vào bảng cảnh báo hoặc biểu đồ (Dòng 147–170).
  5. `POST /export`: Trích xuất toàn bộ dữ liệu bảng biểu ra tệp định dạng CSV hoặc JSON/Excel phục vụ giao ban (Dòng 172–231).

---

# PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND

### 4.1. TypeScript Interfaces & Data Contracts
- **Đường dẫn tệp:** [riskDashboard.types.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/types/riskDashboard.types.ts) (114 dòng).
- Định nghĩa đầy đủ kiểu dữ liệu:
  - `DistrictRiskItem`: Mô hình điểm rủi ro của từng quận (Dòng 1–13).
  - `DailyTrendPoint`: Điểm xu hướng ngày trong 30 ngày (Dòng 15–19).
  - `TopDistrictAlertItem`: Dòng cảnh báo Top 5 (Dòng 21–33).
  - `OverviewMetricsResponse`: Gói dữ liệu phản hồi Màn 1/3 (Dòng 35–48).
  - `FilterAnalysisRequest` & `FilterAnalysisResponse`: DTOs cho Màn 2/3 (Dòng 54–60, 88–95).
  - `DistrictDetailResponse`: Cấu trúc dữ liệu cho Màn 3/3 Popup (Dòng 97–113).

---

### 4.2. Axios API Client Service
- **Đường dẫn tệp:** [riskDashboardApi.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/services/riskDashboardApi.ts) (47 dòng).
- 4 phương thức kết nối backend:
  - `getOverview()`: Gọi `GET /api/v1/risk-dashboard/overview` (Dòng 15–18).
  - `getFilteredAnalysis(payload)`: Gọi `POST /api/v1/risk-dashboard/analysis` (Dòng 23–26).
  - `getDistrictDetail(idOrName)`: Gọi `GET /api/v1/risk-dashboard/district/{idOrName}` (Dòng 31–35).
  - `exportReport(payload, format)`: Gọi `POST /api/v1/risk-dashboard/export?format=...` trả về blob tệp tải về (Dòng 40–45).

---

### 4.3. Thành Phần Giao Diện Màn 1/3 (Screen1Overview, BarChart, TrendLineChart)
- **Screen1Overview:** [Screen1Overview.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/Screen1Overview.tsx) (157 dòng).
  - 3 khối làm việc: Khối "CHỈ SỐ" (3 thẻ metric), Khối "BIỂU ĐỒ", Khối "CẢNH BÁO" (Top 5 khẩn cấp).
- **BarChart:** [BarChart.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/BarChart.tsx).
  - Biểu đồ cột SVG vẽ 22 quận/huyện và TP. Thủ Đức.
  - Vạch đỏ đứt nét đánh dấu ngưỡng nguy hiểm $80\text{ điểm}$.
  - Hỗ trợ tooltip và nhấp chuột vào từng cột để kích hoạt mở popup chi tiết quận.
- **TrendLineChart:** [TrendLineChart.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/TrendLineChart.tsx).
  - Biểu đồ đường SVG trực quan hóa biến thiên điểm rủi ro môi trường đô thị trong 30 ngày.

---

### 4.4. Thành Phần Giao Diện Màn 2/3 (Screen2Analysis, DonutPieChart)
- **Screen2Analysis:** [Screen2Analysis.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/Screen2Analysis.tsx) (380 dòng).
  - Khối "BỘ LỌC": Dropdown chọn quận, multi-checkbox 4 loại rủi ro, radio chọn kỳ (tháng, quý, 6 tháng, tùy chỉnh).
  - Khối "KẾT QUẢ": Bảng thống kê định lượng và Biểu đồ tròn Donut cơ cấu phần trăm rủi ro [DonutPieChart.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/DonutPieChart.tsx).
  - Khối "SO SÁNH": Thẻ đánh giá tỷ lệ % tăng/giảm so với kỳ trước, hiển thị màu xanh lá tích cực hoặc màu đỏ cảnh báo.
  - Cụm nút bấm xuất báo cáo định dạng Excel / PDF / CSV.

---

### 4.5. Thành Phần Giao Diện Màn 3/3 (Screen3DistrictPopup)
- **Screen3DistrictPopup:** [Screen3DistrictPopup.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/Screen3DistrictPopup.tsx) (155 dòng).
  - Cửa sổ Modal căn giữa, có backdrop mờ phủ toàn bộ màn hình.
  - Đóng linh hoạt qua 3 cách: Nút "Đóng", phím `Escape`, hoặc nhấp chuột ra ngoài vùng nền mờ.
  - Dòng chữ nhỏ `"POPUP"` và tiêu đề in đậm `"CHI TIẾT QUẬN"`.
  - Hiển thị 3 trường dữ liệu then chốt: Điểm rủi ro, Sự cố tồn đọng, Cơ sở thiết yếu bị đe dọa (Buffer 300m).
  - 4 nút chức năng: "Xem bản đồ" (STT 33), "Xem điểm nóng" (STT 44), "Xem điều phối" (STT 43), và "Đóng".

---

### 4.6. Khung Quản Trị Hệ Thống (ExecutiveHeader & ExecutiveFooter)
- **ExecutiveHeader:** [ExecutiveHeader.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/ExecutiveHeader.tsx).
  - Logo GreenSpot & Tiêu đề phân hệ Lãnh đạo.
  - Chuông cảnh báo khẩn cấp: Tự động kích hoạt hiệu ứng nhấp nháy đỏ (`active-emergency`) khi có quận vượt ngưỡng 80 điểm.
  - Tabs chuyển đổi giữa "Tổng quan rủi ro" (Màn 1/3) và "Phân tích chuyên sâu" (Màn 2/3).
  - Hiển thị thông tin Lãnh đạo và vai trò công tác.
- **ExecutiveFooter:** [ExecutiveFooter.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/ExecutiveFooter.tsx).
  - Thông tin bản quyền, phiên bản hệ thống và hotline thường trực PCTT & TKCN.

---

### 4.7. Điều Hướng Liên Phân Hệ (STT 44 Điểm Nóng & STT 43 Điều Phối)
- **Đường dẫn tệp:** [RiskDashboardContainer.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/pages/RiskDashboardContainer.tsx).
- **Liên kết sang STT 44 (Phân tích điểm nóng KDE & Dự báo 7 ngày):**
  - Khi người dùng bấm nút "Xem điểm nóng" trên Popup Màn 3/3, hệ thống kích hoạt điều hướng hash URL: `#hotspots?district=[Tên_Quận]`. STT 44 sẽ tự động nhận diện tham số này, chuyển sang tab dự báo của quận tương ứng.
- **Liên kết sang STT 43 (Trung tâm điều phối tác nghiệp hiện trường):**
  - Khi người dùng bấm nút "Xem điều phối", hệ thống kích hoạt điều hướng hash URL: `#dispatch?district=[Tên_Quận]`. STT 43 sẽ tự động lọc danh sách lệnh điều động theo địa bàn quận được chọn.
- **Liên kết sang STT 33 (Bản đồ nhiệt không gian GIS):**
  - Nút "Xem bản đồ" kích hoạt hàm `onNavigateToMap` mở bản đồ nhiệt tại tọa độ của quận.

---

### 4.8. Hệ Thống SCSS Stylesheet
- **Đường dẫn tệp:** [riskDashboard.scss](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/styles/riskDashboard.scss).
- Bố cục lưới 3 cột tiêu chuẩn (`three-column-grid`), hiệu ứng pulsing khẩn cấp (`danger-pulsing`), bảng màu phân cấp rủi ro (Xanh lá - Vàng - Cam - Đỏ), thiết kế Popup Modal sắc sảo với backdrop làm mờ kính (glassmorphism).

---

# PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)

### 5.1. Backend Unit & Integration Tests (Pytest - 7 Tiêu Chí)
- **Đường dẫn tệp:** [test_urban_risk_dashboard.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/risk_dashboard/test_urban_risk_dashboard.py) (362 dòng).
- Bao phủ 7 tiêu chí cốt lõi:
  1. `test_01_overview_metrics_calculation`: Kiểm tra tính toán  Thang điểm chung $58/100$, 4 quận nguy cơ cao, 128 sự cố đang mở, 30 ngày xu hướng, 5 cảnh báo (Dòng 214–230).
  2. `test_02_critical_alert_threshold_over_80`: Kiểm tra quy tắc cảnh báo khẩn cấp khi có quận vượt ngưỡng 80 điểm (Quận Bình Tân $84.5 > 80$) (Dòng 232–243).
  3. `test_03_filtered_analysis_this_month`: Kiểm tra  Bảng số liệu định lượng (142 sự cố, $385.5m^3$, $92.5\%$ SLA) và so sánh kỳ trước giảm $14.5\%$ tích cực (Dòng 245–261).
  4. `test_04_filtered_analysis_risk_types`: Kiểm tra lọc theo danh sách loại rủi ro cụ thể và chuẩn hóa tổng tỷ lệ phần trăm $100\%$ (Dòng 263–277).
  5. `test_05_district_detail_popup`: Kiểm tra Màn 3/3 Popup: Điểm rủi ro, sự cố tồn đọng, cơ sở thiết yếu bị đe dọa và đường dẫn liên kết bản đồ GIS (Dòng 279–293).
  6. `test_06_http_endpoints_integration`: Kiểm thử tích hợp toàn bộ RESTful API endpoints (`/overview`, `/analysis`, `/district/{id}`, `/export`) (Dòng 295–334).
  7. `test_07_rbac_access_guard`: Kiểm thử bảo vệ phân quyền: Chặn tài khoản `CITIZEN` với mã lỗi `403 Forbidden`, cho phép tài khoản `ADMIN` truy cập (Dòng 335–362).

---

### 5.2. Frontend UI/UX Component Tests (Vitest - 5 Tiêu Chí)
- **Đường dẫn tệp:** [riskDashboard.test.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/__tests__/riskDashboard.test.tsx) (270 dòng).
- Bao phủ 5 kịch bản trải nghiệm người dùng:
  1. **** Hiển thị đúng 3 khối ngang CHỈ SỐ, BIỂU ĐỒ, CẢNH BÁO và tương tác click vào quận mở popup chi tiết (Dòng 131–158).
  2. **** Hiển thị đúng 3 khối ngang BỘ LỌC, KẾT QUẢ, SO SÁNH, bảng số liệu định lượng, so sánh giảm $14.5\%$ và nút xuất Excel (Dòng 160–201).
  3. **Màn 3/3 Popup:** Hiển thị đúng các trường dữ liệu POPUP, CHI TIẾT QUẬN, điểm rủi ro, sự cố tồn đọng, cơ sở thiết yếu và nút "Xem bản đồ" / "Đóng" (Dòng 203–232).
  4. **Màn 3/3 Popup (Phím Esc):** Đóng popup nhanh chóng khi nhấn phím `Escape` (Dòng 234–248).
  5. **ExecutiveHeader:** Kích hoạt chuông cảnh báo khẩn cấp nhấp nháy đỏ (`active-emergency`) khi có quận vượt ngưỡng 80 điểm (Dòng 250–268).

---

# PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)

| STT | Thành phần kiến trúc | Đường dẫn tệp mã nguồn | Vị trí dòng | Trách nhiệm cốt lõi |
|---|---|---|---|---|
| **1** | Domain Model `DistrictRiskSnapshot` | [risk_snapshot.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/risk_dashboard/risk_snapshot.py) | L12 - L52 | Thực thể lưu trữ chỉ số rủi ro quận/huyện, OCC version, soft-delete |
| **2** | Schemas DTOs Màn 1/3 (Tổng quan) | [schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/risk_dashboard/schemas.py) | L6 - L57 | DTO điểm rủi ro quận, xu hướng 30 ngày, top 5 cảnh báo |
| **3** | Schemas DTOs Màn 2/3 (Phân tích) | [schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/risk_dashboard/schemas.py) | L59 - L105 | DTO bộ lọc chuyên sâu, bảng định lượng, cơ cấu Donut, so sánh kỳ |
| **4** | Schemas DTOs Màn 3/3 (Popup) | [schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/risk_dashboard/schemas.py) | L107 - L124 | DTO chi tiết quận, cơ sở đe dọa buffer 300m, liên kết bản đồ GIS |
| **5** | Interface Hợp đồng (DIP) | [risk_dashboard_interface.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/risk_dashboard/risk_dashboard_interface.py) | L7 - L56 | `IRiskDashboardRepository` trừu tượng hóa 6 nghiệp vụ truy xuất |
| **6** | Baseline 22 Quận & Thủ Đức | [risk_dashboard_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py) | L14 - L37 | Danh mục quy chuẩn tọa độ, điểm rủi ro cơ sở, cơ sở thiết yếu |
| **7** | Explicit SQL: Chỉ số đô thị | [risk_dashboard_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py) | L46 - L70 | SQL `SELECT COUNT(...), SUM(...) FROM incidents ...` |
| **8** | Explicit SQL: Xếp hạng 22 Quận | [risk_dashboard_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py) | L109 - L123 | SQL `SELECT u.unit_id, ST_X(centroid), ST_Y(centroid) FROM ...` |
| **9** | Explicit SQL: Xu hướng 30 ngày | [risk_dashboard_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py) | L189 - L200 | SQL `SELECT snapshot_date, AVG(risk_score) FROM snapshots ...` |
| **10** | Explicit SQL: Bóc tách & So sánh | [risk_dashboard_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/risk_dashboard/risk_dashboard_repository.py) | L270 - L292 | SQL truy vấn sự cố, khối lượng rác $m^3$ và SLA kỳ này vs kỳ trước |
| **11** | Business Service | [risk_dashboard_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/risk_dashboard/risk_dashboard_service.py) | L26 - L189 | Điều phối nghiệp vụ, quét ngưỡng nguy hiểm $> 80$, so sánh % |
| **12** | Phân quyền RBAC Guard | [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/risk_dashboard/router.py) | L35 - L73 | `verify_risk_dashboard_access` chặn người dùng không đủ quyền (403) |
| **13** | Router RESTful API | [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/risk_dashboard/router.py) | L75 - L231 | 5 Endpoints khai thác tổng quan, phân tích, popup và xuất báo cáo |
| **14** | Frontend API Client | [riskDashboardApi.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/services/riskDashboardApi.ts) | L11 - L46 | Axios client kết nối 4 nghiệp vụ backend |
| **15** |  Tổng quan rủi ro | [Screen1Overview.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/Screen1Overview.tsx) | L1 - L157 | 3 Khối: CHỈ SỐ (3 thẻ metric), BIỂU ĐỒ, CẢNH BÁO (Top 5 khẩn cấp) |
| **16** | Biểu đồ cột 22 Quận & Thủ Đức | [BarChart.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/BarChart.tsx) | - | Biểu đồ cột SVG, đường đứt nét ngưỡng khẩn cấp 80, tương tác chọn quận |
| **17** | Biểu đồ đường xu hướng | [TrendLineChart.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/TrendLineChart.tsx) | - | Biểu đồ đường SVG xu hướng chỉ số rủi ro 30 ngày gần nhất |
| **18** |  Phân tích chuyên sâu | [Screen2Analysis.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/Screen2Analysis.tsx) | L1 - L380 | 3 Khối: BỘ LỌC, KẾT QUẢ (Định lượng + Donut), SO SÁNH kỳ trước |
| **19** | Biểu đồ tròn cơ cấu rủi ro | [DonutPieChart.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/DonutPieChart.tsx) | - | Donut Chart SVG cơ cấu 4 nhóm rủi ro: Rác sinh hoạt, Ngập, Nguy hại, Khói |
| **20** |  Popup Chi tiết quận | [Screen3DistrictPopup.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/Screen3DistrictPopup.tsx) | L1 - L155 | Modal POPUP, CHI TIẾT QUẬN, đe dọa buffer 300m, nút STT 33/44/43 |
| **21** | Header Chuông cảnh báo đỏ | [ExecutiveHeader.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/components/ExecutiveHeader.tsx) | - | Chuông cảnh báo nhấp nháy đỏ (`active-emergency`) khi có quận $> 80$ |
| **22** | Quản trị đa màn & Liên kết | [RiskDashboardContainer.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/pages/RiskDashboardContainer.tsx) | - | Chuyển đổi tab Màn 1/2, mở Modal Màn 3, liên kết sang STT 44 & STT 43 |
| **23** | Backend Pytest (7 tests) | [test_urban_risk_dashboard.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/risk_dashboard/test_urban_risk_dashboard.py) | L214 - L362 | Bộ kiểm thử tự động 7 tiêu chí Clean Architecture & RBAC |
| **24** | Frontend Vitest (5 tests) | [riskDashboard.test.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/risk_dashboard/__tests__/riskDashboard.test.tsx) | L130 - L269 | Bộ kiểm thử tự động 5 kịch bản UI/UX tương tác full màn hình |
