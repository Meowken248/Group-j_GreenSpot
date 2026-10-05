import api from "../../../api/client";
import type { RegisterRequestPayload, RegisterSuccessResponse } from "../types/auth.types";
import axios from "axios";

export interface RegisterResult {
  success: boolean;
  status: "SUCCESS" | "EMAIL_EXISTS" | "RATE_LIMITED" | "EMAIL_SEND_FAILED" | "NETWORK_ERROR" | "UNKNOWN_ERROR";
  message: string;
  email?: string;
}

export const registerCitizen = async (payload: RegisterRequestPayload): Promise<RegisterResult> => {
  try {
    const response = await api.post<RegisterSuccessResponse>("/api/v1/auth/register", payload);
    return {
      success: true,
      status: "SUCCESS",
      message: response.data.message || "Mã OTP đã được gửi đến email của bạn",
      email: payload.email,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      // 1. Máy chủ không phản hồi / Mất kết nối
      if (!error.response) {
        return {
          success: false,
          status: "NETWORK_ERROR",
          message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
        };
      }

      const statusCode = error.response.status;
      const data = error.response.data;

      // 2. Email đã thuộc về tài khoản ACTIVE (409 Conflict)
      if (statusCode === 409) {
        return {
          success: false,
          status: "EMAIL_EXISTS",
          message: "Email này đã được đăng ký. Vui lòng đăng nhập",
        };
      }

      // 3. Quá 5 lần / 1 giờ (429 Too Many Requests)
      if (statusCode === 429) {
        return {
          success: false,
          status: "RATE_LIMITED",
          message: "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau 1 giờ",
        };
      }

      // 4. Lỗi gửi email OTP (503 Service Unavailable / 500)
      if (statusCode === 503 || (data && data.error_code === "EMAIL_SEND_FAILED")) {
        return {
          success: false,
          status: "EMAIL_SEND_FAILED",
          message: "Không thể gửi mã OTP. Vui lòng thử lại sau",
        };
      }

      // 5. Lỗi máy chủ khác (500)
      return {
        success: false,
        status: "UNKNOWN_ERROR",
        message: data?.message || "Không thể kết nối đến máy chủ. Vui lòng thử lại",
      };
    }

    return {
      success: false,
      status: "NETWORK_ERROR",
      message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
    };
  }
};

export interface VerifyOtpResult {
  success: boolean;
  status: "SUCCESS" | "INVALID_OR_EXPIRED" | "MAX_ATTEMPTS_EXCEEDED" | "NETWORK_ERROR";
  message: string;
}

export const verifyOtp = async (email: string, otpCode: string): Promise<VerifyOtpResult> => {
  try {
    const response = await api.post("/api/v1/auth/verify-otp", {
      email,
      otp_code: otpCode,
    });

    return {
      success: true,
      status: "SUCCESS",
      message: response.data?.message || "Kích hoạt tài khoản thành công",
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return {
          success: false,
          status: "NETWORK_ERROR",
          message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
        };
      }

      const status = error.response.status;
      const data = error.response.data;

      if (status === 403 || data?.error_code === "MAX_ATTEMPTS_EXCEEDED") {
        return {
          success: false,
          status: "MAX_ATTEMPTS_EXCEEDED",
          message: "Bạn đã nhập sai quá 5 lần. Vui lòng gửi mã mới",
        };
      }

      if (status === 400 || status === 401 || data?.error_code === "INVALID_OTP") {
        return {
          success: false,
          status: "INVALID_OR_EXPIRED",
          message: "Mã sai hoặc đã hết hạn",
        };
      }

      return {
        success: false,
        status: "NETWORK_ERROR",
        message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
      };
    }

    return {
      success: false,
      status: "NETWORK_ERROR",
      message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
    };
  }
};

export interface ResendOtpResult {
  success: boolean;
  status: "SUCCESS" | "RATE_LIMITED" | "EMAIL_SEND_FAILED" | "NETWORK_ERROR";
  message: string;
}

export const resendOtp = async (email: string): Promise<ResendOtpResult> => {
  try {
    const response = await api.post("/api/v1/auth/resend-otp", { email });
    return {
      success: true,
      status: "SUCCESS",
      message: response.data?.message || "Mã OTP mới đã được gửi đến email của bạn",
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return {
          success: false,
          status: "NETWORK_ERROR",
          message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
        };
      }

      const status = error.response.status;
      const data = error.response.data;

      if (status === 429) {
        return {
          success: false,
          status: "RATE_LIMITED",
          message: "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau 1 giờ",
        };
      }

      if (status === 503 || data?.error_code === "EMAIL_SEND_FAILED") {
        return {
          success: false,
          status: "EMAIL_SEND_FAILED",
          message: "Không thể gửi mã OTP. Vui lòng thử lại sau",
        };
      }

      return {
        success: false,
        status: "NETWORK_ERROR",
        message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
      };
    }

    return {
      success: false,
      status: "NETWORK_ERROR",
      message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
    };
  }
};

export interface LoginResult {
  success: boolean;
  status:
    | "SUCCESS"
    | "INVALID_CREDENTIALS"
    | "LOGIN_LOCKED"
    | "NOT_ACTIVATED"
    | "ACCOUNT_LOCKED"
    | "NETWORK_ERROR";
  message: string;
  data?: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    session_id: string;
    user: {
      user_id: string;
      email: string;
      full_name: string;
      role: string;
      status: string;
    };
  };
}

