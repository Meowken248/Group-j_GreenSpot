/**
 * FeedLeftSidebar (Cột trái Bảng tin Geo-Feed)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 98 - 100)
 * Quản lý các tab: Gần tôi, Quận của tôi, Bạn bè, Nhóm và Lối tắt nhanh
 */

import React from "react";
import type { FeedTab } from "../types/feed.types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

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
}

export const FeedLeftSidebar: React.FC<FeedLeftSidebarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onNavigate,
}) => {
  const userName = currentUser?.full_name || "Khách vãng lai";
  const userAvatar = currentUser?.avatar_url;
  const greenPoints = currentUser?.total_green_points || 0;

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
      </nav>

      {/* 3. Lối tắt nhanh đến các phân hệ liên quan */}
      <div className="feed-shortcuts-section">
        <div className="section-eyebrow-label">LỐI TẮT NHANH</div>

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

