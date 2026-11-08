# Chức năng 21 — Sự kiện và chiến dịch Chủ Nhật Xanh

Tài liệu căn cứ: `Báo Cáo.docx.pdf` (Trang 169 – 177).
Trạng thái: đã hoàn tất vòng sửa lỗi tuân thủ đặc tả (2026-10-25).

## 1. Phạm vi đã triển khai

| Màn | Nội dung |
| --- | --- |
| 1/4 | Danh sách sự kiện, tìm kiếm theo tên/địa chỉ, lọc 22 quận/huyện, lọc thời gian, phân trang + cuộn vô hạn |
| 2/4 | Tạo sự kiện: upload ảnh bìa thật (JPG/PNG ≤ 5MB), chọn thời gian, ghim bản đồ, mô tả vật dụng |
| 3/4 | Chi tiết sự kiện, bản đồ điểm tập trung, danh sách người tham gia, quan tâm, tham gia, chỉnh sửa, huỷ |
| 4/4 | Check-in GPS: bán kính 100m, sai số ≤ 50m, khung giờ −1h/+3h, +50 GP, giới hạn 150 GP/ngày |

Ngoài ra: màn duyệt sự kiện cho Quản trị viên (panel trong trang sự kiện và khối duyệt trong modal chi tiết).

## 2. Quy tắc nghiệp vụ chốt

- `title`: tối đa 100 ký tự, **không** áp đặt tối thiểu 5 ký tự (đúng đặc tả).
- `max_participants`: 5 – 500; không được giảm xuống dưới số người đã đăng ký.
- Thời gian bắt đầu phải sau hiện tại **≥ 24 giờ**; `end_time` phải sau `start_time`.
- Toạ độ phải nằm trong Bounding Box TP.HCM; quận/huyện tự cập nhật theo ghim bản đồ.
- Sự kiện chưa `APPROVED` chỉ người tạo và Quản trị viên xem được (API trả 404 với người khác).
- Sự kiện đã kết thúc (`end_time` hoặc `start_time + 3h`) bị chặn tham gia/quan tâm/check-in.
- Chỉnh sửa: người tạo (hoặc Admin) trước giờ bắt đầu; lưu xong quay lại `PENDING` để duyệt lại; dùng optimistic locking (`version`, xung đột trả 409).
- Huỷ: người tạo hoặc Admin; gửi thông báo in-app tới toàn bộ người tham gia; không thể huỷ sự kiện đã kết thúc.
- Check-in: mỗi người 1 lần/sự kiện; cửa sổ `[start − 1h, start + 3h]`; cộng 50 GP nhưng tối đa **150 GP/ngày**.
- Sổ cái điểm của sự kiện là bảng `event_checkins.points_awarded` (có `checkin_time` để đối soát theo ngày), không tạo thêm bảng mới.

## 3. Phân quyền

- Duyệt sự kiện dùng RBAC: `require_permission("CAMPAIGNS", "UPDATE")`.
  - ADMIN luôn được bypass theo cơ chế RBAC sẵn có.
  - Không còn kiểm tra qua email chứa chữ "admin".
- Module `CAMPAIGNS` (Chiến dịch môi trường & Điểm xanh) được tái sử dụng thay vì thêm module thứ 16, nhằm giữ nguyên ma trận 15 module/54 quyền đang được đặc tả và test RBAC.

## 4. Thông báo

Ghi vào bảng `notifications` (hiển thị qua `NotificationBell` sẵn có):

| Loại | Kích hoạt |
| --- | --- |
| `EVENT_PENDING_REVIEW` | Tạo mới / chỉnh sửa sự kiện (gửi Quản trị viên) |
| `EVENT_APPROVED`, `EVENT_REJECTED` | Quản trị viên duyệt / từ chối (gửi người tạo) |
| `EVENT_UPDATED` | Người tạo cập nhật sự kiện (gửi người tham gia) |
| `EVENT_CANCELLED` | Huỷ sự kiện (gửi người tham gia) |
| `EVENT_CHECKIN` | Check-in thành công (gửi chính người check-in) |
| `EVENT_REMINDER_1H`, `EVENT_REMINDER_24H` | Worker nhắc nhở, chống trùng bằng `(notification_type, reference_id)` |

Worker `run_event_reminder_worker()` chạy trong lifespan FastAPI, chu kỳ 5 phút.

## 5. API

| Method | Endpoint | Ghi chú |
| --- | --- | --- |
| GET | `/api/v1/events` | `district`, `time_filter`, `search`, `my_events`, `status`, `page`, `page_size` |
| POST | `/api/v1/events` | Tạo sự kiện (PENDING) |
| POST | `/api/v1/events/cover` | Upload ảnh bìa (JPG/PNG ≤ 5MB) |
| GET | `/api/v1/events/{id}` | Chi tiết + trạng thái cá nhân |
| PATCH | `/api/v1/events/{id}` | Chỉnh sửa + `version` (optimistic lock) |
| GET | `/api/v1/events/{id}/participants` | Danh sách người tham gia |
| POST | `/api/v1/events/{id}/interest` | Toggle quan tâm |
| POST | `/api/v1/events/{id}/join` | Toggle tham gia |
| POST | `/api/v1/events/{id}/checkin` | Check-in GPS |
| PATCH | `/api/v1/events/{id}/review` | Duyệt / từ chối (RBAC) |
| PATCH | `/api/v1/events/{id}/cancel` | Huỷ sự kiện |

## 6. Dữ liệu test & dọn dẹp

Bản cũ của `backend/tests/test_events.py` ghi trực tiếp vào CSDL dev. Đã khắc phục:

- Test dùng role `CITIZEN` (tra cứu từ bảng `roles`), không còn `role_id = 1` (ADMIN).
- `asyncTearDown` xoá toàn bộ User/Event/Participant/Interest/Checkin/Notification do test tạo.
- Script dọn dẹp dữ liệu rác: `python -m app.seeds.cleanup_event_test_data` (dry-run) và `--apply`.
- Sau dọn dẹp: 18 người dùng thật, 5 sự kiện seed, 0 tài khoản `test_*`.

## 7. Kiểm thử

```powershell
# Backend (dùng venv có dependencies của backend)
cd backend
.\.venv\Scripts\python.exe -m unittest tests.test_events -v

# Frontend
cd frontend
npx vitest run src/features/events
npm run build
```

Kết quả hiện tại: **17/17** backend test và **11/11** frontend test pass; `tsc -b` và `vite build` thành công.

## 8. Quyết định cho các điểm đặc tả còn mở

1. Ảnh bìa: upload thật qua `/events/cover`, vẫn cho phép dán URL dự phòng.
2. Thông báo: in-app (bảng `notifications` + NotificationBell), không gửi email.
3. Giới hạn điểm: 150 GP/ngày, đối soát bằng `event_checkins`.
4. "Tuần này" = 7 ngày kế tiếp tính từ thời điểm hiện tại.
5. Dữ liệu test: xoá cứng qua script dọn dẹp (không reset toàn bộ CSDL).
6. Quyền chỉnh sửa: người tạo hoặc Admin, trước giờ bắt đầu, duyệt lại sau khi sửa.
7. Duyệt sự kiện: có cả panel riêng trong trang sự kiện và khối duyệt trong modal chi tiết.
