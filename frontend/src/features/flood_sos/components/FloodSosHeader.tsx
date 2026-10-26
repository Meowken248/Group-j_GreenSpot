import React from "react";
import type { ActiveSosRoleView } from "../types/flood_sos.types";

interface FloodSosHeaderProps {
  activeView: ActiveSosRoleView;
  onSelectView: (view: ActiveSosRoleView) => void;
  pendingCount?: number;
}

export const FloodSosHeader: React.FC<FloodSosHeaderProps> = ({
  activeView,
  onSelectView,
  pendingCount = 0,
}) => {
  return (
    <header className="sos-header" data-testid="sos-header">
      <div className="header-content">
        <div className="brand">
          <div className="brand-logo" aria-label="Logo Cứu hộ khẩn cấp">
            🚨
          </div>
          <div className="brand-text">
            <h1>CỨU HỘ NGẬP LỤT (FLOOD SOS)</h1>
            <span>Mạng lưới Cứu hộ Cộng đồng & Phản ứng nhanh GreenSpot</span>
          </div>
        </div>

        <nav className="header-nav">
          <button
            type="button"
            className={`nav-btn ${activeView === "CITIZEN_DISPATCH" ? "active" : ""}`}
            onClick={() => onSelectView("CITIZEN_DISPATCH")}
            data-testid="tab-dispatch"
          >
            🆘 Phát tín hiệu cấp cứu
          </button>
          <button
            type="button"
            className={`nav-btn ${activeView === "VOLUNTEER_DASHBOARD" ? "volunteer-active" : ""}`}
            onClick={() => onSelectView("VOLUNTEER_DASHBOARD")}
            data-testid="tab-volunteer"
          >
            🚤 Đội phản ứng & Tình nguyện viên
          </button>
          {activeView === "LIVE_TRACKING" && (
            <button
              type="button"
              className="nav-btn active"
              onClick={() => onSelectView("LIVE_TRACKING")}
              data-testid="tab-tracking"
            >
              📍 Theo dõi tiến độ cứu hộ
            </button>
          )}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="bell-btn"
            title="Thông báo khẩn cấp"
            aria-label="Chuông thông báo"
          >
            🔔
            {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </button>
          <div className="avatar" title="Hồ sơ tài khoản" aria-label="Avatar người dùng">
            GS
          </div>
        </div>
      </div>
    </header>
  );
};
