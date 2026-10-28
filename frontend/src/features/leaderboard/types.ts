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

export type LeaderboardTab = "INDIVIDUAL" | "GROUP" | "DISTRICT";
export type CycleFilter = "WEEK" | "MONTH" | "ALL";
