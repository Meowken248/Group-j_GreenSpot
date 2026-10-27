import React, { useState } from "react";
import type { FundraiserCampaignItem } from "../types/fundraiser.types";
import { HCMC_DISTRICTS } from "../types/fundraiser.types";

interface CampaignListPanelProps {
  campaigns: FundraiserCampaignItem[];
  total: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  statusFilter: string;
  districtFilter: string;
  searchQuery: string;
  myCampaignsOnly: boolean;
  isLoggedIn: boolean;
  onStatusChange: (status: string) => void;
  onDistrictChange: (district: string) => void;
  onSearchChange: (search: string) => void;
  onMyCampaignsToggle: () => void;
  onPageChange: (page: number) => void;
  onSelectCampaign: (campaign: FundraiserCampaignItem) => void;
  onOpenCreateModal: () => void;
  onRetry: () => void;
  onNavigateToLogin: () => void;
}

export const CampaignListPanel: React.FC<CampaignListPanelProps> = ({
  campaigns,
  total,
  currentPage,
  pageSize,
  isLoading,
  error,
  statusFilter,
  districtFilter,
  searchQuery,
  myCampaignsOnly,
  isLoggedIn,
  onStatusChange,
  onDistrictChange,
  onSearchChange,
  onMyCampaignsToggle,
  onPageChange,
  onSelectCampaign,
  onOpenCreateModal,
  onRetry,
  onNavigateToLogin,
}) => {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleCreateClick = () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    onOpenCreateModal();
  };

  const getStatusBadge = (camp: FundraiserCampaignItem) => {
    if (camp.status === "completed") {
      return <span className="status-badge status-completed">Đã đạt mục tiêu</span>;
    }
    if (camp.status === "closed" || camp.days_left === 0) {
      return <span className="status-badge status-closed">Đã kết thúc</span>;
    }
    if (camp.status === "pending") {
      return <span className="status-badge status-pending">Chờ duyệt</span>;
    }
    if (camp.status === "rejected") {
      return <span className="status-badge status-rejected">Bị từ chối</span>;
    }
    return <span className="status-badge status-approved">Đang gây quỹ</span>;
  };

  return (
    <div className="campaign-list-panel-view" data-testid="campaign-list-panel">
      {/* 1. HERO BANNER */}
      <div className="fundraiser-hero-banner">
        <span className="hero-badge">CỘNG ĐỒNG XANH • TP. HỒ CHÍ MINH</span>
        <h1>Gây Quỹ Môi Trường Đô Thị</h1>
        <p>
          Chung tay ủng hộ các chiến dịch làm sạch kênh rạch, phủ xanh công viên,
          giáo dục phân loại rác học đường và bảo tồn hệ sinh thái tự nhiên.
        </p>
      </div>

      {/* 2. KHUNG BỘ LỌC (TOP BOX - MÀN 1) */}
      <div className="fundraiser-filters-panel" data-testid="fundraiser-filters-panel">
        <div className="filters-row">
          <div className="search-box-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo tên chiến dịch…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="input-search-campaign"
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            data-testid="select-status-filter"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="approved">Đang gây quỹ</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="closed">Đã kết thúc</option>
            {isLoggedIn && <option value="pending">Chờ duyệt</option>}
          </select>

          <select
            className="filter-select"
            value={districtFilter}
            onChange={(e) => onDistrictChange(e.target.value)}
            data-testid="select-district-filter"
          >
            <option value="">Toàn bộ 22 quận/huyện</option>
            {HCMC_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn-create-campaign"
            onClick={handleCreateClick}
            data-testid="btn-create-campaign"
          >
            <span>➕ Tạo chiến dịch gây quỹ</span>
          </button>
        </div>

        <div className="sub-filters-row">
          {isLoggedIn ? (
            <button
              type="button"
              className={`tab-my-campaigns ${myCampaignsOnly ? "active" : ""}`}
              onClick={onMyCampaignsToggle}
              data-testid="tab-my-campaigns"
            >
              <span>👤 Chiến dịch của tôi</span>
            </button>
          ) : (
            <div />
          )}

          <div className="total-count">
            Tổng số: <strong>{total}</strong> chiến dịch
          </div>
        </div>
      </div>

      {/* 3. LỖI MẠNG HOẶC MÁY CHỦ */}
      {error && (
        <div className="fundraiser-empty-box" style={{ borderColor: "#fecaca" }} data-testid="fundraiser-error-box">
          <span className="empty-icon">⚠️</span>
          <h3 style={{ color: "#dc2626" }}>Không thể tải danh sách chiến dịch. Vui lòng thử lại</h3>
          <p>{error}</p>
          <button type="button" className="btn-create-empty" onClick={onRetry} data-testid="btn-retry-list">
            🔄 Thử lại
          </button>
        </div>
      )}

      {/* 4. LOADING */}
      {isLoading && !error && (
        <div className="fundraiser-empty-box" data-testid="fundraiser-loading">
          <span className="empty-icon">⏳</span>
          <h3>Đang tải danh sách chiến dịch…</h3>
        </div>
      )}

      {/* 5. KHỐI TRỐNG (EMPTY STATE - MÀN 1) */}
      {!isLoading && !error && campaigns.length === 0 && (
        <div className="fundraiser-empty-box" data-testid="fundraiser-empty-state">
          <span className="empty-icon">🌱</span>
          {myCampaignsOnly ? (
            <>
              <h3>Bạn chưa tạo chiến dịch nào</h3>
              <p>Hãy khởi xướng chiến dịch đầu tiên để kêu gọi cộng đồng chung tay vì môi trường!</p>
              <button
                type="button"
                className="btn-create-empty"
                onClick={handleCreateClick}
                data-testid="btn-create-first-campaign"
              >
                ➕ Tạo chiến dịch gây quỹ
              </button>
            </>
          ) : statusFilter || districtFilter || searchQuery ? (
            <>
              <h3>Không tìm thấy chiến dịch phù hợp</h3>
              <p>Hãy thử thay đổi từ khoá tìm kiếm hoặc đặt lại các bộ lọc trạng thái và quận/huyện.</p>
            </>
          ) : (
            <>
              <h3>Chưa có chiến dịch gây quỹ nào</h3>
              <p>Hiện chưa có chiến dịch gây quỹ nào trên hệ thống. Hãy là người đầu tiên tạo chiến dịch!</p>
              <button
                type="button"
                className="btn-create-empty"
                onClick={handleCreateClick}
                data-testid="btn-create-first-campaign"
              >
                ➕ Tạo chiến dịch gây quỹ
              </button>
            </>
          )}
        </div>
      )}

      {/* 6. GRID DANH SÁCH CHIẾN DỊCH */}
      {!isLoading && !error && campaigns.length > 0 && (
        <div className="campaigns-grid" data-testid="campaigns-grid">
          {campaigns.map((camp) => {
            const campId = camp.campaign_id || camp.id || String(Math.random());
            const percentAchieved =
              camp.percent_achieved ??
              (camp.target_amount > 0
                ? Math.round((camp.total_donated / camp.target_amount) * 1000) / 10
                : 0);
            const daysLeft =
              camp.days_left ??
              (camp.end_date
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(camp.end_date).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )
                : 0);
            const isFaded = camp.status === "closed" || daysLeft === 0;

            return (
              <div
                key={campId}
                className={`campaign-card ${isFaded ? "card-faded" : ""}`}
                data-testid={`campaign-card-${campId}`}
              >
                <div className="card-media">
                  <img
                    src={
                      camp.cover_image_url ||
                      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={camp.title}
                  />
                  {getStatusBadge(camp)}
                  <span className="district-tag">📍 {camp.district}</span>
                </div>

                <div className="card-body">
                  <h3 className="card-title" title={camp.title}>
                    {camp.title}
                  </h3>

                  <div className="card-creator">
                    <div className="creator-avatar">
                      {camp.creator_name ? camp.creator_name[0].toUpperCase() : "U"}
                    </div>
                    <span>Khởi xướng bởi {camp.creator_name || "Thành viên GreenSpot"}</span>
                  </div>

                  {/* Thanh tiến độ gây quỹ */}
                  <div className="progress-box">
                    <div className="progress-bar-container">
                      <div
                        className={`progress-bar-fill ${
                          percentAchieved >= 100 ? "completed" : ""
                        }`}
                        style={{ width: `${Math.min(100, percentAchieved)}%` }}
                      />
                    </div>

                    <div className="progress-metrics">
                      <span className="donated-amount">{formatVND(camp.total_donated)}</span>
                      <span className="target-amount">/ {formatVND(camp.target_amount)}</span>
                    </div>

                    <div className="meta-sub-row">
                      <span className="percent-tag">Đạt {percentAchieved}%</span>
                      <span>
                        {camp.status === "closed"
                          ? "Đã kết thúc"
                          : `Còn ${daysLeft} ngày`}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-view-detail"
                    onClick={() => onSelectCampaign(camp)}
                    data-testid={`btn-view-detail-${campId}`}
                  >
                    Xem chi tiết →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. PHÂN TRANG (MÀN 1 - 12 MỤC/TRANG) */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="pagination-bar" data-testid="pagination-bar">
          <button
            type="button"
            className="btn-page"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            data-testid="btn-prev-page"
          >
            ← Trước
          </button>
          <span className="page-info">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            className="btn-page"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            data-testid="btn-next-page"
          >
            Sau →
          </button>
        </div>
      )}

      {/* POPUP NHẮC ĐĂNG NHẬP CHO KHÁCH (MÀN 1) */}
      {showLoginPrompt && (
        <div className="fund-modal-overlay" data-testid="fundraiser-login-modal">
          <div className="fund-modal-box size-small">
            <div className="modal-header">
              <div className="header-title-group">
                <span className="popup-badge">ĐĂNG NHẬP</span>
                <h3>Yêu cầu đăng nhập</h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowLoginPrompt(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>
                Vui lòng đăng nhập để tạo chiến dịch gây quỹ hoặc tham gia ủng hộ tài chính cho các dự án môi trường.
              </p>
            </div>
            <div className="modal-footer">
              <div className="footer-actions-right">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowLoginPrompt(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn-submit-primary"
                  onClick={() => {
                    setShowLoginPrompt(false);
                    onNavigateToLogin();
                  }}
                  data-testid="btn-go-to-login"
                >
                  Đăng nhập ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
