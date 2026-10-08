import React, { useEffect } from 'react';

interface ImageLightboxModalProps {
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  imageUrl,
  caption,
  onClose,
}) => {
  useEffect(() => {
    if (!imageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="lightbox-modal"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh phóng to"
    >
      <button
        type="button"
        className="lightbox-close-btn"
        onClick={onClose}
        aria-label="Đóng xem ảnh"
      >
        ✕
      </button>

      <img
        src={imageUrl}
        alt={caption || 'Ảnh hiện trường chi tiết'}
        className="lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
