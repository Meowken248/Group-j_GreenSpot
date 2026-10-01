import React, { useState } from "react";

interface SocialSimulationProps {
  onBackToMap?: () => void;
}

export const SocialSimulation: React.FC<SocialSimulationProps> = ({ onBackToMap }) => {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div style={{
      width: "100%",
      height: "calc(100vh - 64px)",
      display: "flex",
      flexDirection: "column",
      background: "#060908",
      color: "#fff",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Sub Header Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.5rem 1.5rem",
        background: "rgba(12, 19, 16, 0.95)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {onBackToMap && (
            <button
              type="button"
              onClick={onBackToMap}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#e2e8f0",
                padding: "0.4rem 0.85rem",
                borderRadius: "9999px",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <span>←</span>
              <span>Bản đồ WebGIS</span>
            </button>
          )}
          <span style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "#34d399",
            letterSpacing: "0.05em"
          }}>
            🌿 PHÂN HỆ MẠNG XÃ HỘI SINH THÁI & TƯƠNG TÁC SỰ CỐ ĐÔ THỊ (STT 01 ➔ 16)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <a
            href="/social_simulation.html"
            target="_blank"
            rel="noreferrer"
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#34d399",
              padding: "0.35rem 0.85rem",
              borderRadius: "9999px",
              textDecoration: "none",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <span>Mở cửa sổ riêng (Tab mới)</span>
            <span>↗</span>
          </a>

          <button
            type="button"
            onClick={() => setFullscreen(!fullscreen)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#cbd5e1",
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              cursor: "pointer",
              fontSize: "0.78rem"
            }}
          >
            {fullscreen ? "Thu nhỏ" : "Toàn màn hình"}
          </button>
        </div>
      </div>

      {/* Embedded High-Fidelity Simulation Frame */}
      <iframe
        src="/social_simulation.html"
        title="GreenSpot Social Simulation"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "#060908"
        }}
      />
    </div>
  );
};

export default SocialSimulation;
