# Báo cáo sửa CRUD Huỳnh Anh Tú – `Tu/fix-bug-ver2.0`

Ngày kiểm tra: 16/11/2026. Phạm vi là 12 chức năng STT 13–24 trong `Rules/FEATURE_LIST.md`.

## Đã sửa

- **13 Bài viết:** kiểm tra quyền, ID, phiên bản cập nhật, xóa/ẩn đồng thời, giữ ảnh khi cập nhật thiếu tệp.
- **14 Bình luận/chia sẻ:** chặn nội dung riêng tư, xóa bình luận kèm phản hồi, tạo bài chia sẻ vào nhóm, chỉ đếm người nhận chat thực tế.
- **15 Chat:** chống tạo hội thoại 1–1 trùng, khóa thứ tự cập nhật, chặn tin rỗng/URL blob, xử lý xóa và đọc lặp.
- **16 Nhóm:** chống tạo trùng, khóa thành viên, ghi audit đúng trường, giải tán nội dung theo thứ tự khóa an toàn.
- **17 Sinh nhật:** khóa hạn mức điểm và chống gửi thiệp/lời chúc trùng.
- **18 Phản ánh:** kiểm tra enum, khoảng trắng, số nguyên, danh mục đang hoạt động, giới hạn và định dạng ảnh thật.
- **19 Offline:** thao tác queue/draft nguyên tử, một tab nhận quyền gửi, giữ bản nháp, đồng bộ MIME và URL tệp đã tải lên.
- **20 Gây quỹ:** biên nhận chờ đối soát ngân hàng, chống gửi/chi tiền trùng, khóa phiên bản chiến dịch, giữ ảnh chứng từ lỗi bằng ảnh thay thế.
- **21 Sự kiện:** kiểm tra số nguyên, thời gian, trang/ID và chống bấm lưu nhiều lần.
- **22 Danh mục rác:** khóa phiên bản, mã trùng kể cả bản đã xóa, lựa chọn hợp lệ và lỗi trang rõ ràng.
- **23 Trạm tái chế:** khóa phiên bản, kiểm tra danh mục/quận, tọa độ và giới hạn dữ liệu.
- **24 AI:** giữ câu trả lời đầu tiên, hủy request cũ, phân trang/xóa lịch sử an toàn.

Thông báo kiểm tra dữ liệu trong phạm vi sửa dùng tiếng Việt có tên trường; ID sai trả 404, dữ liệu sai trả 422, xung đột cập nhật trả 409. Route offline thực tế (`/offline-sync`) cũng đi qua bộ xử lý lỗi này. Đã kiểm thử 8 route DELETE thực tế: tất cả trả 401 khi chưa đăng nhập. Mở URL xóa thành viên bằng GET trả 405 và không truy vấn DB.

## Đối chiếu 14 tình huống

| Tình huống | Xử lý và bằng chứng |
|---|---|
| 1. Xóa bản ghi đã mất | Báo không còn tồn tại; test service và hai tab IndexedDB đạt. |
| 2. Hai tab cập nhật | Yêu cầu phiên bản hiện tại, trả 409 và hướng dẫn tải lại; đã test phiên bản cũ ở bài viết, sự kiện, quỹ, danh mục, trạm. |
| 3. ID sai/không tồn tại | 404; test ID chữ, âm và vượt giới hạn. |
| 4. Form không hợp lệ | Kiểm tra backend và thông báo tiếng Việt; test route/service/schema đạt. |
| 5. Dán văn bản quá dài | Giới hạn độ dài tại schema; test văn bản vượt giới hạn đạt. |
| 6. Khoảng trắng thường/full-width | Chặn trường bắt buộc chỉ có khoảng trắng; test cả `　` đạt. |
| 7. Số full-width/số thập phân | Trường số nguyên kiểm tra nghiêm; UI sự kiện không còn cắt phần thập phân để lưu. |
| 8. Select-option giả | Kiểm tra enum và danh mục đang hoạt động; trạm lấy danh mục thực tế. |
| 9. Bấm lưu liên tục | Chặn submit tức thì; khóa/khóa chống gửi lặp ở các luồng đã sửa. Test sự kiện, quỹ và quyền gửi offline đạt. |
| 10. Tham số page sai | Báo dữ liệu trang sai hoặc trang không tồn tại ở các API phân trang đã rà; test `page=abc` và trang vượt phạm vi. |
| 11. Upload PDF thành ảnh | Kiểm tra nội dung ảnh thật; test PDF/HTML đổi đuôi JPG bị từ chối. |
| 12. Ảnh gốc bị mất | Bổ sung ảnh thay thế cục bộ tại các màn thiếu xử lý; test chứng từ/lightbox và chống lặp lỗi ảnh đạt. |
| 13. Sửa nội dung, giữ ảnh cũ | Không bắt tải lại ảnh; test cập nhật bài viết giữ media cũ đạt. |
| 14. Dán URL xóa sang trình duyệt | Route thực tế yêu cầu xác thực; test DELETE chưa đăng nhập và GET URL xóa thành viên đạt. |

