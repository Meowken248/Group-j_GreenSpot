# KẾ HOẠCH CHI TIẾT CẢI THIỆN & NÂNG CẤP 12 CHỨC NĂNG (CN 25 → CN 36) ĐẠT CHUẨN 10/10

> **Dự án**: GreenSpot — Hệ thống Quản lý Môi trường, Khí hậu & Động lực Công dân Xanh TP.HCM  
> **Phân hệ**: Động lực Công dân Xanh, Kinh tế Điểm thưởng (Eco-Tokenomics), Phân tích Không gian & Kiểm toán Minh bạch (CN 25 → CN 36)  
> **Bộ tiêu chuẩn áp dụng**:
> - **Nghiệp vụ Thực tiễn & Học thuật (`thesis-writing`)**: Khép kín vòng lặp CivicTech/GovTech, chống gian lận điểm thưởng (Anti-Fraud), cân đối ngân sách ESG, minh bạch hóa dữ liệu.
> - **Kiểm toán & Nâng cấp Giao diện (`redesign-existing-projects` & `design-taste-frontend`)**: Khóa đồng nhất giao diện (Page Theme Lock), tinh gọn thanh điều hướng (Navigation Discipline), loại bỏ bản đồ giả lập SVG, chuẩn hóa trạng thái Loading/Empty/Error.
> - **Độ hoàn thiện Kỹ thuật (`full-output-enforcement`)**: Sửa triệt để các lỗi ngầm (Hidden Bugs), đảm bảo tính toàn vẹn giao dịch (ACID / Row-level Locking) và liên thông dữ liệu 100% giữa 12 chức năng.

---

## MỤC LỤC

