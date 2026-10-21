import api from "../../../api/client";
import type {
  RoleListResponse,
  RoleItem,
  CreateRolePayload,
  PermissionMatrixResponse,
  UpdateRolePermissionsPayload,
  UpdateRolePermissionsResponse,
  ReassignAndDeletePayload,
} from "../types/rbac.types";

export const rbacService = {
  /**
   * Màn 1: Lấy danh sách toàn bộ vai trò
   */
  async getRoles(): Promise<RoleListResponse> {
    const res = await api.get<RoleListResponse>("/api/v1/rbac/roles");
    return res.data;
  },

  /**
   * Màn 2: Thêm vai trò mới
   */
  async createRole(payload: CreateRolePayload): Promise<RoleItem> {
    const res = await api.post<RoleItem>("/api/v1/rbac/roles", payload);
    return res.data;
  },

  /**
   * Màn 3: Lấy ma trận phân quyền động (15 modules)
   */
  async getPermissionMatrix(): Promise<PermissionMatrixResponse> {
    const res = await api.get<PermissionMatrixResponse>("/api/v1/rbac/matrix");
    return res.data;
  },

  /**
   * Màn 3: Lưu ma trận phân quyền của vai trò (có OCC version control)
   */
  async updateRolePermissions(
    roleId: number,
    payload: UpdateRolePermissionsPayload
  ): Promise<UpdateRolePermissionsResponse> {
    const res = await api.put<UpdateRolePermissionsResponse>(
      `/api/v1/rbac/roles/${roleId}/permissions`,
      payload
    );
    return res.data;
  },

  /**
   * Màn 4: Xóa vai trò tùy chỉnh (khi user_count == 0)
   */
  async deleteRole(roleId: number): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(
      `/api/v1/rbac/roles/${roleId}`
    );
    return res.data;
  },

  /**
   * Màn 5: Chuyển giao toàn bộ người dùng và xóa vai trò
   */
  async reassignAndDeleteRole(
    roleId: number,
    payload: ReassignAndDeletePayload
  ): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>(
      `/api/v1/rbac/roles/${roleId}/reassign-and-delete`,
      payload
    );
    return res.data;
  },
};
