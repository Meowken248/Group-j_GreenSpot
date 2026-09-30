# BÁO CÁO DỰ ÁN TỔNG HỢP: DANH SÁCH CÁC CHỨC NĂNG ĐÃ TRIỂN KHAI VÀ HOÀN THÀNH
## DỰ ÁN: GREENSPOT - NỀN TẢNG WEBGIS KHÔNG GIAN XANH, CẢNH BÁO NGẬP LỤT & PHÂN TÍCH KHÍ TƯỢNG ĐÔ THỊ

* **Vai trò lập báo cáo:** Project Manager (PM Audit)
* **Thời gian lập:** 2026-09-30
* **Phương thức kiểm toán:** Kiểm tra và rà soát trực tiếp 100% trên mã nguồn thực tế tại kho lưu trữ Backend (`FastAPI`, `PostGIS`, `Python Analytic Engines`) và Frontend (`React 19`, `TypeScript`, `MapLibre WebGIS`, `Canvas Analytics`).

---

## I. TỔNG QUAN KIẾN TRÚC DỰ ÁN

Hệ thống **GreenSpot** được thiết kế và triển khai theo kiến trúc Clean Architecture phân tách rõ ràng giữa Backend Microservice và Frontend WebGIS tương tác cao:

```
[React 19 + TypeScript + MapLibre GL] (Frontend)
       │
       ├── Axios Client (REST API + Header Accept-Language)
       ▼
[FastAPI Microservice + python-i18n + Background Worker] (Backend)
       │
       ├── SQLAlchemy 2.0 (Async) + PostGIS 16 (Spatial DB)
       ├── Pure Python Harmonic Tide Engine (Mô phỏng Thủy triều Phú An & Nhà Bè)
       ├── Multi-Factor Flood Risk Engine (Mưa + Triều + Hạ tầng thoát nước)
       ├── Big Data Parquet Analytics Engine (7.1 Triệu bản ghi 34 tỉnh/thành)
       └── External APIs Integrator (Open-Meteo ECMWF/CAMS, Copernicus GloFAS, OSRM, Photon OSM)
```

### Công nghệ nền tảng:
* **Frontend:** React 19, TypeScript, Vite, MapLibre GL, React-Map-GL, Canvas/SVG Custom Charts (BarChart, LineChart, CurveChart, ScatterPlot, HeatmapGrid).
* **Backend:** Python 3.11+, FastAPI, SQLAlchemy Async, GeoAlchemy2, Pydantic v2, python-i18n, Pandas, NumPy, PyArrow.
* **Cơ sở dữ liệu:** PostgreSQL 16 kết hợp tiện ích không gian PostGIS, chỉ mục không gian GiST.
* **Định tuyến & Địa lý:** OSRM (Open Source Routing Machine), Photon Geocoding (OpenStreetMap).

---

## II. CHI TIẾT TỪNG PHÂN HỆ VÀ CÁC CHỨC NĂNG ĐÃ HOÀN THÀNH

---

### PHÂN HỆ 1: BẢN ĐỒ SINH THÁI ĐÔ THỊ THÔNG MINH (WEBGIS ECO-MAP)
*Tập trung tại mã nguồn: `frontend/src/components/EcoMap.tsx`, `frontend/src/services/poiService.ts`, `frontend/src/services/osmAdvancedService.ts`, `backend/app/api/v1/eco_locations.py`*

1. **Chuyển đổi Đa Bản Đồ Nền (Multi-Basemap Switching - 7 Chế độ):**
   - **Google Maps Roadmap:** Cụm máy chủ gạch ảnh Google (mt0 - mt3) sắc nét, quen thuộc.
   - **Google Maps Hybrid:** Bản đồ ảnh vệ tinh kết hợp nhãn đường bộ Google.
   - **Google Maps Traffic:** Bản đồ giao thông và mật độ kẹt xe thời gian thực.
   - **Carto Voyager:** Bản đồ vector sinh động theo phong cách hiện đại.
   - **OpenStreetMap Standard:** Bản đồ chi tiết hiển thị số nhà, hẻm nhỏ.
   - **OpenTopoMap:** Bản đồ địa hình thể hiện đường bình độ, cao độ phục vụ đánh giá thoát nước.
   - **Carto Dark Matter:** Chế độ bản đêm (Dark Mode) độ tương phản cao, làm nổi bật các lớp dữ liệu phát sáng.

2. **Góc Nhìn Không Gian 3D & Mô Phỏng Kiến Trúc Đô Thị (3D Colorful Extrusions):**
   - Nút chuyển đổi nhanh giữa 2D (phẳng) và 3D nghiêng (`pitch: 58°`, `bearing: -20°`).
   - Đùn khối 3D toàn bộ các tòa nhà đô thị theo chiều cao thực tế sử dụng MapLibre layer expressions.
   - 5 chủ đề màu sắc công trình 3D:
     - *Cầu vồng đô thị (Rainbow)*
     - *Sinh thái xanh (Eco)*
     - *Hoàng hôn rực rỡ (Sunset)*
     - *Cyber Neon*
     - *Tinh thể pha lê (Crystal)*
   - Huy hiệu thang đo chiều cao công trình 3D trực quan góc màn hình.

