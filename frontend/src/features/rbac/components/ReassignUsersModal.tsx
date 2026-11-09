import React, { useState, useEffect } from "react";
import type { RoleItem } from "../types/rbac.types";
import "../styles/RbacModals.scss";

interface ReassignUsersModalProps {
  isOpen: boolean;
  role: RoleItem | null;
  availableRoles: RoleItem[];
  isSubmitting: boolean;
  onConfirm: (targetRoleId: number) => void;
  onCancel: () => void;
}

export const ReassignUsersModal: React.FC<ReassignUsersModalProps> = ({
  isOpen,
  role,
  availableRoles,
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);

  // Lọc ra các vai trò hợp lệ khác vai trò hiện tại
  const candidateRoles = availableRoles.filter(
    (r) => role && r.role_id !== role.role_id
  );

  useEffect(() => {
    if (candidateRoles.length > 0 && selectedTargetId === null) {
      // Ưu tiên chọn vai trò CITIZEN hoặc vai trò đầu tiên trong danh sách
      const citizenRole = candidateRoles.find((r) => r.role_code === "CITIZEN");
      setSelectedTargetId(citizenRole ? citizenRole.role_id : candidateRoles[0].role_id);
    }
  }, [candidateRoles, selectedTargetId]);

  if (!isOpen || !role) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTargetId !== null) {
      onConfirm(selectedTargetId);
    }
  };

  return (
    <div className="rbac-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reassign-title">
      <div className="rbac-modal-card">
        <div className="modal-header">
          <div className="header-title-group">
            <div className="icon-badge warning" aria-hidden="true">👥</div>
            <h3 id="reassign-title">Chuyển giao người dùng & Xoá vai trò</h3>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="warning-callout">
              <span className="callout-icon" aria-hidden="true">⚠️</span>
              <span>
                Vai trò <strong>"{role.role_name}"</strong> hiện đang có <strong>{role.user_count} người dùng</strong>. Bạn bắt buộc phải chuyển giao toàn bộ người dùng sang một vai trò khác trước khi có thể xoá vai trò này.
              </span>
            </div>

            <div className="select-group">
              <label htmlFor="target-role-select">
                Chọn vai trò tiếp nhận người dùng:
              </label>
              <select
                id="target-role-select"
                className="role-target-select"
                value={selectedTargetId ?? ""}
                onChange={(e) => setSelectedTargetId(Number(e.target.value))}
                disabled={isSubmitting}
                required
              >
                {candidateRoles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name} ({r.scope_display} • {r.user_count} người dùng)
                  </option>
                ))}
              </select>
              <p className="select-hint">
                Toàn bộ {role.user_count} người dùng sẽ được cập nhật sang vai trò mới ngay lập tức.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Huỷ bỏ
            </button>
            <button
              type="submit"
              className="btn-primary-confirm"
              disabled={isSubmitting || selectedTargetId === null}
            >
              {isSubmitting ? "Đang chuyển giao & Xoá..." : "Chuyển giao & Xoá vai trò"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
