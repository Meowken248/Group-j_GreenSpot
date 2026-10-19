import React, { useState } from "react";
import type {
  ChatConversation,
  ChatMessage,
  ChatUserSummary,
} from "../types/chat.types";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatComposer } from "./ChatComposer";
import { DistrictMembersSidebar } from "./DistrictMembersSidebar";

interface ChatViewProps {
  className?: string;
  conversation: ChatConversation | null;
  currentUserId?: string;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
  onLoadOlder: () => void;
  onSendMessage: (content: string, imageFile?: File) => Promise<boolean>;
  isSendingMessage: boolean;
  onRetryMessage?: (msg: ChatMessage) => void;
  onBackMobile: () => void;
  isTyping?: boolean;
  typingUserName?: string;
  onTyping: (isTyping: boolean) => void;
  districtMembers: ChatUserSummary[];
  isLoadingDistrictMembers: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  className,
  conversation,
  currentUserId,
  messages,
  isLoadingMessages,
  isLoadingOlder,
  hasMoreOlder,
  onLoadOlder,
  onSendMessage,
  isSendingMessage,
  onRetryMessage,
  onBackMobile,
  isTyping,
  typingUserName,
  onTyping,
  districtMembers,
  isLoadingDistrictMembers,
}) => {
  const [showDistrictSidebar, setShowDistrictSidebar] = useState(false);

  // Khi chưa chọn cuộc trò chuyện nào (Placeholder thân thiện)
  if (!conversation) {
    return (
      <main className={`chat-main-area ${className || ""}`.trim()}>
        <div className="chat-unselected-placeholder">
          <span className="placeholder-leaf">💬</span>
          <h3>Tin nhắn GreenSpot</h3>
          <p>
            Chọn một cuộc trò chuyện từ danh sách bên trái hoặc tạo nhóm mới để kết nối và chia sẻ giải pháp sống xanh cùng cộng đồng.
          </p>
        </div>
      </main>
    );
  }

  const isDistrict = conversation.type === "district";

  return (
    <main className={`chat-main-area ${className || ""}`.trim()}>
      {/* 1. Header chi tiết cuộc trò chuyện */}
      <ChatHeader
        conversation={conversation}
        currentUserId={currentUserId}
        isTyping={isTyping}
        typingUserName={typingUserName}
        onBackMobile={onBackMobile}
        showDistrictSidebar={showDistrictSidebar}
        onToggleDistrictSidebar={() => setShowDistrictSidebar((prev) => !prev)}
        districtOnlineCount={districtMembers.length}
      />

      {/* 2. Thân tin nhắn & Sidebar thành viên Quận */}
      <div className="chat-view-body">
        {isLoadingMessages ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            Đang tải tin nhắn...
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            conversationType={conversation.type}
            hasMoreOlder={hasMoreOlder}
            isLoadingOlder={isLoadingOlder}
            onLoadOlder={onLoadOlder}
            isTyping={isTyping}
            typingUserName={typingUserName}
            onRetryMessage={onRetryMessage}
          />
        )}

        {/* Sidebar danh sách thành viên trực tuyến cho Chat Quận */}
        {isDistrict && showDistrictSidebar && (
          <DistrictMembersSidebar
            district={conversation.district || ""}
            members={districtMembers}
            isLoading={isLoadingDistrictMembers}
            onClose={() => setShowDistrictSidebar(false)}
          />
        )}
      </div>

      {/* 3. Khung Composer nhập và gửi tin nhắn */}
      <ChatComposer
        onSendMessage={onSendMessage}
        isSending={isSendingMessage}
        isDistrict={isDistrict}
        onTyping={onTyping}
        disabled={isLoadingMessages}
      />
    </main>
  );
};
