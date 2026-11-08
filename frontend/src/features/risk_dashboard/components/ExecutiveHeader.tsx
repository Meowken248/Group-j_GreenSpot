import React from "react";

interface ExecutiveHeaderProps {
  hasCriticalAlert: boolean;
  onBellClick: () => void;
  currentUser?: {
    full_name?: string;
    role?: string;
    avatar_url?: string;
  } | null;
  onBackToApp?: () => void;
  activeScreen: 1 | 2;
  onChangeScreen: (screen: 1 | 2) => void;
}

export const ExecutiveHeader: React.FC<ExecutiveHeaderProps> = ({
  hasCriticalAlert,
  onBellClick,
  currentUser,
  onBackToApp,
  activeScreen,
  onChangeScreen,
}) => {
  return (
    <header className="exec-header">
      {/* 1. LOGO & TÊN HỆ THỐNG */}
      <div className="header-left">
        <div
          className="app-brand"
          style={{ cursor: "pointer" }}
          onClick={onBackToApp}
          title="Quay lại Bản đồ WebGIS"
        >
          <div className="brand-icon">🛡️</div>
          <div className="brand-text">
            <span className="brand-title">Trung tâm Điều hành Rủi ro Đô thị</span>
            <span className="brand-sub">Sở Tài nguyên & Môi trường TP.HCM</span>
          </div>
        </div>
        <span className="gov-badge">Ban Chỉ huy PCTT</span>
      </div>

      {/* 2. CHUYỂN MÀN THEO PROTOTYPE */}
      <div className="header-center">
        <button
          type="button"
          className="screen-indicator"
          onClick={() => onChangeScreen(activeScreen === 1 ? 2 : 1)}
          title="Bấm để chuyển màn hình điều hành"
          style={{ cursor: "pointer", border: "none" }}
        >
          {activeScreen === 1 ? " Tổng quan rủi ro ➔" : " Lọc & phân tích ➔"}
        </button>
      </div>

      {/* 3. MENU QUẢN TRỊ | CHUÔNG | AVATAR */}
      <div className="header-right">
        {/* Chuông cảnh báo khẩn cấp */}
        <button
          type="button"
          className={`bell-btn ${hasCriticalAlert ? "active-emergency" : ""}`}
          onClick={onBellClick}
          title={hasCriticalAlert ? "Có cảnh báo rủi ro khẩn cấp vượt ngưỡng (> 80)!" : "Thông báo hệ thống"}
          aria-label="Chuông cảnh báo"
        >
          <span>🔔</span>
          {hasCriticalAlert && <span className="bell-badge" />}
        </button>

        {/* Menu Quản trị & Avatar */}
        <div className="admin-menu-dropdown" title="Tài khoản Lãnh đạo điều hành">
          <div className="user-avatar">
            {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="user-info">
            <span className="user-name">{currentUser?.full_name || "Cán bộ Lãnh đạo"}</span>
            <span className="user-role">{currentUser?.role || "Ban Giám Đốc"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
