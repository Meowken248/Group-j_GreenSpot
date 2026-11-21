import React, { useState, useEffect } from 'react';
import type { ComparisonResponse } from '../types/deduplication.types';

interface MergeConfirmModalProps {
  isOpen: boolean;
  data: ComparisonResponse;
  isLoading: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirmMerge: (primaryId: string, secondaryId: string) => void;
}

export const MergeConfirmModal: React.FC<MergeConfirmModalProps> = ({
  isOpen,
  data,
  isLoading,
  errorMessage,
  onCancel,
  onConfirmMerge,
}) => {
  const { report_a, report_b, ai_conclusion } = data;

  // Mặc định chọn báo cáo AI đề xuất (gửi sớm hơn) làm báo cáo chính
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>(
    ai_conclusion.recommended_primary_id || report_a.incident_id
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedPrimaryId(ai_conclusion.recommended_primary_id || report_a.incident_id);
    }
  }, [isOpen, ai_conclusion.recommended_primary_id, report_a.incident_id]);

  // Lắng nghe phím Esc để đóng modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const handleMergeSubmit = () => {
    const secondaryId = selectedPrimaryId === report_a.incident_id ? report_b.incident_id : report_a.incident_id;
    onConfirmMerge(selectedPrimaryId, secondaryId);
  };

  return (
    <div className="modal-overlay-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="dedup-popup-box">
        {/* Dòng nhỏ POPUP */}
        <div className="popup-small-tag">POPUP</div>

        {/* Tiêu đề in đậm GỘP BÁO CÁO? */}
        <h2 id="modal-title" className="popup-main-title">
          GỘP BÁO CÁO?
        </h2>

        {/* Khối chọn báo cáo chính (Radio buttons) */}
        <div className="primary-report-selector">
          <span className="selector-label">Chọn báo cáo chính:</span>

          {/* Lựa chọn Báo cáo A */}
          <label
            className={`radio-card-option ${selectedPrimaryId === report_a.incident_id ? 'selected' : ''}`}
            htmlFor="radio-report-a"
          >
            <input
              type="radio"
              id="radio-report-a"
              name="primary-report"
              value={report_a.incident_id}
              checked={selectedPrimaryId === report_a.incident_id}
              onChange={() => setSelectedPrimaryId(report_a.incident_id)}
              disabled={isLoading}
            />
            <div className="option-content">
              <span className="opt-name">Báo cáo A: #{report_a.tracking_code}</span>
              <span className="opt-desc">
                {report_a.reporter_name} • Gửi lúc {report_a.created_at_display}
              </span>
            </div>
          </label>

          {/* Lựa chọn Báo cáo B */}
          <label
            className={`radio-card-option ${selectedPrimaryId === report_b.incident_id ? 'selected' : ''}`}
            htmlFor="radio-report-b"
          >
            <input
              type="radio"
              id="radio-report-b"
              name="primary-report"
              value={report_b.incident_id}
              checked={selectedPrimaryId === report_b.incident_id}
              onChange={() => setSelectedPrimaryId(report_b.incident_id)}
              disabled={isLoading}
            />
            <div className="option-content">
              <span className="opt-name">Báo cáo B: #{report_b.tracking_code}</span>
              <span className="opt-desc">
                {report_b.reporter_name} • Gửi lúc {report_b.created_at_display}
              </span>
            </div>
          </label>
        </div>

        {/* Dòng giải thích */}
        <p className="popup-explain-note">
          Báo cáo phụ sẽ liên kết vào báo cáo chính (báo cáo phụ chuyển thành bản ghi đính kèm, bảo lưu quyền nhận điểm thưởng Công dân Xanh khi bãi rác được dọn dẹp sạch).
        </p>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="popup-error-message" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Khung nút chức năng */}
        <div className="popup-actions-wrapper">
          <button
            type="button"
            className="popup-primary-btn"
            onClick={handleMergeSubmit}
            disabled={isLoading}
            data-testid="btn-modal-gop"
          >
            {isLoading ? (
              <>
                <span className="mini-spinner" />
                <span>Đang xử lý gộp báo cáo…</span>
              </>
            ) : (
              'Gộp'
            )}
          </button>

          <button
            type="button"
            className="popup-cancel-btn"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="btn-modal-huy"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
};
