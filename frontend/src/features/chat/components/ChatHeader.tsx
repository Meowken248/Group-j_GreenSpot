import React from "react";
import type { ChatConversation } from "../types/chat.types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface ChatHeaderProps {
  conversation: ChatConversation;
  currentUserId?: string;
  isTyping?: boolean;
  typingUserName?: string;
  onBackMobile: () => void;
  showDistrictSidebar: boolean;
  onToggleDistrictSidebar: () => void;
  districtOnlineCount?: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  currentUserId,
  isTyping,
  typingUserName,
  onBackMobile,
  showDistrictSidebar,
  onToggleDistrictSidebar,
  districtOnlineCount = 0,
}) => {
  const isDirect = conversation.type === "direct";
  const isGroup = conversation.type === "group";
  const isDistrict = conversation.type === "district";

  const otherMember = isDirect
    ? conversation.members?.find((m) => m.user_id !== currentUserId) || conversation.members?.[0]
    : null;

  const displayName = isDirect
    ? otherMember?.full_name || conversation.title || "Người dùng GreenSpot"
    : isGroup
    ? conversation.title || `Nhóm trò chuyện (${conversation.member_count} thành viên)`
    : conversation.title || `Kênh Chat Quận ${conversation.district || ""}`;

  const avatarUrl = isDirect
    ? (otherMember?.avatar_url || conversation.avatar_url)
    : conversation.avatar_url;
  const isOnline = isDirect ? Boolean(otherMember?.is_online ?? conversation.is_online) : false;

  // Render trạng thái phụ (Status line)
  const renderStatus = () => {
    if (isTyping) {
      return (
        <span className="header-substatus typing">
          ✍️ {typingUserName ? `${typingUserName} đang nhập...` : "Đang soạn tin nhắn..."}
        </span>
      );
    }

    if (isDirect) {
      return isOnline ? (
        <span className="header-substatus online">● Đang hoạt động</span>
      ) : (
        <span className="header-substatus">Ngoại tuyến</span>
      );
    }

    if (isGroup) {
      return (
        <span className="header-substatus">
          {conversation.member_count} thành viên
        </span>
      );
    }

    if (isDistrict) {
      return (
        <span className="header-substatus">
          Kênh cộng đồng • Quận {conversation.district || ""}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="chat-view-header">
      <div className="header-left">
        {/* Nút quay lại trên Mobile */}
        <button
          type="button"
          className="btn-back-mobile"
          onClick={onBackMobile}
          title="Quay lại danh sách đoạn chat"
          aria-label="Quay lại"
        >
          ←
        </button>

        {/* Avatar */}
        <div
          className="header-avatar-wrap"
          style={{ cursor: isDirect && otherMember?.user_id ? "pointer" : "default" }}
          onClick={() => {
            if (isDirect && otherMember?.user_id) {
              window.location.hash = `#profile?id=${otherMember.user_id}`;
            }
          }}
          title={isDirect && otherMember?.user_id ? `Xem trang cá nhân của ${displayName}` : undefined}
        >
          {isDistrict ? (
            <div className="avatar-initial district-icon" title={`Quận ${conversation.district || ""}`}>
              🏙️
            </div>
          ) : avatarUrl ? (
            <img
              src={resolveMediaUrl(avatarUrl)}
              alt={displayName}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = parent.querySelector(".avatar-initial") as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }
              }}
            />
          ) : (
            <div className="avatar-initial">
              {displayName.charAt(0)}
            </div>
          )}

          {avatarUrl && (
            <div className="avatar-initial" style={{ display: "none" }}>
              {displayName.charAt(0)}
            </div>
          )}

          {isDirect && isOnline && <span className="header-online-dot" />}
        </div>

        {/* Thông tin tiêu đề & trạng thái */}
        <div
          className="header-meta"
          style={{ cursor: isDirect && otherMember?.user_id ? "pointer" : "default" }}
          onClick={() => {
            if (isDirect && otherMember?.user_id) {
              window.location.hash = `#profile?id=${otherMember.user_id}`;
            }
          }}
          title={isDirect && otherMember?.user_id ? `Xem trang cá nhân của ${displayName}` : undefined}
        >
          <span className="header-title">{displayName}</span>
          {renderStatus()}
        </div>
      </div>

      <div className="header-actions">
        {/* Nút bật/tắt danh sách thành viên trực tuyến của Chat Quận */}
        {isDistrict && (
          <button
            type="button"
            className={`btn-header-action ${showDistrictSidebar ? "active" : ""}`}
            onClick={onToggleDistrictSidebar}
            title="Thành viên trực tuyến trong quận"
          >
            <span>🟢 {districtOnlineCount > 0 ? `${districtOnlineCount} Online` : "Thành viên"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
