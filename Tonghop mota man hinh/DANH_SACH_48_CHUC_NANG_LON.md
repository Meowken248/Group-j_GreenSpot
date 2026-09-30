# TÀI LIỆU QUẢN LÝ DỰ ÁN: 48 CHỨC NĂNG LỚN CỦA HỆ THỐNG GREENSPOT / ECOREPORT
**Đơn vị lập:** Quản Lý Dự Án (Project Management Office)  
**Phiên bản:** v3.0 - Major Features Consolidation  
**Ngày cập nhật:** 29/09/2026  
**Phạm vi:** Tổng hợp và gom cụm toàn bộ 103 tính năng chi tiết thành **48 chức năng lớn (Major Features / Modules)** phục vụ lập kế hoạch phát triển, phân bổ tài nguyên, nghiệm thu và chuyển giao sản phẩm.

---

## MA TRẬN 48 CHỨC NĂNG LỚN THEO 7 KHỐI TRỤ CỘT

| Khối nghiệp vụ | Số lượng chức năng lớn | Mã nhận diện |
|:---|:---:|:---:|
| **Khối 1: Bản Đồ Không Gian Số WebGIS (EcoMap Core)** | 12 Chức năng lớn | MF-01 ➔ MF-12 |
| **Khối 2: Giám Sát & Báo Động Ngập Lụt Đô Thị (Smart Flood Watch)** | 07 Chức năng lớn | MF-13 ➔ MF-19 |
| **Khối 3: Báo Cáo Cộng Đồng & Phản Ánh Hiện Trường (Crowdsourcing)** | 05 Chức năng lớn | MF-20 ➔ MF-24 |
| **Khối 4: Điều Hướng Tuyến Đường Thông Minh & Né Ngập (Safe Routing)** | 04 Chức năng lớn | MF-25 ➔ MF-28 |
| **Khối 5: Bảng Phân Tích Chất Lượng Không Khí & Khí Hậu (AQI Dashboard)** | 10 Chức năng lớn | MF-29 ➔ MF-38 |
| **Khối 6: Radar Khí Tượng Động Lực Học Trực Tiếp (Live Weather Radar)** | 03 Chức năng lớn | MF-39 ➔ MF-41 |
| **Khối 7: Quản Trị Hệ Thống, RBAC, Logistics & Tiện Ích Đô Thị** | 07 Chức năng lớn | MF-42 ➔ MF-48 |
| **TỔNG CỘNG HỆ THỐNG** | **48 CHỨC NĂNG LỚN** | **MF-01 ➔ MF-48** |

---

## KHỐI 1: BẢN ĐỒ KHÔNG GIAN SỐ WEBGIS (ECOMAP CORE)

### 01. Quản lý Đa Lớp Bản Đồ Nền Đô Thị (Multi-Source Basemap Layer Management)
- **Mã chức năng:** `MF-01`
- **Mục tiêu nghiệp vụ:** Cung cấp nhiều góc nhìn bản đồ phù hợp cho từng bối cảnh sử dụng (đi đường, khảo sát vệ tinh, theo dõi giao thông, quan sát đêm).
- **Các thành phần hợp nhất:**
  - Chuyển đổi Google Roadmap (Giao thông đường phố chi tiết qua Tile Cluster).
  - Chuyển đổi Google Hybrid (Ảnh vệ tinh sắc nét kèm nhãn địa danh).
  - Chuyển đổi Google Traffic (Mật độ kẹt xe thời gian thực).
  - Chuyển đổi OpenStreetMap (Bản đồ nguồn mở cộng đồng).
  - Chuyển đổi CartoDB Positron (Nền sáng tinh giản) và CartoDB Dark Matter (Nền tối tương phản cao).
- **Đối tượng:** Tất cả người dùng (Công dân, Cán bộ, Khách vãng lai).
- **Vị trí mã nguồn:** `frontend/src/components/EcoMap.tsx` (`MAP_STYLES`).

### 02. Kết Xuất Kiến Trúc Tòa Nhà 3D & Tùy Biến Chủ Đề Màu Sắc (3D Buildings Extrusion & Theming)
- **Mã chức năng:** `MF-02`
- **Mục tiêu nghiệp vụ:** Trực quan hóa không gian đô thị 3 chiều sống động, hỗ trợ phân tích độ cao công trình và mật độ xây dựng.
- **Các thành phần hợp nhất:**
  - Bật/tắt góc nhìn 3D (Pitch 60°, Bearing -17.6°).
  - Kết xuất khối hộp tòa nhà 3D dựa trên dữ liệu chiều cao thực tế.
  - Tùy biến 5 chủ đề màu sắc 3D: Cầu vồng đa sắc (Rainbow), Neon Cyberpunk phát sáng, Xanh sinh thái (Emerald), Vàng ấm (Amber), Tối giản (Slate).
- **Đối tượng:** Công dân, Chuyên viên quy hoạch đô thị.
- **Vị trí mã nguồn:** `frontend/src/components/EcoMap.tsx` (Layer `3d-buildings`, state `building3DTheme`).

### 03. Quản Lý & Hiển Thị Ranh Giới Hành Chính 22 Quận/Huyện TP.HCM (Administrative Boundaries)
- **Mã chức năng:** `MF-03`
- **Mục tiêu nghiệp vụ:** Xác định phân vùng quản lý hành chính, hỗ trợ thống kê và phân bổ nguồn lực xử lý môi trường theo từng quận/huyện.
- **Các thành phần hợp nhất:**
  - Nạp dữ liệu đa giác ranh giới PostGIS `MultiPolygon` của 22 quận, huyện và TP. Thủ Đức.
  - Bật/tắt lớp ranh giới linh hoạt kèm nhãn tên đơn vị hành chính.
- **Đối tượng:** Cán bộ môi trường, Nhà quản trị hệ thống.
- **Vị trí mã nguồn:** `backend/app/api/v1/spatial.py`, `frontend/src/components/EcoMap.tsx`.

### 04. Quản Lý & Giám Sát Điểm Sự Cố Ô Nhiễm Môi Trường Trên Bản Đồ (Environmental Incidents Mapping)
- **Mã chức năng:** `MF-04`
- **Mục tiêu nghiệp vụ:** Trực quan hóa toàn bộ các điểm nóng ô nhiễm rác thải trên địa bàn để điều phối xử lý kịp thời.
- **Các thành phần hợp nhất:**
  - Hiển thị Marker chuyên biệt cho từng loại sự cố (bãi rác sinh hoạt, hóa chất nguy hại, tắc cống ngập nước, ô nhiễm kênh rạch, xà bần).
  - Hiển thị nhãn trạng thái tiến độ: Chờ xử lý (`PENDING`), Đang xử lý (`IN_PROGRESS`), Đã nghiệm thu (`RESOLVED`).
  - Hiển thị điểm số rủi ro (`risk_score`) và số lượt cộng đồng tán thành (Upvotes).
