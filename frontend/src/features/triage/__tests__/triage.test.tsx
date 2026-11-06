import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { IncidentTriageView } from "../components/IncidentTriageView";
import { SpatialFacilityView } from "../components/SpatialFacilityView";
import { TriageAppDashboard } from "../pages/TriageAppDashboard";
import { triageService } from "../services/triageService";
import type { TriageEvaluationData, TriageIncidentSummaryItem, FacilityListResponse } from "../types";

vi.mock("../services/triageService", () => ({
  triageService: {
    getIncidentsList: vi.fn(),
    getIncidentDetail: vi.fn(),
    regenerateSummary: vi.fn(),
    acceptPriority: vi.fn(),
    overridePriority: vi.fn(),
    getAuditLogs: vi.fn(),
    queryFacilitiesInBuffer: vi.fn(),
    getFacilityDetail: vi.fn(),
    sendFacilityAlert: vi.fn(),
  },
}));

const mockTriageData: TriageEvaluationData = {
  incident_id: "INC-2026-001",
  tracking_code: "TK-9921",
  title: "Xả nước thải chưa qua xử lý ra kênh Nhiêu Lộc",
  description: "Nước thải đen đặc có mùi hôi thối",
  address_text: "Kênh Nhiêu Lộc, Quận 3, TP.HCM",
  latitude: 10.785,
  longitude: 106.685,
  incident_type: "Ô nhiễm nguồn nước",
  version: 1,
  ai_suggested_priority: "Khẩn cấp",
  current_priority: "Khẩn cấp",
  priority_color: "red",
  ai_triage_score: 88,
  sla_resolve_hours: 4,
  base_severity_score: 90,
  proximity_risk_score: 85,
  scale_factor_score: 80,
  urgency_nlp_score: 95,
  ai_summary: "Phát hiện nước có mùi hôi nồng nặc và màu đen sẫm, nguy cơ lây lan cao.",
  is_too_short: false,
  key_factors: [],
  risk_factors_details: [],
};

const mockIncidentsList: TriageIncidentSummaryItem[] = [
  {
    incident_id: "INC-2026-001",
    tracking_code: "TK-9921",
    title: "Xả nước thải chưa qua xử lý ra kênh Nhiêu Lộc",
    ai_suggested_priority: "Khẩn cấp",
    status: "Chờ xử lý",
    created_at: "2026-10-25 08:30",
  },
  {
    incident_id: "INC-2026-002",
    tracking_code: "TK-9922",
    title: "Đống rác tự phát bốc mùi tại khu dân cư",
    ai_suggested_priority: "Trung bình",
    status: "Chờ xử lý",
    created_at: "2026-10-25 09:15",
  },
];

const mockFacilityResponse: FacilityListResponse = {
  incident_id: "INC-2026-001",
  buffer_radius_meters: 500,
  total_facilities_found: 1,
  immediate_risk_count: 1,
  facilities: [
    {
      facility_id: 26,
      facility_name: "Trường Tiểu học Lê Lợi",
      facility_type: "Trường học",
      address: "128 Lê Lợi, P. Bến Nghé, Quận 1",
      distance_meters: 45,
      distance_display: "Cách 45m",
      is_danger_proximity: true,
      is_immediate_risk: true,
      contact_phone: "028 3829 4567",
      vulnerability_level: "RẤT CAO",
      latitude: 10.77265,
      longitude: 106.69835,
    },
  ],
};

