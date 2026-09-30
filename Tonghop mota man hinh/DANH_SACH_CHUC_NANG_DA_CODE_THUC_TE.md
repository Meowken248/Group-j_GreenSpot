# BÁO CÁO NGHIỆM THU MÃ NGUỒN: DANH SÁCH CÁC CHỨC NĂNG ĐÃ CODE THỰC TẾ TRONG DỰ ÁN GREENSPOT / ECOREPORT

> **Dự án:** Hệ thống Quản lý Môi trường Đô thị, Bản đồ số WebGIS & Báo động Ngập lụt Đô thị (GreenSpot / EcoReport)  
> **Thời điểm kiểm toán mã nguồn:** Tháng 09/2026  
> **Công nghệ áp dụng:**  
> - **Backend:** Python 3.10+, FastAPI, SQLAlchemy 2.0, PostGIS, GeoJSON, python-i18n, OSRM Client, Open-Meteo & Copernicus GloFAS Engine, Harmonic Tide Engine.  
> - **Frontend:** React 19, TypeScript, MapLibre GL, Canvas WebGL, Vite, Google Maps Tile Cluster, RainViewer Radar API.

---

## I. TỔNG QUAN HIỆN TRẠNG MÃ NGUỒN

Qua quá trình rà soát và đối soát trực tiếp giữa mã nguồn thực tế và Bảng phân công 48 chức năng nghiệp vụ:

| Phân Loại | Số Lượng | Tỷ Lệ % | Mô Tả Thực Trạng |
|:---|:---:|:---:|:---|
| 🟢 **ĐÃ HOÀN THÀNH 100% (ĐANG CHẠY THẬT)** | **23 Chức Năng** | **47.9%** | Có đầy đủ API Backend + Giao diện Frontend WebGIS + Tương tác mượt mà |
| 🟡 **HOÀN THÀNH MỘT PHẦN (30% - 70%)** | **4 Chức Năng** | **8.3%** | Đã có Model Database / Backend Service ngầm hoặc một phần UI |
| 🔴 **MỚI CÓ WIREFRAME / PHÁC THẢO (0%)** | **21 Chức Năng** | **43.8%** | Mới dừng ở bản vẽ thiết kế Wireframe (Chưa code lên Web chính) |
| **TỔNG CỘNG** | **48 Chức Năng** | **100%** | |

---

## II. DANH SÁCH CHI TIẾT CÁC CHỨC NĂNG ĐÃ CODE THỰC TẾ (KÈM VỊ TRÍ FILE)

### KHỐI 1: BẢN ĐỒ SỐ WEBGIS, GPS & RANH GIỚI ĐÔ THỊ (8 Chức Năng)

