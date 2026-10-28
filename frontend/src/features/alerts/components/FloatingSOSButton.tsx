import React, { useState } from "react";
import { SOSModal } from "./SOSModal";

export const FloatingSOSButton: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label="Báo cáo sự cố khẩn cấp SOS"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "#dc2626",
          color: "#ffffff",
          border: "3px solid #ffffff",
          boxShadow: "0 0 20px rgba(220, 38, 38, 0.6), 0 8px 16px rgba(0, 0, 0, 0.4)",
          cursor: "pointer",
          zIndex: 9998,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          animation: "sosPulse 1.8s infinite",
          transition: "transform 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
        title="Báo cáo sự cố môi trường khẩn cấp (SOS)"
      >
        <span style={{ fontSize: "20px", lineHeight: 1 }}>🚨</span>
        <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "1px", marginTop: "2px" }}>
          SOS
        </span>

        {/* Global style for animation */}
        <style>{`
          @keyframes sosPulse {
            0% {
              box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7), 0 8px 16px rgba(0,0,0,0.3);
            }
            70% {
              box-shadow: 0 0 0 16px rgba(220, 38, 38, 0), 0 8px 16px rgba(0,0,0,0.3);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(220, 38, 38, 0), 0 8px 16px rgba(0,0,0,0.3);
            }
          }
        `}</style>
      </button>

      <SOSModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
