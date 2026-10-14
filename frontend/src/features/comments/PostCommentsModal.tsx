import React, { useState, useEffect, useCallback, useRef } from "react";
import type { FeedPostItem } from "../feed/types/feed.types";
import type { CommentItem, ReplyItem } from "./types/commentTypes";
import { commentService } from "./services/commentService";
import { CommentItemRow } from "./components/CommentItemRow";
import { StickyCommentInputBar } from "./components/StickyCommentInputBar";
import { LoginPromptModal } from "./components/LoginPromptModal";
import { SharePostModal } from "./components/SharePostModal";
import { AUTH_STORAGE_KEYS } from "../auth/types/auth.types";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import "./styles/PostCommentsModal.scss";
import "./styles/ShareModal.scss";

interface PostCommentsModalProps {
  isOpen: boolean;
  post: FeedPostItem;
  onClose: () => void;
  onNavigateLogin?: () => void;
  onPostUpdated?: (updatedPost: FeedPostItem) => void;
}

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export const PostCommentsModal: React.FC<PostCommentsModalProps> = ({
  isOpen,
  post,
  onClose,
  onNavigateLogin,
  onPostUpdated,
}) => {
  // 1. Quản lý trạng thái đăng nhập
  const [currentUser] = useState<any>(() => {
    try {
      const userStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  const isLoggedIn = Boolean(
    currentUser && localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
  );

  // 2. Dữ liệu danh sách bình luận
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [totalComments, setTotalComments] = useState<number>(post.comments_count || 0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 3. Quản lý việc gửi bình luận mới
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [inputErrorMessage, setInputErrorMessage] = useState<string | null>(null);

  // 4. Quản lý Modal phụ & Toasts
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const commentsListTopRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback(
    (type: "success" | "error" | "info", message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  // Nhấn phím Escape để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Bộ đếm lùi Cooldown chống spam
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Tải danh sách bình luận
  const fetchComments = useCallback(async () => {
    if (!isOpen) return;
    try {
      setIsLoading(true);
      setFetchError(null);
      const res = await commentService.getPostComments(post.post_id, 1, 10);
      setComments(res.items);
      setTotalComments(res.total);
      setHasMore(res.has_more);
      setPage(1);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Không thể tải bình luận";
      if (msg.includes("Bài viết không còn tồn tại")) {
        showToast("error", "Bài viết không còn tồn tại");
        setTimeout(() => onClose(), 1800);
      } else {
        setFetchError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, post.post_id, onClose, showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, fetchComments]);

  // Tải thêm bình luận
  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const res = await commentService.getPostComments(post.post_id, nextPage, 10);
      setComments((prev) => [...prev, ...res.items]);
      setHasMore(res.has_more);
      setPage(nextPage);
    } catch {
      showToast("error", "Không thể tải thêm bình luận");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Gửi bình luận cấp 1
  const handleSubmitMainComment = async (content: string): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      setInputErrorMessage(null);

      const newComment = await commentService.createComment(post.post_id, content);
      setComments((prev) => [newComment, ...prev]);
      const newTotal = totalComments + 1;
      setTotalComments(newTotal);
      setCooldownSeconds(3);

      onPostUpdated?.({
        ...post,
        comments_count: newTotal,
      });

      if (commentsListTopRef.current) {
        commentsListTopRef.current.scrollIntoView({ behavior: "smooth" });
      }

      return true;
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.detail || "Không thể gửi bình luận";

      if (status === 429 || msg.includes("quá nhanh")) {
        setInputErrorMessage("Bạn bình luận quá nhanh. Vui lòng thử lại sau ít giây");
        setCooldownSeconds(3);
      } else if (msg.includes("Bài viết không còn tồn tại")) {
        showToast("error", "Bài viết không còn tồn tại");
        setTimeout(() => onClose(), 1500);
      } else {
        setInputErrorMessage(msg);
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Callback trả lời bình luận
  const handleReplySuccess = (parentCommentId: string, _newReply: ReplyItem) => {
    const newTotal = totalComments + 1;
    setTotalComments(newTotal);

    setComments((prev) =>
      prev.map((c) =>
        c.comment_id === parentCommentId
          ? { ...c, replies_count: c.replies_count + 1 }
          : c
      )
    );

    setCooldownSeconds(3);
    onPostUpdated?.({
      ...post,
      comments_count: newTotal,
    });
  };

  if (!isOpen) return null;

  const authorName = post.author?.full_name || "Công dân";

  return (
    <div className="fb-comments-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fb-comments-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* ================================================================= */}
        {/* MODAL HEADER: BÀI VIẾT CỦA [TÊN TÁC GIẢ] + CLOSE BTN (ẢNH 4) */}
        {/* ================================================================= */}
        <div className="comments-modal-header">
          <div className="modal-title-wrap">
            <h3 className="modal-title">Bài viết của {authorName}</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Đóng (Esc)"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* TOAST CONTAINER */}
        {toasts.length > 0 && (
          <div className="comments-modal-toast-bar">
            {toasts.map((t) => (
              <span key={t.id} className={`toast-chip ${t.type}`}>
                {t.type === "success" ? "✓" : "!"} {t.message}
              </span>
            ))}
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL BODY (SCROLLABLE CONTENT) */}
        {/* ================================================================= */}
        <div className="comments-modal-scroll-body">
          {/* 1. Phần tóm tắt bài viết */}
          <div className="post-summary-card">
            <div className="summary-author-row">
              <div className="author-avatar-circle">
                {post.author?.avatar_url ? (
                  <img src={resolveMediaUrl(post.author.avatar_url)} alt={authorName} />
                ) : (
                  <span>{authorName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="author-text-meta">
                <span className="author-fullname">{authorName}</span>
                <span className="post-time-meta">
                  {new Date(post.created_at).toLocaleDateString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                  {post.address && ` • ${post.address}`}
                </span>
              </div>
            </div>

            {post.content && <p className="summary-post-content">{post.content}</p>}

            {/* Ảnh hoặc video bài viết */}
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="summary-media-gallery">
                {post.media_urls.slice(0, 4).map((m, idx) => (
                  <div key={idx} className="summary-media-item">
                    {m.media_type === "VIDEO" ? (
                      <video src={resolveMediaUrl(m.url)} controls preload="metadata" />
                    ) : (
                      <img src={resolveMediaUrl(m.url)} alt={`Media ${idx + 1}`} loading="lazy" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Chỉ số tương tác */}
            <div className="summary-stats-bar">
              <span className="stats-item reactions">
                🌲 {post.reactions_count || 0}
              </span>
              <span className="stats-item comments">
                💬 {totalComments} bình luận
              </span>
              {(post.shares_count || 0) > 0 && (
                <span className="stats-item shares">
                  ↗️ {post.shares_count} chia sẻ
                </span>
              )}
            </div>
          </div>

          <div className="comments-divider" />

          {/* 2. Tiêu đề bình luận & bộ lọc */}
          <div className="comments-stream-header" ref={commentsListTopRef}>
            <div className="stream-title">
              <h4>Bình luận ({totalComments})</h4>
            </div>
            <div className="stream-filter-badge">
              <span>Phù hợp nhất ▾</span>
            </div>
          </div>

          {/* 3. Danh sách bình luận */}
          <div className="comments-stream-list">
            {isLoading ? (
              <div className="comments-loading-placeholder">
                <div className="skeleton-comment" />
                <div className="skeleton-comment" />
              </div>
            ) : fetchError ? (
              <div className="comments-error-banner">
                <span>⚠️ {fetchError}</span>
                <button type="button" onClick={fetchComments} className="btn-retry">
                  Thử lại
                </button>
              </div>
            ) : comments.length === 0 ? (
              <div className="comments-empty-notice">
                <span className="empty-leaf">🌱</span>
                <p>Hãy là người đầu tiên bình luận về bài viết này!</p>
              </div>
            ) : (
              <>
                {comments.map((comment) => (
                  <CommentItemRow
                    key={comment.comment_id}
                    comment={comment}
                    isLoggedIn={isLoggedIn}
                    onReplySuccess={handleReplySuccess}
                    onRequireLogin={() => setShowLoginPrompt(true)}
                    onShowToast={showToast}
                  />
                ))}

                {hasMore && (
                  <div className="load-more-comments-wrap">
                    <button
                      type="button"
                      className="btn-load-more-comments"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? "Đang tải thêm..." : "Xem thêm các bình luận trước"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* STICKY BOTTOM COMMENT INPUT BAR (STYLE FACEBOOK) */}
        {/* ================================================================= */}
        <div className="comments-modal-footer">
          {inputErrorMessage && (
            <div className="footer-error-bubble">
              <span>⚠️ {inputErrorMessage}</span>
            </div>
          )}

          <StickyCommentInputBar
            currentUser={currentUser}
            isLoggedIn={isLoggedIn}
            isSubmitting={isSubmitting}
            cooldownSeconds={cooldownSeconds}
            errorMessage={inputErrorMessage}
            onSubmitComment={handleSubmitMainComment}
            onRequireLogin={() => setShowLoginPrompt(true)}
          />
        </div>
      </div>

      {/* MODAL PHỤ: YÊU CẦU ĐĂNG NHẬP (STT 02) */}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onNavigateLogin={() => {
          setShowLoginPrompt(false);
          onClose();
          onNavigateLogin?.();
        }}
      />

      {/* MODAL PHỤ: CHIA SẺ BÀI VIẾT (STT 14 MÀN 3) */}
      {showShareModal && (
        <SharePostModal
          isOpen={showShareModal}
          postId={post.post_id}
          postContent={post.content}
          authorName={post.author?.full_name}
          onClose={() => setShowShareModal(false)}
          onShareSuccess={(msg) => {
            showToast("success", msg);
            onPostUpdated?.({
              ...post,
              shares_count: (post.shares_count || 0) + 1,
            });
          }}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};
