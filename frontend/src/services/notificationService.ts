import apiClient from "../api/client";

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unread_count: number;
}

export const notificationService = {
  async getMyNotifications(limit: number = 20): Promise<NotificationListResponse> {
    const res = await apiClient.get<NotificationListResponse>("/api/v1/notifications", {
      params: { limit },
    });
    return res.data;
  },

  async markAsRead(notificationId: string): Promise<NotificationItem> {
    const res = await apiClient.patch<NotificationItem>(`/api/v1/notifications/${notificationId}/read`);
    return res.data;
  },

  async markAllAsRead(): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>("/api/v1/notifications/mark-all-read");
    return res.data;
  },
};
