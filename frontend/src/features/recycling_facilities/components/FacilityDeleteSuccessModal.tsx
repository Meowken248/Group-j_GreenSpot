import React from "react";
import type { RecyclingFacilityItem } from "../types/recyclingFacility.types";

interface FacilityDeleteSuccessModalProps {
  isOpen: boolean;
  facility: RecyclingFacilityItem | null;
  onClose: () => void;
}

export const FacilityDeleteSuccessModal: React.FC<FacilityDeleteSuccessModalProps> = ({
  isOpen,
  facility,
  onClose,
}) => {
  if (!isOpen || !facility) return null;

  return (
    <div className="facility-modal-backdrop" role="dialog" aria-modal="true">
      <div className="facility-modal-card delete-success-card">
        <div className="modal-header">
          <div className="header-icon-title">
            <span className="modal-icon success-icon">✅</span>
            <div>
              <h3 className="modal-title">Xoá trạm thành công</h3>
              <p className="modal-subtitle">Trạm đã được gỡ bỏ khỏi mạng lưới thu gom đô thị</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="success-message-box">
            <p className="success-main-msg">
              Trạm tái chế <strong>{facility.name}</strong> (Mã: <code>{facility.facility_code}</code>) đã được xoá an toàn khỏi hệ thống.
            </p>
            <p className="success-sub-msg">
              Bản ghi đã được chuyển sang trạng thái lưu trữ (Soft Delete) và ghi nhận vào Nhật ký kiểm toán (Audit Log) theo tiêu chuẩn bảo toàn dữ liệu.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-actions">
            <button
              type="button"
              className="btn-modal-action btn-success-close"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

