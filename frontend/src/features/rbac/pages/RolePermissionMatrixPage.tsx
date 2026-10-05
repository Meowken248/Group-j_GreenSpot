import React, { useState, useEffect, useRef, useMemo } from "react";
import type {
  RoleItem,
  ModulePermissionInfo,
  PermissionMatrixResponse,
} from "../types/rbac.types";
import { rbacService } from "../services/rbacService";
import "../styles/RolePermissionMatrixPage.scss";

interface RolePermissionMatrixPageProps {
  initialRoleId?: number;
  onBackToList: () => void;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

const ACTION_COLS: Array<{ key: "VIEW" | "CREATE" | "UPDATE" | "DELETE"; label: string }> = [
  { key: "VIEW", label: "Xem" },
  { key: "CREATE", label: "Thêm" },
  { key: "UPDATE", label: "Sửa" },
  { key: "DELETE", label: "Xoá" },
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

  // Lưu trữ trạng thái quyền ban đầu để tính toán dirty state
  const [savedPermissionsMap, setSavedPermissionsMap] = useState<Record<string, string[]>>({});

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const activeColHeaderRef = useRef<HTMLTableCellElement | null>(null);

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

      // Xác định vai trò active đang được chỉnh sửa
      if (preferredRoleId && data.roles.some((r) => r.role_id === preferredRoleId)) {
        setActiveRoleId(preferredRoleId);
      } else if (initialRoleId && data.roles.some((r) => r.role_id === initialRoleId)) {
        setActiveRoleId(initialRoleId);
      } else {
        // Mặc định chọn vai trò tùy chỉnh đầu tiên hoặc DISTRICT_MANAGER (không chọn ADMIN vì không thể sửa)
        const firstEditable =
          data.roles.find((r) => !r.is_system) ||
          data.roles.find((r) => r.role_code === "DISTRICT_MANAGER") ||
          data.roles[1] ||
          data.roles[0];
        setActiveRoleId(firstEditable ? firstEditable.role_id : null);
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

  // Kiểm tra Dirty State: quyền hiện tại có khác với quyền đã lưu ban đầu không
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

  // Tự động cuộn ngang đến cột của vai trò đang sửa
  useEffect(() => {
    if (!isLoading && activeColHeaderRef.current && tableScrollRef.current) {
      const scrollEl = tableScrollRef.current;
      const targetEl = activeColHeaderRef.current;
      const targetLeft = targetEl.offsetLeft - 320; // Trừ đi độ rộng của sticky column
      if (targetLeft > 0) {
        scrollEl.scrollTo({ left: targetLeft, behavior: "smooth" });
      }
    }
  }, [activeRoleId, isLoading]);

  // Cảnh báo người dùng khi có thay đổi chưa lưu (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Bạn có thay đổi chưa lưu trong ma trận quyền. Bạn có chắc chắn muốn rời đi?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // RÀNG BUỘC CHECKBOX (INTERLOCKING LOGIC)
  const handleTogglePermission = (moduleCode: string, action: string) => {
    if (!activeRoleId || !activeRole || activeRole.role_code === "ADMIN") return;

    // Không áp dụng cho ROLE đối với vai trò khác Admin
    if (moduleCode === "ROLE") return;

    // STATISTICS và AUDIT_LOG chỉ có VIEW
    if (["STATISTICS", "AUDIT_LOG"].includes(moduleCode) && action !== "VIEW") return;

    const permCode = `${moduleCode}:${action}`;
    const currentPerms = new Set(activeRolePerms);
    const isCurrentlyChecked = currentPerms.has(permCode);

    if (isCurrentlyChecked) {
      // 1. Thao tác: BỎ TÍCH
      currentPerms.delete(permCode);

      // QUY TẮC RÀNG BUỘC: Khi bỏ tích "Xem", tự động bỏ tích Thêm, Sửa, Xoá của module đó
      if (action === "VIEW") {
        currentPerms.delete(`${moduleCode}:CREATE`);
        currentPerms.delete(`${moduleCode}:UPDATE`);
        currentPerms.delete(`${moduleCode}:DELETE`);
      }
    } else {
      // 2. Thao tác: TÍCH CHỌN
      currentPerms.add(permCode);

      // QUY TẮC RÀNG BUỘC: Khi tích Thêm, Sửa, hoặc Xoá -> Tự động tích chọn "Xem"
      if (["CREATE", "UPDATE", "DELETE"].includes(action)) {
        currentPerms.add(`${moduleCode}:VIEW`);
      }
    }

    setRolePermissions((prev) => ({
      ...prev,
      [String(activeRoleId)]: Array.from(currentPerms),
    }));
  };

  // Hoàn tác các thay đổi chưa lưu của vai trò đang chọn
  const handleRevertChanges = () => {
    if (!activeRoleId) return;
    setRolePermissions((prev) => ({
      ...prev,
      [String(activeRoleId)]: [...(savedPermissionsMap[String(activeRoleId)] || [])],
    }));
  };

  // Chuyển đổi vai trò đang sửa
  const handleSwitchActiveRole = (newId: number) => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        "Bạn có các thay đổi quyền chưa lưu cho vai trò này. Bạn có chắc chắn muốn chuyển sang vai trò khác?"
      );
      if (!confirmLeave) return;
      handleRevertChanges();
    }
    setActiveRoleId(newId);
  };

  // Bấm nút quay lại danh sách
  const handleBack = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        "Bạn có các thay đổi quyền chưa lưu. Bạn có chắc chắn muốn quay lại danh sách vai trò?"
      );
      if (!confirmLeave) return;
    }
    onBackToList();
  };

  // Lưu thay đổi vào Backend
  const handleSaveMatrix = async () => {
    if (!activeRole || !isDirty || isSaving) return;

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
    <div className="matrix-page">
      {/* HEADER & BREADCRUMB */}
      <div className="matrix-page-header">
        <div className="header-breadcrumb">
          <span className="crumb-item" onClick={handleBack}>
            Phân quyền vai trò (RBAC)
          </span>
          <span className="crumb-separator">/</span>
          <span className="crumb-current">Ma trận phân quyền động</span>
        </div>
        <div className="header-title-row">
          <div>
            <h1>
              <span>📊</span>
              <span>Ma Trận Phân Quyền Động GreenSpot</span>
            </h1>
            <p className="header-desc">
              Phân định chi tiết quyền hạn Xem, Thêm, Sửa, Xoá trên 15 chức năng môi trường. Cột đang chọn sửa được đánh dấu nổi bật.
            </p>
          </div>
        </div>
      </div>

      {/* THANH ĐIỀU KHIỂN & TRẠNG THÁI DIRTY (ACTION BAR) */}
      <div className="matrix-action-bar">
        <div className="bar-left">
          <label htmlFor="role-select" className="role-selector-label">
            Đang chỉnh sửa:
          </label>
          <select
            id="role-select"
            className="role-select-dropdown"
            value={activeRoleId ?? ""}
            onChange={(e) => handleSwitchActiveRole(Number(e.target.value))}
            disabled={isLoading || isSaving}
          >
            {roles.map((r) => (
              <option key={r.role_id} value={r.role_id}>
                {r.role_name} {r.role_code === "ADMIN" ? "(Admin - Cố định)" : `(${r.scope_display})`}
              </option>
            ))}
          </select>

          {activeRole && (
            <span className="editing-badge">
              <span>{activeRole.scope === "CITY" ? "🌐" : "🏢"}</span>
              <span>{activeRole.scope_display}</span>
              <span>• v{activeRole.version}</span>
            </span>
          )}

          {isDirty && (
            <span className="dirty-warning-pill" role="status">
              <span className="dot-blink" />
              <span>Có thay đổi chưa lưu</span>
            </span>
          )}
        </div>

        <div className="bar-right">
          <button
            type="button"
            className="btn-back-list"
            onClick={handleBack}
            disabled={isSaving}
          >
            ← Danh sách vai trò
          </button>

          {isDirty && (
            <button
              type="button"
              className="btn-revert-changes"
              onClick={handleRevertChanges}
              disabled={isSaving}
              title="Khôi phục trạng thái ban đầu"
            >
              Huỷ thay đổi
            </button>
          )}

          <button
            type="button"
            className="btn-save-matrix"
            onClick={handleSaveMatrix}
            disabled={!isDirty || isSaving || activeRole?.role_code === "ADMIN"}
            title={
              activeRole?.role_code === "ADMIN"
                ? "Admin luôn có đầy đủ quyền, không thể chỉnh sửa"
                : !isDirty
                ? "Chưa có thay đổi nào để lưu"
                : "Lưu ma trận quyền cho vai trò này"
            }
          >
            {isSaving ? "Đang lưu..." : "💾 Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* BANNER XUNG ĐỘT PHIÊN BẢN OCC (409) */}
      {hasOccConflict && (
        <div className="occ-conflict-banner" role="alert">
          <div className="conflict-msg">
            <span aria-hidden="true">⚠️</span>
            <span>
              Ma trận quyền đã được người khác thay đổi. Vui lòng tải lại trang để lấy dữ liệu mới nhất.
            </span>
          </div>
          <button
            type="button"
            className="btn-reload-latest"
            onClick={() => loadMatrixData(activeRoleId || undefined)}
          >
            🔄 Tải lại dữ liệu mới nhất
          </button>
        </div>
      )}

      {/* BẢNG MA TRẬN PHÂN QUYỀN */}
      <div className="matrix-table-card">
        <div className="matrix-scroll-wrapper" ref={tableScrollRef}>
          <table className="rbac-matrix-table" aria-label="Bảng ma trận phân quyền RBAC">
            <thead>
              {/* TIER 1: TÊN VAI TRÒ */}
              <tr>
                <th className="col-module-sticky" rowSpan={2}>
                  Chức năng hệ thống
                </th>
                {roles.map((r) => {
                  const isActiveCol = r.role_id === activeRoleId;
                  return (
                    <th
                      key={r.role_id}
                      colSpan={4}
                      className={`th-role-header ${isActiveCol ? "active-editing-column" : ""}`}
                      ref={isActiveCol ? (el) => { activeColHeaderRef.current = el; } : undefined}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (r.role_id !== activeRoleId) {
                          handleSwitchActiveRole(r.role_id);
                        }
                      }}
                      title={`Click để chuyển sang chỉnh sửa vai trò ${r.role_name}`}
                    >
                      <div className="role-th-content">
                        <span className="role-header-title">{r.role_name}</span>
                        <div className="role-header-badges">
                          {r.is_system ? (
                            <span className="badge-sys">Hệ thống</span>
                          ) : (
                            <span className="badge-scope">{r.scope_display}</span>
                          )}
                          {isActiveCol && (
                            <span className="badge-active-edit">Đang sửa</span>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* TIER 2: CÁC CỘT HÀNH ĐỘNG (XEM, THÊM, SỬA, XOÁ) */}
              <tr>
                {roles.map((r) => {
                  const isActiveCol = r.role_id === activeRoleId;
                  return (
                    <React.Fragment key={`sub-${r.role_id}`}>
                      {ACTION_COLS.map((col) => (
                        <th
                          key={`${r.role_id}-${col.key}`}
                          className={`th-action-header ${isActiveCol ? "active-editing-column" : ""}`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {modules.map((mod, modIdx) => {
                const isRoleModule = mod.code === "ROLE";
                const isViewOnlyModule = ["STATISTICS", "AUDIT_LOG"].includes(mod.code);

                return (
                  <tr key={mod.code}>
                    {/* CỘT CỐ ĐỊNH: TÊN CHỨC NĂNG */}
                    <td className="col-module-sticky td-module-info">
                      <div className="module-cell-content">
                        <div className="module-title-row">
                          <span className="module-index">{modIdx + 1}</span>
                          <span className="module-name">{mod.name}</span>
                        </div>
                        <span className="module-code-tag">{mod.code}</span>
                      </div>
                    </td>

                    {/* CÁC CỘT VAI TRÒ */}
                    {roles.map((r) => {
                      const isActiveCol = r.role_id === activeRoleId;
                      const rolePerms = rolePermissions[String(r.role_id)] || [];
                      const isAdmin = r.role_code === "ADMIN";

                      return (
                        <React.Fragment key={`cell-${r.role_id}-${mod.code}`}>
                          {ACTION_COLS.map((col) => {
                            const permCode = `${mod.code}:${col.key}`;
                            const isChecked = rolePerms.includes(permCode);

                            // Ô không áp dụng:
                            // 1. Module ROLE chỉ áp dụng cho ADMIN
                            if (isRoleModule && !isAdmin) {
                              return (
                                <td
                                  key={`cell-${r.role_id}-${permCode}`}
                                  className={`td-perm-cell ${isActiveCol ? "active-editing-column" : ""}`}
                                >
                                  <span className="cell-locked" title="Chức năng phân quyền chỉ dành riêng cho Admin">
                                    🔒
                                  </span>
                                </td>
                              );
                            }

                            // 2. STATISTICS và AUDIT_LOG chỉ có quyền VIEW
                            if (isViewOnlyModule && col.key !== "VIEW") {
                              return (
                                <td
                                  key={`cell-${r.role_id}-${permCode}`}
                                  className={`td-perm-cell ${isActiveCol ? "active-editing-column" : ""}`}
                                >
                                  <span className="cell-na" title="Chức năng chỉ hỗ trợ thao tác Xem">
                                    —
                                  </span>
                                </td>
                              );
                            }

                            // Cột có thể tương tác (chỉ khi là active column và không phải Admin)
                            const isEditable = isActiveCol && !isAdmin;

                            return (
                              <td
                                key={`cell-${r.role_id}-${permCode}`}
                                className={`td-perm-cell ${isActiveCol ? "active-editing-column" : ""}`}
                              >
                                <label className="checkbox-container">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={!isEditable}
                                    onChange={() => handleTogglePermission(mod.code, col.key)}
                                    aria-label={`${r.role_name} - ${mod.name} - ${col.label}`}
                                  />
                                </label>
                              </td>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHÚ THÍCH & QUY TẮC RÀNG BUỘC (FOOTER) */}
      <footer className="matrix-legend-footer">
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-chip chip-editing" />
            <span>Cột đang sửa (tương tác trực tiếp)</span>
          </div>
          <div className="legend-item">
            <span className="legend-chip chip-readonly" />
            <span>Chế độ chỉ xem (chọn cột để sửa)</span>
          </div>
          <div className="legend-item">
            <span className="legend-chip chip-na">—</span>
            <span>Không áp dụng thao tác</span>
          </div>
          <div className="legend-item">
            <span>🔒</span>
            <span>Đặc quyền bảo mật Admin</span>
          </div>
        </div>

        <div className="interlock-tip">
          <span>💡</span>
          <span>
            Ràng buộc tự động: Chọn <strong>Thêm/Sửa/Xoá</strong> sẽ tự bật <strong>Xem</strong>; Bỏ <strong>Xem</strong> sẽ tự huỷ toàn bộ thao tác còn lại.
          </span>
        </div>
      </footer>
    </div>
  );
};
