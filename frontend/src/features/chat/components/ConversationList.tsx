import React, { useRef, useEffect } from "react";
import type {
  ConversationType,
  ChatConversation,
  SocketConnectionState,
} from "../types/chat.types";
import { ConversationItem } from "./ConversationItem";

interface ConversationListProps {
  className?: string;
  onBackToHome?: () => void;
  conversations: ChatConversation[];
  activeTab: ConversationType;
  onTabChange: (tab: ConversationType) => void;
  selectedConversationId?: string | null;
  onSelectConversation: (conv: ChatConversation) => void;
  onOpenNewChat?: () => void;
  onOpenCreateGroup: () => void;
  onDeleteConversation: (conv: ChatConversation) => void;
  onLeaveGroup: (conv: ChatConversation) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  connectionState: SocketConnectionState;
  onReconnectSocket: () => void;
  currentUserId?: string;
  unreadCountsByTab?: Record<ConversationType, number>;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  className,
  onBackToHome,
  conversations,
  activeTab,
  onTabChange,
  selectedConversationId,
  onSelectConversation,
  onOpenNewChat,
  onOpenCreateGroup,
  onDeleteConversation,
  onLeaveGroup,
  searchQuery,
  onSearchChange,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  connectionState,
  onReconnectSocket,
  currentUserId,
  unreadCountsByTab = { direct: 0, group: 0, district: 0 },
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lắng nghe sự kiện cuộn xuống đáy để tải thêm hội thoại (phân trang 20 items)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
        if (hasMore && !isLoadingMore && !isLoading) {
          onLoadMore();
        }
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoadingMore, isLoading, onLoadMore]);

  const isDisconnected = connectionState === "disconnected" || connectionState === "error";
  const isConnecting = connectionState === "connecting";

  return (
    <aside className={`chat-sidebar-left ${className || ""}`.trim()}>
      {/* 1. Header: Tiêu đề "Đoạn chat" + Nút "➕ Tạo chat nhóm" */}
      <div className="sidebar-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onBackToHome && (
            <button
              type="button"
              className="btn-back-home"
              onClick={onBackToHome}
              title="Quay lại Bản đồ"
              style={{
                background: "transparent",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "8px",
                color: "inherit",
              }}
            >
              ←
            </button>
          )}
          <h2 className="sidebar-title">Đoạn chat</h2>
        </div>
        <div className="sidebar-header-actions">
          {onOpenNewChat && (
            <button
              type="button"
              className="btn-header-action btn-new-direct-chat"
              onClick={onOpenNewChat}
              title="Soạn tin nhắn mới với bạn bè"
            >
              <span>💬</span>
              <span>Tin mới</span>
            </button>
          )}
          <button
            type="button"
            className="btn-header-action btn-create-group"
            onClick={onOpenCreateGroup}
            title="Tạo cuộc trò chuyện nhóm mới"
          >
            <span>➕</span>
            <span>Tạo nhóm</span>
          </button>
        </div>
      </div>

      {/* 2. Thanh thông báo màu vàng khi mất kết nối WebSocket */}
      {(isDisconnected || isConnecting) && (
        <div className="socket-warning-banner" role="alert">
          <div className="warning-text">
            <span>⚠️</span>
            <span>
              {isConnecting
                ? "Đang kết nối lại tới máy chủ trò chuyện..."
                : "Mất kết nối máy chủ trò chuyện"}
            </span>
          </div>
          {isDisconnected && (
            <button
              type="button"
              className="btn-reconnect"
              onClick={onReconnectSocket}
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {/* 3. Ô tìm kiếm hội thoại */}
      <div className="sidebar-search-box">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm trên đoạn chat..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => onSearchChange("")}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. 3 Tabs phân loại: 1-1 / Nhóm / Quận */}
      <nav className="sidebar-nav-tabs" aria-label="Bộ lọc loại cuộc trò chuyện">
        <button
          type="button"
          className={`tab-btn ${activeTab === "direct" ? "active" : ""}`}
          onClick={() => onTabChange("direct")}
        >
          <span>Trực tiếp</span>
          {unreadCountsByTab.direct > 0 && (
            <span className="tab-badge">{unreadCountsByTab.direct}</span>
          )}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "group" ? "active" : ""}`}
          onClick={() => onTabChange("group")}
        >
          <span>Nhóm</span>
          {unreadCountsByTab.group > 0 && (
            <span className="tab-badge">{unreadCountsByTab.group}</span>
          )}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "district" ? "active" : ""}`}
          onClick={() => onTabChange("district")}
        >
          <span>Quận</span>
          {unreadCountsByTab.district > 0 && (
            <span className="tab-badge">{unreadCountsByTab.district}</span>
          )}
        </button>
      </nav>

      {/* 5. Danh sách hội thoại cuộn vô tận (20 items/trang) */}
      <div className="conversations-scroll-list" ref={scrollRef}>
        {isLoading ? (
          // Hiển thị khung chờ Skeleton
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="conversation-skeleton-item">
              <div className="skeleton-avatar" />
              <div className="skeleton-lines">
                <div className="skeleton-line title" />
                <div className="skeleton-line sub" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          // Khối rỗng
          <div className="conversations-empty">
            <span className="empty-icon">🌱</span>
            <h4>Chưa có đoạn chat nào</h4>
            <p>
              {searchQuery
                ? `Không tìm thấy kết quả phù hợp cho "${searchQuery}"`
                : activeTab === "direct"
                ? "Kết nối và nhắn tin với bạn bè xanh trên GreenSpot!"
                : activeTab === "group"
                ? "Bấm '+ Tạo nhóm' ở trên để kết nối bạn bè cùng sở thích sinh thái."
                : "Tham gia trao đổi cùng cư dân sinh thái tại quận của bạn."}
            </p>
            {activeTab === "direct" && !searchQuery && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "12px" }}>
                {onOpenNewChat && (
                  <button
                    type="button"
                    className="btn-start-chat-now"
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.875rem",
                    }}
                    onClick={onOpenNewChat}
                  >
                    <span>💬</span>
                    <span>Bắt đầu nhắn tin</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-find-friends"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                    border: "1px solid #10b981",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.875rem",
                  }}
                  onClick={() => {
                    window.location.hash = "#friends";
                  }}
                >
                  <span>👥</span>
                  <span>Tìm bạn bè</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.conversation_id}
                conversation={conv}
                currentUserId={currentUserId}
                isSelected={selectedConversationId === conv.conversation_id}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
                onLeaveGroup={onLeaveGroup}
              />
            ))}

            {isLoadingMore && (
              <div className="conversation-skeleton-item">
                <div className="skeleton-avatar" />
                <div className="skeleton-lines">
                  <div className="skeleton-line title" />
                  <div className="skeleton-line sub" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
