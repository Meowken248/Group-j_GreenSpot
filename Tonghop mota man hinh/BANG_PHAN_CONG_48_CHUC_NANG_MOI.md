# ĐỒ ÁN CHUYÊN ĐỀ: HỆ THỐNG QUẢN LÝ MÔI TRƯỜNG ĐÔ THỊ, BẢN ĐỒ SỐ WEBGIS & BÁO ĐỘNG NGẬP LỤT (GREENSPOT / ECOREPORT)

*Bảng phân công nhiệm vụ, tiến độ hoàn thành và chuẩn hóa 48 chức năng toàn diện (STT 01 - STT 48) khớp 100% với Báo cáo kiểm toán mã nguồn:*

| Họ và Tên | STT | Chức Năng Nghiệp Vụ Chuẩn Hóa | Phân Hệ | % Hoàn Thành | Đánh Giá SV |
|:---|:---:|:---|:---|:---:|:---:|
| **Nguyễn Thành Đạt** | 1 | Đăng ký tài khoản người dân (Citizen Registration) | Quản trị RBAC | 90% | Đạt |
| | 2 | Đăng nhập & Xác thực bảo mật phiên làm việc (JWT Secure Login) | Quản trị RBAC | 90% | Đạt |
| | 3 | Quản lý hồ sơ người dùng & Lịch sử đóng góp phản ánh | Quản trị RBAC | 85% | Đạt |
| | 4 | Phân quyền vai trò RBAC (Admin, Manager, Citizen, Responder) | Quản trị RBAC | 95% | Đạt |
| | 5 | Quản lý trạng thái tài khoản & Chặn báo cáo giả mạo (Anti-Spam) | Quản trị RBAC | 85% | Đạt |
| | 6 | Popover chẩn đoán kết nối Microservice Backend (/health) | Quản trị RBAC | 100% | Đạt |
| | 7 | Báo cáo sự cố môi trường kèm tọa độ GPS trực tiếp | Xử lý Sự cố | 95% | Đạt |
| | 8 | Đính kèm hình ảnh/video minh chứng hiện trường sự cố | Xử lý Sự cố | 85% | Đạt |
| | 9 | Định danh mã theo dõi sự cố công khai (Tracking Code) | Xử lý Sự cố | 100% | Đạt |
| | 10 | Tương tác cộng đồng: Xác nhận (Upvotes) sự cố | Xử lý Sự cố | 100% | Đạt |
| | 11 | Phân loại sự cố theo danh mục rác thải đô thị | Xử lý Sự cố | 100% | Đạt |
| | 12 | Theo dõi vòng đời xử lý sự cố (Pending, Progress, Resolved) | Xử lý Sự cố | 100% | Đạt |
| **Huỳnh Anh Tú** | 13 | Phân công điều phối đội phản ứng nhanh theo địa bàn quận | Xử lý Sự cố | 85% | Đạt |
| | 14 | Báo cáo tóm tắt tổng lượng sự cố môi trường toàn thành phố | Xử lý Sự cố | 100% | Đạt |
| | 15 | Chuyển đổi 7 chế độ bản đồ nền (Google Maps Cluster, OSM, Dark) | Bản đồ WebGIS | 100% | Đạt |
| | 16 | Góc nhìn không gian 3D đùn khối công trình với 5 chủ đề màu sắc | Bản đồ WebGIS | 100% | Đạt |
| | 17 | Phân vùng ranh giới 22 quận/huyện TP.HCM & TP. Thủ Đức kèm FlyTo | Bản đồ WebGIS | 100% | Đạt |
| | 18 | Tra cứu công viên sinh thái, mảng xanh đô thị (Green Spots) | Bản đồ WebGIS | 100% | Đạt |
| | 19 | Tra cứu mạng lưới trạm thu gom rác tái chế & pin cũ (Recycling) | Bản đồ WebGIS | 100% | Đạt |
| | 20 | Tự động tải tiện ích xung quanh theo mức zoom (LOD POIs) | Bản đồ WebGIS | 100% | Đạt |
| | 21 | Ô tìm kiếm thông minh địa điểm, số nhà, ngõ hẻm toàn thành phố | Bản đồ WebGIS | 100% | Đạt |
| | 22 | Định vị GPS vệ tinh siêu tốc & Vòng tròn bán kính sai số | Bản đồ WebGIS | 100% | Đạt |
| | 23 | Thả ghim giải mã tọa độ ngược thành số nhà (OSM Reverse Geocoding) | Bản đồ WebGIS | 100% | Đạt |
| | 24 | Quick Tour 3D khám phá danh thắng tiêu biểu Việt Nam | Bản đồ WebGIS | 100% | Đạt |
| **Bùi Nguyễn Minh Quân** | 25 | Quản lý mạng lưới trạm cảm biến viễn trắc IoT môi trường | Trạm Quan trắc IoT | 100% | Đạt |
| | 26 | Nhật ký lưu trữ chuỗi thời gian số liệu quan trắc viễn trắc | Trạm Quan trắc IoT | 95% | Đạt |
| | 27 | Bản đồ nhiệt nhiệt độ khí quyển (°C) toàn quốc | Bản đồ Nhiệt Đa dải | 100% | Đạt |
| | 28 | Bản đồ nhiệt chất lượng không khí (AQI Heatmap Layer US EPA) | Bản đồ Nhiệt Đa dải | 100% | Đạt |
| | 29 | Bản đồ nhiệt mật độ rủi ro ô nhiễm đô thị | Bản đồ Nhiệt Đa dải | 100% | Đạt |
| | 30 | Live Weather Radar Map: 8 lớp phủ khí quyển động học | Bản đồ Nhiệt Đa dải | 100% | Đạt |
| | 31 | Động cơ giải tích sóng thủy triều thuần Python (Harmonic Tide) | Giám sát Ngập lụt | 100% | Đạt |
| | 32 | Quan trắc & dự báo mực nước triều trạm Phú An và Nhà Bè | Giám sát Ngập lụt | 100% | Đạt |
| | 33 | Tự động dò đỉnh triều (High Tide), chân triều và báo động BĐ3 | Giám sát Ngập lụt | 100% | Đạt |
| | 34 | Động cơ phân tích rủi ro ngập lụt đa nhân tố (Flood Risk Engine) | Giám sát Ngập lụt | 100% | Đạt |
| | 35 | Thanh trượt mô phỏng kịch bản ngập lụt tương tác (0 - 100 mm/h) | Giám sát Ngập lụt | 100% | Đạt |
| | 36 | Tích hợp dự báo nguy cơ lũ lụt Copernicus GloFAS toàn cầu 7 ngày | Giám sát Ngập lụt | 100% | Đạt |
| **Lê Anh Tuấn** | 37 | Cơ chế tính điểm rủi ro (Risk Score 0-100) cho từng sự cố | Phân tích Sự cố | 70% | Đạt |
| | 38 | Tự động phân loại mức độ nguy hiểm: thấp, trung bình, cao, khẩn cấp | Phân tích Sự cố | 75% | Đạt |
| | 39 | Phát hiện và gom cụm các báo cáo gần nhau theo tọa độ (DBSCAN) | Không gian Thông minh | 45% | Đạt |
| | 40 | Phân tích và xác định điểm nóng sự cố theo không gian và thời gian | Không gian Thông minh | 60% | Đạt |
| | 41 | Báo cáo điểm ngập cộng đồng 1 chạm & Snap-to-Road OSRM | Giám sát Ngập lụt | 100% | Đạt |
| | 42 | Xây dựng bản đồ nguy cơ ngập động theo từng khu vực (Vẽ đường 3 lớp) | Giám sát Ngập lụt | 90% | Đạt |
| | 43 | Tìm tuyến đường an toàn tránh khu vực đang ngập (PostGIS ST_DWithin) | Giám sát Ngập lụt | 90% | Đạt |
| | 44 | So sánh tuyến đường nhanh nhất và tuyến đường an toàn nhất | Giám sát Ngập lụt | 65% | Đạt |
| | 45 | Tìm cơ sở thiết yếu gần sự cố (Bệnh viện, trường học vùng đệm 1km) | Không gian Thông minh | 70% | Đạt |
| | 46 | Hệ thống đa ngôn ngữ tập trung Python Backend (python-i18n) | Đa Ngôn Ngữ | 100% | Đạt |
| | 47 | Bộ điều hợp đồng bộ dữ liệu thời gian thực Live Runtime Synchronizer | AI & Big Data | 100% | Đạt |
| | 48 | Dashboard phân tích rủi ro đô thị (AQI & Khí hậu 34 tỉnh thành) | AI & Big Data | 100% | Đạt |
