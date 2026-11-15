import React, { useState } from "react";
import type { FeedPostItem } from "../../feed/types/feed.types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface PostSummaryHeaderProps {
  post: FeedPostItem;
  commentsCount: number;
  onBackToFeed: () => void;
  onOpenShareModal: () => void;
  onShowToast: (type: "success" | "error" | "info", msg: string) => void;
}

export const PostSummaryHeader: React.FC<PostSummaryHeaderProps> = ({
  post,
  commentsCount,
  onBackToFeed,
  onOpenShareModal,
  onShowToast,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const authorName = post.author?.full_name || "Công dân sinh thái";
  const authorAvatar = post.author?.avatar_url;

  // Lấy ảnh đầu tiên của bài viết nếu có
  const firstImage = post.media_urls?.find(
    (m) => m.media_type === "IMAGE" || !m.media_type
  )?.url || post.thumbnail_url;

  // Xử lý rút gọn nội dung (nếu > 160 ký tự)
  const isLongContent = (post.content || "").length > 160;
  const displayContent = !isLongContent || isExpanded
    ? post.content
    : `${post.content.slice(0, 160)}...`;

  const handleShareClick = () => {
    // Kiểm tra Quyền riêng tư theo đặc tả SRS Màn 3
    const vis = (post.visibility || "PUBLIC").toUpperCase();
    if (vis === "ONLY_ME" || vis === "PRIVATE" || vis === "FRIENDS") {
      onShowToast("error", "Bài viết này không thể chia sẻ");
      return;
    }
    onOpenShareModal();
  };

  const isShareDisabled =
    post.visibility === "ONLY_ME" ||
    post.visibility === "PRIVATE" ||
    post.visibility === "FRIENDS";

  return (
    <section className="post-summary-card" aria-label="Tóm tắt bài viết">
      {/* Nút quay về Bảng tin */}
      <div className="summary-nav-bar">
        <button
          type="button"
          className="btn-back-feed"
          onClick={onBackToFeed}
          title="Quay về bảng tin Geo-Feed"
        >
          <span className="back-arrow">←</span>
          <span>Quay về bảng tin</span>
        </button>

        <div className="summary-badges-group">
          {post.visibility === "PUBLIC" && (
            <span className="post-privacy-badge public" title="Công khai">
              🌍 Công khai
            </span>
          )}
          {post.visibility === "FRIENDS" && (
            <span className="post-privacy-badge friends" title="Chỉ bạn bè">
              👥 Bạn bè
            </span>
          )}
          {(post.visibility === "ONLY_ME" || post.visibility === "PRIVATE") && (
            <span className="post-privacy-badge private" title="Chỉ mình tôi">
              🔒 Chỉ mình tôi
            </span>
          )}
          {post.distance_text && (
            <span className="post-distance-badge" title="Khoảng cách thực tế">
              📍 {post.distance_text}
            </span>
          )}
        </div>
      </div>

      {/* Thông tin tác giả & Nội dung tóm tắt */}
      <div className="summary-body-row">
        <div className="author-avatar-col">
          {authorAvatar ? (
            <img
              src={resolveMediaUrl(authorAvatar)}
              alt={authorName}
              className="summary-avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="summary-avatar-fallback">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="summary-content-col">
          <div className="author-meta-line">
            <span className="author-name">{authorName}</span>
            <span className="post-meta-dot">•</span>
            <span className="post-date-text">
              {new Date(post.created_at).toLocaleDateString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          </div>

          {post.address && (
            <div className="post-location-tag" title={post.address}>
              <span>📌 {post.address}</span>
            </div>
          )}

          <p className="summary-text">
            {displayContent}
            {isLongContent && (
              <button
                type="button"
                className="btn-read-more"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? " Thu gọn" : " Xem thêm"}
              </button>
            )}
          </p>

          {/* Ảnh đầu tiên của bài viết (Màn 1: tên người đăng, nội dung rút gọn, ảnh đầu tiên) */}
          {firstImage && (
            <div className="summary-first-media-box">
              <img
                src={resolveMediaUrl(firstImage)}
                alt="Ảnh bài viết"
                className="summary-first-image"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer tóm tắt: Lượt tương tác & Nút chia sẻ */}
      <div className="summary-footer-bar">
        <div className="stats-counters">
          <span className="stat-item">
            💬 <strong>{commentsCount}</strong> bình luận
          </span>
          <span className="stat-separator">•</span>
          <span className="stat-item">
            ↗️ <strong>{post.shares_count || 0}</strong> chia sẻ
          </span>
        </div>

        <div className="summary-actions">
          <button
            type="button"
            className={`btn-action-share ${isShareDisabled ? "is-disabled" : ""}`}
            onClick={handleShareClick}
            title={
              isShareDisabled
                ? "Bài viết ở chế độ riêng tư hoặc bạn bè không thể chia sẻ"
                : "Chia sẻ bài viết này"
            }
          >
            <span className="action-icon">↗️</span>
            <span>Chia sẻ</span>
          </button>
        </div>
      </div>
    </section>
  );
};

