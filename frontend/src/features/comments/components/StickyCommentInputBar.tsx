import React, { useState, useEffect, useRef } from "react";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface StickyCommentInputBarProps {
  isLoggedIn: boolean;
  currentUser?: {
    user_id?: string;
    full_name?: string;
    avatar_url?: string | null;
  } | null;
  isSubmitting: boolean;
  cooldownSeconds: number;
  errorMessage?: string | null;
  onRequireLogin: () => void;
  onSubmitComment: (content: string) => Promise<boolean>;
}

export const StickyCommentInputBar: React.FC<StickyCommentInputBarProps> = ({
  isLoggedIn,
  currentUser,
  isSubmitting,
  cooldownSeconds,
  errorMessage,
  onRequireLogin,
  onSubmitComment,
}) => {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Điều chỉnh chiều cao textarea tự động
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [content]);

  const handleInputFocus = () => {
    if (!isLoggedIn) {
      if (textareaRef.current) textareaRef.current.blur();
      onRequireLogin();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

    const text = content.trim();
    if (!text || text.length > 500 || isSubmitting || cooldownSeconds > 0) return;

    const ok = await onSubmitComment(text);
    if (ok) {
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const isTextOverLimit = content.length > 500;
  const isSendDisabled =
    !content.trim() ||
    isTextOverLimit ||
    isSubmitting ||
    cooldownSeconds > 0;

  const userAvatar = currentUser?.avatar_url;
  const userName = currentUser?.full_name || "Bạn";

  return (
    <div className="sticky-comment-bar-wrapper">
      <div className="sticky-comment-bar-inner">
        {/* Avatar người dùng */}
        <div className="user-avatar-slot">
          {isLoggedIn && userAvatar ? (
            <img
              src={resolveMediaUrl(userAvatar)}
              alt={userName}
              className="user-bar-avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="user-bar-avatar-fallback">
              {isLoggedIn ? userName.charAt(0).toUpperCase() : "👤"}
            </div>
          )}
        </div>

        {/* Khung soạn thảo bình luận */}
        <form onSubmit={handleSubmit} className="comment-composer-form">
          <div className="composer-input-field">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={
                isLoggedIn
                  ? "Viết bình luận công khai của bạn..."
                  : "Vui lòng đăng nhập để bình luận..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={handleInputFocus}
              onClick={handleInputFocus}
              className={`composer-textarea ${isTextOverLimit ? "is-error" : ""}`}
              maxLength={600}
            />

            <div className="composer-controls-row">
              {/* Bộ đếm ký tự (SRS: chuyển đỏ khi > 500) */}
              <span
                className={`composer-char-count ${
                  isTextOverLimit ? "is-red-alert" : ""
                }`}
                title="Giới hạn tối đa 500 ký tự"
              >
                {content.length}/500
              </span>

              {/* Nút gửi hoặc đếm ngược cooldown */}
              <button
                type="submit"
                disabled={isSendDisabled}
                className={`btn-send-main-comment ${
                  cooldownSeconds > 0 ? "is-cooldown" : ""
                }`}
                title={
                  cooldownSeconds > 0
                    ? `Bạn bình luận quá nhanh. Vui lòng chờ ${cooldownSeconds}s`
                    : "Gửi bình luận"
                }
              >
                {isSubmitting
                  ? "Đang gửi..."
                  : cooldownSeconds > 0
                  ? `Chờ ${cooldownSeconds}s`
                  : "Gửi"}
              </button>
            </div>
          </div>

          {/* Dòng thông báo lỗi hoặc cảnh báo rate limit */}
          {errorMessage && (
            <div className="composer-error-banner" role="alert">
              ⚠️ {errorMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

