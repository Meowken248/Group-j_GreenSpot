import React, { useState, useEffect, useRef } from "react";
import { AUTH_STORAGE_KEYS } from "../types/auth.types";
import "../styles/AuthHeader.scss";

export interface AuthHeaderProps {
  onLogoClick?: () => void;
  isLoggedIn?: boolean;
  onNavigateToDevices?: () => void;
  onLogout?: () => void;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  onLogoClick,
  isLoggedIn,
  onNavigateToDevices,
  onLogout,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Xác định trạng thái đăng nhập
  const isAuth =
    isLoggedIn !== undefined
      ? isLoggedIn
      : Boolean(localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN));

  // Lấy thông tin người dùng nếu có
  const userInfo = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [isAuth]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleDevicesClick = () => {
    setDropdownOpen(false);
    if (onNavigateToDevices) {
      onNavigateToDevices();
    } else {
      window.location.hash = "#devices";
    }
  };

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO);
      window.location.href = "/login";
    }
  };

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

      <div
        className="header-actions"
        aria-label={isAuth ? "Thao tác người dùng" : "Thao tác người dùng (Chưa đăng nhập)"}
      >
        {/* Chuông thông báo */}
        {!isAuth ? (
          <div
            className="action-item-disabled bell-icon-wrapper"
            title="Thông báo (Đăng nhập để sử dụng)"
            aria-disabled="true"
          >
            <span role="img" aria-label="Chuông thông báo">🔔</span>
          </div>
        ) : (
          <button
            type="button"
            className="action-item-active bell-icon-active"
            title="Thông báo hệ sinh thái"
            aria-label="Thông báo hệ thống"
          >
            <span role="img" aria-label="Chuông thông báo">🔔</span>
            <span className="notification-badge-dot" />
          </button>
        )}

        {/* Avatar đại diện */}
        {!isAuth ? (
          <div
            className="action-item-disabled avatar-wrapper"
            title="Tài khoản (Đăng nhập để xem hồ sơ)"
            aria-disabled="true"
          >
            <span role="img" aria-label="Ảnh đại diện mặc định">👤</span>
          </div>
        ) : (
          <div className="avatar-dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className={`action-item-active avatar-active ${dropdownOpen ? "menu-open" : ""}`}
              onClick={() => setDropdownOpen((prev) => !prev)}
              title="Menu tài khoản"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <span role="img" aria-label="Ảnh đại diện">👤</span>
            </button>

            {dropdownOpen && (
              <div className="avatar-dropdown-menu" role="menu">
                {userInfo && (
                  <div className="dropdown-user-header">
                    <div className="user-fullname">{userInfo.full_name || "Công dân GreenSpot"}</div>
                    <div className="user-email">{userInfo.email || ""}</div>
                  </div>
                )}

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={handleDevicesClick}
                >
                  <span className="item-icon">💻</span>
                  <span>Thiết bị đăng nhập</span>
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item item-logout"
                  role="menuitem"
                  onClick={handleLogoutClick}
                >
                  <span className="item-icon">🚪</span>
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

