import { useState, useEffect, useRef } from "react";
import EcoMap from "./components/EcoMap";
import AirQualityDashboard from "./components/AirQualityDashboard";
import { VoiceAssistant } from "./components/VoiceAssistant";
import {
  AuthContainer,
  SessionExpiredModal,
  LogoutConfirmModal,
  subscribeSessionExpired,
  resetSessionExpired,
  AUTH_STORAGE_KEYS,
  revokeAllSessions,
} from "./features/auth";
import { RbacContainer, usePermissions, ModulePermissionGuard } from "./features/rbac";
import { UserManagementContainer } from "./features/user_management";
import { ProfileContainer } from "./features/profile";
import { FriendsContainer } from "./features/friends";
import { DeduplicationDashboard } from "./features/reports";
import { PenaltyLookupContainer } from "./features/penalties";
import {
  SettingsContainer,
  applyThemeToDocument,
  getLocalPreferences,
  fetchPreferencesFromServer,
  subscribeThemeChange,
} from "./features/settings";
import type { ThemeMode } from "./features/settings";
import api from "./api/client";
import "./App.css";

// Hàm kiểm tra trạng thái đăng nhập thực tế của phiên hiện tại
const checkIsLoggedIn = (): boolean => {
  try {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    const userInfo = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
    return Boolean(token && userInfo);
  } catch {
    return false;
  }
};