3. **Phân Vùng Ranh Giới Hành Chính 22 Quận/Huyện TP.HCM & TP. Thủ Đức (District Boundaries Layer):**
   - Lớp đa giác GeoJSON Polygons tô màu phân định rõ ranh giới toàn bộ 22 quận/huyện và TP. Thủ Đức từ PostgreSQL/PostGIS.
   - Nhãn định danh tâm phân vùng (Centroid Labels) hiển thị tên quận nổi bật trên bản đồ.
   - Menu dropdown chọn nhanh quận/huyện kèm hiệu ứng `flyTo` mượt mà về trung tâm quận được chọn.
   - Thống kê diện tích ($km^2$), dân số, tỷ lệ phủ mảng xanh (Green Index) và số lượng sự cố môi trường theo từng quận.

4. **Hệ Thống Điểm Môi Trường & Bộ Lọc Đa Danh Mục (Multi-Category Eco Spots):**
   - Quản lý và lọc 5 nhóm địa điểm sinh thái trọng yếu:
     - 🔴 **Sự cố môi trường (Incidents):** Bãi rác tự phát, xả thải, ô nhiễm kênh rạch, mức độ nghiêm trọng (Critical/High/Low), điểm rủi ro (Risk Score), mã theo dõi (`tracking_code`), lượt xác nhận (upvotes) từ cộng đồng.
     - 🟢 **Điểm xanh & Công viên (Green Spots):** Công viên sinh thái, thảo cầm viên, khu du lịch sinh thái, khu dự trữ sinh quyển Cần Giờ kèm quy mô diện tích, đánh giá sao (rating) và trạng thái không khí.
     - ♻️ **Trạm thu gom & Tái chế (Recycling Facilities):** Trạm thu gom rác phân loại, pin cũ, rác điện tử e-waste, nhựa, giấy, giờ mở cửa, số điện thoại liên hệ và đơn vị chủ quản.
     - 📡 **Trạm cảm biến quan trắc viễn trắc IoT (IoT Sensors):** Trạm đo AQI, cảm biến mực nước ngập, trạm thủy văn đo triều cường, trạng thái online/offline và chỉ số tức thời.
     - 🌊 **Điểm đen ngập lụt & Triều cường đô thị (Flood Hotspots).**
   - Thanh lọc danh mục trượt ngang với huy hiệu số lượng đếm động tải từ API Backend.
   - Drawer/Card chi tiết hiển thị đầy đủ thông số môi trường, khoảng cách GPS và nút dẫn đường.

5. **Tìm Kiếm Địa Điểm & Số Nhà Trực Tiếp (Live Debounced Places Search):**
   - Ô tìm kiếm thông minh hỗ trợ tìm kiếm tên đường, số nhà, hẻm, quán ăn, quán cà phê trên toàn TP.HCM.
   - Tích hợp Photon OSM API với cơ chế Debounce 350ms, tự động ưu tiên kết quả theo tọa độ tâm bản đồ hiện tại, hiển thị gợi ý kèm icon phân loại.

6. **Mạng Lưới Tiện Ích Xung Quanh & Cấp Độ Chi Tiết (Level of Detail POIs):**
   - Tự động nạp các điểm tiện ích (quán ăn, cafe, cửa hàng, số nhà) khi người dùng phóng to bản đồ (zoom $\ge 15$).
   - Bộ lọc tiện ích (Tất cả / Cafe / Quán ăn / Shop).
   - Tùy chọn tự động quét POIs quanh tâm bản đồ kèm bộ nhớ đệm Cache TTL 5 phút.

7. **Động Cơ Định Vị Vệ Tinh Siêu Tốc (Fast Geolocation Engine):**
   - Hook chuyên dụng `useFastGeolocation.ts` kết hợp Geolocation vệ tinh độ chính xác cao và dự phòng IP Location.
   - Hiển thị Marker vị trí người dùng kèm vòng bán kính sai số (Accuracy Circle) và hiệu ứng sóng radar xung điện (Radar Halo).
   - Tự động căn giữa bản đồ (FlyTo) và nâng cấp độ chính xác khi bắt được tín hiệu GPS vệ tinh.

8. **Giải Mã Tọa Độ Ngược Khi Nhấp Bản Đồ (OSM Reverse Geocoding Drop Pin):**
   - Thao tác nhấp chuột vào bất kỳ vị trí nào trên bản đồ để thả Drop Pin.
   - Gọi API giải mã ngược để xác định số nhà, tên đường, phường/xã, quận/huyện thực tế.
   - Hiển thị popup tọa độ chính xác, địa chỉ hoàn chỉnh và tùy chọn "Dẫn đường đến đây".

