import React, { useState } from "react";

export interface CurvePoint {
  range: string;
  pm2_5: number;
  reduction_pct?: number;
  washout_reduction_pct?: number;
  sample_count?: number;
}

interface CurveChartProps {
  data: CurvePoint[];
  title: string;
  subtitle: string;
  color?: string;
  reductionKey?: "reduction_pct" | "washout_reduction_pct";
}

export const CurveChart: React.FC<CurveChartProps> = ({
  data,
  title,
  subtitle,
  color = "#38bdf8",
  reductionKey = "reduction_pct",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div style={{ color: "#94a3b8" }}>Không có dữ liệu đường cong.</div>;
  }

  const maxPM = Math.max(...data.map((d) => d.pm2_5), 30);
  const baselinePM = data[0]?.pm2_5 || 1;

  return (
    <div
      style={{
        background: "rgba(30, 41, 59, 0.4)",
        borderRadius: "12px",
        padding: "16px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {data.map((pt, idx) => {
          const isHovered = hoveredIdx === idx;
          const barWidthPct = Math.max(10, Math.min(100, (pt.pm2_5 / maxPM) * 100));
          const redVal = pt[reductionKey] ?? Math.round(((baselinePM - pt.pm2_5) / baselinePM) * 100);

          return (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "150px 1fr 100px",
                alignItems: "center",
                gap: "12px",
                fontSize: "12px",
                cursor: "pointer",
                padding: "6px 8px",
                borderRadius: "6px",
                background: isHovered ? "rgba(255, 255, 255, 0.04)" : "transparent",
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Range Label */}
              <div style={{ color: isHovered ? "#fff" : "#cbd5e1", fontWeight: 600 }}>
                {pt.range}
              </div>

              {/* Progress Bar of PM2.5 */}
              <div style={{ position: "relative", height: "20px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${barWidthPct}%`,
                    height: "100%",
                    background: color,
                    borderRadius: "4px",
                    transition: "width 0.4s ease",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "2px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#ffffff",
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  }}
                >
                  {pt.pm2_5} µg/m³
                </span>
              </div>

              {/* Reduction Pill */}
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: redVal > 0 ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                    color: redVal > 0 ? "#4ade80" : "#94a3b8",
                  }}
                >
                  {redVal > 0 ? `▼ Giảm ${redVal}%` : "Gốc (0%)"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default CurveChart;
