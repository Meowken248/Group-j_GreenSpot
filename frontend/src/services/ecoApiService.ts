import type { EcoLocation } from "../data/hcmEcoLocations";
import type { HCMLocation } from "../data/hcmLocations";
import type { FeatureCollection } from "geojson";

// API Base URL từ biến môi trường Vite hoặc localhost mặc định
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface EcoLocationsApiResponse {
  success: boolean;
  total: number;
  counts: {
    all: number;
    incident: number;
    green_spot: number;
    recycling: number;
    sensor: number;
  };
  data: EcoLocation[];
}

export interface LiveWeatherResponse {
  success: boolean;
  city: string;
  temp: string;
  temperature: number;
  desc: string;
  humidity: string;
  wind: string;
  aqi: number;
  aqiStatus: string;
  pm25: number;
  pm10: number;
  updatedAt: string;
}

/**
 * 1. Tải danh sách địa điểm môi trường trực tiếp từ Backend API (PostgreSQL/PostGIS)
 */
export async function fetchEcoLocationsAPI(category?: string): Promise<EcoLocationsApiResponse | null> {
  try {
    const url = new URL(`${API_BASE_URL}/api/v1/eco-locations`);
    if (category && category !== "all") {
      url.searchParams.set("category", category);
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data: EcoLocationsApiResponse = await res.json();
    return data;
  } catch (err) {
    console.warn("Không thể kết nối API /api/v1/eco-locations:", err);
    return null;
  }
}

/**
 * 2. Tải GeoJSON Ranh giới các quận/huyện TP.HCM từ Backend API (PostGIS MultiPolygon)
 */
export async function fetchDistrictBoundariesAPI(): Promise<FeatureCollection | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/spatial/districts`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data: FeatureCollection = await res.json();
    return data;
  } catch (err) {
    console.warn("Không thể kết nối API /api/v1/spatial/districts:", err);
    return null;
  }
}

/**
 * 3. Tải danh sách điểm ngắm cảnh Quick Tour 3D từ Backend API
 */
export async function fetchLandmarksAPI(): Promise<HCMLocation[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/spatial/landmarks`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (err) {
    console.warn("Không thể kết nối API /api/v1/spatial/landmarks:", err);
  }
  return [];
}

/**
 * 4. Tải dữ liệu Khí hậu & Chỉ số Không khí AQI thời gian thực của TP.HCM từ API
 */
export async function fetchLiveWeatherAPI(): Promise<LiveWeatherResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/weather/current`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data: LiveWeatherResponse = await res.json();
    return data;
  } catch (err) {
    console.warn("Không thể kết nối API /api/v1/weather/current:", err);
    return null;
  }
}

/**
 * 5. Tải danh sách địa điểm gần nhất quanh tọa độ GPS người dùng (PostGIS Spatial Nearest Query)
 */
export async function fetchNearestLocationsAPI(
  lat: number,
  lng: number,
  radiusKm = 5.0,
  category?: string
): Promise<any> {
  try {
    const url = new URL(`${API_BASE_URL}/api/v1/spatial/nearest`);
    url.searchParams.set("lat", lat.toString());
    url.searchParams.set("lng", lng.toString());
    url.searchParams.set("radius_km", radiusKm.toString());
    if (category && category !== "all") {
      url.searchParams.set("category", category);
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Không thể kết nối API /api/v1/spatial/nearest:", err);
    return null;
  }
}

/**
 * 6. Tải GeoJSON Bản đồ nhiệt Thời tiết & Chất lượng không khí (Weather & AQI Heatmap) toàn quốc
 */
export async function fetchWeatherHeatmapAPI(): Promise<FeatureCollection | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/weather/heatmap`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data: FeatureCollection = await res.json();
    return data;
  } catch (err) {
    console.warn("Không thể kết nối API /api/v1/weather/heatmap:", err);
    return null;
  }
}

