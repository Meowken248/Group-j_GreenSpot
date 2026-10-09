import React, { useEffect } from "react";
import type { FriendItem } from "../types";

interface UnfriendModalProps {
  friend: FriendItem | null;
  isOpen: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const UnfriendModal: React.FC<UnfriendModalProps> = ({
  friend,
  isOpen,
  isProcessing,
  onClose,
  onConfirm,
}) => {
  // Lắng nghe phím ESC để đóng modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen || !friend) return null;

  return (
    <div
      className="unfriend-modal-overlay"
      onClick={(e) => {
        // Click ra ngoài vùng modal để đóng
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unfriend-dialog-title"
    >
      <div className="unfriend-modal-content">
        <button
          type="button"
          className="modal-close-icon"
          onClick={onClose}
          disabled={isProcessing}
          aria-label="Đóng popup"
        >
          ✕
        </button>

        <div className="modal-danger-badge">
          ⚠️
        </div>

        <h3 id="unfriend-dialog-title" className="modal-header-title">
          HUỶ KẾT BẠN?
        </h3>

        <p className="modal-body-desc">
          Bạn có chắc chắn muốn huỷ kết bạn với <strong>{friend.full_name}</strong>? Hai người sẽ không còn xem được bài viết bạn bè của nhau.
        </p>

        <div className="modal-footer-actions">
          <button
            type="button"
            className="btn-cancel-modal"
            onClick={onClose}
            disabled={isProcessing}
          >
            Đóng
          </button>
          <button
            type="button"
            className="btn-confirm-unfriend"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? "Đang xử lý…" : "Xác nhận hủy"}
          </button>
        </div>
      </div>
    </div>
  );
};
