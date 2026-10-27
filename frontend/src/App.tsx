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
import { DeduplicationDashboard, ReportContainer } from "./features/reports";
import { IncidentManagementContainer } from "./features/incident_management";
import { TriageAppDashboard } from "./features/triage";
import { PenaltyLookupContainer, PenaltyReportsDashboard } from "./features/penalties";
import { PostCreatorContainer } from "./features/posts";
import { FloodNavigationContainer } from "./features/navigation";
import { RiskDashboardContainer } from "./features/risk_dashboard";
import { DispatchContainer } from "./features/dispatch";
import { HotspotContainer } from "./features/hotspots";
import { EmergencyAlertContainer } from "./features/emergency_alert";
import { FloodSosContainer } from "./features/flood_sos";
import { IncidentExportContainer } from "./features/incident_export";
import { AdminDashboardContainer } from "./features/admin_dashboard";
import {
  SettingsContainer,
  applyThemeToDocument,
  getLocalPreferences,
  saveLocalPreferences,
  updatePreferencesOnServer,
  fetchPreferencesFromServer,
  subscribeThemeChange,
} from "./features/settings";
import type { ThemeMode } from "./features/settings";
import { RewardsContainer } from "./features/rewards";
import { WeeklyChallengesContainer } from "./features/challenges/WeeklyChallengesContainer";
import { AuditLogContainer } from "./features/audit_logs/AuditLogContainer";
import { WasteHandbookContainer } from "./features/waste_handbook/WasteHandbookContainer";
import { LeaderboardContainer } from "./features/leaderboard/LeaderboardContainer";
import { MultiModeHeatmapContainer } from "./features/heatmap/MultiModeHeatmapContainer";
import { QRScanContainer } from "./features/qr_scan/QRScanContainer";
import { LuckyWheelContainer } from "./features/lucky_wheel/LuckyWheelContainer";
import { MilestoneContainer } from "./features/milestone/MilestoneContainer";
import api from "./api/client";
import { APP_ROUTES, resolveTabFromUrl, navigateToRoute } from "./routes/appRoutes";
import type { ActiveTab } from "./routes/appRoutes";
import "./App.css";

