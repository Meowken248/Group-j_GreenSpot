import React from "react";
import type { OverviewMetricsResponse } from "../types/riskDashboard.types";
import { BarChart } from "./BarChart";
import { TrendLineChart } from "./TrendLineChart";

interface Screen1OverviewProps {
  data: OverviewMetricsResponse;
  onSelectDistrict: (districtName: string) => void;
}

export const Screen1Overview: React.FC<Screen1OverviewProps> = ({
  data,
  onSelectDistrict,
}) => {
  const isEmergency = data.has_critical_alert;

  return (
    <div className="three-column-grid">
      {/* 1. KHỐI "CHỈ SỐ" (CỘT TRÁI) */}
      <section className="col-card" aria-label="Khối Chỉ số rủi ro">
        <div className="col-header">
          <div className="col-title">
            <span>📊</span>
            <span>CHỈ SỐ</span>
          </div>
          <span className="col-badge">Toàn đô thị</span>
        </div>

        <div className="metric-stack">
          {/* Thẻ 1: Điểm rủi ro chung */}
          <div className={`metric-card primary-accent ${isEmergency ? "danger-pulsing" : ""}`}>
            <span className="card-title">Điểm rủi ro chung</span>
            <div className="card-value" style={{ color: isEmergency ? "#ef4444" : "#10b981" }}>
              {data.overall_risk_score}
              <span style={{ fontSize: "16px", fontWeight: 600, color: "#64748b" }}>/100</span>
            </div>
            <span className="card-desc">{data.overall_risk_label}</span>
          </div>

          {/* Thẻ 2: Số khu vực nguy cơ cao */}
          <div className={`metric-card warning-accent ${data.high_risk_district_count > 0 ? "warning-accent" : ""}`}>
            <span className="card-title">Khu vực nguy cơ cao</span>
            <div className="card-value" style={{ color: "#f59e0b" }}>
              {data.high_risk_district_count}
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#64748b", marginLeft: "6px" }}>quận/huyện</span>
            </div>
            <span className="card-desc">{data.high_risk_district_label} (Báo động Cam / Đỏ)</span>
          </div>

          {/* Thẻ 3: Sự cố đang mở */}
          <div className="metric-card danger-accent">
            <span className="card-title">Sự cố đang mở</span>
            <div className="card-value" style={{ color: "#ef4444" }}>
              {data.open_incident_count}
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#64748b", marginLeft: "6px" }}>vụ việc</span>
            </div>
            <span className="card-desc">Bãi rác tự phát & Điểm ngập úng chưa xử lý dứt điểm</span>
          </div>
        </div>
      </section>

      {/* 2. KHỐI "BIỂU ĐỒ" (CỘT GIỮA) */}
      <section className="col-card" aria-label="Khối Biểu đồ phân tích">
        <div className="col-header">
          <div className="col-title">
            <span>📈</span>
            <span>BIỂU ĐỒ</span>
          </div>
          <span className="col-badge">22 Quận/Huyện & TP. Thủ Đức</span>
        </div>

        <div className="charts-stack">
          {/* Biểu đồ cột: Rủi ro theo quận */}
          <div className="chart-panel">
            <div className="chart-panel-title">
              <span>Cột: Điểm rủi ro xếp theo 22 quận/huyện & TP. Thủ Đức</span>
              <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: "normal" }}>
                (Ngưỡng khẩn cấp: &gt; 80)
              </span>
            </div>
            <BarChart districts={data.district_risks} onSelectDistrict={onSelectDistrict} />
          </div>

          {/* Biểu đồ đường: Xu hướng 30 ngày */}
          <div className="chart-panel">
            <div className="chart-panel-title">
              <span>Đường: Xu hướng chỉ số rủi ro môi trường 30 ngày gần nhất</span>
            </div>
            <TrendLineChart trends={data.trend_30_days} />
          </div>
        </div>
      </section>

      {/* 3. KHỐI "CẢNH BÁO" (CỘT PHẢI) */}
      <section className="col-card" aria-label="Khối Cảnh báo điểm nóng">
        <div className="col-header">
          <div className="col-title">
            <span>🚨</span>
            <span>CẢNH BÁO</span>
          </div>
          <span className="col-badge" style={{ color: "#ef4444", background: "#fee2e2" }}>
            Top 5 khẩn cấp
          </span>
        </div>

        <div className="alerts-list">
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 6px 0" }}>
            Nhấp vào bất kỳ quận nào để mở chi tiết sự cố và cơ sở bị đe dọa:
          </p>

          {data.top_alert_districts.map((item) => (
            <div
              key={item.district_name}
              className={`alert-item ${item.urgent_action_required ? "is-urgent" : ""}`}
              onClick={() => onSelectDistrict(item.district_name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectDistrict(item.district_name);
                }
              }}
              title={`Nhấp để mở chi tiết ${item.district_name}`}
            >
              <div className="alert-left">
                <div className="alert-rank">{item.rank}</div>
                <div className="alert-info">
                  <span className="district-name">{item.district_name}</span>
                  <span className="alert-sub">
                    {item.spontaneous_dumps} bãi rác • {item.flood_points} điểm ngập
                  </span>
                </div>
              </div>

              <div className="alert-right">
                <span
                  className={`risk-badge ${
                    item.risk_score > 80
                      ? "critical"
                      : item.risk_score >= 60
                        ? "high"
                        : item.risk_score >= 40
                          ? "medium"
                          : "low"
                  }`}
                >
                  {item.risk_score}/100
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
