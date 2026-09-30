# TÀI LIỆU ĐẶC TẢ TỔNG THỂ CÁC TÍNH NĂNG VÀ CHỨC NĂNG HỆ THỐNG
## DỰ ÁN: ECOREPORT / GREENSPOT (SMART URBAN ENVIRONMENTAL & FLOOD WEBGIS)
**Vai trò:** Quản Lý Dự Án (Project Manager)  
**Ngày lập báo cáo:** 29/09/2026  
**Phiên bản tài liệu:** v2.0-RELEASE  
**Phạm vi:** Toàn bộ hệ thống Frontend (React/TypeScript/MapLibre), Backend (FastAPI/Python), CSDL Không gian (PostgreSQL 16 + PostGIS 3.4), và Mô-đun Phân tích Khí tượng/AQI 34 Tỉnh thành.

---

## 1. TỔNG QUAN DỰ ÁN (EXECUTIVE SUMMARY)

**GreenSpot / EcoReport** là nền tảng Đô thị Thông minh (Smart City) chuyên sâu về **Quản trị Môi trường Đô thị, Bản đồ Số WebGIS Đa lớp, Giám sát & Báo động Ngập lụt Thời gian thực, và Phân tích Dữ liệu Chất lượng Không khí (AQI) - Khí tượng Toàn quốc**.

### 1.1 Mục tiêu hệ thống
- **Đối với Công dân đô thị:** Cung cấp bản đồ tương tác trực quan để tra cứu điểm xanh, điểm thu gom rác tái chế, cảnh báo điểm ngập úng ngập lụt theo thời gian thực; hỗ trợ tìm đường né ngập, báo cáo 1 chạm sự cố ô nhiễm và ngập nước, tích điểm đổi quà tặng xanh.
- **Đối với Cán bộ Môi trường & Đội Phản ứng nhanh:** Tiếp nhận sự cố có định vị GPS, tự động phân loại, kiểm tra SLA, phân công đội cơ động thu gom rác/xử lý ngập lụt, kiểm soát trạm quan trắc IoT viễn trắc.
- **Đối với Nhà quản lý & Chuyên gia dữ liệu:** Theo dõi phân tích chuyên sâu chất lượng không khí (AQI) và các thông số khí tượng học của 34 tỉnh/thành phố trên cả nước qua Dashboard đồ thị hiện đại.

### 1.2 Công nghệ cốt lõi (Tech Stack)
- **Frontend Web:** React 19, TypeScript, Vite, MapLibre GL, React-Map-GL, Axios, CSS3 hiện đại (Glassmorphism, Dark/Cyberpunk Theme).
- **Backend API:** Python 3.10+, FastAPI, SQLAlchemy 2.0 (Asyncpg), Alembic, Pydantic v2, OSRM Client, Open-Meteo & GloFAS Engine, RainViewer Weather Radar Integration.
- **Cơ sở dữ liệu Không gian (Spatial DB):** PostgreSQL 16 kết hợp tiện ích mở rộng PostGIS 3.4 (quản lý hình học `Point`, `LineString`, `Polygon`, `MultiPolygon`, chỉ mục không gian `GIST`).
- **Phân tích Dữ liệu Môi trường:** Parquet Data Lake (34 tỉnh thành), Polars, Pandas, Streamlit/Plotly Analytics Engine.

---

## 2. PHÂN HỆ 1: BẢN ĐỒ KHÔNG GIAN SỐ WEBGIS (ECOMAP CORE)

Đây là giao diện trung tâm (`EcoMap.tsx`) cung cấp trải nghiệm WebGIS mượt mà, trực quan với hiệu năng cao.

### 2.1 Bộ sưu tập Bản đồ nền Đa nguồn (Multi-Source Map Styles)
Người dùng có thể chuyển đổi linh hoạt giữa các lớp bản đồ nền phục vụ các mục đích quan sát khác nhau:
1. **Google Roadmap (Mặc định):** Bản đồ giao thông, tên đường chuẩn xác của Google Maps thông qua Tile Cluster.
2. **Google Hybrid (Vệ tinh kết hợp nhãn đường):** Hiển thị không gian thực tế từ ảnh vệ tinh kèm tên đường, địa danh.
3. **Google Traffic (Giao thông trực tiếp):** Tích hợp lớp dữ liệu mật độ kẹt xe, lưu thông đường phố theo thời gian thực.
4. **OpenStreetMap Standard:** Bản đồ mã nguồn mở cộng đồng chi tiết.
5. **CartoDB Positron (Bản đồ sáng tinh giản):** Nền trắng xám hiện đại, tôn vinh các lớp dữ liệu chuyên đề môi trường.
6. **CartoDB Dark Matter (Bản đồ bóng đêm):** Chế độ Dark mode tương phản cao, làm nổi bật các vệt nước ngập phát sáng và trạm IoT.

### 2.2 Mô hình Kiến trúc Tòa nhà 3D (3D Architectural Extrusions)
- **Bật/Tắt chế độ 3D:** Nghiêng góc nhìn (Pitch 60°, Bearing -17.6°) để hiển thị khối 3D của các tòa nhà cao tầng đô thị.
- **Bộ chủ đề màu sắc 3D linh hoạt (Building Color Themes):**
  - *Rainbow (Đa sắc cầu vồng):* Màu sắc tự động đổi theo độ cao của tòa nhà.
  - *Neon Blue / Cyberpunk:* Phát sáng hiện đại theo phong cách tương lai.
  - *Emerald Green (Xanh sinh thái):* Chủ đề thân thiện môi trường.
  - *Amber / Sunset Gold:* Tông màu vàng cam ấm cúng.
  - *Monochrome Slate:* Phong cách tối giản sang trọng.

