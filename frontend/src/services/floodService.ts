// Service gọi API Flood Monitoring từ Backend FastAPI
// Endpoint base: /api/v1/flood-points, /api/v1/flood-geojson

import type { FeatureCollection } from "geojson";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FloodLevel = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

export interface FloodPoint {
  id: number;
  road: string;
  district: string;
  lat: number;
  lng: number;
  water_depth_cm: number;
  level: FloodLevel;
  source: string;
  description: string;
  updated_at: string;
}

export const FLOOD_LEVEL_CONFIG: Record<
  FloodLevel,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  LOW: {
    label: "Thấp",
    color: "#22c55e",
    bgColor: "#dcfce7",
    textColor: "#166534",
  },
  MEDIUM: {
    label: "Trung bình",
    color: "#eab308",
    bgColor: "#fef9c3",
    textColor: "#854d0e",
  },
  HIGH: {
    label: "Cao",
    color: "#f97316",
    bgColor: "#ffedd5",
    textColor: "#9a3412",
  },
  EMERGENCY: {
    label: "Khẩn cấp",
    color: "#dc2626",
    bgColor: "#fee2e2",
    textColor: "#991b1b",
  },
};

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Lấy danh sách điểm ngập, có thể lọc theo mức độ và/hoặc quận
 */
export async function fetchFloodPointsAPI(
  level?: FloodLevel | "ALL",
  district?: string
): Promise<FloodPoint[]> {
  try {
    const url = new URL(`${API_BASE_URL}/api/v1/flood-points`);
    if (level && level !== "ALL") {
      url.searchParams.set("level", level);
    }
    if (district) {
      url.searchParams.set("district", district);
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Không thể kết nối API /api/v1/flood-points:", err);
    return [];
  }
}

/**
 * Lấy chi tiết 1 điểm ngập
 */
export async function fetchFloodPointByIdAPI(
  pointId: number
): Promise<FloodPoint | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/flood-points/${pointId}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Không thể kết nối API /api/v1/flood-points/${pointId}:`, err);
    return null;
  }
}

/**
 * Lấy GeoJSON FeatureCollection các điểm ngập cho hiển thị bản đồ
 */
export async function fetchFloodGeoJsonAPI(
  level?: FloodLevel | "ALL"
): Promise<FeatureCollection | null> {
  try {
    const url = new URL(`${API_BASE_URL}/api/v1/flood-geojson`);
    if (level && level !== "ALL") {
      url.searchParams.set("level", level);
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Không thể kết nối API /api/v1/flood-geojson:", err);
    return null;
  }
}
