export interface AuditLogItem {
  log_id: number;
  created_at: string;
  user_id?: string | null;
  actor_name: string;
  actor_email?: string | null;
  actor_role: string;
  is_actor_deleted: boolean;
  action: string;
  action_display: string;
  table_name: string;
  record_id?: string | null;
  ip_address: string;
  user_agent: string;
  device_info: string;
  is_suspicious: boolean;
  suspicious_reason?: string | null;
}

export interface DiffField {
  old: any;
  new: any;
  is_changed: boolean;
}

export interface AuditLogDetail extends AuditLogItem {
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  diff?: Record<string, DiffField> | null;
  request_uri?: string | null;
  has_data_changes: boolean;
  integrity_hash?: string | null;
  prev_log_id?: number | null;
  prev_integrity_hash?: string | null;
  chain_verified?: boolean;
}

export interface AuditLogListResult {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  items: AuditLogItem[];
}

export interface AuditStatisticsData {
  total_this_week: number;
  login_total: number;
  login_success: number;
  login_failed: number;
  role_changes_count: number;
  suspicious_count: number;
  calculated_at: string;
}

export interface AuditLogFilterState {
  action: string;
  actor_query: string;
  is_suspicious?: boolean;
  start_date: string;
  end_date: string;
}

export interface AuditExportPayload {
  format: string;
  action?: string;
  actor_query?: string;
  start_date?: string;
  end_date?: string;
}

export interface AuditExportResult {
  download_url: string;
  format: string;
  total_records: number;
  summary_text: string;
  generated_at: string;
  message: string;
}

export interface AuditBlockVerificationItem {
  log_id: number;
  action: string;
  created_at: string;
  actor_name: string;
  prev_hash_prefix: string;
  current_hash: string;
  is_valid: boolean;
}

export interface AuditChainVerificationResult {
  is_valid: boolean;
  total_records_checked: number;
  genesis_hash: string;
  merkle_root_hash: string;
  verified_at: string;
  broken_at_log_id?: number | null;
  message: string;
  blocks_sample: AuditBlockVerificationItem[];
}
