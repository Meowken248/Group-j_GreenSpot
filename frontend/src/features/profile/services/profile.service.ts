import api from "../../../api/client";
import type {
  UserProfile,
  PostListResponse,
  PostItem,
  UpdatePostPayload,
  ToggleHidePostResponse,
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

  // =========================================================================
  // CÁC THAO TÁC BÀI VIẾT (FEATURE STT 13: SỬA, XOÁ VÀ ẨN BÀI VIẾT)
  // =========================================================================

  // Cập nhật bài viết (Màn 2/5)
  async updatePost(postId: string, payload: UpdatePostPayload): Promise<PostItem> {
    const res = await api.patch<PostItem>(`/api/v1/posts/${postId}`, payload);
    return res.data;
  },

  // Xoá mềm bài viết (Màn 3/5 & 4/5)
  async deletePost(postId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(`/api/v1/posts/${postId}`);
    return res.data;
  },

  // Ẩn hoặc Hiện lại bài viết (Màn 5/5)
  async toggleHidePost(postId: string, isHidden: boolean): Promise<ToggleHidePostResponse> {
    const res = await api.patch<ToggleHidePostResponse>(`/api/v1/posts/${postId}/visibility`, {
      is_hidden: isHidden,
    });
    return res.data;
  },

  // Tải lên tệp ảnh hoặc video đính kèm khi sửa bài
  async uploadMedia(file: File): Promise<{ url: string; media_type: "IMAGE" | "VIDEO"; file_name: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ url: string; media_type: "IMAGE" | "VIDEO"; file_name: string; size_bytes: number }>(
      "/api/v1/posts/media",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return res.data;
  },
};
