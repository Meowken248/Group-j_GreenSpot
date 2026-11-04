import React, { useState } from "react";
import type { GroupItem, GroupType, AdministrativeMetadata } from "../types/group";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface ExploreGroupsViewProps {
  groups: GroupItem[];
  metadata: AdministrativeMetadata;
  isLoading: boolean;
  selectedType: GroupType | "";
  selectedProvince?: string;
  selectedDistrict: string;
  searchKeyword: string;
  onFilterChange: (filters: {
    group_type?: GroupType;
    province?: string;
    district?: string;
    q?: string;
  }) => void;
  onSelectGroup: (groupId: string) => void;
  onJoinGroup: (groupId: string) => void;
}

export const ExploreGroupsView: React.FC<ExploreGroupsViewProps> = ({
  groups,
  metadata,
  isLoading,
  selectedType,
  selectedProvince = "",
  selectedDistrict,
  searchKeyword,
  onFilterChange,
  onSelectGroup,
  onJoinGroup,
}) => {
  const [searchTerm, setSearchTerm] = useState(searchKeyword);

  const availableDistricts =
    selectedProvince && metadata.districts_by_province?.[selectedProvince]
      ? metadata.districts_by_province[selectedProvince]
      : metadata.districts || [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      group_type: selectedType ? selectedType : undefined,
      province: selectedProvince || undefined,
      district: selectedDistrict || undefined,
      q: searchTerm.trim() || undefined,
    });
  };

  return (
    <div className="explore-groups-view" data-testid="explore-groups-view">
      {/* Thanh tìm kiếm và bộ lọc */}
      <div
        style={{
          background: "#ffffff",
          padding: 16,
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          marginBottom: 24,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{ flex: 1, minWidth: 220, display: "flex", gap: 8 }}
        >
          <input
            type="text"
            placeholder="Tìm kiếm nhóm theo tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1.5px solid #cbd5e1",
              fontSize: 14,
            }}
            data-testid="input-search-groups"
          />
          <button
            type="submit"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "#059669",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
            data-testid="btn-search-groups"
          >
            Tìm
          </button>
        </form>

        <select
          value={selectedType}
          onChange={(e) => {
            const val = e.target.value as GroupType | "";
            onFilterChange({
              group_type: val ? val : undefined,
              province: selectedProvince || undefined,
              district: selectedDistrict || undefined,
              q: searchTerm.trim() || undefined,
            });
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1.5px solid #cbd5e1",
            fontSize: 14,
            background: "#fff",
          }}
          data-testid="filter-group-type"
        >
          <option value="">Tất cả loại nhóm</option>
          <option value="DISTRICT">Theo quận</option>
          <option value="WARD">Theo phường</option>
          <option value="THEME">Theo chủ đề</option>
        </select>

        {/* Bộ lọc Tỉnh / Thành phố */}
        <select
          value={selectedProvince}
          onChange={(e) => {
            const val = e.target.value;
            onFilterChange({
              group_type: selectedType ? selectedType : undefined,
              province: val || undefined,
              district: undefined,
              q: searchTerm.trim() || undefined,
            });
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1.5px solid #cbd5e1",
            fontSize: 14,
            background: "#fff",
          }}
          data-testid="filter-group-province"
        >
          <option value="">Tất cả tỉnh/thành</option>
          {(metadata.provinces || []).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Bộ lọc Quận / Huyện */}
        <select
          value={selectedDistrict}
          onChange={(e) => {
            const val = e.target.value;
            onFilterChange({
              group_type: selectedType ? selectedType : undefined,
              province: selectedProvince || undefined,
              district: val || undefined,
              q: searchTerm.trim() || undefined,
            });
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1.5px solid #cbd5e1",
            fontSize: 14,
            background: "#fff",
          }}
          data-testid="filter-group-district"
        >
          <option value="">Tất cả quận/huyện</option>
          {availableDistricts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#64748b" }}>
          Đang tìm kiếm nhóm cộng đồng…
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state" data-testid="empty-explore-groups">
          <div className="empty-icon">🔍</div>
          <h3>Không tìm thấy nhóm phù hợp</h3>
          <p>Hãy thử thay đổi từ khoá tìm kiếm hoặc mở rộng bộ lọc khu vực!</p>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map((group) => (
            <div
              key={group.group_id}
              className="group-card"
              data-testid={`explore-card-${group.group_id}`}
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
                  {group.is_member && (
                    <span className="role-tag">✓ Đã tham gia</span>
                  )}
                </div>
              </div>

              <div className="card-footer">
                <button
                  type="button"
                  className="btn-view"
                  onClick={() => onSelectGroup(group.group_id)}
                  data-testid={`btn-explore-view-${group.group_id}`}
                >
                  Xem chi tiết
                </button>
                {!group.is_member && (
                  <button
                    type="button"
                    className="btn-join"
                    onClick={() => onJoinGroup(group.group_id)}
                    data-testid={`btn-explore-join-${group.group_id}`}
                  >
                    Tham gia
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

