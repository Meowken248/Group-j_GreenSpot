export type MediaType = "IMAGE" | "VIDEO";

export interface MediaItem {
  url: string;
  media_type: MediaType;
  file_name?: string;
  size_bytes?: number;
  duration_seconds?: number;
  previewUrl?: string;
  file?: File;
}

export interface CreatePostPayload {
  content?: string;
  media_urls?: Array<{
    url: string;
    media_type: MediaType;
    size_bytes?: number;
    duration_seconds?: number;
  }>;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  tagged_friend_ids?: string[];
  group_id?: string | null;
  visibility?: string;
}

export interface AuthorSummary {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface TaggedFriendItem {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  email: string;
}

export interface PostDetail {
  post_id: string;
  user_id: string;
  author?: AuthorSummary;
  content: string;
  media_urls: MediaItem[];
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  group_id?: string | null;
  visibility: string;
  is_hidden: boolean;
  reactions_count: number;
  comments_count: number;
  version: number;
  created_at: string;
  updated_at: string;
  tagged_friends: TaggedFriendItem[];
}

export interface FriendOption {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  email: string;
}

export interface VolunteerGroupOption {
  group_id: string;
  name: string;
  description: string;
  members_count: number;
  district: string;
  requires_approval: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}
