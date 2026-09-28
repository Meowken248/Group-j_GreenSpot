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

  const minTemp = Math.floor(Math.min(...temps) * 0.9);
  const maxTemp = Math.ceil(Math.max(...temps) * 1.1);

  const minRain = 0;
  const maxRain = Math.max(10, Math.ceil(Math.max(...rains) * 1.2));

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

      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
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

        {/* X Axis Labels (Temperature) */}
        {Array.from({ length: 5 }).map((_, i) => {
          const t = Math.round(minTemp + (i / 4) * (maxTemp - minTemp));
          return (
            <text
              key={i}
              x={getX(t)}
              y={chartHeight - 12}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="middle"
            >
              {t}°C
            </text>
          );
        })}
        <text
          x={paddingLeft + innerW / 2}
          y={chartHeight - 0}
          fill="#cbd5e1"
          fontSize="11"
          textAnchor="middle"
          fontWeight="600"
        >
          Nhiệt độ trung bình (°C)
        </text>

        {/* Y Axis Labels (Rainfall) */}
        {Array.from({ length: 4 }).map((_, i) => {
          const r = Math.round(minRain + (i / 3) * (maxRain - minRain));
          return (
            <text
              key={i}
              x={paddingLeft - 8}
              y={getY(r) + 4}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="end"
            >
              {r}mm
            </text>
          );
        })}
        <text
          x={15}
          y={paddingTop + innerH / 2}
          fill="#cbd5e1"
          fontSize="11"
          textAnchor="middle"
          fontWeight="600"
          transform={`rotate(-90 15 ${paddingTop + innerH / 2})`}
        >
          Lượng mưa (mm/ngày)
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
