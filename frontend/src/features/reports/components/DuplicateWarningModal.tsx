import React from "react";
import type { DuplicateIncident } from "../types/report.types";

interface DuplicateWarningModalProps {
  isOpen: boolean;
  duplicates: DuplicateIncident[];
  onConfirmSendAnyway: () => void;
  onViewExistingIncident: (incident: DuplicateIncident) => void;
  onClose: () => void;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  duplicates,
  onConfirmSendAnyway,
  onViewExistingIncident,
  onClose,
}) => {
  if (!isOpen || duplicates.length === 0) return null;

  const topDup = duplicates[0];

  return (
    <div className="report-modal-backdrop" onClick={onClose}>
      <div className="report-modal-dialog duplicate-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon-badge warning-badge">⚠️</div>
        <h3 className="modal-title">Phát hiện sự cố tương tự lân cận</h3>
        <p className="modal-message font-medium">
          Có phản ánh tương tự gần đây. Bạn vẫn muốn gửi?
        </p>

        <div className="duplicate-card-item">
          <div className="dup-header">
            <span className="dup-code">{topDup.tracking_code}</span>
            <span className="dup-dist">Cách ~{topDup.distance_meters}m</span>
          </div>
          <h4 className="dup-title">{topDup.title}</h4>
          <p className="dup-addr">📍 {topDup.address_text}</p>
          <div className="dup-status-row">
            <span className="dup-tag">{topDup.category_name}</span>
            <span className="dup-status-badge">Trạng thái: Đang xử lý</span>
          </div>
        </div>

        <p className="modal-subtext">
          Đơn vị quản lý địa bàn có thể đã tiếp nhận sự cố này. Bạn có thể xem tiến độ báo cáo hiện có hoặc vẫn tiếp tục gửi thông tin bổ sung.
        </p>

        <div className="modal-action-buttons">
          <button
            type="button"
            className="btn-modal-secondary btn-view-dup"
            onClick={() => onViewExistingIncident(topDup)}
          >
            🔍 Xem báo cáo đó
          </button>
          <button
            type="button"
            className="btn-modal-primary btn-force-submit"
            onClick={onConfirmSendAnyway}
          >
            🚀 Vẫn gửi
          </button>
        </div>
      </div>
    </div>
  );
};
