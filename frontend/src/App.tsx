import { useState, useEffect, useRef } from "react";
import EcoMap from "./components/EcoMap";
import AirQualityDashboard from "./components/AirQualityDashboard";
import {
  AuthContainer,
  SessionExpiredModal,
  LogoutConfirmModal,
  subscribeSessionExpired,
  AUTH_STORAGE_KEYS,
  revokeAllSessions,
} from "./features/auth";
import api from "./api/client";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState<"map" | "dashboard" | "auth">("auth");
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | undefined>();

  // Quản lý thông tin người dùng đang đăng nhập
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      return token && raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Lắng nghe sự kiện thay đổi đăng nhập để đồng bộ Header ngay lập tức
  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
        const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
        setCurrentUser(token && raw ? JSON.parse(raw) : null);
      } catch {
        setCurrentUser(null);
      }
    };

    window.addEventListener("auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  // Đóng dropdown tài khoản khi click ra ngoài
  useEffect(() => {
    if (!userDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userDropdownOpen]);

  useEffect(() => {
    const unsubscribe = subscribeSessionExpired(() => {
      setSessionExpiredOpen(true);
    });
    return unsubscribe;
  }, []);

  const handleRelogin = (redirectUrl?: string) => {
    setSessionExpiredOpen(false);
    setAuthRedirectUrl(redirectUrl);
    setCurrentUser(null);
    setActiveTab("auth");
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await revokeAllSessions();
    } catch {
      // bỏ qua lỗi nếu token đã mất hiệu lực
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO);
      window.dispatchEvent(new Event("auth_change"));
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
      setUserDropdownOpen(false);
      setCurrentUser(null);
      setAuthRedirectUrl(undefined);
      setActiveTab("auth");
    }
  };

  const checkHealth = async () => {
    setCheckingBackend(true);
    try {
      const response = await api.get("/health");
      setBackendStatus(`Online (${JSON.stringify(response.data)})`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setBackendStatus(`Offline: ${err.message}`);
      } else {
        setBackendStatus("Failed to connect to backend");
      }
    } finally {
      setCheckingBackend(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="app-container">
      {/* POPUP PHIÊN ĐÃ HẾT HẠN (MÀN 4 - SINGLETON MODAL ĐÈ LÊN MỌI MÀN HÌNH) */}
      <SessionExpiredModal
        isOpen={sessionExpiredOpen}
        onRelogin={handleRelogin}
      />

      {/* POPUP XÁC NHẬN ĐĂNG XUẤT (MÀN 3) */}
      <LogoutConfirmModal
        isOpen={logoutModalOpen}
        isCurrentDevice={true}
        deviceName={currentUser ? `Tài khoản ${currentUser.full_name || currentUser.email}` : "Thiết bị này"}
        isLoading={isLoggingOut}
        onCancel={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* THANH ĐIỀU HƯỚNG CHUYỂN ĐỔI CHẾ ĐỘ VIEW (TOP CENTER) */}
      <nav className={`view-mode-switcher ${activeTab === "dashboard" ? "dark-mode" : ""}`} aria-label="Chế độ hiển thị">
        {currentUser ? (
          <div className="user-profile-nav-wrapper" ref={userMenuRef}>
            <button
              type="button"
              className={`view-tab-btn user-nav-btn ${activeTab === "auth" ? "active" : ""} ${userDropdownOpen ? "menu-open" : ""}`}
              onClick={() => setUserDropdownOpen((prev) => !prev)}
              title="Tài khoản công dân số"
              aria-expanded={userDropdownOpen}
            >
              <span className="user-avatar-icon">👤</span>
              <span className="user-display-name">{currentUser.full_name || "Công dân"}</span>
              <span className="user-status-dot" title="Đang hoạt động">🟢</span>
              <span className="user-nav-arrow">{userDropdownOpen ? "▴" : "▾"}</span>
            </button>

            {userDropdownOpen && (
              <div className={`user-nav-dropdown ${activeTab === "dashboard" ? "dark-mode" : ""}`} role="menu">
                <div className="dropdown-user-info">
                  <div className="dropdown-avatar">🌱</div>
                  <div className="dropdown-user-details">
                    <strong className="user-name">{currentUser.full_name || "Công dân GreenSpot"}</strong>
                    <span className="user-email">{currentUser.email}</span>
                    <span className="user-role-badge">
                      {currentUser.role === "CITIZEN" ? "Công dân sinh thái" : currentUser.role}
                    </span>
                  </div>
                </div>

                <div className="dropdown-separator" />

                <button
                  type="button"
                  className="dropdown-menu-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setAuthRedirectUrl("/devices");
                    setActiveTab("auth");
                  }}
                >
                  <span className="action-icon">💻</span>
                  <span>Quản lý thiết bị & Phiên</span>
                </button>

                <div className="dropdown-separator" />

                <button
                  type="button"
                  className="dropdown-menu-action logout-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setLogoutModalOpen(true);
                  }}
                >
                  <span className="action-icon">🚪</span>
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={`view-tab-btn ${activeTab === "auth" ? "active" : ""}`}
            onClick={() => {
              setAuthRedirectUrl(undefined);
              setActiveTab("auth");
            }}
            title="Đăng nhập hoặc đăng ký tài khoản công dân"
          >
            <span>🌱</span>
            <span>Đăng ký / Đăng nhập</span>
          </button>
        )}

        <button
          type="button"
          className={`view-tab-btn ${activeTab === "map" ? "active" : ""}`}
          onClick={() => setActiveTab("map")}
          title="Bản đồ không gian xanh, ngập lụt & trạm IoT"
        >
          <span>🗺️</span>
          <span>Bản đồ WebGIS</span>
        </button>
        <button
          type="button"
          className={`view-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
          title="Bảng điều khiển phân tích chất lượng không khí & khí tượng toàn quốc"
        >
          <span>📊</span>
          <span>Phân tích AQI & Khí hậu</span>
        </button>
      </nav>

      {/* VIEW NỘI DUNG CHÍNH: AUTH, MAP HOẶC DASHBOARD */}
      {activeTab === "auth" ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
          <AuthContainer
            initialView={authRedirectUrl ? "login" : undefined}
            redirectUrl={authRedirectUrl}
            onExitAuth={() => setActiveTab("map")}
          />
        </div>
      ) : activeTab === "map" ? (
        <EcoMap />
      ) : (
        <AirQualityDashboard onBackToMap={() => setActiveTab("map")} />
      )}

      {/* NÚT KIỂM TRA MICROSERVICE BACKEND (GÓC TRÊN BÊN PHẢI) */}
      <div className="quick-status-badge">
        <button
          type="button"
          className={`health-badge-btn ${activeTab === "dashboard" ? "dark-mode" : ""}`}
          onClick={() => {
            setShowDrawer((prev) => !prev);
            if (!backendStatus) checkHealth();
          }}
          title="Kiểm tra trạng thái Backend FastAPI"
        >
          <span className={`dot ${backendStatus?.startsWith("Online") ? "online" : "offline"}`} />
          <span>API Service</span>
        </button>

        {showDrawer && (
          <div className={`health-popover ${activeTab === "dashboard" ? "dark-mode" : ""}`}>
            <div className="popover-header">
              <strong>Backend Diagnostic</strong>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDrawer(false)}
              >
                ×
              </button>
            </div>
            <p className="popover-desc">
              Kiểm tra kết nối microservice FastAPI backend qua axios client.
            </p>
            <div className="popover-actions">
              <button
                type="button"
                className="btn-action"
                onClick={checkHealth}
                disabled={checkingBackend}
              >
                {checkingBackend ? "Đang ping..." : "Ping /health"}
              </button>
            </div>
            {backendStatus && (
              <div
                className={`status-pill ${backendStatus.startsWith("Online") ? "success" : "warning"
                  }`}
              >
                {backendStatus}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
