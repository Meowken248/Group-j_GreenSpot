import React, { useState, useEffect, useRef } from "react";
import { RoleListPage } from "./pages/RoleListPage";
import { CreateRolePage } from "./pages/CreateRolePage";
import { RolePermissionMatrixPage } from "./pages/RolePermissionMatrixPage";
import { AUTH_STORAGE_KEYS } from "../auth/types/auth.types";
import "./styles/RbacContainer.scss";

export type RbacViewMode = "list" | "create" | "matrix";

interface RbacContainerProps {
  initialView?: RbacViewMode;
  initialRoleId?: number;
  onExit?: () => void;
}

interface ToastState {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

export const RbacContainer: React.FC<RbacContainerProps> = ({
  initialView = "list",
  initialRoleId,
  onExit,
}) => {
  const [currentView, setCurrentView] = useState<RbacViewMode>(initialView);
  const [matrixTargetRoleId, setMatrixTargetRoleId] = useState<number | undefined>(initialRoleId);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const toastCounterRef = useRef(0);

  // Lấy thông tin người dùng từ localStorage
  const currentUser = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    const id = ++toastCounterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Tự động tắt sau 3.5 giây (hoặc 5 giây với thông báo lỗi)
    const duration = type === "error" ? 5000 : 3500;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // PHÂN QUYỀN TRANG: Chỉ Admin mới được truy cập
  useEffect(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    const role = currentUser?.role;

    if (!token || role !== "ADMIN") {
      showToast("Bạn không có quyền truy cập trang này", "error");
      const timer = setTimeout(() => {
        if (onExit) onExit();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser, onExit]);

  return (
    <div className="rbac-master-container">
      {/* HEADER QUẢN TRỊ BỐ CỤC CHUẨN */}
      <header className="rbac-top-header" role="banner">
        <div className="header-brand-group" onClick={() => setCurrentView("list")}>
          <span className="brand-icon" aria-hidden="true">🌱</span>
          <div className="brand-text">
            <span className="brand-name">Green<span>Spot</span></span>
            <span className="brand-sub">Quản Trị Hệ Thống</span>
          </div>
          <span className="admin-tag">RBAC</span>
        </div>

        <nav className="header-nav-links" aria-label="Điều hướng phân quyền">
          <button
            type="button"
            className={`nav-tab-link ${currentView === "list" ? "active" : ""}`}
            onClick={() => setCurrentView("list")}
          >
            📋 Danh sách vai trò
          </button>
          <button
            type="button"
            className={`nav-tab-link ${currentView === "create" ? "active" : ""}`}
            onClick={() => setCurrentView("create")}
          >
            ➕ Thêm vai trò
          </button>
          <button
            type="button"
            className={`nav-tab-link ${currentView === "matrix" ? "active" : ""}`}
            onClick={() => setCurrentView("matrix")}
          >
            📊 Ma trận quyền
          </button>
        </nav>

        <div className="header-user-actions">
          <button
            type="button"
            className="btn-header-bell"
            title="Thông báo quản trị"
            aria-label="Thông báo quản trị"
          >
            <span aria-hidden="true">🔔</span>
            <span className="bell-dot" />
          </button>

          <div className="user-capsule-badge" title="Tài khoản Quản trị viên">
            <span className="user-avatar-mini" aria-hidden="true">🛡️</span>
            <span>{currentUser?.full_name || "Quản trị viên"}</span>
          </div>

          {onExit && (
            <button
              type="button"
              className="btn-exit-admin"
              onClick={onExit}
              title="Quay lại Bản đồ số WebGIS"
            >
              ← Về bản đồ
            </button>
          )}
        </div>
      </header>

      {/* TOAST THÔNG BÁO NỔI */}
      <div className="rbac-toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`rbac-toast ${t.type}`} role="alert">
            <span className="toast-icon">
              {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "⚠️"}
            </span>
            <span className="toast-msg">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(t.id)}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* NỘI DUNG MÀN HÌNH TƯƠNG ỨNG */}
      <main className="rbac-main-content">
        {currentView === "list" && (
          <RoleListPage
            onNavigateToCreate={() => setCurrentView("create")}
            onNavigateToMatrix={(roleId) => {
              setMatrixTargetRoleId(roleId);
              setCurrentView("matrix");
            }}
            onUnauthorized={onExit}
            showToast={showToast}
          />
        )}

        {currentView === "create" && (
          <CreateRolePage
            onBackToList={() => setCurrentView("list")}
            onRoleCreated={(newRoleId) => {
              setMatrixTargetRoleId(newRoleId);
              setCurrentView("matrix");
            }}
            showToast={showToast}
          />
        )}

        {currentView === "matrix" && (
          <RolePermissionMatrixPage
            initialRoleId={matrixTargetRoleId}
            onBackToList={() => setCurrentView("list")}
            showToast={showToast}
          />
        )}
      </main>

      {/* FOOTER CHUẨN ĐẶC TẢ */}
      <footer className="rbac-footer" role="contentinfo">
        <div className="footer-content">
          <div className="footer-copy">
            © 2026 GreenSpot. Nền tảng Thành phố Thông minh & Môi trường Sinh thái Số.
          </div>
          <div className="footer-links">
            <a href="#privacy">Chính sách bảo mật</a>
            <a href="#terms">Điều khoản sử dụng</a>
            <a href="#support">Hỗ trợ kỹ thuật 24/7</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
