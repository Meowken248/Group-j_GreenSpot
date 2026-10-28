export interface TimelineStep {
  step_key: string;
  title: string;
  is_completed: boolean;
  is_current: boolean;
  timestamp?: string;
  description: string;
}

export interface PublicIncidentDetail {
  incident_id: string;
  tracking_code: string;
  title: string;
  description: string;
  category_name: string;
  category_code: string;
  severity: string;
  status: string;
  address_text: string;
  latitude: number;
  longitude: number;
  reported_at: string;
  sla_deadline?: string;
  resolved_at?: string;
  is_sla_met?: boolean;
  reporter_phone_masked?: string;
  before_images: string[];
  after_images: string[];
  timeline: TimelineStep[];
  official_feedback?: string;
  verification_stats: {
    clean_count: number;
    dirty_count: number;
  };
}

export interface PublicSubscribeInput {
  tracking_code: string;
  contact_type: "EMAIL" | "PHONE";
  contact_value: string;
}

export interface PublicVerificationInput {
  tracking_code: string;
  is_clean_confirmed: boolean;
  comment?: string;
}
