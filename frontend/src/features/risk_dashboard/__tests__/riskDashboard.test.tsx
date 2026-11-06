import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Screen1Overview } from '../components/Screen1Overview';
import { Screen2Analysis } from '../components/Screen2Analysis';
import { Screen3DistrictPopup } from '../components/Screen3DistrictPopup';
import { ExecutiveHeader } from '../components/ExecutiveHeader';
import type {
  OverviewMetricsResponse,
  FilterAnalysisResponse,
  DistrictDetailResponse,
} from '../types/riskDashboard.types';

const MOCK_OVERVIEW_DATA: OverviewMetricsResponse = {
  overall_risk_score: 58.0,
  overall_risk_label: "58/100 - Mức rủi ro trung bình",
  high_risk_district_count: 4,
  high_risk_district_label: "4 quận nguy cơ cao",
  open_incident_count: 128,
  open_incident_label: "128 sự cố đang mở",
  district_risks: [
    {
      unit_id: 1,
      district_name: "Quận Bình Tân",
      risk_score: 84.5,
      risk_level: "CRITICAL",
      risk_level_label: "Mức báo động đỏ",
      open_incidents: 24,
      spontaneous_dumps: 18,
      flood_points: 6,
      threatened_facilities: 7,
      latitude: 10.7654,
      longitude: 106.6038,
    },
    {
      unit_id: 2,
      district_name: "Quận 8",
      risk_score: 81.2,
      risk_level: "CRITICAL",
      risk_level_label: "Mức báo động đỏ",
      open_incidents: 21,
      spontaneous_dumps: 14,
      flood_points: 7,
      threatened_facilities: 6,
      latitude: 10.7241,
      longitude: 106.6286,
    },
  ],
  trend_30_days: [
    { date: "2026-10-01", average_risk_score: 59.0, open_incidents: 130 },
    { date: "2026-10-15", average_risk_score: 58.0, open_incidents: 128 },
  ],
  top_alert_districts: [
    {
      rank: 1,
      unit_id: 1,
      district_name: "Quận Bình Tân",
      risk_score: 84.5,
      risk_level: "CRITICAL",
      risk_level_label: "Mức báo động đỏ",
      open_incidents: 24,
      spontaneous_dumps: 18,
      flood_points: 6,
      threatened_facilities: 7,
      urgent_action_required: true,
    },
    {
      rank: 2,
      unit_id: 2,
      district_name: "Quận 8",
      risk_score: 81.2,
      risk_level: "CRITICAL",
      risk_level_label: "Mức báo động đỏ",
      open_incidents: 21,
      spontaneous_dumps: 14,
      flood_points: 7,
      threatened_facilities: 6,
      urgent_action_required: true,
    },
  ],
  has_critical_alert: true,
  critical_alert_message: "Cảnh báo khẩn cấp: Quận Bình Tân có điểm rủi ro vượt mức an toàn",
  updated_at: "2026-10-16T12:00:00Z",
};

const MOCK_ANALYSIS_DATA: FilterAnalysisResponse = {
  has_data: true,
  empty_message: null,
  summary_table: {
    total_incidents: 142,
    estimated_waste_volume_m3: 385.5,
    sla_on_time_rate_percent: 92.5,
    open_incidents: 28,
    resolved_incidents: 114,
  },
  risk_type_distribution: [
    { type_code: "DOMESTIC_WASTE", type_name: "Rác sinh hoạt ùn ứ", count: 64, percentage: 45.1, color_hex: "#EAB308" },
    { type_code: "FLOOD", type_name: "Điểm ngập nước", count: 38, percentage: 26.8, color_hex: "#06B6D4" },
  ],
  period_comparison: {
    current_period_score: 58.4,
    previous_period_score: 68.3,
    change_percent: 14.5,
    trend_direction: "DECREASE",
    is_positive: true,
    comparison_text: "Giảm 14.5% so với tháng trước",
    message: "Tích cực: Chỉ số rủi ro môi trường đã giảm 14.5%",
  },
};

const MOCK_DISTRICT_DETAIL: DistrictDetailResponse = {
  unit_id: 1,
  district_name: "Quận Bình Tân",
  risk_score: 78.0,
  risk_level: "HIGH",
  risk_score_text: "Điểm rủi ro: 78/100 - Mức báo động cam",
  pending_incidents_text: "24 bãi rác tự phát, 3 điểm ngập úng sâu",
  spontaneous_dumps_count: 24,
  deep_flood_points_count: 3,
  threatened_facilities_text: "5 trường học, 2 trạm y tế nằm trong vùng nguy cơ",
  schools_count: 5,
  hospitals_count: 2,
  total_facilities_count: 7,
  latitude: 10.7654,
  longitude: 106.6038,
  gis_map_link: "#map?lat=10.7654&lng=106.6038&district=Quận Bình Tân",
};

