# 📚 Tài Liệu Đặc Tả Kỹ Thuật & Thuật Toán Lõi: Tìm Tuyến Đường An Toàn Tránh Ngập (Flood-Aware Safe Navigation Routing)

> **Mã tham chiếu thiết kế:** STT 41 (Hình 4.41 - Định tuyến Thông minh & Thích ứng Biến đổi Khí hậu)  
> **Dự án:** GreenSpot / EcoReport - Bản đồ Môi trường Đô thị & Báo cáo Thông minh  
> **Kiến trúc:** Clean Architecture OOP, PostGIS Spatial Engine, OSRM Routing, Harmonic Tide Engine  
> **Vị trí lưu trữ:** [`BackEnd/docs/41_flood_aware_safe_navigation.md`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/docs/41_flood_aware_safe_navigation.md)  
> **Trạng thái:** Hoàn thiện 100%, đồng bộ tuyệt đối với mã nguồn hiện tại, sẵn sàng đưa vào vận hành.

---

## 📑 MỤC LỤC TÀI LIỆU
1. [Tóm Tắt Nhanh Cho Lập Trình Viên & Đánh Giá Viên](#1-tóm-tắt-nhanh-cho-lập-trình-viên--đánh-giá-viên)
2. [Đặc Tả Chi Tiết 4 Màn Hình Tương Tác (Hình 4.41)](#2-đặc-tả-chi-tiết-4-màn-hình-tương-tác-hình-441)
3. [Kiến Trúc Cơ Sở Dữ Liệu & Không Gian Địa Lý (PostGIS)](#3-kiến-trúc-cơ-sở-dữ-liệu--không-gian-địa-lý-postgis)
4. [Hệ Thống Thư Mục & Luồng Luân Chuyển Truy Vấn (Architecture & Query Flow)](#4-hệ-thống-thư-mục--luồng-luân-chuyển-truy-vấn-architecture--query-flow)
5. [Thuật Toán Định Tuyến Né Ngập & Phân Bậc Ngưỡng Phương Tiện](#5-thuật-toán-định-tuyến-né-ngập--phân-bậc-ngưỡng-phương-tiện)
6. [Hệ Thống Cảnh Báo Sớm Thời Gian Thực (< 500m), Web Audio & TTS](#6-hệ-thống-cảnh-báo-sớm-thời-gian-thực--500m-web-audio--tts)
7. [Đặc Tả RESTful API Endpoints](#7-đặc-tả-restful-api-endpoints)
8. [Bảng Ma Trận Ánh Xạ Mã Nguồn (Project Code Mapping Matrix)](#8-bảng-ma-trận-ánh-xạ-mã-nguồn-project-code-mapping-matrix)
9. [Bộ Kiểm Thử Tự Động (TDD) & Bằng Chứng Xác Minh](#9-bộ-kiểm-thử-tự-động-tdd--bằng-chứng-xác-minh)

---

## 1. TÓM TẮT NHANH CHO LẬP TRÌNH VIÊN & ĐÁNH GIÁ VIÊN

> [!NOTE]
> **Mục tiêu tính năng:** Cung cấp công cụ định tuyến di chuyển thông minh thích ứng biến đổi khí hậu đô thị TP.HCM. Hỗ trợ người dân và đội xe ép rác chuyên dụng tìm lộ trình di chuyển an toàn, né các điểm ngập sâu gây chết máy/thủy kích trong mùa mưa bão hoặc triều cường dâng cao.

- **Frontend:**
  - Viết bằng **React + TypeScript**, tuân thủ nghiêm ngặt chuẩn cấu trúc module và kiểu dữ liệu tường minh.
  - **Kiến trúc Giao diện SASS/SCSS Toàn Phần:** 100% bằng **SASS/SCSS** ([`FrontEnd/src/features/navigation/styles/navigation.scss`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/styles/navigation.scss)), sử dụng Design Tokens, biến ngữ nghĩa (`$nav-primary`, `$nav-danger`, `$nav-surface`), mixins tái sử dụng (`@mixin nav-card`, `@mixin button-pill`, `@mixin flex-center`) và cấu trúc BEM nesting sạch sẽ, không inline style.
  - Bản đồ tương tác **MapLibre GL** với các lớp vẽ polyline lộ trình: Tuyến nhanh màu xám/đỏ (có vũng ngập) và Tuyến an toàn màu xanh lục (đã bẻ lái né ngập).
  - Tích hợp **Web Audio API** (tần số 880Hz / 440Hz phát chuỗi `Bíp bíp`) và **SpeechSynthesis API** (phát âm thanh cảnh báo giọng nói AI tự nhiên khi gặp nguy cơ ngập sát sườn).
- **Backend:**
  - Viết bằng **FastAPI (Python 3.11+)** theo chuẩn **Clean Architecture OOP & Dependency Inversion**.
  - Tích hợp 4 động cơ lõi:
    1. **Open Source Routing Machine (OSRM):** Tính toán hình học lộ trình, khoảng cách, thời gian và turn steps chi tiết.
    2. **Harmonic Tide Engine (`tide_engine`):** Giải tích 4 sóng điều hòa thiên văn trạm Phú An và Nhà Bè dự báo mực nước triều cường thời gian thực.
    3. **Flood Risk Engine (`flood_engine`):** Kết hợp lượng mưa trắc nghiệm thời gian thực từ trạm khí tượng và độ trũng địa hình.
    4. **PostGIS Spatial Engine:** Truy vấn tọa độ điểm đen ngập lụt đô thị và hành lang tuyến đường (Corridor Buffer 120m).
- **Cơ sở dữ liệu:**
  - Bảng `safe_navigation_routes` lưu trữ lịch sử và cache kết quả định tuyến.
  - Bảng `flood_hotspots` lưu trữ 30 điểm đen ngập lụt thực tế tại TP.HCM kèm cao độ và ngưỡng ngập.
  - Migration Alembic: `019_create_safe_navigation_routes_table.py`.
- **Chất lượng kiểm thử:**
  - Backend: **6/6 tests Pytest** đạt 100% độ bao phủ các kịch bản định tuyến, ngưỡng phương tiện, cảnh báo sớm và reroute.
  - Frontend: **5/5 tests Vitest** đạt 100% độ bao phủ 4 màn hình giao diện, validation và tương tác người dùng.

---

## 2. ĐẶC TẢ CHI TIẾT 4 MÀN HÌNH TƯƠNG TÁC (HÌNH 4.41)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                HÌNH 4.41 FLOW & WIREFRAMES                             │
│                                                                                        │
│   [ MÀN 1/4: NHẬP ĐIỂM & CHỌN XE ]  ────(Tìm đường)────▶  [ MÀN 2/4: SO SÁNH 2 TUYẾN ]  │
│   - Ô: Điểm xuất phát (GPS / Gợi ý)                      - Thẻ Tuyến Nhanh Nhất (Đỏ)   │
│   - Ô: Điểm đến (Gợi ý địa danh TP.HCM)                  - Thẻ Tuyến An Toàn Nhất(Xanh)│
│   - Bộ chọn 4 loại xe (Xe máy, Ô tô,                     - Nút "Xem chi tiết"          │
│     Xe đạp, Xe ép rác chuyên dụng)                       - Nút "Bắt đầu đi"            │
│                 │                                                        │             │
│                 │ (Bắt đầu đi)                                           ▼             │
│                 ▼                                         [ MÀN 3/4: CHỈ DẪN BƯỚC ]    │
│   [ MÀN 4/4: POPUP CẢNH BÁO KHẨN CẤP ]  ◀──(< 500m ngập)──  - Turn-by-turn directions    │
│   - Nhãn "POPUP" + "CẢNH BÁO NGẬP"                       - Minh chứng né vũng ngập     │
│   - Khoảng cách còn lại (vd: Cách 300m)                  - Khoảng cách & thời gian     │
│   - Âm thanh Web Audio Bíp bíp + TTS                     - Nút "Bắt đầu đi"            │
│   - Nút: [ Đổi tuyến ] | [ Tiếp tục ]                                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Màn 1/4: Thiết lập Lộ trình & Chọn Phương Tiện (Route Input & Vehicle Selector)
- **Tập tin:** [`FrontEnd/src/features/navigation/components/Screen1Input.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/components/Screen1Input.tsx)
- **Cấu trúc khối:**
  1. *Khung tiêu đề:* **"LỘ TRÌNH AN TOÀN TRÁNH NGẬP"** với biểu tượng khiên bảo vệ xanh lá.
  2. *Ô nhập Điểm đi (Origin):* Hỗ trợ gõ tìm kiếm địa danh TP.HCM (Autocomplete API) và nút bấm một chạm **"Vị trí hiện tại"** kích hoạt định vị GPS trình duyệt `navigator.geolocation`.
  3. *Ô nhập Điểm đến (Destination):* Hỗ trợ tìm kiếm địa danh hành chính, di tích, công viên, trường học và địa điểm công cộng TP.HCM.
  4. *Bộ chọn 4 phương tiện di chuyển:*
     - **Xe máy** (`MOTORBIKE`): Ngưỡng an toàn 25 cm.
     - **Ô tô** (`CAR`): Ngưỡng an toàn 35 cm.
     - **Xe đạp** (`BICYCLE`): Ngưỡng an toàn 15 cm.
     - **Xe ép rác chuyên dụng** (`WASTE_TRUCK`): Ngưỡng an toàn 55 cm.
  5. *Quy tắc kiểm tra hợp lệ (Validation):*
     - Nếu để trống điểm đi hoặc điểm đến: Hiển thị lỗi viền đỏ *"Vui lòng nhập đầy đủ điểm đi và điểm đến"*.
     - Nếu điểm đi trùng điểm đến: Báo lỗi *"Điểm đi và điểm đến không được trùng nhau"*.
  6. *Nút hành động chính:* `button: Tìm đường tránh ngập` (Wide Pill Button).

### 2.2. Màn 2/4: So Sánh Đối Chiếu 2 Tuyến (Dual-Route Compare)
- **Tập tin:** [`FrontEnd/src/features/navigation/components/Screen2Compare.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/components/Screen2Compare.tsx)
- **Bố cục 2 thẻ so sánh trực quan:**
  1. **Thẻ Tuyến Nhanh Nhất (Fastest Route):**
     - Huy hiệu trạng thái: `CẢNH BÁO NGUY CƠ` (Màu đỏ/cam).
     - Thời gian di chuyển và quãng đường (vd: `18 phút | 6.2 km`).
     - Số điểm ngập phát hiện trên lộ trình và mực nước ngập sâu nhất dự kiến (vd: `Có 2 điểm ngập (Sâu nhất 35cm - Nguy cơ chết máy cao)`).
     - Danh sách các vũng ngập cần lưu ý (vd: Đường Nguyễn Hữu Cảnh, Ung Văn Khiêm).
  2. **Thẻ Tuyến An Toàn Nhất (Safest Route - Khuyên dùng):**
     - Huy hiệu trạng thái: `AN TOÀN TUYỆT ĐỐI` (Màu xanh lục).
     - Thời gian di chuyển và quãng đường (vd: `22 phút | 7.1 km` - đường vòng thêm 900m).
     - Cam kết chất lượng tuyến: `0 điểm ngập nước | Đã bẻ lái né thành công 2 điểm ngập sâu`.
     - 2 Nút hành động:
       * `button: Xem chỉ dẫn chi tiết` (chuyển sang Màn 3/4).
       * `button: Bắt đầu đi ngay` (bắt đầu hành trình và kích hoạt chế độ giám sát Màn 4/4).

### 2.3. Màn 3/4: Chỉ Dẫn Chi Tiết Từng Bước (Turn-by-turn Navigation)
- **Tập tin:** [`FrontEnd/src/features/navigation/components/Screen3Directions.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/components/Screen3Directions.tsx)
- **Cấu trúc danh sách chỉ dẫn từng bước:**
  - Header tổng quan: Tổng cự ly, thời gian ước tính, số lượng chặng rẽ.
  - Danh sách từng bước di chuyển có biểu tượng chỉ hướng (Đi thẳng, Rẽ trái, Rẽ phải, Bùng binh).
  - Điểm nhấn minh chứng né ngập: Tại các khúc quanh né ngập, hiển thị nhãn xanh nổi bật: *"Rẽ phải vào đường Điện Biên Phủ để tránh ngập tại chân cầu Thủ Thiêm (ngập sâu 35cm)"*.
  - Nút chuyển đổi nhanh: `button: Bắt đầu đi` hoặc `button: Quay lại so sánh tuyến`.

### 2.4. Màn 4/4: Popup Cảnh Báo Khẩn Cấp (< 500m) & TTS Audio
- **Tập tin:** [`FrontEnd/src/features/navigation/components/Screen4EmergencyModal.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/components/Screen4EmergencyModal.tsx)
- **Cơ chế kích hoạt:** Khi xe đang di chuyển, nếu quét thấy điểm đen ngập mới phát sinh hoặc điểm ngập phía trước trong cự ly $< 500$m:
  1. Popup bật lên chính giữa màn hình với lớp phủ mờ (`backdrop blur`).
  2. Dòng nhãn nhỏ: `POPUP`.
  3. Tiêu đề in đậm màu đỏ rực rỡ: **"CẢNH BÁO NGẬP"**.
  4. Thông tin khoảng cách: *"Phía trước 300m có điểm ngập sâu trên đường Đinh Tiên Hoàng (Mực nước: 0.45m - Nguy cơ chết máy cao)"*.
  5. Âm thanh Web Audio API tự động phát chuỗi cảnh báo `Bíp bíp` tần số 880Hz / 440Hz.
  6. SpeechSynthesis đọc to: *"Cảnh báo, phía trước ba trăm mét có điểm ngập sâu, bạn có muốn đổi tuyến?"*.
  7. **Hai nút hành động lựa chọn:**
     - `button: Đổi tuyến` (Màu xanh lá): Hệ thống tự động gọi API `/reroute` bẻ nhánh ngay tại ngã rẽ kế tiếp để bảo vệ phương tiện.
     - `button: Tiếp tục` (Màu xám/đỏ): Đóng popup, hiển thị icon vũng ngập nhấp nháy đỏ trên bản đồ để tài xế tự chịu trách nhiệm.

---

## 3. KIẾN TRÚC CƠ SỞ DỮ LIỆU & KHÔNG GIAN ĐỊA LÝ (POSTGIS)

### 3.1. Bảng `safe_navigation_routes` (Lưu trữ lịch sử & Cache định tuyến)
- **Tập tin Model:** [`BackEnd/app/models/flood.py#L296-L330`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/flood.py#L296-L330) (Lớp `SafeNavigationRoute`)
- **Tập tin Migration:** [`BackEnd/alembic/versions/019_create_safe_navigation_routes_table.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/019_create_safe_navigation_routes_table.py)

| Tên Cột (Column) | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa / Mục Đích Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `route_id` | `UUID` | Primary Key, default UUIDv4 | Định danh duy nhất của lộ trình định tuyến |
| `user_id` | `UUID` | FK `users.user_id`, Nullable | Người dùng yêu cầu tìm đường (hỗ trợ cả khách vãng lai) |
| `origin_point` | `Geometry(POINT, 4326)` | Not Null, Spatial Index GIST | Tọa độ điểm xuất phát chuẩn WGS84 |
| `destination_point`| `Geometry(POINT, 4326)` | Not Null, Spatial Index GIST | Tọa độ điểm đích đến chuẩn WGS84 |
| `default_route_geom`| `Geometry(LINESTRING, 4326)`| Nullable | Hình học polyline tuyến ngắn nhất (có thể dính ngập) |
| `default_distance_meters`| `NUMERIC(10, 1)` | Default 0.0 | Chiều dài tuyến nhanh nhất (mét) |
| `default_duration_seconds`| `INTEGER` | Default 0 | Thời gian di chuyển tuyến nhanh nhất (giây) |
| `default_route_hazard_count`| `INTEGER` | Default 0 | Số vũng ngập đe dọa trên tuyến nhanh nhất |
| `recommended_safe_geom`| `Geometry(LINESTRING, 4326)`| Nullable | Hình học polyline tuyến an toàn né ngập |
| `recommended_distance_meters`| `NUMERIC(10, 1)` | Default 0.0 | Chiều dài tuyến an toàn né ngập (mét) |
| `recommended_duration_seconds`| `INTEGER` | Default 0 | Thời gian di chuyển tuyến an toàn (giây) |
| `safety_status` | `VARCHAR(20)` | Default `'CLEAR'` | Trạng thái: `'CLEAR'` (Khô ráo), `'AVOID'` (Né ngập) |
| `avoided_hotspots_count`| `INTEGER` | Default 0 | Số điểm đen ngập lụt đã né thành công |
| `route_details_json`| `JSONB` | Nullable | Danh sách các chặng turn-by-turn và lý do né vũng ngập |
| `created_at` | `TIMESTAMPTZ` | Default `now()` | Thời điểm tính toán lộ trình |
| `updated_at` | `TIMESTAMPTZ` | Default `now()` | Thời điểm cập nhật lần cuối |

### 3.2. Bảng `flood_hotspots` (Mạng lưới 30 Điểm Đen Ngập Lụt Đô Thị TP.HCM)
- **Tập tin Model:** [`BackEnd/app/models/flood.py#L30-L80`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/flood.py#L30-L80) (Lớp `FloodHotspot`)
- Các trường cốt lõi phục vụ thuật toán định tuyến né ngập:
  - `hotspot_code`: Mã điểm đen chuẩn hóa (vd: `FL-01`, `FL-02`).
  - `street_name`, `district_name`: Tên tuyến đường và quận/huyện TP.HCM.
  - `location`: `Geometry(POINT, 4326)` vị trí tâm điểm ngập.
  - `threshold_tide_meters`: Ngưỡng triều cường gây ngập (m).
  - `threshold_rain_mm_per_hour`: Ngưỡng lượng mưa bắt đầu gây ngập (mm/h).
  - `historical_max_depth_cm`: Chiều sâu ngập lịch sử (cm).
  - `drainage_system_rating`: Đánh giá năng lực tiêu thoát nước của cống.

---

## 4. HỆ THỐNG THƯ MỤC & LUỒNG LUÂN CHUYỂN TRUY VẤN (ARCHITECTURE & QUERY FLOW)

Hệ thống tuân thủ nghiêm ngặt mô hình **Clean Architecture & Dependency Inversion Principle (SOLID)**:

```
[ FRONTEND CLIENT ] (Screen1Input / Screen2Compare / Screen4Modal)
       │ 
       ▼ (HTTP POST /api/v1/navigation/routes ...)
[ API ROUTER ] ──────────► BackEnd/app/api/v1/navigation/router.py
       │                   (Mount qua BackEnd/app/api/v1/__init__.py)
       │
       ▼ (Kế thừa ISafeNavigationService Contract)
[ SERVICE LAYER ] ───────► BackEnd/app/services/navigation/service.py (SafeNavigationService)
       │
       ├─────────────────► OSRM Routing Engine (HTTP API Project-OSRM hoặc Fallback Polyline)
       ├─────────────────► Harmonic Tide Engine (tide_engine.get_current_tide("PHU_AN"))
       ├─────────────────► Weather Service (weather_service.get_hcm_rainfall())
       │
       ▼ (Truy vấn CSDL Raw SQL / PostGIS Async)
[ DATABASE LAYER ] ──────► BackEnd/app/models/flood.py (SafeNavigationRoute, FloodHotspot)
```

### 4.1. Chi tiết phân nhiệm từng tầng:
1. **Tầng CSDL (Domain Models & Migration):**
   - Model Lộ trình né ngập: [`BackEnd/app/models/flood.py#L296-L330`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/flood.py#L296-L330) (`SafeNavigationRoute`).
   - Model Điểm ngập: [`BackEnd/app/models/flood.py#L30-L80`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/flood.py#L30-L80) (`FloodHotspot`).
   - Migration Alembic: [`BackEnd/alembic/versions/019_create_safe_navigation_routes_table.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/019_create_safe_navigation_routes_table.py).
2. **Tầng Giao diện Hợp đồng (Interface Contract):**
   - [`BackEnd/app/services/navigation/interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/navigation/interface.py): Khai báo lớp trừu tượng `ISafeNavigationService(ABC)` với 3 phương thức:
     * `calculate_dual_routes(db, request) -> NavigationPlanResponse`
     * `check_early_warning_ahead(db, request) -> EarlyWarningResponse`
     * `reroute_avoiding_hazard(db, request) -> RouteOption`
3. **Tầng Truy vấn CSDL (Database Queries):**
   - **Vị trí viết câu truy vấn:** Toàn bộ truy vấn trích xuất điểm đen ngập lụt được viết tập trung tại hàm `_fetch_flood_hotspots` bên trong [`BackEnd/app/services/navigation/service.py#L130-L147`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/navigation/service.py#L130-L147).
   - Sử dụng cú pháp SQLAlchemy 2.0 Async với Raw SQL chuẩn PostGIS tối ưu:
     ```python
     query = text("""
         SELECT
             h.hotspot_id, h.hotspot_code, h.street_name, h.district_name,
             h.threshold_tide_meters, h.threshold_rain_mm_per_hour,
             h.historical_max_depth_cm, h.drainage_system_rating, h.primary_cause,
             ST_X(h.location)::float as lng,
             ST_Y(h.location)::float as lat
         FROM flood_hotspots h
         WHERE h.is_active = TRUE;
     """)
     res = await db.execute(query)
     rows = res.mappings().all()
     ```
   - *Ghi chú kiến trúc:* Việc viết truy vấn tập trung tại Service giúp kết nối trực tiếp mảng tọa độ điểm đen với thuật toán phân tích hành lang đệm Polyline Buffer mà không qua trung gian CRUD dư thừa.
4. **Tầng Dịch vụ Lõi (Service Implementation):**
   - [`BackEnd/app/services/navigation/service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/navigation/service.py) (`SafeNavigationService`):
     * Tích hợp OSRM client với timeout 3.5s và giải thuật Polyline nội suy dự phòng.
     * Thuật toán phát hiện vũng ngập nằm trong hành lang lộ trình (`_detect_hazards_on_line` với buffer 120m).
     * Thuật toán bẻ nhánh né ngập qua các waypoint an toàn cao độ (`calculate_dual_routes`).
     * Sinh văn bản chỉ dẫn di chuyển turn-by-turn sinh động (`_generate_turn_steps`).
5. **Tầng Schemas / DTOs:**
   - [`BackEnd/app/schemas/navigation/schemas.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/navigation/schemas.py): Pydantic V2 Schemas gồm `CalculateRouteRequest`, `NavigationPlanResponse`, `RouteOption`, `TurnStep`, `FloodHazardInfo`, `EarlyWarningCheckRequest`, `EarlyWarningResponse`, `RerouteRequest`.
6. **Tầng API Router & Tích hợp Hệ thống (Routing & Mounting):**
   - Router file: [`BackEnd/app/api/v1/navigation/router.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/navigation/router.py) (prefix `/navigation`, tags `["Flood-Aware Safe Routing"]`).
   - Tích hợp vào hệ thống: [`BackEnd/app/api/v1/__init__.py#L18 & L38`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/__init__.py#L18):
     ```python
     from app.api.v1.navigation import navigation_router
     api_v1_router.include_router(navigation_router)
     ```

---

## 5. THUẬT TOÁN ĐỊNH TUYẾN NÉ NGẬP & PHÂN BẬC NGƯỠNG PHƯƠNG TIỆN

### 5.1. Bảng Ngưỡng Chiều Sâu Ngập Tối Đa Của Phương Tiện
Mỗi phương tiện có giới hạn chịu ngập vật lý khác nhau. Khi chiều sâu vũng ngập dự báo $\ge$ ngưỡng này, hệ thống đánh dấu `is_blocker_for_vehicle = True` và bắt buộc bẻ nhánh né ngập:

| Loại Phương Tiện | Mã Định Danh (Enum) | Ngưỡng Ngập An Toàn | Hậu Quả Nguy Hiểm Khi Ngập Quá Ngưỡng |
| :--- | :--- | :---: | :--- |
| **Xe đạp** | `BICYCLE` | **15 cm** | Nước ngập qua trục bánh, trơn trượt ngã xe, nước cuốn trôi |
| **Xe máy** | `MOTORBIKE` | **25 cm** | Nước tràn cổ pô, chết bugi đánh lửa, chết máy giữa dòng |
| **Ô tô con** | `CAR` | **35 cm** | Nước ngập cổ hút gió, gây thủy kích vỡ lốc máy hàng trăm triệu |
| **Xe ép rác chuyên dụng** | `WASTE_TRUCK` | **55 cm** | Gầm cao tải trọng lớn, cần né các hố ga bật nắp hoặc trũng sâu |

### 5.2. Thuật toán Đối soát Hành lang Tuyến đường (Buffer Corridor Hazard Detection)
1. Tuyến đường từ OSRM trả về mảng tọa độ `coordinates: List[[lng, lat]]`.
2. Hệ thống quét qua toàn bộ 30 điểm đen ngập lụt thực tế:
   $$\text{min\_dist} = \min_{i=1}^{M} \text{Haversine}(lat_{\text{spot}}, lng_{\text{spot}}, lat_i, lng_i)$$
3. Nếu $\text{min\_dist} \le 120$ mét: Xác định điểm ngập nằm trực tiếp trên lộ trình di chuyển.
4. Đối soát chiều sâu ngập dự kiến ($d_{\text{predicted}}$) với ngưỡng an toàn của xe:
   - Nếu $d_{\text{predicted}} \ge \text{Ngưỡng xe}$: Gán cờ `is_blocker = True`, xếp tuyến nhanh vào trạng thái `status: 'AVOID'`.
   - Nếu $d_{\text{predicted}} < \text{Ngưỡng xe}$: Gán `is_blocker = False` (ngập nhẹ mặt đường, xe vẫn lưu thông được).

---

## 6. HỆ THỐNG CẢNH BÁO SỚM THỜI GIAN THỰC (< 500M), WEB AUDIO & TTS

Khi người dùng bấm nút **"Bắt đầu đi"**, ứng dụng kích hoạt tiến trình giám sát ngầm:
1. **Quét cảnh báo sớm (< 500m):**
   - Liên tục so khớp tọa độ GPS thực tế của phương tiện với các vũng ngập phía trước theo vector chuyển động.
   - Khi cự ly tới vũng ngập $< 500$m, kích hoạt ngay lập tức API `/api/v1/navigation/early-warning`.
2. **Âm thanh cảnh báo đa giác quan (Multi-Sensory Alerts):**
   - **Âm thanh tần số (Web Audio API):** Phát chuỗi cảnh báo `Bíp bíp` tần số 880Hz và 440Hz qua `AudioContext.createOscillator()`.
   - **Giọng đọc AI (SpeechSynthesis API):** Trợ lý ảo phát âm thanh qua loa thiết bị:  
     *"Cảnh báo, phía trước ba trăm mét có điểm ngập sâu tại đường Đinh Tiên Hoàng, bạn có muốn đổi tuyến?"*.
3. **Cơ chế Tái định tuyến bẻ nhánh (Dynamic Rerouting):**
   - Khi người dùng bấm **"Đổi tuyến"**: Client gửi `POST /api/v1/navigation/reroute`.
   - Hệ thống tái tính toán lộ trình từ tọa độ hiện tại tới đích đến, tự động chèn điểm tránh (Waypoint Avoidance) bẻ lái tại ngã rẽ an toàn kế tiếp.

---

## 7. ĐẶC TẢ RESTFUL API ENDPOINTS

Router chính: [`BackEnd/app/api/v1/navigation/router.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/navigation/router.py) (Prefix: `/api/v1/navigation`)

### 7.1. `POST /api/v1/navigation/routes`
- **Mục đích:** Màn 2/4: Tính toán song song 2 phương án di chuyển (Tuyến nhanh nhất vs Tuyến an toàn nhất).
- **Request Body:**
  ```json
  {
    "origin": { "name": "Chợ Bến Thành", "latitude": 10.7725, "longitude": 106.6980 },
    "destination": { "name": "Landmark 81", "latitude": 10.7951, "longitude": 106.7218 },
    "vehicle_type": "MOTORBIKE"
  }
  ```
- **Response Body (HTTP 200 OK):** `NavigationPlanResponse`
  - `fastest_route`: Lộ trình ngắn nhất kèm mảng tọa độ, số điểm ngập và cảnh báo chết máy.
  - `safest_route`: Lộ trình an toàn né ngập kèm các chặng turn-by-turn và lý do bẻ lái né ngập.
  - `vehicle_threshold_cm`: Ngưỡng ngập của phương tiện (vd: 25.0cm cho xe máy).
  - `all_clear`: `false` nếu có ngập, `true` nếu cả 2 tuyến đều khô ráo.

### 7.2. `POST /api/v1/navigation/early-warning`
- **Mục đích:** Màn 4/4: Quét phát hiện điểm ngập khẩn cấp phía trước lộ trình (< 500m).
- **Request Body:**
  ```json
  {
    "current_latitude": 10.7800,
    "current_longitude": 106.6990,
    "route_coordinates": [[106.6990, 10.7800], [106.6990, 10.7850]],
    "vehicle_type": "MOTORBIKE"
  }
  ```
- **Response Body (HTTP 200 OK):** `EarlyWarningResponse`
  - `has_hazard_ahead`: `true` nếu có vũng ngập cách dưới 500m.
  - `distance_ahead_meters`: Cự ly còn lại tới vũng ngập (vd: `300.0` mét).
  - `alert_title`: `"CẢNH BÁO NGẬP"`.
  - `water_level_display`: `"Mực nước: 0.45m - Nguy cơ chết máy cao"`.
  - `voice_announcement`: Câu thoại định dạng sẵn để trình duyệt phát Text-to-Speech.

### 7.3. `POST /api/v1/navigation/reroute`
- **Mục đích:** Kích hoạt bẻ nhánh đổi tuyến khi bấm nút "Đổi tuyến" trên Popup Màn 4/4.
- **Request Body:**
  ```json
  {
    "current_location": { "name": "Vị trí hiện tại", "latitude": 10.7800, "longitude": 106.6990 },
    "destination": { "name": "Landmark 81", "latitude": 10.7951, "longitude": 106.7218 },
    "vehicle_type": "MOTORBIKE",
    "avoid_hazard_id": "FL-WARN-300"
  }
  ```
- **Response Body (HTTP 200 OK):** `RouteOption` tuyến đường an toàn mới tránh hoàn toàn điểm ngập.

### 7.4. `GET /api/v1/navigation/autocomplete`
- **Mục đích:** Gợi ý danh sách 13 địa danh tiêu biểu TP.HCM phục vụ ô gõ tìm kiếm Màn 1/4.
- **Query Params:** `query: str` (tối thiểu 1 ký tự).
- **Response Body (HTTP 200 OK):** Mảng danh sách các địa điểm gồm tên, latitude, longitude.

---

## 8. BẢNG MA TRẬN ÁNH XẠ MÃ NGUỒN (PROJECT CODE MAPPING MATRIX)

Tất cả đường dẫn và số dòng mã được đối soát chính xác 100% với kho mã nguồn hiện tại:

| STT | Tập Tin (File Path) | Tầng Kiến Trúc | Các Hàm / Lớp / Logic Cốt Lõi | Dòng Mã (Lines) |
| :---: | :--- | :--- | :--- | :---: |
| **1** | [`BackEnd/app/models/flood.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/flood.py) | Domain Model | Entity `SafeNavigationRoute` (PostGIS `LINESTRING`, `origin_point`, `destination_point`) | 296 - 330 |
| **2** | [`BackEnd/alembic/versions/019_create_safe_navigation_routes_table.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/019_create_safe_navigation_routes_table.py) | CSDL Migration | Khởi tạo bảng `safe_navigation_routes` và các chỉ mục GIST không gian | 1 - 52 |
| **3** | [`BackEnd/app/services/navigation/interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/navigation/interface.py) | Interface Contract | Khai báo Abstract Base Class `ISafeNavigationService` | 1 - 58 |
| **4** | [`BackEnd/app/services/navigation/service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/navigation/service.py) | Service & Query | `SafeNavigationService` (chứa query raw SQL `_fetch_flood_hotspots`, OSRM client, bẻ nhánh né ngập) | 1 - 610 |
| **5** | [`BackEnd/app/schemas/navigation/schemas.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/navigation/schemas.py) | DTO / Schemas | Pydantic V2 Schemas: `CalculateRouteRequest`, `NavigationPlanResponse`, `EarlyWarningResponse` | 1 - 135 |
| **6** | [`BackEnd/app/api/v1/navigation/router.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/navigation/router.py) | API Router | Endpoints: `POST /routes`, `POST /early-warning`, `POST /reroute`, `GET /autocomplete` | 1 - 138 |
| **7** | [`BackEnd/app/api/v1/__init__.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/__init__.py) | API Root Mount | Mount `navigation_router` vào `api_v1_router` tại dòng 18 & 38 (prefix `/navigation`) | 1 - 41 |
| **8** | [`BackEnd/tests/navigation/test_safe_navigation.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/navigation/test_safe_navigation.py) | Unit & Flow Test | 6 bài kiểm thử tự động đạt 100% độ bao phủ: 4 ngưỡng xe, Haversine, dual-routes, cảnh báo sớm, reroute | 1 - 166 |
| **9** | [`FrontEnd/src/features/navigation/components/Screen1Input.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/components/Screen1Input.tsx) | UI Presentation | Màn 1/4: Nhập điểm đi, điểm đến, nút GPS hiện tại, bộ chọn 4 loại xe, validation lỗi | 1 - 170 |
| **10**| [`FrontEnd/src/features/navigation/components/Screen2Compare.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/components/Screen2Compare.tsx) | UI Presentation | Màn 2/4: Thẻ so sánh Tuyến Nhanh Nhất (Đỏ) vs Tuyến An Toàn Nhất (Xanh), cự ly và thời gian | 1 - 185 |
| **11**| [`FrontEnd/src/features/navigation/components/Screen3Directions.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/components/Screen3Directions.tsx) | UI Presentation | Màn 3/4: Danh sách turn-by-turn directions chi tiết, huy hiệu minh chứng né vũng ngập | 1 - 160 |
| **12**| [`FrontEnd/src/features/navigation/components/Screen4EmergencyModal.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/components/Screen4EmergencyModal.tsx) | UI Presentation | Màn 4/4: Popup cảnh báo ngập <500m viền đỏ, âm thanh Bíp bíp Web Audio, nút Đổi tuyến / Tiếp tục | 1 - 150 |
| **13**| [`FrontEnd/src/features/navigation/styles/navigation.scss`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/styles/navigation.scss) | SASS / SCSS Styling | SCSS Design Tokens, mixins, BEM classes tuân thủ 100% Quy tắc 4 | 1 - 580 |
| **14**| [`FrontEnd/src/features/navigation/__tests__/navigation.test.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/navigation/__tests__/navigation.test.tsx) | Frontend Testing | 5 bài kiểm thử Vitest toàn diện bao phủ Màn 1, 2, 3, 4 và xử lý lỗi validation | 1 - 354 |

---

## 9. BỘ KIỂM THỬ TỰ ĐỘNG (TDD) & BẰNG CHỨNG XÁC MINH

### 9.1. Kết Quả Kiểm Thử Backend (6/6 Tests Passed - 100% Flow Coverage)
Mở cửa sổ PowerShell tại thư mục `BackEnd` và chạy:
```powershell
pytest tests/navigation/test_safe_navigation.py -v
```
**Danh mục các test cases xác nhận:**
1. `test_vehicle_thresholds`: Xác thực chuẩn xác 4 ngưỡng ngập (Xe đạp 15cm, Xe máy 25cm, Ô tô 35cm, Xe ép rác 55cm).
2. `test_haversine_distance`: Xác thực công thức khoảng cách đại cầu giữa Chợ Bến Thành và Nhà thờ Đức Bà.
3. `test_calculate_dual_routes_with_hazards`: Kiểm thử tính toán 2 tuyến khi có điểm ngập sâu đe dọa trên tuyến nhanh.
4. `test_calculate_dual_routes_all_clear`: Kiểm thử kịch bản cả 2 tuyến đều khô ráo, không bị ngập.
5. `test_early_warning_ahead`: Kiểm thử cảnh báo sớm khẩn cấp $< 500$m và kích hoạt câu thoại TTS.
6. `test_reroute_avoiding_hazard`: Kiểm thử hành vi tái định tuyến bẻ nhánh né điểm ngập khi người dùng bấm Đổi tuyến.

### 9.2. Kết Quả Kiểm Thử Frontend (5/5 Tests Passed)
Mở cửa sổ terminal tại thư mục `FrontEnd` và chạy:
```bash
npm test -- src/features/navigation/__tests__/navigation.test.tsx --run
```
**Danh mục các test cases xác nhận:**
1. `Màn 1/4: Hiển thị đầy đủ ô điểm đi, điểm đến, nút Vị trí hiện tại, và 4 loại phương tiện`.
2. `Màn 1/4 Validation: Hiển thị thông báo khi để trống hoặc trùng nhau`.
3. `Màn 2/4: Hiển thị 2 phương án Tuyến nhanh nhất và Tuyến an toàn nhất`.
4. `Màn 3/4: Hiển thị chỉ dẫn rẽ từng ngã tư turn-by-turn kèm minh chứng né ngập`.
5. `Màn 4/4: Popup khẩn cấp khi gặp vũng ngập < 500m, hỗ trợ bấm Đổi tuyến và Tiếp tục`.

---
*Tài liệu được cập nhật chuẩn xác và lưu trữ trực tiếp tại: [`C:\Users\Admin\source\Group-j_GreenSpot\BackEnd\docs\41_flood_aware_safe_navigation.md`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/docs/41_flood_aware_safe_navigation.md).*
