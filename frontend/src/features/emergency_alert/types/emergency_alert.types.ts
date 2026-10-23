/**
 * TypeScript Interfaces cho Tính năng STT 45:
 * Hệ thống Cảnh báo Khẩn cấp theo Vị trí & Safety Check
 * Chuẩn hóa 100% với 4 màn hình Prototype & Backend API Contracts
 */

export type AlertType = "FLOOD" | "STORM" | "TIDE" | "POLLUTION";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface AlertEstimateRequest {
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export interface AlertEstimateResponse {
  estimated_recipients: number;
  radius_km: number;
  center_point: {
    lat: number;
    lng: number;
  };
  query_timestamp: string;
  display_message: string;
}

export interface BroadcastAlertRequest {
  alert_type: AlertType;
  title: string;
  content: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  severity?: AlertSeverity;
  hotline_phone?: string;
  safe_routes_summary?: string;
  peak_time_estimate?: string;
  expires_in_hours?: number;
}

export interface BroadcastAlertResponse {
  success: boolean;
  alert_id: string;
  title: string;
  alert_type: AlertType;
  recipients_count: number;
  status: AlertStatus;
  issued_at: string;
  message: string;
}

export interface BroadcastHistoryItem {
  alert_id: string;
  alert_type: AlertType;
  title: string;
  content: string;
  severity: AlertSeverity;
  status: AlertStatus;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  recipients_count: number;
  issued_at: string;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  version: number;
}

export interface CancelAlertRequest {
  cancellation_reason: string;
  version: number;
}

export interface UserActiveAlertResponse {
  has_active_alert: boolean;
  alert_id?: string | null;
  alert_type?: AlertType | null;
  title?: string | null;
  content?: string | null;
  severity?: AlertSeverity | null;
  distance_meters?: number | null;
  radius_meters?: number | null;
  situation_message?: string | null;
  hotline_phone?: string | null;
  safe_routes_summary?: string | null;
  issued_at?: string | null;
}

export interface EmergencySOSRequest {
  alert_id?: string;
  latitude: number;
  longitude: number;
  location_address: string;
  phone_number?: string;
  notes?: string;
}

export interface EmergencySOSResponse {
  success: boolean;
  sos_id: string;
  message: string;
  hotlines: {
    fire_rescue: string;
    ambulance: string;
    local_operations_center: string;
  };
  dispatch_reference_id?: string | null;
}

export interface FriendContact {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  status?: string;
}

export interface SafetyCheckInitResponse {
  user_id: string;
  full_name: string;
  latitude: number;
  longitude: number;
  location_address: string;
  is_gps_verified: boolean;
  current_safe_status: string;
  friends: FriendContact[];
  message: string;
}

export interface MarkSafeSelfRequest {
  latitude: number;
  longitude: number;
  location_address: string;
  alert_id?: string;
  safety_status?: "SAFE" | "NEEDS_HELP" | "UNSPECIFIED";
  status_message?: string;
}

export interface MarkSafeSelfResponse {
  success: boolean;
  check_id: string;
  is_safe: boolean;
  message: string;
}

export interface SendSafetyCheckToFriendsRequest {
  friend_user_ids: string[];
  latitude: number;
  longitude: number;
  location_address: string;
  alert_id?: string;
  status_message?: string;
}

export interface SendSafetyCheckToFriendsResponse {
  success: boolean;
  sent_count: number;
  friend_user_ids: string[];
  message: string;
  has_sms_fallback: boolean;
  sms_fallback_note?: string | null;
}
