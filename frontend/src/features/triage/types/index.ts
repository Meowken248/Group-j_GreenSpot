// Type definitions for STT 39 (AI Triage & XAI) and STT 40 (Spatial Facility Buffer Analysis)

export type TriageScreenStep = "SCREEN_1_SUMMARY" | "SCREEN_2_EXPLAIN" | "SCREEN_3_OVERRIDE_POPUP";
export type SpatialScreenStep = "SCREEN_1_MAP_BUFFER" | "SCREEN_2_FACILITY_LIST" | "SCREEN_3_FACILITY_DETAIL";

export interface TriageIncidentSummaryItem {
  incident_id: string;
  tracking_code: string;
  title: string;
  description: string;
  address_text: string;
  latitude: number;
  longitude: number;
  severity: string;
  ai_suggested_priority: string;
  ai_triage_score: number;
  ai_summary?: string | null;
  media_urls: string[];
  created_at: string;
  version: number;
}

export interface TriageEvaluationData {
  incident_id: string;
  tracking_code: string;
  title: string;
  description: string;
  address_text: string;
  latitude: number;
  longitude: number;
  media_urls: string[];
  reporter_name?: string | null;
  created_at: string;

  // Khối Tóm tắt AI
  ai_summary?: string | null;
  is_too_short: boolean;
  summary_message?: string | null;

  // Khối Ưu tiên & XAI
  ai_triage_score: number;
  ai_suggested_priority: string;
  priority_color: "red" | "orange" | "yellow" | "green";
  sla_response_hours: number;
  sla_resolve_hours: number;

  // Giải trình rủi ro (Risk Factors)
  base_severity_score: number;
  proximity_risk_score: number;
  scale_factor_score: number;
  urgency_nlp_score: number;
  risk_factors: string[];
  nearby_sensitive_facility?: string | null;

  current_priority: string;
  status: string;
  version: number;
}

export interface RegenerateSummaryResponse {
  incident_id: string;
  ai_summary: string;
  generated_at: string;
}

export interface TriageActionResponse {
  success: boolean;
  message: string;
  incident_id: string;
  updated_priority: string;
  sla_deadline?: string | null;
  new_version: number;
}

export interface AuditLogItem {
  log_id: string;
  action: string;
  old_priority?: string | null;
  new_priority?: string | null;
  risk_score?: number | null;
  reason?: string | null;
  performed_by_name: string;
  created_at: string;
}

// STT 40: Spatial Facility Types
export interface FacilityItem {
  facility_id: number;
  facility_name: string;
  facility_type: string;
  address: string;
  distance_meters: number;
  distance_display: string;
  is_danger_proximity: boolean;
  is_immediate_risk: boolean;
  contact_phone?: string | null;
  vulnerability_level: string;
  latitude: number;
  longitude: number;
}

export interface FacilityListResponse {
  incident_id: string;
  incident_title: string;
  incident_lat: number;
  incident_lng: number;
  radius_meters: number;
  total_found: number;
  type_counts: Record<string, number>;
  has_critical_nearby: boolean;
  facilities: FacilityItem[];
}

export interface FacilityDetailProfile {
  facility_id: number;
  facility_name: string;
  facility_type: string;
  address: string;
  contact_phone?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  capacity_people?: number | null;
  vulnerability_level: string;
  incident_distance_meters?: number | null;
  incident_distance_display?: string | null;
  directions_url: string;
  can_call: boolean;
  can_alert: boolean;
}

export interface SendAlertResponse {
  success: boolean;
  message: string;
  facility_id: number;
  facility_name: string;
  sent_at: string;
}
