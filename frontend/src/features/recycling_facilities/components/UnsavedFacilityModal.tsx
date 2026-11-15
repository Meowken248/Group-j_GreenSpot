import React from "react";

interface UnsavedFacilityModalProps {
  isOpen: boolean;
  onConfirmExit: () => void;
  onStay: () => void;
}

export const UnsavedFacilityModal: React.FC<UnsavedFacilityModalProps> = ({
  isOpen,
  onConfirmExit,
  onStay,
}) => {
  if (!isOpen) return null;

  return (
    <div className="facility-modal-backdrop" role="dialog" aria-modal="true">
      <div className="facility-modal-card unsaved-warning-card">
        <div className="modal-header">
          <div className="header-icon-title">
            <span className="modal-icon unsaved-icon">⚠️</span>
            <div>
              <h3 className="modal-title">Thay đổi chưa được lưu</h3>
              <p className="modal-subtitle">Xác nhận trước khi rời khỏi màn hình nhập liệu</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onStay}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="unsaved-desc">
            Bạn có các thông tin thay đổi chưa được lưu. Nếu thoát ngay bây giờ, các dữ liệu vừa nhập sẽ bị mất.
          </p>
          <p className="unsaved-prompt">
            Bạn có chắc chắn muốn rời khỏi form không?
          </p>
        </div>

        <div className="modal-footer">
          <div className="footer-actions">
            <button
              type="button"
              className="btn-modal-action btn-discard"
              onClick={onConfirmExit}
            >
              Rời khỏi (Không lưu)
            </button>
            <button
              type="button"
              className="btn-modal-action btn-stay"
              onClick={onStay}
            >
              Tiếp tục chỉnh sửa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

