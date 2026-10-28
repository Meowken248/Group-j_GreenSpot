import React, { useState, useEffect } from "react";
import { alertApi } from "../services/alertApi";
import type { SOSBroadcastBannerStatus } from "../types";

export const EmergencyMarqueeBanner: React.FC = () => {
  const [banner, setBanner] = useState<SOSBroadcastBannerStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchBanner = async () => {
    try {
      const data = await alertApi.getActiveSOSBanner();
      setBanner(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchBanner();
    const interval = setInterval(fetchBanner, 30000); // Poll 30s
    return () => clearInterval(interval);
  }, []);

  if (!banner || !banner.is_active || dismissed) {
    return null;
  }

  return (
    <aside
      role="alert"
      aria-label="Cảnh báo môi trường đô thị khẩn cấp"
      style={{
        background: "linear-gradient(90deg, #991b1b 0%, #dc2626 50%, #991b1b 100%)",
        color: "#ffffff",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 12px rgba(220, 38, 38, 0.4)",
        zIndex: 9999,
        position: "relative",
        fontSize: "13px",
        fontWeight: 600,
        borderBottom: "2px solid #fecaca",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden", flex: 1 }}>
        <span
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.5px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            animation: "pulse 1.5s infinite",
          }}
        >
          🚨 BÁO ĐỘNG ĐỎ
        </span>

        <div
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            width: "100%",
            display: "flex",
          }}
        >
          <style>{`
            @keyframes emergencyMarqueeScroll {
              0% { transform: translateX(100%); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
          <div
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              animation: "emergencyMarqueeScroll 28s linear infinite",
            }}
          >
            <span style={{ marginRight: "40px" }}>
              <strong>{banner.title || "CẢNH BÁO MÔI TRƯỜNG ĐÔ THỊ KHẨN CẤP"}:</strong>{" "}
              {banner.message || "Đề nghị người dân lưu ý các biện pháp phòng hộ an toàn!"}{" "}
              {banner.affected_areas && banner.affected_areas.length > 0 && (
                <span>(Khu vực ảnh hưởng: {banner.affected_areas.join(", ")})</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "16px", flexShrink: 0 }}>
        <a
          href={`tel:${banner.hotline || "1800-1090"}`}
          style={{
            background: "#ffffff",
            color: "#991b1b",
            padding: "3px 10px",
            borderRadius: "14px",
            textDecoration: "none",
            fontSize: "11px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          📞 Hotline: {banner.hotline || "1800-1090"}
        </a>

        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "#fee2e2",
            fontSize: "16px",
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
          }}
          title="Tạm ẩn banner"
        >
          ✕
        </button>
      </div>
    </aside>
  );
};
