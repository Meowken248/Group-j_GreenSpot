import React, { useState, useEffect } from "react";
import type { PostItem } from "../types/profile.types";
import { profileService } from "../services/profile.service";

interface HidePostModalProps {
  isOpen: boolean;
  post: PostItem | null;
  onClose: () => void;
  onUndoSuccess: (post: PostItem) => void;
  onConfirmedHidden: (post: PostItem) => void;
}

export const HidePostModal: React.FC<HidePostModalProps> = ({
  isOpen,
  post,
  onClose,
  onUndoSuccess,
  onConfirmedHidden,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [undoing, setUndoing] = useState(false);

  // Bộ đếm ngược 5 giây thời gian thực
  useEffect(() => {
    if (!isOpen || !post) return;
    setSecondsLeft(5);
    setUndoing(false);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Hết 5 giây: tự động đóng và ghi nhận ẩn bài
          onConfirmedHidden(post);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, post, onConfirmedHidden]);

  if (!isOpen || !post) return null;

  // Xử lý bấm Hoàn tác trong 5 giây
  const handleUndo = async () => {
    if (undoing) return;
    try {
      setUndoing(true);
      await profileService.toggleHidePost(post.post_id, false);
      const unhiddenPost: PostItem = { ...post, is_hidden: false };
      onUndoSuccess(unhiddenPost);
    } catch {
      // Nếu lỗi hoàn tác, vẫn đóng và thông báo
      onClose();
    } finally {
      setUndoing(false);
    }
  };

  const handleManualClose = () => {
    onConfirmedHidden(post);
  };

  return (
    <div
      className="modal-backdrop-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hide-post-modal-title"
    >
      <div
        className="modal-double-bezel modal-hide-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-inner-core">
          <div className="modal-eyebrow-pill">POPUP THÔNG BÁO</div>
          <div className="modal-eye-icon-badge">👁️‍🗨️</div>

          <h3 id="hide-post-modal-title" className="modal-title-main">
            ĐÃ ẨN BÀI VIẾT
          </h3>
          <p className="modal-desc-text">
            Chỉ bạn nhìn thấy bài này. Bạn có thể bấm <strong>Hiện lại</strong> trên thẻ bài bất kỳ lúc nào.
          </p>

          <div className="countdown-pill-indicator">
            <span className="ticker-dot" />
            <span>Có thể hoàn tác trong <strong>{secondsLeft}s</strong></span>
          </div>

          <div className="modal-actions-row">
            <button
              type="button"
              className="btn-modal-warning-solid"
              onClick={handleUndo}
              disabled={undoing || secondsLeft === 0}
            >
              {undoing ? (
                <>
                  <span className="spinner-inline" />
                  <span>Đang hoàn tác...</span>
                </>
              ) : (
                <span>Hoàn tác ({secondsLeft}s)</span>
              )}
            </button>
            <button
              type="button"
              className="btn-modal-ghost"
              onClick={handleManualClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
