# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS): 48 CHỨC NĂNG CHỦ CHỐT HỆ THỐNG GREENSPOT
## NỀN TẢNG WEBGIS SINH THÁI, GIÁM SÁT NGẬP LỤT & MẠNG XÃ HỘI XANH ĐÔ THỊ

* **Dự án:** GreenSpot / EcoReport WebGIS & Eco-Community Platform
* **Vai trò:** Lead Solutions Architect & Senior Business Analyst
* **Ngày phê duyệt:** 2026-09-30
* **Tiêu chuẩn thiết kế:** 
  * Chuẩn hóa **48 Chức năng Lớn (Major Features)**, loại bỏ triệt để các chức năng vụn vặt (như nút ping `/health`, tạo chuỗi mã đơn lẻ, nén ảnh đơn lẻ...).
  * Tích hợp toàn diện **Phân hệ Mạng Xã Hội Sinh Thái & Tương Trợ Cứu Hộ Đô Thị (Geo-Social Network)**.
  * Phân bổ cân đối, khoa học cho **4 thành viên** (mỗi thành viên phụ trách **12 chức năng lớn**).
  * Vận hành trên kiến trúc **100% Free API, Open Source SDK và Local Analytic Engines (0 đồng chi phí bản quyền)**.

---

## MỤC LỤC
1. [Tổng Quan Kiến Trúc & Phân Bổ 48 Chức Năng](#i-tổng-quan-kiến-trúc--phân-bổ-48-chức-năng)
2. [Phần 1: Nguyễn Thành Đạt (STT 01 ➔ STT 12: Quản Trị RBAC, Auth & Mạng Xã Hội Xanh)](#ii-phần-1-nguyễn-thành-đạt-stt-01--stt-12)
3. [Phần 2: Huỳnh Anh Tú (STT 13 ➔ STT 24: Tiếp Nhận Sự Cố & Bản Đồ Số WebGIS Đa Tầng)](#iii-phần-2-huỳnh-anh-tú-stt-13--stt-24)
4. [Phần 3: Bùi Nguyễn Minh Quân (STT 25 ➔ STT 36: Viễn Trắc IoT, Khí Tượng & Giám Sát Ngập Lụt)](#iv-phần-3-bùi-nguyễn-minh-quân-stt-25--stt-36)
5. [Phần 4: Lê Anh Tuấn (STT 37 ➔ STT 48: AI Không Gian, Cứu Hộ SOS, Dẫn Đường Né Ngập & Big Data)](#v-phần-4-lê-anh-tuấn-stt-37--stt-48)
6. [Bảng Tổng Hợp Nguồn Free API & Kiến Trúc Công Nghệ 0 Đồng](#vi-bảng-tổng-hợp-nguồn-free-api--kiến-trúc-công-nghệ-0-đồng)

---

## I. TỔNG QUAN KIẾN TRÚC & PHÂN BỔ 48 CHỨC NĂNG

Hệ thống **GreenSpot** kết hợp sức mạnh giữa **Cơ sở dữ liệu không gian PostGIS**, **Động cơ phân tích rủi ro khí hậu**, **Bản đồ số WebGIS MapLibre hiệu năng cao** và **Mạng xã hội sinh thái thời gian thực**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MA TRẬN PHÂN CHIA 48 CHỨC NĂNG LỚN CHO 4 THÀNH VIÊN             │
├───────────────────────┬──────────────┬──────────────────────────┬──────────────────────┤
│ THÀNH VIÊN PHỤ TRÁCH  │ PHẠM VI STT  │ SỐ LƯỢNG CHỨC NĂNG LỚN   │ PHÂN HỆ CHUYÊN MÔN   │
├───────────────────────┼──────────────┼──────────────────────────┼──────────────────────┤
│ 1. NGUYỄN THÀNH ĐẠT   │ STT 01 ➔ 12  │ 12 Chức năng lớn         │ Quản trị RBAC, Auth  │
│                       │              │                          │ & Mạng Xã Hội Xanh   │
│ 2. HUỲNH ANH TÚ       │ STT 13 ➔ 24  │ 12 Chức năng lớn         │ Tiếp nhận Sự cố &    │
│                       │              │                          │ Bản đồ Số WebGIS     │
│ 3. BÙI NGUYỄN MINH QUÂN│ STT 25 ➔ 36 │ 12 Chức năng lớn         │ Viễn trắc IoT, Khí   │
│                       │              │                          │ tượng & Sóng triều   │
│ 4. LÊ ANH TUẤN        │ STT 37 ➔ 48  │ 12 Chức năng lớn         │ AI Không Gian, SOS,  │
│                       │              │                          │ Định tuyến & Big Data│
├───────────────────────┴──────────────┴──────────────────────────┴──────────────────────┤
│ TỔNG CỘNG: 4 THÀNH VIÊN              │ 48 CHỨC NĂNG QUY MÔ LỚN, HOÀN TOÀN CÂN BẰNG     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## II. PHẦN 1: NGUYỄN THÀNH ĐẠT (STT 01 ➔ STT 12)
### *Phân hệ: Quản trị Hệ thống, Xác thực Bảo mật & Mạng Xã Hội Sinh Thái Đô Thị*

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [STT 01] Đăng ký & OTP Mail ──> [STT 02] Đăng nhập JWT Bearer ──> [STT 03] Phân quyền  │
│ [STT 04] Green Passport     ──> [STT 05] Chống Spam & Kiểm duyệt ──> [STT 06] Geo-Feed │
│ [STT 07] Đăng bài Geo-tag   ──> [STT 08] Eco-Reactions          ──> [STT 09] Sự kiện   │
│ [STT 10] Geofencing Check-in──> [STT 11] Gamification Ranks     ──> [STT 12] Live Chat │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### STT 01: Hệ thống Đăng ký & Xác thực Kích hoạt Tài khoản Công dân qua OTP (Email Verification)
* **Quy mô nghiệp vụ:** Quản lý quy trình đăng ký tài khoản công dân mới; mã hóa mật khẩu theo chuẩn bảo mật công nghiệp `bcrypt`; tự động sinh mã OTP 6 chữ số ngẫu nhiên có thời hạn 5 phút; gửi email kích hoạt qua giao thức SMTP miễn phí; kích hoạt tài khoản và gán vai trò mặc định `CITIZEN`.
* **Công nghệ & API (0đ):** `FastAPI` + `Passlib (bcrypt)` + `SQLAlchemy` + `Google Gmail SMTP Free` (`smtp.gmail.com:587`, 500 mail/ngày).
* **Endpoint API:** `POST /api/v1/auth/register`, `POST /api/v1/auth/verify-otp`, `POST /api/v1/auth/resend-otp`.
* **Cơ sở dữ liệu:** Bảng `users`, bảng tạm `user_activation_otps`.

### STT 02: Quản trị Phiên làm việc & Xác thực Bảo mật Đa tầng (OAuth2 JWT Bearer)
* **Quy mô nghiệp vụ:** Cung cấp cơ chế xác thực danh tính tập trung OAuth2 Password Bearer; ký số phát hành JSON Web Token (HMAC-SHA256) có hạn dùng 24h; kiểm soát phiên làm việc đăng nhập đồng thời; tự động đính kèm Token qua Axios Interceptor tại Frontend và cơ chế tự động làm mới (Refresh Token) ngầm.
* **Công nghệ & API (0đ):** `PyJWT` / `python-jose`, Axios Request/Response Interceptors.
* **Endpoint API:** `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh-token`, `GET /api/v1/auth/me`.
* **Cơ sở dữ liệu:** Bảng `users`, kiểm tra cờ `is_active = True`.

### STT 03: Phân hệ Phân quyền Vai trò Đa cấp RBAC (Role-Based Access Control)
* **Quy mô nghiệp vụ:** Ma trận kiểm soát truy cập dựa trên 4 cấp bậc vai trò chuẩn mực: `SUPER_ADMIN` (quản trị toàn quyền), `DISTRICT_MANAGER` (lãnh đạo điều phối cấp quận), `FIELD_RESPONDER` (đội công ích phản ứng nhanh), `CITIZEN` (người dân). Chặn truy cập trái phép ở cả tầng API Backend lẫn Router Frontend.
* **Công nghệ & API (0đ):** FastAPI `SecurityScopes`, Dependency Injection `Depends(get_current_user_with_permission)`.
* **Endpoint API:** `GET /api/v1/admin/roles`, `POST /api/v1/admin/users/{user_id}/assign-role`.
* **Cơ sở dữ liệu:** Các bảng `roles`, `permissions`, `role_permissions`, `user_roles`.

### STT 04: Hồ sơ Cá nhân, Hộ chiếu Xanh (Green Passport) & Lịch sử Đóng góp Môi trường
* **Quy mô nghiệp vụ:** Màn hình Profile số hóa ghi nhận toàn bộ "Dấu chân sinh thái" của công dân: tổng số bãi rác đã dọn, các điểm ngập đã cảnh báo giúp cộng đồng, khối lượng $kg$ rác đã thu gom, showroom trưng bày các huy hiệu danh dự đạt được; hỗ trợ xuất thẻ Hộ Chiếu Xanh điện tử định dạng PDF/Ảnh để chia sẻ.
* **Công nghệ & API (0đ):** HTML5 Canvas / jsPDF, PostgreSQL Foreign Key Aggregation.
* **Endpoint API:** `GET /api/v1/users/me/green-passport`, `PATCH /api/v1/users/me/profile`.
* **Cơ sở dữ liệu:** Truy vấn kết hợp `users`, `incidents`, `user_badges`.

### STT 05: Module Kiểm duyệt Nội dung, Giới hạn Tần suất (Rate-Limit) & Chống Spam Báo cáo
* **Quy mô nghiệp vụ:** Ngăn chặn các cuộc tấn công DDoS và tình trạng spam báo cáo giả mạo. Áp dụng thuật toán Leaky Bucket giới hạn tối đa 5 báo cáo/10 phút từ một địa chỉ IP; cơ chế đưa vào danh sách đen (Blacklist) và tự động khóa tạm thời tài khoản có hành vi bất thường.
* **Công nghệ & API (0đ):** Thư viện `slowapi` trong bộ nhớ RAM, Regex Content Filter.
* **Endpoint API:** Middleware bảo vệ toàn bộ API `POST /api/v1/*`.
* **Cơ sở dữ liệu:** Bảng `ip_rate_limits`, trường `is_active` bảng `users`.

### STT 06: Bảng tin Sinh thái Đô thị theo Bán kính Không gian (Hyperlocal Geo-Feed Engine)
* **Quy mô nghiệp vụ:** Dòng thời gian bảng tin ưu tiên hiển thị bài viết, hình ảnh, cảnh báo thời tiết trong bán kính linh hoạt ($1km, 3km, 5km$ hoặc *Toàn thành phố*) tính từ tọa độ GPS thực tế của người dùng. Tích hợp cuộn trang vô tận (Infinite Scroll) với hiệu năng cao.
* **Công nghệ & API (0đ):** PostGIS Spherical Math `ST_DWithin(geom::geography, user_location::geography, radius)`, React Virtualized.
* **Endpoint API:** `GET /api/v1/social/feed?lat=..&lng=..&radius_km=3&page=1`.
* **Cơ sở dữ liệu:** Bảng `social_posts`, chỉ mục không gian GiST trên cột `location`.

### STT 07: Soạn thảo & Đăng bài viết Sinh thái kèm Định vị Tọa độ Không gian (Geo-tagged Post)
* **Quy mô nghiệp vụ:** Trình soạn thảo bài viết hỗ trợ nhập văn bản, gắn thẻ hashtag chuyên mục (`#ZeroWaste`, `#CleanUp`, `#FloodWarning`), đính kèm tối đa 4 ảnh chụp hiện trường; tự động giải mã tọa độ GPS sang số nhà, tên đường, phường/quận để người khác dễ dàng nhận diện.
* **Công nghệ & API (0đ):** Komoot Photon Reverse Geocoding API (`https://photon.komoot.io/reverse`), FastAPI UploadFile.
* **Endpoint API:** `POST /api/v1/social/posts`.
* **Cơ sở dữ liệu:** Bảng `social_posts`, `post_media`.

### STT 08: Động cơ Tương tác Bộ Cảm xúc Sinh thái & Tích lũy Tương tác (Eco-Reactions Engine)
* **Quy mô nghiệp vụ:** Thay thế nút Like truyền thống bằng bộ 4 cảm xúc chuyên biệt: *Yêu Môi Trường 💚, Biết Ơn Hiệp Sĩ 👏, Cảnh Báo Nguy Cấp ⚠️, Hành Động Tái Chế ♻️*. Xử lý cập nhật số lượng nguyên tử chống xung đột dữ liệu (Concurrency Control), tự động cộng điểm thưởng cho tác giả khi nhận cảm xúc tích cực.
* **Công nghệ & API (0đ):** PostgreSQL Atomic Update `UPDATE social_posts SET reaction_count = ...`.
* **Endpoint API:** `POST /api/v1/social/posts/{post_id}/react`, `DELETE /api/v1/social/posts/{post_id}/react`.
* **Cơ sở dữ liệu:** Bảng `post_reactions`.

### STT 09: Quản lý & Khởi tạo Chiến dịch Cộng đồng "Chủ Nhật Xanh" (Cleanup Drive Management)
* **Quy mô nghiệp vụ:** Cho phép người dân hoặc Đoàn Thanh niên khởi tạo các chiến dịch dọn rác tập thể: chọn điểm tập kết trên bản đồ, giới hạn số lượng tình nguyện viên tham gia, danh sách trang thiết bị cần mang theo; người dân có thể bấm đăng ký tham gia (RSVP) và nhận thông báo nhắc nhở trước ngày diễn ra.
* **Công nghệ & API (0đ):** PostGIS Geometry Point, FastAPI Events Service.
* **Endpoint API:** `POST /api/v1/social/events`, `POST /api/v1/social/events/{id}/rsvp`, `GET /api/v1/social/events`.
* **Cơ sở dữ liệu:** Bảng `community_events`, `event_participants`.

### STT 10: Xác thực Hiện trường Sự kiện bằng Công nghệ Vùng ảo (Geofencing GPS Check-in 100m)
* **Quy mô nghiệp vụ:** Ngăn chặn tuyệt đối hành vi gian lận điểm thưởng từ xa; tình nguyện viên tham gia chiến dịch dọn rác bắt buộc phải có mặt trong bán kính $\le 100m$ tính từ tâm điểm tập kết mới bấm được nút "Check-in Có Mặt Tại Hiện Trường", hệ thống tự động đối chiếu tọa độ và trao thưởng ngay lập tức.
* **Công nghệ & API (0đ):** W3C Geolocation API, PostGIS `ST_Distance(user_point, event_point) <= 100`.
* **Endpoint API:** `POST /api/v1/social/events/{id}/check-in`.
* **Cơ sở dữ liệu:** Cập nhật trạng thái `ATTENDED` trong bảng `event_participants`.

### STT 11: Động cơ Game hóa Tích điểm Eco-Points, Thăng cấp Danh hiệu & Đổi Quà (Gamification Engine)
* **Quy mô nghiệp vụ:** Tự động tính toán điểm thưởng hành vi xanh: báo cáo bãi rác (+50 pts), cảnh báo điểm ngập (+30 pts), check-in dọn rác (+100 pts). Tự động thăng cấp 4 bậc danh hiệu: *🌱 Hạt Mầm Xanh $\rightarrow$ 🌿 Cây Non Đô Thị $\rightarrow$ 🌳 Rừng Xanh Hộ Vệ $\rightarrow$ 👑 Hiệp Sĩ Sinh Thái*. Quản lý ví điểm để đổi các phần quà xanh (voucher cây kiểng, ly sứ giữ nhiệt).
* **Công nghệ & API (0đ):** In-Database Business Rules, PostgreSQL Transaction.
* **Endpoint API:** `GET /api/v1/social/eco-wallet`, `POST /api/v1/social/eco-wallet/redeem-voucher`.
* **Cơ sở dữ liệu:** Cột `eco_points` bảng `users`, bảng `point_history`, bảng `eco_vouchers`.

### STT 12: Kênh Giao tiếp & Thảo luận Cộng đồng Thời gian thực theo Quận (District Live Chat Room)
* **Quy mô nghiệp vụ:** Phòng chat cộng đồng truyền dẫn bằng WebSocket hai chiều cho từng Quận/Huyện; cho phép hàng trăm cư dân cùng khu vực trao đổi tức thời về tình hình thời tiết, chia sẻ các tuyến đường đang ngập nặng hoặc chỉ dẫn trạm trú mưa khô ráo; lưu trữ bộ đệm 50 tin nhắn gần nhất.
* **Công nghệ & API (0đ):** FastAPI WebSockets Native (`/ws/chat/{district_code}`), ConnectionManager In-memory.
* **Endpoint API:** `WS /api/v1/social/ws/chat/{district_code}`, `GET /api/v1/social/chat/{district_code}/history`.
* **Cơ sở dữ liệu:** Bảng `district_chat_messages`.

---

## III. PHẦN 2: HUỲNH ANH TÚ (STT 13 ➔ STT 24)
### *Phân hệ: Tiếp nhận Sự cố Môi trường & Nền tảng Bản đồ Số WebGIS Đa tầng*

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [STT 13] Tiếp nhận sự cố GPS ──> [STT 14] Vòng đời State Machine ──> [STT 15] Điều phối│
│ [STT 16] Metrics Dashboard   ──> [STT 17] 7 Bản đồ nền & Traffic ──> [STT 18] 3D Nhà   │
│ [STT 19] Ranh giới 22 Quận   ──> [STT 20] Mảng xanh Green Spots  ──> [STT 21] Tái chế  │
│ [STT 22] CRUD Danh mục Rác   ──> [STT 23] CRUD Điểm Tái chế       ──> [STT 24] CRUD Thiết yếu │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### STT 13: Module Tiếp nhận Báo cáo Sự cố Môi trường Đa phương tiện kèm Tọa độ GPS
* **Quy mô nghiệp vụ:** Cho phép người dân gửi báo cáo rác thải, bùn cống rãnh, dầu tràn; tự động định vị tọa độ GPS, phân loại 5 danh mục rác thải chính, nén ảnh client-side xuống $<500KB$ để tối ưu truyền tải mạng 3G/4G, lưu trữ đối tượng hình học chuẩn không gian `POINT(lng, lat)` SRID 4326.
* **Công nghệ & API (0đ):** W3C Geolocation API, PostGIS `ST_SetSRID(ST_MakePoint(), 4326)`, Browser Image Compression.
* **Endpoint API:** `POST /api/v1/eco-locations/incidents`.
* **Cơ sở dữ liệu:** Bảng `incidents`, `incident_media`, `incident_categories`.

### STT 14: Cỗ máy Trạng thái & Quản trị Vòng đời Xử lý Sự cố (Incident Lifecycle State Machine)
* **Quy mô nghiệp vụ:** Kiểm soát quy trình xử lý sự cố môi trường khép kín theo cỗ máy trạng thái nghiêm ngặt: *`PENDING` (Chờ tiếp nhận) $\rightarrow$ `IN_PROGRESS` (Đội phản ứng nhanh đang xử lý tại hiện trường) $\rightarrow$ `RESOLVED` (Đã nghiệm thu dọn sạch) $\rightarrow$ `REJECTED` (Báo cáo sai sự thật)*. Cung cấp mã tra cứu công khai `INC-2026-XXXX` để người dân kiểm tra tiến độ mà không cần đăng nhập.
* **Công nghệ & API (0đ):** Python State Machine Enum, PostgreSQL Transaction ACID.
* **Endpoint API:** `PATCH /api/v1/incidents/{id}/status`, `GET /api/v1/incidents/track/{tracking_code}`.
* **Cơ sở dữ liệu:** Cột `status` bảng `incidents`, bảng `incident_status_logs`.

### STT 15: Hệ thống Điều phối & Phân công Đội Phản ứng Nhanh theo Địa bàn Quận
* **Quy mô nghiệp vụ:** Khi phát sinh sự cố tại tọa độ $(x, y)$, hệ thống sử dụng thuật toán không gian tự động quét và xác định sự cố thuộc đơn vị hành chính Quận/Huyện nào để chuyển giao công việc chính xác đến tài khoản quản lý và đội phản ứng nhanh địa bàn phụ trách.
* **Công nghệ & API (0đ):** PostGIS Spatial Intersection `ST_Contains(district.geom, incident.location)`.
* **Endpoint API:** `POST /api/v1/incidents/{id}/assign-unit`, `GET /api/v1/incidents/assigned-to-me`.
* **Cơ sở dữ liệu:** Bảng `administrative_units`, liên kết khóa ngoại `incidents.unit_id`.

### STT 16: Trung tâm Điều hành & Thống kê Tác nghiệp Môi trường Toàn Thành phố
* **Quy mô nghiệp vụ:** Bảng điều khiển KPI tác nghiệp cho các nhà quản lý đô thị: tổng số sự cố phát sinh trong ngày, tỷ lệ xử lý đúng hạn SLA, phân bổ sự cố theo 22 quận/huyện, tỷ lệ upvote của người dân; hiển thị huy hiệu badge số liệu tức thời trên thanh công cụ WebGIS.
* **Công nghệ & API (0đ):** SQL Aggregate Functions, Windowing `COUNT(*) FILTER (...)`.
* **Endpoint API:** `GET /api/v1/eco-locations/incidents/summary`, `GET /api/v1/incidents/kpi-report`.
* **Cơ sở dữ liệu:** Bảng `incidents`, `users`.

### STT 17: Nền tảng Bản đồ Số WebGIS 7 Chế độ Nền & Lớp Giao thông Thời gian thực
* **Quy mô nghiệp vụ:** Kiến trúc chuyển đổi gạch ảnh bản đồ (Basemap Tile Switcher) linh hoạt với 7 chế độ chuyên dụng: Google Roadmap, Vệ tinh Hybrid, Google Live Traffic (mật độ giao thông xe cộ thời gian thực), OpenStreetMap Standard, OpenTopoMap địa hình, Carto Voyager và Carto Dark ban đêm.
* **Công nghệ & API (0đ):** Google MT XYZ Raster Tiles (`mt{0-3}.google.com`), OpenStreetMap, CartoDB GL Styles.
* **Endpoint API:** Tích hợp trực tiếp trên MapLibre GL JS Client.
* **Cơ sở dữ liệu:** Cấu hình tile sources tại `frontend/src/constants/mapConstants.ts`.

### STT 18: Công nghệ Đùn khối 3D Công trình Đô thị theo Cao độ Thực tế kèm 5 Chủ đề Màu
* **Quy mô nghiệp vụ:** Kích hoạt lớp WebGL đùn khối 3D toàn bộ nhà cửa, chung cư, cao ốc TP.HCM dựa trên thuộc tính độ cao thực tế `height` của Vector Tile; cung cấp 5 bộ theme màu sắc động: *Cầu vồng đô thị, Sinh thái xanh, Hoàng hôn rực rỡ, Cyberpunk Neon và Tinh thể pha lê*.
* **Công nghệ & API (0đ):** MapLibre GL JS `fill-extrusion-height`, `fill-extrusion-color`, WebGL Shaders.
* **Endpoint API:** Xử lý trực tiếp trên GPU Client.
* **Cơ sở dữ liệu:** OpenMapTiles Building Vector Layer.

### STT 19: Phân vùng Ranh giới Hành chính 22 Quận/Huyện & Cơ chế Điều hướng Không gian
* **Quy mô nghiệp vụ:** Trực quan hóa đa giác biên giới hành chính chuẩn xác của 22 quận/huyện và TP. Thủ Đức; hiển thị nhãn trung tâm, thông số diện tích, dân số và tỷ lệ che phủ cây xanh; cung cấp dropdown chọn quận để camera WebGIS thực hiện bay lượn (`flyTo`) mượt mà đến đúng vị trí.
* **Công nghệ & API (0đ):** PostGIS GeoJSON Spatial Layer, MapLibre Camera Animation `map.flyTo()`.
* **Endpoint API:** `GET /api/v1/spatial/districts`.
* **Cơ sở dữ liệu:** Bảng `administrative_units` lưu trữ `GEOMETRY(MultiPolygon, 4326)`.

### STT 20: Hệ thống Tra cứu & Đánh giá Mạng lưới Mảng xanh Đô thị (Green Spots)
* **Quy mô nghiệp vụ:** Quản lý danh mục các "Lá phổi xanh" của đô thị (Công viên Tao Đàn, Thảo Cầm Viên, Công viên Gia Định, Rừng Sác Cần Giờ...); hiển thị quy mô diện tích mảng xanh, đánh giá sao của cộng đồng và các chỉ số vi khí hậu bóng mát trong lành.
* **Công nghệ & API (0đ):** PostGIS Spatial Model, Overpass API OpenStreetMap Interpreter.
* **Endpoint API:** `GET /api/v1/eco-locations/green-spots`.
* **Cơ sở dữ liệu:** Bảng `essential_facilities` phân loại `facility_type = 'PARK'`.

### STT 21: Mạng lưới Điểm Thu gom Phân loại Rác Tái chế & Rác Thải Nguy hại (Recycling Hubs)
* **Quy mô nghiệp vụ:** Bản đồ mạng lưới các điểm tiếp nhận phân loại rác thải tại nguồn: trạm thu gom vỏ pin cũ đã qua sử dụng, rác thải điện tử (e-waste), vỏ hộp sữa giấy, chai nhựa tái chế; tích hợp bộ lọc đa tiêu chí theo loại rác tiếp nhận, giờ mở cửa và số điện thoại liên hệ.
* **Công nghệ & API (0đ):** PostGIS Spatial Queries, GeoJSON FeatureCollection.
* **Endpoint API:** `GET /api/v1/eco-locations/recycling-facilities`.
* **Cơ sở dữ liệu:** Bảng `recycling_facilities`.

### STT 22: Module Quản trị CRUD Danh mục Rác thải Đô thị & Cấu hình Quy chuẩn SLA (Waste Categories)
* **Quy mô nghiệp vụ:** Giao diện Portal dành cho Quản trị viên quản lý danh mục rác thải và sự cố môi trường đô thị: Thêm mới, chỉnh sửa, khóa tạm thời loại rác; cấu hình màu sắc nhãn hiển thị trên WebGIS (`color_hex`), icon đại diện (`icon_name`), cấp độ nghiêm trọng mặc định (`default_severity: LOW/MEDIUM/HIGH/CRITICAL`) và cam kết thời hạn giải quyết sự cố (`sla_hours`: ví dụ rác y tế là 4h, xà bần xây dựng là 48h).
* **Công nghệ & API (0đ):** FastAPI Admin Router, SQLAlchemy Type-Safe ORM, Pydantic V2 Schemas.
* **Endpoint API:** `GET /api/v1/admin/waste-categories`, `POST /api/v1/admin/waste-categories`, `PUT /api/v1/admin/waste-categories/{id}`, `DELETE /api/v1/admin/waste-categories/{id}`.
* **Cơ sở dữ liệu:** Bảng `waste_categories`.

### STT 23: Module Quản trị CRUD Mạng lưới Trạm Tái chế & Điểm Tiếp nhận E-Waste (Recycling Facilities)
* **Quy mô nghiệp vụ:** Quản lý cơ sở dữ liệu các điểm tiếp nhận phân loại rác thải tại nguồn và trạm thu gom pin cũ, rác thải điện tử: Thêm mới hoặc cập nhật trạm tái chế, cho phép nhấp chọn tọa độ không gian trực tiếp trên WebGIS (`location = POINT(lng, lat)`), quản lý mảng danh mục rác tiếp nhận (`accepted_waste_types = ['PIN_CU', 'RAC_DIEN_TU', 'NHUA_PET']`), giờ mở cửa, tổ chức phụ trách và bật/tắt hoạt động.
* **Công nghệ & API (0đ):** PostGIS Spatial Geometry Point, Leaflet/MapLibre Marker Dragging, FastAPI.
* **Endpoint API:** `GET /api/v1/admin/recycling-facilities`, `POST /api/v1/admin/recycling-facilities`, `PUT /api/v1/admin/recycling-facilities/{id}`, `DELETE /api/v1/admin/recycling-facilities/{id}`.
* **Cơ sở dữ liệu:** Bảng `recycling_facilities`.

### STT 24: Module Quản trị CRUD Danh bạ Cơ sở Thiết yếu Đô thị & Đánh giá Độ Dễ Tổn thương
* **Quy mô nghiệp vụ:** Quản trị danh mục các cơ sở trọng yếu nhạy cảm (Bệnh viện, Trường mầm non, Trạm y tế, Viện dưỡng lão, Công viên) phục vụ công tác phòng chống ngập úng và cứu nạn thiên tai: Cập nhật tọa độ không gian Point, quy mô sức chứa người (`capacity_people`), gán đơn vị hành chính Quận/Huyện quản lý và phân cấp độ dễ bị tổn thương (`vulnerability_level: HIGH / CRITICAL`) làm đầu vào cho thuật toán quét vùng đệm cảnh báo sơ tán.
* **Công nghệ & API (0đ):** PostGIS Spatial CRUD, GeoJSON Feature Form, FastAPI.
* **Endpoint API:** `GET /api/v1/admin/essential-facilities`, `POST /api/v1/admin/essential-facilities`, `PUT /api/v1/admin/essential-facilities/{id}`, `DELETE /api/v1/admin/essential-facilities/{id}`.
* **Cơ sở dữ liệu:** Bảng `essential_facilities`.

---

## IV. PHẦN 3: BÙI NGUYỄN MINH QUÂN (STT 25 ➔ STT 36)
### *Phân hệ: Viễn trắc IoT, Khí tượng Động học & Giám sát Ngập lụt Đô thị*

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [STT 25] CRUD Điểm Đen Ngập──> [STT 26] CRUD Trạm Đo Thủy Văn    ──> [STT 27] Nhiệt độ│
│ [STT 28] Heatmap Bụi AQI   ──> [STT 29] Heatmap Mật độ Rủi ro    ──> [STT 30] Radar Gió│
│ [STT 31] Sóng Triều Python ──> [STT 32] Dự báo Phú An - Nhà Bè   ──> [STT 33] Đỉnh Triều│
│ [STT 34] Rủi ro Ngập Engine──> [STT 35] CRUD Đơn Vị Hành Chính   ──> [STT 36] GloFAS   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### STT 25: Module Quản trị CRUD Danh mục Điểm đen Ngập lụt Đô thị & Cấu hình Ngưỡng Kích hoạt
* **Quy mô nghiệp vụ:** Quản trị danh mục các điểm đen ngập lụt đô thị và hành lang tuyến đường xung yếu (đường Nguyễn Hữu Cảnh, Trần Xuân Soạn, Quốc Hương...): Thêm mới hoặc chỉnh sửa tọa độ tâm ngập (`POINT`) và vẽ tuyến đường chịu ảnh hưởng (`LineString`); cấu hình cao độ mặt đường trung bình (`elevation_meters`), điểm đánh giá năng lực hệ thống thoát nước (1 - 5); cài đặt các **ngưỡng kích hoạt ngập động**: ngưỡng triều cường bắt đầu tràn mặt đường (`threshold_tide_meters`) và ngưỡng cường độ mưa kích hoạt ngập (`threshold_rain_mm_per_hour`).
* **Công nghệ & API (0đ):** PostGIS Geometry Point & LineString, MapLibre Draw Mode, FastAPI Admin Service.
* **Endpoint API:** `GET /api/v1/admin/flood-hotspots`, `POST /api/v1/admin/flood-hotspots`, `PUT /api/v1/admin/flood-hotspots/{id}`, `DELETE /api/v1/admin/flood-hotspots/{id}`.
* **Cơ sở dữ liệu:** Bảng `flood_hotspots`.

### STT 26: Module Quản trị CRUD Mạng lưới Trạm Thủy văn & Cấu hình Hằng số Sóng Triều
* **Quy mô nghiệp vụ:** Quản trị các trạm quan trắc thủy văn trên các lưu vực sông chính (Trạm Phú An trên Sông Sài Gòn, Trạm Nhà Bè trên Sông Đồng Điền, Trạm Vũng Tàu): Thêm mới, chỉnh sửa thông số trạm; cấu hình độ lệch mốc chuẩn hải đồ (`datum_offset_meters`) và mực nước trung bình $H_0$; nhập và hiệu chỉnh danh mục các hằng số sóng điều hòa thiên văn ($M_2, S_2, K_1, O_1$): tốc độ góc ($\omega$), biên độ dao động ($A$) và pha trễ địa phương ($g$) phục vụ động cơ giải tích sóng triều.
* **Công nghệ & API (0đ):** SQLAlchemy Relational Model (One-to-Many `TideStation` - `TideHarmonicConstituent`), FastAPI.
* **Endpoint API:** `GET /api/v1/admin/tide-stations`, `POST /api/v1/admin/tide-stations`, `PUT /api/v1/admin/tide-stations/{id}/constituents`.
* **Cơ sở dữ liệu:** Bảng `tide_stations`, `tide_harmonic_constituents`.

### STT 27: Bản đồ Nhiệt Nội suy Nền Nhiệt độ Khí quyển Toàn quốc (Temperature Heatmap)
* **Quy mô nghiệp vụ:** Thuật toán nội suy không gian và trực quan hóa nền nhiệt độ không khí tại 28 trạm vi khí hậu trọng điểm trên toàn quốc qua lớp phủ Heatmap WebGL; dải màu chuyển tiếp mượt mà từ xanh lơ mát mẻ ($<22^\circ C$) sang vàng nhạt và đỏ rực nhiệt đới ($>38^\circ C$).
* **Công nghệ & API (0đ):** Open-Meteo Weather Forecast API (`https://api.open-meteo.com/v1/forecast`), MapLibre Heatmap.
* **Endpoint API:** `GET /api/v1/weather/temperature-grid`.
* **Cơ sở dữ liệu:** In-memory Cache 300s tại `weather_service.py`.

### STT 28: Bản đồ Nhiệt Chất lượng Không khí & Phân tầng Bụi mịn theo Chuẩn US EPA
* **Quy mô nghiệp vụ:** Lớp phủ bản đồ nhiệt thời gian thực hiển thị chỉ số ô nhiễm không khí US EPA AQI; phân dải chuẩn xác các vùng có nồng độ bụi mịn nguy hại theo 6 thang bậc màu sắc quốc tế từ Xanh lá (Tốt), Vàng (Trung bình), Cam (Nhạy cảm) tới Đỏ/Tím/Nâu (Nguy hại cho sức khỏe).
* **Công nghệ & API (0đ):** Open-Meteo CAMS European Air Quality API, WebGL Shaders.
* **Endpoint API:** `GET /api/v1/weather/aqi-heatmap`.
* **Cơ sở dữ liệu:** Động cơ nội suy tại `weather_service.py`.

### STT 29: Bản đồ Nhiệt Mật độ Rủi ro Ô nhiễm Đô thị Tích hợp Trọng số Không gian
* **Quy mô nghiệp vụ:** Thuật toán nội suy không gian đa biến tổng hợp từ các điểm phát sinh sự cố rác thải, bùn cống rãnh thực tế trên địa bàn; tính toán trọng số rủi ro dựa trên khối lượng rác và thời gian tồn đọng để làm nổi bật các khu vực lõi có mật độ ô nhiễm cao cần chính quyền can thiệp.
* **Công nghệ & API (0đ):** PostGIS Weighted Spatial Aggregation, MapLibre Dynamic Layer.
* **Endpoint API:** `GET /api/v1/spatial/pollution-risk-density`.
* **Cơ sở dữ liệu:** Bảng `incidents`, cột `risk_score`.

### STT 30: Bản đồ Radar Khí tượng Động học Thời gian thực 8 Lớp Phủ (Live Weather Radar)
* **Quy mô nghiệp vụ:** Tích hợp 8 lớp phủ thời tiết chuyên sâu vận hành đồng bộ: Dòng hạt gió động (Wind Particle Streamlines), Radar phản hồi mây mưa Doppler, Vệt sét đánh thời gian thực, Mây che phủ vệ tinh hồng ngoại, Chiều cao sóng biển và Áp suất khí quyển bề mặt.
* **Công nghệ & API (0đ):** RainViewer Public Weather Radar API (`https://api.rainviewer.com/`), Windy WebGL Engine.
* **Endpoint API:** Tích hợp tại `frontend/src/components/LiveWeatherRadarMap.tsx`.
* **Cơ sở dữ liệu:** Tile Raster khí quyển động học.

### STT 31: Động cơ Giải tích Sóng Thủy triều Điều hòa 4 Sóng Thiên văn Thuần Python
* **Quy mô nghiệp vụ:** Giải thuật giải tích điều hòa 4 sóng thiên văn chính ($M_2$ bán nhật triều mặt trăng, $S_2$ bán nhật triều mặt trời, $K_1$ nhật triều nhật nguyệt, $O_1$ nhật triều mặt trăng) viết hoàn toàn bằng Python thuần; tốc độ giải vi sai micro-giây, độc lập offline 100% không phụ thuộc API bên ngoài:
  $$H(t) = H_0 + \sum_{i=1}^4 A_i \cos(\omega_i t - g_i)$$
* **Công nghệ & API (0đ):** Thư viện chuẩn Python `math`, `datetime` tại `backend/app/services/tide_service.py`.
* **Endpoint API:** Lõi tính toán cho các dịch vụ cảnh báo triều cường.
* **Cơ sở dữ liệu:** Hằng số điều hòa tại 2 trạm sông Sài Gòn.

### STT 32: Hệ thống Dự báo Mực nước Triều Đồ thị Thời gian thực Trạm Phú An & Nhà Bè
* **Quy mô nghiệp vụ:** Mô phỏng và dự báo đường cong mực nước triều dâng/rút liên tục trong 24h - 48h tại 2 trạm kiểm soát triều xung yếu bậc nhất TP.HCM: Trạm Phú An (Sông Sài Gòn) và Trạm Nhà Bè (Sông Đồng Điền); hiển thị biểu đồ trực quan kèm ngưỡng an toàn mặt đường.
* **Công nghệ & API (0đ):** FastAPI Tide Service, Chart.js / Canvas Frontend.
* **Endpoint API:** `GET /api/v1/flood/tide/current`, `GET /api/v1/flood/tide/forecast-24h`.
* **Cơ sở dữ liệu:** Bảng `tide_stations`.

### STT 33: Thuật toán Đạo hàm Tự động Dò Đỉnh Triều, Chân Triều & Kích hoạt Báo động BĐ3
* **Quy mô nghiệp vụ:** Ứng dụng phương pháp giải tích đạo hàm bậc nhất vận tốc dâng $dH/dt = 0$ để định vị chính xác thời điểm đỉnh triều đạt cực đại (High Tide) và thời điểm chân triều rút (Low Tide); tự động kích hoạt cờ cảnh báo khẩn cấp khi mực nước vượt ngưỡng Báo động 3 ($> 1.60m$).
* **Công nghệ & API (0đ):** Numerical First Derivative Solver.
* **Endpoint API:** `GET /api/v1/flood/tide/extrema`.
* **Cơ sở dữ liệu:** Lưu trữ lịch sử cảnh báo tại bảng `flood_hotspots`.

### STT 34: Động cơ Phân tích Rủi ro Ngập lụt Đa nhân tố Đô thị (Flood Risk Engine)
* **Quy mô nghiệp vụ:** Tính toán chiều sâu ngập lụt mặt đường thực tế ($cm$) và điểm số rủi ro ($0 - 10$) từ tổ hợp 3 nhân tố trọng yếu: Mực nước đỉnh triều sông + Cường độ vũ lượng mưa thực tế + Cao độ địa hình & khả năng thoát nước; phân cấp 5 mức độ nghiêm trọng: `AN TOÀN`, `NGẬP NHẸ`, `TRUNG BÌNH`, `NGUY HIỂM`, `KHÔNG THỂ QUA LẠI`.
* **Công nghệ & API (0đ):** Multi-factor Mathematical Risk Engine tại `backend/app/services/flood_engine.py`.
* **Endpoint API:** `GET /api/v1/flood/road-risks`.
* **Cơ sở dữ liệu:** Bảng `flood_hotspots`.

### STT 35: Module Quản trị CRUD Đơn vị Hành chính & Biên tập Đa giác Ranh giới Không gian
* **Quy mô nghiệp vụ:** Quản lý cơ cấu phân cấp hành chính 22 quận/huyện và các phường/xã trực thuộc; cập nhật dữ liệu diện tích ($km^2$), quy mô dân số, tỷ lệ phủ xanh mảng xanh đô thị; hỗ trợ tải lên file GeoJSON hoặc biên tập chỉnh sửa chuỗi đa giác không gian khép kín `MULTIPOLYGON` SRID 4326 chuẩn PostGIS; tự động tính toán tâm vùng `centroid` phục vụ tính năng định vị và bay camera `flyTo`.
* **Công nghệ & API (0đ):** PostGIS `ST_GeomFromGeoJSON`, `ST_Centroid`, `ST_Area`, GeoJSON Feature Validator.
* **Endpoint API:** `GET /api/v1/admin/administrative-units`, `POST /api/v1/admin/administrative-units`, `PUT /api/v1/admin/administrative-units/{id}`, `DELETE /api/v1/admin/administrative-units/{id}`.
* **Cơ sở dữ liệu:** Bảng `administrative_units`.

### STT 36: Tích hợp Mô hình Dự báo Lưu lượng Thủy văn Sông ngòi Copernicus GloFAS 7 Ngày
* **Quy mô nghiệp vụ:** Kết nối trực tiếp vào hệ thống vệ tinh viễn thám Copernicus GloFAS toàn cầu; tra cứu lưu lượng dòng chảy sông hồ (River Discharge $m^3/s$) tại bất kỳ tọa độ địa lý nào trong 7 ngày tới để dự báo sớm nguy cơ lũ lụt từ thượng nguồn sông Đồng Nai và sông Sài Gòn đổ về.
* **Công nghệ & API (0đ):** Open-Meteo Flood API (Copernicus GloFAS Data) (`https://flood-api.open-meteo.com/v1/flood`).
* **Endpoint API:** `GET /api/v1/flood/glofas-forecast?lat=..&lng=..`.
* **Cơ sở dữ liệu:** In-memory Cache 1 giờ.

---

## V. PHẦN 4: LÊ ANH TUẤN (STT 37 ➔ STT 48)
### *Phân hệ: Cứu hộ Tương trợ SOS, AI Không Gian, Dẫn đường Né ngập & Big Data Analytics*

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [STT 37] Cứu hộ Flood SOS   ──> [STT 38] Bảng vinh danh Xanh ──> [STT 39] Risk Engine   │
│ [STT 40] Leo thang SLA      ──> [STT 41] DBSCAN Gom cụm     ──> [STT 42] Dự báo KDE    │
│ [STT 43] Snap OSRM Báo ngập ──> [STT 44] Tuyến đường 3 lớp   ──> [STT 45] Vùng đệm 1km  │
│ [STT 46] Tuyến né ngập PostGIS─>[STT 47] So sánh 2 Polyline  ──> [STT 48] 7.1M Parquet  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### STT 37: Trung tâm Cứu hộ Ngập lụt Khẩn cấp & Mạng lưới Tương trợ Đô thị (Flood SOS Hub)
* **Quy mô nghiệp vụ:** Nút phát tín hiệu khẩn cấp dành cho người đi đường bị mắc kẹt do xe chết máy hoặc ngập nước giữa đêm; hệ thống ghim cờ SOS đỏ nhấp nháy phát sóng trong bán kính 2km, hiển thị số điện thoại và mở kênh kết nối tương trợ trực tiếp với các gara xe máy hoặc tình nguyện viên gần nhất.
* **Công nghệ & API (0đ):** MapLibre Realtime Markers, W3C Geolocation, OSRM Match API.
* **Endpoint API:** `POST /api/v1/social/sos/create`, `PATCH /api/v1/social/sos/{id}/resolve`.
* **Cơ sở dữ liệu:** Bảng `sos_requests`.

### STT 38: Bảng Vinh danh Hiệp Sĩ Xanh & Xếp hạng Chỉ số Môi trường Khu Dân cư (Leaderboard)
* **Quy mô nghiệp vụ:** Hệ thống vinh danh thành tích bảo vệ môi trường: Bảng xếp hạng Top 10 cá nhân tiêu biểu trong tháng và bảng xếp hạng thi đua sinh thái giữa 22 quận/huyện dựa trên tỷ lệ xử lý dọn sạch bãi rác, số điểm ngập cảnh báo chính xác và số lượng chiến dịch cộng đồng tổ chức thành công.
* **Công nghệ & API (0đ):** PostgreSQL Window Functions (`DENSE_RANK() OVER (...)`), Aggregation.
* **Endpoint API:** `GET /api/v1/social/leaderboard?period=month`.
* **Cơ sở dữ liệu:** Bảng `users`, `incidents`, `social_posts`.

### STT 39: Động cơ Đánh giá Điểm Rủi ro Sự cố Môi trường Đa biến (Dynamic Risk Engine)
* **Quy mô nghiệp vụ:** Thuật toán tính toán điểm rủi ro môi trường chuẩn hóa ($0 - 100$) tự động cập nhật liên tục dựa trên 4 biến số: Hệ số độc hại loại rác ($W_{type}$), Thể tích ước tính ($V$), Lượt upvote xác nhận từ cộng đồng và Số giờ tồn đọng chưa được đội công ích tiếp nhận xử lý:
  $$\text{RiskScore} = \min(100, W_{type} \times 30 + V \times 20 + \text{Upvotes} \times 2 + T_{hours} \times 1.5)$$
* **Công nghệ & API (0đ):** Python Mathematical Engine tại `backend/app/services/flood_engine.py`.
* **Endpoint API:** `GET /api/v1/incidents/{id}/risk-metric`.
* **Cơ sở dữ liệu:** Cột `risk_score` bảng `incidents`.

### STT 40: Hệ thống Giám sát Cam kết Xử lý & Tự động Leo thang Cảnh báo SLA
* **Quy mô nghiệp vụ:** Tự động phân cấp thời hạn xử lý cam kết: Mức Thấp ($SLA = 48h$), Trung bình ($SLA = 24h$), Cao ($SLA = 8h$), Khẩn cấp ($SLA = 2h$); tiến trình nền chạy định kỳ tự động phát hiện các sự cố quá hạn để leo thang cấp báo động lên "BÁO ĐỘNG ĐỎ", đổi màu marker sang đỏ nhấp nháy và phát cảnh báo ưu tiên lên đầu bảng điều phối quận.
* **Công nghệ & API (0đ):** FastAPI BackgroundTasks / APScheduler Worker.
* **Endpoint API:** `GET /api/v1/incidents/sla-breached-alerts`.
* **Cơ sở dữ liệu:** Cột `sla_deadline`, `is_escalated` bảng `incidents`.

### STT 41: Thuật toán Học máy Tự động Gom cụm Báo cáo Không gian Bằng Giải thuật DBSCAN
* **Quy mô nghiệp vụ:** Khi có nhiều người dân cùng chụp ảnh báo cáo về một bãi rác tự phát hoặc một đoạn đường ngập ở khoảng cách gần, pipeline học máy tự động gom chúng thành 1 `Master Incident` duy nhất bằng giải thuật DBSCAN với hàm khoảng cách Haversine trên mặt cầu Trái Đất, gộp số lượng upvotes để tránh điều phối trùng lặp đội vệ sinh.
* **Công nghệ & API (0đ):** `scikit-learn` DBSCAN (`eps=50m/6371km, min_samples=2, metric='haversine'`).
* **Endpoint API:** `POST /api/v1/spatial/incidents/cluster-dbscan`.
* **Cơ sở dữ liệu:** Cột `cluster_id` bảng `incidents`.

### STT 42: Phân tích Chuỗi Thời gian & Dự báo Điểm nóng Tái diễn Bằng Mô hình KDE
* **Quy mô nghiệp vụ:** Ứng dụng mô hình thống kê ước lượng mật độ nhân (Kernel Density Estimation - KDE) quét toàn bộ dữ liệu lịch sử ngập úng và xả rác 30 ngày gần nhất; dự báo các "Điểm nóng có nguy cơ tái phát sinh cao" theo chu kỳ tuần/tháng để cơ quan chức năng chủ động bố trí nhân lực nạo vét cống rãnh từ trước.
* **Công nghệ & API (0đ):** `scipy.stats.gaussian_kde`, WebGL Heatmap Shader.
* **Endpoint API:** `GET /api/v1/spatial/hotspots/temporal-kde`.
* **Cơ sở dữ liệu:** Bảng `incidents`, `flood_hotspots`.

### STT 43: Báo cáo Điểm Ngập Cộng đồng 1 Chạm & Thuật toán Nắn khớp Tim đường OSRM
* **Quy mô nghiệp vụ:** Cho phép người đi đường chỉ cần nhấp chuột phải tại điểm đang ngập nước trên bản đồ; backend tự động gọi thuật toán OSRM Nearest để bám dính (Snap-to-Road) điểm click vào đúng tim đường xe chạy `LineString` thực tế, tự động phát sóng cảnh báo đoạn đường ngập ngay lập tức cho các phương tiện khác.
* **Công nghệ & API (0đ):** Project OSRM Nearest / Match Public API (`https://router.project-osrm.org/nearest/v1/`).
* **Endpoint API:** `POST /api/v1/flood/community-reports`.
* **Cơ sở dữ liệu:** Bảng `flood_community_reports`, `flood_hotspots`.

### STT 44: Xây dựng Hành lang Tuyến đường Ngập Động 3 Lớp Vector kèm Hiệu ứng Dòng chảy
* **Quy mô nghiệp vụ:** Trực quan hóa các đoạn đường ngập úng bằng công nghệ xếp chồng 3 lớp vector: Lớp 1 (Nền đường OSRM màu xám), Lớp 2 (Viền phát sáng cảnh báo cấp độ nguy cơ), Lớp 3 (Lõi mực nước ngập thực tế) kết hợp hoạt ảnh dòng nước chảy động `line-dasharray` dọc theo tim đường để mô phỏng dòng nước dâng cuồn cuộn.
* **Công nghệ & API (0đ):** MapLibre GL GeoJSON LineString Layer, CSS Dash Animation.
* **Endpoint API:** Tích hợp tại `frontend/src/components/EcoMap.tsx`.
* **Cơ sở dữ liệu:** GeoJSON đường ngập tại `frontend/src/services/floodService.ts`.

### STT 45: Thuật toán Quét Vùng đệm Không gian Phát hiện Cơ sở Thiết yếu Có Nguy cơ Ảnh hưởng
* **Quy mô nghiệp vụ:** Khi quản lý nhấp vào một sự cố tràn dầu hoặc đoạn ngập sâu, hệ thống tự động vẽ vòng tròn vùng đệm bán kính 1000m bao quanh sự cố bằng hàm PostGIS `ST_DWithin`; phân tích và xuất danh sách các trường mầm non, bệnh viện, viện dưỡng lão nằm trong vùng nguy hiểm để kịp thời gửi cảnh báo sơ tán.
* **Công nghệ & API (0đ):** PostGIS Spatial Buffer `ST_DWithin(facility.geom, incident.geom, 1000.0)`.
* **Endpoint API:** `GET /api/v1/spatial/incidents/{id}/nearby-facilities?radius_m=1000`.
* **Cơ sở dữ liệu:** Bảng `essential_facilities`, `incidents`.

### STT 46: Động cơ Định tuyến Thông minh & Phân tích Lộ trình Giao thông Né Ngập An toàn
* **Quy mô nghiệp vụ:** Tiếp nhận tọa độ điểm xuất phát và đích đến của người dùng; hệ thống quét tuyến đường với vùng đệm 150m quanh toàn bộ các điểm ngập nước sâu $> 20cm$; tự động phát hiện các đoạn đường xung đột có nguy cơ làm chết máy xe và tính toán tuyến đường vòng thay thế an toàn.
* **Công nghệ & API (0đ):** PostGIS `ST_DWithin(route_geom::geography, flood_point::geography, 150)`.
* **Endpoint API:** `POST /api/v1/flood/check-route`.
* **Cơ sở dữ liệu:** Bảng `flood_hotspots`.

### STT 47: Giao diện So sánh Trực quan Song song Tuyến đường Nhanh nhất vs An toàn Nhất
* **Quy mô nghiệp vụ:** Tính toán và vẽ song song 2 tuyến đường trên bản đồ: Tuyến Đỏ (Tuyến đường ngắn nhất nhưng đi qua điểm ngập sâu 38cm, cảnh báo nguy cơ chết máy cao) và Tuyến Xanh (Lộ trình vòng né hoàn toàn điểm ngập an toàn); kèm bảng phân tích thời gian di chuyển chênh lệch để tài xế chủ động bấm chọn.
* **Công nghệ & API (0đ):** Project OSRM Routing Engine Public API (`https://router.project-osrm.org/route/v1/driving/`).
* **Endpoint API:** `POST /api/v1/flood/route-compare`.
* **Cơ sở dữ liệu:** Xử lý tại `frontend/src/services/osmAdvancedService.ts`.

### STT 48: Nền tảng Big Data Analytics 7.1 Triệu Bản ghi Parquet & Hệ thống Đa ngôn ngữ Tập trung
* **Quy mô nghiệp vụ:** Động cơ phân tích dữ liệu lớn bao phủ 34 tỉnh thành với 7.1 triệu bản ghi Parquet vi khí hậu, cung cấp 5 Tab Dashboard chuyên sâu (Tổng quan AQI, Chuỗi thời gian 7 chất, KPI Khí tượng, Tương quan Pearson $r$, Xuất CSV); kết hợp bộ từ điển song ngữ Việt - Anh tập trung bằng `python-i18n` đồng bộ qua HTTP Header `Accept-Language`.
* **Công nghệ & API (0đ):** DuckDB In-process OLAP, Pandas Parquet Engine, `python-i18n` Core.
* **Endpoint API:** `GET /api/v1/analytics/air-quality/overview`, `GET /api/v1/i18n/translations`.
* **Cơ sở dữ liệu:** File dữ liệu Parquet lưu trữ tại backend (`7.1M records`), từ điển locale JSON `vi.json`, `en.json`.

---

## VI. BẢNG TỔNG HỢP NGUỒN FREE API & KIẾN TRÚC CÔNG NGHỆ 0 ĐỒNG

| Nhà Cung Cấp / Công Nghệ | Dữ Liệu & Dịch Vụ Cung Cấp | URL Endpoint / Giao Thức Gọi Free | Chi Phí Bản Quyền |
| :--- | :--- | :--- | :---: |
| **Open-Meteo Weather** | Vi khí hậu, nhiệt độ, độ ẩm, áp suất, gió | `https://api.open-meteo.com/v1/forecast` | **0 VNĐ** (10,000 req/ngày, No Key) |
| **Open-Meteo Air Quality** | Nồng độ bụi mịn PM2.5, PM10, CO, AQI | `https://air-quality-api.open-meteo.com/v1/air-quality` | **0 VNĐ** (No Key, No Credit Card) |
| **Copernicus GloFAS (Flood)**| Dự báo lưu lượng dòng chảy sông ngòi 7 ngày | `https://flood-api.open-meteo.com/v1/flood` | **0 VNĐ** (Dữ liệu mở viễn thám châu Âu) |
| **Komoot Photon API** | Tìm kiếm địa chỉ, số nhà, Reverse Geocoding | `https://photon.komoot.io/api/` & `/reverse` | **0 VNĐ** (Mã nguồn mở OSM, không giới hạn) |
| **Project OSRM Routing** | Tìm lộ trình né ngập, Snap to Road | `https://router.project-osrm.org/route/v1/` | **0 VNĐ** (Máy chủ cộng đồng mở) |
| **Google MT Tile XYZ** | Bản đồ đường phố, vệ tinh, giao thông realtime | `https://mt{0-3}.google.com/vt/lyrs={m,y,m,traffic}` | **0 VNĐ** (Raster XYZ miễn phí) |
| **OpenStreetMap & Carto** | Tile bản đồ nền chuẩn, Topo và Carto Dark | `https://{s}.tile.openstreetmap.org/` | **0 VNĐ** (Mã nguồn mở quốc tế) |
| **RainViewer API** | Dữ liệu radar phản hồi mây mưa Doppler | `https://api.rainviewer.com/public/weather-maps.json` | **0 VNĐ** (Public Radar API) |
| **W3C Geolocation & IPAPI** | Định vị GPS vệ tinh và IP Geolocation dự phòng | `navigator.geolocation` & `https://ipapi.co/json/` | **0 VNĐ** (Tích hợp trình duyệt) |
| **Harmonic Tide Engine** | Dự báo mực nước triều Phú An & Nhà Bè | Giải tích điều hòa thuần Python ($M_2, S_2, K_1, O_1$) | **0 VNĐ** (100% Offline, chạy siêu tốc) |
| **DuckDB / Parquet Engine** | Phân tích 7.1 triệu dòng dữ liệu khí hậu | Động cơ đọc Parquet cột nội bộ Python Backend | **0 VNĐ** (Không tốn chi phí Cloud) |
| **Scikit-learn DBSCAN** | Gom cụm thông minh các sự cố gần nhau | Giải thuật Machine Learning cục bộ | **0 VNĐ** (Chạy trên CPU local) |

---

## VII. ĐẶC TẢ CHI TIẾT BÓC TÁCH PHÂN HỆ DASHBOARD PHÂN TÍCH DỮ LIỆU LỚN KHÍ HẬU (5 CHỨC NĂNG QUẢN LÝ RIÊNG BIỆT)

*Hệ thống Phân Tích AQI & Khí Hậu Quốc Gia vận hành trên nền tảng Big Data 7.1 triệu bản ghi Parquet với kiến trúc 5 phân hệ độc lập hoàn chỉnh, bao gồm hơn 2.500 dòng code TypeScript frontend và 8 API backend chuyên dụng:*

### STT 48.1 (Tab 1): Bảng Điều Khiển Tổng Quan KPI AQI & Bản Đồ Không Gian Tương Tác 34 Tỉnh Thành (Overview & Geo-Map)
* **Quy mô nghiệp vụ:** 
  * Cung cấp các thẻ đo lường KPI tổng hợp: Chỉ số AQI trung bình toàn quốc, tỷ lệ số tỉnh đạt chuẩn không khí sạch, tỉnh có mức độ ô nhiễm báo động đỏ cao nhất.
  * Bản đồ vector SVG tương tác 34 tỉnh thành Việt Nam (`VietnamGeoMapCard.tsx`): Cho phép người dùng hoặc chuyên viên môi trường click chọn từng tỉnh thành để xem ngay popup chỉ số chất lượng không khí, phân loại theo 6 cấp bậc màu sắc US EPA quốc tế.
  * Biểu đồ cột phân tích xếp hạng Top 10 tỉnh thành ô nhiễm nặng nhất và biểu đồ tròn phân bổ tỷ trọng chất lượng không khí.
* **Công nghệ & API (0đ):** React SVG GeoJSON Renderer, Chart.js / Canvas, DuckDB Aggregate Queries.
* **Endpoint API:** `GET /api/v1/analytics/air-quality/overview`, `GET /api/v1/analytics/air-quality/provinces`, `GET /api/v1/analytics/air-quality/provinces/{slug}/latest`.
* **Cơ sở dữ liệu:** Kho dữ liệu Parquet vi khí hậu 34 tỉnh thành (`7.1M records`), DuckDB in-memory OLAP table.

### STT 48.2 (Tab 2): Phân Hệ Giám Sát Chuỗi Thời Gian 7 Chất Ô Nhiễm & Nhận Diện Khung Giờ Cao Điểm (Pollutants Trend & Peak Hours)
* **Quy mô nghiệp vụ:** 
  * Giám sát diễn biến nồng độ chuỗi thời gian của 7 chất độc hại: Bụi mịn $PM_{2.5}$, bụi thô $PM_{10}$, khí $NO_2$, lưu huỳnh $SO_2$, carbon monoxide $CO$, ozone $O_3$ và bụi lơ lửng ($Dust$).
  * Biểu đồ cột 24 giờ phân tích nhịp sinh hoạt đô thị, tự động nhận diện và cảnh báo các **khung giờ cao điểm ô nhiễm** (giờ tan tầm 7h - 9h sáng và 17h - 19h tối) để người dân hạn chế ra đường.
  * Thanh công cụ chuyển đổi 4 chu kỳ phân tích linh hoạt: *24 Giờ gần nhất, 7 Ngày, 30 Ngày và Toàn năm 2025*.
* **Công nghệ & API (0đ):** Recharts / Canvas Multi-line Chart, DuckDB Time-bucket Aggregation.
* **Endpoint API:** `GET /api/v1/analytics/air-quality/provinces/{slug}/trend`, `GET /api/v1/analytics/air-quality/provinces/{slug}/pollutants`.
* **Cơ sở dữ liệu:** Bảng dữ liệu chuỗi thời gian Parquet theo giờ.

### STT 48.3 (Tab 3): Phân Hệ Phân Tích Tương Quan Khí Tượng Học Đa Biến & Vi Khí Hậu Địa Phương (Meteorological Analytics)
* **Quy mô nghiệp vụ:** 
  * Khai phá mối tương quan giữa các yếu tố khí tượng và mức độ tích tụ ô nhiễm: Nhiệt độ bề mặt ($^\circ C$), Độ ẩm tương đối ($\%$), Áp suất khí quyển bề mặt ($hPa$), Tốc độ gió ($m/s$) và Hướng gió thổi.
  * Biểu đồ đường cong mượt mà (Curve Chart) đối chiếu song song giữa nhiệt độ/độ ẩm với nồng độ bụi mịn, giúp giải thích hiện tượng nghịch nhiệt mùa đông làm bụi mịn ứ đọng không thể khuếch tán.
* **Công nghệ & API (0đ):** Canvas Bezier Curve Smoothing, Pandas Correlation Pipeline.
* **Endpoint API:** `GET /api/v1/analytics/air-quality/weather`.
* **Cơ sở dữ liệu:** Trường dữ liệu khí tượng trong file Parquet vi khí hậu.

### STT 48.4 (Tab 4): Động Cơ Tính Toán Ma Trận Tương Tác Khí Hậu & Hệ Số Tương Quan Pearson (Pearson Interaction Engine)
* **Quy mô nghiệp vụ:** 
  * Ứng dụng giải thuật thống kê toán học tính toán **Ma trận tương quan Pearson ($r$)** giữa tất cả các cặp biến số ô nhiễm và thời tiết; trực quan hóa dưới dạng Ma trận nhiệt đa sắc (Heatmap Grid).
  * Biểu đồ phân tán (Scatter Plot) phân tích hiện tượng **Rửa trôi khí quyển do mưa (Rain Washout Effect)**: Đánh giá định lượng mức giảm nồng độ bụi $PM_{2.5}$ sau các cơn mưa lớn và tác động của tốc độ gió đối với việc làm sạch bầu không khí.
* **Công nghệ & API (0đ):** NumPy / SciPy Pearson Correlation Algorithm, React Heatmap Grid Component.
* **Endpoint API:** `GET /api/v1/analytics/air-quality/interaction`.
* **Cơ sở dữ liệu:** DuckDB Pearson Covariance Matrix Calculation.

### STT 48.5 (Tab 5): Trung Tâm Khai Phá, Tra Cứu Đa Tiêu Chí 34 Tỉnh Thành & Xuất Báo Cáo Dữ Liệu Lớn CSV (Data Grid & Export)
* **Quy mô nghiệp vụ:** 
  * Bảng dữ liệu tra cứu lớn (Data Grid) cho phép duyệt số liệu chi tiết của toàn bộ 34 tỉnh thành với tốc độ phản hồi mili-giây.
  * Hỗ trợ tìm kiếm theo tên tỉnh/thành phố, bộ lọc nhanh theo 6 phân cấp chất lượng không khí US EPA (Tốt, Trung bình, Nhạy cảm, Xấu, Rất xấu, Nguy hại), phân trang Server-side linh hoạt.
  * Tính năng **Xuất dữ liệu tức thì ra file báo cáo `.CSV`** hỗ trợ các cơ quan chức năng, nhà nghiên cứu tải về phân tích chuyên sâu.
* **Công nghệ & API (0đ):** FastAPI StreamingResponse, DuckDB CSV Export Engine, Frontend Pagination Grid.
* **Endpoint API:** `GET /api/v1/analytics/air-quality/table`.
* **Cơ sở dữ liệu:** File Parquet lưu trữ 7.1 triệu dòng dữ liệu.

---

## VIII. ĐỀ XUẤT CỦA PROJECT MANAGER: PHƯƠNG ÁN HOÁN ĐỔI THAY THẾ CHỨC NĂNG CRUD

Việc bóc tách hệ thống Dashboard thành 5 chức năng quản lý riêng biệt cung cấp giải pháp hoàn hảo để **thay thế các chức năng CRUD chưa có code** (như CRUD Rác thải, CRUD Điểm đen ngập lụt, CRUD Trạm thủy văn, CRUD Đơn vị hành chính...) bằng các chức năng **đã có sẵn 100% mã nguồn và giao diện chạy thực tế**:

1. **Thay thế chức năng CRUD bằng Dashboard:** Thay vì báo cáo các tính năng thêm/xóa/sửa danh mục không có giao diện demo, nhóm sử dụng các Tab Dashboard phân tích Big Data 7.1 triệu dòng để trình diễn trước Hội đồng chấm thi.
2. **Nâng tầm chất lượng đồ án:** Chuyển dịch đồ án từ mức "Quản trị cơ sở dữ liệu cơ bản" lên đẳng cấp **"Hệ Thống Phân Tích Dữ Liệu Lớn Đô Thị & Bản Đồ Số Không Gian 3D Thông Minh"**.
3. **Phân bổ công việc thực chất:** Mỗi thành viên đều có các tính năng hoàn chỉnh, có giao diện đẹp và API chạy thật để tự tin bảo vệ đồ án đạt điểm số tối đa.

---

*Tài liệu đặc tả yêu cầu phần mềm chính thức được cập nhật vĩnh viễn tại:* `d:\Group-j_GreenSpot\danhsach.md`
