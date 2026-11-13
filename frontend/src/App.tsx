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
import { ReportContainer, DeduplicationDashboard } from "./features/reports";
import { IncidentManagementContainer } from "./features/incident_management";
import { WasteCategoryContainer } from "./features/waste_categories";
import { RecyclingFacilityContainer } from "./features/recycling_facilities";
import { FriendsContainer } from "./features/friends";
import { PenaltyLookupContainer, PenaltyReportsDashboard } from "./features/penalties";
import { FeedContainer } from "./features/feed";
import { ChatContainer } from "./features/chat";
import { chatSocket, playChatNotificationChime } from "./features/chat/services/chatSocket";
import { chatService } from "./features/chat/services/chatService";
import { GroupsContainer } from "./features/groups/GroupsContainer";
import { TriageAppDashboard } from "./features/triage";
import { FloodNavigationContainer } from "./features/navigation";
import { RiskDashboardContainer } from "./features/risk_dashboard";
import { DispatchContainer } from "./features/dispatch";
import { HotspotContainer } from "./features/hotspots";
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
import { AiAssistantWidget, AiAssistantPage } from "./features/ai_assistant";
import { EventsPage } from "./features/events";
import { FundraiserContainer } from "./features/fundraiser";
import { EmergencyAlertContainer } from "./features/emergency_alert";
import { FloodSosContainer } from "./features/flood_sos";
import { IncidentExportContainer } from "./features/incident_export";
import { AdminDashboardContainer } from "./features/admin_dashboard";
import { RewardsContainer } from "./features/rewards";
import { WeeklyChallengesContainer } from "./features/challenges/WeeklyChallengesContainer";
import { AuditLogContainer } from "./features/audit_logs/AuditLogContainer";
import { WasteHandbookContainer } from "./features/waste_handbook/WasteHandbookContainer";
import { LeaderboardContainer } from "./features/leaderboard/LeaderboardContainer";
import { MultiModeHeatmapContainer } from "./features/heatmap/MultiModeHeatmapContainer";
import { QRScanContainer } from "./features/qr_scan/QRScanContainer";
import { LuckyWheelContainer } from "./features/lucky_wheel/LuckyWheelContainer";
import { MilestoneContainer } from "./features/milestone/MilestoneContainer";
import { ConnectionBanner } from "./features/offline/components/ConnectionBanner";
import { SyncResultModal } from "./features/offline/components/SyncResultModal";
import { OfflineOutboxPage } from "./features/offline/pages/OfflineOutboxPage";
import { initSyncEngineListeners, syncOutboxQueue } from "./features/offline/services/syncEngine";
import type { SyncResultSummary } from "./features/offline/types/offline.types";
import { navigateToRoute, resolveTabFromUrl, APP_ROUTES } from "./routes/appRoutes";
import type { ActiveTab } from "./routes/appRoutes";
import { useLanguage } from "./i18n";

import api from "./api/client";
import "./App.css";

export type { ActiveTab };
export type TabType = ActiveTab;

