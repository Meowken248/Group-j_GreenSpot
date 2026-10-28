import api from "../../../api/client";
import type {
  PublicIncidentDetail,
  PublicSubscribeInput,
  PublicVerificationInput,
} from "../types";

export const trackingApi = {
  trackIncident: async (trackingCode: string): Promise<PublicIncidentDetail> => {
    const res = await api.get<PublicIncidentDetail>(`/api/v1/public/tracking/${encodeURIComponent(trackingCode.trim().toUpperCase())}`);
    return res.data;
  },

  subscribeUpdates: async (data: PublicSubscribeInput): Promise<{ status: string; message: string }> => {
    const res = await api.post<{ status: string; message: string }>("/api/v1/public/tracking/subscribe", data);
    return res.data;
  },

  verifyCleanliness: async (data: PublicVerificationInput): Promise<{ status: string; message: string }> => {
    const res = await api.post<{ status: string; message: string }>("/api/v1/public/tracking/verify", data);
    return res.data;
  },
};
