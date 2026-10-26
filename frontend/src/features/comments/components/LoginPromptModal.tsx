import React from "react";

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateLogin: () => void;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  isOpen,
  onClose,
  onNavigateLogin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="comment-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="comment-prompt-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="prompt-modal-icon">🌱</div>

        <h3 className="prompt-modal-title">Yêu cầu đăng nhập</h3>

        <p className="prompt-modal-message">
          Vui lòng đăng nhập để bình luận và tương tác cùng cộng đồng GreenSpot.
        </p>

        <div className="prompt-modal-actions">
          <button
            type="button"
            className="btn-prompt-secondary"
            onClick={onClose}
          >
            Để sau
          </button>

          <button
            type="button"
            className="btn-prompt-primary"
            onClick={() => {
              onClose();
              onNavigateLogin();
            }}
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  );
};

