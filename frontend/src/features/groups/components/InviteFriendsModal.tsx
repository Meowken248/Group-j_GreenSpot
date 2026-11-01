import React, { useState, useEffect } from "react";
import api from "../../../api/client";
import { groupService } from "../services/groupService";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface FriendUser {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  district?: string | null;
}

interface InviteFriendsModalProps {
  groupId: string;
  groupName: string;
  isOpen: boolean;
  onClose: () => void;
  onEnterGroup: () => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  groupId,
  groupName,
  isOpen,
  onClose,
  onEnterGroup,
}) => {
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        const res = await api.get<FriendUser[]>("/api/v1/friends/list", {
          params: searchQuery ? { query: searchQuery } : {},
        });
        if (isMounted) {
          setFriends(res.data || []);
        }
      } catch (err) {
        console.error("Lỗi nạp danh sách bạn bè:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFriends();
    return () => {
      isMounted = false;
    };
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  const toggleSelectFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendInvites = async () => {
    if (selectedFriendIds.length === 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await groupService.inviteFriends(groupId, selectedFriendIds);
      setSuccessMessage(res.message || "Đã gửi lời mời tham gia nhóm");
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        onEnterGroup();
      }, 1500);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(err.response?.data?.detail || "Gửi lời mời thất bại");
    }
  };

  return (
    <div className="group-modal-backdrop" data-testid="invite-friends-modal">
      <div className="modal-dialog" style={{ maxWidth: 520, textAlign: "left" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div className="modal-tag">POPUP</div>
          <div className="modal-title" style={{ fontSize: 18 }}>
            MỜI BẠN BÈ VÀO NHÓM
          </div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Nhóm: <strong>{groupName}</strong>
          </div>
        </div>

        {successMessage ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              background: "#ecfdf5",
              color: "#065f46",
              borderRadius: 12,
              fontWeight: 600,
            }}
            data-testid="invite-success-message"
          >
            ✅ {successMessage}
          </div>
        ) : friends.length === 0 && !isLoading ? (
          /* Trường hợp chưa có bạn bè theo đúng SRS */
          <div style={{ textAlign: "center", padding: "28px 0" }} data-testid="empty-friends-state">
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
              Bạn chưa có bạn bè để mời
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
              Hãy kết nối thêm bạn bè qua mạng lưới GreenSpot hoặc vào thẳng trang quản trị nhóm!
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={onEnterGroup}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: "#059669",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
              data-testid="btn-empty-enter-group"
            >
              Vào nhóm
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Tìm bạn bè theo tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1.5px solid #cbd5e1",
                  fontSize: 13,
                }}
                data-testid="input-search-friends-invite"
              />
            </div>

            <div
              style={{
                maxHeight: 220,
                overflowY: "auto",
                border: "1px solid #f1f5f9",
                borderRadius: 10,
                padding: "8px",
                marginBottom: 20,
              }}
              data-testid="friends-invite-list"
            >
              {friends.map((friend) => {
                const isChecked = selectedFriendIds.includes(friend.user_id);
                return (
                  <div
                    key={friend.user_id}
                    onClick={() => toggleSelectFriend(friend.user_id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isChecked ? "#f0fdf4" : "transparent",
                      transition: "background 0.2s ease",
                    }}
                    data-testid={`friend-item-${friend.user_id}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img
                        src={resolveMediaUrl(friend.avatar_url) || "/default-avatar.png"}
                        alt={friend.full_name}
                        style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                          {friend.full_name}
                        </div>
                        {friend.district && (
                          <div style={{ fontSize: 11, color: "#64748b" }}>{friend.district}</div>
                        )}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelectFriend(friend.user_id)}
                      style={{ accentColor: "#059669", width: 16, height: 16 }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#f1f5f9",
                  color: "#475569",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                data-testid="btn-cancel-invite"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                disabled={selectedFriendIds.length === 0 || isSubmitting}
                onClick={handleSendInvites}
                style={{
                  flex: 2,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: selectedFriendIds.length === 0 ? "#94a3b8" : "#059669",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: selectedFriendIds.length === 0 ? "not-allowed" : "pointer",
                }}
                data-testid="btn-submit-send-invites"
              >
                {isSubmitting
                  ? "Đang gửi…"
                  : `Gửi lời mời (${selectedFriendIds.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

