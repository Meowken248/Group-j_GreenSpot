import React, { useState, useEffect } from "react";
import "./ConnectionBanner.scss";

interface ConnectionBannerProps {
  onOpenOutbox?: () => void;
  pendingCount?: number;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  onOpenOutbox,
  pendingCount = 0,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showReconnectedBanner, setShowReconnectedBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedBanner(true);

      // R02: Tự động ẩn sau 3 giây khi có mạng lại
      const timer = setTimeout(() => {
        setShowReconnectedBanner(false);
      }, 3000);

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedBanner(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // R01: Thanh màu vàng khi mất mạng
  if (!isOnline) {
    return (
      <aside
        className="greenspot-connection-banner banner-offline"
        role="status"
        aria-live="polite"
      >
        <div className="banner-content">
          <span className="banner-icon" aria-hidden="true">
            📡
          </span>
          <span className="banner-text">
            <strong>Mất kết nối mạng.</strong> Ứng dụng đang hoạt động ở chế độ
            ngoại tuyến (Offline-First). Phản ánh của bạn sẽ được lưu an toàn trên
            thiết bị và tự động gửi khi có mạng.
          </span>
          {onOpenOutbox && (
            <button
              type="button"
              className="banner-action-btn"
              onClick={onOpenOutbox}
            >
              Hàng đợi {pendingCount > 0 ? `(${pendingCount})` : ""}
            </button>
          )}
        </div>
      </aside>
    );
  }

  // R02: Thanh màu xanh khi có mạng lại, tự ẩn sau 3s
  if (showReconnectedBanner) {
    return (
      <aside
        className="greenspot-connection-banner banner-online"
        role="status"
        aria-live="polite"
      >
        <div className="banner-content">
          <span className="banner-icon" aria-hidden="true">
            🟢
          </span>
          <span className="banner-text">
            <strong>Đã kết nối lại.</strong> Đang tự động kiểm tra và đồng bộ
            các phản ánh trong hàng đợi...
          </span>
          {onOpenOutbox && (
            <button
              type="button"
              className="banner-action-btn"
              onClick={onOpenOutbox}
            >
              Xem hàng đợi
            </button>
          )}
        </div>
      </aside>
    );
  }

  return null;
};