describe("Urban Environmental Risk Dashboard (STT 42) UI Tests", () => {
  it(" Hiển thị 3 khối ngang CHỈ SỐ, BIỂU ĐỒ, CẢNH BÁO", () => {
    const handleSelectDistrict = vi.fn();

    render(
      <Screen1Overview
        data={MOCK_OVERVIEW_DATA}
        onSelectDistrict={handleSelectDistrict}
      />
    );

    // 1. Khối CHỈ SỐ
    expect(screen.getByText("CHỈ SỐ")).toBeInTheDocument();
    expect(screen.getByText("58/100 - Mức rủi ro trung bình")).toBeInTheDocument();
    expect(screen.getByText(/4 quận nguy cơ cao/i)).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();

    // 2. Khối BIỂU ĐỒ
    expect(screen.getByText("BIỂU ĐỒ")).toBeInTheDocument();

    // 3. Khối CẢNH BÁO
    expect(screen.getByText("CẢNH BÁO")).toBeInTheDocument();
    expect(screen.getAllByText("Quận Bình Tân").length).toBeGreaterThan(0);

    // Click vào quận mở popup
    const districtAlertItem = screen.getAllByText("Quận Bình Tân")[0];
    fireEvent.click(districtAlertItem);
    expect(handleSelectDistrict).toHaveBeenCalledWith("Quận Bình Tân");
  });

  it(" Hiển thị 3 khối ngang BỘ LỌC, KẾT QUẢ, SO SÁNH", () => {
    const handleApply = vi.fn();
    const handleExport = vi.fn();
    const handleRetry = vi.fn();

    render(
      <Screen2Analysis
        analysisData={MOCK_ANALYSIS_DATA}
        isLoading={false}
        errorMessage={null}
        onApplyFilter={handleApply}
        onExport={handleExport}
        onRetry={handleRetry}
      />
    );

    // 1. Khối BỘ LỌC
    expect(screen.getByText("BỘ LỌC")).toBeInTheDocument();
    expect(screen.getByText("Quận/Huyện:")).toBeInTheDocument();
    expect(screen.getByText("Loại rủi ro:")).toBeInTheDocument();
    expect(screen.getByText("Khoảng thời gian:")).toBeInTheDocument();
    expect(screen.getByText(/Áp dụng/i)).toBeInTheDocument();
    expect(screen.getByText("Xuất Excel")).toBeInTheDocument();
    expect(screen.getByText("Xuất PDF")).toBeInTheDocument();

    // 2. Khối KẾT QUẢ
    expect(screen.getByText("KẾT QUẢ")).toBeInTheDocument();
    expect(screen.getByText("Tổng số sự cố phát sinh")).toBeInTheDocument();
    expect(screen.getByText("142 vụ")).toBeInTheDocument();
    expect(screen.getByText("Khối lượng rác ước tính")).toBeInTheDocument();
    expect(screen.getByText("Tỷ lệ xử lý đúng hạn SLA")).toBeInTheDocument();
    expect(screen.getByText("92.5%")).toBeInTheDocument();

    // 3. Khối SO SÁNH
    expect(screen.getByText("SO SÁNH")).toBeInTheDocument();
    expect(screen.getByText("Giảm 14.5% so với tháng trước")).toBeInTheDocument();
    expect(screen.getByText("Tích cực: Chỉ số rủi ro môi trường đã giảm 14.5%")).toBeInTheDocument();

    // Thử bấm Xuất Excel
    fireEvent.click(screen.getByText("Xuất Excel"));
    expect(handleExport).toHaveBeenCalledWith("csv");
  });

  it("Màn 3/3 Popup: Hiển thị đúng dữ liệu POPUP, CHI TIẾT QUẬN và các nút chức năng", () => {
    const handleClose = vi.fn();
    const handleNavigate = vi.fn();

    render(
      <Screen3DistrictPopup
        districtData={MOCK_DISTRICT_DETAIL}
        isOpen={true}
        onClose={handleClose}
        onNavigateToMap={handleNavigate}
      />
    );

    expect(screen.getByText("POPUP")).toBeInTheDocument();
    expect(screen.getByText("CHI TIẾT QUẬN")).toBeInTheDocument();
    expect(screen.getByText(/Quận Bình Tân/i)).toBeInTheDocument();
    expect(screen.getByText("Điểm rủi ro: 78/100 - Mức báo động cam")).toBeInTheDocument();
    expect(screen.getByText(/24 bãi rác tự phát, 3 điểm ngập úng sâu/i)).toBeInTheDocument();
    expect(screen.getByText(/5 trường học, 2 trạm y tế nằm trong vùng nguy cơ/i)).toBeInTheDocument();

    // Nút "Xem bản đồ"
    const mapBtn = screen.getByRole("button", { name: /xem bản đồ/i });
    fireEvent.click(mapBtn);
    expect(handleNavigate).toHaveBeenCalledWith(MOCK_DISTRICT_DETAIL);

    // Nút "Đóng"
    const closeBtn = screen.getByRole("button", { name: /^đóng$/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("Màn 3/3 Popup: Đóng khi nhấn phím Escape", () => {
    const handleClose = vi.fn();

    render(
      <Screen3DistrictPopup
        districtData={MOCK_DISTRICT_DETAIL}
        isOpen={true}
        onClose={handleClose}
        onNavigateToMap={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("ExecutiveHeader: Kích hoạt chuông cảnh báo khẩn cấp khi có quận vượt ngưỡng 80", () => {
    const handleBellClick = vi.fn();

    render(
      <ExecutiveHeader
        hasCriticalAlert={true}
        onBellClick={handleBellClick}
        currentUser={{ full_name: "Nguyễn Văn Lãnh Đạo", role: "ADMIN" }}
        activeScreen={1}
        onChangeScreen={vi.fn()}
      />
    );

    const bellBtn = screen.getByLabelText("Chuông cảnh báo");
    expect(bellBtn).toHaveClass("active-emergency");

    fireEvent.click(bellBtn);
    expect(handleBellClick).toHaveBeenCalledTimes(1);
  });
});
