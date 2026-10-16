import React from "react";

interface DispatchHeaderProps {
  currentScreen?: number; // 1 to 6
  activeTab?: string;
  onBackToHome?: () => void;
  onNavigateScreen?: (screen: number) => void;
  unreadAlertsCount?: number;
}

export const DispatchHeader: React.FC<DispatchHeaderProps> = ({
  currentScreen,
  activeTab,
  onBackToHome,
  onNavigateScreen,
  unreadAlertsCount = 2,
}) => {
  const screenTitles: Record<number, string> = {
    1: "Danh sách lệnh điều phối",
    2: "Khởi tạo lệnh điều động mới",
    3: "Điều chỉnh & tái phân bổ lệnh",
    4: "Xác nhận thu hồi lệnh",
    5: "Thông báo huỷ thành công",
    6: "Giám sát hiện trường thời gian thực",
  };

  return (
    <header className="dispatch-header">
      {/* 1. LOGO & BACK BUTTON */}
      <div className="header-left">
        <div className="brand-title">
          <span>🚨</span>
          <span>Trung tâm Điều phối Tác nghiệp</span>
        </div>
        {onBackToHome && (
          <button
            type="button"
            className="btn-back-nav"
            onClick={onBackToHome}
            title="Quay về Bản đồ số TP.HCM"
          >
            ← Bản đồ số
          </button>
        )}
      </div>

      {/* 2. CHỈ BÁO MÀN HÌNH ĐANG THAO TÁC */}
      <div className="header-center">
        <span className="screen-indicator-badge">
          {activeTab || (currentScreen ? screenTitles[currentScreen] : undefined) || "Điều phối tác nghiệp"}
        </span>
        {currentScreen !== 1 && onNavigateScreen && (
          <button
            type="button"
            className="btn-back-nav"
            onClick={() => onNavigateScreen(1)}
            style={{ marginLeft: 8 }}
          >
            ← Danh sách lệnh
          </button>
        )}
      </div>

      {/* 3. CHUÔNG THÔNG BÁO & AVATAR LÃNH ĐẠO */}
      <div className="header-right">
        <div className="bell-notification" title="Thông báo khẩn cấp hiện trường">
          <span>🔔</span>
          {unreadAlertsCount > 0 && <span className="bell-dot" />}
        </div>

        <div className="user-avatar-wrap">
          <div className="avatar-img">ĐP</div>
          <div className="user-info">
            <span className="name">Cán bộ Điều phối</span>
            <span className="role">Sở Tài nguyên & Môi trường</span>
          </div>
        </div>
      </div>
    </header>
  );
};
