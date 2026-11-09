import React, { useState, useEffect } from "react";
import type { PostItem } from "../types/profile.types";
import { profileService } from "../services/profile.service";

interface DeletePostModalProps {
  isOpen: boolean;
  post: PostItem | null;
  onClose: () => void;
  onDeleted: (postId: string) => void;
}

export const DeletePostModal: React.FC<DeletePostModalProps> = ({
  isOpen,
  post,
  onClose,
  onDeleted,
}) => {
  const [phase, setPhase] = useState<"CONFIRM" | "SUCCESS">("CONFIRM");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Đặt lại phase khi mở modal
  useEffect(() => {
    if (isOpen) {
      setPhase("CONFIRM");
      setLoading(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Bộ đếm tự động tắt sau 3 giây ở Màn 4/5 (SUCCESS)
  useEffect(() => {
    if (phase === "SUCCESS" && post) {
      const timer = setTimeout(() => {
        onDeleted(post.post_id);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, post, onDeleted]);

  // Phím ESC đóng khi ở phase CONFIRM
  useEffect(() => {
    if (!isOpen || loading || phase === "SUCCESS") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, phase, onClose]);

  if (!isOpen || !post) return null;

  const handleConfirmDelete = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      await profileService.deletePost(post.post_id);
      setPhase("SUCCESS");
    } catch (err: any) {
      const msg = err?.response?.data?.detail?.message || "Xoá bài viết thất bại. Vui lòng thử lại";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCloseSuccess = () => {
    onDeleted(post.post_id);
  };

  return (
    <div
      className="modal-backdrop-overlay"
      onClick={phase === "CONFIRM" && !loading ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-post-modal-title"
    >
      <div
        className="modal-double-bezel modal-delete-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-inner-core">
          {phase === "CONFIRM" ? (
            /* ======================================================= */
            /* MÀN 3/5: POPUP XÁC NHẬN XOÁ BÀI                         */
            /* ======================================================= */
            <>
              <div className="modal-eyebrow-pill danger-pill">POPUP CẢNH BÁO</div>
              <h3 id="delete-post-modal-title" className="modal-title-danger">
                XOÁ BÀI VIẾT?
              </h3>
              <p className="modal-desc-text">
                Bạn chắc chắn muốn xoá bài viết này? Hành động này không thể hoàn tác.
              </p>

              {errorMessage && (
                <div className="modal-error-banner" role="alert">
                  <span className="error-icon-dot">⚠️</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-ghost"
                  onClick={onClose}
                  disabled={loading}
                  autoFocus
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="btn-modal-danger-solid"
                  onClick={handleConfirmDelete}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-inline" />
                      <span>Đang xoá…</span>
                    </>
                  ) : (
                    <span>Xoá bài viết</span>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* ======================================================= */
            /* MÀN 4/5: THÔNG BÁO ĐÃ XOÁ BÀI (TỰ TẮT SAU 3 GIÂY)       */
            /* ======================================================= */
            <>
              <div className="modal-eyebrow-pill success-pill">POPUP THÔNG BÁO</div>
              <div className="modal-success-icon-badge">✓</div>
              <h3 id="delete-post-modal-title" className="modal-title-success">
                ĐÃ XOÁ BÀI VIẾT
              </h3>
              <p className="modal-desc-text">
                Bài không còn trên bảng tin và trang cá nhân của bạn.
              </p>
              <div className="modal-auto-dismiss-hint">
                Tự động đóng sau 3 giây...
              </div>

              <div className="modal-actions-row single-action">
                <button
                  type="button"
                  className="btn-modal-primary-solid"
                  onClick={handleManualCloseSuccess}
                  autoFocus
                >
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

