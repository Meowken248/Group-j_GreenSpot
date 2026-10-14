import React, { useState, useRef, useEffect } from "react";
import type { CommentItem, ReplyItem } from "../types/commentTypes";
import { CommentReplyItem } from "./CommentReplyItem";
import { commentService } from "../services/commentService";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface CommentItemRowProps {
  comment: CommentItem;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  onReplySuccess: (parentCommentId: string, newReply: ReplyItem) => void;
  onShowToast: (type: "success" | "error" | "info", msg: string) => void;
}

export const CommentItemRow: React.FC<CommentItemRowProps> = ({
  comment,
  isLoggedIn,
  onRequireLogin,
  onReplySuccess,
  onShowToast,
}) => {
  // Trạng thái ô nhập trả lời (Màn 2)
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyingToTarget, setReplyingToTarget] = useState<{
    name: string;
    userId?: string;
  }>({ name: comment.author.full_name, userId: comment.author.user_id });
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Danh sách replies và xem thêm
  const [repliesList, setRepliesList] = useState<ReplyItem[]>(
    comment.initial_replies || []
  );
  const [isLoadingMoreReplies, setIsLoadingMoreReplies] = useState(false);
  const [hasLoadedAllReplies, setHasLoadedAllReplies] = useState(
    comment.replies_count <= (comment.initial_replies?.length || 0)
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tự động focus vào ô nhập khi mở trả lời (Màn 2 SRS)
  useEffect(() => {
    if (showReplyBox && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showReplyBox]);

  const authorName = comment.author.full_name || "Công dân sinh thái";
  const avatarUrl = comment.author.avatar_url;

  const formatRelativeTime = (isoString: string) => {
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
      return "Vừa xong";
    }
  };

  // Kích hoạt ô nhập phản hồi
  const handleTriggerReply = (targetName: string, targetUserId?: string) => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    setReplyingToTarget({ name: targetName, userId: targetUserId });
    setShowReplyBox(true);
    setReplyError(null);
  };

  // Đóng ô nhập phản hồi
  const handleCancelReply = () => {
    setShowReplyBox(false);
    setReplyText("");
    setReplyError(null);
  };

  // Tải thêm toàn bộ câu trả lời
  const handleLoadMoreReplies = async () => {
    try {
      setIsLoadingMoreReplies(true);
      const res = await commentService.getCommentReplies(comment.comment_id);
      setRepliesList(res.items);
      setHasLoadedAllReplies(true);
    } catch {
      onShowToast("error", "Không thể tải thêm câu trả lời");
    } finally {
      setIsLoadingMoreReplies(false);
    }
  };

  // Gửi câu trả lời (Màn 2)
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

    const text = replyText.trim();
    if (!text) return;

    if (text.length > 500) {
      setReplyError("Bình luận tối đa 500 ký tự");
      return;
    }

    try {
      setIsSubmittingReply(true);
      setReplyError(null);

      const newReply = await commentService.createReply(
        comment.comment_id,
        text,
        replyingToTarget.userId
      );

      // Chèn câu trả lời mới vào cuối danh sách (SRS Màn 2)
      setRepliesList((prev) => [...prev, newReply]);
      setReplyText("");
      setShowReplyBox(false);

      onReplySuccess(comment.comment_id, newReply);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Không thể gửi trả lời. Vui lòng thử lại";
      if (msg.includes("Bình luận gốc không còn tồn tại")) {
        onShowToast("error", "Bình luận gốc không còn tồn tại");
        setShowReplyBox(false);
      } else {
        setReplyError(msg);
      }
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const isTextOverLimit = replyText.length > 500;
  const isSendDisabled = !replyText.trim() || isTextOverLimit || isSubmittingReply;

  return (
    <article className="comment-item-row" id={`comment-${comment.comment_id}`}>
      {/* 1. Bình luận cấp 1 */}
      <div className="comment-main-line">
        <div className="comment-avatar-col">
          {avatarUrl ? (
            <img
              src={resolveMediaUrl(avatarUrl)}
              alt={authorName}
              className="comment-avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="comment-avatar-fallback">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="comment-body-col">
          <div className="comment-bubble">
            <span className="comment-author-name">{authorName}</span>
            <p className="comment-content-text">{comment.content}</p>
          </div>

          <div className="comment-meta-actions">
            <span className="comment-time-text">
              {formatRelativeTime(comment.created_at)}
            </span>
            <button
              type="button"
              className="btn-reply-trigger"
              onClick={() => handleTriggerReply(authorName, comment.author.user_id)}
            >
              Trả lời
            </button>
          </div>
        </div>
      </div>

      {/* 2. Danh sách câu trả lời thụt lề (Nested Replies - Màn 2) */}
      {(repliesList.length > 0 || comment.replies_count > 0) && (
        <div className="comment-replies-container">
          {repliesList.map((r) => (
            <CommentReplyItem
              key={r.comment_id}
              reply={r}
              onTriggerReply={(targetName, userId) =>
                handleTriggerReply(targetName, userId)
              }
            />
          ))}

          {/* Nút xem thêm câu trả lời (nếu có hơn 3 câu trả lời) */}
          {!hasLoadedAllReplies && comment.replies_count > repliesList.length && (
            <button
              type="button"
              className="btn-load-more-replies"
              onClick={handleLoadMoreReplies}
              disabled={isLoadingMoreReplies}
            >
              {isLoadingMoreReplies ? (
                <span>Đang tải...</span>
              ) : (
                <span>
                  ↳ Xem thêm {comment.replies_count - repliesList.length} câu trả lời
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* 3. Ô nhập trả lời ngay dưới bình luận gốc (Màn 2) */}
      {showReplyBox && (
        <div className="inline-reply-input-box">
          <div className="replying-to-header">
            <span className="replying-badge">
              Đang trả lời <strong>@{replyingToTarget.name}</strong>
            </span>
            <button
              type="button"
              className="btn-cancel-reply"
              onClick={handleCancelReply}
              title="Hủy trả lời"
              aria-label="Hủy trả lời"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmitReply} className="reply-form">
            <div className="reply-input-wrapper">
              <textarea
                ref={textareaRef}
                rows={2}
                placeholder={`Trả lời @${replyingToTarget.name}...`}
                value={replyText}
                onChange={(e) => {
                  setReplyText(e.target.value);
                  if (replyError) setReplyError(null);
                }}
                className={`reply-textarea ${isTextOverLimit ? "is-error" : ""}`}
                maxLength={600}
              />

              <div className="reply-form-footer">
                <span className={`char-counter ${isTextOverLimit ? "is-over" : ""}`}>
                  {replyText.length}/500
                </span>
                <button
                  type="submit"
                  disabled={isSendDisabled}
                  className="btn-send-reply"
                >
                  {isSubmittingReply ? "Đang gửi..." : "Gửi"}
                </button>
              </div>
            </div>

            {replyError && <div className="reply-error-message">{replyError}</div>}
          </form>
        </div>
      )}
    </article>
  );
};

