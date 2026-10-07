import api from "../../api/client";
import type {
  WasteHandbookOverview,
  WasteItemSummary,
  WasteItemDetail,
} from "./types";

export const handbookApi = {
  getOverview: async (): Promise<WasteHandbookOverview> => {
    const res = await api.get<WasteHandbookOverview>("/waste-handbook/overview");
    return res.data;
  },

  searchItems: async (params: {
    q?: string;
    category?: string;
    limit?: number;
  }): Promise<WasteItemSummary[]> => {
    const res = await api.get<WasteItemSummary[]>("/waste-handbook/search", { params });
    return res.data;
  },

  getItemDetail: async (itemId: string): Promise<WasteItemDetail> => {
    const res = await api.get<WasteItemDetail>(`/waste-handbook/items/${itemId}`);
    return res.data;
  },
};
