# STT 43: Trung Tâm Điều Phối Tác Nghiệp & Phân Công Lệnh Xử Lý Hiện Trường
(Operations Dispatch Center)

## 1. Tổng Quan Kiến Trúc (Architecture Overview)
- **Tầng Domain Entity:** `app/models/dispatch/dispatch_order.py` (Entity `DispatchOrder`, OCC `version`, Soft-delete `deleted_at`).
- **Tầng Schemas:** `app/schemas/dispatch/schemas.py` (Pydantic v2 validation cho 6 màn hình nghiệp vụ).
- **Tầng Repository Interface:** `app/interface/dispatch/dispatch_interface.py` (`IDispatchRepository` tuân thủ DIP).
- **Tầng Data Access:** `app/crud/dispatch/dispatch_repository.py` (100% Explicit SQL qua `text(...)`).
- **Tầng Business Service:** `app/services/dispatch/dispatch_service.py` (`DispatchService`).
- **Tầng REST API Router:** `app/api/v1/dispatch/router.py` (FastAPI Router với bảo vệ RBAC).

## 2. Đặc Tả 6 Màn Hình Nghiệp Vụ
1. **Màn 1/6 (Danh sách lệnh):** Bộ lọc (Trạng thái, Đội), Bảng dữ liệu (Mã \| Sự cố \| Đội \| Trạng thái), Nút Sửa (Màn 3), Nút Huỷ (Màn 4), Nút Tạo lệnh mới (Màn 2), Nhấp đúp mở Màn 6.
2. **Màn 2/6 (Tạo lệnh):** Combobox chọn sự cố chưa phân công (tự trích xuất vị trí, toạ độ), chọn đội cơ động (gợi ý cự ly & trạng thái), mức ưu tiên, hạn SLA deadline, nút Giao lệnh.
3. **Màn 3/6 (Sửa lệnh):** Dữ liệu cũ điền sẵn (read-only), đổi đội cơ động, đổi hạn deadline, ghi chú chỉ đạo, nút Cập nhật.
4. **Màn 4/6 (Popup xác nhận huỷ):** Modal backdrop mờ, tiêu đề "HUỶ LỆNH XỬ LÝ?", cảnh báo tác động "Đội sẽ nhận thông báo huỷ", textarea lý do huỷ bắt buộc, nút Huỷ lệnh & Giữ lại.
5. **Màn 5/6 (Thông báo huỷ thành công):** Success popup, checkmark xanh, tiêu đề "ĐÃ HUỶ LỆNH", thông điệp "Danh sách lệnh đã cập nhật", nút Đóng (tự biến mất sau 3 giây).
6. **Màn 6/6 (Theo dõi hiện trường):** Khối Bản đồ (GPS đội, sự cố, ETA, cảnh báo mất GPS > 5p), Khối Tiến độ (Stepper 4 bước, ảnh trước & sau xử lý), Khối Hành động (Gọi đội, Đóng lệnh nghiệm thu).

## 3. Quy Định An Toàn & Chuẩn Hóa
- **Không nhúng mã kỹ thuật:** Tuyệt đối không hiển thị `button:` hay `STT ...` trên giao diện người dùng.
- **SQL Tường minh:** Không dùng ORM tự động, toàn bộ truy vấn dùng parameter binding.
- **Quyền hạn truy cập:** `ADMIN`, `COORDINATOR`, `DISTRICT_MANAGER`, `OFFICER` hoặc quyền `INCIDENTS` / `STATISTICS`.
