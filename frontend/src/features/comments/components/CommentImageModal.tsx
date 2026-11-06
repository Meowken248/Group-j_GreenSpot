import React, { useEffect } from "react";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface CommentImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const CommentImageModal: React.FC<CommentImageModalProps> = ({
  imageUrl,
  onClose,
}) => {
  useEffect(() => {
    if (!imageUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="comment-image-lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh phóng to"
    >
      <button
        type="button"
        className="btn-lightbox-close"
        onClick={onClose}
        aria-label="Đóng xem ảnh"
      >
        ✕
      </button>

      <div className="comment-lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img
          src={resolveMediaUrl(imageUrl)}
          alt="Ảnh đính kèm bình luận"
          className="comment-lightbox-img"
        />
      </div>
    </div>
  );
};

