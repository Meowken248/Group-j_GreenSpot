import React, { useEffect } from "react";
import type { FriendItem } from "../types";
import { useLanguage } from "../../../i18n";

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
  const { currentLang } = useLanguage();
  const isEn = currentLang === "EN";

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
          aria-label={isEn ? "Close popup" : "Đóng popup"}
        >
          ✕
        </button>

        <div className="modal-danger-badge">
          ⚠️
        </div>

        <h3 id="unfriend-dialog-title" className="modal-header-title">
          {isEn ? "UNFRIEND?" : "HUỶ KẾT BẠN?"}
        </h3>

        <p className="modal-body-desc">
          {isEn ? (
            <>
              Are you sure you want to unfriend <strong>{friend.full_name}</strong>? You will no longer see each other's friend posts.
            </>
          ) : (
            <>
              Bạn có chắc chắn muốn huỷ kết bạn với <strong>{friend.full_name}</strong>? Hai người sẽ không còn xem được bài viết bạn bè của nhau.
            </>
          )}
        </p>

        <div className="modal-footer-actions">
          <button
            type="button"
            className="btn-cancel-modal"
            onClick={onClose}
            disabled={isProcessing}
          >
            {isEn ? "Close" : "Đóng"}
          </button>
          <button
            type="button"
            className="btn-confirm-unfriend"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (isEn ? "Processing…" : "Đang xử lý…") : (isEn ? "Confirm Unfriend" : "Xác nhận hủy")}
          </button>
        </div>
      </div>
    </div>
  );
};
