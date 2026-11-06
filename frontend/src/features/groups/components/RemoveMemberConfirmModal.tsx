/**
 * RemoveMemberConfirmModal.tsx
 * STT 04 - Màn 3/4: Popup Xác nhận xoá thành viên khỏi nhóm
 * Tuân thủ đầy đủ đặc tả Báo cáo Đồ án (pp. 72-74):
 * - Tiêu đề XOÁ KHỎI NHÓM?
 * - Dòng "Thành viên sẽ không xem được bài trong nhóm"
 * - Dòng xám "Thành viên: {họ tên} ({vai trò})"
 * - Dòng xám "Bài viết và bình luận của người này trong nhóm được giữ nguyên"
 * - Nút "Xoá" (đỏ) và nút "Huỷ"
 * - Con trỏ mặc định đặt ở nút "Huỷ"
 * - Nhấn ESC hoặc bấm ra ngoài đóng Popup
 * - Xoá và ghi Audit Log trong cùng transaction (Rule 6)
 */

import React, { useState, useEffect, useRef } from "react";
import { groupService } from "../services/groupService";
import type { GroupMemberItem } from "../types/group";

interface RemoveMemberConfirmModalProps {
  isOpen: boolean;
  groupId: string;
  member: GroupMemberItem | null;
  onClose: () => void;
  onSuccess: (removedMember: GroupMemberItem) => void;
  onErrorToast: (message: string) => void;
}

const ROLE_NAME_MAP: Record<string, string> = {
  ADMIN: "Quản trị nhóm",
  MODERATOR: "Kiểm duyệt viên",
  MEMBER: "Thành viên",
};

export const RemoveMemberConfirmModal: React.FC<RemoveMemberConfirmModalProps> = ({
  isOpen,
  groupId,
  member,
  onClose,
  onSuccess,
  onErrorToast,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Con trỏ mặc định đặt ở nút "Huỷ" để tránh bấm nhầm
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Phím ESC đóng modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !member) return null;

  const roleDisplay = ROLE_NAME_MAP[member.role] || member.role;

  const handleDelete = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await groupService.removeMember(groupId, member.user_id);
      onSuccess(member);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const errorMsg =
        typeof detail === "string"
          ? detail
          : detail?.message || "Không thể xoá thành viên. Vui lòng thử lại";
      onErrorToast(errorMsg);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop-overlay"
      onClick={handleBackdropClick}
      data-testid="remove-member-modal-backdrop"
    >
      <div className="modal-dialog-box" data-testid="remove-member-modal-card">
        <div className="modal-super-label">POPUP</div>
        <h3 className="modal-main-title">XOÁ KHỎI NHÓM?</h3>

        <div className="remove-warning-box">
          <p className="warning-lead-text">Thành viên sẽ không xem được bài trong nhóm</p>
          <p className="gray-detail-line">
            Thành viên: <strong>{member.full_name}</strong> ({roleDisplay})
          </p>
          <p className="gray-detail-line">
            Bài viết và bình luận của người này trong nhóm được giữ nguyên
          </p>
        </div>

        <div className="modal-actions-footer">
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn-modal btn-cancel"
            onClick={onClose}
            disabled={loading}
            data-testid="btn-cancel-remove"
          >
            Huỷ
          </button>
          <button
            type="button"
            className="btn-modal btn-confirm-delete"
            onClick={handleDelete}
            disabled={loading}
            data-testid="btn-confirm-remove"
          >
            {loading && <span className="spinner-icon" />}
            <span>Xoá</span>
          </button>
        </div>
      </div>
    </div>
  );
};