### 2.3 Quản lý & Lọc Địa Điểm Môi Trường Chuyên Đề (Eco Categories)
Bản đồ phân loại và hiển thị các đối tượng địa lý theo 5 nhóm chuyên đề với các Marker và Panel chi tiết riêng biệt:
1. **Sự cố ô nhiễm (Incidents):** Điểm tập kết rác tự phát, cống tắc rác, ô nhiễm kênh rạch, kèm mã hồ sơ (`ECO-...`), độ nghiêm trọng, điểm số rủi ro, tiến độ xử lý và số lượt upvote đồng thuận.
2. **Không gian Xanh & Điểm sinh thái (Green Spots):** Công viên đô thị, vườn thực vật, khu bảo tồn sinh quyển (Công viên Tao Đàn, Thảo Cầm Viên, Công viên Gia Định...), diện tích khuôn viên, đánh giá sao trải nghiệm.
3. **Trạm thu gom rác tái chế & E-waste (Recycling Facilities):** Điểm tiếp nhận pin cũ, rác thải điện tử, đồ nhựa, vỏ hộp sữa, giấy báo; hiển thị giờ mở cửa, hotline liên hệ, đơn vị chủ quản.
4. **Trạm cảm biến quan trắc viễn trắc IoT (IoT Sensor Stations):** Trạm quan trắc chất lượng không khí (AQI), trạm đo ngập sóng siêu âm ven đường, trạm thủy văn đo triều ven sông; hiển thị trạng thái hoạt động viễn trắc theo thời gian thực.
5. **Điểm đen ngập lụt & Hành lang triều cường (Flood Hotspots):** Các nút giao và đoạn đường ngập úng, hiển thị nguyên nhân (do mưa, triều cường hay kết hợp), độ sâu ngập dự kiến và tình trạng giao thông.

### 2.4 Lớp Ranh giới Hành chính (Administrative Boundaries)
- Hiển thị ranh giới địa lý Polygon của 22 quận, huyện và TP. Thủ Đức (TP.HCM) tải động từ API PostGIS.
- Tự động bôi màu và hiển thị nhãn tên quận khi người dùng bật công tắc "Ranh giới khu vực".

### 2.5 Bản đồ nhiệt Chuyên đề (Heatmap Layers)
Tích hợp thuật toán Heatmap nội suy theo thời gian thực trên MapLibre:
- **Bản đồ nhiệt Khí độ (Temperature Heatmap):** Dải màu từ mát mẻ đến nóng gắt mô phỏng vi khí hậu.
- **Bản đồ nhiệt Chất lượng không khí (AQI Heatmap):** Phản ánh mức độ phân bố bụi mịn và độ ô nhiễm không khí đô thị.
- **Bản đồ nhiệt Điểm số Rủi ro Môi trường (Environmental Risk Heatmap):** Trực quan hóa các vùng tập trung nhiều sự cố ô nhiễm và điểm ngập nặng.

### 2.6 Khám phá Địa danh & Quick Tour 3D (Landmark 3D Tour)
Thanh công cụ chuyển đổi nhanh cho phép người dùng bấm để "bay" (Fly to) mượt mà đến các địa danh biểu tượng của TP.HCM ở góc nhìn 3D ấn tượng:
- *Landmark 81* (Bình Thạnh)
- *Tòa tháp Bitexco Financial Tower* (Quận 1)
- *Khuôn viên Thảo Cầm Viên Sài Gòn* (Quận 1)
- *Công viên Tao Đàn* (Quận 1)
- *Khu Công nghệ Cao TP.HCM* (TP. Thủ Đức)

### 2.7 Định vị & Tiện ích Tương tác Không gian (Spatial Utilities)
- **Định vị nhanh GPS:** Lấy tọa độ người dùng thông qua Geolocation API kết hợp Fallback an toàn.
- **Bản đồ mini HUD:** Hiển thị tọa độ con trỏ chuột thời gian thực (Kinh độ/Vĩ độ), góc xoay (Compass), và mức thu phóng (Zoom level).
- **Tra cứu địa chỉ đảo (Reverse Geocoding OSM):** Nhấp chuột trái vào bất kỳ vị trí nào trên bản đồ để tra cứu tên đường, số nhà, phường/xã thực tế từ dịch vụ OpenStreetMap Nominatim.
- **Tìm kiếm POI xung quanh (Nearby Places):** Quét các địa điểm dịch vụ lân cận (Quán cà phê, Nhà hàng, Siêu thị, Cửa hàng) xung quanh tâm bản đồ hoặc vị trí GPS.

---

## 3. PHÂN HỆ 2: GIÁM SÁT & BÁO ĐỘNG NGẬP LỤT ĐÔ THỊ THÔNG MINH (SMART FLOOD WATCH & TIDE ENGINE)

Đây là phân hệ mũi nhọn được phát triển chuyên sâu với kiến trúc hướng đối tượng (OOP - Clean Architecture), giải quyết bài toán chống ngập đô thị tại TP.HCM.

### 3.1 Động cơ Thủy triều Độc lập (Harmonic Tide Engine)
- **Thuật toán sóng điều hòa thiên văn (Harmonic Wave Analysis):** Tính toán độ dâng mực nước thủy triều theo công thức thuần Python độc lập, không phụ thuộc mạng ngoài.
- **Hỗ trợ trạm thủy văn:** Trạm Phú An (Sông Sài Gòn) và Trạm Nhà Bè (Sông Đồng Điền).
- **Phân loại chu kỳ con nước:** Triều dâng (Rising), Triều rút (Falling), Đỉnh triều (High Tide), Chân triều (Low Tide), Nước đứng (Stand).
- **Cấp độ cảnh báo triều cường TP.HCM:**
  - *Bình thường (< 1.40m):* Khô ráo, không ngập.
  - *Báo động I (1.40m - 1.50m):* Nước mấp mé bờ kè kênh rạch.
  - *Báo động II (1.50m - 1.60m):* Ngập các khu vực trũng thấp ven sông (Trần Xuân Soạn, Huỳnh Tấn Phát, Thanh Đa...).
  - *Báo động III (> 1.60m):* Ngập sâu diện rộng trên nhiều tuyến huyết mạch.
