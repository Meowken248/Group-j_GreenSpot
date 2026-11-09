/**
 * Type Definitions cho STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
 * Phục vụ 5 màn hình:
 * 1. Màn 1/5: Giao diện phát tín hiệu cấp cứu khẩn cấp (Emergency SOS Dispatch)
 * 2. Màn 2/5: Popup xác nhận khẩn cấp (GỬI YÊU CẦU CỨU HỘ?)
 * 3. Màn 3/5: Giao diện phân bổ cứu hộ Tình nguyện viên & Đội phản ứng nhanh
 * 4. Màn 4/5: Trung tâm theo dõi hành trình cứu nạn (Live Tracking & Stepper)
 * 5. Màn 5/5: Popup xác nhận huỷ yêu cầu SOS (HUỶ YÊU CẦU SOS?)
 */

export type SosStatus = "PENDING" | "ACCEPTED" | "EN_ROUTE" | "COMPLETED" | "CANCELLED";

export type SeverityLevel = "CRITICAL" | "URGENT" | "HIGH" | "NORMAL";

export interface CreateFloodSosPayload {
  victim_name?: string;
  victim_phone?: string;
  total_victims: number;
  elderly_count: number;
  children_count: number;
  medical_urgent_count: number;
  description: string;
  image_url?: string | null;
  latitude: number;
  longitude: number;
  address_text: string;
  district?: string;
  ward?: string;
  severity_level?: SeverityLevel;
  flood_depth_meters?: number;
}

export interface CreateFloodSosResponse {
  success: boolean;
  request_id: string;
  sos_code: string;
  status: SosStatus;
  message: string;
  estimated_nearby_volunteers: number;
  broadcast_radius_km: number;
}

export interface VolunteerSosCard {
  request_id: string;
  sos_code: string;
  victim_name: string;
  victim_phone: string;
  total_victims: number;
  elderly_count: number;
  children_count: number;
  medical_urgent_count: number;
  description: string;
  image_url?: string | null;
  latitude: number;
  longitude: number;
  address_text: string;
  district?: string | null;
  severity_level: SeverityLevel;
  flood_depth_meters?: number | null;
  distance_meters: number;
  distance_text: string;
  status: SosStatus;
  created_at: string;
  version: number;
}

export interface AcceptSosPayload {
  version: number;
  volunteer_latitude: number;
  volunteer_longitude: number;
  team_name?: string;
  vehicle_type?: string;
}

export interface SkipSosPayload {
  reason?: string;
}

export interface ChatMessageItem {
  message_id: string;
  sender_type: "VICTIM" | "RESCUER" | "SYSTEM";
  sender_name: string;
  content: string;
  created_at: string;
  delivered_to_admin?: boolean;
  delivered_to_team?: boolean;
}

export interface SendChatMessagePayload {
  sender_type: "VICTIM" | "RESCUER";
  sender_name: string;
  content: string;
}

export interface UpdateSosProgressPayload {
  status: SosStatus;
  rescuer_latitude: number;
  rescuer_longitude: number;
  version: number;
}

export interface SosTrackingDetail {
  request_id: string;
  sos_code: string;
  status: SosStatus;
  status_step: number; // 1: Đã gửi, 2: Đã nhận, 3: Đang đến, 4: Hoàn tất, 0: Đã huỷ
  victim_name: string;
  victim_phone: string;
  total_victims: number;
  elderly_count: number;
  children_count: number;
  medical_urgent_count: number;
  description: string;
  image_url?: string | null;
  latitude: number;
  longitude: number;
  address_text: string;
  assigned_rescuer_name?: string | null;
  assigned_rescuer_phone?: string | null;
  assigned_team_name?: string | null;
  assigned_vehicle_type?: string | null;
  rescuer_latitude?: number | null;
  rescuer_longitude?: number | null;
  rescuer_distance_meters?: number | null;
  rescuer_eta_minutes?: number | null;
  distance_display?: string | null;
  messages: ChatMessageItem[];
  rating?: number | null;
  feedback_notes?: string | null;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  version: number;
}

export interface CancelSosPayload {
  version: number;
  cancel_reason?: string;
  is_confirmed_near?: boolean;
}

export interface CancelSosResponse {
  success: boolean;
  requires_near_confirmation: boolean;
  warning_message?: string | null;
  message: string;
}

export interface CompleteSosRatingPayload {
  rating: number;
  feedback_notes?: string;
}

export type ActiveSosRoleView = "CITIZEN_DISPATCH" | "VOLUNTEER_DASHBOARD" | "LIVE_TRACKING";