- **Đối tượng:** Cán bộ điều phối, Đội thu gom, Người dân theo dõi.
- **Vị trí mã nguồn:** `backend/app/api/v1/eco_locations.py`, `frontend/src/components/EcoMap.tsx`.

### 05. Quản Lý & Tra Cứu Không Gian Xanh & Điểm Sinh Thái (Urban Green Spaces Explorer)
- **Mã chức năng:** `MF-05`
- **Mục tiêu nghiệp vụ:** Khuyến khích lối sống xanh, giúp người dân dễ dàng tìm kiếm công viên, mảng xanh đô thị để thư giãn và rèn luyện sức khỏe.
- **Các thành phần hợp nhất:**
  - Định vị công viên công cộng, thảo cầm viên, khu du lịch sinh thái, khu dự trữ sinh quyển.
  - Cung cấp diện tích mảng xanh, mức độ trong lành và đánh giá chất lượng từ cộng đồng.
- **Đối tượng:** Công dân đô thị, Khách du lịch.
- **Vị trí mã nguồn:** `backend/app/api/v1/eco_locations.py`, `frontend/src/components/EcoMap.tsx`.

### 06. Quản Lý Mạng Lưới Điểm Tiếp Nhận Rác Tái Chế & E-waste (Recycling Facilities Network)
- **Mã chức năng:** `MF-06`
- **Mục tiêu nghiệp vụ:** Thúc đẩy kinh tế tuần hoàn và phân loại rác tại nguồn, cung cấp địa chỉ thu gom rác nguy hại và tái chế.
- **Các thành phần hợp nhất:**
  - Định vị điểm thu gom pin cũ, rác thải điện tử, đồ nhựa, vỏ hộp sữa, kim loại, giấy báo.
  - Cung cấp khung giờ mở cửa tiếp nhận, số hotline liên hệ và tổ chức chủ quản.
- **Đối tượng:** Người dân tham gia phân loại rác, Các đơn vị tái chế.
- **Vị trí mã nguồn:** `backend/app/api/v1/eco_locations.py`, `frontend/src/components/EcoMap.tsx`.

### 07. Quản Lý & Giám Sát Mạng Lưới Trạm Cảm Biến Quan Trắc IoT (IoT Sensor Stations Telemetry)
- **Mã chức năng:** `MF-07`
- **Mục tiêu nghiệp vụ:** Theo dõi tình trạng sức khỏe của hạ tầng cảm biến viễn trắc môi trường thông minh trên toàn thành phố.
- **Các thành phần hợp nhất:**
  - Trực quan hóa trạm quan trắc chất lượng không khí (AQI), trạm đo ngập sóng siêu âm, trạm thủy văn ven sông.
  - Hiển thị trạng thái kết nối trực tuyến (ONLINE/OFFLINE), loại nguồn điện (pin/năng lượng mặt trời), và dữ liệu cảm biến đo được tức thời.
- **Đối tượng:** Kỹ sư vận hành IoT, Cán bộ quan trắc môi trường.
- **Vị trí mã nguồn:** `backend/app/api/v1/eco_locations.py`, `backend/app/models/iot.py`.

### 08. Quản Lý & Trực Quan Hóa Điểm Đen Ngập Lụt Đô Thị (Urban Flood Hotspots Mapping)
- **Mã chức năng:** `MF-08`
- **Mục tiêu nghiệp vụ:** Cảnh báo các vị trí thường xuyên xảy ra ngập úng khi mưa to hoặc triều cường dâng cao.
- **Các thành phần hợp nhất:**
  - Hiển thị Marker điểm ngập kèm phân loại nguyên nhân chính (do triều cường, do mưa lớn hay do nghẽn cống).
  - Thể hiện độ sâu ngập lịch sử, cao độ mặt đường và đánh giá chất lượng hệ thống tiêu thoát nước.
- **Đối tượng:** Người tham gia giao thông, Trung tâm Chống ngập TP.
- **Vị trí mã nguồn:** `backend/app/api/v1/flood.py`, `backend/app/services/flood_service.py`.

### 09. Thẻ Thông Tin Chi Tiết Địa Điểm Tích Hợp Điều Hướng Đa Năng (Interactive Location Card Panel)
- **Mã chức năng:** `MF-09`
- **Mục tiêu nghiệp vụ:** Cung cấp thông tin tập trung, đầy đủ và tiện ích tương tác ngay khi người dùng nhấp vào bất kỳ đối tượng nào trên bản đồ.
- **Các thành phần hợp nhất:**
  - Thanh Panel hiển thị hình ảnh, tên gọi, địa chỉ, khoảng cách tính từ vị trí GPS của người dùng.
  - Tích hợp các nút hành động nhanh: "Dẫn đường đến đây", "Xem dự báo", "Đồng thuận/Upvote", "Đóng panel".
- **Đối tượng:** Tất cả người dùng.
- **Vị trí mã nguồn:** `frontend/src/components/EcoMap.tsx` (`selectedLocation`, `selectedFloodSpot`).

### 10. Bản Đồ Nhiệt Môi Trường & Khí Hậu Nội Suy Đa Chế Độ (Environmental Interpolated Heatmaps)
- **Mã chức năng:** `MF-10`
- **Mục tiêu nghiệp vụ:** Phân tích mật độ phân bố không gian của các yếu tố môi trường để nhận diện các "vùng trũng ô nhiễm" hoặc "đảo nhiệt đô thị".
- **Các thành phần hợp nhất:**
  - Bản đồ nhiệt Khí độ (Temperature Heatmap) thể hiện vi khí hậu nóng/mát.
  - Bản đồ nhiệt Chất lượng không khí (AQI Heatmap) thể hiện vùng ô nhiễm bụi mịn.
  - Bản đồ nhiệt Rủi ro Môi trường (Risk Heatmap) kết hợp mật độ sự cố và điểm ngập.
- **Đối tượng:** Chuyên gia môi trường, Cán bộ quản lý.
- **Vị trí mã nguồn:** `backend/app/api/v1/weather.py`, `frontend/src/components/EcoMap.tsx`.

### 11. Khám Phá Không Gian 3D Tự Động Qua Quick Tour Địa Danh (Iconic 3D Landmark Quick Tour)
- **Mã chức năng:** `MF-11`
- **Mục tiêu nghiệp vụ:** Nâng cao trải nghiệm thị giác và giúp người dùng nhanh chóng định vị các công trình mang tính biểu tượng của đô thị.
- **Các thành phần hợp nhất:**
  - Chuyển góc nhìn camera mượt mà (Smooth Fly-to Animation) bao quát các điểm mốc: Landmark 81, Bitexco Financial Tower, Thảo Cầm Viên, Công viên Tao Đàn, Khu Công nghệ Cao TP.HCM.
- **Đối tượng:** Công dân, Khách du lịch.
- **Vị trí mã nguồn:** `frontend/src/components/EcoMap.tsx`, `frontend/src/data/hcmLocations.ts`.

