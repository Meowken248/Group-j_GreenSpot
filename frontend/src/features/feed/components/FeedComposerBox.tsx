/**
 * FeedComposerBox (Khung soạn bài viết nhanh Facebook-style)
 * Kết nối trực tiếp với Chức năng STT 09: Đăng bài kèm toạ độ, ảnh, video, gắn thẻ bạn bè
 */

import React from "react";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface FeedComposerBoxProps {
  userAvatar?: string | null;
  userName?: string;
  onOpenCreatePost: () => void;
}

export const FeedComposerBox: React.FC<FeedComposerBoxProps> = ({
  userAvatar,
  userName = "Công dân sinh thái",
  onOpenCreatePost,
}) => {
  return (
    <div className="feed-composer-box">
      <div className="composer-top-row" onClick={onOpenCreatePost}>
        <div className="composer-avatar-wrapper">
          {userAvatar ? (
            <img
              src={resolveMediaUrl(userAvatar)}
              alt={userName}
              className="composer-user-avatar"
            />
          ) : (
            <div className="composer-avatar-placeholder">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="composer-fake-input">
          <span>{userName ? `${userName} ơi, bạn phát hiện điểm rác thải nào cần phản ánh?` : "Bạn phát hiện điểm nóng ô nhiễm nào hôm nay? Chia sẻ ngay..."}</span>
        </div>
      </div>

      <div className="composer-divider" />

      <div className="composer-action-buttons">
        <button
          type="button"
          className="composer-action-btn media-btn"
          onClick={onOpenCreatePost}
        >
          <span className="btn-icon">📸</span>
          <span className="btn-text">Ảnh / Video</span>
        </button>

        <button
          type="button"
          className="composer-action-btn location-btn"
          onClick={onOpenCreatePost}
        >
          <span className="btn-icon">📍</span>
          <span className="btn-text">Gắn vị trí GPS</span>
        </button>

        <button
          type="button"
          className="composer-action-btn tag-btn"
          onClick={onOpenCreatePost}
        >
          <span className="btn-icon">👥</span>
          <span className="btn-text">Gắn thẻ bạn bè</span>
        </button>
      </div>
    </div>
  );
};

