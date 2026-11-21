export type UserRoleScope = 'CITY' | 'DISTRICT';
export type UserStatus = 'ACTIVE' | 'BLOCKED';

export interface RoleOption {
  role_id: number;
  role_code: string;
  role_name: string;
  is_system: boolean;
  scope: string;
  scope_display: string;
}

export interface UserItem {
  user_id: string;
  email: string;
  phone_number: string | null;
  full_name: string;
  avatar_url?: string | null;
  role_id: number;
  role_code: string;
  role_name: string;
  role_is_system: boolean;
  role_scope: string;
  role_scope_display: string;
  status: string;
  reputation_score?: number;
  created_at: string | null;
  last_active_at: string | null;
}

export interface UserListSummary {
  total_users: number;
  active_users: number;
  blocked_users: number;
  roles_count: number;
}

export interface UserListResponse {
  users: UserItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  stats: UserListSummary;
}

export interface CreateUserPayload {
  full_name: string;
  email: string;
  phone_number?: string;
  password: string;
  role_id: number;
  status?: string;
}

export interface ChangeRolePayload {
  role_id: number;
}

export interface ChangeStatusPayload {
  status: 'ACTIVE' | 'BLOCKED';
}

export interface ResetPasswordPayload {
  new_password: string;
}

export interface UserFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  role_id?: number | string;
  status?: string;
}
