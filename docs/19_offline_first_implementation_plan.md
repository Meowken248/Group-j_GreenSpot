# KẾ HOẠCH TRIỂN KHAI VÀ HỢP ĐỒNG KỸ THUẬT CHỨC NĂNG 19
## Chế độ Offline-First: Lưu nháp, Hàng đợi gửi, Đồng bộ tự động khi online
**Người phụ trách:** Huỳnh Anh Tú  
**Trạng thái nhánh:** `Tu/19` (sạch sẽ 100% trước khi triển khai)  
**Thời điểm lập:** 2026-11-01  

---

## 1. MỤC TIÊU VÀ PHẠM VI NGHIỆP VỤ

### 1.1 Mục tiêu
Cho phép người dân và cán bộ môi trường sử dụng ứng dụng GreenSpot để ghi nhận, phản ánh các sự cố rác thải/ô nhiễm đa phương tiện (thuộc Chức năng 18) ngay cả khi không có kết nối Internet hoặc mạng chập chờn. Khi có mạng trở lại, ứng dụng tự động đồng bộ ngầm lên máy chủ mà không làm gián đoạn trải nghiệm người dùng, đảm bảo tính toàn vẹn dữ liệu, không tạo sự cố trùng và không cộng điểm xanh lặp.

### 1.2 Phạm vi triển khai
- **Trong phạm vi:**
  - Soạn thảo phản ánh đa phương tiện khi ngoại tuyến (ảnh, video, ghi âm giọng nói Blob, phân loại rác, toạ độ GPS).
  - Lưu trữ đa bản nháp trên thiết bị với IndexedDB, phân tách hoàn toàn theo tài khoản (`user_id`).
  - Hàng đợi gửi (Offline Outbox Queue, tối đa 20 phản ánh) theo cơ chế FIFO.
  - Tự động đồng bộ ngầm khi kết nối phục hồi hoặc khi mở lại ứng dụng.
  - Quản lý hàng đợi: xem chi tiết, gửi lại thủ công, chỉnh sửa phản ánh lỗi, xóa mục (khóa xóa khi đang gửi).
  - Khóa chống trùng lặp nguyên tử (Idempotency Key / Client Submission ID) trên cả client lẫn server trong cùng một database transaction.
  - Giao diện: Thanh trạng thái mạng toàn cục (vàng khi offline, xanh khi online tự ẩn 3s), popup kết quả đồng bộ, màn hình quản lý hàng đợi và nháp.
- **Ngoài phạm vi:**
  - Chưa đưa việc đăng bài mạng xã hội (STT 9) vào hàng đợi offline.

---

## 2. 24 TIÊU CHÍ NGHIỆM THU (R01 – R24)

