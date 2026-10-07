/**
 * floodService.ts
 * Tích hợp 3 Nguồn Dữ liệu Ngập lụt cho Hệ thống EcoReport & WebGIS:
 * 1. Open-Meteo Global Flood API (Copernicus GloFAS lưu lượng sông m³/s & dự báo 7 ngày).
 * 2. Cổng Dữ liệu Mở TP.HCM / Danh mục điểm ngập lịch sử Sở Xây dựng (30+ điểm ngập, độ sâu chuẩn, trạm bơm).
 * 3. Mô hình Cảnh báo ngập kết hợp Lượng mưa thời gian thực (Rainfall Trigger & Flood Risk Assessment).
 */

const BACKEND_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface FloodHotspotProperties {
  id: string;
  name: string;
  street: string;
  district: string;
  cause: string; // TRIỀU CƯỜNG | MƯA LỚN | MƯA KẾT HỢP TRIỀU CƯỜNG
  historical_depth_cm: number;
  length_m: number;
  pump_station?: string;
  detour_advice?: string;
  source: string;

  // Real-time dynamic indicators
  current_risk_level: "SAFE" | "ALERT" | "WARNING" | "CRITICAL";
  current_risk_label: string;
  current_rainfall_mm: number;
  estimated_depth_cm: number;
  glofas_discharge_m3s?: number;
  updated_at: string;
}

export interface FloodHotspotFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  properties: FloodHotspotProperties;
}

export interface FloodSummary {
  totalHotspots: number;
  safeCount: number;
  alertCount: number;
  warningCount: number;
  criticalCount: number;
  currentRainfallMm: number;
  saigonRiverDischargeM3s: number;
  maxEstimatedDepthCm: number;
  statusEvaluation: string;
}

export interface FloodRoadSegmentProperties {
  id: string;
  spot_id: string;
  name: string;
  street: string;
  district: string;
  risk_level: "SAFE" | "ALERT" | "WARNING" | "CRITICAL";
  risk_label: string;
  color: string;
  glow_color: string;
  estimated_depth_cm: number;
  historical_depth_cm: number;
  length_m: number;
  detour_advice?: string;
}

export interface FloodRoadSegmentFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [[lng, lat], ...]
  };
  properties: FloodRoadSegmentProperties;
}

export interface FloodGeoJSONResponse {
  success: boolean;
  type: "FeatureCollection";
  total: number;
  summary: FloodSummary;
  features: FloodHotspotFeature[];
  road_segments?: FloodRoadSegmentFeature[];
}

export interface GloFASForecastDay {
  date: string;
  discharge: number;
  discharge_max: number;
  discharge_min: number;
}

export interface GloFASForecastResponse {
  success: boolean;
  latitude: number;
  longitude: number;
  river_name: string;
  current_discharge_m3s: number;
  flood_danger_level: string;
  flood_danger_label: string;
  forecast_7d: GloFASForecastDay[];
  source: string;
  note: string;
}

// 1. Gọi API danh sách điểm đen ngập lụt GeoJSON (3 nguồn tích hợp)
export async function fetchFloodHotspotsAPI(
  rainMm?: number
): Promise<FloodGeoJSONResponse | null> {
  const url = new URL(`${BACKEND_BASE_URL}/api/v1/flood/hotspots`);
  if (rainMm !== undefined) {
    url.searchParams.append("rain_mm", rainMm.toString());
  }

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[FloodService] Backend flood API offline, fallback to local dataset:", err);
    return null;
  }
}

// 2. Gọi API tra cứu dự báo lũ sông ngòi GloFAS theo tọa độ GPS
export async function fetchGloFASForecastAPI(
  lat: number = 10.7765,
  lng: number = 106.7009
): Promise<GloFASForecastResponse | null> {
  const url = `${BACKEND_BASE_URL}/api/v1/flood/forecast?lat=${lat}&lng=${lng}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[FloodService] Failed to fetch GloFAS forecast, calling Open-Meteo direct:", err);
    // Direct client fallback to Open-Meteo Flood API
    try {
      const omUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}&daily=river_discharge,river_discharge_mean,river_discharge_max,river_discharge_min&forecast_days=7`;
      const omRes = await fetch(omUrl, { signal: AbortSignal.timeout(6000) });
      const omJson = await omRes.json();
      const daily = omJson.daily || {};
      const times = daily.time || [];
      const discharges = daily.river_discharge || [];
      const maxD = daily.river_discharge_max || [];
      const minD = daily.river_discharge_min || [];

      const forecast7d: GloFASForecastDay[] = times.map((t: string, i: number) => ({
        date: t,
        discharge: discharges[i] ?? 2350,
        discharge_max: maxD[i] ?? 2800,
        discharge_min: minD[i] ?? 2100,
      }));

      const currQ = forecast7d[0]?.discharge ?? 2400;

      return {
        success: true,
        latitude: lat,
        longitude: lng,
        river_name: "Lưu vực Sông Sài Gòn - Đồng Nai",
        current_discharge_m3s: currQ,
        flood_danger_level: currQ > 4000 ? "WARNING" : currQ > 2800 ? "ALERT" : "SAFE",
        flood_danger_label: currQ > 4000 ? "Báo động lũ cấp 2" : "Lưu lượng dòng chảy bình thường",
        forecast_7d: forecast7d,
        source: "Open-Meteo Global Flood API (Copernicus GloFAS Trực tiếp)",
        note: "Dữ liệu mô hình dòng chảy thủy văn toàn cầu.",
      };
    } catch {
      return null;
    }
  }
}
