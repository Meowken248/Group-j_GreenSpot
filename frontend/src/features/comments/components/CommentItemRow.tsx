import React, { useState, useRef, useEffect } from "react";
import type { CommentItem, ReplyItem } from "../types/commentTypes";
import { CommentReplyItem } from "./CommentReplyItem";
import { commentService } from "../services/commentService";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { CommentEmojiPicker } from "./CommentEmojiPicker";
import { CommentImageModal } from "./CommentImageModal";

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

  // File đính kèm và emoji cho câu trả lời
  const [selectedReplyFile, setSelectedReplyFile] = useState<File | null>(null);
  const [previewReplyUrl, setPreviewReplyUrl] = useState<string | null>(null);
  const [isUploadingReplyMedia, setIsUploadingReplyMedia] = useState(false);
  const [isReplyEmojiPickerOpen, setIsReplyEmojiPickerOpen] = useState(false);

  // Xem ảnh phóng to (Lightbox)
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Danh sách replies và xem thêm
  const [repliesList, setRepliesList] = useState<ReplyItem[]>(
    comment.initial_replies || []
  );
  const [isLoadingMoreReplies, setIsLoadingMoreReplies] = useState(false);
  const [hasLoadedAllReplies, setHasLoadedAllReplies] = useState(
    comment.replies_count <= (comment.initial_replies?.length || 0)
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  // Tự động focus vào ô nhập khi mở trả lời (Màn 2 SRS)
  useEffect(() => {
    if (showReplyBox && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showReplyBox]);

  // Thu hồi ObjectURL khi đổi hoặc unmount
  useEffect(() => {
    return () => {
      if (previewReplyUrl && previewReplyUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewReplyUrl);
      }
    };
  }, [previewReplyUrl]);

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
    handleRemoveReplyImage();
    setIsReplyEmojiPickerOpen(false);
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

  // Xử lý chọn emoji trong câu trả lời
  const handleSelectReplyEmoji = (emoji: string) => {
    if (!textareaRef.current) {
      setReplyText((prev) => prev + emoji);
      return;
    }

    const start = textareaRef.current.selectionStart || 0;
    const end = textareaRef.current.selectionEnd || 0;
    const nextText = replyText.slice(0, start) + emoji + replyText.slice(end);
    setReplyText(nextText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = start + emoji.length;
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  // Xử lý đính kèm ảnh cho câu trả lời
  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setReplyError("Chỉ chấp nhận tệp ảnh (JPG, PNG, WEBP, GIF)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setReplyError("Kích thước ảnh tối đa 10MB");
      return;
    }

    setReplyError(null);
    setSelectedReplyFile(file);

    if (previewReplyUrl && previewReplyUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewReplyUrl);
    }
    setPreviewReplyUrl(URL.createObjectURL(file));
  };

  const handleRemoveReplyImage = () => {
    if (previewReplyUrl && previewReplyUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewReplyUrl);
    }
    setSelectedReplyFile(null);
    setPreviewReplyUrl(null);
    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = "";
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
    if ((!text && !selectedReplyFile) || isSubmittingReply || isUploadingReplyMedia) return;

    if (text.length > 500) {
      setReplyError("Bình luận tối đa 500 ký tự");
      return;
    }

    try {
      setIsSubmittingReply(true);
      setReplyError(null);

      let uploadedUrl: string | null = null;
      if (selectedReplyFile) {
        setIsUploadingReplyMedia(true);
        try {
          uploadedUrl = await commentService.uploadMedia(selectedReplyFile);
        } catch {
          setReplyError("Tải ảnh thất bại. Vui lòng thử lại");
          setIsUploadingReplyMedia(false);
          setIsSubmittingReply(false);
          return;
        }
        setIsUploadingReplyMedia(false);
      }

      const newReply = await commentService.createReply(
        comment.comment_id,
        text,
        replyingToTarget.userId,
        uploadedUrl
      );

      // Chèn câu trả lời mới vào cuối danh sách (SRS Màn 2)
      setRepliesList((prev) => [...prev, newReply]);
      setReplyText("");
      handleRemoveReplyImage();
      setIsReplyEmojiPickerOpen(false);
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
      setIsUploadingReplyMedia(false);
    }
  };

  const isTextOverLimit = replyText.length > 500;
  const hasReplyContentOrImage = Boolean(replyText.trim() || selectedReplyFile);
  const isSendDisabled =
    !hasReplyContentOrImage ||
    isTextOverLimit ||
    isSubmittingReply ||
    isUploadingReplyMedia;

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
            {comment.content && <p className="comment-content-text">{comment.content}</p>}

            {/* Hiển thị ảnh đính kèm bình luận cấp 1 (nếu có) */}
            {comment.media_url && (
              <div className="comment-attached-media">
                <img
                  src={resolveMediaUrl(comment.media_url)}
                  alt="Ảnh đính kèm"
                  className="comment-media-img"
                  onClick={() => setLightboxImageUrl(comment.media_url || null)}
                  loading="lazy"
                />
              </div>
            )}
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
              onImageClick={(url) => setLightboxImageUrl(url)}
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
            {/* Xem trước ảnh đính kèm câu trả lời (nếu có) */}
            {previewReplyUrl && (
              <div className="composer-media-preview-container reply-media-preview">
                <div className="composer-media-thumbnail-box">
                  <img
                    src={previewReplyUrl}
                    alt="Ảnh xem trước"
                    className="composer-media-thumbnail-img"
                  />
                  <button
                    type="button"
                    className="btn-remove-media-preview"
                    onClick={handleRemoveReplyImage}
                    title="Xóa ảnh này"
                    aria-label="Xóa ảnh"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

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
                {/* Công cụ đính kèm ảnh & Emoji */}
                <div className="reply-action-tools">
                  <input
                    type="file"
                    ref={replyFileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleReplyFileChange}
                    style={{ display: "none" }}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    className={`btn-tool-icon ${selectedReplyFile ? "is-attached" : ""}`}
                    onClick={() => replyFileInputRef.current?.click()}
                    title="Đính kèm ảnh"
                    aria-label="Đính kèm ảnh trả lời"
                  >
                    📷
                  </button>

                  <div className="emoji-picker-anchor">
                    <button
                      type="button"
                      className={`btn-tool-icon ${isReplyEmojiPickerOpen ? "is-active" : ""}`}
                      onClick={() => setIsReplyEmojiPickerOpen((prev) => !prev)}
                      title="Biểu tượng cảm xúc"
                      aria-label="Bảng biểu tượng cảm xúc"
                    >
                      😊
                    </button>

                    <CommentEmojiPicker
                      isOpen={isReplyEmojiPickerOpen}
                      onClose={() => setIsReplyEmojiPickerOpen(false)}
                      onSelectEmoji={handleSelectReplyEmoji}
                    />
                  </div>
                </div>

                <div className="reply-footer-right">
                  <span className={`char-counter ${isTextOverLimit ? "is-over" : ""}`}>
                    {replyText.length}/500
                  </span>
                  <button
                    type="submit"
                    disabled={isSendDisabled}
                    className="btn-send-reply"
                  >
                    {isSubmittingReply || isUploadingReplyMedia
                      ? "Đang gửi..."
                      : "Gửi"}
                  </button>
                </div>
              </div>
            </div>

            {replyError && <div className="reply-error-message">{replyError}</div>}
          </form>
        </div>
      )}

      {/* Modal xem ảnh phóng to */}
      <CommentImageModal
        imageUrl={lightboxImageUrl}
        onClose={() => setLightboxImageUrl(null)}
      />
    </article>
  );
};
