import React, { useState } from "react";
import type { CreateFloodSosPayload } from "../types/flood_sos.types";

interface FloodSosConfirmModalProps {
  isOpen: boolean;
  sosData: CreateFloodSosPayload | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const FloodSosConfirmModal: React.FC<FloodSosConfirmModalProps> = ({
  isOpen,
  sosData,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  const [networkError, setNetworkError] = useState(
    () => typeof window !== "undefined" && !navigator.onLine,
  );

  React.useEffect(() => {
    const handleOnline = () => setNetworkError(false);
    const handleOffline = () => setNetworkError(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSmsFallback = () => {
    if (!sosData) return;
    const smsBody = encodeURIComponent(
      `[SOS CUU HO] Toi can cuu tai ${sosData.address_text}. So nguoi: ${sosData.total_victims}. Tinh trang: ${sosData.description}`,
    );
    window.open(`sms:112?body=${smsBody}`, "_self");
  };

  const handleConfirmClick = () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setNetworkError(true);
      return;
    }
    onConfirm();
  };

  if (!isOpen || !sosData) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      data-testid="confirm-modal-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()} data-testid="confirm-modal-box">
        <div className="modal-header-tag">POPUP</div>

        <div className="modal-content">
          <div className="modal-icon danger-icon">🚨</div>
          <h3>GỬI YÊU CẦU CỨU HỘ?</h3>
          <p className="promise-text">Tình nguyện viên và đội gần nhất sẽ nhận</p>
          <p className="explain-text">
            Tín hiệu SOS sẽ lập tức được phát sóng qua mạng lưới WebSocket và Firebase tới tất cả các
            tình nguyện viên, đội cơ động và ca nô cứu nạn trong bán kính <strong>3km</strong> quanh
            vị trí của bạn.
          </p>

          {networkError && (
            <div className="network-error-banner" data-testid="network-error-banner">
              ⚠️ Lỗi kết nối mạng! Hệ thống đang tự động chuyển sang gửi tin nhắn SMS cứu hộ khẩn
              cấp...
            </div>
          )}
        </div>

        <div className="modal-actions">
          {networkError ? (
            <button
              type="button"
              className="btn-confirm btn-sms"
              onClick={handleSmsFallback}
              data-testid="btn-send-sms"
            >
              💬 Gửi SMS cứu nạn (112)
            </button>
          ) : (
            <button
              type="button"
              className="btn-confirm btn-danger"
              disabled={isLoading}
              onClick={handleConfirmClick}
              data-testid="btn-confirm-send-sos"
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ marginRight: 6 }}>
                    ⏳
                  </span>
                  Đang phát tín hiệu SOS...
                </>
              ) : (
                "Gửi"
              )}
            </button>
          )}

          <button
            type="button"
            className="btn-cancel"
            disabled={isLoading}
            onClick={onCancel}
            data-testid="btn-cancel-modal"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
};
