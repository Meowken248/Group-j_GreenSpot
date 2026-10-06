/**
 * Type Definitions for GreenSpot Role-Based Access Control (RBAC) System
 */

export type ScopeType = "CITY" | "DISTRICT";

export interface RoleItem {
  role_id: number;
  role_code: string;
  role_name: string;
  description?: string | null;
  is_system: boolean;
  scope: ScopeType;
  scope_display: string; // "Toàn thành phố" | "Quận"
  version: number;
  user_count: number;
  created_at?: string | null;
}

export interface RoleListResponse {
  roles: RoleItem[];
  total: number;
  can_create: boolean;
}

export interface CreateRolePayload {
  role_name: string;
  description?: string;
  scope: ScopeType;
}

export type AclActionType =
  | "ACCESS"
  | "VIEW"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "IMPORT"
  | "EXPORT";

export interface ModulePermissionInfo {
  code: string;
  name: string;
  actions: (AclActionType | string)[];
}

export interface PermissionMatrixResponse {
  modules: ModulePermissionInfo[];
  roles: RoleItem[];
  role_permissions: Record<string, string[]>; // { role_id_str: ["MODULE:ACTION", ...] }
}

export interface UpdateRolePermissionsPayload {
  permissions: string[];
  version: number;
}

export interface UpdateRolePermissionsResponse {
  success: boolean;
  message: string;
  role_id: number;
  new_version: number;
}

export interface ReassignAndDeletePayload {
  target_role_id: number;
}

export interface RbacApiError {
  error_code: string;
  message: string;
  user_count?: number;
}
