import React from "react";

interface EmergencyHeaderProps {
  currentView: "CONSOLE" | "SAFETY_CHECK";
  onSwitchView: (view: "CONSOLE" | "SAFETY_CHECK") => void;
  onTriggerSimulateAlert?: () => void;
  onBackToHome?: () => void;
  userFullName?: string;
  userRole?: string;
}

export const EmergencyHeader: React.FC<EmergencyHeaderProps> = ({
  currentView,
  onSwitchView,
  onTriggerSimulateAlert,
  onBackToHome,
  userFullName = "Cán bộ Ban Chỉ huy PCTT",
  userRole = "ADMIN",
}) => {
  return (
    <header className="emergency-header">
      {/* KHỐI TRÁI: LOGO & CHỨC NĂNG */}
      <div className="emergency-header-left">
        <div className="emergency-logo-badge" onClick={onBackToHome} title="Quay lại Bản đồ chính GreenSpot">
          <span className="emergency-logo-icon">🚨</span>
          <span>GreenSpot PCTT</span>
        </div>
        <span className="header-role-badge">
          {userRole === "ADMIN" ? "BAN CHỈ HUY PCTT & TKCN" : "CÔNG DÂN SINH THÁI"}
        </span>
      </div>

      {/* KHỐI GIỮA: MENU QUẢN TRỊ & ĐIỀU HƯỚNG */}
      <div className="emergency-header-center">
        <button
          type="button"
          className={`emergency-nav-btn ${currentView === "CONSOLE" ? "active" : ""}`}
          onClick={() => onSwitchView("CONSOLE")}
        >
          <span>📡 Phát lệnh khẩn cấp (Màn 1/4)</span>
        </button>
        <button
          type="button"
          className={`emergency-nav-btn ${currentView === "SAFETY_CHECK" ? "active" : ""}`}
          onClick={() => onSwitchView("SAFETY_CHECK")}
        >
          <span>🛡️ Safety Check (Màn 3/4)</span>
        </button>
        {onTriggerSimulateAlert && (
          <button
            type="button"
            className="emergency-nav-btn"
            style={{ borderColor: "#ef4444", color: "#f87171" }}
            onClick={onTriggerSimulateAlert}
            title="Thử nghiệm Modal Cảnh Báo Khẩn Cấp (Màn 2/4)"
          >
            <span>⚡ Test Alert Modal (Màn 2/4)</span>
          </button>
        )}
      </div>

      {/* KHỐI PHẢI: CHUÔNG CẢNH BÁO & AVATAR */}
      <div className="emergency-header-right">
        <button type="button" className="bell-btn" title="Thông báo khẩn cấp hệ thống">
          <span>🔔</span>
          <span className="bell-badge-pulse">1</span>
        </button>
        <div className="emergency-avatar-box">
          <div className="avatar-circle">
            {userFullName.charAt(0).toUpperCase()}
          </div>
          <span className="avatar-name">{userFullName}</span>
        </div>
      </div>
    </header>
  );
};
