import React, { useEffect, useRef } from "react";
import { AUTH_STORAGE_KEYS } from "../types/auth.types";
import { resetSessionExpired } from "../services/sessionManager";
import "../styles/SessionExpiredModal.scss";

export interface SessionExpiredModalProps {
  isOpen: boolean;
  onRelogin: (redirectUrl?: string) => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onRelogin,
}) => {
  const reloginBtnRef = useRef<HTMLButtonElement>(null);

  // Tự động focus vào nút "Đăng nhập lại" khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        reloginBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Đặc tả: Bấm ESC không đóng được Popup
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        // Popup không đóng theo đặc tả
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Đặc tả: Bấm ra ngoài Popup không đóng được Popup
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    // Popup không đóng theo đặc tả
  };

  const handleReloginClick = () => {
    // 1. Xóa hai token khỏi localStorage theo đặc tả
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO);

    // 2. Đặt lại cờ session expired
    resetSessionExpired();

    // 3. Lấy đường dẫn trang đang xem làm tham số redirect
    const currentPath = window.location.pathname + window.location.search;
    const redirectUrl = currentPath === "/login" ? "/geo-feed" : currentPath;

    // 4. Chuyển về Màn 1 kèm redirect
    onRelogin(redirectUrl);
  };

  return (
    <div
      className="session-expired-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div
        className="session-expired-container"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="modal-tag">POPUP</span>

        <h3 id="session-expired-title" className="modal-title">
          PHIÊN ĐÃ HẾT HẠN
        </h3>

        <p className="modal-desc">
          Vui lòng đăng nhập lại
        </p>

        <div className="modal-actions">
          <button
            ref={reloginBtnRef}
            type="button"
            className="btn-relogin"
            onClick={handleReloginClick}
          >
            Đăng nhập lại
          </button>
        </div>
      </div>
    </div>
  );
};