export const loginCitizen = async (payload: { email: string; password: string }): Promise<LoginResult> => {
  try {
    const response = await api.post("/api/v1/auth/login", payload);
    return {
      success: true,
      status: "SUCCESS",
      message: response.data?.message || "Đăng nhập thành công",
      data: response.data,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return {
          success: false,
          status: "NETWORK_ERROR",
          message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
        };
      }
      const status = error.response.status;
      const data = error.response.data;

      // 1. Quá 5 lần sai trong 15 phút
      if (status === 403 && data?.error_code === "LOGIN_LOCKED") {
        return {
          success: false,
          status: "LOGIN_LOCKED",
          message: "Bạn đã nhập sai quá 5 lần. Vui lòng thử lại sau 15 phút",
        };
      }

      // 2. Tài khoản chưa kích hoạt (PENDING)
      if (status === 403 && data?.error_code === "ACCOUNT_NOT_ACTIVATED") {
        return {
          success: false,
          status: "NOT_ACTIVATED",
          message: "Tài khoản chưa được kích hoạt. Kích hoạt ngay",
        };
      }

      // 3. Tài khoản bị khóa (LOCKED)
      if (status === 403 && data?.error_code === "ACCOUNT_LOCKED") {
        return {
          success: false,
          status: "ACCOUNT_LOCKED",
          message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên",
        };
      }

      // 4. Sai email hoặc mật khẩu
      if (status === 401 || data?.error_code === "INVALID_CREDENTIALS") {
        return {
          success: false,
          status: "INVALID_CREDENTIALS",
          message: "Email hoặc mật khẩu không đúng",
        };
      }

      return {
        success: false,
        status: "NETWORK_ERROR",
        message: data?.message || "Không thể kết nối đến máy chủ. Vui lòng thử lại",
      };
    }
    return {
      success: false,
      status: "NETWORK_ERROR",
      message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
    };
  }
};

// =========================================================================
// QUẢN LÝ PHIÊN VÀ THIẾT BỊ (MÀN 2 & MÀN 3)
// =========================================================================

export interface SessionItem {
  session_id: string;
  device_name: string;
  ip_address?: string;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}

export interface GetSessionsResult {
  success: boolean;
  sessions?: SessionItem[];
  status: "SUCCESS" | "SESSION_INVALID" | "NETWORK_ERROR";
  message?: string;
}

export const fetchUserSessions = async (): Promise<GetSessionsResult> => {
  try {
    const response = await api.get("/api/v1/auth/sessions");
    return {
      success: true,
      sessions: response.data.sessions || [],
      status: "SUCCESS",
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return {
          success: false,
          status: "NETWORK_ERROR",
          message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
        };
      }
      if (error.response.status === 401) {
        return {
          success: false,
          status: "SESSION_INVALID",
          message: "Vui lòng đăng nhập lại",
        };
      }
      return {
        success: false,
        status: "NETWORK_ERROR",
        message: "Không thể tải danh sách thiết bị. Vui lòng thử lại",
      };
    }
    return {
      success: false,
      status: "NETWORK_ERROR",
      message: "Không thể tải danh sách thiết bị. Vui lòng thử lại",
    };
  }
};

export interface RevokeSessionResult {
  success: boolean;
  status: "SUCCESS" | "ALREADY_REVOKED" | "SESSION_INVALID" | "NETWORK_ERROR";
  message: string;
  is_current?: boolean;
}

export const revokeSession = async (sessionId: string): Promise<RevokeSessionResult> => {
  try {
    const response = await api.delete(`/api/v1/auth/sessions/${sessionId}`);
    return {
      success: true,
      status: "SUCCESS",
      message: response.data.message || "Đã đăng xuất thiết bị",
      is_current: response.data.is_current,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return {
          success: false,
          status: "NETWORK_ERROR",
          message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
        };
      }
      const status = error.response.status;
      const data = error.response.data;

      const errorCode = data?.error_code || data?.detail?.error_code;
      if (status === 400 && errorCode === "SESSION_ALREADY_REVOKED") {
        return {
          success: false,
          status: "ALREADY_REVOKED",
          message: "Phiên này đã được đăng xuất trước đó",
        };
      }

      if (status === 401) {
        return {
          success: false,
          status: "SESSION_INVALID",
          message: "Vui lòng đăng nhập lại",
        };
      }

      return {
        success: false,
        status: "NETWORK_ERROR",
        message: data?.message || "Không thể kết nối đến máy chủ. Vui lòng thử lại",
      };
    }
    return {
      success: false,
      status: "NETWORK_ERROR",
      message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
    };
  }
};

export const revokeAllSessions = async (): Promise<RevokeSessionResult> => {
  try {
    const response = await api.delete("/api/v1/auth/sessions");
    return {
      success: true,
      status: "SUCCESS",
      message: response.data.message || "Đã đăng xuất khỏi tất cả thiết bị",
      is_current: true,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return {
          success: false,
          status: "NETWORK_ERROR",
          message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
        };
      }
      if (error.response.status === 401) {
        return {
          success: false,
          status: "SESSION_INVALID",
          message: "Vui lòng đăng nhập lại",
        };
      }
      return {
        success: false,
        status: "NETWORK_ERROR",
        message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
      };
    }
    return {
      success: false,
      status: "NETWORK_ERROR",
      message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
    };
  }
};




