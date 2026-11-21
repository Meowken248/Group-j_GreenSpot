### 1. Phân hệ Huỳnh Anh Tú (13 → 24)
> **Tên phân hệ**: **CỘNG ĐỒNG XANH, ĐIỂM THƯỞNG & TƯƠNG TÁC CÔNG DÂN**  
> *(Green Community, Eco-Reward Gamification & Citizen Engagement Portal)*  
> **Định hướng chiến lược**: Ứng dụng cơ chế tạo động lực xã hội (Gamification) nhằm khuyến khích cộng đồng dân cư tích cực tham gia bảo vệ môi trường; tích lũy Điểm Xanh từ các hành vi văn minh đô thị để đổi lấy các phần quà, E-Voucher tiêu dùng xanh; công khai bảng xếp hạng thi đua; kết nối các chiến dịch tình nguyện thực địa và tạo kênh thảo luận, đánh giá chất lượng dịch vụ vệ sinh công ích minh bạch hai chiều.

---

#### Chức năng 13: Cơ chế tích lũy Điểm thưởng Công dân Xanh (Green Points Earning)
- **Mục tiêu nghiệp vụ**: Thiết lập hệ sinh thái khuyến khích xã hội hóa (Gamification) tự động cộng Điểm Thưởng Công Dân Xanh cho các hành vi bảo vệ môi trường chuẩn mực: Báo cáo bãi rác chính xác (+50 điểm), Nghiệm thu dọn sạch hiện trường kèm ảnh đối chứng After (+100 điểm), Đem rác tái chế / pin cũ đến Trạm Xanh (+20 điểm/lần), và Đăng ký tham gia chiến dịch tình nguyện "Chủ nhật xanh" (+150 điểm/chiến dịch); tự động phân cấp bậc hội viên (Hạng Bạc, Hạng Vàng, Hạng Kim Cương) để hưởng các đặc quyền xã hội và quà tặng tương ứng.
- **Tác nhân (Actor)**: Công dân đô thị, Cán bộ nghiệm thu hiện trường, Hệ thống tính điểm tự động.
- **Tiền điều kiện**: Công dân đã kích hoạt tài khoản GreenSpot; sự cố môi trường hoặc hành động sống xanh đã được hệ thống/cán bộ xác nhận hợp lệ.
- **Hậu điều kiện**: Hệ thống cộng điểm thành công vào ví cá nhân; tạo bản ghi giao dịch mới trong bảng `reward_transactions` với loại `EARNED`; cập nhật tổng điểm tích lũy và tự động xét thăng hạng hội viên trong bảng `users`.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Khi một sự cố ô nhiễm do công dân phản ánh (VD: Hồ sơ `#RC-8492`) được Đội vệ sinh môi trường hoàn tất dọn dẹp và có ảnh đối chứng After, cán bộ quản lý bấm duyệt nghiệm thu trên hệ thống.
  2. Hệ thống phát sinh sự kiện `INCIDENT_RESOLVED` và tự động kích hoạt thuật toán tính điểm thưởng: Xác định công dân báo cáo đủ điều kiện nhận `+100 Điểm Thưởng Công Dân Xanh`.
  3. Màn hình của công dân hiển thị hộp thoại xác nhận nổi bật (Modal Popup): *"Báo cáo #RC-8492 đã nghiệm thu hoàn thành! Bạn có muốn nhận ngay +100 Điểm Thưởng Công Dân Xanh vào ví cá nhân?"*.
  4. Công dân bấm nút "Nhận điểm thưởng", giao diện gửi yêu cầu HTTP POST tới API `/api/v1/rewards/claim`.
  5. Máy chủ thực thi giao dịch cơ sở dữ liệu an toàn (ACID Transaction): Cộng 100 điểm vào trường `green_points` trong bảng `users`, ghi nhận dòng lịch sử trong bảng `reward_transactions`, đồng thời kiểm tra điều kiện nâng hạng thành viên (Hạng Vàng: từ 1.000 điểm trở lên).
  6. Hệ thống hiển thị hiệu ứng chúc mừng (Toast Notification) và cập nhật số dư điểm mới trên thanh điều hướng Header.
- **Luồng thay thế (Alternative Flow)**:
  - Tích lũy điểm tự động tại Trạm Xanh: Khi công dân mang rác tái chế (vỏ chai, pin cũ) tới trạm thu gom, nhân viên trạm quét mã QR định danh của công dân; hệ thống lập tức cộng trực tiếp `+20 Điểm Xanh` mà không cần qua khâu xét duyệt thủ công.
- **Luồng ngoại lệ (Exception Flow)**:
  - Sự cố phản ánh bị phát hiện là tin giả hoặc ảnh cắt ghép: Hệ thống hủy quyền nhận thưởng, không cộng điểm và gửi cảnh báo nhắc nhở tuân thủ quy chế cộng đồng.
- **Mô tả thành phần giao diện (UI Specification)**:
  - Giao diện gồm thẻ công bố chính sách điểm thưởng (Green Rewards Policy); Thẻ phân hạng hội viên (Hạng Vàng - 1.450 Điểm Xanh); Lưới 4 thẻ nhiệm vụ hành động xanh tương ứng từng định mức điểm (+50đ, +100đ, +20đ, +150đ); Hộp thoại Modal nổi ở trung tâm mời công dân bấm nhận thưởng tức thì.

![Hình 4.13: Giao diện phác thảo Cơ chế tích lũy Điểm thưởng Công dân Xanh](docs/images/tu/hinh_4_13.png)  
*Hình 4.13: Giao diện phác thảo Cơ chế tích lũy Điểm thưởng Công dân Xanh*

*Bảng 1: Đặc tả thành phần giao diện chức năng 13 (Cơ chế tích lũy Điểm thưởng Công dân Xanh)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `REW_TXT_POLICY` | Thẻ chính sách tích điểm | Information Card | Nêu rõ thang điểm chuẩn: +50đ báo cáo, +100đ nghiệm thu, +20đ tái chế, +150đ chiến dịch. |
| `REW_BADGE_TIER` | Huy hiệu hạng hội viên | Status Badge | Hiển thị thứ hạng hiện tại (Hạng Vàng: 1.450 Điểm Xanh) và quyền lợi đổi quà ưu tiên. |
| `REW_CARD_TASK_1` | Thẻ nhiệm vụ phản ánh | Action Card | Hướng dẫn gửi báo cáo rác định vị GPS kèm ảnh chụp thật để nhận +50 điểm. |
| `REW_CARD_TASK_2` | Thẻ nhiệm vụ nghiệm thu | Action Card | Hướng dẫn kiểm tra bãi rác dọn sạch kèm ảnh đối chứng After để nhận +100 điểm. |
| `REW_MODAL_CLAIM` | Hộp thoại xác nhận nhận thưởng | Dialog / Modal Popup | Thông báo sự cố #RC-8492 hoàn thành và hỏi công dân có muốn nhận thưởng vào ví. |
| `REW_BTN_CONFIRM_CLAIM` | Nút nhận điểm thưởng | Primary Button (Dark) | Kích hoạt giao dịch cộng điểm vào ví cá nhân và cập nhật số dư. |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 2: Quy tắc kiểm tra và thông báo lỗi chức năng 13 (Cơ chế tích lũy Điểm thưởng Công dân Xanh)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Nhận thưởng trùng lặp | Một sự cố chỉ được kích hoạt nhận điểm 1 lần duy nhất | `REW_001`: Sự cố này đã được nhận điểm thưởng trước đó. |
| Sự cố chưa đủ điều kiện | Trạng thái sự cố chưa chuyển sang `RESOLVED` | `REW_002`: Báo cáo rác chưa hoàn tất nghiệm thu dọn dẹp sạch sẽ. |
| Tài khoản bị tạm khóa ví | Tài khoản đang trong thời gian xử lý vi phạm spam | `REW_003`: Tính năng tích điểm tạm thời bị đóng băng do vi phạm tiêu chuẩn cộng đồng. |

---

