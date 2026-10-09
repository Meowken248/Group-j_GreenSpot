export interface IncidentMediaItem {
  file_url: string;
  thumbnail_url: string;
  media_type: "IMAGE" | "VIDEO";
  file_size_bytes: number;
  mime_type: string;
}

export interface IncidentListItem {
  incident_id: string;
  tracking_code: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "EMERGENCY" | "NORMAL";
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";
  address_text: string;
  latitude: number;
  longitude: number;
  category_id: number;
  category_name: string;
  unit_id?: number | null;
  unit_name?: string | null;
  is_anonymous: boolean;
  reporter_name?: string | null;
  reporter_phone_masked?: string | null;
  sla_deadline?: string | null;
  is_sla_overdue: boolean;
  created_at: string;
  thumbnail_url?: string | null;
  media: IncidentMediaItem[];
}

export interface IncidentManagementStats {
  total: number;
  unverified: number;
  in_progress: number;
  resolved: number;
  rejected: number;
  critical: number;
  sla_warning: number;
}

export interface IncidentListResponse {
  items: IncidentListItem[];
  total: number;
  page: number;
  limit: number;
  stats: IncidentManagementStats;
}

export interface IncidentFilterParams {
  severity?: string;
  status?: string;
  unit_id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IncidentDetail {
  incident_id: string;
  tracking_code: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  address_text: string;
  latitude: number;
  longitude: number;
  category: {
    category_id: number;
    category_code: string;
    name: string;
    sla_hours: number;
    color_hex: string;
    icon_name: string;
  };
  unit_id?: number | null;
  unit_name?: string | null;
  sla_deadline?: string | null;
  sla_hours: number;
  created_at: string;
  media: IncidentMediaItem[];
  upvotes_count: number;
  is_anonymous: boolean;
  reporter_phone_masked?: string | null;
}

