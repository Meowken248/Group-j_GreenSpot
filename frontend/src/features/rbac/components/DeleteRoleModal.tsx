import React from "react";
import type { RoleItem } from "../types/rbac.types";
import "../styles/RbacModals.scss";

interface DeleteRoleModalProps {
  isOpen: boolean;
  role: RoleItem | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteRoleModal: React.FC<DeleteRoleModalProps> = ({
  isOpen,
  role,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !role) return null;

  return (
    <div className="rbac-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-role-title">
      <div className="rbac-modal-card">
        <div className="modal-header">
          <div className="header-title-group">
            <div className="icon-badge danger" aria-hidden="true">🗑️</div>
            <h3 id="delete-role-title">Xoá vai trò</h3>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <p>
            Bạn có chắc chắn muốn xoá vai trò <strong>"{role.role_name}"</strong> không?
          </p>
          <div className="warning-callout">
            <span className="callout-icon" aria-hidden="true">⚠️</span>
            <span>
              Thao tác này sẽ xoá hoàn toàn vai trò khỏi cơ sở dữ liệu và <strong>không thể hoàn tác</strong>.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Huỷ bỏ
          </button>
          <button
            type="button"
            className="btn-danger-confirm"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Đang xoá..." : "Xoá vai trò"}
          </button>
        </div>
      </div>
    </div>
  );
};
