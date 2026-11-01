import React, { useState, useEffect, useMemo } from "react";
import type {
  RoleItem,
  ModulePermissionInfo,
  PermissionMatrixResponse,
  AclActionType,
} from "../types/rbac.types";
import { rbacService } from "../services/rbacService";
import "../styles/RolePermissionMatrixPage.scss";

interface RolePermissionMatrixPageProps {
  initialRoleId?: number;
  onBackToList: () => void;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

// 7 HÀNH ĐỘNG CHUẨN ACL THEO ĐÚNG ẢNH MẪU
export const ACL_COLUMNS: Array<{ key: AclActionType; label: string }> = [
  { key: "ACCESS", label: "TRUY CẬP" },
  { key: "VIEW", label: "XEM" },
  { key: "CREATE", label: "THÊM" },
  { key: "UPDATE", label: "CẬP NHẬT" },
  { key: "DELETE", label: "XOÁ" },
  { key: "IMPORT", label: "IMPORT" },
  { key: "EXPORT", label: "EXPORT" },
];

export const RolePermissionMatrixPage: React.FC<RolePermissionMatrixPageProps> = ({
  initialRoleId,
  onBackToList,
  showToast,
}) => {
  const [modules, setModules] = useState<ModulePermissionInfo[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [activeRoleId, setActiveRoleId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasOccConflict, setHasOccConflict] = useState<boolean>(false);

  // Lưu trạng thái quyền ban đầu để tính toán dirty state
  const [savedPermissionsMap, setSavedPermissionsMap] = useState<Record<string, string[]>>({});

  // Tải dữ liệu ma trận quyền từ Backend
  const loadMatrixData = async (preferredRoleId?: number) => {
    setIsLoading(true);
    setHasOccConflict(false);
    try {
      const data: PermissionMatrixResponse = await rbacService.getPermissionMatrix();
      setModules(data.modules);
      setRoles(data.roles);
      setRolePermissions(data.role_permissions);
      setSavedPermissionsMap(JSON.parse(JSON.stringify(data.role_permissions)));

      // Xác định vai trò active
      if (preferredRoleId && data.roles.some((r) => r.role_id === preferredRoleId)) {
        setActiveRoleId(preferredRoleId);
      } else if (initialRoleId && data.roles.some((r) => r.role_id === initialRoleId)) {
        setActiveRoleId(initialRoleId);
      } else {
        // Mặc định chọn vai trò tùy chỉnh đầu tiên, hoặc DISTRICT_MANAGER, hoặc vai trò đầu
        const defaultRole =
          data.roles.find((r) => !r.is_system) ||
          data.roles.find((r) => r.role_code === "DISTRICT_MANAGER") ||
          data.roles[0];
        setActiveRoleId(defaultRole ? defaultRole.role_id : null);
      }
    } catch (err: any) {
      showToast("Không thể tải ma trận phân quyền. Vui lòng thử lại", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatrixData(initialRoleId);
  }, [initialRoleId]);

  const activeRole = useMemo(() => {
    return roles.find((r) => r.role_id === activeRoleId) || null;
  }, [roles, activeRoleId]);

  const activeRolePerms = useMemo(() => {
    if (!activeRoleId) return [];
    return rolePermissions[String(activeRoleId)] || [];
  }, [rolePermissions, activeRoleId]);

  const savedActiveRolePerms = useMemo(() => {
    if (!activeRoleId) return [];
    return savedPermissionsMap[String(activeRoleId)] || [];
  }, [savedPermissionsMap, activeRoleId]);

  // Kiểm tra Dirty State
  const isDirty = useMemo(() => {
    if (!activeRoleId) return false;
    const currentSet = new Set(activeRolePerms);
    const savedSet = new Set(savedActiveRolePerms);
    if (currentSet.size !== savedSet.size) return true;
    for (const p of currentSet) {
      if (!savedSet.has(p)) return true;
    }
    return false;
  }, [activeRolePerms, savedActiveRolePerms, activeRoleId]);

  // Cảnh báo beforeunload khi có thay đổi chưa lưu
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Bạn có thay đổi chưa lưu trong ma trận quyền. Bạn có chắc muốn rời đi?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // RÀNG BUỘC CHECKBOX (INTERLOCKING RULES CHO 7 CỘT ACL)
  const handleTogglePermission = (moduleCode: string, action: AclActionType) => {
    if (!activeRoleId || !activeRole || activeRole.role_code === "ADMIN") return;

    // Không áp dụng phân quyền module ROLE cho vai trò khác Admin
    if (moduleCode === "ROLE") return;

    const permCode = `${moduleCode}:${action}`;
    const currentPerms = new Set(activeRolePerms);
    const isCurrentlyChecked = currentPerms.has(permCode);

    if (isCurrentlyChecked) {
      // 1. Thao tác: BỎ TÍCH
      currentPerms.delete(permCode);

      // QUY TẮC RÀNG BUỘC 1: Nếu bỏ tích TRUY CẬP -> Bỏ tích toàn bộ các quyền còn lại của module đó
      if (action === "ACCESS") {
        currentPerms.delete(`${moduleCode}:VIEW`);
        currentPerms.delete(`${moduleCode}:CREATE`);
        currentPerms.delete(`${moduleCode}:UPDATE`);
        currentPerms.delete(`${moduleCode}:DELETE`);
        currentPerms.delete(`${moduleCode}:IMPORT`);
        currentPerms.delete(`${moduleCode}:EXPORT`);
      }

      // QUY TẮC RÀNG BUỘC 2: Nếu bỏ tích XEM -> Bỏ tích các quyền Thêm, Cập nhật, Xoá, Import, Export
      if (action === "VIEW") {
        currentPerms.delete(`${moduleCode}:CREATE`);
        currentPerms.delete(`${moduleCode}:UPDATE`);
        currentPerms.delete(`${moduleCode}:DELETE`);
        currentPerms.delete(`${moduleCode}:IMPORT`);
        currentPerms.delete(`${moduleCode}:EXPORT`);
      }
    } else {
      // 2. Thao tác: TÍCH CHỌN
      currentPerms.add(permCode);

      // QUY TẮC RÀNG BUỘC 3: Nếu tích bất kỳ quyền con nào -> Luôn tự động bật TRUY CẬP
      currentPerms.add(`${moduleCode}:ACCESS`);

      // QUY TẮC RÀNG BUỘC 4: Nếu tích Thêm, Cập nhật, Xoá, Import, Export -> Tự động bật XEM
      if (["CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"].includes(action)) {
        currentPerms.add(`${moduleCode}:VIEW`);
      }
    }

    setRolePermissions((prev) => ({
      ...prev,
      [String(activeRoleId)]: Array.from(currentPerms),
    }));
  };

  // Bật / tắt cả hàng chức năng
  const handleToggleRow = (moduleCode: string) => {
    if (!activeRoleId || !activeRole || activeRole.role_code === "ADMIN") return;
    if (moduleCode === "ROLE") return;

    const currentPerms = new Set(activeRolePerms);
    const hasAny = ACL_COLUMNS.some((col) => currentPerms.has(`${moduleCode}:${col.key}`));

    if (hasAny) {
      // Đang có ít nhất 1 quyền -> Bỏ tích toàn bộ hàng
      ACL_COLUMNS.forEach((col) => currentPerms.delete(`${moduleCode}:${col.key}`));
    } else {
      // Chưa có quyền nào -> Tích chọn toàn bộ 7 quyền của hàng
      ACL_COLUMNS.forEach((col) => currentPerms.add(`${moduleCode}:${col.key}`));
    }

    setRolePermissions((prev) => ({
      ...prev,
      [String(activeRoleId)]: Array.from(currentPerms),
    }));
  };

  // Hoàn tác các thay đổi chưa lưu
  const handleRevertChanges = () => {
    if (!activeRoleId) return;
    setRolePermissions((prev) => ({
      ...prev,
      [String(activeRoleId)]: [...(savedPermissionsMap[String(activeRoleId)] || [])],
    }));
  };

  // Chuyển đổi vai trò đang xem / chỉnh sửa
  const handleSwitchActiveRole = (newId: number) => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        "Bạn có các thay đổi quyền chưa lưu cho vai trò này. Bạn có chắc muốn chuyển sang vai trò khác?"
      );
      if (!confirmLeave) return;
      handleRevertChanges();
    }
    setActiveRoleId(newId);
  };