### 12. Định Vị GPS, Bảng HUD Tọa Độ & Tra Cứu Địa Chỉ Đảo OSM (Spatial HUD & Reverse Geocoding)
- **Mã chức năng:** `MF-12`
- **Mục tiêu nghiệp vụ:** Cung cấp bộ công cụ định vị và trích xuất thông tin địa lý tức thời ở cấp độ mét.
- **Các thành phần hợp nhất:**
  - Định vị vị trí hiện tại của người dùng qua Fast Geolocation API.
  - Bảng HUD thời gian thực: Tọa độ con trỏ chuột (Lat/Lng), mức Zoom, la bàn định hướng.
  - Bấm chuột trái vào bất kỳ điểm nào trên bản đồ để tra cứu địa chỉ số nhà, tên đường, phường/xã thực tế (Reverse Geocoding OpenStreetMap Nominatim).
  - Ô tìm kiếm thông minh tự động gợi ý địa danh (Live Search / Autocomplete).
- **Đối tượng:** Tất cả người dùng.
- **Vị trí mã nguồn:** `frontend/src/services/osmAdvancedService.ts`, `frontend/src/hooks/useFastGeolocation.ts`.

---

## KHỐI 2: GIÁM SÁT & BÁO ĐỘNG NGẬP LỤT ĐÔ THỊ (SMART FLOOD WATCH)

### 13. Động Cơ Giải Tích Sóng Triều Độc Lập & Báo Động Triều Cường Realtime (Harmonic Tide Engine)
- **Mã chức năng:** `MF-13`
- **Mục tiêu nghiệp vụ:** Dự báo chính xác mực nước triều cường sông Sài Gòn mà không phụ thuộc vào kết nối API bên thứ ba, đảm bảo tính liên tục của hệ thống cảnh báo.
- **Các thành phần hợp nhất:**
  - Thuật toán phân tích sóng điều hòa thiên văn Harmonic Analysis (các sóng M2, S2, K1, O1...) độc lập viết bằng Python.
  - Tính toán mực nước tức thời (mét) tại Trạm Thủy văn Phú An (Sông Sài Gòn) và Trạm Nhà Bè (Sông Đồng Điền).
  - Phân loại cấp báo động thủy triều TP.HCM: Bình thường, Báo động I (1.40m), Báo động II (1.50m), Báo động III (> 1.60m).
- **Đối tượng:** Người dân sống ven sông rạch, Ban Chỉ huy Phòng chống thiên tai.
- **Vị trí mã nguồn:** `backend/app/services/tide_service.py`, API: `GET /api/v1/flood/tide/current`.

### 14. Dự Báo Chuỗi Thời Gian Dao Động Thủy Triều & Điểm Cực Trị (24h - 48h Tide Forecasting)
- **Mã chức năng:** `MF-14`
- **Mục tiêu nghiệp vụ:** Cung cấp lộ trình con nước lên xuống giúp người dân chủ động kế hoạch di chuyển và kê cao đồ đạc trước giờ đỉnh triều.
- **Các thành phần hợp nhất:**
  - Xuất chuỗi dữ liệu dự báo con nước theo từng bước nhảy thời gian (15 - 60 phút) trong 24 đến 48 giờ tới.
  - Tự động xác định chính xác thời điểm và độ cao của Đỉnh triều (High Tide) và Chân triều (Low Tide) tiếp theo.
- **Đối tượng:** Công dân, Các công ty vận tải đường bộ/đường thủy.
- **Vị trí mã nguồn:** `backend/app/services/tide_service.py`, API: `GET /api/v1/flood/tide/forecast`.

### 15. Tích Hợp Đa Nguồn Dữ Liệu Ngập Lụt Đô Thị (Multi-Source Flood Fusion)
- **Mã chức năng:** `MF-15`
- **Mục tiêu nghiệp vụ:** Kết hợp toàn diện dữ liệu hạ tầng chính thống với dữ liệu thời tiết hiện đại để có cái nhìn toàn cảnh về tình hình ngập úng.
- **Các thành phần hợp nhất:**
  - *Nguồn 1:* Cổng dữ liệu Mở TP.HCM (Sở Xây dựng & Công ty Thoát nước Đô thị UDC) - hơn 30 điểm đen ngập, trạm bơm, cao độ mặt đường.
  - *Nguồn 2:* Dữ liệu khí tượng mưa thời gian thực kết hợp triều cường Phú An.
  - *Nguồn 3:* Dữ liệu lưu lượng sông ngòi toàn cầu từ Copernicus GloFAS.
- **Đối tượng:** Ban Quản lý Đô thị, Người dân TP.HCM.
- **Vị trí mã nguồn:** `backend/app/services/flood_service.py`, API: `GET /api/v1/flood/hotspots`.

### 16. Đánh Giá Rủi Ro Ngập Lụt Động Kết Hợp Mưa & Triều Cường (Dynamic Flood Risk Engine)
- **Mã chức năng:** `MF-16`
- **Mục tiêu nghiệp vụ:** Tự động tính toán mức độ ngập thực tế khi xảy ra hiện tượng "mưa lớn kết hợp triều cường đạt đỉnh".
- **Các thành phần hợp nhất:**
  - Động cơ `IFloodEngine` tính toán điểm số rủi ro chuẩn hóa (Risk Score: 0.0 - 10.0).
  - Ước tính độ sâu ngập mặt đường (cm) và phân loại cấp độ: An toàn, Ngập nhẹ (5-15cm), Ngập vừa (15-30cm), Ngập nặng (30-50cm), Tê liệt hoàn toàn (> 50cm).
- **Đối tượng:** Người tham gia giao thông, Đội phản ứng nhanh.
- **Vị trí mã nguồn:** `backend/app/services/flood_engine.py`, API: `GET /api/v1/flood/hotspots/list`.

### 17. Dự Báo Lưu Lượng Sông Ngòi & Nguy Cơ Lũ Lụt Toàn Cầu Copernicus GloFAS 7 Ngày (GloFAS Forecast)
- **Mã chức năng:** `MF-17`
- **Mục tiêu nghiệp vụ:** Đưa ra cảnh báo sớm về lưu lượng nước thượng nguồn đổ về hạ lưu hệ thống sông Đồng Nai - Sài Gòn.
- **Các thành phần hợp nhất:**
  - Tích hợp Open-Meteo Global Flood API tra cứu dự báo lưu lượng dòng chảy sông ngòi ($m^3/s$) trong 7 ngày tới theo tọa độ GPS.
  - Cửa sổ Modal hiển thị biểu đồ diễn biến dòng chảy giúp quan sát xu hướng lũ lụt sớm.
- **Đối tượng:** Chuyên gia thủy văn, Cơ quan quản lý tài nguyên nước.
- **Vị trí mã nguồn:** `backend/app/services/flood_service.py`, `frontend/src/components/EcoMap.tsx` (`showGloFASModal`).

