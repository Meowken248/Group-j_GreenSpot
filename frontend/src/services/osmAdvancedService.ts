import type { FeatureCollection } from "geojson";

// Dịch vụ tích hợp các công nghệ nâng cao của OpenStreetMap
export interface ReverseGeocodeResult {
  placeName: string;
  houseNumber?: string;
  street?: string;
  district?: string;
  city?: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

export interface RouteResult {
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  distanceKm: number;
  durationMin: number;
  startCoords?: [number, number];
  destCoords?: [number, number];
  destName?: string;
  startLabel?: string;
}

// In-memory cache cho Reverse Geocoding và Lộ trình OSRM
const reverseGeocodeCache = new Map<string, { data: ReverseGeocodeResult; time: number }>();
const routeCache = new Map<string, { data: RouteResult; time: number }>();
const OSM_CACHE_TTL_MS = 10 * 60 * 1000; // 10 phút

// 1. DỊCH TỌA ĐỘ NGƯỢC THÀNH SỐ NHÀ & ĐỊA CHỈ (REVERSE GEOCODING KÈM CACHE)
export async function reverseGeocodeOSM(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  const cached = reverseGeocodeCache.get(key);
  if (cached && Date.now() - cached.time < OSM_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();

    if (data.features && data.features.length > 0) {
      const p = data.features[0].properties || {};
      const houseNumber = p.housenumber || p.house_number || "";
      const street = p.street || p.road || "";
      const district = p.district || p.suburb || p.locality || "TP. Hồ Chí Minh";
      const city = p.city || "TP. Hồ Chí Minh";

      const addressParts: string[] = [];
      if (houseNumber && street) {
        addressParts.push(`Số ${houseNumber} ${street}`);
      } else if (street) {
        addressParts.push(street);
      } else if (houseNumber) {
        addressParts.push(`Số nhà ${houseNumber}`);
      }

      if (district) addressParts.push(district);
      if (city && city !== district) addressParts.push(city);

      const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      const placeName = p.name || (houseNumber && street ? `Số ${houseNumber} ${street}` : fullAddress);

      const result: ReverseGeocodeResult = {
        placeName,
        houseNumber,
        street,
        district,
        city,
        fullAddress,
        lat,
        lng,
      };

      if (reverseGeocodeCache.size > 150) {
        const oldest = reverseGeocodeCache.keys().next().value;
        if (oldest) reverseGeocodeCache.delete(oldest);
      }
      reverseGeocodeCache.set(key, { data: result, time: Date.now() });

      return result;
    }
  } catch (err) {
    console.warn("Lỗi Reverse Geocode OSM:", err);
  }

  // Fallback nếu không có kết quả
  const fallback: ReverseGeocodeResult = {
    placeName: "Vị trí đã chọn",
    fullAddress: `Tọa độ: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`,
    district: "TP. Hồ Chí Minh",
    lat,
    lng,
  };
  return fallback;
}

// 2. TÍNH TOÁN LỘ TRÌNH & CHỈ ĐƯỜNG THỰC TẾ TRÊN MẠNG ĐƯỜNG (OSRM ROUTING KÈM CACHE)
export async function getRouteOSRM(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<RouteResult | null> {
  const routeKey = `${startLng.toFixed(4)},${startLat.toFixed(4)}_${endLng.toFixed(4)},${endLat.toFixed(4)}`;
  const cachedRoute = routeCache.get(routeKey);
  if (cachedRoute && Date.now() - cachedRoute.time < OSM_CACHE_TTL_MS) {
    return cachedRoute.data;
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const result: RouteResult = {
        geometry: route.geometry,
        distanceKm: parseFloat((route.distance / 1000).toFixed(1)),
        durationMin: Math.max(1, Math.round(route.duration / 60)),
      };

      if (routeCache.size > 80) {
        const oldest = routeCache.keys().next().value;
        if (oldest) routeCache.delete(oldest);
      }
      routeCache.set(routeKey, { data: result, time: Date.now() });

      return result;
    }
  } catch (err) {
    console.warn("Lỗi tính toán lộ trình OSRM:", err);
  }
  return null;
}

// 3. DỮ LIỆU RANH GIỚI CÁC QUẬN / HUYỆN TIÊU BIỂU TP.HCM (GEOJSON POLYGONS)
export const HCM_DISTRICT_BOUNDARIES: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "quan-1",
        name: "Quận 1",
        role: "Trung tâm Hành chính & Tài chính",
        incidents: 12,
        greenIndex: "18.4%",
        color: "#3b82f6",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.6850, 10.7680],
            [106.6970, 10.7610],
            [106.7080, 10.7690],
            [106.7070, 10.7890],
            [106.6960, 10.7930],
            [106.6850, 10.7810],
            [106.6850, 10.7680],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "thu-duc",
        name: "TP. Thủ Đức",
        role: "Đô thị Sáng tạo & Công nghệ",
        incidents: 28,
        greenIndex: "32.6%",
        color: "#10b981",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.7150, 10.7650],
            [106.7650, 10.7450],
            [106.8450, 10.8350],
            [106.8150, 10.8950],
            [106.7450, 10.8650],
            [106.7150, 10.7950],
            [106.7150, 10.7650],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "quan-7",
        name: "Quận 7",
        role: "Khu đô thị Kiểu mẫu Nam Sài Gòn",
        incidents: 15,
        greenIndex: "26.8%",
        color: "#8b5cf6",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.6950, 10.7450],
            [106.7450, 10.7480],
            [106.7550, 10.7150],
            [106.7150, 10.7050],
            [106.6950, 10.7250],
            [106.6950, 10.7450],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "binh-thanh",
        name: "Quận Bình Thạnh",
        role: "Cửa ngõ Đông Bắc & Bán đảo Thanh Đa",
        incidents: 19,
        greenIndex: "22.1%",
        color: "#f59e0b",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.6950, 10.7950],
            [106.7350, 10.7950],
            [106.7450, 10.8350],
            [106.7150, 10.8450],
            [106.6850, 10.8150],
            [106.6950, 10.7950],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "can-gio",
        name: "Huyện Cần Giờ",
        role: "Khu dự trữ sinh quyển thế giới",
        incidents: 4,
        greenIndex: "84.5%",
        color: "#059669",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.7950, 10.6150],
            [107.0150, 10.4550],
            [106.9450, 10.3750],
            [106.7450, 10.4650],
            [106.7950, 10.6150],
          ],
        ],
      },
    },
  ],
};
