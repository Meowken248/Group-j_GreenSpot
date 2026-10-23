# STT 45: HỆ THỐNG CẢNH BÁO KHẨN CẤP THEO VỊ TRÍ & COMMUNITY SAFETY CHECK
(Location-Based Emergency Broadcast Alert & Community Safety Check System)

---

## 1. TỔNG QUAN KIẾN TRÚC (ARCHITECTURE OVERVIEW)

Hệ thống Cảnh báo khẩn cấp theo vị trí và Xác nhận an toàn cộng đồng (STT 45) được thiết kế và triển khai tuân thủ nghiêm ngặt chuẩn mực **Clean Architecture** và **SOLID (đặc biệt là Dependency Inversion Principle - DIP)** quy định tại `BackEnd/docs/CLEAN_ARCHITECTURE_AND_SOLID_RULES.md`:

```
BackEnd/app/
├── models/emergency_alert/            # [TẦNG 1: DOMAIN ENTITIES]
│   ├── alert.py                       # EmergencyBroadcastAlert, UserDeviceLocation, EmergencyAlertRecipient, EmergencySOSSignal
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
│   ├── alert_repository.py            # EmergencyAlertRepository (PostGIS ST_DWithin, ST_Distance, OCC, Soft Delete)
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

## 2. ĐẶC TẢ CHI TIẾT 4 MÀN HÌNH NGHIỆP VỤ

### Màn 1/4: Trung Tâm Phát Lệnh Cảnh Báo Thiên Tai Khẩn Cấp (Emergency Broadcast Console)
- **Đối tượng sử dụng:** Cán bộ quản trị hệ thống (`ADMIN`), Ban Chỉ huy Phòng chống thiên tai & Tìm kiếm cứu nạn (`COORDINATOR`, `DISTRICT_MANAGER`, `OFFICER`).
- **Khung giao diện:** Header (logo, menu quản trị, chuông thông báo, avatar), Footer (bản quyền, liên hệ, chính sách).
- **Cấu trúc 3 khối làm việc:**
  1. **Khối "NỘI DUNG" (Cột trái):**
     - Loại cảnh báo (Dropdown/Thẻ chọn):
       - `FLOOD`: "Ngập lụt nghiêm trọng"
       - `STORM`: "Bão / Lốc xoáy"
       - `TIDE`: "Triều cường dâng cao"
       - `POLLUTION`: "Sự cố tràn hóa chất / Ô nhiễm nguy hại"
     - Tiêu đề: Ô nhập tiêu đề ngắn gọn, mang tính báo động cao (VD: `"BÁO ĐỘNG NGẬP SÂU TRÊN 0.8M TẠI ĐƯỜNG AN DƯƠNG VƯƠNG"`).
     - Nội dung chi tiết: Khuyến cáo người dân về mức độ rủi ro, dự kiến thời gian đạt đỉnh, tuyến đường thay thế và đường dây nóng cứu hộ 114/115.
  2. **Khối "PHẠM VI" (Cột giữa):**
     - Ghim bản đồ GIS tương tác: Cắm điểm ghim (pin drop) làm tâm cảnh báo (`center_latitude`, `center_longitude`).
     - Thanh trượt bán kính phát tán: 500m (0.5 km), 1 km, 2 km, 5 km, 10 km.
     - Số người dự kiến nhận: Tự động truy vấn không gian PostGIS (`ST_DWithin`) theo thời gian thực đếm số lượng tài khoản trong bán kính (VD: `"Ước tính: 14.850 người dùng trong vùng ảnh hưởng"`).
  3. **Khối "GỬI" (Cột phải):**
     - Nút "Gửi cảnh báo": Nút đỏ báo động (Primary Danger Action), kích hoạt thông báo đẩy diện rộng (FCM/WebSocket Broadcast) đến các thiết bị trong vùng.
     - Nút "Huỷ": Hủy soạn thảo và xóa dữ liệu ghim vùng cảnh báo.
- **Bảng thông điệp phản hồi:**
  - Thiết lập tâm ghim và bán kính hợp lệ: `"Đã xác định vùng cảnh báo. Dự kiến phát sóng tới [Số_Lượng] người dân trong bán kính [R] km."`
  - Bấm "Gửi cảnh báo" thành công: `"Phát lệnh cảnh báo khẩn cấp thành công! Hệ thống đang đẩy thông báo đến [Số_Lượng] thiết bị."`
  - Bỏ trống tiêu đề hoặc chưa ghim phạm vi: `"Vui lòng nhập nội dung cảnh báo và chọn phạm vi ảnh hưởng trên bản đồ."`
  - Lỗi đường truyền: `"Không thể gửi cảnh báo tức thời do gián đoạn hạ tầng đẩy tin. Đang kích hoạt máy chủ dự phòng..."`

---

### Màn 2/4: Giao Diện Thông Báo Khẩn Cấp (Emergency Alert Modal)
- **Đối tượng sử dụng:** Người dùng đại chúng khi thiết bị đi vào hoặc đang ở trong phạm vi bán kính nguy hiểm.
- **Cấu trúc Popup cảnh báo ưu tiên cao nhất:**
  - Nhãn phía trên: `POPUP`
  - Biểu tượng: Icon tam giác cảnh báo màu đỏ nhấp nháy phát âm thanh báo động.
  - Tiêu đề in đậm: `"CẢNH BÁO KHẨN CẤP"`
  - Thông điệp tình huống: `"Ngập nặng trong bán kính 2 km quanh bạn"` (kèm loại hình, cấp độ và khuyến nghị sơ tán).
  - Cụm 3 nút hành động tương tác:
    - **Nút "Tôi an toàn":** Xác nhận bản thân ổn định, chuyển hướng sang Màn 3/4 (Safety Check). Thông điệp: `"Đang chuyển đến màn hình chia sẻ trạng thái an toàn..."`
    - **Nút "Cần giúp đỡ" (SOS):** Tự động chia sẻ vị trí GPS trực tiếp tới Trung tâm điều phối ứng cứu (STT 43) và đường dây nóng 114/115. Thông điệp: `"Đã gửi tín hiệu cứu nạn khẩn cấp kèm tọa độ GPS tới Ban Chỉ huy Cứu nạn và người thân!"`
    - **Nút "Xem chi tiết":** Điều hướng người dùng sang bản đồ ngập chi tiết và tìm tuyến đường tránh ngập an toàn (STT 41). Thông điệp: `"Đang mở bản đồ điều hướng tránh ngập an toàn..."`

---

### Màn 3/4: Xác Nhận Trạng Thái An Toàn Cộng Đồng (Community Disaster Safety Check)
- **Cơ chế:** Tương tự Facebook Safety Check, giúp người dân trong vùng thiên tai báo an toàn cho bạn bè.
- **Cấu trúc 2 cột tương tác:**
  - **Khối "XÁC NHẬN AN TOÀN" (Cột trái):**
    - Vị trí hiện tại: Định vị GPS chính xác của người dùng (tên đường, phường, quận) kèm dấu tích xanh xác thực.
    - Nút "Tôi an toàn": Cập nhật trạng thái "Đã an toàn" (Marked as Safe) lên hồ sơ cá nhân và hiển thị huy hiệu xanh trên Bảng tin Geo-Feed (STT 08).
    - Thông điệp khi bấm: `"Bạn đã được đánh dấu là AN TOÀN trong đợt thiên tai này."`
  - **Khối "GỬI CHO" (Cột phải):**
    - Danh sách bạn bè (tích chọn): Danh sách bạn bè kết nối trong hệ thống (từ STT 06) kèm ô checkbox ("Chọn tất cả" hoặc từng người).
    - Nút "Gửi cho bạn bè": Phát tin nhắn riêng và thông báo đẩy trực tiếp đến những người bạn được chọn, sau đó mở cửa sổ kết quả Màn 4/4.
    - Ràng buộc: Nếu chưa tích chọn bạn bè nào khi bấm gửi, hiển thị thông báo lỗi màu đỏ: `"Vui lòng chọn ít nhất một người bạn để gửi thông báo an toàn."`
    - Lỗi quyền GPS: `"Không thể xác định vị trí hiện tại. Vui lòng bật định vị GPS trong cài đặt trình duyệt."`

---

### Màn 4/4: Cửa Sổ Xác Nhận Hoàn Tất Báo An Toàn (Safety Check Completed Modal)
- **Hình thức:** Modal Popup xác nhận hoàn tất quy trình báo an toàn xuất hiện ngay sau khi người dùng thực hiện thao tác gửi ở Màn 3/4.
- **Nội dung:**
  - Nhãn phía trên: `POPUP`
  - Biểu tượng: Icon chiếc khiên xanh lá cây có dấu checkmark trắng bảo vệ.
  - Tiêu đề in đậm: `"ĐÃ BÁO AN TOÀN"`
  - Thông điệp chính: `"Bạn bè đã nhận thông báo"`
  - Dòng phụ: `"Thông báo trạng thái an toàn của bạn đã được gửi thành công đến [Số_Người] bạn bè"`
  - Dòng ghi chú dự phòng (nếu có bạn bè tắt push notification): `"Đã gửi thông báo. Một số bạn bè tắt thông báo sẽ nhận được tin nhắn SMS thay thế."`
  - Nút hành động duy nhất: Nút "Đóng" (đưa người dùng trở lại màn hình chính hoặc Bảng tin Geo-Feed STT 08).

---

## 3. THIẾT KẾ DỮ LIỆU & SQL TƯỜNG MINH (POSTGIS QUERIES)

### Bảng CSDL Cốt Lõi:
1. `user_device_locations`: Lưu vị trí GPS mới nhất của người dùng phục vụ truy vấn Geofencing.
2. `emergency_broadcast_alerts`: Lưu thông tin lệnh phát sóng cảnh báo khẩn cấp (OCC `version`, `deleted_at`).
3. `emergency_alert_recipients`: Lưu vết người dùng trong vùng ảnh hưởng nhận cảnh báo và phản hồi.
4. `emergency_sos_signals`: Lưu tín hiệu SOS cứu nạn kèm tọa độ gửi sang Trung tâm điều phối STT 43.
5. `user_safety_checks`: Lưu trạng thái báo an toàn của công dân (OCC `version`, `deleted_at`).
6. `safety_check_deliveries`: Lưu chi tiết phân phối thông báo đến từng bạn bè (kênh Push/SMS).

### Các Mẫu Truy Vấn PostGIS Tường Minh Bắt Buộc:
- **Đếm số người trong bán kính:**
  ```sql
  SELECT COUNT(DISTINCT l.user_id) AS recipient_count
  FROM user_device_locations l
  WHERE l.is_active = TRUE
    AND l.deleted_at IS NULL
    AND ST_DWithin(
        ST_Transform(l.location, 3857),
        ST_Transform(ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326), 3857),
        :radius_meters
    );
  ```
- **Kiểm tra cảnh báo đang hoạt động bao phủ vị trí người dùng:**
  ```sql
  SELECT 
      a.alert_id, a.alert_code, a.alert_type, a.title, a.content,
      a.center_latitude, a.center_longitude, a.radius_meters, a.severity_level,
      ST_Distance(
          ST_Transform(a.center_location, 3857),
          ST_Transform(ST_SetSRID(ST_MakePoint(:user_lng, :user_lat), 4326), 3857)
      ) AS distance_to_center_meters
  FROM emergency_broadcast_alerts a
  WHERE a.status = 'BROADCASTED'
    AND a.deleted_at IS NULL
    AND ST_DWithin(
        ST_Transform(a.center_location, 3857),
        ST_Transform(ST_SetSRID(ST_MakePoint(:user_lng, :user_lat), 4326), 3857),
        a.radius_meters
    )
  ORDER BY distance_to_center_meters ASC
  LIMIT 1;
  ```

---

## 4. BẢO MẬT & PHÂN QUYỀN RBAC

- **Màn 1/4 (Broadcast Console):** Chỉ tài khoản có vai trò `ADMIN`, `COORDINATOR`, `DISTRICT_MANAGER`, `OFFICER` mới có quyền phát lệnh khẩn cấp.
- **Màn 2/4, 3/4, 4/4 (User Alert & Safety Check):** Mọi công dân đã đăng nhập hoặc khách vãng lai (qua GPS thiết bị) đều nhận được cảnh báo; việc báo an toàn cho bạn bè yêu cầu xác thực JWT User.
