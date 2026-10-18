import React, { useState, useRef, useEffect } from "react";

export interface HeaderNotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  orderId?: string;
  type?: "urgent" | "info" | "success";
  unread?: boolean;
}

interface DispatchHeaderProps {
  currentScreen?: number; // 1 to 6
  activeTab?: string;
  onBackToHome?: () => void;
  onNavigateScreen?: (screen: number) => void;
  onNavigateTab?: (tab: "LIST" | "CREATE" | "TRACKING") => void;
  unreadAlertsCount?: number;
  currentRole?: "ADMIN" | "TEAM";
  onSwitchRole?: (role: "ADMIN" | "TEAM") => void;
  notifications?: HeaderNotificationItem[];
  onSelectNotification?: (item: HeaderNotificationItem) => void;
}

export const DispatchHeader: React.FC<DispatchHeaderProps> = ({
  currentScreen,
  activeTab,
  onBackToHome,
  onNavigateScreen,
  onNavigateTab,
  unreadAlertsCount = 2,
  currentRole = "ADMIN",
  onSwitchRole,
  notifications = [],
  onSelectNotification,
}) => {
  const [showBellDropdown, setShowBellDropdown] = useState<boolean>(false);
  const bellDropdownRef = useRef<HTMLDivElement | null>(null);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellDropdownRef.current && !bellDropdownRef.current.contains(e.target as Node)) {
        setShowBellDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const screenTitles: Record<number, string> = {
    1: "Danh sách lệnh điều phối",
    2: "Khởi tạo lệnh điều động mới",
    3: "Điều chỉnh & tái phân bổ lệnh",
    4: "Xác nhận thu hồi lệnh",
    5: "Thông báo huỷ thành công",
    6: "Giám sát hiện trường thời gian thực",
  };

  const isListActive =
    activeTab === "LIST" ||
    activeTab === "Lệnh điều phối" ||
    activeTab?.includes("Danh sách") ||
    currentScreen === 1;

  const isCreateActive =
    activeTab === "CREATE" ||
    activeTab?.includes("Tạo lệnh") ||
    currentScreen === 2;

  const isTrackingActive =
    activeTab === "TRACKING" ||
    activeTab?.includes("Theo dõi") ||
    activeTab?.includes("Giám sát") ||
    currentScreen === 6;

  const isAdmin = currentRole === "ADMIN";

  return (
    <header className="dispatch-header">
      {/* 1. LOGO & BACK BUTTON */}
      <div className="header-left">
        <div className="brand-title">
          <span className="brand-icon">🚨</span>
          <div className="brand-text">
            <span className="brand-name">GreenSpot</span>
            <span className="brand-subtitle">Trung tâm Điều phối Tác nghiệp</span>
          </div>
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

      {/* 2. MENU QUẢN TRỊ (ADMIN NAVIGATION MENU TABS) */}
      <div className="header-center">
        <nav className="dispatch-nav-tabs" aria-label="Menu quản trị tác nghiệp">
          <button
            type="button"
            className={`dispatch-tab-btn ${isListActive ? "active" : ""}`}
            onClick={() => {
              if (onNavigateTab) onNavigateTab("LIST");
              else if (onNavigateScreen) onNavigateScreen(1);
            }}
          >
            <span>📋</span>
            <span>Danh sách lệnh</span>
          </button>

          <button
            type="button"
            className={`dispatch-tab-btn ${isCreateActive ? "active" : ""}`}
            onClick={() => {
              if (onNavigateTab) onNavigateTab("CREATE");
              else if (onNavigateScreen) onNavigateScreen(2);
            }}
          >
            <span>➕</span>
            <span>Tạo lệnh mới</span>
          </button>

          <button
            type="button"
            className={`dispatch-tab-btn ${isTrackingActive ? "active" : ""}`}
            onClick={() => {
              if (onNavigateTab) onNavigateTab("TRACKING");
              else if (onNavigateScreen) onNavigateScreen(6);
            }}
          >
            <span>🗺️</span>
            <span>Theo dõi hiện trường</span>
          </button>
        </nav>

        {/* Screen indicator badge for test assertion and context */}
        <span className="screen-indicator-badge d-none d-xl-inline-flex">
          {activeTab || (currentScreen ? screenTitles[currentScreen] : undefined) || "Điều phối tác nghiệp"}
        </span>
      </div>

      {/* 3. BỘ CHUYỂN VAI TRÒ (ADMIN / ĐỘI CƠ ĐỘNG) & THÔNG BÁO & AVATAR */}
      <div className="header-right position-relative" ref={bellDropdownRef}>
        {/* Nút chuyển đổi vai trò liên thông nghiệp vụ (Admin <-> Đội xử lý) */}
        {onSwitchRole && (
          <div className="btn-group btn-group-sm me-1 shadow-sm" role="group" aria-label="Chuyển đổi vai trò">
            <button
              type="button"
              className={`btn ${isAdmin ? "btn-primary fw-bold" : "btn-outline-secondary"}`}
              style={{ fontSize: "0.76rem", borderRadius: "9999px 0 0 9999px", padding: "4px 10px" }}
              onClick={() => onSwitchRole("ADMIN")}
              title="Đóng vai trò Cán bộ Quản trị Điều phối"
            >
              🏢 Quản trị
            </button>
            <button
              type="button"
              className={`btn ${!isAdmin ? "btn-warning text-dark fw-bold" : "btn-outline-secondary"}`}
              style={{ fontSize: "0.76rem", borderRadius: "0 9999px 9999px 0", padding: "4px 10px" }}
              onClick={() => onSwitchRole("TEAM")}
              title="Đóng vai trò Đội Cơ động số 3 (Hiện trường)"
            >
              🚛 Đội xử lý
            </button>
          </div>
        )}

        {/* Chuông thông báo */}
        <div
          className="bell-notification"
          title={`Có ${unreadAlertsCount} thông báo khẩn cấp`}
          onClick={() => setShowBellDropdown(!showBellDropdown)}
          role="button"
          tabIndex={0}
        >
          <span className="bell-icon">🔔</span>
          {unreadAlertsCount > 0 && (
            <span className="bell-badge">{unreadAlertsCount}</span>
          )}
        </div>

        {/* Dropdown danh sách thông báo tác nghiệp */}
        {showBellDropdown && (
          <div
            className="shadow-lg rounded-3 bg-white border position-absolute"
            style={{
              top: 48,
              right: 0,
              width: 320,
              zIndex: 1050,
              padding: "10px 0",
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div className="d-flex align-items-center justify-content-between px-3 pb-2 border-bottom">
              <span className="fw-bold" style={{ fontSize: "0.85rem", color: "#0f172a" }}>
                🔔 Thông báo tác nghiệp
              </span>
              <span className="badge bg-danger-subtle text-danger" style={{ fontSize: "0.7rem" }}>
                {unreadAlertsCount} chưa đọc
              </span>
            </div>

            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  Chưa có thông báo mới nào
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`px-3 py-2 border-bottom alert-item-hover ${item.unread ? "bg-light" : ""}`}
                    style={{ cursor: "pointer", transition: "background 0.2s" }}
                    onClick={() => {
                      if (onSelectNotification) onSelectNotification(item);
                      setShowBellDropdown(false);
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="fw-semibold text-truncate" style={{ fontSize: "0.78rem", color: "#1e293b" }}>
                        {item.title}
                      </span>
                      <span className="text-muted" style={{ fontSize: "0.68rem" }}>
                        {item.time}
                      </span>
                    </div>
                    <div className="text-muted text-truncate" style={{ fontSize: "0.74rem" }}>
                      {item.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-3 pt-2 text-center border-top">
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                {isAdmin ? "Chế độ xem: Cán bộ Điều phối" : "Chế độ xem: Đội Cơ động số 3"}
              </span>
            </div>
          </div>
        )}

        {/* Thông tin tài khoản người dùng hiển thị theo vai trò */}
        <div
          className="user-avatar-wrap"
          title={isAdmin ? "Tài khoản Điều hành Sở TN&MT" : "Tài khoản Đội phản ứng cơ động"}
        >
          <div className="avatar-img" style={{ background: isAdmin ? "#2563eb" : "#f59e0b", color: "#ffffff", fontWeight: 700 }}>
            {isAdmin ? "ĐP" : "Đ3"}
          </div>
          <div className="user-info">
            <span className="name">{isAdmin ? "Cán bộ Điều phối" : "Đội Cơ động số 3"}</span>
            <span className="role">{isAdmin ? "Sở Tài nguyên & Môi trường" : "Đội phản ứng nhanh"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
