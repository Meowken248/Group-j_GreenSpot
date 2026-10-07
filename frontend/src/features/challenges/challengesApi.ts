import api from "../../api/client";
import type { WeeklyChallengesData, ChallengeSubmitPayload, ChallengeCompletionResult } from "./types";

export const challengesApi = {
  getWeeklyChallenges: async (): Promise<WeeklyChallengesData> => {
    const res = await api.get<WeeklyChallengesData>("/challenges/weekly");
    return res.data;
  },

  submitChallenge: async (
    challengeId: string,
    payload: ChallengeSubmitPayload
  ): Promise<ChallengeCompletionResult> => {
    const res = await api.post<ChallengeCompletionResult>(`/challenges/${challengeId}/submit`, payload);
    return res.data;
  },
};
