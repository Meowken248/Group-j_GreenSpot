import React from "react";
import type { ChatMessage } from "../types/chat.types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface MessageItemProps {
  message: ChatMessage;
  isMine: boolean;
  showSenderName: boolean;
  showAvatar: boolean;
  onRetry?: (message: ChatMessage) => void;
  onImageClick?: (imageUrl: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isMine,
  showSenderName,
  showAvatar,
  onRetry,
  onImageClick,
}) => {
  // 1. Tin nhắn hệ thống (System message)
  if (message.is_system_message) {
    return (
      <div className="message-row system">
        <div className="system-bubble">{message.content}</div>
      </div>
    );
  }

  // Định dạng giờ tin nhắn
  const formatMsgTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const isError = message.status === "error";
  const isSending = message.status === "sending";
  const isSeen = message.status === "seen" || (message.seen_by && message.seen_by.length > 0);

  const senderName = message.sender?.full_name || "Thành viên";
  const senderAvatar = message.sender?.avatar_url;

  return (
    <div
      className={`message-row ${isMine ? "mine" : "other"} ${isError ? "error" : ""}`}
    >
      {/* Avatar người gửi (chỉ hiện bên trái khi không phải tin nhắn của tôi) */}
      {!isMine && showAvatar && (
        <img
          src={
            senderAvatar
              ? resolveMediaUrl(senderAvatar)
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff`
          }
          alt={senderName}
          className="sender-avatar"
          title={senderName}
          loading="lazy"
        />
      )}

      {/* Placeholder khoảng cách nếu ẩn avatar trong cùng một cụm tin nhắn */}
      {!isMine && !showAvatar && <div style={{ width: 28, flexShrink: 0 }} />}

      <div className="bubble-wrap">
        {/* Tên người gửi trong chat nhóm hoặc chat quận */}
        {!isMine && showSenderName && (
          <span className="sender-name-label">{senderName}</span>
        )}

        {/* Nội dung tin nhắn */}
        <div className="message-bubble">
          {message.media_url && (
            <img
              src={resolveMediaUrl(message.media_url)}
              alt="Hình ảnh đính kèm"
              className="msg-image"
              loading="lazy"
              onClick={() => onImageClick?.(resolveMediaUrl(message.media_url!))}
            />
          )}

          {message.content && (
            <span className="msg-text">{message.content}</span>
          )}
        </div>

        {/* Dòng trạng thái (Giờ gửi, Đã gửi, Đã xem, Gửi lại nếu lỗi) */}
        <div className="msg-status-line">
          <span>{formatMsgTime(message.created_at)}</span>

          {isMine && (
            <>
              {isSending && <span>• Đang gửi...</span>}
              {!isSending && !isError && isSeen && (
                <span className="status-seen">• Đã xem</span>
              )}
              {!isSending && !isError && !isSeen && (
                <span>• Đã gửi</span>
              )}
              {isError && (
                <>
                  <span style={{ color: "#ef4444" }}>• Lỗi gửi</span>
                  {onRetry && (
                    <button
                      type="button"
                      className="btn-retry-msg"
                      onClick={() => onRetry(message)}
                    >
                      Gửi lại
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
