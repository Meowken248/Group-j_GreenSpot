import React, { useState, useEffect } from "react";
import { groupService } from "../services/groupService";

interface DisbandGroupModalProps {
  groupId: string;
  groupName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DisbandGroupModal: React.FC<DisbandGroupModalProps> = ({
  groupId,
  groupName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [confirmationName, setConfirmationName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirmationName("");
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Hỗ trợ đóng bằng ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const isNameMatched = confirmationName.trim() === groupName.trim();

  const handleDisband = async () => {
    if (!isNameMatched || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await groupService.disbandGroup(groupId, confirmationName);
      setIsSubmitting(false);
      onSuccess();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.response?.data?.detail || "Không thể giải tán nhóm. Vui lòng thử lại");
    }
  };

  return (
    <div
      className="group-modal-backdrop"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      data-testid="disband-group-modal"
    >
      <div
        className="modal-dialog warning-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-tag">POPUP</div>
        <div className="modal-title" data-testid="modal-title-disband">
          GIẢI TÁN NHÓM?
        </div>
        <div className="modal-description" data-testid="modal-desc-disband">
          Bạn chắc chắn muốn giải tán nhóm này? Toàn bộ bài viết trong nhóm sẽ bị xoá và không thể khôi phục.
        </div>

        <div className="modal-input-box">
          <label htmlFor="confirm-name-input">
            Gõ chính xác tên nhóm <strong>"{groupName}"</strong> để xác nhận:
          </label>
          <input
            id="confirm-name-input"
            data-testid="input-confirm-group-name"
            type="text"
            placeholder="Gõ tên nhóm để xác nhận"
            value={confirmationName}
            onChange={(e) => {
              setConfirmationName(e.target.value);
              setErrorMessage(null);
            }}
            disabled={isSubmitting}
            autoFocus
          />
          {confirmationName.trim() && !isNameMatched && (
            <div
              style={{ fontSize: 12, color: "#dc2626", marginTop: 4, fontWeight: 600 }}
              data-testid="msg-name-mismatch"
            >
              Tên nhóm không khớp
            </div>
          )}
          {errorMessage && (
            <div
              style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}
              data-testid="msg-disband-error"
            >
              ⚠️ {errorMessage}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="btn-cancel-disband"
          >
            Huỷ
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={!isNameMatched || isSubmitting}
            onClick={handleDisband}
            data-testid="btn-confirm-disband"
          >
            {isSubmitting ? "Đang giải tán nhóm…" : "Giải tán"}
          </button>
        </div>
      </div>
    </div>
  );
};

