import React, { useState, useEffect } from "react";
import type {
  WalletSummaryResponse,
  TransactionHistoryResponse,
  TransactionDetailResponse,
} from "../types";
import { rewardsApi } from "../rewardsApi";
import { TransactionDetailModal } from "./TransactionDetailModal";

interface GreenWalletProps {
  isLoggedIn: boolean;
  onNavigateToAuth: () => void;
  onNavigateToPolicy: () => void;
  onNavigateToRewardsCatalog?: () => void;
}

export const GreenWallet: React.FC<GreenWalletProps> = ({
  isLoggedIn,
  onNavigateToAuth,
  onNavigateToPolicy,
  onNavigateToRewardsCatalog,
}) => {
  const [wallet, setWallet] = useState<WalletSummaryResponse | null>(null);
  const [history, setHistory] = useState<TransactionHistoryResponse | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bộ lọc lịch sử biến động (Màn 2)
  const [flowType, setFlowType] = useState<string>("ALL");
  const [timeRange, setTimeRange] = useState<string>("30_DAYS");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Popup chi tiết giao dịch (Màn 3)
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [txDetail, setTxDetail] = useState<TransactionDetailResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Xuất file sao kê
  const [isExporting, setIsExporting] = useState(false);

  const fetchWalletSummary = async () => {
    if (!isLoggedIn) {
      setLoadingWallet(false);
      return;
    }
    setLoadingWallet(true);
    setErrorMsg(null);
    try {
      const data = await rewardsApi.getWalletSummary();
      setWallet(data);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMsg(anyErr?.response?.data?.detail || anyErr?.message || "Không thể tải thông tin ví điểm");
    } finally {
      setLoadingWallet(false);
    }
  };

  const fetchHistory = async (page = 1) => {
    if (!isLoggedIn) return;
    setLoadingHistory(true);
    try {
      const data = await rewardsApi.getTransactionHistory({
        flow_type: flowType === "ALL" ? undefined : flowType,
        time_range: timeRange === "ALL" ? undefined : timeRange,
        page,
        page_size: 10,
      });
      setHistory(data);
      setCurrentPage(page);
    } catch (err: unknown) {
      console.error("Lỗi khi tải lịch sử:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchWalletSummary();
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchHistory(1);
    }
  }, [isLoggedIn, flowType, timeRange]);

  const handleOpenTransactionDetail = async (txId: string) => {
    setSelectedTxId(txId);
    setLoadingDetail(true);
    try {
      const detail = await rewardsApi.getTransactionDetail(txId);
      setTxDetail(detail);
      setDetailModalOpen(true);
    } catch (err: unknown) {
      alert("Không thể tải chi tiết chứng từ giao dịch");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExportStatement = async () => {
    setIsExporting(true);
    try {
      await rewardsApi.downloadStatementCsv(
        flowType === "ALL" ? undefined : flowType,
        timeRange
      );
    } catch (err: unknown) {
      alert("Không thể kết xuất sao kê lúc này. Vui lòng thử lại!");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="wallet-guest-container">
        <div className="guest-wallet-card">
          <div className="guest-wallet-icon">💳</div>
          <h2>Ví Điểm Thưởng Công Dân Xanh</h2>
          <p>
            Vui lòng đăng nhập tài khoản GreenSpot để xem số dư ví điểm, theo dõi tiến trình
            thăng hạng danh hiệu và tra cứu sao kê lịch sử biến động điểm sinh thái của bạn!
          </p>
          <div className="guest-wallet-actions">
            <button
              type="button"
              className="btn-primary-eco"
              onClick={onNavigateToAuth}
            >
              Đăng nhập tài khoản
            </button>
            <button
              type="button"
              className="btn-secondary-eco"
              onClick={onNavigateToPolicy}
            >
              Xem bảng quy chuẩn tích điểm
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingWallet && !wallet) {
    return (
      <div className="policy-loading-container">
        <div className="spinner-eco" />
        <p>Đang tải dữ liệu ví điểm cá nhân...</p>
      </div>
    );
  }

  return (
    <div className="green-wallet-wrapper">
      {/* POPUP CHI TIẾT GIAO DỊCH (CHỨC NĂNG 29 - MÀN 3) */}
      <TransactionDetailModal
        isOpen={detailModalOpen}
        data={txDetail}
        onClose={() => {
          setDetailModalOpen(false);
          setTxDetail(null);
        }}
      />

      {/* HEADER BANNER */}
      <div className="wallet-header-strip">
        <div>
          <span className="badge-feature-tag">CHỨC NĂNG 29</span>
          <h1 className="wallet-page-title">Ví Điểm & Lịch Sử Biến Động Điểm Xanh</h1>
          <p className="wallet-page-desc">
            Bảng điều khiển tài chính sinh thái cá nhân (Green Wallet Dashboard) và sổ cái sao kê
            chi tiết minh bạch mọi biến động cộng/trừ Điểm Xanh.
          </p>
        </div>
        <div className="wallet-quick-actions">
          <button
            type="button"
            className="btn-earn-more"
            onClick={onNavigateToPolicy}
          >
            <span>✨</span>
            <span>Tích lũy thêm điểm</span>
          </button>
          <button
            type="button"
            className="btn-export-csv"
            onClick={handleExportStatement}
            disabled={isExporting}
          >
            <span>📥</span>
            <span>{isExporting ? "Đang xuất..." : "Xuất sao kê CSV"}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-banner-error">
          <span>⚠️ {errorMsg}</span>
          <button type="button" onClick={fetchWalletSummary} className="btn-retry">
            Thử lại
          </button>
        </div>
      )}

      {/* MÀN 1: BẢNG ĐIỀU KHIỂN VÍ ĐIỂM (CHIA 3 KHỐI THEO BÁO CÁO) */}
      {wallet && (
        <div className="wallet-dashboard-3cols">
          {/* KHỐI 1 (CỘT TRÁI): SỐ DƯ */}
          <div className="wallet-block block-balance">
            <div className="block-tag">KHỐI SỐ DƯ</div>
            <div className="balance-headline">
              <span className="balance-label">Điểm hiện có</span>
              <div className="balance-big-display">
                <span className="balance-number">
                  {wallet.green_points.toLocaleString("vi-VN")}
                </span>
                <span className="balance-unit">Điểm Xanh</span>
              </div>
            </div>

            <div className="wallet-tier-section">
              <div className="tier-tag-badge">
                <span className="tier-icon">{wallet.current_tier.badge_icon}</span>
                <strong className="tier-name">{wallet.current_tier.tier_name}</strong>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${wallet.progress_percent}%` }}
                />
              </div>
              <div className="tier-next-hint">
                {wallet.points_to_next_tier > 0 ? (
                  <>
                    Còn <strong>{wallet.points_to_next_tier} điểm</strong> để lên{" "}
                    {wallet.next_tier?.tier_name}
                  </>
                ) : (
                  "Đạt đỉnh danh hiệu Đại sứ Môi trường!"
                )}
              </div>
            </div>

            <div className="lifetime-footnote">
              Tổng điểm tích lũy trọn đời:{" "}
              <strong>{wallet.lifetime_points.toLocaleString("vi-VN")}</strong> điểm
            </div>
          </div>

          {/* KHỐI 2 (CỘT GIỮA): TÓM TẮT */}
          <div className="wallet-block block-summary">
            <div className="block-tag">KHỐI TÓM TẮT</div>

            <div className="summary-stat-card card-earned">
              <div className="stat-icon-circle green-bg">📈</div>
              <div className="stat-content">
                <span className="stat-label">Điểm kiếm tuần này</span>
                <strong className="stat-value positive">
                  +{wallet.points_earned_this_week.toLocaleString("vi-VN")} điểm
                </strong>
                <span className="stat-sub">Tính từ thứ Hai đầu tuần</span>
              </div>
            </div>

            <div className="summary-stat-card card-spent">
              <div className="stat-icon-circle orange-bg">🎁</div>
              <div className="stat-content">
                <span className="stat-label">Điểm đã dùng</span>
                <strong className="stat-value negative">
                  {wallet.points_spent_total.toLocaleString("vi-VN")} điểm
                </strong>
                <span className="stat-sub">Đã đổi quà tặng / Voucher</span>
              </div>
            </div>

            <div className="summary-stat-card card-tx-count">
              <div className="stat-icon-circle blue-bg">📑</div>
              <div className="stat-content">
                <span className="stat-label">Tổng giao dịch ghi nhận</span>
                <strong className="stat-value">
                  {wallet.total_transactions_count} giao dịch
                </strong>
                <span className="stat-sub">Được bảo chứng toàn vẹn</span>
              </div>
            </div>
          </div>

          {/* KHỐI 3 (CỘT PHẢI): HÀNH ĐỘNG */}
          <div className="wallet-block block-actions">
            <div className="block-tag">KHỐI HÀNH ĐỘNG</div>
            <p className="actions-block-desc">
              Sử dụng điểm xanh để nhận các phần quà giá trị hoặc khám phá cơ hội tích lũy mới:
            </p>

            <button
              type="button"
              className="btn-wallet-action btn-redeem"
              onClick={
                onNavigateToRewardsCatalog
                  ? onNavigateToRewardsCatalog
                  : () => {
                      alert(
                        "Chức năng 15 & 16: Danh mục quà tặng xanh và đổi voucher đang được kích hoạt!"
                      );
                    }
              }
            >
              <div className="action-btn-left">
                <span className="btn-icon">🎁</span>
                <div className="btn-text-wrap">
                  <strong>Đổi quà tặng</strong>
                  <span>Sử dụng điểm đổi lấy voucher mua sắm & cây xanh</span>
                </div>
              </div>
              <span className="arrow-right">→</span>
            </button>

            <button
              type="button"
              className="btn-wallet-action btn-history-anchor"
              onClick={() => {
                const el = document.getElementById("transaction-ledger-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <div className="action-btn-left">
                <span className="btn-icon">📜</span>
                <div className="btn-text-wrap">
                  <strong>Xem lịch sử</strong>
                  <span>Sao kê chi tiết từng dòng biến động điểm</span>
                </div>
              </div>
              <span className="arrow-right">↓</span>
            </button>

            <button
              type="button"
              className="btn-wallet-action btn-policy-anchor"
              onClick={onNavigateToPolicy}
            >
              <div className="action-btn-left">
                <span className="btn-icon">🌱</span>
                <div className="btn-text-wrap">
                  <strong>Tích lũy điểm mới</strong>
                  <span>Xem bảng tỷ lệ cộng điểm & thử thách tuần</span>
                </div>
              </div>
              <span className="arrow-right">→</span>
            </button>
          </div>
        </div>
      )}

      {/* MÀN 2: LỊCH SỬ BIẾN ĐỘNG ĐIỂM (CHIA 2 KHỐI THEO BÁO CÁO) */}
      <div id="transaction-ledger-section" className="wallet-ledger-layout">
        {/* KHỐI BỘ LỌC (CỘT TRÁI) */}
        <div className="ledger-filter-col">
          <div className="filter-panel-header">
            <span className="panel-icon">⚙️</span>
            <h3>BỘ LỌC SAO KÊ</h3>
          </div>

          {/* Lọc loại biến động */}
          <div className="filter-group">
            <label className="filter-group-label">Loại Biến Động:</label>
            <div className="filter-radio-stack">
              <label className={`radio-pill ${flowType === "ALL" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="flowType"
                  value="ALL"
                  checked={flowType === "ALL"}
                  onChange={() => setFlowType("ALL")}
                />
                <span>Tất cả biến động</span>
              </label>

              <label className={`radio-pill ${flowType === "EARN" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="flowType"
                  value="EARN"
                  checked={flowType === "EARN"}
                  onChange={() => setFlowType("EARN")}
                />
                <span>Điểm cộng (+)</span>
              </label>

              <label className={`radio-pill ${flowType === "REDEEM" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="flowType"
                  value="REDEEM"
                  checked={flowType === "REDEEM"}
                  onChange={() => setFlowType("REDEEM")}
                />
                <span>Điểm trừ (-)</span>
              </label>
            </div>
          </div>

          {/* Lọc khoảng thời gian */}
          <div className="filter-group">
            <label className="filter-group-label">Khoảng Thời Gian:</label>
            <div className="filter-radio-stack">
              <label className={`radio-pill ${timeRange === "7_DAYS" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="timeRange"
                  value="7_DAYS"
                  checked={timeRange === "7_DAYS"}
                  onChange={() => setTimeRange("7_DAYS")}
                />
                <span>7 ngày qua</span>
              </label>

              <label className={`radio-pill ${timeRange === "30_DAYS" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="timeRange"
                  value="30_DAYS"
                  checked={timeRange === "30_DAYS"}
                  onChange={() => setTimeRange("30_DAYS")}
                />
                <span>30 ngày qua</span>
              </label>

              <label className={`radio-pill ${timeRange === "THIS_MONTH" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="timeRange"
                  value="THIS_MONTH"
                  checked={timeRange === "THIS_MONTH"}
                  onChange={() => setTimeRange("THIS_MONTH")}
                />
                <span>Tháng này</span>
              </label>

              <label className={`radio-pill ${timeRange === "ALL" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="timeRange"
                  value="ALL"
                  checked={timeRange === "ALL"}
                  onChange={() => setTimeRange("ALL")}
                />
                <span>Toàn bộ thời gian</span>
              </label>
            </div>
          </div>

          <div className="filter-export-box">
            <button
              type="button"
              className="btn-download-statement"
              onClick={handleExportStatement}
              disabled={isExporting}
            >
              <span>📄 Xuất sao kê ví điểm</span>
            </button>
            <small className="export-hint">
              Định dạng CSV tương thích Excel hỗ trợ đối chiếu cá nhân
            </small>
          </div>
        </div>

        {/* KHỐI LỊCH SỬ (CỘT PHẢI) */}
        <div className="ledger-table-col">
          <div className="ledger-col-header">
            <div className="header-title-wrap">
              <span className="panel-icon">📜</span>
              <h3>LỊCH SỬ GIAO DỊCH</h3>
              {history && (
                <span className="tx-count-pill">{history.total} bản ghi</span>
              )}
            </div>

            {history && (
              <div className="ledger-mini-summary">
                <span className="mini-earned">
                  Đã nhận: +{history.total_earned.toLocaleString("vi-VN")}đ
                </span>
                <span className="mini-separator">•</span>
                <span className="mini-spent">
                  Đã đổi: -{history.total_spent.toLocaleString("vi-VN")}đ
                </span>
              </div>
            )}
          </div>

          {loadingHistory ? (
            <div className="ledger-loading-box">
              <div className="spinner-eco" />
              <span>Đang tải danh sách biến động điểm...</span>
            </div>
          ) : history && history.items.length > 0 ? (
            <div className="ledger-items-list">
              {history.items.map((tx) => (
                <div key={tx.transaction_id} className="ledger-row-card">
                  <div className="row-left">
                    <span
                      className={`row-type-icon ${
                        tx.is_positive ? "earn-icon" : "redeem-icon"
                      }`}
                    >
                      {tx.is_positive ? "🌱" : "🎁"}
                    </span>
                    <div className="row-meta">
                      <strong className="row-action-title">{tx.action_title}</strong>
                      <div className="row-subinfo">
                        <span className="row-code">{tx.transaction_code}</span>
                        <span className="row-dot">•</span>
                        <span className="row-time">
                          {new Date(tx.created_at).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="row-right">
                    <div className="points-after-wrap">
                      <span
                        className={`points-tag ${
                          tx.is_positive ? "points-plus" : "points-minus"
                        }`}
                      >
                        {tx.is_positive
                          ? `+${tx.points_amount} điểm`
                          : `${tx.points_amount} điểm`}
                      </span>
                      <span className="balance-after-text">
                        Số dư: {tx.balance_after.toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-view-detail"
                      onClick={() => handleOpenTransactionDetail(tx.transaction_id)}
                      disabled={loadingDetail && selectedTxId === tx.transaction_id}
                    >
                      <span>Xem chi tiết</span>
                      <span className="chevron">›</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* PHÂN TRANG */}
              {history.total_pages > 1 && (
                <div className="ledger-pagination">
                  <button
                    type="button"
                    className="btn-page-nav"
                    disabled={currentPage <= 1}
                    onClick={() => fetchHistory(currentPage - 1)}
                  >
                    ‹ Trước
                  </button>
                  <span className="page-indicator">
                    Trang {currentPage} / {history.total_pages}
                  </span>
                  <button
                    type="button"
                    className="btn-page-nav"
                    disabled={currentPage >= history.total_pages}
                    onClick={() => fetchHistory(currentPage + 1)}
                  >
                    Sau ›
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="ledger-empty-box">
              <span className="empty-icon">🍃</span>
              <p>Không có biến động điểm nào trong khoảng thời gian này.</p>
              <button
                type="button"
                className="btn-action-small"
                onClick={onNavigateToPolicy}
              >
                Tham gia hoạt động xanh ngay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
