/**
 * Barrel Export cho Feature Admin Dashboard (STT 48):
 * Bảng thống kê hoạt động hệ thống cho Admin: người dùng mới, bài đăng, nhóm mới theo ngày
 */

export { AdminDashboardContainer } from "./pages/AdminDashboardContainer";
export type { AdminDashboardView, AdminDashboardContainerProps } from "./pages/AdminDashboardContainer";

export { ActivityDashboard } from "./components/ActivityDashboard";
export type { ActivityDashboardProps } from "./components/ActivityDashboard";

export { DailyActivityTable } from "./components/DailyActivityTable";
export type { DailyActivityTableProps } from "./components/DailyActivityTable";

export { ExportModal } from "./components/ExportModal";
export type { ExportModalProps } from "./components/ExportModal";

export * as adminDashboardApi from "./services/dashboardApi";
export {
  fetchDashboardOverview,
  fetchDailyTable,
  exportReport,
} from "./services/dashboardApi";

export * from "./types/dashboard.types";
