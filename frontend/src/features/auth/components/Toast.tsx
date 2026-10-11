import React, { useEffect } from "react";
import type { ToastState } from "../types/auth.types";
import "../styles/Toast.scss";

export interface ToastProps {
  toast?: ToastState | null;
  message?: string;
  type?: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  toast,
  message,
  type = "success",
  onClose,
  duration = 3000,
}) => {
  const activeMessage = toast ? toast.message : message;
  const activeType = toast ? toast.type : type;

  useEffect(() => {
    if (!activeMessage) return;

    // Tự động đóng toast sau 3 giây theo đặc tả
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [activeMessage, onClose, duration]);

  if (!activeMessage) return null;

  return (
    <div className="toast-container" aria-live="assertive">
      <div className={`toast-item toast-${activeType}`} role="alert">
        <span className="toast-icon">
          {activeType === "success" ? "✅" : "⚠️"}
        </span>
        <span className="toast-message">{activeMessage}</span>
      </div>
    </div>
  );
};

