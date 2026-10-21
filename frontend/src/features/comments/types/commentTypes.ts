/**
 * TypeScript Interfaces cho Chức năng 14: Bình luận, Trả lời bình luận và Chia sẻ bài viết
 */

export interface AuthorSummary {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  role?: string;
}

export interface ReplyItem {
  comment_id: string;
  parent_id: string;
  author: AuthorSummary;
  reply_to_user?: AuthorSummary | null;
  content?: string;
  media_url?: string | null;
  likes_count: number;
  created_at: string;
}

export interface CommentItem {
  comment_id: string;
  post_id: string;
  author: AuthorSummary;
  content?: string;
  media_url?: string | null;
  replies_count: number;
  likes_count: number;
  created_at: string;
  initial_replies: ReplyItem[];
}

export interface CommentListResponse {
  items: CommentItem[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ReplyListResponse {
  comment_id: string;
  items: ReplyItem[];
  total: number;
}

export type ShareType = "FEED" | "FRIENDS" | "GROUP" | "LINK";

export interface SharePostRequest {
  share_type: ShareType;
  caption?: string;
  target_friend_ids?: string[];
  target_group_ids?: string[];
}

export interface SharePostResponse {
  success: boolean;
  message: string;
  shares_count: number;
  share_id: string;
  new_post_id?: string;
}

export interface ShareFriendOption {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  email?: string;
}

export interface ShareGroupOption {
  group_id: string;
  name: string;
  description?: string;
  members_count?: number;
  district?: string;
  requires_approval?: boolean;
  can_post?: boolean;
}
