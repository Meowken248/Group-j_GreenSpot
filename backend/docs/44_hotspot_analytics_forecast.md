# STT 44: PHÂN TÍCH ĐIỂM NÓNG + DỰ BÁO 7 NGÀY
## Spatial Hotspot Analytics & 7-Day Forecasting System

### 1. Giới thiệu & Mục tiêu
- **Mục đích:** Trung tâm phân tích không gian địa lý môi trường (Spatial Hotspot Analytics Dashboard) dành cho Cán bộ quản lý môi trường và Chuyên viên phân tích dữ liệu đô thị.
- **Thuật toán & Mô hình:**
  - Thuật toán Mật độ Hạt nhân (Kernel Density Estimation - KDE) để nhận diện các cụm điểm nóng ô nhiễm/ngập úng tập trung mật độ cao.
  - Mô hình học máy chuỗi thời gian (Time-series ML) kết hợp lịch sử sự cố và dữ liệu khí tượng thủy văn (mưa lớn, triều cường) dự báo 7 ngày tiếp theo kèm khoảng tin cậy 95%.
- **Liên kết nghiệp vụ:** Kết nối trực tiếp sang STT 43 (Trung tâm điều phối tác nghiệp) để lập lệnh điều động xử lý hiện trường từ điểm nóng.

### 2. Cấu trúc Clean Architecture 5 tầng
- **Entity Model:** `app/models/hotspots/hotspot_model.py` (`HotspotCluster`, `HotspotDailyForecast`)
- **DTO Schemas:** `app/schemas/hotspots/schemas.py` (`HotspotMapResponse`, `ForecastResponse`, `HotspotDetailResponse`, `ExportReportResponse`)
- **Interface Layer:** `app/interface/hotspots/hotspot_interface.py` (`IHotspotRepository`)
- **Persistence Layer:** `app/crud/hotspots/hotspot_repository.py` (`HotspotRepository` với 100% Explicit SQL & OCC Concurrency)
- **Business Logic Layer:** `app/services/hotspots/hotspot_service.py` (`HotspotService` tuân thủ DIP)
- **Presentation Router Layer:** `app/api/v1/hotspots/router.py` (FastAPI router có RBAC guard)

### 3. Danh sách Endpoints RESTful
1. `GET /api/v1/hotspots/map`: Lấy dữ liệu bản đồ điểm nóng KDE & Top 5 điểm nóng đô thị.
2. `GET /api/v1/hotspots/areas`: Danh sách Quận/Huyện và Điểm nóng cho combobox.
3. `GET /api/v1/hotspots/forecast`: Dự báo chuỗi thời gian 7 ngày kèm khoảng tin cậy 95% và phân tích ngày nguy cơ cao nhất.
4. `POST /api/v1/hotspots/forecast/export`: Kích hoạt xuất báo cáo dự báo 7 ngày định dạng PDF/Excel.
5. `GET /api/v1/hotspots/{hotspot_id}`: Xem chi tiết điểm nóng, kiểm tra lệnh đang thực thi và dữ liệu điền sẵn STT 43.
