import React from "react";
import type { ChatUserSummary } from "../types/chat.types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface DistrictMembersSidebarProps {
  district: string;
  members: ChatUserSummary[];
  isLoading: boolean;
  onClose?: () => void;
}

export const DistrictMembersSidebar: React.FC<DistrictMembersSidebarProps> = ({
  district,
  members,
  isLoading,
  onClose,
}) => {
  return (
    <aside className="district-members-sidebar" aria-label={`Thành viên trực tuyến Quận ${district}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="members-sidebar-title">
          Trực tuyến ({members.length})
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 14,
            }}
            title="Đóng danh sách thành viên"
          >
            ✕
          </button>
        )}
      </div>

      <div className="members-list">
        {isLoading ? (
          <div style={{ padding: "12px 0", color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
            Đang tải danh sách...
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: "12px 0", color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
            Chưa có thành viên nào khác trực tuyến
          </div>
        ) : (
          members.map((member) => (
            <div key={member.user_id} className="member-item">
              <img
                src={
                  member.avatar_url
                    ? resolveMediaUrl(member.avatar_url)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=10b981&color=fff`
                }
                alt={member.full_name}
                className="member-avatar"
                loading="lazy"
              />
              <span className="member-name" title={member.full_name}>
                {member.full_name}
              </span>
              <span className="member-online-dot" title="Đang hoạt động" />
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
