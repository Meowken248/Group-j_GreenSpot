# Tổng Kết Mã Nguồn: Hệ Thống Báo Cáo Ngập Lụt Động (Dynamic Flood Crowdsourcing)

Tài liệu này tổng hợp lại toàn bộ các logic lõi (core logic) và những thay đổi quan trọng nhất để giúp hệ thống từ chỗ "hiển thị điểm ngập mẫu cố định" trở thành một **bản đồ thông minh biết tự động vẽ đường ngập theo thời gian thực** dựa trên dữ liệu báo cáo cộng đồng.

---

## 1. Backend Core: Thuật toán Tự động vẽ đường bằng OSRM
**File:** `BackEnd/app/api/v1/flood.py`

Thay vì nhận một tọa độ điểm (Point) và vẽ hình tròn tĩnh, hệ thống sử dụng thuật toán Bám đường (Snap-to-road) của OSRM để tự động "vẽ" ra một đoạn đường thực tế.

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
            # Lấy mảng tọa độ uốn lượn theo đường thật
            coords = route_data["routes"][0]["geometry"]["coordinates"]
            # Chuyển đổi sang định dạng WKT (Well-Known Text) của PostGIS
            road_corridor_wkt = "LINESTRING(" + ", ".join([f"{c[0]} {c[1]}" for c in coords]) + ")"
except Exception:
    pass # Fallback an toàn nếu OSRM lỗi mạng
```

---

## 2. Backend Core: Ghi nhận điểm ngập Động vào CSDL (PostGIS)
**File:** `BackEnd/app/api/v1/flood.py`

Thay vì chỉ lưu log báo cáo, hệ thống tự động sinh ra một `flood_hotspots` mới toanh (Dynamic Hotspot) với dạng hình học `LineString` chính xác mà OSRM vừa trả về. Điểm đen này sẽ tự động tham gia vào mạng lưới phân tích rủi ro của hệ thống.

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

---

## 3. Frontend Core: Lắng nghe sự kiện "Bấm chuột phải" (Context Menu)
**File:** `frontend/src/components/EcoMap.tsx`

Sử dụng thư viện `react-map-gl`, chặn sự kiện mặc định của trình duyệt để tạo ra bảng điểu khiển "Báo ngập" tại ngay con trỏ chuột.

```tsx
// State lưu trữ tọa độ click chuột
const [contextMenu, setContextMenu] = useState<{ lng: number; lat: number; x: number; y: number } | null>(null);

// Component Map (Bản đồ)
<Map
  // ...
  onClick={(e) => {
    setContextMenu(null); // Tắt menu khi bấm chuột trái
    handleMapClick(e);
  }}
  onContextMenu={(e) => {
    e.originalEvent.preventDefault(); // Chặn menu của trình duyệt
    setContextMenu({
      lng: e.lngLat.lng, // Tọa độ GPS để gửi lên Backend
      lat: e.lngLat.lat,
      x: e.point.x,      // Tọa độ màn hình để vẽ Giao diện (UI)
      y: e.point.y,
    });
  }}
>
```

---

## 4. Frontend Core: Giao diện Menu Báo cáo ngập và Reload tự động
**File:** `frontend/src/components/EcoMap.tsx`

Khi người dùng bấm vào Menu báo cáo, ứng dụng lập tức gọi API và ép vòng đời React `useEffect` gọi lại dữ liệu bản đồ bằng `refreshTrigger` để con đường màu xanh hiển thị ra lập tức.

```tsx
{/* Giao diện Popup Context Menu */}
{contextMenu && (
  <div
    style={{
      position: "absolute",
      left: contextMenu.x,
      top: contextMenu.y,
      backgroundColor: "#1e293b",
      /* (CSS Styling...) */
    }}
    onClick={async (e) => {
      e.stopPropagation();
      
      // 1. Gọi API Backend (Kích hoạt OSRM Snap-to-road)
      const success = await reportFloodAPI(contextMenu.lat, contextMenu.lng, 35);
      
      // 2. Tắt menu đi
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

---

## 5. API Client Core
**File:** `frontend/src/services/ecoApiService.ts`

Hàm dịch vụ `fetch` đơn giản dùng để cầu nối giữa giao diện và hệ thống phân tích.

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
> Bằng 5 bước cốt lõi này, ứng dụng đã xóa bỏ hoàn toàn giới hạn "Dữ liệu mẫu", và trở thành một ứng dụng theo chuẩn thời gian thực (Realtime Crowdsourcing Map). Mọi tính năng này đều đã được code xong và đang chạy ổn định.
