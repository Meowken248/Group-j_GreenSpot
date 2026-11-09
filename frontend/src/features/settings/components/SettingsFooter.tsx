import React from "react";
import { getT } from "../translations";
import type { LanguageCode } from "../types";

interface SettingsFooterProps {
  currentLang: LanguageCode;
}

export const SettingsFooter: React.FC<SettingsFooterProps> = ({ currentLang }) => {
  const t = getT(currentLang);

  return (
    <footer className="settings-page__footer">
      <div className="settings-page__footer-content">
        <p className="settings-page__footer-copy">{t.footerCopyright}</p>
        <ul className="settings-page__footer-links">
          <li>
            <a href="#contact" onClick={(e) => e.preventDefault()}>
              {t.footerContact}
            </a>
          </li>
          <li>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>
              {t.footerPrivacy}
            </a>
          </li>
          <li>
            <a href="#terms" onClick={(e) => e.preventDefault()}>
              {t.footerTerms}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
};
