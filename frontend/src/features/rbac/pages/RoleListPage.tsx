import React, { useState, useEffect } from "react";
import type { RoleItem } from "../types/rbac.types";
import { rbacService } from "../services/rbacService";
import { DeleteRoleModal } from "../components/DeleteRoleModal";
import { ReassignUsersModal } from "../components/ReassignUsersModal";
import "../styles/RoleListPage.scss";

interface RoleListPageProps {
  onNavigateToCreate: () => void;
  onNavigateToMatrix: (roleId: number) => void;
  onUnauthorized?: () => void;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

export const RoleListPage: React.FC<RoleListPageProps> = ({
  onNavigateToCreate,
  onNavigateToMatrix,
  onUnauthorized,
  showToast,
}) => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [canCreate, setCanCreate] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Quản lý Modal Xoá
  const [selectedRoleForDelete, setSelectedRoleForDelete] = useState<RoleItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState<boolean>(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const data = await rbacService.getRoles();
      setRoles(data.roles);
      setCanCreate(data.can_create);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403 || status === 401) {
        showToast("Bạn không có quyền truy cập trang này", "error");
        if (onUnauthorized) {
          setTimeout(onUnauthorized, 2000);
        }
      } else {
        showToast("Không thể tải danh sách vai trò. Vui lòng thử lại", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleDeleteClick = (role: RoleItem) => {
    if (role.is_system) return;
    setSelectedRoleForDelete(role);
    if (role.user_count === 0) {
      setIsDeleteModalOpen(true);
    } else {
      setIsReassignModalOpen(true);
    }
  };

  const handleConfirmDirectDelete = async () => {
    if (!selectedRoleForDelete) return;
    setIsSubmittingAction(true);
    try {
      const res = await rbacService.deleteRole(selectedRoleForDelete.role_id);
      showToast(res.message || "Đã xoá vai trò thành công", "success");
      setIsDeleteModalOpen(false);
      setSelectedRoleForDelete(null);
      await fetchRoles();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Không thể xoá vai trò";
      showToast(msg, "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleConfirmReassignAndDelete = async (targetRoleId: number) => {
    if (!selectedRoleForDelete) return;
    setIsSubmittingAction(true);
    try {
      const res = await rbacService.reassignAndDeleteRole(selectedRoleForDelete.role_id, {
        target_role_id: targetRoleId,
      });
      showToast(res.message || "Đã chuyển giao người dùng và xoá vai trò thành công", "success");
      setIsReassignModalOpen(false);
      setSelectedRoleForDelete(null);
      await fetchRoles();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Không thể chuyển giao người dùng";
      showToast(msg, "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const systemRolesCount = roles.filter((r) => r.is_system).length;
  const customRolesCount = roles.filter((r) => !r.is_system).length;
  const totalRoles = roles.length;
  const isMaxReached = totalRoles >= 20 || !canCreate;

  return (
    <div className="role-list-page">
      {/* HEADER & BREADCRUMB */}
      <div className="role-page-header">
        <div className="header-breadcrumb">
          <span className="crumb-item">Hệ thống quản trị</span>
          <span className="crumb-separator">/</span>
          <span className="crumb-current">Phân quyền vai trò (RBAC)</span>
        </div>
        <div className="header-title-row">
          <div>
            <h1>
              <span className="title-icon" aria-hidden="true">🛡️</span>
              <span>Quản lý Vai trò & Phân quyền RBAC</span>
            </h1>
            <p className="header-desc">
              Thiết lập phạm vi quyền hạn động, quản lý các chức năng hệ sinh thái môi trường GreenSpot
            </p>
          </div>
        </div>
      </div>

      {/* BỐ CỤC CHIA 2 KHUNG CHUẨN ĐẶC TẢ */}
      <div className="role-layout-split">
        {/* KHUNG TRÁI: DANH SÁCH VAI TRÒ */}
        <section className="roles-left-pane" aria-labelledby="roles-list-title">
          <div className="pane-title-bar">
            <h2 id="roles-list-title">
              <span>📋</span>
              <span>DANH SÁCH VAI TRÒ</span>
            </h2>
            <span className="role-count-pill">
              {isLoading ? "Đang tải..." : `${totalRoles} vai trò`}
            </span>
          </div>

          {isLoading ? (
            <div className="skeleton-list" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-row">
                  <div className="sk-left">
                    <div className="sk-bar sk-title" />
                    <div className="sk-bar sk-sub" />
                    <div className="sk-bar sk-desc" />
                  </div>
                  <div className="sk-right">
                    <div className="sk-btn" />
                    <div className="sk-btn" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="roles-list-container">
              {roles.map((role) => {
                const isAdmin = role.role_code === "ADMIN";
                const isSystem = role.is_system;

                return (
                  <div
                    key={role.role_id}
                    className={`role-row-item ${isAdmin ? "is-admin" : ""}`}
                  >
                    <div className="role-main-info">
                      <div className="role-name-line">
                        <strong className="role-title">{role.role_name}</strong>
                        {isSystem ? (
                          <span className="badge-system">Hệ thống</span>
                        ) : (
                          <span className="badge-custom">Tuỳ chỉnh</span>
                        )}
                      </div>

                      <div className="role-sub-line">
                        <span className="scope-badge">
                          <span>{role.scope === "CITY" ? "🌐" : "🏢"}</span>
                          <span>{role.scope_display}</span>
                        </span>
                        <span className="line-bullet">•</span>
                        <span className="user-count-text">
                          {role.user_count} người dùng
                        </span>
                      </div>

                      <p
                        className="role-desc-line"
                        title={role.description || "Chưa có mô tả cho vai trò này"}
                      >
                        {role.description || "Chưa có mô tả cho vai trò này"}
                      </p>
                    </div>

                    <div className="role-actions-group">
                      {/* NÚT SỬA QUYỀN */}
                      {isAdmin ? (
                        <div className="tooltip-wrapper">
                          <button
                            type="button"
                            className="btn-edit-perm"
                            disabled
                            aria-label="Sửa quyền vai trò Admin"
                          >
                            <span>⚙️ Sửa quyền</span>
                          </button>
                          <span className="tooltip-content" role="tooltip">
                            Admin luôn có đầy đủ quyền, không thể chỉnh sửa
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-edit-perm"
                          onClick={() => onNavigateToMatrix(role.role_id)}
                          aria-label={`Sửa quyền vai trò ${role.role_name}`}
                        >
                          <span>⚙️ Sửa quyền</span>
                        </button>
                      )}

                      {/* NÚT XOÁ VAI TRÒ */}
                      {isSystem ? (
                        <div className="tooltip-wrapper">
                          <button
                            type="button"
                            className="btn-delete-role"
                            disabled
                            aria-label={`Không thể xoá vai trò hệ thống ${role.role_name}`}
                          >
                            <span>🗑️ Xoá vai trò</span>
                          </button>
                          <span className="tooltip-content" role="tooltip">
                            Không thể xoá vai trò hệ thống
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-delete-role"
                          onClick={() => handleDeleteClick(role)}
                          aria-label={`Xoá vai trò tuỳ chỉnh ${role.role_name}`}
                        >
                          <span>🗑️ Xoá vai trò</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* KHUNG PHẢI: THAO TÁC & THỐNG KÊ */}
        <aside className="roles-right-pane">
          {/* CARD NÚT THÊM VAI TRÒ */}
          <div className="action-card">
            <h3 className="card-title">Thao tác vai trò</h3>
            {isMaxReached ? (
              <div className="tooltip-wrapper" style={{ width: "100%" }}>
                <button
                  type="button"
                  className="btn-add-role"
                  disabled
                  aria-label="Thêm vai trò mới (Đã đạt tối đa 20 vai trò)"
                >
                  <span>➕ Thêm vai trò</span>
                </button>
                <span className="tooltip-content" role="tooltip">
                  Đã đạt tối đa 20 vai trò. Vui lòng xoá bớt vai trò không dùng
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="btn-add-role"
                onClick={onNavigateToCreate}
                aria-label="Thêm vai trò mới"
              >
                <span>➕ Thêm vai trò</span>
              </button>
            )}

            <p className="limit-note">
              Hệ thống cho phép khởi tạo tối đa 20 vai trò (bao gồm 4 vai trò mặc định của hệ thống).
            </p>
          </div>

          {/* CARD TIẾN ĐỘ & THỐNG KÊ */}
          <div className="stats-card">
            <div className="stats-title">Chỉ số phân quyền</div>
            <div className="progress-container">
              <div className="progress-label-row">
                <span>Dung lượng vai trò</span>
                <span className="ratio-num">{totalRoles} / 20</span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-bar-fill ${
                    totalRoles >= 20 ? "full" : totalRoles >= 16 ? "warning" : ""
                  }`}
                  style={{ width: `${Math.min(100, (totalRoles / 20) * 100)}%` }}
                />
              </div>
            </div>

            <div className="stats-breakdown">
              <div className="breakdown-row">
                <span>Vai trò hệ thống:</span>
                <strong>{systemRolesCount}</strong>
              </div>
              <div className="breakdown-row">
                <span>Vai trò tuỳ chỉnh:</span>
                <strong>{customRolesCount}</strong>
              </div>
              <div className="breakdown-row">
                <span>Phạm vi toàn thành phố:</span>
                <strong>{roles.filter((r) => r.scope === "CITY").length}</strong>
              </div>
              <div className="breakdown-row">
                <span>Phạm vi cấp quận:</span>
                <strong>{roles.filter((r) => r.scope === "DISTRICT").length}</strong>
              </div>
            </div>
          </div>

          {/* CARD AN NINH RBAC */}
          <div className="security-note-card">
            <h4>
              <span>🔒</span>
              <span>Cơ chế bảo vệ dữ liệu</span>
            </h4>
            <p>
              Ma trận quyền được kiểm soát xung đột theo thời gian thực (Optimistic Concurrency Control). Mọi thao tác sửa đổi đều yêu cầu quyền Quản trị viên tối cao.
            </p>
          </div>
        </aside>
      </div>

      {/* POPUP MÀN 4: XOÁ VAI TRÒ KHÔNG CÓ USER */}
      <DeleteRoleModal
        isOpen={isDeleteModalOpen}
        role={selectedRoleForDelete}
        isDeleting={isSubmittingAction}
        onConfirm={handleConfirmDirectDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedRoleForDelete(null);
        }}
      />

      {/* POPUP MÀN 5: CHUYỂN GIAO USER VÀ XOÁ VAI TRÒ */}
      <ReassignUsersModal
        isOpen={isReassignModalOpen}
        role={selectedRoleForDelete}
        availableRoles={roles}
        isSubmitting={isSubmittingAction}
        onConfirm={handleConfirmReassignAndDelete}
        onCancel={() => {
          setIsReassignModalOpen(false);
          setSelectedRoleForDelete(null);
        }}
      />
    </div>
  );
};
