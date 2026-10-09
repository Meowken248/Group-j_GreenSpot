import React, { useEffect } from "react";
import type { LanguageCode } from "../types";
import { getT } from "../translations";

interface DiscardConfirmModalProps {
  currentLang: LanguageCode;
  onKeepEditing: () => void;
  onConfirmDiscard: () => void;
}

export const DiscardConfirmModal: React.FC<DiscardConfirmModalProps> = ({
  currentLang,
  onKeepEditing,
  onConfirmDiscard,
}) => {
  const t = getT(currentLang);

  // Cho phép đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onKeepEditing();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onKeepEditing]);

  return (
    <div
      className="settings-modal-overlay"
      onClick={onKeepEditing}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-discard-title"
    >
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__header">
          <h3 id="modal-discard-title" className="settings-modal__title">
            <span>⚠️</span>
            <span>{t.modalDiscardTitle}</span>
          </h3>
          <button
            type="button"
            className="settings-modal__close-btn"
            onClick={onKeepEditing}
            aria-label={t.btnCancel}
          >
            &times;
          </button>
        </div>

        <div className="settings-modal__body">
          <p>{t.modalDiscardDesc}</p>
        </div>

        <div className="settings-modal__footer">
          <button
            type="button"
            className="btn-settings-outline"
            onClick={onKeepEditing}
            autoFocus
          >
            <span>{t.btnKeepEditing}</span>
          </button>
          <button
            type="button"
            className="btn-settings-primary"
            style={{ backgroundColor: "#ef4444" }}
            onClick={onConfirmDiscard}
          >
            <span>{t.btnConfirmDiscard}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