9. **Chỉ Đường Lộ Trình Thực Tế OSRM (Glowing Route Polyline Navigation):**
   - Tính toán lộ trình đường bộ thực tế từ tọa độ GPS hiện tại tới điểm đích đã chọn qua OSRM Engine.
   - Vẽ đường dẫn hướng dạng Polyline phát sáng (Glowing Route) trên bản đồ.
   - Bảng thông tin lộ trình hiển thị khoảng cách di chuyển (km), thời gian dự kiến (phút), điểm xuất phát và điểm đích.
   - Nút xóa và kết thúc lộ trình nhanh chóng.

10. **Bản Đồ Nhiệt Đa Dải (MapLibre Multi-Mode Heatmap Layers):**
    - Chế độ Bản đồ nhiệt Nhiệt độ (°C): trực quan hóa nền nhiệt độ trên toàn quốc.
    - Chế độ Bản đồ nhiệt Chất lượng không khí (AQI): màu sắc theo tiêu chuẩn phân cấp ô nhiễm từ Xanh (Tốt) đến Đỏ/Tím (Nguy hại).
    - Chế độ Bản đồ nhiệt Mật độ Rủi ro Ô nhiễm: nội suy trọng số theo mức độ nghiêm trọng của các sự cố môi trường.

11. **Quick Tour 3D Danh Thắng & Kỳ Quan Việt Nam (Landmarks 3D Quick Tour):**
    - Thanh lướt danh thắng tiêu biểu: Hồ Hoàn Kiếm, Vịnh Hạ Long, Cố đô Huế, Cầu Rồng Đà Nẵng, Dinh Độc Lập, Landmark 81, Thủ Thiêm, Bán đảo Thanh Đa, Rừng Sác Cần Giờ...
    - Thao tác 1 chạm kích hoạt máy bay lượn 3D (`flyTo`) quanh danh thắng với góc pitch/bearing điện ảnh.

12. **Chế Độ Radar Khí Tượng Động (Live Weather Radar Map):**
    - Tích hợp thành phần `LiveWeatherRadarMap.tsx` với 8 lớp phủ khí quyển: Nhiệt độ, Gió & Dòng hạt động (Wind Particle Streamlines), Radar phản hồi mây mưa trực tiếp, Mưa & Sét, Mây che phủ, Sóng biển, Vệ tinh hồng ngoại, Áp suất khí quyển.
    - Chuyển đổi nhanh giữa các vùng trọng điểm toàn quốc (Hà Nội, TP.HCM, Đà Nẵng, Cần Thơ, Nha Trang, Hải Phòng, Biển Đông - Hoàng Sa - Trường Sa).

---

### PHÂN HỆ 2: GIÁM SÁT NGẬP LỤT ĐÔ THỊ & THỦY TRIỀU THỜI GIAN THỰC (SMART FLOOD WATCH & TIDE ENGINE)
*Tập trung tại mã nguồn: `backend/app/services/tide_service.py`, `backend/app/services/flood_engine.py`, `backend/app/api/v1/flood.py`, `frontend/src/services/floodService.ts`*

1. **Động Cơ Giải Tích Sóng Thủy Triều Thuần Python (Harmonic Tide Engine):**
   - Thuật toán giải tích điều hòa thiên văn kết hợp 4 sóng thành phần độc lập: Sóng bán nhật triều chính Mặt Trăng (M2), Mặt Trời (S2), sóng nhật triều Nhật-Nguyệt (K1), Mặt Trăng (O1).
   - Quan trắc và dự báo mực nước cho 2 trạm thủy văn chiến lược của TP.HCM: Trạm Phú An (Sông Sài Gòn) và Trạm Nhà Bè (Sông Đồng Điền).
   - Tính toán mực nước thời gian thực theo công thức:
     $$H(t) = H_0 + \sum_{i=1}^4 A_i \cos(\omega_i t - g_i)$$
   - Tính đạo hàm tốc độ dâng/rút của triều cường ($dH/dt$, đơn vị m/h) và xác định trạng thái con nước: Đang lên (Rising), Đang rút (Falling), Đứng nước (Slack).
   - Tự động dò tìm đỉnh triều (High Tide / Nước lớn) và chân triều (Low Tide / Nước ròng) trong chu kỳ 24h - 48h.
   - Đánh giá cấp báo động triều cường: Dưới BĐ1 (<1.40m), BĐ1 (1.40m), BĐ2 (1.50m), BĐ3 (>1.60m - Nguy cơ tràn bờ đô thị).

