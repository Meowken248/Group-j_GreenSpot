import React, { useState } from "react";
import type { CorrelationRow } from "../types";

interface HeatmapGridProps {
  columns: string[];
  rows: CorrelationRow[];
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({ columns, rows }) => {
  const [hoveredCell, setHoveredCell] = useState<{ r: string; c: string; val: number } | null>(null);

  if (!columns || columns.length === 0 || !rows || rows.length === 0) {
    return <div style={{ color: "#94a3b8", textAlign: "center" }}>Không đủ dữ liệu ma trận tương quan.</div>;
  }

  // Get color for correlation value between -1.0 and +1.0
  const getColor = (val: number) => {
    if (val >= 0.7) return "rgba(239, 68, 68, 0.85)"; // High positive: Red
    if (val >= 0.4) return "rgba(249, 115, 22, 0.75)"; // Moderate positive: Orange
    if (val >= 0.1) return "rgba(234, 179, 8, 0.65)"; // Low positive: Yellow
    if (val >= -0.1) return "rgba(148, 163, 184, 0.15)"; // Neutral: Slate
    if (val >= -0.4) return "rgba(14, 165, 233, 0.6)"; // Low negative: Cyan
    return "rgba(59, 130, 246, 0.85)"; // High negative: Blue
  };

  return (
    <div style={{ width: "100%", overflowX: "auto", position: "relative" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "center" }}>
        <thead>
          <tr>
            <th style={{ padding: "8px", color: "#94a3b8", textAlign: "left", fontWeight: 500 }}>Chất</th>
            {columns.map((col, idx) => (
              <th key={idx} style={{ padding: "8px", color: "#cbd5e1", fontWeight: 600 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              <td style={{ padding: "8px", color: "#f8fafc", fontWeight: 600, textAlign: "left" }}>
                {row.pollutant}
              </td>
              {row.values.map((val, cIdx) => {
                const bg = getColor(val);
                const colName = columns[cIdx];
                return (
                  <td
                    key={cIdx}
                    style={{
                      padding: "10px",
                      background: bg,
                      color: Math.abs(val) > 0.3 ? "#fff" : "#94a3b8",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: "transform 0.15s ease",
                    }}
                    onMouseEnter={() => setHoveredCell({ r: row.pollutant, c: colName, val })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Floating Hover Details */}
      {hoveredCell && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 12px",
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#e2e8f0",
          }}
        >
          Hệ số tương quan giữa <strong>{hoveredCell.r}</strong> và <strong>{hoveredCell.c}</strong> là{" "}
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>
            {hoveredCell.val > 0 ? `+${hoveredCell.val.toFixed(2)}` : hoveredCell.val.toFixed(2)}
          </span>
          {" - "}
          {Math.abs(hoveredCell.val) >= 0.7
            ? "Tương quan rất mạnh"
            : Math.abs(hoveredCell.val) >= 0.4
              ? "Tương quan đáng kể"
              : Math.abs(hoveredCell.val) >= 0.2
                ? "Tương quan yếu"
                : "Hầu như không tương quan tuyến tính"}
        </div>
      )}
    </div>
  );
};
export default HeatmapGrid;
