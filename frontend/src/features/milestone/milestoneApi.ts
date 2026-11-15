import api from "../../api/client";
import type {
  MilestoneProgressionResponse,
  CreateMilestonePostRequest,
  CreateMilestonePostResponse,
  MilestonePostListResponse,
} from "./types";

export const milestoneApi = {
  getProgression: async (): Promise<MilestoneProgressionResponse> => {
    const res = await api.get<MilestoneProgressionResponse>("/api/v1/gamification/milestone/progression");
    return res.data;
  },

  createPost: async (payload: CreateMilestonePostRequest): Promise<CreateMilestonePostResponse> => {
    const res = await api.post<CreateMilestonePostResponse>("/api/v1/gamification/milestone/post", payload);
    return res.data;
  },

  getPosts: async (limit: number = 20, offset: number = 0): Promise<MilestonePostListResponse> => {
    const res = await api.get<MilestonePostListResponse>("/api/v1/gamification/milestone/posts", {
      params: { limit, offset },
    });
    return res.data;
  },

  likePost: async (postId: string): Promise<{ success: boolean; post_id: string; likes_count: number }> => {
    const res = await api.post(`/api/v1/gamification/milestone/like/${postId}`);
    return res.data;
  },
};