2. **Động Cơ Phân Tích Rủi Ro Ngập Lụt Đa Nhân Tố (Urban Flood Risk Engine):**
   - Tích hợp 3 yếu tố thủy văn cốt lõi: Mực nước triều cường hiện tại + Cường độ mưa (Rainfall mm/h) + Hệ số suy giảm thoát nước hạ tầng và cao độ địa hình.
   - Tính toán Risk Score (thang 0.0 - 10.0), ước tính độ sâu ngập mặt đường thực tế (cm).
   - Phân cấp 4 mức độ nghiêm trọng: Khô ráo (Safe), Ngập nhẹ (Minor <15cm), Ngập vừa (Moderate 15-25cm), Ngập sâu (Severe 25-45cm), Ngập cực nặng cấm đường (Impassable >45cm).
   - Đưa ra cảnh báo lưu thông cụ thể cho từng loại phương tiện: Có cấm xe máy không (`is_impassable_for_bikes`), có cấm ô tô gầm thấp không (`is_impassable_for_cars`).

3. **Bản Đồ Điểm Đen Ngập Lụt & Vẽ Hành Lang Tuyến Đường Ngập (Flooded Road Corridors):**
   - Tích hợp 30+ điểm đen ngập lịch sử TP.HCM (Quận 1, 7, 8, Bình Thạnh, Gò Vấp, Thủ Đức, Bình Tân, Nhà Bè...).
   - Vẽ trực tiếp hành lang đoạn đường ngập (Vector LineString) đè lên mặt đường với mã màu phát sáng theo cấp độ nguy cơ (Xanh lá / Vàng / Cam / Đỏ).
   - Hover chuột lên đoạn đường ngập để xem độ sâu ước tính, chiều dài đoạn ngập, nguyên nhân chính (Triều cường hay Mưa lớn) và lộ trình né ngập đề xuất (Detour advice).

4. **Mô Phỏng Triều Cường & Mưa Lớn Tương Tác (Interactive Flood Simulator):**
   - Thanh trượt mô phỏng lượng mưa giả định (0 - 100 mm/h) và triều cường.
   - Toàn bộ bản đồ lập tức cập nhật lại độ sâu ngập của toàn thành phố theo thời gian thực để người dùng xem trước kịch bản bão ngập.

5. **Tích Hợp Dự Báo Lũ Copernicus GloFAS 7 Ngày (Global Flood Awareness System):**
   - Tra cứu lưu lượng dòng chảy sông ngòi (River Discharge $m^3/s$) tại bất kỳ tọa độ nào từ vệ tinh Copernicus.
   - Modal hiển thị đồ thị lưu lượng nước trong 7 ngày tới kèm ngưỡng cảnh báo lưu lượng dòng chảy sông Sài Gòn & sông Đồng Nai.
   - Nút kiểm tra nhanh GloFAS ngay tại vị trí GPS của người dùng.

6. **Kiểm Tra An Toàn Lộ Trình Né Ngập (Flood Route Hazard Checker API):**
   - API `POST /api/v1/flood/check-route` kiểm tra mảng tọa độ polyline lộ trình di chuyển xem có cắt ngang hoặc đi sát các điểm ngập nguy hiểm (sử dụng PostGIS `ST_DWithin` với vùng đệm 150m).
   - Trả về danh sách các điểm ngập trên đường đi và khuyến cáo đổi hướng.

7. **Báo Cáo Điểm Ngập Cộng Đồng 1 Chạm & Snap-to-Road OSRM (Crowdsourced Flood Report):**
   - Nhấp chuột phải (Context Menu) vào bất kỳ vị trí nào trên bản đồ để mở form báo cáo ngập.
   - Người dân nhập độ sâu nước thực tế (cm), tình trạng xe máy/ô tô có qua được không, mô tả tình trạng ngập.
   - Backend tự động bám đường bằng OSRM (Dynamic Snap-to-Road LineString), tạo ngay một Hotspot ngập lụt động vào CSDL PostGIS và hiển thị tức thì trên bản đồ cho cộng đồng.

---

### PHÂN HỆ 3: BẢNG ĐIỀU KHIỂN PHÂN TÍCH CHẤT LƯỢNG KHÔNG KHÍ & KHÍ TƯỢNG TOÀN QUỐC (AIR QUALITY & CLIMATE DASHBOARD)
*Tập trung tại mã nguồn: `backend/app/services/air_quality_analytics_service.py`, `backend/app/api/v1/air_quality.py`, `frontend/src/components/AirQualityDashboard.tsx`, thư mục `frontend/src/components/dashboard/`*

1. **Động Cơ Dữ Liệu Lớn Xử Lý 7.1M Dòng Parquet 34 Tỉnh/Thành:**
   - Xử lý và tổng hợp dữ liệu chuỗi thời gian phân tích từ 7.1 triệu bản ghi Parquet bao phủ 34 tỉnh/thành phố trên khắp 3 miền Việt Nam.
   - Chuyển đổi linh hoạt giữa góc nhìn Toàn quốc (National Scope) và Từng tỉnh/thành phố (Province Scope).
   - Bộ lọc khung thời gian: 24 giờ qua (24h), 7 ngày qua (7d), 30 ngày qua (30d), cả năm (2025).

