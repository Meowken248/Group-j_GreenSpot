import React, { useState, useEffect, useCallback } from "react";
import type {
  ThemeMode,
  LanguageCode,
  SettingsActiveTab,
  UserSettingsPreferences,
  ToastNotification,
} from "./types";
import { getT } from "./translations";
import {
  getLocalPreferences,
  fetchPreferencesFromServer,
  updatePreferencesOnServer,
  applyThemeToDocument,
  resetToDefaultLocal,
} from "./services";
import { SettingsHeader } from "./components/SettingsHeader";
import { SettingsFooter } from "./components/SettingsFooter";
import { GeneralSettingsTab } from "./components/GeneralSettingsTab";
import { ChangePasswordTab } from "./components/ChangePasswordTab";
import { SettingsSavedModal } from "./components/SettingsSavedModal";
import "./Settings.scss";

interface SettingsContainerProps {
  currentUser?: {
    user_id?: string;
    email?: string;
    full_name?: string;
    role?: string;
  } | null;
  onBackToMap: () => void;
  onNavigateToAuth: () => void;
}

export const SettingsContainer: React.FC<SettingsContainerProps> = ({
  currentUser,
  onBackToMap,
  onNavigateToAuth,
}) => {
  // Trạng thái tab hiển thị
  const [activeTab, setActiveTab] = useState<SettingsActiveTab>("general");

  // Cấu hình đã lưu (Saved/Committed state)
  const [savedPrefs, setSavedPrefs] = useState<UserSettingsPreferences>(() =>
    getLocalPreferences()
  );

  // Cấu hình đang xem trước tức thì (Instant Preview state)
  const [previewPrefs, setPreviewPrefs] = useState<UserSettingsPreferences>(() =>
    getLocalPreferences()
  );

  // Trạng thái lưu API & Modal Màn 3
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);

  // Hệ thống thông báo Toast (tự động biến mất sau thời gian quy định)
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const t = getT(previewPrefs.language);

  const addToast = useCallback(
    (message: string, type: ToastNotification["type"] = "info", duration = 3000) => {
      const id = `${Date.now()}_${Math.random()}`;
      const newToast: ToastNotification = { id, type, message, duration };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, duration);
    },
    []
  );

  // Tải cấu hình mới nhất từ máy chủ khi vào trang
  useEffect(() => {
    let isMounted = true;
    const loadServerSettings = async () => {
      try {
        const remotePrefs = await fetchPreferencesFromServer();
        if (isMounted) {
          setSavedPrefs(remotePrefs);
          setPreviewPrefs(remotePrefs);
          applyThemeToDocument(remotePrefs.theme);
        }
      } catch {
        // Fallback local preferences đã được set mặc định
      }
    };

    loadServerSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Xử lý xem trước tức thì Giao diện (Instant Theme Preview)
  const handleThemeChange = (newTheme: ThemeMode) => {
    setPreviewPrefs((prev) => ({ ...prev, theme: newTheme }));
    applyThemeToDocument(newTheme);
  };

  // Xử lý xem trước tức thì Ngôn ngữ (Instant Language Preview)
  const handleLanguageChange = (newLang: LanguageCode) => {
    setPreviewPrefs((prev) => ({ ...prev, language: newLang }));
  };

  // Xử lý nút LƯU THAY ĐỔI (Screen 1/3)
  const handleSavePreferences = async () => {
    const hasChanges =
      previewPrefs.theme !== savedPrefs.theme ||
      previewPrefs.language !== savedPrefs.language;

    // Quy tắc: Nếu chưa thay đổi -> Toast 2 giây
    if (!hasChanges) {
      addToast(t.noChangesToast, "warning", 2000);
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updatePreferencesOnServer({
        theme: previewPrefs.theme,
        language: previewPrefs.language,
        version: savedPrefs.version,
      });

      setSavedPrefs(updated);
      setPreviewPrefs(updated);
      applyThemeToDocument(updated.theme);

      // Kích hoạt Modal Màn 3/3 "ĐÃ LƯU CÀI ĐẶT"
      setIsSavedModalOpen(true);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) {
        // Xung đột Optimistic Locking
        addToast(t.conflictErrorToast, "error", 4000);
        const latest = await fetchPreferencesFromServer();
        setSavedPrefs(latest);
        setPreviewPrefs(latest);
      } else {
        // Lưu offline local nếu server chưa phản hồi
        setSavedPrefs(previewPrefs);
        setIsSavedModalOpen(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Xử lý nút ĐẶT LẠI MẶC ĐỊNH
  const handleResetDefault = () => {
    const defaultPrefs = resetToDefaultLocal();
    setPreviewPrefs(defaultPrefs);
    setSavedPrefs(defaultPrefs);
    addToast(
      previewPrefs.language === "VI"
        ? "Đã khôi phục cài đặt mặc định hệ thống"
        : "Reset to default system settings",
      "info",
      2500
    );
  };

  return (
    <div className="settings-page">
      {/* KHUNG HEADER CHUNG */}
      <SettingsHeader
        currentLang={previewPrefs.language}
        userName={currentUser?.full_name || "Công dân"}
        onBackToMap={onBackToMap}
      />

      {/* KHUNG NỘI DUNG CHÍNH */}
      <main className="settings-page__container">
        <div className="settings-page__intro">
          <h2 className="settings-page__intro-title">{t.pageTitle}</h2>
          <p className="settings-page__intro-desc">{t.pageSubtitle}</p>
        </div>

        {/* THANH CHUYỂN TAB (Cài đặt chung / Đổi mật khẩu) */}
        <nav className="settings-page__tabs" aria-label="Settings Tabs">
          <button
            type="button"
            className={`settings-page__tab-btn ${
              activeTab === "general" ? "settings-page__tab-btn--active" : ""
            }`}
            onClick={() => setActiveTab("general")}
          >
            <span>⚙️</span>
            <span>{t.tabGeneral}</span>
          </button>

          <button
            type="button"
            className={`settings-page__tab-btn ${
              activeTab === "password" ? "settings-page__tab-btn--active" : ""
            }`}
            onClick={() => setActiveTab("password")}
          >
            <span>🔒</span>
            <span>{t.tabPassword}</span>
          </button>
        </nav>

        {/* NỘI DUNG THEO TAB */}
        {activeTab === "general" ? (
          <GeneralSettingsTab
            currentPrefs={previewPrefs}
            savedPrefs={savedPrefs}
            onThemeChange={handleThemeChange}
            onLanguageChange={handleLanguageChange}
            onSave={handleSavePreferences}
            onResetDefault={handleResetDefault}
            isSaving={isSaving}
          />
        ) : (
          <ChangePasswordTab
            currentLang={previewPrefs.language}
            onSuccessToast={(msg) => addToast(msg, "success", 4000)}
            onErrorToast={(msg) => addToast(msg, "error", 4000)}
            onLogoutRedirect={onNavigateToAuth}
          />
        )}
      </main>

      {/* KHUNG FOOTER CHUNG */}
      <SettingsFooter currentLang={previewPrefs.language} />

      {/* MÀN 3/3: POPUP ĐÃ LƯU CÀI ĐẶT */}
      <SettingsSavedModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedPrefs={savedPrefs}
      />

      {/* KHỐI TOAST NOTIFICATIONS */}
      {toasts.length > 0 && (
        <div className="settings-toast-container" aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`settings-toast settings-toast--${toast.type}`}
            >
              <span className="settings-toast__icon">
                {toast.type === "success" && "✓"}
                {toast.type === "warning" && "⚠️"}
                {toast.type === "error" && "✕"}
                {toast.type === "info" && "ℹ️"}
              </span>
              <p className="settings-toast__text">{toast.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
