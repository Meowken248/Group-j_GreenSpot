import api from "../../api/client";
import type {
  WasteHandbookOverview,
  WasteItemSummary,
  WasteItemDetail,
  WasteHandbookAdminListResponse,
  WasteItemCreatePayload,
  WasteItemUpdatePayload,
} from "./types";

export const handbookApi = {
  getOverview: async (): Promise<WasteHandbookOverview> => {
    const res = await api.get<WasteHandbookOverview>("/api/v1/waste-handbook/overview");
    return res.data;
  },

  searchItems: async (params: {
    q?: string;
    category?: string;
    limit?: number;
  }): Promise<WasteItemSummary[]> => {
    const res = await api.get<WasteItemSummary[]>("/api/v1/waste-handbook/search", { params });
    return res.data;
  },

  getItemDetail: async (itemId: string): Promise<WasteItemDetail> => {
    const res = await api.get<WasteItemDetail>(`/api/v1/waste-handbook/items/${itemId}`);
    return res.data;
  },

  // Admin CMS CRUD Methods
  adminGetItems: async (params?: {
    q?: string;
    category?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<WasteHandbookAdminListResponse> => {
    const res = await api.get<WasteHandbookAdminListResponse>(
      "/api/v1/waste-handbook/admin/items",
      { params }
    );
    return res.data;
  },

  adminCreateItem: async (payload: WasteItemCreatePayload): Promise<{ message: string; item_id: string }> => {
    const res = await api.post<{ message: string; item_id: string }>(
      "/api/v1/waste-handbook/admin/items",
      payload
    );
    return res.data;
  },

  adminUpdateItem: async (
    itemId: string,
    payload: WasteItemUpdatePayload
  ): Promise<{ message: string; item_id: string }> => {
    const res = await api.put<{ message: string; item_id: string }>(
      `/api/v1/waste-handbook/admin/items/${itemId}`,
      payload
    );
    return res.data;
  },

  adminDeleteItem: async (itemId: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(
      `/api/v1/waste-handbook/admin/items/${itemId}`
    );
    return res.data;
  },

  adminResetDefaults: async (): Promise<{ message: string; count: number }> => {
    const res = await api.post<{ message: string; count: number }>(
      "/api/v1/waste-handbook/admin/reset-defaults"
    );
    return res.data;
  },

  claimQuizReward: async (itemName: string): Promise<{ points_awarded?: number; message?: string }> => {
    const res = await api.post("/api/v1/rewards/claim", {
      action_type: "ECO_REACTION",
      description: `Trả lời đúng Trắc nghiệm Phân loại rác Cẩm nang: ${itemName}`,
      latitude: 10.7769,
      longitude: 106.7009,
    });
    return res.data;
  },
};

