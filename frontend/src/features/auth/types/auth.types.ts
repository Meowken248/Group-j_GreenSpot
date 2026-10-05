export type AuthView = 'register' | 'otp' | 'activated' | 'login' | 'devices' | 'forgot_password';

export const AUTH_STORAGE_KEYS = {
  EMAIL: "greenspot_pending_email",
  OTP_SENT_TIME: "greenspot_otp_sent_timestamp",
  FAILED_ATTEMPTS: "greenspot_otp_failed_attempts",
  IS_ACTIVATED: "greenspot_account_activated",
  ACCESS_TOKEN: "greenspot_access_token",
  REFRESH_TOKEN: "greenspot_refresh_token",
  USER_INFO: "greenspot_user",
};

export interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormErrors {
  fullName?: string;
  email?: string | { message: string; isLinkToLogin?: boolean };
  password?: string;
  confirmPassword?: string;
}

export interface RegisterRequestPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface RegisterSuccessResponse {
  success: boolean;
  message: string;
  email: string;
  is_pending?: boolean;
}

export interface ApiErrorResponse {
  error_code?: string;
  message?: string;
  detail?: string | Array<{ msg: string; loc?: string[] }>;
}

export interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error';
}
