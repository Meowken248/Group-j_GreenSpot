import React from "react";
import { IconAlertTriangle, IconFolderX } from "./ExportIcons";

interface ExportEmptyWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateRangeInvalid?: boolean;
  onFocusFilterField?: (fieldName: "district" | "date") => void;
}

export const ExportEmptyWarningModal: React.FC<ExportEmptyWarningModalProps> = ({
  isOpen,
  onClose,
  dateRangeInvalid = false,
  onFocusFilterField,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    // Tự động focus con trỏ vào ô chọn khoảng ngày hoặc quận/huyện ở Cột 1
    if (onFocusFilterField) {
      if (dateRangeInvalid) {
        onFocusFilterField("date");
      } else {
        onFocusFilterField("district");
      }
    }
  };

  return (
    <div
      className="export-modal-backdrop"
      data-testid="export-empty-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="export-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-empty-title"
        data-testid="export-empty-modal"
      >
        {/* Header Modal */}
        <div className="modal-header-section">
          <span className="modal-popup-tag">POPUP</span>
          <h3 id="modal-empty-title" className="modal-title-bold">
            KHÔNG CÓ DỮ LIỆU
          </h3>
        </div>

        {/* Body Modal */}
        <div className="modal-body-section">
          <div className="empty-warning-state">
            <div className="warning-icon-wrap" aria-label="Cảnh báo không có dữ liệu">
              {dateRangeInvalid ? <IconAlertTriangle size={34} /> : <IconFolderX size={34} />}
            </div>

            <div className="guide-text" data-testid="empty-guide-text">
              Hãy đổi bộ lọc
            </div>

            <div className="sub-guide">
              Không tìm thấy bất kỳ sự cố nào thỏa mãn tiêu chí lọc hiện tại. Khuyến nghị cán bộ mở rộng phạm vi thời gian hoặc giảm bớt các điều kiện lọc để thu thập được dữ liệu.
            </div>

            {/* Cảnh báo chi tiết màu đỏ nếu ngày bắt đầu > ngày kết thúc */}
            {dateRangeInvalid && (
              <div className="date-invalid-alert" data-testid="date-invalid-alert">
                <IconAlertTriangle size={16} style={{ display: "inline", marginRight: "6px" }} />
                Khoảng ngày không hợp lệ dẫn đến không có dữ liệu. Vui lòng kiểm tra lại.
              </div>
            )}
          </div>
        </div>

        {/* Footer Nút hành động duy nhất */}
        <div className="modal-actions-footer">
          <button
            type="button"
            className="btn-close-only"
            onClick={handleClose}
            data-testid="btn-empty-close"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
