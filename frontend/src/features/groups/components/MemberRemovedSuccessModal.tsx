/**
 * MemberRemovedSuccessModal.tsx
 * STT 04 - Màn 4/4: Popup Thông báo Đã xoá thành viên thành công
 * Tuân thủ đầy đủ đặc tả Báo cáo Đồ án (pp. 74-75):
 * - Tiêu đề ĐÃ XOÁ THÀNH VIÊN
 * - Dòng "Danh sách nhóm đã cập nhật"
 * - Dòng xám "{họ tên} đã bị xoá khỏi nhóm {tên nhóm}"
 * - Nút "Đóng" (mặc định focus)
 * - Phím ESC hoặc click outside đều đóng popup
 * - Sau khi đóng: Danh sách ở Màn 1 được tải lại, tổng số thành viên giảm 1
 */

import React, { useEffect, useRef } from "react";

interface MemberRemovedSuccessModalProps {
  isOpen: boolean;
  groupName: string;
  memberName: string;
  onClose: () => void;
}

export const MemberRemovedSuccessModal: React.FC<MemberRemovedSuccessModalProps> = ({
  isOpen,
  groupName,
  memberName,
  onClose,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Con trỏ mặc định đặt ở nút "Đóng"
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Phím ESC đóng modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="group-member-modal-backdrop"
      onClick={handleBackdropClick}
      data-testid="member-removed-success-backdrop"
    >
      <div className="modal-dialog-box" data-testid="member-removed-success-card">
        <div className="modal-super-label">POPUP</div>
        <h3 className="modal-main-title">ĐÃ XOÁ THÀNH VIÊN</h3>

        <div className="success-announcement-box">
          <p className="success-lead-text">Danh sách nhóm đã cập nhật</p>
          <p className="success-detail-text">
            <strong>{memberName}</strong> đã bị xoá khỏi nhóm <strong>{groupName}</strong>
          </p>
        </div>

        <div className="modal-actions-footer">
          <button
            ref={closeBtnRef}
            type="button"
            className="btn-modal btn-confirm-close"
            onClick={onClose}
            data-testid="btn-close-removed-modal"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

