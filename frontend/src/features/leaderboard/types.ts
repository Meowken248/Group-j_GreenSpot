export interface IndividualLeaderboardItem {
  rank: number;
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  green_points: number;
  tier_name: string;
  tier_code: string;
  badge_icon: string;
  district_code?: string;
  district_name?: string;
}

export interface MyRankResponse {
  is_logged_in: boolean;
  rank: number;
  total_citizens: number;
  green_points: number;
  points_to_top_100: number;
  is_top_10: boolean;
  tier_name: string;
  message?: string | null;
}

export interface IndividualLeaderboardResponse {
  top_10: IndividualLeaderboardItem[];
  my_rank?: MyRankResponse | null;
  selected_district?: string | null;
}

export interface GroupLeaderboardItem {
  rank: number;
  group_id: string;
  name: string;
  avatar_url?: string | null;
  description?: string | null;
  member_count: number;
  points: number;
  is_user_group: boolean;
}

export interface GroupLeaderboardResponse {
  cycle: "WEEK" | "MONTH" | "ALL" | string;
  groups: GroupLeaderboardItem[];
}

export interface DistrictLeaderboardItem {
  rank: number;
  district_code: string;
  district_name: string;
  green_index: number;
  cleanup_rate: number;
  resolved_incidents: number;
  is_user_district: boolean;
}

export interface DistrictLeaderboardResponse {
  cycle: "WEEK" | "MONTH" | "ALL" | string;
  districts: DistrictLeaderboardItem[];
}

export interface LeaderboardSnapshotWinnerItem {
  rank: number;
  user_id: string;
  full_name: string;
  points_rewarded: number;
  title: string;
}

export interface LeaderboardSnapshotResponse {
  cycle: string;
  snapshot_date: string;
  winners: LeaderboardSnapshotWinnerItem[];
  message: string;
}

export type LeaderboardTab = "INDIVIDUAL" | "GROUP" | "DISTRICT" | "TIERS_CRUD";
export type CycleFilter = "WEEK" | "MONTH" | "ALL";

// ============================================================
// CỘT MỐC CẤP BẬC & ĐIỂM SỐ XẾP HẠNG (TIERS CRUD - CN 28, 32, 36)
// ============================================================
export interface TierItem {
  tier_id: number;
  tier_code: string;
  tier_name: string;
  min_points: number;
  badge_icon: string;
  color_hex: string;
  bg_gradient: string;
  discount_percent: number;
  description?: string | null;
  benefits: string[];
  order_index: number;
  is_active: boolean;
  users_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TierCreatePayload {
  tier_code: string;
  tier_name: string;
  min_points: number;
  badge_icon: string;
  color_hex: string;
  bg_gradient?: string;
  discount_percent: number;
  description?: string;
  benefits: string[];
  order_index?: number;
  is_active?: boolean;
}

export interface TierUpdatePayload {
  tier_name?: string;
  min_points?: number;
  badge_icon?: string;
  color_hex?: string;
  bg_gradient?: string;
  discount_percent?: number;
  description?: string;
  benefits?: string[];
  order_index?: number;
  is_active?: boolean;
}

export interface TierListResponse {
  total: number;
  tiers: TierItem[];
}

export interface TierAdminResponse {
  tier: TierItem;
  message: string;
}
