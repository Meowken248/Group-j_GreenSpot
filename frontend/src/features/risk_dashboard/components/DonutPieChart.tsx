import React, { useState } from "react";
import type { RiskTypeDistributionItem } from "../types/riskDashboard.types";

interface DonutPieChartProps {
  data: RiskTypeDistributionItem[];
}

export const DonutPieChart: React.FC<DonutPieChartProps> = ({ data }) => {
  const [hoveredSlice, setHoveredSlice] = useState<RiskTypeDistributionItem | null>(null);

  if (!data || data.length === 0) {
    return <div className="empty-state">Không có dữ liệu cơ cấu rủi ro</div>;
  }

  const size = 200;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
      {/* SVG Donut Chart */}
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {data.map((item) => {
            const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
            accumulatedPercent += item.percentage;
            const isHovered = hoveredSlice?.type_code === item.type_code;

            return (
              <circle
                key={item.type_code}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={item.color_hex}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{
                  transition: "stroke-width 0.2s ease, opacity 0.2s ease",
                  cursor: "pointer",
                  opacity: isHovered || !hoveredSlice ? 1 : 0.65,
                }}
                onMouseEnter={() => setHoveredSlice(item)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          {hoveredSlice ? (
            <>
              <span style={{ fontSize: "18px", fontWeight: 800, color: hoveredSlice.color_hex }}>
                {hoveredSlice.percentage}%
              </span>
              <span style={{ fontSize: "10px", color: "#64748b", maxWidth: "90px", lineHeight: "1.2" }}>
                {hoveredSlice.type_name}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: "16px", fontWeight: 800 }}>Cơ cấu</span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Rủi ro</span>
            </>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: "170px" }}>
        {data.map((item) => {
          const isHovered = hoveredSlice?.type_code === item.type_code;
          return (
            <div
              key={item.type_code}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                fontSize: "12px",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: "4px",
                background: isHovered ? "rgba(226, 232, 240, 0.5)" : "transparent",
              }}
              onMouseEnter={() => setHoveredSlice(item)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: item.color_hex,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontWeight: isHovered ? 700 : 500 }}>{item.type_name}</span>
              </div>
              <span style={{ fontWeight: 700, color: item.color_hex }}>{item.percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
