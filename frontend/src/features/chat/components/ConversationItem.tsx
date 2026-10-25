import React, { useState, useRef, useEffect } from "react";
import type { ChatConversation } from "../types/chat.types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface ConversationItemProps {
  conversation: ChatConversation;
  currentUserId?: string;
  isSelected: boolean;
  onSelect: (conv: ChatConversation) => void;
  onDelete: (conv: ChatConversation) => void;
  onLeaveGroup?: (conv: ChatConversation) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  currentUserId,
  isSelected,
  onSelect,
  onDelete,
  onLeaveGroup,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  // Tính toán thông tin hiển thị dựa theo loại hội thoại
  const isDirect = conversation.type === "direct";
  const isGroup = conversation.type === "group";
  const isDistrict = conversation.type === "district";

  // Với 1-1, tìm thành viên đối phương
  const otherMember = isDirect
    ? conversation.members?.find((m) => m.user_id !== currentUserId) || conversation.members?.[0]
    : null;

  const displayName = isDirect
    ? otherMember?.full_name || conversation.title || "Người dùng GreenSpot"
    : isGroup
    ? conversation.title || `Nhóm chat (${conversation.member_count} thành viên)`
    : conversation.title || `Chat Quận ${conversation.district || ""}`;

  const avatarUrl = isDirect
    ? (otherMember?.avatar_url || conversation.avatar_url)
    : conversation.avatar_url;

  const isOnline = isDirect
    ? Boolean(otherMember?.is_online ?? conversation.is_online)
    : false;

  // Định dạng thời gian tương đối
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins}p`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} ngày`;
      return new Date(isoString).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // Preview nội dung tin nhắn cuối cùng
  const renderLastMessagePreview = () => {
    const lastMsg = conversation.last_message;
    if (!lastMsg) {
      return isDistrict ? "Bắt đầu thảo luận với cư dân trong quận..." : "Bắt đầu cuộc trò chuyện mới";
    }

    const isMine = lastMsg.sender_id === currentUserId;
    const prefix = isMine ? "Bạn: " : isGroup && lastMsg.sender?.full_name ? `${lastMsg.sender.full_name.split(" ").pop()}: ` : "";

    if (lastMsg.media_url || lastMsg.media_type === "image") {
      return `${prefix}📷 [Hình ảnh]`;
    }
    return `${prefix}${lastMsg.content || ""}`;
  };

  const hasUnread = conversation.unread_count > 0;

  return (
    <div
      className={`conversation-item ${isSelected ? "active" : ""}`}
      onClick={() => onSelect(conversation)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect(conversation);
        }
      }}
    >
      {/* 1. Avatar & Chấm trạng thái Online */}
      <div className="avatar-wrap">
        {isDistrict ? (
          <div className="avatar-fallback district-badge" title={`Chat Quận ${conversation.district || ""}`}>
            🏙️
          </div>
        ) : avatarUrl ? (
          <img
            src={resolveMediaUrl(avatarUrl)}
            alt={displayName}
            className="avatar-img"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = parent.querySelector(".avatar-fallback") as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }
            }}
          />
        ) : (
          <div className="avatar-fallback">
            {displayName.charAt(0)}
          </div>
        )}

        {/* Fallback ẩn phòng khi ảnh tải lỗi */}
        {avatarUrl && (
          <div className="avatar-fallback" style={{ display: "none" }}>
            {displayName.charAt(0)}
          </div>
        )}

        {/* Chấm tròn xanh online (chỉ hiện cho chat 1-1) */}
        {isDirect && isOnline && <span className="online-dot" title="Đang hoạt động" />}

        {/* Icon nhóm nếu là group chat */}
        {isGroup && <span className="group-type-badge" title="Nhóm">👥</span>}
      </div>

      {/* 2. Tiêu đề, tin nhắn cuối, thời gian & badge chưa đọc */}
      <div className="conv-info">
        <div className="conv-header-row">
          <span className={`conv-name ${hasUnread ? "unread" : ""}`}>
            {displayName}
          </span>
          <span className={`conv-time ${hasUnread ? "unread" : ""}`}>
            {formatTime(conversation.last_message?.created_at || conversation.updated_at)}
          </span>
        </div>

        <div className="conv-preview-row">
          <span className={`last-msg-text ${hasUnread ? "unread" : ""}`}>
            {renderLastMessagePreview()}
          </span>

          {hasUnread && (
            <span className="unread-count-badge">
              {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
            </span>
          )}
        </div>
      </div>

      {/* 3. Nút 3 chấm hành động nhanh (Xóa / Rời nhóm) */}
      {!isDistrict && (
        <div
          className="item-quick-actions"
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn-dots"
            title="Tùy chọn đoạn chat"
            onClick={() => setShowMenu((prev) => !prev)}
          >
            ⋮
          </button>

          {showMenu && (
            <div className="actions-dropdown">
              {isGroup && onLeaveGroup && (
                <button
                  type="button"
                  className="dropdown-item danger"
                  onClick={() => {
                    setShowMenu(false);
                    onLeaveGroup(conversation);
                  }}
                >
                  🚪 Rời khỏi nhóm
                </button>
              )}
              <button
                type="button"
                className="dropdown-item danger"
                onClick={() => {
                  setShowMenu(false);
                  onDelete(conversation);
                }}
              >
                🗑️ Xóa đoạn chat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
