import React, { useEffect } from "react";

interface Screen5CancelSuccessModalProps {
  isOpen: boolean;
  orderCode?: string | null;
  onClose: () => void;
}

export const Screen5CancelSuccessModal: React.FC<Screen5CancelSuccessModalProps> = ({
  isOpen,
  orderCode,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center"
      data-testid="modal-cancel-success"
    >
      <div className="modal-dialog-custom bg-white rounded-3 shadow-lg p-4 text-center border border-success-subtle animate-fade-in">
        <div className="mb-3">
          <div className="success-checkmark-circle mx-auto mb-3">
            <i className="bi bi-check-lg display-4 text-success"></i>
          </div>
          <h3 className="fw-bold text-success mb-1">ĐÃ HUỶ LỆNH</h3>
          {orderCode && <div className="text-muted small mb-2 font-monospace">{orderCode}</div>}
        </div>

        <p className="text-secondary mb-4">
          Lệnh xử lý đã được huỷ thành công. Danh sách lệnh đã được cập nhật.
        </p>

        <div className="d-flex justify-content-center">
          <button
            type="button"
            className="btn btn-success px-4 py-2"
            onClick={onClose}
            autoFocus
          >
            Đóng
          </button>
        </div>

        <div className="text-muted small mt-3 font-monospace">
          Tự động đóng sau 3 giây...
        </div>
      </div>
    </div>
  );
};