  // Quay lại danh sách vai trò
  const handleBack = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        "Bạn có các thay đổi quyền chưa lưu. Bạn có chắc muốn quay lại danh sách vai trò?"
      );
      if (!confirmLeave) return;
    }
    onBackToList();
  };

  // Lưu ma trận phân quyền
  const handleSaveMatrix = async () => {
    if (!activeRole || isSaving || activeRole.role_code === "ADMIN") return;

    setIsSaving(true);
    setHasOccConflict(false);
    try {
      const res = await rbacService.updateRolePermissions(activeRole.role_id, {
        permissions: activeRolePerms,
        version: activeRole.version,
      });

      showToast("Đã lưu ma trận quyền thành công", "success");

      // Cập nhật version mới cho active role
      setRoles((prev) =>
        prev.map((r) =>
          r.role_id === activeRole.role_id ? { ...r, version: res.new_version } : r
        )
      );

      // Cập nhật savedPermissionsMap để reset dirty state
      setSavedPermissionsMap((prev) => ({
        ...prev,
        [String(activeRole.role_id)]: [...activeRolePerms],
      }));
    } catch (err: any) {
      const status = err?.response?.status;
      const errData = err?.response?.data;

      if (status === 409 || errData?.error_code === "VERSION_MISMATCH") {
        setHasOccConflict(true);
        showToast(
          "Ma trận quyền đã được người khác thay đổi. Vui lòng tải lại",
          "error"
        );
      } else {
        const msg = errData?.message || "Không thể lưu ma trận quyền. Vui lòng thử lại";
        showToast(msg, "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="matrix-page-acl">
      {/* THANH ĐIỀU HƯỚNG BREADCRUMB */}
      <div className="acl-top-nav">
        <button type="button" className="btn-back-nav" onClick={handleBack}>
          ← Danh sách vai trò
        </button>
        <span className="nav-separator">/</span>
        <span className="nav-title">Phân quyền chi tiết (ACL Matrix)</span>
      </div>

      {/* THANH TIÊU ĐỀ & VAI TRÒ CHỌN (KHỚP HOÀN TOÀN ẢNH MẪU) */}
      <div className="acl-header-bar">
        <div className="acl-header-left">
          <p className="acl-subtitle-text">
            Tất cả thành viên thuộc vai trò / nhóm sẽ nhận quyền này.
          </p>
        </div>

        <div className="acl-header-right">
          {/* CAPSULE CHỌN VAI TRÒ (HIỂN THỊ DẠNG PILL NHƯ ẢNH MẪU) */}
          <div className="role-capsule-selector">
            <span className="capsule-avatar-dot" aria-hidden="true" />
            <select
              className="role-capsule-select"
              value={activeRoleId ?? ""}
              onChange={(e) => handleSwitchActiveRole(Number(e.target.value))}
              disabled={isLoading || isSaving}
              aria-label="Chọn vai trò phân quyền"
            >
              {roles.map((r) => (
                <option key={r.role_id} value={r.role_id}>
                  {r.role_name.toUpperCase()} {r.role_code === "ADMIN" ? "(ADMIN)" : `(${r.scope_display})`}
                </option>
              ))}
            </select>
            <span className="capsule-arrow" aria-hidden="true">▾</span>
          </div>

          {/* NÚT LƯU THEO ĐÚNG STYLE NÚT TRÊN ẢNH MẪU */}
          <button
            type="button"
            className="btn-save-acl"
            onClick={handleSaveMatrix}
            disabled={!isDirty || isSaving || activeRole?.role_code === "ADMIN"}
            title={
              activeRole?.role_code === "ADMIN"
                ? "Admin luôn có đầy đủ quyền, không thể chỉnh sửa"
                : !isDirty
                ? "Chưa có thay đổi nào để lưu"
                : "Lưu quyền"
            }
          >
            {isSaving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      {/* CẢNH BÁO XUNG ĐỘT OCC NẾU CÓ */}
      {hasOccConflict && (
        <div className="acl-occ-alert" role="alert">
          <span>⚠️ Ma trận quyền đã được người khác thay đổi. Vui lòng tải lại trang.</span>
          <button
            type="button"
            className="btn-reload-occ"
            onClick={() => loadMatrixData(activeRoleId || undefined)}
          >
            Tải lại
          </button>
        </div>
      )}

      {/* BẢNG MA TRẬN PHÂN QUYỀN 7 CỘT THEO ĐÚNG ẢNH MẪU */}
      <div className="acl-table-container">
        <table className="acl-matrix-table" aria-label="Bảng phân quyền chi tiết ACL">
          <thead>
            <tr>
              <th className="th-feature-col">CHỨC NĂNG</th>
              {ACL_COLUMNS.map((col) => (
                <th key={col.key} className="th-action-col">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {modules.map((mod) => {
              const isRoleModule = mod.code === "ROLE";
              const isAdmin = activeRole?.role_code === "ADMIN";

              return (
                <tr key={mod.code}>
                  {/* CỘT TÊN CHỨC NĂNG */}
                  <td className="td-feature-title" onClick={() => handleToggleRow(mod.code)}>
                    <div className="feature-title-wrapper">
                      <span className="feature-name">{mod.name}</span>
                      <span className="feature-code">[{mod.code}]</span>
                    </div>
                  </td>

                  {/* 7 CỘT CHECKBOX: TRUY CẬP, XEM, THÊM, CẬP NHẬT, XOÁ, IMPORT, EXPORT */}
                  {ACL_COLUMNS.map((col) => {
                    const permCode = `${mod.code}:${col.key}`;
                    const isChecked = isAdmin || activeRolePerms.includes(permCode);

                    // Module ROLE chỉ dành riêng cho Admin
                    const isLocked = isRoleModule && !isAdmin;

                    // Quyền TRUY CẬP của module này có đang bật không?
                    const isAccessGranted = isAdmin || activeRolePerms.includes(`${mod.code}:ACCESS`);

                    // Nếu không phải cột ACCESS mà quyền ACCESS chưa được bật -> Vô hiệu hóa ô con
                    const isChildActionDisabled = !isAdmin && col.key !== "ACCESS" && !isAccessGranted;
                    const isDisabled = isAdmin || isSaving || isChildActionDisabled;

                    const tooltipText = isLocked
                      ? "Chức năng chỉ dành cho Admin"
                      : isChildActionDisabled
                      ? "Cần cấp quyền TRUY CẬP trước khi phân quyền thao tác chi tiết"
                      : `${mod.name} - ${col.label}`;

                    return (
                      <td key={permCode} className="td-checkbox-cell" title={tooltipText}>
                        {isLocked ? (
                          <span className="acl-cell-lock" title="Chức năng chỉ dành cho Admin">
                            🔒
                          </span>
                        ) : (
                          <label
                            className={`acl-checkbox-label ${
                              isChildActionDisabled ? "acl-checkbox-disabled-child" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isDisabled}
                              onChange={() => handleTogglePermission(mod.code, col.key)}
                              aria-label={`${mod.name} - ${col.label}`}
                            />
                            <span className="acl-custom-box" />
                          </label>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* THÔNG TIN TRỢ GIÚP DƯỚI BẢNG */}
      <div className="acl-footer-note">
        <div className="note-left">
          <span className="note-dot" />
          <span>
            {isDirty
              ? "● Bạn đang có thay đổi quyền chưa lưu"
              : activeRole?.role_code === "ADMIN"
              ? "Vai trò Admin luôn sở hữu toàn bộ quyền hạn (không thể chỉnh sửa)"
              : "Dữ liệu ma trận quyền đang ở trạng thái mới nhất"}
          </span>
        </div>

        {isDirty && (
          <button type="button" className="btn-revert-acl" onClick={handleRevertChanges}>
            Huỷ thay đổi
          </button>
        )}
      </div>
    </div>
  );
};
