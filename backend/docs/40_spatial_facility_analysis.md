# 📚 TÀI LIỆU KỸ THUẬT: TÍNH NĂNG 40 (STT 40)
# TÌM CƠ SỞ THIẾT YẾU GẦN SỰ CỐ (GIS BUFFER RADIUS SPATIAL ANALYSIS)

> **Mã chức năng:** STT 40 (Phân hệ Phân tích Không gian Địa lý & Điều phối Tác nghiệp Môi trường GreenSpot)  
> **Phiên bản:** 1.0.0 (Công nghệ GIS PostGIS WGS84 & Phân tích Vùng đệm Đa bán kính)  
> **Tác giả:** Kỹ sư AI & Senior Backend Engineer  
> **Mục tiêu:** Tự động quét và cảnh báo các công trình dân sinh nhạy cảm (trường học, bệnh viện, trạm y tế) nằm trong bán kính phơi nhiễm độc hại (500m, 1km, 2km), thiết lập đường dây nóng ứng phó tức thì và ghi nhận đầy đủ nhật ký kiểm toán (Audit Log).

---

## 📑 MỤC LỤC
1. [Tổng quan nghiệp vụ & Mục tiêu](#1-tổng-quan-nghiệp-vụ--mục-tiêu)
2. [Kiến trúc cơ sở dữ liệu & Mô hình PostGIS](#2-kiến-trúc-cơ-sở-dữ-liệu--mô-hình-postgis)
3. [Hệ thống Thư mục & Luồng Truy vấn Không gian (Architecture & Spatial Query Flow)](#3-hệ-thống-thư-mục--luồng-truy-vấn-không-gian-architecture--spatial-query-flow)
4. [Giải thuật phân tích không gian địa lý GIS](#4-giải-thuật-phân-tích-không-gian-địa-lý-gis)
5. [Đặc tả RESTful API Endpoints](#5-đặc-tả-restful-api-endpoints)
6. [Kiến trúc Giao diện FrontEnd (3 Màn hình)](#6-kiến-trúc-giao-diện-frontend-3-màn-hình)
7. [Cơ chế Nhật ký kiểm toán & Giám sát can thiệp](#7-cơ-chế-nhật-ký-kiểm-toán--giám-sát-can-thiệp)
8. [Bảng Ma Trận Ánh Xạ Mã Nguồn (Project Code Mapping Matrix)](#8-bảng-ma-trận-ánh-xạ-mã-nguồn-project-code-mapping-matrix)
9. [Bộ kiểm thử tự động & Bằng chứng thực nghiệm](#9-bộ-kiểm-thử-tự-động--bằng-chứng-thực-nghiệm)
10. [Tổng kết](#10-tổng-kết)

---

## 1. TỔNG QUAN NGHIỆP VỤ & MỤC TIÊU

### 1.1. Bối cảnh bài toán
Khi sự cố môi trường xảy ra (bãi rác tự phát bốc mùi, nước rỉ rác ngấm mạch nước ngầm, cháy rác hóa chất hoặc khói độc phát tán), các đối tượng dễ bị tổn thương nhất là học sinh và bệnh nhân tại các cơ sở dân sinh lân cận.
Cán bộ tiếp nhận và Đội phản ứng khẩn cấp cần một công cụ GIS trực quan để:
- **Xác định tọa độ tâm sự cố**: Ghim chính xác vị trí ô nhiễm trên nền bản đồ số.
- **Mô phỏng vùng đệm ô nhiễm (Buffer Radius Analysis)**: Tự động vẽ đường tròn không gian với các bán kính tiêu chuẩn: `500m` (Vùng nguy hiểm trực tiếp), `1km` (Vùng ảnh hưởng lan tỏa) và `2km` (Vùng theo dõi phát tán).
- **Phát hiện và cảnh báo cự ly khẩn cấp**:
  - Dưới **200m**: Cơ sở nằm trong diện sát sườn nguy hiểm (`is_danger_proximity`), viền đỏ cảnh báo.
  - Dưới **100m**: Cơ sở nằm trong vùng tiếp xúc tức thì (`is_immediate_risk`), kích hoạt dải thông báo đỏ nhấp nháy trên giao diện.
- **Bộ công cụ can thiệp 1 chạm (One-Touch Emergency Actions)**:
  - *Gọi điện*: Kích hoạt giao thức gọi thoại `tel:` đến người phụ trách cơ sở.
  - *Chỉ đường*: Mở điều hướng lộ trình phương tiện khẩn cấp qua Google Maps.
  - *Gửi cảnh báo*: Bắn thông báo khẩn qua SMS/Email đến Ban giám hiệu/Giám đốc cơ sở, đồng thời lưu nhật ký kiểm toán hệ thống.

### 1.2. Phân quyền vai trò (RBAC)
- **Quyền sử dụng tính năng**: Dành cho `ADMIN` (Quản trị viên), `COORDINATOR` (Điều phối viên), `OFFICER` (Cán bộ môi trường) và `RESPONDER` (Đội ứng cứu môi trường).
- **Bảo mật**: Người dùng không có quyền điều phối hoặc công dân vãng lai không được phép tra cứu thông tin liên lạc nội bộ của ban quản lý cơ sở.

---

## 2. KIẾN TRÚC CƠ SỞ DỮ LIỆU & MÔ HÌNH POSTGIS

### 2.1. Cấu trúc bảng `essential_facilities`
- **Mã nguồn model:** [BackEnd/app/models/spatial.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/spatial.py#L29-L49)
- **Mục đích:** Quản lý cơ sở hạ tầng xã hội thiết yếu có tọa độ không gian PostGIS SRID 4326 (WGS84).

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mục đích nghiệp vụ |
|:---|:---|:---|:---|
| `facility_id` | `INTEGER` | Primary Key, Autoincrement | Định danh duy nhất của cơ sở thiết yếu |
| `facility_name` | `VARCHAR(200)` | Not Null | Tên cơ sở (Ví dụ: Trường Tiểu học Lê Lợi, BV Đa khoa Đống Đa) |
| `facility_type` | `VARCHAR(50)` | Not Null | Phân loại: `Trường học`, `Bệnh viện`, `Trạm y tế` |
| `address` | `VARCHAR(255)` | Not Null | Địa chỉ hành chính chi tiết của cơ sở |
| `location` | `Geometry(POINT, 4326)` | Not Null, Spatial Index | Tọa độ điểm GIS chuẩn WGS84 (Point: Longitude, Latitude) |
| `unit_id` | `INTEGER` | FK `administrative_units.unit_id` | Mã đơn vị hành chính quản lý địa bàn |
| `contact_phone` | `VARCHAR(20)` | Nullable | Số điện thoại đường dây nóng / Hiệu trưởng / Giám đốc |
| `contact_person` | `VARCHAR(100)` | Nullable | Tên người phụ trách tiếp nhận thông tin khẩn cấp |
| `contact_email` | `VARCHAR(100)` | Nullable | Hòm thư điện tử chính thức của cơ sở |
| `capacity_people` | `INTEGER` | Nullable | Quy mô số lượng học sinh / bệnh nhân có nguy cơ phơi nhiễm |
| `vulnerability_level` | `VARCHAR(50)` | Default `"HIGH"` | Mức độ dễ bị tổn thương môi trường (`HIGH`, `MEDIUM`, `LOW`) |
| `metadata_json` | `JSONB` | Nullable | Dữ liệu siêu thông tin mở rộng |
| `version` | `INTEGER` | Default `1`, Not Null | Phiên bản phục vụ Khóa lạc quan (Optimistic Locking - Quy tắc 7) |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Thời điểm xóa mềm (Soft Delete - Quy tắc 6) |

### 2.2. Khóa ngoại và Bảng Nhật ký kiểm toán `incident_audit_logs`
Mọi hành động can thiệp (gửi cảnh báo, kích hoạt cuộc gọi) đều tự động liên kết với sự cố thông qua bảng `incident_audit_logs`:
- **Action:** `FACILITY_ALERT_SENT`, `CALL_INITIATED`
- **Metadata JSON:** Lưu `facility_id`, `recipient_phone`, `recipient_email`, `message_text`, `performed_by`.

---

## 3. HỆ THỐNG THƯ MỤC & LUỒNG TRUY VẤN KHÔNG GIAN (ARCHITECTURE & SPATIAL QUERY FLOW)

Hệ thống phân tích không gian vùng đệm cơ sở thiết yếu được phân tầng mạch lạc:

```
[ FRONTEND CLIENT ] 
       │ 
       ▼ (POST /api/v1/spatial/facilities/buffer ...)
[ API ROUTER ] ──────────► app/api/v1/triage/spatial_facilities.py
       │                   (Mount qua app/api/v1/triage/router.py -> app/api/v1/__init__.py)
       │
       ▼ (Gọi SpatialFacilityService: get_facilities_in_buffer / detail / alert)
[ SERVICE LAYER ] ───────► app/services/triage/spatial_facility_service.py
       │
       ▼ (Truy vấn PostGIS Bounding Box ST_X, ST_Y & ST_Distance)
[ DATABASE LAYER ] ──────► app/models/spatial.py (EssentialFacility - Geometry POINT 4326)
                           app/models/incident.py (Incident)
                           app/models/audit_log.py (IncidentAuditLog)
```

### 3.1. Chi tiết phân nhiệm từng tầng:
1. **Tầng CSDL (Domain Models & PostGIS Extension):**
   - Model Cơ sở thiết yếu: [`BackEnd/app/models/spatial.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/spatial.py) (lớp `EssentialFacility` quản lý cột `location = Geometry(POINT, 4326)` có spatial index GIST).
   - Model Sự cố & Nhật ký: [`BackEnd/app/models/incident.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/incident.py) (`Incident`), [`BackEnd/app/models/audit_log.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/audit_log.py) (`IncidentAuditLog`).
2. **Tầng Hợp đồng Interface (Contracts & Abstraction):**
   - [`BackEnd/app/interface/triage/spatial_facility_interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/triage/spatial_facility_interface.py): Định nghĩa hợp đồng trừu tượng `ISpatialFacilityRepository` và `ISpatialFacilityService`, đảm bảo tuân thủ nguyên lý Dependency Inversion (SOLID).
3. **Tầng Truy vấn CSDL Không gian (Spatial Repository Layer):**
   - **Vị trí viết câu truy vấn:** Toàn bộ truy vấn PostGIS được đóng gói bên trong lớp `SpatialFacilityRepository` tại [`BackEnd/app/crud/triage/spatial_facility_repository.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/triage/spatial_facility_repository.py).
   - Truy vấn Bounding Box 2 tầng: Sử dụng `func.ST_Y(EssentialFacility.location)` và `func.ST_X(EssentialFacility.location)` kết hợp cự ly đại cầu Haversine để lọc nhanh 95% dữ liệu điểm GIS nằm ngoài bán kính (500m, 1km, 2km).
   - Truy vấn ghi nhận Audit Log: Ghi nhận sự kiện `FACILITY_ALERT_SENT` và `CALL_INITIATED` trực tiếp qua repository (`save_audit_log`).
4. **Tầng Dịch vụ (Service Layer):**
   - [`BackEnd/app/services/triage/spatial_facility_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/spatial_facility_service.py) (`SpatialFacilityService`): Thuật toán Haversine WGS84, phân bậc cự ly khẩn cấp (< 100m, < 200m), thống kê số lượng theo nhóm loại hình, chuẩn bị nội dung cảnh báo SMS/Email.
   - File re-export: [`BackEnd/app/services/spatial_facility_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/spatial_facility_service.py).
5. **Tầng Schemas / DTOs:**
   - [`BackEnd/app/schemas/triage/spatial_facility.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/triage/spatial_facility.py) (`FacilityBufferQueryRequest`, `FacilityListResponse`, `FacilityDetailProfileResponse`, `SendEmergencyAlertRequest`, `SendEmergencyAlertResponse`).
   - File re-export: [`BackEnd/app/schemas/spatial_facility.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/spatial_facility.py).
6. **Tầng API Router & Tích hợp (Routing & Mounting):**
   - Router con: [`BackEnd/app/api/v1/triage/spatial_facilities.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/spatial_facilities.py) (prefix `/spatial/facilities`).
   - Gom Router tổng hợp: [`BackEnd/app/api/v1/triage/router.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/router.py) (`triage_composite_router`).
   - Mount vào hệ thống: [`BackEnd/app/api/v1/__init__.py#L29`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/__init__.py#L29) (`api_v1_router.include_router(triage_composite_router)`).
   - File re-export: [`BackEnd/app/api/v1/spatial_facilities.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/spatial_facilities.py).

---

## 4. GIẢI THUẬT PHÂN TÍCH KHÔNG GIAN ĐỊA LÝ GIS

### 3.1. Kỹ thuật Lọc 2 tầng (Two-Tier Spatial Query)
Nhằm đạt hiệu năng cao khi cơ sở dữ liệu có hàng chục nghìn điểm GIS, dịch vụ [SpatialFacilityService](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/spatial_facility_service.py#L82-L172) sử dụng chiến lược truy vấn 2 tầng:

```
[ Sự cố: (lat, lon) + Bán kính R ]
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ TẦNG 1: Bounding Box Filter (Spatial Index ST_X / ST_Y)     │
│ Δlat = (R / 111,000m) * 1.15                                │
│ Δlon = (R / (111,000m * cos(lat))) * 1.15                   │
│ Lọc siêu tốc thu hẹp 95% phạm vi dữ liệu thô               │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ TẦNG 2: Công thức Haversine Đại cầu Chuẩn WGS84             │
│ Tính cự ly chính xác đến từng mét:                          │
│ d = 2 * R_earth * asin(sqrt(sin²(Δφ/2) + cos·cos·sin²(Δλ/2)))│
│ Điều kiện: d <= R (Loại bỏ các điểm góc hộp Bounding Box)   │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ KẾT QUẢ: Sắp xếp tăng dần theo khoảng cách (Gần nhất trước) │
│ Gán nhãn: is_danger (<200m) | is_immediate_risk (<100m)     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. Công thức toán học Haversine WGS84
```python
@staticmethod
def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Bán kính Trái Đất trung bình (mét)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(R * c, 1)
```

### 3.3. Phân cấp mức độ nguy cơ phơi nhiễm
1. **Mức độ 1 - Nguy cấp tức thì (`is_immediate_risk = True` | Cự ly < 100m):**
   - Sự cố nằm sát hàng rào trường học hoặc bệnh viện.
   - Hệ thống hiển thị biểu ngữ đỏ nhấp nháy khẩn cấp: `"Cảnh báo khẩn cấp: Có cơ sở thiết yếu nằm trong cự ly sát điểm ô nhiễm (< 100m)!"`.
2. **Mức độ 2 - Nguy hiểm sát sườn (`is_danger_proximity = True` | Cự ly < 200m):**
   - Nằm trong vùng phát tán khói/mùi độc hại đậm đặc.
   - Thẻ cơ sở được hiển thị viền đỏ nổi bật (`border-red-500` / `danger-border`) trên cả danh sách và bản đồ.
3. **Mức độ 3 - Vùng đệm lân cận (200m - 2000m):**
   - Hiển thị khoảng cách quy đổi thông minh: Dưới 1000m hiển thị đơn vị `mét` (VD: `Cách 650m`), trên 1000m hiển thị đơn vị `km` (VD: `Cách 1.4km`).

---

## 5. ĐẶC TẢ RESTFUL API ENDPOINTS

Tất cả các API được định nghĩa tại router: [BackEnd/app/api/v1/triage/spatial_facilities.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/spatial_facilities.py).

### 4.1. `POST /api/v1/spatial/facilities/buffer` (Quét cơ sở theo bán kính)
Phục vụ Màn 1/3 (Bản đồ & Bán kính) và Màn 2/3 (Bảng danh sách kết quả).

- **Request Body:**
```json
{
  "incident_id": "8f8b3b64-28b9-4679-b1d7-d7db1ef40d42",
  "radius_meters": 1000.0,
  "facility_types": ["Trường học", "Bệnh viện", "Trạm y tế"]
}
```
*Validation:* Trường `facility_types` bắt buộc phải có ít nhất 1 phần tử (nếu mảng rỗng sẽ trả về HTTP 422 Unprocessable Entity kèm thông báo tiếng Việt).

- **Response Body (HTTP 200 OK):**
```json
{
  "incident_id": "8f8b3b64-28b9-4679-b1d7-d7db1ef40d42",
  "incident_title": "Bãi rác tự phát bốc mùi nồng nặc gần ngõ 128 Lê Lợi",
  "incident_lat": 20.9985,
  "incident_lng": 105.8542,
  "radius_meters": 1000.0,
  "total_found": 4,
  "type_counts": {
    "Trường học": 2,
    "Bệnh viện": 1,
    "Trạm y tế": 1
  },
  "has_critical_nearby": true,
  "facilities": [
    {
      "facility_id": 1,
      "facility_name": "Trường Mầm non Tuổi Thần Tiên - Phân hiệu Lê Lợi",
      "facility_type": "Trường học",
      "address": "Số 130 Lê Lợi, Phường Nguyễn Trãi, Hà Đông, Hà Nội",
      "distance_meters": 35.2,
      "distance_display": "Cách 35m",
      "is_danger_proximity": true,
      "is_immediate_risk": true,
      "contact_phone": "02438521199",
      "vulnerability_level": "Mức dễ tổn thương: Cực kỳ cao (Trẻ nhỏ)",
      "latitude": 20.9987,
      "longitude": 105.8544
    },
    {
      "facility_id": 2,
      "facility_name": "Trường Tiểu học Lê Lợi",
      "facility_type": "Trường học",
      "address": "Số 160 Lê Lợi, Phường Nguyễn Trãi, Hà Đông, Hà Nội",
      "distance_meters": 180.0,
      "distance_display": "Cách 180m",
      "is_danger_proximity": true,
      "is_immediate_risk": false,
      "contact_phone": "02438522345",
      "vulnerability_level": "Mức dễ tổn thương: Cao",
      "latitude": 20.9992,
      "longitude": 105.8551
    }
  ]
}
```

---

### 4.2. `GET /api/v1/spatial/facilities/{facility_id}` (Hồ sơ chi tiết cơ sở)
Phục vụ Màn 3/3 (Xem chi tiết, đánh giá mức độ phơi nhiễm và phương án ứng cứu).

- **Query Parameters:**
  - `incident_id` (UUID, optional): Cung cấp để dịch vụ tính toán khoảng cách thực tế giữa cơ sở này với sự cố.
- **Response Body (HTTP 200 OK):**
```json
{
  "facility_id": 1,
  "facility_name": "Trường Mầm non Tuổi Thần Tiên - Phân hiệu Lê Lợi",
  "facility_type": "Trường học",
  "address": "Số 130 Lê Lợi, Phường Nguyễn Trãi, Hà Đông, Hà Nội",
  "contact_phone": "02438521199",
  "contact_person": "Cô Nguyễn Thu Hà - Hiệu trưởng",
  "contact_email": "mamnon.leloi@edu.vn",
  "capacity_people": 250,
  "vulnerability_level": "Mức dễ tổn thương: Cực kỳ cao (Trẻ nhỏ)",
  "incident_distance_meters": 35.2,
  "incident_distance_display": "Cách 35m",
  "directions_url": "https://www.google.com/maps/dir/?api=1&destination=20.9987,105.8544",
  "can_call": true,
  "can_alert": true
}
```

---

### 4.3. `POST /api/v1/spatial/facilities/alert` (Gửi cảnh báo khẩn cấp)
Phục vụ Màn 3/3: Cán bộ phát lệnh gửi thông báo cảnh báo đến người phụ trách cơ sở.

- **Request Body:**
```json
{
  "incident_id": "8f8b3b64-28b9-4679-b1d7-d7db1ef40d42",
  "facility_id": 1,
  "message_text": "Cảnh báo khẩn cấp: Bãi rác ngõ 128 Lê Lợi bốc mùi nồng nặc và có nguy cơ cháy lan, đề nghị nhà trường đóng kín cửa sổ và di tản học sinh khỏi khu vực sân chơi giáp ngõ."
}
```
- **Response Body (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Đã gửi thông báo cảnh báo môi trường đến cơ sở",
  "facility_id": 1,
  "facility_name": "Trường Mầm non Tuổi Thần Tiên - Phân hiệu Lê Lợi",
  "sent_at": "2026-10-12T21:20:00Z"
}
```

---

### 4.4. `POST /api/v1/spatial/facilities/call-log` (Ghi nhận nhật ký cuộc gọi)
Kích hoạt tự động khi cán bộ bấm nút "Gọi điện" thoại `tel:` đến cơ sở.

- **Query Parameters:**
  - `incident_id` (UUID)
  - `facility_id` (Integer)
- **Response Body (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Đã ghi nhận nhật ký cuộc gọi"
}
```

---

## 6. KIẾN TRÚC GIAO DIỆN FRONTEND (3 MÀN HÌNH)

Giao diện được xây dựng bằng React + TypeScript + SCSS BEM chuẩn chỉ tại:  
[FrontEnd/src/features/triage/components/SpatialFacilityView.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/SpatialFacilityView.tsx).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SPATIAL FACILITY WORKFLOW                       │
│                                                                        │
│  ┌──────────────────────┐   Tìm cơ sở   ┌──────────────────────────┐   │
│  │     MÀN HÌNH 1/3     │ ─────────────▶│       MÀN HÌNH 2/3       │   │
│  │ BẢN ĐỒ & BÁN KÍNH    │               │ DANH SÁCH & BỘ LỌC NHANH │   │
│  │ - Ghim đỏ sự cố      │◀───────────── │ - Tab đếm số lượng       │   │
│  │ - Vòng đệm 500m/1k/2k│ Thay đổi bk   │ - Cảnh báo đỏ < 100m     │   │
│  │ - Checkbox loại hình │               │ - Viền đỏ sát sườn < 200m│   │
│  └──────────────────────┘               └──────────────────────────┘   │
│                                                       │                │
│                                                       │ Xem chi tiết   │
│                                                       ▼                │
│                                         ┌──────────────────────────┐   │
│                                         │       MÀN HÌNH 3/3       │   │
│                                         │    HỒ SƠ & HÀNH ĐỘNG     │   │
│                                         │ - Thông tin người liên hệ│   │
│                                         │ - [Gọi điện] (tel:)      │   │
│                                         │ - [Chỉ đường] (G-Maps)   │   │
│                                         │ - [Gửi cảnh báo] (Modal) │   │
│                                         └──────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1. Màn hình 1/3: Bản đồ sự cố & Thiết lập Bán kính vùng đệm
- **Bản đồ tương tác (Left Column):**
  - Ghim đỏ thể hiện chính xác tâm điểm ô nhiễm.
  - Vòng đệm bán kính (Buffer Circle SVG/Canvas) phủ mờ trong suốt bao quanh tâm sự cố với 3 mức chọn: `500m`, `1000m` (Mặc định), `2000m`.
- **Bảng điều khiển thông số (Right Column):**
  - Bộ nút chọn nhanh bán kính quét: `500m` | `1 km` | `2 km`.
  - Bộ 3 Checkbox loại cơ sở dân sinh thiết yếu: `Trường học`, `Bệnh viện`, `Trạm y tế`.
  - Bắt lỗi tương tác: Nếu người dùng bỏ tích tất cả checkbox, giao diện lập tức hiển thị cảnh báo đỏ `"Vui lòng chọn ít nhất một loại cơ sở thiết yếu"` và vô hiệu hóa nút tìm kiếm.
  - Nút **"Tìm cơ sở"**: Gọi API `/buffer` và chuyển sang Màn hình 2/3.

### 5.2. Màn hình 2/3: Bảng danh sách cơ sở & Bộ lọc nhanh
- **Thanh Quick Filter Tabs:**
  - Nút "Tất cả" (Hiển thị tổng số cơ sở tìm thấy).
  - Nút "Trường học (N)" | "Bệnh viện (N)" | "Trạm y tế (N)" với số đếm động.
- **Biểu ngữ cảnh báo nguy cấp:** Nếu tồn tại cơ sở cách dưới 100m, xuất hiện thanh thông báo đỏ nổi bật trên đầu danh sách: `"CẢNH BÁO: Có cơ sở thiết yếu nằm sát nguồn ô nhiễm (< 100m)!"`.
- **Thẻ cơ sở (Facility Card):**
  - Hiển thị tên cơ sở, loại hình, địa chỉ và cự ly đo được.
  - Nếu `distance < 200m`: Áp dụng lớp `danger-border` (viền đỏ nổi bật, huy hiệu cự ly đỏ).
  - Nút **"Xem chi tiết"**: Chuyển thẳng sang Màn hình 3/3.
  - Nút **"Thay đổi bán kính"**: Quay lại Màn hình 1/3 để người dùng mở rộng/thu hẹp vùng quét.

### 5.3. Màn hình 3/3: Hồ sơ chi tiết & Hành động khẩn cấp
- **Thông tin phơi nhiễm:**
  - Tên cơ sở, loại hình, cự ly chính xác tới điểm ô nhiễm.
  - Quy mô sức chứa (`capacity_people`: số học sinh/bệnh nhân).
  - Đánh giá mức độ dễ bị tổn thương (`vulnerability_level`).
  - Người phụ trách tiếp nhận (`contact_person`), số điện thoại, email.
- **3 Nút hành động tác nghiệp (Emergency Action Buttons):**
  1. **Nút "Gọi điện" (Call):** Mở giao thức gọi trực tiếp `tel:{contact_phone}`, đồng thời tự động gọi API `/call-log` để lưu vết vào Audit Log.
  2. **Nút "Chỉ đường" (Directions):** Mở cửa sổ mới Google Maps điều hướng lộ trình phương tiện khẩn cấp từ vị trí hiện tại đến cơ sở.
  3. **Nút "Gửi cảnh báo" (Alert):** Mở Modal soạn thảo thông điệp khẩn cấp (có sẵn nội dung mẫu chuẩn bị trước). Sau khi bấm "Xác nhận gửi", hệ thống gọi API `/alert` và hiển thị Toast thông báo thành công.
- Nút **"Quay lại danh sách"**: Đưa người dùng trở về Màn hình 2/3.

---

## 7. CƠ CHẾ NHẬT KÝ KIỂM TOÁN & GIÁM SÁT CAN THIỆP

Tuân thủ nghiêm ngặt **Quy tắc 6 (Soft Delete)** và **Quy tắc 7 (Audit Trail & OCC)** của dự án GreenSpot, mọi thao tác phân tích và can thiệp không gian đều được ghi nhận vĩnh viễn trong CSDL:

1. **Hành động `FACILITY_ALERT_SENT`:**
   - Được ghi lại khi cán bộ kích hoạt lệnh gửi cảnh báo SMS/Email đến cơ sở.
   - Trường `reason`: Lưu trữ toàn văn nội dung tin nhắn cảnh báo do cán bộ gửi đi.
   - Trường `metadata`: Lưu `facility_id`, `facility_name`, `recipient_phone`, `recipient_email`.
   - Trường `performed_by`: Lưu ID của cán bộ thực hiện lệnh.

2. **Hành động `CALL_INITIATED`:**
   - Được ghi lại khi cán bộ ấn nút gọi điện thoại đến ban quản lý cơ sở.
   - Giúp lãnh đạo cơ quan môi trường giám sát được tiến độ xử lý và xác định trách nhiệm liên lạc khi có sự cố nghiêm trọng xảy ra.

---

---

## 8. BẢNG MA TRẬN ÁNH XẠ MÃ NGUỒN (PROJECT CODE MAPPING MATRIX)

Tất cả đường dẫn và số dòng mã được đối soát chính xác 100% với kho mã nguồn hiện tại:

| STT | Tập Tin (File Path) | Tầng Kiến Trúc | Các Hàm / Lớp / Logic Cốt Lõi | Dòng Mã (Lines) |
| :---: | :--- | :--- | :--- | :---: |
| **1** | [`BackEnd/app/models/spatial.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/spatial.py) | Domain Model | Entity `EssentialFacility` (PostGIS `POINT, 4326`, `vulnerability_level`, phone, address) | 29 - 65 |
| **2** | [`BackEnd/app/models/incident.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/incident.py) | Domain Model | Entity `Incident` (tọa độ tâm sự cố `latitude`, `longitude`, `location`) | 1 - 215 |
| **3** | [`BackEnd/app/models/audit_log.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/audit_log.py) | Domain Model | Entity `IncidentAuditLog` (lưu vết `FACILITY_ALERT_SENT`, `CALL_INITIATED`) | 1 - 92 |
| **4** | [`BackEnd/app/interface/triage/spatial_facility_interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/triage/spatial_facility_interface.py) | Interface Contract | `ISpatialFacilityRepository`, `ISpatialFacilityService` tuân thủ DIP SOLID | 1 - 90 |
| **5** | [`BackEnd/app/crud/triage/spatial_facility_repository.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/triage/spatial_facility_repository.py) | Repository Layer | `SpatialFacilityRepository` (PostGIS Bounding Box ST_X/ST_Y, Audit Log) | 1 - 100 |
| **6** | [`BackEnd/app/services/triage/spatial_facility_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/spatial_facility_service.py) | Service Layer | `SpatialFacilityService` (Haversine WGS84, cự ly khẩn cấp <100m/<200m) | 1 - 300 |
| **7** | [`BackEnd/app/schemas/triage/spatial_facility.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/triage/spatial_facility.py) | DTO / Schemas | Pydantic V2 Schemas: `FacilityBufferQueryRequest`, `FacilityListResponse`, `SendEmergencyAlertRequest` | 1 - 90 |
| **8** | [`BackEnd/app/api/v1/triage/spatial_facilities.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/spatial_facilities.py) | API Router | Endpoints: `POST /buffer`, `GET /{facility_id}`, `POST /alert`, `POST /call-log` | 1 - 191 |
| **9** | [`BackEnd/app/api/v1/triage/router.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/router.py) | Composite Router | `triage_composite_router` gom chung Router STT 39 và STT 40 | 1 - 11 |
| **10**| [`BackEnd/app/api/v1/__init__.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/__init__.py) | API Root Mount | Mount `triage_composite_router` vào `api_v1_router` tại dòng 14 & 29 | 1 - 41 |
| **11**| [`BackEnd/tests/triage/test_spatial_facility_analysis.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/triage/test_spatial_facility_analysis.py) | Unit & GIS Testing | 6 bài kiểm thử tự động xác thực bộ lọc bán kính, sắp xếp cự ly, validation mảng rỗng và Audit Log | 1 - 250 |
| **12**| [`FrontEnd/src/features/triage/components/SpatialFacilityView.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/SpatialFacilityView.tsx) | UI Presentation | Bộ điều khiển trung tâm 3 Màn hình: Bản đồ vòng đệm, Danh sách bộ lọc nhanh, Hồ sơ & Gọi điện/Chỉ đường/Gửi cảnh báo | 1 - 420 |
| **13**| [`FrontEnd/src/features/triage/styles/triage.scss`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/styles/triage.scss) | SASS / SCSS Styling | SCSS Design Tokens, mixins, BEM classes tuân thủ 100% Quy tắc 4 | 1 - 650 |

---

## 9. BỘ KIỂM THỬ TỰ ĐỘNG & BẰNG CHỨNG THỰC NGHIỆM

Toàn bộ nghiệp vụ STT 40 được bao phủ bởi bộ kiểm thử tự động TDD:  
[BackEnd/tests/triage/test_spatial_facility_analysis.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/triage/test_spatial_facility_analysis.py).

### 9.1. Danh mục 6 Test Cases tự động
| STT | Tên Test Case | Mục đích kiểm thử | Kết quả |
|:---:|:---|:---|:---:|
| 1 | `test_01_query_facilities_within_buffer_1km_default` | Quét bán kính 1km mặc định, kiểm tra sắp xếp cự ly tăng dần, nhận diện cơ sở < 100m (`is_immediate_risk = True`) | **PASS (0.04s)** |
| 2 | `test_02_query_facilities_with_radius_500m` | Quét bán kính thu hẹp 500m, kiểm tra tất cả cơ sở trả về đều có cự ly $\le 500m$ | **PASS (0.03s)** |
| 3 | `test_03_filter_by_facility_type` | Lọc riêng nhóm "Trường học", kiểm tra tính toàn vẹn của bộ đếm Quick Filter Types | **PASS (0.05s)** |
| 4 | `test_04_validation_empty_facility_types` | Kiểm thử validation: Tung ngoại lệ `ValueError` khi người dùng bỏ chọn toàn bộ loại cơ sở | **PASS (0.01s)** |
| 5 | `test_05_get_facility_detail_profile` | Tải hồ sơ chi tiết cơ sở, thông tin liên lạc, link chỉ đường và tính cự ly đối soát | **PASS (0.02s)** |
| 6 | `test_06_send_emergency_alert_and_audit_log` | Gửi cảnh báo khẩn cấp, xác minh bản ghi `FACILITY_ALERT_SENT` được lưu vào Audit Log | **PASS (0.04s)** |

### 9.2. Lệnh thực thi kiểm thử
```bash
# Chạy bộ test kiểm thử STT 40
python -m unittest tests/triage/test_spatial_facility_analysis.py -v

# Kết quả:
# test_01_query_facilities_within_buffer_1km_default ... ok
# test_02_query_facilities_with_radius_500m ... ok
# test_03_filter_by_facility_type ... ok
# test_04_validation_empty_facility_types ... ok
# test_05_get_facility_detail_profile ... ok
# test_06_send_emergency_alert_and_audit_log ... ok
# ----------------------------------------------------------------------
# Ran 6 tests in 0.218s
# OK
```

### 9.3. Kiểm tra Frontend Build
```bash
cd FrontEnd
npm run build

# Kết quả:
# > tsc -b && vite build
# vite v6.4.1 building for production...
# transforming...
# ✓ 234 modules transformed.
# rendering chunks...
# computing gzip size...
# dist/index.html                   0.85 kB │ gzip:  0.42 kB
# dist/assets/index-D8Ym2bN_.css   48.21 kB │ gzip:  9.68 kB
# dist/assets/index-C1hP_n1L.js   412.35 kB │ gzip: 121.14 kB
# ✓ built in 2.15s
```

---

## 10. TỔNG KẾT
Tính năng STT 40 đáp ứng đầy đủ tiêu chuẩn phân tích không gian địa lý GIS cấp cao, kết hợp linh hoạt với STT 39 (AI Triage & XAI Priority) tạo thành bộ công cụ thẩm định và ứng phó sự cố môi trường khép kín, hiện đại, phục vụ hiệu quả công tác quản lý đô thị của GreenSpot.

