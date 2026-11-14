import api from "../../api/client";
import type {
  WheelStatusResponse,
  SpinResultResponse,
  SpinHistoryResponse,
  WheelSlotItem,
  WheelSlotCreateInput,
  WheelSlotUpdateInput,
  AdminSlotStatsResponse,
} from "./types";

export const luckyWheelApi = {
  getWheelStatus: async (): Promise<WheelStatusResponse> => {
    const res = await api.get<WheelStatusResponse>("/api/v1/gamification/lucky-wheel/status");
    return res.data;
  },

  spinWheel: async (): Promise<SpinResultResponse> => {
    const res = await api.post<SpinResultResponse>("/api/v1/gamification/lucky-wheel/spin");
    return res.data;
  },

  getSpinHistory: async (): Promise<SpinHistoryResponse> => {
    const res = await api.get<SpinHistoryResponse>("/api/v1/gamification/lucky-wheel/history");
    return res.data;
  },

  // =========================================================================
  // ADMIN CRUD CHO CÁC Ô GIẢI THƯỞNG VÒNG QUAY (CHỨC NĂNG 35 CRUD)
  // =========================================================================

  getAdminSlots: async (): Promise<AdminSlotStatsResponse> => {
    const res = await api.get<AdminSlotStatsResponse>("/api/v1/gamification/lucky-wheel/admin/slots");
    return res.data;
  },

  createSlot: async (payload: WheelSlotCreateInput): Promise<WheelSlotItem> => {
    const res = await api.post<WheelSlotItem>("/api/v1/gamification/lucky-wheel/admin/slots", payload);
    return res.data;
  },

  updateSlot: async (slotId: string, payload: WheelSlotUpdateInput): Promise<WheelSlotItem> => {
    const res = await api.put<WheelSlotItem>(`/api/v1/gamification/lucky-wheel/admin/slots/${slotId}`, payload);
    return res.data;
  },

  deleteSlot: async (slotId: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(`/api/v1/gamification/lucky-wheel/admin/slots/${slotId}`);
    return res.data;
  },

  resetDefaultSlots: async (): Promise<AdminSlotStatsResponse> => {
    const res = await api.post<AdminSlotStatsResponse>("/api/v1/gamification/lucky-wheel/admin/slots/reset-default");
    return res.data;
  },
};
