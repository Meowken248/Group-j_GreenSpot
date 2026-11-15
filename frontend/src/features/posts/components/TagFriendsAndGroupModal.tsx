import React, { useState, useEffect } from "react";
import type { FriendOption, VolunteerGroupOption } from "../types/postTypes";

interface TagFriendsAndGroupModalProps {
  isOpen: boolean;
  initialMode?: "FRIENDS" | "GROUP";
  friendsList: FriendOption[];
  groupsList: VolunteerGroupOption[];
  selectedFriendIds: string[];
  selectedGroupId: string | null;
  onConfirm: (friendIds: string[], groupId: string | null) => void;
  onClose: () => void;
}

export const TagFriendsAndGroupModal: React.FC<TagFriendsAndGroupModalProps> = ({
  isOpen,
  initialMode = "FRIENDS",
  friendsList,
  groupsList,
  selectedFriendIds,
  selectedGroupId,
  onConfirm,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"FRIENDS" | "GROUP">(initialMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempFriendIds, setTempFriendIds] = useState<string[]>([]);
  const [tempGroupId, setTempGroupId] = useState<string | null>(null);

  // Đồng bộ khi mở modal
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setTempFriendIds([...selectedFriendIds]);
      setTempGroupId(selectedGroupId);
      setSearchQuery("");
    }
  }, [isOpen, initialMode, selectedFriendIds, selectedGroupId]);

  // Hỗ trợ phím Esc để thoát
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Xử lý tích chọn bạn bè (Tối đa 10 người)
  const handleToggleFriend = (userId: string) => {
    if (tempFriendIds.includes(userId)) {
      setTempFriendIds(tempFriendIds.filter((id) => id !== userId));
    } else {
      if (tempFriendIds.length >= 10) {
        return; // Không cho phép chọn quá 10
      }
      setTempFriendIds([...tempFriendIds, userId]);
    }
  };

  // Lọc danh sách bạn bè
  const filteredFriends = friendsList.filter((f) =>
    f.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Lọc danh sách nhóm
  const filteredGroups = groupsList.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.district.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFriendLimitReached = tempFriendIds.length >= 10;

  const handleDone = () => {
    onConfirm(tempFriendIds, tempGroupId);
    onClose();
  };

  return (
    <div className="tag-modal-backdrop" onClick={onClose}>
      <div className="tag-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header với chữ POPUP nhỏ và tiêu đề in đậm */}
        <div className="tag-modal-header">
          <div className="badge-popup">POPUP</div>
          <h2>GẮN THẺ BẠN BÈ / CHỌN NHÓM</h2>
        </div>

        {/* Tab chuyển đổi */}
        <div className="tag-modal-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "FRIENDS" ? "active" : ""}`}
            onClick={() => setActiveTab("FRIENDS")}
          >
            👥 Gắn thẻ bạn bè ({tempFriendIds.length}/10)
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "GROUP" ? "active" : ""}`}
            onClick={() => setActiveTab("GROUP")}
          >
            🏢 Đăng vào nhóm tình nguyện
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div className="tag-modal-search">
          <input
            type="text"
            placeholder={
              activeTab === "FRIENDS"
                ? "Tìm bạn bè theo tên hoặc email…"
                : "Tìm nhóm tình nguyện theo tên, quận…"
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Danh sách tích chọn */}
        <div className="tag-modal-list">
          {activeTab === "FRIENDS" ? (
            filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => {
                const isSelected = tempFriendIds.includes(friend.user_id);
                const isDisabled = !isSelected && isFriendLimitReached;

                return (
                  <div
                    key={friend.user_id}
                    className={`list-item ${isDisabled ? "is-disabled" : ""}`}
                    onClick={() => !isDisabled && handleToggleFriend(friend.user_id)}
                  >
                    <div className="user-info">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt={friend.full_name} className="avatar" />
                      ) : (
                        <div className="avatar">{friend.full_name.charAt(0).toUpperCase()}</div>
                      )}
                      <div>
                        <div className="name">{friend.full_name}</div>
                        <div className="subtext">{friend.email}</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => handleToggleFriend(friend.user_id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                );
              })
            ) : (
              <div className="empty-notice">Không tìm thấy bạn bè hoặc nhóm phù hợp</div>
            )
          ) : (
            filteredGroups.length > 0 ? (
              filteredGroups.map((group) => {
                const isSelected = tempGroupId === group.group_id;

                return (
                  <div
                    key={group.group_id}
                    className="list-item"
                    onClick={() => setTempGroupId(isSelected ? null : group.group_id)}
                  >
                    <div className="user-info">
                      <div className="avatar">🌿</div>
                      <div>
                        <div className="name">{group.name}</div>
                        <div className="subtext">
                          {group.district} • {group.members_count} thành viên
                          {group.requires_approval && " • Có duyệt bài"}
                        </div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="group_selection"
                      checked={isSelected}
                      onChange={() => setTempGroupId(group.group_id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                );
              })
            ) : (
              <div className="empty-notice">Không tìm thấy bạn bè hoặc nhóm phù hợp</div>
            )
          )}
        </div>

        {/* Cảnh báo khi đạt giới hạn 10 bạn bè */}
        {activeTab === "FRIENDS" && isFriendLimitReached && (
          <div className="counter-notice">⚠️ Chỉ được gắn thẻ tối đa 10 bạn bè</div>
        )}

        {/* Khung nút chức năng */}
        <div className="tag-modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Huỷ
          </button>
          <button type="button" className="btn-confirm" onClick={handleDone}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};
