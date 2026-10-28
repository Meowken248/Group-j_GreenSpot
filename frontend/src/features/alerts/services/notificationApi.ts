import api from "../../../api/client";
import type { NotificationListResponse, PushStatsResponse } from "../types";

export const notificationApi = {
  listNotifications: async (params?: {
    user_id?: string;
    only_unread?: boolean;
    page?: number;
    limit?: number;
  }): Promise<NotificationListResponse> => {
    const res = await api.get<NotificationListResponse>("/api/v1/notifications", { params });
    return res.data;
  },

  markAsRead: async (notificationIds?: string[], userId?: string): Promise<{ status: string; marked_read_count: number }> => {
    const res = await api.post<{ status: string; marked_read_count: number }>("/api/v1/notifications/mark-read", {
      notification_ids: notificationIds,
    }, {
      params: { user_id: userId },
    });
    return res.data;
  },

  deleteNotification: async (notificationId: string, userId?: string): Promise<void> => {
    await api.delete(`/api/v1/notifications/${notificationId}`, {
      params: { user_id: userId },
    });
  },

  getPushStats: async (): Promise<PushStatsResponse> => {
    const res = await api.get<PushStatsResponse>("/api/v1/notifications/stats");
    return res.data;
  },
};
