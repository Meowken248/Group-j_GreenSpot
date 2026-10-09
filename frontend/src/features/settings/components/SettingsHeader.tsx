import React from "react";
import { getT } from "../translations";
import type { LanguageCode } from "../types";

interface SettingsHeaderProps {
  currentLang: LanguageCode;
  userName?: string;
  onBackToMap: () => void;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  currentLang,
  userName = "Công dân",
  onBackToMap,
}) => {
  const t = getT(currentLang);

  return (
    <header className="settings-page__header">
      <div className="settings-page__brand" onClick={onBackToMap}>
        <span className="settings-page__brand-logo">🌿</span>
        <h1 className="settings-page__brand-title">GreenSpot</h1>
        <span className="settings-page__brand-badge">EcoReport</span>
      </div>

      <div className="settings-page__actions">
        <button
          type="button"
          className="settings-page__btn-back"
          onClick={onBackToMap}
          title={t.headerBack}
        >
          <span>⬅️</span>
          <span>{t.headerBack}</span>
        </button>

        <div className="settings-page__user-info">
          <div className="settings-page__user-info-avatar" title={userName}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="settings-page__user-info-name">
            {t.headerUserGreeting}, {userName}
          </span>
        </div>
      </div>
    </header>
  );
};
