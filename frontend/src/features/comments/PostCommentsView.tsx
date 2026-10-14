import React, { useState, useEffect, useCallback, useRef } from "react";
import type { FeedPostItem } from "../feed/types/feed.types";
import type { CommentItem, ReplyItem } from "./types/commentTypes";
import { commentService } from "./services/commentService";
import { PostSummaryHeader } from "./components/PostSummaryHeader";
import { CommentItemRow } from "./components/CommentItemRow";
import { StickyCommentInputBar } from "./components/StickyCommentInputBar";
import { LoginPromptModal } from "./components/LoginPromptModal";
import { SharePostModal } from "./components/SharePostModal";
import { AUTH_STORAGE_KEYS } from "../auth/types/auth.types";
import "./styles/PostComments.scss";
import "./styles/ShareModal.scss";

interface PostCommentsViewProps {
  post: FeedPostItem;
  onBackToFeed: () => void;
  onNavigateLogin?: () => void;
  onPostUpdated?: (updatedPost: FeedPostItem) => void;
}

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export const PostCommentsView: React.FC<PostCommentsViewProps> = ({
  post,
  onBackToFeed,
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
  const [totalComments, setTotalComments] = useState<number>(
    post.comments_count || 0
  );
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 3. Quản lý việc gửi bình luận mới
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [inputErrorMessage, setInputErrorMessage] = useState<string | null>(null);

  // 4. Quản lý Modal & Toasts
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

  // Bộ đếm lùi Cooldown chống spam
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Tải danh sách bình luận ban đầu
  const fetchComments = useCallback(async () => {
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
        setTimeout(() => {
          onBackToFeed();
        }, 1800);
      } else {
        setFetchError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [post.post_id, onBackToFeed, showToast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Tải thêm 10 bình luận mỗi lần (Màn 1)
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

  // Gửi bình luận cấp 1 (Màn 1)
  const handleSubmitMainComment = async (content: string): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      setInputErrorMessage(null);

      const newComment = await commentService.createComment(post.post_id, content);

      // Bình luận mới chèn lên đầu danh sách (Màn 1 SRS)
      setComments((prev) => [newComment, ...prev]);
      const newTotal = totalComments + 1;
      setTotalComments(newTotal);

      // Kích hoạt cooldown 3s chống spam
      setCooldownSeconds(3);

      // Cập nhật lên post cha
      onPostUpdated?.({
        ...post,
        comments_count: newTotal,
      });

      // Cuộn nhẹ lên đầu danh sách
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
        setTimeout(() => onBackToFeed(), 1500);
      } else {
        setInputErrorMessage(msg);
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Callback khi trả lời bình luận thành công (Màn 2)
  const handleReplySuccess = (parentCommentId: string, _newReply: ReplyItem) => {
    const newTotal = totalComments + 1;
    setTotalComments(newTotal);

    // Tăng replies_count của comment cha
    setComments((prev) =>
      prev.map((c) =>
        c.comment_id === parentCommentId
          ? { ...c, replies_count: c.replies_count + 1 }
          : c
      )
    );

    // Kích hoạt cooldown
    setCooldownSeconds(3);

    onPostUpdated?.({
      ...post,
      comments_count: newTotal,
    });
  };

  // Xử lý chia sẻ thành công (Màn 3)
  const handleShareSuccess = (message: string) => {
    showToast("success", message);
    const newShares = (post.shares_count || 0) + 1;
    onPostUpdated?.({
      ...post,
      shares_count: newShares,
    });
  };

  return (
    <div className="post-comments-view-layout">
      {/* =================================================================== */}
      {/* TOAST NOTIFICATION CONTAINER */}
      {/* =================================================================== */}
      <div className="comments-toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`comment-toast ${t.type}`}>
            <span className="toast-icon">
              {t.type === "success" ? "✅" : t.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            <span className="toast-text">{t.message}</span>
          </div>
        ))}
      </div>

      <div className="post-comments-main-container">
        {/* ================================================================= */}
        {/* KHU VỰC PHÍA TRÊN: BÀI VIẾT TÓM TẮT (SRS MÀN 1) */}
        {/* ================================================================= */}
        <PostSummaryHeader
          post={post}
          commentsCount={totalComments}
          onBackToFeed={onBackToFeed}
          onOpenShareModal={() => setShowShareModal(true)}
          onShowToast={showToast}
        />

        {/* ================================================================= */}
        {/* KHU VỰC PHÍA DƯỚI: KHU VỰC BÌNH LUẬN (SRS MÀN 1 & MÀN 2) */}
        {/* ================================================================= */}
        <section className="comments-stream-section" aria-label="Khu vực bình luận">
          {/* Tiêu đề kèm tổng số bình luận */}
          <div className="comments-section-header" ref={commentsListTopRef}>
            <h2 className="comments-heading">
              Bình luận <span className="counter-pill">({totalComments})</span>
            </h2>
            <span className="sort-hint">Sắp xếp: Mới nhất trước</span>
          </div>

          {/* Trạng thái tải dữ liệu */}
          {isLoading ? (
            <div className="comments-loading-skeleton">
              <div className="skeleton-avatar" />
              <div className="skeleton-lines">
                <div className="skeleton-line short" />
                <div className="skeleton-line full" />
              </div>
            </div>
          ) : fetchError ? (
            <div className="comments-error-state">
              <p>⚠️ {fetchError}</p>
              <button
                type="button"
                className="btn-retry-fetch"
                onClick={fetchComments}
              >
                Thử lại
              </button>
            </div>
          ) : comments.length === 0 ? (
            /* Khối trống theo đặc tả SRS Màn 1: "Chưa có bình luận nào. Hãy là người đầu tiên!" */
            <div className="comments-empty-state-card">
              <div className="empty-bubble-icon">💬</div>
              <h3 className="empty-state-title">Chưa có bình luận nào. Hãy là người đầu tiên!</h3>
              <p className="empty-state-desc">
                Chia sẻ ý kiến hoặc đóng góp giải pháp sinh thái của bạn dưới bài viết này.
              </p>
            </div>
          ) : (
            /* Danh sách bình luận cấp 1 + replies */
            <div className="comments-items-list">
              {comments.map((comment) => (
                <CommentItemRow
                  key={comment.comment_id}
                  comment={comment}
                  isLoggedIn={isLoggedIn}
                  onRequireLogin={() => setShowLoginPrompt(true)}
                  onReplySuccess={handleReplySuccess}
                  onShowToast={showToast}
                />
              ))}

              {/* Nút Xem thêm (Tải 10 bình luận mỗi lần - Màn 1 SRS) */}
              {hasMore && (
                <div className="load-more-comments-wrapper">
                  <button
                    type="button"
                    className="btn-load-more-comments"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? "Đang tải thêm..." : "Xem thêm bình luận"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ================================================================= */}
        {/* Ô NHẬP BÌNH LUẬN CỐ ĐỊNH Ở CUỐI KHU (STICKY BOTTOM BAR) */}
        {/* ================================================================= */}
        <StickyCommentInputBar
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          isSubmitting={isSubmitting}
          cooldownSeconds={cooldownSeconds}
          errorMessage={inputErrorMessage}
          onRequireLogin={() => setShowLoginPrompt(true)}
          onSubmitComment={handleSubmitMainComment}
        />
      </div>

      {/* =================================================================== */}
      {/* POPUP NHẮC ĐĂNG NHẬP (SRS MÀN 1) */}
      {/* =================================================================== */}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onNavigateLogin={() => {
          setShowLoginPrompt(false);
          onNavigateLogin?.();
        }}
      />

      {/* =================================================================== */}
      {/* POPUP CHIA SẺ BÀI VIẾT (SRS MÀN 3) */}
      {/* =================================================================== */}
      <SharePostModal
        isOpen={showShareModal}
        postId={post.post_id}
        onClose={() => setShowShareModal(false)}
        onShareSuccess={handleShareSuccess}
        onShowToast={showToast}
      />
    </div>
  );
};