- **Dự báo chuỗi thời gian 24h - 48h:** Cung cấp danh sách điểm dữ liệu con nước theo từng giờ kèm mốc thời gian xuất hiện Đỉnh triều và Chân triều gần nhất.

### 3.2 Tích hợp Đa nguồn Dữ liệu Ngập Lụt (3-Source Flood Fusion)
Bản đồ tổng hợp tình trạng ngập lụt từ 3 nguồn độc lập:
1. **Nguồn 1: Cổng dữ liệu Mở TP.HCM (Sở Xây dựng & UDC):** Danh mục hơn 30 điểm đen ngập úng truyền thống, dữ liệu trạm bơm chống ngập, cao độ mặt đường và hệ số thoát nước.
2. **Nguồn 2: Đánh giá Thời tiết Thông minh (Rainfall & Tide Risk Engine):** Kết hợp lượng mưa tức thời từ Open-Meteo và mực nước triều Phú An để tính toán điểm rủi ro (Risk Score: 0 - 10) và độ sâu ngập dự kiến (cm).
3. **Nguồn 3: Open-Meteo Global Flood API (Copernicus GloFAS):** Cung cấp dự báo lưu lượng dòng chảy sông ngòi (River Discharge $m^3/s$) và nguy cơ ngập lụt toàn cầu trong 7 ngày tới.

### 3.3 Hiệu ứng Đồ họa Vẽ Vệt Đường Ngập Trực Tiếp (Flooded Road Corridors)
Thay vì hiển thị một điểm chấm tròn đơn giản, hệ thống sử dụng tọa độ vector `LineString` vẽ ôm khít theo đúng đoạn đường bị ngập lụt bằng 3 lớp hiệu ứng ánh sáng (Rendering Layers):
- *Lớp 1 (Glow Halo):* Hào quang nước phát sáng tỏa rộng dưới mặt đường.
- *Lớp 2 (Core Waterline):* Vệt nước ngập xanh Cyan đậm đà phủ kín lòng đường.
- *Lớp 3 (Water Ripple Animation):* Đường vân sóng nước chuyển động tượng trưng dòng nước chảy xiết.

### 3.4 Bảng Điều Khiển Mô Phỏng Ngập Úng (Flood Scenario Simulation)
- Cho phép người dùng hoặc cán bộ quản lý kéo thanh trượt giả lập **Lượng mưa nhân tạo (0 - 120 mm/h)** và **Mực nước triều cường giả định (1.0m - 2.0m)**.
- Toàn bộ bản đồ sẽ lập tức cập nhật lại màu sắc, chiều dài và độ nghiêm trọng của các đoạn đường ngập theo kịch bản mô phỏng để phục vụ công tác diễn tập phòng chống thiên tai.

---

## 4. PHÂN HỆ 3: BÁO CÁO NGẬP LỤT & SỰ CỐ CỘNG ĐỒNG (DYNAMIC CROWDSOURCING)

### 4.1 Báo cáo Ngập lụt Động qua Chuột Phải (Context Menu Snap-to-Road)
- **Thao tác 1 chạm trên bản đồ:** Người dân phát hiện đoạn đường đang ngập chỉ cần nhấp chuột phải (Right-click) vào vị trí đó trên WebGIS.
- **Thuật toán Bám đường OSRM (Snap-to-road Algorithm):**
  - Tự động tạo hộp ranh giới không gian (Bounding Box) quanh tọa độ click.
  - Giao tiếp với API Open Source Routing Machine (OSRM) để lấy hình học uốn lượn chính xác của tim đường.
  - Chuyển đổi tọa độ thành chuẩn PostGIS `LINESTRING(...)`.
- **Ghi nhận CSDL tức thì:** Tự động tạo bản ghi điểm đen ngập động mang mã `FL-DYN-...` vào bảng `flood_hotspots` và bảng `flood_community_reports`.
- **Tải lại Bản đồ Không cần F5:** Trigger cơ chế nạp lại dữ liệu ngầm (Auto-Refresh), dải đường ngập màu xanh phát sáng sẽ xuất hiện ngay lập tức trên màn hình cho tất cả người dùng khác cùng biết để phòng tránh.

### 4.2 Báo cáo Sự cố Ô nhiễm Môi trường (Environmental Incident Reporting)
- Người dân gửi thông tin phản ánh: Tiêu đề, loại ô nhiễm (Rác sinh hoạt, Hóa chất độc hại, Nghẹt cống ngập nước, Ô nhiễm kênh rạch, Xà bần xây dựng), địa chỉ mô tả, mức độ nghiêm trọng.
- Đính kèm hình ảnh hiện trường thực tế (`IncidentMedia`).
- Tự động sinh mã tra cứu hồ sơ công khai (`ECO-YYYYMMDD-XXXX`).
- Tính năng **Đồng thuận / Tán thành (Upvote):** Cho phép các công dân khác cùng bấm ủng hộ báo cáo để đẩy độ ưu tiên xử lý của chính quyền lên cao hơn.

---

## 5. PHÂN HỆ 4: ĐIỀU HƯỚNG LỘ TRÌNH THÔNG MINH & NÉ NGẬP (SAFE NAVIGATION ROUTING)

### 5.1 Tìm đường Nhanh nhất (OSRM Driving Route)
- Cho phép chọn điểm xuất phát (Origin) từ vị trí GPS hiện tại hoặc điểm bất kỳ trên bản đồ.
- Chọn điểm đích (Destination) bằng cách click vào một địa điểm môi trường, một POI hoặc nhấp chuột lên bản đồ.
- Hiển thị tuyến đường lái xe màu xanh phát sáng kèm thông tin tổng cự ly (km) và thời gian di chuyển ước tính (phút).

