import api from '../../../api/client';
import type {
  RoleOption,
  UserListResponse,
  UserFilterParams,
  CreateUserPayload,
  ChangeRolePayload,
  ChangeStatusPayload,
  ResetPasswordPayload,
  UserItem,
} from '../types/userManagement.types';

export const userManagementService = {
  /**
   * Lấy danh sách tùy chọn vai trò cho dropdown (Hệ thống + Tùy chỉnh)
   */
  async getRoleOptions(): Promise<RoleOption[]> {
    const response = await api.get('/api/v1/users/roles-options');
    return response.data;
  },

  /**
   * Lấy danh sách người dùng kèm phân trang, tìm kiếm, lọc theo vai trò và trạng thái
   */
  async getUsers(params: UserFilterParams): Promise<UserListResponse> {
    const cleanParams: Record<string, any> = {
      page: params.page || 1,
      limit: params.limit || 10,
    };
    if (params.search && params.search.trim()) {
      cleanParams.search = params.search.trim();
    }
    if (params.role_id && params.role_id !== 'ALL') {
      cleanParams.role_id = params.role_id;
    }
    if (params.status && params.status !== 'ALL') {
      cleanParams.status = params.status;
    }

    const response = await api.get('/api/v1/users', { params: cleanParams });
    return response.data;
  },

  /**
   * Admin tạo tài khoản người dùng mới cho các quyền khác
   */
  async createUser(payload: CreateUserPayload): Promise<UserItem> {
    const response = await api.post('/api/v1/users', payload);
    return response.data;
  },

  /**
   * Admin thay đổi vai trò của người dùng
   */
  async changeUserRole(userId: string, payload: ChangeRolePayload): Promise<{ message: string; user: UserItem }> {
    const response = await api.put(`/api/v1/users/${userId}/role`, payload);
    return response.data;
  },

  /**
   * Admin khóa hoặc mở khóa tài khoản người dùng
   */
  async changeUserStatus(userId: string, payload: ChangeStatusPayload): Promise<{ message: string; user: UserItem }> {
    const response = await api.put(`/api/v1/users/${userId}/status`, payload);
    return response.data;
  },

  /**
   * Admin đặt lại mật khẩu mới cho người dùng
   */
  async resetUserPassword(userId: string, payload: ResetPasswordPayload): Promise<{ message: string }> {
    const response = await api.post(`/api/v1/users/${userId}/reset-password`, payload);
    return response.data;
  },

  /**
   * Admin xóa tài khoản người dùng
   */
  async deleteUser(userId: string): Promise<{ message: string; user_id: string }> {
    const response = await api.delete(`/api/v1/users/${userId}`);
    return response.data;
  },
};