2. **Tab 1: Tổng Quan Chất Lượng Không Khí (Overview Tab):**
   - Thẻ Hero Metric trực quan: Chỉ số AQI hiện tại, AQI trung bình, phân cấp chất lượng không khí US EPA / QCVN với màu sắc đặc trưng.
   - Bảng khuyến nghị y tế chuyên sâu (Health Advice): Hướng dẫn cho nhóm người nhạy cảm (trẻ em, người cao tuổi, người bệnh hô hấp) và khuyến nghị hoạt động ngoài trời.
   - Khung giờ ô nhiễm cao nhất trong ngày (Peak Pollution Time Slot).
   - 6 thẻ chỉ số đo lường 6 chất ô nhiễm chuẩn quốc tế (PM2.5, PM10, $O_3$, $NO_2$, $SO_2$, $CO$) kèm nồng độ thực tế, tiêu chuẩn WHO/QCVN và % chênh lệch.
   - Biểu đồ phân bổ mức độ AQI (Distribution Bar Chart): Thống kê số trạm và % trạm đạt chuẩn Tốt, Vừa phải, Không lành mạnh, Nguy hiểm...
   - Bảng xếp hạng Top 5 tỉnh sạch nhất và Top 5 tỉnh ô nhiễm nhất kèm thanh đo trực quan.

3. **Tab 2: Phân Tích Chuyên Sâu Chất Ô Nhiễm (Pollutants Tab):**
   - Pills chuyển đổi nhanh giữa 7 chỉ số: AQI, Bụi mịn PM2.5, Bụi thô PM10, Ozone $O_3$, Nitơ Điôxít $NO_2$, Lưu Huỳnh Điôxít $SO_2$, Cacbon Monoxit $CO$.
   - Biểu đồ đường chuỗi thời gian theo từng giờ (Hourly Time-Series Line Chart): Thể hiện biến thiên nồng độ trong ngày, có các dải màu nền phân cấp mức độ cảnh báo quốc gia.
   - Biểu đồ cột so sánh nồng độ chất ô nhiễm giữa 34 tỉnh/thành (BarChart Comparison): Đánh dấu màu đỏ cảnh báo khi vượt ngưỡng quy chuẩn kỹ thuật quốc gia QCVN.
   - Ma trận tương quan nhiệt giữa 6 chất ô nhiễm (Heatmap Grid Correlation Matrix): Phân tích hệ số tương quan giữa các chất để phát hiện tính tương đồng và nguồn gốc phát thải (giao thông, công nghiệp, đốt sinh khối).

4. **Tab 3: Phân Tích Khí Tượng Học Đô Thị (Weather Tab):**
   - 4 thẻ KPI khí tượng: Nhiệt độ trung bình (°C), Độ ẩm tương đối (%), Tốc độ gió (km/h), Tổng lượng mưa tích lũy (mm).
   - Biểu đồ diễn biến khí tượng 12 tháng (Nhiệt độ vs Lượng mưa).
   - Biểu đồ phân tán (Scatter Plot): Phân tích tương quan giữa Nhiệt độ và Lượng mưa trên 34 tỉnh thành với lưới tọa độ trực quan.

5. **Tab 4: Tương Tác Khí Tượng - Ô Nhiễm Môi Trường (Interaction Tab):**
   - 4 đồng hồ hệ số tương quan Pearson ($r$):
     - Nhiệt độ vs AQI
     - Độ ẩm vs AQI
     - Tốc độ gió vs AQI
     - Lượng mưa vs AQI
     *(Tự động phân loại Tương quan thuận/nghịch và mức độ Mạnh/Trung bình/Yếu).*
   - Đường cong làm sạch của gió (Wind Cleaning Curve): Biểu diễn tốc độ gió (m/s) giúp khuếch tán và làm giảm bụi PM2.5 như thế nào.
   - Đường cong rửa trôi của mưa (Rain Washout Curve): Biểu diễn cường độ mưa (mm/h) giúp rửa trôi bụi mịn trong bầu khí quyển.
   - Bảng xếp hạng các tỉnh có khả năng tự làm sạch không khí tốt nhất nhờ lợi thế địa lý, gió biển và lượng mưa.

6. **Tab 5: Bảng Dữ Liệu Tương Tác & Xuất Báo Cáo CSV (Data Table Tab):**
   - Bảng dữ liệu tương tác 34 tỉnh thành với đầy đủ 10+ chỉ số môi trường & khí tượng.
   - Tìm kiếm tức thì theo tên tỉnh hoặc vùng miền (Bắc Bộ, Trung Bộ, Nam Bộ...).
   - Bộ lọc theo phân cấp cảnh báo chất lượng không khí.
   - Tính năng sắp xếp cột tăng dần / giảm dần theo từng chỉ số.
   - Tính năng xuất báo cáo dữ liệu bảng ra file CSV (`handleExportCSV`) chuẩn UTF-8 để phục vụ nghiên cứu và thống kê.

