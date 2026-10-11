export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface WasteCategoryItem {
  category_id: number;
  category_code: string;
  name: string;
  description?: string | null;
  default_severity: SeverityLevel;
  sla_hours: number;
  sla_warning_hours: number;
  color_hex: string;
  icon_name: string;
  is_active: boolean;
  unresolved_incidents_count: number;
  created_at: string;
  updated_at: string;
}

export interface WasteCategoryListResponse {
  items: WasteCategoryItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  active_count: number;
  inactive_count: number;
}

export interface WasteCategoryCreateRequest {
  category_code: string;
  name: string;
  description?: string;
  default_severity: SeverityLevel;
  sla_hours: number;
  sla_warning_hours: number;
  color_hex?: string;
  icon_name?: string;
}

export interface WasteCategoryUpdateRequest {
  name: string;
  description?: string;
  default_severity: SeverityLevel;
  sla_hours: number;
  sla_warning_hours: number;
  is_active: boolean;
  color_hex?: string;
  icon_name?: string;
}

export interface ValidationCheckResponse {
  is_valid: boolean;
  message?: string;
}

export interface WasteCategoryFilterParams {
  page?: number;
  limit?: number;
  page_size?: number;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export type ViewMode = "list" | "create" | "edit";

