# 📚 TÀI LIỆU KỸ THUẬT CỐT LÕI TÍNH NĂNG STT 45
# HỆ THỐNG CẢNH BÁO KHẨN CẤP THEO VỊ TRÍ & COMMUNITY SAFETY CHECK
## (Location-Based Emergency Broadcast Alert & Community Safety Check System)

> **Mục đích tài liệu:** Tổng hợp toàn diện, chuẩn xác 100% vị trí các thành phần mã nguồn cốt lõi (Core Logic) của **Tính năng STT 45** bao gồm cả **BackEnd** (FastAPI / SQLAlchemy / PostGIS / Explicit SQL / Clean Architecture) và **FrontEnd** (React / TypeScript / Leaflet GIS / Stepped Slider / Vitest).  
> Toàn bộ số dòng, tên lớp, tên hàm, câu lệnh SQL và đường dẫn tệp trong tài liệu này đều được **đối soát và trích xuất trực tiếp 100% từ mã nguồn thực tế đang hoạt động trong repository**, cam kết **tuyệt đối không có bất kỳ thông tin giả định hay suy diễn sai lệch nào**.

---

## 📑 MỤC LỤC TỔNG QUAN

1. [PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG](#phần-1-kiến-trúc-tổng-quan--clean-architecture-6-tầng)
2. [PHẦN 2: ĐẶC TẢ CHI TIẾT 4 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN](#phần-2-đặc-tả-chi-tiết-4-màn-hình-nghiệp-vụ--ánh-xạ-mã-nguồn)
   - [2.1. Màn 1/4: Trung Tâm Phát Lệnh Cảnh Báo Thiên Tai Khẩn Cấp (Emergency Broadcast Console)](#21-màn-14-trung-tâm-phát-lệnh-cảnh-báo-thiên-tai-khẩn-cấp-emergency-broadcast-console)
   - [2.2. Màn 2/4: Giao Diện Thông Báo Khẩn Cấp (Emergency Alert Modal - User View)](#22-màn-24-giao-diện-thông-báo-khẩn-cấp-emergency-alert-modal---user-view)
   - [2.3. Màn 3/4: Xác Nhận Trạng Thái An Toàn Cộng Đồng (Community Disaster Safety Check)](#23-màn-34-xác-nhận-trạng-thái-an-toàn-cộng-đồng-community-disaster-safety-check)
   - [2.4. Màn 4/4: Cửa Sổ Xác Nhận Hoàn Tất Báo An Toàn (Safety Check Completed Modal)](#24-màn-44-cửa-sổ-xác-nhận-hoàn-tất-báo-an-toàn-safety-check-completed-modal)
3. [PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND](#phần-3-chi-tiết-mã-nguồn-cốt-lõi-phía-backend)
   - [3.1. Domain Entities & Database Models](#31-domain-entities--database-models)
   - [3.2. Data Transfer Objects (Pydantic v2 Schemas)](#32-data-transfer-objects-pydantic-v2-schemas)
   - [3.3. Abstractions & DIP Interfaces](#33-abstractions--dip-interfaces)
   - [3.4. Persistence Layer (100% Explicit SQL & PostGIS)](#34-persistence-layer-100-explicit-sql--postgis)
   - [3.5. Business Logic Service Layer](#35-business-logic-service-layer)
   - [3.6. Presentation Layer: FastAPI Router & Phân Quyền RBAC](#36-presentation-layer-fastapi-router--phân-quyền-rbac)
4. [PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND](#phần-4-chi-tiết-mã-nguồn-cốt-lõi-phía-frontend)
   - [4.1. TypeScript Interfaces & Data Contracts](#41-typescript-interfaces--data-contracts)
   - [4.2. Axios API Client Service](#42-axios-api-client-service)
   - [4.3. Thành Phần Giao Diện Màn 1/4 (Console Phát Lệnh)](#43-thành-phần-giao-diện-màn-14-console-phát-lệnh)
   - [4.4. Thành Phần Giao Diện Màn 2/4 (Popup Cảnh Báo Ưu Tiên)](#44-thành-phần-giao-diện-màn-24-popup-cảnh-báo-ưu-tiên)
   - [4.5. Thành Phần Giao Diện Màn 3/4 (Báo An Toàn & Danh Bạ Bạn Bè)](#45-thành-phần-giao-diện-màn-34-báo-an-toàn--danh-bạ-bạn-bè)
   - [4.6. Thành Phần Giao Diện Màn 4/4 (Popup Đã Báo An Toàn)](#46-thành-phần-giao-diện-màn-44-popup-đã-báo-an-toàn)
   - [4.7. Khung Quản Trị Hệ Thống (Header & Footer)](#47-khung-quản-trị-hệ-thống-header--footer)
   - [4.8. Hệ Thống CSS Stylesheet & Hiệu Ứng Báo Động](#48-hệ-thống-css-stylesheet--hiệu-ứng-báo-động)
5. [PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)](#phần-5-bộ-kiểm-thử-tự-động-automated-test-suites)
   - [5.1. Backend Unit & Integration Tests (Pytest)](#51-backend-unit--integration-tests-pytest)
   - [5.2. Frontend UI/UX Component Tests (Vitest)](#52-frontend-uiux-component-tests-vitest)
6. [PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)](#phần-6-bảng-tra-cứu-nhanh-dòng-mã-nguồn-full-stack-cheat-sheet)

---

# PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG

Tính năng STT 45 được thiết kế tuân thủ nghiêm ngặt chuẩn mực **Clean Architecture** và nguyên lý **Dependency Inversion Principle (DIP)**:

```
BackEnd/app/
├── models/emergency_alert/            # [TẦNG 1: DOMAIN ENTITIES]
│   ├── alert.py                       # UserDeviceLocation, EmergencyBroadcastAlert, EmergencyAlertRecipient, EmergencySOSSignal
│   ├── safety_check.py                # UserSafetyCheck, SafetyCheckFriendDelivery
│   └── __init__.py                    # Model registry export
│
├── schemas/emergency_alert/           # [TẦNG 2: DATA TRANSFER OBJECTS (DTO)]
│   ├── schemas.py                     # Pydantic v2 schemas cho 4 màn hình nghiệp vụ
│   └── __init__.py
│
├── interface/emergency_alert/         # [TẦNG 3: ABSTRACTIONS (DIP CONTRACTS)]
│   ├── alert_interface.py             # IEmergencyAlertRepository, ISafetyCheckRepository
│   └── __init__.py
│
├── crud/emergency_alert/              # [TẦNG 4: PERSISTENCE (100% EXPLICIT SQL)]
│   ├── alert_repository.py            # EmergencyAlertRepository, SafetyCheckRepository (PostGIS ST_DWithin, ST_Distance, OCC)
│   └── __init__.py
│
├── services/emergency_alert/          # [TẦNG 5: BUSINESS LOGIC SERVICES]
│   ├── alert_service.py               # EmergencyAlertService (Broadcast, Geofence, SOS, Safety Check, SMS Fallback)
│   └── __init__.py
│
└── api/v1/emergency_alert/            # [TẦNG 6: TRANSPORT & PRESENTATION]
    ├── router.py                      # FastAPI Endpoints bảo vệ RBAC (Admin/Officer & Citizen)
    └── __init__.py
```

---

# PHẦN 2: ĐẶC TẢ CHI TIẾT 4 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN

### 2.1. Màn 1/4: Trung Tâm Phát Lệnh Cảnh Báo Thiên Tai Khẩn Cấp (Emergency Broadcast Console)
- **Đối tượng sử dụng:** Quản trị viên (`ADMIN`), Cán bộ Ban Chỉ huy PCTT & TKCN (`COORDINATOR`, `DISTRICT_MANAGER`, `OFFICER`).
- **Mã nguồn FrontEnd:** [Screen1BroadcastConsole.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/emergency_alert/components/Screen1BroadcastConsole.tsx) (547 dòng).
- **Mã nguồn BackEnd:** 
  - Khởi tạo & Phát sóng: [alert_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/emergency_alert/alert_service.py#L89-L183) (`broadcast_alert`).
  - Đếm người nhận thời gian thực: [alert_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/emergency_alert/alert_repository.py#L33-L58) (`count_users_in_radius`).
- **Cấu trúc 3 khối làm việc:**
  1. **Khối "NỘI DUNG" (Cột trái):**
     - Loại cảnh báo (4 thẻ chọn): `FLOOD` (Ngập lụt nghiêm trọng), `STORM` (Bão / Lốc xoáy), `TIDE` (Triều cường dâng cao), `POLLUTION` (Sự cố hóa chất / Ô nhiễm) — Dòng 281 - 317.
     - Tiêu đề báo động cao: `"BÁO ĐỘNG NGẬP SÂU TRÊN 0.8M TẠI ĐƯỜNG AN DƯƠNG VƯƠNG"` — Dòng 320 - 328.
     - Khuyến cáo sơ tán & Hotline: Tuyến tránh đường Trần Hưng Đạo/Võ Văn Kiệt; Hotline `114 - 115 - 18006868` — Dòng 331 - 347.
  2. **Khối "PHẠM VI" (Cột giữa):**
     - Bản đồ GIS Leaflet kéo thả ghim tâm (`center_latitude`, `center_longitude`) — Dòng 387 - 393.
     - Thanh trượt bán kính phân bậc (Stepped Slider 5 mốc chuẩn: `500m`, `1km`, `2km`, `5km`, `10km`) với vạch chia mốc 1:1 — Dòng 396 - 440.
     - Badge đếm số người dự kiến nhận không gian PostGIS thời gian thực (`ST_DWithin`) — Dòng 443 - 455.
  3. **Khối "GỬI" & LỊCH SỬ (Cột phải):**
     - Nút đỏ báo động "Gửi cảnh báo" & Nút "Huỷ" — Dòng 469 - 492.
     - Lịch sử phát sóng thời gian thực kèm tính năng thu hồi bảo vệ OCC version — Dòng 495 - 533.

---

### 2.2. Màn 2/4: Giao Diện Thông Báo Khẩn Cấp (Emergency Alert Modal - User View)
- **Đối tượng sử dụng:** Người dân khi thiết bị đi vào vùng Geofencing nguy hiểm.
- **Mã nguồn FrontEnd:** [Screen2AlertModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/emergency_alert/components/Screen2AlertModal.tsx) (205 dòng).
- **Mã nguồn BackEnd:** 
  - API kiểm tra cảnh báo vùng: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/emergency_alert/router.py#L185-L202) (`GET /api/v1/emergency-alerts/active-for-user`).
  - API kích hoạt cứu hộ SOS: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/emergency_alert/router.py#L204-L214) (`POST /api/v1/emergency-alerts/sos`).
- **Cấu trúc Popup ưu tiên cao nhất:**
  - Nhãn `POPUP` và tam giác cảnh báo đỏ nhấp nháy phát âm thanh báo động — Dòng 81 - 88.
  - Tiêu đề in đậm: `"CẢNH BÁO KHẨN CẤP"` kèm thông điệp: `"Ngập nặng trong bán kính 2 km quanh bạn"` — Dòng 90 - 98.
  - Cụm 3 nút hành động tương tác:
    * **Nút "Tôi an toàn":** Điều hướng sang Màn 3/4 Safety Check — Dòng 135 - 141.
    * **Nút "Cần giúp đỡ" (SOS):** Gửi GPS khẩn cấp tới TTĐH STT 43 và hiển thị hotline 114/115 — Dòng 143 - 149.
    * **Nút "Xem chi tiết":** Mở bản đồ điều hướng tránh ngập an toàn STT 41 — Dòng 151 - 157.

---

### 2.3. Màn 3/4: Xác Nhận Trạng Thái An Toàn Cộng Đồng (Community Disaster Safety Check)
- **Đối tượng sử dụng:** Công dân báo an toàn cho gia đình, bạn bè và hiển thị huy hiệu lên Geo-Feed.
- **Mã nguồn FrontEnd:** [Screen3SafetyCheck.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/emergency_alert/components/Screen3SafetyCheck.tsx) (304 dòng).
- **Mã nguồn BackEnd:** 
  - Khởi tạo vị trí & danh bạ bạn bè: [alert_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/emergency_alert/alert_service.py#L314-L357) (`init_safety_check`).
  - Truy vấn bạn bè 2 chiều từ bảng `friendships`: [alert_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/emergency_alert/alert_repository.py#L328-L360) (`get_friends_for_safety_check`).
  - Báo an toàn cá nhân: [alert_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/emergency_alert/alert_service.py#L358-L386) (`mark_safe_self`).
- **Cấu trúc 2 cột tương tác:**
  - **Khối "XÁC NHẬN AN TOÀN" (Cột trái):**
    * Vị trí GPS thời gian thực kèm dấu tích xanh xác thực: `"Đường An Dương Vương, Phường 3, Quận 5, TP.HCM"` — Dòng 175 - 186.
    * Nút lớn "🛡️ Tôi an toàn" cập nhật trạng thái an toàn lên hồ sơ cá nhân và bảng tin cộng đồng STT 08 — Dòng 203 - 211.
  - **Khối "GỬI CHO" (Cột phải):**
    * Tích hợp trực tiếp danh bạ bạn bè thực tế từ tính năng Bạn bè & Kết nối (bảng `friendships`) — Dòng 226 - 280.
    * Hỗ trợ công cụ "Chọn tất cả" và chọn lọc từng người bạn — Dòng 230 - 239.
    * Empty State thân thiện nếu tài khoản chưa có bạn bè kèm liên kết nhanh tới `#friends` — Dòng 221 - 247.
    * Nút bầu dục "Gửi cho bạn bè" chuyển tiếp sang Màn 4/4 — Dòng 282 - 289.

---

### 2.4. Màn 4/4: Cửa Sổ Xác Nhận Hoàn Tất Báo An Toàn (Safety Check Completed Modal)
- **Đối tượng sử dụng:** Công dân nhận thông báo hoàn tất phân phối tin an toàn.
- **Mã nguồn FrontEnd:** [Screen4SafetyConfirmModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/emergency_alert/components/Screen4SafetyConfirmModal.tsx) (104 dòng).
- **Mã nguồn BackEnd:** 
  - Phân phối tin và lưu vết SMS fallback: [alert_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/emergency_alert/alert_service.py#L387-L456) (`send_safety_check_to_friends`).
  - Ghi nhận CSDL bảng `safety_check_deliveries`: [alert_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/emergency_alert/alert_repository.py#L370-L380) (`bulk_create_friend_deliveries`).
- **Cấu trúc Modal Popup:**
  - Nhãn `POPUP` và biểu tượng chiếc khiên bảo vệ xanh lá cây checkmark — Dòng 32 - 40.
  - Tiêu đề in đậm: `"ĐÃ BÁO AN TOÀN"` — Dòng 42.
  - Thông điệp chính: `"Bạn bè đã nhận thông báo"` — Dòng 45.
  - Thông số số lượng người nhận thành công: `"Thông báo trạng thái an toàn của bạn đã được gửi thành công đến [N] bạn bè"` — Dòng 48 - 52.
  - Ghi chú SMS Fallback (nếu có bạn bè tắt push): `"Đã gửi thông báo. Một số bạn bè tắt thông báo sẽ nhận được tin nhắn SMS thay thế."` — Dòng 55 - 61.
  - Nút hành động duy nhất: "Đóng" (quay lại Bảng tin Geo-Feed STT 08 hoặc màn hình chính) — Dòng 65 - 71.

---

# PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND

## 3.1. Domain Entities & Database Models

### A. Tệp `BackEnd/app/models/emergency_alert/alert.py` (126 dòng)
1. **`UserDeviceLocation` (Dòng 28 - 48):**
   - Bảng: `user_device_locations`
   - Khóa chính: `location_id` (UUID).
   - Tọa độ hình học: `location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)`.
   - Vĩ độ / Kinh độ: `latitude` (Float), `longitude` (Float).
   - Địa chỉ: `address_text` (String 500), `district` (String 100, index=True), `ward` (String 100).
   - Trạng thái hoạt động & Ping: `is_active` (Boolean, index=True), `last_ping_at` (DateTime with timezone).
   - Xóa mềm: `deleted_at` (DateTime with timezone).
2. **`EmergencyBroadcastAlert` (Dòng 50 - 83):**
   - Bảng: `emergency_broadcast_alerts`
   - Khóa chính: `alert_id` (UUID).
   - Mã lệnh duy nhất: `alert_code` (String 50, unique=True, index=True).
   - Loại thiên tai: `alert_type` (String 50: `FLOOD`, `STORM`, `TIDE`, `POLLUTION`).
   - Tiêu đề & Nội dung: `title` (String 255), `content` (Text).
   - Vùng đệm phát sóng: `center_location` (Geometry POINT 4326), `center_latitude` (Float), `center_longitude` (Float), `radius_meters` (Float), `severity_level` (String 50).
   - Thống kê: `estimated_recipients` (Integer), `actual_sent_count` (Integer), `status` (String 50: `BROADCASTED`, `CANCELLED`, `EXPIRED`).
   - Kiểm soát đồng thời OCC: `version` (Integer, default=1).
   - Xóa mềm: `deleted_at` (DateTime with timezone).
3. **`EmergencyAlertRecipient` (Dòng 85 - 104):**
   - Bảng: `emergency_alert_recipients`
   - Vết tiếp nhận: `alert_id` (FK `emergency_broadcast_alerts`), `user_id` (FK `users`), `distance_meters` (Float).
   - Trạng thái phản hồi: `status` (`DELIVERED`, `ACKNOWLEDGED`), `action_taken` (`SAFE`, `SOS`, `VIEW_DETAILS`, `NONE`), `action_at`.
4. **`EmergencySOSSignal` (Dòng 106 - 126):**
   - Bảng: `emergency_sos_signals`
   - Tín hiệu cứu nạn: `sos_id` (UUID), `user_id`, `latitude`, `longitude`, `location_address`, `phone_number`, `notes`.
   - Trạng thái tác nghiệp: `status` (`PENDING`, `DISPATCHED`, `RESOLVED`).

### B. Tệp `BackEnd/app/models/emergency_alert/safety_check.py` (70 dòng)
1. **`UserSafetyCheck` (Dòng 26 - 53):**
   - Bảng: `user_safety_checks`
   - Khóa chính: `check_id` (UUID).
   - Báo an toàn: `user_id` (FK `users`), `alert_id` (FK `emergency_broadcast_alerts`, nullable=True).
   - Trạng thái: `is_safe` (Boolean, default=True), `status_message` (String 255).
   - Tọa độ GPS xác thực: `latitude` (Float), `longitude` (Float), `location_address` (String 500).
   - Thống kê phân phối: `shared_with_count` (Integer), `sms_fallback_count` (Integer).
   - Kiểm soát OCC: `version` (Integer, default=1).
2. **`SafetyCheckFriendDelivery` (Dòng 55 - 70):**
   - Bảng: `safety_check_deliveries`
   - Chi tiết gửi bạn bè: `check_id`, `friend_user_id` (FK `users`), `delivery_channel` (`PUSH_NOTIFICATION`, `SMS_FALLBACK`), `is_delivered` (Boolean), `delivered_at`.

---

## 3.2. Data Transfer Objects (Pydantic v2 Schemas)

**Tệp:** `BackEnd/app/schemas/emergency_alert/schemas.py` (199 dòng)

| STT | Tên Schema Class | Dòng | Mục đích nghiệp vụ |
| :---: | :--- | :---: | :--- |
| 1 | `AlertEstimateRequest` | 16 - 20 | DTO gửi tâm ghim `latitude`, `longitude`, `radius_meters` |
| 2 | `AlertEstimateResponse` | 23 - 31 | Trả về `estimated_recipients`, `radius_km`, `message` |
| 3 | `BroadcastAlertRequest` | 33 - 42 | Soạn thảo lệnh phát sóng (`alert_type`, `title`, `content`, `radius_meters`) |
| 4 | `BroadcastAlertResponse` | 44 - 53 | Phản hồi phát lệnh thành công (`alert_id`, `alert_code`, `actual_sent_count`) |
| 5 | `BroadcastHistoryItem` | 55 - 72 | Dữ liệu tóm tắt cho bảng lịch sử phát sóng kèm OCC `version` |
| 6 | `CancelAlertRequest` | 74 - 77 | Thu hồi lệnh phát sóng bảo vệ kiểm soát đồng thời `version` |
| 7 | `UserActiveAlertResponse` | 83 - 96 | DTO kiểm tra cảnh báo khẩn cấp đang bao phủ người dùng |
| 8 | `EmergencySOSRequest` | 98 - 106 | DTO gửi tín hiệu cứu nạn khẩn cấp SOS kèm GPS |
| 9 | `EmergencySOSResponse` | 108 - 114 | Phản hồi tiếp nhận SOS và danh bạ cứu hộ `114 / 115` |
| 10 | `FriendCheckboxItem` | 120 - 128 | Thông tin bạn bè trong danh sách tích chọn (`user_id`, `full_name`, `phone`) |
| 11 | `SafetyCheckInitResponse` | 130 - 140 | Tải dữ liệu ban đầu cho Màn 3/4 (`friends`, `is_gps_verified`) |
| 12 | `MarkSafeSelfRequest` | 142 - 150 | Công dân bấm "Tôi an toàn" tại hồ sơ / Màn 3/4 |
| 13 | `MarkSafeSelfResponse` | 151 - 157 | Kết quả cập nhật trạng thái an toàn lên hồ sơ cá nhân |
| 14 | `SendSafetyCheckToFriendsRequest` | 159 - 167 | Gửi tin an toàn tới danh sách `friend_user_ids` |
| 15 | `SafetyCheckModalConfirmation` | 173 - 180 | Cấu trúc dữ liệu hiển thị trên Popup Màn 4/4 |
| 16 | `SendSafetyCheckToFriendsResponse` | 182 - 190 | Kết quả toàn trình phân phối tin an toàn và SMS fallback |
| 17 | `UserLocationPingRequest` | 192 - 199 | Cập nhật vị trí GPS thiết bị người dùng chạy ngầm |

---

## 3.3. Abstractions & DIP Interfaces

**Tệp:** `BackEnd/app/interface/emergency_alert/alert_interface.py` (141 dòng)

* **`IEmergencyAlertRepository` (Dòng 23 - 109):** Khai báo 11 phương thức trừu tượng định nghĩa hợp đồng thao tác với lệnh phát sóng, Geofencing PostGIS, và tín hiệu SOS.
* **`ISafetyCheckRepository` (Dòng 111 - 141):** Khai báo 4 phương thức trừu tượng định nghĩa hợp đồng thao tác với danh bạ bạn bè 2 chiều, báo an toàn cá nhân và phân phối thông báo bạn bè.

---

## 3.4. Persistence Layer (100% Explicit SQL & PostGIS)

**Tệp:** `BackEnd/app/crud/emergency_alert/alert_repository.py` (414 dòng)

### A. Truy Vấn Không Gian PostGIS Đếm Số Người Trong Bán Kính
- **Phương thức:** `count_users_in_radius` (Dòng 33 - 58):
```python
sql = text("""
    SELECT COUNT(DISTINCT l.user_id) AS total_count
    FROM user_device_locations l
    WHERE l.is_active = TRUE
      AND l.deleted_at IS NULL
      AND ST_DWithin(
          ST_Transform(l.location, 3857),
          ST_Transform(ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326), 3857),
          :radius_meters
      )
""")
```

### B. Truy Vấn Lấy Danh Sách Thiết Bị Và Đo Khoảng Cách Cung Tròn
- **Phương thức:** `get_user_device_locations_in_radius` (Dòng 59 - 92):
```python
sql = text("""
    SELECT 
        l.user_id,
        l.latitude,
        l.longitude,
        ST_Distance(
            ST_Transform(l.location, 3857),
            ST_Transform(ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326), 3857)
        ) AS distance_meters
    FROM user_device_locations l
    WHERE l.is_active = TRUE
      AND l.deleted_at IS NULL
      AND ST_DWithin(
          ST_Transform(l.location, 3857),
          ST_Transform(ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326), 3857),
          :radius_meters
      )
    ORDER BY distance_meters ASC
""")
```

### C. Truy Vấn Cảnh Báo Đang Hoạt Động Bao Phủ Vị Trí Người Dùng
- **Phương thức:** `get_active_alert_covering_location` (Dòng 146 - 176):
```python
sql = text("""
    SELECT 
        a.alert_id,
        ST_Distance(
            ST_Transform(a.center_location, 3857),
            ST_Transform(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 3857)
        ) AS distance_to_center_meters
    FROM emergency_broadcast_alerts a
    WHERE a.status = 'BROADCASTED'
      AND a.deleted_at IS NULL
      AND ST_DWithin(
          ST_Transform(a.center_location, 3857),
          ST_Transform(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 3857),
          a.radius_meters
      )
    ORDER BY distance_to_center_meters ASC
    LIMIT 1
""")
```

### D. Truy Vấn Danh Bạ Bạn Bè 2 Chiều Từ Bảng Friendships
- **Phương thức:** `get_friends_for_safety_check` (Dòng 328 - 360):
```python
sql = text("""
    SELECT 
        u.user_id,
        u.full_name,
        u.avatar_url,
        u.phone_number
    FROM friendships f
    JOIN users u ON (
        (f.user_id_1 = :user_id AND f.user_id_2 = u.user_id) OR
        (f.user_id_2 = :user_id AND f.user_id_1 = u.user_id)
    )
    WHERE f.deleted_at IS NULL
      AND u.deleted_at IS NULL
    ORDER BY u.full_name ASC
""")
```

---

## 3.5. Business Logic Service Layer

**Tệp:** `BackEnd/app/services/emergency_alert/alert_service.py` (472 dòng)

- **`estimate_recipients` (Dòng 65 - 88):** Kiểm tra tham số và tính toán chuỗi thông điệp ước tính số lượng người dân trong vùng bán kính.
- **`broadcast_alert` (Dòng 89 - 183):**
  * Validate tiêu đề, nội dung, phạm vi bán kính ($100$m $\le R \le 50.000$m).
  * Sinh mã định danh cảnh báo tự động: `ALERT-{YYYYMMDD}-{HEX}`.
  * Quét vị trí thiết bị trong bán kính và tạo hàng loạt bản ghi `EmergencyAlertRecipient`.
  * Đẩy thông báo hệ thống `Notification` cho các công dân trong vùng.
- **`cancel_alert` (Dòng 211 - 241):** Kiểm tra Optimistic Concurrency Control (OCC `version`). Nếu version không khớp, báo lỗi `HTTP 409 Conflict`. Chuyển trạng thái sang `CANCELLED`.
- **`get_active_alert_for_user` (Dòng 242 - 280):** Xác định cảnh báo gần nhất bao phủ tọa độ GPS của người dùng và kiểm tra trạng thái đã báo an toàn hay chưa.
- **`trigger_sos` (Dòng 281 - 305):** Ghi nhận tín hiệu cứu nạn khẩn cấp, cập nhật vết người nhận cảnh báo và phản hồi hotline 114/115.
- **`init_safety_check` (Dòng 314 - 357):** Chuẩn bị dữ liệu hiển thị cho Màn 3/4 gồm tọa độ GPS đã xác thực và danh bạ bạn bè thực tế từ CSDL.
- **`mark_safe_self` (Dòng 358 - 386):** Lưu lượt báo an toàn cá nhân, cập nhật huy hiệu hồ sơ.
- **`send_safety_check_to_friends` (Dòng 387 - 456):** Tạo bản ghi `safety_check_deliveries`, tính toán số lượng SMS fallback cho bạn bè tắt thông báo push notification, và định dạng Modal phản hồi Màn 4/4.

---

## 3.6. Presentation Layer: FastAPI Router & Phân Quyền RBAC

**Tệp:** `BackEnd/app/api/v1/emergency_alert/router.py` (296 dòng)

- **`verify_broadcast_authority` (Dòng 64 - 94):** Middleware kiểm tra phân quyền RBAC. Chỉ cho phép các vai trò:
  `{"ADMIN", "OFFICER", "COORDINATOR", "DISTRICT_MANAGER"}` hoặc tài khoản có quyền `INCIDENTS` / `STATISTICS` được phép phát lệnh khẩn cấp. Người dùng không đủ thẩm quyền bị từ chối với mã lỗi `HTTP 403 Forbidden`.
- **Danh sách 11 RESTful Endpoints:**
  1. `POST /api/v1/emergency-alerts/estimate-recipients` (Dòng 100 - 113)
  2. `POST /api/v1/emergency-alerts/broadcast` (Dòng 115 - 133, Yêu cầu quyền Ban chỉ huy)
  3. `GET /api/v1/emergency-alerts/history` (Dòng 135 - 152)
  4. `POST /api/v1/emergency-alerts/{alert_id}/cancel` (Dòng 154 - 181, Bảo vệ OCC version)
  5. `GET /api/v1/emergency-alerts/active-for-user` (Dòng 185 - 202)
  6. `POST /api/v1/emergency-alerts/sos` (Dòng 204 - 214)
  7. `GET /api/v1/emergency-alerts/safety-check/init` (Dòng 218 - 233)
  8. `POST /api/v1/emergency-alerts/safety-check/mark-safe` (Dòng 235 - 248)
  9. `POST /api/v1/emergency-alerts/safety-check/send-to-friends` (Dòng 250 - 263)
  10. `POST /api/v1/emergency-alerts/{alert_id}/acknowledge` (Dòng 266 - 280)
  11. `POST /api/v1/emergency-alerts/location/ping` (Dòng 283 - 296)

---

# PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND

## 4.1. TypeScript Interfaces & Data Contracts

**Tệp:** `FrontEnd/src/features/emergency_alert/types/emergency_alert.types.ts` (164 dòng)

- Khai báo các kiểu dữ liệu cốt lõi: `AlertType` (`FLOOD`, `STORM`, `TIDE`, `POLLUTION`), `AlertSeverity`, `AlertStatus`.
- Định nghĩa đầy đủ các Interface tương ứng 1:1 với DTO Backend: `AlertEstimateRequest`, `AlertEstimateResponse`, `BroadcastAlertRequest`, `BroadcastAlertResponse`, `BroadcastHistoryItem`, `CancelAlertRequest`, `UserActiveAlertResponse`, `EmergencySOSRequest`, `EmergencySOSResponse`, `FriendContact`, `SafetyCheckInitResponse`, `SendSafetyCheckToFriendsResponse`.

---

## 4.2. Axios API Client Service

**Tệp:** `FrontEnd/src/features/emergency_alert/services/emergencyAlertApi.ts` (135 dòng)

- Cung cấp đối tượng singleton `emergencyAlertApi` gọi tới prefix `/api/v1/emergency-alerts`:
  * `estimateRecipients(payload)` (Dòng 30 - 33)
  * `broadcastAlert(payload)` (Dòng 38 - 41)
  * `getBroadcastHistory(limit, alertType)` (Dòng 46 - 52)
  * `cancelAlert(alertId, payload)` (Dòng 57 - 60)
  * `getActiveAlertForUser(lat, lng)` (Dòng 65 - 68)
  * `triggerSOS(payload)` (Dòng 73 - 76)
  * `acknowledgeAlert(alertId, actionTaken)` (Dòng 81 - 86)
  * `initSafetyCheck(lat, lng)` (Dòng 91 - 100)
  * `markSafeSelf(payload)` (Dòng 105 - 108)
  * `sendSafetyCheckToFriends(payload)` (Dòng 113 - 116)
  * `pingDeviceLocation(payload)` (Dòng 121 - 133)

---

## 4.3. Thành Phần Giao Diện Màn 1/4 (Console Phát Lệnh)

**Tệp:** `FrontEnd/src/features/emergency_alert/components/Screen1BroadcastConsole.tsx` (547 dòng)

- **Hằng số bán kính phân bậc (Dòng 11):** `const RADIUS_PRESETS = [500, 1000, 2000, 5000, 10000];`
- **Khởi tạo bản đồ tương tác Leaflet (Dòng 98 - 161):** Tự động render tâm ghim và vòng tròn bán kính màu đỏ phát sáng. Hỗ trợ sự kiện click bản đồ hoặc kéo marker để định vị lại tâm phát sóng.
- **Thanh trượt phân bậc Stepped Slider & Vạch mốc chuẩn 1:1 (Dòng 396 - 440):**
  * `<input type="range" min={0} max={4} step={1} ... />`
  * Đồng bộ vị trí nút trượt tỷ lệ chính xác 1:1 với 5 mốc `500m (0%)`, `1km (25%)`, `2km (50%)`, `5km (75%)`, `10km (100%)`.
  * Hàng 5 điểm mốc (Tick dots) sáng đỏ cảnh báo trên đường ray trượt.
  * Hàng 5 nút mốc bấm nhanh (Chip buttons) bên dưới.
- **Nút phát lệnh khẩn cấp (Dòng 469 - 480):** Xác thực form và gọi `emergencyAlertApi.broadcastAlert`.
- **Lịch sử phát sóng & Thu hồi OCC (Dòng 495 - 533):** Hiển thị danh sách các đợt phát sóng gần nhất và mở modal hủy lệnh.

---

## 4.4. Thành Phần Giao Diện Màn 2/4 (Popup Cảnh Báo Ưu Tiên)

**Tệp:** `FrontEnd/src/features/emergency_alert/components/Screen2AlertModal.tsx` (205 dòng)

- **Xử lý nút "Tôi an toàn" (Dòng 23 - 28):** Gọi bất đồng bộ `acknowledgeAlert(alertId, "SAFE")` và điều hướng tức thì sang Màn 3/4 Safety Check thông qua callback `onNavigateSafetyCheck()`.
- **Xử lý nút "Cần giúp đỡ" (SOS) (Dòng 31 - 64):** Gửi tọa độ GPS hiện tại lên backend `emergencyAlertApi.triggerSOS` và mở hộp thông tin đường dây nóng khẩn cấp `114 / 115`.
- **Xử lý nút "Xem chi tiết" (Dòng 67 - 72):** Kích hoạt callback `onNavigateSafeRoute()` chuyển sang module điều hướng tránh ngập STT 41.

---

## 4.5. Thành Phần Giao Diện Màn 3/4 (Báo An Toàn & Danh Bạ Bạn Bè)

**Tệp:** `FrontEnd/src/features/emergency_alert/components/Screen3SafetyCheck.tsx` (304 dòng)

- **Tải dữ liệu danh bạ bạn bè thực tế (Dòng 29 - 84):** Gọi `emergencyAlertApi.initSafetyCheck(lat, lng)`, nhận danh bạ bạn bè kết nối 2 chiều từ CSDL PostgreSQL (bảng `friendships`). Loại bỏ hoàn toàn các dữ liệu giả lập.
- **Xử lý nút "Tôi an toàn" (Dòng 87 - 107):** Gọi `emergencyAlertApi.markSafeSelf`, cập nhật trạng thái `SAFE` lên hồ sơ cá nhân.
- **Danh sách bạn bè tích chọn & Empty State (Dòng 218 - 285):**
  * Nếu người dùng có bạn bè: Hiển thị checklist bạn bè có avatar, họ tên, số điện thoại, cùng thanh toolbar "Chọn tất cả".
  * Nếu tài khoản chưa có bạn bè: Hiển thị giao diện Empty State thân thiện kèm nút liên kết: `➕ Đến trang Bạn bè & Theo dõi` dẫn tới `#friends`.
- **Nút "Gửi cho bạn bè" hình bầu dục (Dòng 282 - 289):** Gửi thông báo an toàn tới các bạn bè được chọn và mở Màn 4/4.

---

## 4.6. Thành Phần Giao Diện Màn 4/4 (Popup Đã Báo An Toàn)

**Tệp:** `FrontEnd/src/features/emergency_alert/components/Screen4SafetyConfirmModal.tsx` (104 dòng)

- Biểu tượng chiếc khiên xanh bảo vệ checkmark (Dòng 34 - 39).
- Tiêu đề in đậm: `"ĐÃ BÁO AN TOÀN"` (Dòng 42).
- Thông điệp: `"Bạn bè đã nhận thông báo"` (Dòng 45).
- Hiển thị chính xác số lượng bạn bè nhận thông báo thành công (Dòng 49 - 52).
- Cảnh báo dự phòng tin nhắn SMS nếu bạn bè tắt thông báo push (Dòng 56 - 61).
- Nút bấm duy nhất: "Đóng" (Dòng 65 - 71).

---

## 4.7. Khung Quản Trị Hệ Thống (Header & Footer)

- **Header:** [EmergencyHeader.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/emergency_alert/components/EmergencyHeader.tsx) (105 dòng): Hiển thị Logo GreenSpot PCTT, huy hiệu vai trò `BAN CHỈ HUY PCTT & TKCN`, các tab chuyển đổi view và nút còi báo động demo.
- **Footer:** [EmergencyFooter.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/emergency_alert/components/EmergencyFooter.tsx) (52 dòng): Hiển thị bản quyền, thông tin liên hệ khẩn cấp 114/115/18006868 và chính sách phòng chống thiên tai.
- **Container điều phối:** [EmergencyAlertContainer.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/emergency_alert/EmergencyAlertContainer.tsx) (124 dòng): Quản lý luồng hiển thị 4 màn hình theo URL hash (`#emergency-alert`, `#safety-check`).

---

## 4.8. Hệ Thống CSS Stylesheet & Hiệu Ứng Báo Động

**Tệp:** `FrontEnd/src/features/emergency_alert/styles/emergency_alert.css` (1075 dòng)

- **Stepped Range Slider (Dòng 409 - 475):** Thanh trượt tùy biến với gradient động, con trượt thumb tròn đỏ viền trắng, và các điểm tick dots phát sáng trên ray trượt.
- **Pulsing Alert Border & Siren (Dòng 615 - 650):** Hiệu ứng viền đỏ nhấp nháy nhịp thở (`pulse-red-glow`) và còi báo động cho Màn 2/4.
- **GIS Map Overlay & Leaflet Controls (Dòng 340 - 390):** Đổ bóng bản đồ tối, vòng tròn đệm đỏ bán kính phát tán trong suốt.
- **Layout 3 Cột và 2 Cột (Dòng 80 - 150):** Căn chỉnh bố cục bảng điều khiển chỉ huy và màn hình Safety Check.

---

# PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)

## 5.1. Backend Unit & Integration Tests (Pytest)

**Tệp:** `BackEnd/tests/emergency_alert/test_emergency_alert.py` (535 dòng)  
*Tổng số test case:* **8/8 PASSED (100%)**

| STT | Tên Phương thức Test | Dòng | Nội dung kiểm thử chi tiết |
| :---: | :--- | :---: | :--- |
| 1 | `test_01_user_device_location_upsert_and_spatial_query` | 98 - 142 | Upsert vị trí GPS thiết bị, tính toán khoảng cách đại cầu PostGIS |
| 2 | `test_02_spatial_recipient_estimation` | 144 - 177 | Ước tính số người nhận trong bán kính 2km và 5km |
| 3 | `test_03_emergency_broadcast_lifecycle` | 179 - 253 | Vòng đời phát lệnh: tạo lệnh, phân phối người nhận, hủy lệnh kiểm tra OCC version |
| 4 | `test_04_emergency_alert_modal_active_query` | 255 - 294 | Truy vấn cảnh báo khẩn cấp đang bao phủ vị trí người dùng (Màn 2/4) |
| 5 | `test_05_emergency_sos_signal_dispatch` | 296 - 331 | Gửi tín hiệu cứu nạn SOS, kiểm tra ghi nhận vào CSDL |
| 6 | `test_06_community_safety_check_init_and_mark_safe` | 333 - 384 | Khởi tạo Safety Check, nạp bạn bè và đánh dấu "Tôi an toàn" (Màn 3/4) |
| 7 | `test_07_send_safety_check_to_friends_and_sms_fallback` | 386 - 440 | Phân phối tin an toàn cho bạn bè, kích hoạt kênh SMS fallback khi bạn bè tắt push |
| 8 | `test_08_api_endpoints_full_lifecycle_and_rbac` | 442 - 534 | Kiểm tra toàn bộ 11 HTTP Endpoints qua TestClient và rào chắn phân quyền RBAC |

---

## 5.2. Frontend UI/UX Component Tests (Vitest)

**Tệp:** `FrontEnd/src/features/emergency_alert/__tests__/emergency_alert.test.tsx` (136 dòng)  
*Tổng số test case:* **5/5 PASSED (100%)**

| STT | Tên Test Case | Dòng | Nội dung kiểm thử UI/UX |
| :---: | :--- | :---: | :--- |
| 1 | `Màn hình hiển thị đúng Header với Logo, Menu và Role Badge` | 14 - 30 | Kiểm tra Logo GreenSpot PCTT, Role Badge Ban Chỉ huy, Menu điều hướng |
| 2 | `Màn hình hiển thị đúng Footer với bản quyền, liên hệ và chính sách` | 33 - 39 | Kiểm tra thông tin bản quyền BCH PCTT TP.HCM, Hotline 114/115 |
| 3 | `Màn 2/4: Hiển thị đúng POPUP CẢNH BÁO KHẨN CẤP với cụm 3 nút hành động` | 42 - 90 | Kiểm tra nhãn POPUP, cụm 3 nút ("Tôi an toàn", "Cần giúp đỡ", "Xem chi tiết") |
| 4 | `Màn 3/4: Hiển thị đúng 2 cột Xác nhận an toàn và Gửi cho bạn bè` | 93 - 107 | Kiểm tra Cột trái "Xác nhận an toàn", Cột phải "Gửi cho bạn bè" và nút gửi |
| 5 | `Màn 4/4: Hiển thị đúng POPUP ĐÃ BÁO AN TOÀN kèm nút Đóng duy nhất` | 110 - 134 | Kiểm tra khiên xanh, số lượng bạn bè nhận thành công, SMS note và nút Đóng |

---

# PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)

| Nghiệp vụ / Màn hình | Thành phần FrontEnd | Dòng FE | Thành phần BackEnd | Dòng BE | Endpoint API / SQL | Bảng CSDL |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| **Màn 1/4:** Ước tính số người nhận trong bán kính | `Screen1BroadcastConsole.tsx` | 73 - 96 | `alert_service.py`<br>`alert_repository.py` | 65 - 88<br>33 - 58 | `POST /estimate-recipients`<br>`ST_DWithin(...)` | `user_device_locations` |
| **Màn 1/4:** Thanh trượt phân bậc 5 mốc chuẩn 1:1 | `Screen1BroadcastConsole.tsx`<br>`emergency_alert.css` | 396 - 440<br>409 - 475 | `alert_service.py` | 100 - 105 | Bán kính: $500$m, $1$km, $2$km, $5$km, $10$km | `emergency_broadcast_alerts` |
| **Màn 1/4:** Phát lệnh cảnh báo diện rộng | `Screen1BroadcastConsole.tsx` | 184 - 239 | `alert_service.py`<br>`router.py` | 89 - 183<br>115 - 133 | `POST /broadcast`<br>(Quyền Ban Chỉ huy) | `emergency_broadcast_alerts`<br>`emergency_alert_recipients` |
| **Màn 1/4:** Thu hồi lệnh phát sóng bảo vệ OCC | `Screen1BroadcastConsole.tsx` | 241 - 267 | `alert_service.py`<br>`router.py` | 211 - 241<br>154 - 181 | `POST /{alert_id}/cancel`<br>(OCC Version Check) | `emergency_broadcast_alerts` |
| **Màn 2/4:** Kiểm tra cảnh báo bao phủ người dùng | `Screen2AlertModal.tsx` | 14 - 80 | `alert_service.py`<br>`alert_repository.py` | 242 - 280<br>146 - 176 | `GET /active-for-user`<br>`ST_Distance(...)` | `emergency_broadcast_alerts`<br>`user_device_locations` |
| **Màn 2/4:** Kích hoạt tín hiệu cứu nạn SOS | `Screen2AlertModal.tsx` | 31 - 64 | `alert_service.py`<br>`router.py` | 281 - 305<br>204 - 214 | `POST /sos`<br>(Chuyển tiếp TTĐH STT 43) | `emergency_sos_signals` |
| **Màn 3/4:** Khởi tạo dữ liệu & nạp bạn bè thật | `Screen3SafetyCheck.tsx` | 29 - 84 | `alert_service.py`<br>`alert_repository.py` | 314 - 357<br>328 - 360 | `GET /safety-check/init`<br>`SELECT ... FROM friendships` | `friendships`<br>`users` |
| **Màn 3/4:** Đánh dấu "Tôi an toàn" lên hồ sơ | `Screen3SafetyCheck.tsx` | 87 - 107 | `alert_service.py`<br>`router.py` | 358 - 386<br>235 - 248 | `POST /safety-check/mark-safe` | `user_safety_checks` |
| **Màn 3/4 $\rightarrow$ 4/4:** Gửi báo an toàn cho bạn bè | `Screen3SafetyCheck.tsx`<br>`Screen4SafetyConfirmModal.tsx` | 128 - 154<br>12 - 75 | `alert_service.py`<br>`alert_repository.py` | 387 - 456<br>370 - 380 | `POST /safety-check/send-to-friends` | `user_safety_checks`<br>`safety_check_deliveries` |
| **Background:** Ping vị trí GPS thiết bị | `emergencyAlertApi.ts` | 121 - 133 | `alert_service.py`<br>`alert_repository.py` | 457 - 472<br>258 - 321 | `POST /location/ping` | `user_device_locations` |
