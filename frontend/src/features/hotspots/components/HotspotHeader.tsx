import React from "react";

interface HotspotHeaderProps {
  activeScreen: "map" | "forecast";
  onScreenChange: (screen: "map" | "forecast") => void;
  userName?: string;
  userRole?: string;
}

export const HotspotHeader: React.FC<HotspotHeaderProps> = ({
  activeScreen,
  onScreenChange,
  userName = "Chuyên viên phân tích",
  userRole = "Cán bộ quản lý môi trường",
}) => {
  return (
    <header className="hotspot-header">
      <div className="header-left">
        <span className="brand-icon" role="img" aria-label="hotspot-analytics">
          🔥
        </span>
        <div>
          <h1 className="brand-title">Phân tích điểm nóng & Dự báo</h1>
          <p className="brand-subtitle">
            Hệ thống nhận diện cụm ô nhiễm mật độ cao & chuỗi thời gian 7 ngày
          </p>
        </div>
      </div>

      <nav className="header-nav" aria-label="Hotspot tabs">
        <button
          type="button"
          className={`nav-tab-btn ${activeScreen === "map" ? "active" : ""}`}
          onClick={() => onScreenChange("map")}
          data-testid="tab-hotspot-map"
        >
          <span>🗺️</span>
          <span>Bản đồ điểm nóng</span>
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeScreen === "forecast" ? "active" : ""}`}
          onClick={() => onScreenChange("forecast")}
          data-testid="tab-hotspot-forecast"
        >
          <span>📈</span>
          <span>Dự báo 7 ngày</span>
        </button>
      </nav>

      <div className="header-right">
        <button
          type="button"
          className="bell-btn"
          title="Thông báo cảnh báo môi trường"
          aria-label="Thông báo"
        >
          <span>🔔</span>
          <span className="badge-dot" />
        </button>

        <div className="user-avatar-badge" title={`${userName} (${userRole})`}>
          <div className="avatar-circle">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="user-meta-name">{userName}</span>
        </div>
      </div>
    </header>
  );
};
