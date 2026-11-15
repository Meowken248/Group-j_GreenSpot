import api from "../../api/client";
import type {
  HeatmapMode,
  MultiModeHeatmapResponse,
  DistrictZoneDetail,
} from "./types";

export const heatmapApi = {
  getHeatmapData: async (mode: HeatmapMode = "AQI"): Promise<MultiModeHeatmapResponse> => {
    const res = await api.get<MultiModeHeatmapResponse>("/api/v1/map/heatmap-data", {
      params: { mode },
    });
    return res.data;
  },

  getZoneDetail: async (districtCode: string): Promise<DistrictZoneDetail> => {
    const res = await api.get<DistrictZoneDetail>(`/api/v1/map/heatmap-data/zone/${districtCode}`);
    return res.data;
  },
};
