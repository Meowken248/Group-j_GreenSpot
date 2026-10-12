/**
 * FeedPostCard (Thẻ bài viết mạng xã hội chuẩn Facebook/Threads)
 * Tích hợp STT 08 (Khoảng cách GPS), STT 10 (Eco-Reactions), STT 13 (Sửa/Xóa/Ẩn), STT 14 (Bình luận/Chia sẻ)
 */

import React, { useState } from "react";
import type { FeedPostItem } from "../types/feed.types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface FeedPostCardProps {
  post: FeedPostItem;
  currentUserId?: string | null;
  onEditPost?: (post: FeedPostItem) => void;
  onHidePost?: (post: FeedPostItem) => void;
  onDeletePost?: (post: FeedPostItem) => void;
  onReactPost?: (postId: string, reactionType: string) => void;
  onShowToast?: (type: "success" | "error" | "info", msg: string) => void;
}

const ECO_REACTIONS = [
  { type: "TREE", label: "Cây xanh", emoji: "🌲", tooltip: "Tán thành làm sạch/trồng cây" },
  { type: "EARTH", label: "Trái đất", emoji: "🌍", tooltip: "Yêu thiên nhiên, sống xanh" },
  { type: "RECYCLE", label: "Tái chế", emoji: "♻️", tooltip: "Đánh giá cao phân loại rác" },
  { type: "CHEER", label: "Cổ vũ", emoji: "👏", tooltip: "Động viên tình nguyện viên" },
  { type: "CONCERN", label: "Lo ngại", emoji: "⚠️", tooltip: "Cảnh báo ô nhiễm nghiêm trọng" },
];

