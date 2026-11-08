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
    <div
      className="facility-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Chặn đóng khi click ra ngoài theo đúng đặc tả SRS trang 192
        e.stopPropagation();
      }}
    >
      <div
        className="facility-modal-card delete-success-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* DÒNG NHỎ POPUP TRÊN ĐẦU */}
        <span className="popup-badge-label">POPUP</span>

        <div className="modal-header">
          <div className="header-icon-title">
            <span className="modal-icon success-icon">✅</span>
            <div>
              <h3 className="modal-title">ĐÃ XOÁ THÀNH CÔNG</h3>
              <p className="modal-subtitle">Danh sách đã được cập nhật</p>
            </div>
          </div>
        </div>

        <div className="modal-body">
          <div className="success-message-box">
            <p className="success-main-msg">
              Trạm tái chế <strong>{facility.name}</strong> (Mã:{" "}
              <code>{facility.facility_code}</code>) đã được xoá an toàn.
            </p>
            <p className="success-sub-msg">
              Mã QR đã được vô hiệu hoá, đồng thời toàn bộ lịch sử quét mã và
              điểm thưởng tích luỹ trước đó vẫn được bảo toàn nguyên vẹn.
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
