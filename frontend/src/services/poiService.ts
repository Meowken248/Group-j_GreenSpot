export interface LivePOI {
  id: string;
  name: string;
  category: "cafe" | "restaurant" | "shop" | "address" | "amenity";
  categoryName: string;
  icon: string;
  houseNumber?: string;
  street?: string;
  district?: string;
  city?: string;
  fullAddress: string;
  longitude: number;
  latitude: number;
  rawType?: string;
}

// In-memory cache nhằm tối ưu tốc độ xử lý và giảm tải cho Photon/OSM API
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút
const searchCache = new Map<string, CacheEntry<LivePOI[]>>();
const nearbyCache = new Map<string, CacheEntry<LivePOI[]>>();

function getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setToCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, maxSize = 100) {
  if (cache.size >= maxSize) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// Biến đổi dữ liệu thô từ Photon/OSM thành định dạng LivePOI chuẩn
function formatPhotonFeature(feat: any): LivePOI {
  const p = feat.properties || {};
  const [lng, lat] = feat.geometry?.coordinates || [106.7009, 10.7769];

  // Xác định số nhà và tên đường
  const houseNumber = p.housenumber || p.house_number || "";
  const street = p.street || p.road || "";
  const district = p.district || p.suburb || p.locality || p.city || "TP. Hồ Chí Minh";
  const city = p.city || "TP. Hồ Chí Minh";

  // Phân loại quán xá, số nhà, cửa hàng
  let category: LivePOI["category"] = "amenity";
  let categoryName = "Địa điểm";
  let icon = "📍";

  const osmVal = (p.osm_value || "").toLowerCase();
  const osmKey = (p.osm_key || "").toLowerCase();
  const nameLower = (p.name || "").toLowerCase();

  if (
    osmVal.includes("cafe") ||
    nameLower.includes("cafe") ||
    nameLower.includes("cà phê") ||
    nameLower.includes("tea")
  ) {
    category = "cafe";
    categoryName = "Quán Cafe & Đồ uống";
    icon = "☕";
  } else if (
    osmVal.includes("restaurant") ||
    osmVal.includes("fast_food") ||
    osmVal.includes("food") ||
    nameLower.includes("quán") ||
    nameLower.includes("phở") ||
    nameLower.includes("bún") ||
    nameLower.includes("cơm") ||
    nameLower.includes("bánh")
  ) {
    category = "restaurant";
    categoryName = "Quán ăn & Nhà hàng";
    icon = "🍜";
  } else if (
    osmKey === "shop" ||
    osmVal.includes("shop") ||
    osmVal.includes("supermarket") ||
    osmVal.includes("convenience")
  ) {
    category = "shop";
    categoryName = "Cửa hàng & Tiện ích";
    icon = "🏪";
  } else if (houseNumber || p.type === "house") {
    category = "address";
    categoryName = "Số nhà & Địa chỉ";
    icon = "🏠";
  }

  // Tạo địa chỉ đầy đủ
  const addressParts: string[] = [];
  if (houseNumber && street) {
    addressParts.push(`Số ${houseNumber} ${street}`);
  } else if (street) {
    addressParts.push(street);
  } else if (houseNumber) {
    addressParts.push(`Số nhà ${houseNumber}`);
  }

  if (p.locality && p.locality !== street) addressParts.push(p.locality);
  if (district) addressParts.push(district);
  if (city && city !== district) addressParts.push(city);

  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "TP. Hồ Chí Minh";
  const displayName = p.name || (houseNumber && street ? `Số ${houseNumber} ${street}` : fullAddress);

  return {
    id: `${p.osm_type || "N"}_${p.osm_id || Math.random()}`,
    name: displayName,
    category,
    categoryName,
    icon,
    houseNumber,
    street,
    district,
    city,
    fullAddress,
    longitude: lng,
    latitude: lat,
    rawType: osmVal || p.type,
  };
}

// 1. Tìm kiếm quán xá, số nhà, địa chỉ theo từ khóa qua API Photon (OSM) kèm cache tối ưu
export async function searchLivePlacesAPI(
  query: string,
  lat = 10.7769,
  lng = 106.7009
): Promise<LivePOI[]> {
  const cleanQuery = (query || "").trim().toLowerCase();
  if (cleanQuery.length < 2) return [];

  const cacheKey = `${cleanQuery}_${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const cached = getFromCache(searchCache, cacheKey);
  if (cached) return cached;

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      cleanQuery
    )}&lat=${lat}&lon=${lng}&limit=12`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.features || !Array.isArray(data.features)) return [];

    const results = data.features.map(formatPhotonFeature);
    setToCache(searchCache, cacheKey, results);
    return results;
  } catch (err) {
    console.warn("Lỗi gọi API tìm kiếm địa điểm:", err);
    return [];
  }
}

// 2. Tải danh sách quán ăn, cafe, cửa hàng, số nhà thực tế quanh vị trí tâm bản đồ kèm cache
export async function fetchNearbyPOIsAPI(
  lat: number,
  lng: number,
  type: "all" | "cafe" | "restaurant" | "shop" = "all"
): Promise<LivePOI[]> {
  // Quantize tọa độ để tái sử dụng cache khi di chuyển vi mô (lưới ~100m)
  const quantizedLat = lat.toFixed(3);
  const quantizedLng = lng.toFixed(3);
  const cacheKey = `${type}_${quantizedLat}_${quantizedLng}`;

  const cached = getFromCache(nearbyCache, cacheKey);
  if (cached) return cached;

  const keywordsMap = {
    all: ["cafe", "quan an", "cua hang"],
    cafe: ["cafe", "ca phe", "tra sua"],
    restaurant: ["quan an", "nha hang", "pho"],
    shop: ["cua hang", "circle k", "sieu thi"],
  };

  const queries = keywordsMap[type] || keywordsMap.all;

  try {
    const promises = queries.map((q) =>
      fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${lat}&lon=${lng}&limit=8`
      ).then((r) => (r.ok ? r.json() : { features: [] }))
    );

    const results = await Promise.all(promises);
    const combinedFeatures: any[] = [];
    const seenIds = new Set<string>();

    for (const res of results) {
      if (res.features && Array.isArray(res.features)) {
        for (const feat of res.features) {
          const id = `${feat.properties?.osm_type}_${feat.properties?.osm_id}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            combinedFeatures.push(feat);
          }
        }
      }
    }

    const formatted = combinedFeatures.map(formatPhotonFeature);
    setToCache(nearbyCache, cacheKey, formatted);
    return formatted;
  } catch (err) {
    console.warn("Lỗi tải POI quanh khu vực:", err);
    return [];
  }
}
