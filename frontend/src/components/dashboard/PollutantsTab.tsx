import React, { useState } from "react";
import type { TrendData, PollutantDetailsData, TrendHourlyPoint } from "./types";
import { LineChart } from "./charts/LineChart";
import { BarChart } from "./charts/BarChart";
import type { BarItem } from "./charts/BarChart";
import { HeatmapGrid } from "./charts/HeatmapGrid";

interface PollutantsTabProps {
  trendData: TrendData | null;
  pollutantData: PollutantDetailsData | null;
  selectedPollutant: string;
  onSelectPollutant: (poll: string) => void;
  loading: boolean;
}

const POLLUTANT_OPTIONS = [
  { key: "aqi", label: "Chỉ Số AQI", unit: "AQI", color: "#38bdf8" },
  { key: "pm2_5", label: "Bụi PM2.5", unit: "µg/m³", color: "#ef4444" },
  { key: "pm10", label: "Bụi PM10", unit: "µg/m³", color: "#f97316" },
  { key: "o3", label: "Ozone (O₃)", unit: "µg/m³", color: "#0ea5e9" },
  { key: "no2", label: "Nitơ Điôxít (NO₂)", unit: "µg/m³", color: "#14b8a6" },
  { key: "so2", label: "Lưu Huỳnh Điôxít (SO₂)", unit: "µg/m³", color: "#f59e0b" },
  { key: "co", label: "Cacbon Monoxit (CO)", unit: "µg/m³", color: "#6366f1" },
];

export const PollutantsTab: React.FC<PollutantsTabProps> = ({
  trendData,
  pollutantData,
  selectedPollutant,
  onSelectPollutant,
  loading,
}) => {
  const [activeMetric, setActiveMetric] = useState<keyof TrendHourlyPoint>(
    (selectedPollutant as keyof TrendHourlyPoint) || "aqi"
  );

  const curOption =
    POLLUTANT_OPTIONS.find((p) => p.key === activeMetric) || POLLUTANT_OPTIONS[0];

  const handleMetricChange = (key: string) => {
    setActiveMetric(key as keyof TrendHourlyPoint);
    if (key !== "aqi") {
      onSelectPollutant(key);
    }
  };

  const comparisonBarItems: BarItem[] =
    pollutantData?.comparisons.map((c) => ({
      label: c.name,
      value: c.value,
      color: c.exceeds ? "#ef4444" : "#22c55e",
      exceeds: c.exceeds,
    })) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* METRIC SELECTION PILLS */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
        <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600 }}>Chỉ số theo dõi:</span>
        {POLLUTANT_OPTIONS.map((opt) => {
          const isActive = activeMetric === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleMetricChange(opt.key)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: isActive ? `1px solid ${opt.color}` : "1px solid rgba(255,255,255,0.1)",
                background: isActive ? `${opt.color}25` : "rgba(30, 41, 59, 0.6)",
                color: isActive ? "#fff" : "#cbd5e1",
                fontSize: "12px",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: HOURLY TIME-SERIES LINE CHART */}
      <div
        style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
              Diễn Biến Chuỗi Thời Gian Theo Giờ: {curOption.label}
            </h3>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
              Nền biểu đồ hiển thị các dải phân cấp chuẩn quốc gia (Xanh: Tốt | Vàng: Vừa phải | Cam: Nhạy cảm | Đỏ: Xấu | Tím: Rất xấu)
            </div>
          </div>
        </div>

        {loading || !trendData ? (
          <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            Đang tải dữ liệu chuỗi thời gian...
          </div>
        ) : (
          <LineChart
            data={trendData.hourly}
            metricKey={activeMetric}
            metricLabel={curOption.label}
            metricUnit={curOption.unit}
            color={curOption.color}
            height={320}
            showAqiBands={activeMetric === "aqi"}
          />
        )}
      </div>

      {/* SECTION 2: PROVINCIAL COMPARISON & CORRELATION HEATMAP */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "24px",
        }}
      >
        {/* BAR CHART: 34 PROVINCES COMPARISON */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <BarChart
            items={comparisonBarItems}
            unit={pollutantData?.pollutant_meta.unit || "µg/m³"}
            whoThreshold={pollutantData?.pollutant_meta.who}
            height={380}
            orientation="horizontal"
            title={`So Sánh Nồng Độ ${pollutantData?.pollutant_meta.label || "PM2.5"} Giữa 34 Tỉnh/Thành (Vạch đỏ: Ngưỡng WHO ${pollutantData?.pollutant_meta.who || 15} ${pollutantData?.pollutant_meta.unit || "µg/m³"})`}
          />
        </div>

        {/* 6x6 CORRELATION MATRIX HEATMAP */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ marginBottom: "14px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
              Ma Trận Tương Quan Nhiệt 6 Chất Ô Nhiễm
            </h3>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
              Hệ số tương quan Pearson thể hiện mối liên hệ tương tác và nguồn phát thải chung.
            </div>
          </div>

          {pollutantData?.correlation_matrix ? (
            <HeatmapGrid
              columns={pollutantData.correlation_matrix.columns}
              rows={pollutantData.correlation_matrix.rows}
            />
          ) : (
            <div style={{ color: "#94a3b8" }}>Đang tính toán ma trận...</div>
          )}
        </div>
      </div>
    </div>
  );
};
export default PollutantsTab;
