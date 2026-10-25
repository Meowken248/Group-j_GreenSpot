import { HCM_DISTRICTS } from "../types/event.types";

/** Bounding Box địa giới TP.HCM (khớp backend HCM_BOUNDS). */
export const HCM_BOUNDS = {
  minLat: 10.35,
  maxLat: 11.2,
  minLon: 106.35,
  maxLon: 107.05,
};

export const isWithinHcm = (lat: number, lon: number): boolean =>
  lat >= HCM_BOUNDS.minLat &&
  lat <= HCM_BOUNDS.maxLat &&
  lon >= HCM_BOUNDS.minLon &&
  lon <= HCM_BOUNDS.maxLon;

/** Tâm gần đúng của 22 quận/huyện, phục vụ tự động chọn quận theo ghim bản đồ. */
export const HCM_DISTRICT_CENTERS: Record<string, { lat: number; lon: number }> = {
  "Quận 1": { lat: 10.7769, lon: 106.7009 },
  "Quận 3": { lat: 10.7845, lon: 106.6845 },
  "Quận 4": { lat: 10.7578, lon: 106.7052 },
  "Quận 5": { lat: 10.7557, lon: 106.6673 },
  "Quận 6": { lat: 10.7465, lon: 106.6355 },
  "Quận 7": { lat: 10.7338, lon: 106.7215 },
  "Quận 8": { lat: 10.7384, lon: 106.6711 },
  "Quận 10": { lat: 10.7736, lon: 106.6679 },
  "Quận 11": { lat: 10.7629, lon: 106.6503 },
  "Quận 12": { lat: 10.8672, lon: 106.6413 },
  "Quận Bình Thạnh": { lat: 10.8106, lon: 106.7091 },
  "Quận Gò Vấp": { lat: 10.8386, lon: 106.6653 },
  "Quận Phú Nhuận": { lat: 10.7994, lon: 106.6806 },
  "Quận Tân Bình": { lat: 10.8015, lon: 106.6525 },
  "Quận Tân Phú": { lat: 10.7903, lon: 106.6267 },
  "Quận Bình Tân": { lat: 10.7656, lon: 106.6039 },
  "Thành phố Thủ Đức": { lat: 10.8494, lon: 106.7537 },
  "Huyện Củ Chi": { lat: 11.0067, lon: 106.5133 },
  "Huyện Hóc Môn": { lat: 10.8864, lon: 106.5943 },
  "Huyện Bình Chánh": { lat: 10.6874, lon: 106.5941 },
  "Huyện Nhà Bè": { lat: 10.6956, lon: 106.7397 },
  "Huyện Cần Giờ": { lat: 10.5089, lon: 106.8635 },
};

/** Khoảng cách Haversine (mét) dùng cho chỉ báo GPS phía client. */
export const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Chọn quận/huyện gần nhất với toạ độ ghim trên bản đồ. */
export const nearestDistrict = (lat: number, lon: number): string => {
  let best = HCM_DISTRICTS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  HCM_DISTRICTS.forEach((name) => {
    const center = HCM_DISTRICT_CENTERS[name];
    if (!center) return;
    const distance = haversineMeters(lat, lon, center.lat, center.lon);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = name;
    }
  });
  return best;
};