export type { ActiveTab };
export type TabType = ActiveTab;

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
    const isLogged = checkIsLoggedIn();
    if (!isLogged) {
      const resolved = resolveTabFromUrl();
      const route = APP_ROUTES[resolved];
      if (route && route.requiresAuth) {
        return route.path;
      }
    }
    return undefined;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const resolved = resolveTabFromUrl();
    const isLogged = checkIsLoggedIn();
    const route = APP_ROUTES[resolved];
    if (route && route.requiresAuth && !isLogged) {
      return "auth";
    }
    return resolved;
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

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = currentTheme === "DARK" ? "LIGHT" : "DARK";
    try {
      const prefs = getLocalPreferences();
      const updated = { ...prefs, theme: nextTheme };
      saveLocalPreferences(updated);
      applyThemeToDocument(nextTheme);
      setCurrentTheme(nextTheme);
      if (checkIsLoggedIn()) {
        updatePreferencesOnServer({
          theme: nextTheme,
          language: updated.language,
          version: updated.version,
        }).catch(() => { });
      }
    } catch {
      applyThemeToDocument(nextTheme);
      setCurrentTheme(nextTheme);
    }
  };

  // Hook quản lý tài khoản và quyền hạn thời gian thực (RBAC Permission Guard)
  const { currentUser, canAccess } = usePermissions();
  const hasMapAccess = canAccess("GIS_MAP");
  const hasAqiAccess = canAccess("AIR_QUALITY");
  const hasUserMgmtAccess = currentUser?.role === "ADMIN" || canAccess("USER_MANAGEMENT");
  const hasRbacAccess = currentUser?.role === "ADMIN" || canAccess("ROLE") || canAccess("ROLES");
  const hasAuditAccess = currentUser?.role === "ADMIN" || canAccess("AUDIT_LOG");
  const hasIncidentMgmtAccess =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "DISTRICT_MANAGER" ||
    canAccess("INCIDENTS");
  const hasDedupAccess =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "OFFICER" ||
    currentUser?.role === "DISTRICT_MANAGER" ||
    currentUser?.role === "COORDINATOR" ||
    canAccess("INCIDENTS");
  const hasTriageAccess =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "OFFICER" ||
    currentUser?.role === "DISTRICT_MANAGER" ||
    currentUser?.role === "COORDINATOR" ||
    canAccess("INCIDENTS");

  const hasRiskDashboardAccess =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "OFFICER" ||
    currentUser?.role === "DISTRICT_MANAGER" ||
    currentUser?.role === "COORDINATOR" ||
    canAccess("STATISTICS") ||
    canAccess("INCIDENTS");

  const hasDispatchAccess =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "OFFICER" ||
    currentUser?.role === "DISTRICT_MANAGER" ||
    currentUser?.role === "COORDINATOR" ||
    currentUser?.role === "RESPONDER" ||
    canAccess("INCIDENTS");

  const hasHotspotsAccess =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "OFFICER" ||
    currentUser?.role === "DISTRICT_MANAGER" ||
    currentUser?.role === "COORDINATOR" ||
    canAccess("STATISTICS") ||
    canAccess("INCIDENTS");

  const hasPenaltyReportsAccess =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "OFFICER" ||
    currentUser?.role === "DISTRICT_MANAGER" ||
    currentUser?.role === "RESPONDER" ||
    currentUser?.role === "COORDINATOR" ||
    canAccess("CITIZEN_FEEDBACK") ||
    canAccess("INCIDENTS");

  const [openDropdown, setOpenDropdown] = useState<"geo" | "ops" | "community" | "user" | null>(null);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const topHeaderRef = useRef<HTMLElement>(null);

  // Đóng dropdown và popover khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    if (!openDropdown && !showDrawer) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (topHeaderRef.current && !topHeaderRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setShowDrawer(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDropdown(null);
        setShowDrawer(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDropdown, showDrawer]);

  const navigateTo = (tab: ActiveTab, _pathOrHash?: string) => {
    setActiveTab(tab);
    navigateToRoute(tab);
    setOpenDropdown(null);
    setShowDrawer(false);
  };

  const isGeoActive = ["map", "dashboard", "navigation", "hotspots", "risk-dashboard"].includes(activeTab);
  const isOpsActive = ["dispatch", "penalty-reports", "triage", "dedup", "incidents"].includes(activeTab);
  const isCommunityActive = ["posts", "friends", "voice", "safety-check", "report"].includes(activeTab);
  const isPenaltiesActive = activeTab === "penalties";

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

  // Lắng nghe cả popstate (HTML5 History API) và hashchange (tương thích ngược) để đồng bộ view khi thay đổi URL
  useEffect(() => {
    const handleUrlSync = () => {
      const resolved = resolveTabFromUrl(window.location.pathname, window.location.hash);
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      const isLogged = !!token;
      const route = APP_ROUTES[resolved];

      if (route && route.requiresAuth && !isLogged) {
        setAuthRedirectUrl(route.path);
        setActiveTab("auth");
        navigateToRoute("auth", undefined, true);
        return;
      }

      setActiveTab(resolved);

      // Nếu người dùng vào bằng hash cũ (VD: #admin-dashboard), tự động chuẩn hóa URL đẹp (/admin/activity-dashboard)
      if (window.location.hash && window.location.hash.startsWith("#")) {
        navigateToRoute(resolved, undefined, true);
      }
    };

    // Kiểm tra và chuẩn hóa ngay khi mount nếu có hash
    if (window.location.hash && window.location.hash.startsWith("#")) {
      const initialTab = resolveTabFromUrl();
      navigateToRoute(initialTab, undefined, true);
    }

    window.addEventListener("popstate", handleUrlSync);
    window.addEventListener("hashchange", handleUrlSync);
    return () => {
      window.removeEventListener("popstate", handleUrlSync);
      window.removeEventListener("hashchange", handleUrlSync);
    };
  }, []);

  // Tự động đẩy người dùng về màn hình đăng nhập nếu ở các tab yêu cầu tài khoản mà chưa có currentUser
  useEffect(() => {
    if (!currentUser) {
      const route = APP_ROUTES[activeTab];
      if (route && route.requiresAuth) {
        setAuthRedirectUrl(route.path);
        setActiveTab("auth");
        navigateToRoute("auth", undefined, true);
      }
    }
  }, [activeTab, currentUser]);

  const handleRelogin = (redirectUrl?: string) => {
    setSessionExpiredOpen(false);
    const target = redirectUrl || window.location.pathname || APP_ROUTES[activeTab].path;
    sessionStorage.setItem("greenspot_target_hash", target);
    setAuthRedirectUrl(target);
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO);
    delete api.defaults.headers.common.Authorization;
    resetSessionExpired();
    window.dispatchEvent(new Event("auth_change"));
    setActiveTab("auth");
  };

  const handleLoginSuccess = (targetRedirect?: string) => {
    // 1. Lấy thông tin đích chuyển hướng từ param, state, sessionStorage hoặc hash hiện tại
    const stored = sessionStorage.getItem("greenspot_target_hash");
    sessionStorage.removeItem("greenspot_target_hash");

    let raw = targetRedirect || authRedirectUrl || stored || "";
    if (
      !raw &&
      window.location.pathname &&
      window.location.pathname !== "/" &&
      !window.location.pathname.startsWith("/auth")
    ) {
      raw = window.location.pathname;
    }

    setAuthRedirectUrl(undefined);
    const target = raw.trim();

    // 2. Chuyển hướng chính xác về chức năng đích tương ứng
    if (target) {
      const resolved = resolveTabFromUrl(target, target);
      if (resolved && resolved !== "map") {
        navigateTo(resolved);
        return;
      }
    }

    // Nếu không có bất kỳ URL nào được chỉ định trước đó:
    // Phân quyền theo vai trò vừa đăng nhập: ADMIN -> users, CITIZEN -> challenges
    try {
      const userRaw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      const u = userRaw ? JSON.parse(userRaw) : null;
      if (u?.role === "ADMIN") {
        navigateTo("users");
      } else {
        navigateTo("challenges");
      }
    } catch {
      navigateTo("challenges");
    }
  };

  const handleExitAuth = () => {
    const stored = sessionStorage.getItem("greenspot_target_hash");
    sessionStorage.removeItem("greenspot_target_hash");
    if (stored) {
      handleLoginSuccess(stored);
    } else {
      navigateTo("map");
    }
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
      setOpenDropdown(null);
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

      {/* THANH TOP HEADER BAR (CHUẨN ENTERPRISE DASHBOARD) */}
      <header ref={topHeaderRef} className={`app-top-header ${isDarkMode ? "dark-mode" : ""}`} role="banner">
        {/* KHỐI TRÁI: LOGO & THƯƠNG HIỆU */}
        <div className="header-left">
          <button
            type="button"
            className="brand-logo-btn"
            onClick={() => navigateTo("map", "#map")}
            title="Trang chủ WebGIS GreenSpot"
          >
            <div className="brand-logo-icon">🌿</div>
            <div className="brand-text-group">
              <span className="brand-name">GreenSpot</span>
              <span className="brand-badge">WebGIS</span>
            </div>
          </button>
        </div>

        {/* KHỐI GIỮA: 4 NHÓM MENU ĐIỀU HƯỚNG TINH GỌN */}
        <nav className="header-center-nav" aria-label="Điều hướng chính">
          {/* NHÓM 1: BẢN ĐỒ & KHÍ HẬU */}
          <div className="nav-dropdown-wrapper">
            <button
              type="button"
              className={`nav-group-btn ${isGeoActive ? "active" : ""} ${openDropdown === "geo" ? "dropdown-open" : ""}`}
              onClick={() => setOpenDropdown((prev) => (prev === "geo" ? null : "geo"))}
              aria-expanded={openDropdown === "geo"}
            >
              <span className="nav-icon">🗺️</span>
              <span className="nav-label">Bản đồ & Khí hậu</span>
              <span className="dropdown-caret">{openDropdown === "geo" ? "▴" : "▾"}</span>
            </button>

            {openDropdown === "geo" && (
              <div className={`nav-menu-panel ${isDarkMode ? "dark-mode" : ""}`} role="menu">
                <div className="panel-section-title">DỮ LIỆU KHÔNG GIAN SỐ</div>

                {hasMapAccess && (
                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "map" ? "active" : ""}`}
                    onClick={() => navigateTo("map", "#map")}
                  >
                    <span className="panel-item-icon">🗺️</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Bản đồ WebGIS</span>
                      <span className="panel-item-desc">Không gian xanh, ngập lụt & trạm IoT</span>
                    </div>
                    {activeTab === "map" && <span className="active-indicator">●</span>}
                  </button>
                )}

                {hasAqiAccess && (
                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "dashboard" ? "active" : ""}`}
                    onClick={() => navigateTo("dashboard", "#dashboard")}
                  >
                    <span className="panel-item-icon">📊</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Phân tích AQI & Khí hậu</span>
                      <span className="panel-item-desc">Chất lượng không khí & radar khí tượng</span>
                    </div>
                    {activeTab === "dashboard" && <span className="active-indicator">●</span>}
                  </button>
                )}

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "navigation" ? "active" : ""}`}
                  onClick={() => navigateTo("navigation", "#navigation")}
                >
                  <span className="panel-item-icon">🧭</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Dẫn đường tránh ngập</span>
                    <span className="panel-item-desc">Tìm tuyến đường an toàn thời gian thực</span>
                  </div>
                  {activeTab === "navigation" && <span className="active-indicator">●</span>}
                </button>

                {hasHotspotsAccess && (
                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "hotspots" ? "active" : ""}`}
                    onClick={() => navigateTo("hotspots", "#hotspots")}
                    data-testid="tab-btn-hotspots"
                  >
                    <span className="panel-item-icon">🔥</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Điểm nóng & Dự báo</span>
                      <span className="panel-item-desc">Dự báo ô nhiễm 7 ngày & chuỗi thời gian</span>
                    </div>
                    {activeTab === "hotspots" && <span className="active-indicator">●</span>}
                  </button>
                )}

                {hasRiskDashboardAccess && (
                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "risk-dashboard" ? "active" : ""}`}
                    onClick={() => navigateTo("risk-dashboard", "#risk-dashboard")}
                    data-testid="tab-btn-risk-dashboard"
                  >
                    <span className="panel-item-icon">🏙️</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Rủi ro đô thị</span>
                      <span className="panel-item-desc">Phân tích đa tiêu chí rủi ro toàn thành phố</span>
                    </div>
                    {activeTab === "risk-dashboard" && <span className="active-indicator">●</span>}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* NHÓM 2: TÁC NGHIỆP & AI (Chỉ hiện khi có ít nhất 1 quyền tác nghiệp) */}
          {(hasDispatchAccess || hasPenaltyReportsAccess || hasTriageAccess || hasDedupAccess || hasIncidentMgmtAccess) && (
            <div className="nav-dropdown-wrapper">
              <button
                type="button"
                className={`nav-group-btn ${isOpsActive ? "active" : ""} ${openDropdown === "ops" ? "dropdown-open" : ""}`}
                onClick={() => setOpenDropdown((prev) => (prev === "ops" ? null : "ops"))}
                aria-expanded={openDropdown === "ops"}
              >
                <span className="nav-icon">🚨</span>
                <span className="nav-label">Tác nghiệp & AI</span>
                <span className="dropdown-caret">{openDropdown === "ops" ? "▴" : "▾"}</span>
              </button>

              {openDropdown === "ops" && (
                <div className={`nav-menu-panel ${isDarkMode ? "dark-mode" : ""}`} role="menu">
                  <div className="panel-section-title">ĐIỀU HÀNH & HIỆN TRƯỜNG</div>

                  {hasIncidentMgmtAccess && (
                    <button
                      type="button"
                      className={`panel-item-btn btn-incidents-nav ${activeTab === "incidents" ? "active" : ""}`}
                      onClick={() => navigateTo("incidents", "#incidents")}
                      data-testid="tab-btn-incidents"
                    >
                      <span className="panel-item-icon">📋</span>
                      <div className="panel-item-content">
                        <span className="panel-item-title">Quản lý sự cố</span>
                        <span className="panel-item-desc">Tiếp nhận & duyệt phản ánh sự cố môi trường</span>
                      </div>
                      {activeTab === "incidents" && <span className="active-indicator">●</span>}
                    </button>
                  )}

                  {hasDispatchAccess && (
                    <button
                      type="button"
                      className={`panel-item-btn ${activeTab === "dispatch" ? "active" : ""}`}
                      onClick={() => navigateTo("dispatch", "#dispatch")}
                      data-testid="tab-btn-dispatch"
                    >
                      <span className="panel-item-icon">🚨</span>
                      <div className="panel-item-content">
                        <span className="panel-item-title">Điều phối tác nghiệp</span>
                        <span className="panel-item-desc">Trung tâm điều phối & phân công hiện trường</span>
                      </div>
                      {activeTab === "dispatch" && <span className="active-indicator">●</span>}
                    </button>
                  )}

                  {hasPenaltyReportsAccess && (
                    <button
                      type="button"
                      className={`panel-item-btn ${activeTab === "penalty-reports" ? "active" : ""}`}
                      onClick={() => navigateTo("penalty-reports", "#penalty-reports")}
                      data-testid="tab-btn-penalty-reports"
                    >
                      <span className="panel-item-icon">📢</span>
                      <div className="panel-item-content">
                        <span className="panel-item-title">Quản lý vi phạm</span>
                        <span className="panel-item-desc">Giám sát & xử lý phản ánh từ công dân</span>
                      </div>
                      {activeTab === "penalty-reports" && <span className="active-indicator">●</span>}
                    </button>
                  )}

                  {hasTriageAccess && (
                    <button
                      type="button"
                      className={`panel-item-btn ${activeTab === "triage" ? "active" : ""}`}
                      onClick={() => navigateTo("triage", "#triage")}
                    >
                      <span className="panel-item-icon">🤖</span>
                      <div className="panel-item-content">
                        <span className="panel-item-title">Thẩm định AI & GIS</span>
                        <span className="panel-item-desc">AI đánh giá & phân loại tự động</span>
                      </div>
                      {activeTab === "triage" && <span className="active-indicator">●</span>}
                    </button>
                  )}

                  {hasDedupAccess && (
                    <button
                      type="button"
                      className={`panel-item-btn ${activeTab === "dedup" ? "active" : ""}`}
                      onClick={() => navigateTo("dedup", "#dedup")}
                    >
                      <span className="panel-item-icon">📑</span>
                      <div className="panel-item-content">
                        <span className="panel-item-title">Báo cáo trùng lặp (AI)</span>
                        <span className="panel-item-desc">AI gom cụm sự cố trùng lặp trên bản đồ</span>
                      </div>
                      {activeTab === "dedup" && <span className="active-indicator">●</span>}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* NHÓM 3: CỘNG ĐỒNG */}
          {currentUser && (
            <div className="nav-dropdown-wrapper">
              <button
                type="button"
                className={`nav-group-btn ${isCommunityActive ? "active" : ""} ${openDropdown === "community" ? "dropdown-open" : ""}`}
                onClick={() => setOpenDropdown((prev) => (prev === "community" ? null : "community"))}
                aria-expanded={openDropdown === "community"}
              >
                <span className="nav-icon">🌱</span>
                <span className="nav-label">Cộng đồng</span>
                <span className="dropdown-caret">{openDropdown === "community" ? "▴" : "▾"}</span>
              </button>

              {openDropdown === "community" && (
                <div className={`nav-menu-panel ${isDarkMode ? "dark-mode" : ""}`} role="menu">
                  <div className="panel-section-title">KẾT NỐI & TƯƠNG TÁC</div>

                  <button
                    type="button"
                    className={`panel-item-btn btn-report-nav ${activeTab === "report" ? "active" : ""}`}
                    onClick={() => {
                      if (!checkIsLoggedIn()) {
                        setAuthRedirectUrl("/report");
                        navigateTo("auth", "#login");
                      } else {
                        navigateTo("report", "#report");
                      }
                    }}
                    data-testid="tab-btn-report"
                  >
                    <span className="panel-item-icon">📢</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Gửi phản ánh sự cố</span>
                      <span className="panel-item-desc">Báo cáo ô nhiễm & sự cố môi trường kèm ảnh/video</span>
                    </div>
                    {activeTab === "report" && <span className="active-indicator">●</span>}
                  </button>

                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "posts" ? "active" : ""}`}
                    onClick={() => navigateTo("posts", "#create-post")}
                  >
                    <span className="panel-item-icon">✍️</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Đăng bài & Phản ánh</span>
                      <span className="panel-item-desc">Phản ánh sự cố & chia sẻ kinh nghiệm sống xanh</span>
                    </div>
                    {activeTab === "posts" && <span className="active-indicator">●</span>}
                  </button>

                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "friends" ? "active" : ""}`}
                    onClick={() => navigateTo("friends", "#friends")}
                  >
                    <span className="panel-item-icon">🤝</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Bạn bè & Kết nối</span>
                      <span className="panel-item-desc">Kết bạn và theo dõi công dân xanh</span>
                    </div>
                    {activeTab === "friends" && <span className="active-indicator">●</span>}
                  </button>

                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "voice" ? "active" : ""}`}
                    onClick={() => navigateTo("voice", "#voice")}
                  >
                    <span className="panel-item-icon">🎙️</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Trợ lý Giọng nói</span>
                      <span className="panel-item-desc">Trợ lý ảo rảnh tay Hands-free</span>
                    </div>
                    {activeTab === "voice" && <span className="active-indicator">●</span>}
                  </button>

                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "safety-check" ? "active" : ""}`}
                    onClick={() => navigateTo("safety-check", "#safety-check")}
                  >
                    <span className="panel-item-icon">🛡️</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Báo an toàn (Safety Check)</span>
                      <span className="panel-item-desc">Báo an toàn thiên tai cho bạn bè & người thân</span>
                    </div>
                    {activeTab === "safety-check" && <span className="active-indicator">●</span>}
                  </button>

                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "flood-sos" ? "active" : ""}`}
                    onClick={() => navigateTo("flood-sos", "#flood-sos")}
                    data-testid="tab-btn-flood-sos-menu"
                  >
                    <span className="panel-item-icon">🆘</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Cứu hộ ngập lụt (Flood SOS)</span>
                      <span className="panel-item-desc">Phát tín hiệu cứu hộ & mạng lưới cứu nạn cộng đồng</span>
                    </div>
                    {activeTab === "flood-sos" && <span className="active-indicator">●</span>}
                  </button>

                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "incident-export" ? "active" : ""}`}
                    onClick={() => navigateTo("incident-export", "#incident-export")}
                    data-testid="tab-btn-incident-export-menu"
                  >
                    <span className="panel-item-icon">📊</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Xuất dữ liệu sự cố (Excel/PDF)</span>
                      <span className="panel-item-desc">Trích xuất danh sách sự cố theo bộ lọc </span>
                    </div>
                    {activeTab === "incident-export" && <span className="active-indicator">●</span>}
                  </button>

                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "admin-dashboard" ? "active" : ""}`}
                    onClick={() => navigateTo("admin-dashboard", "#admin-dashboard")}
                    data-testid="tab-btn-admin-dashboard-menu"
                  >
                    <span className="panel-item-icon">📈</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Thống kê hoạt động hệ thống</span>
                      <span className="panel-item-desc">KPIs người dùng mới, bài đăng, nhóm theo ngày</span>
                    </div>
                    {activeTab === "admin-dashboard" && <span className="active-indicator">●</span>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* NHÓM 4: TRA CỨU XỬ PHẠT (Nút trực tiếp) */}
          <button
            type="button"
            className={`nav-group-btn single-btn ${isPenaltiesActive ? "active" : ""}`}
            onClick={() => navigateTo("penalties", "#penalties")}
            title="Tra cứu quy định xử phạt vi phạm hành chính (Nghị định 45/2022/NĐ-CP)"
          >
            <span className="nav-icon">⚖️</span>
            <span className="nav-label">Tra cứu xử phạt</span>
          </button>
        </nav>

        {/* KHỐI PHẢI: TIỆN ÍCH & TÀI KHOẢN */}
        <div className="header-right-actions">
          {/* Nút Cứu hộ khẩn cấp Flood SOS (Nổi bật, trực tiếp cho người dân vùng ngập) */}
          <button
            type="button"
            className={`quick-sos-btn ${activeTab === "flood-sos" ? "active" : ""}`}
            onClick={() => navigateTo("flood-sos", "#flood-sos")}
            title="Cứu hộ ngập lụt khẩn cấp (Flood SOS)"
            data-testid="btn-topbar-flood-sos"
          >
            <span className="sos-pulse-icon">🆘</span>
            <span className="quick-sos-label">Cứu hộ ngập lụt</span>
          </button>

          {/* Nút gửi phản ánh nhanh nổi bật (Quick CTA) */}
          <button
            type="button"
            className={`quick-report-btn ${activeTab === "report" ? "active" : ""}`}
            onClick={() => {
              if (!checkIsLoggedIn()) {
                setAuthRedirectUrl("/report");
                navigateTo("auth", "#login");
              } else {
                navigateTo("report", "#report");
              }
            }}
            title="Gửi phản ánh sự cố môi trường"
          >
            <span>📢</span>
            <span className="quick-report-label">Gửi phản ánh</span>
          </button>

          {/* Nút đổi Theme Sáng / Tối */}
          <button
            type="button"
            className="header-icon-btn"
            onClick={handleToggleTheme}
            title={isDarkMode ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
            aria-label="Chuyển chế độ giao diện sáng tối"
          >
            <span>{isDarkMode ? "☀️" : "🌙"}</span>
          </button>

          {/* Nút trạng thái Microservice Backend API */}
          <div className="api-status-wrapper">
            <button
              type="button"
              className={`header-api-btn ${backendStatus?.startsWith("Online") ? "online" : "offline"}`}
              onClick={() => {
                setShowDrawer((prev) => !prev);
                if (!backendStatus) checkHealth();
              }}
              title="Kiểm tra trạng thái Backend FastAPI"
            >
              <span className={`dot ${backendStatus?.startsWith("Online") ? "online" : "offline"}`} />
              <span className="api-btn-text">API Service</span>
            </button>


            {showDrawer && (
              <div className={`health-popover ${isDarkMode ? "dark-mode" : ""}`}>
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

          {/* Tài khoản Người dùng / Đăng nhập */}
          {currentUser ? (
            <div className="header-user-wrapper">
              <button
                type="button"
                className={`header-user-btn ${openDropdown === "user" ? "menu-open" : ""}`}
                onClick={() => setOpenDropdown((prev) => (prev === "user" ? null : "user"))}
                aria-expanded={openDropdown === "user"}
                title="Tài khoản công dân số"
              >
                <span className="header-avatar-circle">👤</span>
                <span className="header-user-name">{currentUser.full_name || "Công dân"}</span>
                <span className="user-status-dot" title="Đang hoạt động">🟢</span>
                <span className="dropdown-caret">{openDropdown === "user" ? "▴" : "▾"}</span>
              </button>

              {openDropdown === "user" && (
                <div className={`user-nav-dropdown header-user-dropdown ${isDarkMode ? "dark-mode" : ""}`} role="menu">
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
                    onClick={() => navigateTo("profile", "#profile")}
                  >
                    <span className="action-icon">🌿</span>
                    <span>Trang cá nhân & Green Passport</span>
                  </button>

                  {hasIncidentMgmtAccess && (
                    <button
                      type="button"
                      className="dropdown-menu-action"
                      onClick={() => navigateTo("incidents", "#incidents")}
                    >
                      <span className="action-icon">📋</span>
                      <span>Quản lý sự cố môi trường</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("rewards", "#wallet")}
                  >
                    <span className="action-icon">💳</span>
                    <span>Ví Điểm Thưởng & Danh Hiệu</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("challenges", "#challenges")}
                  >
                    <span className="action-icon">🎯</span>
                    <span>Thử Thách Xanh Trong Tuần</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("handbook", "#handbook")}
                  >
                    <span className="action-icon">📖</span>
                    <span>Cẩm Nang Phân Loại Rác</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("leaderboard", "#leaderboard")}
                  >
                    <span className="action-icon">🏆</span>
                    <span>Bảng Xếp Hạng Công Dân Xanh</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("heatmap", "#heatmap")}
                  >
                    <span className="action-icon">🛰️</span>
                    <span>Bản Đồ Nhiệt Môi Trường (GIS)</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("qr-scan", "#qr-scan")}
                  >
                    <span className="action-icon">📷</span>
                    <span>Quét Mã QR Nhận Điểm</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("lucky-wheel", "#lucky-wheel")}
                  >
                    <span className="action-icon">🎡</span>
                    <span>Vòng Quay May Mắn Mỗi Ngày</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("milestone", "#milestone")}
                  >
                    <span className="action-icon">🏅</span>
                    <span>Lộ Trình Danh Hiệu</span>
                  </button>

                  {hasAuditAccess && (
                    <button
                      type="button"
                      className="dropdown-menu-action"
                      onClick={() => navigateTo("audit-logs", "#audit-logs")}
                    >
                      <span className="action-icon">📜</span>
                      <span>Nhật Ký Kiểm Toán (Audit Log)</span>
                    </button>
                  )}


                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => {
                      setAuthRedirectUrl("/devices");
                      navigateTo("auth", "#devices");
                    }}
                  >
                    <span className="action-icon">💻</span>
                    <span>Quản lý thiết bị & Phiên</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("settings", "#settings")}
                  >
                    <span className="action-icon">⚙️</span>
                    <span>Cài đặt tài khoản</span>
                  </button>

                  {(currentUser?.role === "ADMIN" || hasUserMgmtAccess || hasRbacAccess) && (
                    <>
                      <div className="dropdown-separator" />
                      <div className="panel-section-title" style={{ padding: "4px 8px" }}>QUẢN TRỊ HỆ THỐNG</div>

                      {hasUserMgmtAccess && (
                        <button
                          type="button"
                          className="dropdown-menu-action"
                          onClick={() => navigateTo("users", "#users")}
                        >
                          <span className="action-icon">👥</span>
                          <span>Quản lý người dùng</span>
                        </button>
                      )}

                      {hasRbacAccess && (
                        <button
                          type="button"
                          className="dropdown-menu-action"
                          onClick={() => navigateTo("rbac", "#rbac")}
                        >
                          <span className="action-icon">🛡️</span>
                          <span>Phân quyền vai trò RBAC</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="dropdown-menu-action"
                        onClick={() => navigateTo("emergency-alert", "#emergency-alert")}
                      >
                        <span className="action-icon">🚨</span>
                        <span>Phát lệnh cảnh báo khẩn cấp (PCTT)</span>
                      </button>

                      <button
                        type="button"
                        className="dropdown-menu-action"
                        onClick={() => navigateTo("flood-sos", "#flood-sos")}
                      >
                        <span className="action-icon">🆘</span>
                        <span>Cứu hộ ngập lụt (Flood SOS)</span>
                      </button>
                    </>
                  )}

                  <div className="dropdown-separator" />

                  <button
                    type="button"
                    className="dropdown-menu-action logout-action"
                    onClick={() => {
                      setOpenDropdown(null);
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
              className="header-login-btn"
              onClick={() => {
                setAuthRedirectUrl(undefined);
                navigateTo("auth");
              }}
              title="Đăng nhập hoặc đăng ký tài khoản công dân"
            >
              <span>🌱</span>
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </header>

      {/* KHUNG NỘI DUNG CHÍNH (BÊN DƯỚI TOP HEADER) */}
      <main className="app-main-viewport">
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
              onLoginSuccess={handleLoginSuccess}
              onExitAuth={handleExitAuth}
            />
          </div>
        ) : activeTab === "report" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#090d16" }}>
            <ReportContainer
              onNavigateTab={(tab) => {
                setActiveTab(tab as TabType);
                window.location.hash = `#${tab}`;
              }}
              onRequireLogin={(redirectUrl) => {
                setAuthRedirectUrl(redirectUrl);
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "incidents" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#0b1120" }}>
            <IncidentManagementContainer
              onNavigateToMap={(_lat, _lng) => {
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
                sessionStorage.setItem("greenspot_target_hash", "#rbac");
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
                sessionStorage.setItem("greenspot_target_hash", "#users");
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
        ) : activeTab === "rewards" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <RewardsContainer
              onBackToHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateToAuth={() => {
                const currentH = window.location.hash || "#wallet";
                sessionStorage.setItem("greenspot_target_hash", currentH);
                setAuthRedirectUrl(currentH);
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "challenges" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <WeeklyChallengesContainer
              onBackToHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateToAuth={() => {
                sessionStorage.setItem("greenspot_target_hash", "#challenges");
                setAuthRedirectUrl("/challenges");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
              onNavigateToWallet={() => {
                setActiveTab("rewards");
                window.location.hash = "#wallet";
              }}
            />
          </div>
        ) : activeTab === "audit-logs" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <AuditLogContainer
              onBackToHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateToAuth={() => {
                sessionStorage.setItem("greenspot_target_hash", "#audit-logs");
                setAuthRedirectUrl("/audit-logs");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "handbook" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <WasteHandbookContainer
              onBackToHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateToMap={(_facilityType) => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </div>
        ) : activeTab === "leaderboard" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <LeaderboardContainer
              onNavigateLogin={() => {
                sessionStorage.setItem("greenspot_target_hash", "#leaderboard");
                setAuthRedirectUrl("/leaderboard");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
              onNavigateHeatmap={(_districtCode) => {
                setActiveTab("heatmap");
                window.location.hash = "#heatmap";
              }}
            />
          </div>
        ) : activeTab === "heatmap" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#0b0f19" }}>
            <MultiModeHeatmapContainer
              onNavigateDistrictReport={(_districtCode) => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </div>
        ) : activeTab === "qr-scan" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <QRScanContainer
              onBackToHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateWallet={() => {
                setActiveTab("rewards");
                window.location.hash = "#wallet";
              }}
              onNavigateLogin={() => {
                sessionStorage.setItem("greenspot_target_hash", "#qr-scan");
                setAuthRedirectUrl("/qr-scan");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "lucky-wheel" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <LuckyWheelContainer
              onBackToHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateLogin={() => {
                sessionStorage.setItem("greenspot_target_hash", "#lucky-wheel");
                setAuthRedirectUrl("/lucky-wheel");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "milestone" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <MilestoneContainer
              onBackToHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateLogin={() => {
                sessionStorage.setItem("greenspot_target_hash", "#milestone");
                setAuthRedirectUrl("/milestone");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "triage" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <TriageAppDashboard />
          </div>
        ) : activeTab === "navigation" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <FloodNavigationContainer />
          </div>
        ) : activeTab === "risk-dashboard" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/risk-dashboard"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
              <RiskDashboardContainer
                currentUser={currentUser}
                onBackToHome={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
                onNavigateToMap={(lat, lng, districtName) => {
                  setActiveTab("map");
                  window.location.hash = `#map?lat=${lat}&lng=${lng}&district=${encodeURIComponent(districtName)}`;
                }}
              />
            </div>
          )
        ) : activeTab === "dispatch" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/dispatch"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
              <DispatchContainer />
            </div>
          )
        ) : activeTab === "hotspots" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/hotspots"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
              <HotspotContainer
                currentUser={currentUser}
                onNavigateToDispatch={(prefill, activeOrderId) => {
                  if (activeOrderId) {
                    setActiveTab("dispatch");
                    window.location.hash = `#dispatch?order_id=${encodeURIComponent(activeOrderId)}`;
                  } else {
                    if (prefill) {
                      try {
                        localStorage.setItem("greenspot_prefill_dispatch", JSON.stringify(prefill));
                      } catch {
                        // Ignored
                      }
                    }
                    setActiveTab("dispatch");
                    window.location.hash = "#dispatch?action=create";
                  }
                }}
              />
            </div>
          )
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
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/voice"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <VoiceAssistant
                onClose={() => {
                  navigateTo("map");
                }}
                onNavigateToFeature={(target, payload) => {
                  if (target === "dashboard_aqi") {
                    navigateTo("dashboard");
                  } else if (target === "map_flood" || target === "navigation") {
                    if (payload) {
                      try {
                        localStorage.setItem("greenspot_nav_destination", JSON.stringify(payload));
                      } catch { }
                    }
                    navigateTo("navigation");
                  } else if (target === "dispatch" || target === "operations_dispatch") {
                    navigateTo("dispatch");
                  } else if (target === "risk_dashboard" || target === "urban_risk") {
                    navigateTo("risk-dashboard");
                  } else if (target === "hotspots") {
                    navigateTo("hotspots");
                  } else if (target === "dedup") {
                    navigateTo("dedup");
                  } else if (target === "flood_sos" || target === "sos") {
                    navigateTo("flood-sos");
                  } else if (target === "incident_export" || target === "export") {
                    navigateTo("incident-export");
                  } else if (target === "admin_dashboard" || target === "stats" || target === "system_activity") {
                    navigateTo("admin-dashboard");
                  } else if (target === "/report-incident") {
                    navigateTo("triage");
                  } else if (target === "/wallet") {
                    navigateTo("profile");
                  } else {
                    navigateTo("map");
                  }
                }}
              />
            </div>
          )
        ) : activeTab === "penalty-reports" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
            <ModulePermissionGuard
              moduleCode="CITIZEN_FEEDBACK"
              moduleName="Quản lý Phản ánh Vi phạm Môi trường"
            >
              <PenaltyReportsDashboard
                currentUser={currentUser}
                onBackToPenalties={() => {
                  setActiveTab("penalties");
                  window.location.hash = "#penalties";
                }}
              />
            </ModulePermissionGuard>
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
                setActiveTab("report");
                window.location.hash = "#report";
              }}
            />
          </div>
        ) : activeTab === "posts" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/posts"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <PostCreatorContainer
                onNavigateHome={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
                onNavigateLogin={() => {
                  setAuthRedirectUrl("/posts");
                  setActiveTab("auth");
                  window.location.hash = "#login";
                }}
                onViewCreatedPost={(_postId) => {
                  setActiveTab("profile");
                  window.location.hash = "#profile";
                }}
              />
            </div>
          )
        ) : activeTab === "emergency-alert" || activeTab === "safety-check" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <EmergencyAlertContainer
              initialView={activeTab === "safety-check" ? "SAFETY_CHECK" : "CONSOLE"}
              currentUser={currentUser}
              onNavigateHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
              onNavigateFeed={() => {
                setActiveTab("posts");
                window.location.hash = "#create-post";
              }}
              onNavigateSafeRoute={() => {
                setActiveTab("navigation");
                window.location.hash = "#navigation";
              }}
            />
          </div>
        ) : activeTab === "flood-sos" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <FloodSosContainer />
          </div>
        ) : activeTab === "incident-export" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <IncidentExportContainer />
          </div>
        ) : activeTab === "admin-dashboard" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <AdminDashboardContainer
              onNavigateHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </div>
        ) : (
          <ModulePermissionGuard
            moduleCode="GIS_MAP"
            moduleName="Bản đồ số WebGIS"
          >
            <EcoMap />
          </ModulePermissionGuard>
        )}
      </main>

      {/* NÚT TRỢ LÝ GIỌNG NÓI NHANH NỔI (CHỈ HIỂN THỊ KHI ĐÃ ĐĂNG NHẬP VÀ KHÔNG Ở TAB VOICE) */}
      {currentUser && activeTab !== "voice" && (
        <button
          type="button"
          className="floating-voice-quick-btn"
          onClick={() => {
            setActiveTab("voice");
            window.location.hash = "#voice";
          }}
          title="Bật Trợ lý giọng nói rảnh tay"
          aria-label="Trợ lý giọng nói"
        >
          <span className="floating-mic-icon">🎙️</span>
          <span className="floating-mic-label">Trợ lý ảo</span>
        </button>
      )}
    </div>
  );
}

export default App;
