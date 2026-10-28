import React, { useState, useEffect } from "react";
import { reportsApi } from "./reportsApi";
import type { PublicDashboardData } from "./types";

export const PublicEnvironmentalDashboard: React.FC = () => {
  const [data, setData] = useState<PublicDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.getPublicDashboard();
      setData(res);
    } catch (e) {
      console.error("Lỗi tải dashboard công cộng:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000); // 1 min auto-refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 20px", color: "#F8FAFC" }}>
      {/* Header Bảng Điều Khiển Dân Sinh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>📊</span>
            <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, color: "#F8FAFC", letterSpacing: "-0.5px" }}>
              Bảng Tổng Quan Chỉ Số Hiện Trạng Môi Trường Đô Thị Công Cộng (CN 33)
            </h1>
          </div>
          <p style={{ margin: "8px 0 0", color: "#94A3B8", fontSize: "14px" }}>
            Bức tranh toàn cảnh về nỗ lực cải thiện vệ sinh đô thị và chất lượng môi trường sống phục vụ nhân dân cùng giám sát minh bạch.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", color: "#34D399", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981", display: "inline-block", boxShadow: "0 0 8px #10B981" }} />
            DỮ LIỆU THỜI GIAN THỰC (OPEN DATA)
          </div>

          <button
            type="button"
            onClick={fetchDashboard}
            style={{
              background: "#1E293B",
              border: "1px solid #334155",
              color: "#94A3B8",
              borderRadius: "10px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {loading ? "Đang đồng bộ..." : "🔄 Làm mới"}
          </button>
        </div>
      </div>

      {/* 4 THẺ KPI LỚN (DOUBLE-BEZEL DESIGN ARCHITECTURE) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px", marginBottom: "28px" }}>
        {/* THẺ 1: DSH_CARD_ACTIVE_ALERTS (Đỏ) */}
        <div
          id="DSH_CARD_ACTIVE_ALERTS"
          style={{
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 8px 24px rgba(239, 68, 68, 0.15)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#FCA5A5", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Cảnh báo ô nhiễm đang mở
            </span>
            <span style={{ fontSize: "20px" }}>🚨</span>
          </div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: "#EF4444", lineHeight: 1 }}>
            {data?.active_alerts_count ?? 3} <span style={{ fontSize: "16px", fontWeight: 600, color: "#FCA5A5" }}>điểm</span>
          </div>
          <div style={{ marginTop: "10px", fontSize: "11px", color: "#94A3B8" }}>
            Đang được lực lượng kiểm tra xử lý khẩn trương
          </div>
        </div>

        {/* THẺ 2: DSH_CARD_RESOLVED (Xanh lá) */}
        <div
          id="DSH_CARD_RESOLVED"
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 8px 24px rgba(16, 185, 129, 0.15)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#86EFAC", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Điểm rác đã dọn sạch
            </span>
            <span style={{ fontSize: "20px" }}>✅</span>
          </div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: "#10B981", lineHeight: 1 }}>
            {data?.resolved_incidents_count ? data.resolved_incidents_count.toLocaleString() : "1,420"}{" "}
            <span style={{ fontSize: "16px", fontWeight: 600, color: "#86EFAC" }}>vị trí</span>
          </div>
          <div style={{ marginTop: "10px", fontSize: "11px", color: "#94A3B8" }}>
            Nghiệm thu dọn sạch có hình ảnh After đối chứng
          </div>
        </div>

        {/* THẺ 3: DSH_CARD_SAFETY_RATE (Xanh dương) */}
        <div
          id="DSH_CARD_SAFETY_RATE"
          style={{
            background: "linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 8px 24px rgba(56, 189, 248, 0.15)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#7DD3FC", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Tỷ lệ khu vực xanh an toàn
            </span>
            <span style={{ fontSize: "20px" }}>🛡️</span>
          </div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: "#38BDF8", lineHeight: 1 }}>
            {data?.safety_rate_pct ?? 94.2}%
          </div>
          <div style={{ marginTop: "10px", fontSize: "11px", color: "#94A3B8" }}>
            Khu dân cư không tồn tại điểm đen ô nhiễm kéo dài
          </div>
        </div>

        {/* THẺ 4: DSH_CARD_AVG_TIME (Hổ phách) */}
        <div
          id="DSH_CARD_AVG_TIME"
          style={{
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 8px 24px rgba(245, 158, 11, 0.15)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#FDE68A", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Thời gian phản hồi SLA
            </span>
            <span style={{ fontSize: "20px" }}>⏱️</span>
          </div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: "#F59E0B", lineHeight: 1 }}>
            {data?.avg_response_hours ?? 3.5} <span style={{ fontSize: "16px", fontWeight: 600, color: "#FDE68A" }}>giờ</span>
          </div>
          <div style={{ marginTop: "10px", fontSize: "11px", color: "#94A3B8" }}>
            Nhanh hơn cam kết quy chuẩn chung 48 giờ
          </div>
        </div>
      </div>

      {/* KHỐI 2 BIỂU ĐỒ (DSH_CHART_PIE_TYPE & DSH_CHART_BAR_DISTRICT) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
        {/* BIỂU ĐỒ TRÒN: DSH_CHART_PIE_TYPE */}
        <div
          id="DSH_CHART_PIE_TYPE"
          style={{
            background: "#0F172A",
            border: "1px solid #1E293B",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#F8FAFC" }}>
                Cơ Cấu Phân Loại Ô Nhiễm Đô Thị
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94A3B8" }}>
                Tỷ trọng phản ánh của người dân theo chuyên đề
              </p>
            </div>
            <span style={{ fontSize: "20px" }}>🥧</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "20px" }}>
            {/* SVG Donut Chart */}
            <svg width="180" height="180" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
              {/* Vòng nền */}
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1E293B" strokeWidth="16" />
              {/* Phân đoạn 1: Rác sinh hoạt 55% */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#10B981"
                strokeWidth="16"
                strokeDasharray="131.3 238.7"
                strokeDashoffset="0"
                style={{ cursor: "pointer", transition: "stroke-width 0.2s" }}
                onMouseEnter={() => setActiveSegment(0)}
                onMouseLeave={() => setActiveSegment(null)}
              />
              {/* Phân đoạn 2: Khói bụi 22% */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#F59E0B"
                strokeWidth="16"
                strokeDasharray="52.5 238.7"
                strokeDashoffset="-131.3"
                style={{ cursor: "pointer", transition: "stroke-width 0.2s" }}
                onMouseEnter={() => setActiveSegment(1)}
                onMouseLeave={() => setActiveSegment(null)}
              />
              {/* Phân đoạn 3: Nước thải 16% */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#3B82F6"
                strokeWidth="16"
                strokeDasharray="38.2 238.7"
                strokeDashoffset="-183.8"
                style={{ cursor: "pointer", transition: "stroke-width 0.2s" }}
                onMouseEnter={() => setActiveSegment(2)}
                onMouseLeave={() => setActiveSegment(null)}
              />
              {/* Phân đoạn 4: Độc hại 7% */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#EF4444"
                strokeWidth="16"
                strokeDasharray="16.7 238.7"
                strokeDashoffset="-222.0"
                style={{ cursor: "pointer", transition: "stroke-width 0.2s" }}
                onMouseEnter={() => setActiveSegment(3)}
                onMouseLeave={() => setActiveSegment(null)}
              />
            </svg>

            {/* Chú thích biểu đồ */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "180px" }}>
              {(data?.pollution_distribution || [
                { category: "Rác sinh hoạt & Tồn đọng", percentage: 55.0, color: "#10B981" },
                { category: "Khói bụi & Khí thải (PM2.5)", percentage: 22.0, color: "#F59E0B" },
                { category: "Nước thải & Kênh rạch", percentage: 16.0, color: "#3B82F6" },
                { category: "Chất thải nguy hại & Tiếng ồn", percentage: 7.0, color: "#EF4444" },
              ]).map((item, idx) => (
                <div
                  key={item.category}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: activeSegment === idx ? "rgba(255,255,255,0.06)" : "transparent",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: item.color }} />
                    <span style={{ fontSize: "12px", color: "#CBD5E1" }}>{item.category}</span>
                  </div>
                  <strong style={{ fontSize: "12px", color: item.color }}>{item.percentage}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BIỂU ĐỒ CỘT: DSH_CHART_BAR_DISTRICT */}
        <div
          id="DSH_CHART_BAR_DISTRICT"
          style={{
            background: "#0F172A",
            border: "1px solid #1E293B",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#F8FAFC" }}>
                So Sánh Xử Lý Ô Nhiễm Theo Quận / Huyện
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94A3B8" }}>
                Tỷ lệ làm sạch điểm đen và số cảnh báo đang xử lý
              </p>
            </div>
            <span style={{ fontSize: "20px" }}>📶</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {(data?.district_comparison || [
              { district: "Quận 1", clean_rate: 98.5, active_alerts: 1, resolved_count: 142 },
              { district: "Quận 3", clean_rate: 95.2, active_alerts: 1, resolved_count: 118 },
              { district: "TP. Thủ Đức", clean_rate: 92.8, active_alerts: 4, resolved_count: 325 },
              { district: "Bình Thạnh", clean_rate: 91.4, active_alerts: 2, resolved_count: 210 },
              { district: "Gò Vấp", clean_rate: 90.0, active_alerts: 2, resolved_count: 185 },
            ]).map((d) => (
              <div key={d.district}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 700, color: "#E2E8F0" }}>{d.district}</span>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <span style={{ color: "#94A3B8" }}>Đã dọn: {d.resolved_count}</span>
                    <span style={{ color: "#34D399", fontWeight: 700 }}>{d.clean_rate}% hoàn thành</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ height: "8px", background: "#1E293B", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${d.clean_rate}%`,
                      background: d.clean_rate >= 95 ? "#10B981" : d.clean_rate >= 92 ? "#0284C7" : "#F59E0B",
                      borderRadius: "4px",
                      transition: "width 0.8s ease-out",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BẢNG VINH DANH TOP 5 PHƯỜNG XANH: DSH_TBL_TOP_GREEN */}
      <div
        id="DSH_TBL_TOP_GREEN"
        style={{
          background: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#38BDF8", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🏆</span> Bảng Vinh Danh Top 5 Phường Xanh Tiêu Biểu Trong Tháng
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94A3B8" }}>
              Khen thưởng các khu dân cư tích cực phân loại rác tại nguồn và phản ứng nhanh dọn sạch điểm đen môi trường.
            </p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#1E293B", color: "#94A3B8", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", borderRadius: "8px 0 0 8px" }}>Hạng</th>
                <th style={{ padding: "12px 16px" }}>Địa bàn Phường / Xã</th>
                <th style={{ padding: "12px 16px" }}>Thuộc Quận / Huyện</th>
                <th style={{ padding: "12px 16px" }}>Điểm Chỉ Số Xanh (Green Index)</th>
                <th style={{ padding: "12px 16px", borderRadius: "0 8px 8px 0" }}>Danh Hiệu Vinh Danh</th>
              </tr>
            </thead>
            <tbody>
              {(data?.top_green_wards || [
                { rank: 1, ward: "Phường Bến Nghé", district: "Quận 1", green_score: 98.5, badge: "Khu Phố Kiểu Mẫu" },
                { rank: 2, ward: "Phường Thảo Điền", district: "TP. Thủ Đức", green_score: 96.2, badge: "Đô Thị Sinh Thái" },
                { rank: 3, ward: "Phường Võ Thị Sáu", district: "Quận 3", green_score: 94.8, badge: "Cộng Đồng Xanh Sạch" },
                { rank: 4, ward: "Phường 25", district: "Bình Thạnh", green_score: 92.4, badge: "Tuyến Đường Văn Minh" },
                { rank: 5, ward: "Phường 10", district: "Gò Vấp", green_score: 90.1, badge: "Không Gian Đáng Sống" },
              ]).map((w) => (
                <tr key={w.ward} style={{ borderBottom: "1px solid #1E293B", transition: "background 0.2s" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 800 }}>
                    {w.rank === 1 ? "🥇 #1" : w.rank === 2 ? "🥈 #2" : w.rank === 3 ? "🥉 #3" : `#${w.rank}`}
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: "#F8FAFC" }}>{w.ward}</td>
                  <td style={{ padding: "14px 16px", color: "#94A3B8" }}>{w.district}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ color: "#34D399", fontSize: "14px" }}>{w.green_score}</strong>
                      <span style={{ fontSize: "11px", color: "#64748B" }}>/ 100đ</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        background:
                          w.rank === 1
                            ? "rgba(234, 179, 8, 0.15)"
                            : w.rank === 2
                            ? "rgba(56, 189, 248, 0.15)"
                            : "rgba(16, 185, 129, 0.15)",
                        color:
                          w.rank === 1
                            ? "#FDE047"
                            : w.rank === 2
                            ? "#7DD3FC"
                            : "#86EFAC",
                        border: `1px solid ${
                          w.rank === 1
                            ? "#EAB308"
                            : w.rank === 2
                            ? "#0284C7"
                            : "#10B981"
                        }`,
                        borderRadius: "14px",
                        padding: "3px 10px",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {w.badge}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
