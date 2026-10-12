/**
 * Service API Client cho Bảng tin Geo-Feed (Chức năng STT 08)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 97 - 102)
 */

import api from "../../../api/client";
import type {
  FeedListResponse,
  FeedQueryParams,
  RadiusOption,
  CategoryOption,
} from "../types/feed.types";

export const RADIUS_PRESETS: RadiusOption[] = [
  { value: 0.5, label: "500m" },
  { value: 1.0, label: "1 km" },
  { value: 2.0, label: "2 km" },
  { value: 5.0, label: "5 km" },
  { value: 10.0, label: "10 km" },
];

export const FEED_CATEGORIES: CategoryOption[] = [
  { key: "all", label: "Tất cả chủ đề", icon: "🌱", color: "#10b981" },
  { key: "Rác sinh hoạt", label: "Rác sinh hoạt", icon: "🗑️", color: "#f59e0b" },
  { key: "Xà bần xây dựng", label: "Xà bần xây dựng", icon: "🧱", color: "#ef4444" },
  { key: "Nước thải", label: "Nước thải ô nhiễm", icon: "🚰", color: "#06b6d4" },
  { key: "Chủ Nhật Xanh", label: "Chủ Nhật Xanh", icon: "🧹", color: "#22c55e" },
  { key: "Đổi rác lấy quà", label: "Đổi rác lấy quà", icon: "🎁", color: "#8b5cf6" },
];

export const TPHCM_DISTRICTS: string[] = [
  "Quận 1",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 6",
  "Quận 7",
  "Quận 8",
  "Quận 10",
  "Quận 11",
  "Quận 12",
  "Quận Bình Thạnh",
  "Quận Gò Vấp",
  "Quận Phú Nhuận",
  "Quận Tân Bình",
  "Quận Tân Phú",
  "Quận Bình Tân",
  "TP. Thủ Đức",
  "Huyện Bình Chánh",
  "Huyện Cần Giờ",
  "Huyện Củ Chi",
  "Huyện Hóc Môn",
  "Huyện Nhà Bè",
];

export const feedService = {
  /**
   * Truy vấn danh sách bài viết trên Bảng tin Geo-Feed (Màn 1 -> Màn 3)
   */
  async getGeoFeed(params: FeedQueryParams = {}): Promise<FeedListResponse> {
    const queryParams: Record<string, any> = {
      tab: params.tab || "nearby",
      page: params.page || 1,
      limit: params.limit || 10,
      radius_km: params.radius_km || 2.0,
      sort_by: params.sort_by || "newest",
    };

    if (params.latitude != null) queryParams.latitude = params.latitude;
    if (params.longitude != null) queryParams.longitude = params.longitude;
    if (params.district) queryParams.district = params.district;
    if (params.category && params.category !== "all") queryParams.category = params.category;

    const response = await api.get<FeedListResponse>("/api/v1/posts/feed", {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Thả cảm xúc sinh thái (Eco-Reactions - STT 10)
   */
  async reactToPost(postId: string, reactionType: string): Promise<any> {
    try {
      const response = await api.post(`/api/v1/posts/${postId}/reactions`, {
        reaction_type: reactionType,
      });
      return response.data;
    } catch {
      // Fallback thành công lạc quan trên UI
      return { success: true, reaction_type: reactionType };
    }
  },
};

