export type AlertSeverity = "YELLOW" | "ORANGE" | "RED";
export type AlertStatus = "DRAFT" | "ACTIVE" | "RESOLVED" | "REVOKED";

export interface EnvironmentalAlert {
  alert_id: string;
  alert_code: string;
  title: string;
  category: "AIR" | "WATER" | "WASTE" | "HAZARDOUS" | string;
  severity_level: AlertSeverity;
  status: AlertStatus;
  affected_districts: string[];
  description: string;
  safety_advice: string;
  template_code?: string;
  published_at?: string;
  expires_at?: string;
  resolved_at?: string;
  resolved_note?: string;
  revoked_at?: string;
  revoke_reason?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AlertListResponse {
  items: EnvironmentalAlert[];
  total: number;
  active_count: number;
  draft_count: number;
  resolved_count: number;
  revoked_count: number;
}

export interface AlertTemplate {
  code: string;
  title: string;
  category: string;
  severity_level: AlertSeverity;
  default_description: string;
  default_safety_advice: string;
}

export interface AlertCreateInput {
  title: string;
  category: string;
  severity_level: AlertSeverity;
  affected_districts: string[];
  description: string;
  safety_advice: string;
  template_code?: string;
  expires_at?: string;
  publish_now: boolean;
}

export interface AlertUpdateInput {
  title?: string;
  category?: string;
  severity_level?: AlertSeverity;
  affected_districts?: string[];
  description?: string;
  safety_advice?: string;
  expires_at?: string;
  amendment_note?: string;
}

// Types cho Chức năng 29: Notifications
export interface AppNotification {
  notification_id: string;
  user_id?: string;
  alert_id?: string;
  incident_id?: string;
  notification_type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  target_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  unread_count: number;
  total: number;
}

export interface PushStatsResponse {
  total_notifications_sent: number;
  unread_count: number;
  read_count: number;
  open_rate_percentage: number;
}

// Types cho Chức năng 34: Quản trị Ngưỡng & Quy chuẩn Cảnh báo
export interface ThresholdRuleItem {
  severity_level: "YELLOW" | "ORANGE" | "RED";
  severity_name: string;
  radius_km: number;
  default_safety_advice: string;
  color_hex?: string;
  min_aqi_threshold?: number;
  description?: string;
}

export interface AlertConfigResponse {
  rules: ThresholdRuleItem[];
  default_radius_km: number;
  hotline_number: string;
  updated_at?: string;
  note: string;
}

export interface UpdateThresholdsRequest {
  rules: ThresholdRuleItem[];
  hotline_number?: string;
}

// Types cho Chức năng 35: Kênh Cứu Nạn Khẩn Cấp SOS & Hotline
export interface SOSSubmitRequest {
  phone_number: string;
  incident_type: "CHAY_DOC" | "TRAN_HOA_CHAT" | "NUOC_DOC" | "KHAC";
  latitude: number;
  longitude: number;
  address_text?: string;
  note?: string;
}

export interface SOSSubmitResponse {
  success: boolean;
  incident_id: string;
  tracking_code: string;
  message: string;
  severity: string;
  submitted_at: string;
  hotline: string;
}

export interface SOSBroadcastBannerStatus {
  is_active: boolean;
  title?: string;
  message?: string;
  affected_areas?: string[];
  severity_level?: string;
  activated_at?: string;
  hotline: string;
}

export interface ToggleSOSBannerRequest {
  is_active: boolean;
  title?: string;
  message?: string;
  affected_areas?: string[];
  severity_level?: string;
}

export interface SOSIncidentItem {
  incident_id: string;
  tracking_code: string;
  title: string;
  description: string;
  address_text: string;
  latitude: number;
  longitude: number;
  phone: string;
  severity: string;
  status: string;
  created_at: string;
}

// Types cho Chức năng 31: Bản đồ giám sát cảnh báo ô nhiễm trực quan
export interface LiveMapPoint {
  point_id: string;
  tracking_code: string;
  title: string;
  category: "AIR" | "WATER" | "WASTE" | "HAZARDOUS" | string;
  severity_level: "YELLOW" | "ORANGE" | "RED" | string;
  latitude: number;
  longitude: number;
  district: string;
  address: string;
  description: string;
  safety_advice: string;
  status: string;
  image_url?: string | null;
  created_at: string;
}

// Types cho Chức năng 32: Đăng ký nhận tin cảnh báo cá nhân hóa theo khu vực
export interface AlertSubscriptionPreference {
  subscription_id: string;
  user_id: string;
  subscribed_districts: string[];
  min_severity_level: "ALL" | "ORANGE_RED" | "RED_ONLY" | string;
  notify_in_app: boolean;
  notify_email: boolean;
  email_address?: string;
  is_muted: boolean;
  updated_at: string;
}