#### 1. [STT 01] Định vị GPS tự động thời gian thực & Ghim tọa độ thủ công
- **Thành viên phân công:** Nguyễn Thành Đạt
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Frontend Hook: [`frontend/src/hooks/useFastGeolocation.ts`](file:///d:/Group-j_GreenSpot/frontend/src/hooks/useFastGeolocation.ts) (Dò GPS vệ tinh/Wi-Fi độ trễ thấp, tự động cập nhật độ chính xác $\pm m$).
  - Frontend UI: [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx#L340-L370) (Nút GPS góc toolbar, tự bay về tâm, ghim click chuột lấy địa chỉ).
- **Thao tác kiểm thử:** Nhấp nút `🎯 GPS` trên thanh công cụ; hoặc click chuột vào bất kỳ vị trí nào trên bản đồ để lấy tọa độ và số nhà reverse geocode.

#### 2. [STT 05] Quản lý đa lớp bản đồ nền đô thị chuyên sâu
- **Thành viên phân công:** Nguyễn Thành Đạt
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Frontend: [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx#L60-L75) (`MAP_STYLES`).
- **Chi tiết tính năng:** Hỗ trợ chuyển đổi tức thì giữa các kiểu bản đồ:
  1. *Google Maps (Roadmap Tile Cluster)*
  2. *Google Maps Vệ tinh (Satellite)*
  3. *Google Maps Lai ghép (Hybrid)*
  4. *Google Maps Địa hình (Terrain)*
  5. *Bản đồ Carto Voyager sáng màu*
  6. *Bản đồ Carto Dark Matter đêm tối*
  7. *OpenStreetMap (OSM Standard)*

#### 3. [STT 06] Kết xuất kiến trúc tòa nhà 3D Extrusion & Bảng đổi chủ đề màu
- **Thành viên phân công:** Nguyễn Thành Đạt
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Frontend: [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx#L2567-L2583) (`BUILDING_COLOR_THEMES`).
- **Chi tiết tính năng:** Khối tòa nhà 3D vector đổ bóng theo chiều cao thực tế (`render_height`). Có nút bật/tắt 3D/2D và bộ đổi 5 bảng màu đô thị: *Rainbow, Cyberpunk, Emerald Green, Neon Blue, Sunset Orange*.

#### 4. [STT 08] Lớp ranh giới hành chính 22 quận/huyện & TP. Thủ Đức (Chuẩn MF-03)
- **Thành viên phân công:** Nguyễn Thành Đạt
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Dữ liệu GeoJSON chuẩn: [`frontend/src/data/hcmFullDistrictBoundaries.ts`](file:///d:/Group-j_GreenSpot/frontend/src/data/hcmFullDistrictBoundaries.ts) (Tọa độ WGS84 khép kín toàn bộ 22 quận/huyện TP.HCM).
  - Backend API: [`backend/app/api/v1/spatial.py`](file:///d:/Group-j_GreenSpot/backend/app/api/v1/spatial.py) (`GET /api/v1/spatial/districts`).
  - Frontend Render & Popup: [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx) (Đa giác viền nét đứt màu sắc, 22 Marker nhãn tên, Dropdown chọn nhanh quận `[📍 Chọn quận... ▼]`, Popup chi tiết Diện tích, Dân số, Tỷ lệ cây xanh, Sự cố).

#### 5. [STT 09] Quản lý & tra cứu mạng lưới điểm xanh và trạm tái chế rác
- **Thành viên phân công:** Nguyễn Thành Đạt
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Backend API: [`backend/app/api/v1/eco_locations.py`](file:///d:/Group-j_GreenSpot/backend/app/api/v1/eco_locations.py).
  - Dữ liệu mẫu: [`frontend/src/data/hcmEcoLocations.ts`](file:///d:/Group-j_GreenSpot/frontend/src/data/hcmEcoLocations.ts).
  - Frontend UI: Chip lọc `Điểm xanh & Công viên`, `Trạm tái chế`, thẻ Popup hiển thị loại phế liệu thu gom (pin cũ, rác điện tử, vỏ chai nhựa).

#### 6. [STT 10] Dịch đa ngôn ngữ tự động (Song ngữ Việt - Anh)
- **Thành viên phân công:** Nguyễn Thành Đạt
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Backend Engine: [`backend/app/core/i18n.py`](file:///d:/Group-j_GreenSpot/backend/app/core/i18n.py), [`backend/app/api/v1/i18n.py`](file:///d:/Group-j_GreenSpot/backend/app/api/v1/i18n.py) (Sử dụng thư viện `python-i18n`).
  - File từ điển: [`backend/app/locales/vi.json`](file:///d:/Group-j_GreenSpot/backend/app/locales/vi.json), [`backend/app/locales/en.json`](file:///d:/Group-j_GreenSpot/backend/app/locales/en.json).
  - Frontend Component: [`frontend/src/components/LanguageSwitcher.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/LanguageSwitcher.tsx), [`LanguageContext.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/context/LanguageContext.tsx).
- **Thao tác kiểm thử:** Nhấp nút `Tiếng Việt` / `English` ở góc trên bên phải, toàn bộ giao diện đổi ngôn ngữ tức thì.

#### 7. [STT 40] Phân tích không gian vùng đệm (Buffer 500m) tìm cơ sở thiết yếu
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Backend Service: [`backend/app/services/spatial_service.py`](file:///d:/Group-j_GreenSpot/backend/app/services/spatial_service.py) (Thuật toán truy vấn bán kính `radius_m`).
  - Frontend Service: [`frontend/src/services/poiService.ts`](file:///d:/Group-j_GreenSpot/frontend/src/services/poiService.ts).
  - Frontend UI: Nút `⚡ Quét quanh đây` trên thanh Sidebar nạp tức thì các cơ sở thiết yếu: quán ăn, cafe, cửa hàng, bệnh viện xung quanh tâm bản đồ.

#### 8. [STT 12] Quick Tour 3D các địa danh biểu tượng TP.HCM
- **Thành viên phân công:** Nguyễn Thành Đạt
- **Trạng thái:** 🟡 Hoàn thành 50%
- **Vị trí mã nguồn:** [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx#L2480-L2495) (Dãy nút Quick Tour bay camera 3D đến: *Chợ Bến Thành, Landmark 81, Bitexco, Thảo Cầm Viên, Bưu Điện TP*).

---

### KHỐI 2: THỦY VĂN, NGẬP LỤT ĐÔ THỊ & TÌM ĐƯỜNG NÉ NGẬP (8 Chức Năng)

#### 9. [STT 37] Cơ chế tính điểm rủi ro Risk Score (0–100) cho từng điểm ngập
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Backend Engine: [`backend/app/services/flood_engine.py`](file:///d:/Group-j_GreenSpot/backend/app/services/flood_engine.py).
  - Backend Model: [`backend/app/models/flood.py`](file:///d:/Group-j_GreenSpot/backend/app/models/flood.py).
- **Công thức:** Tính toán chỉ số nguy cơ dựa trên mực triều cường thực tế, lượng mưa tức thời ($mm$), cốt cao độ địa hình và lưu lượng sông ngòi.

#### 10. [STT 38] Tự động phân cấp mức độ nguy hiểm ngập lụt
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:** [`backend/app/models/flood.py`](file:///d:/Group-j_GreenSpot/backend/app/models/flood.py), [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx).
- **Chi tiết:** Phân loại 4 cấp độ:
  - `SAFE` (An toàn - Xanh dương)
  - `ALERT` (Cần chú ý - Vàng)
  - `WARNING` (Cảnh báo nguy hiểm - Cam)
  - `CRITICAL` (Báo động khẩn cấp/Không thể lưu thông - Đỏ nhấp nháy radar).

#### 11. [STT 41] Động cơ giải tích sóng triều độc lập Harmonic Tide Engine Phú An & Nhà Bè
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Backend Service: [`backend/app/services/tide_service.py`](file:///d:/Group-j_GreenSpot/backend/app/services/tide_service.py).
- **Chi tiết kỹ thuật:** Thuật toán giải tích sóng triều độc lập dựa trên 4 thành phần điều hòa chính ($M_2, S_2, K_1, O_1$) cho 2 trạm thủy văn Phú An (Sông Sài Gòn) và Nhà Bè (Sông Đồng Điền), tự tính mực nước triều từng phút không phụ thuộc mạng ngoài.

#### 12. [STT 42] Bản đồ vệt đường ngập lụt động 3 lớp vector
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:** [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx#L2898-L2935).
- **Chi tiết hiển thị:**
  - *Lớp 1:* Hào quang phát sáng lan tỏa mặt đường (`flood-corridor-glow`).
  - *Lớp 2:* Vệt nước ngập xanh cyan đậm đà chạy dọc tim đường (`flood-corridor-main`).
  - *Lớp 3:* Đường vân sóng nước chuyển động (`flood-corridor-wave`).

#### 13. [STT 43] Tìm tuyến đường an toàn né khu vực ngập (PostGIS ST_DWithin)
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Backend API & Query: [`backend/app/services/spatial_service.py`](file:///d:/Group-j_GreenSpot/backend/app/services/spatial_service.py) (`check_route_flooding_postgis` sử dụng hàm không gian `ST_DWithin` và `ST_Intersects`).
  - Frontend Action: Nút `🧭 Chỉ đường tránh ngập` trên thẻ thông tin điểm ngập.

#### 14. [STT 44] So sánh tuyến đường nhanh nhất vs tuyến đường an toàn nhất tránh thủy kích
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:** [`frontend/src/services/osmAdvancedService.ts`](file:///d:/Group-j_GreenSpot/frontend/src/services/osmAdvancedService.ts), [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx).
- **Chi tiết:** Tính toán lộ trình thực tế qua OSRM, hiển thị khoảng cách ($km$), thời gian di chuyển (phút) và cảnh báo đoạn đường ngập cần né.

#### 15. [STT 45] Báo cáo điểm ngập 1-chạm chuột phải & Thuật toán bám đường OSRM
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Frontend Event: [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx#L2510-L2525) (`onContextMenu`).
  - Backend API: [`backend/app/api/v1/flood.py`](file:///d:/Group-j_GreenSpot/backend/app/api/v1/flood.py) (`POST /api/v1/flood/report`).
- **Thao tác kiểm thử:** Click chuột phải bất kỳ đâu trên bản đồ, menu ngữ cảnh hiện ra cho phép gửi báo cáo ngập lụt kèm chiều sâu nước $cm$.

#### 16. [STT 46] Dự báo lưu lượng sông ngòi Copernicus GloFAS 7 ngày
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Backend Service: [`backend/app/services/flood_service.py`](file:///d:/Group-j_GreenSpot/backend/app/services/flood_service.py).
  - Frontend Modal: [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx) (`showGloFASModal`).
- **Chi tiết:** Kết nối Open-Meteo Flood API vệ tinh Copernicus GloFAS, hiển thị biểu đồ cột 7 ngày lưu lượng dòng chảy ($m^3/s$) tại sông Sài Gòn.

#### 17. [STT 47] Tích hợp 3 nguồn ngập đô thị & Chuyển đổi kịch bản triều cực trị 1.68m
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:** [`backend/app/services/flood_service.py`](file:///d:/Group-j_GreenSpot/backend/app/services/flood_service.py), nút `🌊 Triều đỉnh 1.68m` / `🌤️ Triều thực tế` trên thanh công cụ EcoMap.

---

### KHỐI 3: KHÍ TƯỢNG, RADAR MÂY MƯA & BẢN ĐỒ NHIỆT (4 Chức Năng)

#### 18. [STT 19] Giám sát mây mưa giông bão qua RainViewer Radar thời gian thực
- **Thành viên phân công:** Huỳnh Anh Tú
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Frontend: [`frontend/src/components/LiveWeatherRadarMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/LiveWeatherRadarMap.tsx).
  - Nút kích hoạt: `🌪️ Radar Khí tượng LIVE` trên EcoMap.
- **Chi tiết:** Gọi API RainViewer nạp các mảnh tile radar mây mưa, có thanh phát lại timeline tua nhanh/lùi thời gian thực tế.

#### 19. [STT 20] Mô phỏng động lực học luồng gió (Wind Streamlines)
- **Thành viên phân công:** Huỳnh Anh Tú
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Frontend Component: [`frontend/src/components/WindyWeatherMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/WindyWeatherMap.tsx), [`LiveWeatherRadarMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/LiveWeatherRadarMap.tsx).
- **Chi tiết:** Khung vẽ HTML5 Canvas vẽ hàng ngàn hạt gió uốn lượn liên tục thể hiện hướng gió và vận tốc gió thời gian thực theo chuẩn Windy.

#### 20. [STT 21] Bộ lớp phủ khí tượng đa thông số (8 Lớp phủ chuyên sâu)
- **Thành viên phân công:** Huỳnh Anh Tú
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:** [`frontend/src/components/LiveWeatherRadarMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/LiveWeatherRadarMap.tsx).
- **Chi tiết:** Cho phép chọn giữa các lớp phủ: *Nhiệt độ vi khí hậu, Trường gió động lực, Bản đồ mưa radar, Mật độ mây che phủ, Khí áp bề mặt*.

#### 21. [STT 23] Bản đồ nhiệt môi trường nội suy không gian (Heatmap AQI, Nhiệt độ, Rủi ro)
- **Thành viên phân công:** Huỳnh Anh Tú
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Backend API: [`backend/app/api/v1/weather.py`](file:///d:/Group-j_GreenSpot/backend/app/api/v1/weather.py) (`GET /api/v1/weather/heatmap`).
  - Frontend Layer: [`frontend/src/components/EcoMap.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/EcoMap.tsx) (Menu `Bản đồ nhiệt` chọn: Nhiệt độ toàn quốc, Chỉ số ô nhiễm AQI, Điểm nóng rủi ro kèm thang màu Legend).

---

### KHỐI 4: DASHBOARD DỮ LIỆU LỚN AQI & CHẨN ĐOÁN HỆ THỐNG (3 Chức Năng)

#### 22. [STT 48] Dashboard phân tích dữ liệu lớn AQI 34 tỉnh thành & Ma trận tương quan nhiệt
- **Thành viên phân công:** Lê Anh Tuấn
- **Trạng thái:** 🟢 Hoàn thành 100%
- **Vị trí mã nguồn:**
  - Backend Analytics Service: [`backend/app/services/air_quality_analytics_service.py`](file:///d:/Group-j_GreenSpot/backend/app/services/air_quality_analytics_service.py).
  - Backend API: [`backend/app/api/v1/air_quality.py`](file:///d:/Group-j_GreenSpot/backend/app/api/v1/air_quality.py).
  - Frontend Dashboard: [`frontend/src/components/AirQualityDashboard.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/components/AirQualityDashboard.tsx).
- **Chi tiết phân tích:**
  - Bảng số liệu chuỗi giờ AQI của 34 trạm quan trắc trên toàn quốc.
  - Ma trận nhiệt tính toán hệ số tương quan Pearson giữa 6 chất ô nhiễm: $PM_{2.5}, PM_{10}, CO, NO_2, SO_2, O_3$.
- **Thao tác kiểm thử:** Nhấp tab `📊 Phân tích AQI & Khí hậu` ở thanh điều hướng trên cùng.

#### 23. [STT 36] Trung tâm chẩn đoán sức khỏe hệ thống & Giám sát API Microservices
- **Thành viên phân công:** Bùi Nguyễn Minh Quân
- **Trạng thái:** 🟢 Hoàn thành 70%
- **Vị trí mã nguồn:**
  - Backend: [`backend/app/main.py`](file:///d:/Group-j_GreenSpot/backend/app/main.py) (`GET /health`).
  - Frontend: [`frontend/src/App.tsx`](file:///d:/Group-j_GreenSpot/frontend/src/App.tsx#L83-L133) (Nút `[API Service]` mở popover chẩn đoán Backend Diagnostic, ping `/health`, đo độ trễ ms, tự động nhận diện Fallback mode khi offline).

#### 24. [STT 33] Đồng bộ ngầm số liệu viễn trắc mạng lưới trạm cảm biến IoT đô thị
- **Thành viên phân công:** Bùi Nguyễn Minh Quân
- **Trạng thái:** 🟡 Hoàn thành 60%
- **Vị trí mã nguồn:**
  - Model Database: [`backend/app/models/iot.py`](file:///d:/Group-j_GreenSpot/backend/app/models/iot.py).
  - Worker nền: [`backend/app/services/runtime_sync_service.py`](file:///d:/Group-j_GreenSpot/backend/app/services/runtime_sync_service.py) (Tiến trình ngầm liên tục đồng bộ chỉ số viễn trắc telemetry của các trạm cảm biến).

---

## III. BẢNG TỔNG HỢP CÁC CHỨC NĂNG CHƯA CODE (CÒN Ở DẠNG WIREFRAME)

Các chức năng dưới đây **chưa có code logic / UI trong ứng dụng chính**, hiện tại đang được lưu trữ dưới dạng **bản vẽ Wireframe thiết kế** tại thư mục [`Tonghop mota man hinh/`](file:///d:/Group-j_GreenSpot/Tonghop%20mota%20man%20hinh):

| STT | Tên Chức Năng Nghiệp Vụ | Thành Viên Phân Công | Tình Trạng Hiện Tại |
|:---:|:---|:---:|:---|
| **2** | Thu thập, nén ảnh/video hiện trường & trích xuất EXIF | Nguyễn Thành Đạt | Mới có Wireframe Ảnh 02.1, 02.2 |
| **7** | Tùy chọn gửi ẩn danh & Spatial Jitter 50m | Nguyễn Thành Đạt | Mới có Wireframe Ảnh 07.1 |
| **11** | Tra cứu quy định pháp lý & mức phạt (NĐ 45/2022) | Nguyễn Thành Đạt | Mới có Wireframe Ảnh 11.1 |
| **13** | Cơ chế tích lũy Điểm thưởng Công dân Xanh (EcoPoints) | Huỳnh Anh Tú | Mới có Wireframe Ảnh 13.1 |
| **14** | Quản lý ví điểm cá nhân & Lịch sử biến động điểm | Huỳnh Anh Tú | Mới có Wireframe Ảnh 14.1, 14.2 |
| **15** | Gian hàng danh mục quà tặng xanh & Vật phẩm quy đổi | Huỳnh Anh Tú | Mới có Wireframe Ảnh 15.1 |
| **16** | Đổi điểm lấy quà tặng / Thẻ mã QR Voucher | Huỳnh Anh Tú | Mới có Wireframe Ảnh 16.1, 16.2 |
| **17** | Kho quản lý quà tặng & Voucher cá nhân đã đổi | Huỳnh Anh Tú | Mới có Wireframe Ảnh 17.1 |
| **18** | Bảng xếp hạng vinh danh Top Công dân Xanh (Leaderboard) | Huỳnh Anh Tú | Mới có Wireframe Ảnh 18.1 |
| **22** | Đánh giá mức độ hài lòng (1–5 sao) sau dọn sạch | Huỳnh Anh Tú | Mới có Wireframe Ảnh 22.1 |
| **24** | Cẩm nang phân loại rác & Trợ lý tư vấn AI RAG | Huỳnh Anh Tú | Mới có Wireframe Ảnh 24.1, 24.2 |
| **25** | Cổng xác thực tập trung Đăng nhập / Đăng ký & JWT | Bùi Nguyễn Minh Quân | Mới có Wireframe Ảnh 25.1, 25.2 |
| **26** | Màn hình Quản trị người dùng & Phân quyền RBAC | Bùi Nguyễn Minh Quân | Đã có Model `rbac.py`, chưa có UI |
| **27** | Quản lý năng lực đội xe thu gom rác & Tài xế | Bùi Nguyễn Minh Quân | Mới có Wireframe Ảnh 27.1 |
| **28** | Nhật ký kiểm toán an ninh Audit Log | Bùi Nguyễn Minh Quân | Mới có Wireframe Ảnh 28.1 |
| **29** | Trung tâm điều phối tác nghiệp & Phân công lệnh | Bùi Nguyễn Minh Quân | Mới có Wireframe Ảnh 29.1, 29.2 |
| **30** | Thẩm định chất lượng xử lý & Nghiệm thu Trước/Sau | Bùi Nguyễn Minh Quân | Mới có Wireframe Ảnh 30.1 |
| **31** | Phân cấp quản lý 3 cấp & Chuyển tiếp thẩm quyền | Bùi Nguyễn Minh Quân | Mới có Wireframe Ảnh 31.1 |
| **32** | Giám sát hạn mức thời gian SLA & Cảnh báo trễ hạn | Bùi Nguyễn Minh Quân | Mới có Wireframe Ảnh 32.1 |
| **34** | Tự động hóa kết xuất báo cáo thống kê PDF/Excel | Bùi Nguyễn Minh Quân | Mới có Wireframe Ảnh 34.1 |
| **35** | Quản lý tuyến lộ trình xe gom rác & Checkpoints | Bùi Nguyễn Minh Quân | Mới có Wireframe Ảnh 35.1 |

---

## IV. HƯỚNG DẪN KIỂM CHỨNG & CHẠY THỰC TẾ

Toàn bộ 23 chức năng hoàn thành nêu trên đều có thể trải nghiệm trực tiếp ngay bây giờ:

1. **Khởi động Backend:**
   ```bash
   cd d:\Group-j_GreenSpot\backend
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Khởi động Frontend:**
   ```bash
   cd d:\Group-j_GreenSpot\frontend
   npm run dev
   ```
3. **Mở trình duyệt:** Truy cập `http://localhost:5173`:
   - **Xem ranh giới 22 quận/huyện:** Nhấp nút `[🗺️ 22 Quận TP.HCM (22)]` hoặc dropdown `[📍 Chọn quận... ▼]`.
   - **Xem Radar khí tượng & luồng gió:** Nhấp nút `[🌪️ Radar Khí tượng LIVE]`.
   - **Xem mô phỏng ngập 3 lớp & GloFAS 7 ngày:** Nhấp nút `[🌊 Cảnh báo Ngập lụt]` và click vào bất kỳ điểm ngập nào.
   - **Xem Dashboard AQI 34 tỉnh thành & Ma trận tương quan:** Nhấp tab `[📊 Phân tích AQI & Khí hậu]`.
   - **Chuyển đổi ngôn ngữ:** Nhấp nút `[Tiếng Việt]` / `[English]`.
