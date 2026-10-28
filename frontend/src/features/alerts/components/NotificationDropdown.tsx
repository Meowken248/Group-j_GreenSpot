import React, { useState, useEffect, useRef } from "react";
import type { AppNotification } from "../types";
import { notificationApi } from "../services/notificationApi";

interface NotificationDropdownProps {
  onOpenCenterModal?: () => void;
  onNavigateToAlerts?: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onOpenCenterModal,
  onNavigateToAlerts,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchLatest = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.listNotifications({ limit: 5 });
      setNotifications(res.items);
      setUnreadCount(res.unread_count);
    } catch (e) {
      console.error("Lỗi tải thông báo:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
    // Polling định kỳ mỗi 15 giây
    const interval = setInterval(fetchLatest, 15000);
    return () => clearInterval(interval);
  }, []);

  // Đóng khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error("Lỗi đánh dấu đã đọc:", e);
    }
  };

  const hasCritical = notifications.some((n) => n.severity === "CRITICAL" && !n.is_read);

  return (
    <div className="relative inline-block" ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        title="Thông báo cảnh báo môi trường"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchLatest();
        }}
        className={`notification-bell-btn ${hasCritical ? "bell-shake" : ""}`}
        style={{
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "8px",
          padding: "8px 12px",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          position: "relative",
          transition: "all 0.2s ease",
        }}
      >
        <span style={{ fontSize: "16px" }}>🔔</span>
        <span style={{ fontSize: "13px", fontWeight: 600 }}>Cảnh báo</span>

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              background: hasCritical ? "#EF4444" : "#F59E0B",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              borderRadius: "10px",
              padding: "2px 6px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
              animation: hasCritical ? "pulse 1.5s infinite" : "none",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notification-dropdown-menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "360px",
            background: "#1E293B",
            border: "1px solid #334155",
            borderRadius: "12px",
            boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
            zIndex: 9999,
            overflow: "hidden",
            color: "#F8FAFC",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #334155",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#0F172A",
            }}
          >
            <div>
              <span style={{ fontWeight: 700, fontSize: "14px" }}>Cảnh báo mới nhất</span>
              {unreadCount > 0 && (
                <span style={{ marginLeft: "6px", fontSize: "12px", color: "#F59E0B", fontWeight: 600 }}>
                  ({unreadCount} chưa đọc)
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#38BDF8",
                  fontSize: "12px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Đã đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                Hiện không có cảnh báo ô nhiễm nào mới.
              </div>
            ) : (
              notifications.map((item) => {
                const isCrit = item.severity === "CRITICAL";
                const isWarn = item.severity === "WARNING";
                const badgeColor = isCrit ? "#EF4444" : isWarn ? "#F59E0B" : "#10B981";

                return (
                  <div
                    key={item.notification_id}
                    onClick={() => {
                      if (onNavigateToAlerts) onNavigateToAlerts();
                      setIsOpen(false);
                    }}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #334155",
                      background: item.is_read ? "transparent" : "rgba(245, 158, 11, 0.08)",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = item.is_read
                        ? "transparent"
                        : "rgba(245, 158, 11, 0.08)")
                    }
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          background: badgeColor,
                          color: "#fff",
                          fontSize: "10px",
                          fontWeight: 700,
                          borderRadius: "4px",
                          padding: "1px 6px",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.severity}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                        {new Date(item.created_at).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: item.is_read ? "#E2E8F0" : "#FFF" }}>
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#94A3B8",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px 16px",
              background: "#0F172A",
              borderTop: "1px solid #334155",
              textAlign: "center",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenCenterModal) onOpenCenterModal();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#38BDF8",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Mở Hộp thư Thông báo đầy đủ →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
