import React from "react";
import type { ReplyItem } from "../types/commentTypes";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface CommentReplyItemProps {
  reply: ReplyItem;
  onTriggerReply: (targetName: string, replyToUserId?: string) => void;
}

export const CommentReplyItem: React.FC<CommentReplyItemProps> = ({
  reply,
  onTriggerReply,
}) => {
  const authorName = reply.author.full_name || "Công dân sinh thái";
  const avatarUrl = reply.author.avatar_url;

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} ngày trước`;
      return new Date(isoString).toLocaleDateString("vi-VN");
    } catch {
      return "Vừa xong";
    }
  };

  return (
    <div className="comment-reply-item-row" id={`reply-${reply.comment_id}`}>
      <div className="reply-avatar-col">
        {avatarUrl ? (
          <img
            src={resolveMediaUrl(avatarUrl)}
            alt={authorName}
            className="reply-avatar-img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="reply-avatar-fallback">
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="reply-content-col">
        <div className="reply-bubble">
          <div className="reply-header-line">
            <span className="reply-author-name">{authorName}</span>
            {reply.reply_to_user && (
              <span className="reply-tag-mention">
                {" "}trả lời <strong>@{reply.reply_to_user.full_name}</strong>
              </span>
            )}
          </div>
          <p className="reply-body-text">{reply.content}</p>
        </div>

        <div className="reply-footer-meta">
          <span className="reply-time-tag">{formatRelativeTime(reply.created_at)}</span>
          <button
            type="button"
            className="btn-inline-reply-action"
            onClick={() => onTriggerReply(authorName, reply.author.user_id)}
          >
            Trả lời
          </button>
        </div>
      </div>
    </div>
  );
};

