import api from "../../api/client";
import type {
  WheelStatusResponse,
  SpinResultResponse,
  SpinHistoryResponse,
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
};
