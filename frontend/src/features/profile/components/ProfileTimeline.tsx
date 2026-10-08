import React from "react";
import type { UserProfile, PostListResponse } from "../types/profile.types";

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

            {posts.items.length === 0 ? (
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
              posts.items.map((post) => (
                <article key={post.post_id} className="post-card">
                  <div className="post-meta-row">
                    <span className="post-relative-time">{getRelativeTime(post.created_at)}</span>
                    {/* Nhãn xám 'Đã ẩn' (chỉ hiện cho chủ trang) */}
                    {post.is_hidden && <span className="post-hidden-tag">Đã ẩn</span>}
                  </div>

                  <div className="post-body-flex">
                    <p className="post-content-text">{post.content}</p>
                    {post.thumbnail_url && (
                      <img src={post.thumbnail_url} alt="Thumbnail" className="post-thumb-img" />
                    )}
                  </div>

                  <div className="post-footer-stats">
                    {post.reactions_count} cảm xúc · {post.comments_count} bình luận
                  </div>
                </article>
              ))
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
    </div>
  );
};
