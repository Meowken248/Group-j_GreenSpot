import React, { useState, useEffect } from "react";
import type { FriendItem, FollowingItem } from "../types";
import { useLanguage } from "../../../i18n";

interface FriendListViewProps {
  friends: FriendItem[];
  followingList: FollowingItem[];
  loadingFriends: boolean;
  loadingFollowing: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenUnfriendModal: (friend: FriendItem) => void;
  onUnfollow: (targetUserId: string, name: string) => void;
  onOpenChat: (friend: FriendItem) => void;
}

export const FriendListView: React.FC<FriendListViewProps> = ({
  friends,
  followingList,
  loadingFriends,
  loadingFollowing,
  searchQuery,
  onSearchChange,
  onOpenUnfriendModal,
  onUnfollow,
  onOpenChat,
}) => {
  const { currentLang } = useLanguage();
  const isEn = currentLang === "EN";

  // Input cục bộ phục vụ cơ chế Debounce 300ms
  const [localInput, setLocalInput] = useState(searchQuery);
  const [prevQuery, setPrevQuery] = useState(searchQuery);

  if (prevQuery !== searchQuery) {
    setPrevQuery(searchQuery);
    setLocalInput(searchQuery);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localInput);
    }, 300); // Ràng buộc đặc tả: Debounce 300ms

    return () => clearTimeout(timer);
  }, [localInput, onSearchChange]);

  return (
    <div className="two-column-layout">
      {/* KHỐI 1 (CỘT TRÁI): DANH SÁCH BẠN BÈ */}
      <div className="section-card">
        <div className="card-header-bar">
          <h2 className="card-title">
            <span>👥 {isEn ? "Friends List" : "Danh sách bạn bè"}</span>
            <span className="count-badge">{friends.length}</span>
          </h2>
        </div>

        {/* Thanh tìm kiếm realtime Debounce 300ms */}
        <div className="search-debounce-bar">
          <span className="search-icon-adornment">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={isEn ? "Search friends by name or district..." : "Tìm kiếm bạn bè theo họ tên hoặc quận/huyện..."}
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
          />
        </div>

        <div className="friends-list-container">
          {loadingFriends ? (
            <div className="empty-state-notice">
              <p>{isEn ? "Searching friends list..." : "Đang tìm kiếm danh sách bạn bè..."}</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="empty-state-notice">
              <div className="empty-icon">🔍</div>
              <p>
                {localInput.trim()
                  ? (isEn ? `No friends found matching "${localInput}".` : `Không tìm thấy bạn bè nào khớp với "${localInput}".`)
                  : (isEn ? "You have no friends in your list yet." : "Bạn chưa có người bạn nào trong danh sách.")}
              </p>
            </div>
          ) : (
            friends.map((friend) => (
              <div key={friend.user_id} className="friend-row-item">
                <div className="friend-meta-left">
                  <div className="avatar-wrapper">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.full_name}
                        className="friend-avatar"
                      />
                    ) : (
                      <div className="friend-avatar">
                        {friend.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`online-dot ${friend.is_online ? "online" : "offline"}`}
                      title={friend.is_online ? (isEn ? "Active" : "Đang hoạt động") : (isEn ? "Offline" : "Ngoại tuyến")}
                    />
                  </div>

                  <div className="friend-text-info">
                    <div className="friend-name-row">
                      <h4 className="friend-name">{friend.full_name}</h4>
                      {/* Hiển thị tag cảnh báo nếu tài khoản bị tạm khóa */}
                      {friend.is_suspended && (
                        <span className="tag-suspended">{isEn ? "Account temporarily locked" : "Tài khoản bị tạm khóa"}</span>
                      )}
                    </div>

                    <div className="friend-district-sub">
                      {friend.district && <span>📍 {friend.district} • </span>}
                      <span>⭐ {friend.total_green_points} {isEn ? (friend.total_green_points === 1 ? "green point" : "green points") : "điểm xanh"}</span>
                    </div>
                  </div>
                </div>

                <div className="friend-actions-right">
                  {/* Nút nhắn tin: Bị vô hiệu hóa nếu tài khoản bị khóa */}
                  <button
                    type="button"
                    className="btn-chat"
                    disabled={friend.is_suspended}
                    onClick={() => onOpenChat(friend)}
                    title={
                      friend.is_suspended
                        ? (isEn ? "Cannot send messages as this account is suspended" : "Không thể gửi tin nhắn do tài khoản này đang bị khóa")
                        : (isEn ? "Direct message" : "Nhắn tin trực tiếp")
                    }
                  >
                    💬 {isEn ? "Message" : "Nhắn tin"}
                  </button>

                  {/* Nút Hủy kết bạn: Mở Popup Modal Màn 3 */}
                  <button
                    type="button"
                    className="btn-unfriend-trigger"
                    onClick={() => onOpenUnfriendModal(friend)}
                  >
                    {isEn ? "Unfriend" : "Hủy kết bạn"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* KHỐI 2 (CỘT PHẢI): ĐANG THEO DÕI */}
      <div className="section-card">
        <div className="card-header-bar">
          <h2 className="card-title">
            <span>👁️ {isEn ? "Following" : "Đang theo dõi"}</span>
            <span className="count-badge">{followingList.length}</span>
          </h2>
        </div>

        <div className="following-list-container">
          {loadingFollowing ? (
            <div className="empty-state-notice">
              <p>{isEn ? "Loading following list..." : "Đang tải danh sách theo dõi..."}</p>
            </div>
          ) : followingList.length === 0 ? (
            <div className="empty-state-notice">
              <div className="empty-icon">🌿</div>
              <p>{isEn ? "You are not following any green citizens yet." : "Bạn chưa theo dõi công dân xanh nào."}</p>
            </div>
          ) : (
            followingList.map((target) => (
              <div key={target.user_id} className="following-item-row">
                <div className="user-meta-left">
                  {target.avatar_url ? (
                    <img
                      src={target.avatar_url}
                      alt={target.full_name}
                      className="following-avatar"
                    />
                  ) : (
                    <div className="following-avatar">
                      {target.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="following-text">
                    <h4 className="name">{target.full_name}</h4>
                    <div className="meta">
                      {target.district && <span>📍 {target.district} • </span>}
                      <span>⭐ {target.total_green_points} {isEn ? (target.total_green_points === 1 ? "point" : "points") : "điểm"}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-unfollow-direct"
                  onClick={() => onUnfollow(target.user_id, target.full_name)}
                >
                  {isEn ? "Unfollow" : "Bỏ theo dõi"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
