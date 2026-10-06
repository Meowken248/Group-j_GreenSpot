import React from "react";
import type { IModulePermissionGuardProps } from "../types/permissionGuard.interface";
import { useModulePermissions, usePermissions } from "../services/permissionGuard";
import { ModuleViewLockedView } from "./ModuleViewLockedView";
import { AccessDeniedView } from "../../../components/AccessDeniedView";

/**
 * Khung bảo vệ đa phân hệ RBAC (Universal RBAC Guard Component)
 * - Tầng 1: Thiếu quyền ACCESS -> Chặn truy cập (403 Forbidden) qua AccessDeniedView
 * - Tầng 2: Có ACCESS nhưng thiếu VIEW -> Hiển thị ModuleViewLockedView (hoặc fallbackLockedView tùy chọn)
 * - Tầng 3: Có cả ACCESS và VIEW -> Render nội dung bên trong, truyền đối tượng perms qua Render Props
 */
export const ModulePermissionGuard: React.FC<IModulePermissionGuardProps> = ({
  moduleCode,
  moduleName,
  fallbackLockedView,
  children,
}) => {
  const perms = useModulePermissions(moduleCode);
  const { currentUser } = usePermissions();

  const handleNavigateHome = () => {
    window.location.hash = "#map";
  };

  const handleNavigateToAuth = () => {
    window.location.hash = "#auth";
  };

  // TẦNG 1: Chặn truy cập nếu tài khoản không có quyền ACCESS
  if (!perms.hasAccess) {
    return (
      <AccessDeniedView
        moduleName={moduleName}
        moduleCode={moduleCode}
        userRole={currentUser?.role || (currentUser ? "Người dùng" : "Khách vãng lai")}
        userEmail={currentUser?.email}
        onBackToHome={handleNavigateHome}
        onNavigateToAuth={handleNavigateToAuth}
      />
    );
  }

  // TẦNG 2: Khóa xem dữ liệu nếu tài khoản có quyền ACCESS nhưng thiếu quyền VIEW
  if (!perms.hasView) {
    if (fallbackLockedView) {
      return <>{fallbackLockedView}</>;
    }
    return (
      <ModuleViewLockedView
        moduleCode={moduleCode}
        moduleName={moduleName}
        onNavigateHome={handleNavigateHome}
        onNavigateToAuth={handleNavigateToAuth}
      />
    );
  }

  // TẦNG 3: Đầy đủ quyền ACCESS và VIEW -> Render nội dung
  if (typeof children === "function") {
    return <>{children(perms)}</>;
  }

  return <>{children}</>;
};
