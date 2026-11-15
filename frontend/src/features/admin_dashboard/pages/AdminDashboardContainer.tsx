/**
 * Admin Dashboard Container (Trang Quản Trị Hệ Thống Toàn Diện - STT 48)
 *
 * File   : FrontEnd/src/features/admin_dashboard/pages/AdminDashboardContainer.tsx
 * Chức năng:
 *   - Quản lý điều hướng 3 màn hình cốt lõi:
 *       1. Màn 1: Tổng quan Dashboard (ActivityDashboard - 3 KPI Cards, Multi-line Chart, Lọc 7/30/tuỳ chọn)
 *       2. Màn 2: Báo cáo chi tiết theo ngày (DailyActivityTable - Bộ lọc, Bảng số liệu, Thao tác xuất)
 *       3. Màn 3: Popup Xuất thống kê (ExportModal - Excel / PDF)
 *   - Quản trị khung giao diện chuẩn (Header, Navigation Tabs, Notifications, Avatar, Footer)
 *   - Hiển thị Toast thông báo khi tải xuất file hoàn tất
 */

import React, { useState } from "react";
import { ActivityDashboard } from "../components/ActivityDashboard";
import { DailyActivityTable } from "../components/DailyActivityTable";
import { ExportModal } from "../components/ExportModal";
import "../styles/dashboard.scss";

export type AdminDashboardView = "overview" | "detailed_table";

export interface AdminDashboardContainerProps {
  initialView?: AdminDashboardView;
  onNavigateHome?: () => void;
}

