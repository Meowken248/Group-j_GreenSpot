import { AUTH_STORAGE_KEYS } from "../types/auth.types";

type SessionExpiredListener = () => void;
const listeners: Set<SessionExpiredListener> = new Set();
let isExpired = false;

/**
 * Đăng ký lắng nghe sự kiện phiên hết hạn để hiển thị Popup Màn 4.
 */
export const subscribeSessionExpired = (listener: SessionExpiredListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Kích hoạt trạng thái phiên hết hạn (Singleton):
 * - Chỉ hiện Popup khi trong localStorage đang có token mà máy chủ từ chối.
 * - Khi nhiều yêu cầu cùng nhận lỗi phiên, chỉ hiện đúng một Popup duy nhất.
 */
export const triggerSessionExpired = (): void => {
  if (isExpired) return;

  const hasToken = Boolean(
    localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) ||
    localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
  );

  // Đặc tả: Chỉ hiện Popup khi trong localStorage đang có token mà máy chủ từ chối.
  // Nếu không có token từ đầu, không hiện Popup.
  if (!hasToken) {
    return;
  }

  isExpired = true;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error("Error in session expired listener:", err);
    }
  });
};

/**
 * Đặt lại trạng thái hết hạn sau khi người dùng bấm Đăng nhập lại.
 */
export const resetSessionExpired = (): void => {
  isExpired = false;
};

/**
 * Kiểm tra xem Popup phiên hết hạn có đang hiển thị không.
 * Đặc tả: Khi Popup đang hiện, các yêu cầu cần đăng nhập khác bị dừng gửi.
 */
export const isSessionExpiredActive = (): boolean => {
  return isExpired;
};
