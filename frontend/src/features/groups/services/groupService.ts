/**
 * Service API cho Chức năng 16: Tạo nhóm theo quận, theo phường hoặc theo chủ đề
 */

import api from "../../../api/client";
import type {
  GroupItem,
  GroupListResponse,
  CreateGroupPayload,
  AdministrativeMetadata,
  GroupType,
} from "../types/group";

export const groupService = {
  /**
   * Lấy danh mục đơn vị hành chính và chủ đề môi trường
   */
  async getMetadata(): Promise<AdministrativeMetadata> {
    const res = await api.get<AdministrativeMetadata>("/api/v1/groups/metadata");
    return res.data;
  },

  /**
   * Lấy danh sách nhóm của tôi (tham gia hoặc quản trị)
   */
  async getMyGroups(): Promise<GroupListResponse> {
    const res = await api.get<GroupListResponse>("/api/v1/groups/my-groups");
    return res.data;
  },

  /**
   * Khám phá nhóm cộng đồng theo bộ lọc
   */
  async exploreGroups(params: {
    group_type?: GroupType;
    district?: string;
    ward?: string;
    theme_topic?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<GroupListResponse> {
    const res = await api.get<GroupListResponse>("/api/v1/groups/explore", { params });
    return res.data;
  },

  /**
   * Chi tiết nhóm cộng đồng
   */
  async getGroupDetail(groupId: string): Promise<GroupItem> {
    const res = await api.get<GroupItem>(`/api/v1/groups/${groupId}`);
    return res.data;
  },

  /**
   * Tải ảnh bìa nhóm (JPG/PNG, tối đa 5MB)
   */
  async uploadCover(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ url: string }>("/api/v1/groups/upload-cover", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  /**
   * Tạo nhóm mới
   */
  async createGroup(payload: CreateGroupPayload): Promise<GroupItem> {
    const res = await api.post<GroupItem>("/api/v1/groups", payload);
    return res.data;
  },

  /**
   * Mời bạn bè vào nhóm (Màn 3)
   */
  async inviteFriends(groupId: string, friendIds: string[]): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>(`/api/v1/groups/${groupId}/invite`, {
      friend_ids: friendIds,
    });
    return res.data;
  },

  /**
   * Tham gia nhóm
   */
  async joinGroup(groupId: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>(`/api/v1/groups/${groupId}/join`);
    return res.data;
  },

  /**
   * Rời khỏi nhóm
   */
  async leaveGroup(groupId: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>(`/api/v1/groups/${groupId}/leave`);
    return res.data;
  },

  /**
   * Giải tán nhóm (Chỉ Quản trị viên)
   */
  async disbandGroup(groupId: string, confirmationName: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>(`/api/v1/groups/${groupId}/disband`, {
      confirmation_name: confirmationName,
    });
    return res.data;
  },
};

