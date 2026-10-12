import React from 'react';

interface DeduplicationHeaderProps {
  onBackToHome?: () => void;
  userName?: string;
  userRole?: string;
}

export const DeduplicationHeader: React.FC<DeduplicationHeaderProps> = ({
  onBackToHome,
  userName = 'Quản trị viên',
  userRole = 'ADMIN',
}) => {
  return (
    <header className="dedup-header">
      <div className="header-left">
        <div className="brand-logo" onClick={onBackToHome} role="button" tabIndex={0}>
          <div className="logo-icon">🌿</div>
          <span>GreenSpot</span>
        </div>
        <span className="brand-subtitle">AI Deduplication Dashboard</span>
      </div>

      <nav className="header-nav" aria-label="Menu quản trị">
        <button type="button" className="nav-link active">
          Đối soát báo cáo trùng
        </button>
        {onBackToHome && (
          <button type="button" className="nav-link" onClick={onBackToHome}>
            Về trang chủ WebGIS
          </button>
        )}
      </nav>

      <div className="header-right">
        <button type="button" className="bell-btn" title="Thông báo hệ thống" aria-label="Thông báo">
          <span>🔔</span>
          <span className="bell-badge" />
        </button>

        <div className="user-profile-badge">
          <div className="user-avatar">{userName.charAt(0)}</div>
          <span className="user-name">{userName}</span>
          <span className="role-tag">{userRole}</span>
        </div>
      </div>
    </header>
  );
};
