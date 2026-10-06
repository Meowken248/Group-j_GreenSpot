import React from "react";
import type { IModuleViewLockedViewProps } from "../types/permissionGuard.interface";
import { usePermissions } from "../services/permissionGuard";

export const ModuleViewLockedView: React.FC<IModuleViewLockedViewProps> = ({
  moduleCode,
  moduleName,
  onNavigateHome,
  onNavigateToAuth,
}) => {
  const { currentUser } = usePermissions();

  const handleHomeClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.location.hash = "#map";
    }
  };

  const handleAuthClick = () => {
    if (onNavigateToAuth) {
      onNavigateToAuth();
    } else {
      window.location.hash = "#auth";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "75vh",
        padding: "40px 24px",
        backgroundColor: "#f8fafc",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "580px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.02)",
          padding: "44px 36px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dải trang trí trên đỉnh */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, #f59e0b, #d97706, #3b82f6)",
          }}
        />

        {/* Biểu tượng khóa xem tinh tế */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "#fef3c7",
            border: "2px solid #fde68a",
            color: "#d97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "34px",
            margin: "0 auto 24px auto",
            boxShadow: "0 8px 16px -4px rgba(245, 158, 11, 0.2)",
          }}
        >
          👁️‍🗨️
        </div>

        {/* Tiêu đề & Mã định danh */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "9999px",
              backgroundColor: "#fef3c7",
              color: "#b45309",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Chế độ khóa xem (View-Restricted)
          </span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "9999px",
              backgroundColor: "#f1f5f9",
              color: "#475569",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "monospace",
            }}
          >
            {moduleCode}
          </span>
        </div>

        <h2
          style={{
            fontSize: "23px",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Dữ Liệu Đang Bị Khóa Xem
        </h2>

        <p
          style={{
            fontSize: "14.5px",
            color: "#64748b",
            lineHeight: 1.65,
            margin: "0 0 24px 0",
          }}
        >
          Tài khoản {currentUser?.email ? (<strong>{currentUser.email}</strong>) : "của bạn"} đã được cấp quyền{" "}
          <strong style={{ color: "#059669" }}>TRUY CẬP (ACCESS)</strong> vào phân hệ{" "}
          <strong style={{ color: "#0f172a" }}>{moduleName}</strong>, nhưng chưa có quyền{" "}
          <strong style={{ color: "#dc2626" }}>XEM (VIEW)</strong> để giải mã và hiển thị dữ liệu chi tiết.
        </p>

        {/* Khối tóm tắt trạng thái phân quyền */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "24px",
            textAlign: "left",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Quyền Truy Cập (ACCESS)
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
              ✅ Đã được cấp quyền
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Quyền Đọc Dữ Liệu (VIEW)
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#dc2626", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
              🔒 Chưa được cấp quyền
            </div>
          </div>
        </div>

        {/* Hộp giải thích chính sách bảo mật RBAC */}
        <div
          style={{
            padding: "14px 18px",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "12px",
            fontSize: "13px",
            color: "#92400e",
            textAlign: "left",
            marginBottom: "32px",
            lineHeight: 1.55,
          }}
        >
          💡 <strong>Nguyên lý bảo vệ 3 tầng RBAC:</strong> Để ngăn chặn rò rỉ dữ liệu nhạy cảm, GreenSpot tách biệt quyền mở đường link (ACCESS) và quyền hiển thị nội dung (VIEW). Vui lòng liên hệ Quản trị viên để được bật quyền <strong>XEM ({moduleCode}:VIEW)</strong>.
        </div>

        {/* Các nút điều hướng */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={handleHomeClick}
            style={{
              padding: "11px 22px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            ← Về bản đồ WebGIS
          </button>

          <button
            type="button"
            onClick={handleAuthClick}
            style={{
              padding: "11px 22px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#0284c7",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            🔐 Đăng nhập tài khoản khác
          </button>
        </div>
      </div>
    </div>
  );
};
