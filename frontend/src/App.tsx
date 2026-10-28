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
  loginCitizen,
} from "./features/auth";
import { RbacContainer, usePermissions, ModulePermissionGuard } from "./features/rbac";
import { UserManagementContainer } from "./features/user_management";
import { RewardsContainer } from "./features/rewards";
import { WeeklyChallengesContainer } from "./features/challenges/WeeklyChallengesContainer";
import { AuditLogContainer } from "./features/audit_logs/AuditLogContainer";
import { WasteHandbookContainer } from "./features/waste_handbook/WasteHandbookContainer";
import { LeaderboardContainer } from "./features/leaderboard/LeaderboardContainer";
import { MultiModeHeatmapContainer } from "./features/heatmap/MultiModeHeatmapContainer";
import { QRScanContainer } from "./features/qr_scan/QRScanContainer";
import { LuckyWheelContainer } from "./features/lucky_wheel/LuckyWheelContainer";
import { MilestoneContainer } from "./features/milestone/MilestoneContainer";
import {
  AlertManagementContainer,
  NotificationDropdown,
  NotificationCenterModal,
  EmergencyMarqueeBanner,
  FloatingSOSButton,
} from "./features/alerts";
import { PublicTrackingContainer } from "./features/public_tracking";
import { ReportsContainer } from "./features/reports";
import api from "./api/client";
import "./App.css";

export interface FeatureItem {
  code: string;
  title: string;
  icon: string;
  hash: string;
  tab: "challenges" | "audit-logs" | "handbook" | "rewards" | "leaderboard" | "heatmap" | "qr-scan" | "lucky-wheel" | "milestone";
  group: string;
  desc: string;
}

export const FEATURES_12_LIST: FeatureItem[] = [
  {
    code: "CN 25",
    title: "Thử Thách Tuần",
    icon: "🎯",
    hash: "#challenges",
    tab: "challenges",
    group: "🎮 Gamification & Thử Thách",
    desc: "Nhiệm vụ tuần nộp ảnh minh chứng, chống trùng ảnh SHA-256, thưởng Combo +100đ.",
  },
  {
    code: "CN 26",
    title: "Nhật Ký Audit Log",
    icon: "📜",
    hash: "#audit-logs",
    tab: "audit-logs",
    group: "🛡️ An Ninh & Kiểm Toán",
    desc: "Truy vết giao dịch dữ liệu, băm chuỗi móc xích bất biến (Chained Cryptographic Hash).",
  },
  {
    code: "CN 27",
    title: "Cẩm Nang Sống Xanh",
    icon: "📖",
    hash: "#handbook",
    tab: "handbook",
    group: "🌐 Cộng Đồng & Dân Sinh",
    desc: "Cẩm nang tra cứu rác chuẩn ISO, lọc vật phẩm nhầm lẫn, Mini-Quiz cộng +5 điểm.",
  },
  {
    code: "CN 28",
    title: "Chính Sách Tích Điểm",
    icon: "🌱",
    hash: "#policy",
    tab: "rewards",
    group: "💎 Kinh Tế Điểm Thưởng (Eco-Tokenomics)",
    desc: "Định mức tích lũy Điểm Xanh, phân hạng hội viên (Bạc, Vàng, Kim Cương) theo trọn đời.",
  },
  {
    code: "CN 29",
    title: "Ví Điểm & Lịch Sử",
    icon: "💳",
    hash: "#wallet",
    tab: "rewards",
    group: "💎 Kinh Tế Điểm Thưởng (Eco-Tokenomics)",
    desc: "Số dư khả dụng, điểm trọn đời, sao kê biến động thời gian thực và xuất báo cáo CSV.",
  },
  {
    code: "CN 30",
    title: "Kho Quà & Voucher",
    icon: "🎁",
    hash: "#catalog",
    tab: "rewards",
    group: "💎 Kinh Tế Điểm Thưởng (Eco-Tokenomics)",
    desc: "CRUD quà tặng, khóa dòng giao dịch chống xung đột hàng tồn và giá ưu đãi theo Hạng.",
  },
  {
    code: "CN 31",
    title: "Voucher Cá Nhân",
    icon: "🎟️",
    hash: "#vouchers",
    tab: "rewards",
    group: "💎 Kinh Tế Điểm Thưởng (Eco-Tokenomics)",
    desc: "Kho voucher cá nhân, mã QR nhận quà, đối soát quầy thu ngân (Cashier PIN / OTP).",
  },
  {
    code: "CN 32",
    title: "BXH Top Công Dân",
    icon: "🏆",
    hash: "#leaderboard",
    tab: "leaderboard",
    group: "🎮 Gamification & Thử Thách",
    desc: "Vinh danh Top Cá nhân (Tuần/Tháng/Trọn đời), xếp hạng nhóm cộng đồng và 22 quận/huyện.",
  },
  {
    code: "CN 33",
    title: "Bản Đồ Nhiệt Khí Hậu",
    icon: "🛰️",
    hash: "#heatmap",
    tab: "heatmap",
    group: "🌐 Cộng Đồng & Dân Sinh",
    desc: "WebGIS Leaflet đa chế độ (AQI, Nhiệt độ, Rủi ro ô nhiễm) với bán kính suy giảm nhiệt.",
  },
  {
    code: "CN 34",
    title: "Quét Mã QR Nhận Điểm",
    icon: "📷",
    hash: "#qr-scan",
    tab: "qr-scan",
    group: "🌐 Cộng Đồng & Dân Sinh",
    desc: "Quét camera trực tiếp hoặc tải ảnh QR, cơ chế mã động có chữ ký thời gian (Signed OTP).",
  },
  {
    code: "CN 35",
    title: "Vòng Quay May Mắn",
    icon: "🎡",
    hash: "#lucky-wheel",
    tab: "lucky-wheel",
    group: "🎮 Gamification & Thử Thách",
    desc: "Vé quay may mắn gắn với hành động môi trường (Action-gated), nhận điểm thưởng & huy hiệu.",
  },
  {
    code: "CN 36",
    title: "Cột Mốc & Danh Hiệu",
    icon: "🏅",
    hash: "#milestone",
    tab: "milestone",
    group: "🎮 Gamification & Thử Thách",
    desc: "Lộ trình cống hiến, bảng tin chia sẻ thành tựu, hiệu ứng thăng cấp Confetti & chứng nhận số.",
  },
];