export const AdminDashboardContainer: React.FC<AdminDashboardContainerProps> = ({
  initialView = "overview",
  onNavigateHome,
}) => {
  const [currentView, setCurrentView] = useState<AdminDashboardView>(initialView);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportRange, setExportRange] = useState<{ fromDate: string; toDate: string }>({
    fromDate: "",
    toDate: "",
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleOpenExport = (from?: string, to?: string) => {
    const today = new Date().toISOString().split("T")[0];
    let defaultFrom = "";
    if (from) {
      defaultFrom = from;
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      defaultFrom = d.toISOString().split("T")[0];
    }
    setExportRange({
      fromDate: defaultFrom,
      toDate: to || today,
    });
    setIsExportModalOpen(true);
  };

  const navigateToModule = (path: string) => {
    setIsAdminMenuOpen(false);
    window.history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div className="adm-dash" data-testid="admin-dashboard-container">
      {/* ── HEADER KHUNG QUẢN TRỊ ─────────────────────────────────────────── */}
      <header className="adm-dash__header">
        <div
          className="adm-dash__header-brand"
          style={{ cursor: "pointer" }}
          onClick={() => {
            if (onNavigateHome) onNavigateHome();
            else {
              window.history.pushState(null, "", "/map");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
          }}
          title="Về bản đồ số WebGIS"
        >
          <div className="logo-icon">🌱</div>
          <div className="brand-titles">
            <h1>HỆ THỐNG GIÁM SÁT MÔI TRƯỜNG GREENSPOT</h1>
            <span>Bảng điều khiển quản trị tổng thể — Ban Giám đốc &amp; Admin cấp cao</span>
          </div>
        </div>

        {/* Menu Điều Hướng Tab */}
        <nav className="adm-dash__header-nav" aria-label="Điều hướng bảng quản trị">
          <button
            type="button"
            id="tab-btn-overview"
            data-testid="tab-btn-overview"
            className={`nav-btn ${currentView === "overview" ? "nav-btn--active" : ""}`}
            onClick={() => setCurrentView("overview")}
          >
            📊 Tổng quan
          </button>
          <button
            type="button"
            id="tab-btn-detailed-table"
            data-testid="tab-btn-detailed-table"
            className={`nav-btn ${currentView === "detailed_table" ? "nav-btn--active" : ""}`}
            onClick={() => setCurrentView("detailed_table")}
          >
            📋 Báo cáo chi tiết
          </button>
          <button
            type="button"
            id="tab-btn-direct-export"
            data-testid="tab-btn-direct-export"
            className="nav-btn"
            onClick={() => handleOpenExport()}
          >
            📥 Xuất thống kê
          </button>
          {/* Nút mở Menu quản trị liên kết STT 37->48 */}
          <button
            type="button"
            id="btn-admin-menu-toggle"
            data-testid="btn-admin-menu-toggle"
            className={`nav-btn ${isAdminMenuOpen ? "nav-btn--active" : ""}`}
            style={{ border: "1px solid rgba(16, 185, 129, 0.4)" }}
            onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
            title="Mở danh mục phân hệ quản trị"
          >
            🧭 Menu quản trị ▾
          </button>
        </nav>

        {/* Thông báo & Avatar */}
        <div className="adm-dash__header-controls">
          <button
            type="button"
            className="bell-btn"
            aria-label="Thông báo hệ thống"
            title="Thông báo hệ thống mới nhất"
            onClick={() => {
              showToast("Hệ thống hoạt động bình thường. 3 trạm quan trắc tự động kết nối ổn định.");
            }}
          >
            🔔
            <span className="badge" />
          </button>
          <div className="avatar-box" title="Tài khoản Quản trị viên cấp cao">
            <div className="av-img">QT</div>
            <div className="av-meta">
              <div className="av-name">Quản trị viên</div>
              <div className="av-role">Admin cấp cao</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── DROPDOWN MENU QUẢN TRỊ LIÊN KẾT ── */}
      {isAdminMenuOpen && (
        <div
          data-testid="admin-modules-dropdown"
          style={{
            position: "absolute",
            top: "68px",
            right: "24px",
            zIndex: 999,
            background: "rgba(15, 23, 42, 0.96)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: "14px",
            padding: "16px",
            boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
            width: "360px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            animation: "slideUpModal 0.2s ease",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#10b981",
              textTransform: "uppercase",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>DANH MỤC PHÂN HỆ QUẢN TRỊ</span>
            <span
              style={{ cursor: "pointer", color: "#64748b", fontSize: "1rem" }}
              onClick={() => setIsAdminMenuOpen(false)}
            >
              ✕
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              maxHeight: "380px",
              overflowY: "auto",
            }}
          >
            {[
              { label: "Thống kê hoạt động hệ thống", icon: "📈", path: "/admin/activity-dashboard" },
              { label: "Xuất dữ liệu sự cố (Excel/PDF)", icon: "📊", path: "/reports/incident-export" },
              { label: "Cứu hộ ngập lụt (Flood SOS)", icon: "🆘", path: "/emergency/flood-sos" },
              { label: "Cảnh báo khẩn cấp & điểm danh", icon: "🚨", path: "/emergency/alerts" },
              { label: "Dự báo điểm nóng môi trường", icon: "🔥", path: "/analytics/hotspots" },
              { label: "Điều phối hiện trường & lực lượng", icon: "🚚", path: "/operations/dispatch" },
              { label: "Bảng điều khiển rủi ro đô thị", icon: "🛡️", path: "/analytics/urban-risk" },
              { label: "Lộ trình di chuyển tránh ngập", icon: "🧭", path: "/navigation/safe-route" },
              { label: "AI Triage phân loại sự cố", icon: "🤖", path: "/incidents/ai-triage" },
              { label: "Bản đồ số WebGIS cơ sở", icon: "🗺️", path: "/map" },
              { label: "Trợ lý giọng nói ảo rảnh tay", icon: "🎙️", path: "/assistant/voice" },
            ].map((mod) => (
              <button
                key={mod.path}
                type="button"
                className="filter-btn"
                style={{
                  height: "36px",
                  fontSize: "0.78rem",
                  justifyContent: "flex-start",
                  padding: "0 10px",
                  background: mod.path === "/admin/activity-dashboard" ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  color: mod.path === "/admin/activity-dashboard" ? "#10b981" : "#f1f5f9",
                  border: "none",
                }}
                onClick={() => navigateToModule(mod.path)}
              >
                <span style={{ marginRight: "6px" }}>{mod.icon}</span>
                <span>{mod.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── BODY NỘI DUNG CHÍNH ───────────────────────────────────────────── */}
      <div className="adm-dash__body">
        {/* Breadcrumb điều hướng không ngõ cụt */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.75rem",
            color: "#64748b",
            marginBottom: "12px",
          }}
        >
          <a
            href="#map"
            style={{ color: "#94a3b8", textDecoration: "none" }}
            onClick={(e) => {
              e.preventDefault();
              navigateToModule("#map");
            }}
          >
            🏠 Trang chủ WebGIS
          </a>
          <span>❯</span>
          <span style={{ color: "#94a3b8" }}>Quản trị hệ thống</span>
          <span>❯</span>
          <span style={{ color: "#10b981", fontWeight: 600 }}>Thống kê hoạt động</span>
        </div>
        {/* Banner thông báo Toast nếu xuất tệp thành công */}
        {toastMessage && (
          <div
            style={{
              padding: "12px 20px",
              marginBottom: "16px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#34d399",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              animation: "fadeInOverlay 0.3s ease",
            }}
          >
            <span>✅</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="adm-dash__page-header">
          <div className="page-title">
            {currentView === "overview"
              ? "THỐNG KÊ HOẠT ĐỘNG HỆ THỐNG"
              : "BẢNG SỐ LIỆU HOẠT ĐỘNG CHI TIẾT THEO NGÀY"}
            <span className="title-badge">LIVE</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {currentView === "overview" && (
              <button
                type="button"
                id="btn-switch-to-table"
                className="filter-btn"
                style={{ height: "36px", padding: "0 16px" }}
                onClick={() => setCurrentView("detailed_table")}
              >
                📋 Xem dạng bảng chi tiết →
              </button>
            )}
            {currentView === "detailed_table" && (
              <button
                type="button"
                id="btn-switch-to-chart"
                className="filter-btn"
                style={{ height: "36px", padding: "0 16px" }}
                onClick={() => setCurrentView("overview")}
              >
                ← 📊 Xem biểu đồ trực quan
              </button>
            )}
          </div>
        </div>

        {/* Nội dung tương ứng với Tab */}
        {currentView === "overview" ? (
          <ActivityDashboard
            standalone={false}
            onNavigateTable={() => setCurrentView("detailed_table")}
          />
        ) : (
          <DailyActivityTable
            initialFromDate={exportRange.fromDate}
            initialToDate={exportRange.toDate}
            onOpenExport={(from, to) => handleOpenExport(from, to)}
          />
        )}
      </div>

      {/* ── FOOTER BẢN QUYỀN VÀ LIÊN HỆ ───────────────────────────────────── */}
      <footer className="adm-dash__footer">
        <span>© 2026 GreenSpot. Nền tảng Đô thị Môi trường Thông minh TP.HCM</span>
        <div className="footer-links">
          <a href="#contact">Liên hệ hỗ trợ</a>
          <a href="#privacy">Chính sách bảo mật</a>
          <a href="#terms">Điều khoản sử dụng</a>
        </div>
      </footer>

      {/* ──  MODAL POPUP XUẤT THỐNG KÊ ────────────────────────────── */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        fromDate={exportRange.fromDate}
        toDate={exportRange.toDate}
        onSuccess={() => {
          showToast(
            `Đã xuất và tải xuống báo cáo thống kê (${exportRange.fromDate} đến ${exportRange.toDate}) thành công!`
          );
        }}
      />
    </div>
  );
};

export default AdminDashboardContainer;
