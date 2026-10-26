import React, { useState } from "react";
import type { GroupType } from "../types/group";

interface GroupTypeSelectorProps {
  selectedType: GroupType | null;
  onSelectType: (type: GroupType) => void;
  adminGroupsCount: number;
  userDistrict?: string | null;
  onViewMyGroups: () => void;
  onNavigateToProfile?: () => void;
}

export const GroupTypeSelector: React.FC<GroupTypeSelectorProps> = ({
  selectedType,
  onSelectType,
  adminGroupsCount,
  userDistrict,
  onViewMyGroups,
  onNavigateToProfile,
}) => {
  const [profileAlert, setProfileAlert] = useState<string | null>(null);
  const isLimitReached = adminGroupsCount >= 5;

  const handleCardClick = (type: GroupType) => {
    if (isLimitReached) return;

    // Ràng buộc hồ sơ theo SRS Màn 1:
    // Tài khoản chưa cập nhật quận hoặc phường nhưng chọn "Theo quận" hoặc "Theo phường"
    if ((type === "DISTRICT" || type === "WARD") && (!userDistrict || !userDistrict.trim())) {
      setProfileAlert("Vui lòng cập nhật địa chỉ trong hồ sơ để tạo nhóm theo khu vực");
      return;
    }

    setProfileAlert(null);
    onSelectType(type);
  };

  return (
    <div className="type-selector-card" data-testid="group-type-selector">
      <div className="selector-title">TẠO NHÓM MỚI</div>
      <div className="selector-subtitle">
        Chọn phạm vi hoạt động của nhóm cộng đồng để bắt đầu kết nối cư dân và tình nguyện viên
      </div>

      {isLimitReached && (
        <div className="limit-warning-banner" data-testid="limit-warning-banner">
          <span>⚠️</span>
          <span>
            Bạn đã tạo tối đa 5 nhóm. Hãy giải tán một nhóm để tạo nhóm mới hoặc{" "}
            <button type="button" onClick={onViewMyGroups}>
              Xem danh sách nhóm của tôi
            </button>
          </span>
        </div>
      )}

      {profileAlert && (
        <div className="limit-warning-banner" data-testid="profile-warning-banner">
          <span>📍</span>
          <span>{profileAlert}</span>
          {onNavigateToProfile && (
            <button
              type="button"
              onClick={onNavigateToProfile}
              style={{ marginLeft: 8, fontWeight: 700 }}
            >
              Cập nhật hồ sơ
            </button>
          )}
        </div>
      )}

      <div className="cards-row">
        {/* Thẻ 1: Theo quận */}
        <div
          className={`type-card ${selectedType === "DISTRICT" ? "active" : ""} ${
            isLimitReached ? "disabled" : ""
          }`}
          onClick={() => handleCardClick("DISTRICT")}
          data-testid="type-card-district"
        >
          <div className="card-icon">🏘️</div>
          <div className="card-name">Theo quận</div>
          <div className="card-desc">Nhóm cho cư dân trong cùng một quận</div>
        </div>

        {/* Thẻ 2: Theo phường */}
        <div
          className={`type-card ${selectedType === "WARD" ? "active" : ""} ${
            isLimitReached ? "disabled" : ""
          }`}
          onClick={() => handleCardClick("WARD")}
          data-testid="type-card-ward"
        >
          <div className="card-icon">🏡</div>
          <div className="card-name">Theo phường</div>
          <div className="card-desc">Nhóm cho cư dân trong cùng một phường</div>
        </div>

        {/* Thẻ 3: Theo chủ đề */}
        <div
          className={`type-card ${selectedType === "THEME" ? "active" : ""} ${
            isLimitReached ? "disabled" : ""
          }`}
          onClick={() => handleCardClick("THEME")}
          data-testid="type-card-theme"
        >
          <div className="card-icon">🌿</div>
          <div className="card-name">Theo chủ đề</div>
          <div className="card-desc">Nhóm theo sở thích hoặc chủ đề môi trường chung</div>
        </div>
      </div>

      <div className="selector-footer">
        <span>Nhóm của tôi: </span>
        <button
          type="button"
          className="link-btn"
          onClick={onViewMyGroups}
          data-testid="btn-view-my-groups"
        >
          Xem danh sách
        </button>
      </div>
    </div>
  );
};

