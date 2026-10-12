# 📚 DANH SÁCH CHỨC NĂNG DỰ ÁN (FEATURE_LIST)

> File này là **nguồn dữ liệu** cho `FEATURE_ANALYSIS_RULES.md`.
> Thứ tự đọc của AI: `PROJECT_RULES.md` → `FEATURE_ANALYSIS_RULES.md` → `FEATURE_LIST.md` (file này).

## 🔖 Cách dùng file này

- **Cột Trạng thái** do **con người** cập nhật. AI chỉ được **đề xuất** thay đổi, không tự sửa.
  - `⬜` Chưa làm
  - `🟨` Đang làm
  - `✅` Đã hoàn thành
- **Cột Gợi ý phụ thuộc** chỉ là **gợi ý ban đầu**, suy ra từ tên chức năng. AI **bắt buộc kiểm chứng** lại bằng code, schema và seeder thực tế, không được tin mù quáng.
- Nếu trạng thái ở đây **khác** với code thực tế, AI phải **báo lại** cho người dùng, không tự quyết.

---

## 👤 Nguyễn Thành Đạt

| STT | Chức năng nghiệp vụ | Trạng thái | Gợi ý phụ thuộc (cần kiểm chứng) |
|----|---------------------|:---:|----------------------------------|
| 1 | Đăng ký tài khoản và kích hoạt bằng mã OTP Email | ⬜ | Nền tảng, không phụ thuộc |
| 2 | Đăng nhập đa nền tảng và quản lý phiên làm việc chuẩn OAuth2 JWT Bearer | ⬜ | 1 |
| 3 | Phân quyền vai trò RBAC (Admin, District Manager, Responder, Citizen) kèm ma trận phân quyền động | ⬜ | 1, 2 |
| 4 | Vai trò trong nhóm (Quản trị nhóm, Kiểm duyệt viên, Thành viên) | ⬜ | 2, 3, **16** |
| 5 | Trang cá nhân (Timeline): ảnh bìa, avatar, bài đăng, Green Passport, huy hiệu, lịch sử đóng góp | ⬜ | 2; mềm: 9, 28, 29, 35 |
| 6 | Kết bạn và theo dõi: gửi lời mời, chấp nhận, danh sách bạn bè | ✅ | 1, 2 |
| 7 | Cài đặt tài khoản: đổi chế độ giao diện sáng hoặc tối, đổi ngôn ngữ Việt hoặc Anh | ⬜ | 2 |
| 8 | Bảng tin Geo-Feed theo bán kính với các tab Gần tôi, Quận của tôi, Bạn bè, Nhóm | ⬜ | 2, **9**, 6, 16 |
| 9 | Đăng bài kèm toạ độ, ảnh, video, gắn thẻ bạn bè hoặc đăng vào nhóm | ⬜ | 2, 6, 16 |
| 10 | Eco-Reactions: chọn cảm xúc sinh thái cho bài viết và nhận điểm thưởng | ⬜ | 9, 28, 29 |
| 11 | Tra cứu quy định xử phạt | ⬜ | Gần như độc lập; cần search engine (rule 5) |
| 12 | Tìm kiếm người dùng, nhóm, bài viết, sự kiện, địa điểm | ⬜ | Hạ tầng search engine; các thực thể: 2, 16, 9, 21, 23 |

## 👤 Huỳnh Anh Tú

| STT | Chức năng nghiệp vụ | Trạng thái | Gợi ý phụ thuộc (cần kiểm chứng) |
|----|---------------------|:---:|----------------------------------|
| 13 | Sửa, xoá và ẩn bài viết của chính mình | ⬜ | 9 |
| 14 | Bình luận, trả lời bình luận và chia sẻ bài viết | ⬜ | 9 |
| 15 | Nhắn tin riêng 1-1 và chat nhóm, chat quận thời gian thực | ⬜ | 2, 6, 16 |
| 16 | Tạo nhóm theo quận, theo phường hoặc theo chủ đề | ⬜ | 2, 3 |
| 17 | Sinh nhật bạn bè: nhắc sinh nhật hôm nay trên bảng tin, gửi lời chúc, tặng thiệp xanh kèm điểm thưởng nhỏ | ⬜ | 6, 8, 28, 29 |
| 18 | Tiếp nhận phản ánh đa phương tiện: GPS, ảnh/video + watermark thời gian, giọng nói, chọn loại sự cố | ⬜ | 2, **22** (loại sự cố) |
| 19 | Chế độ Offline-First: lưu nháp, hàng đợi gửi, đồng bộ tự động khi online | ⬜ | 9, 18 |
| 20 | Gây quỹ cộng đồng (Fundraiser): chiến dịch, quyên góp, thanh tiến độ, công khai danh sách và báo cáo sử dụng | ⬜ | 2, 3 |
| 21 | Sự kiện và chiến dịch Chủ Nhật Xanh: tạo sự kiện, Quan tâm, Tham gia, check-in GPS | ⬜ | 2, 3; mềm: 16, 34 |
| 22 | Quản trị CRUD Danh mục Rác thải Đô thị & Cấu hình Quy chuẩn SLA Xử lý | ⬜ | 3 |
| 23 | Quản trị CRUD Mạng lưới Trạm Tái chế & Điểm Tiếp nhận | ⬜ | 3 |
| 24 | AI chat box | ⬜ | 2; mềm: 27 |

## 👤 Bùi Nguyễn Minh Quân

