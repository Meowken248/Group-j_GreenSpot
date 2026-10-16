import React, { useState, useEffect, useCallback } from "react";
import { feedService } from "../services/feedService";
import api from "../../../api/client";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import "./PostReactionsModal.scss";

interface PostReactionsModalProps {
  isOpen: boolean;
  postId: string;
  onClose: () => void;
  onShowToast?: (type: "success" | "error" | "info", msg: string) => void;
}

interface ReactionUserItem {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  role?: string;
  reaction_type: string;
  created_at: string;
  friendship_status: string;
  is_following: boolean;
}

const REACTION_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  TREE: { emoji: "🌲", label: "Cây xanh", color: "#16a34a" },
  EARTH: { emoji: "🌍", label: "Trái đất", color: "#0284c7" },
  RECYCLE: { emoji: "♻️", label: "Tái chế", color: "#059669" },
  CLAP: { emoji: "👏", label: "Cổ vũ", color: "#d97706" },
  CONCERN: { emoji: "⚠️", label: "Lo ngại", color: "#dc2626" },
};

export const PostReactionsModal: React.FC<PostReactionsModalProps> = ({
  isOpen,
  postId,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [countsByType, setCountsByType] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<ReactionUserItem[]>([]);
  const [actionLoadingIds, setActionLoadingIds] = useState<Record<string, boolean>>({});

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Nạp danh sách cảm xúc
  const fetchReactions = useCallback(async (tab: string) => {
    try {
      setLoading(true);
      const data = await feedService.getPostReactions(postId, tab === "ALL" ? undefined : tab);
      setTotalCount(data.total_count);
      setCountsByType(data.counts_by_type || {});
      setUsers(data.items || []);
    } catch {
      if (onShowToast) onShowToast("error", "Không thể tải danh sách cảm xúc");
    } finally {
      setLoading(false);
    }
  }, [postId, onShowToast]);

  useEffect(() => {
    if (isOpen) {
      fetchReactions(activeTab);
    }
  }, [isOpen, activeTab, fetchReactions]);

  // Gửi lời mời kết bạn (STT 10 Friends Domain)
  const handleAddFriend = async (targetUserId: string) => {
    try {
      setActionLoadingIds((prev) => ({ ...prev, [targetUserId]: true }));
      await api.post("/friends/requests", { receiver_id: targetUserId });
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === targetUserId
            ? { ...u, friendship_status: "REQUEST_SENT" }
            : u
        )
      );
      if (onShowToast) onShowToast("success", "Đã gửi lời mời kết bạn!");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Không thể gửi lời mời kết bạn";
      if (onShowToast) onShowToast("error", msg);
    } finally {
      setActionLoadingIds((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fb-reactions-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="fb-reactions-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =================================================================== */}
        {/* HEADER & TABS BAR (STYLE FACEBOOK) */}
        {/* =================================================================== */}
        <div className="reactions-modal-header">
          <div className="reactions-tabs-nav">
            <button
              type="button"
              className={`reaction-tab-item ${activeTab === "ALL" ? "is-active" : ""}`}
              onClick={() => setActiveTab("ALL")}
            >
              <span className="tab-label">Tất cả</span>
              {totalCount > 0 && <span className="tab-count">{totalCount}</span>}
            </button>

            {Object.keys(REACTION_CONFIG).map((type) => {
              const count = countsByType[type] || 0;
              if (count === 0 && activeTab !== type) return null;
              const cfg = REACTION_CONFIG[type];
              return (
                <button
                  key={type}
                  type="button"
                  className={`reaction-tab-item ${activeTab === type ? "is-active" : ""}`}
                  onClick={() => setActiveTab(type)}
                  title={cfg.label}
                >
                  <span className="tab-emoji">{cfg.emoji}</span>
                  <span className="tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="reactions-close-btn"
            onClick={onClose}
            title="Đóng (Esc)"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* =================================================================== */}
        {/* BODY: DANH SÁCH NGƯỜI DÙNG BÀY TỎ CẢM XÚC */}
        {/* =================================================================== */}
        <div className="reactions-modal-body">
          {loading ? (
            <div className="reactions-loading-skeleton">
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          ) : users.length === 0 ? (
            <div className="reactions-empty-state">
              <span className="empty-icon">🌱</span>
              <p>Chưa có ai bày tỏ cảm xúc ở mục này</p>
            </div>
          ) : (
            <div className="reactions-user-list">
              {users.map((user) => {
                const rxCfg = REACTION_CONFIG[user.reaction_type] || {
                  emoji: "🌲",
                  label: "Cảm xúc",
                  color: "#16a34a",
                };
                const isLoadingAction = Boolean(actionLoadingIds[user.user_id]);

                return (
                  <div key={user.user_id} className="reaction-user-row">
                    {/* Cột trái: Avatar có badge emoji ở góc */}
                    <div className="user-avatar-wrap">
                      {user.avatar_url ? (
                        <img
                          src={resolveMediaUrl(user.avatar_url)}
                          alt={user.full_name}
                          className="user-avatar-img"
                        />
                      ) : (
                        <div className="user-avatar-placeholder">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className="user-reaction-badge"
                        style={{ borderColor: rxCfg.color }}
                        title={rxCfg.label}
                      >
                        {rxCfg.emoji}
                      </span>
                    </div>

                    {/* Cột giữa: Tên & Vai trò */}
                    <div className="user-info-wrap">
                      <div className="user-fullname">{user.full_name}</div>
                      <div className="user-meta-role">
                        {user.role === "ADMIN"
                          ? "Quản trị viên"
                          : user.role === "CITIZEN"
                          ? "Công dân sinh thái"
                          : user.role || "Thành viên"}
                      </div>
                    </div>

                    {/* Cột phải: Nút Kết bạn / Bạn bè (STT 10) */}
                    <div className="user-action-wrap">
                      {user.friendship_status === "SELF" ? null : user.friendship_status === "FRIENDS" ? (
                        <span className="btn-friend-status is-friends" title="Đã là bạn bè">
                          ✓ Bạn bè
                        </span>
                      ) : user.friendship_status === "REQUEST_SENT" ? (
                        <span className="btn-friend-status is-pending" title="Đã gửi lời mời">
                          Đã gửi lời mời
                        </span>
                      ) : user.friendship_status === "REQUEST_RECEIVED" ? (
                        <button
                          type="button"
                          className="btn-action-primary"
                          onClick={() => {
                            window.location.hash = "#friends";
                            onClose();
                          }}
                        >
                          Chấp nhận
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-action-add-friend"
                          disabled={isLoadingAction}
                          onClick={() => handleAddFriend(user.user_id)}
                        >
                          {isLoadingAction ? (
                            "..."
                          ) : (
                            <>
                              <span className="icon">👤+</span>
                              <span>Thêm bạn bè</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
