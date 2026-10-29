/**
 * Type Definitions cho STT 47: Xuất danh sách sự cố ra Excel hoặc PDF theo bộ lọc
 * (Data Export & Incident Reporting Console)
 */

export type ExportFormatType = "EXCEL" | "PDF";

export type ExportModalState = "NONE" | "FORMAT_SELECT" | "DOWNLOAD_SUCCESS" | "EMPTY_WARNING";

export interface IncidentExportFilterParams {
  district: string;
  category: string;
  status: string;
  from_date?: string;
  to_date?: string;
  quick_range?: string;
  page: number;
  page_size: number;
}

export interface IncidentPreviewItem {
  incident_id: string;
  tracking_code: string; // VD: SC-2026-081
  category_name: string; // VD: Rác tự phát, Ngập cục bộ
  district_name: string; // VD: Quận Bình Tân, Quận 6
  status: string;        // Chờ tiếp nhận, Đang xử lý, Đã hoàn tất, Đã đóng
  status_code: string;   // PENDING, IN_PROGRESS, RESOLVED, CLOSED
  title: string;
  address_text: string;
  created_at: string;
}

export interface IncidentPreviewResponse {
  success: boolean;
  message: string;
  total_records: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: IncidentPreviewItem[];
  is_empty: boolean;
  date_range_invalid?: boolean;
  error_detail?: string;
}

export interface TriggerExportRequest {
  export_format: ExportFormatType;
  district?: string;
  category?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  quick_range?: string;
}

export interface ExportCreatedResponse {
  success: boolean;
  export_id: string;
  file_name: string;
  file_type: ExportFormatType;
  file_size_formatted: string;
  file_size_bytes: number;
  expires_at: string;
  is_expired: boolean;
  download_url: string;
  message: string;
}

export interface ExportStatusResponse {
  export_id: string;
  file_name: string;
  file_type: ExportFormatType;
  file_size_formatted: string;
  is_expired: boolean;
  expires_at: string;
  message: string;
}

export interface FilterOptionItem {
  value: string;
  label: string;
}

export interface ExportMetadataOptionsResponse {
  districts: string[];
  categories: string[];
  statuses: FilterOptionItem[];
  quick_ranges: FilterOptionItem[];
}