export const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  currentUserId,
  onEditPost,
  onHidePost,
  onDeletePost,
  onReactPost,
  onShowToast,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(
    post.user_reaction || null
  );
  const [reactionsCount, setReactionsCount] = useState<number>(post.reactions_count || 0);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentsList, setCommentsList] = useState<Array<{ id: string; author: string; text: string; time: string }>>([]);

  const isOwnPost = Boolean(currentUserId && post.user_id === currentUserId);

  // Tính thời gian hiển thị tương đối
  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return "Vừa xong";
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} ngày trước`;
      return new Date(isoString).toLocaleDateString("vi-VN");
    } catch {
      return "Gần đây";
    }
  };

  // Xử lý highlight hashtag trong nội dung
  const renderContentWithHashtags = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9À-ỹ_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        return (
          <span key={i} className="hashtag-highlight">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Thả cảm xúc
  const handleSelectReaction = (type: string) => {
    if (selectedReaction === type) {
      // Bỏ reaction
      setSelectedReaction(null);
      setReactionsCount((prev) => Math.max(0, prev - 1));
    } else {
      // Đổi hoặc thêm reaction mới
      if (!selectedReaction) {
        setReactionsCount((prev) => prev + 1);
      }
      setSelectedReaction(type);
    }
    setShowReactionPicker(false);
    if (onReactPost) {
      onReactPost(post.post_id, type);
    }
    if (onShowToast) {
      onShowToast("success", "Đã ghi nhận cảm xúc sinh thái (+5 Green Points)!");
    }
  };

  // Chia sẻ bài viết
  const handleShare = () => {
    const url = `${window.location.origin}/#/posts?id=${post.post_id}`;
    navigator.clipboard?.writeText(url);
    if (onShowToast) {
      onShowToast("success", "Đã sao chép liên kết bài viết vào bộ nhớ tạm!");
    }
  };

  // Gửi bình luận nhanh
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newComment = {
      id: `${Date.now()}`,
      author: "Bạn",
      text: commentText.trim(),
      time: "Vừa xong",
    };
    setCommentsList((prev) => [newComment, ...prev]);
    setCommentText("");
    if (onShowToast) {
      onShowToast("success", "Đã gửi bình luận của bạn!");
    }
  };

  const authorName = post.author?.full_name || "Công dân sinh thái";
  const authorAvatar = post.author?.avatar_url;

  return (
    <article className="feed-post-card">
      {/* =================================================================== */}
      {/* 1. HEADER: TÁC GIẢ, CỰ LY GPS, THỜI GIAN, MENU */}
      {/* =================================================================== */}
      <div className="post-header-row">
        <div className="post-author-block">
          <div className="author-avatar-wrapper">
            {authorAvatar ? (
              <img
                src={resolveMediaUrl(authorAvatar)}
                alt={authorName}
                className="author-avatar-img"
              />
            ) : (
              <div className="author-avatar-fallback">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="author-meta-info">
            <div className="author-name-row">
              <span className="author-name">{authorName}</span>

              {/* Bạn bè được gắn thẻ */}
              {post.tagged_friends && post.tagged_friends.length > 0 && (
                <span className="tagged-friends-summary">
                  {" "}cùng với{" "}
                  <strong>{post.tagged_friends[0].full_name}</strong>
                  {post.tagged_friends.length > 1 && (
                    <span> và {post.tagged_friends.length - 1} người khác</span>
                  )}
                </span>
              )}
            </div>

            <div className="post-sub-meta">
              <span className="post-time">{getRelativeTime(post.created_at)}</span>

              {/* Nhãn Đã chỉnh sửa (STT 13) */}
              {post.is_edited && (
                <span className="post-edited-badge" title="Bài viết đã qua chỉnh sửa">
                  • Đã chỉnh sửa
                </span>
              )}

              {/* Nhãn khoảng cách GPS thực tế (STT 08 Màn 1) */}
              {post.distance_text && (
                <span className="post-distance-badge" title={`Khoảng cách từ bạn đến địa điểm này`}>
                  <span className="dist-icon">📍</span>
                  <span className="dist-text">{post.distance_text}</span>
                </span>
              )}
            </div>

            {/* Địa chỉ địa lý */}
            {post.address && (
              <div className="post-address-line" title={post.address}>
                <span className="address-pin-icon">📌</span>
                <span className="address-text">{post.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Menu thao tác 3 chấm (STT 13) */}
        <div className="post-actions-menu-wrapper">
          <button
            type="button"
            className="btn-post-menu-trigger"
            aria-label="Tuỳ chọn bài viết"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            ⋯
          </button>

          {showMenu && (
            <div className="post-menu-dropdown" onClick={(e) => e.stopPropagation()}>
              {isOwnPost ? (
                <>
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      onEditPost?.(post);
                    }}
                  >
                    <span className="item-icon">✏️</span>
                    <span className="item-text">Sửa bài viết</span>
                  </button>

                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      onHidePost?.(post);
                    }}
                  >
                    <span className="item-icon">{post.is_hidden ? "👁️‍🗨️" : "👁️"}</span>
                    <span className="item-text">{post.is_hidden ? "Hiện bài viết" : "Ẩn bài viết"}</span>
                  </button>

                  <div className="menu-divider" />

                  <button
                    type="button"
                    className="menu-item text-danger"
                    onClick={() => {
                      setShowMenu(false);
                      onDeletePost?.(post);
                    }}
                  >
                    <span className="item-icon">🗑️</span>
                    <span className="item-text">Xóa bài viết</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="menu-item text-danger"
                  onClick={() => {
                    setShowMenu(false);
                    onShowToast?.("info", "Đã gửi báo cáo bài viết đến ban quản trị!");
                  }}
                >
                  <span className="item-icon">🚩</span>
                  <span className="item-text">Báo cáo vi phạm</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. BODY: NỘI DUNG CHỮ & ĐA PHƯƠNG TIỆN (MOSAIC MEDIA GRID) */}
      {/* =================================================================== */}
      <div className="post-body-content">
        <p className="post-text-paragraph">
          {renderContentWithHashtags(post.content)}
        </p>

        {/* Media Grid */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className={`post-media-grid count-${Math.min(post.media_urls.length, 5)}`}>
            {post.media_urls.slice(0, 5).map((media, idx) => {
              const isVideo =
                media.media_type === "VIDEO" ||
                media.url.toLowerCase().endsWith(".mp4") ||
                media.url.toLowerCase().endsWith(".mov");

              return (
                <div key={idx} className={`media-item-box item-${idx + 1}`}>
                  {isVideo ? (
                    <video
                      src={resolveMediaUrl(media.url)}
                      controls
                      className="feed-video-player"
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={resolveMediaUrl(media.url)}
                      alt={`Ảnh ${idx + 1}`}
                      className="feed-image-preview"
                      loading="lazy"
                    />
                  )}
                  {post.media_urls.length > 5 && idx === 4 && (
                    <div className="media-more-overlay">
                      +{post.media_urls.length - 5}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 3. FOOTER: CHỈ SỐ TƯƠNG TÁC & THANH ECO-REACTIONS, BÌNH LUẬN, CHIA SẺ */}
      {/* =================================================================== */}
      <div className="post-stats-row">
        <div className="stats-reactions">
          <span className="reaction-emojis-cluster">🌲🌍♻️</span>
          <span className="stats-number">{reactionsCount} cảm xúc</span>
        </div>
        <div className="stats-comments">
          <span>{post.comments_count + commentsList.length} bình luận</span>
        </div>
      </div>

      <div className="post-interaction-divider" />

      <div className="post-actions-bar">
        {/* Nút Cảm xúc sinh thái (STT 10) */}
        <div
          className="reaction-button-container"
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
        >
          {showReactionPicker && (
            <div className="eco-reactions-popover">
              {ECO_REACTIONS.map((rec) => (
                <button
                  key={rec.type}
                  type="button"
                  className={`reaction-pop-item ${selectedReaction === rec.type ? "selected" : ""}`}
                  title={`${rec.label}: ${rec.tooltip}`}
                  onClick={() => handleSelectReaction(rec.type)}
                >
                  <span className="pop-emoji">{rec.emoji}</span>
                  <span className="pop-label">{rec.label}</span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className={`btn-feed-action reaction-trigger-btn ${selectedReaction ? "active" : ""}`}
            onClick={() => handleSelectReaction(selectedReaction || "TREE")}
          >
            <span className="action-icon">
              {selectedReaction
                ? ECO_REACTIONS.find((r) => r.type === selectedReaction)?.emoji || "🌲"
                : "🌱"}
            </span>
            <span className="action-label">
              {selectedReaction
                ? ECO_REACTIONS.find((r) => r.type === selectedReaction)?.label || "Đã thả"
                : "Cảm xúc"}
            </span>
          </button>
        </div>

        {/* Nút Bình luận (STT 14) */}
        <button
          type="button"
          className="btn-feed-action comment-trigger-btn"
          onClick={() => setShowCommentBox(!showCommentBox)}
        >
          <span className="action-icon">💬</span>
          <span className="action-label">Bình luận</span>
        </button>

        {/* Nút Chia sẻ (STT 14) */}
        <button
          type="button"
          className="btn-feed-action share-trigger-btn"
          onClick={handleShare}
        >
          <span className="action-icon">↗️</span>
          <span className="action-label">Chia sẻ</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 4. INLINE COMMENT BOX (STT 14) */}
      {/* =================================================================== */}
      {showCommentBox && (
        <div className="post-comment-section">
          <form onSubmit={handleSendComment} className="comment-input-form">
            <input
              type="text"
              placeholder="Viết bình luận sinh thái của bạn..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="comment-text-input"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="btn-send-comment"
            >
              Gửi
            </button>
          </form>

          {commentsList.length > 0 && (
            <div className="comments-stream">
              {commentsList.map((c) => (
                <div key={c.id} className="comment-bubble-item">
                  <span className="comment-author-name">{c.author}:</span>
                  <span className="comment-body-text">{c.text}</span>
                  <span className="comment-time-badge">{c.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