### 18. Trực Quan Hóa Hành Lang Đường Ngập 3 Lớp Ánh Sáng Bám Sát Lòng Đường (Flooded Road Corridors)
- **Mã chức năng:** `MF-18`
- **Mục tiêu nghiệp vụ:** Thể hiện trực quan, sống động và chính xác chiều dài đoạn đường bị ngập thay vì chỉ hiển thị một điểm chấm tròn tĩnh.
- **Các thành phần hợp nhất:**
  - Kết xuất vector `LineString` bám theo tim đường bị ngập.
  - Hiệu ứng 3 lớp đồ họa: Hào quang phát sáng tỏa rộng (Glow Halo), Vệt nước ngập xanh Cyan đậm chạy dọc lòng đường (Core Waterline), và Vân sóng nước chuyển động (Water Ripple Animation).
- **Đối tượng:** Người lái xe máy, ô tô quan sát trên bản đồ.
- **Vị trí mã nguồn:** `frontend/src/components/EcoMap.tsx` (Layers `flood-corridor-glow`, `flood-corridor-core`, `flood-corridor-pulse`).

### 19. Bảng Điều Khiển Mô Phỏng Kịch Bản Thiên Tai & Ứng Phó Ngập Lụt (Rain & Tide Scenario Simulator)
- **Mã chức năng:** `MF-19`
- **Mục tiêu nghiệp vụ:** Phục vụ công tác diễn tập, xây dựng phương án phòng chống ngập và dự báo trước các tình huống thời tiết cực đoan.
- **Các thành phần hợp nhất:**
  - Thanh trượt giả lập cường độ mưa nhân tạo từ 0 đến 120 mm/h.
  - Nút mô phỏng triều cường đạt đỉnh lịch sử (+1.75m).
  - Tự động tính toán lại và làm đổi màu các tuyến đường trên bản đồ tương ứng với kịch bản mô phỏng.
- **Đối tượng:** Cán bộ tham mưu phòng chống bão lụt, Nhà nghiên cứu đô thị.
- **Vị trí mã nguồn:** `frontend/src/components/EcoMap.tsx` (`simulatedRainfallMm`, `simulateFlood`).

---

## KHỐI 3: BÁO CÁO CỘNG ĐỒNG & PHẢN ÁNH HIỆN TRƯỜNG (CROWDSOURCING)

### 20. Báo Cáo Điểm Ngập Lụt Tức Thì 1 Chạm Qua Menu Ngữ Cảnh Chuột Phải (Context Menu Flood Reporting)
- **Mã chức năng:** `MF-20`
- **Mục tiêu nghiệp vụ:** Cho phép người dân trên đường báo cáo điểm ngập trong vòng 3 giây với thao tác trực quan nhất.
- **Các thành phần hợp nhất:**
  - Lắng nghe sự kiện chuột phải (Right-click) tại vị trí bất kỳ trên WebGIS để mở Popup "Báo cáo đoạn đường này đang ngập".
  - Tự động lấy tọa độ GPS điểm click và gửi yêu cầu tạo điểm ngập về Backend.
- **Đối tượng:** Người dân đang lưu thông trên đường.
- **Vị trí mã nguồn:** `frontend/src/components/EcoMap.tsx` (`onContextMenu`, `reportFloodAPI`).

### 21. Thuật Toán Bám Đường Tự Động OSRM Snap-to-Road & Nạp CSDL Không Gian Tức Thời
- **Mã chức năng:** `MF-21`
- **Mục tiêu nghiệp vụ:** Biến một điểm tọa độ người dân click chuột thành một đoạn đường ngập thực tế chuẩn xác và hiển thị ngay cho cộng đồng.
- **Các thành phần hợp nhất:**
  - Backend tự tạo Bounding Box 100m, gọi Open Source Routing Machine (OSRM) để lấy mảng tọa độ bám sát tim đường.
  - Chuyển đổi thành chuẩn PostGIS `LINESTRING` nạp vào bảng `flood_hotspots` với mã động `FL-DYN-...`.
  - Frontend kích hoạt Auto-refresh tải lại lớp bản đồ tức thì không cần tải lại trang.
- **Đối tượng:** Toàn bộ cộng đồng người dùng EcoReport.
- **Vị trí mã nguồn:** `backend/app/api/v1/flood.py` (`submit_flood_report`), `frontend/src/components/EcoMap.tsx`.

### 22. Tiếp Nhận Báo Cáo Sự Cố Ô Nhiễm Môi Trường Đa Phương Tiện (Incident Multimedia Reporting)
- **Mã chức năng:** `MF-22`
- **Mục tiêu nghiệp vụ:** Tạo kênh giao tiếp hai chiều giữa người dân và chính quyền trong việc phát hiện và xử lý ô nhiễm đô thị.
- **Các thành phần hợp nhất:**
  - Biểu mẫu gửi phản ánh: Tiêu đề, phân loại rác (rác sinh hoạt, chất thải nguy hại, cống nghẹt, kênh rạch, xà bần), địa chỉ mô tả, tọa độ GPS.
  - Tải lên hình ảnh/video hiện trường trước khi xử lý (BEFORE) và sau khi xử lý (AFTER).
- **Đối tượng:** Công dân phản ánh, Cán bộ tiếp nhận hồ sơ.
- **Vị trí mã nguồn:** `backend/app/models/incident.py` (`Incident`, `IncidentMedia`).

### 23. Cấp Mã Tra Cứu Hồ Sơ Công Khai & Theo Dõi Tiến Độ Giải Quyết (Incident Tracking & Lifecycle)
- **Mã chức năng:** `MF-23`
- **Mục tiêu nghiệp vụ:** Đảm bảo tính minh bạch, công khai quá trình xử lý phản ánh của cơ quan chức năng.
- **Các thành phần hợp nhất:**
  - Tự động sinh mã tra cứu hồ sơ định dạng chuẩn (`ECO-YYYYMMDD-XXXX`).
  - Quản lý vòng đời trạng thái sự cố: Mới tiếp nhận ➔ Đã phân công điều phối ➔ Đang xử lý tại hiện trường ➔ Nghiệm thu hoàn tất.
- **Đối tượng:** Công dân tra cứu, Cán bộ điều phối.
- **Vị trí mã nguồn:** `backend/app/models/incident.py`, `backend/app/seeds/seed_data.py`.

### 24. Cơ Chế Đánh Giá Khả Năng Thông Xe & Upvote Đồng Thuận Cộng Đồng (Crowd Verification & Upvotes)
- **Mã chức năng:** `MF-24`
- **Mục tiêu nghiệp vụ:** Ứng dụng trí tuệ cộng đồng để kiểm chứng độ chính xác của thông tin và phân loại mức độ ưu tiên xử lý.
- **Các thành phần hợp nhất:**
  - Khảo sát nhanh: Xe máy có qua được không? Ô tô con có qua được không?
  - Cơ chế Upvote (Tán thành) / Downvote (Báo nước đã rút) để tự động duy trì hoặc kết thúc cảnh báo điểm ngập sau 2-4 giờ.
