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
import api from "./api/client";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState<
    "map" | "dashboard" | "auth" | "rbac" | "users" | "rewards" | "challenges" | "audit-logs" | "handbook" | "leaderboard" | "heatmap" | "qr-scan" | "lucky-wheel" | "milestone"
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
    // Mặc định: khi chưa đăng nhập, hiển thị Bản đồ WebGIS công cộng
    const token = localStorage.getItem("eco_access_token");
    if (!token) return "map";
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
                    setActiveTab("rewards");
                    window.location.hash = "#wallet";
                  }}
                >
                  <span className="action-icon">💳</span>
                  <span>Ví Điểm Thưởng & Danh Hiệu</span>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setActiveTab("challenges");
                    window.location.hash = "#challenges";
                  }}
                >
                  <span className="action-icon">🎯</span>
                  <span>Thử Thách Xanh Trong Tuần</span>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setActiveTab("handbook");
                    window.location.hash = "#handbook";
                  }}
                >
                  <span className="action-icon">📖</span>
                  <span>Cẩm Nang Phân Loại Rác</span>
                </button>

                {hasAuditAccess && (
                  <button
                    type="button"
                    className="dropdown-menu-action"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setActiveTab("audit-logs");
                      window.location.hash = "#audit-logs";
                    }}
                  >
                    <span className="action-icon">📜</span>
                    <span>Nhật Ký Kiểm Toán (Audit Log)</span>
                  </button>
                )}

                <button
                  type="button"
                  className="dropdown-menu-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setActiveTab("leaderboard");
                    window.location.hash = "#leaderboard";
                  }}
                >
                  <span className="action-icon">🏆</span>
                  <span>Bảng Xếp Hạng Công Dân Xanh</span>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setActiveTab("heatmap");
                    window.location.hash = "#heatmap";
                  }}
                >
                  <span className="action-icon">🛰️</span>
                  <span>Bản Đồ Nhiệt Môi Trường (GIS)</span>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setActiveTab("qr-scan");
                    window.location.hash = "#qr-scan";
                  }}
                >
                  <span className="action-icon">📷</span>
                  <span>Quét Mã QR Nhận Điểm</span>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setActiveTab("lucky-wheel");
                    window.location.hash = "#lucky-wheel";
                  }}
                >
                  <span className="action-icon">🎡</span>
                  <span>Vòng Quay May Mắn Mỗi Ngày</span>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-action"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setActiveTab("milestone");
                    window.location.hash = "#milestone";
                  }}
                >
                  <span className="action-icon">🏅</span>
                  <span>Lộ Trình Danh Hiệu</span>
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

            {hasAuditAccess && (
              <button
                type="button"
                className={`view-tab-btn ${activeTab === "audit-logs" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("audit-logs");
                  window.location.hash = "#audit-logs";
                }}
                title="Nhật ký kiểm toán an ninh Audit Log (Chức năng 26)"
              >
                <span>📜</span>
                <span>Nhật ký kiểm toán</span>
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
              className={`view-tab-btn ${activeTab === "challenges" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("challenges");
                window.location.hash = "#challenges";
              }}
              title="Thử thách xanh trong tuần nhận điểm thưởng (Chức năng 25)"
            >
              <span>🎯</span>
              <span>Thử thách tuần</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "handbook" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("handbook");
                window.location.hash = "#handbook";
              }}
              title="Thư viện sống xanh: Cẩm nang phân loại rác (Chức năng 27)"
            >
              <span>📖</span>
              <span>Cẩm nang sống xanh</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "rewards" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("rewards");
                window.location.hash = "#wallet";
              }}
              title="Ví điểm, Quà tặng & Voucher Công dân Xanh (Chức năng 28, 29, 30 & 31)"
            >
              <span>🌱</span>
              <span>Ví & Quà Tặng Xanh</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("leaderboard");
                window.location.hash = "#leaderboard";
              }}
              title="Bảng xếp hạng vinh danh Top Công dân Xanh (Chức năng 32)"
            >
              <span>🏆</span>
              <span>Bảng vinh danh</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "heatmap" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("heatmap");
                window.location.hash = "#heatmap";
              }}
              title="Bản đồ nhiệt môi trường & khí hậu đa chế độ (Chức năng 33)"
            >
              <span>🛰️</span>
              <span>Bản đồ nhiệt</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "qr-scan" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("qr-scan");
                window.location.hash = "#qr-scan";
              }}
              title="Quét mã QR nhận điểm tại trạm tái chế & sự kiện (Chức năng 34)"
            >
              <span>📷</span>
              <span>Quét mã QR</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "lucky-wheel" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("lucky-wheel");
                window.location.hash = "#lucky-wheel";
              }}
              title="Vòng quay may mắn hằng ngày nhận điểm & huy hiệu (Chức năng 35)"
            >
              <span>🎡</span>
              <span>Vòng quay may mắn</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === "milestone" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("milestone");
                window.location.hash = "#milestone";
              }}
              title="Lộ trình thăng cấp danh hiệu Công dân Xanh (Chức năng 36)"
            >
              <span>🏅</span>
              <span>Danh hiệu</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("leaderboard");
                window.location.hash = "#leaderboard";
              }}
              title="Bảng xếp hạng vinh danh Top Công dân Xanh (Chức năng 32)"
            >
              <span>🏆</span>
              <span>Bảng vinh danh</span>
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "heatmap" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("heatmap");
                window.location.hash = "#heatmap";
              }}
              title="Bản đồ nhiệt môi trường & khí hậu đa chế độ (Chức năng 33)"
            >
              <span>🛰️</span>
              <span>Bản đồ nhiệt</span>
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "qr-scan" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("qr-scan");
                window.location.hash = "#qr-scan";
              }}
              title="Quét mã QR nhận điểm (Chức năng 34)"
            >
              <span>📷</span>
              <span>Quét mã QR</span>
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "lucky-wheel" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("lucky-wheel");
                window.location.hash = "#lucky-wheel";
              }}
              title="Vòng quay may mắn hằng ngày (Chức năng 35)"
            >
              <span>🎡</span>
              <span>Vòng quay may mắn</span>
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "milestone" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("milestone");
                window.location.hash = "#milestone";
              }}
              title="Lộ trình thăng cấp danh hiệu Công dân Xanh (Chức năng 36)"
            >
              <span>🏅</span>
              <span>Danh hiệu</span>
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "challenges" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("challenges");
                window.location.hash = "#challenges";
              }}
              title="Thử thách xanh trong tuần (Chức năng 25)"
            >
              <span>🎯</span>
              <span>Thử thách tuần</span>
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "handbook" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("handbook");
                window.location.hash = "#handbook";
              }}
              title="Thư viện sống xanh: Cẩm nang phân loại rác (Chức năng 27)"
            >
              <span>📖</span>
              <span>Cẩm nang sống xanh</span>
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === "rewards" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("rewards");
                window.location.hash = "#policy";
              }}
              title="Quy chuẩn tích lũy điểm thưởng Công dân Xanh (Chức năng 28)"
            >
              <span>🌱</span>
              <span>Điểm Thưởng Xanh</span>
            </button>
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
          </>
        )}
      </nav>

      {/* VIEW NỘI DUNG CHÍNH: AUTH, RBAC, MAP HOẶC DASHBOARD */}
      {activeTab === "auth" ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
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
      ) : activeTab === "rewards" ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
          <RewardsContainer
            onBackToHome={() => {
              setActiveTab("map");
              window.location.hash = "#map";
            }}
            onNavigateToAuth={() => {
              setAuthRedirectUrl("/wallet");
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
              setAuthRedirectUrl("/milestone");
              setActiveTab("auth");
              window.location.hash = "#login";
            }}
          />
        </div>
      ) : activeTab === "map" ? (
        <ModulePermissionGuard
          moduleCode="GIS_MAP"
          moduleName="Bản đồ số WebGIS"
        >
          <EcoMap />
        </ModulePermissionGuard>
      ) : (
        <ModulePermissionGuard
          moduleCode="AIR_QUALITY"
          moduleName="Chỉ số chất lượng không khí AQI & Khí hậu"
        >
          <AirQualityDashboard onBackToMap={() => setActiveTab("map")} />
        </ModulePermissionGuard>
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
