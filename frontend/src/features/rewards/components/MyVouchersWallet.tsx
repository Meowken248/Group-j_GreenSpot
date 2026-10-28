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

  // [CN 31 Nâng cấp 10/10] Cổng Đối Soát Thu Ngân POS (Cashier Counter Simulator)
  const [posCodeInput, setPosCodeInput] = useState("");
  const [isVerifyingPos, setIsVerifyingPos] = useState(false);
  const [posVerifyResult, setPosVerifyResult] = useState<import("../types").VerifyVoucherResponse | null>(null);
  const [posVerifyError, setPosVerifyError] = useState<string | null>(null);
  const [isPosDrawerOpen, setIsPosDrawerOpen] = useState(false);

  // [CN 31 Nâng cấp 10/10] Mã PIN Xác nhận quầy thu ngân chống bấm nhầm
  const [cashierPin, setCashierPin] = useState("2026");

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
    if (cashierPin.trim() !== "2026") {
      showToast("⚠️ Mã PIN thu ngân không chính xác (Mặc định Demo: 2026)");
      return;
    }
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

  // [CN 31] Xử lý đối soát mã voucher qua API Cổng Thu Ngân POS
  const handlePosVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posCodeInput.trim()) {
      setPosVerifyError("Vui lòng nhập hoặc dán mã voucher");
      return;
    }
    setIsVerifyingPos(true);
    setPosVerifyError(null);
    setPosVerifyResult(null);
    try {
      const res = await rewardsApi.verifyVoucher(posCodeInput.trim());
      setPosVerifyResult(res);
      showToast(`Thu ngân: ${res.message}`);
      loadVouchers();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Mã voucher không hợp lệ, đã hết hạn hoặc đã được sử dụng trước đó.";
      setPosVerifyError(detail);
    } finally {
      setIsVerifyingPos(false);
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
      <div className="section-header flex-between" style={{ flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 className="section-title">🎟️ Kho Voucher & Quà Tặng Cá Nhân</h2>
          <p className="section-subtitle">
            Quản lý toàn bộ phiếu ưu đãi mua sắm, voucher sinh thái bạn đã quy đổi thành công từ Điểm Xanh.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="action-btn-secondary"
            onClick={() => setIsPosDrawerOpen(!isPosDrawerOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              fontWeight: 600,
              border: "1px solid #10b981",
              color: "#047857",
              background: isPosDrawerOpen ? "#ecfdf5" : "transparent",
              cursor: "pointer",
            }}
          >
            {isPosDrawerOpen ? "✖ Đóng Quầy POS" : "🔍 Quầy Đối Soát Thu Ngân POS"}
          </button>
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
      </div>

      {/* [CN 31 NÂNG CẤP 10/10] QUẦY ĐỐI SOÁT THU NGÂN POS SIMULATOR */}
      {isPosDrawerOpen && (
        <div style={{
          background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
          color: "#fff",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "24px",
          boxShadow: "0 10px 25px -5px rgba(6, 78, 59, 0.3)",
          border: "1px solid rgba(16, 185, 129, 0.4)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "#10b981", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                  CHẾ ĐỘ THU NGÂN / POS SIMULATOR
                </span>
                <span style={{ fontSize: "0.85rem", opacity: 0.9 }}>Kết nối trực tiếp API Đối Soát Doanh Nghiệp ESG</span>
              </div>
              <h3 style={{ margin: "6px 0 0", fontSize: "1.2rem", fontWeight: 700 }}>
                Quầy Thu Ngân Đối Soát & Khấu Trừ Voucher
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPosDrawerOpen(false)}
              style={{ background: "transparent", border: "none", color: "#a7f3d0", cursor: "pointer", fontSize: "1.2rem" }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handlePosVerify} style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
            <input
              type="text"
              value={posCodeInput}
              onChange={(e) => setPosCodeInput(e.target.value)}
              placeholder="Nhập hoặc dán mã voucher (VD: ECO-CP-XXXXX)..."
              style={{
                flex: "1 1 300px",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #a7f3d0",
                background: "rgba(255, 255, 255, 0.95)",
                color: "#0f172a",
                fontSize: "0.95rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            />
            {vouchers.length > 0 && vouchers.some((v) => v.status === "ACTIVE") && (
              <button
                type="button"
                onClick={() => {
                  const firstActive = vouchers.find((v) => v.status === "ACTIVE");
                  if (firstActive) setPosCodeInput(firstActive.voucher_code);
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#ecfdf5",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                ⚡ Lấy mã có sẵn
              </button>
            )}
            <button
              type="submit"
              disabled={isVerifyingPos}
              style={{
                background: "#10b981",
                color: "#ffffff",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
              }}
            >
              {isVerifyingPos ? "Đang xác thực…" : "✓ Đối Soát & Khấu Trừ Ngay"}
            </button>
          </form>

          {posVerifyError && (
            <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.5)", color: "#fecaca", fontSize: "0.85rem" }}>
              ❌ {posVerifyError}
            </div>
          )}

          {posVerifyResult && (
            <div style={{ marginTop: "14px", padding: "14px 18px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.25)", border: "1px solid #10b981", color: "#ecfdf5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: 700, color: "#34d399", fontSize: "1rem" }}>
                  ✅ ĐỐI SOÁT THÀNH CÔNG TẠI QUẦY
                </span>
                <span style={{ fontSize: "0.8rem", background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: "4px" }}>
                  Mã: {posVerifyResult.voucher_code}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", fontSize: "0.85rem", marginTop: "8px" }}>
                <div>🎁 <strong>Quà tặng:</strong> {posVerifyResult.reward_title}</div>
                <div>🏢 <strong>Thương hiệu:</strong> {posVerifyResult.brand || "GreenSpot ESG"}</div>
                <div>👤 <strong>Khách hàng:</strong> {posVerifyResult.user_name}</div>
                <div>💎 <strong>Điểm đã khấu trừ:</strong> {posVerifyResult.points_spent} Điểm Xanh</div>
              </div>
            </div>
          )}
        </div>
      )}

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
            <span className="modal-mini-tag">POPUP XÁC THỰC QUẦY THU NGÂN</span>
            <h3 className="confirm-modal-title">ĐÁNH DẤU ĐÃ DÙNG VOUCHER?</h3>
            <p className="confirm-modal-desc">
              Voucher sẽ bị khóa vĩnh viễn và không thể quét lại tại quầy. Hãy chỉ thực hiện khi thu ngân đã trao sản phẩm/dịch vụ cho bạn.
            </p>

            {/* Khối nhập PIN chống bấm nhầm tại nhà */}
            <div style={{
              margin: "14px 0",
              textAlign: "left",
              background: "rgba(245, 158, 11, 0.08)",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(245, 158, 11, 0.3)"
            }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#d97706", marginBottom: "6px" }}>
                🔑 Mã PIN Xác Nhận Thu Ngân (Chống bấm nhầm tại nhà):
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={cashierPin}
                  onChange={(e) => setCashierPin(e.target.value)}
                  placeholder="Nhập PIN thu ngân..."
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setCashierPin("2026")}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    background: "#f1f5f9",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Demo (2026)
                </button>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                🛡️ Thao tác sẽ được đóng dấu điện tử SHA-256 vào Nhật ký kiểm toán (Audit Log #audit-logs).
              </p>
            </div>

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
                {isMarkingUsed ? "Đang xử lý…" : "✓ Xác nhận đã dùng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