- **Đối tượng:** Người dân xác thực chéo thông tin.
- **Vị trí mã nguồn:** `backend/app/models/flood.py` (`FloodCommunityReport`), `backend/app/models/incident.py`.

---

## KHỐI 4: ĐIỀU HƯỚNG LỘ TRÌNH THÔNG MINH & NÉ NGẬP (SAFE ROUTING)

### 25. Tìm Tuyến Đường Di Chuyển Tối Ưu Theo Mạng Lưới Giao Thông (OSRM Road Navigation)
- **Mã chức năng:** `MF-25`
- **Mục tiêu nghiệp vụ:** Dẫn đường cho người tham gia giao thông từ điểm xuất phát (GPS hoặc click) đến điểm đích nhanh nhất.
- **Các thành phần hợp nhất:**
  - Giao tiếp với dịch vụ OSRM Routing tính toán lộ trình xe chạy.
  - Vẽ dải Polyline phát sáng trên bản đồ kèm cờ xuất phát và cờ đích.
  - Hiển thị cự ly di chuyển (km), thời gian ước tính (phút).
- **Đối tượng:** Người lái xe máy, ô tô.
- **Vị trí mã nguồn:** `frontend/src/services/osmAdvancedService.ts`, `frontend/src/components/EcoMap.tsx`.

### 26. Thuật Toán Quét Va Chạm Không Gian Điểm Ngập Vùng Đệm 150m (PostGIS Spatial Hazard Collision)
- **Mã chức năng:** `MF-26`
- **Mục tiêu nghiệp vụ:** Tự động phát hiện các mối nguy hiểm tiềm ẩn ngập sâu nằm trên lộ trình dự kiến di chuyển.
- **Các thành phần hợp nhất:**
  - Gửi tọa độ Polyline tuyến đường về Backend.
  - Sử dụng hàm không gian PostGIS `ST_DWithin` tạo vùng đệm (Buffer 150m) quét giao cắt với tất cả các điểm ngập đang kích hoạt.
  - Trả về danh sách chi tiết các điểm ngập nằm dọc tuyến đường.
- **Đối tượng:** Hệ thống dẫn đường tự động.
- **Vị trí mã nguồn:** `backend/app/services/flood_engine.py` (`check_route_for_flood_hazards`), API: `POST /api/v1/flood/check-route`.

### 27. Đánh Giá Mức Độ An Toàn & Cảnh Báo Nguy Cơ Thủy Kích Phương Tiện (Route Safety Assessment)
- **Mã chức năng:** `MF-27`
- **Mục tiêu nghiệp vụ:** Bảo vệ phương tiện của người dân khỏi rủi ro chết máy hoặc hỏng hóc nặng do ngập nước.
- **Các thành phần hợp nhất:**
  - Phân loại trạng thái an toàn lộ trình: **CLEAR** (Tuyến đường khô ráo an toàn), **CAUTION** (Ngập nhẹ < 15cm, đi chậm), **AVOID** (Khuyến cáo né tránh, ngập sâu > 25cm).
  - Đưa ra lời khuyên cụ thể cho từng loại phương tiện: nguy cơ ngập pô chết máy xe máy, nguy cơ thủy kích vỡ lốc máy ô tô gầm thấp.
- **Đối tượng:** Người điều khiển phương tiện giao thông.
- **Vị trí mã nguồn:** `backend/app/schemas/flood.py` (`CheckRouteResponse`), `frontend/src/components/EcoMap.tsx`.

### 28. Đề Xuất Lộ Trình An Toàn Né Ngập & Quản Lý Chặng Đường Turn-by-Turn (Safe Rerouting & Turn Management)
- **Mã chức năng:** `MF-28`
- **Mục tiêu nghiệp vụ:** Tự động "bẻ nhánh" lộ trình sang các tuyến đường cao ráo hơn để né tránh các điểm ngập nặng.
- **Các thành phần hợp nhất:**
  - Đếm số lượng điểm ngập nguy hiểm đã né tránh thành công (`avoided_hotspots_count`).
  - Quản lý danh sách các chặng chuyển hướng (Turn-by-turn maneuvers).
  - Nút hủy / xóa lộ trình khi người dùng kết thúc chuyến đi.
- **Đối tượng:** Người lái xe đô thị.
- **Vị trí mã nguồn:** `backend/app/models/flood.py` (`SafeNavigationRoute`), `frontend/src/components/EcoMap.tsx`.

---

## KHỐI 5: BẢNG PHÂN TÍCH CHẤT LƯỢNG KHÔNG KHÍ & KHÍ HẬU (AQI DASHBOARD)

### 29. Quản Trị Bộ Lọc Phân Tích Đa Chiều 34 Tỉnh Thành & Đa Khung Thời Gian (Global Analytics Filtering)
- **Mã chức năng:** `MF-29`
- **Mục tiêu nghiệp vụ:** Cho phép người dùng chuyển đổi linh hoạt phạm vi phân tích theo địa lý và thời gian trên toàn bộ Dashboard.
- **Các thành phần hợp nhất:**
  - Chuyển đổi phạm vi: Toàn quốc (Nationwide) hoặc Từng tỉnh trong 34 tỉnh/thành phố lớn của Việt Nam.
  - Chuyển đổi khung thời gian: 24 giờ qua (24h), 7 ngày qua (7d), 30 ngày qua (30d), Cả năm (Annual).
  - Nút "Làm mới toàn diện" (Refresh All) cập nhật đồng loạt các tab phân tích.
- **Đối tượng:** Chuyên viên phân tích dữ liệu, Người dùng theo dõi môi trường.
- **Vị trí mã nguồn:** `frontend/src/components/AirQualityDashboard.tsx`.

### 30. Giám Sát Chỉ Số KPI Hero AQI Tổng Hợp & Hệ Thống Khuyến Nghị Y Tế (AQI Hero KPI & Health Advisories)
- **Mã chức năng:** `MF-30`
- **Mục tiêu nghiệp vụ:** Giúp người dân hiểu ngay tình trạng chất lượng không khí hiện tại và biết cách phòng tránh tác hại sức khỏe.
- **Các thành phần hợp nhất:**
  - Thẻ KPI Hero hiển thị chỉ số AQI lớn kèm màu sắc phân cấp (Tốt, Trung bình, Kém, Xấu, Rất xấu, Nguy hại).
  - Khuyến nghị sức khỏe y tế chuyên sâu cho từng nhóm đối tượng: Người già & nhóm nhạy cảm, Trẻ em, Người tập thể thao ngoài trời.
- **Đối tượng:** Tất cả công dân, Các cơ sở giáo dục, Y tế.
- **Vị trí mã nguồn:** `frontend/src/components/dashboard/OverviewTab.tsx`, API: `GET /api/v1/air-quality/overview`.

