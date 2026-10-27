/**
 * API Service cho Admin System Activity Dashboard (STT 48).
 *
 * File   : FrontEnd/src/features/admin_dashboard/services/dashboardApi.ts
 * Tầng   : Frontend Service Layer
 *
 * Mọi request đều trỏ tới /api/v1/admin-dashboard/*.
 * Hàm exportReport kích hoạt tải file trực tiếp qua Blob URL.
 */

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
  let url = `${API_BASE}/overview`;

  const params = new URLSearchParams();
  if (filter === "custom" && fromDate && toDate) {
    params.set("start_date", fromDate);
    params.set("end_date", toDate);
  } else if (typeof filter === "number") {
    params.set("period_days", String(filter));
  }

  const query = params.toString();
  if (query) url += `?${query}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Lỗi kết nối máy chủ." }));
    throw new Error(
      err.detail ?? "Không thể đồng bộ dữ liệu thống kê hoạt động. Vui lòng kiểm tra lại dịch vụ Analytics."
    );
  }

  return res.json() as Promise<ActivityDashboardResponse>;
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
  const params = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
    page: String(page),
    page_size: String(pageSize),
  });

  const res = await fetch(`${API_BASE}/daily-table?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Lỗi kết nối máy chủ." }));
    throw new Error(err.detail ?? "Không thể tải dữ liệu bảng thống kê.");
  }

  return res.json() as Promise<DailyReportResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Xuất báo cáo và kích hoạt tải file (Màn 3/3)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportReport(request: ExportRequest): Promise<void> {
  const res = await fetch(`${API_BASE}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({
      detail: "Không thể tạo tệp xuất dữ liệu do lỗi bộ nhớ tạm. Vui lòng thử lại.",
    }));
    throw new Error(err.detail);
  }

  // Tự động kích hoạt tải file từ Blob
  const blob = await res.blob();
  const contentDisposition = res.headers.get("Content-Disposition") ?? "";
  const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
  const filename =
    filenameMatch?.[1] ??
    `ThongKe_HeThong.${request.format}`;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
