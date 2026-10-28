import React, { useState, useEffect } from "react";
import type { AppNotification, PushStatsResponse } from "../types";
import { notificationApi } from "../services/notificationApi";
import { AlertAreaSubscriptionModal } from "./AlertAreaSubscriptionModal";

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PushStatsResponse | null>(null);
  const [subModalOpen, setSubModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.listNotifications({ only_unread: onlyUnread, limit: 50 });
      setNotifications(res.items);
      setUnreadCount(res.unread_count);

      const statsRes = await notificationApi.getPushStats();
      setStats(statsRes);
    } catch (e) {
      console.error("Lỗi tải thông báo:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, onlyUnread]);

  if (!isOpen) return null;

  const handleMarkRead = async (id?: string) => {
    try {
      await notificationApi.markAsRead(id ? [id] : undefined);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          background: "#1E293B",
          border: "1px solid #334155",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          color: "#F8FAFC",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #334155",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#0F172A",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#38BDF8" }}>
              🔔 Trung Tâm Thông Báo Cảnh Báo Ô Nhiễm (CN 29)
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#94A3B8" }}>
              Kênh điều phối thông báo đẩy khẩn cấp và giám sát chất lượng môi trường thời gian thực
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Stats banner */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
              padding: "16px 24px",
              background: "#0B1120",
              borderBottom: "1px solid #334155",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>Tổng tin đã gửi</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#F8FAFC" }}>
                {stats.total_notifications_sent}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>Tin chưa đọc</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#F59E0B" }}>
                {stats.unread_count}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>Tin đã đọc</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#10B981" }}>
                {stats.read_count}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>Tỷ lệ mở xem</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#38BDF8" }}>
                {stats.open_rate_percentage}%
              </div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div
          style={{
            padding: "12px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #334155",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label style={{ fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="checkbox"
                checked={onlyUnread}
                onChange={(e) => setOnlyUnread(e.target.checked)}
              />
              Chỉ hiện tin chưa đọc ({unreadCount})
            </label>
            <button
              type="button"
              onClick={() => setSubModalOpen(true)}
              style={{
                background: "rgba(14, 165, 233, 0.15)",
                border: "1px solid #0284C7",
                color: "#38BDF8",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              title="Đăng ký nhận tin cảnh báo cá nhân hóa theo địa bàn cư trú (CN 32)"
            >
              <span>⚙️</span> Cài đặt địa bàn nhận tin (CN 32)
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              id="NOTI_BTN_MARK_ALL"
              onClick={() => handleMarkRead()}
              style={{
                background: "#0284C7",
                border: "none",
                color: "#fff",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✓ Đánh dấu tất cả là đã đọc
            </button>
          )}
        </div>

        {/* List */}
        <div id="NOTI_PAGE_CENTER" style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Đang tải dữ liệu...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#94A3B8" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>📭</div>
              <div>Không có thông báo nào trong hộp thư.</div>
            </div>
          ) : (
            <div id="NOTI_PANEL_DROPDOWN" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {notifications.map((item) => {
                const isCrit = item.severity === "CRITICAL";
                const isWarn = item.severity === "WARNING";
                const badgeBg = isCrit ? "#DC2626" : isWarn ? "#D97706" : "#059669";

                return (
                  <div
                    key={item.notification_id}
                    style={{
                      padding: "14px 18px",
                      background: item.is_read ? "#1E293B" : "rgba(245, 158, 11, 0.08)",
                      border: `1px solid ${item.is_read ? "#334155" : "rgba(245, 158, 11, 0.3)"}`,
                      borderRadius: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span
                          style={{
                            background: badgeBg,
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {item.severity}
                        </span>
                        <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                          {new Date(item.created_at).toLocaleString("vi-VN")}
                        </span>
                        {!item.is_read && (
                          <span style={{ fontSize: "11px", color: "#F59E0B", fontWeight: 700 }}>● MỚI</span>
                        )}
                      </div>
                      <h4 style={{ margin: "4px 0", fontSize: "14px", fontWeight: 600, color: "#F8FAFC" }}>
                        {item.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#CBD5E1", lineHeight: 1.5 }}>
                        {item.message}
                      </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", justifyContent: "center" }}>
                      {!item.is_read && (
                        <button
                          onClick={() => handleMarkRead(item.notification_id)}
                          style={{
                            background: "#334155",
                            border: "none",
                            color: "#38BDF8",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          Đã đọc
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.notification_id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#EF4444",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CÀI ĐẶT NHẬN TIN KHU VỰC CƯ TRÚ (CHỨC NĂNG 32) */}
      <AlertAreaSubscriptionModal
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
      />
    </div>
  );
};
