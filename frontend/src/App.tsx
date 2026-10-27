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
import api from "./api/client";
import "./App.css";

export type TabType =
  | "map"
  | "dashboard"
  | "auth"
  | "rbac"
  | "users"
  | "profile"
  | "friends"
  | "voice"
  | "report"
  | "incidents"
  | "waste_categories"
  | "recycling_facilities"
  | "dedup"
  | "settings"
  | "penalties"
  | "penalty-reports"
  | "posts"
  | "messages"
  | "groups"
  | "triage"
  | "navigation"
  | "risk-dashboard"
  | "dispatch"
  | "hotspots"
  | "ai-assistant"
  | "events"
  | "fundraiser";

export type ActiveTab = TabType;

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
      if (hash.startsWith("#messages") || path.startsWith("/messages") || hash.startsWith("#chat") || path.startsWith("/chat")) return "/messages";
      if (hash === "#dashboard" || path === "/dashboard") return "/dashboard";
      if (hash === "#users" || path === "/users") return "/users";
      if (hash === "#rbac" || path === "/rbac") return "/rbac";
      if (hash === "#dedup" || path === "/dedup") return "/dedup";
      if (hash === "#settings" || path === "/settings") return "/settings";
      if (hash === "#groups" || path === "/groups") return "/groups";
      if (hash === "#penalty-reports" || path === "/penalty-reports") return "/penalty-reports";
      if (hash === "#risk-dashboard" || hash === "#urban-risk" || path === "/risk-dashboard") return "/risk-dashboard";
      if (hash === "#dispatch" || hash === "#operations-dispatch" || path === "/dispatch") return "/dispatch";
      if (hash === "#hotspots" || hash === "#hotspot-analytics" || path === "/hotspots") return "/hotspots";
      if (hash === "#ai-assistant" || hash === "#chatbot" || path === "/ai-assistant" || path === "/chatbot") return "/ai-assistant";
    }
    if ((hash === "#report" || window.location.pathname.toLowerCase() === "/report") && !isLogged) {
      return "/report";
    }
    return undefined;
  });

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const isLogged = checkIsLoggedIn();

    if (hash === "#events" || path === "/events") {
      return "events";
    }
    if (hash === "#fundraiser" || path === "/fundraiser") {
      return "fundraiser";
    }
    if (hash === "#hotspots" || hash === "#hotspot-analytics" || path === "/hotspots") {
      if (!isLogged) return "auth";
      return "hotspots";
    }
    if (hash === "#dispatch" || hash === "#operations-dispatch" || path === "/dispatch") {
      if (!isLogged) return "auth";
      return "dispatch";
    }
    if (hash === "#risk-dashboard" || hash === "#urban-risk" || path === "/risk-dashboard") {
      if (!isLogged) return "auth";
      return "risk-dashboard";
    }
    if (hash === "#navigation" || path === "/navigation") return "navigation";
    if (hash === "#voice" || path === "/voice") return "voice";
    if (hash === "#map" || path === "/map") return "map";
    if (hash === "#groups" || path === "/groups") {
      if (!isLogged) return "auth";
      return "groups";
    }
    if (hash.startsWith("#messages") || hash.startsWith("#chat") || path.startsWith("/messages") || path.startsWith("/chat")) {
      if (!isLogged) return "auth";
      return "messages";
    }
    if (hash === "#penalties" || path === "/penalties") {
      if (!isLogged) return "auth";
      return "penalties";
    }
    if (hash === "#posts" || hash === "#feed" || hash === "#create-post" || path === "/posts" || path === "/feed" || path === "/create-post" || hash.startsWith("#post-comments") || path.startsWith("/post-comments")) {
      return "posts";
    }
    if (hash === "#auth" || hash === "#login" || hash === "#register" || hash === "#devices") return "auth";
    if (hash === "#voice" || path === "/voice") {
      if (!isLogged) return "auth";
      return "voice";
    }


    // Khách vãng lai chưa đăng nhập: Không được phép vào các trang cài đặt, phân tích khí hậu, bạn bè, profile, quản trị, trùng lặp
    if (hash === "#penalty-reports" || path === "/penalty-reports") {
      if (!isLogged) return "auth";
      return "penalty-reports";
    }
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
    if (hash.startsWith("#profile") || path.startsWith("/profile")) {
      if (!isLogged) return "auth";
      return "profile";
    }
    if (hash === "#report" || path === "/report") {
      if (!isLogged) return "auth";
      return "report";
    }
    if (hash === "#incidents" || path === "/incidents") {
      if (!isLogged) return "auth";
      return "incidents";
    }
    if (hash === "#waste-categories" || hash === "#waste_categories" || path === "/waste-categories") {
      if (!isLogged) return "auth";
      return "waste_categories";
    }
    if (hash === "#recycling-facilities" || hash === "#recycling_facilities" || path === "/recycling-facilities") {
      if (!isLogged) return "auth";
      return "recycling_facilities";
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
    if (hash === "#triage" || path === "/triage") {
      if (!isLogged) return "auth";
      return "triage";
    }
    if (hash === "#ai-assistant" || hash === "#chatbot" || path === "/ai-assistant" || path === "/chatbot") {
      if (!isLogged) return "auth";
      return "ai-assistant";
    }

    // Mặc định: khi chưa đăng nhập, chỉ hiển thị Bản đồ WebGIS công cộng
    if (!isLogged) return "map";
    return "profile";
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
        }).catch(() => {});
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
  const hasRbacAccess = currentUser?.role === "ADMIN" || canAccess("ROLE");
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

  const navigateTo = (tab: ActiveTab, hash?: string) => {
    setActiveTab(tab);
    if (hash) window.location.hash = hash;
    setOpenDropdown(null);
    setShowDrawer(false);
  };

  const isGeoActive = ["map", "dashboard", "navigation", "hotspots", "risk-dashboard"].includes(activeTab);
  const isOpsActive = [
    "dispatch",
    "penalty-reports",
    "triage",
    "dedup",
    "report",
    "incidents",
    "waste_categories",
    "recycling_facilities",
  ].includes(activeTab);
  const isCommunityActive = ["posts", "groups", "messages", "friends", "voice", "ai-assistant", "events", "fundraiser"].includes(activeTab);
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

  // Lắng nghe sự kiện hashchange để đồng bộ view khi thay đổi URL hoặc bấm Back/Forward
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const isLogged = checkIsLoggedIn();

      if (hash === "#map") {
        setActiveTab("map");
      } else if (hash.startsWith("#messages") || hash.startsWith("#chat") || window.location.pathname.startsWith("/messages") || window.location.pathname.startsWith("/chat")) {
        const match = window.location.hash.match(/[?&]target=([^&]+)/);
        const targetId = match ? decodeURIComponent(match[1]) : null;
        setChatTargetUserId(targetId);

        const convMatch = window.location.hash.match(/[?&](?:conv|conversation_id)=([^&]+)/);
        const convId = convMatch ? decodeURIComponent(convMatch[1]) : null;
        setChatConversationId(convId);

        if (!isLogged) {
          setAuthRedirectUrl("/messages");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("messages");
          setGlobalUnreadChatCount(0);
        }
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
        if (!isLogged) {
          setAuthRedirectUrl("/voice");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("voice");
        }
      } else if (hash === "#dedup" || window.location.pathname === "/dedup") {
        if (!isLogged) {
          setAuthRedirectUrl("/dedup");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("dedup");
        }
      } else if (hash === "#triage" || window.location.pathname === "/triage") {
        if (!isLogged) {
          setAuthRedirectUrl("/triage");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("triage");
        }
      } else if (hash === "#navigation" || window.location.pathname === "/navigation") {
        setActiveTab("navigation");
      } else if (hash === "#penalties" || window.location.pathname === "/penalties") {
        setActiveTab("penalties");
      } else if (hash === "#penalty-reports" || window.location.pathname === "/penalty-reports") {
        if (!isLogged) {
          setAuthRedirectUrl("/penalty-reports");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("penalty-reports");
        }
      } else if (hash === "#dispatch" || hash === "#operations-dispatch" || window.location.pathname === "/dispatch") {
        if (!isLogged) {
          setAuthRedirectUrl("/dispatch");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("dispatch");
        }
      } else if (hash === "#hotspots" || hash === "#hotspot-analytics" || window.location.pathname === "/hotspots") {
        if (!isLogged) {
          setAuthRedirectUrl("/hotspots");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("hotspots");
        }
      } else if (hash === "#risk-dashboard" || hash === "#urban-risk" || window.location.pathname === "/risk-dashboard") {
        if (!isLogged) {
          setAuthRedirectUrl("/risk-dashboard");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("risk-dashboard");
        }
      } else if (hash === "#settings" || window.location.pathname === "/settings") {
        if (!isLogged) {
          setAuthRedirectUrl("/settings");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("settings");
        }
      } else if (hash === "#groups" || window.location.pathname === "/groups") {
        if (!isLogged) {
          setAuthRedirectUrl("/groups");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("groups");
        }
      } else if (hash === "#ai-assistant" || hash === "#chatbot" || window.location.pathname === "/ai-assistant" || window.location.pathname === "/chatbot") {
        if (!isLogged) {
          setAuthRedirectUrl("/ai-assistant");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("ai-assistant");
        }
      } else if (hash === "#posts" || hash === "#feed" || hash === "#create-post" || hash.startsWith("#post-comments") || window.location.pathname.startsWith("/post-comments")) {
        setActiveTab("posts");
      } else if (hash.startsWith("#profile") || window.location.pathname.startsWith("/profile")) {
        const match = window.location.hash.match(/[?&](?:id|userId|user_id)=([^&]+)/);
        const targetId = match ? decodeURIComponent(match[1]) : null;
        setProfileTargetUserId(targetId);

        if (!isLogged) {
          setAuthRedirectUrl(targetId ? `/profile?id=${targetId}` : "/profile");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("profile");
        }
      } else if (hash === "#report") {
        if (!isLogged) {
          setAuthRedirectUrl("/report");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("report");
        }
      } else if (hash === "#incidents") {
        if (!isLogged) {
          setAuthRedirectUrl("/incidents");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("incidents");
        }
      } else if (hash === "#waste-categories" || hash === "#waste_categories") {
        if (!isLogged) {
          setAuthRedirectUrl("/waste-categories");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("waste_categories");
        }
      } else if (hash === "#recycling-facilities" || hash === "#recycling_facilities") {
        if (!isLogged) {
          setAuthRedirectUrl("/recycling-facilities");
          setActiveTab("auth");
          window.location.hash = "#login";
        } else {
          setActiveTab("recycling_facilities");
        }
      } else if (hash === "#fundraiser" || window.location.pathname === "/fundraiser") {
        setActiveTab("fundraiser");
      } else if (hash === "#events" || window.location.pathname === "/events") {
        setActiveTab("events");
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
      } else if (activeTab === "messages") {
        setAuthRedirectUrl("/messages");
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
      } else if (activeTab === "penalties") {
        setAuthRedirectUrl("/penalties");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "groups") {
        setAuthRedirectUrl("/groups");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "triage") {
        setAuthRedirectUrl("/triage");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "penalty-reports") {
        setAuthRedirectUrl("/penalty-reports");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "dispatch") {
        setAuthRedirectUrl("/dispatch");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "hotspots") {
        setAuthRedirectUrl("/hotspots");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "risk-dashboard") {
        setAuthRedirectUrl("/risk-dashboard");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "report") {
        setAuthRedirectUrl("/report");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "incidents") {
        setAuthRedirectUrl("/incidents");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "waste_categories") {
        setAuthRedirectUrl("/waste-categories");
        setActiveTab("auth");
        window.location.hash = "#login";
      } else if (activeTab === "recycling_facilities") {
        setAuthRedirectUrl("/recycling-facilities");
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
              </div>
            )}
          </div>

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
                    className={`status-pill ${
                      backendStatus.startsWith("Online") ? "success" : "warning"
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
                    onClick={() => navigateTo("ai-assistant", "#ai-assistant")}
                  >
                    <span className="action-icon">🤖</span>
                    <span>Trợ lý AI Môi trường</span>
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
            onExitAuth={() => {
              setActiveTab("map");
              window.location.hash = "#map";
            }}
          />
        </div>
      ) : activeTab === "report" ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#090d16", paddingTop: "76px" }}>
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
                  window.location.hash = "#dashboard";
                } else if (target === "map_flood" || target === "navigation") {
                  if (payload) {
                    try {
                      localStorage.setItem("greenspot_nav_destination", JSON.stringify(payload));
                    } catch {}
                  }
                  setActiveTab("navigation");
                  window.location.hash = "#navigation";
                } else if (target === "dispatch" || target === "operations_dispatch") {
                  setActiveTab("dispatch");
                  window.location.hash = "#dispatch";
                } else if (target === "risk_dashboard" || target === "urban_risk") {
                  setActiveTab("risk-dashboard");
                  window.location.hash = "#risk-dashboard";
                } else if (target === "hotspots") {
                  setActiveTab("hotspots");
                  window.location.hash = "#hotspots";
                } else if (target === "dedup") {
                  setActiveTab("dedup");
                  window.location.hash = "#dedup";
                } else if (target === "/report-incident") {
                  setActiveTab("triage");
                  window.location.hash = "#triage";
                } else if (target === "report") {
                  setActiveTab("report");
                  window.location.hash = "#report";
                } else if (target === "/wallet") {
                  setActiveTab("profile");
                  window.location.hash = "#profile";
                } else {
                  setActiveTab("map");
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
            onNavigateToLogin={() => {
              setAuthRedirectUrl("/fundraiser");
              setActiveTab("auth");
              window.location.hash = "#login";
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
          <span className="floating-mic-label">Trợ lý ảo</span>
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
