import React, { useState, useEffect, useRef } from "react";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { commentService } from "../services/commentService";
import { CommentEmojiPicker } from "./CommentEmojiPicker";

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
  onSubmitComment: (content: string, mediaUrl?: string | null) => Promise<boolean>;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Giải phóng object URL khi component unmount hoặc thay đổi ảnh
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleInputFocus = () => {
    if (!isLoggedIn) {
      if (textareaRef.current) textareaRef.current.blur();
      onRequireLogin();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

    if (!textareaRef.current) {
      setContent((prev) => prev + emoji);
      return;
    }

    const start = textareaRef.current.selectionStart || 0;
    const end = textareaRef.current.selectionEnd || 0;
    const nextContent = content.slice(0, start) + emoji + content.slice(end);
    setContent(nextContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = start + emoji.length;
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng ảnh
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Chỉ chấp nhận tệp ảnh (JPG, PNG, WEBP, GIF)");
      return;
    }

    // Giới hạn 10MB theo chuẩn hệ thống
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Kích thước ảnh tối đa 10MB");
      return;
    }

    setUploadError(null);
    setSelectedFile(file);

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveSelectedImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

    const text = content.trim();
    // Cho phép gửi nếu có nội dung văn bản HOẶC có ảnh đính kèm
    if ((!text && !selectedFile) || text.length > 500 || isSubmitting || isUploadingMedia || cooldownSeconds > 0) {
      return;
    }

    try {
      let uploadedMediaUrl: string | null = null;

      // Nếu có chọn ảnh, tải lên backend qua /api/v1/posts/media trước
      if (selectedFile) {
        setIsUploadingMedia(true);
        setUploadError(null);
        try {
          uploadedMediaUrl = await commentService.uploadMedia(selectedFile);
        } catch {
          setUploadError("Tải ảnh thất bại. Vui lòng thử lại");
          setIsUploadingMedia(false);
          return;
        }
        setIsUploadingMedia(false);
      }

      const ok = await onSubmitComment(text, uploadedMediaUrl);
      if (ok) {
        setContent("");
        handleRemoveSelectedImage();
        setIsEmojiPickerOpen(false);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    } catch {
      setIsUploadingMedia(false);
    }
  };

  const isTextOverLimit = content.length > 500;
  const hasContentOrImage = Boolean(content.trim() || selectedFile);
  const isSendDisabled =
    !hasContentOrImage ||
    isTextOverLimit ||
    isSubmitting ||
    isUploadingMedia ||
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
          {/* Xem trước ảnh đính kèm (nếu có) */}
          {previewUrl && (
            <div className="composer-media-preview-container">
              <div className="composer-media-thumbnail-box">
                <img
                  src={previewUrl}
                  alt="Ảnh xem trước"
                  className="composer-media-thumbnail-img"
                />
                <button
                  type="button"
                  className="btn-remove-media-preview"
                  onClick={handleRemoveSelectedImage}
                  title="Xóa ảnh này"
                  aria-label="Xóa ảnh đính kèm"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

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
              {/* Nút đính kèm ảnh & Biểu tượng cảm xúc */}
              <div className="composer-action-tools">
                {/* Input file ẩn */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className={`btn-tool-icon ${selectedFile ? "is-attached" : ""}`}
                  onClick={() => {
                    if (!isLoggedIn) onRequireLogin();
                    else fileInputRef.current?.click();
                  }}
                  title="Đính kèm ảnh"
                  aria-label="Đính kèm ảnh"
                >
                  📷
                </button>

                <div className="emoji-picker-anchor">
                  <button
                    type="button"
                    className={`btn-tool-icon ${isEmojiPickerOpen ? "is-active" : ""}`}
                    onClick={() => {
                      if (!isLoggedIn) onRequireLogin();
                      else setIsEmojiPickerOpen((prev) => !prev);
                    }}
                    title="Biểu tượng cảm xúc"
                    aria-label="Mở bảng biểu tượng cảm xúc"
                  >
                    😊
                  </button>

                  <CommentEmojiPicker
                    isOpen={isEmojiPickerOpen}
                    onClose={() => setIsEmojiPickerOpen(false)}
                    onSelectEmoji={handleSelectEmoji}
                  />
                </div>
              </div>

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
                {isSubmitting || isUploadingMedia
                  ? "Đang gửi..."
                  : cooldownSeconds > 0
                  ? `Chờ ${cooldownSeconds}s`
                  : "Gửi"}
              </button>
            </div>
          </div>

          {/* Dòng thông báo lỗi hoặc cảnh báo rate limit */}
          {(errorMessage || uploadError) && (
            <div className="composer-error-banner" role="alert">
              ⚠️ {uploadError || errorMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
