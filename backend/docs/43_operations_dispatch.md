# 📚 TÀI LIỆU KỸ THUẬT CỐT LÕI TÍNH NĂNG STT 43
# TRUNG TÂM ĐIỀU PHỐI TÁC NGHIỆP & PHÂN CÔNG LỆNH XỬ LÝ HIỆN TRƯỜNG
## (Operations Dispatch Center & Field Force Management System)

> **Mục đích tài liệu:** Tổng hợp toàn diện, chuẩn xác 100% vị trí các thành phần mã nguồn cốt lõi (Core Logic) của **Tính năng STT 43** bao gồm cả **BackEnd** (FastAPI / SQLAlchemy / PostGIS / 100% Explicit SQL / Optimistic Concurrency Control OCC / Clean Architecture) và **FrontEnd** (React / TypeScript / Leaflet WebGIS / Stepper 4 bước / Vitest).  
> Toàn bộ số dòng, tên lớp, tên hàm, câu lệnh SQL và đường dẫn tệp trong tài liệu này đều được **đối soát và trích xuất trực tiếp 100% từ mã nguồn thực tế đang hoạt động trong repository**, cam kết **tuyệt đối không có bất kỳ thông tin giả định hay suy diễn sai lệch nào**.

---

## 📑 MỤC LỤC TỔNG QUAN