### 31. Theo Dõi & Đánh Giá Nồng Độ 6 Chỉ Số Ô Nhiễm Tiêu Chuẩn (6 Criteria Pollutants Monitor)
- **Mã chức năng:** `MF-31`
- **Mục tiêu nghiệp vụ:** Cung cấp số đo chi tiết từng thành phần chất ô nhiễm không khí theo tiêu chuẩn WHO và Bộ TN&MT.
- **Các thành phần hợp nhất:**
  - Bộ 6 thẻ đo lường nồng độ: Bụi mịn PM2.5, Bụi thô PM10, Khí Ozone O3, Nitrogen Dioxide NO2, Sulfur Dioxide SO2, Carbon Monoxide CO.
  - Đánh giá mức độ an toàn hoặc cảnh báo vượt ngưỡng cho từng chất.
- **Đối tượng:** Chuyên gia môi trường, Bác sĩ hô hấp, Người dân.
- **Vị trí mã nguồn:** `frontend/src/components/dashboard/OverviewTab.tsx`.

### 32. Phân Tích Phân Bổ Mức Độ Ô Nhiễm & Xếp Hạng Top 5 Tỉnh Thành (Pollution Distribution & Top Rankings)
- **Mã chức năng:** `MF-32`
- **Mục tiêu nghiệp vụ:** Đánh giá tổng quan chất lượng không khí toàn quốc và vinh danh/cảnh báo các địa phương tiêu biểu.
- **Các thành phần hợp nhất:**
  - Biểu đồ phân bổ tỷ lệ phần trăm các mức chất lượng không khí (Donut/Bar Chart).
  - Bảng vinh danh Top 5 tỉnh thành trong lành nhất và cảnh báo Top 5 tỉnh thành ô nhiễm nhất trong 24h qua.
- **Đối tượng:** Cơ quan truyền thông, Cơ quan quản lý môi trường quốc gia.
- **Vị trí mã nguồn:** `frontend/src/components/dashboard/OverviewTab.tsx`.

### 33. Phân Tích Diễn Biến Chuỗi Thời Gian Chỉ Số Môi Trường Theo Giờ (Interactive Time-Series Trend)
- **Mã chức năng:** `MF-33`
- **Mục tiêu nghiệp vụ:** Giúp nhận diện quy luật tăng giảm nồng độ ô nhiễm theo các khung giờ trong ngày (giờ cao điểm giao thông, ban đêm).
- **Các thành phần hợp nhất:**
  - Biểu đồ đường tương tác (Interactive Line Chart) biểu diễn biến thiên của AQI và 6 chất ô nhiễm theo từng giờ.
  - Tính năng rê chuột (Hover Tooltip) xem thông số tức thời của từng mốc thời gian.
- **Đối tượng:** Nhà nghiên cứu, Chuyên gia mô hình hóa chất lượng không khí.
- **Vị trí mã nguồn:** `frontend/src/components/dashboard/PollutantsTab.tsx`, `charts/LineChart.tsx`.

### 34. So Sánh Đa Phương Nồng Độ Chất Ô Nhiễm Giữa 34 Tỉnh Thành (Comparative Cross-Province Bar Chart)
- **Mã chức năng:** `MF-34`
- **Mục tiêu nghiệp vụ:** So sánh đối chiếu mức độ ô nhiễm của một chất bất kỳ (ví dụ PM2.5) giữa các trung tâm đô thị lớn và các tỉnh nông thôn.
- **Các thành phần hợp nhất:**
  - Biểu đồ cột so sánh trực quan nồng độ chất ô nhiễm đang chọn giữa 34 tỉnh/thành phố trên cả nước.
  - Phân màu cột biểu đồ theo mức độ nghiêm trọng.
- **Đối tượng:** Cơ quan hoạch định chính sách môi trường.
- **Vị trí mã nguồn:** `frontend/src/components/dashboard/PollutantsTab.tsx`, `charts/BarChart.tsx`.

### 35. Ma Trận Tương Quan Nhiệt Giữa Các Chất Ô Nhiễm (Pollutant Correlation Heatmap Matrix)
- **Mã chức năng:** `MF-35`
- **Mục tiêu nghiệp vụ:** Tìm ra mối quan hệ nguồn phát thải chung giữa các chất ô nhiễm khác nhau (ví dụ: NO2 và CO cùng bắt nguồn từ khí thải xe cộ).
- **Các thành phần hợp nhất:**
  - Ma trận nhiệt 6x6 thể hiện hệ số tương quan thống kê giữa PM2.5, PM10, O3, NO2, SO2 và CO.
  - Dải màu từ tương quan âm (nghịch biến) đến tương quan dương (đồng biến).
- **Đối tượng:** Nhà khoa học dữ liệu, Chuyên gia môi trường.
- **Vị trí mã nguồn:** `frontend/src/components/dashboard/PollutantsTab.tsx`, `charts/HeatmapGrid.tsx`.

### 36. Phân Tích Thống Kê Vi Khí Hậu Đô Thị & Xu Hướng Khí Hậu 12 Tháng (Urban Weather & 12-Month Climate Trend)
- **Mã chức năng:** `MF-36`
- **Mục tiêu nghiệp vụ:** Khảo sát các yếu tố thời tiết ảnh hưởng đến sự phát tán và lắng đọng chất ô nhiễm.
- **Các thành phần hợp nhất:**
  - Bộ thẻ theo dõi: Nhiệt độ trung bình (°C), Độ ẩm (%), Tốc độ gió (km/h), Lượng mưa (mm), Hướng gió, Áp suất khí quyển.
  - Biểu đồ khí hậu 12 tháng phản ánh quy luật mùa mưa và mùa khô của địa phương.
  - Biểu đồ phân tán (Scatter Plot) tương quan giữa Nhiệt độ và Lượng mưa.
- **Đối tượng:** Khí tượng thủy văn học, Quản lý đô thị.
- **Vị trí mã nguồn:** `frontend/src/components/dashboard/WeatherTab.tsx`, `charts/ScatterPlot.tsx`.

### 37. Mô Hình Hóa Tương Tác Khí Tượng: Đường Cong Làm Sạch Của Gió & Mưa Rửa Trôi (Atmospheric Cleansing Curves)
- **Mã chức năng:** `MF-37`
- **Mục tiêu nghiệp vụ:** Mô phỏng các hiện tượng tự nhiên giúp thanh lọc khí quyển, chứng minh ảnh hưởng tích cực của gió và mưa.
- **Các thành phần hợp nhất:**
  - *Đường cong làm sạch của gió (Wind Cleansing Curve):* Mô hình hóa nồng độ bụi PM2.5 giảm dần theo tốc độ gió tăng.
  - *Đường cong rửa trôi của mưa (Rain Washout Curve):* Mô hình hóa hiệu ứng gột rửa bầu trời của các cơn mưa lớn.
  - Bảng hệ số tương quan thời tiết - ô nhiễm và Bảng xếp hạng các tỉnh tự làm sạch không khí tốt nhất.
