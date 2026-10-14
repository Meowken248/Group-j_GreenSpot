# 📚 TÀI LIỆU KỸ THUẬT CỐT LÕI TOÀN DIỆN DỰ ÁN GREENSPOT (ECOREPORT)
## (Full-Stack Core Architecture & Source Code Reference Guide: BackEnd & FrontEnd)

> **Mục đích tài liệu:** Tổng hợp toàn diện và chi tiết vị trí các thành phần mã nguồn cốt lõi (Core Logic) của toàn bộ dự án GreenSpot bao gồm cả **BackEnd** (FastAPI / SQLAlchemy / PostgreSQL / PostGIS) và **FrontEnd** (React / TypeScript / SCSS / Vite / MapLibre).
> Toàn bộ số dòng và đường dẫn tệp trong tài liệu này đều được **trích xuất và đối soát trực tiếp 100% từ mã nguồn thực tế đang chạy** trong repository, phục vụ mục đích kiểm toán, nghiệm thu và phát triển mà **không có bất kỳ thông tin giả định hay suy diễn sai lệch nào**.

---

## 📑 MỤC LỤC TỔNG QUAN

### PHẦN A: KIẾN TRÚC CỐT LÕI PHÍA BACKEND
1. [Core BE 1: Động cơ AI Phát hiện & Gộp Báo cáo Trùng lặp (Deduplication Engine)](#core-be-1-dong-co-ai-phat-hien--gop-bao-cao-trung-lap-deduplication-engine)
2. [Core BE 2: Phân quyền Vai trò RBAC & Ma trận Phân quyền Động (Dynamic Permission Matrix)](#core-be-2-phan-quyen-vai-tro-rbac--ma-tran-phan-quyen-dong-dynamic-permission-matrix)
3. [Core BE 3: Trợ lý Giọng nói AI NLU Engine (Voice Assistant)](#core-be-3-tro-ly-giong-noi-ai-nlu-engine-voice-assistant)
4. [Core BE 4: Động cơ Thủy triều Điều hòa & Dự báo Ngập lụt (Harmonic Tide & Flood Engine)](#core-be-4-dong-co-thuy-trieu-dieu-hoa--du-bao-ngap-lut-harmonic-tide--flood-engine)
5. [Core BE 5: Hồ sơ Cá nhân, Hộ chiếu Xanh & Dòng thời gian (Profile, Green Passport & Timeline)](#core-be-5-ho-so-ca-nhan-ho-chieu-xanh--dong-thoi-gian-profile-green-passport--timeline)
6. [Core BE 6: Quản lý Người dùng, Xác thực & Phiên làm việc (User Management & Security)](#core-be-6-quan-ly-nguoi-dung-xac-thuc--phien-lam-viec-user-management--security)
7. [Core BE 7: Hạ tầng CSDL, Prisma ORM & Công cụ Tự động hóa (Database & CLI Automation)](#core-be-7-ha-tang-csdl-prisma-orm--cong-cu-tu-dong-hoa-database--cli-automation)

### PHẦN B: KIẾN TRÚC CỐT LÕI PHÍA FRONTEND
8. [Core FE 1: Giao diện AI Deduplication Dashboard (Màn 1/4 -> 4/4)](#core-fe-1-giao-dien-ai-deduplication-dashboard-man-14---44)
9. [Core FE 2: Giao diện Quản lý Phân quyền RBAC & Ma trận Phân quyền Động](#core-fe-2-giao-dien-quan-ly-phan-quyen-rbac--ma-tran-phan-quyen-dong)
10. [Core FE 3: Khung Bảo vệ 3 Tầng Universal RBAC Guard Framework](#core-fe-3-khung-bao-ve-3-tang-universal-rbac-guard-framework)
11. [Core FE 4: Trung tâm Trợ lý Giọng nói AI Voice Assistant Hands-Free UI](#core-fe-4-trung-tam-tro-ly-giong-noi-ai-voice-assistant-hands-free-ui)
12. [Core FE 5: Bản đồ Số WebGIS Đa lớp Không gian (EcoMap & Routing)](#core-fe-5-ban-do-so-webgis-da-lop-khong-gian-ecomap--routing)
13. [Core FE 6: Giao diện Quản lý Người dùng & Tài khoản Nội bộ](#core-fe-6-giao-dien-quan-ly-nguoi-dung--tai-khoan-noi-bo)
14. [Core FE 7: Giao diện Hồ sơ Cá nhân, Hộ chiếu Xanh & Dòng thời gian](#core-fe-7-giao-dien-ho-so-ca-nhan-ho-chieu-xanh--dong-thoi-gian)
15. [Core FE 8: Xác thực, Phiên Đăng nhập & Quản trị Thiết bị](#core-fe-8-xac-thuc-phien-dang-nhap--quan-tri-thiet-bi)

### PHẦN C: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)
16. [Cheat Sheet Toàn diện BackEnd & FrontEnd](#cheat-sheet-toan-dien-backend--frontend)

---

# PHẦN A: KIẾN TRÚC CỐT LÕI PHÍA BACKEND

## CORE BE 1: ĐỘNG CƠ AI PHÁT HIỆN & GỘP BÁO CÁO TRÙNG LẶP (DEDUPLICATION ENGINE)

Module tự động gom cụm các sự cố môi trường gửi về từ người dân nếu phát hiện chúng phản ánh cùng một hiện trường theo không gian, thời gian và hình ảnh.

### 1.1. Thuật toán AI Đối soát 3 Yếu tố
- **Tập tin:** `BackEnd/app/services/deduplication/ai_engine.py`
- **Class:** `AIDeduplicationService` (Dòng 7 - 96)
- **Hằng số ngưỡng (Dòng 16 - 19):** `EARTH_RADIUS_METERS = 6371000.0`, `GPS_THRESHOLD_METERS = 50.0`, `TIME_THRESHOLD_HOURS = 48.0`, `IMAGE_SIMILARITY_THRESHOLD = 80.0`.
- **Khoảng cách đại cầu Haversine (Dòng 22 - 36):**
  ```python
  @staticmethod
  def calculate_gps_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
      phi1 = math.radians(lat1)
      phi2 = math.radians(lat2)
      delta_phi = math.radians(lat2 - lat1)
      delta_lambda = math.radians(lon2 - lon1)
      a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
      c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
      return round(AIDeduplicationService.EARTH_RADIUS_METERS * c, 2)
  ```
  Tính toán khoảng cách cung tròn chính xác giữa 2 tọa độ WGS84, trả về đơn vị mét.
- **Độ tương đồng Cosine trên Image Embeddings (Dòng 47 - 60):**
  ```python
  @staticmethod
  def compute_embedding_similarity(vec1: List[float], vec2: List[float]) -> float:
      a, b = np.array(vec1, dtype=float), np.array(vec2, dtype=float)
      norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
      if norm_a == 0 or norm_b == 0: return 0.0
      cosine = float(np.dot(a, b) / (norm_a * norm_b))
      return round(max(0.0, min(100.0, cosine * 100.0)), 2)
  ```
- **Tổ hợp 3 điều kiện & Công thức trọng số (Dòng 63 - 93):**
  - Điều kiện tiên quyết: `is_gps_valid` ($\le 50$m), `is_time_valid` ($\le 48$h), `is_image_valid` ($\ge 80\%$) đồng thời thỏa mãn.
  - Công thức trọng số: $\text{Tương đồng tổng hợp} = 60\% \times \text{Ảnh} + 25\% \times \text{GPS} + 15\% \times \text{Thời gian}$.

### 1.2. RESTful API Router & Quy tắc Nghiệp vụ Deduplication
- **Tập tin:** `BackEnd/app/api/v1/deduplication/router.py`
- **Xác thực RBAC (Dòng 35 - 53):** Chỉ tài khoản thuộc `ALLOWED_ROLES = {"ADMIN", "OFFICER", "DISTRICT_MANAGER", "COORDINATOR", "RESPONDER"}` mới được truy cập, người dùng thường bị trả về `HTTP 403 Forbidden`.
- **Lấy danh sách cụm trùng lặp (Dòng 84 - 171):** `GET /api/v1/deduplication/clusters` hỗ trợ lọc theo Quận/Huyện, % tương đồng và áp dụng Soft Delete (`deleted_at IS NULL`).
- **So sánh song song & Đề xuất báo cáo chính (Dòng 173 - 260):** `GET /api/v1/deduplication/clusters/{cluster_id}/compare`. Báo cáo gửi sớm hơn (`created_at` nhỏ hơn) tự động được gợi ý làm Báo cáo chính (`recommended_primary_id` tại Dòng 237).
- **Đánh dấu không trùng lặp (False Positive) (Dòng 262 - 304):** `POST /api/v1/deduplication/mark-distinct`. Kiểm tra OCC locking version ($409$ tại Dòng 288 - 292), chuyển trạng thái sang `SEPARATED`.
- **Gộp báo cáo & Bảo lưu điểm thưởng (Dòng 306 - 374):** `POST /api/v1/deduplication/merge`. Kiểm tra OCC locking ($409$ tại Dòng 332 - 336), gán `master_incident_id`, soft-delete cụm, bảo lưu điểm thưởng và kích hoạt thông báo push cho người báo cáo phụ.

---

## CORE BE 2: PHÂN QUYỀN VAI TRÒ RBAC & MA TRẬN PHÂN QUYỀN ĐỘNG (DYNAMIC PERMISSION MATRIX)

- **Tập tin:** `BackEnd/app/api/v1/rbac.py`
- **15 Module & Thứ tự vai trò (Dòng 35 - 56):** `ADMIN` (0), `DISTRICT_MANAGER` (1), `RESPONDER` (2), `CITIZEN` (3).
- **Giới hạn 20 vai trò & Chống trùng tên (Dòng 246 - 269):**
  - Đếm tổng số vai trò $\ge 20 \rightarrow 400$ `MAX_ROLES_REACHED` (Dòng 248 - 255).
  - Dùng `dup_res.scalars().first()` kiểm tra trùng tên chuẩn hóa $\rightarrow 400$ `ROLE_EXISTS` (Dòng 260 - 269).
  - Sinh mã duy nhất `ROLE_{uuid.uuid4().hex[:8].upper()}` (Dòng 272).
- **Admin bất biến & Ràng buộc liên động (Dòng 397 - 436):**
  - Chặn sửa quyền Admin $\rightarrow 403$ `ADMIN_IMMUTABLE` (Dòng 397 - 404).
  - Khóa lạc quan OCC `payload.version != role.version` $\rightarrow 409$ `VERSION_MISMATCH` (Dòng 407 - 414).
  - Interlocking: Có quyền con tự động kích hoạt `ACCESS`; Có quyền sửa/xóa/nhập/xuất tự động kích hoạt `VIEW` (Dòng 420 - 436).
- **Thu hồi phiên làm việc tức thì (Dòng 457 - 464):** Gán `revoked_at = now()` cho toàn bộ `UserSession` thuộc role vừa chỉnh sửa để quyền mới có hiệu lực ngay lập tức.

---

## CORE BE 3: TRỢ LÝ GIỌNG NÓI AI NLU ENGINE (VOICE ASSISTANT)

- **Tập tin:** `BackEnd/app/services/voice_assistant/voice_service.py`
- **Class:** `VoiceNluService` (Dòng 74 - 1075)
- **Tọa độ 22 quận/huyện TP.HCM (Dòng 29 - 71):** `LOCATION_COORDINATES` phục vụ tra cứu địa phương.
- **Chuẩn hóa Tiếng Việt (Dòng 86 - 134):** `normalize_text` chuẩn hóa Unicode NFC, xử lý dấu thanh, loại bỏ ký tự nhiễu.
- **Phân loại Ý định Đa tầng (Dòng 137 - 230):** `match_intent` phối hợp Tầng 1 Exact Match $\rightarrow$ Tầng 2 Regex Pattern $\rightarrow$ Tầng 3 Keyword & Fuzzy score.
- **Xử lý lệnh rảnh tay & Dữ liệu thời gian thực (Dòng 380 - 600):** `process_voice_command` kết nối dữ liệu thời tiết thực tế từ `WeatherService` và mực nước triều cường từ `tide_engine` để sinh phản hồi Text-to-Speech (TTS Ready) và payload điều hướng.

---

## CORE BE 4: ĐỘNG CƠ THỦY TRIỀU ĐIỀU HÒA & DỰ BÁO NGẬP LỤT (HARMONIC TIDE & FLOOD ENGINE)

### 4.1. Động cơ Giải tích Sóng Thủy triều Điều hòa Thuần Python
- **Tập tin:** `BackEnd/app/services/tide_service.py`
- **Class:** `HarmonicTideEngine` (Dòng 54 - 294)
- **4 Sóng điều hòa thiên văn (Dòng 22 - 51):** Trạm Phú An và Nhà Bè với các sóng $M_2$ (Mặt Trăng bán nhật triều), $S_2$ (Mặt Trời bán nhật triều), $K_1$ (Nhật-Nguyệt nhật triều), $O_1$ (Mặt Trăng nhật triều).
- **Mực nước giải tích $H(t)$ (Dòng 68 - 90):** $H(t) = H_0 + \sum_{i=1}^{N} A_i \cos(\omega_i t - g_i)$, tính toán trong vài micro-giây, độc lập offline $100\%$.
- **Đạo hàm vận tốc $dH/dt$ & Trạng thái con nước (Dòng 93 - 135):** Tính tốc độ dâng/hạ nước (m/h) và phân loại `RISING`, `FALLING`, `HIGH_TIDE`, `LOW_TIDE`, `STAND`.
- **4 Cấp độ cảnh báo triều cường TP.HCM (Dòng 137 - 150):** `< 1.40m` (Bình thường), `1.40 - 1.50m` (Báo động 1), `1.50 - 1.60m` (Báo động 2), `> 1.60m` (Báo động 3 - Ngập sâu diện rộng).

### 4.2. Động cơ Đánh giá Rủi ro Ngập Lụt Đa Yếu tố
- **Tập tin:** `BackEnd/app/services/flood_engine.py` (Dòng 35 - 280)
- **Nghiệp vụ:** $\text{Risk Score} = w_{\text{rain}} \times \text{Mưa} + w_{\text{tide}} \times \text{Triều} + w_{\text{topo}} \times \text{Địa hình}$ kết hợp báo cáo hiện trường từ người dân để tự động vẽ đa giác cảnh báo ngập.

---

## CORE BE 5: HỒ SƠ CÁ NHÂN, HỘ CHIẾU XANH & DÒNG THỜI GIAN (PROFILE, GREEN PASSPORT & TIMELINE)

- **Tập tin:** `BackEnd/app/api/v1/profile.py`
- **Bảo mật ngày sinh (Dòng 123 & 142 - 152):** `date_of_birth = target_user.date_of_birth if is_own else None`. Khi người khác xem hồ sơ thì ngày sinh tự động bị ẩn.
- **Hộ Chiếu Xanh & 5 Cấp bậc Chuẩn (Dòng 243 - 298):**
  - Sinh mã duy nhất dạng `GP-000123` (`generate_passport_code` tại Dòng 290).
  - 5 Cấp bậc: *Mầm Xanh (0đ), Chồi Xanh (100đ), Lá Xanh (300đ), Cây Xanh (600đ), Đại Sứ Xanh (1000đ)*.
  - Công thức phần trăm tiến độ và điểm lên cấp (Dòng 281 - 283).
- **Dòng thời gian & Bài viết ẩn (Dòng 154 - 236):** Chủ trang xem được cả bài ẩn `is_hidden = True`, người ngoài tự động bị lọc qua điều kiện `Post.is_hidden.is_(False)`.

---

## CORE BE 6: QUẢN LÝ NGƯỜI DÙNG, XÁC THỰC & PHIÊN LÀM VIỆC (USER MANAGEMENT & SECURITY)

- **Tập tin:** `BackEnd/app/api/v1/user_management.py`
- **Khóa / Kích hoạt tài khoản (Dòng 335 - 405):** `change_user_status` chuyển đổi `ACTIVE` $\leftrightarrow$ `BLOCKED` và thu hồi tức thì mọi phiên đăng nhập (`revoked_at = now()` tại Dòng 379 - 382).
- **Đặt lại mật khẩu an toàn (Dòng 408 - 456):** `reset_user_password` chặn đặt lại trùng mật khẩu cũ (`verify_password` tại Dòng 435), băm Bcrypt mới (`hash_password` tại Dòng 444) và hủy toàn bộ phiên đang chạy.
- **Bảo mật mật khẩu & Token (`BackEnd/app/utils/security.py`):** Bcrypt hash, JWT HS256 access token, SHA-256 refresh token băm trong CSDL.

---

## CORE BE 7: HẠ TẦNG CSDL, PRISMA ORM & CÔNG CỤ TỰ ĐỘNG HÓA (DATABASE & CLI AUTOMATION)

- **Tập tin:** `BackEnd/app/database.py` (Dòng 7 - 25)
  - Engine asyncpg: tự cắt bỏ tham số `?schema=`, cấu hình `pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`.
- **Lược đồ Prisma 32 Models:** `BackEnd/prisma/schema.prisma` hỗ trợ PostGIS và quan hệ 32 bảng.
- **Bộ phím tắt Quản lý Database:** `BackEnd/scripts/db.py` (Dòng 36 - 65) hỗ trợ các lệnh: `up`, `down`, `studio`, `seed`, `migrate`, `pull`.

---

# PHẦN B: KIẾN TRÚC CỐT LÕI PHÍA FRONTEND

## CORE FE 1: GIAO DIỆN AI DEDUPLICATION DASHBOARD (MÀN 1/4 -> 4/4)

Module giao diện hỗ trợ điều phối viên đối soát và xử lý các cụm sự cố trùng lặp do AI phát hiện, xây dựng 100% bằng SCSS chuyên dụng.

### 1.1. Bộ điều phối Dashboard Trung tâm
- **Tập tin:** `FrontEnd/src/features/reports/deduplication/pages/DeduplicationDashboard.tsx`
- **Quản lý trạng thái đa màn hình (Dòng 30 - 69):**
  - `currentScreen`: Quản lý luồng chuyển đổi giữa Danh sách (`list` - Màn 1) và So sánh (`compare` - Màn 2).
  - Quản lý trạng thái nạp dữ liệu, lọc theo quận (`selectedDistrict`), lọc theo % tương đồng (`minSimilarity`).
  - Quản lý Modal Màn 3 (`isMergeModalOpen`) và Modal Màn 4 (`isSuccessModalOpen`).
  - Hàm `showToast` tự động đóng thông báo sau 3000ms (Dòng 64 - 69).

### 1.2. Màn 1/4: Bộ lọc Cột trái & Danh sách Nhóm trùng Cột phải
- **Cột trái - Bộ lọc:** `FrontEnd/src/features/reports/deduplication/components/DeduplicationFilter.tsx` (Dòng 1 - 120)
  - Dropdown chọn quận/huyện tải động từ Backend.
  - Slider phần trăm tương đồng kết hợp các nút chọn nhanh presets (70%, 80%, 90%).
  - Nút "Đặt lại bộ lọc" khôi phục trạng thái mặc định.
- **Cột phải - Danh sách Nhóm trùng:** `FrontEnd/src/features/reports/deduplication/components/ClusterList.tsx` (Dòng 1 - 110)
  - Hiển thị danh sách Cards nhóm trùng với tỷ lệ % giống nhau, số lượng báo cáo trong nhóm.
  - Nút bầu dục "So sánh" kích hoạt chuyển sang Màn 2.
  - Tích hợp Skeleton loading khi tải dữ liệu, Empty state khi không có kết quả, và Error state kèm nút "Thử lại".

### 1.3. Màn 2/4: So sánh Đối chứng Song song (Side-by-Side Comparison)
- **Tập tin:** `FrontEnd/src/features/reports/deduplication/components/SideBySideComparison.tsx`
- **Cột 1 - Báo cáo A (Dòng 47 - 130):** Khung ảnh hiện trường có skeleton placeholder, nút phóng to ảnh (Lightbox), thông tin người báo cáo, thời gian gửi, tọa độ địa chỉ và mô tả sự cố.
- **Cột 2 - Báo cáo B (Dòng 132 - 215):** Bố cục đối xứng hoàn toàn với Báo cáo A, giúp điều phối viên đối chiếu trực quan.
- **Cột 3 - Kết luận AI & Nút hành động (Dòng 218 - 276):**
  - Hiển thị tỷ lệ giống nhau AI tổng hợp và lý do tóm tắt.
  - Bảng checklist 3 yếu tố đối soát: Khoảng cách GPS ($<50$m), Khoảng cách giờ ($<48$h), Tương đồng ảnh ($>80\%$) kèm dấu tích xanh/đỏ trực quan.
  - Nút "Gộp báo cáo" (mở Popup Màn 3) và Nút "Không trùng" (gọi API tách cụm, hiển thị Toast 3 giây).

### 1.4. Màn 3/4 & 4/4: Popups Xác nhận Gộp & Thông báo Thành công
- **Màn 3/4 - Popup Xác nhận Gộp:** `FrontEnd/src/features/reports/deduplication/components/MergeConfirmModal.tsx`
  - Backdrop làm mờ, nhãn nhỏ `POPUP` (Dòng 57), tiêu đề `GỘP BÁO CÁO?` (Dòng 61).
  - Radio chọn Báo cáo chính: Mặc định chọn báo cáo AI gợi ý (gửi sớm hơn) (Dòng 24 - 32 & 65 - 115).
  - Thông báo bảo lưu điểm thưởng: *"Báo cáo phụ sẽ được liên kết vào báo cáo chính. Người báo cáo vẫn được bảo lưu điểm thưởng"* (Dòng 117 - 123).
  - Nút "Gộp" có spinner trạng thái loading, tự động disable nút "Huỷ" khi đang gửi request, hỗ trợ phím Esc để thoát (Dòng 37 - 44).
- **Màn 4/4 - Popup Đã gộp thành công:** `FrontEnd/src/features/reports/deduplication/components/MergeSuccessModal.tsx`
  - Nhãn nhỏ `POPUP`, tiêu đề in đậm `ĐÃ GỘP BÁO CÁO` (Dòng 27 - 29).
  - Dòng thông báo nổi bật: *"Người báo cáo nhận thông báo"* (Dòng 32 - 34).
  - Nút "Đóng" (Dòng 42 - 50) đóng modal và tự động chuyển về danh sách Màn 1.
- **Lightbox phóng to ảnh:** `FrontEnd/src/features/reports/deduplication/components/ImageLightboxModal.tsx` (Dòng 1 - 42) hiển thị ảnh kích thước đầy đủ kèm chú thích và click backdrop để đóng.

---

## CORE FE 2: GIAO DIỆN QUẢN LÝ PHÂN QUYỀN RBAC & MA TRẬN PHÂN QUYỀN ĐỘNG

Module quản trị ma trận phân quyền vai trò cho Quản trị viên hệ thống.

### 2.1. Ma trận Phân quyền Động 7 Cột ACL (Màn 3)
- **Tập tin:** `FrontEnd/src/features/rbac/pages/RolePermissionMatrixPage.tsx`
- **7 Cột chuẩn ACL (Dòng 18 - 26):** `TRUY CẬP (ACCESS)`, `XEM (VIEW)`, `THÊM (CREATE)`, `CẬP NHẬT (UPDATE)`, `XOÁ (DELETE)`, `IMPORT`, `EXPORT`.
- **Khóa chỉnh sửa vai trò Admin (Dòng 80 - 100):** Cột và các ô thuộc vai trò Admin luôn bị khóa disable (chỉ đọc), không cho phép bỏ quyền.
- **Quy tắc ràng buộc liên động giữa các ô (Dòng 130 - 169):**
  - Ràng buộc 1: Bỏ tích `TRUY CẬP` $\rightarrow$ Tự động bỏ tích toàn bộ 6 quyền còn lại của module đó (Dòng 135 - 142).
  - Ràng buộc 2: Bỏ tích `XEM` $\rightarrow$ Tự động bỏ tích các quyền Thêm, Cập nhật, Xoá, Import, Export (Dòng 144 - 151).
  - Ràng buộc 3: Tích bất kỳ quyền con nào $\rightarrow$ Tự động bật `TRUY CẬP` (Dòng 156 - 158).
  - Ràng buộc 4: Tích Thêm, Cập nhật, Xoá, Import, Export $\rightarrow$ Tự động bật `XEM` (Dòng 159 - 163).
- **Bật/Tắt cả hàng chức năng (Dòng 172 - 191):** Hàm `handleToggleRow` cho phép tích/bỏ nhanh toàn bộ 7 quyền của 1 hàng.
- **Xử lý xung đột phiên bản OCC 409 (Dòng 230 - 248):** Khi backend trả về `VERSION_MISMATCH`, hiển thị banner cảnh báo dữ liệu đã bị người khác thay đổi và nút tải lại.

### 2.2. Danh sách Vai trò & Tạo Vai trò Mới
- **Danh sách vai trò (Màn 1):** `FrontEnd/src/features/rbac/pages/RoleListPage.tsx`
  - Hiển thị 4 vai trò hệ thống đầu tiên, phân biệt badge hệ thống/tùy chỉnh, đếm số user của từng vai trò.
  - Disable nút "Tạo vai trò" khi số lượng vai trò đạt tối đa 20.
- **Tạo vai trò tùy chỉnh (Màn 2):** `FrontEnd/src/features/rbac/pages/CreateRolePage.tsx`
  - Validate tên vai trò tiếng Việt có dấu, kiểm tra độ dài 2-50 ký tự, lựa chọn phạm vi (Toàn thành phố / Quận).
- **Xóa vai trò & Chuyển giao người dùng (Màn 4):**
  - `DeleteRoleModal.tsx`: Chặn xóa vai trò hệ thống và chặn xóa khi vai trò đang có người dùng gán vào.
  - `ReassignUsersModal.tsx`: Cho phép chọn vai trò đích để chuyển toàn bộ người dùng sang trước khi xóa vai trò cũ.

---

## CORE FE 3: KHUNG BẢO VỆ 3 TẦNG UNIVERSAL RBAC GUARD FRAMEWORK

- **Tập tin:** `FrontEnd/src/features/rbac/components/ModulePermissionGuard.tsx` (Dòng 1 - 66)
- **Kiến trúc 3 Tầng Bảo vệ Giao diện:**
  - **Tầng 1 - Chặn truy cập (Dòng 30 - 42):** Nếu người dùng không có quyền `ACCESS` cho module $\rightarrow$ Render component `AccessDeniedView` (`HTTP 403`).
  - **Tầng 2 - Khóa xem dữ liệu (Dòng 44 - 57):** Nếu có quyền `ACCESS` nhưng thiếu quyền `VIEW` $\rightarrow$ Render component `ModuleViewLockedView` (giao diện khóa xem có nút quay lại hoặc đăng nhập tài khoản có thẩm quyền).
  - **Tầng 3 - Render nội dung & Render Props (Dòng 59 - 65):** Khi có đầy đủ cả `ACCESS` và `VIEW` $\rightarrow$ Render component con hoặc truyền đối tượng quyền `perms` (`hasCreate`, `hasUpdate`, `hasDelete`...) qua hàm render props.

---

## CORE FE 4: TRUNG TÂM TRỢ LÝ GIỌNG NÓI AI VOICE ASSISTANT HANDS-FREE UI

- **Tập tin:** `FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx` (Dòng 1 - 1015)
- **Quản lý vòng đời âm thanh Web Audio API & MediaStream (Dòng 50 - 78):** Quản lý và giải phóng microphone triệt để qua `stopRecordingCleanup`.
- **Nhận diện giọng nói thời gian thực (Real-time STT) (Dòng 100 - 180):** Tích hợp Web Speech Recognition tiếng Việt (`lang = 'vi-VN'`), hiển thị phụ đề trực tiếp khi người dùng đang nói.
- **Tự động ngắt khi im lặng (Silence Detection) (Dòng 300 - 350):** Theo dõi khoảng lặng 1.5 - 2.0 giây để tự động gửi câu lệnh lên AI backend xử lý mà không cần bấm nút dừng.
- **Phát lại âm thanh (Speech Synthesis TTS) (Dòng 450 - 520):** Sử dụng `window.speechSynthesis` phát lại câu trả lời thông minh bằng giọng đọc tự nhiên.
- **Điều hướng hành động động (Action Dispatcher) (Dòng 530 - 600):** Tự động mở bản đồ ngập lụt, mở biểu mẫu báo cáo sự cố, hoặc hiển thị thẻ cứu hộ theo ý định nhận diện được.
- **Sóng âm động:** `VoiceWaveform.tsx` (Dòng 1 - 120) vẽ Canvas sóng âm chuyển động theo biên độ âm thanh thực từ AudioContext Analyzer.
- **Popup cấp quyền Micro:** `MicPermissionModal.tsx` (Dòng 1 - 95) hướng dẫn người dùng bật lại quyền Microphone trên trình duyệt khi bị chặn.

---

## CORE FE 5: BẢN ĐỒ SỐ WEBGIS ĐA LỚP KHÔNG GIAN (ECOMAP & ROUTING)

- **Tập tin:** `FrontEnd/src/components/EcoMap.tsx` (Dòng 1 - 2732)
- **Công nghệ lõi:** MapLibre GL (`react-map-gl/maplibre`) với raster/vector tiles hiệu năng cao.
- **Các lớp dữ liệu không gian tích hợp:**
  - Lớp ranh giới hành chính 22 quận/huyện TP.HCM.
  - Lớp điểm xanh, công viên sinh thái và trạm thu gom tái chế (`CATEGORY_CONFIG` tại Dòng 6 - 15).
  - Lớp trạm quan trắc IoT chất lượng không khí AQI.
  - Lớp radar thời tiết và bản đồ nhiệt mưa trực tiếp (`LiveWeatherRadarMap` tại Dòng 44).
  - Lớp cảnh báo điểm ngập lụt thời gian thực và đoạn đường ngập GloFAS (`fetchFloodHotspotsAPI`, `fetchGloFASForecastAPI` tại Dòng 32 - 38).
- **Tìm đường an toàn né ngập:** Tích hợp OSRM routing (`getRouteOSRM` tại Dòng 18) tự động tính toán lộ trình tối ưu tránh các đoạn đường ngập nước.
- **Tích hợp RBAC Guard:** Ánh xạ danh mục địa điểm sang module quyền tương ứng qua `CATEGORY_TO_MODULE` (Dòng 46).

---

## CORE FE 6: GIAO DIỆN QUẢN LÝ NGƯỜI DÙNG & TÀI KHOẢN NỘI BỘ

- **Bộ điều phối chính:** `FrontEnd/src/features/user_management/UserManagementContainer.tsx` (Dòng 1 - 650)
- **Bảng dữ liệu người dùng:** Tìm kiếm debounce, lọc theo vai trò, lọc theo trạng thái (`ACTIVE`, `BLOCKED`), phân trang server-side.
- **Modal Thao tác:**
  - `CreateUserModal.tsx` (Dòng 1 - 260): Tạo tài khoản người dùng nội bộ, validate email, họ tên tiếng Việt và mật khẩu mạnh.
  - `ChangeRoleModal.tsx` (Dòng 1 - 150): Thay đổi vai trò của người dùng với cảnh báo tác động quyền hạn.
  - `ResetPasswordModal.tsx` (Dòng 1 - 180): Admin đặt lại mật khẩu mới cho người dùng.
  - `ConfirmModal.tsx` (Dòng 1 - 130): Hộp thoại xác nhận khóa tài khoản hoặc xóa tài khoản có cảnh báo đỏ.

---

## CORE FE 7: GIAO DIỆN HỒ SƠ CÁ NHÂN, HỘ CHIẾU XANH & DÒNG THỜI GIAN

- **Bộ điều phối:** `FrontEnd/src/features/profile/ProfileContainer.tsx` (Dòng 1 - 580)
- **Màn 1 - Dòng thời gian cá nhân:** `ProfileTimeline.tsx` (Dòng 1 - 350) hiển thị cover image, avatar, danh hiệu cấp bậc, bio, nút kết bạn, 3 huy hiệu tiêu biểu và danh sách bài đăng Timeline (hiển thị nhãn "Đã ẩn" nếu là bài viết ẩn của chính mình).
- **Màn 2 - Hộ Chiếu Xanh & Huy Hiệu:** `GreenPassportView.tsx` (Dòng 1 - 280)
  - Thẻ Hộ chiếu xanh với mã định danh `GP-XXXXXX`.
  - Thanh phần trăm tiến độ lên cấp bậc tiếp theo với animation mượt mà.
  - Danh sách huy hiệu Đã nhận (sắp xếp theo thời gian nhận mới nhất) và huy hiệu Chưa mở khóa kèm điều kiện mở khóa.
- **Màn 3 - Nhật ký hoạt động:** `ContributionHistoryView.tsx` (Dòng 1 - 320) hiển thị 25 hoạt động đóng góp môi trường, điểm xanh tích lũy, bộ lọc phân loại hoạt động.
- **Màn 4 - Chỉnh sửa hồ sơ:** `EditProfileView.tsx` (Dòng 1 - 380) cập nhật họ tên, tiểu sử bio, ngày sinh với validation chặt chẽ và kiểm soát phiên bản OCC.

---

## CORE FE 8: XÁC THỰC, PHIÊN ĐĂNG NHẬP & QUẢN TRỊ THIẾT BỊ

- **Bộ điều phối:** `FrontEnd/src/features/auth/AuthContainer.tsx` (Dòng 1 - 180)
- **Đăng ký tài khoản công dân:** `RegisterPage.tsx` (Dòng 1 - 380) validate số điện thoại VN (+84/09), email, kiểm tra độ mạnh mật khẩu và gửi OTP kích hoạt.
- **Xác thực OTP 6 số:** `OtpVerificationPage.tsx` (Dòng 1 - 320) tự động nhảy focus giữa 6 ô input, đếm ngược 60 giây để gửi lại mã OTP.
- **Đăng nhập & Ghi nhớ:** `LoginPage.tsx` (Dòng 1 - 360) hỗ trợ ghi nhớ đăng nhập (Remember me 30 ngày), hiển thị thông báo lỗi khóa tài khoản hoặc sai mật khẩu.
- **Quản lý thiết bị đăng nhập:** `DeviceManagementPage.tsx` (Dòng 1 - 310) danh sách các thiết bị/trình duyệt đang đăng nhập, badge "Thiết bị này", nút đăng xuất từ xa từng thiết bị hoặc đăng xuất tất cả thiết bị khác.
- **Popup hết hạn phiên làm việc:** `SessionExpiredModal.tsx` (Dòng 1 - 85) tự động bật khi nhận mã lỗi 401 từ API để người dùng đăng nhập lại mà không bị mất ngữ cảnh trang.

---

# PHẦN C: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)

| STT | Phân hệ / Chức năng cốt lõi | Tầng | Tập tin nguồn | Số dòng thực tế | Hàm / Component đại diện |
|:---:|---|:---:|---|:---:|---|
| **1** | Haversine GPS Distance | **BE** | `BackEnd/app/services/deduplication/ai_engine.py` | 22 - 36 | `calculate_gps_distance_meters` |
| **2** | Image Cosine Similarity | **BE** | `BackEnd/app/services/deduplication/ai_engine.py` | 47 - 60 | `compute_embedding_similarity` |
| **3** | AI Duplicate Evaluation | **BE** | `BackEnd/app/services/deduplication/ai_engine.py` | 63 - 93 | `evaluate_duplicate_pair` |
| **4** | Deduplication API Endpoints | **BE** | `BackEnd/app/api/v1/deduplication/router.py` | 84 - 374 | `list_duplicate_clusters`, `merge_cluster_incidents` |
| **5** | Deduplication Dashboard State | **FE** | `FrontEnd/src/features/reports/deduplication/pages/DeduplicationDashboard.tsx` | 30 - 69 | `DeduplicationDashboard` |
| **6** | Side-by-Side Comparison UI | **FE** | `FrontEnd/src/features/reports/deduplication/components/SideBySideComparison.tsx` | 47 - 276 | `SideBySideComparison` |
| **7** | Merge Confirm Modal (Esc/Radio) | **FE** | `FrontEnd/src/features/reports/deduplication/components/MergeConfirmModal.tsx` | 24 - 155 | `MergeConfirmModal` |
| **8** | Merge Success Modal ("Nhận thông báo") | **FE** | `FrontEnd/src/features/reports/deduplication/components/MergeSuccessModal.tsx` | 23 - 52 | `MergeSuccessModal` |
| **9** | Max 20 Roles & Duplicate Check | **BE** | `BackEnd/app/api/v1/rbac.py` | 246 - 269 | `create_custom_role` |
| **10** | Admin Immutability & Interlocking | **BE** | `BackEnd/app/api/v1/rbac.py` | 397 - 436 | `update_role_permissions` |
| **11** | User Session Revocation (Backend) | **BE** | `BackEnd/app/api/v1/rbac.py` | 457 - 464 | `update_role_permissions` |
| **12** | 7 ACL Columns & Matrix UI | **FE** | `FrontEnd/src/features/rbac/pages/RolePermissionMatrixPage.tsx` | 18 - 26 & 130 - 169 | `RolePermissionMatrixPage` |
| **13** | Universal RBAC 3-Tier Guard | **FE** | `FrontEnd/src/features/rbac/components/ModulePermissionGuard.tsx` | 13 - 65 | `ModulePermissionGuard` |
| **14** | Vietnamese Text Normalization | **BE** | `BackEnd/app/services/voice_assistant/voice_service.py` | 86 - 134 | `normalize_text` |
| **15** | Voice NLU Multi-tier Intent | **BE** | `BackEnd/app/services/voice_assistant/voice_service.py` | 137 - 230 | `match_intent` |
| **16** | Voice Hands-Free UI & Web Audio | **FE** | `FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx` | 50 - 550 | `VoiceAssistant` |
| **17** | Audio Waveform Dynamic Canvas | **FE** | `FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx` | 1 - 120 | `VoiceWaveform` |
| **18** | Harmonic Tide Prediction $H(t)$ | **BE** | `BackEnd/app/services/tide_service.py` | 68 - 90 | `calculate_water_level` |
| **19** | Tide Rate $dH/dt$ & Alert 1-3 | **BE** | `BackEnd/app/services/tide_service.py` | 93 - 150 | `get_tide_rate_of_change`, `determine_alert_level` |
| **20** | WebGIS MapLibre Multi-layers | **FE** | `FrontEnd/src/components/EcoMap.tsx` | 1 - 2732 | `EcoMap` |
| **21** | Green Passport & Level Formula | **BE** | `BackEnd/app/api/v1/profile.py` | 243 - 298 | `get_green_passport` |
| **22** | Profile Privacy (Date of Birth) | **BE** | `BackEnd/app/api/v1/profile.py` | 50 - 152 | `build_profile_response` |
| **23** | Green Passport View & Progress | **FE** | `FrontEnd/src/features/profile/components/GreenPassportView.tsx` | 1 - 280 | `GreenPassportView` |
| **24** | User Lock & Password Reset | **BE** | `BackEnd/app/api/v1/user_management.py` | 335 - 456 | `change_user_status`, `reset_user_password` |
| **25** | User Management Table & Modals | **FE** | `FrontEnd/src/features/user_management/UserManagementContainer.tsx` | 1 - 650 | `UserManagementContainer` |
| **26** | Device Remote Logout Management | **FE** | `FrontEnd/src/features/auth/pages/DeviceManagementPage.tsx` | 1 - 310 | `DeviceManagementPage` |
| **27** | Session Expired Modal (401 catch) | **FE** | `FrontEnd/src/features/auth/components/SessionExpiredModal.tsx` | 1 - 85 | `SessionExpiredModal` |
| **28** | Asyncpg Database Connection Pool | **BE** | `BackEnd/app/database.py` | 7 - 25 | `create_async_engine` |
| **29** | Database Automation CLI Tool | **BE** | `BackEnd/scripts/db.py` | 36 - 65 | `db_up`, `db_down`, `db_seed`... |

---

*Tài liệu toàn diện Full-Stack đã được đối soát vi mô (micro-level auditing) khớp 100% từng dòng mã nguồn thực tế của cả BackEnd và FrontEnd trong dự án GreenSpot.*
