/**
 * Service Layer for User Settings & Security Domain (Chức năng 7)
 * Xử lý LocalStorage, Dynamic Theme DOM application, và HTTP API Calls
 */

import api from "../../api/client";
import type {
  ThemeMode,
  LanguageCode,
  UserSettingsPreferences,
  UpdatePreferencesPayload,
  ChangePasswordPayload,
  ChangePasswordResponse,
} from "./types";

export const SETTINGS_STORAGE_KEYS = {
  THEME: "greenspot_user_theme",
  LANG: "greenspot_user_lang",
  VERSION: "greenspot_user_settings_version",
};

/**
 * Áp dụng chế độ giao diện lên DOM root để xem trước tức thì hoặc kích hoạt toàn cục
 */
export const applyThemeToDocument = (theme: ThemeMode) => {
  const root = document.documentElement;
  const isDark = theme === "DARK";
  root.setAttribute("data-theme", isDark ? "dark" : "light");
  if (isDark) {
    document.body.classList.add("dark-mode");
    document.body.classList.remove("light-mode");
  } else {
    document.body.classList.add("light-mode");
    document.body.classList.remove("dark-mode");
  }

  // Phát tín hiệu toàn cục thời gian thực cho React components
  try {
    window.dispatchEvent(
      new CustomEvent("greenspot_theme_changed", { detail: { theme } })
    );
  } catch {
    // Không làm gián đoạn nếu môi trường test
  }
};

/**
 * Đăng ký lắng nghe sự kiện thay đổi giao diện Sáng / Tối toàn hệ thống
 */
export const subscribeThemeChange = (callback: (theme: ThemeMode) => void) => {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ theme: ThemeMode }>;
    if (customEvent.detail?.theme) {
      callback(customEvent.detail.theme);
    }
  };
  window.addEventListener("greenspot_theme_changed", handler);
  return () => window.removeEventListener("greenspot_theme_changed", handler);
};

/**
 * Đọc cấu hình từ LocalStorage (Offline first & Instant render)
 */
export const getLocalPreferences = (): UserSettingsPreferences => {
  try {
    const rawTheme = localStorage.getItem(SETTINGS_STORAGE_KEYS.THEME);
    const rawLang = localStorage.getItem(SETTINGS_STORAGE_KEYS.LANG);
    const rawVersion = localStorage.getItem(SETTINGS_STORAGE_KEYS.VERSION);

    const theme: ThemeMode = rawTheme === "DARK" ? "DARK" : "LIGHT";
    const language: LanguageCode = rawLang === "EN" ? "EN" : "VI";
    const version: number = rawVersion ? parseInt(rawVersion, 10) || 1 : 1;

    return { theme, language, version };
  } catch {
    return { theme: "LIGHT", language: "VI", version: 1 };
  }
};

/**
 * Lưu cấu hình vào LocalStorage
 */
export const saveLocalPreferences = (prefs: UserSettingsPreferences) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEYS.THEME, prefs.theme);
    localStorage.setItem(SETTINGS_STORAGE_KEYS.LANG, prefs.language);
    localStorage.setItem(SETTINGS_STORAGE_KEYS.VERSION, String(prefs.version));
  } catch (err) {
    console.warn("Could not save settings to localStorage:", err);
  }
};

/**
 * Đặt lại cấu hình về mặc định hệ thống
 */
export const resetToDefaultLocal = (): UserSettingsPreferences => {
  const defaultPrefs: UserSettingsPreferences = {
    theme: "LIGHT",
    language: "VI",
    version: 1,
  };
  saveLocalPreferences(defaultPrefs);
  applyThemeToDocument("LIGHT");
  return defaultPrefs;
};

/**
 * Gọi API lấy cấu hình từ máy chủ (Settings API)
 */
export const fetchPreferencesFromServer = async (): Promise<UserSettingsPreferences> => {
  try {
    const response = await api.get<UserSettingsPreferences>("/api/v1/settings/preferences");
    const data = response.data;
    saveLocalPreferences(data);
    applyThemeToDocument(data.theme);
    return data;
  } catch (error) {
    // Nếu chưa đăng nhập hoặc lỗi kết nối, dùng cache LocalStorage
    return getLocalPreferences();
  }
};

/**
 * Gửi yêu cầu cập nhật cấu hình lên máy chủ với Optimistic Locking
 */
export const updatePreferencesOnServer = async (
  payload: UpdatePreferencesPayload
): Promise<UserSettingsPreferences> => {
  const response = await api.put<UserSettingsPreferences>("/api/v1/settings/preferences", payload);
  const data = response.data;
  saveLocalPreferences(data);
  applyThemeToDocument(data.theme);
  return data;
};

/**
 * Gửi yêu cầu đổi mật khẩu tài khoản
 */
export const changePasswordApi = async (
  payload: ChangePasswordPayload
): Promise<ChangePasswordResponse> => {
  const response = await api.post<ChangePasswordResponse>("/api/v1/settings/change-password", payload);
  return response.data;
};
