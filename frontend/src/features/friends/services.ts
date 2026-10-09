import api from "../../api/client";
import type {
  FriendRequestItem,
  FriendItem,
  GreenCitizenSuggestion,
  FollowingItem,
} from "./types";

export const friendsService = {
  // Lấy danh sách lời mời kết bạn (PENDING)
  async getReceivedRequests(): Promise<FriendRequestItem[]> {
    const res = await api.get<FriendRequestItem[]>("/api/v1/friends/requests");
    return res.data;
  },

  // Gửi lời mời kết bạn
  async sendFriendRequest(receiverId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>("/api/v1/friends/requests", {
      receiver_id: receiverId,
    });
    return res.data;
  },

  // Phản hồi lời mời (ACCEPT hoặc REJECT)
  async respondToRequest(
    requestId: string,
    action: "ACCEPT" | "REJECT"
  ): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>(
      `/api/v1/friends/requests/${requestId}/respond`,
      { action }
    );
    return res.data;
  },

  // Lấy danh sách bạn bè hiện tại (có tìm kiếm realtime debounce 300ms)
  async getFriendsList(query?: string): Promise<FriendItem[]> {
    const res = await api.get<FriendItem[]>("/api/v1/friends/list", {
      params: query ? { query } : {},
    });
    return res.data;
  },

  // Lấy danh sách gợi ý công dân xanh
  async getSuggestions(): Promise<GreenCitizenSuggestion[]> {
    const res = await api.get<GreenCitizenSuggestion[]>("/api/v1/friends/suggestions");
    return res.data;
  },

  // Lấy danh sách đang theo dõi
  async getFollowingList(): Promise<FollowingItem[]> {
    const res = await api.get<FollowingItem[]>("/api/v1/friends/following");
    return res.data;
  },

  // Theo dõi một công dân xanh
  async followUser(targetUserId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>("/api/v1/friends/follow", {
      target_user_id: targetUserId,
    });
    return res.data;
  },

  // Bỏ theo dõi
  async unfollowUser(targetUserId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>("/api/v1/friends/unfollow", {
      target_user_id: targetUserId,
    });
    return res.data;
  },

  // Hủy kết bạn (Màn 3 Popup)
  async unfriendUser(friendUserId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>("/api/v1/friends/unfriend", {
      friend_user_id: friendUserId,
    });
    return res.data;
  },
};
