export type IncidentType =
  | "ALL"
  | "SPONTANEOUS_DUMP"
  | "FLOODING"
  | "WATER_POLLUTION"
  | "AIR_POLLUTION";

export type TimeRange =
  | "7_DAYS"
  | "30_DAYS"
  | "THIS_QUARTER"
  | "CUSTOM";

export type RiskLevel =
  | "VERY_CRITICAL"
  | "CRITICAL"
  | "POTENTIAL_RISK";

export interface HotspotCluster {
  id: string;
  cluster_code: string;
  title: string;
  incident_type: string;
  incident_count: number;
  latitude: number;
  longitude: number;
  radius_meter: number;
  density_score: number;
  risk_level: RiskLevel;
  trend: string;
  forecast_48h: string;
  district: string;
  active_dispatch_order_id: string | null;
  last_updated: string;
}

export interface TopHotspotItem {
  id: string;
  rank: number;
  title: string;
  district: string;
  incident_count: number;
  risk_level: RiskLevel;
  trend: string;
}

export interface HotspotFilterParams {
  incident_type?: IncidentType;
  time_range?: TimeRange;
  start_date?: string;
  end_date?: string;
}

export interface HotspotMapResponse {
  clusters: HotspotCluster[];
  top_5: TopHotspotItem[];
  total_clusters: number;
  total_incidents: number;
  status_message: string;
}

export interface AreaOptionItem {
  id: string;
  name: string;
  type: "DISTRICT" | "HOTSPOT";
}

export interface DailyForecastPoint {
  date: string;
  day_of_week: string;
  predicted_incidents: number;
  ci_lower_95: number;
  ci_upper_95: number;
  risk_level: string;
  weather_condition: string;
  tide_level_m: number | null;
  note: string | null;
}

export interface ForecastResponse {
  target_id: string;
  target_name: string;
  target_type: "DISTRICT" | "HOTSPOT";
  model_accuracy_pct: number;
  has_weather_warning: boolean;
  weather_warning_message: string | null;
  points: DailyForecastPoint[];
  peak_risk_summary: string;
  peak_risk_date: string;
  recommendations: string[];
}

export interface ExportReportRequest {
  format: "PDF" | "EXCEL";
  target_id: string;
  time_range: string;
}

export interface ExportReportResponse {
  success: boolean;
  file_name: string;
  file_url: string;
  download_url: string;
  message: string;
}

export interface SuggestedDispatchOrder {
  title: string;
  incident_type: string;
  priority: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  target_deadline_hours: number;
  description: string;
}

export interface HotspotDetailResponse {
  id: string;
  cluster_code: string;
  title: string;
  incident_type: string;
  incident_type_label: string;
  incident_count: number;
  risk_level: RiskLevel;
  risk_level_label: string;
  trend: string;
  forecast_48h: string;
  district: string;
  latitude: number;
  longitude: number;
  active_dispatch_order_id: string | null;
  has_active_order: boolean;
  suggested_dispatch: SuggestedDispatchOrder;
}
