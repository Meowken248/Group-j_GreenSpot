import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Screen1HotspotMap } from '../components/Screen1HotspotMap';
import { Screen2ForecastDashboard } from '../components/Screen2ForecastDashboard';
import { Screen3HotspotDetailModal } from '../components/Screen3HotspotDetailModal';
import { HotspotHeader } from '../components/HotspotHeader';
import { HotspotFooter } from '../components/HotspotFooter';
import type {
  HotspotCluster,
  TopHotspotItem,
  AreaOptionItem,
  ForecastResponse,
  HotspotDetailResponse,
} from '../types/hotspot.types';

const MOCK_CLUSTERS: HotspotCluster[] = [
  {
    id: "hs-001",
    cluster_code: "HS-Q8-001",
    title: "Kênh Đôi - Quận 8",
    incident_type: "WATER_POLLUTION",
    incident_count: 42,
    latitude: 10.742,
    longitude: 106.662,
    radius_meter: 450,
    density_score: 9.4,
    risk_level: "VERY_CRITICAL",
    trend: "Tăng 18%",
    forecast_48h: "Tiếp tục tăng do triều cường",
    district: "Quận 8",
    active_dispatch_order_id: "DP-2026-001",
    last_updated: "2026-10-16T10:00:00",
  },
  {
    id: "hs-002",
    cluster_code: "HS-BT-002",
    title: "Bãi rác Đường số 7 - Bình Tân",
    incident_type: "SPONTANEOUS_DUMP",
    incident_count: 38,
    latitude: 10.765,
    longitude: 106.612,
    radius_meter: 400,
    density_score: 8.7,
    risk_level: "CRITICAL",
    trend: "Đi ngang",
    forecast_48h: "Ổn định mức cao",
    district: "Bình Tân",
    active_dispatch_order_id: null,
    last_updated: "2026-10-16T09:30:00",
  },
];

const MOCK_TOP5: TopHotspotItem[] = [
  {
    id: "hs-001",
    rank: 1,
    title: "Kênh Đôi - Quận 8",
    district: "Quận 8",
    incident_count: 42,
    risk_level: "VERY_CRITICAL",
    trend: "Tăng 18%",
  },
  {
    id: "hs-002",
    rank: 2,
    title: "Bãi rác Đường số 7 - Bình Tân",
    district: "Bình Tân",
    incident_count: 38,
    risk_level: "CRITICAL",
    trend: "Đi ngang",
  },
];

const MOCK_AREAS: AreaOptionItem[] = [
  { id: "dist-q8", name: "Quận 8", type: "DISTRICT" },
  { id: "dist-binhtan", name: "Quận Bình Tân", type: "DISTRICT" },
  { id: "hs-001", name: "Cụm Kênh Đôi (Q.8)", type: "HOTSPOT" },
];

const MOCK_FORECAST: ForecastResponse = {
  target_id: "dist-q8",
  target_name: "Quận 8",
  target_type: "DISTRICT",
  model_accuracy_pct: 87.5,
  has_weather_warning: true,
  weather_warning_message: "Cảnh báo triều cường vượt mức báo động 3 kết hợp mưa lớn cục bộ",
  points: [
    {
      date: "2026-10-16",
      day_of_week: "Thứ Sáu",
      predicted_incidents: 15,
      ci_lower_95: 12,
      ci_upper_95: 19,
      risk_level: "NORMAL",
      weather_condition: "Mưa rải rác",
      tide_level_m: 1.45,
      note: null,
    },
    {
      date: "2026-10-17",
      day_of_week: "Thứ Bảy",
      predicted_incidents: 28,
      ci_lower_95: 22,
      ci_upper_95: 34,
      risk_level: "PEAK_CRITICAL",
      weather_condition: "Triều cường dâng cao",
      tide_level_m: 1.68,
      note: "Đỉnh triều cường kết hợp rác ứ đọng",
    },
  ],
  peak_risk_summary: "Thứ Bảy kết hợp triều cường 1.68m có nguy cơ ngập và tràn rác cao nhất trong 7 ngày tới.",
  peak_risk_date: "2026-10-17",
  recommendations: [
    "Bố trí đội nạo vét cống rãnh thường trực tại các cống ngăn triều",
    "Tăng tần suất thu gom rác ven kênh rạch",
  ],
};

