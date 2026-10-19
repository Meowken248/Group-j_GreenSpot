/**
 * Type definitions cho Chức năng 15: Nhắn tin 1-1, Chat nhóm và Chat quận thời gian thực
 */

export type ConversationType = "direct" | "group" | "district";

export type MessageStatus = "sending" | "sent" | "seen" | "error";

export type MessageType = "text" | "image";

export interface ChatUserSummary {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  is_online?: boolean;
  last_seen?: string | null;
  district?: string | null;
  role?: string | null;
}

export interface ChatMessage {
  message_id: string; // Server UUID hoặc temp_id khi đang gửi
  conversation_id: string;
  sender_id: string;
  sender?: ChatUserSummary;
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string;
  status?: MessageStatus;
  is_mine?: boolean;
  seen_by?: string[]; // Danh sách user_id đã xem
  temp_id?: string;
  is_system_message?: boolean;
}

export interface ChatConversation {
  conversation_id: string;
  type: ConversationType;
  title?: string | null;
  avatar_url?: string | null;
  district?: string | null;
  admin_user_id?: string | null; // Quản trị viên nhóm
  creator_id?: string | null;
  members: ChatUserSummary[];
  member_count: number;
  unread_count: number;
  last_message?: ChatMessage | null;
  created_at: string;
  updated_at: string;
  is_online?: boolean; // Dành cho chat 1-1
  other_user_id?: string | null; // ID của đối phương trong chat 1-1
  is_admin?: boolean; // Người dùng hiện tại có phải Quản trị nhóm không
}

export interface ConversationListResponse {
  items: ChatConversation[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface MessageListResponse {
  items: ChatMessage[];
  total?: number;
  has_more: boolean;
}

export interface CreateDirectConversationPayload {
  target_user_id: string;
}

export interface CreateGroupConversationPayload {
  title: string;
  member_user_ids: string[];
}

export interface SendMessagePayload {
  conversation_id: string;
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  temp_id?: string;
}

// ==========================================
// WEBSOCKET EVENTS
// ==========================================

export type WebSocketEventType =
  | "NEW_MESSAGE"
  | "TYPING_STATUS"
  | "USER_ONLINE_STATUS"
  | "MESSAGE_SEEN"
  | "ERROR";

export interface WsNewMessageEvent {
  type: "NEW_MESSAGE";
  data: ChatMessage;
}

export interface WsTypingEvent {
  type: "TYPING_STATUS";
  data: {
    conversation_id: string;
    user_id: string;
    full_name: string;
    is_typing: boolean;
  };
}

export interface WsUserOnlineEvent {
  type: "USER_ONLINE_STATUS";
  data: {
    user_id: string;
    is_online: boolean;
    last_seen?: string | null;
  };
}

export interface WsMessageSeenEvent {
  type: "MESSAGE_SEEN";
  data: {
    conversation_id: string;
    message_id: string;
    seen_by_user_id: string;
    seen_at: string;
  };
}

export interface WsErrorEvent {
  type: "ERROR";
  data: {
    code?: string;
    message: string;
  };
}

export type WsIncomingEvent =
  | WsNewMessageEvent
  | WsTypingEvent
  | WsUserOnlineEvent
  | WsMessageSeenEvent
  | WsErrorEvent;

export type SocketConnectionState =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";
