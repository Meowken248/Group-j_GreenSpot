import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { IncidentStatsCards } from "../components/IncidentStatsCards";
import { IncidentVerificationModal } from "../components/IncidentVerificationModal";
import { IncidentManagementContainer } from "../components/IncidentManagementContainer";
import * as service from "../services/incidentManagementService";
import type { IncidentListItem, IncidentManagementStats } from "../types/incident_management.types";

vi.mock("../services/incidentManagementService", () => ({
  fetchIncidentsForManagement: vi.fn(),
  verifyIncident: vi.fn(),
  updateIncidentStatus: vi.fn(),
}));

const mockStats: IncidentManagementStats = {
  total: 10,
  unverified: 4,
  in_progress: 3,
  resolved: 2,
  rejected: 1,
  critical: 2,
  sla_warning: 1,
};

const mockIncident: IncidentListItem = {
  incident_id: "inc-001",
  tracking_code: "INC-2026-0001",
  title: "Đống rác tự phát bốc mùi",
  description: "Rác thải sinh hoạt tràn lan tại vỉa hè",
  category_id: 1,
  category_name: "Rác thải",
  severity: "CRITICAL",
  status: "PENDING",
  address_text: "123 Lê Lợi, Phường Bến Nghé, Quận 1",
  latitude: 10.7769,
  longitude: 106.7009,
  unit_id: 3,
  unit_name: "Quận 1",
  is_anonymous: false,
  reporter_name: "Nguyễn Văn Dân",
  reporter_phone_masked: "090***4567",
  sla_deadline: "2026-10-09T20:00:00Z",
  is_sla_overdue: false,
  created_at: "2026-10-09T08:00:00Z",
  thumbnail_url: "http://example.com/thumb.jpg",
  media: [
    {
      file_url: "http://example.com/photo.jpg",
      thumbnail_url: "http://example.com/thumb.jpg",
      media_type: "IMAGE",
      file_size_bytes: 102400,
      mime_type: "image/jpeg",
    },
  ],
};

describe("Incident Management Feature Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("IncidentStatsCards Component", () => {
    it("renders all 6 metric cards with correct values", () => {
      render(
        <IncidentStatsCards
          stats={mockStats}
          selectedFilter="ALL"
          onSelectFilter={vi.fn()}
        />
      );

      expect(screen.getByText("Tổng phản ánh")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();

      expect(screen.getByText("Chưa kiểm chứng")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();

      expect(screen.getByText("Khẩn cấp / Cao")).toBeInTheDocument();
      expect(screen.getAllByText("2").length).toBe(2);

      expect(screen.getByText("Đang xử lý")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();

      expect(screen.getByText("Đã hoàn thành")).toBeInTheDocument();
      expect(screen.getByText("Cảnh báo SLA")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("triggers callbacks when cards are clicked", () => {
      const onSelectFilter = vi.fn();

      render(
        <IncidentStatsCards
          stats={mockStats}
          selectedFilter="ALL"
          onSelectFilter={onSelectFilter}
        />
      );

      fireEvent.click(screen.getByText("Chưa kiểm chứng"));
      expect(onSelectFilter).toHaveBeenCalledWith("PENDING");

      fireEvent.click(screen.getByText("Khẩn cấp / Cao"));
      expect(onSelectFilter).toHaveBeenCalledWith("CRITICAL");
    });
  });

  describe("IncidentVerificationModal Component", () => {
    it("renders incident details and watermark badge", () => {
      render(
        <IncidentVerificationModal
          incident={mockIncident}
          onClose={vi.fn()}
          onVerify={vi.fn()}
          onUpdateStatus={vi.fn()}
          onNavigateToMap={vi.fn()}
        />
      );

      expect(screen.getByText("Đống rác tự phát bốc mùi")).toBeInTheDocument();
      expect(screen.getByText("INC-2026-0001")).toBeInTheDocument();
      expect(screen.getByText(/Nguyễn Văn Dân/)).toBeInTheDocument();
      expect(screen.getByText(/123 Lê Lợi/)).toBeInTheDocument();
      expect(screen.getAllByText(/Watermark/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("🟡 Chưa kiểm chứng")).toBeInTheDocument();
    });

    it("handles verification action (Approve)", async () => {
      const onVerify = vi.fn().mockResolvedValue(undefined);

      render(
        <IncidentVerificationModal
          incident={mockIncident}
          onClose={vi.fn()}
          onVerify={onVerify}
          onUpdateStatus={vi.fn()}
          onNavigateToMap={vi.fn()}
        />
      );

      const approveBtn = screen.getByText("✓ Xác nhận Đã kiểm chứng");
      fireEvent.click(approveBtn);

      expect(onVerify).toHaveBeenCalledWith("VERIFY", "Admin xác thực bằng chứng hiện trường chính xác");
    });

    it("shows reject form and requires reason", async () => {
      const onVerify = vi.fn().mockResolvedValue(undefined);

      render(
        <IncidentVerificationModal
          incident={mockIncident}
          onClose={vi.fn()}
          onVerify={onVerify}
          onUpdateStatus={vi.fn()}
          onNavigateToMap={vi.fn()}
        />
      );

      const rejectBtn = screen.getByText("✕ Báo cáo sai lệch (Từ chối)");
      fireEvent.click(rejectBtn);

      expect(screen.getByPlaceholderText(/Hình ảnh không rõ ràng/)).toBeInTheDocument();

      const confirmRejectBtn = screen.getByText("Xác nhận Từ chối");
      fireEvent.click(confirmRejectBtn);
      // Reason was empty, should not call verify yet
      expect(onVerify).not.toHaveBeenCalled();

      // Enter reason and submit
      const textarea = screen.getByPlaceholderText(/Hình ảnh không rõ ràng/);
      fireEvent.change(textarea, { target: { value: "Ảnh chụp không rõ địa điểm" } });
      fireEvent.click(confirmRejectBtn);

      expect(onVerify).toHaveBeenCalledWith("REJECT", "Ảnh chụp không rõ địa điểm");
    });
  });

  describe("IncidentManagementContainer Integration", () => {
    it("loads and displays incidents and summary stats", async () => {
      vi.mocked(service.fetchIncidentsForManagement).mockResolvedValue({
        items: [mockIncident],
        total: 1,
        page: 1,
        limit: 15,
        stats: mockStats,
      });

      render(<IncidentManagementContainer />);

      await waitFor(() => {
        expect(screen.getByText("Đống rác tự phát bốc mùi")).toBeInTheDocument();
      });

      expect(screen.getByText(/Quản lý & Kiểm chứng Phản ánh Môi trường/)).toBeInTheDocument();
      expect(screen.getByText("INC-2026-0001")).toBeInTheDocument();
    });
  });
});