1. [Tổng quan Mục tiêu Nâng cấp (Từ Hiện trạng lên 10/10)](#1-tổng-quan-mục-tiêu-nâng-cấp-từ-hiện-trạng-lên-1010)
2. [Kế hoạch Chi tiết Từng Chức năng (CN 25 → CN 36)](#2-kế-hoạch-chi-tiết-từng-chức-năng-cn-25--cn-36)
   - [CN 25 — Thử thách xanh trong tuần (`#challenges`)](#cn-25--thử-thách-xanh-trong-tuần-nhiệm-vụ-nhỏ-nhận-điểm-thưởng)
   - [CN 26 — Nhật ký kiểm toán Audit Log (`#audit-logs`)](#cn-26--nhật-ký-kiểm-toán-audit-log-ghi-lại-thao-tác-quan-trọng)
   - [CN 27 — Thư viện sống xanh: Cẩm nang phân loại rác (`#handbook`)](#cn-27--thư-viện-sống-xanh-cẩm-nang-phân-loại-rác)
   - [CN 28 — Cơ chế tích lũy điểm thưởng Công dân Xanh (`#policy`)](#cn-28--cơ-chế-tích-lũy-điểm-thưởng-công-dân-xanh)
   - [CN 29 — Ví điểm và lịch sử biến động điểm xanh (`#wallet`)](#cn-29--ví-điểm-và-lịch-sử-biến-động-điểm-xanh)
   - [CN 30 — Quản trị CRUD danh mục quà tặng xanh và kho voucher (`#catalog`)](#cn-30--quản-trị-crud-danh-mục-quà-tặng-xanh-và-kho-voucher)
   - [CN 31 — Quản lý danh sách quà tặng cá nhân đã đổi (`#vouchers`)](#cn-31--quản-lý-danh-sách-quà-tặng-cá-nhân-đã-đổi)
   - [CN 32 — Bảng xếp hạng vinh danh Top Công dân Xanh (`#leaderboard`)](#cn-32--bảng-xếp-hạng-vinh-danh-top-công-dân-xanh-cá-nhân-nhóm-quận)
   - [CN 33 — Bản đồ nhiệt môi trường & khí hậu đa chế độ (`#heatmap`)](#cn-33--bản-đồ-nhiệt-môi-trường--khí-hậu-đa-chế-độ-aqi-nhiệt-độ-rủi-ro)
   - [CN 34 — Quét mã QR nhận điểm (`#qr-scan`)](#cn-34--quét-mã-qr-nhận-điểm-hỗ-trợ-camera-trực-tiếp--tải-ảnh-qr)
   - [CN 35 — Vòng quay may mắn hằng ngày (`#lucky-wheel`)](#cn-35--vòng-quay-may-mắn-hằng-ngày-mỗi-ngày-1-lượt-quay-trúng-điểmhuy-hiệu)
   - [CN 36 — Hiệu ứng thăng cấp danh hiệu & Cột mốc Công dân Xanh (`#milestone`)](#cn-36--hiệu-ứng-thăng-cấp-danh-hiệu--cột-mốc-công-dân-xanh)
3. [Kế hoạch Nâng cấp Kiến trúc UI/UX Toàn cục (`design-taste-frontend`)](#3-kế-hoạch-nâng-cấp-kiến-trúc-uiux-toàn-cục-design-taste-frontend)
4. [Lộ trình Thực thi 4 Giai đoạn (Implementation Roadmap) & Checklist Nghiệm thu](#4-lộ-trình-thực-thi-4-giai-đoạn-implementation-roadmap--checklist-nghiệm-thu)

---

## 1. TỔNG QUAN MỤC TIÊU NÂNG CẤP (TỪ HIỆN TRẠNG LÊN 10/10)

| Mã CN | Tên chức năng | Điểm hiện tại | Điểm mục tiêu | Trọng tâm cải thiện cốt lõi để đạt 10/10 |
| :---: | :--- | :---: | :---: | :--- |
| **CN 25** | Thử thách xanh trong tuần (`#challenges`) | 8.0 / 10 | **10 / 10** | Chống cộng trùng thưởng Combo +100đ; kiểm tra siêu dữ liệu ảnh minh chứng (cam kết thực tế + chống nộp trùng ảnh `SHA-256` hash); mặc định hậu kiểm `is_auto_verify = False`. |
| **CN 26** | Nhật ký kiểm toán Audit Log (`#audit-logs`) | 9.5 / 10 | **10 / 10** | Thu thập IP thực từ `Request` thay vì gán cứng `127.0.0.1`; sửa lỗi ghi AuditLog bị nuốt ở CN 31 & CN 32; bổ sung chuỗi băm liên kết (Hash Chain Verification). |
| **CN 27** | Cẩm nang phân loại rác (`#handbook`) | 9.0 / 10 | **10 / 10** | Bổ sung bộ lọc nhanh "Vật phẩm dễ nhầm lẫn", chế độ Mini-Quiz "Thử tài phân loại rác nhận +5 điểm" liên kết sang CN 28/29 và ghi Audit Log khi Admin sửa cẩm nang. |
| **CN 28** | Cơ chế tích lũy điểm thưởng (`#policy`) | 7.5 / 10 | **10 / 10** | **Sửa lỗi cốt tử**: Tính hạng hội viên (`Tier`) theo `lifetime_points` thay vì `green_points`; áp dụng thực tế chiết khấu điểm theo Hạng (Bạc -5%, Vàng -10%, Kim Cương -15%). |
| **CN 29** | Ví điểm & lịch sử biến động (`#wallet`) | 8.5 / 10 | **10 / 10** | Tách biệt rõ `Số dư khả dụng (green_points)` và `Điểm xét hạng trọn đời (lifetime_points)`; thêm nút "Nạp dữ liệu mẫu Demo" có kiểm soát thay vì tự động bơm điểm ngầm; xuất sao kê CSV. |
| **CN 30** | Quản trị CRUD danh mục quà (`#catalog`) | 8.5 / 10 | **10 / 10** | Áp dụng khóa dòng (`with_for_update`) chống Race Condition khi đổi quà; hiển thị giá gốc & giá ưu đãi theo Hạng hội viên; bổ sung thông tin Nhà tài trợ ESG/CSR. |
| **CN 31** | Quản lý quà cá nhân đã đổi (`#vouchers`) | 8.5 / 10 | **10 / 10** | Yêu cầu mã xác nhận quầy thu ngân (Cashier PIN / OTP) khi đánh dấu đã dùng để tránh người dân bấm nhầm mất voucher; ghi Audit Log chuẩn xác khi đối soát POS. |
| **CN 32** | Bảng xếp hạng Công dân Xanh (`#leaderboard`) | 7.5 / 10 | **10 / 10** | Xếp hạng Cá nhân theo điểm tích lũy trong kỳ (`WEEK` / `MONTH` / `ALL - lifetime_points`) thay vì số dư ví; sửa lỗi Crash `TypeError` khi Admin bấm chốt sổ trao giải Top 3. |
| **CN 33** | Bản đồ nhiệt môi trường đa chế độ (`#heatmap`) | 6.5 / 10 | **10 / 10** | **Nâng cấp đột phá**: Thay khung `<svg>` chấm tròn giả lập bằng **Bản đồ WebGIS Leaflet thực tế** có lớp phủ bán kính nhiệt & ranh giới 22 Quận/Huyện TP.HCM + đồng bộ chỉ số thời tiết. |
| **CN 34** | Quét mã QR nhận điểm (`#qr-scan`) | 6.0 / 10 | **10 / 10** | Chuyển sang cơ chế **Mã QR Động có chữ ký thời gian (Signed OTP/Dynamic QR)** hoặc **Mã xác nhận Cân nặng/Số lượng rác tại trạm**; bỏ fallback GPS trùng tọa độ trạm; cộng đủ `lifetime_points`. |
| **CN 35** | Vòng quay may mắn hằng ngày (`#lucky-wheel`) | 5.5 / 10 | **10 / 10** | Chuyển từ "Quay miễn phí vô điều kiện" sang **"Vé Quay Xanh gắn với Hành động Môi trường (Action-Gated Spin)"**; sửa ô "Chúc may mắn lần sau" (`points = 0`); cộng đủ `lifetime_points`. |
| **CN 36** | Hiệu ứng thăng cấp & Cột mốc (`#milestone`) | 7.0 / 10 | **10 / 10** | Tự động kích hoạt Popup Confetti khi thực sự thăng cấp; chống spam nút Thả tim (`1 user = 1 tim/bài`); tích hợp Chứng nhận Công dân Xanh điện tử (Digital Eco-Certificate). |

---

## 2. KẾ HOẠCH CHI TIẾT TỪNG CHỨC NĂNG (CN 25 → CN 36)

---

### CN 25 — Thử thách xanh trong tuần (Nhiệm vụ nhỏ nhận điểm thưởng)
- **URL**: `http://localhost:5173/#challenges`
- **Files liên quan**:
  - Backend: `backend/app/services/challenge_service.py`
  - Frontend: `frontend/src/features/challenges/WeeklyChallengesContainer.tsx`

#### 25.1. Vấn đề hiện tại làm giảm điểm (8.0/10)
1. **Lỗi cộng trùng thưởng Combo (`+100 điểm`)**: Tại `challenge_service.py` (dòng 196 & 367), điều kiện `already_completed_count + 1 >= total_active` không kiểm tra xem trong tuần đó (`current_week`) người dùng đã được nhận giao dịch `COMBO_CHALLENGE_REWARD` hay chưa. Nếu Admin thêm thử thách mới giữa tuần, người dùng hoàn thành sẽ được cộng +100 điểm lần thứ 2.
2. **Lỗ hổng Farm điểm bằng ảnh trùng lặp / ảnh giả khi bật `is_auto_verify = True`**: Form tạo mới đang để mặc định `formAutoVerify = true` và không kiểm tra mã băm (`SHA-256`) của ảnh tải lên, dẫn tới người dùng có thể nộp cùng 1 bức ảnh cho tất cả các thử thách để nhận điểm ngay lập tức.
3. **Lưu Base64 nguyên khối không nén**: Ảnh 5MB chuyển sang Base64 dài ~6.7 triệu ký tự lưu thẳng vào cột `TEXT` làm chậm truy vấn danh sách.

#### 25.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Backend (`backend/app/services/challenge_service.py`)**:
   - **Chống trùng thưởng Combo tuần**: Viết hàm phụ `_has_received_weekly_combo(db, user_id, current_week)` kiểm tra bảng `reward_transactions` xem đã có bản ghi nào với `transaction_type == "COMBO_CHALLENGE_REWARD"` và `description` chứa mã tuần `current_week` (ví dụ `[2026-W43]`) chưa. Chỉ cộng +100 điểm và `lifetime_points` nếu chưa nhận.
   - **Chống nộp lại cùng 1 bức ảnh (Duplicate Image Hash Detection)**: Khi nhận `evidence_image_url`, tính `image_hash = hashlib.sha256(evidence_image_url.encode()).hexdigest()`. Kiểm tra nếu user đã từng nộp ảnh có cùng nội dung cho thử thách khác thì từ chối ngay với mã lỗi `CHL_DUPLICATE_EVIDENCE` (*"Ảnh minh chứng này đã được sử dụng cho một nhiệm vụ khác. Vui lòng chụp ảnh thực tế mới!"*).
   - **Cập nhật đồng bộ `lifetime_points`**: Đảm bảo cả khi `submit_challenge` (auto-verify) và `admin_review_submission` (admin approve) đều cộng đồng thời `user.green_points` và `user.lifetime_points`.
2. **Frontend (`frontend/src/features/challenges/WeeklyChallengesContainer.tsx`)**:
   - Đổi giá trị mặc định `formAutoVerify` từ `true` sang `false` (ưu tiên chế độ **"Cần cán bộ hậu kiểm"** để đảm bảo tính nghiêm túc của hệ thống công).
   - **Nén ảnh Client-side bằng `<canvas>` trước khi gửi**: Khi người dùng chọn file ảnh, tự động resize chiều rộng tối đa về `1024px` với chất lượng `JPEG 0.75` giúp giảm dung lượng chuỗi Base64 từ `5MB` xuống còn `~80KB` (tăng tốc độ tải trang gấp 50 lần và không làm phình Database).
   - Hiển thị **Huy hiệu "Đã nhận thưởng Combo Tuần (+100đ)"** trên thanh tiến độ khi hoàn thành 100%.

---

### CN 26 — Nhật ký kiểm toán Audit Log: Ghi lại thao tác quan trọng
- **URL**: `http://localhost:5173/#audit-logs`
- **Files liên quan**:
  - Backend: `backend/app/services/audit_service.py`, `backend/app/api/v1/endpoints/audit_logs.py`
  - Frontend: `frontend/src/features/audit_logs/AuditLogContainer.tsx`

#### 26.1. Vấn đề hiện tại làm giảm điểm (9.5/10)
1. **Mất dấu Audit Log ở các phân hệ liên quan**: Trong `reward_service.py` (dòng 1578) và `leaderboard_service.py` (dòng 242), lệnh tạo `AuditLog` dùng sai tên trường (`actor_user_id`, `target_table`, `target_id` thay vì `user_id`, `table_name`, `record_id`) nên không ghi được log khi đối soát Voucher hoặc tạo Nhóm xanh.
2. **IP Address gán cứng `127.0.0.1`**: Nhiều nơi gọi `AuditLog` ghi cứng `"127.0.0.1"` thay vì lấy IP thật hoặc hiển thị thông tin thiết bị (`User-Agent`).
3. **Hash `SHA-256` chưa có móc xích bản ghi trước (`prev_hash`)**: Hiện chỉ băm độc lập từng dòng lúc đọc.

#### 26.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Backend (`backend/app/services/audit_service.py`)**:
   - **Chuẩn hóa hàm Helper dùng chung `AuditService.record_event(...)`**: Tạo một classmethod thống nhất:
     ```python
     @classmethod
     def record_event(cls, db: Session, user_id: Optional[int], action: str, table_name: str, record_id: str, old_values: Optional[dict] = None, new_values: Optional[dict] = None, ip_address: str = "127.0.0.1"):
     ```
     Gọi hàm này tại tất cả 12 chức năng (Duyệt thử thách CN 25, Sửa cẩm nang CN 27, Đổi quà & CRUD quà CN 30, Đối soát voucher CN 31, Chốt giải BXH CN 32, Quét QR CN 34, Quay thưởng CN 35).
   - **Nâng cấp `compute_log_integrity_hash` thành Chuỗi băm Móc xích (Chained Audit Hash)**: Khi tính mã băm của bản ghi `ID = N`, kết hợp thêm `id` và `created_at` của bản ghi liền trước (`ID = N - 1`) để tạo thành chuỗi liên kết kiểu Blockchain (`prev_block_hash` + `current_block_hash`), hiển thị cả 2 mã này trong Modal Chi tiết Kiểm toán.
2. **Frontend (`frontend/src/features/audit_logs/AuditLogContainer.tsx`)**:
   - Trong Modal chi tiết bản ghi, hiển thị khối **"Chứng thực Chuỗi băm Bất biến (Cryptographic Chain Verification)"** gồm: `Previous Block Hash`, `Current Payload SHA-256`, và trạng thái `VERIFIED IMMUTABLE`.
   - Thêm nút lọc nhanh **"Tất cả nghiệp vụ Điểm thưởng & Voucher"** để khi bảo vệ đồ án, giảng viên vừa thao tác ở CN 25/30/31/32 xong bấm sang CN 26 là thấy ngay dòng log vừa sinh ra ở đầu bảng!

---

### CN 27 — Thư viện sống xanh: Cẩm nang phân loại rác
- **URL**: `http://localhost:5173/#handbook`
- **Files liên quan**:
  - Backend: `backend/app/services/waste_handbook_service.py`
  - Frontend: `frontend/src/features/waste_handbook/WasteHandbookContainer.tsx`

#### 27.1. Vấn đề hiện tại làm giảm điểm (9.0/10)
1. Mới dừng ở tra cứu thụ động (đọc chữ), chưa có tính tương tác hai chiều với hệ thống Điểm thưởng (CN 28/29).
2. Khi người dân bấm *"📍 Tìm điểm thu gom trên Bản đồ"*, nếu người dân chưa biết vật phẩm đó có được tích điểm QR (CN 34) hay không thì thiếu sự dẫn dắt sang CN 34.

#### 27.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Bổ sung tính năng "Trắc nghiệm nhanh 30 giây: Phân loại đúng - Nhận Điểm Xanh (+10đ/ngày)" ngay trên Cẩm nang**:
   - Thêm một thẻ tương tác nhỏ trên đầu trang Cẩm nang: Hiển thị ngẫu nhiên 1 vật phẩm trong Cẩm nang (VD: *"Vỏ hộp sữa giấy Tetra Pak thuộc nhóm rác nào?"*).
   - Người dân chọn 1 trong 4 thùng rác (Hữu cơ / Tái chế / Nguy hại / Rác khác). Nếu trả lời đúng -> Gọi API `claim_points` (`action_type: "ECO_REACTION"`) cộng ngay `+2 đến +5 điểm` vào Ví điểm (CN 29) và giải thích lý do tại sao (VD: *"Vỏ hộp sữa có lớp màng nhôm và nhựa nên cần súc sạch, làm dẹp và bỏ vào thùng Tái chế"*).
2. **Liên kết kép sang cả Bản đồ WebGIS và Quét QR (CN 34)**:
   - Trong Modal chi tiết vật phẩm (đặc biệt nhóm `RECYCLABLE` và `HAZARDOUS`), bên cạnh nút `📍 Tìm điểm thu gom trên Bản đồ`, thêm nút `📷 Quét QR tích điểm tại Trạm Thu Gom (#qr-scan)` để nối mạch nghiệp vụ trực tiếp từ CN 27 sang CN 34.

---

### CN 28 — Cơ chế tích lũy điểm thưởng Công dân Xanh
- **URL**: `http://localhost:5173/#policy`
- **Files liên quan**:
  - Backend: `backend/app/services/reward_service.py`
  - Frontend: `frontend/src/features/rewards/RewardsContainer.tsx`

#### 28.1. Vấn đề hiện tại làm giảm điểm (7.5/10)
1. **Lỗi logic nghiêm trọng nhất**: Hàm `calculate_tier_details` đang được gọi với tham số `user.green_points` (số dư hiện tại) ở dòng 240 và 498 của `reward_service.py`. Khi công dân đổi quà bị trừ `green_points`, họ bị **tụt hạng danh hiệu** (VD: từ Vàng rớt xuống Bạc).
2. Quyền lợi giảm giá đổi quà theo Hạng (Hạng Vàng giảm 10%, Kim Cương giảm 15%) mới chỉ ghi trên chữ ở bảng chính sách chứ chưa được tính toán thực tế khi đổi quà.

#### 28.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Backend (`backend/app/services/reward_service.py`)**:
   - **Tách bạch hoàn toàn `green_points` (Số dư chi tiêu) và `lifetime_points` (Điểm xét Hạng trọn đời)**:
     Tại dòng 240 và 498 của `reward_service.py`, sửa thành:
     ```python
     qualifying_points = max(int(user.lifetime_points or 0), int(user.green_points or 0))
     tier_info = cls.calculate_tier_details(qualifying_points)
     ```
   - **Áp dụng Chiết khấu Đặc quyền Hạng hội viên (Tier Discount Multiplier)**:
     Định nghĩa tỷ lệ giảm giá điểm khi đổi quà theo hạng:
     - `BRONZE` (Hạng Đồng): Giảm `0%`
     - `SILVER` (Hạng Bạc): Giảm `5%` số điểm cần đổi
     - `GOLD` (Hạng Vàng): Giảm `10%` số điểm cần đổi
     - `DIAMOND` (Hạng Kim Cương): Giảm `15%` số điểm cần đổi
2. **Frontend (`frontend/src/features/rewards/RewardsContainer.tsx`)**:
   - Trên thẻ Tiến độ Hạng hiện tại ở đầu trang, hiển thị rõ 2 con số:
     - **Điểm xét hạng tích lũy (`lifetime_points`)**: Dùng để tính thanh tiến độ lên cấp (Cam kết: *"Đổi quà không làm giảm điểm xét hạng"*).
     - **Số dư khả dụng (`green_points`)**: Dùng để đổi quà trong Cửa hàng.
   - Hiển thị bộ đếm **"Hạn mức tích điểm hôm nay của bạn (Daily Cap Tracker)"** ngay trên bảng quy tắc (VD: `Báo cáo sự cố: Đã nhận 2/5 lần hôm nay`) để người dân theo dõi trực quan.

---

### CN 29 — Ví điểm và lịch sử biến động điểm xanh
- **URL**: `http://localhost:5173/#wallet`
- **Files liên quan**:
  - Backend: `backend/app/services/reward_service.py`
  - Frontend: `frontend/src/features/rewards/RewardsContainer.tsx`

#### 29.1. Vấn đề hiện tại làm giảm điểm (8.5/10)
1. Hàm `seed_initial_demo_transactions` tự động bơm ngầm 1.450 điểm cho mọi user mới có 0 giao dịch, gây thiếu minh bạch nếu Hội đồng tạo tài khoản trắng để kiểm thử từ 0 điểm.
2. Chưa có tính năng xuất sao kê lịch sử giao dịch cá nhân và biểu đồ biến động dòng điểm.

#### 29.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Kiểm soát dữ liệu Seed mẫu minh bạch**:
   - Chỉ tự động chạy `seed_initial_demo_transactions` cho các tài khoản Demo mặc định (`citizen@greenspot.vn`, `admin@greenspot.vn`). Với tài khoản đăng ký mới hoàn toàn, khởi tạo đúng `0 điểm` để kiểm thử trung thực; đồng thời cung cấp một nút nhỏ **"⚡ Nạp dữ liệu mẫu thử nghiệm (Demo Seed)"** nếu người chấm bài muốn có sẵn dữ liệu để test nhanh.
2. **Bổ sung Nút "📥 Xuất Sao kê Ví Điểm (CSV)" & Mã kiểm chứng giao dịch**:
   - Cho phép công dân tải file sao kê `.csv` chứa toàn bộ lịch sử `Mã GD (#TX-...)`, `Thời gian`, `Loại giao dịch`, `Số điểm (+/-)`, `Số dư cuối kỳ (balance_after)`.
   - Trong Modal Chứng từ đối soát điện tử, bổ sung mã băm xác thực giao dịch (`Transaction Checksum`) để đồng bộ tiêu chuẩn bảo mật với CN 26.

---

### CN 30 — Quản trị CRUD danh mục quà tặng xanh và kho voucher
- **URL**: `http://localhost:5173/#catalog`
- **Files liên quan**:
  - Backend: `backend/app/services/reward_service.py`
  - Frontend: `frontend/src/features/rewards/RewardsContainer.tsx`

#### 30.1. Vấn đề hiện tại làm giảm điểm (8.5/10)
1. Chưa có khóa dòng (`SELECT ... FOR UPDATE`) trong `redeem_reward`, có nguy cơ Race Condition khi bấm đổi quà liên tục.
2. Chưa áp dụng mức giảm giá điểm theo Hạng hội viên đã nêu ở CN 28.
3. Chưa làm nổi bật mô hình **Quỹ tài trợ CSR/ESG Doanh nghiệp** trên từng thẻ quà tặng (để giải bài toán "tiền ngân sách ở đâu ra").

#### 30.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Backend (`backend/app/services/reward_service.py` - hàm `redeem_reward`)**:
   - Sử dụng khóa bi quan cấp dòng (Pessimistic Row-Level Locking):
     ```python
     user = db.query(User).filter(User.id == user_id).with_for_update().first()
     reward = db.query(Reward).filter(Reward.id == reward_id).with_for_update().first()
     ```
   - Tính toán chi phí thực tế sau khi áp dụng ưu đãi Hạng hội viên:
     ```python
     discount_rate = {"BRONZE": 0.0, "SILVER": 0.05, "GOLD": 0.10, "DIAMOND": 0.15}.get(tier_info["tier_code"], 0.0)
     final_cost = max(1, int(round(reward.points_required * (1.0 - discount_rate))))
     ```
   - Ghi nhận vào `RewardTransaction.description` rõ ràng: `"Đổi quà: Voucher Co.opmart 50K (Giá gốc 250đ, Ưu đãi Hạng Vàng -10% còn 225đ)"`.
   - Ghi bản ghi `AuditLog` khi công dân đổi quà và khi Admin thêm/sửa/xóa kho quà.
2. **Frontend (`frontend/src/features/rewards/RewardsContainer.tsx`)**:
   - Trên mỗi thẻ quà tặng ở Cửa hàng, nếu công dân đang ở Hạng Bạc/Vàng/Kim Cương, hiển thị **Giá gốc gạch ngang** (VD: `~250 điểm~`) và **Giá ưu đãi theo hạng của bạn** (`225 điểm - Tiết kiệm 10% Hạng Vàng`).
   - Hiển thị nhãn **"Quỹ tài trợ ESG: [Tên Đối tác]"** để khẳng định tính khả thi kinh tế thực tiễn của dự án.

---

### CN 31 — Quản lý danh sách quà tặng cá nhân đã đổi
- **URL**: `http://localhost:5173/#vouchers`
- **Files liên quan**:
  - Backend: `backend/app/services/reward_service.py`
  - Frontend: `frontend/src/features/rewards/RewardsContainer.tsx`

#### 31.1. Vấn đề hiện tại làm giảm điểm (8.5/10)
1. Trong `verify_voucher` (`reward_service.py` dòng 1578), lệnh tạo `AuditLog` truyền sai tên cột nên bị lỗi ngầm không ghi được vào Nhật ký kiểm toán (CN 26).
2. Nút "Đánh dấu đã sử dụng" phía công dân chỉ hỏi `window.confirm` đơn giản, ngoài thực tế dễ khiến người dân tự bấm mất hiệu lực voucher trước khi tới quầy thu ngân.

#### 31.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Backend (`backend/app/services/reward_service.py` dòng 1578)**:
   - Sửa lại đúng cấu trúc bảng `AuditLog`:
     ```python
     audit = AuditLog(
         user_id=verifier_user_id,
         action="VERIFY_VOUCHER",
         table_name="user_vouchers",
         record_id=str(voucher.id),
         old_values={"status": "ACTIVE", "code": voucher.voucher_code},
         new_values={"status": "USED", "used_at": now.isoformat(), "verified_by": verifier_user_id},
         ip_address="127.0.0.1",
     )
     db.add(audit)
     ```
2. **Frontend (`frontend/src/features/rewards/RewardsContainer.tsx`)**:
   - Thay nút "Đánh dấu đã sử dụng" đơn giản bằng cơ chế **"Xác nhận tại Quầy Đối tác (POS Confirmation)"**: Khi bấm vào, hiển thị hộp thoại nhắc rõ *"⚠️ Lưu ý: Chỉ xác nhận khi nhân viên thu ngân tại quầy yêu cầu. Nhập mã quầy (mặc định Demo: 2026) hoặc đưa mã QR trên cho Thu ngân quét"*. Điều này vừa bảo vệ quyền lợi người dùng thực tế, vừa dễ dàng thao tác khi Demo.

---

### CN 32 — Bảng xếp hạng vinh danh Top Công dân Xanh (Cá nhân, Nhóm, Quận)
- **URL**: `http://localhost:5173/#leaderboard`
- **Files liên quan**:
  - Backend: `backend/app/services/leaderboard_service.py`
  - Frontend: `frontend/src/features/leaderboard/LeaderboardContainer.tsx`

#### 32.1. Vấn đề hiện tại làm giảm điểm (7.5/10)
1. **Xếp hạng Cá nhân theo `User.green_points` (số dư hiện tại)**: Ai đem điểm đi đổi quà sẽ bị tụt hạng.
2. **Ẩn mất bộ lọc Chu kỳ (`Tuần này / Tháng này / Tất cả`) ở tab Cá nhân**, trong khi ở tab Nhóm và Quận thì bật bộ lọc nhưng câu truy vấn SQL ở Backend không thay đổi theo `cycle`.
3. **Lỗi Crash 500 ở `admin_take_snapshot` (dòng 365)** do truyền sai tên cột vào `RewardTransaction` và lỗi nuốt `AuditLog` ở `create_community_group` (dòng 242).

#### 32.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Backend (`backend/app/services/leaderboard_service.py`)**:
   - **Nâng cấp `get_individual_leaderboard(db, current_user_id, district, cycle, limit)`**:
     - Khi `cycle == "ALL"`: Xếp hạng theo `func.greatest(User.lifetime_points, User.green_points)` (Tổng điểm cống hiến tích lũy, không bị giảm khi đổi quà!).
     - Khi `cycle == "WEEK"` hoặc `cycle == "MONTH"`: Tính tổng điểm dương kiếm được (`SUM(RewardTransaction.points_amount)` với `points_amount > 0`) trong 7 ngày hoặc 30 ngày gần nhất kết hợp điểm cống hiến cơ sở để bảng xếp hạng phản ánh đúng phong độ thi đua theo Tuần/Tháng.
   - **Làm cho bộ lọc `cycle` (`WEEK` / `MONTH` / `ALL`) ở tab Nhóm và Quận hoạt động thực chất**: Tính toán hệ số biến động hoặc lọc theo chu kỳ để khi bấm chuyển giữa `Tuần này` / `Tháng này` / `Tất cả`, thứ hạng và số liệu phản hồi thay đổi hợp lý.
   - **Sửa lỗi `admin_take_snapshot` (dòng 365)**:
     ```python
     tx = RewardTransaction(
         user_id=u.id,
         points_amount=bonus,
         balance_after=new_balance,
         transaction_type="LEADERBOARD_REWARD",
         reference_id=f"SNAP_{cycle}_{idx+1}",
         description=f"Thưởng Vinh danh Top {idx + 1} Bảng xếp hạng Công dân Xanh ({cycle})",
     )
     ```
     Đồng thời cộng `u.lifetime_points = (u.lifetime_points or 0) + bonus` và ghi `AuditLog` chuẩn xác.
2. **Frontend (`frontend/src/features/leaderboard/LeaderboardContainer.tsx`)**:
   - **Mở khóa bộ lọc `Tuần này | Tháng này | Tất cả` cho cả 3 tab** (Cá nhân, Nhóm, Quận/Huyện) bằng cách bỏ điều kiện `activeTab !== "INDIVIDUAL"` ở dòng 156.
   - Hiển thị chú thích rõ dưới tiêu đề Bảng xếp hạng: *"📌 Xếp hạng dựa trên Tổng điểm Cống hiến Xanh tích lũy (Việc đổi quà trong Cửa hàng không làm giảm điểm xếp hạng của bạn)"*.

---

### CN 33 — Bản đồ nhiệt môi trường & khí hậu đa chế độ (AQI, Nhiệt độ, Rủi ro)
- **URL**: `http://localhost:5173/#heatmap`
- **Files liên quan**:
  - Backend: `backend/app/services/heatmap_service.py`
  - Frontend: `frontend/src/features/heatmap/MultiModeHeatmapContainer.tsx`

#### 33.1. Vấn đề hiện tại làm giảm điểm (6.5/10)
1. Giao diện hiện tại chỉ là một thẻ `<svg>` hình chữ nhật màu đen kẻ ô vuông với 22 hình tròn `<circle>` tĩnh, **không có bản đồ nền địa lý TP.HCM**, không phóng to/thu nhỏ (Zoom/Pan) được, không thấy sông Sài Gòn hay ranh giới quận/huyện.
2. Chưa có nút hành động kết nối từ vùng đỏ (ô nhiễm/rủi ro cao) sang việc phát động Thử thách tuần (CN 25) hoặc xem Bản đồ sự cố.

#### 33.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Frontend (`frontend/src/features/heatmap/MultiModeHeatmapContainer.tsx`) — Nâng cấp lên Bản đồ WebGIS Leaflet thực thụ**:
   - Sử dụng `MapContainer`, `TileLayer`, `Circle`, `CircleMarker`, `Tooltip` từ `react-leaflet` (thư viện đã cài sẵn trong `package.json` của dự án).
   - Đặt tâm bản đồ tại TP.HCM (`[10.7769, 106.7009]`, `zoom={11}`).
   - Với mỗi Quận/Huyện trong 22 Quận/Huyện (đã có tọa độ `latitude`, `longitude` chính xác trong `heatmap_service.py`):
     - Vẽ **Vùng lan tỏa nhiệt (`<Circle radius={2200} />`)** có độ mờ phân lớp (`fillOpacity: 0.35`) tạo hiệu ứng bức xạ nhiệt phủ lên đúng vị trí địa lý thực tế của Quận đó trên bản đồ TP.HCM!
     - Vẽ **Tâm trạm quan trắc (`<CircleMarker />`)** hiển thị nhãn tên Quận và chỉ số (`AQI` / `°C` / `Risk Score`) trực tiếp trên bản đồ.
   - Cung cấp nút chuyển đổi chế độ hiển thị: **`🗺️ Bản đồ WebGIS Thực tế (Leaflet)`** và **`🕸️ Lược đồ Ma trận Tọa độ (Radar Grid)`** để giữ lại cả giao diện SVG cũ như một chế độ xem phụ!
   - Đồng bộ tông màu giao diện sang chuẩn **Clean Light/Hybrid Card** của toàn hệ thống (tuân thủ quy tắc *Page Theme Lock* của `design-taste-frontend`).
2. **Liên kết nghiệp vụ trong Popup Chi tiết Quận**:
   - Khi bấm vào một Quận có chỉ số Rủi ro cao hoặc AQI xấu, bổ sung nút **`🎯 Tham gia Thử thách Xanh tại khu vực này (#challenges)`** và **`📊 Xem Bảng xếp hạng Thi đua Quận (#leaderboard)`**.

---

### CN 34 — Quét mã QR nhận điểm (Hỗ trợ Camera trực tiếp / Tải ảnh QR)
- **URL**: `http://localhost:5173/#qr-scan`
- **Files liên quan**:
  - Backend: `backend/app/services/qr_scan_service.py`
  - Frontend: `frontend/src/features/qr_scan/QRScanContainer.tsx`

#### 34.1. Vấn đề hiện tại làm giảm điểm (6.0/10)
1. **Lỗ hổng nghiệp vụ lớn nhất**: Mã QR tĩnh (`ECO-BIN-101`) kết hợp với việc cho phép tải ảnh từ máy / nhập mã text và tọa độ GPS fallback (`10.7769, 106.7009`) trùng khít với tọa độ trạm `ECO-BIN-101` khiến người dùng có thể nhận điểm mỗi ngày mà không cần bỏ rác hay đến trạm thật.
2. Quên cộng `user.lifetime_points` khi quét QR thành công (`qr_scan_service.py` dòng 89).

#### 34.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Nâng cấp Mô hình Nghiệp vụ Thực tế: "Xác thực 2 lớp tại Trạm Thu Gom (QR Trạm + Khai báo Khối lượng / Mã Phiên IoT)"**:
   - **Lớp 1 (Định danh Trạm & Vị trí Haversine 50m)**: Quét mã QR trạm thu gom (`ECO-BIN-101`, `RECYCLE-STATION-Q3`...).
   - **Lớp 2 (Chứng thực Hành vi Bỏ rác tái chế / IoT Session Token)**:
     - Bổ sung chọn **Loại rác tái chế bàn giao** (`Chai nhựa PET`, `Vỏ lon nhôm`, `Pin cũ nguy hại`, `Vỏ hộp sữa giấy`) và **Số lượng / Khối lượng ước tính** (VD: `5 vỏ chai` hoặc `10 viên pin`).
     - Hỗ trợ mã động có chữ ký thời gian (Dynamic Session Code, ví dụ `ECO-BIN-101#OTP-8492`) được sinh tự động bởi bộ mô phỏng Màn hình Thùng rác Thông minh IoT ngay trên giao diện Demo!
   - **Ý nghĩa khi Bảo vệ Đồ án**: Bạn vừa giữ được sự tiện lợi khi Demo (bấm 1 nút mô phỏng Màn hình LCD của Thùng rác IoT sinh mã QR động một lần để Camera quét hoặc chọn nhanh), vừa chứng minh cho Hội đồng thấy hệ thống **chống triệt để việc chụp ảnh mã QR dán trên thùng rác đem về nhà quét lại**!
2. **Backend (`backend/app/services/qr_scan_service.py`)**:
   - Chấp nhận cả mã gốc (ở chế độ Demo Simulation) lẫn mã động `STATION_CODE|SESSION_TOKEN`, đồng thời lưu chi tiết loại vật phẩm tái chế vào `RewardTransaction.description`.
   - Cộng đầy đủ `user.lifetime_points = (user.lifetime_points or 0) + points_awarded`.
   - Ghi bản ghi `AuditLog` (`action="QR_CHECKIN_REWARD"`).

---

### CN 35 — Vòng quay may mắn hằng ngày (Mỗi ngày 1 lượt quay trúng điểm/huy hiệu)
- **URL**: `http://localhost:5173/#lucky-wheel`
- **Files liên quan**:
  - Backend: `backend/app/services/lucky_wheel_service.py`
  - Frontend: `frontend/src/features/lucky_wheel/LuckyWheelContainer.tsx`

#### 35.1. Vấn đề hiện tại làm giảm điểm (5.5/10)
1. Phát điểm thưởng và Voucher siêu thị mỗi ngày chỉ nhờ đăng nhập bấm quay mà không gắn với bất kỳ đóng góp môi trường nào -> Gây lạm phát Điểm Xanh.
2. Ô số 7 mang tên `"Chúc may mắn lần sau"` nhưng lại cấu hình `points: 2` (vẫn cộng 2 điểm và tạo giao dịch ví).
3. Quên cộng `user.lifetime_points` khi quay trúng điểm (`lucky_wheel_service.py` dòng 123).

#### 35.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Chuyển đổi Mô hình Nghiệp vụ sang "Vòng Quay Tri Ân Hành Động Xanh (Eco-Action Gated Lucky Wheel)"**:
   - **Quy tắc thực tiễn**: Mỗi ngày công dân nhận được **1 Vé Quay Xanh (`Green Spin Ticket`)** khi tài khoản đã có đóng góp môi trường (hoặc đang duy trì chuỗi Sống Xanh / hoàn thành nhiệm vụ).
   - Trong `get_wheel_status`, kiểm tra xem hôm nay (hoặc trong lịch sử hoạt động của công dân) đã có hành động xanh nào chưa (`has_eco_action_qualified`), hiển thị trạng thái **"🎟️ Điều kiện nhận vé quay hôm nay: Đã kích hoạt nhờ đóng góp Sống Xanh"** (kèm chế độ mở sẵn 1 vé/ngày cho tài khoản Demo để giảng viên vào là bấm quay thử được ngay!).
2. **Backend (`backend/app/services/lucky_wheel_service.py`)**:
   - Đổi ô số 7 (`index: 6`) từ `"Chúc may mắn lần sau" (points: 2)` thành **`"Quà Khích Lệ Xanh (+2đ)" (points: 2)`** hoặc giữ `"Chúc may mắn lần sau"` với `points: 0` để tên ô và số điểm cộng hoàn toàn khớp nhau 100%. (Đổi nhãn thành `"Lộc Xanh Khích Lệ +2đ"` vừa không làm người dùng hụt hẫng, vừa hợp lý hóa việc cộng 2 điểm!).
   - Bổ sung cộng `user.lifetime_points = (user.lifetime_points or 0) + points_won` ở dòng 123.

---

### CN 36 — Hiệu ứng thăng cấp danh hiệu & Cột mốc Công dân Xanh
- **URL**: `http://localhost:5173/#milestone`
- **Files liên quan**:
  - Backend: `backend/app/services/milestone_service.py`
  - Frontend: `frontend/src/features/milestone/MilestoneContainer.tsx`

#### 36.1. Vấn đề hiện tại làm giảm điểm (7.0/10)
1. Đang tính tiến độ cấp bậc dựa trên `user.green_points` (ở `milestone_service.py` dòng 71) thay vì `lifetime_points`.
2. Nút thả tim (`like_milestone_post` dòng 191) cho phép 1 người bấm tăng tim vô hạn lần.
3. Chưa có **Giấy chứng nhận Công dân Xanh điện tử (Digital Eco-Certificate)** mang tên người dùng để tải về/in ra.

#### 36.2. Giải pháp cải thiện chi tiết để đạt 10/10
1. **Backend (`backend/app/services/milestone_service.py`)**:
   - Tại dòng 71 (`get_user_milestone_overview`), sửa `points = int(user.green_points or 0)` thành `points = max(int(user.lifetime_points or 0), int(user.green_points or 0))` để đồng bộ tuyệt đối với CN 28 và CN 32.
   - Chống spam nút Thả tim: Kiểm tra trạng thái đã thả tim theo phiên người dùng hoặc giới hạn mỗi lần tương tác hợp lệ.
2. **Frontend (`frontend/src/features/milestone/MilestoneContainer.tsx`)**:
   - **Bổ sung Thẻ "Chứng nhận Công dân Xanh Điện tử (Digital Eco-Certificate)"**: Hiển thị mẫu Bằng chứng nhận trang trọng của Hệ thống GreenSpot TP.HCM ghi rõ: `Họ tên Công dân`, `Danh hiệu đạt được (VD: Chiến Binh Xanh - Hạng Vàng)`, `Tổng điểm cống hiến trọn đời`, `Mã chứng nhận (#CERT-GS-2026-XXXX)` và nút **`🖨️ Xuất / In Chứng Nhận (PDF)`**. Đây là tính năng cực kỳ thực tế vì sinh viên và tình nguyện viên rất cần Giấy chứng nhận hoạt động xã hội để xét Điểm rèn luyện / Sinh viên 5 Tốt!
   - Đổi tên nút `🎉 Chúc mừng` thành **`✨ Xem lại Hiệu ứng Thăng cấp`** để rõ nghĩa hơn khi trình diễn.

---

## 3. KẾ HOẠCH NÂNG CẤP KIẾN TRÚC UI/UX TOÀN CỤC (`design-taste-frontend`)

Để toàn bộ ứng dụng thoát khỏi cảm giác "nhiều trang ghép rời rạc" và đạt chuẩn thẩm mỹ 10/10:

### 3.1. Tinh gọn Thanh điều hướng chính (`frontend/src/App.tsx`)
- **Hiện trạng**: Thanh `view-mode-switcher` đang dàn hàng ngang 16 nút khiến giao diện trên màn hình Laptop 13–14 inch bị tràn hoặc xuống dòng rối mắt.
- **Giải pháp**:
  - Giữ nguyên100% các đường dẫn Hash URL (`#challenges`, `#audit-logs`, `#handbook`, `#policy`, `#wallet`, `#catalog`, `#vouchers`, `#leaderboard`, `#heatmap`, `#qr-scan`, `#lucky-wheel`, `#milestone`) để mọi link trong báo cáo của bạn hoạt động chính xác tuyệt đối.
  - Bổ sung một **Thanh Điều hướng Nhanh Phân hệ (Quick Jump Sub-bar / Pill Bar)** hoặc làm gọn khoảng cách padding/font-size trên Header để tất cả các mục hiển thị thanh thoát, sắc nét, đồng thời tô sáng (active state) đúng cụm chức năng đang mở.

### 3.2. Tuân thủ Quy tắc Khóa Giao diện (Page Theme Lock)
- Đồng bộ hóa nền của `MultiModeHeatmapContainer.tsx` (`#heatmap`) từ nền đen thuần `#0b0f19` sang bố cục **Light Container (`#f8fafc`) bọc khung Bản đồ GIS chuyên nghiệp**, giúp khi người dùng chuyển từ `#leaderboard` -> `#heatmap` -> `#qr-scan` không bị hiện tượng chớp nháy trắng-đen đột ngột.

---

## 4. LỘ TRÌNH THỰC THI 4 GIAI ĐOẠN (IMPLEMENTATION ROADMAP) & CHECKLIST NGHIỆM THU

### Giai đoạn 1: Sửa triệt để 5 Lỗi Logic & Bug Ngầm Backend (Ưu tiên Số 1 — 15 phút)
- [ ] **Bước 1.1**: Sửa `reward_service.py` & `milestone_service.py` — Tính Hạng (`Tier`) theo `max(lifetime_points, green_points)` và áp dụng chiết khấu đổi quà theo Hạng (`0% / 5% / 10% / 15%`) kèm khóa dòng `with_for_update()`.
- [ ] **Bước 1.2**: Sửa `leaderboard_service.py` — Sửa lỗi Crash `RewardTransaction` trong `admin_take_snapshot`, sửa lỗi `AuditLog` trong `create_community_group`, và nâng cấp xếp hạng Cá nhân/Nhóm/Quận theo chu kỳ `WEEK / MONTH / ALL`.
- [ ] **Bước 1.3**: Sửa `reward_service.py` — Sửa lỗi `AuditLog` trong `verify_voucher` để mọi thao tác đối soát voucher đều hiện lên trong Nhật ký kiểm toán (CN 26).
- [ ] **Bước 1.4**: Sửa `qr_scan_service.py` & `lucky_wheel_service.py` — Cộng đầy đủ `user.lifetime_points`, đổi tên ô số 7 Vòng quay thành `"Lộc Xanh Khích Lệ +2đ"`, ghi `AuditLog`.
- [ ] **Bước 1.5**: Sửa `challenge_service.py` — Chống cộng trùng thưởng Combo `+100đ` trong cùng 1 tuần và chống nộp trùng 1 bức ảnh minh chứng (`SHA-256` image hash check).

### Giai đoạn 2: Nâng cấp Đột phá Bản đồ nhiệt GIS Thực tế (CN 33 — 15 phút)
- [ ] **Bước 2.1**: Tích hợp `react-leaflet` (`MapContainer`, `TileLayer`, `Circle`, `CircleMarker`) vào `MultiModeHeatmapContainer.tsx` hiển thị trực tiếp 22 Quận/Huyện trên bản đồ địa lý TP.HCM thật, có nút chuyển đổi qua lại giữa `🗺️ Bản đồ GIS` và `🕸️ Lược đồ Ma trận`.
- [ ] **Bước 2.2**: Đồng bộ Theme sáng hiện đại và thêm nút điều hướng từ Popup Quận sang Thử thách tuần (`#challenges`) & Bảng xếp hạng (`#leaderboard`).

### Giai đoạn 3: Hoàn thiện Chốt chặn Thực tiễn cho QR Scan, Lucky Wheel, Handbook & Milestone (CN 27, 34, 35, 36 — 15 phút)
- [ ] **Bước 3.1 (CN 34)**: Bổ sung chọn Loại rác tái chế + Bộ mô phỏng Mã QR Động tại trạm IoT (`Dynamic Station OTP`) và nén ảnh ở CN 25.
- [ ] **Bước 3.2 (CN 35)**: Hiển thị trạng thái "Vé Quay Xanh gắn với Hành động Môi trường" trên giao diện Vòng quay.
- [ ] **Bước 3.3 (CN 27)**: Bổ sung Mini-Quiz "Thử tài phân loại rác nhận điểm thưởng" và nút chuyển nhanh sang Quét QR (`#qr-scan`).
- [ ] **Bước 3.4 (CN 36)**: Bổ sung khung "Chứng nhận Công dân Xanh Điện tử (Digital Eco-Certificate)" có thể in/xuất PDF và chống spam nút thả tim.

### Giai đoạn 4: Kiểm thử Liên thông Toàn diện 12 URL (Verification — 5 phút)
- [ ] Kiểm tra `http://localhost:5173/#challenges` (Nộp ảnh nén nhanh, duyệt minh chứng, không trùng combo).
- [ ] Kiểm tra `http://localhost:5173/#audit-logs` (Hiển thị đầy đủ log từ Đổi quà, Đối soát voucher, Quét QR, Duyệt thử thách).
- [ ] Kiểm tra `http://localhost:5173/#handbook` (Tra cứu, làm Quiz nhận điểm, nhảy sang Bản đồ / QR).
- [ ] Kiểm tra `http://localhost:5173/#policy` & `#wallet` (Điểm xét hạng `lifetime_points` không giảm khi đổi quà, xuất sao kê CSV).
- [ ] Kiểm tra `http://localhost:5173/#catalog` & `#vouchers` (Hiển thị giá chiết khấu theo Hạng, đối soát POS ghi Audit Log).
- [ ] Kiểm tra `http://localhost:5173/#leaderboard` (Bộ lọc Tuần/Tháng/Tất cả hoạt động ở cả 3 tab, chốt giải Top 3 không lỗi).
- [ ] Kiểm tra `http://localhost:5173/#heatmap` (Bản đồ Leaflet TP.HCM hiển thị 22 vùng nhiệt mượt mà).
- [ ] Kiểm tra `http://localhost:5173/#qr-scan`, `#lucky-wheel`, `#milestone` (Quét QR động có chọn loại rác, quay thưởng chuẩn logic, xuất Chứng nhận Công dân Xanh).
