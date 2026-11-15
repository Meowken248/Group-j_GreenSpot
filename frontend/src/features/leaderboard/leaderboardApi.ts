import api from "../../api/client";
import type {
  IndividualLeaderboardResponse,
  GroupLeaderboardResponse,
  DistrictLeaderboardResponse,
  CycleFilter,
} from "./types";

export const leaderboardApi = {
  getIndividualLeaderboard: async (): Promise<IndividualLeaderboardResponse> => {
    const res = await api.get<IndividualLeaderboardResponse>("/api/v1/gamification/leaderboard/individual");
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
};
