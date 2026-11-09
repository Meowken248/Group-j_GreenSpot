import React, { useEffect, useRef } from "react";
import "../styles/LogoutConfirmModal.scss";

export interface LogoutConfirmModalProps {
  isOpen: boolean;
  isAllDevices?: boolean;
  deviceName?: string;
  isCurrentDevice?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  isAllDevices = false,
  deviceName,
  isCurrentDevice = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Đặc tả: Con trỏ mặc định đặt ở nút "Huỷ" để tránh bấm nhầm bằng Enter
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Đặc tả: Nhấn phím ESC có tác dụng giống bấm "Huỷ", không cho đóng khi đang loading
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  // Bấm ra ngoài Popup có tác dụng giống bấm "Huỷ"
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  };

  return (
    <div
      className="logout-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div className="logout-modal-container">
        <span className="modal-tag">POPUP</span>

        <h3 id="logout-modal-title" className="modal-title">
          {isAllDevices ? "ĐĂNG XUẤT TẤT CẢ THIẾT BỊ?" : "ĐĂNG XUẤT THIẾT BỊ?"}
        </h3>

        <p className="modal-desc">
          {isAllDevices
            ? "Phiên trên tất cả thiết bị, kể cả thiết bị này, sẽ bị thu hồi"
            : "Phiên trên thiết bị này sẽ bị thu hồi"}
        </p>

        {/* Dạng 1: Dòng chữ xám nhỏ ghi tên thiết bị */}
        {!isAllDevices && deviceName && (
          <div className="modal-device-meta">
            {deviceName}
          </div>
        )}

        {/* Nếu là thiết bị đang dùng -> Cảnh báo bổ sung */}
        {!isAllDevices && isCurrentDevice && (
          <p className="modal-warning-highlight">
            Bạn sẽ bị đăng xuất khỏi thiết bị này
          </p>
        )}

        <div className="modal-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            Huỷ
          </button>

          <button
            type="button"
            className="btn-confirm-logout"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="btn-spinner" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              "Đăng xuất"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