function App() {
  const [activeTab, setActiveTab] = useState<
    | "map"
    | "dashboard"
    | "auth"
    | "rbac"
    | "users"
    | "rewards"
    | "challenges"
    | "audit-logs"
    | "handbook"
    | "leaderboard"
    | "heatmap"
    | "qr-scan"
    | "lucky-wheel"
    | "milestone"
    | "alerts"
    | "tracking"
    | "reports"
  >(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash === "#map" || path === "/map") return "map";
    if (hash === "#dashboard" || path === "/dashboard") return "dashboard";
    if (hash === "#auth" || hash === "#login" || hash === "#register" || hash === "#devices") return "auth";
    if (hash === "#users" || path === "/users") return "users";
    if (hash === "#rbac" || path === "/rbac") return "rbac";
    if (hash === "#wallet" || hash === "#rewards" || hash === "#policy" || hash === "#catalog" || hash === "#vouchers") return "rewards";
    if (hash === "#challenges") return "challenges";
    if (hash === "#audit-logs" || hash === "#audit") return "audit-logs";
    if (hash === "#handbook" || hash === "#guide") return "handbook";
    if (hash === "#leaderboard" || hash === "#ranking") return "leaderboard";
    if (hash === "#heatmap" || hash === "#climate-map") return "heatmap";
    if (hash === "#qr-scan" || hash === "#qr" || hash === "#scan") return "qr-scan";
    if (hash === "#lucky-wheel" || hash === "#wheel" || hash === "#spin") return "lucky-wheel";
    if (hash === "#milestone" || hash === "#tier-progress" || hash === "#tier") return "milestone";
    if (hash === "#alerts" || hash === "#warning" || hash === "#alert-map" || hash === "#thresholds" || hash === "#sos" || hash === "#alert-subscription") return "alerts";
    if (hash === "#tracking" || hash === "#tra-cuu") return "tracking";
    if (hash === "#reports" || hash === "#open-data" || hash === "#public-dashboard" || path === "/reports") return "reports";
    // Mặc định: khi chưa đăng nhập, hiển thị Bản đồ WebGIS công cộng
    const token = localStorage.getItem("eco_access_token");
    if (!token) return "map";
    return "rbac";
  });
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(() => {
    return window.location.hash.toLowerCase() === "#notifications";
  });
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | undefined>();
  const [mapCategoryFilter, setMapCategoryFilter] = useState<string>("all");
  const [featuresHubOpen, setFeaturesHubOpen] = useState(() => {
    const h = window.location.hash.toLowerCase();
    return h === "#hub" || h === "#12-chuc-nang" || h === "#features" || h === "#trung-tam";
  });

  const openFeaturesHub = () => {
    setFeaturesHubOpen(true);
    window.location.hash = "#hub";
  };

  const closeFeaturesHub = () => {
    setFeaturesHubOpen(false);
    const h = window.location.hash.toLowerCase();
    if (["#hub", "#12-chuc-nang", "#features", "#trung-tam"].includes(h)) {
      window.location.hash = `#${activeTab}`;
    }
  };

  // Tự động đăng nhập tài khoản Quản trị viên (Minh Quân) khi ở chế độ khách để mở sẵn 12 chức năng
  useEffect(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      loginCitizen({ email: "admin@greenspot.vn", password: "admin123" })
        .then((res) => {
          if (res.success && res.data) {
            localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, res.data.access_token);
            localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, res.data.refresh_token);
            localStorage.setItem(AUTH_STORAGE_KEYS.USER_INFO, JSON.stringify(res.data.user));
            api.defaults.headers.common.Authorization = `Bearer ${res.data.access_token}`;
            resetSessionExpired();
            window.dispatchEvent(new Event("auth_change"));
          }
        })
        .catch(() => {});
    }
  }, []);

  const navigateToFeature = (targetHash: string, targetTab: any) => {
    setActiveTab(targetTab);
    window.location.hash = targetHash;
    setFeaturesHubOpen(false);
  };

  const handleQuickLoginAdmin = async () => {
    try {
      const res = await loginCitizen({ email: "admin@greenspot.vn", password: "admin123" });
      if (res.success && res.data) {
        localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, res.data.access_token);
        localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, res.data.refresh_token);
        localStorage.setItem(AUTH_STORAGE_KEYS.USER_INFO, JSON.stringify(res.data.user));
        api.defaults.headers.common.Authorization = `Bearer ${res.data.access_token}`;
        resetSessionExpired();
        window.dispatchEvent(new Event("auth_change"));
        setActiveTab("challenges");
        window.location.hash = "#challenges";
      }
    } catch {}
  };

  // Hook quản lý tài khoản và quyền hạn thời gian thực (RBAC Permission Guard)
  const { currentUser, canAccess } = usePermissions();
  const hasMapAccess = canAccess("GIS_MAP");
  const hasAqiAccess = canAccess("AIR_QUALITY");
  const hasUserMgmtAccess = currentUser?.role === "ADMIN" || canAccess("USER_MANAGEMENT");
  const hasRbacAccess = currentUser?.role === "ADMIN" || canAccess("ROLE");
  const hasAuditAccess = currentUser?.role === "ADMIN" || canAccess("AUDIT_LOG");

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
      else if (hash === "#auth" || hash === "#login" || hash === "#register" || hash === "#devices") setActiveTab("auth");
      else if (hash === "#users") setActiveTab("users");
      else if (hash === "#rbac") setActiveTab("rbac");
      else if (hash === "#wallet" || hash === "#rewards" || hash === "#policy" || hash === "#catalog" || hash === "#vouchers") setActiveTab("rewards");
      else if (hash === "#challenges") setActiveTab("challenges");
      else if (hash === "#audit-logs" || hash === "#audit") setActiveTab("audit-logs");
      else if (hash === "#handbook" || hash === "#guide") setActiveTab("handbook");
      else if (hash === "#leaderboard" || hash === "#ranking") setActiveTab("leaderboard");
      else if (hash === "#heatmap" || hash === "#climate-map") setActiveTab("heatmap");
      else if (hash === "#qr-scan" || hash === "#qr" || hash === "#scan") setActiveTab("qr-scan");
      else if (hash === "#lucky-wheel" || hash === "#wheel" || hash === "#spin") setActiveTab("lucky-wheel");
      else if (hash === "#milestone" || hash === "#tier-progress" || hash === "#tier") setActiveTab("milestone");
      else if (hash === "#alerts" || hash === "#warning" || hash === "#alert-map" || hash === "#thresholds" || hash === "#sos" || hash === "#alert-subscription") setActiveTab("alerts");
      else if (hash === "#tracking" || hash === "#tra-cuu") setActiveTab("tracking");
      else if (hash === "#reports" || hash === "#open-data" || hash === "#public-dashboard") setActiveTab("reports");
      
      if (hash === "#notifications") {
        setNotificationCenterOpen(true);
      }
      if (hash === "#hub" || hash === "#12-chuc-nang" || hash === "#features" || hash === "#trung-tam") {
        setFeaturesHubOpen(true);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleRelogin = (redirectUrl?: string) => {
    setSessionExpiredOpen(false);
    const target = redirectUrl || window.location.hash || `#${activeTab}`;
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
      window.location.hash &&
      !["#auth", "#login", "#register", "#devices"].includes(window.location.hash.toLowerCase())
    ) {
      raw = window.location.hash;
    }

    setAuthRedirectUrl(undefined);
    const target = raw.trim().toLowerCase();

    // 2. Chuyển hướng chính xác về chức năng đích tương ứng
    if (target.includes("challenges")) {
      setActiveTab("challenges");
      window.location.hash = "#challenges";
    } else if (target.includes("audit")) {
      setActiveTab("audit-logs");
      window.location.hash = "#audit-logs";
    } else if (target.includes("handbook") || target.includes("guide")) {
      setActiveTab("handbook");
      window.location.hash = "#handbook";
    } else if (target.includes("wallet") || target.includes("rewards")) {
      setActiveTab("rewards");
      window.location.hash = "#wallet";
    } else if (target.includes("policy")) {
      setActiveTab("rewards");
      window.location.hash = "#policy";
    } else if (target.includes("catalog")) {
      setActiveTab("rewards");
      window.location.hash = "#catalog";
    } else if (target.includes("voucher")) {
      setActiveTab("rewards");
      window.location.hash = "#vouchers";
    } else if (target.includes("leaderboard") || target.includes("ranking")) {
      setActiveTab("leaderboard");
      window.location.hash = "#leaderboard";
    } else if (target.includes("heatmap") || target.includes("climate")) {
      setActiveTab("heatmap");
      window.location.hash = "#heatmap";
    } else if (target.includes("qr")) {
      setActiveTab("qr-scan");
      window.location.hash = "#qr-scan";
    } else if (target.includes("wheel") || target.includes("lucky") || target.includes("spin")) {
      setActiveTab("lucky-wheel");
      window.location.hash = "#lucky-wheel";
    } else if (target.includes("milestone") || target.includes("tier")) {
      setActiveTab("milestone");
      window.location.hash = "#milestone";
    } else if (target.includes("users")) {
      setActiveTab("users");
      window.location.hash = "#users";
    } else if (target.includes("rbac")) {
      setActiveTab("rbac");
      window.location.hash = "#rbac";
    } else if (target.includes("dashboard")) {
      setActiveTab("dashboard");
      window.location.hash = "#dashboard";
    } else if (target.includes("devices")) {
      setAuthRedirectUrl("/devices");
      setActiveTab("auth");
      window.location.hash = "#devices";
    } else if (target.includes("map")) {
      setActiveTab("map");
      window.location.hash = "#map";
    } else {
      // Nếu không có bất kỳ URL nào được chỉ định trước đó:
      // Phân quyền theo vai trò vừa đăng nhập: ADMIN -> #users, CITIZEN -> #challenges
      try {
        const userRaw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
        const u = userRaw ? JSON.parse(userRaw) : null;
        if (u?.role === "ADMIN") {
          setActiveTab("users");
          window.location.hash = "#users";
        } else {
          setActiveTab("challenges");
          window.location.hash = "#challenges";
        }
      } catch {
        setActiveTab("challenges");
        window.location.hash = "#challenges";
      }
    }
  };

  const handleExitAuth = () => {
    const stored = sessionStorage.getItem("greenspot_target_hash");
    sessionStorage.removeItem("greenspot_target_hash");
    if (stored) {
      handleLoginSuccess(stored);
    } else {
      setActiveTab("map");
      window.location.hash = "#map";
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
      {/* THANH THÔNG BÁO KHẨN CẤP ĐỎ CHẠY CHỮ TOÀN HỆ THỐNG (CHỨC NĂNG 35 - SOS) */}
      <EmergencyMarqueeBanner />

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

            {/* 1. THANH TOPBAR CỐ ĐỊNH CAO CẤP */}
      <header className="app-top-navbar">
        {/* Brand */}
        <div className="navbar-brand" onClick={() => navigateToFeature("#challenges", "challenges")}>
          <div className="brand-logo-icon">🌿</div>
          <div className="brand-text-col">
            <div className="brand-title-row">
              <span className="brand-name">GreenSpot</span>
              <span className="brand-badge">Bùi Nguyễn Minh Quân</span>
            </div>
            <span className="brand-subtitle">Hệ thống Động lực Công dân Xanh & WebGIS (CN 25 → 36)</span>
          </div>
        </div>

        {/* Center Nav & Master Hub Button */}
        <div className="navbar-center-nav">
          <button
            type="button"
            className="btn-open-12-hub"
            onClick={openFeaturesHub}
            title="Mở Bảng điều khiển 12 Chức năng Động lực Xanh & Quản trị"
          >
            <span>⚡</span>
            <span>12 Chức Năng Minh Quân</span>
            <span className="hub-counter-badge">12/12 Sẵn sàng</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${activeTab === "challenges" ? "active" : ""}`}
            onClick={() => navigateToFeature("#challenges", "challenges")}
          >
            <span>🎯</span>
            <span>Thử Thách</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${activeTab === "rewards" ? "active" : ""}`}
            onClick={() => navigateToFeature("#wallet", "rewards")}
          >
            <span>💳</span>
            <span>Ví & Quà</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => navigateToFeature("#leaderboard", "leaderboard")}
          >
            <span>🏆</span>
            <span>Vinh Danh</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${activeTab === "heatmap" ? "active" : ""}`}
            onClick={() => navigateToFeature("#heatmap", "heatmap")}
          >
            <span>🛰️</span>
            <span>Bản Đồ Nhiệt</span>
          </button>

          {hasMapAccess && (
            <button
              type="button"
              className={`nav-link-btn ${activeTab === "map" ? "active" : ""}`}
              onClick={() => navigateToFeature("#map", "map")}
            >
              <span>🗺️</span>
              <span>Bản Đồ GIS</span>
            </button>
          )}

          {hasAqiAccess && (
            <button
              type="button"
              className={`nav-link-btn ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => navigateToFeature("#dashboard", "dashboard")}
            >
              <span>📊</span>
              <span>AQI</span>
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className="navbar-right-controls">
          <NotificationDropdown
            onOpenCenterModal={() => setNotificationCenterOpen(true)}
            onNavigateToAlerts={() => navigateToFeature("#alerts", "alerts")}
          />

          <button
            type="button"
            className="health-badge-btn"
            onClick={() => {
              setShowDrawer((prev) => !prev);
              if (!backendStatus) checkHealth();
            }}
            title="Kiểm tra trạng thái Backend FastAPI"
          >
            <span className={`dot ${backendStatus?.startsWith("Online") ? "online" : "offline"}`} />
            <span>API</span>
          </button>

          {showDrawer && (
            <div className="health-popover">
              <div className="popover-header">
                <strong>Backend Diagnostic</strong>
                <button type="button" className="close-btn" onClick={() => setShowDrawer(false)}>×</button>
              </div>
              <p className="popover-desc">Kiểm tra kết nối microservice FastAPI backend qua axios client.</p>
              <div className="popover-actions">
                <button type="button" className="btn-action" onClick={checkHealth} disabled={checkingBackend}>
                  {checkingBackend ? "Đang ping..." : "Ping /health"}
                </button>
              </div>
              {backendStatus && (
                <div className={`status-pill ${backendStatus.startsWith("Online") ? "success" : "warning"}`}>
                  {backendStatus}
                </div>
              )}
            </div>
          )}

          {currentUser ? (
            <div className="user-profile-nav-wrapper" ref={userMenuRef}>
              <button
                type="button"
                className={`user-nav-btn ${userDropdownOpen ? "menu-open" : ""}`}
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                title="Tài khoản công dân / Quản trị viên"
              >
                <span className="user-avatar-icon">👤</span>
                <span className="user-display-name">{currentUser.full_name || "Bùi Nguyễn Minh Quân"}</span>
                <span className="user-status-dot" title="Đang hoạt động">🟢</span>
                <span className="user-nav-arrow">{userDropdownOpen ? "▴" : "▾"}</span>
              </button>

              {userDropdownOpen && (
                <div className="user-nav-dropdown">
                  <div className="dropdown-user-info">
                    <div className="dropdown-avatar">🌱</div>
                    <div className="dropdown-user-details">
                      <strong className="user-name">{currentUser.full_name || "Bùi Nguyễn Minh Quân"}</strong>
                      <span className="user-email">{currentUser.email}</span>
                      <span className="user-role-badge">
                        {currentUser.role === "ADMIN" ? "Quản trị viên (Admin)" : "Công dân số"}
                      </span>
                    </div>
                  </div>

                  <div className="dropdown-separator" />

                  {hasUserMgmtAccess && (
                    <button
                      type="button"
                      className="dropdown-menu-action"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigateToFeature("#users", "users");
                      }}
                    >
                      <span className="action-icon">👥</span>
                      <span>Quản lý người dùng</span>
                    </button>
                  )}
                  {hasRbacAccess && (
                    <button
                      type="button"
                      className="dropdown-menu-action"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigateToFeature("#rbac", "rbac");
                      }}
                    >
                      <span className="action-icon">🛡️</span>
                      <span>Phân quyền vai trò RBAC</span>
                    </button>
                  )}
                  {hasAuditAccess && (
                    <button
                      type="button"
                      className="dropdown-menu-action"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigateToFeature("#audit-logs", "audit-logs");
                      }}
                    >
                      <span className="action-icon">📋</span>
                      <span>Nhật ký kiểm toán Audit</span>
                    </button>
                  )}
                  {(hasUserMgmtAccess || hasRbacAccess || hasAuditAccess) && (
                    <div className="dropdown-separator" />
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
              className="btn-quick-login-admin"
              onClick={handleQuickLoginAdmin}
              title="Đăng nhập ngay tài khoản Admin Minh Quân (1 Click)"
            >
              <span>⚡</span>
              <span>Đăng Nhập Minh Quân</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. THANH LỐI TẮT DOCK BAR: ĐẦY ĐỦ 12 CHỨC NĂNG (CN 25 → CN 36) */}
      <nav className="quick-dock-bar" aria-label="12 Chức năng Minh Quân">
        <div className="dock-inner-track">
          <span className="dock-label-pill">12 CHỨC NĂNG:</span>
          {FEATURES_12_LIST.map((f) => {
            const isCurrentActive =
              activeTab === f.tab &&
              (f.hash === window.location.hash ||
                (f.tab === "challenges" && window.location.hash.includes("challenges")) ||
                (f.tab === "audit-logs" && window.location.hash.includes("audit")) ||
                (f.tab === "handbook" && window.location.hash.includes("handbook")));

            return (
              <button
                key={f.code}
                type="button"
                className={`dock-item-btn ${isCurrentActive ? "active" : ""}`}
                onClick={() => navigateToFeature(f.hash, f.tab)}
                title={`${f.code} - ${f.title}: ${f.desc}`}
              >
                <span className="dock-cn-tag">{f.code}</span>
                <span>{f.icon}</span>
                <span>{f.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. MODAL TRUNG TÂM 12 CHỨC NĂNG (INTERACTIVE HUB) */}
      {featuresHubOpen && (
        <div className="features-hub-modal-overlay" onClick={closeFeaturesHub}>
          <div className="features-hub-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="hub-dialog-header">
              <div className="hub-dialog-header-left">
                <div className="brand-logo-icon">🌿</div>
                <div>
                  <h2>Trung Tâm 12 Chức Năng Bùi Nguyễn Minh Quân</h2>
                  <p>Phân hệ Động Lực Công Dân Xanh, Kinh Tế Điểm Thưởng & WebGIS (Chức năng 25 → 36)</p>
                </div>
              </div>
              <button type="button" className="hub-dialog-close" onClick={closeFeaturesHub}>
                ✕
              </button>
            </div>

            <div className="hub-dialog-body">
              {["🎮 Gamification & Thử Thách", "💎 Kinh Tế Điểm Thưởng (Eco-Tokenomics)", "🌐 Cộng Đồng & Dân Sinh", "🛡️ An Ninh & Kiểm Toán"].map(
                (grp) => (
                  <div key={grp} className="hub-category-group">
                    <div className="hub-group-title">
                      <span>{grp}</span>
                    </div>
                    <div className="hub-cards-grid">
                      {FEATURES_12_LIST.filter((f) => f.group === grp).map((f) => {
                        const isCurrentActive = activeTab === f.tab;
                        return (
                          <div
                            key={f.code}
                            className={`hub-feature-card ${isCurrentActive ? "is-active" : ""}`}
                            onClick={() => navigateToFeature(f.hash, f.tab)}
                          >
                            <div className="hub-card-header">
                              <span className="hub-cn-code">{f.code}</span>
                              <span className="hub-feature-icon">{f.icon}</span>
                            </div>
                            <div className="hub-card-title">{f.title}</div>
                            <div className="hub-card-desc">{f.desc}</div>
                            <div className="hub-card-footer">
                              <span className="hub-hash-url">{f.hash}</span>
                              <span className="hub-launch-arrow">Mở ngay ➔</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW NỘI DUNG CHÍNH: AUTH, RBAC, MAP HOẶC DASHBOARD */}
      {activeTab === "auth" ? (
        <div className="app-content-viewport">
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
      ) : activeTab === "rbac" ? (
        <div className="app-content-viewport">
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
      ) : activeTab === "users" ? (
        <div className="app-content-viewport">
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
      ) : activeTab === "rewards" ? (
        <div className="app-content-viewport">
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
        <div className="app-content-viewport">
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
        <div className="app-content-viewport">
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
        <div className="app-content-viewport">
          <WasteHandbookContainer
            onBackToHome={() => {
              setActiveTab("map");
              window.location.hash = "#map";
            }}
            onNavigateToMap={(facilityType) => {
              setMapCategoryFilter(facilityType || "recycling");
              setActiveTab("map");
              window.location.hash = "#map";
            }}
          />
        </div>
      ) : activeTab === "leaderboard" ? (
        <div className="app-content-viewport">
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
        <div className="app-content-viewport" style={{ background: "#0b0f19" }}>
          <MultiModeHeatmapContainer
            onNavigateDistrictReport={(_districtCode) => {
              setActiveTab("map");
              window.location.hash = "#map";
            }}
          />
        </div>
      ) : activeTab === "qr-scan" ? (
        <div className="app-content-viewport">
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
        <div className="app-content-viewport">
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
        <div className="app-content-viewport">
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
      ) : activeTab === "alerts" ? (
        <div className="app-content-viewport" style={{ background: "#0f172a" }}>
          <AlertManagementContainer />
        </div>
      ) : activeTab === "tracking" ? (
        <div className="app-content-viewport" style={{ background: "#0b1120" }}>
          <PublicTrackingContainer />
        </div>
      ) : activeTab === "reports" ? (
        <div className="app-content-viewport" style={{ background: "#0b1120" }}>
          <ReportsContainer />
        </div>
      ) : activeTab === "map" ? (
        <div className="app-content-viewport map-view">
        <ModulePermissionGuard
          moduleCode="GIS_MAP"
          moduleName="Bản đồ số WebGIS"
        >
          <EcoMap initialCategory={mapCategoryFilter as any} />
        </ModulePermissionGuard>
        </div>
      ) : (
        <div className="app-content-viewport map-view">
        <ModulePermissionGuard
          moduleCode="AIR_QUALITY"
          moduleName="Chỉ số chất lượng không khí AQI & Khí hậu"
        >
          <AirQualityDashboard onBackToMap={() => setActiveTab("map")} />
        </ModulePermissionGuard>
        </div>
      )}



      {/* MODAL TRUNG TÂM THÔNG BÁO HỘP THƯ ĐẦY ĐỦ (CHỨC NĂNG 29) */}
      <NotificationCenterModal
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />

      {/* NÚT KHẨN CẤP SOS CỨU NẠN MÔI TRƯỜNG NỔI TOÀN HỆ THỐNG (CHỨC NĂNG 35) */}
      <FloatingSOSButton />
    </div>
  );
}

export default App;
