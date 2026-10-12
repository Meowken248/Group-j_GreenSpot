import React from "react";
import type { PostDetail } from "../types/postTypes";

interface PostSuccessModalProps {
  isOpen: boolean;
  post: PostDetail | null;
  isPendingApproval?: boolean;
  onViewPost: (postId: string) => void;
  onClose: () => void;
}

export const PostSuccessModal: React.FC<PostSuccessModalProps> = ({
  isOpen,
  post,
  isPendingApproval = false,
  onViewPost,
  onClose,
}) => {
  if (!isOpen || !post) return null;

  return (
    <div className="success-modal-backdrop" onClick={onClose}>
      <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-badge">POPUP</div>

        <div className="success-icon-wrap">✓</div>

        <h2>ĐÃ ĐĂNG BÀI</h2>

        <p>
          {isPendingApproval
            ? "Bài viết đã gửi và đang chờ ban quản trị nhóm phê duyệt"
            : "Bài viết đã xuất hiện trên bảng tin"}
        </p>

        <div className="success-actions">
          <button
            type="button"
            className="btn-view-post"
            onClick={() => onViewPost(post.post_id)}
          >
            Xem bài viết
          </button>
          <button type="button" className="btn-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
