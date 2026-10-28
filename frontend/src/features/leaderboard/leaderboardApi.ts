import api from "../../api/client";
import type {
  IndividualLeaderboardResponse,
  GroupLeaderboardResponse,
  DistrictLeaderboardResponse,
  CycleFilter,
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
};
