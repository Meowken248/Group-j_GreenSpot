import React, { useEffect } from "react";
import type { UserSettingsPreferences } from "../types";
import { getT } from "../translations";

interface SettingsSavedModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPrefs: UserSettingsPreferences;
}

export const SettingsSavedModal: React.FC<SettingsSavedModalProps> = ({
  isOpen,
  onClose,
  savedPrefs,
}) => {
  const t = getT(savedPrefs.language);

  // Đóng modal khi nhấn phím Esc
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

  if (!isOpen) return null;

  return (
    <div
      className="settings-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-saved-title"
    >
      <div
        className="settings-modal"
        onClick={(e) => e.stopPropagation()} // Chặn nổi bọt sự kiện click bên trong modal
      >
        <div className="settings-modal__header settings-modal__header--success">
          <h3 id="modal-saved-title" className="settings-modal__title settings-modal__title--success">
            <span>🎉</span>
            <span>{t.modalSavedTitle}</span>
          </h3>
          <button
            type="button"
            className="settings-modal__close-btn"
            onClick={onClose}
            aria-label={t.btnClose}
          >
            &times;
          </button>
        </div>

        <div className="settings-modal__body">
          <p>{t.modalSavedDesc}</p>

          <div className="settings-modal__summary">
            <div className="settings-modal__summary-row">
              <span className="settings-modal__summary-label">{t.modalSavedThemeLabel}</span>
              <span className="settings-modal__summary-value">
                {savedPrefs.theme === "LIGHT" ? t.themeLightTitle : t.themeDarkTitle}
              </span>
            </div>
            <div className="settings-modal__summary-row">
              <span className="settings-modal__summary-label">{t.modalSavedLangLabel}</span>
              <span className="settings-modal__summary-value">
                {savedPrefs.language === "VI" ? t.langViTitle : t.langEnTitle}
              </span>
            </div>
            <div className="settings-modal__summary-row">
              <span className="settings-modal__summary-label">Phiên bản dữ liệu (OCC):</span>
              <span className="settings-modal__summary-value">v{savedPrefs.version}</span>
            </div>
          </div>
        </div>

        <div className="settings-modal__footer">
          <button type="button" className="btn-settings-primary" onClick={onClose} autoFocus>
            <span>✓</span>
            <span>{t.btnClose}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
