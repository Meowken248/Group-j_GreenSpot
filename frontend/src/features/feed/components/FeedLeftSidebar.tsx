/**
 * FeedLeftSidebar (Cột trái Bảng tin Geo-Feed)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 98 - 100)
 * Quản lý các tab: Gần tôi, Quận của tôi, Bạn bè, Nhóm và Lối tắt nhanh
 */

import React, { useState, useEffect } from "react";
import type { FeedTab } from "../types/feed.types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { groupService } from "../../groups/services/groupService";
import type { GroupItem } from "../../groups/types/group";

interface FeedLeftSidebarProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  currentUser?: {
    user_id: string;
    full_name: string;
    avatar_url?: string | null;
    total_green_points?: number;
    email?: string;
  } | null;
  onNavigate: (route: string) => void;
  selectedGroupId?: string | null;
  onSelectGroup?: (groupId: string) => void;
  onOpenCreateGroup?: () => void;
}

export const FeedLeftSidebar: React.FC<FeedLeftSidebarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onNavigate,
  selectedGroupId,
  onSelectGroup,
  onOpenCreateGroup,
}) => {
  const userName = currentUser?.full_name || "Khách vãng lai";
  const userAvatar = currentUser?.avatar_url;
  const greenPoints = currentUser?.total_green_points || 0;

  const [myGroups, setMyGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser?.user_id) {
      setMyGroups([]);
      return;
    }
    let isMounted = true;
    const fetchGroups = async () => {
      try {
        setLoadingGroups(true);
        const res = await groupService.getMyGroups();
        if (isMounted && res && res.items) {
          setMyGroups(res.items);
        }
      } catch {
        // im lặng nếu không có quyền hoặc lỗi mạng
      } finally {
        if (isMounted) setLoadingGroups(false);
      }
    };
    fetchGroups();

    const handleGroupsUpdate = () => fetchGroups();
    window.addEventListener("group_joined", handleGroupsUpdate);
    window.addEventListener("group_created", handleGroupsUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("group_joined", handleGroupsUpdate);
      window.removeEventListener("group_created", handleGroupsUpdate);
    };
  }, [currentUser?.user_id]);

  return (
    <aside className="feed-left-sidebar">
      {/* 1. Mini Profile Card */}
      <div
        className="mini-profile-card"
        onClick={() => onNavigate("profile")}
        role="button"
        tabIndex={0}
      >
        <div className="mini-avatar-wrapper">
          {userAvatar ? (
            <img
              src={resolveMediaUrl(userAvatar)}
              alt={userName}
              className="mini-avatar-img"
            />
          ) : (
            <div className="mini-avatar-placeholder">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="mini-user-info">
          <h4 className="mini-user-name">{userName}</h4>
          <div className="mini-user-points">
            <span className="points-leaf-icon">🌱</span>
            <span className="points-value">{greenPoints.toLocaleString()} GP</span>
          </div>
        </div>
      </div>

      {/* 2. Menu Tabs chuyển đổi Geo-Feed (SRS pp. 98 - 100) */}
      <nav className="feed-nav-section" aria-label="Bộ lọc phân vùng bảng tin">
        <div className="section-eyebrow-label">PHÂN VÙNG BẢNG TIN</div>

        <button
          type="button"
          className={`feed-nav-item ${activeTab === "nearby" ? "active" : ""}`}
          onClick={() => onTabChange("nearby")}
        >
          <span className="nav-item-icon">📍</span>
          <span className="nav-item-text">Gần tôi</span>
          {activeTab === "nearby" && <span className="nav-active-pill">Đang chọn</span>}
        </button>

        <button
          type="button"
          className={`feed-nav-item ${activeTab === "district" ? "active" : ""}`}
          onClick={() => onTabChange("district")}
        >
          <span className="nav-item-icon">🏙️</span>
          <span className="nav-item-text">Quận của tôi</span>
          {activeTab === "district" && <span className="nav-active-pill">Đang chọn</span>}
        </button>

        <button
          type="button"
          className={`feed-nav-item ${activeTab === "friends" ? "active" : ""}`}
          onClick={() => onTabChange("friends")}
        >
          <span className="nav-item-icon">👥</span>
          <span className="nav-item-text">Bạn bè</span>
          {activeTab === "friends" && <span className="nav-active-pill">Đang chọn</span>}
        </button>

        <button
          type="button"
          className={`feed-nav-item ${activeTab === "groups" ? "active" : ""}`}
          onClick={() => onTabChange("groups")}
        >
          <span className="nav-item-icon">🤝</span>
          <span className="nav-item-text">Nhóm tình nguyện</span>
          {activeTab === "groups" && <span className="nav-active-pill">Đang chọn</span>}
        </button>

        {/* 2.5. Sự kiện và chiến dịch Chủ Nhật Xanh (Chức năng 21) */}
        <button
          type="button"
          className="feed-nav-item"
          data-testid="feed-nav-events"
          onClick={() => onNavigate("events")}
          title="Sự kiện và chiến dịch Chủ Nhật Xanh (Chức năng 21)"
        >
          <span className="nav-item-icon">📅</span>
          <span className="nav-item-text">Chủ Nhật Xanh</span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.68rem",
              background: "#10b981",
              color: "#ffffff",
              padding: "2px 7px",
              borderRadius: "10px",
              fontWeight: 800,
            }}
          >
            +50 GP
          </span>
        </button>
      </nav>

      {/* 3. Phân mục Nhóm của bạn (Chức năng 16) */}
      {currentUser && (
        <div className="feed-my-groups-section" data-testid="feed-my-groups-section">
          <div className="section-header-flex">
            <div className="section-eyebrow-label">NHÓM CỦA BẠN ({myGroups.length})</div>
            {onOpenCreateGroup && (
              <button
                type="button"
                className="btn-create-group-mini"
                onClick={onOpenCreateGroup}
                title="Tạo nhóm cộng đồng mới (Chức năng 16)"
              >
                + Tạo nhóm
              </button>
            )}
          </div>

          {loadingGroups ? (
            <div className="groups-loading-hint">Đang nạp nhóm…</div>
          ) : myGroups.length > 0 ? (
            <div className="my-groups-list">
              {myGroups.slice(0, 5).map((grp) => {
                const isSelected = selectedGroupId === grp.group_id;
                return (
                  <button
                    key={grp.group_id}
                    type="button"
                    className={`my-group-nav-item ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      if (onSelectGroup) {
                        onSelectGroup(grp.group_id);
                      } else {
                        onNavigate(`groups?id=${grp.group_id}`);
                      }
                    }}
                    title={grp.name}
                  >
                    <div className="group-mini-avatar">
                      {grp.avatar_url ? (
                        <img src={resolveMediaUrl(grp.avatar_url)} alt={grp.name} />
                      ) : (
                        <span>🌿</span>
                      )}
                    </div>
                    <div className="group-mini-details">
                      <span className="group-mini-name">{grp.name}</span>
                      <span className="group-mini-meta">
                        {grp.members_count} thành viên {grp.my_role === "ADMIN" && "• 👑 Admin"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="groups-empty-hint">
              <span>Bạn chưa tham gia nhóm nào.</span>
            </div>
          )}

          <button
            type="button"
            className="btn-explore-all-groups"
            onClick={() => onNavigate("groups")}
          >
            <span>🧭</span>
            <span>Khám phá các nhóm</span>
          </button>
        </div>
      )}

      {/* 4. Widget Lối tắt Chiến dịch Chủ Nhật Xanh (Chức năng 21) */}
      <div className="feed-events-sidebar-widget" data-testid="feed-events-sidebar-widget">
        <div className="widget-header-flex">
          <span className="widget-badge">🌱 CHỦ NHẬT XANH</span>
          <span className="widget-icon">🎯</span>
        </div>
        <div className="widget-event-title">
          Check-in hiện trường nhận ngay +50 Điểm Xanh (GP)
        </div>
        <div className="widget-event-time">
          Chiến dịch ra quân bảo vệ môi trường toàn thành phố
        </div>
        <button
          type="button"
          className="widget-btn-explore"
          data-testid="btn-explore-events-sidebar"
          onClick={() => onNavigate("events")}
        >
          Khám phá sự kiện ngay
        </button>
      </div>


      {/* 5. Lối tắt nhanh đến các phân hệ liên quan */}
      <div className="feed-shortcuts-section">
        <div className="section-eyebrow-label">LỐI TẮT NHANH</div>

        <button
          type="button"
          className="feed-shortcut-item shortcut-nav-item"
          data-testid="shortcut-nav-events"
          onClick={() => onNavigate("events")}
        >
          <span className="shortcut-icon">📅</span>
          <span className="shortcut-text">Sự kiện Chủ Nhật Xanh (STT 21)</span>
        </button>

        <button
          type="button"
          className="feed-shortcut-item shortcut-nav-item"
          onClick={() => onNavigate("map")}
        >
          <span className="shortcut-icon">🗺️</span>
          <span className="shortcut-text">Bản đồ số WebGIS</span>
        </button>

        <button
          type="button"
          className="feed-shortcut-item shortcut-nav-item"
          onClick={() => onNavigate("report")}
        >
          <span className="shortcut-icon">🚨</span>
          <span className="shortcut-text">Báo cáo ô nhiễm (STT 18)</span>
        </button>

        <button
          type="button"
          className="feed-shortcut-item shortcut-nav-item"
          onClick={() => onNavigate("friends")}
        >
          <span className="shortcut-icon">🤝</span>
          <span className="shortcut-text">Bạn bè & Kết nối (STT 12)</span>
        </button>

        <button
          type="button"
          className="feed-shortcut-item shortcut-nav-item"
          onClick={() => onNavigate("messages")}
        >
          <span className="shortcut-icon">💬</span>
          <span className="shortcut-text">Đoạn chat & Tin nhắn (STT 15)</span>
        </button>

        <button
          type="button"
          className="feed-shortcut-item shortcut-nav-item"
          onClick={() => onNavigate("penalties")}
        >
          <span className="shortcut-icon">⚖️</span>
          <span className="shortcut-text">Tra cứu xử phạt (STT 11)</span>
        </button>

        <button
          type="button"
          className="feed-shortcut-item shortcut-nav-item"
          onClick={() => onNavigate("profile")}
        >
          <span className="shortcut-icon">🌿</span>
          <span className="shortcut-text">Green Passport (STT 05)</span>
        </button>
      </div>
    </aside>
  );
};

