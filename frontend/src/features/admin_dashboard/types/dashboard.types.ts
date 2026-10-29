/**
 * TypeScript type definitions cho Admin System Activity Dashboard (STT 48).
 *
 * File   : FrontEnd/src/features/admin_dashboard/types/dashboard.types.ts
 * Tầng   : Frontend Types / DTOs
 */

// ─── Dữ liệu điểm theo ngày (biểu đồ đường) ────────────────────────────────

export interface DailyStatPoint {
  stat_date: string; // "YYYY-MM-DD"
  new_users: number;
  new_posts: number;
  new_groups: number;
}

// ─── KPI Cards ───────────────────────────────────────────────────────────────

export interface KpiCardData {
  total_new_users: number;
  total_new_posts: number;
  total_new_groups: number;
  users_growth_pct: number;
  posts_growth_pct: number;
  groups_growth_pct: number;
}

// ─── Response tổng quan Dashboard (Màn 1/3) ─────────────────────────────────

export interface ActivityDashboardResponse {
  kpi: KpiCardData;
  daily_series: DailyStatPoint[];
  period_days: number;
  start_date: string;
  end_date: string;
  generated_at: string;
  message: string;
}

// ─── Bảng chi tiết theo ngày (Màn 2/3) ─────────────────────────────────────

export interface DailyTableRow {
  stat_date: string;
  new_users: number;
  new_posts: number;
  new_groups: number;
}

export interface DailyTableSummary {
  total_users: number;
  total_posts: number;
  total_groups: number;
  avg_users_per_day: number;
  avg_posts_per_day: number;
  avg_groups_per_day: number;
}

export interface DailyReportResponse {
  rows: DailyTableRow[];
  summary: DailyTableSummary;
  from_date: string;
  to_date: string;
  total_records: number;
  page: number;
  page_size: number;
  message: string;
}

// ─── Export (Màn 3/3) ────────────────────────────────────────────────────────

export type ExportFormat = "xlsx" | "pdf";

export interface ExportRequest {
  from_date: string;
  to_date: string;
  format: ExportFormat;
}

// ─── Bộ lọc nhanh ────────────────────────────────────────────────────────────

export type PeriodFilter = 7 | 30 | "custom";

export interface CustomDateRange {
  from_date: string;
  to_date: string;
}

// ─── Trạng thái UI ───────────────────────────────────────────────────────────

export type LoadingState = "idle" | "loading" | "success" | "error";