- **Đối tượng:** Giảng viên, Sinh viên ngành môi trường, Nhà phân tích khí hậu.
- **Vị trí mã nguồn:** `frontend/src/components/dashboard/InteractionTab.tsx`, `charts/CurveChart.tsx`.

### 38. Bảng Dữ Liệu Đa Năng 34 Tỉnh Thành Tìm Kiếm, Lọc & Sắp Xếp Tương Tác (Comprehensive Interactive Data Table)
- **Mã chức năng:** `MF-38`
- **Mục tiêu nghiệp vụ:** Cung cấp công cụ tra cứu số liệu thô dạng bảng đầy đủ, hỗ trợ xuất báo cáo và đối chiếu số liệu nhanh.
- **Các thành phần hợp nhất:**
  - Bảng dữ liệu hiển thị toàn bộ chỉ số AQI, PM2.5, PM10, Nhiệt độ, Độ ẩm, Tốc độ gió, Lượng mưa của 34 tỉnh.
  - Ô tìm kiếm nhanh theo tên tỉnh/thành phố.
  - Bộ lọc theo phân hạng ô nhiễm (Tốt, Trung bình, Kém, Xấu).
  - Tính năng sắp xếp tăng/giảm (Sort) theo từng cột và nút chuyển nhanh bộ lọc toàn trang về tỉnh đó.
- **Đối tượng:** Cán bộ tổng hợp báo cáo, Nhà báo, Người dân tra cứu.
- **Vị trí mã nguồn:** `frontend/src/components/dashboard/DataTableTab.tsx`, API: `GET /api/v1/air-quality/table`.

---

## KHỐI 6: RADAR KHÍ TƯỢNG ĐỘNG LỰC HỌC TRỰC TIẾP (LIVE WEATHER RADAR)

### 39. Giám Sát Mây Mưa Giông Bão Thời Gian Thực Qua RainViewer Radar (Realtime Weather Radar Layer)
- **Mã chức năng:** `MF-39`
- **Mục tiêu nghiệp vụ:** Giúp người dân và cơ quan phòng chống thiên tai theo dõi sự di chuyển của các khối mây dông gây mưa lớn và ngập úng.
- **Các thành phần hợp nhất:**
  - Tích hợp mạng lưới radar thời tiết RainViewer toàn cầu với độ trễ thấp.
  - Hiển thị phản xạ mây mưa viễn thám (đơn vị dBZ) với các cấp độ từ mưa nhẹ, mưa vừa, mưa to đến mưa đá/bão tố.
- **Đối tượng:** Ban Chỉ huy Phòng chống thiên tai, Người dân trước khi ra đường.
- **Vị trí mã nguồn:** `frontend/src/components/LiveWeatherRadarMap.tsx`.

### 40. Mô Phỏng Động Lực Học Luồng Gió & Dòng Hạt Thời Gian Thực (Dynamic Wind Streamlines)
- **Mã chức năng:** `MF-40`
- **Mục tiêu nghiệp vụ:** Cung cấp góc nhìn trực quan về hướng di chuyển của các luồng không khí, áp thấp và gió mùa.
- **Các thành phần hợp nhất:**
  - Kết xuất dòng hạt chuyển động mượt mà (Animated Streamlines) phản ánh hướng gió và tốc độ gió thời gian thực trên bản đồ.
- **Đối tượng:** Chuyên gia khí tượng, Thuyền trưởng, Người dân quan tâm thời tiết.
- **Vị trí mã nguồn:** `frontend/src/components/LiveWeatherRadarMap.tsx`.

### 41. Bộ Lớp Phủ Khí Tượng Đa Thông Số & Chuyển Vùng Quan Sát Trọng Điểm (Multi-Parameter Atmospheric Overlays)
- **Mã chức năng:** `MF-41`
- **Mục tiêu nghiệp vụ:** Cung cấp đầy đủ các thông số khí tượng vật lý của khí quyển trên cùng một nền tảng bản đồ số.
- **Các thành phần hợp nhất:**
  - 8 lớp phủ khí tượng: Nhiệt độ, Gió, Radar, Mưa & Sét, Mây che phủ, Sóng biển & Thủy triều, Ảnh vệ tinh hồng ngoại, Áp suất khí quyển.
  - Phím tắt chuyển nhanh góc nhìn tới các khu vực trọng điểm: Toàn quốc Việt Nam, TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ, Nha Trang, Hải Phòng, Quần đảo Hoàng Sa - Trường Sa.
- **Đối tượng:** Tất cả người dùng.
- **Vị trí mã nguồn:** `frontend/src/components/LiveWeatherRadarMap.tsx`.

---

## KHỐI 7: QUẢN TRỊ HỆ THỐNG, RBAC, LOGISTICS & TIỆN ÍCH ĐÔ THỊ

### 42. Phân Quyền Người Dùng Theo Vai Trò 4 Cấp (Role-Based Access Control - RBAC)
- **Mã chức năng:** `MF-42`
- **Mục tiêu nghiệp vụ:** Đảm bảo an ninh thông tin, phân định rõ ràng quyền hạn và trách nhiệm giữa các chủ thể tham gia hệ thống.
- **Các thành phần hợp nhất:**
  - Cấu hình 4 vai trò chuẩn: `ADMIN` (Quản trị hệ thống), `OFFICER` (Cán bộ điều phối TN&MT), `COLLECTOR` (Đội thu gom hiện trường), `CITIZEN` (Công dân đô thị).
  - Bảng ma trận quyền hạn chi tiết (`permissions`, `role_permissions`): tạo sự cố, xác thực, điều phối xe, nghiệm thu, quản lý lớp bản đồ.
- **Đối tượng:** Toàn bộ nhân sự vận hành hệ thống.
- **Vị trí mã nguồn:** `backend/app/models/rbac.py`, `backend/app/seeds/seed_data.py`.

### 43. Bảo Vệ Quyền Riêng Tư & Cơ Chế Làm Nhiễu Tọa Độ GPS (Privacy & Spatial Jitter Mechanism)
- **Mã chức năng:** `MF-43`
- **Mục tiêu nghiệp vụ:** Khuyến khích người dân mạnh dạn tố giác các hành vi xả trộm rác mà không lo bị lộ danh tính hay vị trí nơi ở riêng tư.
- **Các thành phần hợp nhất:**
  - Tùy chọn gửi báo cáo ẩn danh (`is_anonymous`).
  - Cơ chế tự động che số điện thoại (`reporter_phone_masked`).
  - Thuật toán **Spatial Jitter:** Tự động tạo độ lệch ngẫu nhiên 50m quanh vị trí GPS thực tế của người báo cáo trên bản đồ công khai.
- **Đối tượng:** Công dân gửi phản ánh nhạy cảm.
- **Vị trí mã nguồn:** `backend/app/seeds/seed_data.py` (`user_privacy_settings`).

