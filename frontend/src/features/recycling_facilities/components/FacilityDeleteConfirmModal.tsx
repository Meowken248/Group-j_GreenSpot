import React from "react";
import type { RecyclingFacilityItem } from "../types/recyclingFacility.types";

interface FacilityDeleteConfirmModalProps {
  isOpen: boolean;
  facility: RecyclingFacilityItem | null;
  onConfirmDelete: (id: number) => Promise<void>;
  onCancel: () => void;
}

export const FacilityDeleteConfirmModal: React.FC<FacilityDeleteConfirmModalProps> = ({
  isOpen,
  facility,
  onConfirmDelete,
  onCancel,
}) => {
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  if (!isOpen || !facility) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirmDelete(facility.facility_id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="facility-modal-backdrop" role="dialog" aria-modal="true">
      <div className="facility-modal-card delete-confirm-card">
        <div className="modal-header">
          <div className="header-icon-title">
            <span className="modal-icon delete-icon">⚠️</span>
            <div>
              <h3 className="modal-title">Xác nhận xoá trạm tái chế</h3>
              <p className="modal-subtitle">Gỡ bỏ điểm tiếp nhận khỏi mạng lưới thu gom đô thị</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="delete-info-summary">
            <div className="summary-field">
              <span className="field-name">Mã trạm:</span>
              <span className="field-val font-mono">{facility.facility_code}</span>
            </div>
            <div className="summary-field">
              <span className="field-name">Tên trạm:</span>
              <span className="field-val font-bold">{facility.name}</span>
            </div>
            <div className="summary-field">
              <span className="field-name">Địa chỉ:</span>
              <span className="field-val">{facility.address}</span>
            </div>
            {facility.unit_name && (
              <div className="summary-field">
                <span className="field-name">Khu vực:</span>
                <span className="field-val">{facility.unit_name}</span>
              </div>
            )}
          </div>

          <div className="delete-warning-box">
            <span className="warn-icon">🚨</span>
            <div className="warn-text">
              <strong>Hệ quả thao tác xoá:</strong>
              <ul>
                <li>Trạm sẽ bị gỡ bỏ khỏi mạng lưới và không còn hiển thị trên bản đồ số WebGIS.</li>
                <li>Mã QR đã cấp cho trạm này sẽ bị vô hiệu hoá và người dân không thể quét tích điểm xanh tại điểm này nữa.</li>
              </ul>
            </div>
          </div>

          <p className="confirm-prompt-text">
            Bạn có chắc chắn muốn tiến hành xoá trạm <strong>{facility.name}</strong> không?
          </p>
        </div>

        <div className="modal-footer">
          <div className="footer-actions">
            <button
              type="button"
              className="btn-modal-action btn-confirm-delete"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Đang xử lý xoá…" : "Xác nhận xoá"}
            </button>
            <button
              type="button"
              className="btn-modal-action btn-cancel"
              onClick={onCancel}
              disabled={isDeleting}
            >
              Huỷ bỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

