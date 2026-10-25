import React from "react";
import type {
  AreaOptionItem,
  ForecastResponse,
} from "../types/hotspot.types";

interface Screen2ForecastDashboardProps {
  areas: AreaOptionItem[];
  selectedAreaId: string;
  onSelectArea: (areaId: string) => void;
  forecastData: ForecastResponse | null;
  isLoading: boolean;
  onExportReport: (format: "PDF" | "EXCEL") => void;
  isExporting: boolean;
}

export const Screen2ForecastDashboard: React.FC<Screen2ForecastDashboardProps> = ({
  areas,
  selectedAreaId,
  onSelectArea,
  forecastData,
  isLoading,
  onExportReport,
  isExporting,
}) => {
  // Tính toán toạ độ vẽ SVG SVG Line Chart & Confidence Interval Band 95%
  const renderSvgLineChart = (data: ForecastResponse) => {
    const points = data.points;
    if (!points || points.length === 0) return null;

    const width = 640;
    const height = 300;
    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 30;
    const paddingBottom = 45;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    // Tìm giá trị max Y để scale
    const maxY = Math.max(
      ...points.map((p) => Math.max(p.predicted_incidents, p.ci_upper_95)),
      30
    );

    const getX = (index: number) =>
      paddingLeft + (index / (points.length - 1)) * graphWidth;

    const getY = (val: number) =>
      paddingTop + graphHeight - (val / maxY) * graphHeight;

    // Toạ độ đường biểu diễn giá trị dự báo
    const mainLinePoints = points
      .map((p, idx) => `${getX(idx)},${getY(p.predicted_incidents)}`)
      .join(" ");

    // Tạo Polygon cho dải bóng mờ khoảng tin cậy 95% (Upper curve xuôi, Lower curve ngược lại)
    const upperPoints = points.map((p, idx) => `${getX(idx)},${getY(p.ci_upper_95)}`);
    const lowerPointsReversed = [...points]
      .reverse()
      .map((p, idx) => {
        const origIdx = points.length - 1 - idx;
        return `${getX(origIdx)},${getY(p.ci_lower_95)}`;
      });

    const confidencePolygon = [...upperPoints, ...lowerPointsReversed].join(" ");

    // Mốc giá trị trục Y (4 mức)
    const yTicks = [0, Math.round(maxY * 0.33), Math.round(maxY * 0.66), maxY];

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        aria-label="Biểu đồ dự báo chuỗi thời gian 7 ngày"
        data-testid="forecast-line-chart-svg"
      >
        <defs>
          <linearGradient id="ciBandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>

        {/* Các đường lưới ngang (Grid lines) */}
        {yTicks.map((tickVal) => {
          const y = getY(tickVal);
          return (
            <g key={tickVal}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                className="chart-grid-line"
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                className="chart-axis-text"
                fontSize="11"
                fill="#94a3b8"
              >
                {tickVal}
              </text>
            </g>
          );
        })}

        {/* Dải bóng mờ khoảng tin cậy 95% (95% Confidence Interval Band) */}
        <polygon
          points={confidencePolygon}
          fill="url(#ciBandGrad)"
          data-testid="confidence-interval-band"
        />

        {/* Đường xu hướng chính (Forecast Line) */}
        <polyline
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={mainLinePoints}
          data-testid="forecast-main-line"
        />

        {/* Các điểm dữ liệu tròn kèm nhãn trục X */}
        {points.map((p, idx) => {
          const cx = getX(idx);
          const cy = getY(p.predicted_incidents);
          const isPeak = p.risk_level === "PEAK_CRITICAL";

          return (
            <g key={p.date} data-testid={`chart-point-${idx}`}>
              {/* Vòng hào quang nếu là ngày nguy cơ đỉnh */}
              {isPeak && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="10"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  opacity="0.6"
                >
                  <animate
                    attributeName="r"
                    values="7;14;7"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;0.1;0.8"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              <circle
                cx={cx}
                cy={cy}
                r={isPeak ? "6" : "5"}
                fill={isPeak ? "#dc2626" : "#ffffff"}
                stroke={isPeak ? "#ffffff" : "#0284c7"}
                strokeWidth="2.5"
              />

              {/* Nhãn số lượng trên đỉnh nút */}
              <text
                x={cx}
                y={cy - 12}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill={isPeak ? "#dc2626" : "#0f172a"}
              >
                {p.predicted_incidents}
              </text>

              {/* Nhãn trục X: Thứ & Ngày */}
              <text
                x={cx}
                y={height - paddingBottom + 16}
                textAnchor="middle"
                fontSize="11.5"
                fontWeight="600"
                fill="#334155"
              >
                {p.day_of_week}
              </text>
              <text
                x={cx}
                y={height - paddingBottom + 30}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
              >
                {p.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="screen2-layout" data-testid="screen2-forecast-dashboard">
      {/* CỘT TRÁI: CHỌN KHU VỰC */}
      <aside className="filter-card" aria-label="Khối chọn khu vực dự báo">
        <div className="filter-group">
          <label htmlFor="select-forecast-area" className="filter-label">
            Khu vực phân tích
          </label>
          <select
            id="select-forecast-area"
            className="custom-select"
            value={selectedAreaId}
            onChange={(e) => onSelectArea(e.target.value)}
            data-testid="select-forecast-area"
          >
            <optgroup label="Quận / Huyện">
              {areas
                .filter((a) => a.type === "DISTRICT")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Cụm điểm nóng trọng điểm">
              {areas
                .filter((a) => a.type === "HOTSPOT")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        <div className="filter-summary-meta">
          <strong>Mô hình dự báo:</strong> Chuỗi thời gian hồi quy tích hợp dữ liệu thuỷ triều, lịch sử phản ánh và thông số khí tượng.
        </div>
      </aside>

      {/* CỘT GIỮA: BIỂU ĐỒ ĐƯỜNG DỰ BÁO 7 NGÀY */}
      <section className="forecast-chart-card" aria-label="Biểu đồ dự báo 7 ngày">
        <div className="chart-header">
          <div className="chart-title-area">
            <h2 className="card-title">
              Dự báo xu hướng sự cố 7 ngày tới - {forecastData?.target_name || "Đang tải..."}
            </h2>
            <div className="card-sub">
              Dải bóng mờ đại diện khoảng tin cậy 95% (Confidence Interval)
            </div>
          </div>

          {forecastData && (
            <div className="accuracy-pill" data-testid="model-accuracy-badge">
              <span>🎯</span>
              <span>Độ chính xác: {forecastData.model_accuracy_pct}%</span>
            </div>
          )}
        </div>

        {/* Cảnh báo thời tiết cam nếu có */}
        {forecastData?.has_weather_warning && (
          <div className="weather-alert-box" data-testid="weather-warning-alert">
            <span>⚠️</span>
            <span>{forecastData.weather_warning_message}</span>
          </div>
        )}

        {/* Khung vẽ biểu đồ hoặc skeleton loading */}
        <div className="chart-canvas-area">
          {isLoading || !forecastData ? (
            <div
              className="skeleton-box"
              style={{ width: "100%", height: "280px" }}
              data-testid="chart-loading-skeleton"
            />
          ) : (
            renderSvgLineChart(forecastData)
          )}
        </div>
      </section>

      {/* CỘT PHẢI: TÓM TẮT & XUẤT BÁO CÁO */}
      <aside className="forecast-summary-card" aria-label="Tóm tắt rủi ro và xuất báo cáo">
        <div className="summary-header">
          <h2 className="summary-title">Tóm tắt phân tích</h2>
        </div>

        {/* Panel ngày nguy cơ cao nhất */}
        <div className="peak-risk-panel" data-testid="peak-risk-panel">
          <div className="peak-tag">Ngày nguy cơ cao nhất</div>
          <div className="peak-desc">
            {forecastData?.peak_risk_summary || "Đang phân tích dữ liệu rủi ro cao điểm..."}
          </div>
        </div>

        {/* Danh sách khuyến nghị */}
        <div className="recommendation-list">
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
            Khuyến nghị tác nghiệp:
          </div>
          {forecastData?.recommendations?.map((rec, i) => (
            <div key={i} className="rec-item">
              <span className="bullet">•</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>

        {/* Cụm xuất báo cáo */}
        <div className="export-action-block">
          <button
            type="button"
            className="btn-export-report"
            onClick={() => onExportReport("PDF")}
            disabled={isExporting || isLoading}
            data-testid="btn-export-report"
          >
            <span>📄</span>
            <span>{isExporting ? "Đang xuất báo cáo..." : "Xuất báo cáo (PDF)"}</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
