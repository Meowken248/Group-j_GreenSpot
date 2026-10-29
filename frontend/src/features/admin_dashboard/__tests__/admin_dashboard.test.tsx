import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ActivityDashboard } from "../components/ActivityDashboard";
import { DailyActivityTable } from "../components/DailyActivityTable";
import { ExportModal } from "../components/ExportModal";
import { AdminDashboardContainer } from "../pages/AdminDashboardContainer";
import * as dashboardApi from "../services/dashboardApi";
import type {
  ActivityDashboardResponse,
  DailyReportResponse,
} from "../types/dashboard.types";

// Mock API service
vi.mock("../services/dashboardApi", () => ({
  fetchDashboardOverview: vi.fn(),
  fetchDailyTable: vi.fn(),
  exportReport: vi.fn(),
}));

const mockOverviewData: ActivityDashboardResponse = {
  kpi: {
    total_new_users: 1420,
    total_new_posts: 3850,
    total_new_groups: 42,
    users_growth_pct: 15.5,
    posts_growth_pct: -8.2,
    groups_growth_pct: 25.0,
  },
  daily_series: [
    {
      stat_date: "2026-10-20",
      new_users: 100,
      new_posts: 250,
      new_groups: 5,
    },
    {
      stat_date: "2026-10-21",
      new_users: 120,
      new_posts: 280,
      new_groups: 7,
    },
  ],
  period_days: 30,
  start_date: "2026-09-22",
  end_date: "2026-10-21",
  generated_at: "21/10/2026 14:00",
  message: "Dữ liệu hoạt động hệ thống được cập nhật lúc 21/10/2026 14:00.",
};

const mockTableData: DailyReportResponse = {
  rows: [
    {
      stat_date: "2026-10-20",
      new_users: 100,
      new_posts: 250,
      new_groups: 5,
    },
    {
      stat_date: "2026-10-21",
      new_users: 120,
      new_posts: 280,
      new_groups: 7,
    },
  ],
  summary: {
    total_users: 220,
    total_posts: 530,
    total_groups: 12,
    avg_users_per_day: 110.0,
    avg_posts_per_day: 265.0,
    avg_groups_per_day: 6.0,
  },
  from_date: "2026-10-20",
  to_date: "2026-10-21",
  total_records: 2,
  page: 1,
  page_size: 15,
  message: "Hiển thị dữ liệu 2 ngày.",
};

