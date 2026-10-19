import React, { useState } from "react";
import type { DistrictRiskItem } from "../types/riskDashboard.types";

interface BarChartProps {
  districts: DistrictRiskItem[];
  onSelectDistrict: (districtName: string) => void;
}

export const BarChart: React.FC<BarChartProps> = ({ districts, onSelectDistrict }) => {
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictRiskItem | null>(null);

  if (!districts || districts.length === 0) {
    return <div className="empty-state">Không có dữ liệu biểu đồ quận/huyện</div>;
  }

  const height = 220;
  const paddingBottom = 40;
  const paddingTop = 25;
  const chartHeight = height - paddingBottom - paddingTop;
  const maxScore = 100;

  const getBarColor = (score: number) => {
    if (score > 80) return "#ef4444"; // Red (Critical)
    if (score >= 60) return "#f59e0b"; // Orange/Amber (High)
    if (score >= 40) return "#eab308"; // Yellow (Medium)
    return "#10b981"; // Green (Low/Safe)
  };

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <svg
        viewBox={`0 0 760 ${height}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        role="img"
        aria-label="Biểu đồ cột rủi ro môi trường 22 quận huyện và TP Thủ Đức"
      >
        {/* Horizontal grid lines */}
        {[0, 25, 50, 75, 100].map((val) => {
          const y = paddingTop + chartHeight - (val / maxScore) * chartHeight;
          return (
            <g key={val}>
              <line
                x1={35}
                y1={y}
                x2={750}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray={val === 80 ? "4 2" : "2 2"}
                strokeWidth={val === 80 ? 1.5 : 1}
                strokeOpacity={val === 80 ? 0.9 : 0.6}
              />
              <text
                x={28}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill={val === 80 ? "#ef4444" : "#94a3b8"}
                fontWeight={val === 80 ? "bold" : "normal"}
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Ngưỡng báo động đỏ 80 điểm */}
        <line
          x1={35}
          y1={paddingTop + chartHeight - (80 / maxScore) * chartHeight}
          x2={750}
          y2={paddingTop + chartHeight - (80 / maxScore) * chartHeight}
          stroke="#ef4444"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />

        {/* Cột dữ liệu từng quận */}
        {districts.map((d, index) => {
          const barWidth = 22;
          const gap = (750 - 45 - districts.length * barWidth) / Math.max(1, districts.length - 1);
          const x = 45 + index * (barWidth + gap);
          const barH = (d.risk_score / maxScore) * chartHeight;
          const y = paddingTop + chartHeight - barH;
          const color = getBarColor(d.risk_score);
          const isSelected = hoveredDistrict?.district_name === d.district_name;

          // Rút gọn nhãn tên quận hiển thị dưới trục x
          const shortName = d.district_name
            .replace("Quận ", "Q.")
            .replace("Huyện ", "H.")
            .replace("Thành phố ", "TP.")
            .replace("TP. ", "");

          return (
            <g
              key={d.district_name}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectDistrict(d.district_name)}
              onMouseEnter={() => setHoveredDistrict(d)}
              onMouseLeave={() => setHoveredDistrict(null)}
            >
              {/* Cột */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(4, barH)}
                rx={3}
                fill={color}
                opacity={isSelected ? 1 : 0.85}
                stroke={isSelected ? "#0f172a" : "none"}
                strokeWidth={isSelected ? 1.5 : 0}
                style={{ transition: "all 0.2s ease" }}
              />

              {/* Điểm số trên đỉnh cột nếu cao hoặc đang hover */}
              {(isSelected || d.risk_score > 80) && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight="bold"
                  fill={color}
                >
                  {d.risk_score}
                </text>
              )}

              {/* Tên quận nghiêng dưới trục x */}
              <text
                x={x + barWidth / 2}
                y={height - 18}
                textAnchor="end"
                fontSize={9}
                fill={isSelected ? "#0f172a" : "#64748b"}
                fontWeight={isSelected ? "bold" : "normal"}
                transform={`rotate(-45, ${x + barWidth / 2}, ${height - 18})`}
              >
                {shortName}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip khi hover vào cột */}
      {hoveredDistrict && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 12,
            background: "rgba(15, 23, 42, 0.9)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            pointerEvents: "none",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700 }}>{hoveredDistrict.district_name}</div>
          <div>Điểm rủi ro: <span style={{ color: getBarColor(hoveredDistrict.risk_score), fontWeight: 700 }}>{hoveredDistrict.risk_score}/100</span></div>
          <div>Sự cố mở: {hoveredDistrict.open_incidents} | Cơ sở đe dọa: {hoveredDistrict.threatened_facilities}</div>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Nhấp để xem chi tiết quận</div>
        </div>
      )}
    </div>
  );
};