### 5.2 Thuật toán Kiểm tra Vùng Nguy hiểm (Flood Hazard Collision Detection)
- Backend cung cấp API `/api/v1/flood/check-route`.
- Nhận mảng Polyline tọa độ của tuyến đường, dùng hàm không gian PostGIS `ST_DWithin` quét vùng đệm (Buffer 150m) dọc hai bên tuyến đường xem có cắt qua điểm đen ngập lụt nào đang hoạt động hay không.
- Phân loại trạng thái an toàn của lộ trình:
  - **CLEAR (An toàn tuyệt đối):** Không có điểm ngập nào trên lộ trình.
  - **CAUTION (Cần chú ý):** Có điểm ngập nhẹ (5 - 15cm), xe máy và ô tô vẫn qua được nếu đi chậm.
  - **AVOID (Khuyến nghị né tránh):** Tuyến đường đi qua điểm ngập sâu (> 25cm) có nguy cơ chết máy hoặc ngập hoàn toàn (> 50cm).
- Đưa ra lời khuyên cụ thể cho từng loại phương tiện (xe máy, ô tô con gầm thấp).

---

## 6. PHÂN HỆ 5: BẢNG ĐIỀU KHIỂN PHÂN TÍCH CHẤT LƯỢNG KHÔNG KHÍ & KHÍ TƯỢNG TOÀN QUỐC (AIR QUALITY & CLIMATE DASHBOARD)

Được tách thành một màn hình chuyên dụng (`AirQualityDashboard.tsx`) phục vụ nghiên cứu, báo cáo thống kê và giám sát môi trường trên phạm vi **34 tỉnh/thành phố của Việt Nam**.

### 6.1 Khung Điều Khiển Bộ Lọc Đa Chiều (Global Analytics Filter)
- **Chế độ quan sát (Scope Mode):**
  - *Toàn quốc (Nationwide):* Tổng hợp bức tranh phân hóa khí hậu và không khí cả nước.
  - *Từng tỉnh/thành phố (Single Province):* Khảo sát chi tiết một địa phương (TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ, Hải Phòng, Huế, Khánh Hòa...).
- **Khung thời gian (Time Range):** 24 giờ qua (24h), 7 ngày qua (7d), 30 ngày qua (30d), và Cả năm (Annual).
- **Bộ chọn chất ô nhiễm đơn lẻ:** PM2.5, PM10, O3, NO2, SO2, CO.

### 6.2 Tab 1: Tổng quan Chất lượng Không khí (Overview Tab)
- **Thẻ KPI Hero:** Hiển thị chỉ số AQI tổng hợp lớn, phân loại mức độ bằng màu sắc chuẩn quốc tế (Tốt - Xanh lá, Trung bình - Vàng, Kém - Cam, Xấu - Đỏ, Rất xấu - Tím, Nguy hại - Nâu đậm).
- **Khuyến nghị Sức khỏe Y tế Đô thị:** Lời khuyên cụ thể cho các nhóm đối tượng (Người nhạy cảm, Trẻ em, Người cao tuổi, Người vận động thể thao ngoài trời).
- **Bộ 6 Thẻ Đo Lường Chất Ô Nhiễm:** Nồng độ hiện tại ($\mu g/m^3$ hoặc $mg/m^3$) của 6 chất: PM2.5, PM10, O3, NO2, SO2, CO kèm trạng thái đánh giá an toàn/cảnh báo.
- **Biểu đồ Phân bổ Mức độ AQI:** Tỷ lệ phần trăm thời gian đạt chuẩn chất lượng không khí trong kỳ quan trắc.
- **Bảng Vinh danh & Cảnh báo:** Top 5 tỉnh/thành phố có không khí trong lành nhất và Top 5 tỉnh/thành phố bị ô nhiễm nhất.

### 6.3 Tab 2: Phân tích Chất Ô Nhiễm & Chuỗi Thời Gian (Pollutants & Trend Tab)
- **Biểu đồ Chuỗi thời gian (Interactive Line Chart):** Diễn biến nồng độ các chất ô nhiễm và AQI theo từng giờ trong ngày hoặc từng ngày trong tuần/tháng.
- **Biểu đồ Cột So sánh 34 Tỉnh thành (Comparative Bar Chart):** So sánh trực quan nồng độ chất ô nhiễm đang chọn giữa 34 tỉnh/thành phố trên cả nước, dễ dàng nhận diện điểm nóng ô nhiễm.
- **Ma trận Tương quan Nhiệt 6 Chất Ô Nhiễm (Correlation Heatmap):** Ma trận chỉ số tương quan thống kê giữa các cặp chất ô nhiễm (ví dụ mối tương quan chặt chẽ giữa PM2.5 và PM10, hoặc giữa NO2 và CO từ khí thải phương tiện giao thông).

### 6.4 Tab 3: Phân tích Khí tượng Học (Weather Tab)
- **Bộ thẻ chỉ số vi khí hậu:** Nhiệt độ trung bình (°C), Độ ẩm tương đối (%), Tốc độ gió (km/h), Lượng mưa tích lũy (mm), Hướng gió, Áp suất khí quyển.
- **Biểu đồ Khí hậu 12 Tháng:** Thể hiện quy luật thời tiết theo mùa (Mùa mưa, Mùa khô, Mùa lạnh) của địa phương.
- **Biểu đồ Phân tán (Scatter Plot) Nhiệt độ vs. Lượng mưa:** Phân tích quy luật tương tác giữa nhiệt độ không khí và cường độ mưa giông.

