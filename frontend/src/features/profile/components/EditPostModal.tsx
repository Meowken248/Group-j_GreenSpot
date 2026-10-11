import React, { useState, useEffect, useRef } from "react";
import type { PostItem, UpdatePostPayload } from "../types/profile.types";
import { profileService } from "../services/profile.service";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { DiscardEditConfirmModal } from "./DiscardEditConfirmModal";

interface MediaItem {
  url: string;
  media_type: "IMAGE" | "VIDEO";
  file_name: string;
  size_bytes: number;
}

interface EditPostModalProps {
  isOpen: boolean;
  post: PostItem | null;
  onClose: () => void;
  onSuccess: (updatedPost: PostItem) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  post,
  onClose,
  onSuccess,
}) => {
  const [content, setContent] = useState("");
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [initialContent, setInitialContent] = useState("");
  const [initialMediaUrls, setInitialMediaUrls] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Nạp dữ liệu cũ khi mở Modal
  useEffect(() => {
    if (isOpen && post) {
      const initialText = post.content || "";
      setContent(initialText);
      setInitialContent(initialText);

      // Parse danh sách media cũ
      let parsed: MediaItem[] = [];
      const urls: string[] = [];
      if (post.media_urls && Array.isArray(post.media_urls)) {
        parsed = post.media_urls.map((item: any, idx: number) => {
          if (typeof item === "string") {
            urls.push(item);
            const isVid = item.toLowerCase().endsWith(".mp4") || item.toLowerCase().endsWith(".mov");
            return {
              url: item,
              media_type: isVid ? ("VIDEO" as const) : ("IMAGE" as const),
              file_name: `Tệp ${idx + 1}`,
              size_bytes: 0,
            };
          } else if (item && typeof item === "object") {
            urls.push(item.url);
            return {
              url: item.url,
              media_type: item.media_type || "IMAGE",
              file_name: item.file_name || `Tệp ${idx + 1}`,
              size_bytes: item.size_bytes || 0,
            };
          }
          return {
            url: String(item),
            media_type: "IMAGE" as const,
            file_name: `Tệp ${idx + 1}`,
            size_bytes: 0,
          };
        });
      }
      setMediaList(parsed);
      setInitialMediaUrls(urls);
      setErrorMessage(null);
      setShowDiscardConfirm(false);
    }
  }, [isOpen, post]);

  // Kiểm tra xem đã có thay đổi so với ban đầu chưa
  const hasChanges = (): boolean => {
    if (content.trim() !== initialContent.trim()) return true;
    const currentUrls = mediaList.map((m) => m.url);
    if (currentUrls.length !== initialMediaUrls.length) return true;
    for (let i = 0; i < currentUrls.length; i++) {
      if (currentUrls[i] !== initialMediaUrls[i]) return true;
    }
    return false;
  };

  // Xử lý đóng Modal
  const handleRequestClose = () => {
    if (loading) return;
    if (hasChanges()) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Xác nhận thoát và bỏ thay đổi
  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  // Xoá một tệp media
  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  // Thêm ảnh hoặc video mới
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = "";

    // 1. Kiểm tra dung lượng tối đa 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage("Tệp không hợp lệ (chỉ nhận JPG, PNG, MP4 và tối đa 10MB)");
      return;
    }

    // 2. Kiểm tra định dạng hợp lệ
    const validTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage("Tệp không hợp lệ (chỉ nhận JPG, PNG, MP4 và tối đa 10MB)");
      return;
    }

    try {
      setUploadingMedia(true);
      setErrorMessage(null);
      const res = await profileService.uploadMedia(file);
      setMediaList((prev) => [
        ...prev,
        {
          url: res.url,
          media_type: res.media_type,
          file_name: res.file_name || file.name,
          size_bytes: res.size_bytes || file.size,
        },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.detail?.message || "Không thể tải lên tệp đính kèm. Vui lòng thử lại";
      setErrorMessage(msg);
    } finally {
      setUploadingMedia(false);
    }
  };

  // Gửi cập nhật bài viết
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;

    const trimmedContent = content.trim();

    // Kiểm tra tính hợp lệ
    if (!trimmedContent && mediaList.length === 0) {
      setErrorMessage("Nội dung bài viết không được để trống");
      return;
    }

    if (content.length > 2000) {
      setErrorMessage("Nội dung tối đa 2000 ký tự");
      return;
    }

    if (!hasChanges()) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const payload: UpdatePostPayload = {
        content: content,
        media_urls: mediaList,
        version: post.version ?? 1,
      };

      const updated = await profileService.updatePost(post.post_id, payload);
      onSuccess(updated);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (status === 409) {
        setErrorMessage("Dữ liệu bài viết đã được cập nhật bởi thao tác khác. Vui lòng tải lại trang.");
      } else if (status === 404) {
        setErrorMessage("Bài viết không còn tồn tại");
      } else if (detail?.message) {
        setErrorMessage(detail.message);
      } else {
        setErrorMessage("Không thể cập nhật bài viết. Vui lòng thử lại");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !post) return null;

  const isOverLimit = content.length > 2000;
  const canSubmit = hasChanges() && !isOverLimit && (content.trim().length > 0 || mediaList.length > 0) && !loading && !uploadingMedia;

  return (
    <>
      <div
        className="modal-backdrop-overlay"
        onClick={handleRequestClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-post-modal-title"
      >
        <div
          className="modal-double-bezel modal-edit-post-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-inner-core">
            {/* Header Modal */}
            <div className="modal-header-between">
              <div>
                <span className="modal-eyebrow-pill">CHỈNH SỬA BÀI ĐĂNG</span>
                <h2 id="edit-post-modal-title" className="modal-title-main">
                  SỬA BÀI VIẾT
                </h2>
              </div>
              <button
                type="button"
                className="btn-modal-close-icon"
                onClick={handleRequestClose}
                aria-label="Đóng cửa sổ"
                disabled={loading}
              >
                ✕
              </button>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="modal-error-banner" role="alert">
                <span className="error-icon-dot">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="edit-post-form">
              {/* Vùng nhập nội dung bài viết */}
              <div className="form-field-group">
                <label htmlFor="edit-post-content" className="form-field-label">
                  Nội dung chia sẻ
                </label>
                <div className={`textarea-wrapper ${isOverLimit ? "has-error" : ""}`}>
                  <textarea
                    id="edit-post-content"
                    className="edit-post-textarea"
                    placeholder="Bạn muốn chia sẻ hành động xanh hoặc cập nhật điều gì?"
                    rows={5}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                  <div className={`char-counter ${isOverLimit ? "counter-over" : ""}`}>
                    {content.length} / 2000
                  </div>
                </div>
              </div>

              {/* Danh sách ảnh/video đính kèm */}
              <div className="form-field-group">
                <div className="media-section-header">
                  <label className="form-field-label">
                    Tệp đính kèm ({mediaList.length})
                  </label>
                  <button
                    type="button"
                    className="btn-add-media"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || uploadingMedia || mediaList.length >= 5}
                  >
                    <span>📷</span>
                    <span>{uploadingMedia ? "Đang tải..." : "Thêm ảnh / video"}</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="image/jpeg,image/png,image/webp,video/mp4"
                    onChange={handleFileChange}
                  />
                </div>

                {mediaList.length > 0 && (
                  <div className="media-preview-grid">
                    {mediaList.map((m, idx) => (
                      <div key={idx} className="media-preview-item">
                        {m.media_type === "VIDEO" ? (
                          <div className="video-thumb-container">
                            <video src={resolveMediaUrl(m.url)} className="preview-media-thumb" />
                            <span className="video-badge-pill">▶ VIDEO</span>
                          </div>
                        ) : (
                          <img
                            src={resolveMediaUrl(m.url)}
                            alt={`Đính kèm ${idx + 1}`}
                            className="preview-media-thumb"
                          />
                        )}
                        <button
                          type="button"
                          className="btn-remove-media-thumb"
                          onClick={() => handleRemoveMedia(idx)}
                          title="Gỡ tệp này"
                          disabled={loading}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="media-hint-text">
                  Hỗ trợ định dạng JPG, PNG, WebP hoặc MP4. Dung lượng tối đa 10MB mỗi tệp.
                </p>
              </div>

              {/* Hàng nút hành động cuối form */}
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-ghost"
                  onClick={handleRequestClose}
                  disabled={loading}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="btn-modal-primary-solid"
                  disabled={!canSubmit}
                >
                  {loading ? (
                    <>
                      <span className="spinner-inline" />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <span>Cập nhật</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal xác nhận thoát khi có thay đổi chưa lưu */}
      <DiscardEditConfirmModal
        isOpen={showDiscardConfirm}
        onConfirmDiscard={handleConfirmDiscard}
        onStay={() => setShowDiscardConfirm(false)}
      />
    </>
  );
};

