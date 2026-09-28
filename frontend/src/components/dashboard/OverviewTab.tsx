import type { OverviewData } from "./types";
import { BarChart } from "./charts/BarChart";
import type { BarItem } from "./charts/BarChart";

interface OverviewTabProps {
  data: OverviewData | null;
  loading: boolean;
  onSelectProvince?: (slug: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  data,
  loading,
  onSelectProvince,
}) => {
  if (loading || !data) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
        <div style={{ fontSize: "28px", marginBottom: "12px" }}>⏳</div>
        <div>Đang phân tích tổng quan chất lượng không khí toàn quốc...</div>
      </div>
    );
  }

  const {
    scope_label,
    current_aqi,
    avg_aqi,
    aqi_meta,
    health_advice,
    peak_time_slot,
    pollutants,
    distribution,
    rankings,
  } = data;

  const distributionBarItems: BarItem[] = distribution.map((d) => ({
    label: d.label,
    value: d.percentage,
    color: d.color,
    subLabel: `${d.count} trạm (${d.range})`,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* SECTION 1: HERO METRIC & HEALTH ADVICE ROW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {/* HERO AQI CARD */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)",
            border: `1px solid ${aqi_meta.color}40`,
            borderRadius: "16px",
            padding: "24px",
            boxShadow: `0 12px 30px rgba(0,0,0,0.3), 0 0 20px ${aqi_meta.color}15`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: `${aqi_meta.color}25`,
                  color: aqi_meta.color,
                  border: `1px solid ${aqi_meta.color}50`,
                }}
              >
                ● {aqi_meta.label}
              </span>
              <h2 style={{ fontSize: "18px", color: "#f8fafc", margin: "10px 0 2px 0" }}>
                {scope_label}
              </h2>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Chỉ số AQI tổng hợp thời gian thực</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "48px",
                  fontWeight: 800,
                  color: aqi_meta.color,
                  lineHeight: 1,
                }}
              >
                {current_aqi}
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                Trung bình: <strong>{avg_aqi}</strong>
              </div>
            </div>
          </div>

          {/* Peak pollution time slot */}
          <div
            style={{
              marginTop: "20px",
              padding: "10px 14px",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1" }}>
              <span>⚠️</span>
              <span>Khung giờ ô nhiễm đỉnh điểm:</span>
            </div>
            <strong style={{ color: "#f59e0b" }}>
              {peak_time_slot.slot} (AQI: {peak_time_slot.aqi})
            </strong>
          </div>
        </div>

        {/* HEALTH GUIDANCE CARD */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span style={{ fontSize: "20px" }}>🩺</span>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
                Khuyến Nghị Sức Khỏe Cộng Đồng
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ color: "#e2e8f0" }}>
                <strong>Dân cư chung:</strong> {health_advice.general}
              </div>
              <div style={{ color: "#e2e8f0" }}>
                <strong>Trẻ em & Người già:</strong> {health_advice.children_elderly}
              </div>
              <div style={{ color: "#e2e8f0" }}>
                <strong>Vận động ngoài trời:</strong> {health_advice.outdoor}
              </div>
            </div>
          </div>
          <div style={{ marginTop: "14px", fontSize: "11px", color: "#64748b" }}>
            *Căn cứ quy chuẩn kỹ thuật quốc gia QCVN 05:2023/BTNM & hướng dẫn Y tế WHO.
          </div>
        </div>
      </div>

      {/* SECTION 2: 6 CORE POLLUTANTS METRIC CARDS */}
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc", marginBottom: "16px" }}>
          6 Chất Ô Nhiễm Không Khí Trọng Yếu
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
          }}
        >
          {Object.entries(pollutants).map(([key, item]) => (
            <div
              key={key}
              style={{
                background: "rgba(30, 41, 59, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "16px", color: item.color }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      background: item.exceeds ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                      color: item.exceeds ? "#ef4444" : "#22c55e",
                      fontWeight: 600,
                    }}
                  >
                    {item.exceeds ? "Vượt chuẩn" : "An toàn"}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  {item.desc}
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#f8fafc" }}>
                  {item.current} <span style={{ fontSize: "12px", fontWeight: 400, color: "#94a3b8" }}>{item.unit}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
                  Ngưỡng WHO: <strong>{item.who_threshold} {item.unit}</strong>
                </div>

                {/* Progress bar ratio vs WHO limit */}
                <div
                  style={{
                    height: "4px",
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "2px",
                    marginTop: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, item.who_ratio_pct)}%`,
                      height: "100%",
                      background: item.exceeds ? "#ef4444" : item.color,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: AQI DISTRIBUTION & RANKINGS ROW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "24px",
        }}
      >
        {/* AQI DISTRIBUTION BAR CHART */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <BarChart
            items={distributionBarItems}
            unit="%"
            height={260}
            orientation="vertical"
            title="Tỷ Lệ Phân Bổ Mức Độ Chất Lượng Không Khí"
          />
        </div>

        {/* TOP 5 CLEANEST & MOST POLLUTED */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "16px",
            padding: "20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          {/* CLEANEST */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#22c55e", marginBottom: "10px" }}>
              🌱 Top 5 Trong Lành Nhất
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rankings.cleanest.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: onSelectProvince ? "pointer" : "default",
                  }}
                  onClick={() => onSelectProvince && onSelectProvince(p.slug)}
                >
                  <span style={{ color: "#e2e8f0" }}>
                    <strong>{idx + 1}.</strong> {p.name}
                  </span>
                  <span style={{ color: p.meta.color, fontWeight: 700 }}>
                    {p.aqi}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* MOST POLLUTED */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444", marginBottom: "10px" }}>
              ⚠️ Top 5 Cần Lưu Ý
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rankings.polluted.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: onSelectProvince ? "pointer" : "default",
                  }}
                  onClick={() => onSelectProvince && onSelectProvince(p.slug)}
                >
                  <span style={{ color: "#e2e8f0" }}>
                    <strong>{idx + 1}.</strong> {p.name}
                  </span>
                  <span style={{ color: p.meta.color, fontWeight: 700 }}>
                    {p.aqi}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OverviewTab;
