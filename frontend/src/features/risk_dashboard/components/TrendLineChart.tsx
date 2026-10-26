import React, { useState } from "react";
import type { DailyTrendPoint } from "../types/riskDashboard.types";

interface TrendLineChartProps {
  trends: DailyTrendPoint[];
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ trends }) => {
  const [hoveredPoint, setHoveredPoint] = useState<DailyTrendPoint | null>(null);

  if (!trends || trends.length === 0) {
    return <div className="empty-state">Không có dữ liệu xu hướng 30 ngày</div>;
  }

  const width = 760;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const minVal = 30;
  const maxVal = 80;

  // Xây dựng chuỗi tọa độ cho đường path
  const points = trends.map((t, index) => {
    const x = paddingLeft + (index / (trends.length - 1)) * chartW;
    const norm = Math.min(Math.max((t.average_risk_score - minVal) / (maxVal - minVal), 0), 1);
    const y = paddingTop + chartH - norm * chartH;
    return { x, y, data: t };
  });

  const pathD = points.reduce((acc, curr, i) => {
    return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`;

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        role="img"
        aria-label="Biểu đồ đường xu hướng rủi ro môi trường 30 ngày gần nhất"
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Trục y và lưới */}
        {[30, 45, 60, 75].map((val) => {
          const norm = (val - minVal) / (maxVal - minVal);
          const y = paddingTop + chartH - norm * chartH;
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="2 2"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize={9} fill="#94a3b8">
                {val}
              </text>
            </g>
          );
        })}

        {/* Vùng đổ màu Gradient */}
        <path d={areaD} fill="url(#trendGradient)" />

        {/* Đường biểu đồ chính */}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Điểm nút & vùng bắt sự kiện */}
        {points.map((pt, i) => {
          const isSelected = hoveredPoint?.date === pt.data.date;
          // Hiển thị nhãn ngày cách quãng 5 ngày một lần
          const showDateLabel = i % 6 === 0 || i === points.length - 1;
          const displayDate = pt.data.date.slice(5); // MM-DD

          return (
            <g
              key={pt.data.date}
              onMouseEnter={() => setHoveredPoint(pt.data)}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 5 : 2.5}
                fill={isSelected ? "#059669" : "#10b981"}
                stroke="#ffffff"
                strokeWidth={1.5}
              />

              {showDateLabel && (
                <text x={pt.x} y={height - 8} textAnchor="middle" fontSize={9} fill="#64748b">
                  {displayDate}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip khi di chuột qua mốc thời gian */}
      {hoveredPoint && (
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 12,
            background: "rgba(15, 23, 42, 0.9)",
            color: "white",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            pointerEvents: "none",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 600 }}>Ngày {hoveredPoint.date}</div>
          <div>Điểm rủi ro TB: <span style={{ color: "#34d399", fontWeight: 700 }}>{hoveredPoint.average_risk_score}</span></div>
          <div>Sự cố đang mở: {hoveredPoint.open_incidents} vụ</div>
        </div>
      )}
    </div>
  );
};
