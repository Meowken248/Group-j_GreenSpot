import React, { useState, useEffect } from "react";
import { alertApi } from "../services/alertApi";
import type { SOSBroadcastBannerStatus, SOSIncidentItem } from "../types";

export const SOSDispatchTab: React.FC = () => {
  const [banner, setBanner] = useState<SOSBroadcastBannerStatus | null>(null);
  const [incidents, setIncidents] = useState<SOSIncidentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Form custom banner text
  const [bannerTitle, setBannerTitle] = useState("CẢNH BÁO MÔI TRƯỜNG ĐÔ THỊ KHẨN CẤP");
  const [bannerMessage, setBannerMessage] = useState(
    "Phát hiện sự cố phát tán khói độc / tràn hóa chất diện rộng. Đề nghị người dân đóng kín cửa và theo dõi hướng dẫn phòng hộ!"
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [b, list] = await Promise.all([
        alertApi.getActiveSOSBanner(),
        alertApi.listRecentSOSIncidents(),
      ]);
      setBanner(b);
      if (b.title) setBannerTitle(b.title);
      if (b.message) setBannerMessage(b.message);
      setIncidents(list);
    } catch (e: any) {
      console.error("Lỗi tải trực ban SOS:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (targetActive: boolean) => {
    try {
      setToggling(true);
      const res = await alertApi.toggleSOSBanner({
        is_active: targetActive,
        title: bannerTitle,
        message: bannerMessage,
        affected_areas: ["Toàn Thành phố"],
      });
      setBanner(res);
    } catch (e: any) {
      alert("Lỗi cập nhật Banner: " + (e.response?.data?.detail || e.message));
    } finally {
      setToggling(false);
    }
  };

  const isActive = banner?.is_active || false;

  return (
    <div style={{ background: "#0f172a", borderRadius: "16px", padding: "24px", border: "1px solid #334155" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#ef4444", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🚨</span> Trung Tâm Trực Ban Cứu Nạn Khẩn Cấp & Điều Phối Banner SOS (CN 35)
          </h2>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "13px" }}>
            Tiếp nhận luồng báo tin SOS thời gian thực từ người dân; Thẩm định nhanh và kích hoạt dải Banner đỏ phát thanh khẩn cấp trên toàn Cổng thông tin.
          </p>
        </div>
        {loading && (
          <span style={{ fontSize: "12px", color: "#94a3b8", background: "#1e293b", padding: "4px 10px", borderRadius: "12px", border: "1px solid #334155" }}>
            Đang đồng bộ dữ liệu...
          </span>
        )}
      </div>

      {/* KHỐI 1: CÔNG TẮC PHÁT BANNER TOÀN HỆ THỐNG (SOS_SWT_BROADCAST) */}
      <div
        style={{
          background: isActive ? "rgba(220, 38, 38, 0.15)" : "#1e293b",
          border: `2px solid ${isActive ? "#dc2626" : "#475569"}`,
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  background: isActive ? "#ef4444" : "#64748b",
                  boxShadow: isActive ? "0 0 12px #ef4444" : "none",
                  display: "inline-block",
                }}
              />
              <h3 style={{ margin: 0, fontSize: "16px", color: isActive ? "#fca5a5" : "#f8fafc", fontWeight: 700 }}>
                TRẠNG THÁI BANNER CẢNH BÁO ĐỎ TOÀN CỔNG: {isActive ? "ĐANG PHÁT SÓNG TRỰC TIẾP (LIVE)" : "ĐANG TẮT"}
              </h3>
            </div>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "12px" }}>
              {isActive
                ? `Kích hoạt lúc: ${banner?.activated_at || "Vừa xong"}. Toàn bộ người dân truy cập website đều nhìn thấy banner đỏ ở đầu trang.`
                : "Banner đang ở chế độ chờ. Khi có sự cố nguy cấp, gạt công tắc để phát cảnh báo diện rộng."}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              id="SOS_SWT_BROADCAST"
              type="button"
              onClick={() => handleToggle(!isActive)}
              disabled={toggling}
              style={{
                background: isActive ? "#dc2626" : "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: "30px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: 800,
                cursor: toggling ? "not-allowed" : "pointer",
                boxShadow: isActive ? "0 4px 16px rgba(220, 38, 38, 0.5)" : "0 4px 12px rgba(34, 197, 94, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>{isActive ? "⏹️" : "▶️"}</span>
              <span>{isActive ? "HẠ BANNER KHẨN CẤP" : "KÍCH HOẠT BANNER TOÀN CỔNG"}</span>
            </button>
          </div>
        </div>

        {/* Nội dung mẫu dải banner đang phát */}
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", fontWeight: 600, marginBottom: "4px" }}>
                TIÊU ĐỀ DẢI BANNER
              </label>
              <input
                type="text"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", fontWeight: 600, marginBottom: "4px" }}>
                THÔNG ĐIỆP CHẠY CHỮ CẢNH BÁO CHO DÂN (MARQUEE ALERT)
              </label>
              <input
                type="text"
                value={bannerMessage}
                onChange={(e) => setBannerMessage(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KHỐI 2: BẢNG TIẾP NHẬN TRỰC BAN THỜI GIAN THỰC (SOS_DASH_ALERT) */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#38bdf8", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📡</span> Bảng Tiếp Nhận Sự Cố Cứu Nạn SOS Thời Gian Thực ({incidents.length} tin)
          </h3>
          <button
            type="button"
            onClick={fetchData}
            style={{
              background: "#1e293b",
              border: "1px solid #475569",
              color: "#94a3b8",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Làm mới ↻
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            id="SOS_DASH_ALERT"
            style={{ width: "100%", borderCollapse: "collapse", background: "#1e293b", borderRadius: "8px", overflow: "hidden" }}
          >
            <thead>
              <tr style={{ background: "#0b1329", color: "#94a3b8", fontSize: "12px", textAlign: "left" }}>
                <th style={{ padding: "12px" }}>MÃ SOS</th>
                <th style={{ padding: "12px" }}>LOẠI SỰ CỐ NGUY CẤP</th>
                <th style={{ padding: "12px" }}>VỊ TRÍ ĐỊA BÀN</th>
                <th style={{ padding: "12px" }}>SĐT LIÊN HỆ GẤP</th>
                <th style={{ padding: "12px" }}>THỜI ĐIỂM GỬI</th>
                <th style={{ padding: "12px", textAlign: "center" }}>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                    Hiện không có tin báo nguy cấp SOS nào đang chờ xử lý. Hệ thống an toàn!
                  </td>
                </tr>
              ) : (
                incidents.map((item) => (
                  <tr key={item.incident_id} style={{ borderTop: "1px solid #334155" }}>
                    <td style={{ padding: "12px" }}>
                      <strong style={{ color: "#ef4444", fontSize: "13px" }}>{item.tracking_code}</strong>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc" }}>{item.title}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{item.description}</div>
                    </td>
                    <td style={{ padding: "12px", color: "#cbd5e1", fontSize: "12px" }}>
                      {item.address_text}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <a
                        href={`tel:${item.phone}`}
                        style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "none", fontSize: "13px" }}
                      >
                        📞 {item.phone}
                      </a>
                    </td>
                    <td style={{ padding: "12px", color: "#94a3b8", fontSize: "12px" }}>
                      {item.created_at}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span
                        style={{
                          background: "#991b1b",
                          color: "#fee2e2",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        CRITICAL
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
