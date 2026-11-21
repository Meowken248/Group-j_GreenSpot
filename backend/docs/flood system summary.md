# Tổng Kết Mã Nguồn: Hệ Thống Báo Cáo Ngập Lụt Động (Dynamic Flood Crowdsourcing) & Cấu Trúc OOP

Tài liệu này tổng hợp toàn bộ các logic lõi (core logic) và kiến trúc hệ thống hiện tại. Hệ thống đã được nâng cấp từ việc "hiển thị điểm ngập mẫu cố định" sang **bản đồ thông minh biết tự động vẽ đường ngập theo thời gian thực**, đồng thời tái cấu trúc hoàn toàn mã nguồn Backend theo tiêu chuẩn **Hướng Đối Tượng (OOP)** chuyên nghiệp với các Interface (Abstract Base Classes).

---

## PHẦN 1: TÁI CẤU TRÚC KIẾN TRÚC OOP (CLEAN ARCHITECTURE)

Để đảm bảo hệ thống dễ bảo trì, có khả năng Test (Mocking) và mở rộng cao theo nguyên lý **Dependency Inversion (S.O.L.I.D)**, toàn bộ các Services được kết nối thông qua các Interface trừu tượng.

### 1.1 Khai báo Abstract Base Classes (Interfaces)
**File:** `BackEnd/app/interface/interfaces.py`

Thay vì gắn chặt vào các class cụ thể, hệ thống dùng module `abc` của Python để tạo các bản hợp đồng giao tiếp (Contract).

```python
from abc import ABC, abstractmethod
# ... (imports) ...

class IWeatherService(ABC):
    @abstractmethod
    async def get_hcm_rainfall(self, force_refresh: bool = False) -> Dict[str, Any]:
        pass

class ITideEngine(ABC):
    @classmethod
    @abstractmethod
    def calculate_water_level(cls, target_time: Optional[datetime] = None, station_code: str = "PHU_AN") -> float:
        pass
    # ... Các hàm khác của TideEngine ...

class IFloodEngine(ABC):
    @classmethod
    @abstractmethod
    async def evaluate_all_hotspots(cls, db: AsyncSession, ...) -> List[Dict[str, Any]]:
        pass
    # ... Các hàm khác của FloodEngine ...
```

### 1.2 Triển khai các Interface (Concrete Implementations)
Các file Service cốt lõi được sửa đổi để bắt buộc kế thừa từ Interface tương ứng.
- **`BackEnd/app/services/weather_service.py`**:
  ```python
  from app.interface.interfaces import IWeatherService
  
  class WeatherRainfallService(IWeatherService):
      async def get_hcm_rainfall(self, force_refresh: bool = False) -> Dict[str, Any]:
          # Triển khai logic gọi API thời tiết...
  ```
- **`BackEnd/app/services/tide_service.py`**:
  ```python
  from app.interface.interfaces import ITideEngine

  class HarmonicTideEngine(ITideEngine):
      @classmethod
      def calculate_water_level(cls, target_time: Optional[datetime] = None, station_code: str = "PHU_AN") -> float:
          # Triển khai Harmonic Analysis...
  ```
- **`BackEnd/app/services/flood_engine.py`**:
  ```python
  from app.interface.interfaces import IFloodEngine

  class FloodRiskEngine(IFloodEngine):
      @classmethod
      async def evaluate_all_hotspots(cls, db: AsyncSession, ...) -> List[Dict[str, Any]]:
          # Triển khai hệ thống đánh giá rủi ro...
  ```

---

## PHẦN 2: HỆ THỐNG BÁO CÁO NGẬP ĐỘNG (CROWDSOURCING)

### 2.1 Backend Core: Thuật toán Tự động vẽ đường ngập bằng OSRM
**File:** `BackEnd/app/api/v1/flood.py`

Thay vì nhận một tọa độ điểm (Point) và vẽ hình tròn tĩnh, hệ thống sử dụng thuật toán Bám đường (Snap-to-road) của **OSRM** để tự động "vẽ" ra một đoạn đường ngập thực tế.

```python
# 1. Thuật toán tạo "Bounding box" 100m để ép OSRM tìm đoạn đường 
start_lng, start_lat = payload.longitude - 0.0005, payload.latitude - 0.0005
end_lng, end_lat = payload.longitude + 0.0005, payload.latitude + 0.0005

# 2. Giao tiếp với API Open Source Routing Machine
osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson"

road_corridor_wkt = f"LINESTRING({payload.longitude - 0.0001} {payload.latitude - 0.0001}, {payload.longitude + 0.0001} {payload.latitude + 0.0001})"
try:
    req = urllib.request.Request(osrm_url)
    with urllib.request.urlopen(req, timeout=3) as response:
        route_data = json.loads(response.read().decode())
        if "routes" in route_data and len(route_data["routes"]) > 0:
            # Lấy mảng tọa độ uốn lượn bám sát theo đường thật
            coords = route_data["routes"][0]["geometry"]["coordinates"]
            # Chuyển đổi sang định dạng WKT (Well-Known Text) chuẩn PostGIS
            road_corridor_wkt = "LINESTRING(" + ", ".join([f"{c[0]} {c[1]}" for c in coords]) + ")"
except Exception:
    pass # Fallback an toàn nếu OSRM lỗi mạng hoặc timeout
```