7. **Bộ Điều Hợp Đồng Bộ Thời Gian Thực (Live Runtime Synchronizer):**
   - Tự động đồng bộ số liệu quan trắc realtime từ Open-Meteo ECMWF/CAMS khi người dùng chọn xem chi tiết từng tỉnh, tự động fallback về số liệu lịch sử Parquet khi offline (`runtime_sync_service.py`).

---

### PHÂN HỆ 4: ĐA NGÔN NGỮ (INTERNATIONALIZATION - i18n) & DỊCH THUẬT BACKEND
*Tập trung tại mã nguồn: `backend/app/api/v1/i18n.py`, `backend/app/locales/vi.json`, `backend/app/locales/en.json`, `frontend/src/context/LanguageContext.tsx`, `frontend/src/components/LanguageSwitcher.tsx`*

1. **Hệ Thống Dịch Thuật Tập Trung Trên Python Backend:**
   - Quản lý từ điển tập trung trên Backend FastAPI thông qua thư viện `python-i18n`.
   - Bộ từ điển JSON chuẩn hóa song ngữ Anh - Việt (`vi.json`, `en.json`) với đầy đủ các khóa cho giao diện ứng dụng, bản đồ WebGIS và bảng điều khiển khí hậu.
2. **APIs Dịch Thuật Backend:**
   - `GET /api/v1/i18n/languages`: Danh sách ngôn ngữ được hỗ trợ (Tiếng Việt 🇻🇳, English 🇬🇧).
   - `GET /api/v1/i18n/translations?lang={vi|en}&flat=true`: Nạp toàn bộ từ điển dạng phẳng để binding vào React Context.
   - `POST /api/v1/i18n/translate`: Dịch đơn key hoặc danh sách keys theo yêu cầu bằng hàm `i18n.t()` của Python.
3. **Frontend Integration & Local Fallback:**
   - React `LanguageProvider` & hook `useTranslation()` cung cấp hàm `t(key, defaultText)`.
   - Tự động lưu cấu hình ngôn ngữ vào `localStorage` (`greenspot_lang`).
   - Tự động gắn header `Accept-Language` vào mọi request Axios gửi về Backend.
   - Cơ chế Fallback an toàn: nếu Backend tạm ngắt kết nối, giao diện tự động sử dụng từ điển nội bộ dự phòng mà không gây gián đoạn trải nghiệm người dùng.
   - Component `LanguageSwitcher` với giao diện chọn ngôn ngữ hiện đại, cờ quốc gia và thông báo trạng thái kết nối tới Python Backend.

---

### PHÂN HỆ 5: HẠ TẦNG CƠ SỞ DỮ LIỆU POSTGIS, QUẢN TRỊ & TIẾN TRÌNH NỀN
*Tập trung tại mã nguồn: `backend/app/models/`, `backend/app/crud/`, `backend/app/seeds/`, `backend/app/main.py`*

1. **Thiết Kế Cơ Sở Dữ Liệu Quan Hệ & Không Gian (14 Bảng PostGIS):**
   - `roles`, `permissions`, `role_permissions`, `users`: Phân quyền RBAC.
   - `administrative_units`: Đơn vị hành chính với hình học ranh giới `MULTIPOLYGON` và trọng tâm `POINT(centroid)`.
   - `essential_facilities`: Công viên, khu sinh thái, bảo tồn thiên nhiên với vị trí địa lý `POINT`.
   - `recycling_facilities`: Trạm thu gom rác, phân loại pin/e-waste với vị trí `POINT` và mảng loại rác tiếp nhận.
   - `waste_categories`: Danh mục phân loại rác và sự cố.
   - `incidents`: Sự cố ô nhiễm môi trường với tọa độ `POINT`, mức độ nghiêm trọng, điểm rủi ro, mã theo dõi.
   - `incident_media`: Hình ảnh, video minh chứng sự cố.
   - `iot_sensor_stations`: Trạm cảm biến quan trắc viễn trắc với siêu dữ liệu JSONB.
   - `air_quality_records`: Nhật ký quan trắc chất lượng không khí theo chuỗi thời gian.
   - `tide_stations`, `tide_harmonic_constituents`, `tide_water_level_records`: Dữ liệu trạm thủy văn và hằng số điều hòa sóng triều.
   - `flood_hotspots`: Điểm đen ngập lụt đô thị với vị trí `POINT`, hành lang đường ngập `LINESTRING` và các ngưỡng triều/mưa.
   - `flood_risk_assessments`: Đánh giá rủi ro ngập theo kịch bản.
   - `flood_community_reports`: Báo cáo ngập lụt crowdsourced của người đi đường.
   - `safe_navigation_routes`: Lộ trình di chuyển an toàn né ngập.