#### Chức năng 14: Xem số dư ví điểm và Lịch sử biến động điểm xanh (Points Balance & History)
- **Mục tiêu nghiệp vụ**: Cung cấp sổ cái điểm thưởng điện tử minh bạch, chi tiết cho mỗi công dân: Theo dõi số dư khả dụng (`1.450 Điểm Xanh`), điểm tích lũy trọn đời (`2.800 Điểm`), vị trí thi đua (`Top 5% công dân tích cực Quận 1`); tra cứu chi tiết từng dòng biến động điểm (cộng thưởng, trừ đổi quà) kèm thời gian thực; hỗ trợ xuất sao kê ví điểm định dạng PDF có chữ ký số điện tử để công dân sử dụng đối chiếu hoặc tham gia các chương trình tuyên dương khu phố.
- **Tác nhân (Actor)**: Công dân sở hữu tài khoản, Hệ thống báo cáo.
- **Tiền điều kiện**: Công dân đã đăng nhập vào cổng thông tin GreenSpot.
- **Hậu điều kiện**: Dữ liệu ví điểm và bảng lịch sử giao dịch được kết xuất đầy đủ, hỗ trợ bộ lọc và tải tệp sao kê PDF về thiết bị.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Công dân truy cập vào mục "Điểm xanh" trên thanh menu bên trái, chọn tab "Ví Điểm & Lịch Sử Biến Động".
  2. Hệ thống truy vấn CSDL từ bảng `users` và `reward_transactions`, tải về số dư khả dụng (`1.450 ĐIỂM XANH`), hạng thành viên (`Hạng Vàng`), điểm trọn đời (`2.800 Điểm`).
  3. Bảng dữ liệu hiển thị danh sách các giao dịch được phân màu trực quan: Màu xanh lá cây cho giao dịch cộng (+100đ nghiệm thu bãi rác 128 Lê Lợi #RC-8492, +50đ báo cáo rác tự phát) và màu đỏ cho giao dịch trừ (-250đ đổi E-Voucher mua sắm Co.opmart #VCH-992).
  4. Công dân có thể chọn các bộ lọc nhanh: `[x] Tất cả giao dịch`, `[ ] Điểm cộng tích lũy`, `[ ] Điểm đã đổi quà`.
  5. Công dân bấm nút "Xuất sao kê ví điểm (PDF)" ở góc dưới bảng.
  6. Hệ thống hiển thị Modal xác nhận: *"Xác nhận trích xuất sao kê lịch sử biến động điểm thưởng Công Dân Xanh 30 ngày qua định dạng PDF?"* -> Công dân bấm "Tải về sao kê" để lưu tệp về máy tính.
- **Luồng thay thế (Alternative Flow)**:
  - Tra cứu biến động theo quý: Công dân chọn bộ lọc thời gian 3 tháng hoặc 6 tháng gần nhất để kiểm tra tổng điểm đóng góp cho địa bàn cư trú.
- **Luồng ngoại lệ (Exception Flow)**:
  - Tài khoản mới chưa có lịch sử biến động: Hệ thống hiển thị khung trạng thái rỗng (Empty State) kèm thông điệp gợi ý: "Bạn chưa có giao dịch điểm nào. Hãy tham gia gửi báo cáo rác để nhận điểm thưởng ngay!".
- **Mô tả thành phần giao diện (UI Specification)**:
  - Thẻ thông tin chủ tài khoản và số dư ví điểm lớn viền đen trang trọng; Nhãn phân hạng hội viên Hạng Vàng; Nhóm checkbox lọc loại giao dịch; Bảng lịch sử giao dịch chia theo mốc ngày giờ cụ thể; Nút "Xuất sao kê ví điểm (PDF)" và Modal xác nhận trích xuất.

![Hình 4.14: Giao diện phác thảo Xem số dư ví điểm và Lịch sử biến động điểm xanh](docs/images/tu/hinh_4_14.png)  
*Hình 4.14: Giao diện phác thảo Xem số dư ví điểm và Lịch sử biến động điểm xanh*

*Bảng 3: Đặc tả thành phần giao diện chức năng 14 (Xem số dư ví điểm và Lịch sử biến động)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `WAL_TXT_BALANCE` | Ô hiển thị số dư ví | Highlight Text Box | Thể hiện số dư khả dụng thực tế: 1.450 ĐIỂM XANH. |
| `WAL_BADGE_TIER` | Thông tin hạng thành viên | Badge Label | Nêu rõ phân hạng Hạng Vàng (Top 5% Quận 1) và tổng điểm tích lũy trọn đời 2.800đ. |
| `WAL_FLT_TYPE` | Bộ lọc loại giao dịch | Checkbox Group | Tùy chọn lọc: Tất cả giao dịch / Chỉ điểm cộng / Chỉ điểm trừ đã đổi quà. |
| `WAL_TBL_TRANSACTIONS` | Bảng nhật ký biến động điểm | Data List Table | Liệt kê chi tiết từng giao dịch kèm số điểm (+/-), mã sự cố, nội dung và thời gian. |
| `WAL_BTN_EXPORT_PDF` | Nút xuất sao kê PDF | Primary Button (Black) | Kích hoạt luồng xuất tệp sao kê điện tử có đóng dấu bảo chứng. |
| `WAL_MODAL_EXPORT` | Hộp thoại xác nhận tải sao kê | Dialog Modal | Xác nhận trích xuất báo cáo biến động điểm 30 ngày qua dạng tệp PDF. |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 4: Quy tắc kiểm tra và thông báo lỗi chức năng 14 (Xem số dư ví điểm và Lịch sử biến động)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Trích xuất sao kê kỳ rỗng | Không có bất kỳ giao dịch nào trong khoảng thời gian chọn | `WAL_001`: Không có dữ liệu biến động điểm trong khoảng thời gian yêu cầu. |
| Lỗi tạo tệp PDF | Lỗi quá tải bộ xử lý render tài liệu máy chủ | `WAL_002`: Hệ thống tạm thời chưa thể tạo tệp PDF sao kê. Vui lòng thử lại sau giây lát. |
| Khoảng thời gian quá dài | Giới hạn trích xuất tối đa 12 tháng liên tục | `WAL_003`: Khoảng thời gian tra cứu sao kê tối đa là 1 năm cho mỗi lần xuất. |

---

#### Chức năng 15: Danh mục quà tặng xanh và Vật phẩm quy đổi (Eco-Reward Catalog)
- **Mục tiêu nghiệp vụ**: Thiết lập danh mục các vật phẩm quà tặng thân thiện môi trường và phiếu mua sắm xanh được tài trợ bởi các doanh nghiệp thực hành ESG và Quỹ Bảo vệ Môi trường: Bình giữ nhiệt Inox Eco 500ml (300 điểm), Voucher mua sắm Co.opmart 50.000đ (250 điểm), Chậu cây xanh Lưỡi Hổ để bàn thanh lọc không khí (200 điểm); phân loại quà theo nhóm vật dụng, voucher, cây xanh; hiển thị số lượng tồn kho trực tiếp và đối chiếu với số dư ví của công dân để hướng dẫn quy đổi thuận tiện.
- **Tác nhân (Actor)**: Công dân đô thị, Doanh nghiệp đối tác tài trợ quà tặng, Ban quản lý kho quà GreenSpot.
- **Tiền điều kiện**: Các món quà tặng được kích hoạt trạng thái khả dụng trong bảng `citizen_rewards`.
- **Hậu điều kiện**: Công dân duyệt xem danh mục, nắm bắt tồn kho và chọn được vật phẩm mong muốn để chuyển sang màn hình đổi điểm.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Công dân bấm vào mục "Danh Mục Quà Tặng" trong phân hệ Điểm xanh (`Màn hình 39: Danh mục quà tặng xanh và Vật phẩm quy đổi`).
  2. Hệ thống tải dữ liệu các sản phẩm quà tặng từ bảng `citizen_rewards`, đối chiếu với số dư hiện tại của công dân và hiển thị thông điệp đầu trang: *"Số dư hiện tại của bạn: 1.450 Điểm Xanh (Đủ điều kiện đổi toàn bộ các phần quà trong danh mục)"*.
  3. Công dân sử dụng bộ lọc nhóm quà tặng: `[x] Vật dụng sống xanh` (Bình giữ nhiệt, Túi vải), `[ ] Voucher tiêu dùng xanh` (Phiếu mua sắm siêu thị), `[ ] Cây xanh đô thị` (Cây lọc không khí).
  4. Danh sách các phần quà hiển thị dạng lưới thẻ trực quan (Grid Cards):
     - *Bình giữ nhiệt Inox Eco 500ml*: Giảm thải chai nhựa • Còn 45 cái • `300 ĐIỂM`.
     - *Voucher 50.000đ Co.opmart*: Áp dụng toàn quốc • E-Voucher • `250 ĐIỂM`.
     - *Chậu cây Lưỡi Hổ để bàn*: Lọc không khí trong nhà • Còn 18 cây • `200 ĐIỂM`.
  5. Công dân bấm chọn vào một phần quà (VD: Bình giữ nhiệt Inox Eco).
  6. Hệ thống hiển thị Modal chi tiết quà tặng: *"Vật phẩm: Bình giữ nhiệt Inox Eco 500ml (300 Điểm Xanh). Bạn có muốn mở màn hình đổi vật phẩm này?"* kèm hai nút hành động: "Đổi quà ngay" và "Xem thêm".
- **Luồng thay thế (Alternative Flow)**:
  - Lọc theo tiêu chí "Quà đủ điểm đổi ngay": Tự động ẩn các món quà có giá trị điểm vượt quá số dư hiện có trong ví công dân để tiết kiệm thời gian tìm kiếm.
- **Luồng ngoại lệ (Exception Flow)**:
  - Vật phẩm đã hết số lượng tồn kho (Stock = 0): Hệ thống hiển thị nhãn màu xám "Tạm hết hàng", làm mờ thẻ sản phẩm và vô hiệu hóa nút đổi quà.
- **Mô tả thành phần giao diện (UI Specification)**:
  - Khung giới thiệu chính sách tài trợ 100% từ doanh nghiệp ESG; Hộp kiểm lọc nhóm quà tặng; Lưới thẻ quà tặng kèm số điểm viền đen đậm nổi bật; Modal chi tiết hiển thị ảnh, thông số tồn kho và nút chuyển hướng đổi quà ngay.

![Hình 4.15: Giao diện phác thảo Danh mục quà tặng xanh và Vật phẩm quy đổi](docs/images/tu/hinh_4_15.png)  
*Hình 4.15: Giao diện phác thảo Danh mục quà tặng xanh và Vật phẩm quy đổi*

*Bảng 5: Đặc tả thành phần giao diện chức năng 15 (Danh mục quà tặng xanh và Vật phẩm quy đổi)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `CAT_TXT_SPONSOR` | Khung thông tin tài trợ ESG | Info Banner | Giới thiệu nguồn gốc quà tặng tài trợ bởi doanh nghiệp xanh và Quỹ Môi trường. |
| `CAT_FLT_GROUP` | Bộ lọc nhóm quà tặng | Checkbox Filter | Phân loại: Vật dụng sống xanh, Voucher tiêu dùng xanh, Cây xanh đô thị. |
| `CAT_CARD_ITEM` | Thẻ sản phẩm quà tặng | Product Card | Hiển thị tên quà, ảnh minh họa, công dụng giảm rác thải và số lượng tồn kho. |
| `CAT_BADGE_POINTS` | Nhãn điểm quy đổi | Badge Number (Dark) | Thể hiện mức điểm cần để đổi (VD: 300 ĐIỂM, 250 ĐIỂM, 200 ĐIỂM). |
| `CAT_MODAL_DETAIL` | Hộp thoại chi tiết quà | Modal Dialog | Cửa sổ bật lên tóm tắt thông tin vật phẩm và hỏi xác nhận mở màn hình đổi thưởng. |
| `CAT_BTN_REDEEM_NOW` | Nút đổi quà ngay | Primary Button | Chuyển hướng người dùng sang màn hình thực hiện đổi điểm (Chức năng 16). |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 6: Quy tắc kiểm tra và thông báo lỗi chức năng 15 (Danh mục quà tặng xanh và Vật phẩm quy đổi)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Vật phẩm đã hết tồn kho | Thuộc tính `stock_quantity <= 0` | `CAT_001`: Phần quà này hiện đã hết số lượng tồn kho. Vui lòng chọn quà tặng khác. |
| Số dư ví không đủ | Số dư ví công dân < điểm quy đổi của món quà | `CAT_002`: Số dư điểm xanh của bạn chưa đủ để đổi vật phẩm này. |
| Danh mục đang bảo trì | Kho quà đang trong kỳ kiểm kê định kỳ | `CAT_003`: Hệ thống kho quà đang tạm thời kiểm kê. Vui lòng quay lại sau. |

---

#### Chức năng 16: Thực hiện đổi điểm lấy quà tặng / Voucher (Reward Redemption Process)
- **Mục tiêu nghiệp vụ**: Thực thi quy trình giao dịch trừ điểm và cấp phát mã phiếu quà tặng điện tử (E-Voucher QR Code hoặc Phiếu nhận quà hiện vật) theo cơ chế giao dịch phân tán đảm bảo an toàn tuyệt đối (ACID Transaction): Tự động tính toán số dư trước và sau khi đổi, kiểm tra điều kiện tồn kho tức thời (Real-time Stock Locking), trừ chính xác điểm thưởng trong ví công dân, sinh mã định danh duy nhất (Unique Voucher Code) có thời hạn sử dụng 30 ngày và gửi xác nhận qua hòm thư ứng dụng kèm tin nhắn SMS.
- **Tác nhân (Actor)**: Công dân đổi thưởng, Hệ thống cổng thanh toán điểm thưởng GreenSpot.
- **Tiền điều kiện**: Công dân có số dư ví điểm >= giá trị quy đổi của phần quà; sản phẩm còn số lượng khả dụng trong kho.
- **Hậu điều kiện**: Số dư điểm trong ví bị trừ chính xác; bản ghi giao dịch đổi quà được tạo trong bảng `reward_transactions` với loại `REDEEMED`; mã phiếu quà tặng được kích hoạt trong ví quà cá nhân.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Từ Modal chi tiết quà tặng, công dân bấm "Đổi quà ngay" (VD: Voucher mua sắm 50.000đ Siêu thị Co.opmart - Chi phí: 250 Điểm Xanh).
  2. Màn hình chuyển sang giao diện xác nhận thanh toán (`Màn hình 40: Thực hiện đổi điểm lấy quà tặng / Voucher`).
  3. Hệ thống hiển thị bảng cân đối tài chính chi tiết:
     - *Vật phẩm quy đổi: Voucher mua sắm 50.000đ Siêu thị Co.opmart (Áp dụng hàng tiêu dùng xanh)*.
     - *Chi phí điểm thưởng: 250 Điểm Xanh / voucher • Số lượng đổi: 1 voucher*.
     - *Số dư ví: Hiện có: 1.450 điểm → Sau khi đổi: 1.200 điểm (Đủ điều kiện thanh toán)*.
  4. Khung hướng dẫn thông tin nhận quà nêu rõ: Hình thức mã điện tử E-Voucher kèm mã QR quét tại quầy thu ngân siêu thị; Thời hạn sử dụng 30 ngày kể từ thời điểm đổi; Mã gửi trực tiếp vào mục "Quà tặng của tôi" và tin nhắn SMS.
  5. Công dân bấm nút nổi bật "XÁC NHẬN ĐỔI 250 ĐIỂM".
  6. Hệ thống bật hộp thoại Modal cảnh báo giao dịch: *"Xác nhận trừ 250 Điểm Xanh trong ví để nhận Voucher Co.opmart 50.000đ? Thao tác không thể hoàn tác."*.
  7. Công dân bấm nút "Xác nhận đổi". Hệ thống khóa tạm thời bản ghi sản phẩm (Row Lock), trừ 250 điểm, giảm tồn kho đi 1, sinh mã nhận quà ngẫu nhiên `ECO-8849-COOP` và hiển thị thông báo thành công.
- **Luồng thay thế (Alternative Flow)**:
  - Hủy bỏ giao dịch: Công dân bấm nút "Hủy giao dịch" hoặc "Hủy" trên Modal, hệ thống giải phóng giao dịch và quay về danh mục quà tặng mà không trừ bất kỳ điểm nào.
- **Luồng ngoại lệ (Exception Flow)**:
  - Tranh chấp tồn kho tại thời điểm xác nhận (Race condition): Nếu nhiều người cùng bấm đổi món quà cuối cùng tại cùng một thời điểm, hệ thống tự động hoàn nguyên (Rollback) giao dịch của người đến sau và hiển thị thông báo: "Sản phẩm vừa hết hàng trước khi giao dịch hoàn tất. Điểm của bạn vẫn được bảo toàn nguyên vẹn".
- **Mô tả thành phần giao diện (UI Specification)**:
  - Khung tóm tắt vật phẩm và biến động số dư trước/sau đổi; Khung quy chế sử dụng voucher; Thanh nút điều khiển hành động kép (Hủy giao dịch / Xác nhận đổi điểm); Hộp thoại Modal cảnh báo giao dịch bất biến.

![Hình 4.16: Giao diện phác thảo Thực hiện đổi điểm lấy quà tặng / Voucher](docs/images/tu/hinh_4_16.png)  
*Hình 4.16: Giao diện phác thảo Thực hiện đổi điểm lấy quà tặng / Voucher*

*Bảng 7: Đặc tả thành phần giao diện chức năng 16 (Thực hiện đổi điểm lấy quà tặng / Voucher)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `RDM_TXT_ITEM_INFO` | Khung thông tin vật phẩm quy đổi | Summary Card | Nêu rõ tên quà, giá trị tiền mặt (50.000đ) và định mức tiêu hao điểm (250đ). |
| `RDM_TXT_CALC_BALANCE` | Bảng tính đối soát số dư | Stat Box | So sánh số dư hiện có (1.450đ) và số dư sau khi trừ (1.200đ) minh bạch. |
| `RDM_BOX_POLICY` | Khung hướng dẫn sử dụng voucher | Alert Information Box | Hướng dẫn quét mã QR tại thu ngân, hạn dùng 30 ngày và kênh nhận SMS. |
| `RDM_BTN_CANCEL` | Nút hủy giao dịch | Outline Secondary Button | Hủy bỏ quy trình đổi điểm và quay về danh mục quà tặng. |
| `RDM_BTN_CONFIRM` | Nút xác nhận đổi điểm | Primary Action Button | Kích hoạt mở Modal cảnh báo giao dịch trừ điểm cuối cùng. |
| `RDM_MODAL_WARN` | Hộp thoại cảnh báo trừ điểm | Confirm Modal Dialog | Cảnh báo thao tác trừ 250 điểm là bất biến và yêu cầu người dùng xác thực. |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 8: Quy tắc kiểm tra và thông báo lỗi chức năng 16 (Thực hiện đổi điểm lấy quà tặng / Voucher)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Số dư điểm không đủ trừ | `user_points < item_price` | `RDM_001`: Số dư điểm xanh của bạn không đủ để thực hiện giao dịch này. |
| Quà tặng vừa hết hàng | `stock_quantity == 0` tại thời điểm commit | `RDM_002`: Rất tiếc, sản phẩm đã hết hàng ngay trước khi bạn hoàn tất đổi quà. |
| Giới hạn đổi trong ngày | Vượt quá định mức tối đa 3 lần đổi quà / 24 giờ | `RDM_003`: Bạn đã đạt giới hạn tối đa 3 lượt đổi quà trong một ngày. Vui lòng quay lại ngày mai. |

---

#### Chức năng 17: Quản lý danh sách quà tặng cá nhân đã đổi (My Redeemed Rewards Tracking)
- **Mục tiêu nghiệp vụ**: Cung cấp ví quà tặng điện tử cá nhân (My Rewards Wallet) lưu trữ tập trung toàn bộ các voucher, mã giảm giá và phiếu nhận quà hiện vật công dân đã đổi thưởng thành công; cho phép hiển thị mã QR phóng to để quét trực tiếp tại quầy thu ngân siêu thị đối tác hoặc xuất trình tại bộ phận một cửa UBND Phường để nhận hiện vật; quản lý vòng đời trạng thái của từng món quà (Khả dụng, Đã sử dụng, Đã nhận hiện vật, Quá hạn).
- **Tác nhân (Actor)**: Công dân sở hữu voucher, Thu ngân siêu thị đối tác, Cán bộ tiếp nhận một cửa UBND Phường.
- **Tiền điều kiện**: Công dân đã thực hiện đổi thành công ít nhất một phần quà trong hệ thống.
- **Hậu điều kiện**: Hiển thị danh sách các món quà đã đổi; hiển thị mã QR bảo mật; cập nhật trạng thái sang "Đã sử dụng" sau khi thanh toán.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Công dân mở phân hệ Điểm xanh -> chọn tab "Quà Tặng Của Tôi" (`Màn hình 41: Quản lý danh sách quà tặng cá nhân đã đổi`).
  2. Hệ thống tải danh sách các mã quà tặng thuộc quyền sở hữu của công dân kèm bộ lọc trạng thái: `[x] Khả dụng (Chưa dùng)`, `[ ] Đã sử dụng`, `[ ] Đã nhận hiện vật`.
  3. Danh sách thẻ quà hiển thị chi tiết:
     - Thẻ 1: *Voucher Co.opmart 50.000đ (#VCH-992)* • Hạn dùng: 15/10/2026 • Mã: `ECO-8849-COOP` kèm nút "MỞ MÃ QR".
     - Thẻ 2: *Bình giữ nhiệt Inox Eco 500ml (#GFT-042)* • Nơi nhận: Bộ phận Một cửa UBND Phường Bến Nghé kèm nút "Xem địa chỉ nhận".
  4. Khi đi siêu thị mua sắm, công dân bấm nút "MỞ MÃ QR" tại thẻ Voucher Co.opmart.
  5. Hệ thống hiển thị hộp thoại Modal phóng to mã QR kèm thông tin hướng dẫn: *"Mã Voucher ECO-8849-COOP: Quét mã QR tại quầy thanh toán Co.opmart để được giảm 50.000đ."*.
  6. Thu ngân quét mã bằng máy quét POS, hệ thống xác thực mã hợp lệ và tự động chuyển trạng thái của voucher sang `Đã sử dụng` (Used).
- **Luồng thay thế (Alternative Flow)**:
  - Nhận quà tặng hiện vật tại UBND Phường: Công dân mang mã phiếu nhận quà `#GFT-042` đến bộ phận một cửa UBND Phường xuất trình cho cán bộ kiểm tra; sau khi cán bộ bàn giao bình giữ nhiệt, hệ thống cập nhật trạng thái sang "Đã nhận hiện vật".
- **Luồng ngoại lệ (Exception Flow)**:
  - Voucher hết hạn sử dụng (Quá 30 ngày): Hệ thống tự động gắn nhãn màu xám "Đã hết hạn" và vô hiệu hóa nút mở mã QR.
- **Mô tả thành phần giao diện (UI Specification)**:
  - Thẻ hướng dẫn sử dụng mã voucher tại quầy thu ngân hoặc UBND Phường; Thanh lọc trạng thái 3 cấp độ; Danh sách thẻ quà tặng bo góc; Nút bật Modal mã QR phóng to; Nút bấm đánh dấu "Đã dùng voucher" và nút "Đóng".

![Hình 4.17: Giao diện phác thảo Quản lý danh sách quà tặng cá nhân đã đổi](docs/images/tu/hinh_4_17.png)  
*Hình 4.17: Giao diện phác thảo Quản lý danh sách quà tặng cá nhân đã đổi*

*Bảng 9: Đặc tả thành phần giao diện chức năng 17 (Quản lý danh sách quà tặng cá nhân đã đổi)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `WAL_FLT_STATUS` | Bộ lọc trạng thái quà tặng | Radio / Checkbox Filter | Lọc theo: Khả dụng (Chưa dùng) / Đã sử dụng / Đã nhận hiện vật. |
| `WAL_CARD_REWARD` | Thẻ quà tặng cá nhân | Card Item Container | Hiển thị tên phần quà, mã định danh, hạn dùng và địa điểm nhận hiện vật. |
| `WAL_BTN_SHOW_QR` | Nút mở mã QR | Action Button (Dark) | Kích hoạt hiển thị cửa sổ Modal chứa mã QR thanh toán phóng to. |
| `WAL_MODAL_QR` | Hộp thoại hiển thị mã QR | Modal Dialog Popup | Cửa sổ hiển thị mã QR, mã chữ số và hướng dẫn cho nhân viên thu ngân. |
| `WAL_IMG_QR_CODE` | Hình ảnh mã QR bảo mật | QR Code Canvas | Mã hóa chuỗi token xác thực E-Voucher quét tại quầy tính tiền. |
| `WAL_BTN_MARK_USED` | Nút đánh dấu đã dùng | Secondary Button | Hỗ trợ người dùng tự đánh dấu voucher nếu đã sử dụng offline. |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 10: Quy tắc kiểm tra và thông báo lỗi chức năng 17 (Quản lý danh sách quà tặng cá nhân đã đổi)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Voucher đã quá hạn dùng | Thời điểm quét `current_time > expiry_date` | `REW_VCH_001`: Phiếu quà tặng này đã hết hạn sử dụng vào ngày 15/10/2026. |
| Mã voucher đã quét trước đó | Trạng thái bản ghi `status == 'USED'` | `REW_VCH_002`: Mã voucher này đã được sử dụng trước đó tại siêu thị. |
| Sai đơn vị đổi quà hiện vật | Xuất trình mã nhận hiện vật sai địa bàn Phường | `REW_VCH_003`: Vui lòng xuất trình mã nhận quà đúng tại UBND Phường được chỉ định. |

---

#### Chức năng 18: Bảng xếp hạng vinh danh Top Công dân Xanh (Green Citizen Leaderboard)
- **Mục tiêu nghiệp vụ**: Lan tỏa tinh thần trách nhiệm xã hội và xây dựng phong trào thi đua sống xanh trong cộng đồng cư dân đô thị: Vinh danh Top 10 cá nhân tiêu biểu có đóng góp xuất sắc nhất cho môi trường trong tháng/quý; hiển thị thứ hạng cá nhân (`Hạng 14 toàn Quận - 1.450 Điểm`), chỉ rõ khoảng cách điểm số để lọt vào Top 10 nhận kỷ niệm chương; tích hợp cơ chế đăng ký xét tặng Kỷ niệm chương và Bằng khen Công Dân Xanh Tiêu Biểu của UBND Quận/Thành phố.
- **Tác nhân (Actor)**: Toàn thể công dân, Hội đồng Thi đua - Khen thưởng địa phương, Ban chỉ đạo công tác môi trường.
- **Tiền điều kiện**: Dữ liệu điểm tích lũy của các công dân trong kỳ báo cáo được tổng hợp đầy đủ trong cơ sở dữ liệu.
- **Hậu điều kiện**: Hiển thị bảng xếp hạng danh dự minh bạch; công dân có thứ hạng cao được ghi nhận vào danh sách xét tặng kỷ niệm chương.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Công dân bấm vào mục "Bảng Xếp Hạng" trên thanh điều hướng (`Màn hình 42: Bảng xếp hạng vinh danh Top Công dân Xanh`).
  2. Đầu trang hiển thị thông số thành tích cá nhân: *Bảng xếp hạng Tháng 09/2026: Vinh danh các cá nhân có đóng góp xuất sắc nhất cho môi trường đô thị • Vị trí của bạn: Hạng 14 toàn Quận (1.450 Điểm) • Còn 150 điểm để lọt vào Top 10 nhận Kỷ niệm chương*.
  3. Người dùng chọn phạm vi xem bảng: `[x] Toàn Quận 1`, `[ ] Cấp Phường`, `[ ] Toàn Thành phố`.
  4. Hệ thống hiển thị danh sách vinh danh có huy hiệu danh dự trang trọng:
     - Hạng 1: Nguyễn Văn An (Phường Bến Thành) - `4.850 ĐIỂM` (Huy hiệu Vàng).
     - Hạng 2: Trần Thị Mai (Phường Tân Định) - `4.200 ĐIỂM` (Huy hiệu Bạc).
     - Hạng 3: Lê Hoàng Nam (Phường Cầu Kho) - `3.950 ĐIỂM` (Huy hiệu Đồng).
     - Dòng cố định đánh dấu vị trí cá nhân: `Hạng 14: BẠN (Nguyễn Văn A) - 1.450 ĐIỂM`.
  5. Hệ thống hiển thị hộp thoại Modal vinh danh: *"Chúc mừng bạn đã đạt Hạng 14! Bạn có muốn đăng ký nhận Kỷ niệm chương Công Dân Xanh Tiêu Biểu quý này?"*.
  6. Công dân bấm nút "Đăng ký vinh danh", hệ thống lưu hồ sơ ứng cử khen thưởng gửi tới Ban Thi đua Quận xét duyệt tại Ngày hội Môi trường Đô thị.
- **Luồng thay thế (Alternative Flow)**:
  - Xem bảng xếp hạng theo tổ chức / trường học: Cho phép chuyển đổi xem bảng thi đua giữa các trường THPT hoặc các khu phố văn hóa trên địa bàn.
- **Luồng ngoại lệ (Exception Flow)**:
  - Tài khoản có dấu hiệu gian lận điểm số: Tự động loại khỏi danh sách xếp hạng và chuyển sang trạng thái chờ thanh tra kiểm toán.
- **Mô tả thành phần giao diện (UI Specification)**:
  - Khung tóm tắt thứ hạng cá nhân; Bộ lọc phạm vi địa bàn; Bảng danh sách vinh danh có icon cúp huy chương Vàng/Bạc/Đồng; Dòng highlight vị trí bản thân; Hộp thoại Modal đăng ký xét tặng kỷ niệm chương.

![Hình 4.18: Giao diện phác thảo Bảng xếp hạng vinh danh Top Công dân Xanh](docs/images/tu/hinh_4_18.png)  
*Hình 4.18: Giao diện phác thảo Bảng xếp hạng vinh danh Top Công dân Xanh*

*Bảng 11: Đặc tả thành phần giao diện chức năng 18 (Bảng xếp hạng vinh danh Top Công dân Xanh)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `LDB_TXT_MY_RANK` | Khung thành tích cá nhân | Stat Header Box | Hiển thị thứ hạng (Hạng 14), số điểm (1.450đ) và khoảng cách vào Top 10 (150đ). |
| `LDB_FLT_SCOPE` | Bộ lọc phạm vi xếp hạng | Segmented Checkbox | Lựa chọn phạm vi tra cứu: Toàn Quận 1 / Cấp Phường / Toàn Thành phố. |
| `LDB_ROW_TOP_1` | Dòng vinh danh Hạng 1 | Leaderboard Row | Nêu rõ tên công dân tiêu biểu, địa bàn cư trú và số điểm cống hiến cao nhất. |
| `LDB_ROW_MY_USER` | Dòng đánh dấu vị trí của tôi | Highlighted Row (Star) | Đánh dấu vị trí người dùng đang đăng nhập với ngôi sao vàng viền đứt đoạn. |
| `LDB_MODAL_HONOR` | Hộp thoại đăng ký vinh danh | Dialog Modal | Mời công dân có thành tích xuất sắc nộp hồ sơ nhận Kỷ niệm chương. |
| `LDB_BTN_SUBMIT_HONOR` | Nút đăng ký vinh danh | Primary Action Button | Gửi nguyện vọng khen thưởng tới Hội đồng Thi đua Quận. |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 12: Quy tắc kiểm tra và thông báo lỗi chức năng 18 (Bảng xếp hạng vinh danh Top Công dân Xanh)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Chưa chốt bảng xếp hạng kỳ | Chu kỳ tháng đang diễn ra, số liệu tính toán realtime | `LDB_001`: Bảng xếp hạng đang cập nhật dữ liệu thi đua tháng 09/2026. |
| Điểm số chưa đạt Top xét tặng | Thứ hạng nằm ngoài phạm vi được khen thưởng | `LDB_002`: Bạn cần đạt tối thiểu Top 20 của Quận để đủ điều kiện xét tặng kỷ niệm chương. |
| Tài khoản đang bị khiếu nại | Bị tố cáo gian lận điểm hoặc spam tin báo | `LDB_003`: Điểm thi đua của tài khoản đang trong quá trình rà soát đối chiếu. |

---

#### Chức năng 19: Xem danh sách các Chiến dịch ra quân bảo vệ môi trường (Environmental Campaign Showcase)
- **Mục tiêu nghiệp vụ**: Tổng hợp, truyền thông và quảng bá các phong trào ra quân dọn dẹp vệ sinh môi trường do Đoàn Thanh niên, UBND Phường và các hội đoàn thể phát động: Giới thiệu chiến dịch trọng điểm tuần (VD: "Chủ nhật xanh - Làm sạch tuyến kênh Nhiêu Lộc - Thị Nghè"); công khai quyền lợi của tình nguyện viên (cấp áo thun, găng tay, kẹp gắp rác và cộng `+150 Điểm Xanh`); thể hiện tỷ lệ đăng ký theo thời gian thực (VD: `78/100 tình nguyện viên`) để kêu gọi công dân cùng hưởng ứng.
- **Tác nhân (Actor)**: Công dân, Tình nguyện viên, Ban tổ chức chiến dịch môi trường.
- **Tiền điều kiện**: Các chiến dịch đã được cơ quan chức năng thẩm định và xuất bản trên cổng thông tin.
- **Hậu điều kiện**: Công dân nắm bắt đầy đủ thông tin về thời gian, địa điểm, chỉ tiêu và mở form đăng ký tham gia.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Công dân truy cập trang "Chiến Dịch Xanh" trên cổng thông tin (`Màn hình 43: Xem danh sách các Chiến dịch ra quân dọn rác`).
  2. Đầu trang thể hiện khung giới thiệu phong trào nổi bật: *"Chiến dịch nổi bật tuần này: Chủ nhật xanh - Làm sạch tuyến kênh Nhiêu Lộc - Thị Nghè • Quyền lợi tham gia: Cấp áo tình nguyện, găng tay, kẹp gắp rác chuyên dụng & cộng +150 Điểm Xanh"*.
  3. Danh sách các chiến dịch hiển thị dạng thẻ ngang trực quan:
     - Chiến dịch 1: *"Chủ nhật xanh lần thứ 152"* • Thời gian: 07:00 - 10:30 Chủ nhật (20/09) • Địa điểm: Bờ kè Kênh Nhiêu Lộc • `ĐÃ ĐĂNG KÝ: 78/100`.
     - Chiến dịch 2: *"Chung tay làm sạch điểm đen rác thải Phường..."* • Thời gian: 08:00 Thứ 7 (26/09) • Phối hợp Đoàn phường.
  4. Công dân bấm chọn vào chiến dịch *"Chủ nhật xanh lần thứ 152"*.
  5. Hệ thống hiển thị Modal chi tiết chiến dịch: *"Chiến dịch Chủ nhật xanh (20/09) tại Kênh Nhiêu Lộc. Bạn có muốn đăng ký tham gia đội tình nguyện viên?"*.
  6. Công dân bấm nút "Đăng ký ngay" để chuyển tiếp sang màn hình điền thông tin đăng ký tình nguyện viên (Chức năng 20).
- **Luồng thay thế (Alternative Flow)**:
  - Lọc chiến dịch theo địa bàn Phường: Công dân chọn khu vực gần nơi mình sinh sống để ưu tiên tham gia các hoạt động vệ sinh tại tổ dân phố mình.
- **Luồng ngoại lệ (Exception Flow)**:
  - Chiến dịch đã kín chỗ (Đăng ký đủ 100/100): Hệ thống hiển thị nhãn "Đã đủ số lượng" và tự động khóa tiếp nhận thêm đơn đăng ký mới.
- **Mô tả thành phần giao diện (UI Specification)**:
  - Khung banner chiến dịch nổi bật; Khung thẻ quyền lợi tham gia; Lưới danh sách các chiến dịch kèm thanh tiến độ số lượng đăng ký (Progress Bar); Khung Modal xác nhận mở đơn đăng ký.

![Hình 4.19: Giao diện phác thảo Xem danh sách các Chiến dịch ra quân dọn rác](docs/images/tu/hinh_4_19.png)  
*Hình 4.19: Giao diện phác thảo Xem danh sách các Chiến dịch ra quân dọn rác*

*Bảng 13: Đặc tả thành phần giao diện chức năng 19 (Xem danh sách các Chiến dịch ra quân dọn rác)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `CMP_BANNER_FEATURED` | Khung phong trào môi trường | Highlight Card | Giới thiệu chiến dịch trọng điểm tuần này tại Kênh Nhiêu Lộc - Thị Nghè. |
| `CMP_TXT_PERKS` | Thẻ quyền lợi tình nguyện viên | Info Text List | Nêu rõ việc cấp phát áo, găng tay, dụng cụ và mức cộng +150 Điểm Xanh. |
| `CMP_CARD_CAMPAIGN` | Thẻ thông tin chiến dịch | Campaign Card | Hiển thị tên chiến dịch, mốc thời gian diễn ra và địa điểm tập kết lực lượng. |
| `CMP_TXT_REGISTER_COUNT` | Thước đo số lượng đã đăng ký | Status Badge (Dark) | Thể hiện số lượng tình nguyện viên đã đăng ký thực tế (VD: ĐÃ ĐĂNG KÝ: 78/100). |
| `CMP_MODAL_DETAIL` | Hộp thoại xác nhận đăng ký | Modal Dialog Popup | Cửa sổ tóm tắt chiến dịch và hỏi công dân có muốn gia nhập đội tình nguyện. |
| `CMP_BTN_JOIN_NOW` | Nút đăng ký ngay | Primary Button | Chuyển hướng người dùng sang biểu mẫu đăng ký tham gia (Chức năng 20). |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 14: Quy tắc kiểm tra và thông báo lỗi chức năng 19 (Xem danh sách các Chiến dịch ra quân dọn rác)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Chiến dịch đã đủ quân số | `registered_count >= max_slots` | `CMP_001`: Chiến dịch này đã đủ số lượng tình nguyện viên đăng ký (100/100). |
| Quá hạn đăng ký trước ngày ra quân | `current_time > deadline_register` | `CMP_002`: Thời hạn đăng ký tham gia chiến dịch này đã kết thúc trước 24 giờ. |
| Chiến dịch tạm hoãn do mưa bão | Ban tổ chức cập nhật trạng thái `POSTPONED` | `CMP_003`: Chiến dịch tạm hoãn do điều kiện thời tiết xấu. Lịch mới sẽ được thông báo sau. |

---

#### Chức năng 20: Đăng ký tham gia chiến dịch tình nguyện xanh (Join Campaign Registration)
- **Mục tiêu nghiệp vụ**: Tự động hóa quy trình tiếp nhận và quản lý danh sách tình nguyện viên tham gia chiến dịch môi trường thực tế: Tự động điền thông tin cá nhân từ tài khoản người dùng, cho phép chọn ca làm việc (Ca trọn vẹn hưởng +150đ, Ca tăng cường hưởng +75đ), chọn nhóm nhiệm vụ phù hợp năng lực (Thu gom rác ven kênh, Phân loại rác đóng bao, Hậu cần tiếp nước), xác nhận cam kết an toàn lao động và cấp Mã thẻ tình nguyện viên (Volunteer Pass) điện tử phục vụ điểm danh quét mã QR tại hiện trường.
- **Tác nhân (Actor)**: Công dân tình nguyện viên, Ban tổ chức thực địa, Hệ thống quản lý tình nguyện.
- **Tiền điều kiện**: Chiến dịch còn chỉ tiêu tiếp nhận (Slot > 0); công dân đã xác thực số điện thoại trên hệ thống.
- **Hậu điều kiện**: Ghi nhận bản ghi tham gia vào bảng `campaign_participants`; tăng số lượng đăng ký lên 1; cấp mã định danh tình nguyện viên `VOL-2026-152-079` và gửi xác nhận qua SMS.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Từ Chức năng 19, công dân mở biểu mẫu `Màn hình 44: Đăng ký tham gia chiến dịch tình nguyện xanh`.
  2. Hệ thống tự động trích xuất thông tin: Họ tên (`Nguyễn Văn A`) và Số điện thoại liên hệ (`0908 123 456`).
  3. Công dân chọn ca tham gia: "Ca trọn vẹn: 07:00 - 10:30 (Được cộng trọn +150đ)".
  4. Công dân chọn phân công nhóm công việc: "Thu gom rác ven bờ kè & vớt rác rãnh nước".
  5. Công dân tích chọn hộp kiểm: *"Tôi cam kết tuân thủ quy định an toàn lao động và hướng dẫn của Ban tổ chức"*.
  6. Công dân bấm nút "GỬI ĐĂNG KÝ THAM GIA".
  7. Hệ thống hiển thị hộp thoại Modal xác nhận: *"Xác nhận đăng ký tham gia Chiến dịch Chủ nhật xanh lần thứ 152? Mã xác nhận VOL-2026-152-079 sẽ được gửi qua tin nhắn SMS."*.
  8. Công dân bấm "Xác nhận đăng ký", hệ thống lưu bản ghi vào bảng `campaign_participants`, sinh mã QR điểm danh gửi vào mục quà tặng cá nhân và gửi tin nhắn SMS xác nhận lịch hẹn.
- **Luồng thay thế (Alternative Flow)**:
  - Hủy đăng ký trước 24 giờ: Nếu có việc đột xuất không thể tham gia, công dân vào danh sách chiến dịch bấm "Hủy đăng ký" để hệ thống nhường suất cho người khác và không bị trừ điểm uy tín.
- **Luồng ngoại lệ (Exception Flow)**:
  - Đăng ký trùng lặp: Nếu tài khoản đã đăng ký chiến dịch này rồi, hệ thống chặn lại và hiển thị thông báo "Bạn đã đăng ký tham gia chiến dịch này trước đó".
- **Mô tả thành phần giao diện (UI Specification)**:
  - Khung tóm tắt chiến dịch đã chọn; Biểu mẫu nhập liệu gồm ô thông tin cá nhân, dropdown chọn ca, dropdown chọn tổ nhiệm vụ; Checkbox cam kết an toàn; Nút gửi đăng ký; Modal xác nhận cấp mã thẻ tình nguyện viên.

![Hình 4.20: Giao diện phác thảo Đăng ký tham gia chiến dịch tình nguyện xanh](docs/images/tu/hinh_4_20.png)  
*Hình 4.20: Giao diện phác thảo Đăng ký tham gia chiến dịch tình nguyện xanh*

*Bảng 15: Đặc tả thành phần giao diện chức năng 20 (Đăng ký tham gia chiến dịch tình nguyện xanh)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `REG_TXT_FULLNAME` | Ô họ và tên tình nguyện viên | Text Input (Readonly) | Tự động điền họ tên từ thông tin tài khoản đăng nhập (Nguyễn Văn A). |
| `REG_TXT_PHONE` | Ô số điện thoại liên hệ | Text Input | Nhập số điện thoại để Ban tổ chức gửi tin nhắn điều phối và nhắc lịch. |
| `REG_DDL_SHIFT` | Bộ chọn ca tham gia | Dropdown Select | Chọn: Ca trọn vẹn (07h-10h30: +150đ) hoặc Ca tăng cường (08h30-10h30: +75đ). |
| `REG_DDL_ROLE` | Bộ chọn nhóm công việc | Dropdown Select | Lựa chọn: Thu gom bờ kè, Phân loại đóng bao, hoặc Hậu cần tiếp nước. |
| `REG_CHK_SAFETY` | Hộp kiểm cam kết an toàn | Checkbox | Bắt buộc tích chọn cam kết tuân thủ quy định an toàn lao động. |
| `REG_BTN_SUBMIT` | Nút gửi đăng ký tham gia | Primary Action Button | Kích hoạt mở Modal xác nhận và cấp mã thẻ tình nguyện viên. |
| `REG_MODAL_CONFIRM` | Hộp thoại xác nhận đăng ký | Confirmation Modal | Xác nhận tham gia chiến dịch và thông báo cấp mã định danh VOL-2026-152-079. |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 16: Quy tắc kiểm tra và thông báo lỗi chức năng 20 (Đăng ký tham gia chiến dịch tình nguyện xanh)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Trùng lặp người đăng ký | `user_id` đã tồn tại trong `campaign_participants` | `VOL_001`: Bạn đã đăng ký tham gia chiến dịch môi trường này rồi. |
| Số điện thoại sai định dạng | Không khớp định dạng SĐT Việt Nam 10 chữ số | `VOL_002`: Vui lòng nhập số điện thoại hợp lệ để Ban tổ chức liên hệ. |
| Chưa xác nhận cam kết an toàn | Checkbox `is_agreed_safety == False` | `VOL_003`: Bạn bắt buộc phải đồng ý với cam kết an toàn lao động trước khi đăng ký. |
| Chiến dịch vừa kín chỗ | Đạt ngưỡng 100 tình nguyện viên ngay khi bấm | `VOL_004`: Rất tiếc, chỉ tiêu tình nguyện viên của chiến dịch vừa được lấp đầy. |

---

#### Chức năng 21: Bình luận và Thảo luận dưới bài phản ánh sự cố (Incident Public Comments)
- **Mục tiêu nghiệp vụ**: Xây dựng kênh trao đổi thông tin minh bạch, công khai hai chiều giữa các bên liên quan ngay dưới hồ sơ sự cố ô nhiễm môi trường: Cho phép công dân người báo cáo, người dân sống tại khu vực, tổ trưởng dân phố và cán bộ đội vệ sinh môi trường cùng thảo luận, cập nhật tình hình thực tế hiện trường (VD: xe rác đã đến, khối lượng rác phát sinh, hoàn tất xịt rửa); tích hợp bộ lọc ngôn từ văn minh tự động (Profanity Filter) kiểm duyệt 24/7 ngăn chặn các bình luận tiêu cực, chửi bới hoặc công kích cá nhân.
- **Tác nhân (Actor)**: Công dân người báo tin, Cư dân khu dân cư, Tổ trưởng dân phố, Cán bộ tiếp nhận xử lý.
- **Tiền điều kiện**: Sự cố ô nhiễm đã được công bố trên cổng thông tin; người dùng đã đăng nhập tài khoản.
- **Hậu điều kiện**: Bình luận được ghi nhận vào bảng `incident_comments`; đẩy thông báo thời gian thực tới những người đang theo dõi hồ sơ.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Người dùng mở trang chi tiết một điểm sự cố rác thải (VD: Hồ sơ `#RC-8492` tại đường Lê Văn Việt - `Màn hình 45: Bình luận và Thảo luận dưới bài phản ánh sự cố`).
  2. Khung thảo luận hiển thị các ý kiến theo trình tự thời gian:
     - Trần Văn Hùng (Tổ trưởng dân phố 4 - 08:30): *"Bãi rác này bốc mùi quá hôi, cảm ơn bà con đã kịp thời phản ánh lên GreenSpot."*
     - Cán bộ VSMT Đội 2 (09:15): *"Xe chuyên dụng đang trên đường di chuyển tới hiện trường, dự kiến 10h dọn sạch."*
     - Nguyễn Văn A (Công dân báo cáo - 10:10): *"Đội công nhân vừa gom xong đống rác lớn, hiện đang xịt rửa vỉa hè rất sạch sẽ!"*
  3. Người dùng nhập ý kiến thảo luận vào ô văn bản ở cuối trang.
  4. Bấm nút "Gửi bình luận", hệ thống kiểm tra qua bộ lọc từ khóa nhạy cảm.
  5. Hệ thống hiển thị hộp thoại Modal xác nhận: *"Xác nhận đăng bình luận công khai dưới sự cố #RC-8492? Bình luận của bạn sẽ hiển thị minh bạch cho toàn bộ cộng đồng khu dân cư."*.
  6. Người dùng bấm "Đăng bình luận", hệ thống lưu bản ghi và hiển thị ngay trên luồng thảo luận.
- **Luồng thay thế (Alternative Flow)**:
  - Báo cáo bình luận xấu: Nếu phát hiện bình luận có dấu hiệu xúc phạm hoặc quảng cáo rác, người dùng bấm nút cờ báo cáo vi phạm để quản trị viên kiểm duyệt gỡ bỏ.
- **Luồng ngoại lệ (Exception Flow)**:
  - Vi phạm từ ngữ thô tục: Bộ lọc phát hiện từ ngữ xúc phạm danh dự, hệ thống từ chối đăng, bôi đỏ đoạn vi phạm và cảnh báo: "Bình luận chứa từ ngữ không phù hợp chuẩn mực cộng đồng".
- **Mô tả thành phần giao diện (UI Specification)**:
  - Khung tóm tắt mã hồ sơ và đơn vị xử lý; Luồng danh sách bình luận phân biệt rõ nhãn chức danh (Tổ trưởng / Cán bộ / Công dân); Ô nhập nội dung văn bản kèm nút Gửi bình luận; Modal xác nhận tính công khai của bình luận.

![Hình 4.21: Giao diện phác thảo Bình luận và Thảo luận dưới bài phản ánh sự cố](docs/images/tu/hinh_4_21.png)  
*Hình 4.21: Giao diện phác thảo Bình luận và Thảo luận dưới bài phản ánh sự cố*

*Bảng 17: Đặc tả thành phần giao diện chức năng 21 (Bình luận và Thảo luận dưới bài phản ánh sự cố)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `CMT_LIST_CONTAINER` | Khung hiển thị luồng bình luận | Scrollable Comment List | Chứa danh sách các ý kiến thảo luận được sắp xếp theo mốc thời gian tăng dần. |
| `CMT_ITEM_HEADER` | Thanh tiêu đề bình luận | User Tag & Timestamp | Hiển thị tên người bình luận, vai trò (Cán bộ / Tổ trưởng) và thời điểm đăng. |
| `CMT_ITEM_BODY` | Nội dung văn bản bình luận | Text Block | Nội dung đóng góp ý kiến, cập nhật hiện trạng dọn dẹp hoặc lời cảm ơn. |
| `CMT_TXT_INPUT` | Ô nhập bình luận mới | Text Input Box | Cho phép người dân gõ nội dung phản hồi hoặc cập nhật tình hình thực tế. |
| `CMT_BTN_SEND` | Nút gửi bình luận | Action Button (Primary) | Gửi dữ liệu qua bộ kiểm duyệt ngôn từ trước khi hiển thị lên hệ thống. |
| `CMT_MODAL_CONFIRM` | Hộp thoại xác nhận đăng tin | Confirmation Modal | Xác nhận tính công khai minh bạch của ý kiến trước cộng đồng khu dân cư. |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 18: Quy tắc kiểm tra và thông báo lỗi chức năng 21 (Bình luận và Thảo luận dưới bài phản ánh sự cố)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Bình luận để trống hoặc quá ngắn | Độ dài nội dung `< 5` ký tự | `CMT_001`: Vui lòng nhập nội dung bình luận tối thiểu từ 5 ký tự trở lên. |
| Vi phạm bộ lọc từ khóa nhạy cảm | Chứa từ ngữ thô tục trong từ điển cấm | `CMT_002`: Bình luận chứa từ ngữ không phù hợp chuẩn mực văn hóa ứng xử đô thị. |
| Tần suất gửi bình luận quá nhanh | Gửi liên tiếp 2 bình luận cách nhau `< 10` giây | `CMT_003`: Bạn thao tác quá nhanh. Vui lòng chờ 10 giây trước khi gửi bình luận tiếp theo. |

---

#### Chức năng 22: Đánh giá mức độ hài lòng (1–5 sao) sau khi dọn sạch (Post-Resolution Satisfaction Rating)
- **Mục tiêu nghiệp vụ**: Đo lường định lượng mức độ hài lòng của nhân dân (CSAT - Citizen Satisfaction Score) đối với chất lượng phục vụ công ích của các Đội Vệ sinh môi trường đô thị: Khi một điểm rác được công bố đã dọn sạch, hệ thống kích hoạt màn hình cho phép công dân trực tiếp chấm điểm từ 1 đến 5 sao, đánh giá tiêu chí tuân thủ thời gian cam kết SLA (Service Level Agreement), chất lượng dọn sạch hiện trường và để lại lời nhận xét góp ý; kết quả đánh giá được chuyển thẳng vào hệ thống KPI thi đua khen thưởng cán bộ hàng tháng.
- **Tác nhân (Actor)**: Công dân người tạo báo cáo, Cư dân sinh sống tại khu vực, Phòng Quản lý Đô thị Quận.
- **Tiền điều kiện**: Sự cố đã được Đội VSMT hoàn tất dọn dẹp, có ảnh chụp đối chứng After và chuyển trạng thái `RESOLVED`.
- **Hậu điều kiện**: Bản ghi đánh giá được ghi nhận vào bảng `incident_ratings` và bảng `incidents`; tính toán điểm số CSAT trung bình của đơn vị thu gom; tự động cộng `+10 Điểm Xanh` tri ân công dân đã phản hồi chất lượng.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Khi sự cố `#RC-8492` được hoàn thành, hệ thống gửi thông báo mời người báo cáo đánh giá chất lượng nghiệm thu.
  2. Công dân mở màn hình `Màn hình 46: Đánh giá mức độ hài lòng (1–5 sao) sau khi dọn sạch`.
  3. Thẻ thông tin công bố kết quả thực hiện: *Đơn vị thực hiện: Tổ VSMT Số 2 • Thời gian dọn: 2h45p (Đúng hạn cam kết SLA) • Ý kiến của công dân: Giúp nâng cao chất lượng phục vụ và đánh giá thi đua cán bộ hàng tháng*.
  4. Công dân chọn mức độ hài lòng trên thanh sao: Chọn `5/5 SAO (RẤT HÀI LÒNG - HIỆN TRƯỜNG SẠCH ĐẸP & NHANH CHÓNG)`.
  5. Công dân nhập lời góp ý: *"Đội công nhân dọn rất sạch, có rắc vôi khử mùi hôi. Rất cảm ơn các anh chị!"*.
  6. Bấm nút "Gửi đánh giá", hệ thống hiển thị hộp thoại Modal xác nhận: *"Xác nhận gửi đánh giá 5 sao cho Đội VSMT Số 2? Điểm đánh giá sẽ được ghi nhận vào hệ thống KPI chất lượng phục vụ."*.
  7. Công dân bấm "Gửi đánh giá", hệ thống ghi nhận điểm số vào CSDL và tự động thưởng thêm `+10 Điểm Xanh` vào ví cá nhân.
- **Luồng thay thế (Alternative Flow)**:
  - Đánh giá chưa hài lòng (1-2 sao): Nếu công dân chấm 1 hoặc 2 sao kèm phản ánh dọn dẹp còn sót rác bẩn, hệ thống tự động sinh lệnh phúc tra hiện trường gửi Tổ trưởng giám sát xuống kiểm tra đột xuất trong 2 giờ.
- **Luồng ngoại lệ (Exception Flow)**:
  - Đánh giá lặp lại: Mỗi tài khoản công dân chỉ được gửi đánh giá chất lượng 1 lần duy nhất cho một hồ sơ sự cố.
- **Mô tả thành phần giao diện (UI Specification)**:
  - Khung công bố chỉ số SLA của đơn vị thu gom rác; Thanh chọn sao tương tác (1-5 sao); Khung nhập ý kiến góp ý chi tiết; Hộp thoại Modal xác nhận điểm số KPI; Nút Gửi đánh giá và nút Hủy.

![Hình 4.22: Giao diện phác thảo Đánh giá mức độ hài lòng (1–5 sao) sau khi dọn sạch](docs/images/tu/hinh_4_22.png)  
*Hình 4.22: Giao diện phác thảo Đánh giá mức độ hài lòng (1–5 sao) sau khi dọn sạch*

*Bảng 19: Đặc tả thành phần giao diện chức năng 22 (Đánh giá mức độ hài lòng sau khi dọn sạch)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `RAT_TXT_UNIT_SLA` | Khung công bố thông tin xử lý | Service Info Card | Nêu rõ đơn vị thực hiện (Tổ VSMT Số 2) và thời gian dọn thực tế (2h45p). |
| `RAT_STAR_SELECTOR` | Thanh chọn số sao hài lòng | Star Rating Control | Cho phép chọn từ 1 sao đến 5 sao kèm nhãn giải thích mức độ hài lòng. |
| `RAT_TXT_FEEDBACK` | Khung nhập góp ý bổ sung | Text Area Input | Nơi công dân viết nhận xét khen ngợi hoặc phản ánh những điểm chưa sạch. |
| `RAT_BTN_SUBMIT` | Nút gửi đánh giá | Action Button (Dark) | Kích hoạt mở Modal xác nhận ghi nhận số sao đánh giá. |
| `RAT_MODAL_CONFIRM` | Hộp thoại xác nhận đánh giá | Modal Confirmation | Thông báo xác nhận điểm số sẽ được ghi vào KPI chất lượng của đơn vị thu gom. |
| `RAT_BTN_CONFIRM_SEND` | Nút xác nhận gửi | Primary Button | Hoàn tất lưu đánh giá và kích hoạt cộng +10 Điểm Xanh tri ân người dân. |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 20: Quy tắc kiểm tra và thông báo lỗi chức năng 22 (Đánh giá mức độ hài lòng sau khi dọn sạch)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Chưa chọn số sao | Giá trị `rating_stars == 0` | `RAT_001`: Vui lòng chọn số sao đánh giá mức độ hài lòng (từ 1 đến 5 sao). |
| Đánh giá kém nhưng thiếu lý do | Đánh giá `<= 2` sao nhưng để trống ô góp ý | `RAT_002`: Vui lòng nhập lý do chưa hài lòng để đơn vị vệ sinh khắc phục xử lý lại. |
| Đánh giá trùng lặp sự cố | Tài khoản đã chấm điểm cho sự cố này rồi | `RAT_003`: Bạn đã hoàn thành đánh giá cho hồ sơ sự cố này trước đó. |

---

#### Chức năng 23: Gửi ý kiến đóng góp và Sáng kiến bảo vệ môi trường (Green Initiative Submission Form)
- **Mục tiêu nghiệp vụ**: Thiết lập Hòm thư điện tử Tiếp nhận Sáng kiến & Hiến kế vì Môi trường Xanh: Tạo diễn đàn cho người dân, nhà khoa học trẻ và học sinh sinh viên gửi các đề án, giải pháp công nghệ hoặc mô hình tự quản khu dân cư trực tiếp tới Hội đồng Khoa học & Đổi mới sáng tạo - Sở Tài nguyên và Môi trường TP.HCM; hỗ trợ kết nối các sáng kiến xuất sắc với Quỹ Đổi mới Môi trường để nhận gói kinh phí hỗ trợ triển khai thí điểm thực tế tại địa phương.
- **Tác nhân (Actor)**: Công dân hiến kế, Hội đồng Thẩm định Khoa học Sở TN&MT.
- **Tiền điều kiện**: Công dân đã đăng nhập tài khoản GreenSpot và có đề xuất giải pháp môi trường.
- **Hậu điều kiện**: Hồ sơ sáng kiến được lưu vào bảng `green_initiatives`; cấp mã tra cứu hồ sơ (VD: `INIT-2026-HCM-042`) và cam kết gửi văn bản phản hồi thẩm định trong vòng 7 ngày làm việc.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Công dân truy cập trang "Hiến Kế Sống Xanh" trên cổng thông tin (`Màn hình 47: Gửi ý kiến đóng góp và Sáng kiến bảo vệ môi trường`).
  2. Đầu trang thể hiện cơ quan thụ lý và chính sách khen thưởng: *Hội đồng Khoa học & Đổi mới sáng tạo - Sở Tài nguyên và Môi trường TP.HCM • Giải thưởng sáng kiến: Vinh danh và nhận gói hỗ trợ triển khai thực tế từ Quỹ Đổi mới Môi trường*.
  3. Công dân điền thông tin vào biểu mẫu:
     - Tiêu đề sáng kiến: *"Lắp đặt thùng rác phân loại cảm ứng thông minh năng lượng mặt trời tại Công viên 23/9"*.
     - Tóm tắt giải pháp: Trình bày cơ chế tự động nén rác khi đầy, cảm biến thông báo về trung tâm điều hành, tính toán chi phí và hiệu quả giảm rác vương vãi.
     - Đính kèm tệp bản vẽ thiết kế hoặc tài liệu thuyết minh (nếu có).
  4. Công dân bấm nút "GỬI SÁNG KIẾN TỚI SỞ TN&MT".
  5. Hệ thống hiển thị Modal xác nhận: *"Xác nhận nộp sáng kiến môi trường tới Sở TN&MT? Bạn sẽ nhận được thư phản hồi thẩm định trong vòng 7 ngày làm việc."*.
  6. Công dân bấm "Nộp sáng kiến", hệ thống sinh mã hồ sơ `INIT-2026-HCM-042`, lưu vào CSDL và gửi thư biên nhận tự động tới hộp thư điện tử của công dân.
- **Luồng thay thế (Alternative Flow)**:
  - Lưu bản nháp (Save Draft): Cho phép công dân lưu lại nội dung sáng kiến để tiếp tục bổ sung hình ảnh, tài liệu kỹ thuật trước khi nộp chính thức.
- **Luồng ngoại lệ (Exception Flow)**:
  - Nội dung hiến kế quá sơ sài: Bắt buộc phần tóm tắt giải pháp phải có độ dài từ 50 ký tự trở lên để đảm bảo tính nghiêm túc của đề xuất.
- **Mô tả thành phần giao diện (UI Specification)**:
  - Khung giới thiệu cơ quan thụ lý và quỹ đổi mới sáng kiến; Ô nhập tiêu đề sáng kiến; Khung soạn thảo văn bản mô tả giải pháp rộng rãi; Nút tải tệp đính kèm; Nút gửi sáng kiến tới Sở; Modal xác nhận cam kết phản hồi 7 ngày.

![Hình 4.23: Giao diện phác thảo Gửi ý kiến đóng góp và Sáng kiến bảo vệ môi trường](docs/images/tu/hinh_4_23.png)  
*Hình 4.23: Giao diện phác thảo Gửi ý kiến đóng góp và Sáng kiến bảo vệ môi trường*

*Bảng 21: Đặc tả thành phần giao diện chức năng 23 (Gửi ý kiến đóng góp và Sáng kiến bảo vệ môi trường)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `INI_TXT_BOARD` | Khung thông tin cơ quan thụ lý | Header Card | Nêu rõ Hội đồng tiếp nhận thuộc Sở TN&MT và chính sách tài trợ thí điểm. |
| `INI_TXT_TITLE` | Ô tiêu đề sáng kiến | Text Input | Nhập tên giải pháp sáng kiến (VD: Lắp đặt thùng rác thông minh năng lượng mặt trời). |
| `INI_TXT_DESCRIPTION` | Khung tóm tắt giải pháp | Text Area (Large) | Mô tả chi tiết nguyên lý, vật liệu, chi phí và hiệu quả môi trường mang lại. |
| `INI_FILE_ATTACHMENT` | Nút đính kèm tài liệu | File Uploader | Cho phép đính kèm tệp PDF bản vẽ hoặc bảng thuyết minh tính khả thi. |
| `INI_BTN_SUBMIT` | Nút gửi sáng kiến tới Sở | Action Button (Dark) | Kích hoạt mở Modal xác nhận nộp đề án tới cơ quan quản lý. |
| `INI_MODAL_CONFIRM` | Hộp thoại xác nhận nộp sáng kiến | Confirmation Modal | Cam kết gửi thư phản hồi kết quả thẩm định của Hội đồng trong 7 ngày làm việc. |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 22: Quy tắc kiểm tra và thông báo lỗi chức năng 23 (Gửi ý kiến đóng góp và Sáng kiến bảo vệ môi trường)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Tiêu đề sáng kiến quá ngắn | Độ dài tiêu đề `< 10` ký tự | `INI_001`: Tiêu đề sáng kiến phải có độ dài từ 10 ký tự trở lên. |
| Mô tả giải pháp quá sơ lược | Độ dài tóm tắt `< 50` ký tự | `INI_002`: Vui lòng mô tả tóm tắt giải pháp tối thiểu 50 ký tự để Hội đồng thẩm định. |
| Tệp đính kèm vượt kích thước | Kích thước file đính kèm `> 20MB` | `INI_003`: Dung lượng tệp đính kèm tối đa là 20MB (chấp nhận định dạng PDF, DOCX, ZIP). |

---

#### Chức năng 24: Cẩm nang hướng dẫn phân loại rác tại nguồn và Sống xanh (Waste Sorting & Green Living Handbook)
- **Mục tiêu nghiệp vụ**: Triển khai cuốn Sổ tay điện tử hướng dẫn phân loại chất thải rắn sinh hoạt tại nguồn theo đúng quy định của Luật Bảo vệ Môi trường 2020: Hướng dẫn trực quan cách phân chia 3 dòng rác chính (Rác tái chế - Túi Trắng, Rác thực phẩm - Túi Xanh, Rác còn lại & Nguy hại - Túi Xám); tích hợp bài trắc nghiệm tương tác nhanh 1 phút (5 câu hỏi thực tế) để kiểm tra kiến thức công dân và tự động cộng ngay `+50 Điểm Thưởng` cùng Huy hiệu "Công Dân Xanh Hiểu Biết" vào tài khoản.
- **Tác nhân (Actor)**: Toàn thể nhân dân, Học sinh sinh viên, Tình nguyện viên môi trường.
- **Tiền điều kiện**: Người dùng truy cập cổng thông tin GreenSpot.
- **Hậu điều kiện**: Nắm vững phương pháp phân loại rác; hoàn thành trắc nghiệm và nhận điểm thưởng vào ví cá nhân.
- **Quy trình xử lý nghiệp vụ (Workflow)**:
  1. Người dùng mở mục "Cẩm Nang Sống Xanh" (`Màn hình 48: Cẩm nang hướng dẫn phân loại rác và Sống xanh`).
  2. Màn hình chia thành 3 cột đồ họa chuyên đề trực quan:
     - Cột 1: `1. RÁC TÁI CHẾ (Túi Trắng)`: Chai nhựa, giấy vụn, vỏ lon nhôm, hộp kim loại -> Bán ve chai hoặc gửi Trạm Xanh.
     - Cột 2: `2. RÁC THỰC PHẨM (Túi Xanh)`: Thức ăn thừa, rau củ hư hỏng, bã trà/cà phê, lá cây -> Ủ phân hữu cơ vi sinh.
     - Cột 3: `3. RÁC CÒN LẠI & HẠI (Túi Xám)`: Bịch nilon dơ, tã lót, pin cũ, bóng đèn hư, chai lọ hóa chất nguy hại -> Đưa vào luồng xử lý chuyên biệt.
  3. Hệ thống hiển thị hộp thoại Modal trắc nghiệm xanh: *"Bạn có muốn tham gia bài Trắc nghiệm nhanh 1 phút về phân loại rác để tích lũy ngay +50 Điểm Thưởng?"*.
  4. Người dùng bấm nút "Bắt đầu trắc nghiệm", trả lời 5 câu hỏi tình huống sinh hoạt hàng ngày (VD: Vỏ hộp sữa giấy sau khi uống xong cần xử lý thế nào trước khi bỏ thùng rác?).
  5. Sau khi trả lời đúng từ 4/5 câu trở lên, hệ thống tự động cộng `+50 Điểm Xanh` vào ví cá nhân và cấp Huy hiệu điện tử trên trang cá nhân.
- **Luồng thay thế (Alternative Flow)**:
  - Tải cẩm nang Infographic PDF in ấn: Cho phép người dân tải tệp poster đồ họa độ phân giải cao về in ra dán tại góc bếp gia đình hoặc bảng tin khu phố.
- **Luồng ngoại lệ (Exception Flow)**:
  - Chưa đạt điểm yêu cầu trong bài trắc nghiệm: Hệ thống hiển thị bảng giải thích đáp án đúng của từng câu hỏi và cho phép người dùng ôn tập làm lại sau 24 giờ.
- **Mô tả thành phần giao diện (UI Specification)**:
  - Bố cục 3 cột trực quan tương ứng 3 nhóm rác thải sinh hoạt; Icon đồ họa đại diện từng loại rác; Khung Modal trắc nghiệm kiến thức nhận điểm thưởng; Nút Bắt đầu trắc nghiệm và nút Để sau.

![Hình 4.24: Giao diện phác thảo Cẩm nang hướng dẫn phân loại rác và Sống xanh](docs/images/tu/hinh_4_24.png)  
*Hình 4.24: Giao diện phác thảo Cẩm nang hướng dẫn phân loại rác và Sống xanh*

*Bảng 23: Đặc tả thành phần giao diện chức năng 24 (Cẩm nang hướng dẫn phân loại rác và Sống xanh)*
| Mã Phần Tử UI | Tên Thành Phần Giao Diện | Kiểu Điều Khiển UI | Chức Năng & Tương Tác Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `GUI_COL_RECYCLE` | Cột phân loại rác tái chế | Guide Column (White) | Hướng dẫn cách gom chai nhựa, giấy, kim loại và địa điểm gửi Trạm Xanh. |
| `GUI_COL_ORGANIC` | Cột phân loại rác thực phẩm | Guide Column (Green) | Hướng dẫn phân loại thức ăn thừa, rau củ để chế biến phân hữu cơ. |
| `GUI_COL_HAZARDOUS` | Cột rác nguy hại & còn lại | Guide Column (Gray) | Cảnh báo quy trình gom pin cũ, đồ điện tử để bảo vệ môi trường đất và nước. |
| `GUI_MODAL_QUIZ` | Hộp thoại trắc nghiệm nhận thưởng | Dialog Modal Popup | Mời người dân tham gia bài kiểm tra nhanh 5 câu hỏi để nhận +50 Điểm Xanh. |
| `GUI_BTN_START_QUIZ` | Nút bắt đầu trắc nghiệm | Primary Action Button | Kích hoạt bộ câu hỏi trắc nghiệm tương tác kiến thức phân loại rác. |
| `GUI_BTN_POSTPONE` | Nút để sau | Secondary Outline Button | Đóng hộp thoại trắc nghiệm để tiếp tục đọc tài liệu cẩm nang. |

- **Quy tắc kiểm tra và thông báo lỗi (Validation & Error Handling)**:

*Bảng 24: Quy tắc kiểm tra và thông báo lỗi chức năng 24 (Cẩm nang hướng dẫn phân loại rác và Sống xanh)*
| Trường Dữ Liệu / Tình Huống | Điều Kiện Ràng Buộc Kỹ Thuật | Mã Lỗi & Thông Điệp Phản Hồi Hiển Thị |
| :--- | :--- | :--- |
| Đã nhận thưởng trắc nghiệm tuần này | Mỗi tài khoản chỉ được cộng điểm trắc nghiệm 1 lần/tuần | `GUI_001`: Bạn đã hoàn thành bài trắc nghiệm và nhận +50 điểm trong tuần này rồi. |
| Bỏ dở bài trắc nghiệm | Thoát giữa chừng khi chưa trả lời hết 5 câu | `GUI_002`: Bài trắc nghiệm chưa hoàn thành. Điểm thưởng chỉ được cấp khi trả lời đủ 5 câu. |
| Lỗi tải tệp Infographic | Kết nối mạng gián đoạn khi tải tài liệu | `GUI_003`: Không thể tải tệp cẩm nang Infographic. Vui lòng kiểm tra lại kết nối mạng. |
