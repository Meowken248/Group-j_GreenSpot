# BẢNG LIỆT KÊ CHI TIẾT TỪNG CHỨC NĂNG DỰ ÁN GREENSPOT / ECOREPORT
**Đơn vị lập:** Quản Lý Dự Án (Project Management Office)  
**Ngày cập nhật:** 29/09/2026  
**Mục đích:** Liệt kê độc lập, chi tiết từng tính năng đang hoạt động trong toàn bộ hệ thống từ Giao diện người dùng (Frontend), Nghiệp vụ lõi (Backend Services), Thuật toán không gian (PostGIS/WebGIS) đến Cơ sở dữ liệu.

---

## MỤC LỤC CÁC PHÂN HỆ CHỨC NĂNG

- [Phần 1: Bản Đồ Không Gian WebGIS (EcoMap Core)](#phần-1-bản-đồ-không-gian-webgis-ecomap-core)
- [Phần 2: Giám Sát & Báo Động Ngập Lụt Đô Thị (Smart Flood Watch)](#phần-2-giám-sát--báo-động-ngập-lụt-đô-thị-smart-flood-watch)
- [Phần 3: Báo Cáo Ngập & Phản Ánh Hiện Trường (Crowdsourcing)](#phần-3-báo-cáo-ngập--phản-ánh-hiện-trường-crowdsourcing)
- [Phần 4: Điều Hướng Tuyến Đường Thông Minh & Né Ngập (Safe Routing)](#phần-4-điều-hướng-tuyến-đường-thông-minh--né-ngập-safe-routing)
- [Phần 5: Bảng Phân Tích Chất Lượng Không Khí & Khí Hậu 34 Tỉnh Thành (AQI Dashboard)](#phần-5-bảng-phân-tích-chất-lượng-không-khí--khí-hậu-34-tỉnh-thành-aqi-dashboard)
- [Phần 6: Radar Khí Tượng Động Lực Học Trực Tiếp (Live Weather Radar)](#phần-6-radar-khí-tượng-động-lực-học-trực-tiếp-live-weather-radar)
- [Phần 7: Quản Trị Hệ Thống, Phân Quyền RBAC, SLA & Logistics Đô Thị](#phần-7-quản-trị-hệ-thống-phân-quyền-rbac-sla--logistics-đô-thị)
- [Phần 8: Gamification, Tra Cứu Pháp Luật & Tiện Ích Đô Thị](#phần-8-gamification-tra-cứu-pháp-luật--tiện-ích-đô-thị)

---

## PHẦN 1: BẢN ĐỒ KHÔNG GIAN WEBGIS (ECOMAP CORE)

### F-MAP-01: Chuyển đổi lớp bản đồ Google Roadmap
- **Mô tả:** Hiển thị bản đồ giao thông đường phố, ngõ hẻm chuẩn của Google Maps qua Tile Cluster.
- **Thao tác:** Nhấp nút `Google Maps` trên thanh chọn kiểu bản đồ ở góc trên bên phải.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`MAP_STYLES.googleRoadmap`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-02: Chuyển đổi lớp bản đồ Google Vệ tinh (Google Hybrid)
- **Mô tả:** Hiển thị ảnh vệ tinh độ phân giải cao kết hợp nhãn tên đường và địa danh.
- **Thao tác:** Nhấp nút `Google Vệ tinh` trên thanh công cụ bản đồ.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`MAP_STYLES.googleHybrid`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-03: Chuyển đổi lớp bản đồ Giao thông Trực tiếp (Google Traffic)
- **Mô tả:** Tích hợp lớp dữ liệu mật độ giao thông, kẹt xe theo thời gian thực (xanh, cam, đỏ).
- **Thao tác:** Nhấp nút `Giao thông` trên thanh chọn kiểu bản đồ.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`MAP_STYLES.googleTraffic`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-04: Chuyển đổi lớp bản đồ OpenStreetMap Standard
- **Mô tả:** Chuyển sang bản đồ nguồn mở OpenStreetMap chi tiết các công trình công cộng.
- **Thao tác:** Chọn `OpenStreetMap` trên thanh công cụ.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`MAP_STYLES.osm`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-05: Chuyển đổi lớp bản đồ sáng CartoDB Positron
- **Mô tả:** Bản đồ nền sáng xám tinh giản, tối ưu cho việc làm nổi bật các điểm dữ liệu môi trường.
- **Thao tác:** Chọn `Bản đồ sáng` trên thanh công cụ.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`MAP_STYLES.cartoPositron`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-06: Chuyển đổi lớp bản đồ tối CartoDB Dark Matter
- **Mô tả:** Bản đồ nền đen tương phản cao (Dark Mode), làm phát sáng các tuyến đường ngập và trạm IoT.
- **Thao tác:** Chọn `Bản đồ tối` trên thanh công cụ.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`MAP_STYLES.cartoDark`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-07: Bật/Tắt mô hình Kiến trúc 3D Tòa nhà (3D Buildings)
- **Mô tả:** Nghiêng góc nhìn bản đồ (Pitch 60°) để dựng khối hộp 3D theo chiều cao thực tế của các tòa nhà.
- **Thao tác:** Nhấp nút `3D / 2D` ở thanh điều khiển bản đồ.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (Layer `3d-buildings`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-08: Tùy biến chủ đề màu sắc 3D Tòa nhà (Building Color Themes)
- **Mô tả:** Đổi dải màu hiển thị của khối 3D: Cầu vồng đa sắc (Rainbow), Neon phát sáng, Xanh sinh thái (Emerald), Vàng ấm (Amber), hoặc Tối giản (Monochrome).
- **Thao tác:** Bấm nút bảng màu cạnh nút 3D và chọn tông màu mong muốn.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`building3DTheme`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-09: Bật/Tắt Ranh giới Hành chính Quận/Huyện TP.HCM
- **Mô tả:** Vẽ các đường viền đa giác GeoJSON bao quanh 22 quận, huyện và TP. Thủ Đức kèm nhãn tên quận.
- **Thao tác:** Bấm nút `Ranh giới khu vực` trên thanh điều khiển.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`, API: `GET /api/v1/spatial/districts`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-10: Lọc địa điểm: Sự cố ô nhiễm môi trường (Incidents)
- **Mô tả:** Hiển thị các điểm bãi rác tự phát, cống tắc rác, ô nhiễm kênh rạch kèm mã tra cứu và trạng thái xử lý.
- **Thao tác:** Bấm nút danh mục `Sự cố ô nhiễm` trên thanh trượt bên trái.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`, API: `GET /api/v1/eco-locations?category=incident`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-11: Lọc địa điểm: Không gian Xanh & Sinh thái (Green Spots)
- **Mô tả:** Hiển thị công viên cây xanh, thảo cầm viên, khu du lịch sinh thái và diện tích mảng xanh.
- **Thao tác:** Bấm nút danh mục `Điểm xanh` trên thanh trượt danh mục.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`, API: `GET /api/v1/eco-locations?category=green_spot`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-12: Lọc địa điểm: Trạm thu gom rác tái chế & E-waste (Recycling)
- **Mô tả:** Hiển thị điểm tiếp nhận pin cũ, rác điện tử, đồ nhựa, vỏ hộp sữa kèm giờ mở cửa và hotline.
- **Thao tác:** Bấm nút danh mục `Trạm tái chế`.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`, API: `GET /api/v1/eco-locations?category=recycling`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-13: Lọc địa điểm: Trạm Cảm biến Quan trắc Viễn trắc IoT (Sensors)
- **Mô tả:** Hiển thị vị trí và trạng thái viễn trắc của trạm đo chất lượng không khí, trạm siêu âm đo ngập.
- **Thao tác:** Bấm nút danh mục `Trạm cảm biến`.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`, API: `GET /api/v1/eco-locations?category=sensor`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-14: Lọc địa điểm: Điểm đen Ngập lụt Đô thị (Flood Hotspots)
- **Mô tả:** Hiển thị các nút giao hay ngập kèm thông tin mực nước ngập, nguyên nhân mưa/triều.
- **Thao tác:** Bấm nút danh mục `Điểm ngập lụt`.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`, API: `GET /api/v1/eco-locations?category=flood`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-15: Thẻ Chi tiết Địa điểm / Điểm Ngập (Detail Card Panel)
- **Mô tả:** Khi nhấp vào bất kỳ Marker nào, một thanh Panel dock bên trái xuất hiện hiển thị đầy đủ hình ảnh, địa chỉ, khoảng cách từ vị trí người dùng, chỉ số môi trường và nút "Dẫn đường đến đây".
- **Thao tác:** Nhấp chuột trái vào Marker trên bản đồ.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`selectedLocation` / `selectedFloodSpot`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-16: Bản đồ nhiệt Khí độ / Nhiệt độ (Temperature Heatmap)
- **Mô tả:** Phủ lớp bản đồ nhiệt nội suy dải nhiệt độ vi khí hậu trên phạm vi đô thị.
- **Thao tác:** Mở menu "Bản đồ nhiệt" ➔ Chọn `Nhiệt độ`.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`, API: `GET /api/v1/weather/heatmap`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-17: Bản đồ nhiệt Chỉ số Chất lượng Không khí (AQI Heatmap)
- **Mô tả:** Hiển thị dải nhiệt màu nội suy mức độ ô nhiễm không khí và mật độ bụi mịn.
- **Thao tác:** Mở menu "Bản đồ nhiệt" ➔ Chọn `Chất lượng không khí (AQI)`.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`, API: `GET /api/v1/weather/heatmap`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-18: Bản đồ nhiệt Điểm số Rủi ro Môi trường (Risk Heatmap)
- **Mô tả:** Trực quan hóa mật độ rủi ro dựa trên tổng hợp số vụ ô nhiễm và mức độ ngập lụt.
- **Thao tác:** Mở menu "Bản đồ nhiệt" ➔ Chọn `Rủi ro tổng hợp`.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-19: Tour 3D Địa danh Landmark 81
- **Mô tả:** Camera tự động "bay" mượt mà (Fly to) và nghiêng góc nhìn 3D bao quát tháp Landmark 81.
- **Thao tác:** Nhấp nút `Landmark 81` trên thanh Quick Tour ở đáy màn hình.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`flyToLocation`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-20: Tour 3D Địa danh Bitexco Financial Tower
- **Mô tả:** Tự động điều hướng góc nhìn 3D đến trung tâm Quận 1 và tháp Bitexco.
- **Thao tác:** Nhấp nút `Bitexco Tower` trên thanh Quick Tour.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-21: Tour 3D Địa danh Thảo Cầm Viên Sài Gòn
- **Mô tả:** Điều hướng góc nhìn đến mảng xanh Thảo Cầm Viên bên kênh Thị Nghè.
- **Thao tác:** Nhấp nút `Thảo Cầm Viên` trên thanh Quick Tour.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-22: Tour 3D Địa danh Công viên Tao Đàn
- **Mô tả:** Điều hướng góc nhìn đến lá phổi xanh Công viên Tao Đàn giữa lòng TP.HCM.
- **Thao tác:** Nhấp nút `Công viên Tao Đàn` trên thanh Quick Tour.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-23: Tour 3D Địa danh Khu Công nghệ Cao TP.HCM
- **Mô tả:** Điều hướng góc nhìn đến trạm quan trắc trung tâm tại TP. Thủ Đức.
- **Thao tác:** Nhấp nút `Khu Công nghệ Cao` trên thanh Quick Tour.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-24: Định vị GPS người dùng thời gian thực
- **Mô tả:** Truy vấn tọa độ GPS hiện tại qua trình duyệt và di chuyển tâm bản đồ tới vị trí người dùng.
- **Thao tác:** Nhấp nút biểu tượng `Định vị GPS` ở góc trên bên phải.
- **Vị trí code:** `frontend/src/hooks/useFastGeolocation.ts`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-25: Bảng HUD Chỉ số Tọa độ & Thước đo Thời gian thực
- **Mô tả:** Hiển thị tọa độ chính xác của con trỏ chuột (Vĩ độ / Kinh độ), cấp độ thu phóng (Zoom), và góc xoay bản đồ (Compass).
- **Thao tác:** Tự động cập nhật khi di chuột trên bản đồ.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`mouseCoords`, `currentZoom`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-26: Tra cứu Địa chỉ Đảo OSM (Reverse Geocoding)
- **Mô tả:** Bấm chuột trái vào bất kỳ vị trí trống nào trên đường hoặc công trình để tra cứu số nhà, tên đường, phường/quận thực tế.
- **Thao tác:** Bấm chuột trái vào điểm bất kỳ trên bản đồ.
- **Vị trí code:** `frontend/src/services/osmAdvancedService.ts` (`reverseGeocodeOSM`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-27: Tìm kiếm Địa điểm Dịch vụ lân cận (Nearby POIs)
- **Mô tả:** Tự động quét các cơ sở dịch vụ (quán ăn, cafe, cửa hàng) quanh vị trí hiện tại trong bán kính 1km qua OpenStreetMap Overpass API.
- **Thao tác:** Bấm nút `Quét quanh đây` trên thanh công cụ POI.
- **Vị trí code:** `frontend/src/services/poiService.ts` (`fetchNearbyPOIsAPI`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-28: Lọc POI theo danh mục dịch vụ
- **Mô tả:** Lọc hiển thị địa điểm dịch vụ theo: Quán Cà phê, Quán Ăn / Nhà hàng, hoặc Cửa hàng tiện lợi.
- **Thao tác:** Bấm chọn thẻ phân loại tương ứng trên thanh công cụ POI.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`poiType`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-29: Ô Tìm kiếm Địa danh & Điểm đến Thông minh (Live Search)
- **Mô tả:** Gõ tên đường hoặc địa danh, hệ thống tự động gợi ý danh sách địa điểm theo thời gian thực (Autocomplete).
- **Thao tác:** Nhập từ khóa vào ô tìm kiếm ở góc trên bên trái.
- **Vị trí code:** `frontend/src/services/poiService.ts` (`searchLivePlacesAPI`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-MAP-30: Widget Tóm tắt Thời tiết & Mực nước Triều cường
- **Mô tả:** Khối thông tin nhỏ gọn ở góc dưới hiển thị nhiệt độ tức thời, độ ẩm, trạng thái con nước (nước đang lên/rút) và cảnh báo triều cường trạm Phú An.
- **Thao tác:** Tự động nạp khi tải trang.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (Khối Widget thời tiết góc dưới bên trái).
- **Trạng thái:** ✅ Đang hoạt động.

---

## PHẦN 2: GIÁM SÁT & BÁO ĐỘNG NGẬP LỤT ĐÔ THỊ (SMART FLOOD WATCH)

### F-FLD-01: Tính toán Mực nước Triều cường Thời gian thực Trạm Phú An (Harmonic Engine)
- **Mô tả:** Động cơ giải tích sóng thuần Python (Harmonic Wave Analysis) tính toán chính xác mực nước thủy triều (mét) và phân loại cấp báo động (Báo động I, II, III).
- **Thao tác:** Hệ thống tự động tính toán mỗi khi có yêu cầu API.
- **Vị trí code:** `backend/app/services/tide_service.py`, API: `GET /api/v1/flood/tide/current?station_code=PHU_AN`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-FLD-02: Tính toán Mực nước Triều cường Thời gian thực Trạm Nhà Bè
- **Mô tả:** Áp dụng hằng số điều hòa thiên văn cho Trạm Thủy văn Nhà Bè (Sông Đồng Điền) để theo dõi mực nước khu vực phía Nam thành phố.
- **Thao tác:** Gọi API với tham số `station_code=NHA_BE`.
- **Vị trí code:** `backend/app/services/tide_service.py`, API: `GET /api/v1/flood/tide/current?station_code=NHA_BE`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-FLD-03: Dự báo Dao động Sóng Triều & Điểm Cực trị (24h - 48h)
- **Mô tả:** Xuất chuỗi dữ liệu dự báo con nước theo từng giờ kèm thời điểm chính xác xuất hiện Đỉnh triều (High Tide) và Chân triều (Low Tide).
- **Thao tác:** Hệ thống tự động nạp phục vụ vẽ biểu đồ dao động triều.
- **Vị trí code:** `backend/app/services/tide_service.py`, API: `GET /api/v1/flood/tide/forecast`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-FLD-04: Tích hợp Dữ liệu Cổng Dữ Liệu Mở TP.HCM (Sở Xây Dựng & UDC)
- **Mô tả:** Tích hợp hơn 30 điểm đen ngập cố hữu, thông số trạm bơm thoát nước, cao độ mặt đường và lưu lượng tiêu thoát nước.
- **Thao tác:** Nạp tự động vào GeoJSON FeatureCollection.
- **Vị trí code:** `backend/app/services/flood_service.py` (`HCMC_FLOOD_HOTSPOTS`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-FLD-05: Cảnh báo Ngập lụt Thông minh kết hợp Mưa thực tế + Triều cường
- **Mô tả:** Động cơ `IFloodEngine` tự động đánh giá nguy cơ: tính toán điểm số rủi ro (Risk Score: 0 - 10) và ước lượng độ sâu ngập mặt đường (cm).
- **Thao tác:** Tự động kích hoạt khi có mưa to hoặc triều cường đạt đỉnh.
- **Vị trí code:** `backend/app/services/flood_engine.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-FLD-06: Dự báo Lũ lụt & Lưu lượng Sông ngòi Copernicus GloFAS 7 Ngày
- **Mô tả:** Tích hợp Open-Meteo Global Flood API tra cứu dự báo lưu lượng dòng chảy ($m^3/s$) và nguy cơ ngập lụt tại tọa độ bất kỳ trong 7 ngày tới.
- **Thao tác:** Nhấp nút `Xem dự báo GloFAS 7 ngày` trên thẻ thông tin điểm ngập.
- **Vị trí code:** `backend/app/services/flood_service.py`, API: `GET /api/v1/flood/forecast`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-FLD-07: Modal Hiển thị Biểu đồ Lưu lượng Dòng chảy GloFAS
- **Mô tả:** Bật cửa sổ Modal trực quan hóa biểu đồ cột/đường diễn biến lưu lượng nước sông trong 7 ngày tới.
- **Thao tác:** Bấm nút xem dự báo trên Panel ngập lụt.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`showGloFASModal`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-FLD-08: Vẽ Đoạn Đường Ngập lụt 3 Lớp Ánh sáng (Flooded Road Corridors)
- **Mô tả:** Vẽ hình học `LineString` bám theo lòng đường bị ngập với 3 lớp hiệu ứng: Hào quang phát sáng (Glow Halo), Vệt nước ngập xanh Cyan đậm, và Vân sóng nước chuyển động.
- **Thao tác:** Tự động kết xuất trên bản đồ khi điểm ngập có tọa độ hành lang đường.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (Layers `flood-corridor-glow`, `flood-corridor-core`, `flood-corridor-pulse`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-FLD-09: Thanh trượt Mô phỏng Lượng mưa Giả định (Rainfall Slider)
- **Mô tả:** Cho phép kéo thanh trượt từ 0 đến 120 mm/h để quan sát kịch bản các tuyến đường chuyển từ khô ráo sang ngập sâu.
- **Thao tác:** Kéo thanh trượt mô phỏng mưa trên menu điều khiển ngập lụt.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`simulatedRainfallMm`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-FLD-10: Mô phỏng Mực nước Triều cường Giả định (Tide Override)
- **Mô tả:** Thay đổi mực nước triều từ 1.0m đến 2.0m để kiểm tra kịch bản triều cường lịch sử tràn bờ kè sông Sài Gòn.
- **Thao tác:** Bấm nút `Mô phỏng Triều Cường Đạt Đỉnh (+1.75m)` trên thanh công cụ.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`simulateFlood`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-FLD-11: API Tóm tắt Tình hình Ngập lụt Đô thị (Summary API)
- **Mô tả:** Trả về số lượng điểm ngập đang an toàn, ngập nhẹ, ngập vừa, ngập nặng và tê liệt giao thông.
- **Thao tác:** Gọi API `/api/v1/flood/summary`.
- **Vị trí code:** `backend/app/api/v1/flood.py` (`get_flood_summary`).
- **Trạng thái:** ✅ Đang hoạt động.

---

## PHẦN 3: BÁO CÁO NGẬP & PHẢN ÁNH HIỆN TRƯỜNG (CROWDSOURCING)

### F-CRW-01: Báo cáo Ngập lụt Nhanh qua Chuột phải (Context Menu)
- **Mô tả:** Người dùng nhấp chuột phải vào bất kỳ vị trí đường nào trên WebGIS để mở menu ngữ cảnh "Báo cáo đoạn đường này đang ngập".
- **Thao tác:** Nhấp chuột phải (Right-click) trên bản đồ ➔ Bấm vào menu hiện ra.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`onContextMenu`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-CRW-02: Thuật toán Bám đường Tự động OSRM Snap-to-Road
- **Mô tả:** Backend tự động tạo Bounding Box quanh điểm click, gọi OSRM API để lấy mảng tọa độ bám khít tim đường thực tế và chuyển thành PostGIS `LINESTRING`.
- **Thao tác:** Tự động thực thi ngầm trong API báo ngập.
- **Vị trí code:** `backend/app/api/v1/flood.py` (`submit_flood_report`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-CRW-03: Ghi nhận CSDL PostGIS Điểm ngập Động (`FL-DYN-...`) & Tự động Làm mới
- **Mô tả:** Lưu điểm ngập mới vào bảng `flood_hotspots` với mã động duy nhất; Frontend kích hoạt `refreshTrigger` làm vệt nước ngập xanh xuất hiện tức thì trên bản đồ mà không cần F5.
- **Thao tác:** Tự động sau khi người dùng xác nhận báo cáo.
- **Vị trí code:** `backend/app/api/v1/flood.py`, `frontend/src/components/EcoMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-CRW-04: Gửi Báo cáo Sự cố Ô nhiễm Môi trường (Incident Reporting)
- **Mô tả:** Người dân gửi phản ánh bãi rác tự phát, xả trộm hóa chất, nghẹt cống kèm tiêu đề, loại rác, địa chỉ và tọa độ GPS.
- **Thao tác:** Người dân điền form gửi phản ánh sự cố.
- **Vị trí code:** `backend/app/models/incident.py`, `backend/app/api/v1/eco_locations.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-CRW-05: Đính kèm Hình ảnh Hiện trường Sự cố (Incident Media)
- **Mô tả:** Hỗ trợ lưu trữ ảnh chụp hiện trường trước khi xử lý (BEFORE) và sau khi dọn dẹp hoàn tất (AFTER).
- **Thao tác:** Tải ảnh minh chứng khi gửi phản ánh hoặc khi nghiệm thu.
- **Vị trí code:** `backend/app/models/incident.py` (`IncidentMedia`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-CRW-06: Tự động Cấp Mã Tra cứu Hồ sơ Công khai (`ECO-YYYYMMDD-XXXX`)
- **Mô tả:** Mỗi phản ánh được hệ thống cấp một mã duy nhất để người dân và cán bộ tiện theo dõi tiến độ giải quyết.
- **Thao tác:** Hệ thống tự sinh khi tạo bản ghi sự cố.
- **Vị trí code:** `backend/app/seeds/seed_data.py`, `backend/app/models/incident.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-CRW-07: Cộng đồng Tán thành & Upvote Sự cố
- **Mô tả:** Cho phép những người dân khác ở cùng khu vực bấm nút "Đồng thuận / Tán thành" để tăng độ ưu tiên điều phối đội dọn dẹp.
- **Thao tác:** Bấm nút Upvote trên thẻ chi tiết sự cố.
- **Vị trí code:** `backend/app/models/incident.py` (`upvotes_count`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-CRW-08: Khảo sát Khả năng Lưu thông Phương tiện tại Điểm ngập
- **Mô tả:** Ghi nhận đánh giá thực tế của người đi đường: xe máy có qua được không (`can_motorbike_pass`) và ô tô có qua được không (`can_car_pass`).
- **Thao tác:** Chọn trạng thái khi gửi báo cáo ngập.
- **Vị trí code:** `backend/app/models/flood.py` (`FloodCommunityReport`).
- **Trạng thái:** ✅ Đang hoạt động.

---

## PHẦN 4: ĐIỀU HƯỚNG TUYẾN ĐƯỜNG THÔNG MINH & NÉ NGẬP (SAFE ROUTING)

### F-NAV-01: Tìm Tuyến đường Lái xe Nhanh nhất (OSRM Driving Route)
- **Mô tả:** Tính toán lộ trình đường bộ giữa điểm xuất phát (GPS hoặc click) và điểm đến, trả về cự ly (km), thời gian (phút) và danh sách chỉ dẫn chuyển hướng.
- **Thao tác:** Nhấp nút "Dẫn đường đến đây" trên thẻ địa điểm.
- **Vị trí code:** `frontend/src/services/osmAdvancedService.ts` (`getRouteOSRM`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-NAV-02: Vẽ Đường Lộ trình Phát sáng trên Bản đồ
- **Mô tả:** Hiển thị dải Polyline uốn lượn màu xanh phát sáng nối giữa điểm xuất phát (Cờ xanh) và điểm đích (Cờ đích).
- **Thao tác:** Tự động kết xuất khi tính toán xong lộ trình.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (Layer `route-line`, `route-glow`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-NAV-03: Kiểm tra Va chạm Điểm ngập Không gian (PostGIS `ST_DWithin`)
- **Mô tả:** Gửi Polyline lộ trình về Backend để quét vùng đệm 150m dọc hai bên tuyến đường, xác định các điểm ngập nguy hiểm nằm trên lộ trình.
- **Thao tác:** Tự động gọi API `/api/v1/flood/check-route`.
- **Vị trí code:** `backend/app/services/flood_engine.py` (`check_route_for_flood_hazards`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-NAV-04: Phân loại Cấp độ An toàn của Lộ trình
- **Mô tả:** Đưa ra đánh giá: **CLEAR** (Đường thông thoáng), **CAUTION** (Ngập nhẹ < 15cm), hoặc **AVOID** (Khuyến nghị né tránh, ngập sâu > 25cm).
- **Thao tác:** Hiển thị huy hiệu cảnh báo trên bảng chỉ dẫn lộ trình ở góc trên bên phải.
- **Vị trí code:** `backend/app/schemas/flood.py` (`RouteSafetyStatus`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-NAV-05: Khuyến cáo Chi tiết cho Xe máy & Ô tô
- **Mô tả:** Cảnh báo cụ thể: xe máy có nguy cơ chết máy do ngập pô xe, ô tô con gầm thấp có nguy cơ thủy kích hư hỏng động cơ.
- **Thao tác:** Hiển thị trong thông điệp khuyến cáo của lộ trình.
- **Vị trí code:** `backend/app/services/flood_engine.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-NAV-06: Đóng / Hủy Lộ trình Đang dẫn đường
- **Mô tả:** Xóa đường Polyline dẫn đường và các Marker cờ xuất phát/đích khỏi bản đồ.
- **Thao tác:** Bấm nút `Xóa lộ trình` (Icon đóng) trên bảng điều hướng.
- **Vị trí code:** `frontend/src/components/EcoMap.tsx` (`setActiveRoute(null)`).
- **Trạng thái:** ✅ Đang hoạt động.

---

## PHẦN 5: BẢNG PHÂN TÍCH CHẤT LƯỢNG KHÔNG KHÍ & KHÍ HẬU 34 TỈNH THÀNH (AQI DASHBOARD)

### F-AQI-01: Chuyển đổi Chế độ Xem Bản đồ ➔ Dashboard Phân tích
- **Mô tả:** Chuyển đổi giao diện làm việc giữa Bản đồ WebGIS và Bảng điều khiển phân tích AQI & Khí hậu toàn quốc.
- **Thao tác:** Nhấp nút `Phân tích AQI & Khí hậu` trên thanh điều hướng trung tâm ở đầu trang.
- **Vị trí code:** `frontend/src/App.tsx` (`activeTab`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-02: Bộ lọc Phạm vi Toàn quốc / Từng Tỉnh Thành (34 Tỉnh)
- **Mô tả:** Chuyển đổi giữa chế độ xem tổng quan toàn quốc hoặc chọn một trong 34 tỉnh/thành phố lớn của Việt Nam.
- **Thao tác:** Chọn dropdown danh sách tỉnh trên Header Dashboard.
- **Vị trí code:** `frontend/src/components/AirQualityDashboard.tsx` (`scopeMode`, `selectedProvince`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-03: Bộ lọc Khung Thời gian Phân tích (Time Range)
- **Mô tả:** Lọc dữ liệu quan trắc theo các mốc: 24 giờ qua (24h), 7 ngày qua (7d), 30 ngày qua (30d), hoặc Cả năm.
- **Thao tác:** Bấm chọn thẻ khung thời gian tương ứng.
- **Vị trí code:** `frontend/src/components/AirQualityDashboard.tsx` (`timeRange`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-04: Nút Làm mới Dữ liệu Toàn diện (Refresh All)
- **Mô tả:** Buộc gọi lại toàn bộ API phân tích để nạp số liệu viễn trắc mới nhất kèm thời gian cập nhật.
- **Thao tác:** Bấm nút `Làm mới` trên Header Dashboard.
- **Vị trí code:** `frontend/src/components/AirQualityDashboard.tsx` (`handleRefreshAll`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-05: Thẻ KPI Hero Chỉ số AQI Tổng Hợp
- **Mô tả:** Hiển thị số đo AQI lớn, nhãn phân loại (Tốt, Trung bình, Kém, Xấu, Rất xấu, Nguy hại) và mã màu chuẩn quốc tế.
- **Thao tác:** Tự động tính toán và hiển thị tại Tab Tổng quan.
- **Vị trí code:** `frontend/src/components/dashboard/OverviewTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-06: Khuyến nghị Sức khỏe Y tế Đô thị
- **Mô tả:** Đưa ra lời khuyên y tế sinh hoạt cụ thể cho 3 nhóm đối tượng: Nhóm nhạy cảm/người già, Trẻ em, và Người tập thể dục ngoài trời.
- **Thao tác:** Hiển thị bên dưới thẻ Hero AQI.
- **Vị trí code:** `frontend/src/components/dashboard/OverviewTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-07: Bộ 6 Thẻ Đo Lường Nồng độ Chất Ô Nhiễm
- **Mô tả:** Đo lường chi tiết nồng độ của 6 chất ô nhiễm tiêu chuẩn: Bụi mịn PM2.5, Bụi thô PM10, Khí Ozone O3, Nitrogen Dioxide NO2, Sulfur Dioxide SO2, Carbon Monoxide CO.
- **Thao tác:** Hiển thị tại Tab Tổng quan.
- **Vị trí code:** `frontend/src/components/dashboard/OverviewTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-08: Biểu đồ Phân bổ Mức độ Chất lượng Không khí
- **Mô tả:** Biểu đồ hình tròn/thanh phân bổ tỷ lệ phần trăm thời gian đạt chuẩn Tốt, Trung bình, Kém trong kỳ quan trắc.
- **Thao tác:** Hiển thị tại Tab Tổng quan.
- **Vị trí code:** `frontend/src/components/dashboard/OverviewTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-09: Bảng Xếp hạng Top 5 Tỉnh Trong Lành & Top 5 Tỉnh Ô Nhiễm
- **Mô tả:** Vinh danh 5 địa phương có không khí sạch nhất và cảnh báo 5 địa phương có mức độ ô nhiễm cao nhất trong 24h qua.
- **Thao tác:** Hiển thị tại Tab Tổng quan.
- **Vị trí code:** `frontend/src/components/dashboard/OverviewTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-10: Biểu đồ Chuỗi Thời Gian Diễn biến Theo Giờ (Interactive Line Chart)
- **Mô tả:** Đồ thị đường thể hiện sự tăng giảm nồng độ của từng chất ô nhiễm và AQI theo từng giờ trong ngày/tuần.
- **Thao tác:** Chuyển sang Tab `Chất ô nhiễm` ➔ Rê chuột lên đồ thị để xem chi tiết từng điểm giờ.
- **Vị trí code:** `frontend/src/components/dashboard/PollutantsTab.tsx`, `charts/LineChart.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-11: Biểu đồ Cột So sánh 34 Tỉnh Thành (Comparative Bar Chart)
- **Mô tả:** So sánh trực quan nồng độ của một chất ô nhiễm đang chọn (PM2.5, PM10, O3...) trên toàn bộ 34 tỉnh thành.
- **Thao tác:** Chọn chất ô nhiễm cần so sánh trên thanh công cụ.
- **Vị trí code:** `frontend/src/components/dashboard/PollutantsTab.tsx`, `charts/BarChart.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-12: Ma trận Tương quan Nhiệt 6 Chất Ô Nhiễm (Correlation Heatmap)
- **Mô tả:** Ma trận nhiệt trực quan hóa mối liên hệ tương quan thống kê giữa các chất ô nhiễm với nhau (ví dụ: PM2.5 gắn liền với PM10).
- **Thao tác:** Hiển thị tại nửa dưới Tab `Chất ô nhiễm`.
- **Vị trí code:** `frontend/src/components/dashboard/PollutantsTab.tsx`, `charts/HeatmapGrid.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-13: Bộ Thẻ Chỉ số Vi Khí hậu (Weather Tab)
- **Mô tả:** Hiển thị Nhiệt độ trung bình (°C), Độ ẩm tương đối (%), Tốc độ gió (km/h), Lượng mưa tích lũy (mm), Hướng gió, Mật độ mây.
- **Thao tác:** Chuyển sang Tab `Khí tượng`.
- **Vị trí code:** `frontend/src/components/dashboard/WeatherTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-14: Biểu đồ Xu hướng Khí hậu 12 Tháng
- **Mô tả:** Biểu đồ đường kép thể hiện diễn biến nhiệt độ và lượng mưa qua 12 tháng, phản ánh rõ nét mùa mưa và mùa khô.
- **Thao tác:** Hiển thị tại Tab `Khí tượng`.
- **Vị trí code:** `frontend/src/components/dashboard/WeatherTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-15: Biểu đồ Phân tán (Scatter Plot) Nhiệt độ vs. Lượng mưa
- **Mô tả:** Phân tích tương quan giữa nền nhiệt độ không khí và cường độ các trận mưa rào đô thị.
- **Thao tác:** Hiển thị tại Tab `Khí tượng`.
- **Vị trí code:** `frontend/src/components/dashboard/WeatherTab.tsx`, `charts/ScatterPlot.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-16: Đường cong Làm sạch của Gió (Wind Cleansing Curve)
- **Mô tả:** Mô hình hóa hiện tượng vật lý: tốc độ gió càng mạnh thì nồng độ bụi mịn PM2.5 càng giảm nhanh do sự khuếch tán không khí.
- **Thao tác:** Chuyển sang Tab `Tương tác`.
- **Vị trí code:** `frontend/src/components/dashboard/InteractionTab.tsx`, `charts/CurveChart.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-17: Đường cong Rửa trôi của Mưa (Rain Washout Curve)
- **Mô tả:** Mô hình hóa hiệu ứng gột rửa bầu khí quyển của các cơn mưa, giúp làm sạch các hạt bụi lơ lửng.
- **Thao tác:** Hiển thị tại Tab `Tương tác`.
- **Vị trí code:** `frontend/src/components/dashboard/InteractionTab.tsx`, `charts/CurveChart.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-18: Bảng Hệ số Tương quan Thống kê Khí tượng - Ô nhiễm
- **Mô tả:** Tính toán hệ số Pearson tương quan giữa các biến thời tiết với chỉ số AQI tổng hợp.
- **Thao tác:** Hiển thị tại Tab `Tương tác`.
- **Vị trí code:** `frontend/src/components/dashboard/InteractionTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-19: Bảng Dữ liệu Đầy đủ 34 Tỉnh Thành (Data Table Tab)
- **Mô tả:** Bảng số liệu chi tiết chứa toàn bộ các thông số AQI, PM2.5, PM10, Nhiệt độ, Độ ẩm, Tốc độ gió, Lượng mưa của 34 tỉnh thành.
- **Thao tác:** Chuyển sang Tab `Bảng dữ liệu`.
- **Vị trí code:** `frontend/src/components/dashboard/DataTableTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-20: Tìm kiếm Tỉnh/Thành theo Tên trong Bảng Dữ liệu
- **Mô tả:** Ô tìm kiếm thời gian thực giúp lọc nhanh tỉnh/thành theo từ khóa gõ vào.
- **Thao tác:** Gõ tên tỉnh vào ô tìm kiếm ở đầu bảng dữ liệu.
- **Vị trí code:** `frontend/src/components/dashboard/DataTableTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-21: Lọc Tỉnh/Thành theo Hạng mức Ô nhiễm (Level Filter)
- **Mô tả:** Lọc nhanh chỉ xem danh sách các tỉnh đang có mức không khí "Tốt", hoặc chỉ xem các tỉnh "Xấu / Ô nhiễm".
- **Thao tác:** Chọn dropdown mức ô nhiễm trên bảng.
- **Vị trí code:** `frontend/src/components/dashboard/DataTableTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-22: Sắp xếp Tăng/Giảm theo từng Cột Chỉ số (Table Sorting)
- **Mô tả:** Nhấp vào tiêu đề bất kỳ cột nào (AQI, PM2.5, Nhiệt độ...) để sắp xếp thứ tự danh sách tăng dần hoặc giảm dần.
- **Thao tác:** Nhấp vào Header của cột cần sắp xếp.
- **Vị trí code:** `frontend/src/components/dashboard/DataTableTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-AQI-23: Chuyển nhanh Bộ lọc Toàn Dashboard từ Hàng trong Bảng
- **Mô tả:** Bấm nút hành động tại một hàng trong bảng để tự động chọn tỉnh đó làm bộ lọc chính cho toàn bộ Dashboard.
- **Thao tác:** Bấm nút `Xem chi tiết` trên hàng của tỉnh mong muốn.
- **Vị trí code:** `frontend/src/components/dashboard/DataTableTab.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

---

## PHẦN 6: RADAR KHÍ TƯỢNG ĐỘNG LỰC HỌC TRỰC TIẾP (LIVE WEATHER RADAR)

### F-RAD-01: Lớp phủ Radar Mây mưa Phản xạ RainViewer (Radar Overlay)
- **Mô tả:** Tích hợp ảnh viễn thám radar mây mưa trực tiếp (đơn vị dBZ) từ mạng lưới radar thời tiết RainViewer toàn cầu.
- **Thao tác:** Chọn lớp phủ `Radar thời tiết`.
- **Vị trí code:** `frontend/src/components/LiveWeatherRadarMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-RAD-02: Lớp phủ Luồng Gió & Dòng Hạt Chuyển Động (Wind Streamlines)
- **Mô tả:** Mô phỏng dòng hạt chuyển động theo hướng gió và tốc độ gió thời gian thực cực kỳ trực quan.
- **Thao tác:** Chọn lớp phủ `Gió & Dòng hạt`.
- **Vị trí code:** `frontend/src/components/LiveWeatherRadarMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-RAD-03: Lớp phủ Bản đồ Gradient Nhiệt độ (°C)
- **Mô tả:** Trực quan hóa bản đồ nhiệt động lực học nhiệt độ không khí từ âm độ đến trên 40°C.
- **Thao tác:** Chọn lớp phủ `Nhiệt độ`.
- **Vị trí code:** `frontend/src/components/LiveWeatherRadarMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-RAD-04: Lớp phủ Mưa Tích Lũy & Giông Sét (Precipitation)
- **Mô tả:** Theo dõi mật độ mây dông và lưu lượng mưa tích lũy (mm/h).
- **Thao tác:** Chọn lớp phủ `Mưa & Sét`.
- **Vị trí code:** `frontend/src/components/LiveWeatherRadarMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-RAD-05: Lớp phủ Tỷ lệ Mây Che Phủ (Cloud Cover)
- **Mô tả:** Hiển thị tỷ lệ phần trăm che phủ của các tầng mây thấp, trung và cao.
- **Thao tác:** Chọn lớp phủ `Mây che phủ`.
- **Vị trí code:** `frontend/src/components/LiveWeatherRadarMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-RAD-06: Lớp phủ Chiều cao Sóng Biển (Sea Waves)
- **Mô tả:** Giám sát độ cao sóng biển (mét) và dòng hải lưu ngoài khơi Biển Đông.
- **Thao tác:** Chọn lớp phủ `Sóng biển`.
- **Vị trí code:** `frontend/src/components/LiveWeatherRadarMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-RAD-07: Lớp phủ Ảnh Vệ tinh Hồng ngoại (Satellite)
- **Mô tả:** Tải ảnh vệ tinh khí tượng hồng ngoại quan sát bão nhiệt đới và áp thấp.
- **Thao tác:** Chọn lớp phủ `Ảnh vệ tinh`.
- **Vị trí code:** `frontend/src/components/LiveWeatherRadarMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-RAD-08: Lớp phủ Áp suất Khí quyển (Pressure)
- **Mô tả:** Hiển thị đường đẳng áp và các trung tâm áp cao/áp thấp (hPa).
- **Thao tác:** Chọn lớp phủ `Áp suất`.
- **Vị trí code:** `frontend/src/components/LiveWeatherRadarMap.tsx`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-RAD-09: Chuyển Vùng Quan Sát Nhanh các Đô thị Trọng điểm
- **Mô tả:** Chuyển đổi nhanh góc nhìn radar tới: Toàn cảnh Việt Nam, TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ, Nha Trang, Hải Phòng, Biển Đông.
- **Thao tác:** Bấm chọn thẻ địa danh trên thanh công cụ Radar.
- **Vị trí code:** `frontend/src/components/LiveWeatherRadarMap.tsx` (`VIETNAM_LOCATIONS`).
- **Trạng thái:** ✅ Đang hoạt động.

---

## PHẦN 7: QUẢN TRỊ HỆ THỐNG, PHÂN QUYỀN RBAC, SLA & LOGISTICS ĐÔ THỊ

### F-SYS-01: Phân Quyền Theo Vai Trò (RBAC 4 Nhóm Tài Khoản)
- **Mô tả:** Hệ thống phân chia quyền hạn chặt chẽ: `ADMIN` (Quản trị hệ thống), `OFFICER` (Cán bộ TN&MT điều phối), `COLLECTOR` (Đội thu gom hiện trường), `CITIZEN` (Công dân đô thị).
- **Thao tác:** Xác thực qua Role và Permission tương ứng.
- **Vị trí code:** `backend/app/models/rbac.py`, `backend/app/seeds/seed_data.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-SYS-02: Cơ chế Bảo Mật & Làm Nhiễu Tọa Độ GPS (Spatial Jitter)
- **Mô tả:** Tự động tạo độ lệch ngẫu nhiên 50m cho tọa độ báo cáo của người dân khi chọn chế độ ẩn danh nhằm bảo vệ vị trí nhà riêng tư.
- **Thao tác:** Kích hoạt qua cấu hình `spatial_jitter_radius_meters`.
- **Vị trí code:** `backend/app/seeds/seed_data.py` (`user_privacy_settings`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-SYS-03: Chính Sách Cam Kết Thời Hạn Xử Lý SLA (SLA Policies)
- **Mô tả:** Tự động áp hạn chót xử lý (Deadline) theo từng loại rác: Chất thải nguy hại (12h), Nghẹt cống (18h), Rác sinh hoạt (24h), Ô nhiễm kênh rạch (36h), Xà bần (72h).
- **Thao tác:** Tự động tính hạn chót `sla_deadline` khi tạo sự cố.
- **Vị trí code:** `backend/app/seeds/seed_data.py` (`sla_policies`), `backend/app/models/incident.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-SYS-04: Tính Điểm Phạt Quá Hạn Xử Lý (Penalty Points Calculation)
- **Mô tả:** Cơ chế tính điểm phạt tự động theo từng giờ trễ hạn đối với các đơn vị xử lý hiện trường nhằm nâng cao trách nhiệm đô thị.
- **Thao tác:** Ghi nhận theo công thức `penalty_points_per_hour`.
- **Vị trí code:** `backend/app/seeds/seed_data.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-SYS-05: Quản lý Đội Cơ Động & Phương Tiện Thu Gom (Work Teams Logistics)
- **Mô tả:** Quản lý danh bạ các đội thu gom, trưởng đội, biển số xe, loại phương tiện (Xe ép rác, Canô vớt rác, Xe phản ứng nhanh) và tải trọng (tấn).
- **Thao tác:** Quản lý trong CSDL bảng `work_teams`.
- **Vị trí code:** `backend/app/seeds/seed_data.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-SYS-06: Quản lý Tuyến Lộ Trình Thu Gom Rác Cố Định & Checkpoints
- **Mô tả:** Lưu trữ tuyến đường xe gom rác chạy (PostGIS `LINESTRING`), các điểm dừng bốc rác (Checkpoints), thứ tự ghé thăm, giờ đến dự kiến và khối lượng rác đón ($m^3$).
- **Thao tác:** Quản lý qua bảng `waste_collection_routes` và `route_checkpoints`.
- **Vị trí code:** `backend/app/seeds/seed_data.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-SYS-07: Quản lý Danh mục Cơ sở Thiết yếu Đô thị (Essential Facilities)
- **Mô tả:** Định danh bệnh viện, trạm y tế, trường học kèm cấp độ dễ bị tổn thương (`CRITICAL`, `HIGH`, `MEDIUM`) khi xảy ra ngập lụt hoặc ô nhiễm.
- **Thao tác:** Quản lý trong CSDL bảng `essential_facilities`.
- **Vị trí code:** `backend/app/models/spatial.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-SYS-08: Quản lý Trạm Thu Gom Rác Tái Chế Chuyên Trách
- **Mô tả:** Lưu trữ thông tin đơn vị quản lý, hotline, giờ hoạt động và mảng các loại rác tiếp nhận (PIN_CU, THIET_BI_DIEN_TU, VO_HOP_SUA, NHUA...).
- **Thao tác:** Quản lý trong CSDL bảng `recycling_facilities`.
- **Vị trí code:** `backend/app/models/spatial.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-SYS-09: Quản lý Mạng Lưới Trạm Cảm Biến IoT Viễn Trắc
- **Mô tả:** Quản lý mã trạm, loại cảm biến (Không khí, Đo ngập siêu âm), phiên bản firmware, nguồn điện năng lượng mặt trời/pin, và trạng thái ONLINE/OFFLINE.
- **Thao tác:** Quản lý trong CSDL bảng `iot_sensor_stations`.
- **Vị trí code:** `backend/app/models/iot.py`.
- **Trạng thái:** ✅ Đang hoạt động.

---

## PHẦN 8: GAMIFICATION, TRA CỨU PHÁP LUẬT & TIỆN ÍCH ĐÔ THỊ

### F-GAM-01: Hệ Thống Tích Điểm Thưởng Công Dân Xanh (Green Points)
- **Mô tả:** Cơ chế cộng điểm thưởng khi người dân gửi phản ánh chính xác hoặc xác thực tình trạng ngập nước giúp cộng đồng.
- **Thao tác:** Tích lũy điểm vào hồ sơ người dùng.
- **Vị trí code:** `backend/app/seeds/seed_data.py` (`citizen_rewards`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-GAM-02: Đổi Quà Tặng Sinh Thái Trong Kho Quà
- **Mô tả:** Cho phép dùng điểm xanh đổi các phần quà: Túi vải Canvas (150 điểm), Chậu cây lọc không khí (200 điểm), Bình giữ nhiệt Inox (350 điểm).
- **Thao tác:** Quản lý tồn kho trong bảng `citizen_rewards`.
- **Vị trí code:** `backend/app/seeds/seed_data.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-GAM-03: Tra cứu Khung Xử Phạt Vi Phạm Môi Trường (Nghị định 45/2022/NĐ-CP)
- **Mô tả:** Cung cấp điều khoản tra cứu mức phạt tiền tối thiểu/tối đa và biện pháp khắc phục hậu quả đối với các hành vi xả rác bừa bãi, đổ trộm xà bần.
- **Thao tác:** Quản lý trong CSDL bảng `penalty_regulations`.
- **Vị trí code:** `backend/app/seeds/seed_data.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-GAM-04: Kho Tri Thức Môi Trường Chuẩn Hóa Phục Vụ AI RAG
- **Mô tả:** Lưu trữ tài liệu hướng dẫn phân loại rác tại nguồn TP.HCM và Quy trình tiêu chuẩn ứng phó khẩn cấp điểm ngập (SOP).
- **Thao tác:** Quản lý trong bảng `ai_knowledge_embeddings`.
- **Vị trí code:** `backend/app/seeds/seed_data.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-GAM-05: Cấu Hình Tham Số Hệ Thống Động (System Configs)
- **Mô tả:** Quản trị các tham số: Tọa độ trung tâm mặc định, mức zoom, dung lượng file upload tối đa (25MB), đường dây nóng khẩn cấp tiếp nhận sự cố (1800-1090).
- **Thao tác:** Quản lý trong bảng `system_configs`.
- **Vị trí code:** `backend/app/seeds/seed_data.py`.
- **Trạng thái:** ✅ Đang hoạt động.

### F-GAM-06: Chẩn Đoán Tình Trạng Vi Dịch Vụ Backend (Health Diagnostic Popover)
- **Mô tả:** Nút tròn trạng thái ở góc trên bên phải hiển thị tình trạng Online/Offline kèm Popover kiểm tra kết nối microservice FastAPI (`/health`).
- **Thao tác:** Bấm vào huy hiệu `API Service` ở góc trên bên phải ➔ Bấm `Ping /health`.
- **Vị trí code:** `frontend/src/App.tsx` (`checkHealth`, `health-popover`).
- **Trạng thái:** ✅ Đang hoạt động.

### F-GAM-07: Hỗ Trợ Đa Ngôn Ngữ Song Ngữ Việt - Anh (i18n)
- **Mô tả:** Thiết kế sẵn bảng từ điển đa ngôn ngữ lưu trữ cặp key-value cho cả tiếng Việt và tiếng Anh phục vụ quốc tế hóa ứng dụng.
- **Thao tác:** Quản lý trong bảng `system_translations`.
- **Vị trí code:** `backend/app/seeds/seed_data.py`.
- **Trạng thái:** ✅ Đang hoạt động.

---

## TỔNG KẾT SỐ LƯỢNG CHỨC NĂNG

| Phân hệ | Số lượng chức năng | Tỷ lệ hoàn thiện code |
|:---|:---:|:---:|
| **Phần 1: Bản Đồ Không Gian WebGIS (EcoMap Core)** | 30 chức năng | 100% |
| **Phần 2: Giám Sát & Báo Động Ngập Lụt (Smart Flood Watch)** | 11 chức năng | 100% |
| **Phần 3: Báo Cáo Ngập & Phản Ánh Hiện Trường (Crowdsourcing)** | 08 chức năng | 100% |
| **Phần 4: Điều Hướng Tuyến Đường Thông Minh & Né Ngập (Safe Routing)** | 06 chức năng | 100% |
| **Phần 5: Bảng Phân Tích Chất Lượng Không Khí & Khí Hậu (AQI Dashboard)**| 23 chức năng | 100% |
| **Phần 6: Radar Khí Tượng Động Lực Học Trực Tiếp (Live Weather Radar)** | 09 chức năng | 100% |
| **Phần 7: Quản Trị Hệ Thống, Phân Quyền RBAC, SLA & Logistics Đô Thị** | 09 chức năng | 100% |
| **Phần 8: Gamification, Tra Cứu Pháp Luật & Tiện Ích Đô Thị** | 07 chức năng | 100% |
| **TỔNG CỘNG HỆ THỐNG** | **103 CHỨC NĂNG** | **100% ĐÃ TRIỂN KHAI** |
