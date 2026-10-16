/**
 * TypeScript Interfaces & Types cho STT 43:
 * Trung tâm điều phối tác nghiệp và phân công lệnh xử lý hiện trường
 */

export type DispatchStatus =
  | "ALL"
  | "ASSIGNED"     // Đã giao (Xám)
  | "EN_ROUTE"     // Đang đến (Cam)
  | "IN_PROGRESS"  // Đang xử lý (Vàng)
  | "COMPLETED"    // Hoàn tất (Xanh lục)
  | "CANCELLED";   // Đã huỷ (Xám nhạt)

export type DispatchPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface IncidentComboboxItem {
  incident_id: string;
  incident_code: string;
  title: string;
  category: string;
  urgency: string;
  location_address: string;
  district: string;
  ward?: string;
  latitude: number;
  longitude: number;
}

export interface TeamOptionItem {
  team_id: string;
  team_name: string;
  phone: string;
  current_status: "AVAILABLE" | "BUSY" | "EN_ROUTE";
  distance_km: number;
  distance_label: string;
  is_busy_with_urgent: boolean;
  latitude: number;
  longitude: number;
}

export interface DispatchOrderItem {
  order_id: string;
  order_code: string;
  incident_id: string;
  incident_title: string;
  incident_type: string;
  team_id: string;
  team_name: string;
  team_phone: string;
  status: "ASSIGNED" | "EN_ROUTE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  status_label: string;
  status_color: string;
  priority: DispatchPriority;
  priority_label: string;
  deadline: string;
  assigned_at: string;
  location_address: string;
  district: string;
  version: number;
}

export interface DispatchListFilter {
  status?: string;
  team_id?: string;
  district?: string;
}

export interface DispatchListResponse {
  orders: DispatchOrderItem[];
  total_count: int;
  has_results: boolean;
  empty_message?: string | null;
}

export interface CreateDispatchOrderRequest {
  incident_id: string;
  team_id: string;
  priority: DispatchPriority;
  deadline: string;
}

export interface EditDispatchOrderRequest {
  team_id?: string;
  deadline?: string;
  adjustment_notes?: string;
  version: number;
}

export interface CancelDispatchOrderRequest {
  cancel_reason: string;
  version: number;
}

export interface CloseDispatchOrderRequest {
  version: number;
  notes?: string;
}

export interface StepperStage {
  key: "ASSIGNED" | "EN_ROUTE" | "IN_PROGRESS" | "COMPLETED";
  label: string;
  is_current: boolean;
  is_passed: boolean;
  timestamp?: string | null;
}

export interface FieldTrackingResponse {
  order_id: string;
  order_code: string;
  status: string;
  status_label: string;
  priority: string;
  deadline: string;

  // Khối Bản đồ
  incident_title: string;
  incident_address: string;
  incident_lat: number;
  incident_lng: number;
  incident_radius_meters: number;

  team_name: string;
  team_phone: string;
  team_lat: number;
  team_lng: number;
  eta_minutes: number;
  is_gps_active: boolean;
  gps_lost_warning?: string | null;

  // Khối Tiến độ
  stepper: StepperStage[];
  before_image_url?: string | null;
  after_image_url?: string | null;
  can_close_order: boolean;
  missing_after_image_warning?: string | null;

  version: number;
}

export interface DispatchActionResult {
  success: boolean;
  message: string;
  order_code?: string | null;
  order_id?: string | null;
  version?: number | null;
}
