import React, { useEffect } from "react";

interface DiscardEditConfirmModalProps {
  isOpen: boolean;
  onConfirmDiscard: () => void;
  onStay: () => void;
}

export const DiscardEditConfirmModal: React.FC<DiscardEditConfirmModalProps> = ({
  isOpen,
  onConfirmDiscard,
  onStay,
}) => {
  // Đóng khi nhấn phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onStay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onStay]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop-overlay discard-confirm-overlay"
      onClick={onStay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-edit-title"
    >
      <div
        className="modal-double-bezel modal-confirm-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-inner-core">
          <div className="modal-eyebrow-pill">XÁC NHẬN THOÁT</div>
          <h3 id="discard-edit-title" className="modal-title-danger">
            Bạn có thay đổi chưa lưu. Bạn muốn thoát?
          </h3>
          <p className="modal-desc-text">
            Mọi nội dung chỉnh sửa chưa được lưu sẽ bị hủy bỏ và không thể khôi phục.
          </p>

          <div className="modal-actions-row">
            <button
              type="button"
              className="btn-modal-ghost"
              onClick={onStay}
              autoFocus
            >
              Ở lại chỉnh sửa
            </button>
            <button
              type="button"
              className="btn-modal-danger-solid"
              onClick={onConfirmDiscard}
            >
              Thoát và bỏ thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