### 6.5 Tab 4: Tương tác Khí tượng - Ô nhiễm Môi trường (Interaction Tab)
- **Đường cong Làm sạch của Gió (Wind Cleansing Curve):** Mô hình hóa quy luật vật lý: khi tốc độ gió tăng lên, khả năng khuếch tán không khí tốt hơn làm giảm nồng độ bụi mịn PM2.5 như thế nào.
- **Đường cong Rửa trôi của Mưa (Rain Washout Curve):** Minh chứng tác dụng của những cơn mưa lớn trong việc làm sạch bầu khí quyển, rửa trôi bụi bẩn lơ lửng.
- **Bảng Hệ số Tương quan Khí tượng - AQI:** Xác định yếu tố thời tiết nào tác động mạnh nhất đến chất lượng không khí tại địa phương.
- **Xếp hạng Tỉnh/Thành Tự làm sạch Tốt nhất:** Vinh danh các tỉnh ven biển hoặc có điều kiện tự nhiên thuận lợi cho việc thanh lọc không khí tự nhiên.

### 6.6 Tab 5: Bảng Dữ Liệu Tương Tác Chi Tiết (Data Table Tab)
- Bảng tổng hợp số liệu của toàn bộ 34 tỉnh/thành phố.
- Ô tìm kiếm nhanh theo tên tỉnh/thành.
- Bộ lọc theo hạng mức ô nhiễm (Chỉ xem các tỉnh Ô nhiễm xấu, hoặc chỉ xem tỉnh Trong lành).
- Tính năng sắp xếp (Sort) tăng dần/giảm dần theo bất kỳ cột chỉ số nào (AQI, PM2.5, Nhiệt độ, Độ ẩm, Tốc độ gió, Lượng mưa).
- Nút bấm xem nhanh để tự động chuyển bộ lọc toàn trang về địa phương đó.

---

## 7. PHÂN HỆ 6: RADAR KHÍ TƯỢNG ĐỘNG LỰC HỌC (LIVE WEATHER RADAR INTEGRATION)

Được tích hợp qua component `LiveWeatherRadarMap.tsx` mang đến khả năng theo dõi mây mưa bão lũ trực quan tầm cỡ quốc tế:
- **Tích hợp RainViewer Weather Radar:** Tải các lát cắt ảnh radar phản xạ mây mưa (dBZ) theo thời gian thực.
- **Bộ 8 Lớp Phủ Khí tượng Chuyên biệt (Weather Overlays):**
  1. *Nhiệt độ (Temperature - °C):* Bản đồ gradient nhiệt động lực học.
  2. *Gió & Luồng hạt (Wind & Streamlines - km/h):* Mô phỏng chuyển động hạt gió thời gian thực cực kỳ sinh động.
  3. *Radar Mây mưa (Weather Radar - dBZ):* Nhận biết mưa nhẹ, mưa rào, mưa dông hay mưa đá.
  4. *Lượng mưa tích lũy (Precipitation - mm/h).*
  5. *Mây che phủ (Cloud Cover - %).*
  6. *Sóng biển & Thủy triều (Sea Waves - m).*
  7. *Ảnh vệ tinh hồng ngoại (Infrared Satellite).*
  8. *Áp suất khí quyển (Air Pressure - hPa).*
- **Chế độ chuyển vùng nhanh các đô thị trọng điểm:** Toàn cảnh Việt Nam, TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ, Nha Trang, Hải Phòng, và Vùng biển Quần đảo Hoàng Sa - Trường Sa.

---

## 8. PHÂN HỆ 7: CƠ SỞ DỮ LIỆU KHÔNG GIAN, QUẢN TRỊ HỆ THỐNG & PHÂN QUYỀN (ENTERPRISE BACKEND & RBAC)

Dựa trên cấu trúc CSDL PostgreSQL 16 + PostGIS 3.4 chuẩn hóa (`app/models` và `app/seeds/seed_data.py`):

### 8.1 Phân quyền Người Dùng Theo Vai Trò (RBAC - Role-Based Access Control)
Hệ thống thiết kế sẵn 4 nhóm vai trò chuẩn hóa:
1. **ADMIN (Quản trị viên Hệ thống):** Toàn quyền cấu hình tham số hệ thống, quản lý tài khoản người dùng, giám sát nhật ký kiểm toán (Audit Logs), quản lý lớp bản đồ WebGIS.
2. **OFFICER (Cán bộ Phòng Tài nguyên & Môi trường / Điều phối viên):** Tiếp nhận báo cáo sự cố từ người dân, thẩm tra xác thực thực địa, phân công điều phối cho các đội thu gom hiện trường, chuyển cấp hồ sơ (Phường ➔ Quận ➔ Sở).
3. **COLLECTOR (Đội trưởng / Nhân viên Đội Thu gom Hiện trường):** Tiếp nhận lệnh điều động công việc trên ứng dụng di động/web, cập nhật trạng thái xử lý sự cố, chụp ảnh nghiệm thu hoàn thành (Before / After).
4. **CITIZEN (Công dân Đô thị):** Gửi phản ánh ô nhiễm mới, gửi báo cáo ngập nước 1-chạm, theo dõi tiến độ giải quyết hồ sơ công khai, tích điểm thưởng công dân xanh.

### 8.2 Cơ chế Bảo Mật & Ẩn Danh Cá Nhân (Privacy & Spatial Jitter)
- Cho phép người dân bật chế độ **Báo cáo Ẩn danh (Is Anonymous)** khi gửi sự cố nhạy cảm.
- Tự động làm mờ số điện thoại người phản ánh (`reporter_phone_masked`).
- Cơ chế **Spatial Jitter:** Tự động tạo độ lệch ngẫu nhiên nhỏ (bán kính 50m) cho tọa độ GPS người báo cáo để bảo vệ vị trí nhà ở/vị trí cá nhân của công dân, không làm lộ danh tính trên bản đồ công khai.

