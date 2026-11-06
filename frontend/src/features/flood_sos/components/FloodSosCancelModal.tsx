import React, { useState } from "react";

interface FloodSosCancelModalProps {
  isOpen: boolean;
  rescuerDistanceMeters?: number | null;
  onConfirmCancel: (reason: string, isConfirmedNear: boolean) => Promise<boolean>;
  onKeep: () => void;
}

export const FloodSosCancelModal: React.FC<FloodSosCancelModalProps> = ({
  isOpen,
  rescuerDistanceMeters,
  onConfirmCancel,
  onKeep,
}) => {
  const [reason, setReason] = useState("Nước đã rút / Đã tự di chuyển an toàn");
  const [isNearWarningTriggered, setIsNearWarningTriggered] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!isOpen) return null;

  const isRescuerVeryNear =
    rescuerDistanceMeters !== undefined &&
    rescuerDistanceMeters !== null &&
    rescuerDistanceMeters < 100.0;

  const handleCancelSubmit = async () => {
    // Nếu người cứu hộ < 100m và chưa xác nhận qua cảnh báo vàng
    if (isRescuerVeryNear && !isNearWarningTriggered) {
      setIsNearWarningTriggered(true);
      return;
    }

    setIsCancelling(true);
    try {
      await onConfirmCancel(reason, isNearWarningTriggered);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onKeep}
      data-testid="cancel-modal-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()} data-testid="cancel-modal-box">
        <div className="modal-header-tag">POPUP</div>

        <div className="modal-content">
          <div className="modal-icon warning-icon">⚠️</div>
          <h3>HUỶ YÊU CẦU SOS?</h3>
          <p className="promise-text">Người cứu hộ sẽ được thông báo</p>
          <p className="explain-text">
            Khi huỷ, lực lượng cứu trợ sẽ nhận được thông báo để giải phóng phương tiện và chuyển
            hướng sang hỗ trợ các nạn nhân nguy cấp khác trong khu vực.
          </p>

          {/* Cảnh báo vàng khi người cứu hộ < 100m */}
          {(isRescuerVeryNear || isNearWarningTriggered) && (
            <div
              className="near-rescuer-warning-banner"
              data-testid="near-rescuer-warning-banner"
            >
              ⚠️ Cảnh báo: Người cứu hộ đã đến rất gần vị trí của bạn (
              {Math.round(rescuerDistanceMeters || 50)}m). Bạn có chắc chắn muốn huỷ yêu cầu?
            </div>
          )}

          <div style={{ width: "100%", textAlign: "left" }}>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: "600",
                display: "block",
                marginBottom: "0.25rem",
              }}
            >
              Lý do huỷ ca cứu hộ:
            </label>
            <input
              type="text"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e0",
                fontSize: "0.85rem",
              }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="input-cancel-reason"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-confirm btn-danger"
            disabled={isCancelling}
            onClick={handleCancelSubmit}
            data-testid="btn-confirm-cancel-sos"
          >
            {isCancelling ? "Đang huỷ..." : "Huỷ yêu cầu"}
          </button>

          <button
            type="button"
            className="btn-cancel"
            disabled={isCancelling}
            onClick={onKeep}
            data-testid="btn-keep-sos"
          >
            Giữ lại
          </button>
        </div>
      </div>
    </div>
  );
};
