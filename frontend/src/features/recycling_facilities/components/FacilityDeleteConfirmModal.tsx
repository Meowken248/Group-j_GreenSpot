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
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!isOpen || !facility) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await onConfirmDelete(facility.facility_id);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.detail || "Không thể xoá trạm. Vui lòng thử lại"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="facility-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Chặn đóng khi click ra ngoài theo đúng đặc tả SRS trang 191
        e.stopPropagation();
      }}
    >
      <div
        className="facility-modal-card delete-confirm-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* NHÃN POPUP NHỎ TRÊN ĐẦU */}
        <span className="popup-badge-label">POPUP</span>

        <div className="modal-header">
          <div className="header-icon-title">
            <span className="modal-icon delete-icon">⚠️</span>
            <div>
              <h3 className="modal-title">XÁC NHẬN XOÁ</h3>
              <p className="modal-subtitle">Bạn chắc chắn muốn xoá mục này?</p>
            </div>
          </div>
        </div>

        <div className="modal-body">
          {/* CẢNH BÁO DỮ LIỆU LIÊN QUAN */}
          <div className="delete-warning-box affected-data-box">
            <span className="warn-icon">ℹ️</span>
            <span className="warn-text">Dữ liệu liên quan sẽ bị ảnh hưởng</span>
          </div>

          {/* CHI TIẾT TÊN VÀ MÃ TRẠM ĐỂ ADMIN KIỂM TRA LẠI */}
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
                <span className="field-name">Quận/Huyện:</span>
                <span className="field-val">{facility.unit_name}</span>
              </div>
            )}
          </div>

          {/* DÒNG CẢNH BÁO MÀU VÀNG NẾU TRẠM ĐANG HOẠT ĐỘNG */}
          {facility.is_active && (
            <div className="delete-warning-yellow-banner">
              <span className="yellow-warn-icon">⚠️</span>
              <span className="yellow-warn-text">
                Trạm sẽ bị gỡ khỏi bản đồ và mã QR sẽ không còn hiệu lực
              </span>
            </div>
          )}

          {/* DÒNG THÔNG BÁO LỖI NẾU CÓ */}
          {errorMessage && (
            <div className="server-error-banner" style={{ marginTop: "12px" }}>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-actions">
            <button
              type="button"
              className="btn-modal-action btn-confirm-delete"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Đang xoá…" : "Xoá"}
            </button>
            <button
              type="button"
              className="btn-modal-action btn-cancel"
              onClick={onCancel}
              disabled={isDeleting}
            >
              Huỷ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