### 8.3 Cam kết Chất lượng Xử lý Sự cố (SLA Policies)
- Cấu hình thời hạn phản hồi và thời hạn giải quyết tối đa cho từng nhóm loại rác thải và mức độ nghiêm trọng:
  - *Chất thải nguy hại (Pin, Hóa chất, Axit):* Phản hồi trong 1 giờ, giải quyết trong 12 giờ.
  - *Điểm nghẽn cống gây ngập úng đô thị:* Phản hồi trong 2 giờ, giải quyết trong 18 giờ.
  - *Rác thải sinh hoạt ứ đọng:* Phản hồi trong 4 giờ, giải quyết trong 24 giờ.
  - *Ô nhiễm kênh rạch:* Phản hồi trong 2 giờ, giải quyết trong 36 giờ.
  - *Xà bần & phế thải xây dựng:* Phản hồi trong 8 giờ, giải quyết trong 72 giờ.
- Cơ chế tính điểm phạt vi phạm cam kết xử lý (`penalty_points_per_hour`) đối với các đơn vị trực thuộc trễ hạn.

### 8.4 Quản lý Đội Cơ Động & Phương Tiện Thu Gom (Work Teams Logistics)
- Quản lý danh bạ các đội thu gom cơ động của địa phương.
- Gắn với loại phương tiện chuyên dụng: Xe ép rác chuyên dụng (`COMPACTOR_TRUCK`), Canô vớt rác trên kênh rạch (`CLEANING_BOAT`), Xe bán tải cơ động phản ứng nhanh (`RAPID_RESPONSE_VAN`).
- Theo dõi tải trọng phương tiện (tấn) và trạng thái sẵn sàng làm nhiệm vụ (`ACTIVE`, `BUSY`, `MAINTENANCE`).

### 8.5 Tuyến Lộ Trình Thu Gom Rác Cố Định & Trạm Dừng (Collection Routes & Checkpoints)
- Lưu trữ hình học đường đi thực tế của xe rác dưới dạng PostGIS `LINESTRING`.
- Quản lý danh sách các trạm dừng đón rác (Checkpoints), thứ tự ghé thăm, giờ dự kiến đến nơi và khối lượng rác ước tính ($m^3$) cần bốc dỡ.

---

## 9. PHÂN HỆ 8: TƯƠNG TÁC XÃ HỘI, GAMIFICATION & TRA CỨU PHÁP LUẬT MÔI TRƯỜNG

### 9.1 Hệ sinh thái Tích điểm Đổi quà "Công Dân Xanh" (Citizen Green Rewards)
- Cơ chế Gamification khuyến khích người dân tham gia tích cực vào bảo vệ môi trường đô thị:
  - Gửi báo cáo sự cố chính xác: Được cộng điểm xanh (Green Points).
  - Xác thực điểm ngập lụt giúp cộng đồng né ngập: Được thưởng điểm uy tín.
- Danh mục quà tặng sinh thái trong kho:
  - Túi vải Canvas phong cách sống xanh EcoReport (150 điểm).
  - Chậu cây xanh lọc không khí để bàn Lưỡi Hổ / Kim Tiền (200 điểm).
  - Bình giữ nhiệt Inox cao cấp 500ml (350 điểm).

### 9.2 Tra cứu Khung Xử phạt Vi phạm Môi trường (Penalty Regulations)
- Tích hợp điều khoản của **Nghị định 45/2022/NĐ-CP** của Chính phủ về xử phạt vi phạm hành chính trong lĩnh vực bảo vệ môi trường:
  - Hành vi vứt tàn thuốc lá không đúng nơi quy định: Phạt 100.000đ - 150.000đ.
  - Vứt rác thải sinh hoạt bừa bãi ra vỉa hè, lòng đường, hệ thống cống thoát nước: Phạt 1.000.000đ - 2.000.000đ.
  - Đổ trộm xà bần, phế thải xây dựng, bùn đất lấn chiếm lòng lề đường: Phạt 10.000.000đ - 20.000.000đ, tịch thu phương tiện vi phạm.

### 9.3 Kho Tri thức Môi trường & Hỗ trợ AI RAG (AI Knowledge Base)
- Lưu trữ tài liệu chuẩn hóa: Hướng dẫn phân loại rác thải tại nguồn của TP.HCM (3 nhóm rác), Quy trình vận hành tiêu chuẩn ứng phó khẩn cấp điểm ngập đô thị (SOP).
- Cấu trúc sẵn sàng kết nối mô hình ngôn ngữ lớn (LLM / RAG) phục vụ Trợ lý ảo tư vấn công dân trong các giai đoạn phát triển tiếp theo.

### 9.4 Đa Ngôn Ngữ (Internationalization - i18n)
- Thiết kế sẵn bảng từ điển đa ngôn ngữ (`system_translations`) hỗ trợ song ngữ hoàn chỉnh: **Tiếng Việt (vi)** và **Tiếng Anh (en)** cho toàn bộ nhãn giao diện và thông điệp cảnh báo thời gian thực.

---

## 10. DANH MỤC TỔNG HỢP CÁC API ENDPOINTS HỆ THỐNG