const MOCK_DETAIL: HotspotDetailResponse = {
  id: "hs-001",
  cluster_code: "HS-Q8-001",
  title: "Kênh Đôi - Quận 8",
  incident_type: "WATER_POLLUTION",
  incident_type_label: "Xả thải nguồn nước",
  incident_count: 42,
  risk_level: "VERY_CRITICAL",
  risk_level_label: "Rất nghiêm trọng",
  trend: "Tăng 18%",
  forecast_48h: "Tiếp tục tăng do triều cường và xả lén ven kênh",
  district: "Quận 8",
  latitude: 10.742,
  longitude: 106.662,
  active_dispatch_order_id: "DP-2026-001",
  has_active_order: true,
  suggested_dispatch: {
    title: "Xử lý khẩn cấp điểm nóng ô nhiễm Kênh Đôi - Quận 8",
    incident_type: "Xả thải nguồn nước",
    priority: "URGENT",
    district: "Quận 8",
    address: "Bờ kênh Đôi, Phường 15, Quận 8",
    latitude: 10.742,
    longitude: 106.662,
    target_deadline_hours: 4,
    description: "Cụm điểm nóng KDE mật độ cao 42 phản ánh. Cần triển khai vớt rác và ngăn chặn xả thải.",
  },
};

describe("Spatial Hotspot Analytics & 7-Day Forecasting (STT 44)", () => {
  describe(" Bản đồ điểm nóng KDE & Top 5", () => {
    it("Hiển thị đầy đủ bộ lọc, số lượng cụm điểm nóng và danh sách Top 5", () => {
      render(
        <Screen1HotspotMap
          clusters={MOCK_CLUSTERS}
          top5={MOCK_TOP5}
          selectedClusterId={null}
          onSelectCluster={vi.fn()}
          onOpenDetailModal={vi.fn()}
          incidentType="ALL"
          onChangeIncidentType={vi.fn()}
          timeRange="30_DAYS"
          onChangeTimeRange={vi.fn()}
          tileServerError={false}
          onRetryTiles={vi.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByTestId("hotspot-count-badge")).toHaveTextContent("2 Cụm điểm nóng phát hiện");
      expect(screen.getByTestId("top5-list")).toBeInTheDocument();
      expect(screen.getByTestId("top5-item-1")).toHaveTextContent("Kênh Đôi - Quận 8");
      expect(screen.getByTestId("top5-item-2")).toHaveTextContent("Bãi rác Đường số 7 - Bình Tân");
    });

    it("Thay đổi bộ lọc loại sự cố và thời gian kích hoạt callback", () => {
      const onChangeType = vi.fn();
      const onChangeRange = vi.fn();

      render(
        <Screen1HotspotMap
          clusters={MOCK_CLUSTERS}
          top5={MOCK_TOP5}
          selectedClusterId={null}
          onSelectCluster={vi.fn()}
          onOpenDetailModal={vi.fn()}
          incidentType="ALL"
          onChangeIncidentType={onChangeType}
          timeRange="30_DAYS"
          onChangeTimeRange={onChangeRange}
          tileServerError={false}
          onRetryTiles={vi.fn()}
          isLoading={false}
        />
      );

      fireEvent.change(screen.getByTestId("filter-incident-type"), {
        target: { value: "SPONTANEOUS_DUMP" },
      });
      expect(onChangeType).toHaveBeenCalledWith("SPONTANEOUS_DUMP");

      fireEvent.change(screen.getByTestId("filter-time-range"), {
        target: { value: "7_DAYS" },
      });
      expect(onChangeRange).toHaveBeenCalledWith("7_DAYS");
    });

    it("Hiển thị empty state khi không có cụm điểm nóng nào trong bộ lọc", () => {
      render(
        <Screen1HotspotMap
          clusters={[]}
          top5={[]}
          selectedClusterId={null}
          onSelectCluster={vi.fn()}
          onOpenDetailModal={vi.fn()}
          incidentType="ALL"
          onChangeIncidentType={vi.fn()}
          timeRange="30_DAYS"
          onChangeTimeRange={vi.fn()}
          tileServerError={false}
          onRetryTiles={vi.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByTestId("empty-hotspot-state")).toHaveTextContent(
        "Không phát hiện cụm điểm nóng nào trong khoảng thời gian đã chọn."
      );
      expect(screen.getByTestId("empty-top5-msg")).toHaveTextContent("Không có điểm nóng");
    });

    it("Hiển thị lỗi máy chủ tile GIS và kích hoạt thử tải lại", () => {
      const onRetry = vi.fn();
      render(
        <Screen1HotspotMap
          clusters={MOCK_CLUSTERS}
          top5={MOCK_TOP5}
          selectedClusterId={null}
          onSelectCluster={vi.fn()}
          onOpenDetailModal={vi.fn()}
          incidentType="ALL"
          onChangeIncidentType={vi.fn()}
          timeRange="30_DAYS"
          onChangeTimeRange={vi.fn()}
          tileServerError={true}
          onRetryTiles={onRetry}
          isLoading={false}
        />
      );

      expect(screen.getByTestId("tile-error-fallback")).toHaveTextContent(
        "Không thể kết nối đến máy chủ bản đồ GIS. Vui lòng kiểm tra lại đường truyền."
      );
      fireEvent.click(screen.getByTestId("btn-retry-tiles"));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("Nhấp vào cụm điểm nóng hoặc mục Top 5 sẽ kích hoạt chọn điểm nóng", () => {
      const onSelect = vi.fn();
      render(
        <Screen1HotspotMap
          clusters={MOCK_CLUSTERS}
          top5={MOCK_TOP5}
          selectedClusterId={null}
          onSelectCluster={onSelect}
          onOpenDetailModal={vi.fn()}
          incidentType="ALL"
          onChangeIncidentType={vi.fn()}
          timeRange="30_DAYS"
          onChangeTimeRange={vi.fn()}
          tileServerError={false}
          onRetryTiles={vi.fn()}
          isLoading={false}
        />
      );

      fireEvent.click(screen.getByTestId("hotspot-circle-hs-001"));
      expect(onSelect).toHaveBeenCalledWith("hs-001");

      fireEvent.click(screen.getByTestId("top5-item-2"));
      expect(onSelect).toHaveBeenCalledWith("hs-002");
    });
  });

  describe(" Dự báo 7 ngày & Khoảng tin cậy 95%", () => {
    it("Hiển thị biểu đồ SVG, dải tin cậy 95%, độ chính xác 87.5% và cảnh báo thời tiết", () => {
      render(
        <Screen2ForecastDashboard
          areas={MOCK_AREAS}
          selectedAreaId="dist-q8"
          onSelectArea={vi.fn()}
          forecastData={MOCK_FORECAST}
          isLoading={false}
          onExportReport={vi.fn()}
          isExporting={false}
        />
      );

      expect(screen.getByTestId("forecast-line-chart-svg")).toBeInTheDocument();
      expect(screen.getByTestId("confidence-interval-band")).toBeInTheDocument();
      expect(screen.getByTestId("model-accuracy-badge")).toHaveTextContent("Độ chính xác: 87.5%");
      expect(screen.getByTestId("weather-warning-alert")).toHaveTextContent(
        "Cảnh báo triều cường vượt mức báo động 3 kết hợp mưa lớn cục bộ"
      );
      expect(screen.getByTestId("peak-risk-panel")).toHaveTextContent("Thứ Bảy kết hợp triều cường 1.68m");
    });

    it("Bấm nút Xuất báo cáo kích hoạt gọi hàm xuất định dạng PDF", () => {
      const onExport = vi.fn();
      render(
        <Screen2ForecastDashboard
          areas={MOCK_AREAS}
          selectedAreaId="dist-q8"
          onSelectArea={vi.fn()}
          forecastData={MOCK_FORECAST}
          isLoading={false}
          onExportReport={onExport}
          isExporting={false}
        />
      );

      fireEvent.click(screen.getByTestId("btn-export-report"));
      expect(onExport).toHaveBeenCalledWith("PDF");
    });
  });

  describe(" Modal Chi tiết điểm nóng & Điều động STT 43", () => {
    it("Hiển thị thông tin tổng hợp, thông báo lệnh đang chạy và kích hoạt Tạo lệnh xử lý", () => {
      const onClose = vi.fn();
      const onCreate = vi.fn();
      const onViewOrder = vi.fn();

      render(
        <Screen3HotspotDetailModal
          isOpen={true}
          onClose={onClose}
          detail={MOCK_DETAIL}
          isLoading={false}
          onCreateDispatch={onCreate}
          onViewActiveOrder={onViewOrder}
        />
      );

      expect(screen.getByTestId("detail-title")).toHaveTextContent("Kênh Đôi - Quận 8");
      expect(screen.getByTestId("detail-code")).toHaveTextContent("HS-Q8-001");
      expect(screen.getByTestId("detail-incident-count")).toHaveTextContent("42 sự cố");
      expect(screen.getByTestId("detail-risk-level")).toHaveTextContent("Rất nghiêm trọng");
      expect(screen.getByTestId("active-order-notice")).toHaveTextContent("DP-2026-001");

      fireEvent.click(screen.getByTestId("btn-view-active-order"));
      expect(onViewOrder).toHaveBeenCalledWith("DP-2026-001");

      fireEvent.click(screen.getByTestId("btn-create-dispatch"));
      expect(onCreate).toHaveBeenCalledWith(MOCK_DETAIL.suggested_dispatch);

      fireEvent.click(screen.getByTestId("btn-close-modal"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Header & Footer", () => {
    it("Chuyển đổi linh hoạt giữa tab Bản đồ và Dự báo 7 ngày", () => {
      const onScreenChange = vi.fn();
      render(
        <HotspotHeader
          activeScreen="map"
          onScreenChange={onScreenChange}
          userName="Nguyễn Văn A"
          userRole="Cán bộ môi trường"
        />
      );

      expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("tab-hotspot-forecast"));
      expect(onScreenChange).toHaveBeenCalledWith("forecast");
    });

    it("Footer hiển thị đúng thông tin bản quyền chuẩn hóa", () => {
      render(<HotspotFooter />);
      expect(screen.getByText(/Bản quyền © 2026 GreenSpot/)).toBeInTheDocument();
    });
  });
});
