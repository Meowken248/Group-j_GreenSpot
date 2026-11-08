/**
 * GroupMembersManagement.tsx
 * STT 04 - Màn 1/4: Quản lý danh sách thành viên nhóm
 * Tuân thủ đầy đủ đặc tả Báo cáo Đồ án (pp. 66-69, 75):
 * - Bố cục 2 khung: Khung trái Danh sách thành viên (20 dòng/trang), Khung phải Mời thành viên
 * - Dòng "DANH SÁCH THÀNH VIÊN ({N})", "Nhóm: {tên nhóm}"
 * - Dòng xám "Bạn đang xem với quyền Admin hệ thống"
 * - Cụm nút Đổi vai trò và Xoá khỏi nhóm theo đúng ma trận quy tắc
 * - Tích hợp đầy đủ Màn 2/4 (Đổi vai trò), Màn 3/4 (Xác nhận xoá), Màn 4/4 (Đã xoá)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { groupService } from "../services/groupService";
import type { GroupMemberItem, GroupMemberListResponse } from "../types/group";
import { ChangeMemberRoleModal } from "./ChangeMemberRoleModal";
import { RemoveMemberConfirmModal } from "./RemoveMemberConfirmModal";
import { MemberRemovedSuccessModal } from "./MemberRemovedSuccessModal";
import { InviteFriendsModal } from "./InviteFriendsModal";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import "../styles/group_members_management.scss";

interface GroupMembersManagementProps {
  groupId?: string;
  onInviteClick?: () => void;
  onBack?: () => void;
  onMemberUpdated?: () => void;
}

export const GroupMembersManagement: React.FC<GroupMembersManagementProps> = ({
  groupId: propGroupId,
  onInviteClick: propOnInviteClick,
  onBack,
  onMemberUpdated,
}) => {
  const resolveGroupId = (): string => {
    if (propGroupId) return propGroupId;
    const match = window.location.pathname.match(/\/groups\/([^/?#]+)/);
    if (match) return match[1];
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get("groupId") || urlParams.get("id");
    if (queryId) return queryId;
    const hashMatch = window.location.hash.match(/[?&#]id=([^&]+)/);
    if (hashMatch) return hashMatch[1];
    return "";
  };

  const effectiveGroupId = resolveGroupId();

  const handleNavigate = useCallback((target: string) => {
    if (onBack) {
      onBack();
      return;
    }
    if (target.startsWith("/login")) {
      window.location.hash = "#auth";
    } else {
      window.location.hash = "#groups";
    }
  }, [onBack]);

  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [groupName, setGroupName] = useState<string>("");
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(false);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [canInvite, setCanInvite] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dòng thành viên vừa đổi vai trò thành công (để tạo hiệu ứng nền xanh nhạt 2s)
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);

  // Dọn dẹp timers khi unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  // Modal states
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<GroupMemberItem | null>(null);
  const [selectedMemberForDelete, setSelectedMemberForDelete] = useState<GroupMemberItem | null>(null);
  const [recentlyRemovedMember, setRecentlyRemovedMember] = useState<{ name: string; groupName: string } | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const loadMembers = useCallback(
    async (targetPage: number = 1, append: boolean = false) => {
      if (!effectiveGroupId) return;

      try {
        if (targetPage === 1 && !append) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setErrorNotice(null);

        const data: GroupMemberListResponse = await groupService.getGroupMembers(
          effectiveGroupId,
          targetPage,
          20
        );

        setGroupName(data.group_name || "Nhóm cộng đồng");
        setTotalCount(data.total);
        setIsSystemAdmin(!!data.is_system_admin);
        setMyRole(data.my_role || null);
        setCanInvite(!!data.can_invite);

        if (append) {
          setMembers((prev) => {
            const existingIds = new Set(prev.map((m) => m.user_id));
            const freshItems = data.items.filter((m) => !existingIds.has(m.user_id));
            return [...prev, ...freshItems];
          });
        } else {
          setMembers(data.items);
        }
        setPage(targetPage);
      } catch (err: any) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        const errMsg =
          typeof detail === "string"
            ? detail
            : detail?.message || "Không thể tải danh sách thành viên. Vui lòng thử lại";

        if (status === 401) {
          handleNavigate(`/login?redirect=/groups/${effectiveGroupId}/members`);
          return;
        }

        if (status === 403) {
          showToast(errMsg, "error");
          setTimeout(() => handleNavigate("/feed"), 3000);
          return;
        }

        if (status === 404) {
          showToast("Nhóm không tồn tại hoặc đã bị xoá", "error");
          setTimeout(() => handleNavigate("/feed"), 3000);
          return;
        }

        setErrorNotice(errMsg);
        showToast(errMsg, "error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [effectiveGroupId, handleNavigate]
  );

  useEffect(() => {
    loadMembers(1, false);
  }, [loadMembers]);

  // Xử lý nạp thêm 20 dòng kế tiếp
  const handleLoadMore = () => {
    if (loadingMore || members.length >= totalCount) return;
    loadMembers(page + 1, true);
  };

  // Màn 2: Đổi vai trò thành công
  const handleRoleChangeSuccess = (updatedMember: GroupMemberItem, message: string) => {
    setSelectedMemberForRole(null);
    showToast(message, "success");

    // Đánh dấu để nhấp nháy nền xanh trong 2 giây
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedUserId(updatedMember.user_id);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedUserId(null);
    }, 2000);

    // Tải lại danh sách để sắp xếp lại đúng thứ tự vai trò
    loadMembers(1, false);
    onMemberUpdated?.();
  };

  // Màn 3: Xóa thành viên thành công -> Mở Màn 4
  const handleRemoveSuccess = (removedMember: GroupMemberItem) => {
    setSelectedMemberForDelete(null);
    setRecentlyRemovedMember({
      name: removedMember.full_name,
      groupName: groupName || "Nhóm",
    });
  };

  // Màn 4: Đóng thông báo xoá -> Tải lại danh sách, giảm số lượng
  const handleCloseRemovedModal = () => {
    setRecentlyRemovedMember(null);
    loadMembers(1, false);
    onMemberUpdated?.();
  };

  const handleOpenInvite = () => {
    if (propOnInviteClick) {
      propOnInviteClick();
    } else {
      setIsInviteModalOpen(true);
    }
  };

  const isViewerMemberOnly = myRole === "MEMBER" && !isSystemAdmin;

  return (
    <div className="group-members-container" data-testid="group-members-management-page">
      {/* Toast thông báo */}
      {toast && (
        <div
          data-testid="members-global-toast"
          className={`members-global-toast toast-${toast.type}`}
        >
          <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Banner thông tin trên cùng */}
      <div className="members-header-banner" data-testid="members-header-banner">
        <div className="banner-info">
          <h1 className="group-title">{groupName || "Thành viên nhóm"}</h1>
          <p className="group-breadcrumb">
            Nhóm: <strong>{groupName}</strong>
          </p>
          {isSystemAdmin && (
            <div className="admin-system-badge" data-testid="admin-system-notice">
              🛡️ Bạn đang xem với quyền Admin hệ thống
            </div>
          )}
        </div>

        <div className="banner-actions">
          <button
            type="button"
            className="btn-action btn-change-role"
            onClick={() => handleNavigate(`/groups/${effectiveGroupId}`)}
            data-testid="btn-back-to-group"
          >
            ← Quay lại trang nhóm
          </button>
        </div>
      </div>

      {/* Thân trang: Bố cục 2 khung */}
      <div className={`members-layout-grid ${isViewerMemberOnly ? "full-width" : ""}`}>
        {/* KHUNG TRÁI: DANH SÁCH THÀNH VIÊN */}
        <div className="members-card-left" data-testid="members-card-left">
          <div className="card-title-row">
            <h2 data-testid="members-count-title">
              DANH SÁCH THÀNH VIÊN ({totalCount})
            </h2>
            <p className="group-name-indicator">
              Nhóm: <strong>{groupName}</strong>
            </p>
            {isSystemAdmin && (
              <p className="sys-admin-notice">Bạn đang xem với quyền Admin hệ thống</p>
            )}
          </div>

          {loading ? (
            <div className="skeleton-list" data-testid="skeleton-loader">
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          ) : errorNotice ? (
            <div className="members-error-state" data-testid="error-state">
              <p className="error-message-text">{errorNotice}</p>
              <button
                type="button"
                className="btn-action btn-change-role btn-retry-load"
                onClick={() => loadMembers(1, false)}
              >
                Tải lại
              </button>
            </div>
          ) : members.length === 0 ? (
            <div className="members-empty-state">
              Chưa có thành viên nào trong danh sách.
            </div>
          ) : (
            <>
              <div className="members-list-wrapper" data-testid="members-list-wrapper">
                {members.map((mem) => {
                  const isHighlighted = highlightedUserId === mem.user_id;
                  const isSelf = !!mem.is_self;

                  // Nhãn vai trò chuẩn màu
                  let roleClass = "role-member";
                  let roleName = "Thành viên";
                  if (mem.role === "ADMIN") {
                    roleClass = "role-admin";
                    roleName = "Quản trị nhóm";
                  } else if (mem.role === "MODERATOR") {
                    roleClass = "role-moderator";
                    roleName = "Kiểm duyệt viên";
                  }

                  return (
                    <div
                      key={mem.user_id}
                      className={`member-item-row ${isHighlighted ? "highlight-success" : ""}`}
                      data-testid={`member-row-${mem.user_id}`}
                    >
                      {/* Cột trái: avatar | tên | vai trò */}
                      <div className="member-profile-info">
                        <div className="avatar-circle">
                          {mem.avatar_url ? (
                            <img src={resolveMediaUrl(mem.avatar_url)} alt={mem.full_name} />
                          ) : (
                            <span>{mem.full_name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="name-role-cluster">
                          <span className="member-name">{mem.full_name}</span>
                          {isSelf && (
                            <span className="self-badge" data-testid={`badge-you-${mem.user_id}`}>
                              (Bạn)
                            </span>
                          )}
                          <span
                            className={`role-pill ${roleClass}`}
                            data-testid={`role-badge-${mem.user_id}`}
                          >
                            {roleName}
                          </span>
                        </div>
                      </div>

                      {/* Cột phải: 2 nút thao tác theo ma trận quy tắc */}
                      {!isViewerMemberOnly && (
                        <div
                          className="member-actions-cluster"
                          data-testid={`actions-${mem.user_id}`}
                        >
                          {/* Nút Đổi vai trò */}
                          <div className="action-button-tooltip-wrapper">
                            <button
                              type="button"
                              className="btn-action btn-change-role"
                              disabled={!mem.can_change_role}
                              onClick={() => mem.can_change_role && setSelectedMemberForRole(mem)}
                              title={mem.disabled_change_role_reason || undefined}
                              data-testid={`btn-change-role-${mem.user_id}`}
                            >
                              Đổi vai trò
                            </button>
                            {mem.disabled_change_role_reason && (
                              <div className="button-tooltip-content">
                                {mem.disabled_change_role_reason}
                              </div>
                            )}
                          </div>

                          {/* Nút Xoá khỏi nhóm */}
                          <div className="action-button-tooltip-wrapper">
                            <button
                              type="button"
                              className="btn-action btn-remove-member"
                              disabled={!mem.can_remove}
                              onClick={() => mem.can_remove && setSelectedMemberForDelete(mem)}
                              title={mem.disabled_remove_reason || undefined}
                              data-testid={`btn-remove-${mem.user_id}`}
                            >
                              Xoá khỏi nhóm
                            </button>
                            {mem.disabled_remove_reason && (
                              <div className="button-tooltip-content">
                                {mem.disabled_remove_reason}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Nút Xem thêm khi còn trang */}
              {members.length < totalCount && (
                <div className="load-more-section">
                  <button
                    type="button"
                    className="btn-load-more"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    data-testid="btn-load-more"
                  >
                    {loadingMore && <span className="spinner-icon" />}
                    <span>{loadingMore ? "Đang tải thêm..." : "Xem thêm"}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* KHUNG PHẢI: MỜI (Ẩn với Thành viên thường) */}
        {!isViewerMemberOnly && (
          <div className="members-card-right" data-testid="members-card-right">
            <h3 className="right-title">MỜI</h3>
            <p className="invite-instruction">
              Gửi lời mời tham gia nhóm tới bạn bè và cư dân cùng khu vực để xây dựng cộng đồng bảo vệ môi trường vững mạnh.
            </p>
            <button
              type="button"
              className="btn-invite-wide"
              onClick={handleOpenInvite}
              disabled={!canInvite}
              data-testid="btn-open-invite"
            >
              <span>+ Mời thành viên</span>
            </button>
          </div>
        )}
      </div>

      {/* Màn 2/4: Popup Đổi vai trò */}
      <ChangeMemberRoleModal
        isOpen={!!selectedMemberForRole}
        groupId={effectiveGroupId || ""}
        member={selectedMemberForRole}
        isSelf={!!selectedMemberForRole?.is_self}
        onClose={() => setSelectedMemberForRole(null)}
        onSuccess={handleRoleChangeSuccess}
        onErrorToast={(msg) => showToast(msg, "error")}
      />

      {/* Màn 3/4: Popup Xác nhận xoá */}
      <RemoveMemberConfirmModal
        isOpen={!!selectedMemberForDelete}
        groupId={effectiveGroupId || ""}
        member={selectedMemberForDelete}
        onClose={() => setSelectedMemberForDelete(null)}
        onSuccess={handleRemoveSuccess}
        onErrorToast={(msg) => showToast(msg, "error")}
      />

      {/* Màn 4/4: Popup Thông báo đã xoá thành công */}
      <MemberRemovedSuccessModal
        isOpen={!!recentlyRemovedMember}
        groupName={recentlyRemovedMember?.groupName || groupName}
        memberName={recentlyRemovedMember?.name || ""}
        onClose={handleCloseRemovedModal}
      />

      {/* Modal Mời bạn bè */}
      {effectiveGroupId && (
        <InviteFriendsModal
          isOpen={isInviteModalOpen}
          groupId={effectiveGroupId}
          groupName={groupName}
          onClose={() => setIsInviteModalOpen(false)}
          onEnterGroup={() => {
            setIsInviteModalOpen(false);
            showToast("Đã gửi lời mời thành công!", "success");
            loadMembers(1, false);
          }}
        />
      )}
    </div>
  );
};
