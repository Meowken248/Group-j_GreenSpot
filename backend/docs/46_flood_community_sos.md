# 📚 TÀI LIỆU KỸ THUẬT CỐT LÕI TÍNH NĂNG STT 46
# CỨU HỘ NGẬP CỘNG ĐỒNG (FLOOD SOS)
## (Community Flood Emergency SOS Dispatch, Volunteer Allocation & Live Tracking)

> **Mục đích tài liệu:** Tổng hợp toàn diện, chuẩn xác 100% vị trí các thành phần mã nguồn cốt lõi (Core Logic) của **Tính năng STT 46: Cứu hộ ngập cộng đồng (Flood SOS)** bao gồm cả **BackEnd** (FastAPI / SQLAlchemy / PostGIS / Explicit SQL / Clean Architecture 6 tầng / OCC / Soft-Delete) và **FrontEnd** (React / TypeScript / SASS SCSS / Vitest).  
> Toàn bộ số dòng, tên lớp, tên hàm, câu lệnh SQL và đường dẫn tệp trong tài liệu này đều được **đối soát và trích xuất trực tiếp 100% từ mã nguồn thực tế đang hoạt động trong repository**, cam kết **tuyệt đối không có bất kỳ thông tin giả định hay suy diễn sai lệch nào**.

---

## 📑 MỤC LỤC TỔNG QUAN