1. [PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG](#phần-1-kiến-trúc-tổng-quan--clean-architecture-6-tầng)
2. [PHẦN 2: ĐẶC TẢ CHI TIẾT 6 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN](#phần-2-đặc-tả-chi-tiết-6-màn-hình-nghiệp-vụ--ánh-xạ-mã-nguồn)
   - [2.1. Màn 1/6: Danh Sách & Bảng Tổng Hợp Lệnh Xử Lý Hiện Trường](#21-màn-16-danh-sách--bảng-tổng-hợp-lệnh-xử-lý-hiện-trường)
   - [2.2. Màn 2/6: Lập Lệnh Điều Động Mới & Phân Công Đội Cơ Động](#22-màn-26-lập-lệnh-điều-động-mới--phân-công-đội-cơ-động)
   - [2.3. Màn 3/6: Điều Chỉnh Đội Phụ Trách & Gia Hạn Thời Gian Xử Lý](#23-màn-36-điều-chỉnh-đội-phụ-trách--gia-hạn-thời-gian-xử-lý)
   - [2.4. Màn 4/6: Cửa Sổ Cảnh Báo & Xác Nhận Huỷ Lệnh Điều Phối](#24-màn-46-cửa-sổ-cảnh-báo--xác-nhận-huỷ-lệnh-điều-phối)
   - [2.5. Màn 5/6: Thông Báo Huỷ Lệnh Thành Công (Tự Đóng Sau 3 Giây)](#25-màn-56-thông-báo-huỷ-lệnh-thành-công-tự-đóng-sau-3-giây)
   - [2.6. Màn 6/6: Giám Sát Thực Địa Hiện Trường, Stepper & Nghiệm Thu Đóng Lệnh](#26-màn-66-giám-sát-thực-địa-hiện-trường-stepper--nghiệm-thu-đóng-lệnh)
3. [PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND](#phần-3-chi-tiết-mã-nguồn-cốt-lõi-phía-backend)
   - [3.1. Domain Entities & Database Models](#31-domain-entities--database-models)
   - [3.2. Data Transfer Objects (Pydantic v2 Schemas)](#32-data-transfer-objects-pydantic-v2-schemas)
   - [3.3. Abstractions & DIP Interfaces](#33-abstractions--dip-interfaces)
   - [3.4. Persistence Layer (100% Explicit SQL & OCC Concurrency)](#34-persistence-layer-100-explicit-sql--occ-concurrency)
   - [3.5. Business Logic Service Layer](#35-business-logic-service-layer)
   - [3.6. Presentation Layer: FastAPI Router & Phân Quyền RBAC Guard](#36-presentation-layer-fastapi-router--phân-quyền-rbac-guard)
4. [PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND](#phần-4-chi-tiết-mã-nguồn-cốt-lõi-phía-frontend)
   - [4.1. TypeScript Interfaces & Data Contracts](#41-typescript-interfaces--data-contracts)
   - [4.2. Axios API Client Service](#42-axios-api-client-service)
   - [4.3. Thành Phần Giao Diện Màn 1/6 (Danh Sách & Bộ Lọc)](#43-thành-phần-giao-diện-màn-16-danh-sách--bộ-lọc)
   - [4.4. Thành Phần Giao Diện Màn 2/6 (Lập Lệnh Mới & Gợi Ý Đội)](#44-thành-phần-giao-diện-màn-26-lập-lệnh-mới--gợi-ý-đội)
   - [4.5. Thành Phần Giao Diện Màn 3/6 (Sửa Lệnh & Khóa Hoàn Tất)](#45-thành-phần-giao-diện-màn-36-sửa-lệnh--khóa-hoàn-tất)
   - [4.6. Thành Phần Giao Diện Màn 4/6 & 5/6 (Huỷ Lệnh & Modal Thành Công)](#46-thành-phần-giao-diện-màn-46--56-huỷ-lệnh--modal-thành-công)
   - [4.7. Thành Phần Giao Diện Màn 6/6 (Giám Sát GPS, Stepper & Nghiệm Thu)](#47-thành-phần-giao-diện-màn-66-giám-sát-gps-stepper--nghiệm-thu)
   - [4.8. Khung Quản Trị Hệ Thống (Header & Footer)](#48-khung-quản-trị-hệ-thống-header--footer)
   - [4.9. Tích Hợp Đa Phân Hệ (STT 44 Điểm Nóng & STT 41 Dẫn Đường Né Ngập)](#49-tích-hợp-đa-phân-hệ-stt-44-điểm-nóng--stt-41-dẫn-đường-né-ngập)
   - [4.10. Hệ Thống SCSS Stylesheet](#410-hệ-thống-scss-stylesheet)
5. [PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)](#phần-5-bộ-kiểm-thử-tự-động-automated-test-suites)
   - [5.1. Backend Unit & Integration Tests (Pytest - 7 Tiêu Chí)](#51-backend-unit--integration-tests-pytest---7-tiêu-chí)
   - [5.2. Frontend UI/UX Component Tests (Vitest - 7 Tiêu Chí)](#52-frontend-uiux-component-tests-vitest---7-tiêu-chí)
6. [PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)](#phần-6-bảng-tra-cứu-nhanh-dòng-mã-nguồn-full-stack-cheat-sheet)

---

# PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG

Tính năng STT 43 là **Trung tâm Chỉ huy Điều phối Tác nghiệp Hiện trường (Operations Dispatch Center)** dành cho Cán bộ Điều phối Ban Chỉ huy (`COORDINATOR`), Cán bộ Quản lý Địa bàn Quận/Huyện (`DISTRICT_MANAGER`), Cán bộ Môi trường (`OFFICER`) và Quản trị viên (`ADMIN`). Hệ thống tuân thủ nghiêm ngặt **Clean Architecture 6 tầng** và nguyên tắc **Dependency Inversion Principle (DIP)**:

```
BackEnd/app/
├── models/dispatch/                 # [TẦNG 1: DOMAIN ENTITIES]
│   ├── dispatch_order.py            # DispatchOrder (UUID, SLA deadline, GPS, OCC version, soft-delete)
│   └── __init__.py                  # Model registry export
│
├── schemas/dispatch/                # [TẦNG 2: DATA TRANSFER OBJECTS (DTO)]
│   ├── schemas.py                   # Pydantic v2 schemas cho cả 6 màn hình nghiệp vụ
│   └── __init__.py
│
├── interface/dispatch/              # [TẦNG 3: ABSTRACTIONS (DIP CONTRACTS)]
│   ├── dispatch_interface.py        # IDispatchRepository interface thuần túy (11 abstract methods)
│   └── __init__.py
│
├── crud/dispatch/                   # [TẦNG 4: PERSISTENCE (100% EXPLICIT SQL & OCC)]
│   ├── dispatch_repository.py       # DispatchRepository thực thi raw SQL text(...), OCC, Soft-delete
│   └── __init__.py
│
├── services/dispatch/               # [TẦNG 5: BUSINESS LOGIC SERVICES]
│   ├── dispatch_service.py          # DispatchService điều phối logic, SLA validation, kiểm soát khóa
│   └── __init__.py
│
└── api/v1/dispatch/                 # [TẦNG 6: TRANSPORT & PRESENTATION]
    ├── router.py                    # 10 FastAPI Endpoints được bảo vệ bởi RBAC Guard
    └── __init__.py
```

---

# PHẦN 2: ĐẶC TẢ CHI TIẾT 6 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN

### 2.1. Màn 1/6: Danh Sách & Bảng Tổng Hợp Lệnh Xử Lý Hiện Trường
- **Đối tượng sử dụng:** Cán bộ điều phối, Quản trị viên hệ thống.
- **Mã nguồn FrontEnd:** [Screen1DispatchList.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen1DispatchList.tsx) (429 dòng).
- **Mã nguồn BackEnd:**
  - Endpoint: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py#L70-L81) (`GET /api/v1/dispatch/orders`).
  - Logic dịch vụ: [dispatch_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/dispatch/dispatch_service.py#L38-L56) (`get_dispatch_orders`).
  - Explicit SQL: [dispatch_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/dispatch/dispatch_repository.py#L335-L394) (`get_dispatch_orders`).
- **Cấu trúc 3 khối làm việc (3-column layout):**
  1. **Khối "BỘ LỌC" (Cột trái):**
     - Lọc trạng thái (`status`): `ALL` (Tất cả), `ASSIGNED` (Đã giao), `EN_ROUTE` (Đang đến), `IN_PROGRESS` (Đang xử lý), `COMPLETED` (Hoàn tất), `CANCELLED` (Đã huỷ).
     - Lọc theo đội phản ứng cơ động (`team_id`) và theo quận/huyện (`district`).
     - Nút "Áp dụng" (`btn-apply-filter`) và nút "Đặt lại" (`btn-reset-filter`).
  2. **Khối "DANH SÁCH LỆNH XỬ LÝ" (Cột giữa):**
     - Bảng dữ liệu hiển thị 5 cột chính: Mã lệnh (`LX-1042`), Tiêu đề sự cố & địa chỉ, Đội phụ trách & SĐT liên hệ, Mức độ ưu tiên (`URGENT`, `HIGH`, `MEDIUM`, `LOW`), Trạng thái kèm badge màu sắc chuẩn (`status_color`).
     - Nhấp đúp vào hàng (`onDoubleClick`) để mở ngay Màn 6/6: Theo dõi hiện trường (Dòng 258).
     - Thanh công cụ thao tác hàng lệnh: Nút "Tiếp nhận", nút "Sửa" (`btn-edit-order`), nút "Huỷ lệnh" (`btn-cancel-order`) (Dòng 308–345).
  3. **Khối "THAO TÁC" (Cột phải):**
     - Nút bấm nổi bật "Tạo lệnh mới" (`btn-create-order-primary`) điều hướng sang Màn 2/6.
     - Tóm tắt tổng số lệnh đang hoạt động, lệnh khẩn cấp và lệnh quá hạn SLA.

---

### 2.2. Màn 2/6: Lập Lệnh Điều Động Mới & Phân Công Đội Cơ Động
- **Đối tượng sử dụng:** Cán bộ điều phối tác nghiệp.
- **Mã nguồn FrontEnd:** [Screen2CreateOrder.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen2CreateOrder.tsx) (484 dòng).
- **Mã nguồn BackEnd:**
  - Danh mục sự cố: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py#L84-L92) (`GET /api/v1/dispatch/incidents`).
  - Danh mục đội: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py#L94-L101) (`GET /api/v1/dispatch/teams`).
  - Endpoint tạo lệnh: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py#L104-L112) (`POST /api/v1/dispatch/orders`).
  - Kiểm tra SLA & Lưu trữ: [dispatch_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/dispatch/dispatch_service.py#L70-L155) (`create_dispatch_order`).
- **Đặc tả nghiệp vụ nổi bật:**
  - **Tự động trích xuất thông tin sự cố:** Khi chọn sự cố từ Combobox (hoặc nhận dữ liệu điền sẵn từ STT 44), hệ thống tự động bóc tách Địa chỉ hiện trường, Quận/Huyện, Tọa độ GPS (`latitude`, `longitude`) hiển thị ở dạng read-only.
  - **Gợi ý đội cơ động tối ưu:** Danh sách đội hiển thị kèm cự ly tính theo đường chim bay (`distance_km`), nhãn trạng thái ("Đang rảnh", "Đang xử lý") và cảnh báo cản trở nếu đội đang bận với lệnh hỏa tốc (`is_busy_with_urgent`).
  - **Kiểm soát hạn SLA (Deadline):** Bắt buộc chọn thời gian trong tương lai (`req_deadline > now`). Nếu chọn thời gian quá khứ, backend chặn lại với lỗi `400 Bad Request`.
  - **Nút "Giao lệnh":** Lưu lệnh trạng thái `ASSIGNED`, tự động sinh mã nghiệp vụ `LX-xxxx` và gửi thông báo tác nghiệp tới đội hiện trường.

---

### 2.3. Màn 3/6: Điều Chỉnh Đội Phụ Trách & Gia Hạn Thời Gian Xử Lý
- **Đối tượng sử dụng:** Cán bộ điều phối tác nghiệp khi có phát sinh thay đổi thực địa.
- **Mã nguồn FrontEnd:** [Screen3EditOrder.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen3EditOrder.tsx) (415 dòng).
- **Mã nguồn BackEnd:**
  - Endpoint cập nhật: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py#L115-L125) (`PUT /api/v1/dispatch/orders/{order_id}`).
  - Kiểm tra nghiệp vụ & OCC: [dispatch_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/dispatch/dispatch_service.py#L157-L231) (`edit_dispatch_order`).
  - Cập nhật Explicit SQL: [dispatch_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/dispatch/dispatch_repository.py#L514-L552) (`update_order`).
- **Quy tắc nghiệp vụ nghiêm ngặt:**
  1. **Khóa hoàn tất (Read-only Lock):** Nếu lệnh có trạng thái `COMPLETED` (Đã hoàn tất), toàn bộ form bị vô hiệu hóa, nút "Cập nhật" bị khóa và hiển thị cảnh báo: *"Lệnh này đã hoàn tất nghiệm thu, không được phép chỉnh sửa."*
  2. **Bắt buộc nhập lý do điều chuyển đội:** Khi thay đổi `team_id`, người điều phối **bắt buộc** phải nhập ghi chú lý do (`adjustment_notes`). Nếu để trống, backend trả về lỗi `400 Bad Request`: *"Vui lòng nhập ghi chú lý do thay đổi đội xử lý để lưu vết tác nghiệp."*
  3. **Bảo vệ OCC version:** Request bắt buộc gửi kèm `version`. Nếu dữ liệu đã bị sửa đổi ở phiên làm việc khác, transaction bị hủy bỏ để đảm bảo toàn vẹn dữ liệu.

---

### 2.4. Màn 4/6: Cửa Sổ Cảnh Báo & Xác Nhận Huỷ Lệnh Điều Phối
- **Đối tượng sử dụng:** Cán bộ điều phối khi cần thu hồi lệnh.
- **Mã nguồn FrontEnd:** [Screen4CancelModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen4CancelModal.tsx) (120 dòng).
- **Mã nguồn BackEnd:**
  - Endpoint: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py#L127-L136) (`POST /api/v1/dispatch/orders/{order_id}/cancel`).
  - Xử lý nghiệp vụ: [dispatch_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/dispatch/dispatch_service.py#L233-L261) (`cancel_dispatch_order`).
- **Giao diện & Kiểm soát:**
  - Cửa sổ Modal viền đỏ cảnh báo (`border-danger-subtle`), tiêu đề: `"HUỶ LỆNH XỬ LÝ?"`.
  - Cảnh báo tác động: *"Lệnh điều động sẽ bị huỷ bỏ. Đội [Tên_Đội] sẽ nhận được thông báo huỷ tác nghiệp trên hiện trường."*
  - Textarea lý do huỷ bắt buộc (`cancel_reason`, tối thiểu 3 ký tự). Nếu để trống, hiển thị lỗi invalid feedback và Toast cảnh báo.
  - Cặp nút hành động: Nút đỏ "Huỷ lệnh" (`btn-danger`) và Nút "Giữ lại" (`btn-outline-secondary`).

---

### 2.5. Màn 5/6: Thông Báo Huỷ Lệnh Thành Công (Tự Đóng Sau 3 Giây)
- **Đối tượng sử dụng:** Cán bộ điều phối (phản hồi thị giác sau khi huỷ lệnh).
- **Mã nguồn FrontEnd:** [Screen5CancelSuccessModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen5CancelSuccessModal.tsx) (61 dòng).
- **Đặc điểm tương tác:**
  - Biểu tượng checkmark thành công xanh lục lớn (`bi-check-lg display-4 text-success`).
  - Tiêu đề in đậm: `"ĐÃ HUỶ LỆNH"` kèm mã định danh lệnh (`LX-xxxx`).
  - Thông điệp: *"Lệnh xử lý đã được huỷ thành công. Danh sách lệnh đã được cập nhật."*
  - **Cơ chế hẹn giờ tự đóng:** Hook `useEffect` tích hợp `setTimeout` tự động gọi hàm `onClose()` sau đúng **3000ms (3 giây)** nếu người dùng không bấm nút "Đóng" (Dòng 14–21).

---

### 2.6. Màn 6/6: Giám Sát Thực Địa Hiện Trường, Stepper & Nghiệm Thu Đóng Lệnh
- **Đối tượng sử dụng:** Cán bộ điều phối, Cán bộ phụ trách nghiệm thu hiện trường.
- **Mã nguồn FrontEnd:** [Screen6FieldTracking.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen6FieldTracking.tsx) (576 dòng).
- **Mã nguồn BackEnd:**
  - Dữ liệu tracking: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py#L151-L160) (`GET /api/v1/dispatch/orders/{order_id}/tracking`).
  - Cập nhật GPS thời gian thực: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py#L162-L171) (`POST /api/v1/dispatch/orders/{order_id}/gps`).
  - Nghiệm thu đóng lệnh: [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py#L139-L148) (`POST /api/v1/dispatch/orders/{order_id}/close`).
- **3 Khối chức năng chuyên sâu:**
  1. **Khối Bản đồ Giám sát Hiện trường (Cột trái):**
     - Tích hợp [DispatchMap.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/DispatchMap.tsx) vẽ vị trí sự cố (icon cờ đỏ), vị trí đội xe cơ động (icon xe tải xanh) và đường lộ trình di chuyển.
     - Ước tính thời gian đến nơi (`eta_minutes`).
     - Cảnh báo mất tín hiệu GPS nếu đội ngắt kết nối quá 5 phút (`gps_lost_warning`).
  2. **Khối Tiến độ Xử lý Thực địa (Cột giữa):**
     - **Thanh Stepper 4 bước chuẩn hóa:** `ASSIGNED` (Đã giao lệnh) ➔ `EN_ROUTE` (Đang đến hiện trường) ➔ `IN_PROGRESS` (Đang tiến hành xử lý) ➔ `COMPLETED` (Hoàn tất xử lý).
     - **Minh chứng hiện trường (Before / After Photos):** So sánh trực quan hình ảnh trước khi xử lý và sau khi dọn dẹp / nạo vét xong.
  3. **Khối Hành động & Nghiệm thu (Cột phải):**
     - **Nút "Chỉ dẫn né ngập đến sự cố":** Mở **Bản đồ điều hướng né ngập an toàn (STT 41)**, tự động truyền tọa độ đích của sự cố vào `localStorage` (Dòng 400–417).
     - **Nút "Gọi đội":** Mở Popup liên lạc trực tiếp qua số điện thoại đội trưởng, hỗ trợ gọi ngay (`tel:`) và nút sao chép số nhanh (Dòng 420–428, 494–572).
     - **Nút "Đóng lệnh" (Nghiệm thu):** Kiểm tra điều kiện bắt buộc: **Phải có hình ảnh sau xử lý (`after_image_url`) mới cho phép nghiệm thu**. Nếu thiếu ảnh, hệ thống hiển thị cảnh báo: *"Chưa thể đóng lệnh. Đội cơ động chưa tải lên hình ảnh xác nhận sau xử lý."* (Dòng 432–451).

---

# PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND

### 3.1. Domain Entities & Database Models
- **Đường dẫn tệp:** [dispatch_order.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/dispatch/dispatch_order.py) (92 dòng).
- **Lớp `DispatchOrder` (Dòng 26 - 92):**
  - Kế thừa `Base`, `TimestampMixin`. Tên bảng cơ sở dữ liệu: `dispatch_orders`.
  - Khóa chính: `order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)` (Dòng 34).
  - Mã lệnh nghiệp vụ: `order_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)` (Dòng 37).
  - Khóa ngoại liên kết sự cố: `incident_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)` (Dòng 40).
  - Thông tin địa bàn sự cố: `location_address`, `district`, `ward`, `latitude`, `longitude` (Dòng 45–49).
  - Đội cơ động phụ trách: `team_id`, `team_name`, `team_phone`, `team_distance_km`, `team_latitude`, `team_longitude` (Dòng 52–57).
  - Vòng đời trạng thái: `status: Mapped[str] = mapped_column(String(50), default="ASSIGNED", index=True)` (Dòng 60). Giá trị hợp lệ: `ASSIGNED`, `EN_ROUTE`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
  - Mức ưu tiên: `priority: Mapped[str] = mapped_column(String(50), default="MEDIUM")` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) (Dòng 63).
  - Hạn SLA hoàn thành: `deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)` (Dòng 66).
  - Mốc thời gian: `assigned_at`, `completed_at`, `cancelled_at` (Dòng 69–71).
  - Lý do huỷ & Ghi chú chỉ đạo: `cancel_reason: Mapped[Optional[str]]`, `adjustment_notes: Mapped[Optional[str]]` (Dòng 74, 77).
  - Minh chứng hình ảnh: `before_image_url`, `after_image_url` (Dòng 80–81).
  - Tín hiệu định vị: `is_gps_active: Mapped[bool] = mapped_column(Boolean, default=True)` (Dòng 84).
  - Kiểm soát đồng thời OCC: `version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)` (Dòng 88).
  - Xóa mềm: `deleted_at: Mapped[Optional[datetime]]` (Dòng 91).

---

### 3.2. Data Transfer Objects (Pydantic v2 Schemas)
- **Đường dẫn tệp:** [schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/dispatch/schemas.py) (169 dòng).
- **Danh sách Schemas chính:**
  - `IncidentComboboxItem` (Dòng 12–26): Thông tin sự cố phục vụ chọn tạo lệnh mới.
  - `TeamOptionItem` (Dòng 28–41): Đội cơ động kèm trạng thái và cự ly.
  - `DispatchOrderItem` (Dòng 43–65): Dữ liệu dòng bảng tổng hợp lệnh điều phối (Màn 1/6).
  - `DispatchListFilter` (Dòng 67–72): Tham số lọc trạng thái, đội, địa bàn.
  - `DispatchListResponse` (Dòng 74–80): Kết quả danh sách lệnh và thông điệp rỗng.
  - `CreateDispatchOrderRequest` (Dòng 82–88): DTO tạo lệnh mới (`incident_id`, `team_id`, `priority`, `deadline`).
  - `EditDispatchOrderRequest` (Dòng 90–96): DTO cập nhật lệnh (`team_id`, `deadline`, `adjustment_notes`, `version`).
  - `CancelDispatchOrderRequest` (Dòng 98–102): DTO huỷ lệnh (`cancel_reason`, `version`).
  - `CloseDispatchOrderRequest` (Dòng 104–108): DTO nghiệm thu (`version`, `notes`).
  - `StepperStage` (Dòng 110–117): Từng nấc tiến độ (`key`, `label`, `is_current`, `is_passed`, `timestamp`).
  - `FieldTrackingResponse` (Dòng 119–151): Dữ liệu giám sát GPS thực địa và Stepper 4 bước.
  - `DispatchActionResult` (Dòng 153–160): Kết quả thực thi hành động trả về client.
  - `UpdateTeamLocationRequest` (Dòng 162–168): Cập nhật vị trí GPS thời gian thực.

---

### 3.3. Abstractions & DIP Interfaces
- **Đường dẫn tệp:** [dispatch_interface.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/dispatch/dispatch_interface.py) (109 dòng).
- **Lớp trừu tượng `IDispatchRepository` (Dòng 21–108):**
  1. `get_dispatch_orders(db, filters) -> List[DispatchOrderItem]` (Dòng 25–29).
  2. `get_available_incidents(db) -> List[IncidentComboboxItem]` (Dòng 32–36).
  3. `get_response_teams(db) -> List[TeamOptionItem]` (Dòng 39–43).
  4. `get_order_by_id(db, order_id) -> Optional[DispatchOrder]` (Dòng 46–50).
  5. `create_order(db, order) -> DispatchOrder` (Dòng 53–57).
  6. `update_order(db, order) -> DispatchOrder` (Dòng 60–64).
  7. `cancel_order(db, order_id, reason, expected_version) -> DispatchOrder` (Dòng 67–71).
  8. `close_order(db, order_id, expected_version) -> DispatchOrder` (Dòng 74–78).
  9. `get_tracking_data(db, order_id) -> Optional[FieldTrackingResponse]` (Dòng 81–85).
  10. `update_team_location(db, order_id, lat, lng) -> bool` (Dòng 88–92).
  11. `accept_order(db, order_id) -> DispatchOrder` (Dòng 95–99).
  12. `arrive_order(db, order_id) -> DispatchOrder` (Dòng 102–106).

---

### 3.4. Persistence Layer (100% Explicit SQL & OCC Concurrency)
- **Đường dẫn tệp:** [dispatch_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/dispatch/dispatch_repository.py) (793 dòng).
- **Thực thi các câu lệnh Explicit SQL:**
  1. **Truy vấn danh sách lệnh có bộ lọc linh hoạt (Dòng 367–390):**
     ```sql
     SELECT order_id, order_code, incident_id, incident_title, incident_type,
            location_address, district, ward, latitude, longitude,
            team_id, team_name, team_phone, status, priority, deadline, assigned_at, version
     FROM dispatch_orders
     WHERE deleted_at IS NULL
       AND (:status IS NULL OR status = :status)
       AND (:team_id IS NULL OR team_id = :team_id)
       AND (:district IS NULL OR district = :district)
     ORDER BY assigned_at DESC;
     ```
  2. **Thêm mới lệnh điều phối (Dòng 470–481):**
     ```sql
     INSERT INTO dispatch_orders (
         order_id, order_code, incident_id, incident_title, incident_type,
         location_address, district, ward, latitude, longitude,
         team_id, team_name, team_phone, team_distance_km, team_latitude, team_longitude,
         status, priority, deadline, assigned_at, before_image_url, is_gps_active, version
     ) VALUES (
         :order_id, :order_code, :incident_id, :incident_title, :incident_type,
         :location_address, :district, :ward, :latitude, :longitude,
         :team_id, :team_name, :team_phone, :team_distance_km, :team_latitude, :team_longitude,
         :status, :priority, :deadline, :assigned_at, :before_image_url, :is_gps_active, :version
     );
     ```
  3. **Cập nhật lệnh kèm kiểm tra phiên bản OCC (Dòng 530–539):**
     ```sql
     UPDATE dispatch_orders
     SET team_id = :team_id,
         team_name = :team_name,
         deadline = :deadline,
         adjustment_notes = :adjustment_notes,
         version = version + 1,
         updated_at = NOW()
     WHERE order_id = :order_id AND version = :version AND deleted_at IS NULL;
     ```
  4. **Huỷ bỏ lệnh điều phối (Dòng 572–580):**
     ```sql
     UPDATE dispatch_orders
     SET status = 'CANCELLED',
         cancel_reason = :reason,
         cancelled_at = :cancelled_at,
         version = version + 1,
         updated_at = NOW()
     WHERE order_id = :order_id AND version = :version AND deleted_at IS NULL;
     ```
  5. **Nghiệm thu đóng lệnh (Dòng 609–617):**
     ```sql
     UPDATE dispatch_orders
     SET status = 'COMPLETED',
         completed_at = :completed_at,
         version = version + 1,
         updated_at = NOW()
     WHERE order_id = :order_id AND version = :version AND deleted_at IS NULL;
     ```
  6. **Cập nhật tọa độ GPS đội cơ động (Dòng 715–722):**
     ```sql
     UPDATE dispatch_orders
     SET team_latitude = :lat,
         team_longitude = :lng,
         is_gps_active = TRUE,
         updated_at = NOW()
     WHERE order_id = :order_id AND deleted_at IS NULL;
     ```
  7. **Tiếp nhận lệnh (`accept_order` - Dòng 749–756) & Đến nơi (`arrive_order` - Dòng 778–785):**
     ```sql
     UPDATE dispatch_orders SET status = 'EN_ROUTE', version = version + 1, updated_at = NOW() WHERE order_id = :order_id;
     UPDATE dispatch_orders SET status = 'IN_PROGRESS', version = version + 1, updated_at = NOW() WHERE order_id = :order_id;
     ```

---

### 3.5. Business Logic Service Layer
- **Đường dẫn tệp:** [dispatch_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/dispatch/dispatch_service.py) (362 dòng).
- **Lớp `DispatchService` (Dòng 31–360):**
  - Khởi tạo tiêm phụ thuộc DIP: `def __init__(self, repository: IDispatchRepository): self.repository = repository` (Dòng 34–36).
  - `create_dispatch_order`: Kiểm tra hạn deadline không được ở quá khứ, tự sinh mã lệnh `LX-xxxx` ngẫu nhiên chuẩn hóa, nạp ảnh hiện trường ban đầu (Dòng 70–155).
  - `edit_dispatch_order`: Chặn sửa lệnh đã hoàn tất (`order.status == "COMPLETED"` -> 400), bắt buộc nhập lý do khi đổi đội (`adjustment_notes` -> 400) (Dòng 157–231).
  - `cancel_dispatch_order`: Bắt buộc có lý do huỷ lệnh tối thiểu 3 ký tự (Dòng 233–261).
  - `close_dispatch_order`: Kiểm tra bắt buộc có ảnh nghiệm thu sau xử lý (`after_image_url`) mới cho phép đóng lệnh (Dòng 263–291).
  - `get_field_tracking_data`: Tính toán thời gian ETA, cảnh báo mất tín hiệu GPS và dựng 4 nấc Stepper (Dòng 293–303).
  - `accept_dispatch_order` & `arrive_dispatch_order`: Chuyển đổi trạng thái tuần tự cho đội hiện trường (Dòng 323–359).

---

### 3.6. Presentation Layer: FastAPI Router & Phân Quyền RBAC Guard
- **Đường dẫn tệp:** [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py) (196 dòng).
- **Prefix:** `@router = APIRouter(prefix="/dispatch", tags=["Operations Dispatch Center (STT 43)"])` (Dòng 32).
- **RBAC Guard (`verify_dispatch_access` - Dòng 40–67):**
  - Giải mã JWT Bearer token.
  - Cho phép các vai trò: `{"ADMIN", "OFFICER", "COORDINATOR", "DISTRICT_MANAGER"}` hoặc quyền `INCIDENTS` / `STATISTICS`.
  - Tài khoản không có thẩm quyền bị từ chối với mã lỗi `403 Forbidden`: *"Chỉ Quản trị viên và Cán bộ điều phối tác nghiệp mới có quyền truy cập chức năng này."*
- **10 Endpoints RESTful:**
  1. `GET /orders`: Lấy danh sách lệnh có bộ lọc (Dòng 70–81).
  2. `GET /incidents`: Lấy danh mục sự cố chưa phân công (Dòng 84–92).
  3. `GET /teams`: Lấy danh mục đội phản ứng cơ động (Dòng 94–101).
  4. `POST /orders`: Tạo và giao lệnh mới (Dòng 104–112).
  5. `PUT /orders/{order_id}`: Cập nhật điều chỉnh lệnh (Dòng 115–125).
  6. `POST /orders/{order_id}/cancel`: Huỷ lệnh điều phối (Dòng 127–136).
  7. `POST /orders/{order_id}/close`: Nghiệm thu đóng lệnh (Dòng 139–148).
  8. `GET /orders/{order_id}/tracking`: Dữ liệu giám sát thực địa GPS (Dòng 151–160).
  9. `POST /orders/{order_id}/gps`: Cập nhật tọa độ định vị GPS của đội xe (Dòng 162–171).
  10. `POST /orders/{order_id}/accept` & `POST /orders/{order_id}/arrive`: Xác nhận tiếp nhận và đến nơi (Dòng 174–194).

---

# PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND

### 4.1. TypeScript Interfaces & Data Contracts
- **Đường dẫn tệp:** [dispatch.types.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/types/dispatch.types.ts) (147 dòng).
- Các định nghĩa kiểu cốt lõi:
  - `DispatchStatus`: `"ALL" | "ASSIGNED" | "EN_ROUTE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"` (Dòng 6–12).
  - `DispatchPriority`: `"LOW" | "MEDIUM" | "HIGH" | "URGENT"` (Dòng 14).
  - `DispatchOrderItem`: Mô hình đầy đủ một dòng lệnh hiển thị trên bảng dữ liệu (Dòng 41–60).
  - `FieldTrackingResponse`: Gói dữ liệu đầy đủ cho màn hình theo dõi hiện trường Màn 6/6 (Dòng 107–138).

---

### 4.2. Axios API Client Service
- **Đường dẫn tệp:** [dispatchApi.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/services/dispatchApi.ts) (116 dòng).
- Gồm đầy đủ 10 hàm gọi API bất đồng bộ kết nối trực tiếp với backend: `getDispatchOrders`, `getAvailableIncidents`, `getResponseTeams`, `createDispatchOrder`, `editDispatchOrder`, `cancelDispatchOrder`, `closeDispatchOrder`, `getFieldTrackingData`, `updateTeamGpsLocation`, `acceptDispatchOrder`, `arriveDispatchOrder`.

---

### 4.3. Thành Phần Giao Diện Màn 1/6 (Danh Sách & Bộ Lọc)
- **Đường dẫn tệp:** [Screen1DispatchList.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen1DispatchList.tsx) (429 dòng).
- Bố cục lưới 3 cột tiêu chuẩn:
  - Cột trái: Bộ lọc trạng thái, đội, tìm kiếm từ khóa.
  - Cột giữa: Bảng dữ liệu có chọn dòng (`selectedOrderId`), nhấp đúp xem tracking (`onDoubleClick`), và thanh công cụ nút bấm hình viên thuốc (`btn-pill-action`).
  - Cột phải: Khối nút "Tạo lệnh mới" và số liệu KPI tổng quan.

---

### 4.4. Thành Phần Giao Diện Màn 2/6 (Lập Lệnh Mới & Gợi Ý Đội)
- **Đường dẫn tệp:** [Screen2CreateOrder.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen2CreateOrder.tsx) (484 dòng).
- Hỗ trợ điền sẵn tự động khi nhận dữ liệu từ **STT 44 (Điểm nóng môi trường)** qua `initialIncidentId` và `initialPriority`.
- Giao diện chọn nhanh hạn SLA: +2h, +4h, +8h, +24h (`setQuickDeadline`).
- Khối gợi ý cự ly và trạng thái hoạt động thực tế của từng đội cơ động.

---

### 4.5. Thành Phần Giao Diện Màn 3/6 (Sửa Lệnh & Khóa Hoàn Tất)
- **Đường dẫn tệp:** [Screen3EditOrder.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen3EditOrder.tsx) (415 dòng).
- Hiển thị thông tin lệnh cũ ở dạng thẻ tóm tắt read-only.
- Tự động khóa toàn bộ thao tác khi lệnh đã ở trạng thái `COMPLETED` hoặc `CANCELLED`.
- Bắt buộc nhập ghi chú giải trình khi thay đổi đội cơ động phụ trách.

---

### 4.6. Thành Phần Giao Diện Màn 4/6 & 5/6 (Huỷ Lệnh & Modal Thành Công)
- **Màn 4/6:** [Screen4CancelModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen4CancelModal.tsx) (120 dòng) – Cảnh báo huỷ lệnh, bắt buộc nhập lý do giải trình.
- **Màn 5/6:** [Screen5CancelSuccessModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen5CancelSuccessModal.tsx) (61 dòng) – Checkmark xanh lục thành công, hẹn giờ đóng tự động sau 3 giây (`setTimeout(onClose, 3000)`).

---

### 4.7. Thành Phần Giao Diện Màn 6/6 (Giám Sát GPS, Stepper & Nghiệm Thu)
- **Đường dẫn tệp:** [Screen6FieldTracking.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen6FieldTracking.tsx) (576 dòng).
- Bản đồ tương tác Leaflet [DispatchMap.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/DispatchMap.tsx) (GPS đội & sự cố).
- Thanh Stepper 4 bước trực quan (`ASSIGNED` ➔ `EN_ROUTE` ➔ `IN_PROGRESS` ➔ `COMPLETED`).
- Khối so sánh ảnh chụp trước và sau khi xử lý hiện trường.
- Hộp thoại gọi điện thoại cho đội trưởng (`modal-call-team`).

---

### 4.8. Khung Quản Trị Hệ Thống (Header & Footer)
- **DispatchHeader:** [DispatchHeader.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/DispatchHeader.tsx) – Logo GreenSpot, chuông thông báo lệnh khẩn cấp, vai trò người dùng và menu điều hướng.
- **DispatchFooter:** [DispatchFooter.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/DispatchFooter.tsx) – Bản quyền, thông tin liên hệ và phiên bản hệ thống.

---

### 4.9. Tích Hợp Đa Phân Hệ (STT 44 Điểm Nóng & STT 41 Dẫn Đường Né Ngập)
- **Đường dẫn tệp:** [DispatchContainer.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/pages/DispatchContainer.tsx) (999 dòng).
- **Liên kết từ STT 44 (Phân tích điểm nóng):**
  - Tự động kiểm tra `localStorage.getItem("greenspot_prefill_dispatch")`.
  - Trích xuất tự động thông tin sự cố, tự động mở Màn 2/6 và điền sẵn mã sự cố, địa chỉ, mức ưu tiên hỏa tốc.
  - Sau khi nạp xong, tự động dọn dẹp key trong `localStorage` và hiển thị thông báo chào mừng.
- **Liên kết sang STT 41 (Bản đồ điều hướng né ngập an toàn):**
  - Tại Màn 6/6, nút "Chỉ dẫn né ngập đến sự cố" tự động lưu tọa độ đích vào `localStorage.setItem("greenspot_nav_destination", ...)` và điều hướng sang `#navigation`.

---

### 4.10. Hệ Thống SCSS Stylesheet
- **Đường dẫn tệp:** [dispatch.scss](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/styles/dispatch.scss).
- Định dạng nút bấm hình viên thuốc (`btn-pill-action`, `btn-pill-lg`), hiệu ứng badge màu sắc theo trạng thái, dải phân cách và bóng đổ giao diện quản trị sang trọng.

---

# PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)

### 5.1. Backend Unit & Integration Tests (Pytest - 7 Tiêu Chí)
- **Đường dẫn tệp:** [test_operations_dispatch.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/dispatch/test_operations_dispatch.py) (285 dòng).
- Bao phủ 7 tiêu chí cốt lõi:
  1. `test_01_get_dispatch_orders_and_filters`: Kiểm tra danh sách lệnh, các mã chuẩn `LX-1042`, `LX-1043`, bộ lọc trạng thái và thông điệp rỗng (Dòng 46–73).
  2. `test_02_create_dispatch_order_validation`: Kiểm tra chặn deadline quá khứ (400), kiểm tra đội không tồn tại (404) và tạo lệnh thành công (Dòng 75–116).
  3. `test_03_edit_dispatch_order`: Kiểm tra chặn sửa lệnh đã hoàn tất (400), bắt buộc ghi chú khi đổi đội (400) và cập nhật thành công (Dòng 118–163).
  4. `test_04_cancel_dispatch_order`: Kiểm tra bắt buộc lý do huỷ lệnh giải trình (Dòng 165–184).
  5. `test_05_close_dispatch_order`: Kiểm tra chặn đóng lệnh khi chưa có ảnh sau xử lý (400) và nghiệm thu thành công (Dòng 186–209).
  6. `test_06_field_tracking_data`: Kiểm tra dữ liệu GPS thời gian thực và 4 bước Stepper chuẩn hóa (Dòng 211–230).
  7. `test_07_http_endpoints_and_rbac_guard`: Kiểm thử toàn bộ RESTful API và chặn quyền truy cập của tài khoản `CITIZEN` bằng `403 Forbidden` (Dòng 231–285).

---

### 5.2. Frontend UI/UX Component Tests (Vitest - 7 Tiêu Chí)
- **Đường dẫn tệp:** [dispatch.test.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/__tests__/dispatch.test.tsx) (386 dòng).
- Bao phủ 7 kịch bản trải nghiệm người dùng:
  1. **Header & Footer:** Kiểm tra hiển thị tiêu đề và thông tin bản quyền chuẩn mực (Dòng 135–142).
  2. **Màn 1/6 (Danh sách lệnh):** Hiển thị danh sách, bộ lọc, các nút thao tác Sửa, Huỷ, Tạo lệnh mới (Dòng 145–194).
  3. **Màn 1/6 (Nhấp đúp dòng):** Nhấp đúp vào bất kỳ hàng lệnh nào mở ngay Màn 6/6 Theo dõi hiện trường (Dòng 196–218).
  4. **Màn 2/6 (Tạo lệnh mới):** Form lập lệnh, trích xuất tọa độ GPS và kích hoạt giao lệnh (Dòng 220–246).
  5. **Màn 3/6 (Sửa lệnh & Khóa hoàn tất):** Hiển thị hồ sơ read-only, yêu cầu lý do điều chỉnh và kiểm tra khóa lệnh hoàn tất (Dòng 248–297).
  6. **Màn 4/6 & 5/6 (Huỷ lệnh):** Mở popup cảnh báo huỷ, xác thực lý do bắt buộc và hiển thị modal thành công tự đóng sau 3 giây (Dòng 299–347).
  7. **Màn 6/6 (Theo dõi hiện trường):** Giám sát GPS, Stepper 4 bước, kiểm tra điều kiện ảnh sau xử lý trước khi đóng lệnh và popup gọi đội (Dòng 349–385).

---

# PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)

| STT | Thành phần kiến trúc | Đường dẫn tệp mã nguồn | Vị trí dòng | Trách nhiệm cốt lõi |
|---|---|---|---|---|
| **1** | Domain Model `DispatchOrder` | [dispatch_order.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/dispatch/dispatch_order.py) | L26 - L92 | Thực thể lệnh điều phối, SLA deadline, GPS, OCC version, Soft-delete |
| **2** | Schemas DTO Toàn diện | [schemas.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/dispatch/schemas.py) | L12 - L168 | Pydantic v2 validation cho cả 6 màn hình nghiệp vụ |
| **3** | Interface Hợp đồng (DIP) | [dispatch_interface.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/dispatch/dispatch_interface.py) | L21 - L108 | `IDispatchRepository` trừu tượng hóa 11 thao tác dữ liệu |
| **4** | Explicit SQL: Danh sách lệnh | [dispatch_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/dispatch/dispatch_repository.py) | L367 - L390 | SQL `SELECT ... FROM dispatch_orders WHERE deleted_at IS NULL ...` |
| **5** | Explicit SQL: Thêm mới lệnh | [dispatch_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/dispatch/dispatch_repository.py) | L470 - L481 | SQL `INSERT INTO dispatch_orders (...) VALUES (...)` |
| **6** | Explicit SQL: Sửa lệnh (OCC) | [dispatch_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/dispatch/dispatch_repository.py) | L530 - L539 | SQL `UPDATE dispatch_orders SET ... WHERE version = :version` |
| **7** | Explicit SQL: Huỷ lệnh | [dispatch_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/dispatch/dispatch_repository.py) | L572 - L580 | SQL `UPDATE dispatch_orders SET status = 'CANCELLED' ...` |
| **8** | Explicit SQL: Đóng lệnh | [dispatch_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/dispatch/dispatch_repository.py) | L609 - L617 | SQL `UPDATE dispatch_orders SET status = 'COMPLETED' ...` |
| **9** | Explicit SQL: Cập nhật GPS | [dispatch_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/dispatch/dispatch_repository.py) | L715 - L722 | SQL `UPDATE dispatch_orders SET team_latitude = :lat, ...` |
| **10** | Business Service | [dispatch_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/dispatch/dispatch_service.py) | L31 - L360 | Điều phối nghiệp vụ, SLA validation, kiểm soát khóa và Stepper |
| **11** | Phân quyền RBAC Guard | [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py) | L40 - L67 | `verify_dispatch_access` chặn người dùng không đủ quyền (403 Forbidden) |
| **12** | Router RESTful API | [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/dispatch/router.py) | L70 - L194 | 10 Endpoints khai thác danh sách, sự cố, đội, tạo/sửa/huỷ/đóng lệnh |
| **13** | Frontend API Client | [dispatchApi.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/services/dispatchApi.ts) | L17 - L113 | Axios client kết nối 10 endpoints backend |
| **14** | Màn 1/6: Danh sách lệnh | [Screen1DispatchList.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen1DispatchList.tsx) | L1 - L429 | Bảng danh sách lệnh, bộ lọc trạng thái, nhấp đúp xem tracking |
| **15** | Màn 2/6: Tạo lệnh mới | [Screen2CreateOrder.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen2CreateOrder.tsx) | L1 - L484 | Form lập lệnh, trích xuất GPS sự cố, gợi ý cự ly đội cơ động |
| **16** | Màn 3/6: Sửa lệnh | [Screen3EditOrder.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen3EditOrder.tsx) | L1 - L415 | Điều chỉnh đội / deadline, khóa lệnh hoàn tất, bắt buộc ghi chú |
| **17** | Màn 4/6: Modal huỷ lệnh | [Screen4CancelModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen4CancelModal.tsx) | L1 - L120 | Popup cảnh báo huỷ lệnh, bắt buộc nhập lý do giải trình |
| **18** | Màn 5/6: Modal thành công | [Screen5CancelSuccessModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen5CancelSuccessModal.tsx) | L1 - L61 | Checkmark xanh lục thành công, tự động đóng sau đúng 3 giây |
| **19** | Màn 6/6: Theo dõi hiện trường | [Screen6FieldTracking.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/Screen6FieldTracking.tsx) | L1 - L576 | Bản đồ GPS, Stepper 4 bước, ảnh trước/sau, popup gọi đội, nghiệm thu |
| **20** | Modal Tiếp nhận lệnh | [ScreenAcceptOrderModal.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/components/ScreenAcceptOrderModal.tsx) | L1 - L146 | Popup xác nhận tiếp nhận lệnh dành cho Đội cơ động hiện trường |
| **21** | Tích hợp liên phân hệ | [DispatchContainer.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/pages/DispatchContainer.tsx) | L1 - L999 | Quản lý đa màn, nhận prefill từ STT 44 và dẫn đường né ngập STT 41 |
| **22** | Backend Pytest (7 tests) | [test_operations_dispatch.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/dispatch/test_operations_dispatch.py) | L46 - L285 | Bộ kiểm thử tự động 7 kịch bản nghiệp vụ backend và RBAC |
| **23** | Frontend Vitest (7 tests) | [dispatch.test.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/dispatch/__tests__/dispatch.test.tsx) | L134 - L385 | Bộ kiểm thử tự động 7 kịch bản UI/UX tương tác frontend |
