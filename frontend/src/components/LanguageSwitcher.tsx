import React from "react";
import { useTranslation } from "../context/LanguageContext";

export const LanguageSwitcher: React.FC = () => {
  const { language, changeLanguage, isLoading, isBackendConnected } = useTranslation();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(17, 24, 39, 0.85)",
        backdropFilter: "blur(8px)",
        padding: "4px 8px",
        borderRadius: "10px",
        border: "1px solid rgba(75, 85, 99, 0.5)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
      }}
      role="group"
      aria-label="Chuyển đổi ngôn ngữ"
    >
      {/* Nút Tiếng Việt */}
      <button
        type="button"
        onClick={() => changeLanguage("vi")}
        disabled={isLoading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 14px",
          fontSize: "13px",
          fontWeight: 700,
          borderRadius: "8px",
          border: "none",
          cursor: isLoading ? "wait" : "pointer",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          background: language === "vi" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "transparent",
          color: language === "vi" ? "#ffffff" : "#9ca3af",
          boxShadow: language === "vi" ? "0 2px 6px rgba(16, 185, 129, 0.4)" : "none",
        }}
        title="Chuyển toàn bộ trang sang Tiếng Việt (gọi Backend python-i18n)"
      >
        <span>🇻🇳</span>
        <span>Tiếng Việt</span>
      </button>

      {/* Nút English */}
      <button
        type="button"
        onClick={() => changeLanguage("en")}
        disabled={isLoading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 14px",
          fontSize: "13px",
          fontWeight: 700,
          borderRadius: "8px",
          border: "none",
          cursor: isLoading ? "wait" : "pointer",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          background: language === "en" ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" : "transparent",
          color: language === "en" ? "#ffffff" : "#9ca3af",
          boxShadow: language === "en" ? "0 2px 6px rgba(59, 130, 246, 0.4)" : "none",
        }}
        title="Switch whole page to English (call Backend python-i18n)"
      >
        <span>🇬🇧</span>
        <span>English</span>
      </button>

      {/* Badge trạng thái kết nối Backend */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          fontSize: "10px",
          fontWeight: 600,
          borderRadius: "12px",
          background: isBackendConnected ? "rgba(16, 185, 129, 0.15)" : "rgba(234, 179, 8, 0.15)",
          color: isBackendConnected ? "#34d399" : "#facc15",
          border: `1px solid ${isBackendConnected ? "rgba(16, 185, 129, 0.3)" : "rgba(234, 179, 8, 0.3)"}`,
        }}
        title={
          isBackendConnected
            ? "Đang dùng bộ dịch nạp trực tiếp từ Python Backend (python-i18n)"
            : "Backend đang ngoại tuyến - Đang dùng bộ từ điển dự phòng"
        }
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: isBackendConnected ? "#10b981" : "#eab308",
          }}
        />
        {isLoading ? "Đang nạp..." : isBackendConnected ? "Backend i18n" : "Fallback"}
      </span>
    </div>
  );
};
