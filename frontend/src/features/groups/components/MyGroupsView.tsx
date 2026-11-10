import React from "react";
import type { GroupItem } from "../types/group";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface MyGroupsViewProps {
  groups: GroupItem[];
  isLoading: boolean;
  onSelectGroup: (groupId: string) => void;
  onCreateNew: () => void;
}

export const MyGroupsView: React.FC<MyGroupsViewProps> = ({
  groups,
  isLoading,
  onSelectGroup,
  onCreateNew,
}) => {
  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", color: "#64748b" }}>
        Đang tải danh sách nhóm của bạn…
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="empty-state" data-testid="empty-my-groups">
        <div className="empty-icon">👥</div>
        <h3>Bạn chưa tham gia nhóm nào</h3>
        <p>Tham gia các nhóm môi trường tại quận của bạn hoặc tự thành lập một nhóm mới ngay hôm nay!</p>
        <button
          type="button"
          onClick={onCreateNew}
          style={{
            padding: "10px 20px",
            background: "#059669",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
          data-testid="btn-create-first-group"
        >
          + Tạo nhóm đầu tiên
        </button>
      </div>
    );
  }

  return (
    <div className="my-groups-view" data-testid="my-groups-view">
      <div className="groups-grid">
        {groups.map((group) => (
          <div
            key={group.group_id}
            className="group-card"
            data-testid={`my-group-card-${group.group_id}`}
          >
            <div className="card-cover">
              {group.cover_image_url ? (
                <img src={resolveMediaUrl(group.cover_image_url)} alt={group.name} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 28,
                  }}
                >
                  🌿
                </div>
              )}
              <div className="privacy-pill">
                {group.privacy === "PUBLIC" ? "Công khai" : "Riêng tư"}
              </div>
              <div className="type-pill">
                {group.group_type === "DISTRICT" ? "Quận" : group.group_type === "WARD" ? "Phường" : "Chủ đề"}
              </div>
            </div>

            <div className="card-body">
              <h3 className="group-name">{group.name}</h3>
              {group.district && (
                <div className="group-scope">
                  📍 {group.ward ? `${group.ward}, ` : ""}{group.district}{group.province ? `, ${group.province}` : ""}
                </div>
              )}
              {group.theme_topic && (
                <div className="group-scope">🏷️ {group.theme_topic}</div>
              )}

              {group.description && (
                <p className="group-description">{group.description}</p>
              )}

              <div className="card-stats">
                <span className="member-count">
                  👥 {group.members_count} thành viên
                </span>
                {group.my_role && (
                  <span className="role-tag">
                    {group.my_role === "ADMIN" ? "👑 Quản trị viên" : "Thành viên"}
                  </span>
                )}
              </div>
            </div>

            <div className="card-footer">
              <button
                type="button"
                className="btn-view"
                onClick={() => onSelectGroup(group.group_id)}
                data-testid={`btn-view-group-${group.group_id}`}
              >
                Vào nhóm
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

