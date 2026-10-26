export interface DistrictRiskItem {
  unit_id?: number | null;
  district_name: string;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  risk_level_label: string;
  open_incidents: number;
  spontaneous_dumps: number;
  flood_points: number;
  threatened_facilities: number;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DailyTrendPoint {
  date: string;
  average_risk_score: number;
  open_incidents: number;
}

export interface TopDistrictAlertItem {
  rank: number;
  unit_id?: number | null;
  district_name: string;
  risk_score: number;
  risk_level: string;
  risk_level_label: string;
  open_incidents: number;
  spontaneous_dumps: number;
  flood_points: number;
  threatened_facilities: number;
  urgent_action_required: boolean;
}

export interface OverviewMetricsResponse {
  overall_risk_score: number;
  overall_risk_label: string;
  high_risk_district_count: number;
  high_risk_district_label: string;
  open_incident_count: number;
  open_incident_label: string;
  district_risks: DistrictRiskItem[];
  trend_30_days: DailyTrendPoint[];
  top_alert_districts: TopDistrictAlertItem[];
  has_critical_alert: boolean;
  critical_alert_message?: string | null;
  updated_at: string;
}

export type RiskPeriodType = "THIS_MONTH" | "THIS_QUARTER" | "LAST_6_MONTHS" | "CUSTOM";

export type RiskTypeCode = "DOMESTIC_WASTE" | "HAZARDOUS_WASTE" | "FLOOD" | "AIR_POLLUTION";

export interface FilterAnalysisRequest {
  district_ids?: number[];
  risk_types?: RiskTypeCode[];
  period: RiskPeriodType;
  start_date?: string;
  end_date?: string;
}

export interface QuantitativeStats {
  total_incidents: number;
  estimated_waste_volume_m3: number;
  sla_on_time_rate_percent: number;
  open_incidents: number;
  resolved_incidents: number;
}

export interface RiskTypeDistributionItem {
  type_code: string;
  type_name: string;
  count: number;
  percentage: number;
  color_hex: string;
}

export interface PeriodComparisonStats {
  current_period_score: number;
  previous_period_score: number;
  change_percent: number;
  trend_direction: "DECREASE" | "INCREASE" | "STABLE";
  is_positive: boolean;
  comparison_text: string;
  message: string;
}

export interface FilterAnalysisResponse {
  has_data: boolean;
  empty_message?: string | null;
  summary_table: QuantitativeStats;
  risk_type_distribution: RiskTypeDistributionItem[];
  period_comparison: PeriodComparisonStats;
  applied_filters?: Record<string, unknown>;
}

export interface DistrictDetailResponse {
  unit_id?: number | null;
  district_name: string;
  risk_score: number;
  risk_level: string;
  risk_score_text: string;
  pending_incidents_text: string;
  spontaneous_dumps_count: number;
  deep_flood_points_count: number;
  threatened_facilities_text: string;
  schools_count: number;
  hospitals_count: number;
  total_facilities_count: number;
  latitude: number;
  longitude: number;
  gis_map_link: string;
}