| Mã | Nội dung yêu cầu | Nguồn SRS |
|:---:|------------------|:---------:|
| **R01** | Thanh thông báo màu vàng (cảnh báo mất mạng) xuất hiện trên mọi màn hình khi offline | Trang 154–155 |
| **R02** | Có mạng lại: thanh màu xanh, bắt đầu đồng bộ ngầm, tự động ẩn sau 3 giây | Trang 154–155 |
| **R03** | Soạn phản ánh bằng biểu mẫu chuẩn của chức năng 18 khi offline | Trang 154–155 |
| **R04** | Lưu nháp gồm nội dung, ảnh, video và tệp âm thanh (Blob) vào IndexedDB | Trang 155 |
| **R05** | Đóng và mở lại trình duyệt hoặc F5 vẫn khôi phục được đầy đủ dữ liệu | Trang 155 |
| **R06** | Khi offline hoặc mất bản đồ, hiển thị toạ độ chữ chính xác thay vì lỗi | Trang 155 |
| **R07** | Thiếu toạ độ GPS hợp lệ vẫn lưu nháp được, nhưng **không** được đưa vào hàng đợi | Trang 155 |
| **R08** | Kiểm tra đầy đủ dữ liệu bắt buộc trước khi xếp vào hàng đợi | Trang 155 |
| **R09** | Hàng đợi chứa tối đa 20 phản ánh; vượt quá phải cảnh báo và chặn | Trang 155 |
| **R10** | Không đủ dung lượng (quota) phải báo lỗi, giữ dữ liệu và ngăn lưu giả thành công | Trang 155 |
| **R11** | Xếp hàng thành công: thông báo, điều hướng sang màn quản lý, làm trống biểu mẫu | Trang 155 |
| **R12** | Màn hình quản lý có 2 khối riêng biệt: Hàng đợi gửi và Danh sách bản nháp | Trang 156 |
| **R13** | Gửi lần lượt từ cũ đến mới (cơ chế FIFO) | Trang 156 |
| **R14** | Tự động thử lại tối đa 3 lần với khoảng cách tăng dần (2s, 4s); hết lượt chuyển trạng thái "Lỗi" | Trang 156–157 |
| **R15** | Có nút "Gửi lại", nút "Xoá" có hộp thoại xác nhận; **không** cho xoá khi đang gửi | Trang 156–157 |
| **R16** | Bản nháp không tự động gửi; người dùng có thể bấm mở để tiếp tục chỉnh sửa | Trang 156 |
| **R17** | Hiển thị tổng số mục chờ gửi, số mục lỗi và thời điểm đồng bộ gần nhất | Trang 156 |
| **R18** | Tài khoản khác đăng nhập trên cùng thiết bị không nhìn thấy dữ liệu của nhau | Trang 156 |
| **R19** | Hết phiên đăng nhập (401): tạm dừng đồng bộ, giữ hàng đợi, đăng nhập lại thì tiếp tục | Trang 157 |
| **R20** | Popup thành công tự đóng sau 5 giây; hiển thị tối đa 3 mã sự cố và liên kết xem chi tiết | Trang 157–158 |
| **R21** | Đồng bộ một phần: giữ lại mục lỗi, thông báo số mục thành công và số mục còn lại | Trang 158 |
| **R22** | Popup thất bại có nút Thử lại hoặc Giữ hàng đợi; lỗi dữ liệu chuyển sang sửa phản ánh | Trang 158–159 |
| **R23** | Tệp hỏng và tài khoản bị khoá có thông báo và cách xử lý riêng biệt | Trang 159 |
| **R24** | Đồng bộ thành công thì tự động giải phóng dữ liệu phản ánh và tệp cục bộ khỏi hàng đợi | Trang 158 |

---

## 3. THIẾT KẾ KIẾN TRÚC & HỢP ĐỒNG KỸ THUẬT

### 3.1 Cấu trúc Cơ sở dữ liệu IndexedDB (`greenspot_offline_db`)
- **Version:** `1`
- **Object Stores:**
  1. `drafts`:
     - KeyPath: `draft_id` (string UUIDv4)
     - Index: `by_user_id` (`user_id`), `by_updated_at` (`updated_at`)
     - Cấu trúc: `{ draft_id, user_id, title, description, category_id, latitude, longitude, address, images: Blob[], video: Blob | null, audio: Blob | null, voice_transcript: string, created_at, updated_at }`
  2. `outbox_queue`:
     - KeyPath: `queue_id` (string UUIDv4)
     - Index: `by_user_id` (`user_id`), `by_status` (`status`), `by_created_at` (`created_at`)
     - Cấu trúc: `{ queue_id, client_submission_id, user_id, payload: IncidentPayload, media_blobs: { images: Blob[], video: Blob | null, audio: Blob | null }, status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED', retry_count: number, max_retries: 3, next_retry_at: number | null, last_error: string | null, incident_code: string | null, incident_id: number | null, created_at: number, updated_at: number }`
  3. `cached_categories`:
     - KeyPath: `id` (number)
     - Index: `by_active` (`is_active`)

### 3.2 State Machine của Hàng đợi gửi
```
[User Xác nhận Gửi] (Offline)
         │
         ▼
     [QUEUED] ◄────────────────────────┐ (Retry < 3)
         │                             │
         ▼ (Có mạng & FIFO)            │
     [SENDING] ─── (Lỗi mạng/5xx) ─────┘
         │
         ├─── (Thành công 201) ───────► [SENT] ──► (Giải phóng khỏi hàng đợi)
         │
         └─── (Lỗi nghiệp vụ/4xx hoặc Retry >= 3) ──► [FAILED] (Cho phép Sửa / Gửi lại thủ công / Xoá)
```

