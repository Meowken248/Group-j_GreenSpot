/**
 * Type Definitions for User Settings & Security Domain (Chức năng 7)
 */

export type ThemeMode = "LIGHT" | "DARK";
export type LanguageCode = "VI" | "EN";
export type SettingsActiveTab = "general" | "password";

export interface UserSettingsPreferences {
  theme: ThemeMode;
  language: LanguageCode;
  version: number;
  updated_at?: string;
}

export interface UpdatePreferencesPayload {
  theme: ThemeMode;
  language: LanguageCode;
  version: number;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface ToastNotification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
  duration?: number;
}
