export type ReportStep = 1 | 2 | 3 | 4 | 5;

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface WasteCategoryItem {
  category_id: number;
  category_code: string;
  name: string;
  description?: string;
  default_severity: string;
  sla_hours: number;
  color_hex: string;
  icon_name: string;
  is_active: boolean;
}

export interface AttachedMedia {
  id: string;
  file_url: string;
  thumbnail_url: string;
  media_type: "IMAGE" | "VIDEO";
  file_size_bytes?: number;
  mime_type?: string;
  watermark_text?: string;
  is_uploading?: boolean;
  upload_error?: string;
  file?: File;
}

export interface IncidentLocation {
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  address_text: string;
  district_name?: string;
  is_within_hcmc: boolean;
}

export interface ReportFormData {
  category_id: number | null;
  category_code: string;
  category_name: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  media: AttachedMedia[];
  voice_text?: string;
  location: IncidentLocation | null;
  is_anonymous: boolean;
  reporter_phone?: string;
}

export interface DraftData {
  formData: ReportFormData;
  saved_at: string;
  current_step: ReportStep;
}

export interface DuplicateIncident {
  incident_id: string;
  tracking_code: string;
  title: string;
  category_name: string;
  address_text: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  created_at: string;
  status: string;
}

export interface DuplicateCheckResult {
  has_duplicate: boolean;
  duplicate_count: number;
  duplicates: DuplicateIncident[];
}

export interface IncidentSubmissionResult {
  incident_id: string;
  tracking_code: string;
  title: string;
  category_name: string;
  category_code: string;
  sla_hours: number;
  sla_deadline?: string;
  status: string;
  address_text: string;
  latitude: number;
  longitude: number;
  unit_name?: string;
  green_points_awarded: number;
  created_at: string;
  message: string;
}

export const INITIAL_FORM_DATA: ReportFormData = {
  category_id: null,
  category_code: "",
  category_name: "",
  title: "",
  description: "",
  severity: "MEDIUM",
  media: [],
  voice_text: "",
  location: null,
  is_anonymous: false,
  reporter_phone: "",
};

