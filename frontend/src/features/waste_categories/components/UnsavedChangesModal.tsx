import React from "react";

interface Props {
  isOpen: boolean;
  onConfirmExit: () => void;
  onStay: () => void;
}

export const UnsavedChangesModal: React.FC<Props> = ({
  isOpen,
  onConfirmExit,
  onStay,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="waste-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="waste-modal-card waste-modal-unsaved-card">
        <div className="waste-modal-tag-badge">
          <span className="badge-popup">POPUP</span>
        </div>

        <h3 id="unsaved-changes-title" className="waste-modal-title">
          ❓ XÁC NHẬN THOÁT
        </h3>

        <p className="unsaved-modal-msg">
          Bạn có thay đổi chưa lưu. Bạn muốn thoát?
        </p>

        <div className="waste-modal-actions">
          <button
            type="button"
            className="btn-danger-confirm btn-exit"
            onClick={onConfirmExit}
          >
            Thoát
          </button>
          <button
            type="button"
            className="btn-secondary-cancel btn-stay"
            onClick={onStay}
            autoFocus
          >
            Ở lại
          </button>
        </div>
      </div>
    </div>
  );
};

