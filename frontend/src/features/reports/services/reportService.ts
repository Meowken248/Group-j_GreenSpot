import api from "../../../api/client";
import type {
  WasteCategoryItem,
  AttachedMedia,
  DuplicateCheckResult,
  IncidentSubmissionResult,
  ReportFormData,
  IncidentLocation,
} from "../types/report.types";

export const HCMC_DISTRICT_KEYWORDS = [
  "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8",
  "Quận 10", "Quận 11", "Quận 12", "Bình Thạnh", "Bình Tân", "Gò Vấp",
  "Phú Nhuận", "Tân Bình", "Tân Phú", "Thủ Đức", "Bình Chánh", "Cần Giờ",
  "Củ Chi", "Hóc Môn", "Nhà Bè"
];

// Giới hạn toạ độ TP.HCM
export const HCMC_BOUNDS = {
  minLat: 10.35,
  maxLat: 11.18,
  minLng: 106.35,
  maxLng: 107.05,
};

export const isCoordinatesInHCMC = (lat: number, lng: number): boolean => {
  return (
    lat >= HCMC_BOUNDS.minLat &&
    lat <= HCMC_BOUNDS.maxLat &&
    lng >= HCMC_BOUNDS.minLng &&
    lng <= HCMC_BOUNDS.maxLng
  );
};

export const fetchIncidentCategories = async (): Promise<WasteCategoryItem[]> => {
  const response = await api.get<WasteCategoryItem[]>("/api/v1/incidents/categories");
  return response.data;
};

export const uploadMediaWithWatermark = async (
  file: File,
  coords?: { lat: number; lng: number }
): Promise<AttachedMedia> => {
  const formData = new FormData();
  formData.append("file", file);
  if (coords) {
    formData.append("latitude", coords.lat.toString());
    formData.append("longitude", coords.lng.toString());
  }

  const response = await api.post<{
    media_id: string;
    file_url: string;
    thumbnail_url: string;
    media_type: "IMAGE" | "VIDEO";
    file_size_bytes: number;
    mime_type: string;
    watermark_applied: boolean;
    watermark_text?: string;
  }>("/api/v1/incidents/upload-media", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return {
    id: response.data.media_id,
    file_url: response.data.file_url,
    thumbnail_url: response.data.thumbnail_url,
    media_type: response.data.media_type,
    file_size_bytes: response.data.file_size_bytes,
    mime_type: response.data.mime_type,
    watermark_text: response.data.watermark_text,
    file,
  };
};

export const checkNearbyDuplicates = async (
  lat: number,
  lng: number,
  categoryId?: number | null,
  radiusMeters: number = 100
): Promise<DuplicateCheckResult> => {
  const response = await api.post<DuplicateCheckResult>("/api/v1/incidents/check-duplicates", {
    latitude: lat,
    longitude: lng,
    category_id: categoryId || null,
    radius_meters: radiusMeters,
  });
  return response.data;
};

export const submitIncidentReport = async (
  formData: ReportFormData
): Promise<IncidentSubmissionResult> => {
  if (!formData.location) {
    throw new Error("Phản ánh còn thiếu thông tin vị trí.");
  }

  const payload = {
    category_id: formData.category_id,
    title: formData.title,
    description: formData.description,
    severity: formData.severity,
    latitude: formData.location.latitude,
    longitude: formData.location.longitude,
    address_text: formData.location.address_text,
    is_anonymous: formData.is_anonymous,
    reporter_phone: formData.reporter_phone,
    media: formData.media.map((m) => ({
      file_url: m.file_url,
      thumbnail_url: m.thumbnail_url,
      media_type: m.media_type,
      file_size_bytes: m.file_size_bytes,
      mime_type: m.mime_type,
    })),
  };

  const response = await api.post<IncidentSubmissionResult>("/api/v1/incidents", payload);
  return response.data;
};

export const reverseGeocodeCoordinates = async (
  lat: number,
  lng: number
): Promise<IncidentLocation> => {
  const inBounds = isCoordinatesInHCMC(lat, lng);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GreenSpot-EcoReport-HCMC/1.0",
      },
    });

    if (!res.ok) {
      throw new Error("Nominatim reverse geocode failed");
    }

    const data = await res.json();
    const address = data.address || {};
    const displayName = data.display_name || "";

    // Tìm tên quận/huyện
    let districtName =
      address.city_district ||
      address.suburb ||
      address.county ||
      address.quarter ||
      "";

    // Ghép địa chỉ ngắn gọn dễ đọc
    const parts: string[] = [];
    if (address.house_number) parts.push(address.house_number);
    if (address.road) parts.push(address.road);
    if (address.quarter || address.suburb) parts.push(address.quarter || address.suburb);
    if (districtName) parts.push(districtName);
    parts.push("Thành phố Hồ Chí Minh");

    const formattedAddress = parts.length > 2 ? parts.join(", ") : displayName;

    // Kiểm tra tính hợp lệ trong 22 quận/huyện
    const matchesDistrict = HCMC_DISTRICT_KEYWORDS.some(
      (d) =>
        displayName.toLowerCase().includes(d.toLowerCase()) ||
        districtName.toLowerCase().includes(d.toLowerCase())
    );

    return {
      latitude: lat,
      longitude: lng,
      address_text: formattedAddress || `Tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      district_name: districtName || "TP. Hồ Chí Minh",
      is_within_hcmc: inBounds || matchesDistrict,
    };
  } catch (err) {
    console.warn("Reverse geocode fallback to coords:", err);
    return {
      latitude: lat,
      longitude: lng,
      address_text: `Vị trí tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)} (TP. Hồ Chí Minh)`,
      district_name: "TP. Hồ Chí Minh",
      is_within_hcmc: inBounds,
    };
  }
};

