import React from "react";
import type { GroupItem } from "../types/group";

interface GroupCreatedSuccessModalProps {
  group: GroupItem;
  onInviteFriends: () => void;
  onEnterGroup: () => void;
}

export const GroupCreatedSuccessModal: React.FC<GroupCreatedSuccessModalProps> = ({
  group,
  onInviteFriends,
  onEnterGroup,
}) => {
  // Ngăn chặn đóng popup khi bấm backdrop hoặc phím ESC theo đúng yêu cầu SRS
  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="group-modal-backdrop"
      onClick={handleBackdropClick}
      data-testid="group-created-success-modal"
    >
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-tag">POPUP</div>
        <div className="modal-title" data-testid="modal-title-success">
          ĐÃ TẠO NHÓM
        </div>
        <div className="modal-description" data-testid="modal-role-desc">
          Bạn là Quản trị nhóm
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
          Nhóm <strong>"{group.name}"</strong> đã sẵn sàng hoạt động. Hãy mời bạn bè tham gia
          hoặc truy cập trực tiếp vào nhóm để đăng bài viết đầu tiên!
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onInviteFriends}
            data-testid="btn-invite-friends-action"
          >
            Mời bạn bè
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onEnterGroup}
            data-testid="btn-enter-group-action"
          >
            Vào nhóm
          </button>
        </div>
      </div>
    </div>
  );
};

