import React, { useEffect } from "react";
import type { TransactionDetailResponse } from "../types";

interface TransactionDetailModalProps {
  data: TransactionDetailResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  data,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  return (
    <div
      className="reward-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div
        className="reward-modal-card tx-detail-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nhãn POPUP theo quy chuẩn đặc tả báo cáo */}
        <div className="modal-header-tag">POPUP</div>

        {/* Tiêu đề in đậm CHI TIẾT GIAO DỊCH */}
        <h2 id="tx-modal-title" className="tx-modal-title">
          CHI TIẾT GIAO DỊCH
        </h2>
        <div className="tx-modal-code-badge">{data.transaction_code}</div>

        {/* Khối chứng từ điện tử đối soát */}
        <div className="tx-details-sheet">
          <div className="tx-sheet-row">
            <span className="sheet-label">Hành động:</span>
            <span className="sheet-val bold-text">{data.action_name}</span>
          </div>

          <div className="tx-sheet-row">
            <span className="sheet-label">Biến động điểm:</span>
            <span
              className={`sheet-val points-badge ${
                data.is_positive ? "positive-points" : "negative-points"
              }`}
            >
              {data.is_positive
                ? `+${data.points_amount} điểm`
                : `${data.points_amount} điểm`}
            </span>
          </div>

          <div className="tx-sheet-row">
            <span className="sheet-label">Số dư sau giao dịch:</span>
            <span className="sheet-val">
              {data.balance_after.toLocaleString("vi-VN")} Điểm Xanh
            </span>
          </div>

          <div className="tx-sheet-row">
            <span className="sheet-label">Trạng thái:</span>
            <span className="sheet-val status-success">
              <span className="status-dot">🟢</span> {data.status}
            </span>
          </div>

          <div className="tx-sheet-row">
            <span className="sheet-label">Thời gian ghi nhận:</span>
            <span className="sheet-val time-val">{data.formatted_time}</span>
          </div>

          <div className="tx-sheet-row">
            <span className="sheet-label">Mã hệ thống (UUID):</span>
            <span className="sheet-val mono-val">{data.transaction_id}</span>
          </div>

          {data.description && (
            <div className="tx-sheet-row">
              <span className="sheet-label">Ghi chú nội dung:</span>
              <span className="sheet-val italic-text">{data.description}</span>
            </div>
          )}

          {data.audit_note && (
            <div className="tx-sheet-audit-box">
              <span className="audit-icon">🛡️</span>
              <span>{data.audit_note}</span>
            </div>
          )}
        </div>

        {/* Nút Đóng popup */}
        <div className="modal-actions-row">
          <button
            type="button"
            className="btn-modal-action btn-close-modal full-width"
            onClick={onClose}
          >
            Đóng chứng từ
          </button>
        </div>
      </div>
    </div>
  );
};