| STT | Chức năng nghiệp vụ | Trạng thái | Gợi ý phụ thuộc (cần kiểm chứng) |
|----|---------------------|:---:|----------------------------------|
| 25 | Thử thách xanh trong tuần (nhiệm vụ nhỏ) nhận điểm thưởng | ⬜ | 2, 28, 29 |
| 26 | Nhật ký kiểm toán Audit Log: ghi lại thao tác quan trọng, lọc, tra cứu, truy vết người thực hiện | ⬜ | 2, 3; **xuyên suốt** nhiều chức năng khác |
| 27 | Thư viện sống xanh: cẩm nang phân loại rác | ⬜ | Gần như độc lập; cần search engine |
| 28 | Cơ chế tích lũy điểm thưởng Công dân Xanh | ⬜ | 2; nền tảng cho nhóm điểm |
| 29 | Ví điểm và lịch sử biến động điểm xanh | ⬜ | 2, **28** |
| 30 | Quản trị CRUD danh mục quà tặng xanh và kho voucher | ⬜ | 3, 29 |
| 31 | Quản lý danh sách quà tặng cá nhân đã đổi | ⬜ | 2, 29, 30 |
| 32 | Bảng xếp hạng vinh danh Top Công dân Xanh (cá nhân, nhóm, quận) | ⬜ | 28, 29, 16 |
| 33 | Bản đồ nhiệt môi trường và khí hậu đa chế độ: AQI, nhiệt độ, điểm số rủi ro | ⬜ | Dữ liệu ngoài; mềm: 18 |
| 34 | Quét mã QR nhận điểm: mỗi mã chỉ dùng một lần mỗi ngày | ⬜ | 2, 28, 29; mềm: 21, 23 |
| 35 | Vòng quay may mắn hằng ngày: mỗi ngày một lượt, trúng điểm hoặc huy hiệu, lịch sử lượt quay | ⬜ | 2, 28, 29 |
| 36 | Hiệu ứng thăng cấp danh hiệu: chúc mừng lên cấp, tự tạo bài lên bảng tin, lộ trình các cấp tiếp theo | ⬜ | 28, 9, 8 |

## 👤 Lê Anh Tuấn

| STT | Chức năng nghiệp vụ | Trạng thái | Gợi ý phụ thuộc (cần kiểm chứng) |
|----|---------------------|:---:|----------------------------------|
| 37 | Trợ lý giọng nói rảnh tay | ⬜ | 2; mềm: 24, 18 |
| 38 | AI phát hiện báo cáo trùng lặp hoặc tương tự | ⬜ | **18** |
| 39 | AI tóm tắt sự cố và gợi ý mức độ ưu tiên xử lý | ⬜ | 18, 22 |
| 40 | Tìm cơ sở thiết yếu gần sự cố | ⬜ | 18; mềm: 23 |
| 41 | Tìm tuyến đường an toàn tránh ngập | ⬜ | 18; mềm: 33 |
| 42 | Dashboard phân tích rủi ro đô thị | ⬜ | 3, 18, 22 |
| 43 | Trung tâm điều phối tác nghiệp và phân công lệnh xử lý hiện trường | ⬜ | 3, 18, 22 |
| 44 | Phân tích điểm nóng + dự báo 7 ngày | ⬜ | 18, 42 |
| 45 | Hệ thống cảnh báo khẩn cấp theo vị trí, Safety Check "Tôi an toàn" gửi cho bạn bè | ⬜ | 2, 3, 6 |
| 46 | Cứu hộ ngập cộng đồng (Flood SOS): yêu cầu cứu hộ kèm vị trí, tình nguyện viên nhận yêu cầu, theo dõi tiến độ | ⬜ | 2, 3; mềm: 45 |
| 47 | Xuất danh sách sự cố ra Excel hoặc PDF theo bộ lọc | ⬜ | 18, 43 |
| 48 | Bảng thống kê hoạt động hệ thống cho Admin: người dùng mới, bài đăng, nhóm mới theo ngày | ⬜ | 3, 9, 16 |

---

## 🧱 Nhóm nền tảng dùng chung (AI cần đặc biệt cẩn thận)

Những phần dưới đây được **nhiều chức năng cùng dùng**. Sửa chúng gần như chắc chắn là **đụng chạm Mức A** (xem `FEATURE_ANALYSIS_RULES.md`).

| Thành phần dùng chung | Chức năng liên quan | Ghi chú |
|-----------------------|---------------------|---------|
| Xác thực & phiên (JWT) | 1, 2 | Mọi chức năng có đăng nhập đều dựa vào đây |
| RBAC & ma trận phân quyền | 3 | Mọi API có phân quyền đều dựa vào đây |
| Search engine (rule 5) | 11, 12, 27 và mọi chức năng có tìm kiếm | Phải đồng bộ index khi thêm/sửa/xoá |
| Điểm xanh (cơ chế + ví) | 28, 29 | Các chức năng "nhận điểm" đều gọi vào đây |
| Audit Log | 26 | Các thao tác quan trọng cần ghi log |
| Bài đăng (Post) | 9 | Bảng tin, trang cá nhân, bình luận, thống kê đều dựa vào đây |
| Báo cáo sự cố (Incident) | 18 | Toàn bộ nhóm AI, dashboard, điều phối, xuất file đều dựa vào đây |
| Nhóm (Group) | 16 | Phân vai nhóm, bảng tin tab Nhóm, xếp hạng nhóm |
