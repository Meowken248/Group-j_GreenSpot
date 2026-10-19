/**
 * Type definitions cho Chức năng 16: Tạo nhóm theo quận, theo phường hoặc theo chủ đề (Community Groups)
 */

export type GroupType = "DISTRICT" | "WARD" | "THEME";

export type GroupPrivacy = "PUBLIC" | "PRIVATE";

export type GroupMemberRole = "ADMIN" | "MODERATOR" | "MEMBER";

export interface GroupItem {
  group_id: string;
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  avatar_url?: string | null;
  group_type: GroupType;
  district?: string | null;
  ward?: string | null;
  theme_topic?: string | null;
  privacy: GroupPrivacy;
  creator_id: string;
  creator_name?: string | null;
  members_count: number;
  posts_count: number;
  status: "ACTIVE" | "DISBANDED";
  version: number;
  created_at: string;
  is_member?: boolean;
  my_role?: GroupMemberRole | null;
}

export interface GroupListResponse {
  items: GroupItem[];
  total: number;
  admin_groups_count: number;
  max_admin_groups: number;
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  group_type: GroupType;
  district?: string;
  ward?: string;
  theme_topic?: string;
  privacy: GroupPrivacy;
  cover_image_url?: string;
  avatar_url?: string;
}

export interface AdministrativeMetadata {
  districts: string[];
  wards_by_district: Record<string, string[]>;
  theme_topics: string[];
}

