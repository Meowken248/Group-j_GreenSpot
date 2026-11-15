import React, { useState } from "react";
import type { ScatterProvinceItem } from "../types";

interface ScatterPlotProps {
  provinces: ScatterProvinceItem[];
  height?: number;
}

const REGION_COLORS: Record<string, string> = {
  "Miền Bắc": "#38bdf8",
  "Miền Trung": "#f59e0b",
  "Miền Nam": "#10b981",
};

export const ScatterPlot: React.FC<ScatterPlotProps> = ({ provinces, height = 340 }) => {
  const [hoveredPoint, setHoveredPoint] = useState<ScatterProvinceItem | null>(null);

  if (!provinces || provinces.length === 0) {
    return <div style={{ color: "#94a3b8" }}>Không có dữ liệu phân tán.</div>;
  }

  const paddingLeft = 55;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 45;

  const chartWidth = 700;
  const chartHeight = height;

  const innerW = chartWidth - paddingLeft - paddingRight;
  const innerH = chartHeight - paddingTop - paddingBottom;

  const temps = provinces.map((p) => p.temp);
  const rains = provinces.map((p) => p.rain);

  const rawMinTemp = Math.min(...temps);
  const rawMaxTemp = Math.max(...temps);
  const minTemp = Math.floor(rawMinTemp - 1);
  const maxTemp = Math.ceil(rawMaxTemp + 1);

  const rawMaxRain = Math.max(...rains);
  const minRain = 0;
  // Adaptive domain so points comfortably occupy 70-85% of height instead of clustering at bottom
  const maxRain = Math.max(4, Math.ceil(rawMaxRain * 1.35));

  const getX = (t: number) => paddingLeft + ((t - minTemp) / (maxTemp - minTemp || 1)) * innerW;
  const getY = (r: number) => paddingTop + innerH - ((r - minRain) / (maxRain - minRain || 1)) * innerH;

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "8px", fontSize: "12px", color: "#cbd5e1" }}>
        {Object.entries(REGION_COLORS).map(([reg, col]) => (
          <div key={reg} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: col }} />
            <span>{reg}</span>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif",
        }}
      >
        {/* Axes */}
        <line
          x1={paddingLeft}
          y1={paddingTop + innerH}
          x2={chartWidth - paddingRight}
          y2={paddingTop + innerH}
          stroke="rgba(255,255,255,0.2)"
        />
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={paddingTop + innerH}
          stroke="rgba(255,255,255,0.2)"
        />

        {/* Horizontal Y-axis title above the axis - eliminates vertical rotation font bugs */}
        <text
          x={paddingLeft}
          y={paddingTop - 10}
          fill="#94a3b8"
          fontSize="11"
          fontWeight="600"
        >
          Lượng mưa (mm/ngày) ↑
        </text>

        {/* Y Axis Grid Lines & Labels (Rainfall) */}
        {Array.from({ length: 5 }).map((_, i) => {
          const r = Math.round((i / 4) * maxRain * 10) / 10;
          const yPos = getY(r);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={chartWidth - paddingRight}
                y2={yPos}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 8}
                y={yPos + 4}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="end"
              >
                {r}mm
              </text>
            </g>
          );
        })}

        {/* X Axis Grid Lines & Labels (Temperature) */}
        {Array.from({ length: 5 }).map((_, i) => {
          const t = Math.round(minTemp + (i / 4) * (maxTemp - minTemp));
          const xPos = getX(t);
          return (
            <g key={i}>
              <line
                x1={xPos}
                y1={paddingTop}
                x2={xPos}
                y2={paddingTop + innerH}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="3 3"
              />
              <text
                x={xPos}
                y={chartHeight - 16}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
              >
                {t}°C
              </text>
            </g>
          );
        })}

        <text
          x={paddingLeft + innerW / 2}
          y={chartHeight - 2}
          fill="#cbd5e1"
          fontSize="11"
          textAnchor="middle"
          fontWeight="600"
        >
          Nhiệt độ trung bình (°C) →
        </text>


        {/* Points */}
        {provinces.map((p, idx) => {
          const cx = getX(p.temp);
          const cy = getY(p.rain);
          const color = REGION_COLORS[p.region] || "#38bdf8";
          const radius = Math.max(5, Math.min(12, p.aqi / 15));
          const isHovered = hoveredPoint?.slug === p.slug;

          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={isHovered ? radius + 3 : radius}
              fill={color}
              fillOpacity={isHovered ? 0.95 : 0.7}
              stroke="#ffffff"
              strokeWidth={isHovered ? 2 : 1}
              style={{ cursor: "pointer", transition: "r 0.15s ease" }}
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          );
        })}
      </svg>

      {/* Hover Floating Tooltip */}
      {hoveredPoint && (
        <div
          style={{
            position: "absolute",
            left: `${(getX(hoveredPoint.temp) / chartWidth) * 100}%`,
            top: `${(getY(hoveredPoint.rain) / chartHeight) * 100}%`,
            transform: "translate(-50%, -125%)",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            color: "#fff",
            pointerEvents: "none",
            boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700, color: "#38bdf8" }}>{hoveredPoint.name}</div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>{hoveredPoint.region}</div>
          <div style={{ marginTop: "4px" }}>
            Nhiệt độ: <strong>{hoveredPoint.temp}°C</strong> | Mưa: <strong>{hoveredPoint.rain}mm</strong>
          </div>
          <div>
            Chỉ số AQI: <strong>{hoveredPoint.aqi}</strong>
          </div>
        </div>
      )}
    </div>
  );
};
export default ScatterPlot;
