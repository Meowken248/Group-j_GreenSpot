/**
 * Đăng ký Service Worker cho Chế độ Offline-First (STT 19).
 */

export const registerOfflineServiceWorker = (): void => {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    // Chỉ đăng ký trên localhost hoặc HTTPS
    const isLocalhost = Boolean(
      window.location.hostname === "localhost" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    if (isLocalhost || window.location.protocol === "https:") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((registration) => {
            console.log("[SW] Đã đăng ký thành công với scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("[SW] Lỗi khi đăng ký Service Worker:", error);
          });
      });
    }
  }
};
