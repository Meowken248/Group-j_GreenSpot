import React, { useState, useRef } from "react";
import type { TrendHourlyPoint } from "../types";

interface LineChartProps {
  data: TrendHourlyPoint[];
  metricKey: keyof TrendHourlyPoint;
  metricLabel: string;
  metricUnit: string;
  color?: string;
  height?: number;
  showAqiBands?: boolean;
}

const AQI_BANDS = [
  { min: 0, max: 50, color: "rgba(34, 197, 94, 0.12)", label: "Tốt (0-50)" },
  { min: 50, max: 100, color: "rgba(234, 179, 8, 0.12)", label: "Vừa phải (51-100)" },
  { min: 100, max: 150, color: "rgba(249, 115, 22, 0.12)", label: "Nhạy cảm (101-150)" },
  { min: 150, max: 200, color: "rgba(239, 68, 68, 0.12)", label: "Xấu (151-200)" },
  { min: 200, max: 300, color: "rgba(168, 85, 247, 0.12)", label: "Rất xấu (201-300)" },
];

export const LineChart: React.FC<LineChartProps> = ({
  data,
  metricKey,
  metricLabel,
  metricUnit,
  color = "#0ea5e9",
  height = 320,
  showAqiBands = true,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
        Không có dữ liệu chuỗi thời gian cho mốc đã chọn.
      </div>
    );
  }

  const values = data.map((d) => Number(d[metricKey]) || 0);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minVal = Math.max(0, Math.floor(rawMin * 0.85));
  const maxVal = Math.max(showAqiBands ? 150 : 50, Math.ceil(rawMax * 1.15));

  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;
  const chartWidth = 800; // SVG viewBox coordinate width
  const chartHeight = height;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const range = maxVal - minVal || 1;
    return paddingTop + innerHeight - ((val - minVal) / range) * innerHeight;
  };

  // Generate smooth SVG curve path
  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(Number(d[metricKey]) || 0),
  }));

  const linePath = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cpX = (prev.x + pt.x) / 2;
    return `${acc} C ${cpX},${prev.y} ${cpX},${pt.y} ${pt.x},${pt.y}`;
  }, "");

  const areaPath = `${linePath} L ${points[points.length - 1].x},${paddingTop + innerHeight} L ${points[0].x},${paddingTop + innerHeight} Z`;

  // Horizontal Grid Lines
  const yTicks = 5;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = minVal + (i / yTicks) * (maxVal - minVal);
    return { val: Math.round(val), y: getY(val) };
  });

  // Handle pointer tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relX = (clientX / rect.width) * chartWidth;
    const boundedX = Math.max(paddingLeft, Math.min(chartWidth - paddingRight, relX));
    const ratio = (boundedX - paddingLeft) / innerWidth;
    const nearestIdx = Math.round(ratio * (data.length - 1));
    setHoveredIdx(Math.max(0, Math.min(data.length - 1, nearestIdx)));
  };

  const hoveredPoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height, userSelect: "none" }}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        onMouseMove={handleMouseMove}
      >
        <defs>
          <linearGradient id={`grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* AQI Color Bands in Background */}
        {showAqiBands &&
          metricKey === "aqi" &&
          AQI_BANDS.map((band, idx) => {
            if (band.min > maxVal || band.max < minVal) return null;
            const topY = getY(Math.min(band.max, maxVal));
            const bottomY = getY(Math.max(band.min, minVal));
            const h = Math.max(0, bottomY - topY);
            return (
              <rect
                key={idx}
                x={paddingLeft}
                y={topY}
                width={innerWidth}
                height={h}
                fill={band.color}
              />
            );
          })}

        {/* Grid Lines & Y Axis Labels */}
        {gridLines.map((gl, i) => (
          <g key={i}>
            <line
              x1={paddingLeft}
              y1={gl.y}
              x2={chartWidth - paddingRight}
              y2={gl.y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 10}
              y={gl.y + 4}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="end"
              fontFamily="sans-serif"
            >
              {gl.val}
            </text>
          </g>
        ))}

        {/* X Axis Time Labels (Sample 6 evenly spaced) */}
        {Array.from({ length: 6 }).map((_, i) => {
          const idx = Math.round((i / 5) * (data.length - 1));
          if (!data[idx]) return null;
          return (
            <text
              key={i}
              x={getX(idx)}
              y={chartHeight - 12}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              {data[idx].short_time}
            </text>
          );
        })}

        {/* Shaded Area & Line */}
        <path d={areaPath} fill={`url(#grad-${metricKey})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover Crosshair & Marker */}
        {hoveredIdx !== null && hoveredPoint && (
          <g>
            <line
              x1={getX(hoveredIdx)}
              y1={paddingTop}
              x2={getX(hoveredIdx)}
              y2={paddingTop + innerHeight}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <circle
              cx={getX(hoveredIdx)}
              cy={getY(Number(hoveredPoint[metricKey]) || 0)}
              r="5"
              fill={color}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && hoveredPoint && (
        <div
          style={{
            position: "absolute",
            left: `${(getX(hoveredIdx) / chartWidth) * 100}%`,
            top: `${(getY(Number(hoveredPoint[metricKey]) || 0) / chartHeight) * 100}%`,
            transform: "translate(-50%, -125%)",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "#fff",
            fontSize: "12px",
            pointerEvents: "none",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: "4px" }}>
            {hoveredPoint.timestamp}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            <span>
              {metricLabel}: <strong>{hoveredPoint[metricKey]}</strong> {metricUnit}
            </span>
          </div>
          {metricKey !== "aqi" && (
            <div style={{ color: "#cbd5e1", marginTop: "2px" }}>
              AQI thời điểm này: <strong>{hoveredPoint.aqi}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default LineChart;
