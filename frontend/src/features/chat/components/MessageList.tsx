import React, { useRef, useState, useLayoutEffect } from "react";
import type { ChatMessage, ConversationType } from "../types/chat.types";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  conversationId?: string;
  messages: ChatMessage[];
  currentUserId?: string;
  conversationType: ConversationType;
  hasMoreOlder: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  isTyping?: boolean;
  typingUserName?: string;
  onRetryMessage?: (msg: ChatMessage) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  conversationId,
  messages,
  currentUserId,
  conversationType,
  hasMoreOlder,
  isLoadingOlder,
  onLoadOlder,
  isTyping,
  typingUserName,
  onRetryMessage,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const prevScrollHeightRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);
  const isNearBottomRef = useRef<boolean>(true);

  // Khi đổi cuộc trò chuyện, reset trạng thái cuộn ban đầu để ép cuộn xuống đáy
  useLayoutEffect(() => {
    isInitialLoadRef.current = true;
    isNearBottomRef.current = true;
  }, [conversationId]);

  // Kiểm tra vị trí cuộn có đang ở đáy hay không
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom < 100;

    // Tải thêm tin nhắn cũ khi cuộn lên gần đỉnh (<= 50px)
    if (el.scrollTop <= 50 && hasMoreOlder && !isLoadingOlder) {
      prevScrollHeightRef.current = el.scrollHeight;
      onLoadOlder();
    }
  };

  // Giữ vị trí cuộn ổn định khi tải thêm tin nhắn cũ phía trên
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (prevScrollHeightRef.current > 0) {
      const addedHeight = el.scrollHeight - prevScrollHeightRef.current;
      el.scrollTop += addedHeight;
      prevScrollHeightRef.current = 0;
    } else if (isInitialLoadRef.current || isNearBottomRef.current) {
      // Cuộn xuống đáy mượt mà
      el.scrollTop = el.scrollHeight;
      if (messages.length > 0) {
        isInitialLoadRef.current = false;
      }
    }
  }, [messages]);

  return (
    <div
      className="messages-stream-pane"
      ref={scrollContainerRef}
      onScroll={handleScroll}
    >
      {/* Nút tải thêm tin nhắn cũ nếu có */}
      {hasMoreOlder && (
        <button
          type="button"
          className="btn-load-more-messages"
          onClick={() => {
            if (scrollContainerRef.current) {
              prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
            }
            onLoadOlder();
          }}
          disabled={isLoadingOlder}
        >
          {isLoadingOlder ? "Đang tải 30 tin cũ hơn..." : "▲ Tải tin nhắn cũ hơn"}
        </button>
      )}

      {/* Danh sách tin nhắn */}
      {messages.map((msg, index) => {
        const isMine = msg.sender_id === currentUserId;
        const nextMsg = messages[index + 1];
        const prevMsg = messages[index - 1];

        // Ẩn avatar nếu tin nhắn kế tiếp cũng từ cùng một người
        const showAvatar = !nextMsg || nextMsg.sender_id !== msg.sender_id || Boolean(nextMsg.is_system_message);

        // Hiện tên người gửi nếu là tin nhắn đầu tiên của cụm trong nhóm/quận
        const showSenderName =
          conversationType !== "direct" &&
          (!prevMsg || prevMsg.sender_id !== msg.sender_id || Boolean(prevMsg.is_system_message));

        return (
          <MessageItem
            key={msg.message_id || msg.temp_id || index}
            message={msg}
            isMine={isMine}
            showSenderName={showSenderName}
            showAvatar={showAvatar}
            onRetry={onRetryMessage}
            onImageClick={(url) => setSelectedImageUrl(url)}
          />
        );
      })}

      {/* Typing indicator phía dưới */}
      {isTyping && (
        <div className="message-row other" style={{ animation: "fadeIn 0.2s ease" }}>
          <div style={{ width: 28, flexShrink: 0 }} />
          <div className="bubble-wrap">
            <span className="sender-name-label">
              {typingUserName || "Đối phương"} đang soạn tin...
            </span>
            <div className="message-bubble" style={{ display: "flex", gap: 4, padding: "10px 14px" }}>
              <span className="dot" style={{ animation: "pulse 1s infinite" }}>●</span>
              <span className="dot" style={{ animation: "pulse 1s infinite 0.2s" }}>●</span>
              <span className="dot" style={{ animation: "pulse 1s infinite 0.4s" }}>●</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem ảnh phóng to */}
      {selectedImageUrl && (
        <div
          className="chat-modal-backdrop"
          onClick={() => setSelectedImageUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImageUrl}
              alt="Hình ảnh lớn"
              style={{
                maxWidth: "100%",
                maxHeight: "88vh",
                borderRadius: 12,
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                objectFit: "contain",
              }}
            />
            <button
              type="button"
              onClick={() => setSelectedImageUrl(null)}
              style={{
                position: "absolute",
                top: -14,
                right: -14,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                background: "#ef4444",
                color: "#fff",
                fontWeight: "bold",
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
              title="Đóng"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
