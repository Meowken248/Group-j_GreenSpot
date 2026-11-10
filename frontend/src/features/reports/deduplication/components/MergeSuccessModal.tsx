import React from 'react';
import { navigateToRoute } from '../../../../routes/appRoutes';

interface MergeSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterIncidentId?: string;
  onNavigateToTriage?: () => void;
  onNavigateToDispatch?: () => void;
}

export const MergeSuccessModal: React.FC<MergeSuccessModalProps> = ({
  isOpen,
  onClose,
  masterIncidentId: _masterIncidentId,
  onNavigateToTriage,
  onNavigateToDispatch,
}) => {
  if (!isOpen) return null;

  const handleTriageClick = () => {
    onClose();
    if (onNavigateToTriage) {
      onNavigateToTriage();
    } else {
      navigateToRoute("triage");
    }
  };

  const handleDispatchClick = () => {
    onClose();
    if (onNavigateToDispatch) {
      onNavigateToDispatch();
    } else {
      navigateToRoute("dispatch");
    }
  };

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

        <p className="popup-explain-note" style={{ marginTop: '-12px', marginBottom: '24px' }}>
          Hệ thống đã tự động gửi thông báo push/chuông đến tài khoản của công dân gửi báo cáo phụ, xác nhận sự cố của họ đã được tiếp nhận và liên kết vào hồ sơ xử lý chung.
        </p>

        {/* Khung nút hành động liên thông */}
        <div className="popup-actions-wrapper" style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="popup-secondary-btn"
            onClick={handleTriageClick}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #0284c7',
              background: '#f0f9ff',
              color: '#0369a1',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Chuyển đến thẩm định mức độ ưu tiên & SLA cho sự cố gốc"
          >
            🔍 Thẩm định sự cố gốc
          </button>

          <button
            type="button"
            className="popup-secondary-btn"
            onClick={handleDispatchClick}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #16a34a',
              background: '#f0fdf4',
              color: '#15803d',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Chuyển sang Trung tâm Điều phối tác nghiệp để giao việc"
          >
            🚀 Tạo lệnh điều phối
          </button>

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