describe("Admin System Activity Dashboard (STT 48) - Frontend Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1.  ActivityDashboard (Overview)
  // ───────────────────────────────────────────────────────────────────────────
  describe(" ActivityDashboard", () => {
    it("hiển thị 3 thẻ KPI và biểu đồ khi tải dữ liệu thành công", async () => {
      vi.mocked(dashboardApi.fetchDashboardOverview).mockResolvedValueOnce(mockOverviewData);

      render(<ActivityDashboard standalone={true} />);

      // Chờ dữ liệu load
      await waitFor(() => {
        expect(screen.getByText("+1.420")).toBeInTheDocument();
      });

      expect(screen.getByText("+3.850")).toBeInTheDocument();
      expect(screen.getByText("+42")).toBeInTheDocument();

      // Kiểm tra % tăng trưởng
      expect(screen.getByText("15.5%")).toBeInTheDocument();
      expect(screen.getByText("8.2%")).toBeInTheDocument();

      // Kiểm tra SVG chart thuần
      expect(screen.getByTestId("activity-trend-chart")).toBeInTheDocument();

      // Kiểm tra tiêu đề trang
      expect(screen.getByText("THỐNG KÊ HOẠT ĐỘNG HỆ THỐNG")).toBeInTheDocument();
    });

    it("chuyển đổi bộ lọc 7 ngày và 30 ngày kích hoạt fetch tương ứng", async () => {
      vi.mocked(dashboardApi.fetchDashboardOverview).mockResolvedValue(mockOverviewData);

      render(<ActivityDashboard standalone={true} />);

      await waitFor(() => {
        expect(screen.getByTestId("btn-filter-7days")).toBeInTheDocument();
      });

      // Nhấn nút 7 ngày
      fireEvent.click(screen.getByTestId("btn-filter-7days"));
      expect(dashboardApi.fetchDashboardOverview).toHaveBeenCalledWith(7, undefined, undefined);

      // Nhấn nút 30 ngày
      fireEvent.click(screen.getByTestId("btn-filter-30days"));
      expect(dashboardApi.fetchDashboardOverview).toHaveBeenCalledWith(30, undefined, undefined);
    });

    it("mở input chọn ngày khi bấm nút Tuỳ chọn", async () => {
      vi.mocked(dashboardApi.fetchDashboardOverview).mockResolvedValue(mockOverviewData);

      render(<ActivityDashboard standalone={true} />);

      await waitFor(() => {
        expect(screen.getByTestId("btn-filter-custom")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("btn-filter-custom"));

      expect(screen.getByLabelText("Từ ngày")).toBeInTheDocument();
      expect(screen.getByLabelText("Đến ngày")).toBeInTheDocument();
    });

    it("hiển thị thông báo lỗi và nút Thử lại khi API gặp lỗi", async () => {
      vi.mocked(dashboardApi.fetchDashboardOverview).mockRejectedValueOnce(
        new Error("Dịch vụ phân tích tạm gián đoạn.")
      );

      render(<ActivityDashboard standalone={true} />);

      await waitFor(() => {
        expect(screen.getByText("Dịch vụ phân tích tạm gián đoạn.")).toBeInTheDocument();
      });

      expect(screen.getByText("🔄 Tải lại dữ liệu")).toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2.  DailyActivityTable (Chi tiết bảng số liệu)
  // ───────────────────────────────────────────────────────────────────────────
  describe(" DailyActivityTable", () => {
    it("hiển thị bảng số liệu theo ngày và hàng tổng cộng", async () => {
      vi.mocked(dashboardApi.fetchDailyTable).mockResolvedValueOnce(mockTableData);

      render(
        <DailyActivityTable
          initialFromDate="2026-10-20"
          initialToDate="2026-10-21"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("table-row-2026-10-20")).toBeInTheDocument();
      });

      expect(screen.getByTestId("table-row-2026-10-21")).toBeInTheDocument();
      expect(screen.getByTestId("table-summary-row")).toBeInTheDocument();
      expect(screen.getByText("+220")).toBeInTheDocument();
      expect(screen.getByText("+530")).toBeInTheDocument();
    });

    it("nhấn nút Xuất báo cáo kích hoạt hàm callback onOpenExport", async () => {
      vi.mocked(dashboardApi.fetchDailyTable).mockResolvedValueOnce(mockTableData);
      const onOpenExportMock = vi.fn();

      render(
        <DailyActivityTable
          initialFromDate="2026-10-20"
          initialToDate="2026-10-21"
          onOpenExport={onOpenExportMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("btn-open-export-modal")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("btn-open-export-modal"));
      expect(onOpenExportMock).toHaveBeenCalledWith("2026-10-20", "2026-10-21");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3.  ExportModal (Popup Xuất Thống Kê)
  // ───────────────────────────────────────────────────────────────────────────
  describe(" ExportModal", () => {
    it("chuyển đổi giữa Excel và PDF và gọi hàm exportReport khi nhấn Xuất", async () => {
      vi.mocked(dashboardApi.exportReport).mockResolvedValueOnce(undefined);
      const onCloseMock = vi.fn();
      const onSuccessMock = vi.fn();

      render(
        <ExportModal
          isOpen={true}
          onClose={onCloseMock}
          fromDate="2026-10-20"
          toDate="2026-10-22"
          onSuccess={onSuccessMock}
        />
      );

      expect(screen.getByText("XUẤT THỐNG KÊ")).toBeInTheDocument();

      // Kiểm tra link End-to-End sang phân hệ xuất sự cố
      expect(screen.getByText("Trích xuất danh sách sự cố ➔")).toBeInTheDocument();

      // Chọn PDF
      fireEvent.click(screen.getByTestId("option-format-pdf"));

      // Nhấn nút Xuất
      fireEvent.click(screen.getByTestId("btn-confirm-export"));

      await waitFor(() => {
        expect(dashboardApi.exportReport).toHaveBeenCalledWith({
          from_date: "2026-10-20",
          to_date: "2026-10-22",
          format: "pdf",
        });
      });

      expect(onSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });

    it("đóng modal khi nhấn nút Huỷ hoặc bấm phím Escape", () => {
      const onCloseMock = vi.fn();

      render(
        <ExportModal
          isOpen={true}
          onClose={onCloseMock}
          fromDate="2026-10-20"
          toDate="2026-10-22"
        />
      );

      // Bấm nút Huỷ
      fireEvent.click(screen.getByTestId("btn-cancel-export"));
      expect(onCloseMock).toHaveBeenCalledTimes(1);

      // Bấm phím Escape
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onCloseMock).toHaveBeenCalledTimes(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. AdminDashboardContainer (Tích hợp toàn diện & Không ngõ cụt)
  // ───────────────────────────────────────────────────────────────────────────
  describe("AdminDashboardContainer", () => {
    it("cho phép chuyển đổi giữa tab Tổng quan và Báo cáo chi tiết", async () => {
      vi.mocked(dashboardApi.fetchDashboardOverview).mockResolvedValue(mockOverviewData);
      vi.mocked(dashboardApi.fetchDailyTable).mockResolvedValue(mockTableData);

      render(<AdminDashboardContainer initialView="overview" />);

      expect(screen.getByTestId("admin-dashboard-container")).toBeInTheDocument();
      expect(screen.getByTestId("activity-dashboard")).toBeInTheDocument();

      // Nhấn chuyển sang Báo cáo chi tiết
      fireEvent.click(screen.getByTestId("tab-btn-detailed-table"));

      await waitFor(() => {
        expect(screen.getByTestId("daily-activity-table-layout")).toBeInTheDocument();
      });

      // Nhấn quay về Tổng quan
      fireEvent.click(screen.getByTestId("tab-btn-overview"));

      await waitFor(() => {
        expect(screen.getByTestId("activity-dashboard")).toBeInTheDocument();
      });
    });

    it("mở Menu quản trị STT 37->48 không ngõ cụt khi bấm nút trên Header", () => {
      render(<AdminDashboardContainer initialView="overview" />);

      const menuToggle = screen.getByTestId("btn-admin-menu-toggle");
      expect(menuToggle).toBeInTheDocument();

      fireEvent.click(menuToggle);

      expect(screen.getByTestId("admin-modules-dropdown")).toBeInTheDocument();
      expect(screen.getByText("Xuất dữ liệu sự cố (Excel/PDF)")).toBeInTheDocument();
      expect(screen.getByText("Cứu hộ ngập lụt (Flood SOS)")).toBeInTheDocument();
      expect(screen.getByText("Bảng điều khiển rủi ro đô thị")).toBeInTheDocument();
    });

    it("mở Modal xuất thống kê khi bấm nút Xuất thống kê trên Header", () => {
      render(<AdminDashboardContainer initialView="overview" />);

      fireEvent.click(screen.getByTestId("tab-btn-direct-export"));

      expect(screen.getByTestId("export-activity-modal")).toBeInTheDocument();
    });
  });
});
