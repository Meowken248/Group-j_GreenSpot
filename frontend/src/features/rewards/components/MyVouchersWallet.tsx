import React, { useState, useEffect } from "react";
import type { UserVoucherItem } from "../types";
import { rewardsApi } from "../rewardsApi";

interface MyVouchersWalletProps {
  onExploreRewards?: () => void;
}

export const MyVouchersWallet: React.FC<MyVouchersWalletProps> = ({
  onExploreRewards,
}) => {
  // Bộ lọc Màn 1: "ACTIVE" (Còn hạn) | "USED" (Đã dùng) | "EXPIRED" (Hết hạn)
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "USED" | "EXPIRED">("ACTIVE");

  const [vouchers, setVouchers] = useState<UserVoucherItem[]>([]);
  const [totalActive, setTotalActive] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const [totalExpired, setTotalExpired] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Màn 2: Voucher đang mở xem chi tiết
  const [selectedVoucher, setSelectedVoucher] = useState<UserVoucherItem | null>(null);

  // Màn 3: Popup xác nhận đánh dấu đã dùng
  const [confirmUsedModalOpen, setConfirmUsedModalOpen] = useState(false);
  const [isMarkingUsed, setIsMarkingUsed] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadVouchers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await rewardsApi.getMyVouchers(statusFilter);
      setVouchers(data.items);
      setTotalActive(data.total_active);
      setTotalUsed(data.total_used);
      setTotalExpired(data.total_expired);
    } catch {
      setErrorMessage("Không thể tải danh sách quà đã đổi. Vui lòng thử lại");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, [statusFilter]);

  // Sao chép mã voucher vào clipboard (Table 133 R2)
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast("Đã sao chép mã voucher");
    } catch {
      showToast(`Mã voucher: ${code}`);
    }
  };

  // Xác nhận đánh dấu đã dùng (Màn 3 -> API)
  const handleConfirmMarkUsed = async () => {
    if (!selectedVoucher) return;
    setIsMarkingUsed(true);
    try {
      await rewardsApi.markVoucherUsed(selectedVoucher.voucher_id);
      showToast("Đã cập nhật trạng thái voucher: Đã sử dụng");
      setConfirmUsedModalOpen(false);

      // Cập nhật trạng thái voucher tại Màn 2
      setSelectedVoucher({
        ...selectedVoucher,
        status: "USED",
        used_at: new Date().toISOString(),
      });

      // Tải lại danh sách
      loadVouchers();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Không thể cập nhật trạng thái lúc này. Vui lòng thử lại";
      showToast(detail);
    } finally {
      setIsMarkingUsed(false);
    }
  };

  const formatDateStr = (dateStr?: string | null) => {
    if (!dateStr) return "Không thời hạn";
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="vouchers-wallet-container fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="reward-toast-notification">
          <span>🔔 {toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="section-header flex-between">
        <div>
          <h2 className="section-title">🎟️ Kho Voucher & Quà Tặng Cá Nhân</h2>
          <p className="section-subtitle">
            Quản lý toàn bộ phiếu ưu đãi mua sắm, voucher sinh thái bạn đã quy đổi thành công từ Điểm Xanh.
          </p>
        </div>

        {onExploreRewards && (
          <button
            type="button"
            className="primary-action-btn"
            onClick={onExploreRewards}
          >
            🎁 Khám phá thêm quà tặng
          </button>
        )}
      </div>

      {/* BỐ CỤC 2 KHỐI THEO CHUẨN BÁO CÁO */}
      <div className="vouchers-layout-grid">
        {/* KHỐI 1: BỘ LỌC (CỘT TRÁI) */}
        <div className="vouchers-filter-card">
          <h3 className="card-subtitle">📁 Phân Loại Trạng Thái</h3>

          <div className="filter-pills-vertical">
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "ACTIVE" ? "active" : ""}`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              <span>Còn hạn sử dụng</span>
              <span className="pill-counter-badge">{totalActive}</span>
            </button>

            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "USED" ? "active" : ""}`}
              onClick={() => setStatusFilter("USED")}
            >
              <span>Đã sử dụng</span>
              <span className="pill-counter-badge neutral">{totalUsed}</span>
            </button>

            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "EXPIRED" ? "active" : ""}`}
              onClick={() => setStatusFilter("EXPIRED")}
            >
              <span>Hết hạn</span>
              <span className="pill-counter-badge warn">{totalExpired}</span>
            </button>
          </div>

          <div className="voucher-tips-box">
            <div className="tips-icon">💡</div>
            <p className="tips-text">
              <strong>Mẹo hữu ích:</strong> Xuất trình mã QR tại quầy thanh toán Co.opmart hoặc sao chép mã khi mua sắm trực tuyến để tận hưởng ưu đãi xanh.
            </p>
          </div>
        </div>

        {/* KHỐI 2: DANH SÁCH THẺ QUÀ TẶNG (CỘT PHẢI) */}
        <div className="vouchers-list-card">
          <div className="card-header-flex">
            <h3 className="card-subtitle">
              {statusFilter === "ACTIVE"
                ? `Voucher Đang Có Hiệu Lực (${vouchers.length})`
                : statusFilter === "USED"
                ? `Voucher Đã Sử Dụng (${vouchers.length})`
                : `Voucher Đã Hết Hạn (${vouchers.length})`}
            </h3>
            <span className="card-tag-badge">Sắp xếp ưu tiên hạn gần nhất</span>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Đang tải kho voucher cá nhân...</p>
            </div>
          ) : errorMessage ? (
            <div className="error-catalog-state">
              <p>{errorMessage}</p>
              <button type="button" className="retry-btn" onClick={loadVouchers}>
                Thử lại
              </button>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="empty-catalog-state">
              <div className="empty-icon">🎟️</div>
              <h4 className="empty-title">
                {statusFilter === "ACTIVE"
                  ? "Bạn chưa có voucher nào còn hạn"
                  : "Không có voucher nào ở trạng thái này"}
              </h4>
              <p className="empty-desc">
                Bạn chưa đổi phần quà nào. Dùng điểm xanh để đổi quà ngay và cùng chung tay sống xanh!
              </p>
              {onExploreRewards && (
                <button
                  type="button"
                  className="primary-action-btn"
                  style={{ marginTop: "16px" }}
                  onClick={onExploreRewards}
                >
                  ✨ Khám phá đổi quà ngay
                </button>
              )}
            </div>
          ) : (
            <div className="vouchers-cards-grid">
              {vouchers.map((v) => {
                const isUsed = v.status === "USED";
                const isExpired = v.status === "EXPIRED";

                return (
                  <div
                    key={v.voucher_id}
                    className={`voucher-card-item ${isUsed ? "status-used" : ""} ${
                      isExpired ? "status-expired" : ""
                    } ${v.is_expiring_soon ? "expiring-soon-border" : ""}`}
                  >
                    {/* Tem đóng dấu chìm nếu đã dùng hoặc hết hạn */}
                    {isUsed && <div className="stamp-overlay stamp-used">ĐÃ DÙNG</div>}
                    {isExpired && <div className="stamp-overlay stamp-expired">HẾT HẠN</div>}

                    {/* Banner cảnh báo sắp hết hạn (Table 132 R5) */}
                    {v.is_expiring_soon && !isUsed && !isExpired && (
                      <div className="expiring-warning-banner">
                        <span>⚠️ Voucher sắp hết hạn! Còn {v.days_remaining} ngày</span>
                      </div>
                    )}

                    <div className="voucher-card-top">
                      <img
                        src={
                          v.reward_image_url ||
                          "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=300&q=80"
                        }
                        alt={v.reward_title}
                        className="voucher-img-thumb"
                      />
                      <div className="voucher-header-info">
                        <span className="voucher-brand-tag">{v.brand || "GreenSpot ESG"}</span>
                        <h4 className="voucher-name">{v.reward_title}</h4>
                        <span className="voucher-pts-cost">-{v.points_spent} Điểm Xanh</span>
                      </div>
                    </div>

                    <div className="voucher-card-mid">
                      <div className="voucher-code-chip">
                        <span className="code-label">MÃ VOUCHER:</span>
                        <strong className="code-val">{v.voucher_code}</strong>
                      </div>
                      <div className="voucher-date-row">
                        <span>HSD: {formatDateStr(v.expires_at)}</span>
                        <span
                          className={`voucher-status-badge ${
                            v.status === "ACTIVE"
                              ? "badge-active"
                              : v.status === "USED"
                              ? "badge-used"
                              : "badge-expired"
                          }`}
                        >
                          {v.status === "ACTIVE"
                            ? "Còn hạn"
                            : v.status === "USED"
                            ? "Đã dùng"
                            : "Hết hạn"}
                        </span>
                      </div>
                    </div>

                    <div className="voucher-card-bot">
                      <button
                        type="button"
                        className="voucher-view-btn"
                        onClick={() => setSelectedVoucher(v)}
                      >
                        🔍 Xem chi tiết & QR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------------
          MÀN 2: MÀN HÌNH XUẤT TRÌNH CHỨNG TỪ ĐIỆN TỬ (VOUCHER REDEMPTION SCREEN)
      -------------------------------------------------------------------------- */}
      {selectedVoucher && (
        <div className="reward-modal-backdrop" onClick={() => setSelectedVoucher(null)}>
          <div
            className="voucher-detail-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-cross"
              onClick={() => setSelectedVoucher(null)}
            >
              ✕
            </button>

            <div className="voucher-detail-header">
              <span className="modal-mini-tag">VOUCHER REDEMPTION SCREEN</span>
              <h3 className="modal-title">{selectedVoucher.reward_title}</h3>
              <span className="brand-subtitle">{selectedVoucher.brand || "GreenSpot ESG"}</span>
            </div>

            {/* Bố cục 2 khối theo Báo cáo */}
            <div className="voucher-detail-layout-grid">
              {/* KHỐI VOUCHER (CỘT TRÁI) */}
              <div className="qr-presentation-col">
                <div
                  className={`qr-display-box ${
                    selectedVoucher.status !== "ACTIVE" ? "qr-blurred-disabled" : ""
                  }`}
                >
                  {/* Mã QR SVG sinh thái */}
                  <svg
                    className="qr-code-svg"
                    viewBox="0 0 160 160"
                    width="160"
                    height="160"
                  >
                    <rect width="160" height="160" fill="#ffffff" rx="8" />
                    {/* Các khối góc định vị QR */}
                    <rect x="15" y="15" width="40" height="40" fill="#0f172a" rx="4" />
                    <rect x="23" y="23" width="24" height="24" fill="#ffffff" rx="2" />
                    <rect x="29" y="29" width="12" height="12" fill="#10b981" />

                    <rect x="105" y="15" width="40" height="40" fill="#0f172a" rx="4" />
                    <rect x="113" y="23" width="24" height="24" fill="#ffffff" rx="2" />
                    <rect x="119" y="29" width="12" height="12" fill="#10b981" />

                    <rect x="15" y="105" width="40" height="40" fill="#0f172a" rx="4" />
                    <rect x="23" y="113" width="24" height="24" fill="#ffffff" rx="2" />
                    <rect x="29" y="119" width="12" height="12" fill="#10b981" />

                    {/* Hoa văn mã hóa giả lập dữ liệu */}
                    <rect x="65" y="20" width="10" height="10" fill="#0f172a" />
                    <rect x="85" y="25" width="10" height="10" fill="#0f172a" />
                    <rect x="65" y="45" width="30" height="10" fill="#0f172a" />
                    <rect x="20" y="65" width="15" height="10" fill="#0f172a" />
                    <rect x="45" y="70" width="20" height="20" fill="#059669" rx="2" />
                    <rect x="75" y="65" width="15" height="15" fill="#0f172a" />
                    <rect x="100" y="70" width="25" height="10" fill="#0f172a" />
                    <rect x="135" y="70" width="10" height="20" fill="#0f172a" />
                    <rect x="20" y="85" width="15" height="15" fill="#0f172a" />
                    <rect x="70" y="95" width="20" height="10" fill="#0f172a" />
                    <rect x="105" y="95" width="15" height="15" fill="#0f172a" />
                    <rect x="65" y="115" width="10" height="30" fill="#0f172a" />
                    <rect x="85" y="125" width="25" height="15" fill="#0f172a" />
                    <rect x="120" y="120" width="25" height="25" fill="#059669" rx="2" />
                  </svg>

                  {/* Tem đóng dấu chìm phủ lên nếu đã dùng/hết hạn */}
                  {selectedVoucher.status === "USED" && (
                    <div className="stamp-watermark stamp-used">ĐÃ DÙNG</div>
                  )}
                  {selectedVoucher.status === "EXPIRED" && (
                    <div className="stamp-watermark stamp-expired">HẾT HẠN</div>
                  )}
                </div>

                <div className="voucher-code-banner">
                  <span className="code-label-muted">MÃ VOUCHER</span>
                  <strong className="code-big-text">{selectedVoucher.voucher_code}</strong>
                </div>

                <div className="expiry-exact-info">
                  <span>Hạn dùng chính xác:</span>
                  <strong>{formatDateStr(selectedVoucher.expires_at)}</strong>
                </div>
              </div>

              {/* KHỐI HƯỚNG DẪN & THAO TÁC (CỘT PHẢI) */}
              <div className="instructions-col">
                <h4 className="rules-heading">📜 Điều Kiện Sử Dụng</h4>
                <div className="rules-content-box">
                  <p>
                    {selectedVoucher.terms_and_conditions ||
                      "1. Áp dụng tại toàn bộ hệ thống đối tác của GreenSpot.\n2. Xuất trình mã QR tại quầy thanh toán hoặc sao chép mã khi mua trực tuyến.\n3. Mỗi mã voucher chỉ áp dụng 01 lần duy nhất.\n4. Không có giá trị quy đổi thành tiền mặt."}
                  </p>
                </div>

                <div className="voucher-modal-btn-stack">
                  <button
                    type="button"
                    className="copy-voucher-code-btn"
                    onClick={() => handleCopyCode(selectedVoucher.voucher_code)}
                  >
                    📋 Sao chép mã voucher
                  </button>

                  <button
                    type="button"
                    className="mark-used-btn"
                    disabled={selectedVoucher.status !== "ACTIVE"}
                    onClick={() => setConfirmUsedModalOpen(true)}
                  >
                    {selectedVoucher.status === "USED"
                      ? "✓ Đã đánh dấu sử dụng"
                      : selectedVoucher.status === "EXPIRED"
                      ? "⚠️ Voucher đã hết hạn"
                      : "✅ Đánh dấu đã dùng"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------------
          MÀN 3: POPUP XÁC NHẬN ĐÁNH DẤU ĐÃ DÙNG
      -------------------------------------------------------------------------- */}
      {confirmUsedModalOpen && (
        <div className="reward-modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="confirm-modal-box">
            <div className="confirm-modal-icon text-amber">⚠️</div>
            <span className="modal-mini-tag">POPUP</span>
            <h3 className="confirm-modal-title">ĐÁNH DẤU ĐÃ DÙNG?</h3>
            <p className="confirm-modal-desc">
              Voucher sẽ không dùng lại được. Sau khi xác nhận, mã QR sẽ bị khóa vĩnh viễn và không thể quét lại tại quầy.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="action-btn-secondary"
                disabled={isMarkingUsed}
                onClick={() => setConfirmUsedModalOpen(false)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="action-btn-danger"
                disabled={isMarkingUsed}
                onClick={handleConfirmMarkUsed}
              >
                {isMarkingUsed ? "Đang xử lý…" : "Xác nhận đã dùng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
