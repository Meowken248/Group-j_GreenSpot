/**
 * Types: Sinh nhật bạn bè & thiệp xanh sinh thái (Feature STT 17)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 142 - 147)
 */

export type BirthdayWishType = "MESSAGE" | "CARD";

/** Một người bạn có sinh nhật hôm nay */
export interface BirthdayFriendItem {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  date_of_birth: string;
  age: number;
  citizen_level_name?: string | null;
  card_sent_today: boolean;
  wish_sent_today: boolean;
}

/** Mẫu thiệp xanh sinh thái (cấu hình hiển thị từ backend) */
export interface BirthdayCardTemplate {
  card_id: string;
  name: string;
  tagline: string;
  icon: string;
  gradient_from: string;
  gradient_to: string;
  accent_color: string;
  suggestion: string;
}

/** Khối "Sinh nhật hôm nay" trên Bảng tin Geo-Feed */
export interface BirthdayTodayResponse {
  items: BirthdayFriendItem[];
  total: number;
  has_more: boolean;
  limit: number;
  today: string;
  points_per_card: number;
  daily_points_cap: number;
  daily_points_earned: number;
  daily_reward_limit_reached: boolean;
  card_templates: BirthdayCardTemplate[];
  default_suggestion: string;
}

export interface BirthdayWishSendPayload {
  recipient_id: string;
  wish_type: BirthdayWishType;
  card_template_id?: string | null;
  message: string;
}

export interface BirthdayWishSendResponse {
  success: boolean;
  wish_id: string;
  wish_type: BirthdayWishType;
  recipient_id: string;
  recipient_name: string;
  message: string;
  points_awarded: number;
  daily_limit_reached: boolean;
  sender_total_green_points: number;
}

/** Lời chúc / thiệp xanh đã nhận (hộp thư sinh nhật) */
export interface BirthdayWishItem {
  wish_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar_url?: string | null;
  wish_type: BirthdayWishType;
  card_template_id?: string | null;
  message: string;
  points_awarded: number;
  is_read: boolean;
  birthday_date: string;
  created_at: string;
}

export interface BirthdayWishListResponse {
  items: BirthdayWishItem[];
  total: number;
  unread_count: number;
  has_more: boolean;
  limit: number;
  offset: number;
}

export interface BirthdayWishReadResponse {
  success: boolean;
  marked_count: number;
  unread_count: number;
}
