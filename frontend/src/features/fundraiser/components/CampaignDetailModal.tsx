import React, { useState, useEffect } from "react";
import type {
  FundraiserCampaignItem,
  FundraiserDonationItem,
  FundraiserExpenseItem,
} from "../types/fundraiser.types";
import { fundraiserService } from "../services/fundraiserService";
import { DonationModal } from "./DonationModal";
import { ExpenseReportView } from "./ExpenseReportView";
import { CampaignDeleteModal } from "./CampaignDeleteModal";

interface CampaignDetailModalProps {
  isOpen: boolean;
  campaign: FundraiserCampaignItem;
  currentUserId?: string | null;
  isAdmin?: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onCampaignUpdated: (updated: FundraiserCampaignItem) => void;
  onCampaignDeleted: () => void;
  onNavigateToLogin: () => void;
}

export const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({
  isOpen,
  campaign,
  currentUserId,
  isAdmin = false,
  isLoggedIn,
  onClose,
  onCampaignUpdated,
  onCampaignDeleted,
  onNavigateToLogin,
}) => {
  const [activeTab, setActiveTab] = useState<"about" | "donors" | "expenses">("about");
  const [donations, setDonations] = useState<FundraiserDonationItem[]>([]);
  const [expenses, setExpenses] = useState<FundraiserExpenseItem[]>([]);
  const [isLoadingSubData, setIsLoadingSubData] = useState(false);

  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditDescModal, setShowEditDescModal] = useState(false);
  const [editDescText, setEditDescText] = useState(campaign.description);
  const [isUpdatingDesc, setIsUpdatingDesc] = useState(false);

  // Admin Review State
  const [showAdminReviewModal, setShowAdminReviewModal] = useState(false);
  const [adminAction, setAdminAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const campId = campaign.campaign_id || campaign.id || "";
  const isCreator = !!(currentUserId && currentUserId === campaign.creator_id);
  const hasDonations = campaign.total_donated > 0;
  const percentAchieved =
    campaign.percent_achieved ??
    (campaign.target_amount > 0
      ? Math.round((campaign.total_donated / campaign.target_amount) * 1000) / 10
      : 0);
  const daysLeft =
    campaign.days_left ??
    (campaign.end_date
      ? Math.max(
          0,
          Math.ceil(
            (new Date(campaign.end_date).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0);
  const isClosed = campaign.status === "closed" || daysLeft === 0;

  useEffect(() => {
    if (!isOpen || !campId) return;
    setIsLoadingSubData(true);
    Promise.all([
      fundraiserService.getDonations(campId),
      fundraiserService.getExpenses(campId),
    ])
      .then(([donList, expList]) => {
        setDonations(donList || []);
        setExpenses(expList || []);
      })
      .catch(() => {})
      .finally(() => setIsLoadingSubData(false));
  }, [isOpen, campId]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatVND = (amt: number) => {
    return new Intl.NumberFormat("vi-VN").format(amt) + " đ";
  };

  const handleDonateClick = () => {
    if (!isLoggedIn) {
      onNavigateToLogin();
      return;
    }
    setShowDonationModal(true);
  };

  const handleDonationSuccess = async (amount: number) => {
    setShowDonationModal(false);
    showToast(`Quyên góp thành công. Cảm ơn bạn đã đóng góp ${formatVND(amount)}!`);
    try {
      const refreshed = await fundraiserService.getCampaignDetail(campId);
      onCampaignUpdated(refreshed);
      const donList = await fundraiserService.getDonations(campId);
      setDonations(donList || []);
    } catch {}
  };

  const handleExpenseAdded = (newExp: FundraiserExpenseItem) => {
    setExpenses((prev) => [newExp, ...prev]);
    showToast("Đã thêm khoản chi");
    fundraiserService.getCampaignDetail(campId).then(onCampaignUpdated).catch(() => {});
  };

  const handleShareClick = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast("Đã sao chép liên kết chiến dịch vào bộ nhớ tạm!");
  };

  const handleUpdateDescription = async () => {
    if (!editDescText.trim()) return;
    setIsUpdatingDesc(true);
    try {
      const updated = await fundraiserService.updateCampaign(campId, {
        description: editDescText.trim(),
      });
      onCampaignUpdated(updated);
      setShowEditDescModal(false);
      showToast("Cập nhật mô tả thành công!");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Không thể cập nhật mô tả");
    } finally {
      setIsUpdatingDesc(false);
    }
  };

  const handleAdminReview = async () => {
    setIsReviewing(true);
    try {
      const updated = await fundraiserService.reviewCampaign(
        campId,
        adminAction,
        adminAction === "reject" ? rejectionReason : undefined
      );
      onCampaignUpdated(updated);
      setShowAdminReviewModal(false);
      showToast(adminAction === "approve" ? "Đã duyệt chiến dịch!" : "Đã từ chối chiến dịch!");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Lỗi kiểm duyệt chiến dịch");
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="fund-modal-overlay" data-testid="campaign-detail-modal-overlay">
      <div className="fund-modal-box size-large" data-testid="campaign-detail-modal">
        {/* TOAST THÔNG BÁO NỔI 3S */}
        {toastMessage && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#065f46",
              color: "#ffffff",
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              zIndex: 10003,
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            }}
            data-testid="toast-notification"
          >
            {toastMessage}
          </div>
        )}

        {/* HEADER */}
        <div className="modal-header">
          <div className="header-title-group">
            <span className="popup-badge">CHI TIẾT CHIẾN DỊCH</span>
            <h3>{campaign.title}</h3>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            data-testid="btn-close-detail-modal"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          {/* CẢNH BÁO TRẠNG THÁI */}
          {campaign.status === "pending" && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
              data-testid="badge-pending-status"
            >
              ⏳ Chiến dịch đang chờ duyệt. Quản trị viên sẽ kiểm tra thông tin trước khi hiển thị công khai.
            </div>
          )}

          {campaign.status === "rejected" && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
              }}
              data-testid="badge-rejected-status"
            >
              ❌ Chiến dịch không được duyệt: {campaign.rejection_reason || "Chưa đạt yêu cầu quy chuẩn"}
            </div>
          )}

          {/* 1. KHỐI TIẾN ĐỘ HERO (TOP BOX - MÀN 3) */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
            }}
            data-testid="detail-progress-top-box"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
              <div>
                <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#065f46" }}>
                  {formatVND(campaign.total_donated)}
                </span>
                <span style={{ fontSize: "0.95rem", color: "#64748b", marginLeft: "0.4rem" }}>
                  / mục tiêu {formatVND(campaign.target_amount)}
                </span>
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10b981" }}>
                {percentAchieved}%
              </div>
            </div>

            <div style={{ width: "100%", height: "10px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", marginBottom: "0.75rem" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, percentAchieved)}%`,
                  background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                  borderRadius: "999px",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#64748b" }}>
              <span>👥 <strong>{campaign.donor_count ?? campaign.donation_count ?? donations.length}</strong> lượt đóng góp</span>
              <span>📍 Địa bàn: <strong>{campaign.district}</strong></span>
              <span>
                ⏳ {campaign.status === "closed" ? "Đã kết thúc" : `Còn ${daysLeft} ngày`}
              </span>
            </div>
          </div>

          {/* 2. TAB NAVIGATION (MÀN 3) */}
          <div className="campaign-detail-tabs-nav" data-testid="campaign-tabs-nav">
            <button
              type="button"
              className={`btn-tab ${activeTab === "about" ? "active" : ""}`}
              onClick={() => setActiveTab("about")}
              data-testid="tab-btn-about"
            >
              📖 Giới thiệu
            </button>
            <button
              type="button"
              className={`btn-tab ${activeTab === "donors" ? "active" : ""}`}
              onClick={() => setActiveTab("donors")}
              data-testid="tab-btn-donors"
            >
              ❤️ Người quyên góp ({donations.length})
            </button>
            <button
              type="button"
              className={`btn-tab ${activeTab === "expenses" ? "active" : ""}`}
              onClick={() => setActiveTab("expenses")}
              data-testid="tab-btn-expenses"
            >
              🧾 Báo cáo sử dụng
            </button>
          </div>

          {/* TAB 1: GIỚI THIỆU */}
          {activeTab === "about" && (
            <div data-testid="tab-content-about">
              {campaign.cover_image_url && (
                <div style={{ borderRadius: "10px", overflow: "hidden", maxHeight: "280px", marginBottom: "1.25rem" }}>
                  <img
                    src={campaign.cover_image_url}
                    alt={campaign.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}

              <div style={{ fontSize: "0.95rem", color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                {campaign.description}
              </div>

              {/* Thông tin tài khoản nhận bí mật (Chỉ Admin hoặc Creator thấy) */}
              {(isAdmin || isCreator) && campaign.bank_account_number && (
                <div
                  style={{
                    marginTop: "1.5rem",
                    padding: "1rem",
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                  data-testid="admin-bank-info-box"
                >
                  <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
                    🔒 Thông tin tài khoản nhận tiền (Dành cho kiểm duyệt):
                  </div>
                  <div>Ngân hàng: <strong>{campaign.bank_name}</strong></div>
                  <div>Chủ tài khoản: <strong>{campaign.bank_account_name}</strong></div>
                  <div>Số tài khoản: <strong>{campaign.bank_account_number}</strong></div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NGƯỜI QUYÊN GÓP (MÀN 3) */}
          {activeTab === "donors" && (
            <div data-testid="tab-content-donors">
              {isLoadingSubData ? (
                <div className="fundraiser-empty-box" style={{ padding: "3rem 1rem" }} data-testid="loading-donations-state">
                  <span className="empty-icon">⏳</span>
                  <h3>Đang tải danh sách người ủng hộ…</h3>
                </div>
              ) : donations.length === 0 ? (
                <div className="fundraiser-empty-box" style={{ padding: "3rem 1rem" }} data-testid="empty-donations-state">
                  <span className="empty-icon">❤️</span>
                  <h3>Chưa có ai quyên góp. Hãy là người đầu tiên!</h3>
                  <p>Mỗi sự đóng góp dù nhỏ nhất đều tiếp thêm sức mạnh cho các hoạt động xanh.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {donations.map((don) => (
                    <div
                      key={don.donation_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.85rem 1rem",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                      data-testid={`donation-item-${don.donation_id}`}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: don.is_anonymous ? "#e2e8f0" : "#d1fae5",
                            color: don.is_anonymous ? "#64748b" : "#065f46",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                          }}
                        >
                          {don.is_anonymous ? "👤" : (don.donor_name[0] || "U").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                            {don.donor_name}
                          </div>
                          {don.message && (
                            <div style={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic", marginTop: "0.15rem" }}>
                              "{don.message}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#059669" }}>
                          +{formatVND(don.amount)}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          {new Date(don.created_at).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BÁO CÁO SỬ DỤNG QUỸ (MÀN 5) */}
          {activeTab === "expenses" && (
            <ExpenseReportView
              campaign={campaign}
              expenses={expenses}
              isCreator={isCreator}
              onExpenseAdded={handleExpenseAdded}
            />
          )}
        </div>

        {/* FOOTER NÚT THAO TÁC */}
        <div className="modal-footer">
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={handleShareClick}
              data-testid="btn-share-campaign"
            >
              🔗 Chia sẻ
            </button>

            {/* Thao tác của người tạo */}
            {isCreator && (
              <>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowEditDescModal(true)}
                  data-testid="btn-edit-campaign"
                >
                  ✏️ Sửa
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  style={{ color: "#dc2626" }}
                  onClick={() => setShowDeleteModal(true)}
                  data-testid="btn-delete-campaign"
                >
                  🗑️ Xoá
                </button>
              </>
            )}

            {/* Thao tác của Quản trị viên duyệt */}
            {isAdmin && campaign.status === "pending" && (
              <button
                type="button"
                className="btn-submit-primary"
                style={{ background: "#f59e0b" }}
                onClick={() => {
                  setAdminAction("approve");
                  setShowAdminReviewModal(true);
                }}
                data-testid="btn-admin-review"
              >
                🛡️ Kiểm duyệt
              </button>
            )}
          </div>

          <div className="footer-actions-right">
            {campaign.status !== "pending" && (
              <button
                type="button"
                className="btn-submit-primary"
                disabled={isClosed}
                onClick={handleDonateClick}
                data-testid="btn-open-donate-modal"
              >
                {isClosed ? "Đã kết thúc" : "❤️ Quyên góp ngay"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* POPUP QUYÊN GÓP (MÀN 4) */}
      <DonationModal
        isOpen={showDonationModal}
        campaign={campaign}
        onClose={() => setShowDonationModal(false)}
        onSuccess={handleDonationSuccess}
      />

      {/* POPUP XOÁ / KẾT THÚC SỚM (MÀN 6) */}
      <CampaignDeleteModal
        isOpen={showDeleteModal}
        campaign={campaign}
        onClose={() => setShowDeleteModal(false)}
        onDeleted={() => {
          setShowDeleteModal(false);
          onClose();
          onCampaignDeleted();
        }}
        onClosedEarly={(updated) => {
          setShowDeleteModal(false);
          onCampaignUpdated(updated);
          setActiveTab("expenses");
          showToast("Đã kết thúc chiến dịch. Vui lòng cập nhật báo cáo sử dụng quỹ");
        }}
      />

      {/* POPUP SỬA MÔ TẢ (KHI ĐÃ CÓ TIỀN QUYÊN GÓP) */}
      {showEditDescModal && (
        <div className="fund-modal-overlay" style={{ zIndex: 10002 }} data-testid="edit-desc-modal">
          <div className="fund-modal-box size-small">
            <div className="modal-header">
              <div className="header-title-group">
                <span className="popup-badge">CHỈNH SỬA</span>
                <h3>Cập nhật mô tả chiến dịch</h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowEditDescModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {hasDonations && (
                <div style={{ fontSize: "0.8rem", color: "#b45309", background: "#fef3c7", padding: "0.5rem 0.75rem", borderRadius: "6px", marginBottom: "0.75rem" }}>
                  ⚠️ Chiến dịch đã nhận quyên góp, chỉ có thể bổ sung mô tả
                </div>
              )}
              <textarea
                rows={5}
                value={editDescText}
                onChange={(e) => setEditDescText(e.target.value)}
                style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                data-testid="textarea-edit-desc"
              />
            </div>
            <div className="modal-footer">
              <div className="footer-actions-right">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowEditDescModal(false)}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="btn-submit-primary"
                  disabled={isUpdatingDesc || !editDescText.trim()}
                  onClick={handleUpdateDescription}
                  data-testid="btn-save-desc"
                >
                  {isUpdatingDesc ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP KIỂM DUYỆT CỦA ADMIN */}
      {showAdminReviewModal && (
        <div className="fund-modal-overlay" style={{ zIndex: 10002 }} data-testid="admin-review-modal">
          <div className="fund-modal-box size-small">
            <div className="modal-header">
              <div className="header-title-group">
                <span className="popup-badge">QUẢN TRỊ VIÊN</span>
                <h3>Kiểm duyệt chiến dịch</h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowAdminReviewModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="admin_action"
                    checked={adminAction === "approve"}
                    onChange={() => setAdminAction("approve")}
                    data-testid="radio-approve"
                  />
                  <span>✅ Duyệt công khai</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="admin_action"
                    checked={adminAction === "reject"}
                    onChange={() => setAdminAction("reject")}
                    data-testid="radio-reject"
                  />
                  <span>❌ Từ chối duyệt</span>
                </label>
              </div>

              {adminAction === "reject" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                    Lý do từ chối <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Nêu rõ lý do từ chối để người tạo chỉnh sửa…"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    data-testid="textarea-rejection-reason"
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <div className="footer-actions-right">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAdminReviewModal(false)}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="btn-submit-primary"
                  disabled={isReviewing || (adminAction === "reject" && !rejectionReason.trim())}
                  onClick={handleAdminReview}
                  data-testid="btn-submit-review"
                >
                  {isReviewing ? "Đang xử lý…" : "Xác nhận duyệt"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