2. **Chỉ Mục Không Gian (Spatial Indexing):**
   - Chỉ mục GIST trên các cột hình học PostGIS (`geom`, `location`, `road_corridor`).
   - Tối ưu hóa truy vấn không gian: `ST_DWithin`, `ST_DistanceSphere`, `ST_AsGeoJSON`, `ST_MakePoint`.
3. **Tiến Trình Nền Quản Trị Vận Hành (Periodic Runtime Background Worker):**
   - Chạy nền trong Lifespan của FastAPI (`run_periodic_runtime_worker`).
   - Định kỳ tự động quét và cập nhật số liệu môi trường, kiểm tra trạm quan trắc IoT và tính toán lại rủi ro các điểm ngập đô thị.
4. **Chẩn Đoán Kết Nối Microservice (Backend Diagnostic Drawer):**
   - Nút trạng thái "API Service" trên header với đèn LED xanh/đỏ.
   - Popover chẩn đoán cho phép ping trực tiếp endpoint `/health` kiểm tra độ trễ và trạng thái sống của FastAPI backend.

---

## III. BẢNG MA TRẬN ĐỐI CHIẾU CÁC CHỨC NĂNG ĐÃ CODE HOÀN THÀNH

| STT | Nhóm Phân Hệ | Tên Chức Năng Cụ Thể | Trạng Thái Triển Khai | File Mã Nguồn Đại Diện |
| :---: | :--- | :--- | :---: | :--- |
| 1 | **WebGIS** | 7 Chế độ Bản đồ nền (Google Maps Cluster / OSM / Carto) | **Hoàn thành 100%** | `frontend/src/components/EcoMap.tsx` |
| 2 | **WebGIS** | Góc nhìn 3D Tòa nhà Đa sắc (5 Themes màu) | **Hoàn thành 100%** | `frontend/src/components/EcoMap.tsx` |
| 3 | **WebGIS** | Lớp Ranh giới 22 Quận/Huyện TP.HCM & FlyTo | **Hoàn thành 100%** | `frontend/src/data/hcmFullDistrictBoundaries.ts` |
| 4 | **WebGIS** | Bộ lọc 5 Danh mục Điểm Sinh thái (Sự cố, Điểm xanh, Tái chế, Sensor, Ngập) | **Hoàn thành 100%** | `backend/app/api/v1/eco_locations.py` |
| 5 | **WebGIS** | Tìm kiếm Số nhà, Địa điểm Trực tiếp (Live Places Search) | **Hoàn thành 100%** | `frontend/src/services/poiService.ts` |
| 6 | **WebGIS** | Tự động Tải Mạng lưới Tiện ích / POI theo Zoom Level (LOD) | **Hoàn thành 100%** | `frontend/src/services/poiService.ts` |
| 7 | **WebGIS** | Định vị GPS Vệ tinh Siêu tốc & Vòng tròn Bán kính Sai số | **Hoàn thành 100%** | `frontend/src/hooks/useFastGeolocation.ts` |
| 8 | **WebGIS** | Thả Ghim Giải mã Tọa độ Ngược (OSM Reverse Geocoding) | **Hoàn thành 100%** | `frontend/src/services/osmAdvancedService.ts` |
| 9 | **WebGIS** | Dẫn đường Lộ trình OSRM Thực tế (Glowing Polyline) | **Hoàn thành 100%** | `frontend/src/services/osmAdvancedService.ts` |
| 10 | **WebGIS** | Bản đồ Nhiệt Đa Dải (Nhiệt độ, AQI, Rủi ro ô nhiễm) | **Hoàn thành 100%** | `backend/app/services/weather_service.py` |
| 11 | **WebGIS** | Quick Tour 3D Danh thắng & Kỳ quan Việt Nam | **Hoàn thành 100%** | `backend/app/services/spatial_service.py` |
| 12 | **WebGIS** | Live Weather Radar Map (8 Lớp phủ Khí tượng Động) | **Hoàn thành 100%** | `frontend/src/components/LiveWeatherRadarMap.tsx` |
| 13 | **Giám sát Ngập** | Động cơ Giải tích Sóng Thủy Triều Thuần Python (Harmonic Tide Engine) | **Hoàn thành 100%** | `backend/app/services/tide_service.py` |
| 14 | **Giám sát Ngập** | Động cơ Phân tích Rủi ro Ngập lụt Đa nhân tố (Flood Risk Engine) | **Hoàn thành 100%** | `backend/app/services/flood_engine.py` |
| 15 | **Giám sát Ngập** | Vẽ Hành lang Đoạn đường ngập lụt phát sáng (Flooded Road Corridors) | **Hoàn thành 100%** | `frontend/src/services/floodService.ts` |
| 16 | **Giám sát Ngập** | Thanh trượt Mô phỏng Mưa lớn (Interactive Rain Simulation) | **Hoàn thành 100%** | `frontend/src/components/EcoMap.tsx` |
| 17 | **Giám sát Ngập** | Tích hợp Dự báo Lũ Copernicus GloFAS 7 ngày | **Hoàn thành 100%** | `backend/app/services/flood_service.py` |
| 18 | **Giám sát Ngập** | API Kiểm tra An toàn Lộ trình Né ngập (PostGIS ST_DWithin) | **Hoàn thành 100%** | `backend/app/services/flood_engine.py` |
| 19 | **Giám sát Ngập** | Chuột phải Báo cáo Ngập lụt Cộng đồng & Snap-to-Road OSRM | **Hoàn thành 100%** | `backend/app/api/v1/flood.py` |
| 20 | **AQI & Khí hậu** | Động cơ Phân tích 7.1M Dòng Parquet 34 Tỉnh/Thành | **Hoàn thành 100%** | `backend/app/services/air_quality_analytics_service.py` |
| 21 | **AQI & Khí hậu** | Tab 1: Hero Metric AQI, Khuyến nghị Sức khỏe & Top 5 Tỉnh | **Hoàn thành 100%** | `frontend/src/components/dashboard/OverviewTab.tsx` |
| 22 | **AQI & Khí hậu** | Tab 2: Chuỗi Thời gian Giờ, So Sánh 34 Tỉnh & Ma Trận Tương Quan 6 Chất | **Hoàn thành 100%** | `frontend/src/components/dashboard/PollutantsTab.tsx` |
| 23 | **AQI & Khí hậu** | Tab 3: KPI Khí tượng 4 Mùa & Biểu đồ Phân tán (Scatter Plot) | **Hoàn thành 100%** | `frontend/src/components/dashboard/WeatherTab.tsx` |
| 24 | **AQI & Khí hậu** | Tab 4: Hệ số Pearson, Đường cong Gió làm sạch & Mưa rửa trôi | **Hoàn thành 100%** | `frontend/src/components/dashboard/InteractionTab.tsx` |
| 25 | **AQI & Khí hậu** | Tab 5: Bảng Dữ liệu Tương tác, Lọc, Sắp xếp & Xuất Báo cáo CSV | **Hoàn thành 100%** | `frontend/src/components/dashboard/DataTableTab.tsx` |
| 26 | **AQI & Khí hậu** | Bộ điều hợp Đồng bộ Dữ liệu Khí tượng Thời gian thực (Live Runtime) | **Hoàn thành 100%** | `backend/app/services/runtime_sync_service.py` |
| 27 | **Đa ngôn ngữ** | Hệ thống Từ điển Tập trung Backend Python (python-i18n) | **Hoàn thành 100%** | `backend/app/api/v1/i18n.py` |
| 28 | **Đa ngôn ngữ** | Bộ chọn Ngôn ngữ Giao diện & Fallback Ngoại tuyến | **Hoàn thành 100%** | `frontend/src/context/LanguageContext.tsx` |
| 29 | **Hạ tầng CSDL** | Cấu trúc 14 Bảng Thực thể PostGIS & RBAC Phân quyền | **Hoàn thành 100%** | `backend/app/models/` |
| 30 | **Hạ tầng CSDL** | Tiến trình Nền Định kỳ (Periodic Runtime Background Worker) | **Hoàn thành 100%** | `backend/app/main.py` |
| 31 | **Chẩn đoán** | Popover Chẩn đoán Kết nối Microservice Backend (/health) | **Hoàn thành 100%** | `frontend/src/App.tsx` |