### 3.3 Hợp đồng API Backend Chống trùng (Idempotency)
- **Bảng Server:** `offline_submissions`
  - `id`: BigInteger / Integer, Primary Key, Autoincrement
  - `client_submission_id`: String(64), Unique, Not Null, Index
  - `user_id`: Integer, ForeignKey('users.id', ondelete='CASCADE'), Not Null, Index
  - `incident_id`: Integer, ForeignKey('incidents.id', ondelete='CASCADE'), Nullable
  - `status`: String(20), Default `'PROCESSED'`
  - `response_payload`: JSON / Text, Nullable
  - `created_at`: DateTime(timezone=True), Default `func.now()`
- **Cơ chế chống gửi trùng:**
  - Khi client gửi POST `/api/v1/incidents` hoặc `/api/v1/offline-sync/incidents` kèm `client_submission_id`:
  - Trong cùng 1 transaction:
    1. Kiểm tra bảng `offline_submissions` xem `client_submission_id` đã tồn tại chưa (`SELECT ... FOR UPDATE`).
    2. Nếu đã tồn tại: trả về ngay thông tin sự cố cũ (`200 OK`) kèm mã sự cố, **không** tạo mới, **không** cộng điểm lần 2.
    3. Nếu chưa tồn tại:
       - Tạo sự cố mới với mã tracking code duy nhất an toàn.
       - Ghi media và watermark.
       - Cộng điểm xanh Công dân Xanh (+50 GP).
       - Ghi bản ghi vào `offline_submissions`.
       - Commit toàn bộ một lần duy nhất.

---

## 4. MỐC KIỂM TRA HỒI QUY (BASELINE)

| Bộ kiểm tra | Kết quả ghi nhận tại thời điểm bắt đầu | Ghi chú |
|-------------|----------------------------------------|---------|
| Frontend Vitest | **47/47 files passed (100%), 437/437 tests passed** | Thời gian chạy 29.02s |
| TypeScript Check (`tsc -b`) | **PASS (0 errors)** | Không có lỗi kiểu |
| Oxlint | **237 warnings, 1 error có sẵn** | Lỗi có sẵn tại `src/features/auth/utils/validators.ts:111` (escape vô ích `\/`) |
| Backend Tests | Chặn bởi lỗi kết nối PostgreSQL (`WinError 1225`) | PostgreSQL cục bộ chưa khởi động |
| Git Worktree | Sạch sẽ 100% trên nhánh `Tu/19` | Không có file thừa hoặc unstaged changes |

---

## 5. DANH SÁCH ĐỐI TƯỢNG ĐỤNG CHẠM (MỨC A & MỨC B)

### 🔴 Mức A (Sửa — Đã được người dùng phê duyệt):
1. `backend/app/services/incident_service.py` & `backend/app/api/v1/incidents.py`: Tách giao dịch nguyên tử, sinh mã sự cố an toàn, tích hợp bảng `offline_submissions` chống trùng.
2. `frontend/src/features/reports/ReportContainer.tsx` & các bước con `Step2MediaCapture.tsx`, `Step3VoiceInput.tsx`, `Step4LocationPicker.tsx`, `Step5ReviewAndSubmit.tsx`: Lưu trữ Blob âm thanh/video/ảnh vào IndexedDB, đưa vào hàng đợi khi gửi lúc ngoại tuyến.
3. `frontend/src/App.tsx`: Tích hợp ConnectionBanner và SyncResultModal toàn cục.

### 🟡 Mức B (Phụ thuộc — Chỉ dùng/gọi, không sửa):
1. API danh mục rác: `/api/v1/waste-categories` (STT 22).
2. Auth token & user info: `greenspot_user` (STT 2).
3. Bảng `users` và `incidents` liên kết khoá ngoại (STT 2, 18).

---

## 6. QUY TẮC COMMIT & AN TOÀN
- Mỗi commit không quá 4 file liên quan.
- Sau mỗi bước phải chạy kiểm thử hồi quy (Vitest, tsc) trước khi chuyển bước.
- Tuyệt đối không xóa hay làm hỏng mã nguồn của các thành viên khác.