### 2.2 Backend Core: Ghi nhận điểm ngập Động vào CSDL (PostGIS)
**File:** `BackEnd/app/api/v1/flood.py`

Hệ thống tự động sinh ra một `flood_hotspots` động với ID đặc biệt (`FL-DYN-...`) kèm theo hình học `LineString` chính xác mà OSRM vừa trả về. Điểm đen này lập tức tham gia vào mạng lưới phân tích rủi ro của `IFloodEngine`.

```sql
# Mã tạo Hotspot tự động
dynamic_hotspot_code = f"FL-DYN-{uuid.uuid4().hex[:6].upper()}"

insert_hotspot_query = text("""
    INSERT INTO flood_hotspots (
        hotspot_code, street_name, ward_name, district_name,
        location, road_corridor, elevation_meters, primary_cause,
        threshold_tide_meters, threshold_rain_mm_per_hour,
        historical_max_depth_cm, drainage_system_rating, is_active
    ) VALUES (
        :code, :street, NULL, 'Cộng đồng báo cáo',
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
        ST_SetSRID(ST_GeomFromText(:wkt), 4326), -- Nạp đường màu xanh vào DB
        1.0, 'RAINFALL', 0.0, 0.0, :depth, 1, TRUE
    ) RETURNING hotspot_id;
""")
```

### 2.3 Frontend Core: Lắng nghe sự kiện "Bấm chuột phải" (Context Menu)
**File:** `frontend/src/components/EcoMap.tsx`

Trên bản đồ `react-map-gl`, hệ thống chặn sự kiện chuột phải của trình duyệt để tạo ra bảng điều khiển Báo Ngập tại đúng con trỏ chuột.

```tsx
// State lưu trữ tọa độ click chuột
const [contextMenu, setContextMenu] = useState<{ lng: number; lat: number; x: number; y: number } | null>(null);

// Component Map (Bản đồ)
<Map
  // ...
  onClick={(e) => {
    setContextMenu(null); // Tắt menu báo ngập khi bấm chuột trái ra ngoài
    handleMapClick(e);
  }}
  onContextMenu={(e) => {
    e.originalEvent.preventDefault(); // Chặn menu mặc định của trình duyệt
    setContextMenu({
      lng: e.lngLat.lng, // Tọa độ GPS thực tế để gửi API
      lat: e.lngLat.lat,
      x: e.point.x,      // Tọa độ màn hình X,Y để render Popup
      y: e.point.y,
    });
  }}
>
```

### 2.4 Frontend Core: Giao diện Báo cáo ngập và Tải lại động (Auto-Refresh)
**File:** `frontend/src/components/EcoMap.tsx`

Khi người dùng bấm xác nhận Báo cáo, ứng dụng gọi Backend API và thay đổi `refreshTrigger` để ép `useEffect` của React lập tức tải lại dữ liệu điểm ngập (đường màu xanh sẽ hiện ra không cần F5 trình duyệt).

```tsx
{/* Giao diện Popup Context Menu */}
{contextMenu && (
  <div
    style={{
      position: "absolute",
      left: contextMenu.x,
      top: contextMenu.y,
      backgroundColor: "#1e293b",
      // ... (CSS Styling)
    }}
    onClick={async (e) => {
      e.stopPropagation();
      
      // 1. Gọi API Backend (Khởi động OSRM Snap-to-road và nạp PostGIS)
      const success = await reportFloodAPI(contextMenu.lat, contextMenu.lng, 35);
      
      // 2. Ẩn context menu
      setContextMenu(null); 
      
      if (success) {
        alert("Báo cáo ngập lụt thành công! Hệ thống đang tải lại bản đồ...");
        // 3. Thay đổi Trigger để ép React Effect tải lại dữ liệu bản đồ
        setRefreshTrigger((prev) => prev + 1); 
      }
    }}
  >
    <span className="material-symbols-outlined text-blue-400">flood</span>
    <span className="font-semibold text-sm">Báo cáo đoạn đường này đang ngập</span>
  </div>
)}
```

### 2.5 API Client Integration
**File:** `frontend/src/services/ecoApiService.ts`

Hàm dịch vụ `fetch` đơn giản dùng để cầu nối giữa giao diện Báo ngập và hệ thống phân tích.

```typescript
export async function reportFloodAPI(
  lat: number,
  lng: number,
  depthCm: number = 30
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/flood/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        actual_depth_cm: depthCm,
        address_description: "Cộng đồng báo cáo ngập lụt",
      }),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}
```

> [!NOTE]
> Bằng sự kết hợp giữa kiến trúc OOP ở Backend (để dễ dàng mở rộng thuật toán trong tương lai) và quy trình 5 bước OSRM Snap-to-road, hệ thống của bạn hiện là một ứng dụng Crowdsourcing thời gian thực chuyên nghiệp và hoàn thiện.