---

## IV. KẾT LUẬN CỦA PROJECT MANAGER

1. **Chất lượng thực thi mã nguồn:**
   - 100% các chức năng liệt kê trong báo cáo đã được **lập trình hoàn chỉnh từ tầng cơ sở dữ liệu PostGIS, tầng nghiệp vụ Python FastAPI, tới tầng giao diện người dùng React 19**.
   - Không có tính năng nào ở dạng placeholder hoặc mock dữ liệu tĩnh đơn thuần; mọi tương tác đều kết nối qua hệ thống API hoặc thuật toán giải tích trực tiếp.
2. **Độ ổn định và an toàn hệ thống:**
   - Toàn bộ các dịch vụ gọi ra ngoài (Open-Meteo, OSRM, Photon) đều được trang bị cơ chế bộ nhớ đệm (In-memory Caching TTL từ 5 - 10 phút) và cơ chế Fallback nội bộ, đảm bảo ứng dụng không bao giờ bị crash khi mất kết nối mạng bên ngoài.
   - Hệ thống đa ngôn ngữ phối hợp mượt mà giữa Backend và Frontend, tự động đồng bộ mã ngôn ngữ qua HTTP Header.

---
*Báo cáo được hoàn thiện và lưu giữ tại:* `d:\Group-j_GreenSpot\BAO_CAO_CHUC_NANG_DA_HOAN_THANH.md`
