/**
 * GroupDetailView.tsx
 * Trang chi tiết Nhóm cộng đồng chuẩn Mạng xã hội (Chức năng 16)
 * Đa tab: Bài viết (Feed), Giới thiệu (About), Thành viên (Members)
 * Tích hợp GroupComposerBox, Dòng thời gian bài viết của nhóm, Mời bạn bè, và Giải tán nhóm (Admin)
 */

import React, { useState, useEffect, useCallback } from "react";
import type { GroupItem } from "../types/group";
import { groupService } from "../services/groupService";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { DisbandGroupModal } from "./DisbandGroupModal";
import { InviteFriendsModal } from "./InviteFriendsModal";
import { GroupComposerBox } from "./GroupComposerBox";
import { GroupMembersTab } from "./GroupMembersTab";
import { FeedPostCard } from "../../feed/components/FeedPostCard";
import type { FeedPostItem } from "../../feed/types/feed.types";
import { PostCreatorContainer } from "../../posts/PostCreatorContainer";
import { AUTH_STORAGE_KEYS } from "../../auth/types/auth.types";
import { SharePostModal, PostCommentsModal } from "../../comments";
import { feedService } from "../../feed/services/feedService";

interface GroupDetailViewProps {
  groupId: string;
  onBack: () => void;
  onGroupDisbanded: () => void;
  onSelectAnotherGroup?: (groupId: string) => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  groupId,
  onBack,
  onGroupDisbanded,
  onSelectAnotherGroup,
}) => {
  const [group, setGroup] = useState<GroupItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisbandModal, setShowDisbandModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab điều hướng Facebook Groups style
  const [activeTab, setActiveTab] = useState<"feed" | "about" | "members">("feed");

  // Dữ liệu bài viết trong nhóm
  const [posts, setPosts] = useState<FeedPostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [sharingPost, setSharingPost] = useState<FeedPostItem | null>(null);
  const [selectedPostForComments, setSelectedPostForComments] = useState<FeedPostItem | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; type: "success" | "error" | "info"; message: string }>>([]);

  const showToast = useCallback((type: "success" | "error" | "info", message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const handleReactPost = async (postId: string, reactionType: string) => {
    try {
      await feedService.reactToPost(postId, reactionType);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.post_id !== postId) return p;
          const isSame = p.user_reaction === reactionType;
          const newReaction = isSame ? null : reactionType;
          let count = p.reactions_count || 0;
          if (!p.user_reaction && newReaction) count += 1;
          else if (p.user_reaction && !newReaction) count = Math.max(0, count - 1);
          return {
            ...p,
            user_reaction: newReaction,
            reactions_count: count,
          };
        })
      );
    } catch (err) {
      console.error("Lỗi thả cảm xúc bài viết:", err);
    }
  };

  // Người dùng hiện tại
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const userStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const userStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
        setCurrentUser(userStr ? JSON.parse(userStr) : null);
      } catch {
        setCurrentUser(null);
      }
    };
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("auth_change", handleAuthChange);
    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("auth_change", handleAuthChange);
    };
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await groupService.getGroupDetail(groupId);
      setGroup(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Không thể tải thông tin nhóm");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  const fetchPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const res = await groupService.getGroupPosts(groupId);
      setPosts(res.items || []);
    } catch {
      // Nhóm riêng tư khi chưa tham gia sẽ trả 403
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchDetail();
    fetchPosts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetchDetail, fetchPosts]);

  const handleJoin = async () => {
    if (!group || actionLoading) return;
    try {
      setActionLoading(true);
      await groupService.joinGroup(groupId);
      window.dispatchEvent(new CustomEvent("group_joined", { detail: { groupId } }));
      await fetchDetail();
      await fetchPosts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Tham gia nhóm thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!group || actionLoading) return;
    if (!window.confirm("Bạn chắc chắn muốn rời nhóm này?")) return;

    try {
      setActionLoading(true);
      await groupService.leaveGroup(groupId);
      window.dispatchEvent(new CustomEvent("group_joined", { detail: { groupId } }));
      await fetchDetail();
      await fetchPosts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Rời nhóm thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", color: "#64748b" }}>
        Đang tải thông tin nhóm…
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="empty-state" style={{ textAlign: "center", padding: "48px 20px" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
        <h3 style={{ color: "#1e293b", marginBottom: "12px" }}>{error || "Nhóm không còn tồn tại"}</h3>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "8px 18px",
            background: "#059669",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const isAdmin = group.my_role === "ADMIN";
  const isPrivateAndLocked = group.privacy === "PRIVATE" && !group.is_member;

  return (
    <div className="group-detail-view" data-testid="group-detail-view">
      {/* 1. Nút quay lại & Breadcrumbs */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#059669",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
          }}
          data-testid="btn-back-to-list"
        >
          ← Quay lại Bảng tin / Danh sách
        </button>

        <span style={{ fontSize: "12px", color: "#64748b" }}>
          Mạng xã hội sinh thái ➔ Nhóm cộng đồng
        </span>
      </div>

      {/* 2. Banner & Cover Image */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            height: 240,
            background: "#cbd5e1",
            position: "relative",
          }}
        >
          {group.cover_image_url ? (
            <img
              src={resolveMediaUrl(group.cover_image_url)}
              alt="Ảnh bìa nhóm"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #059669, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: 56,
              }}
            >
              🌿
            </div>
          )}

          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(6px)",
              color: "#ffffff",
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {group.privacy === "PUBLIC" ? "🌐 Nhóm công khai" : "🔒 Nhóm riêng tư"}
          </div>
        </div>

        {/* Thông tin chính của nhóm */}
        <div style={{ padding: "24px 32px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  background: "#ecfdf5",
                  color: "#047857",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {group.group_type === "DISTRICT" ? "Theo quận/huyện" : group.group_type === "WARD" ? "Theo phường/xã" : "Theo chủ đề"}
              </span>
              {group.district && (
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                  📍 {group.ward ? `${group.ward}, ` : ""}{group.district}{group.province ? `, ${group.province}` : ""}
                </span>
              )}
              {group.theme_topic && (
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                  🏷️ {group.theme_topic}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", margin: "0 0 10px 0" }} data-testid="detail-group-name">
              {group.name}
            </h1>

            <div style={{ display: "flex", gap: 20, fontSize: "14px", color: "#64748b", flexWrap: "wrap" }}>
              <span style={{ cursor: "pointer" }} onClick={() => setActiveTab("members")}>
                👥 <strong>{group.members_count}</strong> thành viên
              </span>
              <span style={{ cursor: "pointer" }} onClick={() => setActiveTab("feed")}>
                📝 <strong>{group.posts_count}</strong> bài viết
              </span>
              {group.creator_name && (
                <span>
                  👑 Người lập: <strong>{group.creator_name}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Cụm nút hành động bên phải */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Nút Mời bạn bè */}
            {group.is_member && (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                style={{
                  padding: "10px 16px",
                  background: "#ecfdf5",
                  color: "#059669",
                  border: "1.5px solid #a7f3d0",
                  borderRadius: 10,
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                data-testid="btn-group-invite-friends"
              >
                + Mời bạn bè
              </button>
            )}

            {/* Nút Giải tán nhóm (cho Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowDisbandModal(true)}
                style={{
                  padding: "10px 16px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "1.5px solid #fecaca",
                  borderRadius: 10,
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                data-testid="btn-open-disband-modal"
              >
                🗑️ Giải tán nhóm
              </button>
            )}

            {/* Nút Rời nhóm / Tham gia nhóm */}
            {group.is_member ? (
              <button
                type="button"
                onClick={handleLeave}
                disabled={actionLoading}
                style={{
                  padding: "10px 18px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 10,
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                data-testid="btn-leave-group"
              >
                Rời nhóm
              </button>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={actionLoading}
                style={{
                  padding: "10px 24px",
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                data-testid="btn-join-group"
              >
                + Tham gia nhóm
              </button>
            )}
          </div>
        </div>

        {/* Thanh Tabs điều hướng Facebook Groups Style */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            padding: "0 32px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            style={{
              padding: "14px 4px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "feed" ? "3px solid #059669" : "3px solid transparent",
              color: activeTab === "feed" ? "#059669" : "#64748b",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            data-testid="tab-group-feed"
          >
            📝 Bài viết ({group.posts_count})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("about")}
            style={{
              padding: "14px 4px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "about" ? "3px solid #059669" : "3px solid transparent",
              color: activeTab === "about" ? "#059669" : "#64748b",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            data-testid="tab-group-about"
          >
            ℹ️ Giới thiệu
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("members")}
            style={{
              padding: "14px 4px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "members" ? "3px solid #059669" : "3px solid transparent",
              color: activeTab === "members" ? "#059669" : "#64748b",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            data-testid="tab-group-members"
          >
            👥 Thành viên ({group.members_count})
          </button>
        </div>
      </div>

      {/* 3. Nội dung chính theo từng Tab */}
      <div
        className="group-tab-layout-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 340px",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Cột trái: Tab Content */}
        <div className="group-tab-main-col">
          {activeTab === "feed" && (
            <div>
              {/* Nếu là nhóm riêng tư và chưa tham gia: Khóa nội dung */}
              {isPrivateAndLocked ? (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    padding: "48px 24px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "44px", marginBottom: "16px" }}>🔒</div>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", margin: "0 0 8px 0" }}>
                    Đây là nhóm riêng tư
                  </h3>
                  <p style={{ color: "#64748b", fontSize: "14px", maxWidth: "420px", margin: "0 auto 20px" }}>
                    Chỉ thành viên mới có thể xem các bài viết, hình ảnh dọn dẹp và thảo luận nội bộ trong nhóm này.
                  </p>
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={actionLoading}
                    style={{
                      padding: "10px 24px",
                      background: "#059669",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Tham gia nhóm để xem bài viết
                  </button>
                </div>
              ) : (
                <>
                  {/* Khung đăng bài nếu là thành viên */}
                  {group.is_member ? (
                    <GroupComposerBox
                      groupId={group.group_id}
                      groupName={group.name}
                      currentUser={currentUser}
                      onOpenPostCreator={() => setShowCreatePostModal(true)}
                    />
                  ) : (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "14px",
                        padding: "16px 20px",
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#166534", fontSize: "14px" }}>
                          Bạn chưa tham gia nhóm này
                        </div>
                        <div style={{ fontSize: "13px", color: "#15803d" }}>
                          Gia nhập nhóm ngay để đăng bài viết và cùng nhau bảo vệ môi trường!
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleJoin}
                        disabled={actionLoading}
                        style={{
                          padding: "8px 18px",
                          background: "#059669",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Tham gia ngay
                      </button>
                    </div>
                  )}

                  {/* Dòng thời gian bài viết nhóm */}
                  {loadingPosts ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                      Đang nạp bài viết của nhóm…
                    </div>
                  ) : posts.length === 0 ? (
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "16px",
                        border: "1px dashed #cbd5e1",
                        padding: "48px 20px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "40px", marginBottom: "12px" }}>🌿</div>
                      <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#334155" }}>
                        Chưa có bài viết nào trong nhóm
                      </h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
                        {group.is_member
                          ? "Hãy là người đầu tiên chia sẻ thông điệp, hình ảnh môi trường với nhóm!"
                          : "Tham gia nhóm để trở thành người đầu tiên đăng bài viết!"}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {posts.map((post) => (
                        <FeedPostCard
                          key={post.post_id}
                          post={post}
                          currentUserId={currentUser?.user_id}
                          onSelectGroup={(id) => onSelectAnotherGroup?.(id)}
                          onOpenShare={(p) => setSharingPost(p)}
                          onOpenComments={(p) => setSelectedPostForComments(p)}
                          onReactPost={handleReactPost}
                          onShowToast={showToast}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "about" && (
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "28px",
                boxShadow: "0 2px 8px -2px rgba(0,0,0,0.04)",
              }}
            >
              <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                Giới thiệu nhóm cộng đồng
              </h3>
              <p style={{ color: "#334155", lineHeight: 1.7, fontSize: "14px", whiteSpace: "pre-wrap", marginBottom: "24px" }}>
                {group.description || "Nhóm chưa có phần giới thiệu chi tiết."}
              </p>

              <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                Quy tắc ứng xử cộng đồng sống xanh
              </h4>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#475569", fontSize: "13.5px", lineHeight: 1.8 }}>
                <li>Tôn trọng các thành viên khác, giao tiếp lịch sự, văn minh và cầu thị.</li>
                <li>Khuyến khích đăng tải thông tin, phản ánh điểm nóng rác thải có kèm toạ độ GPS và hình ảnh thực tế.</li>
                <li>Không đăng tải nội dung quảng cáo sai sự thật hoặc nội dung không liên quan đến môi trường.</li>
                <li>Cùng nhau tham gia các buổi ra quân dọn rác, trồng cây xanh và phân loại rác tại nguồn.</li>
              </ul>
            </div>
          )}

          {activeTab === "members" && (
            <GroupMembersTab
              groupId={group.group_id}
              isAdmin={isAdmin}
              onInviteClick={group.is_member ? () => setShowInviteModal(true) : undefined}
            />
          )}
        </div>

        {/* Cột phải: Thông tin tóm tắt & Quy tắc nhóm (Sidebar) */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Box Giới thiệu nhanh */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "20px",
              boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.04)",
            }}
          >
            <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
              Giới thiệu ngắn
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#475569" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{group.privacy === "PUBLIC" ? "🌐" : "🔒"}</span>
                <span>{group.privacy === "PUBLIC" ? "Nhóm công khai • Ai cũng có thể tìm thấy" : "Nhóm riêng tư • Chỉ thành viên xem bài viết"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>👥</span>
                <span>{group.members_count} thành viên đã tham gia</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📝</span>
                <span>{group.posts_count} bài viết đã chia sẻ</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📅</span>
                <span>Thành lập: {new Date(group.created_at).toLocaleDateString("vi-VN")}</span>
              </div>
              {group.district && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📍</span>
                  <span>{group.ward ? `${group.ward}, ` : ""}{group.district}{group.province ? `, ${group.province}` : ""}</span>
                </div>
              )}
            </div>
          </div>

          {/* Box Quản trị viên */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "20px",
              boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.04)",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
              Người sáng lập nhóm
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#fef3c7",
                  color: "#b45309",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                }}
              >
                👑
              </div>
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                  {group.creator_name || "Quản trị viên"}
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b" }}>Trưởng nhóm điều phối</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 4. Modal Giải tán nhóm (Màn 4) */}
      <DisbandGroupModal
        groupId={group.group_id}
        groupName={group.name}
        isOpen={showDisbandModal}
        onClose={() => setShowDisbandModal(false)}
        onSuccess={() => {
          setShowDisbandModal(false);
          window.dispatchEvent(new CustomEvent("group_created"));
          onGroupDisbanded();
        }}
      />

      {/* 5. Modal Mời bạn bè (Màn 3) */}
      <InviteFriendsModal
        groupId={group.group_id}
        groupName={group.name}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onEnterGroup={() => {
          setShowInviteModal(false);
          fetchDetail();
        }}
      />

      {/* 6. Modal Tạo bài viết vào Nhóm (Gắn group_id) */}
      {showCreatePostModal && (
        <div
          className="feed-modal-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowCreatePostModal(false)}
        >
          <div
            className="feed-modal-content create-post-modal-wrapper"
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "12px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                  Đăng bài vào nhóm: {group.name}
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Bài viết sẽ gắn thẻ nhóm và xuất hiện trong dòng thời gian của nhóm.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePostModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                ✕
              </button>
            </div>

            <PostCreatorContainer
              initialGroupId={group.group_id}
              onNavigateHome={() => {
                setShowCreatePostModal(false);
                fetchPosts();
                fetchDetail();
              }}
              onViewCreatedPost={(_postId) => {
                setShowCreatePostModal(false);
                fetchPosts();
                fetchDetail();
              }}
            />
          </div>
        </div>
      )}

      {/* 7. Modal Chia sẻ bài viết (Chức năng 14) */}
      {sharingPost && (
        <SharePostModal
          isOpen={Boolean(sharingPost)}
          postId={sharingPost.post_id}
          postContent={sharingPost.content}
          authorName={sharingPost.author?.full_name}
          onClose={() => setSharingPost(null)}
          onShareSuccess={(message) => {
            showToast("success", message);
            const newShares = (sharingPost.shares_count || 0) + 1;
            setPosts((prev) =>
              prev.map((p) =>
                p.post_id === sharingPost.post_id
                  ? { ...p, shares_count: newShares }
                  : p
              )
            );
          }}
          onShowToast={showToast}
        />
      )}

      {/* 8. Modal Bình luận bài viết Overlay (Chức năng 14) */}
      {selectedPostForComments && (
        <PostCommentsModal
          isOpen={Boolean(selectedPostForComments)}
          post={selectedPostForComments}
          onClose={() => setSelectedPostForComments(null)}
          onPostUpdated={(updatedPost) => {
            setPosts((prev) =>
              prev.map((p) => (p.post_id === updatedPost.post_id ? updatedPost : p))
            );
            setSelectedPostForComments(updatedPost);
          }}
        />
      )}

      {/* 9. Toast thông báo phản hồi thao tác */}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            pointerEvents: "none",
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                pointerEvents: "auto",
                background:
                  t.type === "success"
                    ? "#059669"
                    : t.type === "error"
                    ? "#dc2626"
                    : "#2563eb",
                color: "#ffffff",
                padding: "12px 20px",
                borderRadius: "12px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
