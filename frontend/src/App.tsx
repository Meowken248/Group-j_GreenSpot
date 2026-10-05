import { useState, useEffect, useRef } from "react";
import EcoMap from "./components/EcoMap";
import AirQualityDashboard from "./components/AirQualityDashboard";
import {
  AuthContainer,
  SessionExpiredModal,
  LogoutConfirmModal,
  subscribeSessionExpired,
  resetSessionExpired,
  AUTH_STORAGE_KEYS,
  revokeAllSessions,
} from "./features/auth";
import { RbacContainer, usePermissions } from "./features/rbac";
import { UserManagementContainer } from "./features/user_management";
import { AccessDeniedView } from "./components/AccessDeniedView";
import api from "./api/client";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState<"map" | "dashboard" | "auth" | "rbac" | "users">(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash === "#map" || path === "/map") return "map";
    if (hash === "#dashboard" || path === "/dashboard") return "dashboard";
    if (hash === "#auth" || hash === "#login" || hash === "#register") return "auth";
    if (hash === "#users" || path === "/users") return "users";
    // Mặc định ưu tiên hiển thị ngay giao diện Phân quyền vai trò RBAC
    return "rbac";
  });
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | undefined>();

  // Hook quản lý tài khoản và quyền hạn thời gian thực (RBAC Permission Guard)
  const { currentUser, canAccess } = usePermissions();
  const hasMapAccess = canAccess("GIS_MAP");
  const hasAqiAccess = canAccess("AIR_QUALITY");
  const hasUserMgmtAccess = currentUser?.role === "ADMIN" || canAccess("USER_MANAGEMENT");
  const hasRbacAccess = currentUser?.role === "ADMIN" || canAccess("ROLE");

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Tự động đóng popup phiên hết hạn ngay khi người dùng đăng nhập lại thành công
  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        setSessionExpiredOpen(false);
        resetSessionExpired();
      }
    };
    window.addEventListener("auth_change", handleAuthChange);
    return () => window.removeEventListener("auth_change", handleAuthChange);
  }, []);

  // Lắng nghe sự kiện hashchange để đồng bộ view khi thay đổi URL hoặc bấm Back/Forward
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#map") setActiveTab("map");
      else if (hash === "#dashboard") setActiveTab("dashboard");
      else if (hash === "#auth" || hash === "#login" || hash === "#register") setActiveTab("auth");
      else if (hash === "#users") setActiveTab("users");
      else if (hash === "#rbac") setActiveTab("rbac");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleRelogin = (redirectUrl?: string) => {
    setSessionExpiredOpen(false);
    setAuthRedirectUrl(redirectUrl);
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO);
    delete api.defaults.headers.common.Authorization;
    resetSessionExpired();
    window.dispatchEvent(new Event("auth_change"));
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
      delete api.defaults.headers.common.Authorization;
      resetSessionExpired();
      window.dispatchEvent(new Event("auth_change"));
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
      setUserDropdownOpen(false);
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

                {currentUser?.role === "ADMIN" && (
                  <>
                    <button
                      type="button"
                      className="dropdown-menu-action"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setActiveTab("users");
                        window.location.hash = "#users";
                      }}
                    >
                      <span className="action-icon">👥</span>
                      <span>Quản lý người dùng</span>
                    </button>
                    <div className="dropdown-separator" />
                    <button
                      type="button"
                      className="dropdown-menu-action"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setActiveTab("rbac");
                        window.location.hash = "#rbac";
                      }}
                    >
                      <span className="action-icon">🛡️</span>
                      <span>Phân quyền vai trò</span>
                    </button>
                    <div className="dropdown-separator" />
                  </>
                )}

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

        {hasUserMgmtAccess && (
          <button
            type="button"
            className={`view-tab-btn ${activeTab === "users" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("users");
              window.location.hash = "#users";
            }}
            title="Quản lý người dùng & Cấp tài khoản"
          >
            <span>👥</span>
            <span>Quản lý người dùng</span>
          </button>
        )}

        {hasRbacAccess && (
          <button
            type="button"
            className={`view-tab-btn ${activeTab === "rbac" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("rbac");
              window.location.hash = "#rbac";
            }}
            title="Quản lý phân quyền vai trò RBAC & Ma trận quyền"
          >
            <span>🛡️</span>
            <span>Phân quyền vai trò</span>
          </button>
        )}

        <button
          type="button"
          className={`view-tab-btn ${activeTab === "map" ? "active" : ""} ${!hasMapAccess ? "permission-locked" : ""}`}
          onClick={(e) => {
            if (!hasMapAccess) {
              e.preventDefault();
              return;
            }
            setActiveTab("map");
            window.location.hash = "#map";
          }}
          disabled={!hasMapAccess}
          title={hasMapAccess ? "Bản đồ không gian xanh, ngập lụt & trạm IoT" : "Chức năng bị khóa: Bạn chưa được cấp quyền truy cập Bản đồ WebGIS"}
        >
          <span>{hasMapAccess ? "🗺️" : "🔒"}</span>
          <span>Bản đồ WebGIS</span>
        </button>

        <button
          type="button"
          className={`view-tab-btn ${activeTab === "dashboard" ? "active" : ""} ${!hasAqiAccess ? "permission-locked" : ""}`}
          onClick={(e) => {
            if (!hasAqiAccess) {
              e.preventDefault();
              return;
            }
            setActiveTab("dashboard");
            window.location.hash = "#dashboard";
          }}
          disabled={!hasAqiAccess}
          title={hasAqiAccess ? "Bảng điều khiển phân tích chất lượng không khí & khí tượng toàn quốc" : "Chức năng bị khóa: Bạn chưa được cấp quyền truy cập Phân tích AQI & Khí hậu"}
        >
          <span>{hasAqiAccess ? "📊" : "🔒"}</span>
          <span>Phân tích AQI & Khí hậu</span>
        </button>
      </nav>

      {/* VIEW NỘI DUNG CHÍNH: AUTH, RBAC, MAP HOẶC DASHBOARD */}
      {activeTab === "auth" ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
          <AuthContainer
            initialView={authRedirectUrl ? "login" : undefined}
            redirectUrl={authRedirectUrl}
            onExitAuth={() => {
              setActiveTab("map");
              window.location.hash = "#map";
            }}
          />
        </div>
      ) : activeTab === "rbac" ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
          <RbacContainer
            onExit={() => {
              setActiveTab("map");
              window.location.hash = "#map";
            }}
            onNavigateToAuth={() => {
              setAuthRedirectUrl("/rbac");
              setActiveTab("auth");
              window.location.hash = "#login";
            }}
          />
        </div>
      ) : activeTab === "users" ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
          <UserManagementContainer
            onBackToHome={() => {
              setActiveTab("map");
              window.location.hash = "#map";
            }}
            onNavigateToAuth={() => {
              setAuthRedirectUrl("/users");
              setActiveTab("auth");
              window.location.hash = "#login";
            }}
          />
        </div>
      ) : activeTab === "map" ? (
        hasMapAccess ? (
          <EcoMap />
        ) : (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <AccessDeniedView
              moduleName="Bản đồ số WebGIS"
              moduleCode="GIS_MAP"
              userRole={currentUser?.role}
              userEmail={currentUser?.email}
              onBackToHome={() => {
                if (hasAqiAccess) {
                  setActiveTab("dashboard");
                  window.location.hash = "#dashboard";
                } else {
                  setActiveTab("auth");
                  window.location.hash = "#login";
                }
              }}
              onNavigateToAuth={() => {
                setAuthRedirectUrl("/map");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        )
      ) : (
        hasAqiAccess ? (
          <AirQualityDashboard onBackToMap={() => setActiveTab("map")} />
        ) : (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <AccessDeniedView
              moduleName="Chỉ số chất lượng không khí AQI & Khí hậu"
              moduleCode="AIR_QUALITY"
              userRole={currentUser?.role}
              userEmail={currentUser?.email}
              onBackToHome={() => {
                if (hasMapAccess) {
                  setActiveTab("map");
                  window.location.hash = "#map";
                } else {
                  setActiveTab("auth");
                  window.location.hash = "#login";
                }
              }}
              onNavigateToAuth={() => {
                setAuthRedirectUrl("/dashboard");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        )
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
