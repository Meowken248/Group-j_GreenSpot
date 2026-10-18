import React, { useState } from "react";
import type { DispatchOrderItem } from "../types/dispatch.types";

interface Screen4CancelModalProps {
  order: DispatchOrderItem | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirmCancel: (orderId: string, version: number, reason: string) => Promise<void>;
  onShowWarningToast: (msg: string) => void;
}

export const Screen4CancelModal: React.FC<Screen4CancelModalProps> = ({
  order,
  isOpen,
  isLoading,
  onClose,
  onConfirmCancel,
  onShowWarningToast,
}) => {
  const [cancelReason, setCancelReason] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  if (!isOpen || !order) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setErrorMessage("Vui lòng nhập lý do huỷ lệnh (bắt buộc)");
      onShowWarningToast("Vui lòng nhập lý do huỷ lệnh trước khi xác nhận.");
      return;
    }
    setErrorMessage("");
    await onConfirmCancel(order.order_id, order.version, cancelReason.trim());
  };

  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center"
      data-testid="modal-cancel-order"
    >
      <div className="modal-dialog-custom bg-white rounded-3 shadow-lg p-4 border border-danger-subtle">
        <div className="d-flex align-items-center mb-3">
          <div className="rounded-circle bg-danger-subtle text-danger p-2 me-3 d-flex align-items-center justify-content-center">
            <i className="bi bi-exclamation-triangle-fill fs-4"></i>
          </div>
          <div>
            <h4 className="modal-title-custom fw-bold text-danger mb-0">HUỶ LỆNH XỬ LÝ?</h4>
            <span className="text-muted small">Mã lệnh: {order.order_code}</span>
          </div>
        </div>

        <div className="alert alert-warning py-2 px-3 small mb-3">
          <i className="bi bi-info-circle me-1"></i>
          Lệnh điều động sẽ bị huỷ bỏ. Đội <strong>{order.team_name}</strong> sẽ nhận được thông báo huỷ tác nghiệp trên hiện trường.
        </div>

        <div className="mb-3 p-2 bg-light rounded border small">
          <div>
            <strong>Sự cố:</strong> {order.incident_title}
          </div>
          <div className="text-muted mt-1">
            <strong>Địa chỉ:</strong> {order.location_address}
          </div>
        </div>

        <form onSubmit={handleConfirm}>
          <div className="mb-3">
            <label htmlFor="cancel-reason-input" className="form-label required-label fw-semibold">
              Lý do huỷ lệnh
            </label>
            <textarea
              id="cancel-reason-input"
              rows={3}
              className={`form-control ${errorMessage ? "is-invalid" : ""}`}
              placeholder="Ví dụ: Sự cố đã được người dân tự khắc phục, Trùng lặp sự cố đã giao trước đó..."
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              disabled={isLoading}
              autoFocus
            />
            {errorMessage && <div className="invalid-feedback">{errorMessage}</div>}
            <div className="form-text">Bắt buộc nhập lý do huỷ để lưu vết nhật ký hệ thống.</div>
          </div>

          <div className="d-flex flex-column gap-2 pt-2 border-top">
            <button
              type="submit"
              className="btn btn-danger btn-pill-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className="bi bi-trash-fill me-1"></i>Huỷ lệnh
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-pill-secondary mt-0"
              onClick={onClose}
              disabled={isLoading}
            >
              Giữ lại
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
