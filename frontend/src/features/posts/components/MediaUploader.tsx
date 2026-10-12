import React, { useRef, useState } from "react";
import type { MediaItem } from "../types/postTypes";
import { postService } from "../services/postService";

interface MediaUploaderProps {
  mediaList: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  disabled?: boolean;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  mediaList,
  onChange,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setWarningMessage(null);

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);

    // 1. Phân loại ảnh và video
    const existingImages = mediaList.filter((m) => m.media_type === "IMAGE");
    const existingVideos = mediaList.filter((m) => m.media_type === "VIDEO");

    for (const file of newFiles) {
      const isVideo = file.type.startsWith("video/") || file.name.endsWith(".mp4");
      const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

      // Kiểm tra định dạng
      if (!isImage && !isVideo) {
        setErrorMessage("Tệp không hợp lệ (ảnh tối đa 10MB, video MP4 tối đa 50MB)");
        continue;
      }

      // Kiểm tra dung lượng
      if (isImage && file.size > 10 * 1024 * 1024) {
        setErrorMessage("Tệp không hợp lệ (ảnh tối đa 10MB, video MP4 tối đa 50MB)");
        continue;
      }

      if (isVideo && file.size > 50 * 1024 * 1024) {
        setErrorMessage("Tệp không hợp lệ (ảnh tối đa 10MB, video MP4 tối đa 50MB)");
        continue;
      }

      // Kiểm tra quy tắc: Không được kết hợp ảnh và video, tối đa 5 ảnh hoặc 1 video
      if (isVideo) {
        if (existingImages.length > 0 || mediaList.some((m) => m.media_type === "IMAGE")) {
          setWarningMessage("Chỉ được đăng tối đa 5 ảnh hoặc 1 video");
          continue;
        }
        if (existingVideos.length >= 1 || mediaList.some((m) => m.media_type === "VIDEO")) {
          setWarningMessage("Chỉ được đăng tối đa 5 ảnh hoặc 1 video");
          continue;
        }
      }

      if (isImage) {
        if (existingVideos.length > 0 || mediaList.some((m) => m.media_type === "VIDEO")) {
          setWarningMessage("Chỉ được đăng tối đa 5 ảnh hoặc 1 video");
          continue;
        }
        if (mediaList.length >= 5) {
          setWarningMessage("Chỉ được đăng tối đa 5 ảnh hoặc 1 video");
          continue;
        }
      }

      // Tải lên tệp lên Backend
      try {
        setIsUploading(true);
        const uploaded = await postService.uploadMedia(file);
        // Tạo blob preview cục bộ
        const previewUrl = URL.createObjectURL(file);
        const item: MediaItem = {
          ...uploaded,
          previewUrl,
          file,
        };
        onChange([...mediaList, item]);
      } catch (err: any) {
        const backendMsg = err?.response?.data?.detail?.message;
        setErrorMessage(backendMsg || "Tệp không hợp lệ (ảnh tối đa 10MB, video MP4 tối đa 50MB)");
      } finally {
        setIsUploading(false);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = (index: number) => {
    const updated = [...mediaList];
    updated.splice(index, 1);
    onChange(updated);
    setErrorMessage(null);
    setWarningMessage(null);
  };

  return (
    <div className="media-section">
      <div className="media-header">
        <span className="label">Ảnh / Video minh họa</span>
        <label className={`upload-btn ${disabled || isUploading ? "disabled" : ""}`}>
          <span>{isUploading ? "Đang tải…" : "+ Thêm ảnh/video"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4"
            multiple
            disabled={disabled || isUploading}
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {errorMessage && <div className="media-error-text">{errorMessage}</div>}
      {warningMessage && <div className="media-warning-text">{warningMessage}</div>}

      {mediaList.length > 0 && (
        <div className="media-preview-grid">
          {mediaList.map((item, idx) => (
            <div key={idx} className="media-preview-item">
              {item.media_type === "IMAGE" ? (
                <img src={item.previewUrl || item.url} alt={`Ảnh ${idx + 1}`} />
              ) : (
                <>
                  <video src={item.previewUrl || item.url} />
                  <span className="video-badge">VIDEO</span>
                </>
              )}
              <button
                type="button"
                className="remove-media-btn"
                title="Xóa tệp"
                disabled={disabled}
                onClick={() => handleRemoveMedia(idx)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
