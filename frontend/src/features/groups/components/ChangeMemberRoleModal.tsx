/**
 * ChangeMemberRoleModal.tsx
 * STT 04 - Màn 2/4: Popup Đổi vai trò thành viên
 * Tuân thủ đầy đủ đặc tả Báo cáo Đồ án (pp. 69-71):
 * - 3 radio options dạng nút tròn xếp dọc (Quản trị nhóm, Kiểm duyệt viên, Thành viên)
 * - Nút Lưu xám khi chưa chọn vai trò mới
 * - Cảnh báo tự hạ quyền chữ đỏ: "Bạn sẽ không còn quyền quản trị nhóm này"
 * - Hỗ trợ phím ESC, phím mũi tên lên/xuống, Enter khi Lưu sáng
 * - Optimistic locking (Rule 7)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { groupService } from "../services/groupService";
import type { GroupMemberItem } from "../types/group";

interface ChangeMemberRoleModalProps {
  isOpen: boolean;
  groupId: string;
  member: GroupMemberItem | null;
  isSelf: boolean;
  onClose: () => void;
  onSuccess: (updated: GroupMemberItem, message: string) => void;
  onErrorToast: (message: string) => void;
}

const ROLE_OPTIONS = [
  {
    role: "ADMIN",
    name: "Quản trị nhóm",
    desc: "Toàn quyền với nhóm: đổi vai trò, xoá thành viên, kiểm duyệt nội dung",
  },
  {
    role: "MODERATOR",
    name: "Kiểm duyệt viên",
    desc: "Kiểm duyệt bài viết, bình luận và xoá Thành viên",
  },
  {
    role: "MEMBER",
    name: "Thành viên",
    desc: "Xem, đăng bài và bình luận trong nhóm",
  },
];

export const ChangeMemberRoleModal: React.FC<ChangeMemberRoleModalProps> = ({
  isOpen,
  groupId,
  member,
  isSelf,
  onClose,
  onSuccess,
  onErrorToast,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>("MEMBER");
  const [loading, setLoading] = useState<boolean>(false);
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
    }
  }, [member]);

  const isRoleChanged = Boolean(member && selectedRole !== member.role);
  const showSelfDemoteWarning = Boolean(
    isSelf && member?.role === "ADMIN" && selectedRole !== "ADMIN"
  );

  const handleSave = useCallback(async () => {
    if (!member || !isRoleChanged || loading) return;

    try {
      setLoading(true);
      const updated = await groupService.updateMemberRole(groupId, member.user_id, {
        new_role: selectedRole,
        version: member.version,
      });

      const roleObj = ROLE_OPTIONS.find((r) => r.role === selectedRole);
      const newRoleName = roleObj ? roleObj.name : selectedRole;
      onSuccess(updated, `Đã đổi vai trò của ${member.full_name} thành ${newRoleName}`);
      onClose();
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      let errorMsg =
        typeof detail === "string"
          ? detail
          : detail?.message || "Không thể đổi vai trò. Vui lòng thử lại";

      if (status === 409 || detail?.code === "ROLE_CHANGED") {
        errorMsg = "Vai trò của thành viên đã bị thay đổi. Danh sách đã được tải lại";
      }

      onErrorToast(errorMsg);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [groupId, isRoleChanged, loading, member, onClose, onErrorToast, onSuccess, selectedRole]);

  // Bắt phím ESC và phím tắt bàn phím
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = ROLE_OPTIONS.findIndex((r) => r.role === selectedRole);
        const nextIndex = (currentIndex + 1) % ROLE_OPTIONS.length;
        setSelectedRole(ROLE_OPTIONS[nextIndex].role);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = ROLE_OPTIONS.findIndex((r) => r.role === selectedRole);
        const prevIndex = (currentIndex - 1 + ROLE_OPTIONS.length) % ROLE_OPTIONS.length;
        setSelectedRole(ROLE_OPTIONS[prevIndex].role);
      } else if (e.key === "Enter") {
        if (member && selectedRole !== member.role) {
          e.preventDefault();
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedRole, member, loading, handleSave, onClose]);

  if (!isOpen || !member) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <div
      className="group-member-modal-backdrop"
      onClick={handleBackdropClick}
      data-testid="change-role-modal-backdrop"
    >
      <div className="modal-dialog-box" data-testid="change-role-modal-card">
        <div className="modal-super-label">POPUP</div>
        <h3 className="modal-main-title">ĐỔI VAI TRÒ</h3>
        <p className="modal-member-subtext">
          Thành viên: <strong>{member.full_name}</strong>
        </p>

        {/* 3 lựa chọn radio */}
        <div className="radio-role-options-list" role="radiogroup">
          {ROLE_OPTIONS.map((opt) => {
            const isCurrent = opt.role === member.role;
            const isSelected = opt.role === selectedRole;

            return (
              <label
                key={opt.role}
                className={`radio-role-item ${isSelected ? "selected" : ""}`}
                data-testid={`radio-role-item-${opt.role}`}
                onClick={() => !loading && setSelectedRole(opt.role)}
              >
                <input
                  type="radio"
                  name="group_member_role"
                  value={opt.role}
                  checked={isSelected}
                  disabled={loading}
                  onChange={() => setSelectedRole(opt.role)}
                />
                <div className="role-text-block">
                  <div className="role-header-line">
                    <span className="role-name-text">{opt.name}</span>
                    {isCurrent && <span className="current-role-badge">Hiện tại</span>}
                  </div>
                  <p className="role-desc-text">{opt.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Cảnh báo tự hạ quyền */}
        {showSelfDemoteWarning && (
          <div className="self-demote-warning-alert" data-testid="self-demote-warning">
            ⚠️ Bạn sẽ không còn quyền quản trị nhóm này
          </div>
        )}

        {/* Cụm nút Lưu & Huỷ */}
        <div className="modal-actions-footer">
          <button
            type="button"
            className="btn-modal btn-cancel"
            onClick={onClose}
            disabled={loading}
            data-testid="btn-cancel-change-role"
          >
            Huỷ
          </button>
          <button
            ref={saveBtnRef}
            type="button"
            className="btn-modal btn-confirm-save"
            onClick={handleSave}
            disabled={!isRoleChanged || loading}
            data-testid="btn-save-change-role"
          >
            {loading && <span className="spinner-icon" />}
            <span>Lưu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
