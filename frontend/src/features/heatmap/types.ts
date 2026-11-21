export type HeatmapMode = "AQI" | "TEMPERATURE" | "RISK";

export interface HeatmapPoint {
  district_code: string;
  district_name: string;
  lat: number;
  lng: number;
  value: number;
  color_hex: string;
  level_label: string;
  is_warning: boolean;
  warning_message?: string | null;
}

export interface HeatmapLegendItem {
  label: string;
  range_text: string;
  color_hex: string;
}

export interface MultiModeHeatmapResponse {
  mode: HeatmapMode | string;
  timestamp: string;
  total_districts: number;
  points: HeatmapPoint[];
  legends: HeatmapLegendItem[];
}

export interface DistrictZoneDetail {
  district_code: string;
  district_name: string;
  lat: number;
  lng: number;
  aqi_value: number;
  aqi_level: string;
  aqi_color: string;
  temperature_c: number;
  temperature_level: string;
  temperature_color: string;
  risk_score: number;
  risk_level: string;
  risk_color: string;
  cleanup_rate: number;
  resolved_incidents: number;
  green_index: number;
  has_alert: boolean;
  alert_message?: string | null;
}
