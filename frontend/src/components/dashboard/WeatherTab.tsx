import React from "react";
import type { WeatherData } from "./types";
import { ScatterPlot } from "./charts/ScatterPlot";

interface WeatherTabProps {
  data: WeatherData | null;
  loading: boolean;
}

export const WeatherTab: React.FC<WeatherTabProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
        <div style={{ fontSize: "28px", marginBottom: "12px" }}>🌦️</div>
        <div>Đang tải phân tích dữ liệu khí tượng học...</div>
      </div>
    );
  }

  const { kpi, monthly_trends, scatter_provinces } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* SECTION 1: METEOROLOGICAL KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8" }}>Nhiệt Độ Trung Bình</span>
            <span style={{ fontSize: "20px" }}>🌡️</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 800, color: "#f8fafc", marginTop: "8px" }}>
            {kpi.avg_temp} <span style={{ fontSize: "16px", fontWeight: 400, color: "#94a3b8" }}>°C</span>
          </div>
          <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "4px" }}>Áp suất: {kpi.avg_pressure} hPa</div>
        </div>

        <div
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8" }}>Độ Ẩm Tương Đối</span>
            <span style={{ fontSize: "20px" }}>💧</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 800, color: "#f8fafc", marginTop: "8px" }}>
            {kpi.avg_humidity} <span style={{ fontSize: "16px", fontWeight: 400, color: "#94a3b8" }}>%</span>
          </div>
          <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "4px" }}>Độ ẩm không khí thực tế</div>
        </div>

        <div
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8" }}>Tốc Độ Gió</span>
            <span style={{ fontSize: "20px" }}>💨</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 800, color: "#f8fafc", marginTop: "8px" }}>
            {kpi.avg_wind} <span style={{ fontSize: "16px", fontWeight: 400, color: "#94a3b8" }}>km/h</span>
          </div>
          <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>Hỗ trợ phân tán khói bụi</div>
        </div>

        <div
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8" }}>Tổng Lượng Mưa</span>
            <span style={{ fontSize: "20px" }}>🌧️</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 800, color: "#f8fafc", marginTop: "8px" }}>
            {kpi.total_rain} <span style={{ fontSize: "16px", fontWeight: 400, color: "#94a3b8" }}>mm</span>
          </div>
          <div style={{ fontSize: "11px", color: "#0ea5e9", marginTop: "4px" }}>Hiệu ứng rửa trôi tự nhiên</div>
        </div>
      </div>

      {/* SECTION 2: 12-MONTH CLIMATE CYCLE & SCATTER PLOT ROW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "24px",
        }}
      >
        {/* MONTHLY CLIMATE TABLE & CYCLE */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ marginBottom: "14px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
              Chu Kỳ Khí Tượng & Xu Hướng Theo Tháng
            </h3>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
              Biến thiên nhiệt độ, lượng mưa và chỉ số AQI tương ứng
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "#94a3b8" }}>
                  <th style={{ padding: "8px" }}>Tháng</th>
                  <th style={{ padding: "8px" }}>Nhiệt độ (°C)</th>
                  <th style={{ padding: "8px" }}>Độ ẩm (%)</th>
                  <th style={{ padding: "8px" }}>Gió (km/h)</th>
                  <th style={{ padding: "8px" }}>Mưa (mm)</th>
                  <th style={{ padding: "8px" }}>AQI</th>
                </tr>
              </thead>
              <tbody>
                {monthly_trends.map((m, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      color: "#cbd5e1",
                    }}
                  >
                    <td style={{ padding: "8px", fontWeight: 600, color: "#f8fafc" }}>{m.month}</td>
                    <td style={{ padding: "8px" }}>
                      <strong>{m.avg_temp}°C</strong>{" "}
                      <span style={{ fontSize: "10px", color: "#64748b" }}>
                        ({m.min_temp} - {m.max_temp})
                      </span>
                    </td>
                    <td style={{ padding: "8px" }}>{m.humidity}%</td>
                    <td style={{ padding: "8px" }}>{m.wind} km/h</td>
                    <td style={{ padding: "8px" }}>{m.rain} mm</td>
                    <td style={{ padding: "8px" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: m.aqi <= 50 ? "#22c55e" : m.aqi <= 100 ? "#eab308" : "#f97316",
                        }}
                      >
                        {m.aqi}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2D SCATTER PLOT */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
              Phân Bố Nhiệt Độ vs Lượng Mưa Theo Vùng Miền
            </h3>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
              Mỗi điểm đại diện cho 1 tỉnh thành, kích thước điểm tỷ lệ thuận với nồng độ ô nhiễm AQI
            </div>
          </div>

          <ScatterPlot provinces={scatter_provinces} height={320} />
        </div>
      </div>
    </div>
  );
};
export default WeatherTab;