function App() {
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | undefined>(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const isLogged = checkIsLoggedIn();
    if (!isLogged) {
      if (hash === "#profile" || path === "/profile") return "/profile";
      if (hash === "#friends" || path === "/friends") return "/friends";
      if (hash === "#dashboard" || path === "/dashboard") return "/dashboard";
      if (hash === "#users" || path === "/users") return "/users";
      if (hash === "#rbac" || path === "/rbac") return "/rbac";
      if (hash === "#dedup" || path === "/dedup") return "/dedup";
      if (hash === "#settings" || path === "/settings") return "/settings";
    }
    return undefined;
  });

  const [activeTab, setActiveTab] = useState<"map" | "dashboard" | "auth" | "rbac" | "users" | "profile" | "friends" | "voice" | "dedup" | "settings" | "penalties">(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const isLogged = checkIsLoggedIn();

    if (hash === "#map" || path === "/map") return "map";
    if (hash === "#penalties" || path === "/penalties") return "penalties";
    if (hash === "#auth" || hash === "#login" || hash === "#register" || hash === "#devices") return "auth";
    if (hash === "#voice" || path === "/voice") return "voice";

    // Khách vãng lai chưa đăng nhập: Không được phép vào các trang cài đặt, phân tích khí hậu, bạn bè, profile, quản trị, trùng lặp
    if (hash === "#settings" || path === "/settings") {
      if (!isLogged) return "auth";
      return "settings";
    }
    if (hash === "#dashboard" || path === "/dashboard") {
      if (!isLogged) return "auth";
      return "dashboard";
    }
    if (hash === "#friends" || path === "/friends") {
      if (!isLogged) return "auth";
      return "friends";
    }
    if (hash === "#profile" || path === "/profile") {
      if (!isLogged) return "auth";
      return "profile";
    }
    if (hash === "#users" || path === "/users") {
      if (!isLogged) return "auth";
      return "users";
    }
    if (hash === "#rbac" || path === "/rbac") {
      if (!isLogged) return "auth";
      return "rbac";
    }
    if (hash === "#dedup" || path === "/dedup") {
      if (!isLogged) return "auth";
      return "dedup";
    }

    // Mặc định: khi chưa đăng nhập, chỉ hiển thị Bản đồ WebGIS công cộng
    if (!isLogged) return "map";
    return "profile";
  });
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);

  // Quản lý theme thời gian thực từ LocalStorage và sự kiện thay đổi
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => getLocalPreferences().theme);
  const isDarkMode = currentTheme === "DARK";

  useEffect(() => {
    const localPrefs = getLocalPreferences();
    applyThemeToDocument(localPrefs.theme);
    setCurrentTheme(localPrefs.theme);

    // Tự động đồng bộ cài đặt giao diện từ server nếu đã đăng nhập
    if (checkIsLoggedIn()) {
      fetchPreferencesFromServer()
        .then((remotePrefs) => {
          if (remotePrefs?.theme) {
            setCurrentTheme(remotePrefs.theme);
            applyThemeToDocument(remotePrefs.theme);
          }
        })
        .catch(() => {
          // Bỏ qua nếu lỗi kết nối
        });
    }

    const unsubscribe = subscribeThemeChange((newTheme) => {
      setCurrentTheme(newTheme);
    });
    return unsubscribe;
  }, []);

  // Hook quản lý tài khoản và quyền hạn thời gian thực (RBAC Permission Guard)
  const { currentUser, canAccess } = usePermissions();
  const hasMapAccess = canAccess("GIS_MAP");
  const hasAqiAccess = canAccess("AIR_QUALITY");
  const hasUserMgmtAccess = currentUser?.role === "ADMIN" || canAccess("USER_MANAGEMENT");
  const hasRbacAccess = currentUser?.role === "ADMIN" || canAccess("ROLE");
  const hasDedupAccess =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "OFFICER" ||
    currentUser?.role === "DISTRICT_MANAGER" ||
    currentUser?.role === "COORDINATOR" ||
    canAccess("INCIDENTS");

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
      const isLogged = checkIsLoggedIn();

      if (hash === "#map") {
        setActiveTab("map");
      } else if (hash === "#dashboard") {
        if (!isLogged) {
          setAuthRedirectUrl("/dashboard");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("dashboard");
        }
      } else if (hash === "#friends") {
        if (!isLogged) {
          setAuthRedirectUrl("/friends");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("friends");
        }
      } else if (hash === "#auth" || hash === "#login" || hash === "#register" || hash === "#devices") {
        setActiveTab("auth");
      } else if (hash === "#users") {
        if (!isLogged) {
          setAuthRedirectUrl("/users");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("users");
        }
      } else if (hash === "#rbac") {
        if (!isLogged) {
          setAuthRedirectUrl("/rbac");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("rbac");
        }
      } else if (hash === "#voice") {
        setActiveTab("voice");
      } else if (hash === "#dedup" || window.location.pathname === "/dedup") {
        if (!isLogged) {
          setAuthRedirectUrl("/dedup");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("dedup");
        }
      } else if (hash === "#profile") {
        if (!isLogged) {
          setAuthRedirectUrl("/profile");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("profile");
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Tự động đẩy người dùng về màn hình đăng nhập nếu ở các tab yêu cầu tài khoản mà chưa có currentUser
  useEffect(() => {
    if (!currentUser) {
      if (activeTab === "profile") {
        setAuthRedirectUrl("/profile");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "friends") {
        setAuthRedirectUrl("/friends");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "dashboard") {
        setAuthRedirectUrl("/dashboard");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "users") {
        setAuthRedirectUrl("/users");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "rbac") {
        setAuthRedirectUrl("/rbac");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "dedup") {
        setAuthRedirectUrl("/dedup");
        setActiveTab("auth");
        window.location.hash = "#login";
      }
    }
  }, [activeTab, currentUser]);

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
      <nav className={`view-mode-switcher ${isDarkMode ? "dark-mode" : ""}`} aria-label="Chế độ hiển thị">
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
              <div className={`user-nav-dropdown ${isDarkMode ? "dark-mode" : ""}`} role="menu">
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
                    setActiveTab("profile");
                    window.location.hash = "#profile";
                  }}
                >
                  <span className="action-icon">🌿</span>
                  <span>Trang cá nhân & Green Passport</span>
                </button>

                <div className="dropdown-separator" />

                <button
                  type="button"
                  className="dropdown-menu-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setActiveTab("penalties");
                    window.location.hash = "#penalties";
                  }}
                >
                  <span className="action-icon">⚖️</span>
                  <span>Tra cứu quy định xử phạt</span>
                </button>

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
                    <button
                      type="button"
                      className="dropdown-menu-action"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setActiveTab("dedup");
                        window.location.hash = "#dedup";
                      }}
                    >
                      <span className="action-icon">📑</span>
                      <span>Báo cáo trùng lặp (AI)</span>
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
                    window.location.hash = "#devices";
                  }}
                >
                  <span className="action-icon">💻</span>
                  <span>Quản lý thiết bị & Phiên</span>
                </button>

                <div className="dropdown-separator" />

                <button
                  type="button"
                  className="dropdown-menu-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setActiveTab("settings");
                    window.location.hash = "#settings";
                  }}
                >
                  <span className="action-icon">⚙️</span>
                  <span>Cài đặt tài khoản</span>
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

        {currentUser ? (
          <>
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

            {hasDedupAccess && (
              <button
                type="button"
                className={`view-tab-btn ${activeTab === "dedup" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("dedup");
                  window.location.hash = "#dedup";
                }}
                title="Bảng điều khiển AI gom cụm báo cáo trùng lặp"
              >
                <span>📑</span>
                <span>Báo cáo trùng (AI)</span>
              </button>
            )}

            {hasMapAccess && (
              <button
                type="button"
                className={`view-tab-btn ${activeTab === "map" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
                title="Bản đồ không gian xanh, ngập lụt & trạm IoT"
              >
                <span>🗺️</span>
                <span>Bản đồ WebGIS</span>
              </button>
            )}

            {hasAqiAccess && (
              <button
                type="button"
                className={`view-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("dashboard");
                  window.location.hash = "#dashboard";
                }}
                title="Bảng điều khiển phân tích chất lượng không khí & khí tượng toàn quốc"
              >
                <span>📊</span>
                <span>Phân tích AQI & Khí hậu</span>
              </button>
            )}

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "penalties" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("penalties");
                window.location.hash = "#penalties";
              }}
              title="Tra cứu quy định xử phạt vi phạm hành chính (Nghị định 45/2022/NĐ-CP)"
            >
              <span>⚖️</span>
              <span>Tra cứu xử phạt</span>
            </button>
            
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "voice" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("voice");
                window.location.hash = "#voice";
              }}
              title="Trợ lý giọng nói rảnh tay (Hands-free Voice Assistant)"
            >
              <span>🎙️</span>
              <span>Trợ lý Giọng nói</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "friends" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("friends");
                window.location.hash = "#friends";
              }}
              title="Kết bạn và theo dõi công dân xanh"
            >
              <span>🤝</span>
              <span>Bạn bè & Kết nối</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("profile");
                window.location.hash = "#profile";
              }}
              title="Trang cá nhân, Green Passport & Lịch sử đóng góp"
            >
              <span>🌿</span>
              <span>Hồ sơ xanh</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("settings");
                window.location.hash = "#settings";
              }}
              title="Cài đặt giao diện, ngôn ngữ và bảo mật tài khoản"
            >
              <span>⚙️</span>
              <span>Cài đặt</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "map" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              title="Bản đồ không gian xanh, ngập lụt & trạm IoT"
            >
              <span>🗺️</span>
              <span>Bản đồ WebGIS</span>
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "penalties" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("penalties");
                window.location.hash = "#penalties";
              }}
              title="Tra cứu quy định xử phạt vi phạm hành chính (Nghị định 45/2022/NĐ-CP)"
            >
              <span>⚖️</span>
              <span>Tra cứu xử phạt</span>
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "voice" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("voice");
                window.location.hash = "#voice";
              }}
              title="Trợ lý giọng nói rảnh tay (Hands-free Voice Assistant)"
            >
              <span>🎙️</span>
              <span>Trợ lý Giọng nói</span>
            </button>
          </>
        )}
      </nav>

      {/* VIEW NỘI DUNG CHÍNH: AUTH, RBAC, PROFILE, MAP, DASHBOARD HOẶC VOICE */}
      {activeTab === "auth" ? (
        <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
          <AuthContainer
            initialView={
              authRedirectUrl === "/devices" || window.location.hash === "#devices"
                ? "devices"
                : authRedirectUrl
                ? "login"
                : undefined
            }
            redirectUrl={authRedirectUrl}
            onExitAuth={() => {
              setActiveTab("map");
              window.location.hash = "#map";
            }}
          />
        </div>
      ) : activeTab === "profile" ? (
        !currentUser ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
            <AuthContainer
              initialView="login"
              redirectUrl="/profile"
              onExitAuth={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </div>
        ) : (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
            <ProfileContainer
              onBackToMap={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateToAqi={() => {
                setActiveTab("dashboard");
                window.location.hash = "#dashboard";
              }}
              onNavigateToAuth={() => {
                setAuthRedirectUrl("/profile");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        )
      ) : activeTab === "rbac" ? (
        <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
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
      ) : activeTab === "friends" ? (
        !currentUser ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
            <AuthContainer
              initialView="login"
              redirectUrl="/friends"
              onExitAuth={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </div>
        ) : (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
            <FriendsContainer
              currentUser={currentUser}
              onBackToHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateToProfile={() => {
                setActiveTab("profile");
                window.location.hash = "#profile";
              }}
            />
          </div>
        )
      ) : activeTab === "users" ? (
        <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
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
      ) : activeTab === "dedup" ? (
        <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
          <DeduplicationDashboard
            currentUser={currentUser}
            onBackToHome={() => {
              setActiveTab("map");
              window.location.hash = "#map";
            }}
          />
        </div>
      ) : activeTab === "settings" ? (
        !currentUser ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
            <AuthContainer
              initialView="login"
              redirectUrl="/settings"
              onExitAuth={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </div>
        ) : (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
            <SettingsContainer
              currentUser={currentUser}
              onBackToMap={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateToAuth={() => {
                setAuthRedirectUrl("/settings");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        )
      ) : activeTab === "dashboard" ? (
        !currentUser ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <AuthContainer
              initialView="login"
              redirectUrl="/dashboard"
              onExitAuth={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </div>
        ) : (
          <ModulePermissionGuard
            moduleCode="AIR_QUALITY"
            moduleName="Chỉ số chất lượng không khí AQI & Khí hậu"
          >
            <AirQualityDashboard
              onBackToMap={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </ModulePermissionGuard>
        )
      ) : activeTab === "voice" ? (
        <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
          <VoiceAssistant
            onClose={() => setActiveTab("map")}
            onNavigateToFeature={(target) => {
              if (target === "dashboard_aqi") {
                setActiveTab("dashboard");
              } else {
                setActiveTab("map");
              }
            }}
          />
        </div>
      ) : activeTab === "penalties" ? (
        <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
          <PenaltyLookupContainer
            currentUser={currentUser}
            onNavigateToAuth={() => {
              setAuthRedirectUrl("/penalties");
              setActiveTab("auth");
              window.location.hash = "#login";
            }}
            onNavigateToReport={() => {
              setActiveTab("map");
              window.location.hash = "#map";
            }}
          />
        </div>
      ) : (
        /* Mặc định an toàn cho khách vãng lai và tab map: Bản đồ số WebGIS công cộng */
        <ModulePermissionGuard
          moduleCode="GIS_MAP"
          moduleName="Bản đồ số WebGIS"
        >
          <EcoMap />
        </ModulePermissionGuard>
      )}

      {/* NÚT TRỢ LÝ GIỌNG NÓI NHANH NỔI (FLOATING QUICK ACTION KHI Ở MAP HOẶC DASHBOARD) */}
      {
        activeTab !== "voice" && (
          <button
            type="button"
            className="floating-voice-quick-btn"
            onClick={() => setActiveTab("voice")}
            title="Bật Trợ lý giọng nói rảnh tay"
            aria-label="Trợ lý giọng nói"
          >
            <span className="floating-mic-icon">🎙️</span>
            <span className="floating-mic-label">Trợ lý ảo</span>
          </button>
        )
      }

      {/* NÚT KIỂM TRA MICROSERVICE BACKEND (GÓC TRÊN BÊN PHẢI) */}
      <div className="quick-status-badge">
        <button
          type="button"
          className={`health-badge-btn ${isDarkMode || activeTab === "dashboard" ? "dark-mode" : ""}`}
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
          <div className={`health-popover ${isDarkMode || activeTab === "dashboard" ? "dark-mode" : ""}`}>
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
    </div >
  );
}

export default App;