### 10.1 Nhóm API Thủy Triều & Ngập Lụt (`/api/v1/flood`)
| STT | Phương thức | Endpoint URI | Mô tả chức năng |
|:---:|:---:|:---|:---|
| 1 | `GET` | `/api/v1/flood/tide/current` | Lấy mực nước và cấp báo động triều cường thời gian thực (Trạm Phú An / Nhà Bè) qua Harmonic Wave Engine. |
| 2 | `GET` | `/api/v1/flood/tide/forecast` | Dự báo đường cong dao động sóng triều 24h - 48h, đỉnh triều và chân triều. |
| 3 | `GET` | `/api/v1/flood/hotspots` | Trả về GeoJSON FeatureCollection các điểm đen và vệt đường ngập (Tổng hợp 3 nguồn). |
| 4 | `GET` | `/api/v1/flood/hotspots/list` | Danh sách điểm đen ngập lụt kèm điểm số rủi ro động tính từ CSDL. |
| 5 | `GET` | `/api/v1/flood/forecast` | Tra cứu dự báo lũ lụt toàn cầu Copernicus GloFAS 7 ngày theo tọa độ GPS. |
| 6 | `GET` | `/api/v1/flood/summary` | Tóm tắt thống kê tình hình ngập lụt đô thị và số lượng điểm ngập theo từng cấp độ. |
| 7 | `POST` | `/api/v1/flood/check-route` | Kiểm tra va chạm không gian giữa tuyến đường di chuyển với các điểm ngập nguy hiểm (Buffer 150m PostGIS). |
| 8 | `POST` | `/api/v1/flood/report` | Tiếp nhận báo cáo ngập lụt từ người dân, bám đường OSRM Snap-to-road và nạp PostGIS tức thì. |

### 10.2 Nhóm API Bản Đồ Không Gian & Môi Trường (`/api/v1/eco-locations`, `/api/v1/spatial`, `/api/v1/weather`)
| STT | Phương thức | Endpoint URI | Mô tả chức năng |
|:---:|:---:|:---|:---|
| 9 | `GET` | `/api/v1/eco-locations` | Danh sách tổng hợp toàn bộ các địa điểm môi trường TP.HCM (Sự cố, Điểm xanh, Trạm tái chế, Cảm biến IoT, Điểm ngập). |
| 10 | `GET` | `/api/v1/spatial/districts` | Trả về GeoJSON đa giác ranh giới các quận/huyện của TP.HCM. |
| 11 | `GET` | `/api/v1/spatial/nearest` | Tìm kiếm nhanh các địa điểm môi trường lân cận vị trí GPS theo bán kính chỉ định (`radius_km`). |
| 12 | `GET` | `/api/v1/spatial/landmarks` | Danh sách các địa danh Quick Tour 3D nổi bật của TP.HCM. |
| 13 | `GET` | `/api/v1/weather/current` | Thời tiết vi khí hậu, gió, nhiệt độ và AQI thời gian thực theo tọa độ GPS. |
| 14 | `GET` | `/api/v1/weather/heatmap` | Dữ liệu GeoJSON phục vụ vẽ bản đồ nhiệt thời tiết và chất lượng không khí toàn quốc. |

### 10.3 Nhóm API Phân Tích Chất Lượng Không Khí Toàn Quốc (`/api/v1/air-quality`)
| STT | Phương thức | Endpoint URI | Mô tả chức năng |
|:---:|:---:|:---|:---|
| 15 | `GET` | `/api/v1/air-quality/provinces` | Danh mục 34 tỉnh/thành phố có mạng lưới quan trắc khí hậu & AQI. |
| 16 | `GET` | `/api/v1/air-quality/overview` | Số liệu KPI Hero, khuyến nghị sức khỏe, 6 chất ô nhiễm, phân bổ AQI và Top 5 tỉnh sạch/ô nhiễm nhất. |
| 17 | `GET` | `/api/v1/air-quality/provinces/{slug}/trend` | Chuỗi thời gian diễn biến AQI và 6 chất ô nhiễm theo từng giờ. |
| 18 | `GET` | `/api/v1/air-quality/provinces/{slug}/pollutants`| So sánh nồng độ chất ô nhiễm giữa 34 tỉnh thành và ma trận tương quan nhiệt. |
| 19 | `GET` | `/api/v1/air-quality/weather` | Phân tích khí tượng học (Nhiệt độ, ẩm, gió, mưa), xu hướng 12 tháng và biểu đồ tán xạ. |
| 20 | `GET` | `/api/v1/air-quality/interaction` | Phân tích quy luật tương tác: Đường cong gió làm sạch, đường cong mưa rửa trôi. |
| 21 | `GET` | `/api/v1/air-quality/table` | Toàn bộ dữ liệu dạng bảng cho 34 tỉnh thành hỗ trợ tìm kiếm, lọc và sắp xếp. |
| 22 | `GET` | `/api/v1/air-quality/provinces/{slug}/latest` | Lấy dữ liệu viễn trắc môi trường thời gian thực (Live Runtime) của một tỉnh thành cụ thể. |
| 23 | `GET` | `/health` | Kiểm tra trạng thái hoạt động vi dịch vụ Backend FastAPI (Ping/Health diagnostic). |

---

## 11. BẢNG MA TRẬN ĐÁNH GIÁ MỨC ĐỘ HOÀN THIỆN (FEATURE IMPLEMENTATION MATRIX)

