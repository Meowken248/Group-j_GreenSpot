export type EventStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface ParticipantItem {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  joined_at: string;
  is_creator: boolean;
}

export interface GreenEvent {
  event_id: string;
  title: string;
  description: string;
  cover_image_url: string;
  start_time: string;
  end_time?: string | null;
  latitude: number;
  longitude: number;
  address: string;
  district: string;
  max_participants: number;
  current_participants: number;
  interested_count: number;
  creator_id: string;
  creator_name?: string | null;
  creator_avatar?: string | null;
  status: EventStatus;
  reject_reason?: string | null;
  checkin_radius_meters: number;
  created_at: string;
  updated_at: string;

  is_joined: boolean;
  is_interested: boolean;
  is_checked_in: boolean;
  participants_preview: ParticipantItem[];
}

export interface EventListResponse {
  items: GreenEvent[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  cover_image_url: string;
  start_time: string;
  end_time?: string | null;
  latitude: number;
  longitude: number;
  address: string;
  district: string;
  max_participants: number;
}

export interface CheckinPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
  device_info?: string;
}

export interface CheckinResponse {
  success: boolean;
  message: string;
  event_id: string;
  checkin_time: string;
  distance_meters: number;
  accuracy_meters: number;
  points_awarded: number;
  total_green_points: number;
}

export const HCM_DISTRICTS: string[] = [
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
  "Thành phố Thủ Đức",
  "Huyện Củ Chi",
  "Huyện Hóc Môn",
  "Huyện Bình Chánh",
  "Huyện Nhà Bè",
  "Huyện Cần Giờ",
];
