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

