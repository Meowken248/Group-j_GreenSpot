import React, { useState, useEffect, useMemo } from "react";
import type { FundraiserCampaignItem } from "../types/fundraiser.types";
import { VIETNAM_PROVINCES } from "../types/fundraiser.types";
import { fundraiserService } from "../services/fundraiserService";

interface AdminFundraiserDashboardProps {
  onSelectCampaign: (campaign: FundraiserCampaignItem) => void;
  onRefreshList: () => void;
}

export const AdminFundraiserDashboard: React.FC<AdminFundraiserDashboardProps> = ({
  onSelectCampaign,
  onRefreshList,
}) => {
  const [campaigns, setCampaigns] = useState<FundraiserCampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [provinceFilter, setProvinceFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"campaigns" | "expenses">("campaigns");

  // Xử lý Duyệt / Từ chối
  const [reviewingCampaign, setReviewingCampaign] = useState<FundraiserCampaignItem | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Lightbox ảnh hóa đơn
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Tải danh sách chiến dịch để admin quản trị
  const fetchAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Admin lấy danh sách tối đa 100 chiến dịch
      const res = await fundraiserService.listCampaigns({
        page: 1,
        page_size: 100,
      });
      setCampaigns(res.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Không thể tải dữ liệu quản trị");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num) + " đ";
  };

  // Tính toán KPI Thống kê
  const kpiStats = useMemo(() => {
    const totalRaised = campaigns.reduce((acc, c) => acc + (c.total_donated || 0), 0);
    const totalSpent = campaigns.reduce((acc, c) => acc + (c.total_spent || 0), 0);
    const activeCount = campaigns.filter((c) => c.status === "approved").length;
    const pendingCount = campaigns.filter((c) => c.status === "pending").length;
    return { totalRaised, totalSpent, activeCount, pendingCount };
  }, [campaigns]);

  // Lọc danh sách chiến dịch theo điều kiện
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      // Lọc trạng thái
      if (statusFilter !== "all" && camp.status !== statusFilter) {
        return false;
      }
      // Lọc địa bàn
      if (
        provinceFilter &&
        provinceFilter !== "Toàn quốc" &&
        !camp.district.toLowerCase().includes(provinceFilter.toLowerCase())
      ) {
        return false;
      }
      // Tìm kiếm theo tên hoặc người tạo
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = camp.title.toLowerCase().includes(query);
        const matchCreator = (camp.creator_name || "").toLowerCase().includes(query);
        const matchBank = (camp.bank_account_name || "").toLowerCase().includes(query);
        if (!matchTitle && !matchCreator && !matchBank) return false;
      }
      return true;
    });
  }, [campaigns, statusFilter, provinceFilter, searchQuery]);

  // Xử lý xác nhận duyệt hoặc từ chối
  const handleConfirmReview = async () => {
    if (!reviewingCampaign) return;
    if (reviewAction === "reject" && !rejectionReason.trim()) {
      alert("Vui lòng nhập lý do từ chối chiến dịch");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const campId = reviewingCampaign.campaign_id || reviewingCampaign.id || "";
      const updated = await fundraiserService.reviewCampaign(
        campId,
        reviewAction,
        reviewAction === "reject" ? rejectionReason.trim() : undefined
      );

      // Cập nhật state local
      setCampaigns((prev) =>
        prev.map((c) =>
          (c.campaign_id || c.id) === campId ? updated : c
        )
      );

      showToast(
        reviewAction === "approve"
          ? `Đã phê duyệt công khai chiến dịch "${updated.title}"!`
          : `Đã từ chối chiến dịch "${updated.title}"!`
      );
      setReviewingCampaign(null);
      setRejectionReason("");
      onRefreshList();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Không thể thực hiện kiểm duyệt");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="admin-fundraiser-dashboard" data-testid="admin-fundraiser-dashboard">
      {/* TOAST THÔNG BÁO */}
      {toastMessage && (
        <div className="admin-toast-badge" data-testid="admin-toast">
          {toastMessage}
        </div>
      )}

      {/* 1. HEADER QUẢN TRỊ */}
      <div className="admin-header-card">
        <div className="header-info">
          <div className="admin-badge-tag">
            <span className="shield-icon">🛡️</span>
            <span>TRUNG TÂM KIỂM DUYỆT & GIÁM SÁT TÀI CHÍNH TOÀN QUỐC</span>
          </div>
          <h2>Bảng Quản Trị Quỹ Môi Trường GreenSpot</h2>
          <p>
            Không gian dành cho Ban Điều Hành thẩm định tính pháp lý hồ sơ gây quỹ,
            phê duyệt tài khoản thụ hưởng, và giám sát sao kê dòng tiền minh bạch.
          </p>
        </div>

        <button
          type="button"
          className="btn-refresh-admin"
          onClick={fetchAdminData}
          disabled={isLoading}
        >
          {isLoading ? "⏳ Đang tải..." : "🔄 Cập nhật dữ liệu"}
        </button>
      </div>

      {/* 2. KHỐI 4 THẺ KPI TOÀN HỆ THỐNG */}
      <div className="admin-kpi-grid">
        <div className="kpi-card total-raised">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <span className="kpi-label">Tổng quỹ đã huy động</span>
            <span className="kpi-value">{formatVND(kpiStats.totalRaised)}</span>
            <span className="kpi-desc">Toàn bộ 63 Tỉnh/Thành</span>
          </div>
        </div>

        <div className="kpi-card total-spent">
          <div className="kpi-icon">🧾</div>
          <div className="kpi-content">
            <span className="kpi-label">Tổng ngân sách đã giải ngân</span>
            <span className="kpi-value">{formatVND(kpiStats.totalSpent)}</span>
            <span className="kpi-desc">Đã có hóa đơn chứng từ</span>
          </div>
        </div>

        <div className="kpi-card active-campaigns">
          <div className="kpi-icon">🌱</div>
          <div className="kpi-content">
            <span className="kpi-label">Chiến dịch đang hoạt động</span>
            <span className="kpi-value">{kpiStats.activeCount}</span>
            <span className="kpi-desc">Đang nhận quyên góp</span>
          </div>
        </div>

        <div className="kpi-card pending-review">
          <div className="kpi-icon">⏳</div>
          <div className="kpi-content">
            <span className="kpi-label">Chiến dịch chờ duyệt gấp</span>
            <span className="kpi-value highlight">{kpiStats.pendingCount}</span>
            <span className="kpi-desc">Cần thẩm định danh tính</span>
          </div>
        </div>
      </div>

      {/* 3. ĐIỀU HƯỚNG TAB & BỘ LỌC */}
      <div className="admin-toolbar-card">
        <div className="tabs-switcher">
          <button
            type="button"
            className={`tab-btn ${activeTab === "campaigns" ? "active" : ""}`}
            onClick={() => setActiveTab("campaigns")}
            data-testid="tab-admin-campaigns"
          >
            📋 Danh Sách Chiến Dịch ({filteredCampaigns.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "expenses" ? "active" : ""}`}
            onClick={() => setActiveTab("expenses")}
            data-testid="tab-admin-expenses"
          >
            📑 Kiểm Soát Hóa Đơn & Chứng Từ
          </button>
        </div>

        {activeTab === "campaigns" && (
          <div className="filters-control-row">
            <div className="search-input-wrap">
              <span className="icon">🔍</span>
              <input
                type="text"
                placeholder="Tìm theo tên chiến dịch, người tổ chức, chủ tài khoản…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="admin-search-input"
              />
            </div>

            <select
              className="select-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              data-testid="admin-status-filter"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">⏳ Chờ duyệt ({kpiStats.pendingCount})</option>
              <option value="approved">✅ Đang gây quỹ ({kpiStats.activeCount})</option>
              <option value="completed">🎉 Đã hoàn thành</option>
              <option value="closed">🔒 Đã kết thúc</option>
              <option value="rejected">❌ Bị từ chối</option>
            </select>

            <select
              className="select-province"
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              data-testid="admin-province-filter"
            >
              {VIETNAM_PROVINCES.map((p) => (
                <option key={p} value={p === "Toàn quốc" ? "" : p}>
                  {p === "Toàn quốc" ? "Toàn quốc (63 Tỉnh/Thành)" : p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4. NỘI DUNG CHÍNH */}
      {isLoading ? (
        <div className="admin-loading-state">
          <div className="spinner" />
          <p>Đang tải dữ liệu kiểm duyệt quản trị viên…</p>
        </div>
      ) : error ? (
        <div className="admin-error-card">
          <p>❌ {error}</p>
          <button type="button" onClick={fetchAdminData}>
            Thử lại
          </button>
        </div>
      ) : activeTab === "campaigns" ? (
        /* TAB 1: BẢNG CHIẾN DỊCH */
        <div className="admin-table-container">
          {filteredCampaigns.length === 0 ? (
            <div className="admin-empty-state">
              <span className="empty-icon">📭</span>
              <p>Không tìm thấy chiến dịch nào phù hợp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <table className="admin-data-table" data-testid="admin-campaigns-table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Chiến dịch & Địa bàn</th>
                  <th style={{ width: "16%" }}>Người tổ chức</th>
                  <th style={{ width: "18%" }}>Mục tiêu / Đã nhận</th>
                  <th style={{ width: "18%" }}>Tài khoản thụ hưởng</th>
                  <th style={{ width: "10%" }}>Trạng thái</th>
                  <th style={{ width: "10%", textAlign: "center" }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((camp) => {
                  const campId = camp.campaign_id || camp.id || "";
                  const percent =
                    camp.target_amount > 0
                      ? Math.round((camp.total_donated / camp.target_amount) * 100)
                      : 0;

                  return (
                    <tr
                      key={campId}
                      className={camp.status === "pending" ? "row-highlight-pending" : ""}
                    >
                      <td>
                        <div className="cell-campaign-info">
                          {camp.cover_image_url && (
                            <img
                              src={camp.cover_image_url}
                              alt=""
                              className="thumb-img"
                            />
                          )}
                          <div className="info-text">
                            <strong
                              className="campaign-title-link"
                              onClick={() => onSelectCampaign(camp)}
                              title={camp.title}
                            >
                              {camp.title}
                            </strong>
                            <span className="district-tag">📍 {camp.district}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="cell-creator">
                          <span className="creator-name">
                            {camp.creator_name || "Thành viên GreenSpot"}
                          </span>
                          <span className="creator-id">ID: {camp.creator_id?.slice(0, 8)}...</span>
                        </div>
                      </td>

                      <td>
                        <div className="cell-finance">
                          <span className="donated-amt">{formatVND(camp.total_donated)}</span>
                          <span className="target-amt">/ {formatVND(camp.target_amount)}</span>
                          <div className="mini-progress-bar">
                            <div
                              className="fill"
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                          <span className="percent-text">{percent}%</span>
                        </div>
                      </td>

                      <td>
                        <div className="cell-bank">
                          <strong className="bank-name">{camp.bank_name || "Chưa cập nhật"}</strong>
                          <span className="bank-acc">STK: {camp.bank_account_number || "—"}</span>
                          <span className="bank-owner">Chủ TK: {camp.bank_account_name || "—"}</span>
                        </div>
                      </td>

                      <td>
                        <span className={`status-pill status-${camp.status}`}>
                          {camp.status === "pending" && "⏳ Chờ duyệt"}
                          {camp.status === "approved" && "✅ Đang chạy"}
                          {camp.status === "completed" && "🎉 Hoàn thành"}
                          {camp.status === "closed" && "🔒 Đã đóng"}
                          {camp.status === "rejected" && "❌ Bị từ chối"}
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div className="actions-cell">
                          {camp.status === "pending" ? (
                            <div className="quick-review-btns">
                              <button
                                type="button"
                                className="btn-quick-approve"
                                title="Phê duyệt công khai"
                                onClick={() => {
                                  setReviewingCampaign(camp);
                                  setReviewAction("approve");
                                }}
                                data-testid={`btn-quick-approve-${campId}`}
                              >
                                Duyệt
                              </button>
                              <button
                                type="button"
                                className="btn-quick-reject"
                                title="Từ chối chiến dịch"
                                onClick={() => {
                                  setReviewingCampaign(camp);
                                  setReviewAction("reject");
                                }}
                                data-testid={`btn-quick-reject-${campId}`}
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn-view-detail"
                              onClick={() => onSelectCampaign(camp)}
                              data-testid={`btn-admin-detail-${campId}`}
                            >
                              Chi tiết & Sao kê
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* TAB 2: KIỂM SOÁT HÓA ĐƠN & CHỨNG TỪ */
        <div className="admin-audit-container">
          <div className="audit-alert-box">
            <span className="icon">🛡️</span>
            <div>
              <strong>Quy chuẩn Hậu kiểm Tài chính Minh bạch:</strong>
              <p>
                Mọi chiến dịch sau khi kết thúc bắt buộc phải hoàn thành nộp 100% hóa đơn chứng từ
                hợp lệ trong vòng 30 ngày. Ban Quản Trị có quyền thu hồi hoặc khóa tài khoản đối với
                các trường hợp chi tiêu không chứng từ hoặc sai mục đích cam kết.
              </p>
            </div>
          </div>

          <div className="audit-campaign-list">
            {campaigns
              .filter((c) => (c.total_spent || 0) > 0 || c.status === "closed")
              .map((camp) => {
                const campId = camp.campaign_id || camp.id || "";
                const isOverBudget = (camp.total_spent || 0) > (camp.total_donated || 0);

                return (
                  <div key={campId} className="audit-campaign-card">
                    <div className="audit-header">
                      <div>
                        <h4>{camp.title}</h4>
                        <span className="district">📍 {camp.district}</span>
                      </div>
                      <div className="audit-stats">
                        <span className="badge-spent">Đã chi: {formatVND(camp.total_spent || 0)}</span>
                        <span className="badge-donated">/ Thu được: {formatVND(camp.total_donated)}</span>
                        {isOverBudget && (
                          <span className="badge-warning">⚠️ Vượt ngân sách gây quỹ</span>
                        )}
                      </div>
                    </div>

                    <div className="audit-actions">
                      <button
                        type="button"
                        className="btn-open-audit-detail"
                        onClick={() => onSelectCampaign(camp)}
                      >
                        🔎 Kiểm tra chứng từ & Hóa đơn chi tiết của chiến dịch này
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* POPUP THẨM ĐỊNH / DUYỆT CHIẾN DỊCH */}
      {reviewingCampaign && (
        <div className="fund-modal-overlay" style={{ zIndex: 10005 }} data-testid="admin-review-popup">
          <div className="fund-modal-box size-small">
            <div className="modal-header">
              <div className="header-title-group">
                <span className="popup-badge">QUYẾT ĐỊNH THẨM ĐỊNH</span>
                <h3>Kiểm duyệt chiến dịch</h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setReviewingCampaign(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#334155" }}>
                Chiến dịch: <strong>{reviewingCampaign.title}</strong>
                <br />
                Địa bàn: <strong>{reviewingCampaign.district}</strong>
                <br />
                Mục tiêu: <strong>{formatVND(reviewingCampaign.target_amount)}</strong>
              </div>

              <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="admin_decision"
                    checked={reviewAction === "approve"}
                    onChange={() => setReviewAction("approve")}
                  />
                  <span>✅ Phê duyệt công khai</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, color: "#dc2626" }}>
                  <input
                    type="radio"
                    name="admin_decision"
                    checked={reviewAction === "reject"}
                    onChange={() => setReviewAction("reject")}
                  />
                  <span>❌ Từ chối hồ sơ</span>
                </label>
              </div>

              {reviewAction === "reject" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                    Lý do từ chối <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Nêu rõ lý do (VD: Kế hoạch dự toán chưa rõ ràng, tài khoản ngân hàng chưa xác thực…)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.875rem",
                    }}
                    data-testid="admin-rejection-reason-textarea"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <div className="footer-actions-right">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setReviewingCampaign(null)}
                  disabled={isSubmittingReview}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="btn-submit-primary"
                  onClick={handleConfirmReview}
                  disabled={isSubmittingReview || (reviewAction === "reject" && !rejectionReason.trim())}
                  data-testid="admin-confirm-review-btn"
                >
                  {isSubmittingReview ? "Đang xử lý…" : "Xác nhận quyết định"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PHÓNG TO ẢNH HÓA ĐƠN */}
      {previewImageUrl && (
        <div
          className="fund-modal-overlay"
          style={{ zIndex: 10010 }}
          onClick={() => setPreviewImageUrl(null)}
        >
          <div style={{ maxWidth: "800px", maxHeight: "90vh", position: "relative" }}>
            <img
              src={previewImageUrl}
              alt="Hóa đơn chứng từ phóng to"
              style={{ width: "100%", height: "auto", borderRadius: "10px" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFundraiserDashboard;
