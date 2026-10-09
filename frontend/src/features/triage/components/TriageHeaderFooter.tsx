import React from "react";

interface HeaderProps {
  currentTab: "triage" | "spatial";
  onTabChange: (tab: "triage" | "spatial") => void;
  activeIncidentsCount?: number;
}

export const TriageHeader: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  activeIncidentsCount = 4,
}) => {
  return (
    <header className="triage-global-header">
      <div className="header-branding">
        <div className="brand-icon">🌱</div>
        <div className="brand-title">
          Green<span>Spot</span> Admin
        </div>
        <span className="badge-system">AI Triage & GIS Hub</span>
      </div>

      <div className="header-nav-actions">
        <div className="nav-switch-tab">
          <button
            type="button"
            className={`tab-btn ${currentTab === "triage" ? "active" : ""}`}
            onClick={() => onTabChange("triage")}
          >
            STT 39: Tóm tắt & Ưu tiên AI
          </button>
          <button
            type="button"
            className={`tab-btn ${currentTab === "spatial" ? "active" : ""}`}
            onClick={() => onTabChange("spatial")}
          >
            STT 40: Phân tích vùng đệm GIS
          </button>
        </div>

        <div className="notification-bell" title="Thông báo hệ thống">
          <span>🔔</span>
          {activeIncidentsCount > 0 && <span className="bell-dot" />}
        </div>

        <div className="user-avatar-pill">
          <div className="avatar-img">CB</div>
          <span className="avatar-role">Điều phối viên</span>
        </div>
      </div>
    </header>
  );
};

export const TriageFooter: React.FC = () => {
  return (
    <footer className="triage-global-footer">
      <div className="footer-left">
        <span>© 2026 GreenSpot (EcoReport) - Hệ thống Thẩm định & Điều phối Sự cố Môi trường Thông minh</span>
      </div>
      <div className="footer-links">
        <a href="#privacy">Chính sách bảo mật</a>
        <a href="#contact">Liên hệ hỗ trợ khẩn cấp</a>
        <a href="#terms">Quy chế thẩm định SLA</a>
      </div>
    </footer>
  );
};
