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
  province?: string | null;
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
  province?: string;
  district?: string;
  ward?: string;
  theme_topic?: string;
  privacy: GroupPrivacy;
  cover_image_url?: string;
  avatar_url?: string;
}

export interface AdministrativeMetadata {
  provinces: string[];
  districts_by_province: Record<string, string[]>;
  districts: string[];
  wards_by_district: Record<string, string[]>;
  theme_topics: string[];
}

export interface ExploreGroupsParams {
  group_type?: GroupType;
  province?: string;
  district?: string;
  ward?: string;
  theme_topic?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface GroupMemberItem {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  district?: string | null;
  role: GroupMemberRole | string;
  joined_at: string;
  version: number;
  is_self?: boolean;
  can_change_role?: boolean;
  can_remove?: boolean;
  disabled_change_role_reason?: string | null;
  disabled_remove_reason?: string | null;
}

export interface GroupMemberListResponse {
  group_id?: string;
  group_name?: string;
  items: GroupMemberItem[];
  total: number;
  is_system_admin?: boolean;
  my_role?: GroupMemberRole | string | null;
  can_invite?: boolean;
}

export interface GroupMemberRoleUpdateRequest {
  new_role: string;
  version: number;
}

export interface GroupMemberActionResponse {
  success: boolean;
  message: string;
  user_id: string;
  group_id: string;
  role?: string;
  version?: number;
}