## Kiểm chứng

- Backend: **52/52** kiểm thử hồi quy `test_tu_*_regressions.py` đạt.
- Frontend: **521/521** kiểm thử Vitest đạt.
- Production build Vite đạt, TypeScript không còn lỗi JSX.
- Chrome headless với component thật và API giả lập đã mở 57 màn/trạng thái ở desktop và 390px (114 lượt chụp); log không ghi nhận exception JavaScript trong lượt này. Các nút sự kiện, nhóm, quỹ, danh mục và trạm đã được kiểm lại. Cột thao tác bảng danh mục vẫn cuộn ngang có chủ ý.
- Offline đã kiểm thử bằng hai tab Chrome thật trên IndexedDB: xóa trùng chỉ một tab thành công; tab còn lại nhận lỗi bản ghi không tồn tại.

## Giới hạn cần nói rõ

Các kiểm thử backend dùng service/route thật với DB giả lập hoặc dữ liệu trong bộ nhớ; chưa chạy cạnh tranh trên PostgreSQL thật. Chưa kiểm thử giao dịch ngân hàng thật, GPS/camera/voice thật, WebSocket giữa nhiều tài khoản hoặc dịch vụ AI bên ngoài. Vì vậy không thể cam kết tuyệt đối không còn lỗi trong mọi môi trường; bảng trên không thay thế kiểm thử E2E toàn bộ 14 tình huống trên từng chức năng.

Quyên góp hiện cần quản trị viên đối soát thủ công với ngân hàng; repository chưa có bộ tích hợp xác nhận thanh toán. Không tự thay trạng thái các khoản quyên góp cũ vì thiếu bằng chứng ngân hàng. Nhóm cộng đồng chưa có khóa liên kết với hội thoại chat, nên chưa thể xác định và xóa hội thoại tương ứng khi giải tán; đây là phần chưa đáp ứng đầy đủ đặc tả, không tự suy đoán qua tên nhóm.

## Commit sửa lỗi

| Commit | Nhóm sửa |
|---|---|
| `df944d4b` | Danh mục, trạm: ghi đè, lưu trùng, lựa chọn sai. |
| `ea18154f` | Kiểm tra dữ liệu, ảnh, khóa thao tác và thông báo CRUD. |
| `4fbd4599` | Upload đồng thời, tệp offline, giữ hội thoại AI. |
| `057724ac` | Quỹ: chờ đối soát, chống gửi lặp, khóa phiên bản. |
| `dc3733c5` | Nhóm/chat: audit, xóa lặp, thứ tự khóa. |
| `56010b95` | Offline: thao tác nguyên tử, hai tab và bản nháp. |
| `bebee9b5` | Chia sẻ qua chat, tin rỗng, sinh nhật và route offline. |
| `24293cd4` | Ảnh thay thế, gửi lặp và bố cục điện thoại. |

Các commit trên nằm trên nhánh `Tu/fix-bug-ver2.0`; chưa push.
