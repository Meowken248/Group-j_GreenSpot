import React, { useEffect } from "react";
import "../styles/OtpErrorModal.scss";

interface OtpErrorModalProps {
  isOpen: boolean;
  isLocked: boolean; // Sai quá 5 lần -> dạng rút gọn
  countdownSeconds: number; // Thời gian còn lại của bộ đếm 60s
  onRetry: () => void; // Xử lý bấm "Nhập lại"
  onResend: () => void; // Xử lý bấm "Gửi mã mới"
}

export const OtpErrorModal: React.FC<OtpErrorModalProps> = ({
  isOpen,
  isLocked,
  countdownSeconds,
  onRetry,
  onResend,
}) => {
  // Lắng nghe phím ESC: Chỉ đóng khi CHƯA bị khóa (isLocked = false)
  useEffect(() => {
    if (!isOpen || isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onRetry();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLocked, onRetry]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Chỉ đóng khi click ngoài và chưa bị khóa
    if (e.target === e.currentTarget && !isLocked) {
      onRetry();
    }
  };

  return (
    <div
      className="otp-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-error-title"
    >
      <div className="otp-error-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon-badge" aria-hidden="true">
          ⚠️
        </div>

        <h2 id="otp-error-title" className="modal-title">
          MÃ OTP KHÔNG HỢP LỆ
        </h2>

        <p className={`modal-description ${isLocked ? "locked-text" : ""}`}>
          {isLocked
            ? "Bạn đã nhập sai quá 5 lần. Vui lòng gửi mã mới"
            : "Mã sai hoặc đã hết hạn"}
        </p>

        <div className="modal-action-buttons">
          {/* Khi chưa bị khóa thì mới có nút "Nhập lại" */}
          {!isLocked && (
            <button
              type="button"
              className="btn-modal-retry"
              onClick={onRetry}
              autoFocus
            >
              Nhập lại
            </button>
          )}

          {/* Nút "Gửi mã mới" */}
          <button
            type="button"
            className="btn-modal-resend"
            onClick={onResend}
            disabled={countdownSeconds > 0}
          >
            {countdownSeconds > 0
              ? `Gửi mã mới (còn ${countdownSeconds}s)`
              : "Gửi mã mới"}
          </button>
        </div>
      </div>
    </div>
  );
};