### 44. Quản Lý Cam Kết Thời Hạn Xử Lý Sự Cố SLA & Cơ Chế Phạt Vi Phạm (SLA Policies & Penalties)
- **Mã chức năng:** `MF-44`
- **Mục tiêu nghiệp vụ:** Chuẩn hóa quy trình phản ứng nhanh của chính quyền và nâng cao chất lượng phục vụ công cộng.
- **Các thành phần hợp nhất:**
  - Cấu hình thời hạn phản hồi và giải quyết tối đa theo tính chất sự cố: Chất thải nguy hại (12h), Điểm nghẽn cống ngập (18h), Rác sinh hoạt (24h), Ô nhiễm kênh rạch (36h), Xà bần xây dựng (72h).
  - Tự động tính hạn chót xử lý (`sla_deadline`) và tính điểm phạt trễ hạn (`penalty_points_per_hour`) cho các đơn vị chậm trễ.
- **Đối tượng:** Ban Giám đốc Sở TN&MT, Cán bộ phòng ban.
- **Vị trí mã nguồn:** `backend/app/seeds/seed_data.py` (`sla_policies`), `backend/app/models/incident.py`.

### 45. Quản Lý Đội Xe Cơ Động & Tuyến Lộ Trình Thu Gom Rác Cố Định (Collection Fleet & Fixed Routes Logistics)
- **Mã chức năng:** `MF-45`
- **Mục tiêu nghiệp vụ:** Tối ưu hóa công tác hậu cần thu gom rác, quản lý phương tiện và lịch trình bốc dỡ rác đô thị.
- **Các thành phần hợp nhất:**
  - Quản lý danh mục phương tiện chuyên dụng: Xe ép rác (`COMPACTOR_TRUCK`), Canô vớt rác kênh rạch (`CLEANING_BOAT`), Xe bán tải phản ứng nhanh (`RAPID_RESPONSE_VAN`) kèm tải trọng (tấn).
  - Quản lý tuyến lộ trình xe chạy cố định (PostGIS `LINESTRING`) và các trạm dừng đón rác (Checkpoints) kèm giờ đến và khối lượng rác đón ($m^3$).
- **Đối tượng:** Công ty Dịch vụ Công ích Đô thị, Đội trưởng đội thu gom.
- **Vị trí mã nguồn:** `backend/app/seeds/seed_data.py` (`work_teams`, `waste_collection_routes`, `route_checkpoints`).

### 46. Hệ Sinh Thái Gamification Tích Điểm "Công Dân Xanh" & Đổi Quà Sinh Thái (Citizen Green Rewards)
- **Mã chức năng:** `MF-46`
- **Mục tiêu nghiệp vụ:** Xây dựng phong trào toàn dân bảo vệ môi trường, biến hành động phản ánh ô nhiễm thành phần thưởng có ý nghĩa.
- **Các thành phần hợp nhất:**
  - Cơ chế tích lũy điểm thưởng xanh khi gửi báo cáo chính xác hoặc xác thực tình trạng ngập nước.
  - Danh mục đổi quà sinh thái trong kho: Túi vải Canvas phong cách sống xanh (150 điểm), Chậu cây lọc khí để bàn (200 điểm), Bình giữ nhiệt Inox (350 điểm).
- **Đối tượng:** Công dân tích cực bảo vệ môi trường.
- **Vị trí mã nguồn:** `backend/app/seeds/seed_data.py` (`citizen_rewards`).

### 47. Cổng Tra Cứu Khung Xử Phạt Vi Phạm Môi Trường & Kho Tri Thức AI RAG (Regulations & AI Knowledge Base)
- **Mã chức năng:** `MF-47`
- **Mục tiêu nghiệp vụ:** Nâng cao nhận thức pháp lý của người dân và cung cấp cơ sở tri thức cho các tính năng Trợ lý ảo thông minh.
- **Các thành phần hợp nhất:**
  - Tra cứu quy định mức xử phạt hành chính theo **Nghị định 45/2022/NĐ-CP** (vứt rác bừa bãi, vứt tàn thuốc lá, đổ phế thải xây dựng xà bần).
  - Lưu trữ tài liệu chuẩn hóa: Hướng dẫn phân loại rác tại nguồn TP.HCM và Quy trình ứng phó khẩn cấp điểm ngập (SOP) phục vụ mô hình AI RAG.
- **Đối tượng:** Công dân tra cứu luật, Cán bộ tuyên truyền pháp luật.
- **Vị trí mã nguồn:** `backend/app/seeds/seed_data.py` (`penalty_regulations`, `ai_knowledge_embeddings`).

### 48. Quản Trị Cấu Hình Hệ Thống Động, Hỗ Trợ Đa Ngôn Ngữ & Chẩn Đoán Sức Khỏe API (System Config, i18n & Diagnostic)
- **Mã chức năng:** `MF-48`
- **Mục tiêu nghiệp vụ:** Đảm bảo hệ thống vận hành linh hoạt, ổn định, hỗ trợ người dùng quốc tế và dễ dàng giám sát kỹ thuật.
- **Các thành phần hợp nhất:**
  - Quản lý tham số cấu hình động: Tọa độ trung tâm mặc định, mức zoom, dung lượng upload tối đa (25MB), đường dây nóng khẩn cấp (1800-1090).
  - Hỗ trợ song ngữ Tiếng Việt & Tiếng Anh (`system_translations`) cho toàn bộ giao diện và cảnh báo.
  - Tiện ích chẩn đoán trạng thái vi dịch vụ Backend FastAPI (Ping `/health`) ngay trên góc giao diện người dùng.
- **Đối tượng:** Quản trị viên hệ thống, Kỹ sư DevOps.
- **Vị trí mã nguồn:** `backend/app/seeds/seed_data.py`, `backend/app/main.py`, `frontend/src/App.tsx`.

---

## TỔNG KẾT & KẾ HOẠCH BÀN GIAO (PM ROADMAP)

48 chức năng lớn trên đại diện cho toàn bộ giá trị cốt lõi của nền tảng **GreenSpot / EcoReport**:
1. **Khối Không gian WebGIS & Ngập lụt (MF-01 ➔ MF-28):** Là giá trị khác biệt mang tính đột phá của dự án, giải quyết trực tiếp bài toán ngập úng và ô nhiễm đô thị tại TP.HCM.
2. **Khối Phân tích Khí hậu & Radar (MF-29 ➔ MF-41):** Cung cấp năng lực giám sát dữ liệu vĩ mô trên 34 tỉnh thành toàn quốc với tiêu chuẩn đồ họa chuyên nghiệp.
3. **Khối Quản trị, Phân quyền & Tiện ích (MF-42 ➔ MF-48):** Đảm bảo tính khả thi trong việc triển khai thực tế cho các cơ quan chính quyền và cộng đồng dân cư.
