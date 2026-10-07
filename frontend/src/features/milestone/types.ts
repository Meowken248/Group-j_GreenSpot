export interface TierDetailItem {
  tier_code: string;
  tier_name: string;
  min_points: number;
  badge_icon: string;
  color_hex: string;
  bg_gradient: string;
  description: string;
  benefits: string[];
  is_current: boolean;
  is_unlocked: boolean;
}

export interface MilestoneProgressionResponse {
  current_points: number;
  current_tier: TierDetailItem;
  next_tier: TierDetailItem | null;
  points_needed: number;
  progress_percent: number;
  is_max_tier: boolean;
  max_tier_message: string | null;
  all_tiers: TierDetailItem[];
  congratulation_message: string;
  default_post_content: string;
}

export interface CreateMilestonePostRequest {
  tier_code: string;
  content: string;
  privacy: "PUBLIC" | "FRIENDS" | "PRIVATE";
}

export interface MilestonePostItem {
  post_id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
  tier_code: string;
  tier_name: string;
  badge_icon: string;
  color_hex: string;
  content: string;
  privacy: string;
  category: string;
  likes_count: number;
  created_at: string;
}

export interface CreateMilestonePostResponse {
  success: boolean;
  message: string;
  post: MilestonePostItem;
}

export interface MilestonePostListResponse {
  total: number;
  items: MilestonePostItem[];
}
