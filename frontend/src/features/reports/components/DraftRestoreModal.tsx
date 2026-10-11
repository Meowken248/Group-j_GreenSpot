import React from "react";
import type { DraftData } from "../types/report.types";

interface DraftRestoreModalProps {
  isOpen: boolean;
  draft: DraftData | null;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
}

export const DraftRestoreModal: React.FC<DraftRestoreModalProps> = ({
  isOpen,
  draft,
  onResumeDraft,
  onDiscardDraft,
}) => {
  if (!isOpen || !draft) return null;

  const savedTime = draft.saved_at
    ? new Date(draft.saved_at).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    })
    : "";

  return (
    <div className="report-modal-backdrop">
      <div className="report-modal-dialog draft-modal-card">
        <div className="modal-icon-badge">💾</div>
        <h3 className="modal-title">Phát hiện bản nháp chưa hoàn tất</h3>
        <p className="modal-message">
          Bạn có một bản nháp chưa gửi. Bạn muốn tiếp tục?
        </p>

        <div className="draft-preview-box">
          <div className="draft-row">
            <span className="draft-k">Loại:</span>
            <span className="draft-v">{draft.formData.category_name || "Chưa chọn"}</span>
          </div>
          {draft.formData.title && (
            <div className="draft-row">
              <span className="draft-k">Tiêu đề:</span>
              <span className="draft-v font-bold">{draft.formData.title}</span>
            </div>
          )}
          <div className="draft-row">
            <span className="draft-k">Đã lưu lúc:</span>
            <span className="draft-v">{savedTime} (Bước {draft.current_step}/5)</span>
          </div>
        </div>

        <div className="modal-action-buttons">
          <button
            type="button"
            className="btn-modal-secondary btn-discard-draft"
            onClick={onDiscardDraft}
          >
            🗑️ Bắt đầu mới
          </button>
          <button
            type="button"
            className="btn-modal-primary btn-resume-draft"
            onClick={onResumeDraft}
          >
            ✏️ Tiếp tục soạn
          </button>
        </div>
      </div>
    </div>
  );
};
