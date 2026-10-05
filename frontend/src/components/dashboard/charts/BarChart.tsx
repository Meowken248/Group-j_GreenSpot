import React, { useState } from "react";

export interface BarItem {
  label: string;
  value: number;
  color?: string;
  subLabel?: string;
  exceeds?: boolean;
}

interface BarChartProps {
  items: BarItem[];
  unit?: string;
  whoThreshold?: number;
  height?: number;
  orientation?: "horizontal" | "vertical";
  title?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  items,
  unit = "µg/m³",
  whoThreshold,
  height = 360,
  orientation = "horizontal",
  title,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!items || items.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
        Không có dữ liệu biểu đồ.
      </div>
    );
  }

  const maxVal = Math.max(...items.map((i) => i.value), whoThreshold ? whoThreshold * 1.2 : 10);

  if (orientation === "horizontal") {
    return (
      <div style={{ width: "100%", maxHeight: height, overflowY: "auto", paddingRight: "8px" }}>
        {title && (
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc", marginBottom: "12px" }}>
            {title}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map((item, idx) => {
            const pct = Math.min(100, Math.max(3, (item.value / maxVal) * 100));
            const isHovered = hoveredIdx === idx;
            const barColor = item.color || (item.exceeds ? "#ef4444" : "#22c55e");

            return (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 1fr 65px",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Label */}
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: isHovered ? "#fff" : "#cbd5e1",
                    fontWeight: isHovered ? 600 : 400,
                  }}
                  title={item.label}
                >
                  {item.label}
                </div>

                {/* Bar Track */}
                <div
                  style={{
                    position: "relative",
                    background: "rgba(255, 255, 255, 0.06)",
                    borderRadius: "4px",
                    height: "18px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: isHovered ? barColor : `${barColor}cc`,
                      borderRadius: "4px",
                      transition: "width 0.5s ease-out, background 0.2s",
                    }}
                  />
                  {/* WHO Threshold marker */}
                  {whoThreshold && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${(whoThreshold / maxVal) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: "2px",
                        background: "#ef4444",
                        boxShadow: "0 0 6px #ef4444",
                        zIndex: 2,
                      }}
                      title={`Ngưỡng WHO: ${whoThreshold} ${unit}`}
                    />
                  )}
                </div>

                {/* Value */}
                <div style={{ textAlign: "right", color: isHovered ? "#38bdf8" : "#94a3b8", fontWeight: 600 }}>
                  {item.value} <span style={{ fontSize: "10px", fontWeight: 400 }}>{unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical Bar Chart
  return (
    <div style={{ width: "100%", height, display: "flex", flexDirection: "column" }}>
      {title && (
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc", marginBottom: "12px" }}>
          {title}
        </div>
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "8px",
          paddingBottom: "24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          position: "relative",
        }}
      >
        {items.map((item, idx) => {
          const hPct = Math.min(100, Math.max(4, (item.value / maxVal) * 100));
          const isHovered = hoveredIdx === idx;
          const barColor = item.color || "#38bdf8";

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
                justifyContent: "flex-end",
                position: "relative",
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip on Hover */}
              {isHovered && (
                <div
                  style={{
                    position: "absolute",
                    bottom: `${hPct + 8}%`,
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                  }}
                >
                  <strong>{item.value}</strong> {unit} ({item.subLabel || ""})
                </div>
              )}

              {/* Bar */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "42px",
                  height: `${hPct}%`,
                  background: isHovered ? barColor : `${barColor}bb`,
                  borderRadius: "6px 6px 0 0",
                  transition: "height 0.4s ease, background 0.2s",
                  cursor: "pointer",
                }}
              />

              {/* Bottom Label */}
              <div
                style={{
                  position: "absolute",
                  bottom: "-24px",
                  fontSize: "10px",
                  color: isHovered ? "#fff" : "#94a3b8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "60px",
                  textAlign: "center",
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default BarChart;
