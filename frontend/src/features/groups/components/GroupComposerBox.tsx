/**
 * GroupComposerBox.tsx
 * Khung đăng bài viết nhanh trong Trang nhóm cộng đồng (Chức năng 16)
 * Cho phép thành viên nhóm nhấp để mở Modal tạo bài viết gắn với group_id hiện tại.
 */

import React from "react";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface GroupComposerBoxProps {
  groupId: string;
  groupName: string;
  currentUser?: {
    user_id?: string;
    full_name?: string;
    avatar_url?: string | null;
  } | null;
  onOpenPostCreator: () => void;
}

export const GroupComposerBox: React.FC<GroupComposerBoxProps> = ({
  groupName,
  currentUser,
  onOpenPostCreator,
}) => {
  const userName = currentUser?.full_name || "Thành viên nhóm";
  const userAvatar = currentUser?.avatar_url;

  return (
    <div
      className="group-composer-box"
      data-testid="group-composer-box"
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        padding: "16px 20px",
        marginBottom: "20px",
        boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Hàng trên: Avatar + Ô input giả lập */}
      <div
        className="composer-top-row"
        onClick={onOpenPostCreator}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenPostCreator();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
        }}
      >
        <div
          className="composer-avatar-wrapper"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            background: "#d1fae5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#059669",
            fontSize: "15px",
          }}
        >
          {userAvatar ? (
            <img
              src={resolveMediaUrl(userAvatar)}
              alt={userName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span>{userName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div
          className="composer-fake-input"
          style={{
            flex: 1,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "24px",
            padding: "10px 18px",
            color: "#64748b",
            fontSize: "14px",
            transition: "all 0.2s ease",
          }}
        >
          <span>
            {userName ? `${userName} ơi, bạn muốn chia sẻ điều gì với ${groupName}?` : `Chia sẻ tin tức, hoạt động sống xanh trong ${groupName}...`}
          </span>
        </div>
      </div>

      <div
        className="composer-divider"
        style={{
          height: "1px",
          background: "#f1f5f9",
          margin: "12px 0 10px",
        }}
      />

      {/* Hàng dưới: Các nút đính kèm tiện ích */}
      <div
        className="composer-action-buttons"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          gap: "8px",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={onOpenPostCreator}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            borderRadius: "10px",
            border: "none",
            background: "transparent",
            color: "#334155",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ fontSize: "16px" }}>📸</span>
          <span style={{ whiteSpace: "nowrap" }}>Ảnh / Video</span>
        </button>

        <button
          type="button"
          onClick={onOpenPostCreator}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            borderRadius: "10px",
            border: "none",
            background: "transparent",
            color: "#334155",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ fontSize: "16px" }}>📍</span>
          <span style={{ whiteSpace: "nowrap" }}>Toạ độ / Vị trí</span>
        </button>

        <button
          type="button"
          onClick={onOpenPostCreator}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            borderRadius: "10px",
            border: "none",
            background: "transparent",
            color: "#334155",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ fontSize: "16px" }}>🌱</span>
          <span style={{ whiteSpace: "nowrap" }}>Chiến dịch xanh</span>
        </button>
      </div>
    </div>
  );
};

