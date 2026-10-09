import React from "react";
import type { OverviewData } from "./types";
import { BarChart } from "./charts/BarChart";
import type { BarItem } from "./charts/BarChart";
import VietnamGeoMapCard from "./VietnamGeoMapCard";

interface OverviewTabProps {
  data: OverviewData | null;
  loading: boolean;
  onSelectProvince?: (slug: string) => void;
}

const POLLUTANT_SVGS: Record<string, string> = {
  pm2_5: "/pm25.svg",
  pm10: "/pm10.svg",
  o3: "/o3.svg",
  no2: "/no2.svg",
  so2: "/so2.svg",
  co: "/co.svg",
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  data,
  loading,
  onSelectProvince,
}) => {
  if (loading || !data) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#a1a1a6" }}>
        <div style={{ fontSize: "36px", marginBottom: "16px", animation: "pulse-live 1.5s infinite" }}>
          ⏳
        </div>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#f5f5f7" }}>
          Đang phân tích tổng quan dữ liệu không khí & bản đồ toàn quốc...
        </div>
        <div style={{ fontSize: "12px", color: "#6e6e73", marginTop: "6px" }}>
          Tải luồng đồng bộ thời gian thực Open-Meteo & 7.1 triệu bản ghi Parquet
        </div>
      </div>
    );
  }

  const {
    scope_label,
    current_aqi,
    avg_aqi,
    aqi_meta,
    health_advice,
    health_insights,
    peak_time_slot,
    pollutants,
    distribution,
    rankings,
    geo_provinces = [],
    target_slug,
  } = data;

  const distributionBarItems: BarItem[] = distribution.map((d) => ({
    label: d.label,
    value: d.percentage,
    color: d.color,
    subLabel: `${d.count} trạm (${d.range})`,
  }));

  const cigEquiv = health_insights?.cigarettes_equiv ?? 1.1;
  const whoMultiplier = health_insights?.who_multiplier ?? 5.0;
  const exposureLabel = health_insights?.exposure_label ?? "24 giờ";
  const rankImproving = health_insights?.rank_improving ?? [];
  const rankWorsening = health_insights?.rank_worsening ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* SECTION 1: HERO METRIC & HEALTH ADVICE WITH CIGARETTE EQUIVALENT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "16px",
        }}
      >
        {/* HERO AQI CARD */}
        <div className="macos-hero-aqi-card" style={{ borderLeft: `3px solid ${aqi_meta.color}` }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span
                  className="macos-hero-pill-status"
                  style={{
                    background: `${aqi_meta.color}25`,
                    color: aqi_meta.color,
                    border: `0.5px solid ${aqi_meta.color}60`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: aqi_meta.color,
                      boxShadow: `0 0 6px ${aqi_meta.color}`,
                    }}
                  />
                  {aqi_meta.label}
                </span>

                <h2 className="macos-hero-scope-name">{scope_label}</h2>
                <div className="macos-hero-sublabel">Chỉ số AQI tổng hợp thời gian thực</div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div className="macos-hero-aqi-number" style={{ color: aqi_meta.color }}>
                  {current_aqi}
                </div>
                <div style={{ fontSize: "11px", color: "var(--macos-text-secondary)", marginTop: "4px" }}>
                  Trung bình thời kỳ: <strong style={{ color: "#ffffff" }}>{avg_aqi}</strong>
                </div>
              </div>
            </div>

            {/* Rank Shifts quick pill row if available */}
            {(rankImproving.length > 0 || rankWorsening.length > 0) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "14px",
                  flexWrap: "wrap",
                  fontSize: "11px",
                }}
              >
                {rankImproving.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "rgba(48, 209, 88, 0.15)",
                      border: "0.5px solid rgba(48, 209, 88, 0.3)",
                      color: "#30d158",
                    }}
                  >
                    <span>🌱 Sạch nhất:</span>
                    <strong>{rankImproving[0]?.name}</strong> ({rankImproving[0]?.aqi} AQI)
                  </div>
                )}
                {rankWorsening.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "rgba(255, 69, 58, 0.15)",
                      border: "0.5px solid rgba(255, 69, 58, 0.3)",
                      color: "#ff453a",
                    }}
                  >
                    <span>⚠️ Ô nhiễm nhất:</span>
                    <strong>{rankWorsening[0]?.name}</strong> ({rankWorsening[0]?.aqi} AQI)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Peak pollution time slot */}
          <div className="macos-hero-peak-box">
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--macos-text-secondary)" }}>
              <span>⏱️</span>
              <span>Khung giờ ô nhiễm đỉnh điểm trong ngày:</span>
            </div>
            <strong style={{ color: "#ffd60a", fontWeight: 700 }}>
              {peak_time_slot.slot} ({peak_time_slot.aqi} AQI)
            </strong>
          </div>
        </div>

        {/* HEALTH GUIDANCE & CIGARETTE EXPOSURE CARD */}
        <div className="macos-health-advice-card">
          <div>
            {/* Cigarette exposure & WHO multiplier banner */}
            <div className="macos-cig-exposure-banner">
              <div className="macos-cig-headline">
                <span>🚬</span>
                <span>
                  Phơi nhiễm ({exposureLabel}): <strong>{cigEquiv} điếu thuốc lá</strong>
                </span>
              </div>
              <span className="macos-who-multi-tag">
                Gấp {whoMultiplier}x ngưỡng WHO
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "16px" }}>🩺</span>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--macos-text-primary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Khuyến Nghị Sức Khỏe Cộng Đồng
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
              <div style={{ color: "var(--macos-text-primary)" }}>
                <strong style={{ color: "#0a84ff" }}>Dân cư chung:</strong> {health_advice.general}
              </div>
              <div style={{ color: "var(--macos-text-primary)" }}>
                <strong style={{ color: "#ff9f0a" }}>Trẻ em & Người già:</strong> {health_advice.children_elderly}
              </div>
              <div style={{ color: "var(--macos-text-primary)" }}>
                <strong style={{ color: "#30d158" }}>Vận động ngoài trời:</strong> {health_advice.outdoor}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "12px", fontSize: "10.5px", color: "var(--macos-text-tertiary)" }}>
            *Mô hình quy đổi Berkeley Earth (22 µg/m³ PM2.5 = 1 điếu/ngày) & QCVN 05:2023/BTNM.
          </div>
        </div>
      </div>

      {/* SECTION 2: 6 CORE POLLUTANTS WITH OFFICIAL SVG ICONS */}
      <div>
        <div className="macos-card-header" style={{ marginBottom: "10px" }}>
          <div className="macos-card-title">
            <span>🔬</span>
            <span>6 Chất Ô Nhiễm Không Khí Trọng Yếu</span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--macos-text-tertiary)" }}>
            Theo dõi nồng độ vi hạt & khí độc thời gian thực
          </span>
        </div>

        <div className="macos-pollutants-grid">
          {Object.entries(pollutants).map(([key, item]) => {
            const svgPath = POLLUTANT_SVGS[key];
            return (
              <div key={key} className="macos-pollutant-card">
                <div>
                  <div className="macos-pollutant-card-top">
                    <div className="macos-pollutant-icon-title">
                      {svgPath ? (
                        <img src={svgPath} alt={item.label} className="macos-pollutant-svg-icon" />
                      ) : (
                        <span style={{ fontSize: "18px" }}>🧪</span>
                      )}
                      <div>
                        <div className="macos-pollutant-name">{item.label}</div>
                        <div className="macos-pollutant-desc">{item.desc}</div>
                      </div>
                    </div>

                    <span
                      className="macos-pollutant-status-pill"
                      style={{
                        background: item.exceeds ? "rgba(255, 69, 58, 0.2)" : "rgba(48, 209, 88, 0.2)",
                        color: item.exceeds ? "#ff453a" : "#30d158",
                      }}
                    >
                      {item.exceeds ? "Vượt chuẩn" : "An toàn"}
                    </span>
                  </div>

                  <div className="macos-pollutant-val">
                    {item.current} <span className="macos-pollutant-unit">{item.unit}</span>
                  </div>
                  <div className="macos-pollutant-who-limit">
                    Ngưỡng WHO: <strong>{item.who_threshold} {item.unit}</strong>
                  </div>
                </div>

                {/* Progress bar vs WHO limit */}
                <div className="macos-pollutant-ratio-bar">
                  <div
                    className="macos-pollutant-ratio-fill"
                    style={{
                      width: `${Math.min(100, item.who_ratio_pct)}%`,
                      background: item.exceeds ? "#ff453a" : item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: INTERACTIVE VIETNAM MAP (34 PROVINCES) & AQI DISTRIBUTION */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "16px",
        }}
      >
        {/* INTERACTIVE VIETNAM GEO MAP */}
        <VietnamGeoMapCard
          provinces={geo_provinces}
          selectedProvince={target_slug || undefined}
          onSelectProvince={onSelectProvince}
          height={420}
        />

        {/* AQI DISTRIBUTION & RANKINGS COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* AQI DISTRIBUTION BAR CHART */}
          <div className="macos-glass-card" style={{ flex: 1, padding: "16px 18px" }}>
            <BarChart
              items={distributionBarItems}
              unit="%"
              height={170}
              orientation="vertical"
              title="Phân Bổ Tỷ Lệ Mức Độ Chất Lượng Không Khí"
            />
          </div>

          {/* TOP 5 CLEANEST & MOST POLLUTED */}
          <div className="macos-glass-card" style={{ padding: "16px 18px" }}>
            <div className="macos-rankings-2col">
              {/* CLEANEST */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#30d158", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <span>🌱</span> Top 5 Trong Lành Nhất
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {rankings.cleanest.map((p, idx) => (
                    <div
                      key={idx}
                      className="macos-ranking-item"
                      onClick={() => onSelectProvince && onSelectProvince(p.slug)}
                      title={`Bấm để xem dữ liệu chi tiết ${p.name}`}
                    >
                      <span style={{ color: "var(--macos-text-primary)", fontWeight: 500 }}>
                        <strong style={{ color: "var(--macos-text-secondary)" }}>{idx + 1}.</strong> {p.name}
                      </span>
                      <span style={{ color: p.meta.color, fontWeight: 700 }}>
                        {Math.round(p.aqi)} AQI
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* MOST POLLUTED */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#ff453a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <span>⚠️</span> Top 5 Cần Lưu Ý
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {rankings.polluted.map((p, idx) => (
                    <div
                      key={idx}
                      className="macos-ranking-item"
                      onClick={() => onSelectProvince && onSelectProvince(p.slug)}
                      title={`Bấm để xem dữ liệu chi tiết ${p.name}`}
                    >
                      <span style={{ color: "var(--macos-text-primary)", fontWeight: 500 }}>
                        <strong style={{ color: "var(--macos-text-secondary)" }}>{idx + 1}.</strong> {p.name}
                      </span>
                      <span style={{ color: p.meta.color, fontWeight: 700 }}>
                        {Math.round(p.aqi)} AQI
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
