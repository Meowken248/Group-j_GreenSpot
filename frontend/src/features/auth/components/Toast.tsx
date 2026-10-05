import React, { useEffect } from "react";
import type { ToastState } from "../types/auth.types";
import "../styles/Toast.scss";

interface ToastProps {
  toast: ToastState | null;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!toast) return;

    // Tự động đóng toast sau 3 giây theo đặc tả
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onClose, duration]);

  if (!toast) return null;

  return (
    <div className="toast-container" aria-live="assertive">
      <div className={`toast-item toast-${toast.type}`} role="alert">
        <span className="toast-icon">
          {toast.type === "success" ? "✅" : "⚠️"}
        </span>
        <span className="toast-message">{toast.message}</span>
      </div>
    </div>
  );
};
