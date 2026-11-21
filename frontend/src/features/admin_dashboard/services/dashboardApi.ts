/**
 * API Service cho Admin System Activity Dashboard (STT 48).
 *
 * File   : FrontEnd/src/features/admin_dashboard/services/dashboardApi.ts
 * Tầng   : Frontend Service Layer
 *
 * Mọi request đều sử dụng axios client chung (api) trỏ tới /api/v1/admin-dashboard/*.
 * Hàm exportReport kích hoạt tải file trực tiếp qua Blob URL.
 */

import api from "../../../api/client";
import type {
  ActivityDashboardResponse,
  DailyReportResponse,
  ExportRequest,
  PeriodFilter,
} from "../types/dashboard.types";

const API_BASE = "/api/v1/admin-dashboard";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Lấy dữ liệu Dashboard tổng quan (Màn 1/3)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchDashboardOverview(
  filter: PeriodFilter,
  fromDate?: string,
  toDate?: string
): Promise<ActivityDashboardResponse> {
  const params: Record<string, string> = {};
  if (filter === "custom" && fromDate && toDate) {
    params.start_date = fromDate;
    params.end_date = toDate;
  } else if (typeof filter === "number") {
    params.period_days = String(filter);
  }

  const res = await api.get<ActivityDashboardResponse>(`${API_BASE}/overview`, {
    params,
  });
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Lấy bảng chi tiết theo ngày (Màn 2/3)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchDailyTable(
  fromDate: string,
  toDate: string,
  page = 1,
  pageSize = 30
): Promise<DailyReportResponse> {
  const res = await api.get<DailyReportResponse>(`${API_BASE}/daily-table`, {
    params: {
      from_date: fromDate,
      to_date: toDate,
      page: String(page),
      page_size: String(pageSize),
    },
  });
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Xuất báo cáo và kích hoạt tải file (Màn 3/3)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportReport(request: ExportRequest): Promise<void> {
  const res = await api.post(`${API_BASE}/export`, request, {
    responseType: "blob",
  });

  const blob = new Blob([res.data]);
  const contentDisposition = (res.headers["content-disposition"] as string) ?? "";
  const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
  const filename =
    filenameMatch?.[1] ?? `ThongKe_HeThong.${request.format}`;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