describe("Triage & Spatial Facility Analysis (STT 39 & 40) - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(triageService.queryFacilitiesInBuffer).mockResolvedValue(mockFacilityResponse);
  });

  describe("IncidentTriageView (STT 39)", () => {
    it("hiển thị đầy đủ thông tin tóm tắt sự cố và độ ưu tiên do AI đề xuất", () => {
      render(
        <IncidentTriageView
          data={mockTriageData}
          onRefreshData={vi.fn()}
          onNavigateToSpatial={vi.fn()}
        />
      );

      expect(screen.getByText("TK-9921")).toBeInTheDocument();
      expect(screen.getByText(/Phát hiện nước có mùi hôi/i)).toBeInTheDocument();
      expect(screen.getByText(/Gợi ý: Khẩn cấp/i)).toBeInTheDocument();
    });

    it("chuyển sang màn hình giải thích chi tiết AI khi bấm nút Xem lý do", () => {
      render(
        <IncidentTriageView
          data={mockTriageData}
          onRefreshData={vi.fn()}
          onNavigateToSpatial={vi.fn()}
        />
      );

      const explainBtn = screen.getByRole("button", { name: /Xem lý do/i });
      fireEvent.click(explainBtn);

      expect(screen.getByText(/BẢNG PHÂN TÍCH RỦI RO/i)).toBeInTheDocument();
      expect(screen.getByText(/Công thức chuẩn hóa TPS/i)).toBeInTheDocument();
    });

    it("chấp thuận độ ưu tiên AI khi bấm nút Chấp nhận", async () => {
      vi.mocked(triageService.acceptPriority).mockResolvedValueOnce({
        success: true,
        message: "Đã duyệt độ ưu tiên Khẩn cấp",
        incident_id: "INC-2026-001",
        new_priority: "Khẩn cấp",
        new_version: 2,
      });

      const refreshMock = vi.fn().mockResolvedValue(undefined);

      render(
        <IncidentTriageView
          data={mockTriageData}
          onRefreshData={refreshMock}
          onNavigateToSpatial={vi.fn()}
        />
      );

      // Đi tới màn 2 giải trình AI
      fireEvent.click(screen.getByRole("button", { name: /Xem lý do/i }));

      // Bấm nút Chấp nhận
      const acceptBtn = screen.getByRole("button", { name: /Chấp nhận đề xuất/i });
      fireEvent.click(acceptBtn);

      await waitFor(() => {
        expect(triageService.acceptPriority).toHaveBeenCalledWith("INC-2026-001", 1);
      });
    });

    it("kích hoạt callback chuyển sang quét vùng đệm khi bấm nút Quét vùng đệm", () => {
      const spatialMock = vi.fn();
      render(
        <IncidentTriageView
          data={mockTriageData}
          onRefreshData={vi.fn()}
          onNavigateToSpatial={spatialMock}
        />
      );

      const spatialBtn = screen.getByRole("button", { name: /Quét vùng đệm/i });
      fireEvent.click(spatialBtn);

      expect(spatialMock).toHaveBeenCalled();
    });
  });

  describe("SpatialFacilityView (STT 40)", () => {
    it("hiển thị thông tin tuỳ chọn phân tích và nút quét bán kính", () => {
      render(
        <SpatialFacilityView
          incidentData={mockTriageData}
          onBackToTriage={vi.fn()}
        />
      );

      expect(screen.getByText(/Bán kính quét xung quanh sự cố/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Tìm cơ sở trong bán kính/i })).toBeInTheDocument();
    });

    it("quay lại màn hình phân loại khi bấm nút Quay lại", () => {
      const backMock = vi.fn();
      render(
        <SpatialFacilityView
          incidentData={mockTriageData}
          onBackToTriage={backMock}
        />
      );

      const backBtn = screen.getByRole("button", { name: /Quay lại Màn hình Tóm tắt AI/i });
      fireEvent.click(backBtn);

      expect(backMock).toHaveBeenCalled();
    });
  });

  describe("TriageAppDashboard (STT 39 & 40 Container)", () => {
    it("tải danh sách sự cố và hiển thị giao diện tổng thể", async () => {
      vi.mocked(triageService.getIncidentsList).mockResolvedValueOnce(mockIncidentsList);
      vi.mocked(triageService.getIncidentDetail).mockResolvedValueOnce(mockTriageData);

      render(<TriageAppDashboard />);

      await waitFor(() => {
        expect(triageService.getIncidentsList).toHaveBeenCalled();
      });

      expect(await screen.findByText("TK-9921")).toBeInTheDocument();
    });
  });
});
