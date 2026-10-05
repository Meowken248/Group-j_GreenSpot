import axios from "axios";
import { AUTH_STORAGE_KEYS } from "../features/auth/types/auth.types";
import {
  triggerSessionExpired,
  isSessionExpiredActive,
} from "../features/auth/services/sessionManager";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Trạng thái quản lý Silent Refresh Token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Danh sách endpoint công khai không yêu cầu token và không bị chặn bởi popup hết hạn
export const isPublicAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return (
    url.includes("/api/v1/auth/login") ||
    url.includes("/api/v1/auth/register") ||
    url.includes("/api/v1/auth/verify-otp") ||
    url.includes("/api/v1/auth/resend-otp") ||
    url.includes("/health")
  );
};

// 1. Request Interceptor
api.interceptors.request.use((config) => {
  const isPublic = isPublicAuthEndpoint(config.url);

  // Đặc tả: Khi Popup đang hiện, các yêu cầu cần đăng nhập khác bị dừng gửi
  if (isSessionExpiredActive() && !isPublic) {
    return Promise.reject(new Error("SESSION_EXPIRED_ACTIVE"));
  }

  // Đối với endpoint công khai (đăng nhập, đăng ký, kích hoạt), không đính kèm Bearer token cũ
  if (isPublic) {
    return config;
  }

  const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      return Promise.reject(error);
    }

    // Nếu là endpoint công khai (như đăng nhập, đăng ký, OTP), để component tự xử lý các mã lỗi (401, 403, 409...)
    if (isPublicAuthEndpoint(originalRequest?.url)) {
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const errorCode = data?.error_code || data?.detail?.error_code;

    // Chỉ can thiệp khi gặp lỗi 401 Unauthorized
    if (status === 401) {
      const hadAccessToken = Boolean(
        localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
      );
      const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);

      // Đặc tả: Chỉ hiện Popup khi trong localStorage đang có token mà máy chủ từ chối.
      // Nếu không có token từ đầu, không hiện Popup.
      if (!hadAccessToken && !refreshToken) {
        return Promise.reject(error);
      }

      // Trường hợp A: Phiên bị thu hồi từ thiết bị khác, vượt 5 phiên, tài khoản bị khóa,
      // hoặc yêu cầu trực tiếp đến endpoint /refresh bị từ chối
      const isRefreshUrl =
        typeof originalRequest?.url === "string" &&
        originalRequest.url.includes("/api/v1/auth/refresh");

      if (errorCode === "SESSION_INVALID" || isRefreshUrl) {
        processQueue(error, null);
        triggerSessionExpired();
        return Promise.reject(error);
      }

      // Trường hợp B: Đã từng thử refresh cho request này nhưng vẫn nhận 401
      if (originalRequest._retry) {
        triggerSessionExpired();
        return Promise.reject(error);
      }

      // Không có Refresh Token để tự động làm mới
      if (!refreshToken) {
        triggerSessionExpired();
        return Promise.reject(error);
      }

      // Trường hợp C: Access Token hết hạn -> Tự động Silent Refresh
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi làm mới Token qua instance Axios độc lập để tránh vòng lặp interceptor
        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/api/v1/auth/refresh`,
          {
            refresh_token: refreshToken,
          }
        );

        const newAccessToken = refreshResponse.data.access_token;
        if (newAccessToken) {
          localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
          api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }

        // Không có token mới trong phản hồi -> kích hoạt hết hạn
        processQueue(error, null);
        triggerSessionExpired();
        return Promise.reject(error);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        triggerSessionExpired();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
