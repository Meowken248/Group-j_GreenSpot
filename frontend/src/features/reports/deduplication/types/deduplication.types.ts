export interface DistrictOption {
  unit_id: number | null;
  name: string;
  unit_code?: string | null;
}

export interface DuplicateClusterListItem {
  cluster_id: string;
  cluster_code: string;
  cluster_name: string; // VD: "Nhóm 1", "Nhóm 2"
  report_count: number; // VD: 3, 2
  similarity_rate: number; // VD: 92.0, 85.0
  similarity_display: string; // VD: "giống 92%"
  district_name: string | null;
  status: string;
  gps_distance_m: number;
  time_diff_hours: number;
  visual_similarity: number;
  version: number;
}

export interface ClusterListResponse {
  total: number;
  items: DuplicateClusterListItem[];
}

export interface IncidentComparisonDetail {
  incident_id: string;
  tracking_code: string;
  reporter_name: string;
  reporter_phone?: string | null;
  title: string;
  description: string;
  address_text: string;
  latitude: number;
  longitude: number;
  created_at: string;
  created_at_display: string; // VD: "08:15 15/09"
  media_url: string;
  thumbnail_url?: string | null;
  version: number;
}

export interface AIAnalysisConclusion {
  similarity_rate: number;
  similarity_display: string; // VD: "Giống nhau: 92%"
  gps_distance_m: number;
  time_diff_hours: number;
  visual_similarity: number;
  recommended_primary_id: string;
  recommendation_reason: string;
  explanation: string;
}

export interface ComparisonResponse {
  cluster_id: string;
  cluster_name: string;
  report_a: IncidentComparisonDetail;
  report_b: IncidentComparisonDetail;
  ai_conclusion: AIAnalysisConclusion;
  version: number;
}

export interface MergeIncidentRequest {
  cluster_id: string;
  primary_incident_id: string;
  secondary_incident_id: string;
  version: number;
}

export interface MergeIncidentResponse {
  success: boolean;
  message: string; // "Người báo cáo nhận thông báo"
  cluster_id: string;
  primary_incident_id: string;
  secondary_incident_id: string;
  new_version: number;
  notification_sent_to?: string | null;
}

export interface MarkDistinctRequest {
  cluster_id: string;
  version: number;
}

export interface MarkDistinctResponse {
  success: boolean;
  message: string; // "Đã đánh dấu 2 báo cáo không trùng lặp"
  cluster_id: string;
}
