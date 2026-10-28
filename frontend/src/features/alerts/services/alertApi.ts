import api from "../../../api/client";
import type {
  AlertCreateInput,
  AlertListResponse,
  AlertTemplate,
  AlertUpdateInput,
  EnvironmentalAlert,
} from "../types";

export const alertApi = {
  getTemplates: async (): Promise<AlertTemplate[]> => {
    const res = await api.get<AlertTemplate[]>("/api/v1/alerts/templates");
    return res.data;
  },

  listAlerts: async (params?: {
    status_filter?: string;
    severity_filter?: string;
    category_filter?: string;
    district?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<AlertListResponse> => {
    const res = await api.get<AlertListResponse>("/api/v1/alerts", { params });
    return res.data;
  },

  getAlertDetail: async (alertId: string): Promise<EnvironmentalAlert> => {
    const res = await api.get<EnvironmentalAlert>(`/api/v1/alerts/${alertId}`);
    return res.data;
  },

  createAlert: async (data: AlertCreateInput): Promise<EnvironmentalAlert> => {
    const res = await api.post<EnvironmentalAlert>("/api/v1/alerts", data);
    return res.data;
  },

  updateAlert: async (alertId: string, data: AlertUpdateInput): Promise<EnvironmentalAlert> => {
    const res = await api.put<EnvironmentalAlert>(`/api/v1/alerts/${alertId}`, data);
    return res.data;
  },

  publishAlert: async (alertId: string): Promise<EnvironmentalAlert> => {
    const res = await api.post<EnvironmentalAlert>(`/api/v1/alerts/${alertId}/publish`);
    return res.data;
  },

  resolveAlert: async (alertId: string, resolvedNote: string): Promise<EnvironmentalAlert> => {
    const res = await api.post<EnvironmentalAlert>(`/api/v1/alerts/${alertId}/resolve`, {
      resolved_note: resolvedNote,
    });
    return res.data;
  },

  revokeAlert: async (alertId: string, revokeReason: string): Promise<EnvironmentalAlert> => {
    const res = await api.post<EnvironmentalAlert>(`/api/v1/alerts/${alertId}/revoke`, {
      revoke_reason: revokeReason,
    });
    return res.data;
  },

  // Chức năng 34: Ngưỡng cảnh báo & Bán kính phát tin
  getThresholdConfigs: async () => {
    const res = await api.get("/api/v1/alerts/config/thresholds");
    return res.data;
  },

  updateThresholdConfigs: async (data: any) => {
    const res = await api.put("/api/v1/alerts/config/thresholds", data);
    return res.data;
  },

  resetThresholdConfigs: async () => {
    const res = await api.post("/api/v1/alerts/config/thresholds/reset");
    return res.data;
  },

  // Chức năng 35: SOS khẩn cấp & Dải Banner phát sóng
  submitSOSAlert: async (data: any) => {
    const res = await api.post("/api/v1/alerts/sos", data);
    return res.data;
  },

  getActiveSOSBanner: async () => {
    const res = await api.get("/api/v1/alerts/sos/active-broadcast");
    return res.data;
  },

  toggleSOSBanner: async (data: any) => {
    const res = await api.post("/api/v1/alerts/sos/broadcast-banner", data);
    return res.data;
  },

  listRecentSOSIncidents: async () => {
    const res = await api.get("/api/v1/alerts/sos/incidents");
    return res.data;
  },

  // Chức năng 31: Bản đồ giám sát cảnh báo ô nhiễm trực quan cho cộng đồng
  getLiveMapPoints: async (params?: { category?: string; severity?: string }) => {
    const res = await api.get("/api/v1/alerts/live-map-points", { params });
    return res.data;
  },

  // Chức năng 32: Đăng ký nhận tin cảnh báo cá nhân hóa theo khu vực cư trú
  getAlertSubscription: async (userId?: string) => {
    const res = await api.get("/api/v1/alerts/subscriptions/me", {
      params: { user_id: userId },
    });
    return res.data;
  },

  updateAlertSubscription: async (data: any, userId?: string) => {
    const res = await api.post("/api/v1/alerts/subscriptions/me", data, {
      params: { user_id: userId },
    });
    return res.data;
  },
};

