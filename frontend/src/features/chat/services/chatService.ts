/**
 * Service API Client cho Chức năng 15: Nhắn tin 1-1, Chat nhóm và Chat quận
 */

import api from "../../../api/client";
import type {
  ConversationType,
  ChatConversation,
  ConversationListResponse,
  ChatMessage,
  MessageListResponse,
  SendMessagePayload,
  ChatUserSummary,
} from "../types/chat.types";
import type { FriendItem } from "../../friends/types";

/**
 * Chuẩn hóa đối tượng Conversation từ server về schema frontend
 */
export function mapConversationItem(item: any): ChatConversation {
  const otherUserId = item.other_user_id ? String(item.other_user_id) : null;
  const members =
    item.members && item.members.length > 0
      ? item.members
      : otherUserId
      ? [
          {
            user_id: otherUserId,
            full_name: item.title || "Người dùng",
            avatar_url: item.avatar_url || null,
            is_online: Boolean(item.is_online),
          },
        ]
      : [];

  return {
    conversation_id: String(item.conversation_id),
    type: (item.type || "direct").toLowerCase() as ConversationType,
    title: item.title,
    avatar_url: item.avatar_url || null,
    district: item.district_name || item.district || null,
    admin_user_id: item.admin_user_id || null,
    creator_id: item.creator_id || null,
    other_user_id: otherUserId,
    members,
    member_count:
      item.members_count ??
      item.member_count ??
      (members.length > 0 ? members.length : 1),
    unread_count: item.unread_count ?? 0,
    is_admin: Boolean(item.is_admin),
    is_online: Boolean(item.is_online),
    last_message: item.last_message
      ? {
          message_id: String(item.last_message.message_id),
          conversation_id: String(item.conversation_id),
          sender_id: String(item.last_message.sender_id),
          sender: {
            user_id: String(item.last_message.sender_id),
            full_name: item.last_message.sender_name || "",
          },
          content: item.last_message.content || "",
          media_url: item.last_message.media_url || null,
          created_at: item.last_message.created_at,
        }
      : null,
    created_at: item.created_at,
    updated_at: item.last_message?.created_at || item.created_at,
  };
}

/**
 * Chuẩn hóa đối tượng Message từ server về schema frontend
 */
export function mapMessageItem(item: any): ChatMessage {
  const senderId = item.sender?.user_id
    ? String(item.sender.user_id)
    : String(item.sender_id || "");

  return {
    message_id: String(item.message_id),
    conversation_id: String(item.conversation_id),
    sender_id: senderId,
    sender: item.sender
      ? {
          user_id: senderId,
          full_name: item.sender.full_name || "",
          avatar_url: item.sender.avatar_url || null,
          role: item.sender.role || null,
        }
      : undefined,
    content: item.content || "",
    media_url: item.media_url || null,
    media_type: item.media_type || (item.media_url ? "image" : "text"),
    created_at: item.created_at,
    status: (item.status ? String(item.status).toLowerCase() : "sent") as any,
    is_system_message: Boolean(item.is_system_message),
    temp_id: item.temp_id,
  };
}

