/**
 * Types & Data Models cho Bảng tin Geo-Feed (Chức năng STT 08)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 97 - 102)
 */

export type FeedTab = "nearby" | "district" | "friends" | "groups";

export type FeedSortBy = "newest" | "popular" | "nearest";

export interface FeedAuthor {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface FeedMediaItem {
  url: string;
  media_type?: "IMAGE" | "VIDEO";
  file_name?: string;
  size_bytes?: number;
  duration_seconds?: number | null;
}

export interface FeedTaggedFriend {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  email?: string;
}

export interface FeedPostItem {
  post_id: string;
  user_id: string;
  author?: FeedAuthor | null;
  content: string;
  media_urls: FeedMediaItem[];
  thumbnail_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  group_id?: string | null;
  visibility: string;
  is_hidden: boolean;
  is_edited: boolean;
  reactions_count: number;
  comments_count: number;
  version: number;
  created_at: string;
  updated_at: string;
  tagged_friends: FeedTaggedFriend[];

  // Chỉ số khoảng cách không gian (Màn 1)
  distance_meters?: number | null;
  distance_text?: string | null; // VD: "Cách bạn 450m", "Cách bạn 1.8km"
  user_reaction?: string | null;
}

export interface FeedListResponse {
  items: FeedPostItem[];
  total: number;
  has_more: boolean;
  page: number;
  limit: number;
  tab: FeedTab;
  radius_km?: number | null;
  user_lat?: number | null;
  user_lon?: number | null;
  district?: string | null;
  category?: string | null;
  sort_by: FeedSortBy;
}

export interface FeedQueryParams {
  tab?: FeedTab;
  latitude?: number | null;
  longitude?: number | null;
  radius_km?: number;
  district?: string | null;
  category?: string | null;
  sort_by?: FeedSortBy;
  page?: number;
  limit?: number;
}

export interface RadiusOption {
  value: number; // Đơn vị: km (0.5, 1, 2, 5, 10)
  label: string; // VD: "500m", "1 km", "2 km", "5 km", "10 km"
}

export interface CategoryOption {
  key: string;
  label: string;
  icon: string;
  color: string;
}
