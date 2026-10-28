import api from "../../api/client";
import type {
  WeeklyChallengesData,
  ChallengeSubmitPayload,
  ChallengeCompletionResult,
  AdminChallengeListResult,
  ChallengeCreatePayload,
  ChallengeUpdatePayload,
  AdminSubmissionListResult,
  AdminReviewSubmissionPayload,
  AdminReviewSubmissionResult,
} from "./types";

export const challengesApi = {
  getWeeklyChallenges: async (): Promise<WeeklyChallengesData> => {
    const res = await api.get<WeeklyChallengesData>("/api/v1/challenges/weekly");
    return res.data;
  },

  submitChallenge: async (
    challengeId: string,
    payload: ChallengeSubmitPayload
  ): Promise<ChallengeCompletionResult> => {
    const res = await api.post<ChallengeCompletionResult>(`/api/v1/challenges/${challengeId}/submit`, payload);
    return res.data;
  },

  // Admin APIs
  adminGetAllChallenges: async (): Promise<AdminChallengeListResult> => {
    const res = await api.get<AdminChallengeListResult>("/api/v1/challenges/admin/all");
    return res.data;
  },

  adminCreateChallenge: async (payload: ChallengeCreatePayload): Promise<{ message: string; challenge_id: string }> => {
    const res = await api.post<{ message: string; challenge_id: string }>("/api/v1/challenges/admin", payload);
    return res.data;
  },

  adminUpdateChallenge: async (challengeId: string, payload: ChallengeUpdatePayload): Promise<{ message: string; challenge_id: string }> => {
    const res = await api.put<{ message: string; challenge_id: string }>(`/api/v1/challenges/admin/${challengeId}`, payload);
    return res.data;
  },

  adminDeleteChallenge: async (challengeId: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/api/v1/challenges/admin/${challengeId}`);
    return res.data;
  },

  adminToggleActive: async (challengeId: string): Promise<{ message: string; is_active: boolean }> => {
    const res = await api.patch<{ message: string; is_active: boolean }>(`/api/v1/challenges/admin/${challengeId}/toggle-active`);
    return res.data;
  },

  adminGetSubmissions: async (params?: {
    status?: string;
    week_year?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<AdminSubmissionListResult> => {
    const res = await api.get<AdminSubmissionListResult>("/api/v1/challenges/admin/submissions", { params });
    return res.data;
  },

  adminReviewSubmission: async (
    submissionId: string,
    payload: AdminReviewSubmissionPayload
  ): Promise<AdminReviewSubmissionResult> => {
    const res = await api.post<AdminReviewSubmissionResult>(
      `/api/v1/challenges/admin/submissions/${submissionId}/review`,
      payload
    );
    return res.data;
  },
};

