import api from "../../api/client";
import type {
  IndividualLeaderboardResponse,
  GroupLeaderboardResponse,
  DistrictLeaderboardResponse,
  CycleFilter,
  TierListResponse,
  TierAdminResponse,
  TierCreatePayload,
  TierUpdatePayload,
} from "./types";

export const leaderboardApi = {
  getIndividualLeaderboard: async (params?: { district?: string; cycle?: CycleFilter }): Promise<IndividualLeaderboardResponse> => {
    const res = await api.get<IndividualLeaderboardResponse>("/api/v1/gamification/leaderboard/individual", {
      params,
    });
    return res.data;
  },

  getGroupLeaderboard: async (cycle: CycleFilter = "WEEK"): Promise<GroupLeaderboardResponse> => {
    const res = await api.get<GroupLeaderboardResponse>("/api/v1/gamification/leaderboard/groups", {
      params: { cycle },
    });
    return res.data;
  },

  getDistrictLeaderboard: async (cycle: CycleFilter = "WEEK"): Promise<DistrictLeaderboardResponse> => {
    const res = await api.get<DistrictLeaderboardResponse>("/api/v1/gamification/leaderboard/districts", {
      params: { cycle },
    });
    return res.data;
  },

  takeAdminSnapshot: async (cycle: CycleFilter = "WEEK"): Promise<import("./types").LeaderboardSnapshotResponse> => {
    const res = await api.post<import("./types").LeaderboardSnapshotResponse>(
      "/api/v1/gamification/leaderboard/admin/snapshot",
      null,
      { params: { cycle } }
    );
    return res.data;
  },

  // ============================================================
  // CỘT MỐC CẤP BẬC CRUD (Chức năng 28, 32, 36)
  // ============================================================
  getPublicTiers: async (): Promise<TierListResponse> => {
    const res = await api.get<TierListResponse>("/api/v1/gamification/tiers");
    return res.data;
  },

  getAdminTiers: async (): Promise<TierListResponse> => {
    const res = await api.get<TierListResponse>("/api/v1/gamification/tiers/admin/all");
    return res.data;
  },

  createTier: async (payload: TierCreatePayload): Promise<TierAdminResponse> => {
    const res = await api.post<TierAdminResponse>("/api/v1/gamification/tiers/admin", payload);
    return res.data;
  },

  updateTier: async (tierId: number, payload: TierUpdatePayload): Promise<TierAdminResponse> => {
    const res = await api.put<TierAdminResponse>(`/api/v1/gamification/tiers/admin/${tierId}`, payload);
    return res.data;
  },

  deleteTier: async (tierId: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/api/v1/gamification/tiers/admin/${tierId}`);
    return res.data;
  },

  resetDefaultTiers: async (): Promise<TierListResponse> => {
    const res = await api.post<TierListResponse>("/api/v1/gamification/tiers/admin/reset-defaults");
    return res.data;
  },
};
