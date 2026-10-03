export type AuthView = 'register' | 'otp' | 'login';

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
