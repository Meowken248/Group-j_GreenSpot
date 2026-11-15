import React from "react";
import type { InteractionData } from "./types";
import { CurveChart } from "./charts/CurveChart";

interface InteractionTabProps {
  data: InteractionData | null;
  loading: boolean;
  onSelectProvince?: (slug: string) => void;
}

export const InteractionTab: React.FC<InteractionTabProps> = ({
  data,
  loading,
  onSelectProvince,
}) => {
  if (loading || !data) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
        <div style={{ fontSize: "28px", marginBottom: "12px" }}>🌪️</div>
        <div>Đang phân tích tương tác Khí tượng - Ô nhiễm môi trường...</div>
      </div>
    );
  }

  const { wind_curve, rain_curve, correlations, top_cleaning_provinces } = data;

  const corrItems = [
    { label: "Nhiệt Độ vs AQI", key: "temp", val: correlations.temp ?? 0, icon: "🌡️" },
    { label: "Độ Ẩm vs AQI", key: "humidity", val: correlations.humidity ?? 0, icon: "💧" },
    { label: "Tốc Độ Gió vs AQI", key: "wind_speed", val: correlations.wind_speed ?? 0, icon: "💨" },
    { label: "Lượng Mưa vs AQI", key: "rain", val: correlations.rain ?? 0, icon: "🌧️" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* SECTION 1: CORRELATION GAUGES ROW */}
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc", marginBottom: "14px" }}>
          Hệ Số Tương Quan Khí Tượng Trực Tiếp với Ô Nhiễm (Pearson r)
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          {corrItems.map((item, idx) => {
            const isNegative = item.val < 0;
            const absVal = Math.abs(item.val);
            const strength =
              absVal >= 0.5 ? "Mạnh" : absVal >= 0.25 ? "Trung bình" : "Yếu";
            const badgeColor = isNegative ? "#38bdf8" : "#f59e0b";

            return (
              <div
                key={idx}
                style={{
                  background: "rgba(30, 41, 59, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#cbd5e1", fontWeight: 600 }}>
                    {item.label}
                  </span>
                  <span>{item.icon}</span>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: badgeColor }}>
                    {item.val > 0 ? `+${item.val.toFixed(2)}` : item.val.toFixed(2)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    {isNegative
                      ? `Tương quan nghịch (${strength}): Yếu tố tăng giúp giảm AQI`
                      : `Tương quan thuận (${strength}): Yếu tố tăng làm tăng AQI`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: WIND CLEANING & RAIN WASHOUT CURVES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "24px",
        }}
      >
        {/* WIND CURVE */}
        <CurveChart
          data={wind_curve}
          title="1. Đường Cong Làm Sạch Của Gió (Wind Dispersion Curve)"
          subtitle="Tốc độ gió càng cao giúp khuếch tán và làm loãng nồng độ bụi PM2.5 trong tầng đối lưu."
          color="#38bdf8"
          reductionKey="reduction_pct"
        />

        {/* RAIN CURVE */}
        <CurveChart
          data={rain_curve}
          title="2. Đường Cong Rửa Trôi Của Mưa (Rain Washout Effect)"
          subtitle="Lượng mưa càng lớn kéo các hạt bụi lơ lửng xuống mặt đất, thanh lọc bầu không khí."
          color="#22c55e"
          reductionKey="washout_reduction_pct"
        />
      </div>

      {/* SECTION 3: TOP PROVINCES WITH NATURAL ENVIRONMENTAL CLEANING CAPACITY */}
      <div
        style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "20px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
            Top Tỉnh Thành Có Khả Năng Tự Làm Sạch Môi Trường Mạnh Nhất Bởi Mưa & Gió
          </h3>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
            Đo lường mức độ sụt giảm bụi mịn PM2.5 khi có mưa lớn và gió đối lưu
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "12px",
          }}
        >
          {top_cleaning_provinces.map((prov, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: onSelectProvince ? "pointer" : "default",
              }}
              onClick={() => onSelectProvince && onSelectProvince(prov.slug)}
            >
              <div>
                <div style={{ fontWeight: 700, color: "#f8fafc", fontSize: "13px" }}>
                  {idx + 1}. {prov.name}
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  {prov.region}
                </div>
                <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
                  Bình thường: {prov.baseline_pm} → Sau mưa: {prov.cleaned_pm} µg/m³
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "rgba(34, 197, 94, 0.2)",
                    color: "#4ade80",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                  }}
                >
                  ▼ {prov.washout_pct}%
                </span>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>Hiệu suất rửa trôi</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default InteractionTab;