// Hàm kiểm tra trạng thái đăng nhập thực tế của phiên hiện tại
const checkIsLoggedIn = (): boolean => {
  try {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) || localStorage.getItem("greenspot_token");
    return Boolean(token);
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
    // Guest Guard: Nếu đã đăng nhập mà vào route "auth" (trừ trường hợp xem thiết bị đăng nhập) -> chuyển về Bảng tin / Bản đồ
    if (resolved === "auth" && isLogged) {
      const isDevices = window.location.pathname === "/devices" || window.location.hash === "#devices";
      if (!isDevices) {
        return "map";
      }
    }
    return resolved;
  });

  const [chatTargetUserId, setChatTargetUserId] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]target=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const [chatConversationId, setChatConversationId] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&](?:conv|conversation_id)=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const [globalUnreadChatCount, setGlobalUnreadChatCount] = useState<number>(0);
  const [profileTargetUserId, setProfileTargetUserId] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&](?:id|userId|user_id)=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);
  const { currentLang, toggleLanguage, t } = useLanguage();

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
    currentUser?.role === "RESPONDER" ||
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
    canAccess("DISPATCH_TASKS") ||
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

  const [openDropdown, setOpenDropdown] = useState<"geo" | "ops" | "community" | "rewards" | "user" | null>(null);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResultSummary | null>(null);

  // STT 19: Bộ tự động đồng bộ hàng đợi ngoại tuyến khi có mạng
  useEffect(() => {
    const cleanupSyncListeners = initSyncEngineListeners();
    const handleSyncFinished = (e: any) => {
      if (e.detail) {
        setSyncResult(e.detail);
      }
    };
    window.addEventListener("greenspot_sync_completed", handleSyncFinished);
    return () => {
      cleanupSyncListeners();
      window.removeEventListener("greenspot_sync_completed", handleSyncFinished);
    };
  }, []);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [editingQueueItem, setEditingQueueItem] = useState<any | null>(null);
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

  const navigateTo = (tab: ActiveTab, hash?: string) => {
    setActiveTab(tab);
    try {
      navigateToRoute(tab);
    } catch {
      // ignore
    }
    if (hash) window.location.hash = hash;
    setOpenDropdown(null);
    setShowDrawer(false);
  };

  const isGeoActive = [
    "map",
    "dashboard",
    "navigation",
    "hotspots",
    "risk-dashboard",
    "heatmap",
  ].includes(activeTab);
  const isOpsActive = [
    "dispatch",
    "penalty-reports",
    "triage",
    "dedup",
    "report",
    "incidents",
    "waste_categories",
    "recycling_facilities",
    "incident-export",
    "emergency-alert",
  ].includes(activeTab);
  const isCommunityActive = [
    "posts",
    "groups",
    "messages",
    "friends",
    "voice",
    "ai-assistant",
    "events",
    "fundraiser",
    "safety-check",
  ].includes(activeTab);
  const isRewardsActive = [
    "rewards",
    "challenges",
    "handbook",
    "leaderboard",
    "qr-scan",
    "lucky-wheel",
    "milestone",
  ].includes(activeTab);
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
      // 1. Phân tích tham số chat và profile nếu có trong hash hoặc pathname
      const hash = window.location.hash;
      const targetMatch = hash.match(/[?&]target=([^&]+)/);
      if (targetMatch) {
        setChatTargetUserId(decodeURIComponent(targetMatch[1]));
      }
      const convMatch = hash.match(/[?&](?:conv|conversation_id)=([^&]+)/);
      if (convMatch) {
        setChatConversationId(decodeURIComponent(convMatch[1]));
      }
      const profileMatch = hash.match(/[?&](?:id|userId|user_id)=([^&]+)/);
      if (profileMatch) {
        setProfileTargetUserId(decodeURIComponent(profileMatch[1]));
      }

      // 2. Phân tích route chuẩn
      const resolved = resolveTabFromUrl(window.location.pathname, window.location.hash);
      const isLogged = checkIsLoggedIn();
      const route = APP_ROUTES[resolved];

      if (route && route.requiresAuth && !isLogged) {
        setAuthRedirectUrl(route.path);
        setActiveTab("auth");
        navigateToRoute("auth", undefined, true);
        return;
      }

      // Guest Guard: Nếu đã đăng nhập mà vào route "auth" (trừ /devices hoặc #devices) -> tự động chuyển về trang chính
      if (resolved === "auth" && isLogged) {
        const isDevices = window.location.pathname === "/devices" || window.location.hash === "#devices";
        if (!isDevices) {
          setActiveTab("map");
          navigateToRoute("map", undefined, true);
          return;
        }
      }

      setActiveTab(resolved);
      if (resolved === "messages") {
        setGlobalUnreadChatCount(0);
      }

      // Nếu người dùng vào bằng hash cũ (VD: #admin-dashboard), tự động chuẩn hóa URL đẹp
      if (window.location.hash && window.location.hash.startsWith("#")) {
        navigateToRoute(resolved, undefined, true);
      }
    };

    // Chuẩn hóa URL ngay khi mount nếu có hash hoặc nếu đã đăng nhập mà đang ở trang auth
    const initialTab = resolveTabFromUrl(window.location.pathname, window.location.hash);
    const isLoggedInit = checkIsLoggedIn();
    if (initialTab === "auth" && isLoggedInit) {
      const isDevices = window.location.pathname === "/devices" || window.location.hash === "#devices";
      if (!isDevices) {
        setActiveTab("map");
        navigateToRoute("map", undefined, true);
      }
    } else if (window.location.hash && window.location.hash.startsWith("#")) {
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
    setAuthRedirectUrl(redirectUrl);
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO);
    delete api.defaults.headers.common.Authorization;
    chatSocket.disconnect();
    setGlobalUnreadChatCount(0);
    resetSessionExpired();
    window.dispatchEvent(new Event("auth_change"));
    setActiveTab("auth");
  };

  // Đồng bộ tổng số tin nhắn chưa đọc từ server khi đăng nhập hoặc khởi động lại trang
  useEffect(() => {
    if (!currentUser) {
      setGlobalUnreadChatCount(0);
      return;
    }
    chatService.getTotalUnreadCount().then((count) => {
      setGlobalUnreadChatCount(count);
    });
  }, [currentUser]);

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
      localStorage.removeItem("greenspot_incident_draft_v1");
      if (currentUser?.user_id) {
        localStorage.removeItem(`greenspot_incident_draft_${currentUser.user_id}`);
      }
      delete api.defaults.headers.common.Authorization;
      chatSocket.disconnect();
      setGlobalUnreadChatCount(0);
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

  // KẾT NỐI WEBSOCKET CHAT TOÀN CỤC & THÔNG BÁO TỨC THỜI (CHUẨN DOANH NGHIỆP)
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    const isLogged = checkIsLoggedIn();
    if (!isLogged || !currentUser) return;

    chatSocket.connect();

    // Lắng nghe tin nhắn mới để cập nhật badge thông báo và phát âm thanh
    const unbindMsg = chatSocket.on("NEW_MESSAGE", (msg: any) => {
      const myId = String(currentUser?.user_id || currentUser?.id || "");
      if (msg && msg.sender_id !== myId) {
        if (activeTabRef.current !== "messages") {
          setGlobalUnreadChatCount((prev) => prev + 1);
          playChatNotificationChime();
        }
      }
    });

    return () => {
      unbindMsg();
    };
  }, [currentUser]);

  return (
    <div className="app-container">
      {/* POPUP PHIÊN ĐÃ HẾT HẠN (MÀN 4 - SINGLETON MODAL ĐÈ LÊN MỌI MÀN HÌNH) */}
      <SessionExpiredModal
        isOpen={sessionExpiredOpen}
        onRelogin={handleRelogin}
      />

      {/* THANH THÔNG BÁO MẠNG TOÀN CỤC (STT 19 - R01, R02) */}
      <ConnectionBanner
        onOpenOutbox={() => {
          setActiveTab("outbox" as TabType);
          window.location.hash = "#outbox";
        }}
      />

      {/* MODAL KẾT QUẢ ĐỒNG BỘ NGOẠI TUYẾN TOÀN CỤC (STT 19 - R20, R21, R22) */}
      <SyncResultModal
        result={syncResult}
        onClose={() => setSyncResult(null)}
        onRetryAllFailed={() => syncOutboxQueue({ retryFailed: true })}
        onOpenOutbox={() => {
          setActiveTab("outbox" as TabType);
          window.location.hash = "#outbox";
        }}
        onViewIncidentDetail={(_id, _code) => {
          setActiveTab("map" as TabType);
          window.location.hash = "#map";
        }}
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
                )}                {hasAqiAccess && (
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

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "heatmap" ? "active" : ""}`}
                  onClick={() => navigateTo("heatmap", "#heatmap")}
                  data-testid="tab-btn-heatmap"
                >
                  <span className="panel-item-icon">🛰️</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Bản đồ nhiệt đa chế độ</span>
                    <span className="panel-item-desc">Nhiệt độ, độ ẩm & phân tích GIS chi tiết</span>
                  </div>
                  {activeTab === "heatmap" && <span className="active-indicator">●</span>}
                </button>
              </div>
            )}
          </div>
          {/* NHÓM 2: TÁC NGHIỆP & AI (Chỉ hiện khi có ít nhất 1 quyền tác nghiệp) */}
          {(hasDispatchAccess || hasPenaltyReportsAccess || hasTriageAccess || hasDedupAccess || hasIncidentMgmtAccess || currentUser?.role === "ADMIN") && (
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

                  {hasIncidentMgmtAccess && (
                    <button
                      type="button"
                      className={`panel-item-btn ${activeTab === "incidents" ? "active" : ""}`}
                      onClick={() => navigateTo("incidents", "#incidents")}
                    >
                      <span className="panel-item-icon">📋</span>
                      <div className="panel-item-content">
                        <span className="panel-item-title">Quản lý sự cố môi trường</span>
                        <span className="panel-item-desc">Kiểm duyệt & xử lý sự cố địa bàn</span>
                      </div>
                      {activeTab === "incidents" && <span className="active-indicator">●</span>}
                    </button>
                  )}

                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "report" ? "active" : ""}`}
                    onClick={() => {
                      if (!checkIsLoggedIn()) {
                        setAuthRedirectUrl("/report");
                        setActiveTab("auth");
                        window.location.hash = "#login";
                      } else {
                        navigateTo("report", "#report");
                      }
                    }}
                  >
                    <span className="panel-item-icon">📢</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Tiếp nhận phản ánh</span>
                      <span className="panel-item-desc">Gửi phản ánh sự cố môi trường đa phương tiện</span>
                    </div>
                    {activeTab === "report" && <span className="active-indicator">●</span>}
                  </button>

                  <button
                    type="button"
                    className={`panel-item-btn ${activeTab === "incident-export" ? "active" : ""}`}
                    onClick={() => navigateTo("incident-export", "#incident-export")}
                    data-testid="tab-btn-incident-export"
                  >
                    <span className="panel-item-icon">📊</span>
                    <div className="panel-item-content">
                      <span className="panel-item-title">Xuất dữ liệu sự cố (Excel/PDF)</span>
                      <span className="panel-item-desc">Trích xuất danh sách sự cố theo bộ lọc</span>
                    </div>
                    {activeTab === "incident-export" && <span className="active-indicator">●</span>}
                  </button>

                  {(currentUser?.role === "ADMIN" || currentUser?.role === "OFFICER" || currentUser?.role === "COORDINATOR") && (
                    <button
                      type="button"
                      className={`panel-item-btn ${activeTab === "emergency-alert" ? "active" : ""}`}
                      onClick={() => navigateTo("emergency-alert", "#emergency-alert")}
                      data-testid="tab-btn-emergency-alert"
                    >
                      <span className="panel-item-icon">🚨</span>
                      <div className="panel-item-content">
                        <span className="panel-item-title">Phát lệnh cảnh báo khẩn cấp</span>
                        <span className="panel-item-desc">Phát tin cảnh báo thiên tai theo Geofencing</span>
                      </div>
                      {activeTab === "emergency-alert" && <span className="active-indicator">●</span>}
                    </button>
                  )}

                  {currentUser?.role === "ADMIN" && (
                    <>
                      <button
                        type="button"
                        className={`panel-item-btn ${activeTab === "waste_categories" ? "active" : ""}`}
                        onClick={() => navigateTo("waste_categories", "#waste-categories")}
                      >
                        <span className="panel-item-icon">🗑️</span>
                        <div className="panel-item-content">
                          <span className="panel-item-title">Danh mục rác & Quy chuẩn SLA</span>
                          <span className="panel-item-desc">Cấu hình loại chất thải & hạn mức xử lý</span>
                        </div>
                        {activeTab === "waste_categories" && <span className="active-indicator">●</span>}
                      </button>

                      <button
                        type="button"
                        className={`panel-item-btn ${activeTab === "recycling_facilities" ? "active" : ""}`}
                        onClick={() => navigateTo("recycling_facilities", "#recycling-facilities")}
                      >
                        <span className="panel-item-icon">♻️</span>
                        <div className="panel-item-content">
                          <span className="panel-item-title">Trạm thu gom tái chế</span>
                          <span className="panel-item-desc">Mạng lưới trạm tái chế và điểm tiếp nhận</span>
                        </div>
                        {activeTab === "recycling_facilities" && <span className="active-indicator">●</span>}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* NHÓM 3: CỘNG ĐỒNG */}
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
                  className={`panel-item-btn ${activeTab === "posts" ? "active" : ""}`}
                  onClick={() => navigateTo("posts", "#posts")}
                >
                  <span className="panel-item-icon">🌐</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Bảng tin Mạng xã hội</span>
                    <span className="panel-item-desc">Geo-Feed tin tức môi trường & cộng đồng</span>
                  </div>
                  {activeTab === "posts" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "groups" ? "active" : ""}`}
                  onClick={() => {
                    if (!checkIsLoggedIn()) {
                      setAuthRedirectUrl("/groups");
                      setActiveTab("auth");
                      window.location.hash = "#login";
                    } else {
                      navigateTo("groups", "#groups");
                    }
                  }}
                  data-testid="nav-tab-groups"
                >
                  <span className="panel-item-icon">👥</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Nhóm cộng đồng</span>
                    <span className="panel-item-desc">Nhóm sống xanh theo quận, phường hoặc chủ đề</span>
                  </div>
                  {activeTab === "groups" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "messages" ? "active" : ""}`}
                  onClick={() => {
                    if (!checkIsLoggedIn()) {
                      setAuthRedirectUrl("/messages");
                      setActiveTab("auth");
                      window.location.hash = "#login";
                    } else {
                      setChatTargetUserId(null);
                      setChatConversationId(null);
                      navigateTo("messages", "#messages");
                      setGlobalUnreadChatCount(0);
                    }
                  }}
                >
                  <span className="panel-item-icon">💬</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">
                      Tin nhắn & Đoạn chat {globalUnreadChatCount > 0 ? `(${globalUnreadChatCount})` : ""}
                    </span>
                    <span className="panel-item-desc">Nhắn tin 1-1, chat nhóm & chat quận thời gian thực</span>
                  </div>
                  {activeTab === "messages" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "friends" ? "active" : ""}`}
                  onClick={() => {
                    if (!checkIsLoggedIn()) {
                      setAuthRedirectUrl("/friends");
                      setActiveTab("auth");
                      window.location.hash = "#login";
                    } else {
                      navigateTo("friends", "#friends");
                    }
                  }}
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
                  className={`panel-item-btn ${activeTab === "ai-assistant" ? "active" : ""}`}
                  onClick={() => {
                    if (!checkIsLoggedIn()) {
                      setAuthRedirectUrl("/ai-assistant");
                      setActiveTab("auth");
                      window.location.hash = "#login";
                    } else {
                      navigateTo("ai-assistant", "#ai-assistant");
                    }
                  }}
                  data-testid="nav-tab-ai-assistant"
                >
                  <span className="panel-item-icon">🤖</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Trợ lý AI Môi trường</span>
                    <span className="panel-item-desc">Hỏi đáp phân loại rác, quy định & nền tảng</span>
                  </div>
                  {activeTab === "ai-assistant" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "events" ? "active" : ""}`}
                  onClick={() => navigateTo("events", "#events")}
                  data-testid="nav-tab-events"
                >
                  <span className="panel-item-icon">📅</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Sự kiện Chủ Nhật Xanh</span>
                    <span className="panel-item-desc">Chiến dịch dọn vệ sinh & hoạt động môi trường</span>
                  </div>
                  {activeTab === "events" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "fundraiser" ? "active" : ""}`}
                  onClick={() => navigateTo("fundraiser", "#fundraiser")}
                  data-testid="nav-tab-fundraiser"
                >
                  <span className="panel-item-icon">💚</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Gây quỹ cộng đồng</span>
                    <span className="panel-item-desc">Chung tay tài trợ các dự án môi trường xanh</span>
                  </div>
                  {activeTab === "fundraiser" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "safety-check" ? "active" : ""}`}
                  onClick={() => navigateTo("safety-check", "#safety-check")}
                  data-testid="tab-btn-safety-check"
                >
                  <span className="panel-item-icon">🛡️</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Báo an toàn (Safety Check)</span>
                    <span className="panel-item-desc">Báo an toàn thiên tai cho bạn bè & người thân</span>
                  </div>
                  {activeTab === "safety-check" && <span className="active-indicator">●</span>}
                </button>
              </div>
            )}
          </div>

          {/* NHÓM 4: SỐNG XANH & ĐỔI QUÀ */}
          <div className="nav-dropdown-wrapper">
            <button
              type="button"
              className={`nav-group-btn ${isRewardsActive ? "active" : ""} ${openDropdown === "rewards" ? "dropdown-open" : ""}`}
              onClick={() => setOpenDropdown((prev) => (prev === "rewards" ? null : "rewards"))}
              aria-expanded={openDropdown === "rewards"}
              data-testid="nav-group-rewards"
            >
              <span className="nav-icon">🎁</span>
              <span className="nav-label">Sống Xanh & Thưởng</span>
              <span className="dropdown-caret">{openDropdown === "rewards" ? "▴" : "▾"}</span>
            </button>

            {openDropdown === "rewards" && (
              <div className={`nav-menu-panel ${isDarkMode ? "dark-mode" : ""}`} role="menu">
                <div className="panel-section-title">THƯỞNG & ĐỔI QUÀ SINH THÁI</div>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "rewards" ? "active" : ""}`}
                  onClick={() => navigateTo("rewards", "#wallet")}
                  data-testid="tab-btn-rewards"
                >
                  <span className="panel-item-icon">💳</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Ví điểm xanh & Đổi quà</span>
                    <span className="panel-item-desc">Đổi voucher sinh thái, quà tặng & chính sách điểm</span>
                  </div>
                  {activeTab === "rewards" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "challenges" ? "active" : ""}`}
                  onClick={() => navigateTo("challenges", "#challenges")}
                  data-testid="tab-btn-challenges"
                >
                  <span className="panel-item-icon">🎯</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Thử thách xanh hàng tuần</span>
                    <span className="panel-item-desc">Làm nhiệm vụ sống xanh & nhận điểm thưởng</span>
                  </div>
                  {activeTab === "challenges" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "handbook" ? "active" : ""}`}
                  onClick={() => navigateTo("handbook", "#handbook")}
                  data-testid="tab-btn-handbook"
                >
                  <span className="panel-item-icon">📖</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Cẩm nang phân loại rác</span>
                    <span className="panel-item-desc">Tra cứu hướng dẫn phân loại & tái chế tại nguồn</span>
                  </div>
                  {activeTab === "handbook" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "leaderboard" ? "active" : ""}`}
                  onClick={() => navigateTo("leaderboard", "#leaderboard")}
                  data-testid="tab-btn-leaderboard"
                >
                  <span className="panel-item-icon">🏆</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Bảng vinh danh công dân xanh</span>
                    <span className="panel-item-desc">Top công dân tích cực & bảng xếp hạng quận huyện</span>
                  </div>
                  {activeTab === "leaderboard" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "lucky-wheel" ? "active" : ""}`}
                  onClick={() => navigateTo("lucky-wheel", "#lucky-wheel")}
                  data-testid="tab-btn-lucky-wheel"
                >
                  <span className="panel-item-icon">🎡</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Vòng quay may mắn hằng ngày</span>
                    <span className="panel-item-desc">Quay thưởng mỗi ngày nhận điểm & quà may mắn</span>
                  </div>
                  {activeTab === "lucky-wheel" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "milestone" ? "active" : ""}`}
                  onClick={() => navigateTo("milestone", "#milestone")}
                  data-testid="tab-btn-milestone"
                >
                  <span className="panel-item-icon">🏅</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Cột mốc & Danh hiệu xanh</span>
                    <span className="panel-item-desc">Lộ trình thăng cấp danh hiệu công dân sinh thái</span>
                  </div>
                  {activeTab === "milestone" && <span className="active-indicator">●</span>}
                </button>

                <button
                  type="button"
                  className={`panel-item-btn ${activeTab === "qr-scan" ? "active" : ""}`}
                  onClick={() => navigateTo("qr-scan", "#qr-scan")}
                  data-testid="tab-btn-qr-scan"
                >
                  <span className="panel-item-icon">📷</span>
                  <div className="panel-item-content">
                    <span className="panel-item-title">Quét mã QR nhận điểm</span>
                    <span className="panel-item-desc">Quét mã QR tại các trạm tái chế để tích điểm tức thì</span>
                  </div>
                  {activeTab === "qr-scan" && <span className="active-indicator">●</span>}
                </button>
              </div>
            )}
          </div>

          {/* NHÓM 5: TRA CỨU XỬ PHẠT (Nút trực tiếp) */}
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
          {/* Nút SOS Cứu hộ khẩn cấp */}
          <button
            type="button"
            className={`quick-sos-btn ${activeTab === "flood-sos" ? "active" : ""}`}
            onClick={() => navigateTo("flood-sos", "#flood-sos")}
            title="Cứu nạn ngập lụt khẩn cấp (Flood SOS - STT 46)"
            data-testid="quick-sos-btn"
          >
            <span className="sos-pulse-icon">🚨</span>
            <span>SOS NGẬP LỤT</span>
          </button>
          {/* Nút Phản ánh nhanh */}
          <button
            type="button"
            className={`quick-report-btn ${activeTab === "report" ? "active" : ""}`}
            onClick={() => {
              if (!checkIsLoggedIn()) {
                setAuthRedirectUrl("/report");
                setActiveTab("auth");
                window.location.hash = "#login";
              } else {
                navigateTo("report", "#report");
              }
            }}
            title="Gửi phản ánh sự cố môi trường"
            data-testid="quick-report-btn"
          >
            <span>📢</span>
            <span className="quick-report-label">Gửi phản ánh</span>
          </button>
          {/* Nút chuyển đổi ngôn ngữ Tiếng Việt / Tiếng Anh */}
          <button
            type="button"
            className="header-icon-btn lang-toggle-btn"
            onClick={toggleLanguage}
            title={currentLang === "VI" ? "Chuyển sang tiếng Anh (Switch to English)" : "Switch to Vietnamese (Chuyển sang tiếng Việt)"}
            aria-label="Chuyển đổi ngôn ngữ hệ thống"
            style={{ fontWeight: 700, fontSize: "0.82rem", minWidth: "46px", cursor: "pointer" }}
            data-testid="btn-toggle-language"
          >
            {currentLang === "VI" ? "VI 🇻🇳" : "EN 🇬🇧"}
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
                    onClick={() => {
                      setProfileTargetUserId(null);
                      navigateTo("profile", "#profile");
                    }}
                  >
                    <span className="action-icon">🌿</span>
                    <span>Trang cá nhân & Green Passport</span>
                  </button>

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

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("rewards", "#wallet")}
                    data-testid="user-menu-rewards"
                  >
                    <span className="action-icon">💳</span>
                    <span>Ví Điểm Thưởng & Danh Hiệu</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("challenges", "#challenges")}
                    data-testid="user-menu-challenges"
                  >
                    <span className="action-icon">🎯</span>
                    <span>Thử Thách Xanh Trong Tuần</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("outbox", "#outbox")}
                    data-testid="user-menu-outbox"
                  >
                    <span className="action-icon">📤</span>
                    <span>Hàng Đợi Ngoại Tuyến & Bản Nháp</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("handbook", "#handbook")}
                    data-testid="user-menu-handbook"
                  >
                    <span className="action-icon">📖</span>
                    <span>Cẩm Nang Phân Loại Rác</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("leaderboard", "#leaderboard")}
                    data-testid="user-menu-leaderboard"
                  >
                    <span className="action-icon">🏆</span>
                    <span>Bảng Xếp Hạng Công Dân Xanh</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("heatmap", "#heatmap")}
                    data-testid="user-menu-heatmap"
                  >
                    <span className="action-icon">🛰️</span>
                    <span>Bản Đồ Nhiệt Môi Trường (GIS)</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("qr-scan", "#qr-scan")}
                    data-testid="user-menu-qr-scan"
                  >
                    <span className="action-icon">📷</span>
                    <span>Quét Mã QR Nhận Điểm</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("lucky-wheel", "#lucky-wheel")}
                    data-testid="user-menu-lucky-wheel"
                  >
                    <span className="action-icon">🎡</span>
                    <span>Vòng Quay May Mắn Mỗi Ngày</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("milestone", "#milestone")}
                    data-testid="user-menu-milestone"
                  >
                    <span className="action-icon">🏅</span>
                    <span>Lộ Trình Danh Hiệu</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("safety-check", "#safety-check")}
                    data-testid="user-menu-safety-check"
                  >
                    <span className="action-icon">🛡️</span>
                    <span>Báo An Toàn (Safety Check)</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => navigateTo("ai-assistant", "#ai-assistant")}
                  >
                    <span className="action-icon">🤖</span>
                    <span>Trợ lý AI Môi trường</span>
                  </button>

                  {(currentUser?.role === "ADMIN" || hasUserMgmtAccess || hasRbacAccess || hasAuditAccess) && (
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
                        onClick={() => navigateTo("admin-dashboard", "#admin-dashboard")}
                        data-testid="user-menu-admin-dashboard"
                      >
                        <span className="action-icon">📈</span>
                        <span>Thống kê hoạt động hệ thống</span>
                      </button>

                      {hasAuditAccess && (
                        <button
                          type="button"
                          className="dropdown-menu-action"
                          onClick={() => navigateTo("audit-logs", "#audit-logs")}
                          data-testid="user-menu-audit-logs"
                        >
                          <span className="action-icon">📜</span>
                          <span>Nhật ký kiểm toán (Audit Log)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="dropdown-menu-action"
                        onClick={() => navigateTo("incident-export", "#incident-export")}
                        data-testid="user-menu-incident-export"
                      >
                        <span className="action-icon">📊</span>
                        <span>Xuất báo cáo sự cố (Excel/PDF)</span>
                      </button>

                      <button
                        type="button"
                        className="dropdown-menu-action"
                        onClick={() => navigateTo("emergency-alert", "#emergency-alert")}
                        data-testid="user-menu-emergency-alert"
                      >
                        <span className="action-icon">🚨</span>
                        <span>Phát lệnh cảnh báo khẩn cấp (PCTT)</span>
                      </button>

                      <button
                        type="button"
                        className="dropdown-menu-action"
                        onClick={() => navigateTo("fundraiser", "#fundraiser-admin")}
                        data-testid="user-menu-fundraiser-admin"
                      >
                        <span className="action-icon">💚</span>
                        <span>Trung tâm Quản trị Gây quỹ</span>
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

        {/* VIEW NỘI DUNG CHÍNH: TẤT CẢ CÁC MODULE */}
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
              onLoginSuccess={(targetUrl?: string) => {
                if (targetUrl && targetUrl !== "/login" && targetUrl !== "/auth/login") {
                  const cleanPath = targetUrl.startsWith("#") ? targetUrl.slice(1) : targetUrl;
                  const tab = resolveTabFromUrl(cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`);
                  setActiveTab(tab);
                  navigateToRoute(tab);
                } else {
                  setActiveTab("map");
                  navigateToRoute("map");
                }
              }}
              onExitAuth={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </div>
        ) : activeTab === "outbox" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc", paddingTop: "76px" }}>
            <OfflineOutboxPage
              onBackToReport={() => {
                setSelectedDraftId(null);
                setEditingQueueItem(null);
                setActiveTab("report" as TabType);
                window.location.hash = "#report";
              }}
              onEditQueueItem={(queueItem) => {
                setSelectedDraftId(null);
                setEditingQueueItem(queueItem);
                setActiveTab("report" as TabType);
                window.location.hash = "#report";
              }}
              onResumeDraft={(draftId) => {
                setSelectedDraftId(draftId);
                setEditingQueueItem(null);
                setActiveTab("report" as TabType);
                window.location.hash = "#report";
              }}
            />
          </div>
        ) : activeTab === "report" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#090d16", paddingTop: "76px" }}>
            <ReportContainer
              initialDraftId={selectedDraftId}
              editingQueueItem={editingQueueItem}
              onClearEditingItem={() => {
                setSelectedDraftId(null);
                setEditingQueueItem(null);
              }}
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
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#0b1120", paddingTop: "76px" }}>
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
                targetUserId={profileTargetUserId}
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
                onNavigateToFeed={() => {
                  setActiveTab("posts");
                  window.location.hash = "#posts";
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
                onNavigateToProfile={(targetUserId) => {
                  setProfileTargetUserId(targetUserId || null);
                  setActiveTab("profile");
                  window.location.hash = targetUserId ? `#profile?id=${targetUserId}` : "#profile";
                }}
                onNavigateToChat={(targetUserId) => {
                  setChatTargetUserId(targetUserId);
                  setActiveTab("messages");
                  window.location.hash = `#messages?target=${targetUserId}`;
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
        ) : activeTab === "waste_categories" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc", paddingTop: "76px" }}>
            <WasteCategoryContainer
              currentUser={currentUser}
              onNavigateHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </div>
        ) : activeTab === "recycling_facilities" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", overflowX: "hidden", background: "#f8fafc", paddingTop: "76px" }}>
            <RecyclingFacilityContainer
              currentUser={currentUser}
              onNavigateHome={() => {
                setActiveTab("map");
                window.location.hash = "#map";
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
        ) : activeTab === "triage" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/incidents/ai-triage"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
              <ModulePermissionGuard
                moduleCode="INCIDENTS"
                moduleName="Thẩm định Sự cố AI & Vùng đệm Cơ sở Thiết yếu"
              >
                <TriageAppDashboard />
              </ModulePermissionGuard>
            </div>
          )
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
        ) : activeTab === "groups" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/groups"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`} style={{ overflowY: "auto", position: "absolute", inset: 0, paddingTop: "76px" }}>
              <GroupsContainer
                currentUser={currentUser}
                onNavigateToProfile={() => {
                  setActiveTab("profile");
                  window.location.hash = "#profile";
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
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
                onNavigateToFeature={(target, payload) => {
                  if (target === "dashboard_aqi") {
                    setActiveTab("dashboard");
                    navigateToRoute("dashboard");
                    window.location.hash = "#dashboard";
                  } else if (target === "map_flood" || target === "navigation") {
                    if (payload) {
                      try {
                        localStorage.setItem("greenspot_nav_destination", JSON.stringify(payload));
                      } catch { }
                    }
                    setActiveTab("navigation");
                    navigateToRoute("navigation");
                    window.location.hash = "#navigation";
                  } else if (target === "dispatch" || target === "operations_dispatch") {
                    setActiveTab("dispatch");
                    navigateToRoute("dispatch");
                    window.location.hash = "#dispatch";
                  } else if (target === "risk_dashboard" || target === "urban_risk") {
                    setActiveTab("risk-dashboard");
                    navigateToRoute("risk-dashboard");
                    window.location.hash = "#risk-dashboard";
                  } else if (target === "hotspots") {
                    setActiveTab("hotspots");
                    navigateToRoute("hotspots");
                    window.location.hash = "#hotspots";
                  } else if (target === "dedup") {
                    setActiveTab("dedup");
                    navigateToRoute("dedup");
                    window.location.hash = "#dedup";
                  } else if (target === "/report-incident") {
                    setActiveTab("triage");
                    navigateToRoute("triage");
                    window.location.hash = "#triage";
                  } else if (target === "report") {
                    setActiveTab("report");
                    navigateToRoute("report");
                    window.location.hash = "#report";
                  } else if (target === "/wallet" || target === "rewards" || target === "wallet") {
                    setActiveTab("rewards");
                    navigateToRoute("rewards");
                    window.location.hash = "#rewards";
                  } else if (target === "flood_sos" || target === "sos" || target === "flood-sos") {
                    setActiveTab("flood-sos");
                    navigateToRoute("flood-sos");
                    window.location.hash = "#flood-sos";
                  } else if (target === "emergency_alert" || target === "safety_check" || target === "emergency-alert") {
                    setActiveTab("emergency-alert");
                    navigateToRoute("emergency-alert");
                    window.location.hash = "#emergency-alert";
                  } else if (target === "events" || target === "green_sunday" || target === "community/events") {
                    setActiveTab("events");
                    navigateToRoute("events");
                    window.location.hash = "#events";
                  } else {
                    setActiveTab("map");
                    navigateToRoute("map");
                    window.location.hash = "#map";
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
                setActiveTab("map");
                window.location.hash = "#map";
              }}
            />
          </div>
        ) : activeTab === "posts" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`} style={{ paddingTop: "76px" }}>
            <FeedContainer
              onNavigateTab={(tab) => {
                setActiveTab(tab as TabType);
                window.location.hash = `#${tab}`;
              }}
              onNavigateLogin={() => {
                setAuthRedirectUrl("/posts");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "messages" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/messages"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`} style={{ paddingTop: "64px", height: "100vh", overflow: "hidden" }}>
              <ChatContainer
                currentUser={currentUser}
                initialTargetUserId={chatTargetUserId}
                initialConversationId={chatConversationId}
                onBackToHome={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          )
        ) : activeTab === "events" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
            <EventsPage
              onNavigateToLogin={() => {
                setAuthRedirectUrl("/events");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "ai-assistant" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/ai-assistant"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`} style={{ paddingTop: "76px", height: "100vh", overflow: "hidden" }}>
              <AiAssistantPage
                onBackToHome={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          )
        ) : activeTab === "fundraiser" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
            <FundraiserContainer
              currentUser={currentUser}
              initialAdminMode={window.location.hash === "#fundraiser-admin" || window.location.hash.startsWith("#fundraiser/admin")}
              onNavigateToLogin={() => {
                setAuthRedirectUrl("/fundraiser");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "rewards" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <RewardsContainer
              onBackToHome={() => {
                navigateTo("map", "#map");
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
                navigateTo("map", "#map");
              }}
              onNavigateToAuth={() => {
                sessionStorage.setItem("greenspot_target_hash", "#challenges");
                setAuthRedirectUrl("/challenges");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
              onNavigateToWallet={() => {
                navigateTo("rewards", "#wallet");
              }}
            />
          </div>
        ) : activeTab === "audit-logs" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <AuditLogContainer
              onBackToHome={() => {
                navigateTo("map", "#map");
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
                navigateTo("map", "#map");
              }}
              onNavigateToMap={(_facilityType) => {
                navigateTo("map", "#map");
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
                navigateTo("heatmap", "#heatmap");
              }}
            />
          </div>
        ) : activeTab === "heatmap" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#0b0f19" }}>
            <MultiModeHeatmapContainer
              onNavigateDistrictReport={(_districtCode) => {
                navigateTo("map", "#map");
              }}
            />
          </div>
        ) : activeTab === "qr-scan" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <QRScanContainer
              onBackToHome={() => {
                navigateTo("map", "#map");
              }}
              onNavigateWallet={() => {
                navigateTo("rewards", "#wallet");
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
                navigateTo("map", "#map");
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
                navigateTo("map", "#map");
              }}
              onNavigateLogin={() => {
                sessionStorage.setItem("greenspot_target_hash", "#milestone");
                setAuthRedirectUrl("/milestone");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "emergency-alert" || activeTab === "safety-check" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <EmergencyAlertContainer
              initialView={activeTab === "safety-check" ? "SAFETY_CHECK" : "CONSOLE"}
              currentUser={currentUser}
              onNavigateHome={() => {
                navigateTo("map", "#map");
              }}
              onNavigateFeed={() => {
                navigateTo("posts", "#posts");
              }}
              onNavigateSafeRoute={() => {
                navigateTo("navigation", "#navigation");
              }}
            />
          </div>
        ) : activeTab === "flood-sos" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/emergency/flood-sos"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
              <FloodSosContainer />
            </div>
          )
        ) : activeTab === "incident-export" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/reports/incident-export"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
              <ModulePermissionGuard
                moduleCode="INCIDENTS"
                moduleName="Xuất Danh sách Sự cố (Excel / PDF)"
              >
                <IncidentExportContainer />
              </ModulePermissionGuard>
            </div>
          )
        ) : activeTab === "admin-dashboard" ? (
          !currentUser ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : ""}`}>
              <AuthContainer
                initialView="login"
                redirectUrl="/admin/activity-dashboard"
                onExitAuth={() => {
                  setActiveTab("map");
                  window.location.hash = "#map";
                }}
              />
            </div>
          ) : currentUser.role !== "ADMIN" ? (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
              <ModulePermissionGuard
                moduleCode="STATISTICS"
                moduleName="Thống kê Hoạt động Hệ thống (Chỉ dành cho Admin)"
              >
                <div className="empty-placeholder">
                  <h2>403 - Truy cập bị từ chối</h2>
                  <p>Chỉ Quản trị viên hệ thống (ADMIN) mới được phép truy cập bảng thống kê tổng hợp.</p>
                </div>
              </ModulePermissionGuard>
            </div>
          ) : (
            <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
              <AdminDashboardContainer
                onNavigateHome={() => {
                  navigateTo("map", "#map");
                }}
              />
            </div>
          )
        ) : (
          /* Mặc định an toàn cho khách vãng lai và tab map: Bản đồ số WebGIS công cộng */
          <ModulePermissionGuard
            moduleCode="GIS_MAP"
            moduleName="Bản đồ số WebGIS"
          >
            <EcoMap />
          </ModulePermissionGuard>
        )}
      </main>

      {/* NÚT ĐOẠN CHAT & TIN NHẮN NHANH NỔI (CHỨC NĂNG 15) */}
      {activeTab !== "messages" && (
        <button
          type="button"
          className="floating-chat-quick-btn"
          onClick={() => {
            if (!checkIsLoggedIn()) {
              setAuthRedirectUrl("/messages");
              setActiveTab("auth");
              window.location.hash = "#login";
            } else {
              setChatTargetUserId(null);
              setChatConversationId(null);
              setActiveTab("messages");
              window.location.hash = "#messages";
              setGlobalUnreadChatCount(0);
            }
          }}
          title="Nhắn tin 1-1, Chat nhóm & Chat quận (Chức năng 15)"
          aria-label="Tin nhắn"
        >
          <span className="floating-chat-icon">💬</span>
          <span className="floating-chat-label">Tin nhắn</span>
          {globalUnreadChatCount > 0 && (
            <span className="floating-chat-badge">{globalUnreadChatCount > 99 ? "99+" : globalUnreadChatCount}</span>
          )}
        </button>
      )}

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
          <span className="floating-mic-label">{t("nav.voiceAssistant", "Trợ lý ảo")}</span>
        </button>
      )}

      {/* NÚT TRỢ LÝ AI MÔI TRƯỜNG NỔI (CHỨC NĂNG 24) */}
      {activeTab !== "ai-assistant" && (
        <AiAssistantWidget
          onNavigateToLogin={() => {
            setAuthRedirectUrl("/ai-assistant");
            setActiveTab("auth");
            window.location.hash = "#login";
          }}
        />
      )}
    </div>
  );
}

export default App;
