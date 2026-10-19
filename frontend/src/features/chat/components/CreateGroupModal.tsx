import React, { useState, useEffect } from "react";
import { chatService } from "../services/chatService";
import type { FriendItem } from "../../friends/types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: (newConv: any) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<FriendItem[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const MAX_TITLE_LENGTH = 50;
  const MIN_MEMBERS = 2;
  const MAX_MEMBERS = 50;

  // Tải danh sách bạn bè khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchFriends = async () => {
      try {
        setIsLoadingFriends(true);
        const list = await chatService.getFriendsForGroup(searchQuery);
        if (isMounted) {
          setFriends(list || []);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách bạn bè:", err);
      } finally {
        if (isMounted) {
          setIsLoadingFriends(false);
        }
      }
    };

    const timer = setTimeout(fetchFriends, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  // Xử lý chọn / bỏ chọn bạn bè
  const handleToggleFriend = (friend: FriendItem) => {
    setErrorMessage(null);
    const isSelected = selectedFriends.some((f) => f.user_id === friend.user_id);
    if (isSelected) {
      setSelectedFriends((prev) => prev.filter((f) => f.user_id !== friend.user_id));
    } else {
      if (selectedFriends.length >= MAX_MEMBERS) {
        setErrorMessage(`Một nhóm chỉ có thể có tối đa ${MAX_MEMBERS} thành viên.`);
        return;
      }
      setSelectedFriends((prev) => [...prev, friend]);
    }
  };

  // Xóa chip bạn bè
  const handleRemoveChip = (userId: string) => {
    setSelectedFriends((prev) => prev.filter((f) => f.user_id !== userId));
  };

  // Xác nhận tạo nhóm
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage("Vui lòng nhập tên cuộc trò chuyện nhóm.");
      return;
    }

    if (selectedFriends.length < MIN_MEMBERS) {
      setErrorMessage(`Vui lòng chọn tối thiểu ${MIN_MEMBERS} bạn bè để tạo nhóm.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const memberIds = selectedFriends.map((f) => f.user_id);
      const newConv = await chatService.createGroupConversation(cleanTitle, memberIds);
      onCreateSuccess(newConv);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Không thể tạo nhóm. Vui lòng thử lại.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    title.trim().length > 0 &&
    selectedFriends.length >= MIN_MEMBERS &&
    selectedFriends.length <= MAX_MEMBERS &&
    !isSubmitting;

  return (
    <div className="chat-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="chat-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="modal-card-header">
          <h3>Tạo cuộc trò chuyện nhóm</h3>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            title="Đóng"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-card-body">
            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>
                ⚠️ {errorMessage}
              </div>
            )}

            {/* 1. Tên nhóm */}
            <div className="form-group">
              <label htmlFor="group-title-input">
                Tên đoạn chat nhóm <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="group-title-input"
                type="text"
                className="text-input"
                placeholder="Ví dụ: Đội tái chế Quận 1..."
                value={title}
                maxLength={MAX_TITLE_LENGTH}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <span className="char-counter">
                {title.length}/{MAX_TITLE_LENGTH}
              </span>
            </div>

            {/* 2. Chip các thành viên đã chọn */}
            <div className="form-group">
              <label>
                Đã chọn: {selectedFriends.length} bạn bè (Yêu cầu: từ {MIN_MEMBERS} đến {MAX_MEMBERS})
              </label>
              {selectedFriends.length > 0 ? (
                <div className="selected-chips-bar">
                  {selectedFriends.map((f) => (
                    <span key={f.user_id} className="friend-chip">
                      <span>{f.full_name}</span>
                      <button
                        type="button"
                        className="btn-remove-chip"
                        onClick={() => handleRemoveChip(f.user_id)}
                        title="Bỏ chọn"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                  Chưa có bạn bè nào được chọn. Hãy tick chọn danh sách bên dưới.
                </div>
              )}
            </div>

            {/* 3. Ô tìm kiếm bạn bè */}
            <div className="form-group">
              <label htmlFor="friend-search-input">Tìm kiếm bạn bè</label>
              <input
                id="friend-search-input"
                type="text"
                className="text-input"
                placeholder="Nhập tên bạn bè cần tìm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* 4. Danh sách bạn bè để chọn */}
            <div className="friends-picker-list">
              {isLoadingFriends ? (
                <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  Đang tải danh sách bạn bè...
                </div>
              ) : friends.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  Không tìm thấy bạn bè nào phù hợp
                </div>
              ) : (
                friends.map((friend) => {
                  const isChecked = selectedFriends.some((f) => f.user_id === friend.user_id);
                  return (
                    <label key={friend.user_id} className="friend-pick-row">
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
                          <span className="friend-district">📍 {friend.district}</span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFriend(friend)}
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Modal */}
          <div className="modal-card-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={!isFormValid}
            >
              {isSubmitting ? "Đang tạo nhóm..." : "Tạo nhóm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
