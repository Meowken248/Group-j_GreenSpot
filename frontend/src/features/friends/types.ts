export interface FriendRequestItem {
  request_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string | null;
  district?: string | null;
  mutual_friends_count: number;
  status: string;
  created_at: string;
  isFading?: boolean;
}

export interface FriendItem {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  district?: string | null;
  status: string;
  is_suspended: boolean;
  total_green_points: number;
  is_online: boolean;
  friends_count: number;
  friendship_created_at: string;
}

export interface GreenCitizenSuggestion {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  district?: string | null;
  total_green_points: number;
  mutual_friends_count: number;
  is_following: boolean;
  has_pending_request: boolean;
  isRequested?: boolean;
}

export interface FollowingItem {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  district?: string | null;
  total_green_points: number;
  status: string;
  followed_at: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: "success" | "error" | "info";
}
