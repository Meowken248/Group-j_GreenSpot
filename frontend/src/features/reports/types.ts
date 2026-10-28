export interface OpenDataIncidentRecord {
  tracking_code: string;
  category_name: string;
  severity: string;
  status: string;
  district_name: string;
  reported_date: string;
  resolved_date?: string;
  sla_hours: number;
  sla_status: "ON_TIME" | "OVERDUE" | "IN_PROGRESS" | string;
}

export interface TopCategoryStat {
  category_name: string;
  count: number;
  percentage: number;
}

export interface PublicReportSummary {
  period_type: "MONTH" | "QUARTER" | "YEAR" | string;
  period_code: string;
  period_label: string;
  district_filter: string;
  total_incidents: number;
  resolved_incidents: number;
  in_progress_incidents: number;
  resolution_rate: number;
  critical_alerts_count: number;
  average_aqi?: number;
  air_quality_status: string;
  top_categories: TopCategoryStat[];
  open_data_records_count: number;
  generated_at: string;
  data_classification: string;
}

// Types cho Chức năng 33: Bảng Tổng quan Chỉ số Hiện trạng Môi trường Đô thị Công cộng
export interface PollutionDistributionItem {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DistrictComparisonItem {
  district: string;
  active_alerts: number;
  resolved_count: number;
  clean_rate: number;
}

export interface TopGreenWardItem {
  rank: number;
  ward: string;
  district: string;
  green_score: number;
  badge: string;
}

export interface PublicDashboardData {
  active_alerts_count: number;
  resolved_incidents_count: number;
  safety_rate_pct: number;
  avg_response_hours: number;
  pollution_distribution: PollutionDistributionItem[];
  district_comparison: DistrictComparisonItem[];
  top_green_wards: TopGreenWardItem[];
  last_updated_at: string;
  cached: boolean;
}

