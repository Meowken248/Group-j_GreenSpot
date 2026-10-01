# DANH SÁCH 48 CHỨC NĂNG ĐÃ HIỂN THỊ TRÊN GIAO DIỆN DEMO GREENSPOT
## BẢNG TỔNG HỢP, ĐỐI CHIẾU PHÂN CÔNG & HƯỚNG DẪN KIỂM TRA TÁC NGHIỆP
*Căn cứ trích xuất từ giao diện demo thực tế tại:* [`social_simulation.html`](file:///d:/Group-j_GreenSpot/social_simulation.html) *(hoặc public: [`frontend/public/social_simulation.html`](file:///d:/Group-j_GreenSpot/frontend/public/social_simulation.html))*  
*Đối chiếu với tài liệu đặc tả phân công:* [`danhsach.md`](file:///d:/Group-j_GreenSpot/danhsach.md)

---

## I. MỤC ĐÍCH & PHẠM VI TÀI LIỆU
Tài liệu này hệ thống hóa **toàn bộ 48 chức năng tác nghiệp đô thị (tương ứng từ STT 01 đến STT 48 trong bảng phân công)** đã được lập trình hoàn chỉnh giao diện, cỗ máy xử lý dữ liệu và luồng tương tác trực quan trên file mô phỏng `social_simulation.html`.

### 1. Ý nghĩa thực tiễn của giao diện Demo 48 Chức năng
* **Trực quan hóa 100% nghiệp vụ:** Giúp Hội đồng chấm thi, giảng viên hướng dẫn và nhóm sinh viên quan sát được mọi tương tác từ góc nhìn của **Công dân**, **Đội ngũ Phản ứng nhanh**, **Trưởng ban Quản trị Đô thị**, cho đến **Chuyên viên Phân tích Không gian GIS & Thủy văn**.
* **Xóa bỏ các chức năng "trên giấy":** Thay vì chỉ mô tả sơ sài các thao tác CRUD cơ sở dữ liệu trừu tượng, hệ thống demo trang bị các cỗ máy tính toán thực thụ (State Machine, OSRM Snap-to-road, PostGIS Buffer ST_DWithin, 4-Wave Harmonic Tide Formula dH/dt, DBSCAN Clustering, Dynamic Risk Engine 0-100, Big Data 7.1M Parquet OLAP Analytics).
* **Cơ chế kiểm tra 1-chạm (1-Click Verification):** Giao diện tích hợp riêng Tab số 6 **"📋 Ma Trận 48 Chức Năng"** với bảng tra cứu đầy đủ 48 dòng, mỗi dòng có nút bấm kích hoạt trực tiếp tính năng trên giao diện để kiểm tra trong 1 giây.

---

## II. TỔNG QUAN KIẾN TRÚC 6 TAB ĐIỀU HƯỚNG TRÊN GIAO DIỆN DEMO

Giao diện `social_simulation.html` được thiết kế theo phong cách Apple Spatial UI & Dark Emerald Dashboard chuẩn quốc tế, gồm 6 Tab tác nghiệp chính:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        HỆ THỐNG MÔ PHỎNG ĐIỀU HÀNH GREENSPOT                           │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┬──────────────┤
│ TAB 1        │ TAB 2        │ TAB 3        │ TAB 4        │ TAB 5       │ TAB 6        │
│ 🧑‍🤝‍🧑 CÔNG DÂN   │ 🛡️ BAN Q.TRỊ │ 🌊 KHÍ TƯỢNG │ 🤖 AI & BIG  │ ⚡ CẦU NỐI  │ 📋 MA TRẬN   │
│ SOCIAL FEED  │ & GIS 3D     │ VI KHÍ HẬU   │ DATA 7.1M    │ SONG SONG   │ 48 CHỨC NĂNG │
│ (STT 01-12)  │ (STT 13-24)  │ (STT 25-36)  │ (STT 37-48)  │ (BRIDGE 2-WAY)│ (1-CLICK TEST│
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────┴──────────────┘
```

---

## III. CHI TIẾT 48 CHỨC NĂNG DEMO THEO 4 THÀNH VIÊN DỰ ÁN

---

### PHẦN 1: THÀNH VIÊN 1 - NGUYỄN THÀNH ĐẠT (MSSV: 22130043)
*Lĩnh vực chủ trì: Xác thực, Phân quyền RBAC, Hộ Chiếu Xanh, Mạng Xã Hội Sinh Thái & Gamification (STT 01 - 12)*

#### [CN-01] Đăng ký, Đăng nhập & Xác thực JWT Bảo Mật 2 Lớp (2FA OTP)
* **Mã đối chiếu:** `STT 01` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút "🔐 Đăng Nhập / 2FA" trên Header & Modal định danh `modalAuth`.
* **Thành phần giao diện & Tương tác:**
  - Form nhập thông tin email công dân, mật khẩu mã hóa bcrypt và mã OTP 6 chữ số (`778201`).
  - Hỗ trợ đăng nhập nhanh bằng Google Green OAuth và định danh Citizen ID.
  - Sau khi xác thực, hệ sinh thái cấp JWT Token hợp lệ, tự động cập nhật avatar, phiên làm việc an toàn và thông báo Toast chúc mừng.

#### [CN-02] Phân Quyền Vai Trò Người Dùng RBAC (Role-Based Access Control)
* **Mã đối chiếu:** `STT 02` trong `danhsach.md`.
* **Vị trí hiển thị:** Dropdown chuyển vai trò người dùng góc trên Header (`roleSelector`).
* **Thành phần giao diện & Tương tác:**
  - Lựa chọn 3 vai trò tác nghiệp chuẩn:
    1. `🧑‍🤝‍🧑 Citizen (Công Dân)`: Đăng bài báo cáo sự cố, thả cảm xúc, check-in sự kiện, đổi quà ví điểm.
    2. `👷 Worker (Đội Phản Ứng Nhanh)`: Nhận lệnh điều động tại hiện trường, chụp ảnh dọn sạch, cập nhật tiến độ.
    3. `🛡️ Admin (Ban Quản Trị Đô Thị)`: Toàn quyền truy cập KPI Dashboard, duyệt giải tỏa rác, phê duyệt nghiệm thu, kích hoạt phát thanh khẩn cấp.
  - Giao diện tự động thích ứng: Khi chuyển sang Citizen sẽ khóa các nút phê duyệt; khi chuyển sang Admin sẽ mở khóa toàn quyền điều phối.

#### [CN-03] Quản Lý Thông Tin Hồ Sơ Cá Nhân & Tùy Biến Dấu Chân Sinh Thái
* **Mã đối chiếu:** `STT 03` trong `danhsach.md`.
* **Vị trí hiển thị:** Widget Profile góc trên Sidebar trái & Modal chỉnh sửa hồ sơ.
* **Thành phần giao diện & Tương tác:**
  - Hiển thị avatar đại diện, email xác thực (`dat.nguyen@greenspot.vn`), số điện thoại khẩn cấp, địa chỉ thường trú Phường 22, Quận Bình Thạnh.
  - Bảng tổng kết dấu chân sinh thái cá nhân: Đã báo cáo 18 sự cố, khối lượng rác gián tiếp thu gom $85.4\text{ kg}$, chỉ số uy tín cộng đồng $99.2\%$.

#### [CN-04] Thẻ Hộ Chiếu Xanh Điện Tử (Digital Green Passport & NFC/QR Card)
* **Mã đối chiếu:** `STT 04` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút "Xem Hộ Chiếu Xanh" tại Sidebar trái & Modal `modalPassport`.
* **Thành phần giao diện & Tương tác:**
  - Thẻ định danh số phong cách Apple Wallet / Holographic Card sang trọng với nền chuyển sắc xanh ngọc bảo mật.
  - Tích hợp mã định danh công dân `CITIZEN-VN-2026-7782`, mã QR xác thực chứng chỉ số tại các trạm tái chế.
  - Bộ sưu tập 4 huy hiệu danh dự 3D: *Chiến Binh Rác Thải, Khắc Tinh Điểm Ngập, Mầm Xanh Đô Thị, Hiệp Sĩ Môi Trường*.
  - Nút tải thẻ về máy dưới dạng tệp ảnh độ nét cao để chia sẻ mạng xã hội.

#### [CN-05] Đổi Mật Khẩu An Toàn & Khôi Phục Tài Khoản Qua Email Token
* **Mã đối chiếu:** `STT 05` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút "Quên mật khẩu / Reset Token" trong Modal Đăng nhập.
* **Thành phần giao diện & Tương tác:**
  - Form gửi Token đặt lại mật khẩu với thời hạn sống ngắn (TTL 15 phút).
  - Thanh đo độ mạnh mật khẩu (Password Strength Meter) phân tích độ entropy: chữ hoa, chữ thường, ký tự đặc biệt và độ dài $\ge 8$ ký tự.

#### [CN-06] Bảng Tin Sinh Thái Đô Thị Theo Bán Kính Không Gian (Hyperlocal Geo-Feed Engine)
* **Mã đối chiếu:** `STT 06` trong `danhsach.md`.
* **Vị trí hiển thị:** Cột dòng thời gian chính giữa trang (Tab 1: Công Dân).
* **Thành phần giao diện & Tương tác:**
  - Thanh lọc phạm vi không gian: *Toàn Thành Phố | 📍 Gần tôi (< 1km) | Trong 3km | Khu vực 5km*.
  - Thanh lọc hashtag chuyên đề: *Tất cả | #ZeroWaste | #FloodWarning | #CleanUp | #SOSKhancap*.
  - Các Post Card thiết kế viền kép cao cấp, tự động tính toán và hiển thị khoảng cách từ tọa độ GPS hiện tại của người dùng đến hiện trường bài đăng (`Cách bạn 0.4 km`).

#### [CN-07] Soạn Thảo & Đăng Bài Báo Cáo Sự Cố Kèm Tọa Độ GPS (Geo-tagged Incident Composer)
* **Mã đối chiếu:** `STT 07` trong `danhsach.md`.
* **Vị trí hiển thị:** Khung soạn thảo đầu bảng tin Feed & Modal Camera hoàn tất.
* **Thành phần giao diện & Tương tác:**
  - Dropdown phân loại 5 nhóm sự cố môi trường đô thị: *Rác sinh hoạt ùn ứ, Xà bần xây dựng, Rác thải nguy hại, Điểm ngập nước mặt đường, Cây xanh gãy đổ*.
  - Nhập thể tích ước tính ($m^3$), cấp độ nghiêm trọng, địa chỉ tự động giải mã từ GPS.
  - Khi bấm *"ĐĂNG BÀI BÁO CÁO & BẮN VỀ BAN CHỈ HUY"*, hệ thống lập tức chèn bài lên đầu Bảng tin, đồng thời phát tín hiệu điều phối sang Cổng Ban Quản Trị.

#### [CN-08] Động Cơ Tương Tác Bộ 4 Cảm Xúc Sinh Thái (Eco-Reactions Engine)
* **Mã đối chiếu:** `STT 08` trong `danhsach.md`.
* **Vị trí hiển thị:** Thanh hành động dưới chân mỗi Post Card.
* **Thành phần giao diện & Tương tác:**
  - Bộ 4 cảm xúc chuyên biệt có số lượng đếm tương tác tăng thời gian thực:
    * 💚 *Yêu MT (+2 pts)*: Biểu thị sự đồng thuận bảo vệ môi trường.
    * 👏 *Cảm ơn (+2 pts)*: Tri ân người dân đã dũng cảm báo cáo hiện trường.
    * ⚠️ *Cảnh báo (+2 pts)*: Báo động nguy cơ ô nhiễm, mùi hôi hoặc ngập sâu.
    * ♻️ *Tái chế (+2 pts)*: Kêu gọi phân loại rác tái chế có giá trị.
  - Hiệu ứng âm thanh cơ học Haptic Feedback và tự động cộng điểm thưởng ngay vào tài khoản người tương tác.

#### [CN-09] Quản Lý Chiến Dịch Cộng Đồng "Chủ Nhật Xanh" (Cleanup Drive & RSVP)
* **Mã đối chiếu:** `STT 09` trong `danhsach.md`.
* **Vị trí hiển thị:** Post Card sự kiện đặc biệt (`post-4`) trên Bảng tin.
* **Thành phần giao diện & Tương tác:**
  - Banner cổ động ngày hội ra quân dọn rác kênh rạch tại Công viên Tao Đàn.
  - Bộ đếm thời gian thực số lượng tình nguyện viên đã đăng ký tham gia (`38/50 người`).
  - Nút *"Tham Gia (RSVP)"*: Tự động cấp mã vé tham gia điện tử và cộng ngay $+20$ Eco-points vào ví.

#### [CN-10] Xác Thực Hiện Trường Sự Kiện Bằng Vùng Ảo Geofencing GPS Check-in 100m
* **Mã đối chiếu:** `STT 10` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút "📍 Check-in GPS 100m (+100 pts)" trên thẻ sự kiện Chủ Nhật Xanh.
* **Thành phần giao diện & Tương tác:**
  - Thuật toán W3C Geolocation đo lường khoảng cách Haversine giữa vị trí thiết bị và tọa độ tâm sự kiện.
  - Nếu khoảng cách $\le 100\text{m}$, hệ thống xác nhận check-in thành công, chống gian lận check-in từ xa và thưởng nóng $+100$ điểm danh dự.

#### [CN-11] Động Cơ Game Hóa Tích Điểm Eco-Points, Thăng Cấp Danh Hiệu & Ví Quà Voucher
* **Mã đối chiếu:** `STT 11` trong `danhsach.md`.
* **Vị trí hiển thị:** Thanh tiến độ level trên Sidebar trái & Modal Đổi Quà `modalEcoWallet`.
* **Thành phần giao diện & Tương tác:**
  - Hệ thống 4 cấp bậc tiến trình: *🌱 Hạt Mầm Xanh ➔ 🌿 Cây Non Đô Thị ➔ 🌳 Rừng Xanh Hộ Vệ ➔ 👑 Hiệp Sĩ Sinh Thái*.
  - Gian hàng đổi thưởng sinh thái: Vé VinBus điện tử ($300\text{ pts}$), Cây cảnh sen đá mini ($500\text{ pts}$), Ly giữ nhiệt bằng tre hữu cơ ($800\text{ pts}$).
  - Trừ điểm số dư minh bạch và phát sinh mã Voucher QR Code sử dụng trực tiếp.

#### [CN-12] Kênh Giao Tiếp & Thảo Luận Cộng Đồng Trực Tiếp Theo Quận (District Live Chat Room)
* **Mã đối chiếu:** `STT 12` trong `danhsach.md`.
* **Vị trí hiển thị:** Widget Chat chiều cao 480px tại Sidebar phải.
* **Thành phần giao diện & Tương tác:**
  - Menu chuyển đổi phòng chat 4 địa bàn trọng điểm: *Quận 1, Quận Bình Thạnh, TP. Thủ Đức, Quận 7*.
  - Khung tin nhắn thời gian thực hỗ trợ gửi tin cảnh báo giao thông, ngập lụt, rác phát sinh.
  - Tích hợp **Bot Trực ban Khí tượng Đô thị**: Tự động lắng nghe từ khóa ngập úng và phản hồi cập nhật trạng thái vận hành các máy bơm công suất lớn sau 1.5 giây.

---

### PHẦN 2: THÀNH VIÊN 2 - HUỲNH ANH TÚ (MSSV: 22130310)
*Lĩnh vực chủ trì: Tiếp Nhận Báo Cáo, Cỗ Máy Trạng Thái, Điều Phối Tác Nghiệp & WebGIS Không Gian 3D (STT 13 - 24)*

#### [CN-13] Tiếp Nhận Báo Cáo Sự Cố Đa Phương Tiện, Kính Ngắm Camera HUD & Nén Ảnh Client-side
* **Mã đối chiếu:** `STT 13` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút "📸 Chụp Ảnh Hiện Trường" trên Composer & Modal Camera chuyên dụng `modalCamera`.
* **Thành phần giao diện & Tương tác:**
  - Màn hình kính ngắm Camera HUD đen mờ chuẩn điện ảnh với lưới bố cục 3x3 và tâm ngắm reticle.
  - Lớp Watermark chứng thực EXIF in cứng góc ảnh: Vĩ độ/Kinh độ GPS chuẩn xác $\pm 3.2\text{m}$, thời gian chụp GMT+7, địa chỉ số nhà giải mã tự động.
  - Nút cò chụp vật lý (Shutter Button) với âm thanh màn trập cơ học mô phỏng qua Web Audio API.
  - Động cơ nén ảnh tự động: `⚡ Nén Client-side: 3.8 MB ➔ 385 KB (-90%)` giúp tối ưu băng thông di động.

#### [CN-14] Cỗ Máy Trạng Thái Vòng Đời Sự Cố (State Machine) & Trình Trượt So Sánh Before/After
* **Mã đối chiếu:** `STT 14` trong `danhsach.md`.
* **Vị trí hiển thị:** Modal Tra cứu tiến độ sự cố `modalTracking` & Post Card sự cố `INC-2026-0888`.
* **Thành phần giao diện & Tương tác:**
  - Quản lý quy trình 4 giai đoạn khép kín theo đồ thị trạng thái:
    $$\text{PENDING (Tiếp nhận)} \longrightarrow \text{ASSIGNED (Phân công)} \longrightarrow \text{IN\_PROGRESS (Đang xử lý)} \longrightarrow \text{RESOLVED (Nghiệm thu)}$$
  - Trình trượt so sánh hiện trường Before / After 2 chiều: Kéo thanh trượt để thấy rõ bãi rác trước giải tỏa và vỉa hè sạch đẹp sau khi Đội phản ứng nhanh hoàn tất.

#### [CN-15] Hệ Thống Phân Công Tác Nghiệp Đội Phản Ứng Nhanh Theo Địa Bàn 22 Quận
* **Mã đối chiếu:** `STT 15` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút bấm "Điều Phối" trên bảng Hàng đợi Admin (Tab 2) & Modal phân công.
* **Thành phần giao diện & Tương tác:**
  - Hệ thống tự động truy vấn địa bàn (ví dụ Phường 22, Q. Bình Thạnh) và gợi ý đội phản ứng nhanh cơ sở: *Đội Vệ Sinh Môi Trường Đô Thị Q. Bình Thạnh - Tổ Cơ Động 2*.
  - Bấm điều phối sẽ chuyển trạng thái sự cố sang `IN_PROGRESS`, cập nhật tên người phụ trách và thông báo cho người dân trên Bảng tin.

#### [CN-16] Trung Tâm Điều Hành & Đo Lường KPI Tác Nghiệp Đô Thị (Operational KPI Dashboard)
* **Mã đối chiếu:** `STT 16` trong `danhsach.md`.
* **Vị trí hiển thị:** Khu vực đầu Tab 2 (Ban Quản Trị) & Hàng đợi tiếp nhận thời gian thực.
* **Thành phần giao diện & Tương tác:**
  - 4 thẻ đo lường chỉ số điều hành chiến lược:
    * *Sự cố chờ tiếp nhận:* 3 vụ (màu hổ phách)
    * *Đang cử lực lượng xử lý:* 4 vụ (màu lam)
    * *Đã giải tỏa sạch sẽ:* 42 vụ (màu ngọc lục bảo)
    * *Tỷ lệ hoàn thành đúng cam kết SLA:* $96.8\%$ (màu đỏ tối ưu)
  - Bảng dữ liệu Hàng đợi trực tiếp (Live Dispatch Queue) cập nhật từng giây khi có báo cáo mới từ người dân.

#### [CN-17] Bản Đồ WebGIS Nền Tảng Số Đa Lớp (Bộ Sưu Tập 7 Loại Basemap Chuẩn Quốc Tế)
* **Mã đối chiếu:** `STT 17` trong `danhsach.md`.
* **Vị trí hiển thị:** Khối trình diễn WebGIS tại Tab 2 (Ban Quản Trị).
* **Thành phần giao diện & Tương tác:**
  - Bộ chuyển đổi nhanh 7 loại bản đồ nền tảng:
    1. *CartoDB Positron (Sáng tối giản)*
    2. *OpenStreetMap Standard (Đường bộ)*
    3. *ESRI World Imagery (Vệ tinh siêu nét)*
    4. *CartoDB Dark Matter (Đêm huyền bí)*
    5. *OpenTopoMap (Địa hình độ cao)*
    6. *Stamen Toner (Đơn sắc tương phản cao)*
    7. *ESRI Topographic (Địa lý hành chính)*
  - Khung bản đồ Canvas tích hợp la bàn định hướng và thước tỷ lệ động.

#### [CN-18] Lớp Mô Hình Không Gian 3D Công Trình Đô Thị (3D Buildings 5 Theme)
* **Mã đối chiếu:** `STT 18` trong `danhsach.md`.
* **Vị trí hiển thị:** Bảng điều khiển lớp GIS trong Tab 2.
* **Thành phần giao diện & Tương tác:**
  - Trình diễn dữ liệu khối nhà 3D (3D Extruded Buildings) với góc nghiêng phối cảnh 45 độ.
  - Tùy chọn 5 phong cách bề mặt (Themes): *Cyberpunk Neon, Glassmorphism Kính Mờ, Blueprint Bản Vẽ Kỹ Thuật, Realistic Ban Ngày, Thermal Hồng Ngoại*.

#### [CN-19] Ranh Giới Hành Chính Số 22 Quận / Huyện TP.HCM Kèm Tương Tác GIS
* **Mã đối chiếu:** `STT 19` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút bật tắt lớp "Ranh Giới 22 Quận Huyện" trong Tab 2.
* **Thành phần giao diện & Tương tác:**
  - Hiển thị ranh giới vector GeoJSON bao phủ trọn vẹn 22 quận/huyện/thành phố trực thuộc (TP. Thủ Đức, Q.1, Q.Bình Thạnh, Q.7, Huyện Nhà Bè...).
  - Hover chuột hiển thị bảng thông tin dân số, diện tích tự nhiên, mật độ phát sinh rác thải và tên Chủ tịch UBND phụ trách.

#### [CN-20] Bản Đồ Không Gian Các Điểm Xanh & Công Viên Sinh Thái (Green Spots Layer)
* **Mã đối chiếu:** `STT 20` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút kích hoạt lớp "Điểm Xanh Đô Thị" trong Tab 2.
* **Thành phần giao diện & Tương tác:**
  - Lớp điểm không gian (Point Features) định vị hệ thống công viên cây xanh lớn: *Thảo Cầm Viên, Công viên Tao Đàn, Công viên Gia Định, Công viên 23/9*.
  - Popup hiển thị tỷ lệ che phủ bóng mát, chỉ số hấp thụ $CO_2$ hằng năm và tiện ích công cộng.

#### [CN-21] Mạng Lưới Không Gian Trạm Thu Gom & Tái Chế Rác Thải Thông Minh (Recycling Hubs)
* **Mã đối chiếu:** `STT 21` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút kích hoạt lớp "Trạm Tái Chế Rác" trong Tab 2.
* **Thành phần giao diện & Tương tác:**
  - Ghim biểu tượng xanh lá ♻️ trên bản đồ định vị các trạm thu gom rác nhựa, pin cũ, đồ điện tử.
  - Hiển thị giờ mở cửa, số điện thoại điều hành, đơn giá quy đổi rác ra điểm Eco-points và sức chứa hiện tại của thùng thu gom.

#### [CN-22] Module CRUD Quản Lý Danh Mục Phân Loại Rác Thải Đô Thị
* **Mã đối chiếu:** `STT 22` trong `danhsach.md`.
* **Vị trí hiển thị:** Khung quản trị dữ liệu danh mục rác tại Tab 2.
* **Thành phần giao diện & Tương tác:**
  - Bảng quản lý phân nhóm rác: Mã loại, tên danh mục (*Rác hữu cơ, Vỏ chai nhựa PET, Xà bần, Pin Lithium*), đơn vị đo lường ($kg, m^3$), hệ số quy đổi điểm thưởng và mức độ độc hại môi trường.
  - Nút thêm mới, chỉnh sửa hệ số thưởng và lưu vào cơ sở dữ liệu.

#### [CN-23] Module CRUD Quản Lý Mạng Lưới Trạm Tiếp Nhận Chất Thải Tái Chế
* **Mã đối chiếu:** `STT 23` trong `danhsach.md`.
* **Vị trí hiển thị:** Bảng quản trị danh sách trạm tái chế tại Tab 2.
* **Thành phần giao diện & Tương tác:**
  - Form thêm mới/cập nhật trạm tái chế: Nhập tên trạm, tọa độ kinh độ/vĩ độ, đơn vị vận hành (*Công ty Môi Trường Đô Thị CITENCO*), năng lực tiếp nhận tối đa (tấn/ngày).

#### [CN-24] Module CRUD Quản Lý Cơ Sở Hạ Tầng Môi Trường & Đơn Vị Hành Chính
* **Mã đối chiếu:** `STT 24` trong `danhsach.md`.
* **Vị trí hiển thị:** Bảng cấu hình cơ sở hạ tầng đô thị tại Tab 2.
* **Thành phần giao diện & Tương tác:**
  - Giao diện quản lý danh bạ 312 phường/xã/thị trấn, các trạm trung chuyển rác ép kín, danh sách số điện thoại đường dây nóng của Đội phản ứng nhanh từng quận.

---

### PHẦN 3: THÀNH VIÊN 3 - BÙI NGUYỄN MINH QUÂN (MSSV: 22130232)
*Lĩnh vực chủ trì: Viễn Trắc IoT, Radar Thời Tiết, Thủy Văn & Dự Báo Ngập GloFAS 7 Ngày (STT 25 - 36)*

#### [CN-25] Lớp Bản Đồ Không Gian Các Điểm Ngập Lịch Sử & Điểm Đen Đô Thị (Flood Hotspots Layer)
* **Mã đối chiếu:** `STT 25` trong `danhsach.md`.
* **Vị trí hiển thị:** Khối WebGIS chuyên đề Thủy văn tại Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Đánh dấu các tọa độ ngập truyền thống tại TP.HCM: *Đường Nguyễn Hữu Cảnh, Đường Huỳnh Tấn Phát, Đường Quốc Hương (Thảo Điền), Đường Trần Xuân Soạn*.
  - Popup phân tích lịch sử độ sâu ngập tối đa ghi nhận qua các năm ($30\text{cm} - 65\text{cm}$) và năng lực cống thoát nước hiện hữu.

#### [CN-26] Hệ Thống Trạm Quan Trắc Thủy Văn & Mực Nước Triều Trực Tuyến (Tide Stations)
* **Mã đối chiếu:** `STT 26` trong `danhsach.md`.
* **Vị trí hiển thị:** Thẻ hiển thị Trạm Phú An & Trạm Nhà Bè trong Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Đo lường mực nước triều thực tế: Trạm Phú An đạt $+1.68\text{m}$, Trạm Nhà Bè đạt $+1.72\text{m}$.
  - Cột thước nước động (Level Gauge) chuyển màu cảnh báo trực quan theo 3 cấp: *Báo động 1 ($1.40\text{m}$ - Xanh) ➔ Báo động 2 ($1.50\text{m}$ - Vàng) ➔ Báo động 3 ($1.60\text{m}$ - Đỏ khẩn cấp)*.

#### [CN-27] Bản Đồ Nhiệt Mật Độ Rủi Ro Tổng Hợp Đa Nguồn (Risk Density Heatmap)
* **Mã đối chiếu:** `STT 27` trong `danhsach.md`.
* **Vị trí hiển thị:** Tùy chọn lớp Heatmap trong Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Lớp phủ màu chuyển sắc từ Xanh lam $\rightarrow$ Vàng $\rightarrow$ Đỏ rực biểu diễn mật độ tập trung đồng thời của các điểm ngập nước, bãi rác tự phát và phản ánh bức xúc của người dân.

#### [CN-28] Bản Đồ Nội Suy Nhiệt Độ Mặt Đất Đô Thị (Urban Heat Island Surface Temp Heatmap)
* **Mã đối chiếu:** `STT 28` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút kích hoạt bản đồ nhiệt độ mặt đất trong Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Mô phỏng hiệu ứng đảo nhiệt đô thị (Urban Heat Island - UHI): Các khu vực bê tông hóa cao (Quận 1, Quận 5) nhiệt độ mặt đất lên tới $38.5^\circ\text{C}$, khu vực nhiều cây xanh (Công viên Tao Đàn, Bán đảo Thanh Đa) mát hơn $4 - 6^\circ\text{C}$.

#### [CN-29] Bản Đồ Chất Lượng Không Khí & Nồng Độ Bụi Mịn PM2.5/PM10 (Air Quality AQI Heatmap)
* **Mã đối chiếu:** `STT 29` trong `danhsach.md`.
* **Vị trí hiển thị:** Thẻ chỉ số AQI và lớp bản đồ chất lượng không khí trong Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Đo lường chỉ số US EPA AQI: $118\text{ AQI}$ (Màu cam - Nhạy cảm), nồng độ bụi siêu mịn $PM2.5 = 42.5\,\mu g/m^3$.
  - Cảnh báo khuyến nghị sức khỏe tự động cho người già, trẻ nhỏ và người luyện tập thể thao ngoài trời.

#### [CN-30] Trạm Radar Thời Tiết Đa Tầng 8 Lớp (8-Layer Weather Radar Studio)
* **Mã đối chiếu:** `STT 30` trong `danhsach.md`.
* **Vị trí hiển thị:** Bảng chuyển đổi 8 lớp Radar khí tượng trong Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Bộ 8 lớp dữ liệu khí tượng trực quan chuyên sâu:
    1. *Vũ lượng mưa phản xạ Radar ($mm/h$)*
    2. *Vector vận tốc và hướng gió mặt đất ($km/h$)*
    3. *Khí áp mực nước biển ($hPa$)*
    4. *Độ che phủ mây vệ tinh ($Cloud\ Cover\ \%$)*
    5. *Nhiệt độ bức xạ bề mặt ($^\circ\text{C}$)*
    6. *Độ ẩm tương đối ($RH\ \%$)*
    7. *Chỉ số tia cực tím ($UV\ Index$)*
    8. *Chiều cao sóng triều cửa sông ($m$)*

#### [CN-31] Mô Hình Toán Học Điều Hòa 4 Sóng Triều Chính (Harmonic Tide Formula M2, S2, K1, O1)
* **Mã đối chiếu:** `STT 31` trong `danhsach.md`.
* **Vị trí hiển thị:** Khung giải thuật toán học Thủy văn tại Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Hiển thị công thức giải tích điều hòa triều kinh điển:
    $$h(t) = H_0 + \sum_{i=1}^{4} f_i A_i \cos(V_i + u_i - g_i + \omega_i t)$$
  - Phân tích 4 thành phần sóng chính tác động vào vùng vịnh Sài Gòn:
    * $M_2$ (Sóng bán nhật triều Mặt Trăng, chu kỳ 12.42h, biên độ $A_1 = 0.85\text{m}$)
    * $S_2$ (Sóng bán nhật triều Mặt Trời, chu kỳ 12.00h, biên độ $A_2 = 0.32\text{m}$)
    * $K_1$ (Sóng toàn nhật triều Nhật-Nguyệt, chu kỳ 23.93h, biên độ $A_3 = 0.48\text{m}$)
    * $O_1$ (Sóng toàn nhật triều Mặt Trăng, chu kỳ 25.82h, biên độ $A_4 = 0.36\text{m}$)

#### [CN-32] Động Cơ Giải Tích Xác Định Cực Trị Triều $\frac{dh}{dt} = 0$ & Dự Báo Đỉnh Triều
* **Mã đối chiếu:** `STT 32` trong `danhsach.md`.
* **Vị trí hiển thị:** Đồ thị đường cong mực nước 24 giờ và kết quả nghiệm trong Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Giải phương trình vi phân tìm nghiệm đạo hàm bậc nhất bằng không:
    $$\frac{dh}{dt} = -\sum_{i=1}^{4} \omega_i A_i \sin(\omega_i t + \phi_i) = 0$$
  - Dự báo chính xác thời điểm xuất hiện đỉnh triều cao nhất trong ngày: **Đỉnh triều $+1.68\text{m}$ lúc 17:45 chiều nay**, vượt mức Báo Động 3 ($1.60\text{m}$).

#### [CN-33] Ma Trận Đánh Giá Rủi Ro Ngập Lụt Kết Hợp Triều Cường & Mưa Cực Đoan
* **Mã đối chiếu:** `STT 33` trong `danhsach.md`.
* **Vị trí hiển thị:** Bảng ma trận 2 chiều Thủy văn trong Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Ma trận kết hợp giữa 3 cấp triều ($<BĐ1, BĐ1-BĐ3, >BĐ3$) và 3 cấp mưa ($<30mm, 30-70mm, >70mm$).
  - Khi triều vượt $BĐ3$ kết hợp mưa cực đoan $>70mm$, hệ thống tự động cảnh báo **RỦI RO THẢM HỌA (Màu Đỏ Sẫm)**, yêu cầu kích hoạt trạm bơm khẩn cấp.

#### [CN-34] Động Cơ Đánh Giá Rủi Ro Ngập Lụt Đa Yếu Tố (Multi-Factor Flood Risk Engine)
* **Mã đối chiếu:** `STT 34` trong `danhsach.md`.
* **Vị trí hiển thị:** Thanh đo lường chỉ số rủi ro tích hợp trong Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Tích hợp 4 nhóm biến số môi trường theo trọng số chuẩn hóa:
    $$\text{FloodRiskScore} = 0.40 \cdot \text{TideLevel} + 0.30 \cdot \text{Rainfall} + 0.20 \cdot \text{Elevation} + 0.10 \cdot \text{DrainageCapacity}$$
  - Đưa ra điểm số rủi ro tổng hợp cho từng phường/xã trên địa bàn thành phố.

#### [CN-35] Tích Hợp Mô Hình Dự Báo Ngập Toàn Cầu GloFAS 7 Ngày (Global Flood Awareness System)
* **Mã đối chiếu:** `STT 35` trong `danhsach.md`.
* **Vị trí hiển thị:** Biểu đồ dự báo chuỗi thời gian 7 ngày trong Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Đồng bộ dữ liệu dự báo lưu lượng dòng chảy lưu vực sông Đồng Nai - Sài Gòn từ mô hình GloFAS của Liên minh Châu Âu (ECMWF).
  - Cung cấp đồ thị dự báo xác suất ngập từ Ngày 1 đến Ngày 7 phục vụ công tác ứng phó thiên tai sớm.

#### [CN-36] Bảng Dữ Liệu Thống Kê & Xuất Báo Cáo Chuỗi Thời Gian Thủy Văn Viễn Trắc
* **Mã đối chiếu:** `STT 36` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút xuất dữ liệu "Export CSV / JSON" tại chân Tab 3.
* **Thành phần giao diện & Tương tác:**
  - Bảng số liệu chuỗi thời gian mực nước theo từng 15 phút từ các trạm viễn trắc.
  - Hỗ trợ xuất dữ liệu ra file Excel/CSV để các chuyên gia thủy văn phân tích độc lập.

---

### PHẦN 4: THÀNH VIÊN 4 - LÊ ANH TUẤN (MSSV: 22130297)
*Lĩnh vực chủ trì: Trung Tâm Cứu Hộ SOS, AI Điểm Rủi Ro, DBSCAN, OSRM, Buffer 1000m, Safe Routing & Big Data 7.1M Parquet (STT 37 - 48)*

#### [CN-37] Trung Tâm Cứu Hộ Ngập Lụt Khẩn Cấp Flood SOS Hub (Bán Kính Phát Sóng 2km)
* **Mã đối chiếu:** `STT 37` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút SOS đỏ viền phát sáng nhịp tim trên Composer/Sidebar & Modal Cứu hộ `modalSos`.
* **Thành phần giao diện & Tương tác:**
  - Tiếp nhận khẩn cấp 4 tình huống sự cố giữa tâm ngập:
    1. *Xe máy chết máy do ngập sâu*
    2. *Mắc kẹt nước ngập ngang yên xe $>50\text{cm}$*
    3. *Hỗ trợ sơ tán người già / phụ nữ mang thai / trẻ em*
    4. *Ô tô ngập nước nguy cơ thủy kích*
  - Nhập số điện thoại nạn nhân và tọa độ định vị.
  - Khi phát lệnh cứu hộ, hệ thống phát sóng cờ đỏ SOS nhấp nháy trong bán kính 2km, thông báo tới các điểm sửa xe tình nguyện và tạo bài ghim khẩn cấp trên đầu Bảng tin.

#### [CN-38] Bảng Vinh Danh Hiệp Sĩ Xanh & Xếp Hạng Thi Đua Sinh Thái Tháng (Monthly Leaderboard)
* **Mã đối chiếu:** `STT 38` trong `danhsach.md`.
* **Vị trí hiển thị:** Widget Bảng xếp hạng tại chân Sidebar phải (Tab 1) và Tab 4.
* **Thành phần giao diện & Tương tác:**
  - Bảng xếp hạng Top cá nhân tích cực nhất tháng:
    * 🥇 *Top 1: Lê Bảo Trâm ($2,850\text{ pts}$)*
    * 🥈 *Top 2: Nguyễn Thành Đạt ($1,450\text{ pts}$ - Bạn)*
    * 🥉 *Top 3: Huỳnh Anh Tú ($1,220\text{ pts}$)*
  - Thẻ người dùng hiện tại được tô sáng màu xanh ngọc với thứ hạng tiến độ.

#### [CN-39] Động Cơ Đánh Giá Điểm Rủi Ro Hiện Trường Đa Biến (Dynamic Risk Engine $0 - 100$)
* **Mã đối chiếu:** `STT 39` trong `danhsach.md`.
* **Vị trí hiển thị:** Cột "Điểm Rủi Ro (AI)" trên bảng điều phối Admin và thanh đánh giá Tab 4.
* **Thành phần giao diện & Tương tác:**
  - Thuật toán AI tính toán điểm số nguy cấp chuẩn hóa từ 0 đến 100:
    $$\text{RiskScore} = \min\left(100, \, W_{loai} \cdot 25 + \frac{V_{the\_tich}}{10} \cdot 15 + H_{khan\_cap} \cdot 20\right)$$
  - Hiển thị màu sắc: Xanh lá ($<45$), Vàng cam ($45 - 75$), Đỏ báo động ($>75$, ví dụ điểm ngập $45\text{cm}$ đạt $92/100$).

#### [CN-40] Giám Sát Thời Hạn Cam Kết & Tự Động Leo Thang Cảnh Báo Đỏ (SLA Escalation Engine)
* **Mã đối chiếu:** `STT 40` trong `danhsach.md`.
* **Vị trí hiển thị:** Cột SLA trên Hàng đợi Admin & Hộp cảnh báo Tab 4.
* **Thành phần giao diện & Tương tác:**
  - Đồng hồ đếm ngược thời gian cam kết giải quyết (SLA) dựa trên mức độ nghiêm trọng: Khẩn cấp (2h), Cao (8h), Trung bình (24h).
  - Tự động đổi màu chữ sang đỏ rực và kích hoạt còi rung cảnh báo khi thời hạn còn dưới 60 phút để lãnh đạo đôn đốc xử lý.

#### [CN-41] Thuật Toán Gom Cụm Không Gian Mật Độ DBSCAN Phát Hiện Ổ Rác Phát Sinh
* **Mã đối chiếu:** `STT 41` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút kích hoạt "DBSCAN Clustering" trong Tab 4.
* **Thành phần giao diện & Tương tác:**
  - Thuật toán mật độ không gian với 2 tham số: Bán kính lân cận $\epsilon = 500\text{m}$, số điểm tối thiểu $MinPts = 3$.
  - Tự động gom các báo cáo rác lẻ tẻ thành một ổ rác lớn tự phát (Cluster #01 dọc kênh Nhiêu Lộc - Thị Nghè), tự động nâng cấp độ xử lý cho toàn cụm.

#### [CN-42] Phân Tích Ước Lượng Mật Độ Hạt Nhân KDE (Kernel Density Estimation) Điểm Đen Ngập
* **Mã đối chiếu:** `STT 42` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút kích hoạt "KDE Hotspots" trong Tab 4.
* **Thành phần giao diện & Tương tác:**
  - Sử dụng hàm nhân Gaussian Kernel tính toán bề mặt mật độ ngập lụt liên tục:
    $$\hat{f}(x) = \frac{1}{n b^2 2\pi} \sum_{i=1}^n \exp\left(-\frac{d(x, x_i)^2}{2b^2}\right)$$
  - Giúp phát hiện chính xác vùng trũng nguy cơ cao mà không phụ thuộc vào ranh giới hành chính chia cắt.

#### [CN-43] Báo Cáo Điểm Ngập Cộng Đồng 1-Chạm & Thuật Toán Nắn Khớp Tim Đường OSRM Snap
* **Mã đối chiếu:** `STT 43` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút "🌊 Báo Đường Ngập" trên Composer & Cỗ máy OSRM Tab 4.
* **Thành phần giao diện & Tương tác:**
  - Người dùng bấm chọn độ sâu ngập ($15\text{cm}, 35\text{cm}, 60\text{cm}$).
  - Thuật toán OSRM Snap-to-Road chiếu vuông góc tọa độ thô từ GPS điện thoại vào đúng tim phân đoạn đường bộ gần nhất, loại bỏ sai số lệch nóc nhà/kênh rạch.

#### [CN-44] Hệ Thống Hành Lang Cảnh Báo Ngập 3 Cấp Độ (Warning Corridors Level 1-2-3)
* **Mã đối chiếu:** `STT 44` trong `danhsach.md`.
* **Vị trí hiển thị:** Lớp hiển thị Hành lang giao thông trong Tab 4.
* **Thành phần giao diện & Tương tác:**
  - Phân loại trực quan mạng lưới đường phố thành 3 dải màu hành lang:
    * 🟢 *Level 1 (Xanh lá):* An toàn, mặt đường khô ráo.
    * 🟡 *Level 2 (Vàng):* Nước ngập mép vỉa hè $<20\text{cm}$, xe máy di chuyển chậm.
    * 🔴 *Level 3 (Đỏ cấm):* Ngập sâu $>40\text{cm}$, cấm xe máy và xe gầm thấp lưu thông.

#### [CN-45] Thuật Toán Quét Vùng Đệm Không Gian 1000m (PostGIS `ST_DWithin`) Phát Hiện Cơ Sở Trọng Yếu
* **Mã đối chiếu:** `STT 45` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút bấm "Quét Vùng Đệm 1000m" trong Modal Thanh Tra & Tab 4.
* **Thành phần giao diện & Tương tác:**
  - Thực thi hàm không gian PostGIS:
    ```sql
    SELECT name, type, ST_Distance(geom, point) AS dist 
    FROM facilities 
    WHERE ST_DWithin(geom, ST_SetSRID(ST_Point(106.6914, 10.7932), 4326), 1000);
    ```
  - Xuất báo cáo danh sách cơ sở bị ảnh hưởng trong bán kính 1km: *Trường Mầm Non 6 (cách 320m), Bệnh Viện Bình Thạnh (cách 680m), Trạm Y Tế Phường 6 (cách 450m)* để ưu tiên che chắn và bảo vệ dân cư.

#### [CN-46] Động Cơ Tìm Đường Cứu Nạn & So Sánh Lộ Trình Tránh Ngập An Toàn (Safe Routing Engine)
* **Mã đối chiếu:** `STT 46` trong `danhsach.md`.
* **Vị trí hiển thị:** Bảng điều khiển lộ trình điều hướng trong Tab 4.
* **Thành phần giao diện & Tương tác:**
  - So sánh trực quan song song 2 phương án di chuyển từ Quận 1 sang Thảo Điền:
    * *Tuyến đường thường (Đường Nguyễn Hữu Cảnh):* Chiều dài $4.2\text{ km}$, thời gian 12 phút $\rightarrow$ **Cảnh báo ngập sâu 45cm (Nguy cơ chết máy cao)**.
    * *Tuyến đường né ngập thông minh (Qua Cầu Thủ Thiêm 2 & Mai Chí Thọ):* Chiều dài $5.8\text{ km}$, thời gian 16 phút $\rightarrow$ **100% Khô ráo, an toàn tuyệt đối**.

#### [CN-47] Nền Tảng Phân Tích Dữ Liệu Lớn Big Data 7.1 Triệu Dòng Apache Parquet & DuckDB
* **Mã đối chiếu:** `STT 47` trong `danhsach.md`.
* **Vị trí hiển thị:** Thẻ OLAP Analytics tại Tab 4.
* **Thành phần giao diện & Tương tác:**
  - Mô phỏng truy vấn phân tích tức thời (OLAP) trên tập dữ liệu thủy văn và báo cáo môi trường 7,125,400 dòng được lưu trữ dưới định dạng nén cột Apache Parquet.
  - Tốc độ thực thi truy vấn siêu tốc: $18.4\text{ ms}$ nhờ công nghệ DuckDB WASM chạy trực tiếp trong bộ nhớ.

#### [CN-48] Hệ Thống Bản Địa Hóa & Chuyển Đổi Đa Ngôn Ngữ Song Ngữ Anh - Việt (i18n VI / EN)
* **Mã đối chiếu:** `STT 48` trong `danhsach.md`.
* **Vị trí hiển thị:** Nút chuyển đổi ngôn ngữ `🇻🇳 VI | 🇬🇧 EN` trên góc phải Header.
* **Thành phần giao diện & Tương tác:**
  - Tự động thay đổi toàn bộ từ ngữ giao diện từ Tiếng Việt sang Tiếng Anh (Feed, Composer, Camera HUD, Admin Dispatch Queue, Weather Radar, SOS Hub, Risk Matrix).
  - Phù hợp với người nước ngoài sinh sống tại TP.HCM và đáp ứng tiêu chuẩn hội nhập quốc tế.

---

### PHÂN HỆ ĐẶC BIỆT BỔ TRỢ: CẦU NỐI SONG SONG & MA TRẬN TÁC NGHIỆP 1-CHẠM

#### Phân Hệ Cầu Nối Song Song (Dual-Split Bridge Engine)
* **Vị trí hiển thị:** Tab 5 trên thanh điều hướng.
* **Ý nghĩa tác nghiệp:** Màn hình chia đôi tỷ lệ 50/50: Nửa bên trái là Cổng Công Dân (đăng bài, tương tác), nửa bên phải là Cổng Ban Quản Trị (hàng đợi điều phối, duyệt hồ sơ). Cho phép Hội đồng chấm thi thấy rõ dữ liệu bên Công dân gửi đi thì bên Admin lập tức nhận được theo thời gian thực mà không cần chuyển qua lại các tab.

#### Bảng Ma Trận 48 Chức Năng Tương Tác 1-Chạm (Interactive 48-Function Matrix)
* **Vị trí hiển thị:** Tab 6 trên thanh điều hướng.
* **Ý nghĩa tác nghiệp:** Bảng tra cứu toàn diện gồm 48 hàng được đánh số từ CN-01 đến CN-48. Mỗi hàng ghi rõ tên chức năng, thành viên phụ trách, công nghệ áp dụng và **một nút bấm kích hoạt trực tiếp**. Người kiểm tra chỉ cần bấm nút để kiểm chứng tính năng hoạt động ngay lập tức.

---

## IV. MA TRẬN ĐỐI CHIẾU 1-1 TOÀN BỘ 48 CHỨC NĂNG VỚI `danhsach.md`

| STT | Mã Chức Năng Demo | Tên Chức Năng Thể Hiện Trên Giao Diện Demo | Thuộc STT Trong danhsach.md | Thành Viên Phụ Trách | Trạng Thái Giao Diện Demo |
| :---: | :---: | :--- | :---: | :---: | :---: |
| 1 | **CN-01** | Đăng ký, Đăng nhập & Xác thực JWT bảo mật 2 lớp (2FA OTP) | **STT 01** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 2 | **CN-02** | Phân quyền vai trò người dùng (RBAC: Citizen / Worker / Admin) | **STT 02** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 3 | **CN-03** | Quản lý thông tin hồ sơ cá nhân & Dấu chân sinh thái | **STT 03** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 4 | **CN-04** | Thẻ Hộ chiếu Xanh điện tử (Digital Green Passport & ID Card) | **STT 04** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 5 | **CN-05** | Đổi mật khẩu an toàn & Khôi phục tài khoản qua Email Token | **STT 05** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 6 | **CN-06** | Bảng tin sinh thái đô thị theo bán kính không gian (Geo-Feed) | **STT 06** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 7 | **CN-07** | Soạn thảo & Đăng bài báo cáo sự cố kèm tọa độ GPS | **STT 07** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 8 | **CN-08** | Động cơ tương tác bộ 4 cảm xúc sinh thái (Eco-Reactions) | **STT 08** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 9 | **CN-09** | Quản lý chiến dịch cộng đồng "Chủ Nhật Xanh" (RSVP) | **STT 09** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 10 | **CN-10** | Xác thực hiện trường sự kiện bằng Geofencing Check-in 100m | **STT 10** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 11 | **CN-11** | Game hóa tích điểm Eco-points, thăng hạng & Ví voucher | **STT 11** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 12 | **CN-12** | Kênh thảo luận cộng đồng trực tiếp theo quận (District Chat) | **STT 12** | Nguyễn Thành Đạt | **Đã có 100% UI & Dữ liệu** |
| 13 | **CN-13** | Kính ngắm Camera HUD hiện trường & Nén ảnh Client-side | **STT 13** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 14 | **CN-14** | Cỗ máy trạng thái vòng đời sự cố & Trình trượt Before/After | **STT 14** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 15 | **CN-15** | Hệ thống phân công tác nghiệp Đội phản ứng nhanh 22 Quận | **STT 15** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 16 | **CN-16** | Trung tâm điều hành & Đo lường KPI tác nghiệp đô thị | **STT 16** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 17 | **CN-17** | Bản đồ WebGIS đa lớp nền tảng số (7 loại Basemap quốc tế) | **STT 17** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 18 | **CN-18** | Lớp mô hình không gian 3D công trình kiến trúc (5 Themes) | **STT 18** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 19 | **CN-19** | Ranh giới hành chính số 22 quận/huyện TP.HCM kèm tương tác | **STT 19** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 20 | **CN-20** | Bản đồ không gian các điểm xanh & công viên sinh thái | **STT 20** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 21 | **CN-21** | Mạng lưới trạm thu gom & tái chế rác thông minh | **STT 21** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 22 | **CN-22** | Module CRUD quản lý danh mục phân loại rác thải đô thị | **STT 22** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 23 | **CN-23** | Module CRUD quản lý mạng lưới trạm tiếp nhận tái chế | **STT 23** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 24 | **CN-24** | Module CRUD quản lý cơ sở hạ tầng môi trường & hành chính | **STT 24** | Huỳnh Anh Tú | **Đã có 100% UI & Dữ liệu** |
| 25 | **CN-25** | Lớp bản đồ điểm ngập lịch sử & điểm đen ngập lụt đô thị | **STT 25** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 26 | **CN-26** | Hệ thống trạm quan trắc thủy văn & mực nước triều trực tuyến | **STT 26** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 27 | **CN-27** | Bản đồ nhiệt mật độ rủi ro tổng hợp đa nguồn (Heatmap) | **STT 27** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 28 | **CN-28** | Bản đồ nội suy nhiệt độ mặt đất đô thị (Urban Heat Island) | **STT 28** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 29 | **CN-29** | Bản đồ chất lượng không khí & nồng độ bụi mịn PM2.5/PM10 | **STT 29** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 30 | **CN-30** | Trạm radar thời tiết đa tầng 8 lớp (Rain, Wind, Waves...) | **STT 30** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 31 | **CN-31** | Mô hình toán học điều hòa 4 sóng triều chính (M2, S2, K1, O1) | **STT 31** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 32 | **CN-32** | Động cơ giải tích xác định cực trị triều dH/dt = 0 & đỉnh triều | **STT 32** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 33 | **CN-33** | Ma trận đánh giá rủi ro ngập kết hợp triều cường & mưa lớn | **STT 33** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 34 | **CN-34** | Động cơ đánh giá rủi ro ngập lụt đa yếu tố (Risk Engine) | **STT 34** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 35 | **CN-35** | Tích hợp mô hình dự báo ngập toàn cầu GloFAS 7 ngày | **STT 35** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 36 | **CN-36** | Bảng dữ liệu thống kê & xuất báo cáo chuỗi thời gian thủy văn | **STT 36** | Bùi Nguyễn Minh Quân | **Đã có 100% UI & Dữ liệu** |
| 37 | **CN-37** | Trung tâm cứu hộ ngập lụt khẩn cấp Flood SOS Hub (bán kính 2km) | **STT 37** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 38 | **CN-38** | Bảng vinh danh Hiệp Sĩ Xanh & Xếp hạng thi đua tháng | **STT 38** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 39 | **CN-39** | Động cơ tính điểm rủi ro hiện trường đa biến (0-100) | **STT 39** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 40 | **CN-40** | Giám sát thời hạn xử lý cam kết & Tự động leo thang SLA | **STT 40** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 41 | **CN-41** | Thuật toán gom cụm mật độ không gian DBSCAN phát hiện ổ rác | **STT 41** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 42 | **CN-42** | Ước lượng mật độ hạt nhân KDE (Kernel Density) điểm đen ngập | **STT 42** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 43 | **CN-43** | Báo cáo điểm ngập cộng đồng & Nắn khớp tim đường OSRM Snap | **STT 43** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 44 | **CN-44** | Hệ thống hành lang cảnh báo ngập 3 cấp độ (Warning Corridors) | **STT 44** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 45 | **CN-45** | Thuật toán quét vùng đệm 1000m (PostGIS ST_DWithin) cơ sở | **STT 45** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 46 | **CN-46** | Động cơ tìm đường cứu nạn & So sánh lộ trình tránh ngập an toàn | **STT 46** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 47 | **CN-47** | Nền tảng phân tích dữ liệu lớn Big Data 7.1M dòng Apache Parquet | **STT 47** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |
| 48 | **CN-48** | Bản địa hóa & Chuyển đổi đa ngôn ngữ Song ngữ Anh - Việt | **STT 48** | Lê Anh Tuấn | **Đã có 100% UI & Dữ liệu** |

---

## V. ĐỀ XUẤT ĐỐI CHIẾU & HOÁN ĐỔI TRONG BÁO CÁO PHÂN CÔNG ĐỒ ÁN

### 1. Phân bổ đồng đều và tối ưu năng lực
- Mỗi thành viên phụ trách chính xác **12 chức năng chuyên sâu**, tạo nên một tổng thể hoàn chỉnh từ tầng Giao diện tương tác người dùng (Frontend), Nghiệp vụ điều hành hiện trường (Operations), Công nghệ bản đồ số (WebGIS), Mô hình giải tích khoa học (Science/Hydrology), cho đến Cỗ máy phân tích dữ liệu lớn và Trí tuệ nhân tạo (AI/Big Data).
- Không có bất kỳ thành viên nào bị thiệt thòi hay làm quá ít chức năng; mọi chức năng đều có giao diện tương tác minh họa rõ ràng.

### 2. Ưu thế khi trình diễn trước Hội đồng chấm thi
- **Không có chức năng "chết":** Khi thầy cô hỏi bất kỳ chức năng nào từ STT 01 đến STT 48, sinh viên chỉ việc mở Tab 6 hoặc các Tab chuyên đề và bấm nút trình diễn ngay trên màn hình.
- **Có đầy đủ chiều sâu công nghệ:** Từ các thuật toán toán học thuần túy (Harmonic Tide Analysis, Đạo hàm cực trị $dh/dt=0$, DBSCAN, Gaussian KDE, Haversine, PostGIS $ST\_DWithin$) đến kiến trúc dữ liệu hiện đại (Apache Parquet, DuckDB, JWT RBAC 2FA).
- **Trải nghiệm UX đỉnh cao:** Giao diện tối ưu theo chuẩn quốc tế, có âm thanh phản hồi haptic, kính ngắm camera hiện trường và chế độ cầu nối song song thời gian thực.

---

## VI. HƯỚNG DẪN KIỂM TRA TRỰC TIẾP TRÊN GIAO DIỆN

1. Mở file [`social_simulation.html`](file:///d:/Group-j_GreenSpot/social_simulation.html) bằng bất kỳ trình duyệt nào (Chrome, Edge, Brave...).
2. Để kiểm tra toàn bộ 48 chức năng một cách nhanh nhất:
   - Click vào Tab **"📋 Ma Trận 48 Chức Năng"** trên thanh điều hướng.
   - Duyệt qua danh sách từ dòng 1 đến dòng 48.
   - Click vào nút hành động tương ứng ở cột cuối cùng của từng dòng (ví dụ: *Chụp ảnh HUD, Chạy State Machine, Mở Radar 8 Lớp, Chạy DBSCAN, Chạy DuckDB 7.1M...*).
   - Quan sát thông báo Toast, Modal tương tác hoặc biểu đồ hiển thị ngay tức khắc.
3. Để kiểm tra tính tương tác 2 chiều giữa Công dân và Ban Quản Trị:
   - Click vào Tab **"⚡ Song Song (Bridge)"**.
   - Ở nửa màn hình bên trái (Công Dân): Bấm nút *"Giả lập gửi Báo cáo Sự Cố Mới"*.
   - Lập tức quan sát ở nửa màn hình bên phải (Ban Quản Trị): Hàng đợi điều phối nhảy thêm sự cố mới với điểm rủi ro AI và thời hạn đếm ngược SLA.
