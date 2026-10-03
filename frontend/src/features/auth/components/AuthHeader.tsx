import React from "react";
import "../styles/AuthHeader.scss";

interface AuthHeaderProps {
  onLogoClick?: () => void;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ onLogoClick }) => {
  return (
    <header className="auth-header" role="banner">
      <div 
        className="header-brand" 
        onClick={onLogoClick} 
        style={{ cursor: onLogoClick ? "pointer" : "default" }}
        title="GreenSpot - Nền tảng sinh thái số"
      >
        <div className="brand-logo-icon" aria-hidden="true">🌱</div>
        <div className="brand-text">
          <span className="brand-title">Green<span>Spot</span></span>
          <span className="brand-subtitle">Cổng Dịch Vụ Công Dân Sinh Thái</span>
        </div>
      </div>

      <div className="header-actions" aria-label="Thao tác người dùng (Chưa đăng nhập)">
        {/* Chuông thông báo bị mờ và không bấm được theo đặc tả */}
        <div 
          className="action-item-disabled bell-icon-wrapper" 
          title="Thông báo (Đăng nhập để sử dụng)"
          aria-disabled="true"
        >
          <span role="img" aria-label="Chuông thông báo">🔔</span>
        </div>

        {/* Avatar hiển thị mờ và không bấm được theo đặc tả */}
        <div 
          className="action-item-disabled avatar-wrapper" 
          title="Tài khoản (Đăng nhập để xem hồ sơ)"
          aria-disabled="true"
        >
          <span role="img" aria-label="Ảnh đại diện mặc định">👤</span>
        </div>
      </div>
    </header>
  );
};
