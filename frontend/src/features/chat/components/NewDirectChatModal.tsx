import React, { useState, useEffect } from "react";
import { chatService } from "../services/chatService";
import type { FriendItem } from "../../friends/types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface NewDirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFriend: (friendUserId: string) => void;
}

export const NewDirectChatModal: React.FC<NewDirectChatModalProps> = ({
  isOpen,
  onClose,
  onSelectFriend,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Tải danh sách bạn bè khi mở modal hoặc thay đổi từ khóa tìm kiếm
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        const list = await chatService.getFriendsForGroup(searchQuery);
        if (isMounted) {
          setFriends(list || []);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách bạn bè:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(fetchFriends, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, searchQuery]);

  // Đóng modal bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="chat-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-chat-modal-title"
    >
      <div
        className="chat-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "480px" }}
      >
        {/* Header Modal */}
        <div className="modal-card-header">
          <h3 id="new-chat-modal-title">💬 Tin nhắn mới</h3>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Thân Modal */}
        <div className="modal-card-body">
          <div className="form-group">
            <label htmlFor="friend-direct-search">
              Tìm kiếm bạn bè để trò chuyện trực tiếp:
            </label>
            <input
              id="friend-direct-search"
              type="text"
              className="text-input"
              placeholder="Nhập tên bạn bè cần tìm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Danh sách bạn bè */}
          <div className="friends-picker-list" style={{ maxHeight: "340px", overflowY: "auto" }}>
            {isLoading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                Đang tìm kiếm bạn bè...
              </div>
            ) : friends.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>🌱</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  {searchQuery
                    ? `Không tìm thấy bạn bè nào khớp với "${searchQuery}"`
                    : "Chưa có bạn bè để nhắn tin"}
                </div>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>
                  {searchQuery
                    ? "Hãy thử tìm kiếm với từ khóa khác."
                    : "Hãy kết bạn với cư dân khác trên GreenSpot để cùng trò chuyện!"}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    className="btn-modal-submit"
                    style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                    onClick={() => {
                      onClose();
                      window.location.hash = "#friends";
                    }}
                  >
                    <span>👥</span>
                    <span>Khám phá & Kết bạn</span>
                  </button>
                )}
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.user_id}
                  className="friend-pick-row"
                  onClick={() => onSelectFriend(friend.user_id)}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={
                        friend.avatar_url
                          ? resolveMediaUrl(friend.avatar_url)
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.full_name)}&background=10b981&color=fff`
                      }
                      alt={friend.full_name}
                      className="friend-avatar"
                    />
                    <div className="friend-meta">
                      <span className="friend-name">{friend.full_name}</span>
                      {friend.district && (
                        <span className="friend-district">📍 Quận {friend.district}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-modal-submit"
                    style={{
                      padding: "6px 14px",
                      fontSize: "12px",
                      borderRadius: "16px",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFriend(friend.user_id);
                    }}
                  >
                    Nhắn tin
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="modal-card-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