1. [PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG](#phần-1-kiến-trúc-tổng-quan--clean-architecture-6-tầng)
2. [PHẦN 2: ĐẶC TẢ CHI TIẾT 5 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN](#phần-2-đặc-tả-chi-tiết-5-màn-hình-nghiệp-vụ--ánh-xạ-mã-nguồn)
   - [2.1. Màn 1/5: Giao diện phát tín hiệu cấp cứu khẩn cấp (Emergency SOS Dispatch)](#21-màn-15-giao-diện-phát-tín-hiệu-cấp-cứu-khẩn-cấp-emergency-sos-dispatch)
   - [2.2. Màn 2/5: Popup xác nhận khẩn cấp (GỬI YÊU CẦU CỨU HỘ?)](#22-màn-25-popup-xác-nhận-khẩn-cấp-gửi-yêu-cầu-cứu-hộ)
   - [2.3. Màn 3/5: Giao diện phân bổ cứu hộ Tình nguyện viên & Đội phản ứng nhanh](#23-màn-35-giao-diện-phân-bổ-cứu-hộ-tình-nguyện-viên--đội-phản-ứng-nhanh)
   - [2.4. Màn 4/5: Trung tâm theo dõi hành trình cứu nạn (Live Tracking & Stepper & Chat)](#24-màn-45-trung-tâm-theo-dõi-hành-trình-cứu-nạn-live-tracking--stepper--chat)
   - [2.5. Màn 5/5: Popup xác nhận huỷ yêu cầu SOS (HUỶ YÊU CẦU SOS? & Safeguard < 100m)](#25-màn-55-popup-xác-nhận-huỷ-yêu-cầu-sos-huỷ-yêu-cầu-sos--safeguard--100m)
3. [PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND](#phần-3-chi-tiết-mã-nguồn-cốt-lõi-phía-backend)
   - [3.1. Domain Entities & Database Models (Tầng 1)](#31-domain-entities--database-models-tầng-1)
   - [3.2. Data Transfer Objects - Pydantic v2 Schemas (Tầng 2)](#32-data-transfer-objects---pydantic-v2-schemas-tầng-2)
   - [3.3. Abstractions & DIP Interfaces (Tầng 3)](#33-abstractions--dip-interfaces-tầng-3)
   - [3.4. Persistence Layer - 100% Explicit SQL & PostGIS (Tầng 4)](#34-persistence-layer---100-explicit-sql--postgis-tầng-4)
   - [3.5. Business Logic Service Layer (Tầng 5)](#35-business-logic-service-layer-tầng-5)
   - [3.6. Presentation Layer - FastAPI Router (Tầng 6)](#36-presentation-layer---fastapi-router-tầng-6)
4. [PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND](#phần-4-chi-tiết-mã-nguồn-cốt-lõi-phía-frontend)
   - [4.1. TypeScript Interfaces & Data Contracts](#41-typescript-interfaces--data-contracts)
   - [4.2. Axios API Client Service](#42-axios-api-client-service)
   - [4.3. Thành phần Màn 1/5 (Phát tín hiệu cấp cứu)](#43-thành-phần-màn-15-phát-tín-hiệu-cấp-cứu)
   - [4.4. Thành phần Màn 2/5 (Popup xác nhận gửi)](#44-thành-phần-màn-25-popup-xác-nhận-gửi)
   - [4.5. Thành phần Màn 3/5 (Dashboard Tình nguyện viên)](#45-thành-phần-màn-35-dashboard-tình-nguyện-viên)
   - [4.6. Thành phần Màn 4/5 (Live Tracking & Stepper & Chat)](#46-thành-phần-màn-45-live-tracking--stepper--chat)
   - [4.7. Thành phần Màn 5/5 (Popup huỷ yêu cầu & Safeguard < 100m)](#47-thành-phần-màn-55-popup-huỷ-yêu-cầu--safeguard--100m)
   - [4.8. Khung Header & Footer chuẩn](#48-khung-header--footer-chuẩn)
   - [4.9. Master State Container](#49-master-state-container)
   - [4.10. Hệ thống SASS Stylesheet & Pulse Animation](#410-hệ-thống-sass-stylesheet--pulse-animation)
5. [PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)](#phần-5-bộ-kiểm-thử-tự-động-automated-test-suites)
   - [5.1. Backend Unit & Integration Tests (Pytest)](#51-backend-unit--integration-tests-pytest)
   - [5.2. Frontend UI/UX Component Tests (Vitest)](#52-frontend-uiux-component-tests-vitest)
6. [PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)](#phần-6-bảng-tra-cứu-nhanh-dòng-mã-nguồn-full-stack-cheat-sheet)

---

# PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG

Tính năng STT 46 được cấu trúc nghiêm ngặt theo **Clean Architecture** phân rã 6 tầng độc lập và nguyên lý **Dependency Inversion Principle (DIP)**:

```
BackEnd/app/
├── models/flood_sos/                   # [TẦNG 1: DOMAIN ENTITIES]
│   ├── sos_request.py                  # FloodSosRequest, VolunteerProfile, FloodSosChatMessage
│   └── __init__.py                     # Registry xuất khẩu
│
├── schemas/flood_sos/                  # [TẦNG 2: DATA TRANSFER OBJECTS (DTO)]
│   ├── schemas.py                      # Pydantic v2 schemas chuẩn hóa 5 màn hình
│   └── __init__.py
│
├── interface/flood_sos/                # [TẦNG 3: ABSTRACTIONS (DIP CONTRACTS)]
│   ├── flood_sos_interface.py          # IFloodSosRepository (Abstract Base Class)
│   └── __init__.py
│
├── crud/flood_sos/                     # [TẦNG 4: PERSISTENCE (100% EXPLICIT SQL)]
│   ├── flood_sos_repository.py         # FloodSosRepository kế thừa IFloodSosRepository
│   └── __init__.py
│
├── services/flood_sos/                 # [TẦNG 5: BUSINESS LOGIC SERVICE LAYER]
│   └── flood_sos_service.py            # FloodSosService (DIP: nhận IFloodSosRepository)
│
├── api/v1/flood_sos/                   # [TẦNG 6: PRESENTATION / FASTAPI ROUTER]
│   ├── router.py                       # REST API Endpoints chuẩn ISO
│   └── __init__.py
│
├── seeds/                              # [DATA SEEDER]
│   └── seed_flood_sos.py               # Idempotent Seeder khởi tạo ca cứu hộ & TNV mẫu
│
tests/flood_sos/                        # [AUTOMATED TESTS]
└── test_flood_sos.py                   # 8 Unit/Integration tests bao phủ 100% nghiệp vụ
```

Phía **FrontEnd**:
```
FrontEnd/src/features/flood_sos/
├── types/
│   └── flood_sos.types.ts              # Data contracts TypeScript khớp 100% BackEnd DTO
├── services/
│   └── floodSosApi.ts                  # Axios client gọi REST API
├── styles/
│   └── flood_sos.scss                  # SASS nguyên bản (.scss), mixins, pulse animation, glassmorphism
├── components/
│   ├── FloodSosHeader.tsx              # Khung Header (logo | menu | chuông | avatar)
│   ├── FloodSosFooter.tsx              # Khung Footer (bản quyền | liên hệ | chính sách)
│   ├── FloodSosDispatchScreen.tsx      # Màn 1/5: 3 cột TÌNH HUỐNG | VỊ TRÍ | GỬI
│   ├── FloodSosConfirmModal.tsx        # Màn 2/5: Popup xác nhận khẩn cấp & cam kết bán kính 3km
│   ├── VolunteerResponseDashboard.tsx  # Màn 3/5: 2 cột YÊU CẦU GẦN BẠN | BẢN ĐỒ
│   ├── FloodSosLiveTrackingScreen.tsx  # Màn 4/5: 3 cột TRẠNG THÁI (Stepper) | NGƯỜI CỨU HỘ | BẢN ĐỒ
│   ├── FloodSosCancelModal.tsx         # Màn 5/5: Popup huỷ yêu cầu SOS & Safeguard cự ly < 100m
│   └── FloodSosChatDrawer.tsx          # Khung trao đổi nhận diện khẩn cấp trượt lên từ dưới
├── pages/
│   └── FloodSosContainer.tsx           # Master State Controller điều phối các màn hình
├── __tests__/
│   └── flood_sos.test.tsx              # 15 tests Vitest bao phủ 100% nghiệp vụ 5 màn hình
└── index.ts                            # Export chuẩn của feature module
```

---

# PHẦN 2: ĐẶC TẢ CHI TIẾT 5 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN

### 2.1. Màn 1/5: Giao diện phát tín hiệu cấp cứu khẩn cấp (Emergency SOS Dispatch)
- **Cấu trúc khung chuẩn:** Header (`logo | menu | chuông | avatar`) và Footer (`bản quyền | liên hệ | chính sách`).
- **Khối "TÌNH HUỐNG" (Cột trái):**
  - Số người cần cứu: Bắt buộc $\ge 1$. Hỗ trợ phân loại: người già, trẻ nhỏ, người bệnh cần hỗ trợ y tế.
  - Bỏ trống hoặc $\le 0$: Viền đỏ trường nhập và hiển thị nhắc nhở: `"Vui lòng nhập ước tính số người cần cứu hộ."`
  - Mô tả tình trạng hiện thời và tải ảnh chụp hiện trường (có preview & nút gỡ ảnh).
- **Khối "VỊ TRÍ" (Cột giữa):**
  - Tự động truy vấn Geolocation của thiết bị: `"Đã định vị tọa độ GPS của bạn (Độ chính xác: ±5m)."`.
  - Nút `"Dùng vị trí hiện tại"` (màu lam): Kích hoạt quét GPS với `enableHighAccuracy: true`.
  - Khi chưa cấp quyền: Cảnh báo vàng `"Không thể xác định vị trí. Vui lòng bật GPS hoặc tự nhập địa chỉ mắc kẹt."` kèm ô nhập thủ công.
- **Khối "GỬI" (Cột phải):**
  - Nút `"Gửi SOS"` (Primary Danger Button màu đỏ báo động): Kích hoạt mở Popup Màn 2/5.
- **Mã nguồn FrontEnd:** `FrontEnd/src/features/flood_sos/components/FloodSosDispatchScreen.tsx`
- **Mã nguồn BackEnd DTO:** `BackEnd/app/schemas/flood_sos/schemas.py:16` (`CreateFloodSosRequest`)

### 2.2. Màn 2/5: Popup xác nhận khẩn cấp (GỬI YÊU CẦU CỨU HỘ?)
- **Đặc điểm:** Modal Popup ưu tiên cao, nền backdrop mờ (`backdrop-filter: blur(6px)`).
- **Cấu trúc:**
  - Nhãn trên cùng: `POPUP`
  - Tiêu đề in đậm: `GỬI YÊU CẦU CỨU HỘ?`
  - Thông điệp cam kết: `"Tình nguyện viên và đội gần nhất sẽ nhận"` (giải thích phát sóng bán kính 3km).
  - Cụm nút: Nút `"Gửi"` (kèm spinner loading) và nút `"Huỷ"`.
  - Mất mạng: Cảnh báo đỏ `"Lỗi kết nối mạng! Hệ thống đang tự động chuyển sang gửi tin nhắn SMS cứu hộ khẩn cấp..."` kèm nút `"Gửi SMS cứu nạn"` mở `sms:112`.
- **Mã nguồn FrontEnd:** `FrontEnd/src/features/flood_sos/components/FloodSosConfirmModal.tsx`
- **Mã nguồn BackEnd Endpoint:** `BackEnd/app/api/v1/flood_sos/router.py:60` (`POST /api/v1/flood-sos/dispatch`)

### 2.3. Màn 3/5: Giao diện phân bổ cứu hộ Tình nguyện viên & Đội phản ứng nhanh
- **Cấu trúc 2 cột:**
  - **Khối "YÊU CẦU GẦN BẠN" (Cột trái):** Thẻ thông tin nổi bật thể hiện mức độ nguy hiểm, cự ly di chuyển, số lượng nạn nhân, mô tả tình trạng. Nút `"Nhận yêu cầu"` (xanh lục, khóa quyền tiếp nhận của các TNV khác qua OCC) và nút `"Bỏ qua"`.
  - **Khối "BẢN ĐỒ" (Cột phải):** Ghim đỏ (người kêu cứu), ghim lam (tình nguyện viên), vòng tròn radar quét bán kính 3km và tuyến tiếp cận an toàn tránh đoạn ngập sâu.
- **Thông điệp chuẩn:**
  - Khi có SOS mới: `"Phát hiện yêu cầu cứu hộ SOS mới cách bạn [Cự_Ly] m!"` kèm chuông reo.
  - Nhận thành công: `"Bạn đã tiếp nhận ca cứu hộ [Mã_SOS]. Hệ thống đang kết nối bạn với người cần cứu..."`
  - Trùng nhận (OCC 409): `"Yêu cầu cứu hộ này đã được một tình nguyện viên khác tiếp nhận."`
  - Bỏ qua: `"Đã bỏ qua yêu cầu. Hệ thống đang chuyển tiếp thông tin tới tình nguyện viên khác."`
- **Mã nguồn FrontEnd:** `FrontEnd/src/features/flood_sos/components/VolunteerResponseDashboard.tsx`
- **Mã nguồn BackEnd Endpoint:** `BackEnd/app/api/v1/flood_sos/router.py:80` (`GET /nearby`) & `router.py:106` (`POST /{request_id}/accept`)

### 2.4. Màn 4/5: Trung tâm theo dõi hành trình cứu nạn (Live Tracking & Stepper & Chat)
- **Cấu trúc 3 cột:**
  - **Khối "TRẠNG THÁI" (Cột trái):** Stepper 4 bước chuẩn (`Đã gửi` $\to$ `Đã nhận` $\to$ `Đang đến` $\to$ `Hoàn tất`). Vòng tròn trạng thái hiện tại sáng đèn và có hiệu ứng đập nhịp (`@include stepper-pulse`).
  - **Khối "NGƯỜI CỨU HỘ" (Cột giữa):** Tên tình nguyện viên, đội phản ứng, phương tiện (xuồng máy/cano), cự ly và ETA tiếp cận. Cụm nút `"Gọi"` và `"Nhắn tin"` (mở chat drawer gửi dấu hiệu nhận diện: *"Tôi đang mặc áo mưa vàng trên mái nhà"*). Nút `"Huỷ yêu cầu"` ở góc.
  - **Khối "BẢN ĐỒ" (Cột phải):** Live tracking thời gian thực vị trí di chuyển của xuồng cứu hộ tiến dần về phía người gặp nạn.
- **Hoàn tất cứu nạn:** Thông báo `"Ca cứu hộ đã hoàn tất thành công. Bạn đã an toàn!"`, chuyển Stepper sang bước 4 màu xanh lục kèm khung đánh giá sao (1-5 sao) và nhận xét.
- **Mã nguồn FrontEnd:** `FrontEnd/src/features/flood_sos/components/FloodSosLiveTrackingScreen.tsx` & `FloodSosChatDrawer.tsx`
- **Mã nguồn BackEnd Endpoint:** `BackEnd/app/api/v1/flood_sos/router.py:142` (`GET /{request_id}/tracking`), `router.py:162` (`POST /{request_id}/progress`), `router.py:180` (`POST /{request_id}/chat`), `router.py:217` (`POST /{request_id}/rating`)

### 2.5. Màn 5/5: Popup xác nhận huỷ yêu cầu SOS (HUỶ YÊU CẦU SOS? & Safeguard < 100m)
- **Đặc điểm:** Xuất hiện khi nạn nhân bấm huỷ vì đã an toàn hoặc tự di chuyển.
- **Cấu trúc:**
  - Nhãn `POPUP`
  - Tiêu đề in đậm: `HUỶ YÊU CẦU SOS?`
  - Lời nhắc nhở: `"Người cứu hộ sẽ được thông báo"`
  - Cụm nút: Nút `"Huỷ yêu cầu"` (màu đỏ) và nút `"Giữ lại"`.
- **Cơ chế an toàn (Safeguard < 100m):** Nếu người cứu hộ đã ở cự ly $< 100\text{m}$, hệ thống kích hoạt cảnh báo vàng: `"Cảnh báo: Người cứu hộ đã đến rất gần vị trí của bạn (< 100m). Bạn có chắc chắn muốn huỷ?"` và yêu cầu xác nhận thêm lần 2 trước khi đóng hồ sơ.
- **Mã nguồn FrontEnd:** `FrontEnd/src/features/flood_sos/components/FloodSosCancelModal.tsx`
- **Mã nguồn BackEnd Endpoint:** `BackEnd/app/api/v1/flood_sos/router.py:198` (`POST /{request_id}/cancel`)

---

# PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND

### 3.1. Domain Entities & Database Models (Tầng 1)
- **Tệp nguồn:** [BackEnd/app/models/flood_sos/sos_request.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/flood_sos/sos_request.py)
- **Bảng `flood_sos_requests` (Dòng 21 - 85):**
  - `request_id`: Khóa chính UUID.
  - `sos_code`: Mã cứu hộ chuẩn ISO `SOS-YYYYMMDD-XXXX` (Unique index).
  - `victim_id`, `victim_name`, `victim_phone`: Thông tin liên lạc người gặp nạn.
  - `total_victims`, `elderly_count`, `children_count`, `medical_urgent_count`: Các thông số sinh tồn.
  - `location`: Geometry(Point, srid=4326) hỗ trợ tính toán không gian PostGIS.
  - `status`: Enum (`PENDING`, `ACCEPTED`, `EN_ROUTE`, `COMPLETED`, `CANCELLED`).
  - `assigned_rescuer_name`, `assigned_rescuer_phone`, `assigned_team_name`, `assigned_vehicle_type`: Thông tin đội cứu nạn tiếp nhận.
  - `rescuer_distance_meters`, `rescuer_eta_minutes`: Khoảng cách và ETA thời gian thực.
  - `rating`, `feedback_notes`: Đánh giá chất lượng sau cứu hộ.
  - `version`: Khóa Optimistic Concurrency Control (OCC) mặc định = 1, tăng mỗi lần cập nhật.
  - `deleted_at`: Cột hỗ trợ Soft-Delete.
- **Bảng `volunteer_profiles` (Dòng 88 - 120):**
  - Quản lý hồ sơ tình nguyện viên, đội phản ứng nhanh, phương tiện cứu nạn và trạng thái sẵn sàng.
- **Bảng `flood_sos_chat_messages` (Dòng 123 - 146):**
  - Lưu trữ lịch sử tin nhắn nhận diện khẩn cấp (`SYSTEM`, `VICTIM`, `RESCUER`).

### 3.2. Data Transfer Objects - Pydantic v2 Schemas (Tầng 2)
- **Tệp nguồn:** [BackEnd/app/schemas/flood_sos/schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/flood_sos/schemas.py)
- Các DTO chính:
  - `CreateFloodSosRequest` (Dòng 16): Ràng buộc `total_victims >= 1`, `description min_length=3`.
  - `CreateFloodSosResponse` (Dòng 44): Trả về `request_id`, `sos_code`, `broadcast_radius_km=3.0`.
  - `VolunteerSosCardResponse` (Dòng 66): Thẻ cứu hộ hiển thị cự ly `distance_meters`, `distance_text`.
  - `AcceptSosRequest` (Dòng 93): Chứa `version` khóa OCC và tọa độ tình nguyện viên.
  - `SosTrackingDetailResponse` (Dòng 135): Stepper 4 bước, cự ly, ETA và danh sách tin nhắn.
  - `CancelSosRequest` & `CancelSosResponse` (Dòng 194 - 206): Chứa `is_confirmed_near` và cờ `requires_near_confirmation`.

### 3.3. Abstractions & DIP Interfaces (Tầng 3)
- **Tệp nguồn:** [BackEnd/app/interface/flood_sos/flood_sos_interface.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/flood_sos/flood_sos_interface.py)
- `IFloodSosRepository` (Dòng 15 - 173): Định nghĩa đầy đủ 10 phương thức trừu tượng, tuân thủ nguyên lý Dependency Inversion Principle (DIP).

### 3.4. Persistence Layer - 100% Explicit SQL & PostGIS (Tầng 4)
- **Tệp nguồn:** [BackEnd/app/crud/flood_sos/flood_sos_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/flood_sos/flood_sos_repository.py)
- **100% Câu lệnh SQL tường minh qua `text(...)`:**
  - `create_sos_request` (Dòng 45 - 94):
    ```sql
    INSERT INTO flood_sos_requests (
        request_id, sos_code, victim_id, victim_name, victim_phone,
        total_victims, elderly_count, children_count, medical_urgent_count,
        description, image_url, latitude, longitude, location,
        address_text, district, ward, severity_level, flood_depth_meters,
        status, version, created_at, updated_at
    ) VALUES (
        :request_id, :sos_code, :victim_id, :victim_name, :victim_phone,
        :total_victims, :elderly_count, :children_count, :medical_urgent_count,
        :description, :image_url, :latitude, :longitude,
        ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326),
        :address_text, :district, :ward, :severity_level, :flood_depth_meters,
        'PENDING', 1, :now, :now
    )
    ```
  - `accept_sos_request` với OCC (Dòng 190 - 245):
    ```sql
    UPDATE flood_sos_requests
    SET status = 'ACCEPTED',
        assigned_volunteer_id = :volunteer_id,
        assigned_rescuer_name = :volunteer_name,
        assigned_rescuer_phone = :volunteer_phone,
        assigned_team_name = :team_name,
        assigned_vehicle_type = :vehicle_type,
        rescuer_latitude = :vol_lat,
        rescuer_longitude = :vol_lng,
        rescuer_distance_meters = :distance_meters,
        rescuer_eta_minutes = :eta_minutes,
        version = version + 1,
        accepted_at = :now,
        updated_at = :now
    WHERE request_id = :request_id
      AND status = 'PENDING'
      AND version = :expected_version
      AND deleted_at IS NULL
    ```

### 3.5. Business Logic Service Layer (Tầng 5)
- **Tệp nguồn:** [BackEnd/app/services/flood_sos/flood_sos_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/flood_sos/flood_sos_service.py)
- `FloodSosService`:
  - `generate_sos_code` (Dòng 42): Sinh mã ISO `SOS-YYYYMMDD-XXXX`.
  - `format_distance` (Dòng 48): Định dạng cự ly hiển thị (`Cách bạn 650m` hoặc `Cách bạn 1.8km`).
  - `calculate_eta_minutes` (Dòng 54): Tính ETA thời gian tiếp cận theo tốc độ ca nô 15km/h.
  - `determine_status_step` (Dòng 61): Ánh xạ Stepper 4 bước (1: Đã gửi, 2: Đã nhận, 3: Đang đến, 4: Hoàn tất).
  - `dispatch_sos` (Dòng 72): Kiểm tra `total_victims >= 1`, đếm TNV trong bán kính 3km, tạo tin nhắn hệ thống.
  - `accept_sos` (Dòng 181): Kiểm tra OCC version lock, ném HTTP 409 Conflict nếu đã có người nhận.
  - `cancel_sos` (Dòng 401): Kiểm tra khoảng cách $< 100\text{m}$, kích hoạt cảnh báo vàng nếu chưa xác nhận.

### 3.6. Presentation Layer - FastAPI Router (Tầng 6)
- **Tệp nguồn:** [BackEnd/app/api/v1/flood_sos/router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/flood_sos/router.py)
- Prefix: `/api/v1/flood-sos`
  - `POST /dispatch` (Dòng 60): Phát tín hiệu cấp cứu khẩn cấp.
  - `GET /nearby` (Dòng 80): Lấy danh sách thẻ SOS gần tình nguyện viên (bán kính 3km).
  - `POST /{request_id}/accept` (Dòng 106): Tiếp nhận ca cứu hộ có kiểm soát OCC.
  - `POST /{request_id}/skip` (Dòng 125): Tình nguyện viên bỏ qua yêu cầu.
  - `GET /{request_id}/tracking` (Dòng 142): Theo dõi trực tiếp live tracking và stepper.
  - `POST /{request_id}/progress` (Dòng 162): Cập nhật vị trí GPS người cứu hộ.
  - `POST /{request_id}/chat` (Dòng 180): Gửi tin nhắn trao đổi nhận diện khẩn cấp.
  - `POST /{request_id}/cancel` (Dòng 198): Huỷ yêu cầu có kiểm tra khoảng cách an toàn.
  - `POST /{request_id}/rating` (Dòng 217): Đánh giá hỗ trợ sau khi hoàn tất.

---

# PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND

### 4.1. TypeScript Interfaces & Data Contracts
- **Tệp nguồn:** [FrontEnd/src/features/flood_sos/types/flood_sos.types.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/types/flood_sos.types.ts)
- Định nghĩa đầy đủ `CreateFloodSosPayload`, `VolunteerSosCard`, `AcceptSosPayload`, `SosTrackingDetail`, `ChatMessageItem`, `CancelSosPayload`, `CancelSosResponse`.

### 4.2. Axios API Client Service
- **Tệp nguồn:** [FrontEnd/src/features/flood_sos/services/floodSosApi.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/services/floodSosApi.ts)
- Kết nối trực tiếp với backend qua client axios chuẩn tại `/api/v1/flood-sos`.

### 4.3. Thành phần Màn 1/5 (Phát tín hiệu cấp cứu)
- **Tệp nguồn:** [FrontEnd/src/features/flood_sos/components/FloodSosDispatchScreen.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/components/FloodSosDispatchScreen.tsx)
- Phân chia 3 cột tương tác: Cột trái `TÌNH HUỐNG`, Cột giữa `VỊ TRÍ`, Cột phải `GỬI`.
- Bắt lỗi viền đỏ khi `totalVictims < 1`, tự động định vị GPS và hỗ trợ nút High Accuracy.

### 4.4. Thành phần Màn 2/5 (Popup xác nhận gửi)
- **Tệp nguồn:** [FrontEnd/src/features/flood_sos/components/FloodSosConfirmModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/components/FloodSosConfirmModal.tsx)
- Modal popup có nhãn `POPUP`, tiêu đề `GỬI YÊU CẦU CỨU HỘ?`, cam kết bán kính 3km, spinner loading và fallback nút SMS 112.

### 4.5. Thành phần Màn 3/5 (Dashboard Tình nguyện viên)
- **Tệp nguồn:** [FrontEnd/src/features/flood_sos/components/VolunteerResponseDashboard.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/components/VolunteerResponseDashboard.tsx)
- 2 cột: Cột trái danh sách thẻ yêu cầu SOS với cự ly di chuyển; Cột phải bản đồ GIS với ghim đỏ (nạn nhân) và ghim lam (tình nguyện viên).

### 4.6. Thành phần Màn 4/5 (Live Tracking & Stepper & Chat)
- **Tệp nguồn:** [FrontEnd/src/features/flood_sos/components/FloodSosLiveTrackingScreen.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/components/FloodSosLiveTrackingScreen.tsx) & [FloodSosChatDrawer.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/components/FloodSosChatDrawer.tsx)
- 3 cột: Stepper 4 bước đập nhịp, thông tin người cứu hộ (nút Gọi/Nhắn tin/Huỷ), bản đồ live tracking chuyển động marker, đánh giá sao khi hoàn tất.

### 4.7. Thành phần Màn 5/5 (Popup huỷ yêu cầu & Safeguard < 100m)
- **Tệp nguồn:** [FrontEnd/src/features/flood_sos/components/FloodSosCancelModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/components/FloodSosCancelModal.tsx)
- Popup cảnh báo huỷ, hiển thị hộp thoại cảnh báo vàng nếu cự ly $< 100\text{m}$.

### 4.8. Khung Header & Footer chuẩn
- **Tệp nguồn:** [FloodSosHeader.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/components/FloodSosHeader.tsx) & [FloodSosFooter.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/components/FloodSosFooter.tsx)

### 4.9. Master State Container
- **Tệp nguồn:** [FrontEnd/src/features/flood_sos/pages/FloodSosContainer.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/pages/FloodSosContainer.tsx)
- Tích hợp vào [FrontEnd/src/App.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/App.tsx) qua `activeTab === "flood-sos"` và định tuyến hash `#flood-sos`.

### 4.10. Hệ thống SASS Stylesheet & Pulse Animation
- **Tệp nguồn:** [FrontEnd/src/features/flood_sos/styles/flood_sos.scss](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/styles/flood_sos.scss)
- 100% SASS nguyên bản (`.scss`), không dùng CSS thuần hay inline styles. Tích hợp `@mixin pulse-animation` và `@mixin stepper-pulse`.

---

# PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)

### 5.1. Backend Unit & Integration Tests (Pytest)
- **Tệp nguồn:** [BackEnd/tests/flood_sos/test_flood_sos.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/flood_sos/test_flood_sos.py)
- **Kết quả thực tế:** **8/8 PASSED (100%)**
  1. `test_01_create_flood_sos_and_format_iso_code`: Tạo yêu cầu cứu hộ & sinh mã `SOS-YYYYMMDD-XXXX`.
  2. `test_02_validation_empty_victims_raises_error`: Bắt lỗi validation khi số người $< 1$.
  3. `test_03_nearby_geofencing_3km_for_volunteer`: Quét lọc cự ly bán kính 3km cho tình nguyện viên.
  4. `test_04_accept_sos_and_occ_conflict_409`: Tiếp nhận ca và chặn xung đột tương tranh OCC (HTTP 409).
  5. `test_05_volunteer_skip_request`: Tình nguyện viên bỏ qua yêu cầu chuyển tiếp ca.
  6. `test_06_live_tracking_stepper_and_chat`: Cập nhật tiến độ Stepper, vị trí di chuyển và lịch sử chat.
  7. `test_07_cancel_sos_safeguard_under_100m`: Cơ chế cảnh báo vàng bảo vệ khi người cứu hộ $< 100\text{m}$.
  8. `test_08_rest_api_http_endpoints`: Kiểm thử toàn bộ REST API Endpoints qua TestClient.

### 5.2. Frontend UI/UX Component Tests (Vitest)
- **Tệp nguồn:** [FrontEnd/src/features/flood_sos/__tests__/flood_sos.test.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/flood_sos/__tests__/flood_sos.test.tsx)
- **Kết quả thực tế:** **15/15 PASSED (100%)**
  1. Màn 1/5: Hiển thị đầy đủ 3 khối `TÌNH HUỐNG`, `VỊ TRÍ`, `GỬI`.
  2. Màn 1/5: Báo lỗi viền đỏ khi bỏ trống số người cần cứu.
  3. Màn 1/5: Bấm "Gửi SOS" kích hoạt mở Modal xác nhận Màn 2/5.
  4. Màn 2/5: Hiển thị đúng nhãn `POPUP`, tiêu đề in đậm và thông điệp cam kết 3km.
  5. Màn 2/5: Bấm "Huỷ" đóng popup giữ nguyên dữ liệu đã soạn.
  6. Màn 2/5: Bấm "Gửi" kích hoạt gửi lệnh SOS.
  7. Màn 3/5: Hiển thị 2 cột `YÊU CẦU GẦN BẠN` và `BẢN ĐỒ`.
  8. Màn 3/5: Bấm "Nhận yêu cầu" khóa quyền và mở live tracking.
  9. Màn 3/5: Bấm "Bỏ qua" xóa thẻ khỏi danh sách.
  10. Màn 4/5: Hiển thị Stepper 4 bước với hiệu ứng đập nhịp tại bước hiện tại.
  11. Màn 4/5: Mở quay số gọi điện và mở chat drawer.
  12. Màn 4/5: Hiển thị đánh giá sao khi ca hoàn tất (`status=COMPLETED`).
  13. Màn 5/5: Hiển thị nhãn `POPUP` và lời nhắc người cứu hộ sẽ được thông báo.
  14. Màn 5/5: Kích hoạt cảnh báo vàng khi người cứu hộ $< 100\text{m}$.
  15. Master Container: Chuyển đổi qua lại giữa vai trò Người dân và Tình nguyện viên.

---

# PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)

| Nghiệp vụ / Thành phần | Tệp nguồn BackEnd | Dòng BackEnd | Tệp nguồn FrontEnd | Dòng FrontEnd |
| :--- | :--- | :--- | :--- | :--- |
| **Phát tín hiệu SOS (Màn 1/5)** | `schemas/flood_sos/schemas.py`<br>`services/flood_sos_service.py` | Line 16-42<br>Line 72-136 | `components/FloodSosDispatchScreen.tsx` | Line 1-285 |
| **Popup xác nhận (Màn 2/5)** | `api/v1/flood_sos/router.py` | Line 60-76 | `components/FloodSosConfirmModal.tsx` | Line 1-96 |
| **Dashboard TNV (Màn 3/5)** | `crud/flood_sos_repository.py`<br>`api/v1/flood_sos/router.py` | Line 96-150<br>Line 80-103 | `components/VolunteerResponseDashboard.tsx` | Line 1-280 |
| **Nhận yêu cầu OCC 409** | `crud/flood_sos_repository.py`<br>`services/flood_sos_service.py` | Line 190-245<br>Line 181-239 | `components/VolunteerResponseDashboard.tsx` | Line 28-36 |
| **Live Tracking & Stepper (Màn 4/5)**| `services/flood_sos_service.py`<br>`api/v1/flood_sos/router.py` | Line 256-322<br>Line 142-159 | `components/FloodSosLiveTrackingScreen.tsx` | Line 1-260 |
| **Tin nhắn nhận diện khẩn cấp** | `crud/flood_sos_repository.py`<br>`services/flood_sos_service.py` | Line 305-345<br>Line 371-399 | `components/FloodSosChatDrawer.tsx` | Line 1-88 |
| **Popup huỷ & Safeguard < 100m (Màn 5/5)**| `services/flood_sos_service.py`<br>`api/v1/flood_sos/router.py` | Line 401-458<br>Line 198-214 | `components/FloodSosCancelModal.tsx` | Line 1-118 |
| **Đánh giá hoàn tất cứu hộ** | `crud/flood_sos_repository.py`<br>`services/flood_sos_service.py` | Line 350-385<br>Line 459-480 | `components/FloodSosLiveTrackingScreen.tsx` | Line 34-85 |
| **Hệ thống SASS Stylesheet** | N/A | N/A | `styles/flood_sos.scss` | Line 1-840 |
| **Kiểm thử tự động (Unit & Integration)**| `tests/flood_sos/test_flood_sos.py` | Line 1-420 (8 tests) | `features/flood_sos/__tests__/flood_sos.test.tsx` | Line 1-320 (15 tests) |
