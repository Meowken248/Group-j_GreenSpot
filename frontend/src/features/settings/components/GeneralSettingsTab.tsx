import React from "react";
import type { ThemeMode, LanguageCode, UserSettingsPreferences } from "../types";
import { getT } from "../translations";

interface GeneralSettingsTabProps {
  currentPrefs: UserSettingsPreferences;
  savedPrefs: UserSettingsPreferences;
  onThemeChange: (theme: ThemeMode) => void;
  onLanguageChange: (lang: LanguageCode) => void;
  onSave: () => void;
  onResetDefault: () => void;
  isSaving: boolean;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  currentPrefs,
  savedPrefs,
  onThemeChange,
  onLanguageChange,
  onSave,
  onResetDefault,
  isSaving,
}) => {
  const t = getT(currentPrefs.language);
  const hasChanges =
    currentPrefs.theme !== savedPrefs.theme ||
    currentPrefs.language !== savedPrefs.language;

  return (
    <div className="settings-grid">
      {/* CỘT 1: KHỐI GIAO DIỆN (TRÁI) */}
      <div className="settings-col">
        <div className="settings-col__card">
          <div className="settings-col__header">
            <h3 className="settings-col__badge-title">
              <span>🎨</span>
              <span>{t.colThemeTitle}</span>
            </h3>
            <p className="settings-col__desc">{t.colThemeDesc}</p>
          </div>

          <div className="settings-col__body">
            {/* Tùy chọn 1: Chế độ sáng */}
            <div
              className={`settings-option ${
                currentPrefs.theme === "LIGHT" ? "settings-option--active" : ""
              }`}
              onClick={() => onThemeChange("LIGHT")}
              role="button"
              tabIndex={0}
              aria-pressed={currentPrefs.theme === "LIGHT"}
            >
              <div className="settings-option__radio" />
              <div className="settings-option__info">
                <div className="settings-option__title">
                  <span>☀️</span>
                  <span>{t.themeLightTitle}</span>
                  {currentPrefs.theme === "LIGHT" && (
                    <span className="settings-option__preview-badge">Active</span>
                  )}
                </div>
                <p className="settings-option__desc">{t.themeLightDesc}</p>
              </div>
            </div>

            {/* Tùy chọn 2: Chế độ tối */}
            <div
              className={`settings-option ${
                currentPrefs.theme === "DARK" ? "settings-option--active" : ""
              }`}
              onClick={() => onThemeChange("DARK")}
              role="button"
              tabIndex={0}
              aria-pressed={currentPrefs.theme === "DARK"}
            >
              <div className="settings-option__radio" />
              <div className="settings-option__info">
                <div className="settings-option__title">
                  <span>🌙</span>
                  <span>{t.themeDarkTitle}</span>
                  {currentPrefs.theme === "DARK" && (
                    <span className="settings-option__preview-badge">Active</span>
                  )}
                </div>
                <p className="settings-option__desc">{t.themeDarkDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CỘT 2: KHỐI NGÔN NGỮ (GIỮA) */}
      <div className="settings-col">
        <div className="settings-col__card">
          <div className="settings-col__header">
            <h3 className="settings-col__badge-title">
              <span>🌐</span>
              <span>{t.colLangTitle}</span>
            </h3>
            <p className="settings-col__desc">{t.colLangDesc}</p>
          </div>

          <div className="settings-col__body">
            {/* Tùy chọn 1: Tiếng Việt */}
            <div
              className={`settings-option ${
                currentPrefs.language === "VI" ? "settings-option--active" : ""
              }`}
              onClick={() => onLanguageChange("VI")}
              role="button"
              tabIndex={0}
              aria-pressed={currentPrefs.language === "VI"}
            >
              <div className="settings-option__radio" />
              <div className="settings-option__info">
                <div className="settings-option__title">
                  <span>🇻🇳</span>
                  <span>{t.langViTitle}</span>
                  {currentPrefs.language === "VI" && (
                    <span className="settings-option__preview-badge">Active</span>
                  )}
                </div>
                <p className="settings-option__desc">{t.langViDesc}</p>
              </div>
            </div>

            {/* Tùy chọn 2: English */}
            <div
              className={`settings-option ${
                currentPrefs.language === "EN" ? "settings-option--active" : ""
              }`}
              onClick={() => onLanguageChange("EN")}
              role="button"
              tabIndex={0}
              aria-pressed={currentPrefs.language === "EN"}
            >
              <div className="settings-option__radio" />
              <div className="settings-option__info">
                <div className="settings-option__title">
                  <span>🇬🇧</span>
                  <span>{t.langEnTitle}</span>
                  {currentPrefs.language === "EN" && (
                    <span className="settings-option__preview-badge">Active</span>
                  )}
                </div>
                <p className="settings-option__desc">{t.langEnDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CỘT 3: KHỐI LƯU CÀI ĐẶT (PHẢI) */}
      <div className="settings-col">
        <div className="settings-col__card">
          <div className="settings-col__header">
            <h3 className="settings-col__badge-title">
              <span>💾</span>
              <span>{t.colSaveTitle}</span>
            </h3>
            <p className="settings-col__desc">{t.colSaveDesc}</p>
          </div>

          <div className="settings-col__body settings-save-block">
            <div className="settings-save-block__status">
              <div className="settings-save-block__status-row">
                <span className="settings-save-block__status-label">
                  {currentPrefs.language === "VI" ? "Giao diện hiện tại:" : "Selected Theme:"}
                </span>
                <span className="settings-save-block__status-value">
                  {currentPrefs.theme === "LIGHT" ? t.themeLightTitle : t.themeDarkTitle}
                </span>
              </div>
              <div className="settings-save-block__status-row">
                <span className="settings-save-block__status-label">
                  {currentPrefs.language === "VI" ? "Ngôn ngữ hiện tại:" : "Selected Language:"}
                </span>
                <span className="settings-save-block__status-value">
                  {currentPrefs.language === "VI" ? t.langViTitle : t.langEnTitle}
                </span>
              </div>
              <div className="settings-save-block__status-row">
                <span className="settings-save-block__status-label">
                  {currentPrefs.language === "VI" ? "Trạng thái:" : "Status:"}
                </span>
                <span className="settings-save-block__status-value">
                  {hasChanges
                    ? currentPrefs.language === "VI"
                      ? "Có thay đổi chưa lưu ⚠️"
                      : "Unsaved changes ⚠️"
                    : currentPrefs.language === "VI"
                    ? "Đã đồng bộ ✓"
                    : "Synchronized ✓"}
                </span>
              </div>
              <div className="settings-save-block__status-row">
                <span className="settings-save-block__status-label">OCC Version:</span>
                <span className="settings-save-block__status-value">v{currentPrefs.version}</span>
              </div>
            </div>

            <div className="settings-save-block__actions">
              <button
                type="button"
                className="btn-settings-primary"
                onClick={onSave}
                disabled={isSaving}
              >
                <span>💾</span>
                <span>{isSaving ? "Đang lưu..." : t.btnSave}</span>
              </button>

              <button
                type="button"
                className="btn-settings-outline"
                onClick={onResetDefault}
                disabled={isSaving}
              >
                <span>🔄</span>
                <span>{t.btnReset}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
