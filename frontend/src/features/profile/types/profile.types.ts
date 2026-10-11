export interface CitizenLevel {
  level_id: number;
  level_name: string;
  min_points: number;
  badge_icon_url?: string | null;
  sort_order: number;
}

export interface BadgeHighlight {
  badge_id: number;
  badge_code: string;
  name: string;
  icon_url: string;
  earned_at: string;
}

export interface UserProfile {
  user_id: string;
  id?: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  bio?: string | null;
  friends_count: number;
  activated_at: string;
  current_level?: CitizenLevel | null;
  highlight_badges: BadgeHighlight[];
  total_badges_count: number;
  is_own_profile: boolean;
  total_green_points: number;
  date_of_birth?: string | null;
  version: number;
}

export interface PostItem {
  post_id: string;
  user_id: string;
  content: string;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  reactions_count: number;
  comments_count: number;
  is_hidden: boolean;
  created_at: string;
  relative_time?: string;
}

export interface PostListResponse {
  items: PostItem[];
  total: number;
  has_more: boolean;
  page: number;
  limit: number;
}

export interface GreenPassportData {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  passport_code: string;
  current_level: string;
  total_green_points: number;
  progress_percentage: number;
  points_to_next_level: number;
  next_level_name?: string | null;
  is_max_level: boolean;
  activated_at: string;
}

export interface BadgeEarnedItem {
  badge_id: number;
  badge_code: string;
  name: string;
  description: string;
  icon_url: string;
  earned_at: string;
}

export interface BadgeLockedItem {
  badge_id: number;
  badge_code: string;
  name: string;
  description: string;
  icon_url: string;
  unlock_condition: string;
  sort_order: number;
}

export interface UserBadgesData {
  earned_badges: BadgeEarnedItem[];
  locked_badges?: BadgeLockedItem[] | null;
  is_own_profile: boolean;
}

export interface ActivityItem {
  activity_id: string;
  activity_type: string;
  title: string;
  description?: string | null;
  points: number;
  created_at: string;
}

export interface ActivityListResponse {
  items: ActivityItem[];
  total_activities: number;
  total_points: number;
  has_more: boolean;
  limit: number;
  offset: number;
}

export interface UpdateProfilePayload {
  full_name: string;
  bio?: string | null;
  date_of_birth?: string | null;
  cover_image_url?: string | null;
  avatar_url?: string | null;
  version: number;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  new_version: number;
  user: UserProfile;
  data?: UserProfile;
}

export type ProfileScreen = "timeline" | "passport" | "history" | "edit";
