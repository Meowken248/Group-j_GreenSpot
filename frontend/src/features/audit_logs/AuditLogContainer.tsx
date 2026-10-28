import React, { useState, useEffect } from "react";
import "./audit_logs.css";
import { auditApi } from "./auditApi";
import type {
  AuditLogDetail,
  AuditLogListResult,
  AuditLogFilterState,
  AuditStatisticsData,
  AuditChainVerificationResult,
} from "./types";

interface AuditLogContainerProps {
  onBackToHome?: () => void;
  onNavigateToAuth?: () => void;
}

export const AuditLogContainer: React.FC<AuditLogContainerProps> = ({
  onBackToHome,
}) => {
  // Filters state (Default 7 days ago to today)
  const todayStr = new Date().toISOString().split("T")[0];
  const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split("T")[0];

  const [filters, setFilters] = useState<AuditLogFilterState>({
    action: "ALL",
    actor_query: "",
    is_suspicious: false,
    start_date: sevenDaysAgoStr,
    end_date: todayStr,
  });

  const [dateError, setDateError] = useState<string | null>(null);

  // Statistics Dashboard Cards State
  const [stats, setStats] = useState<AuditStatisticsData | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // List data state
  const [listData, setListData] = useState<AuditLogListResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Màn 2: Detail Modal
  const [activeDetail, setActiveDetail] = useState<AuditLogDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Màn 4: Export Modal
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<string>("EXCEL");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  // Blockchain-Lite Merkle Chained Verification State
  const [chainModalOpen, setChainModalOpen] = useState<boolean>(false);
  const [isVerifyingChain, setIsVerifyingChain] = useState<boolean>(false);
  const [chainVerifyResult, setChainVerifyResult] = useState<AuditChainVerificationResult | null>(null);

  const handleRunChainVerification = async () => {
    try {
      setIsVerifyingChain(true);
      setChainModalOpen(true);
      setChainVerifyResult(null);
      const res = await auditApi.verifyChain(100);
      setChainVerifyResult(res);
    } catch (err: any) {
      showToast("error", "Không thể kiểm định chuỗi băm: " + (err?.response?.data?.detail || err.message));
    } finally {
      setIsVerifyingChain(false);
    }
  };

  // Toast notification (thay thế window.alert thô sơ)
  const [toastNotice, setToastNotice] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);

  const showToast = (type: "error" | "success" | "info", text: string) => {
    setToastNotice({ type, text });
    window.setTimeout(() => {
      setToastNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Validate dates
  const validateDates = (start: string, end: string): boolean => {
    if (!start || !end) {
      setDateError(null);
      return true;
    }
    const dStart = new Date(start);
    const dEnd = new Date(end);
    const dNow = new Date();

    if (dStart > dEnd) {
      setDateError("Ngày bắt đầu phải trước ngày kết thúc");
      return false;
    }
    if (dStart > dNow || dEnd > dNow) {
      setDateError("Không thể chọn ngày trong tương lai");
      return false;
    }
    const diffDays = (dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24);
    if (diffDays > 365) {
      setDateError("Khoảng thời gian tối đa 365 ngày");
      return false;
    }
    setDateError(null);
    return true;
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await auditApi.getStatistics();
      setStats(res);
    } catch (err) {
      console.error("Failed to load audit statistics:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchLogs = async (page: number = 1, append: boolean = false, overrideFilters?: AuditLogFilterState) => {
    const activeF = overrideFilters || filters;
    if (!validateDates(activeF.start_date, activeF.end_date)) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setApiError(null);

      const res = await auditApi.getAuditLogs({
        action: activeF.action !== "ALL" ? activeF.action : undefined,
        actor_query: activeF.actor_query.trim() ? activeF.actor_query.trim() : undefined,
        is_suspicious: activeF.is_suspicious ? true : undefined,
        start_date: activeF.start_date ? `${activeF.start_date}T00:00:00Z` : undefined,
        end_date: activeF.end_date ? `${activeF.end_date}T23:59:59Z` : undefined,
        page,
        limit: 20,
      });

      if (append && listData) {
        setListData({
          ...res,
          items: [...listData.items, ...res.items],
        });
      } else {
        setListData(res);
      }
      setCurrentPage(page);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Không thể tải nhật ký. Vui lòng thử lại";
      setApiError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLogs(1, false);
  }, []);

  const handleApplyFilter = () => {
    fetchLogs(1, false);
  };

  const handleResetFilter = () => {
    const defaultF: AuditLogFilterState = {
      action: "ALL",
      actor_query: "",
      is_suspicious: false,
      start_date: sevenDaysAgoStr,
      end_date: todayStr,
    };
    setFilters(defaultF);
    setDateError(null);
    fetchLogs(1, false, defaultF);
  };

  const handleToggleSuspiciousFilter = () => {
    const nextSusp = !filters.is_suspicious;
    const nextF: AuditLogFilterState = {
      ...filters,
      is_suspicious: nextSusp,
    };
    setFilters(nextF);
    fetchLogs(1, false, nextF);
  };

  const handleLoadMore = () => {
    if (!listData || !listData.has_more || loadingMore) return;
    fetchLogs(currentPage + 1, true);
  };

  // Màn 2: Xem chi tiết một dòng nhật ký
  const handleOpenDetail = async (logId: number) => {
    try {
      setLoadingDetail(true);
      const detail = await auditApi.getAuditLogDetail(logId);
      setActiveDetail(detail);
    } catch (err: any) {
      const errDetail = err.response?.data?.detail;
      showToast("error", typeof errDetail === "string" ? errDetail : "Không thể tải chi tiết nhật ký. Vui lòng thử lại");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleFilterByActor = (email: string) => {
    setActiveDetail(null);
    const newFilters: AuditLogFilterState = {
      ...filters,
      actor_query: email,
    };
    setFilters(newFilters);
    fetchLogs(1, false, newFilters);
    showToast("info", `Đang lọc nhật ký theo tài khoản: ${email}`);
  };

  // Màn 4: Xuất nhật ký
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportErrorMsg(null);
      setExportSuccessMsg(null);

      const res = await auditApi.exportAuditLogs({
        format: exportFormat,
        action: filters.action !== "ALL" ? filters.action : undefined,
        actor_query: filters.actor_query.trim() || undefined,
        start_date: filters.start_date ? `${filters.start_date}T00:00:00Z` : undefined,
        end_date: filters.end_date ? `${filters.end_date}T23:59:59Z` : undefined,
      });

      if (res.download_url) {
        try {
          await auditApi.downloadExportedAuditLogs(res.download_url, exportFormat);
        } catch (dlErr) {
          console.warn("Could not auto-trigger blob download:", dlErr);
        }
      }

      setExportSuccessMsg(
        `Đã tạo & tải xuống bản xuất ${res.format} (${res.total_records.toLocaleString()} bản ghi) thành công!`
      );
      showToast("success", `Đã xuất ${res.total_records.toLocaleString()} bản ghi kiểm toán (${res.format}).`);
      // Re-fetch stats & logs since export records an audit entry
      fetchStats();
      fetchLogs(1, false);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Không thể xuất nhật ký. Hãy thử thu hẹp bộ lọc";
      setExportErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="audit-page-container">
      {/* Inline Toast Notification */}
      {toastNotice && (
        <div className={`audit-toast-banner toast-${toastNotice.type}`} role="status">
          <span>
            {toastNotice.type === "error" ? "⚠️" : toastNotice.type === "success" ? "✅" : "ℹ️"}{" "}
            {toastNotice.text}
          </span>
          <button
            type="button"
            className="audit-toast-close"
            onClick={() => setToastNotice(null)}
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="audit-header">
        <div className="audit-header-left">
          <h1>
            <span>🛡️</span> Nhật Ký Kiểm Toán An Ninh (Security Audit Log)
            <span className="immutable-badge" title="AUD_002: Bảng nhật ký kiểm toán an ninh là bất biến (Read-only), không được phép xóa.">
              🔒 Read-Only · Bất Biến (AUD_002)
            </span>
          </h1>
          <p>
            Chuẩn an ninh ISO 27001: Giám sát toàn vẹn và bất biến (tamper-evident SHA-256) mọi hoạt động đăng nhập, đổi quyền,
            sửa dữ liệu, khóa tài khoản và can thiệp điểm thưởng.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="btn-refresh-audit"
            style={{ background: "#ecfdf5", color: "#047857", borderColor: "#6ee7b7", fontWeight: 600 }}
            onClick={handleRunChainVerification}
            title="Xác thực chuỗi băm mật mã Merkle-Chained chống sửa xóa cấp CSDL"
          >
            <span>🛡️</span> Kiểm Chứng Chuỗi Băm Merkle (Blockchain-Lite)
          </button>
          <button
            type="button"
            className="btn-refresh-audit"
            onClick={() => {
              fetchStats();
              fetchLogs(1, false);
            }}
            title="Làm mới số liệu"
          >
            <span>🔄</span> Làm mới
          </button>
          {onBackToHome && (
            <button type="button" className="back-home-btn" onClick={onBackToHome}>
              <span>←</span> Quay lại Bản đồ
            </button>
          )}
        </div>
      </div>

      {/* DASHBOARD STAT CARDS */}
      <div className="audit-stat-cards-grid">
        {/* Card 1: Tổng thao tác tuần này */}
        <div className="stat-card stat-blue">
          <div className="stat-icon-wrapper">📊</div>
          <div className="stat-info">
            <div className="stat-value">{loadingStats ? "..." : stats ? stats.total_this_week.toLocaleString() : "0"}</div>
            <div className="stat-title">Tổng Thao Tác Tuần Này</div>
            <div className="stat-sub">7 ngày gần nhất trên hệ thống</div>
          </div>
        </div>

        {/* Card 2: Đăng nhập thành công / tổng */}
        <div className="stat-card stat-emerald">
          <div className="stat-icon-wrapper">🔑</div>
          <div className="stat-info">
            <div className="stat-value">{loadingStats ? "..." : stats ? stats.login_total.toLocaleString() : "0"}</div>
            <div className="stat-title">Lượt Đăng Nhập</div>
            <div className="stat-sub">
              {loadingStats ? "Đang thống kê..." : stats ? `Thành công: ${stats.login_success} | Thất bại: ${stats.login_failed}` : "..."}
            </div>
          </div>
        </div>

        {/* Card 3: Thay đổi phân quyền */}
        <div className="stat-card stat-purple">
          <div className="stat-icon-wrapper">🛡️</div>
          <div className="stat-info">
            <div className="stat-value">{loadingStats ? "..." : stats ? stats.role_changes_count.toLocaleString() : "0"}</div>
            <div className="stat-title">Thay Đổi Phân Quyền</div>
            <div className="stat-sub">Điều chỉnh vai trò & quyền hạn RBAC</div>
          </div>
        </div>

        {/* Card 4: Cảnh báo bất thường (Clickable to Filter) */}
        <div
          className={`stat-card stat-amber ${filters.is_suspicious ? "stat-card-active" : ""}`}
          onClick={handleToggleSuspiciousFilter}
          title="Bấm để lọc các thao tác đáng ngờ"
          style={{ cursor: "pointer" }}
        >
          <div className="stat-icon-wrapper">⚠️</div>
          <div className="stat-info">
            <div className="stat-value">{loadingStats ? "..." : stats ? stats.suspicious_count.toLocaleString() : "0"}</div>
            <div className="stat-title">Cảnh Báo Đáng Ngờ</div>
            <div className="stat-sub">
              {filters.is_suspicious ? "👉 Đang kích hoạt bộ lọc" : "Bấm vào để lọc riêng"}
            </div>
          </div>
        </div>
      </div>

      <div className="audit-layout">
        {/* CỘT TRÁI: BỘ LỌC (Màn 1) */}
        <div className="filter-card">
          <div className="filter-card-title">
            <span>🔍</span> Bộ Lọc Nhật Ký
          </div>

          <div className="filter-group">
            <label htmlFor="AUD_DDL_ACTION">Loại hành động:</label>
            <select
              id="AUD_DDL_ACTION"
              data-ui-id="AUD_DDL_ACTION"
              className="filter-select"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="LOGIN">Đăng nhập (LOGIN)</option>
              <option value="UPDATE_ROLE">Đổi quyền RBAC (UPDATE_ROLE)</option>
              <option value="LOCK_USER">Khóa tài khoản (LOCK_USER)</option>
              <option value="UNLOCK_USER">Mở khóa tài khoản (UNLOCK_USER)</option>
              <option value="CREATE_USER">Tạo người dùng (CREATE_USER)</option>
              <option value="DELETE_USER">Xóa người dùng (DELETE_USER)</option>
              <option value="RESET_PASSWORD">Cấp lại mật khẩu (RESET_PASSWORD)</option>
              <option value="UPDATE_DATA">Sửa dữ liệu (UPDATE_DATA)</option>
              <option value="REWARD_POINTS">Cộng/trừ điểm (REWARD_POINTS)</option>
              <option value="VERIFY_VOUCHER">Đối soát Voucher (VERIFY_VOUCHER)</option>
              <option value="PUBLISH_ALERT">Phát cảnh báo khẩn (PUBLISH_ALERT)</option>
              <option value="SOS_DISPATCH">Điều phối cứu hộ (SOS_DISPATCH)</option>
              <option value="UPDATE_THRESHOLD">Cấu hình ngưỡng AQI (UPDATE_THRESHOLD)</option>
              <option value="EXPORT_AUDIT_LOG">Xuất nhật ký (EXPORT_AUDIT_LOG)</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Người thực hiện:</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Tên hoặc email..."
              value={filters.actor_query}
              onChange={(e) => setFilters({ ...filters, actor_query: e.target.value })}
            />
          </div>

          {/* Quick Toggle for Suspicious */}
          <div className="filter-group">
            <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!filters.is_suspicious}
                onChange={(e) => setFilters({ ...filters, is_suspicious: e.target.checked })}
              />
              <span style={{ fontWeight: "600", color: filters.is_suspicious ? "#d97706" : "#475569" }}>
                ⚠️ Chỉ xem cảnh báo đáng ngờ
              </span>
            </label>
          </div>

          <div id="AUD_DATE_RANGE" data-ui-id="AUD_DATE_RANGE">
            <div className="filter-group">
              <label>Từ ngày:</label>
              <input
                type="date"
                className={`filter-input ${dateError ? "input-error" : ""}`}
                value={filters.start_date}
                onChange={(e) => {
                  setFilters({ ...filters, start_date: e.target.value });
                  validateDates(e.target.value, filters.end_date);
                }}
              />
            </div>

            <div className="filter-group">
              <label>Đến ngày:</label>
              <input
                type="date"
                className={`filter-input ${dateError ? "input-error" : ""}`}
                value={filters.end_date}
                onChange={(e) => {
                  setFilters({ ...filters, end_date: e.target.value });
                  validateDates(filters.start_date, e.target.value);
                }}
              />
              {dateError && <div className="filter-error-text">⚠️ {dateError}</div>}
            </div>
          </div>

          <div className="filter-actions">
            <button
              type="button"
              className="btn-filter-apply"
              disabled={!!dateError || loading}
              onClick={handleApplyFilter}
            >
              {loading ? "Đang lọc..." : "Lọc Nhật Ký"}
            </button>
            <button type="button" className="btn-filter-reset" onClick={handleResetFilter}>
              Đặt lại
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: BẢNG NHẬT KÝ / EMPTY STATE */}
        <div className="audit-content-card">
          {/* Thanh Lọc Nhanh (Quick Filter Pills) */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              padding: "12px 18px 0 18px",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginRight: "4px" }}>
              ⚡ Lọc nhanh nghiệp vụ:
            </span>
            {[
              { code: "ALL", label: "📋 Tất cả" },
              { code: "REWARD_POINTS", label: "🌱 Điểm thưởng & Thử thách" },
              { code: "VERIFY_VOUCHER", label: "🎟️ Đối soát Voucher" },
              { code: "UPDATE_DATA", label: "📝 Cập nhật dữ liệu" },
              { code: "LOGIN", label: "🔑 Đăng nhập" },
              { code: "UPDATE_ROLE", label: "🛡️ Phân quyền RBAC" },
            ].map((pill) => {
              const isActive = filters.action === pill.code && !filters.is_suspicious;
              return (
                <button
                  key={pill.code}
                  type="button"
                  onClick={() => {
                    const nextF: AuditLogFilterState = {
                      ...filters,
                      action: pill.code,
                      is_suspicious: false,
                    };
                    setFilters(nextF);
                    fetchLogs(1, false, nextF);
                  }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: isActive ? "1px solid #059669" : "1px solid #cbd5e1",
                    background: isActive ? "#ecfdf5" : "#f8fafc",
                    color: isActive ? "#047857" : "#475569",
                    transition: "all 0.15s ease",
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <div className="audit-table-topbar">
            <div className="audit-count-badge">
              {listData ? `Hiển thị ${listData.items.length}/${listData.total} bản ghi` : "Đang tải dữ liệu..."}
              {filters.is_suspicious && (
                <span className="active-filter-pill" onClick={handleToggleSuspiciousFilter}>
                  Đang lọc đáng ngờ ✕
                </span>
              )}
            </div>

            {listData && listData.items.length > 0 && (
              <button
                type="button"
                className="btn-open-export"
                onClick={() => {
                  setExportModalOpen(true);
                  setExportErrorMsg(null);
                  setExportSuccessMsg(null);
                }}
              >
                <span>📥</span> Xuất Báo Cáo
              </button>
            )}
          </div>

          {loading ? (
            <div className="audit-table-wrap" aria-busy="true" aria-label="Đang nạp nhật ký kiểm toán">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Hành động</th>
                    <th>Đối tượng tác động</th>
                    <th>Địa chỉ IP & Thiết bị</th>
                    <th style={{ textAlign: "center" }}>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map((sk) => (
                    <tr key={sk} className="audit-skeleton-row">
                      <td>
                        <div className="audit-skeleton-bar" style={{ width: "68px", height: "14px", marginBottom: "6px" }} />
                        <div className="audit-skeleton-bar" style={{ width: "52px", height: "11px" }} />
                      </td>
                      <td>
                        <div className="audit-skeleton-bar" style={{ width: "120px", height: "14px", marginBottom: "6px" }} />
                        <div className="audit-skeleton-bar" style={{ width: "145px", height: "11px" }} />
                      </td>
                      <td>
                        <div className="audit-skeleton-bar" style={{ width: "96px", height: "22px", borderRadius: "6px" }} />
                      </td>
                      <td>
                        <div className="audit-skeleton-bar" style={{ width: "80px", height: "13px", marginBottom: "6px" }} />
                        <div className="audit-skeleton-bar" style={{ width: "110px", height: "11px" }} />
                      </td>
                      <td>
                        <div className="audit-skeleton-bar" style={{ width: "95px", height: "13px", marginBottom: "6px" }} />
                        <div className="audit-skeleton-bar" style={{ width: "115px", height: "11px" }} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="audit-skeleton-bar" style={{ width: "72px", height: "28px", margin: "0 auto", borderRadius: "6px" }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : apiError ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ {apiError}</div>
              <button type="button" className="btn-filter-apply" onClick={() => fetchLogs(1, false)}>
                Thử lại
              </button>
            </div>
          ) : listData && listData.items.length === 0 ? (
            /* MÀN 3: TRẠNG THÁI KHÔNG TÌM THẤY NHẬT KÝ */
            <div className="empty-audit-card">
              <div className="empty-icon">📂</div>
              <div className="empty-title">KHÔNG TÌM THẤY NHẬT KÝ PHÙ HỢP</div>
              <div className="empty-subtext">Thử nới lỏng bộ lọc thời gian hoặc loại bỏ điều kiện hành động</div>
              <button type="button" className="btn-filter-reset" onClick={handleResetFilter}>
                Xoá bộ lọc & Xem tất cả
              </button>
            </div>
          ) : listData ? (
            /* MÀN 1: BẢNG TRA CỨU */
            <>
              <div className="audit-table-wrap">
                <table id="AUD_TBL_LOGS" data-ui-id="AUD_TBL_LOGS" className="audit-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Người thực hiện</th>
                      <th>Hành động</th>
                      <th>Đối tượng tác động</th>
                      <th>Địa chỉ IP & Thiết bị</th>
                      <th style={{ textAlign: "center" }}>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listData.items.map((it) => {
                      const isSusp = it.is_suspicious;
                      return (
                        <tr key={it.log_id} className={`audit-row ${isSusp ? "row-suspicious" : ""}`}>
                          {/* Thời gian */}
                          <td style={{ whiteSpace: "nowrap" }}>
                            <div className="audit-time-main">
                              {new Date(it.created_at).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </div>
                            <div className="audit-time-sub">
                              {new Date(it.created_at).toLocaleDateString("vi-VN")}
                            </div>
                          </td>

                          {/* Người thực hiện */}
                          <td>
                            <div className="actor-name-wrap">
                              <strong>{it.actor_name}</strong>
                              {it.is_actor_deleted && <span className="deleted-tag">Đã xoá</span>}
                            </div>
                            {it.actor_email && <div className="actor-email">{it.actor_email}</div>}
                            <span className="actor-role-badge">{it.actor_role}</span>
                          </td>

                          {/* Hành động */}
                          <td>
                            <span
                              className={`action-badge ${
                                it.action === "LOGIN"
                                  ? "badge-login"
                                  : it.action === "UPDATE_ROLE" || it.action === "LOCK_USER" || it.action === "DELETE_USER"
                                  ? "badge-role"
                                  : it.action === "UPDATE_DATA" || it.action === "UPDATE_THRESHOLD"
                                  ? "badge-data"
                                  : it.action === "REWARD_POINTS" || it.action === "CREATE_USER" || it.action === "UNLOCK_USER"
                                  ? "badge-points"
                                  : "badge-export"
                              }`}
                            >
                              {it.action_display}
                            </span>

                            {isSusp && (
                              <div
                                className="suspicious-indicator"
                                data-ui-id="AUD_BADGE_SUSPICIOUS"
                                title={it.suspicious_reason || "Cảnh báo bất thường"}
                              >
                                <span>⚠️</span> {it.suspicious_reason || "Đáng ngờ"}
                              </div>
                            )}
                          </td>

                          {/* Đối tượng */}
                          <td>
                            <div className="target-table">{it.table_name}</div>
                            {it.record_id && <div className="target-record">{it.record_id}</div>}
                          </td>

                          {/* IP & Thiết bị */}
                          <td>
                            <div className="ip-text">{it.ip_address}</div>
                            <div className="device-text">{it.device_info}</div>
                          </td>

                          {/* Thao tác */}
                          <td style={{ textAlign: "center" }}>
                            <button
                              id={`AUD_BTN_VIEW_DIFF_${it.log_id}`}
                              data-ui-id="AUD_BTN_VIEW_DIFF"
                              type="button"
                              className="btn-view-detail"
                              onClick={() => handleOpenDetail(it.log_id)}
                              disabled={loadingDetail}
                            >
                              Xem diff
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tải thêm */}
              {listData.has_more && (
                <div className="load-more-wrap">
                  <button
                    type="button"
                    className="btn-load-more"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                  >
                    {loadingMore ? "Đang tải thêm…" : "Tải thêm 20 bản ghi tiếp theo"}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MÀN 2: MODAL CHI TIẾT NHẬT KÝ & VISUAL DIFF BEFORE/AFTER */}
      {/* ======================================================== */}
      {activeDetail && (
        <div className="modal-backdrop">
          <div className="modal-dialog audit-detail-dialog">
            <div className="modal-header">
              <div className="modal-header-left">
                <h3>Chi Tiết Dòng Nhật Ký #{activeDetail.log_id}</h3>
                <span className="log-action-pill">{activeDetail.action_display}</span>
                <span className="immutable-badge">🔒 Bất Biến (AUD_002)</span>
                {activeDetail.is_suspicious && (
                  <span className="suspicious-alert-tag" data-ui-id="AUD_BADGE_SUSPICIOUS">
                    ⚠️ {activeDetail.suspicious_reason || "Thao tác cảnh báo bất thường"}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveDetail(null)}
              >
                ✕
              </button>
            </div>

            <div className="detail-three-blocks">
              {/* KHỐI 1: THÔNG TIN */}
              <div className="detail-block">
                <div className="detail-block-title">
                  <span>👤</span> Thông Tin Người Thực Hiện
                </div>

                <div className="detail-row">
                  <div className="detail-label">Người thực hiện:</div>
                  <div className="detail-value">
                    <strong>{activeDetail.actor_name}</strong>
                    {activeDetail.is_actor_deleted && <span className="deleted-tag">Đã xoá</span>}
                  </div>
                </div>

                {activeDetail.actor_email && (
                  <div className="detail-row">
                    <div className="detail-label">Email:</div>
                    <div className="detail-value">{activeDetail.actor_email}</div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-label">Vai trò:</div>
                  <div className="detail-value">{activeDetail.actor_role}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Thời gian:</div>
                  <div className="detail-value">
                    {new Date(activeDetail.created_at).toLocaleString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Hành vi & Endpoint:</div>
                  <div className="detail-value">
                    <span className="action-badge badge-role">{activeDetail.action_display}</span>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      {activeDetail.request_uri}
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI 2: VISUAL DIFF BEFORE / AFTER 2 CỘT TRỰC QUAN */}
              <div className="detail-block" style={{ gridColumn: "span 2" }}>
                <div className="detail-block-title">
                  <span>🔄</span> So Sánh Biến Động Dữ Liệu (Before vs After Diff)
                </div>

                {!activeDetail.has_data_changes ? (
                  <div style={{ color: "#64748b", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>
                    Không có thay đổi dữ liệu cấu trúc (thao tác đọc hoặc ghi sự kiện đơn thuần).
                  </div>
                ) : (
                  <div className="side-by-side-diff-container">
                    <div className="diff-split-columns">
                      {/* Cột Before */}
                      <div className="diff-column diff-column-before">
                        <div className="diff-column-header">
                          <span className="diff-indicator-dot dot-red" />
                          <span>DỮ LIỆU CŨ (BEFORE)</span>
                        </div>
                        <div className="diff-column-content">
                          {activeDetail.diff ? (
                            Object.entries(activeDetail.diff).map(([key, field]) => (
                              <div
                                key={key}
                                className={`diff-item-row ${field.is_changed ? "field-changed-red" : ""}`}
                              >
                                <div className="diff-field-name">{key}:</div>
                                <div className="diff-field-val">
                                  {field.old !== null && field.old !== undefined
                                    ? typeof field.old === "object"
                                      ? JSON.stringify(field.old)
                                      : String(field.old)
                                    : "null (chưa thiết lập)"}
                                </div>
                              </div>
                            ))
                          ) : activeDetail.old_data ? (
                            Object.entries(activeDetail.old_data).map(([k, v]) => (
                              <div key={k} className="diff-item-row">
                                <div className="diff-field-name">{k}:</div>
                                <div className="diff-field-val">{typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
                              </div>
                            ))
                          ) : (
                            <div className="diff-empty-notice">Không có bản ghi cũ (thao tác thêm mới)</div>
                          )}
                        </div>
                      </div>

                      {/* Cột After */}
                      <div className="diff-column diff-column-after">
                        <div className="diff-column-header">
                          <span className="diff-indicator-dot dot-green" />
                          <span>DỮ LIỆU MỚI (AFTER)</span>
                        </div>
                        <div className="diff-column-content">
                          {activeDetail.diff ? (
                            Object.entries(activeDetail.diff).map(([key, field]) => (
                              <div
                                key={key}
                                className={`diff-item-row ${field.is_changed ? "field-changed-green" : ""}`}
                              >
                                <div className="diff-field-name">
                                  {key} {field.is_changed && <span className="changed-pill">ĐÃ SỬA</span>}
                                </div>
                                <div className="diff-field-val">
                                  {field.new !== null && field.new !== undefined
                                    ? typeof field.new === "object"
                                      ? JSON.stringify(field.new)
                                      : String(field.new)
                                    : "null"}
                                </div>
                              </div>
                            ))
                          ) : activeDetail.new_data ? (
                            Object.entries(activeDetail.new_data).map(([k, v]) => (
                              <div key={k} className="diff-item-row field-changed-green">
                                <div className="diff-field-name">{k}:</div>
                                <div className="diff-field-val">{typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
                              </div>
                            ))
                          ) : (
                            <div className="diff-empty-notice">Không có dữ liệu mới</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* KHỐI 3: TRUY VẾT & THIẾT BỊ + SHA-256 INTEGRITY HASH */}
              <div className="detail-block" style={{ gridColumn: "span 3" }}>
                <div className="detail-block-title">
                  <span>🌐</span> Truy Vết Mạng, Thiết Bị & Chữ Ký Toàn Vẹn (Forensics)
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "16px" }}>
                  <div className="detail-row">
                    <div className="detail-label">Địa chỉ IP:</div>
                    <div className="detail-value" style={{ fontFamily: "monospace", fontWeight: "700" }}>
                      {activeDetail.ip_address}
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-label">Thiết bị & Nền tảng:</div>
                    <div className="detail-value">{activeDetail.device_info}</div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-label">User-Agent:</div>
                    <div className="detail-value" style={{ fontSize: "11px", color: "#64748b" }}>
                      {activeDetail.user_agent}
                    </div>
                  </div>
                </div>

                {activeDetail.integrity_hash && (
                  <div
                    className="integrity-hash-box"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      padding: "14px 16px",
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: "10px",
                      marginTop: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <span className="integrity-hash-label" style={{ color: "#065f46", fontWeight: 700 }}>
                        🔐 Chứng Thực Chuỗi Băm Móc Xích Bất Biến (Chained SHA-256 Merkle Trail):
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "999px",
                          background: "#059669",
                          color: "#ffffff",
                        }}
                      >
                        ✅ VERIFIED CHAIN • NGUYÊN VẸN 100%
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "#334155", display: "grid", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <strong style={{ minWidth: "190px", color: "#475569" }}>
                          🔗 Mã băm khối trước ({activeDetail.prev_log_id ? `#${activeDetail.prev_log_id}` : "GENESIS"}):
                        </strong>
                        <code
                          style={{
                            background: "#ffffff",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "11.5px",
                            color: "#475569",
                            wordBreak: "break-all",
                          }}
                        >
                          {activeDetail.prev_integrity_hash || "0000000000000000000000000000000000000000000000000000000000000000"}
                        </code>
                        {activeDetail.prev_log_id && (
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(activeDetail.prev_log_id!)}
                            style={{
                              padding: "2px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              borderRadius: "6px",
                              border: "1px solid #059669",
                              background: "#ffffff",
                              color: "#047857",
                              cursor: "pointer",
                            }}
                          >
                            ↖ Xem khối #{activeDetail.prev_log_id}
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <strong style={{ minWidth: "190px", color: "#065f46" }}>
                          🛡️ Mã băm liên kết khối #{activeDetail.log_id}:
                        </strong>
                        <code className="integrity-hash-code" style={{ wordBreak: "break-all" }}>
                          {activeDetail.integrity_hash}
                        </code>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetail.actor_email && (
                  <button
                    type="button"
                    className="btn-trace-actor"
                    onClick={() => handleFilterByActor(activeDetail.actor_email!)}
                  >
                    🔍 Lọc tất cả hoạt động của tài khoản này
                  </button>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setActiveDetail(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MÀN 4: MODAL XUẤT NHẬT KÝ (EXCEL / PDF / CSV)            */}
      {/* ======================================================== */}
      {exportModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>📥 Xuất Báo Cáo Nhật Ký Kiểm Toán</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setExportModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="export-summary-box">
                <div className="export-summary-label">Phạm vi xuất:</div>
                <div className="export-summary-text">
                  Hành động: <strong>{filters.action}</strong> • Người thực hiện:{" "}
                  <strong>{filters.actor_query || "Tất cả"}</strong> • Khoảng thời gian:{" "}
                  <strong>
                    {filters.start_date} đến {filters.end_date}
                  </strong>
                </div>
              </div>

              {exportErrorMsg && <div className="modal-form-error">⚠️ {exportErrorMsg}</div>}
              {exportSuccessMsg && <div className="modal-form-success">✅ {exportSuccessMsg}</div>}

              <div className="form-group" style={{ marginTop: "16px" }}>
                <label className="form-label">Chọn định dạng tệp:</label>
                <div className="export-format-options">
                  <label className={`format-option ${exportFormat === "EXCEL" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="EXCEL"
                      checked={exportFormat === "EXCEL"}
                      onChange={() => setExportFormat("EXCEL")}
                    />
                    <div className="format-info">
                      <div className="format-title">📊 Microsoft Excel (.csv UTF-8 BOM)</div>
                      <div className="format-sub">Báo cáo đầy đủ tương thích trực tiếp với Microsoft Excel</div>
                    </div>
                  </label>

                  <label className={`format-option ${exportFormat === "PDF" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="PDF"
                      checked={exportFormat === "PDF"}
                      onChange={() => setExportFormat("PDF")}
                    />
                    <div className="format-info">
                      <div className="format-title">📄 Tài Liệu Báo Cáo In Ấn (HTML/PDF)</div>
                      <div className="format-sub">Định dạng in ấn báo cáo trình hội đồng thanh tra</div>
                    </div>
                  </label>

                  <label className={`format-option ${exportFormat === "CSV" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="CSV"
                      checked={exportFormat === "CSV"}
                      onChange={() => setExportFormat("CSV")}
                    />
                    <div className="format-info">
                      <div className="format-title">📑 Dữ Liệu Phân Tách CSV (.csv)</div>
                      <div className="format-sub">Nhẹ, phù hợp phân tích dữ liệu lớn & SIEM</div>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "12px" }}>
                🔒 Lưu ý bảo mật: Thao tác xuất này sẽ tự động được ghi lại vào Nhật ký kiểm toán để phục vụ thanh tra.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setExportModalOpen(false)}
                disabled={isExporting}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? "Đang xuất…" : `Xác Nhận Xuất & Tải ${exportFormat}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL KIỂM ĐỊNH TOÀN VẸN CHUỖI BĂM MERKLE (BLOCKCHAIN-LITE VERIFY) */}
      {chainModalOpen && (
        <div className="modal-backdrop" onClick={() => setChainModalOpen(false)}>
          <div
            className="modal-container chain-verify-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "780px", width: "95%" }}
          >
            <div className="modal-header">
              <h3>
                <span>🛡️</span> Kiểm Định Toàn Vẹn Chuỗi Băm Merkle-Chained Audit Trail
              </h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setChainModalOpen(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {isVerifyingChain ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
                  <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "16px" }}>
                    Đang duyệt và đối soát hàm băm toàn vẹn chuỗi khối...
                  </div>
                  <div style={{ color: "#64748b", fontSize: "13px", marginTop: "6px" }}>
                    Thuật toán: SHA-256(Hash(N-1) + Payload(N)) • Chuẩn ISO/IEC 27001
                  </div>
                </div>
              ) : chainVerifyResult ? (
                <div>
                  {/* Status Banner */}
                  <div
                    style={{
                      background: chainVerifyResult.is_valid ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      border: `1px solid ${chainVerifyResult.is_valid ? "#10b981" : "#ef4444"}`,
                      borderRadius: "10px",
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={{ fontSize: "32px" }}>{chainVerifyResult.is_valid ? "🛡️" : "⚠️"}</div>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "15px",
                          color: chainVerifyResult.is_valid ? "#065f46" : "#991b1b",
                        }}
                      >
                        {chainVerifyResult.is_valid
                          ? "CHUỖI NHẬT KÝ KIỂM TOÁN NGUYÊN VẸN 100% (CRYPTOGRAPHICALLY VERIFIED)"
                          : "PHÁT HIỆN VẾT NỨT GÃY TOÀN VẸN CƠ SỞ DỮ LIỆU!"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#334155", marginTop: "3px" }}>
                        {chainVerifyResult.message}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                        Số Khối Đã Đối Soát
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
                        {chainVerifyResult.total_records_checked} Khối
                      </div>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                        Trạng Thái Chuỗi Băm
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#059669", marginTop: "6px" }}>
                        ✅ Hợp lệ (Unbroken)
                      </div>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                        Thời Điểm Kiểm Tra
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginTop: "6px" }}>
                        {new Date(chainVerifyResult.verified_at).toLocaleTimeString("vi-VN")}
                      </div>
                    </div>
                  </div>

                  {/* Root Hashes */}
                  <div style={{ background: "#0f172a", color: "#e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "20px", fontSize: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#94a3b8" }}>Genesis Block Seed:</span>
                      <code style={{ color: "#38bdf8", fontFamily: "monospace" }}>{chainVerifyResult.genesis_hash.slice(0, 32)}...</code>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>Merkle Chained Root:</span>
                      <code style={{ color: "#34d399", fontFamily: "monospace", fontWeight: 700 }}>{chainVerifyResult.merkle_root_hash}</code>
                    </div>
                  </div>

                  {/* Verified Blocks Sample */}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b", marginBottom: "10px" }}>
                      🔗 10 Khối Mới Nhất Được Xác Thực Trong Chuỗi Móc Xích:
                    </div>
                    <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                            <th style={{ padding: "8px 10px" }}>Block</th>
                            <th style={{ padding: "8px 10px" }}>Hành Động</th>
                            <th style={{ padding: "8px 10px" }}>Người Thực Hiện</th>
                            <th style={{ padding: "8px 10px" }}>Mã Băm SHA-256</th>
                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Khớp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chainVerifyResult.blocks_sample.map((b) => (
                            <tr key={b.log_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 10px", fontWeight: 600, color: "#2563eb" }}>#{b.log_id}</td>
                              <td style={{ padding: "8px 10px" }}>{b.action}</td>
                              <td style={{ padding: "8px 10px", color: "#475569" }}>{b.actor_name}</td>
                              <td style={{ padding: "8px 10px" }}>
                                <code style={{ fontSize: "11px", color: "#059669", background: "#ecfdf5", padding: "2px 6px", borderRadius: "4px" }}>
                                  {b.current_hash.slice(0, 16)}...
                                </code>
                              </td>
                              <td style={{ padding: "8px 10px", textAlign: "center", color: "#059669" }}>✅</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setChainModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                onClick={handleRunChainVerification}
                disabled={isVerifyingChain}
                style={{ background: "#059669" }}
              >
                {isVerifyingChain ? "Đang quét..." : "🔄 Quét Lại Chuỗi Băm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
