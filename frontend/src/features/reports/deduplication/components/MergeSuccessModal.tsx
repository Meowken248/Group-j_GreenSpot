import React from 'react';

interface MergeSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MergeSuccessModal: React.FC<MergeSuccessModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
    >
      <div className="dedup-popup-box" onClick={(e) => e.stopPropagation()}>
        {/* Dòng nhỏ POPUP */}
        <div className="popup-small-tag">POPUP</div>

        {/* Tiêu đề in đậm ĐÃ GỘP BÁO CÁO */}
        <h2 id="success-modal-title" className="popup-main-title">
          ĐÃ GỘP BÁO CÁO
        </h2>

        {/* Dòng nội dung giải thích Người báo cáo nhận thông báo */}
        <p className="popup-explain-note" style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
          Người báo cáo nhận thông báo
        </p>

        <p className="popup-explain-note" style={{ marginTop: '-12px', marginBottom: '28px' }}>
          Hệ thống đã tự động gửi thông báo push/chuông đến tài khoản của công dân gửi báo cáo phụ, xác nhận sự cố của họ đã được tiếp nhận và liên kết vào hồ sơ xử lý chung.
        </p>

        {/* Nút Đóng duy nhất */}
        <div className="popup-actions-wrapper">
          <button
            type="button"
            className="popup-primary-btn"
            onClick={onClose}
            data-testid="btn-modal-dong"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
