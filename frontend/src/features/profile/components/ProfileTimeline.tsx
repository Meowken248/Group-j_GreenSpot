import React, { useState, useEffect } from "react";
import type { UserProfile, PostListResponse, PostItem } from "../types/profile.types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { EditPostModal } from "./EditPostModal";
import { DeletePostModal } from "./DeletePostModal";
import { HidePostModal } from "./HidePostModal";
import { profileService } from "../services/profile.service";

interface ProfileTimelineProps {
  profile: UserProfile | null;
  posts: PostListResponse | null;
  profileLoading: boolean;
  postsLoading: boolean;
  profileError: string | null;
  postsError: string | null;
  onRetryProfile: () => void;
  onRetryPosts: () => void;
  onLoadMorePosts: () => void;
  loadingMore: boolean;
  onOpenEditProfile: () => void;
  onOpenPassport: () => void;
  onOpenHistory: () => void;
  onNavigateToFeed: () => void;
  onShowToast?: (type: "success" | "error", message: string) => void;
  onRefreshPosts?: () => void;
}

export const ProfileTimeline: React.FC<ProfileTimelineProps> = ({
  profile,
  posts,
  profileLoading,
  postsLoading,
  profileError,
  postsError,
  onRetryProfile,
  onRetryPosts,
  onLoadMorePosts,
  loadingMore,
  onOpenEditProfile,
  onOpenPassport,
  onOpenHistory,
  onNavigateToFeed,
  onShowToast,
  onRefreshPosts,
}) => {
  // Lấy chữ cái đầu của từ cuối cùng trong họ tên làm avatar fallback
  const getAvatarLetter = (fullName?: string) => {
    if (!fullName) return "U";
    const words = fullName.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    return lastWord ? lastWord.charAt(0).toUpperCase() : "U";
  };

  // Định dạng ngày dd/MM/yyyy
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return isoStr;
    }
  };

  // Định dạng thời gian tương đối
  const getRelativeTime = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return "Vừa xong";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} ngày trước`;
      return formatDate(isoStr);
    } catch {
      return isoStr;
    }
  };

  // Tô màu nổi bật và định dạng các Hashtag môi trường (#SaiGonXanh, #PhânLoạiRác...)
  const renderContentWithHashtags = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(#[^\s#.,!?:;]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return (
          <span key={index} className="post-hashtag-pill">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Đồng bộ danh sách bài viết cục bộ để cập nhật giao diện tức thì
  const [localPosts, setLocalPosts] = useState<PostItem[]>(posts?.items || []);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [deletingPost, setDeletingPost] = useState<PostItem | null>(null);
  const [hidingPost, setHidingPost] = useState<PostItem | null>(null);
  const [actionLoadingPostId, setActionLoadingPostId] = useState<string | null>(null);

  useEffect(() => {
    if (posts?.items) {
      setLocalPosts(posts.items);
    }
  }, [posts?.items]);

  // Đóng dropdown menu khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".post-dropdown-container")) {
        setActiveMenuPostId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveMenuPostId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Xử lý bật/tắt ẩn bài viết từ Menu
  const handleToggleHideFromMenu = async (post: PostItem) => {
    setActiveMenuPostId(null);
    if (actionLoadingPostId) return;
    const nextState = !post.is_hidden;
    setActionLoadingPostId(post.post_id);
    try {
      await profileService.toggleHidePost(post.post_id, nextState);
      setLocalPosts((prev) =>
        prev.map((item) =>
          item.post_id === post.post_id ? { ...item, is_hidden: nextState } : item
        )
      );
      if (nextState) {
        // Mở popup Màn 5/5
        setHidingPost(post);
      } else {
        onShowToast?.("success", "Đã hiện lại bài viết thành công");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thao tác ẩn/hiện thất bại";
      onShowToast?.("error", msg);
    } finally {
      setActionLoadingPostId(null);
    }
  };

  // Nút [Hiện lại] nhanh trực tiếp trên thẻ bài viết
  const handleQuickUnhide = async (post: PostItem) => {
    if (actionLoadingPostId) return;
    setActionLoadingPostId(post.post_id);
    try {
      await profileService.toggleHidePost(post.post_id, false);
      setLocalPosts((prev) =>
        prev.map((item) =>
          item.post_id === post.post_id ? { ...item, is_hidden: false } : item
        )
      );
      onShowToast?.("success", "Đã hiện lại bài viết thành công");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể hiện lại bài viết";
      onShowToast?.("error", msg);
    } finally {
      setActionLoadingPostId(null);
    }
  };

  // Xử lý hoàn tác ẩn từ Màn 5/5
  const handleUndoSuccess = (_unhiddenPost?: PostItem) => {
    if (hidingPost) {
      setLocalPosts((prev) =>
        prev.map((item) =>
          item.post_id === hidingPost.post_id ? { ...item, is_hidden: false } : item
        )
      );
      onShowToast?.("success", "Đã hoàn tác ẩn bài viết");
      setHidingPost(null);
    }
  };

  // Cập nhật sau khi chỉnh sửa thành công (Màn 2/5)
  const handleEditSuccess = (updatedPost: PostItem) => {
    if (editingPost) {
      setLocalPosts((prev) =>
        prev.map((item) => {
          if (item.post_id === editingPost.post_id) {
            return {
              ...item,
              content: updatedPost.content,
              media_urls: updatedPost.media_urls,
              thumbnail_url: updatedPost.thumbnail_url || (updatedPost.media_urls && updatedPost.media_urls[0]) || null,
              address: updatedPost.address,
              latitude: updatedPost.latitude,
              longitude: updatedPost.longitude,
              tagged_friends: updatedPost.tagged_friends,
              visibility: updatedPost.visibility,
              group_id: updatedPost.group_id,
              is_edited: true,
              version: updatedPost.version ?? (item.version ? item.version + 1 : 1),
              updated_at: updatedPost.updated_at || new Date().toISOString(),
            };
          }
          return item;
        })
      );
      onShowToast?.("success", "Chỉnh sửa bài viết thành công!");
      setEditingPost(null);
      onRefreshPosts?.();
    }
  };

  // Cập nhật sau khi xoá thành công (Màn 3/5 -> Màn 4/5)
  const handleDeleteSuccess = (deletedPostId: string) => {
    setLocalPosts((prev) => prev.filter((item) => item.post_id !== deletedPostId));
    setDeletingPost(null);
    onShowToast?.("success", "Đã xoá bài viết thành công.");
    onRefreshPosts?.();
  };

  // Báo cáo bài viết cho bài người khác
  const handleReportPost = (_post: PostItem) => {
    setActiveMenuPostId(null);
    onShowToast?.("success", "Đã ghi nhận báo cáo bài viết của bạn.");
  };

  return (
    <div className="profile-timeline-layout">
      {/* =================================================================== */}
      {/* CỘT TRÁI: ẢNH BÌA – AVATAR */}
      {/* =================================================================== */}
      <aside className="col-left-profile">
        {profileLoading ? (
          <div style={{ padding: "0 0 20px" }}>
            {/* Skeleton ảnh bìa xám */}
            <div className="skeleton-box" style={{ width: "100%", height: "106px" }} />
            {/* Skeleton avatar tròn xám */}
            <div style={{ paddingLeft: "20px", marginTop: "-50px", marginBottom: "16px" }}>
              <div
                className="skeleton-box"
                style={{ width: "120px", height: "120px", borderRadius: "50%", border: "4px solid #fff" }}
              />
            </div>
            {/* 2 dòng skeleton giả */}
            <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className="skeleton-box" style={{ width: "70%", height: "20px" }} />
              <div className="skeleton-box" style={{ width: "40%", height: "14px" }} />
            </div>
          </div>
        ) : profileError ? (
          <div className="column-error-box">
            <p className="error-msg-text">Không thể tải thông tin hồ sơ. Vui lòng thử lại</p>
            <button type="button" className="btn-retry-col" onClick={onRetryProfile}>
              Tải lại
            </button>
          </div>
        ) : profile ? (
          <>
            {/* Khung ảnh bìa tỉ lệ 3:1 */}
            <div className="cover-container">
              {profile.cover_image_url ? (
                <img src={profile.cover_image_url} alt="Cover" className="cover-img" />
              ) : (
                <div className="cover-fallback" />
              )}
            </div>

            {/* Avatar 120px đè mép ảnh bìa, lệch trái */}
            <div className="avatar-wrapper">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="avatar-circle" />
              ) : (
                <div className="avatar-placeholder">{getAvatarLetter(profile.full_name)}</div>
              )}
            </div>

            {/* Thông tin bên dưới */}
            <div className="profile-user-details">
              <h2 className="user-name">{profile.full_name}</h2>
              <p className="friends-line">{profile.friends_count} bạn bè</p>

              {/* Nút Chỉnh sửa hồ sơ (Chỉ hiện ở trang của mình) */}
              {profile.is_own_profile ? (
                <button type="button" className="btn-edit-profile" onClick={onOpenEditProfile}>
                  <span>✏️</span>
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              ) : (
                <div className="empty-action-space" />
              )}
            </div>
          </>
        ) : null}
      </aside>

      {/* =================================================================== */}
      {/* CỘT GIỮA: BÀI ĐĂNG ({N}) */}
      {/* =================================================================== */}
      <main className="col-mid-posts">
        {postsLoading ? (
          <>
            <div className="skeleton-box" style={{ width: "160px", height: "24px", marginBottom: "8px" }} />
            {/* 3 thẻ giả skeleton */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton-box"
                style={{ width: "100%", height: "130px", borderRadius: "16px" }}
              />
            ))}
          </>
        ) : postsError ? (
          <div className="column-error-box">
            <p className="error-msg-text">Không thể tải bài đăng. Vui lòng thử lại</p>
            <button type="button" className="btn-retry-col" onClick={onRetryPosts}>
              Tải lại
            </button>
          </div>
        ) : posts ? (
          <>
            <h3 className="posts-header-title">BÀI ĐĂNG ({posts.total})</h3>

            {localPosts.length === 0 ? (
              <div className="empty-posts-box">
                {profile?.is_own_profile ? (
                  <>
                    <p>Bạn chưa có bài đăng nào</p>
                    <button type="button" className="btn-create-post" onClick={onNavigateToFeed}>
                      Đăng bài
                    </button>
                  </>
                ) : (
                  <p>{profile?.full_name} chưa có bài đăng nào</p>
                )}
              </div>
            ) : (
              localPosts.map((post) => {
                const isOwnPost = Boolean(profile?.is_own_profile || (profile?.user_id && post.user_id === profile.user_id));
                const thumbUrl = post.thumbnail_url || (post.media_urls && post.media_urls[0]);

                return (
                  <article
                    key={post.post_id}
                    className={`post-card ${post.is_hidden ? "is-hidden-card" : ""}`}
                  >
                    <div className="post-meta-row">
                      <div className="post-meta-main">
                        <span className="post-relative-time">{getRelativeTime(post.created_at)}</span>

                        {/* Nhãn Đã chỉnh sửa (Màn 1/5) */}
                        {post.is_edited && (
                          <span className="post-edited-tag" title="Bài viết đã qua chỉnh sửa">
                            Đã chỉnh sửa
                          </span>
                        )}

                        {post.address && (
                          <div className="post-location-tag" title={post.address}>
                            <span className="loc-bullet">•</span>
                            <svg className="loc-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="loc-text">{post.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="post-meta-actions">
                        {/* Trạng thái đã ẩn & nút hiện lại (Màn 1/5) */}
                        {post.is_hidden && (
                          <div className="post-hidden-status-badge">
                            <span className="post-hidden-tag">Đã ẩn</span>
                            {isOwnPost && (
                              <button
                                type="button"
                                className="btn-unhide-action"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickUnhide(post);
                                }}
                                disabled={actionLoadingPostId === post.post_id}
                                title="Hiện lại bài viết trên trang cá nhân"
                              >
                                {actionLoadingPostId === post.post_id ? "..." : "Hiện lại"}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Menu ba chấm ⋯ (Màn 1/5) */}
                        <div className="post-dropdown-container">
                          <button
                            type="button"
                            className="btn-post-more-menu"
                            aria-label="Tùy chọn bài viết"
                            title="Tùy chọn bài viết"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuPostId(activeMenuPostId === post.post_id ? null : post.post_id);
                            }}
                          >
                            ⋯
                          </button>

                          {activeMenuPostId === post.post_id && (
                            <div className="post-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              {isOwnPost ? (
                                <>
                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => {
                                      setActiveMenuPostId(null);
                                      setEditingPost(post);
                                    }}
                                  >
                                    <span className="dropdown-item-icon">✏️</span>
                                    <span className="dropdown-item-label">Sửa bài viết</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => handleToggleHideFromMenu(post)}
                                    disabled={actionLoadingPostId === post.post_id}
                                  >
                                    <span className="dropdown-item-icon">
                                      {post.is_hidden ? "👁️‍🗨️" : "👁️"}
                                    </span>
                                    <span className="dropdown-item-label">
                                      {post.is_hidden ? "Hiện bài viết" : "Ẩn bài viết"}
                                    </span>
                                  </button>

                                  <div className="dropdown-divider" />

                                  <button
                                    type="button"
                                    className="dropdown-item dropdown-item-danger"
                                    onClick={() => {
                                      setActiveMenuPostId(null);
                                      setDeletingPost(post);
                                    }}
                                  >
                                    <span className="dropdown-item-icon">🗑️</span>
                                    <span className="dropdown-item-label">Xoá bài viết</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="dropdown-item dropdown-item-report"
                                  onClick={() => handleReportPost(post)}
                                >
                                  <span className="dropdown-item-icon">🚩</span>
                                  <span className="dropdown-item-label">Báo cáo bài viết</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="post-body-flex">
                      <p className="post-content-text">{renderContentWithHashtags(post.content)}</p>
                      {thumbUrl && (
                        <img
                          src={resolveMediaUrl(thumbUrl)}
                          alt="Thumbnail"
                          className="post-thumb-img"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>

                    <div className="post-footer-stats">
                      {post.reactions_count} cảm xúc · {post.comments_count} bình luận
                    </div>
                  </article>
                );
              })
            )}

            {/* Nút Xem thêm */}
            {posts.has_more && (
              <div className="load-more-section">
                <button
                  type="button"
                  className="btn-load-more"
                  onClick={onLoadMorePosts}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Đang tải..." : "Xem thêm"}
                </button>
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* =================================================================== */}
      {/* CỘT PHẢI: GIỚI THIỆU */}
      {/* =================================================================== */}
      <aside className="col-right-intro">
        {profileLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="skeleton-box" style={{ width: "40%", height: "20px" }} />
            <div className="skeleton-box" style={{ width: "100%", height: "50px" }} />
            <div className="skeleton-box" style={{ width: "70%", height: "16px" }} />
            <div className="skeleton-box" style={{ width: "80%", height: "16px" }} />
          </div>
        ) : profileError ? (
          <div className="column-error-box">
            <p className="error-msg-text">Không thể tải thông tin hồ sơ. Vui lòng thử lại</p>
            <button type="button" className="btn-retry-col" onClick={onRetryProfile}>
              Tải lại
            </button>
          </div>
        ) : profile ? (
          <>
            <div>
              <h3 className="intro-block-title">Giới thiệu</h3>
              <div className="bio-text">
                {profile.bio ? (
                  profile.bio
                ) : profile.is_own_profile ? (
                  <span className="empty-bio-hint">
                    Bạn chưa viết giới thiệu.
                    <span className="link-add-bio" onClick={onOpenEditProfile}>
                      Thêm giới thiệu
                    </span>
                  </span>
                ) : (
                  <span className="empty-bio-hint">Chưa có giới thiệu</span>
                )}
              </div>
            </div>

            {/* Ngày tham gia */}
            <div className="info-row">
              <span className="info-label">Tham gia từ:</span>
              <span className="info-val">{formatDate(profile.activated_at)}</span>
            </div>

            {/* Cấp Công dân Xanh */}
            <div className="info-row">
              <span className="info-label">Cấp Công dân Xanh:</span>
              <span className="level-pill-badge" onClick={onOpenPassport} title="Xem Green Passport">
                {profile.current_level?.level_name || "Mầm Xanh"}
              </span>
            </div>

            {/* Huy hiệu nổi bật (Tối đa 3 biểu tượng + {N}) */}
            <div className="highlight-badges-section">
              <div className="badges-label-row">Huy hiệu nổi bật</div>
              <div className="badges-list-flex">
                {profile.highlight_badges.length > 0 ? (
                  <>
                    {profile.highlight_badges.map((b) => (
                      <div
                        key={b.badge_id}
                        className="badge-icon-item"
                        title={b.name}
                        onClick={onOpenPassport}
                      >
                        <img src={b.icon_url} alt={b.name} />
                      </div>
                    ))}
                    {profile.total_badges_count > 3 && (
                      <span className="badges-extra-pill" onClick={onOpenPassport}>
                        +{profile.total_badges_count - 3}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="no-badges-text">Chưa có huy hiệu nào</span>
                )}
              </div>
            </div>

            {/* 2 Liên kết điều hướng sang Màn 2 & Màn 3 */}
            <div className="intro-links-group">
              <div className="intro-nav-link" onClick={onOpenPassport}>
                <span>🎫</span>
                <span>Green Passport & huy hiệu</span>
              </div>
              <div className="intro-nav-link" onClick={onOpenHistory}>
                <span>📜</span>
                <span>Lịch sử đóng góp</span>
              </div>
            </div>
          </>
        ) : null}
      </aside>

      {/* =================================================================== */}
      {/* CÁC POPUP MODAL CHỨC NĂNG 13 (MÀN 2/5, 3/5, 4/5, 5/5) */}
      {/* =================================================================== */}
      {/* Modal Sửa bài viết (Màn 2/5) */}
      {editingPost && (
        <EditPostModal
          isOpen={Boolean(editingPost)}
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Modal Xoá bài viết & Thông báo đã xoá (Màn 3/5 & Màn 4/5) */}
      {deletingPost && (
        <DeletePostModal
          isOpen={Boolean(deletingPost)}
          post={deletingPost}
          onClose={() => setDeletingPost(null)}
          onDeleted={handleDeleteSuccess}
        />
      )}

      {/* Modal Thông báo Đã ẩn & Đếm ngược hoàn tác 5s (Màn 5/5) */}
      {hidingPost && (
        <HidePostModal
          isOpen={Boolean(hidingPost)}
          post={hidingPost}
          onClose={() => setHidingPost(null)}
          onUndoSuccess={handleUndoSuccess}
          onConfirmedHidden={() => setHidingPost(null)}
        />
      )}
    </div>
  );
};