export const chatService = {
  /**
   * Lấy tổng số tin nhắn chưa đọc của người dùng trong tất cả hội thoại (phục vụ Navbar & Floating Badge)
   */
  async getTotalUnreadCount(): Promise<number> {
    try {
      const res = await api.get("/api/v1/chat/unread-count");
      return Number(res.data?.total_unread) || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Lấy danh sách hội thoại theo tab (direct | group | district) có phân trang
   * Backend nhận query param: ?tab=direct | group | district
   */
  async getConversations(
    tab: ConversationType,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<ConversationListResponse> {
    const params: Record<string, any> = {
      tab: tab.toLowerCase(),
      page,
      limit,
    };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const res = await api.get<any>("/api/v1/chat/conversations", { params });
    const data = res.data;

    return {
      items: (data.items || []).map(mapConversationItem),
      total: data.total ?? (data.items ? data.items.length : 0),
      page: data.page ?? page,
      limit: data.limit ?? limit,
      has_more: Boolean(data.has_more),
    };
  },

  /**
   * Lấy chi tiết một cuộc trò chuyện
   */
  async getConversationDetail(
    conversationId: string
  ): Promise<ChatConversation> {
    const res = await api.get<any>(
      `/api/v1/chat/conversations/${conversationId}`
    );
    return mapConversationItem(res.data);
  },

  /**
   * Lấy lịch sử tin nhắn của một hội thoại (cuộn ngược tải 30 tin)
   */
  async getMessages(
    conversationId: string,
    beforeMessageId?: string,
    limit: number = 30
  ): Promise<MessageListResponse> {
    const params: Record<string, any> = { limit };
    if (beforeMessageId) {
      params.before_message_id = beforeMessageId;
    }
    const res = await api.get<any>(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      { params }
    );
    const data = res.data;

    return {
      items: (data.items || []).map(mapMessageItem),
      total: data.total,
      has_more: Boolean(data.has_more),
    };
  },

  /**
   * Khởi tạo hoặc lấy hội thoại 1-1 với một người dùng khác
   */
  async createDirectConversation(
    targetUserId: string
  ): Promise<ChatConversation> {
    const res = await api.post<any>(
      "/api/v1/chat/conversations/direct",
      { target_user_id: targetUserId }
    );
    return mapConversationItem(res.data);
  },

  /**
   * Tạo cuộc trò chuyện nhóm mới (2 đến 50 bạn bè)
   */
  async createGroupConversation(
    title: string,
    memberUserIds: string[]
  ): Promise<ChatConversation> {
    const res = await api.post<any>(
      "/api/v1/chat/conversations/group",
      {
        title: title.trim(),
        member_user_ids: memberUserIds,
      }
    );
    return mapConversationItem(res.data);
  },

  /**
   * Gửi tin nhắn qua HTTP (dùng làm fallback khi WebSocket tạm thời gián đoạn)
   */
  async sendMessageHttp(payload: SendMessagePayload): Promise<ChatMessage> {
    const res = await api.post<any>(
      `/api/v1/chat/conversations/${payload.conversation_id}/messages`,
      {
        content: payload.content,
        media_url: payload.media_url || null,
        temp_id: payload.temp_id,
      }
    );
    return mapMessageItem(res.data);
  },

  /**
   * Tải ảnh đính kèm tin nhắn (JPG, PNG dung lượng <= 5MB qua /api/v1/posts/media)
   */
  async uploadChatImage(file: File): Promise<{ url: string }> {
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Chỉ hỗ trợ tệp hình ảnh định dạng JPG hoặc PNG");
    }

    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error("Dung lượng hình ảnh không được vượt quá 5MB");
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post<{ url: string }>("/api/v1/posts/media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  /**
   * Đánh dấu đã xem tin nhắn trong hội thoại (POST /conversations/{id}/read)
   */
  async markAsSeen(conversationId: string, _messageId?: string): Promise<void> {
    await api.post(`/api/v1/chat/conversations/${conversationId}/read`);
  },

  /**
   * Rời khỏi nhóm chat (POST /conversations/{id}/leave)
   */
  async leaveGroup(conversationId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>(
      `/api/v1/chat/conversations/${conversationId}/leave`
    );
    return res.data;
  },

  /**
   * Chuyển quyền quản trị viên và rời nhóm (dành cho Quản trị viên duy nhất)
   * 1. POST /conversations/{id}/transfer-admin
   * 2. POST /conversations/{id}/leave
   */
  async transferAdminAndLeave(
    conversationId: string,
    newAdminUserId: string
  ): Promise<{ success: boolean; message: string }> {
    // 1. Chuyển quyền
    await api.post(
      `/api/v1/chat/conversations/${conversationId}/transfer-admin`,
      { new_admin_user_id: newAdminUserId }
    );
    // 2. Rời nhóm
    const res = await api.post<{ success: boolean; message: string }>(
      `/api/v1/chat/conversations/${conversationId}/leave`
    );
    return res.data;
  },

  /**
   * Xóa trò chuyện 1-1 (POST /conversations/{id}/clear)
   * Chỉ xóa lịch sử phía người dùng hiện tại
   */
  async deleteConversation(
    conversationId: string
  ): Promise<{ success: boolean; message?: string }> {
    const res = await api.post<{ success: boolean; message?: string }>(
      `/api/v1/chat/conversations/${conversationId}/clear`
    );
    return res.data;
  },

  /**
   * Lấy danh sách thành viên trực tuyến của cuộc trò chuyện (Chat Quận / Nhóm)
   * Endpoint backend: GET /api/v1/chat/conversations/{id}/online-members
   */
  async getDistrictMembers(conversationId: string): Promise<ChatUserSummary[]> {
    const res = await api.get<ChatUserSummary[]>(
      `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/online-members`
    );
    return res.data;
  },

  /**
   * Lấy tất cả thành viên trong nhóm trò chuyện (phục vụ chọn người kế nhiệm khi rời nhóm)
   * Endpoint backend: GET /api/v1/chat/conversations/{id}/members
   */
  async getConversationMembers(conversationId: string): Promise<ChatUserSummary[]> {
    const res = await api.get<ChatUserSummary[]>(
      `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/members`
    );
    return res.data;
  },

  /**
   * Lấy danh sách bạn bè để chọn khi tạo chat nhóm (tái sử dụng từ /api/v1/friends/list)
   */
  async getFriendsForGroup(searchQuery?: string): Promise<FriendItem[]> {
    const res = await api.get<FriendItem[]>("/api/v1/friends/list", {
      params: searchQuery ? { query: searchQuery } : {},
    });
    return res.data;
  },
};
