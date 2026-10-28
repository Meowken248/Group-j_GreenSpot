import api from "../../../api/client";
import type {
  UserProfile,
  PostListResponse,
  GreenPassportData,
  UserBadgesData,
  ActivityListResponse,
  UpdateProfilePayload,
  UpdateProfileResponse,
} from "../types/profile.types";

export const profileService = {
  // Lấy thông tin hồ sơ của chính mình
  async getMyProfile(): Promise<UserProfile> {
    const res = await api.get<UserProfile>("/api/v1/profile/me");
    return res.data;
  },

  // Lấy thông tin hồ sơ theo ID
  async getUserProfile(userId: string): Promise<UserProfile> {
    const res = await api.get<UserProfile>(`/api/v1/profile/${userId}`);
    return res.data;
  },

  // Lấy danh sách bài viết timeline của người dùng
  async getUserPosts(userId: string, page = 1, limit = 10): Promise<PostListResponse> {
    const res = await api.get<PostListResponse>(`/api/v1/profile/${userId}/posts`, {
      params: { page, limit },
    });
    return res.data;
  },

  // Lấy thông tin Green Passport
  async getGreenPassport(userId: string): Promise<GreenPassportData> {
    const res = await api.get<GreenPassportData>(`/api/v1/profile/${userId}/green-passport`);
    return res.data;
  },

  // Lấy bộ sưu tập huy hiệu
  async getUserBadges(userId: string): Promise<UserBadgesData> {
    const res = await api.get<UserBadgesData>(`/api/v1/profile/${userId}/badges`);
    return res.data;
  },

  // Lấy lịch sử hoạt động đóng góp
  async getUserActivities(
    userId: string,
    params: {
      activity_type?: string;
      from_date?: string;
      to_date?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ActivityListResponse> {
    const res = await api.get<ActivityListResponse>(`/api/v1/profile/${userId}/activities`, {
      params,
    });
    return res.data;
  },

  // Cập nhật thông tin cá nhân (với Optimistic Concurrency Control)
  async updateProfile(payload: UpdateProfilePayload): Promise<UpdateProfileResponse> {
    const res = await api.put<UpdateProfileResponse>("/api/v1/profile/me", payload);
    return res.data;
  },
};