| Phân hệ / Mô-đun | Tính năng chi tiết | Trạng thái hiện tại | Vị trí mã nguồn chính |
|:---|:---|:---:|:---|
| **WebGIS Core** | Bản đồ Google Roadmap, Satellite, Traffic, Dark | ✅ Hoàn thành 100% | `frontend/src/components/EcoMap.tsx` |
| | Kiến trúc 3D Tòa nhà & Bộ chọn màu sắc | ✅ Hoàn thành 100% | `frontend/src/components/EcoMap.tsx` |
| | Lớp Ranh giới 22 Quận/Huyện TP.HCM | ✅ Hoàn thành 100% | `backend/app/api/v1/spatial.py` |
| | Lọc 5 danh mục địa điểm môi trường | ✅ Hoàn thành 100% | `backend/app/api/v1/eco_locations.py` |
| | Bản đồ nhiệt Heatmap (AQI, Nhiệt độ, Rủi ro) | ✅ Hoàn thành 100% | `backend/app/api/v1/weather.py` |
| | Quick Tour 3D địa danh nổi tiếng TP.HCM | ✅ Hoàn thành 100% | `frontend/src/data/hcmLocations.ts` |
| **Báo động Ngập lụt** | Thuật toán Thủy triều độc lập Harmonic Engine | ✅ Hoàn thành 100% | `backend/app/services/tide_service.py` |
| | Tích hợp 3 Nguồn (Cổng mở, Thời tiết, GloFAS) | ✅ Hoàn thành 100% | `backend/app/services/flood_service.py` |
| | Vẽ vệt đường ngập 3 lớp ánh sáng lên lòng đường | ✅ Hoàn thành 100% | `frontend/src/components/EcoMap.tsx` |
| | Thanh trượt mô phỏng mưa và triều cường | ✅ Hoàn thành 100% | `frontend/src/components/EcoMap.tsx` |
| **Crowdsourcing** | Báo ngập chuột phải + OSRM Snap-to-road | ✅ Hoàn thành 100% | `backend/app/api/v1/flood.py` |
| | Ghi nhận CSDL PostGIS động & Auto-refresh bản đồ | ✅ Hoàn thành 100% | `backend/app/api/v1/flood.py` |
| | Tiếp nhận sự cố môi trường & Upvote cộng đồng | ✅ Hoàn thành 100% | `backend/app/models/incident.py` |
| **Dẫn đường Né ngập** | Tìm đường OSRM Routing lái xe | ✅ Hoàn thành 100% | `frontend/src/services/osmAdvancedService.ts` |
| | PostGIS `ST_DWithin` phát hiện va chạm điểm ngập | ✅ Hoàn thành 100% | `backend/app/services/flood_engine.py` |
| | Cảnh báo mức độ an toàn (Clear, Caution, Avoid) | ✅ Hoàn thành 100% | `backend/app/schemas/flood.py` |
| **Dashboard AQI** | Phân tích 34 Tỉnh thành toàn quốc | ✅ Hoàn thành 100% | `frontend/src/components/AirQualityDashboard.tsx` |
| | Overview Tab: KPI Hero, 6 chất ô nhiễm, Top 5 | ✅ Hoàn thành 100% | `frontend/src/components/dashboard/OverviewTab.tsx` |
| | Pollutants Tab: Chuỗi thời gian, So sánh 34 tỉnh | ✅ Hoàn thành 100% | `frontend/src/components/dashboard/PollutantsTab.tsx` |
| | Weather Tab: 12 tháng khí hậu, Scatter Plot | ✅ Hoàn thành 100% | `frontend/src/components/dashboard/WeatherTab.tsx` |
| | Interaction Tab: Đường cong gió & mưa làm sạch | ✅ Hoàn thành 100% | `frontend/src/components/dashboard/InteractionTab.tsx` |
| | Data Table Tab: Tìm kiếm, lọc, sắp xếp 34 tỉnh | ✅ Hoàn thành 100% | `frontend/src/components/dashboard/DataTableTab.tsx` |
| **Radar Thời tiết** | Live RainViewer Radar 8 lớp phủ khí quyển | ✅ Hoàn thành 100% | `frontend/src/components/LiveWeatherRadarMap.tsx` |
| **Hệ thống Quản trị**| Phân quyền RBAC (Admin, Officer, Collector, Citizen)| ✅ Hoàn thành 100% | `backend/app/models/rbac.py` |
| | Cam kết thời hạn xử lý SLA theo loại rác | ✅ Hoàn thành 100% | `backend/app/seeds/seed_data.py` |
| | Bảo mật thông tin & Làm nhiễu GPS (Spatial Jitter) | ✅ Hoàn thành 100% | `backend/app/seeds/seed_data.py` |
| | Quản lý đội xe thu gom & Tuyến đường gom rác | ✅ Hoàn thành 100% | `backend/app/seeds/seed_data.py` |
| | Gamification Tích điểm Đổi quà Công dân Xanh | ✅ Hoàn thành 100% | `backend/app/seeds/seed_data.py` |
| | Tra cứu mức xử phạt vi phạm (NĐ 45/2022/NĐ-CP) | ✅ Hoàn thành 100% | `backend/app/seeds/seed_data.py` |
| | Hỗ trợ Song ngữ Việt - Anh (i18n) | ✅ Hoàn thành 100% | `backend/app/seeds/seed_data.py` |

---

## 12. KẾT LUẬN & ĐỀ XUẤT TỪ GÓC ĐỘ QUẢN LÝ DỰ ÁN (PM ASSESSMENT)

1. **Về mặt Kiến trúc & Công nghệ:** Dự án được xây dựng rất bài bản theo tiêu chuẩn Clean Architecture và Domain-Driven Design (DDD). Việc kết hợp giữa **PostGIS** (không gian địa lý), **FastAPI** (hiệu năng cao bất đồng bộ), và **MapLibre GL** (kết xuất đồ họa vector mượt mà) tạo nên một sản phẩm WebGIS vượt trội so với các sản phẩm đồ án thông thường.
2. **Về mặt Tính năng Nghiệp vụ:** Điểm sáng lớn nhất của dự án là **Hệ thống Dự báo Thủy triều Độc lập kết hợp Cảnh báo Ngập lụt Đa nguồn** và **Cơ chế Báo ngập Động Snap-to-Road bằng OSRM**. Đây là tính năng có giá trị ứng dụng thực tiễn rất cao tại các đô thị thường xuyên chịu ảnh hưởng của triều cường như TP.HCM.
3. **Về Khả năng Trực quan hóa Dữ liệu:** Sự tích hợp của **Bảng Phân Tích Chất Lượng Không Khí 34 Tỉnh thành** cùng **Radar Thời tiết RainViewer** mang lại trải nghiệm chuyên nghiệp, biến GreenSpot thành một trung tâm điều hành môi trường số (Digital Environmental Operations Center) hoàn chỉnh.
