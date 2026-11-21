import React, { useState, useEffect } from "react";
import "./audit_logs.css";
import { auditApi } from "./auditApi";
import type {
  AuditLogItem,
  AuditLogDetail,
  AuditLogListResult,
  AuditLogFilterState,
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
    start_date: sevenDaysAgoStr,
    end_date: todayStr,
  });

  const [dateError, setDateError] = useState<string | null>(null);

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

  const fetchLogs = async (page: number = 1, append: boolean = false) => {
    if (!validateDates(filters.start_date, filters.end_date)) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setApiError(null);

      const res = await auditApi.getAuditLogs({
        action: filters.action !== "ALL" ? filters.action : undefined,
        actor_query: filters.actor_query.trim() ? filters.actor_query.trim() : undefined,
        start_date: filters.start_date ? `${filters.start_date}T00:00:00Z` : undefined,
        end_date: filters.end_date ? `${filters.end_date}T23:59:59Z` : undefined,
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
    fetchLogs(1, false);
  }, []);

  const handleApplyFilter = () => {
    fetchLogs(1, false);
  };

  const handleResetFilter = () => {
    setFilters({
      action: "ALL",
      actor_query: "",
      start_date: sevenDaysAgoStr,
      end_date: todayStr,
    });
    setDateError(null);
    setTimeout(() => {
      fetchLogs(1, false);
    }, 50);
  };

  const handleLoadMore = () => {
    if (!listData || !listData.has_more || loadingMore) return;
    fetchLogs(currentPage + 1, true);
  };

  // Màn 2: View Detail
  const handleViewDetail = async (item: AuditLogItem) => {
    try {
      setLoadingDetail(true);
      const detail = await auditApi.getAuditLogDetail(item.log_id);
      setActiveDetail(detail);
    } catch (err: any) {
      alert("Không thể tải chi tiết nhật ký. Vui lòng thử lại");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Màn 2: Filter by actor
  const handleFilterByActor = (actorQuery: string) => {
    setActiveDetail(null);
    setFilters((prev) => ({
      ...prev,
      actor_query: actorQuery,
    }));
    setTimeout(() => {
      fetchLogs(1, false);
    }, 50);
  };

  // Màn 4: Execute Export
  const handleConfirmExport = async () => {
    if (!listData) return;
    try {
      setIsExporting(true);
      setExportErrorMsg(null);
      const res = await auditApi.exportAuditLogs({
        format: exportFormat,
        action: filters.action !== "ALL" ? filters.action : undefined,
        actor_query: filters.actor_query.trim() ? filters.actor_query.trim() : undefined,
        start_date: filters.start_date ? `${filters.start_date}T00:00:00Z` : undefined,
        end_date: filters.end_date ? `${filters.end_date}T23:59:59Z` : undefined,
      });
      setExportSuccessMsg(res.message);
      setTimeout(() => {
        setExportModalOpen(false);
        setExportSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Không thể xuất nhật ký. Vui lòng thử lại";
      setExportErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="audit-page-container">
      {/* Header */}
      <div className="audit-header">
        <div className="audit-header-left">
          <h1>
            <span>📜</span> Nhật Ký Kiểm Toán An Ninh (Audit Log)
          </h1>
          <p>
            Giám sát bất biến các thao tác quan trọng trong hệ thống: đăng nhập, đổi quyền, sửa dữ liệu, cộng/trừ điểm
          </p>
        </div>
        {onBackToHome && (
          <button type="button" className="back-home-btn" onClick={onBackToHome}>
            <span>←</span> Quay lại Bản đồ
          </button>
        )}
      </div>

      <div className="audit-layout">
        {/* CỘT TRÁI: BỘ LỌC (Màn 1) */}
        <div className="filter-card">
          <div className="filter-card-title">
            <span>🔍</span> Bộ Lọc Nhật Ký
          </div>

          <div className="filter-group">
            <label>Loại hành động:</label>
            <select
              className="filter-select"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="LOGIN">Đăng nhập</option>
              <option value="UPDATE_ROLE">Đổi quyền</option>
              <option value="UPDATE_DATA">Sửa dữ liệu</option>
              <option value="REWARD_POINTS">Cộng/trừ điểm</option>
              <option value="EXPORT_AUDIT_LOG">Xuất nhật ký</option>
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

          <div className="filter-actions">
            <button
              type="button"
              className="btn-filter-apply"
              disabled={!!dateError || loading}
              onClick={handleApplyFilter}
            >
              {loading ? "Đang lọc..." : "Lọc"}
            </button>
            <button
              type="button"
              className="btn-filter-reset"
              onClick={handleResetFilter}
            >
              Đặt lại
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: BẢNG NHẬT KÝ / EMPTY STATE */}
        <div className="audit-content-card">
          <div className="audit-table-topbar">
            <div className="audit-count-badge">
              {listData ? `Hiển thị ${listData.items.length}/${listData.total} bản ghi` : "Đang tải dữ liệu..."}
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
                <span>📥</span> Xuất nhật ký
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <div>Đang tải dữ liệu…</div>
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
              <div className="empty-title">KHÔNG TÌM THẤY NHẬT KÝ</div>
              <div className="empty-subtext">Thử đổi bộ lọc để tìm lại các hoạt động an ninh khác</div>
              <button type="button" className="btn-filter-reset" onClick={handleResetFilter}>
                Xoá bộ lọc
              </button>
            </div>
          ) : listData ? (
            /* MÀN 1: BẢNG TRA CỨU */
            <>
              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Người thực hiện</th>
                      <th>Hành động</th>
                      <th>Đối tượng tác động</th>
                      <th>Địa chỉ IP</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listData.items.map((it) => {
                      const actionBadgeClass =
                        it.action === "LOGIN"
                          ? "badge-login"
                          : it.action === "UPDATE_ROLE"
                          ? "badge-role"
                          : it.action === "UPDATE_DATA"
                          ? "badge-data"
                          : it.action === "REWARD_POINTS"
                          ? "badge-points"
                          : it.action === "EXPORT_AUDIT_LOG"
                          ? "badge-export"
                          : "badge-other";

                      const dt = new Date(it.created_at);
                      const timeStr = dt.toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });

                      return (
                        <tr key={it.log_id}>
                          <td className="time-cell">{timeStr}</td>
                          <td>
                            <div className="actor-cell">
                              {it.actor_name}
                              {it.is_actor_deleted && <span className="deleted-tag">Đã xoá</span>}
                            </div>
                            {it.actor_email && <div className="actor-email-sub">{it.actor_email}</div>}
                          </td>
                          <td>
                            <span className={`action-badge ${actionBadgeClass}`}>
                              {it.action_display}
                            </span>
                          </td>
                          <td className="target-cell">
                            {it.table_name}
                            {it.record_id && ` / #${it.record_id.slice(0, 12)}`}
                          </td>
                          <td className="time-cell">{it.ip_address}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-row-detail"
                              onClick={() => handleViewDetail(it)}
                            >
                              Xem chi tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="load-more-section">
                {listData.has_more ? (
                  <button
                    type="button"
                    className="btn-load-more"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                  >
                    {loadingMore ? "Đang tải thêm…" : "Tải thêm 20 dòng"}
                  </button>
                ) : (
                  <div className="all-loaded-text">Đã hiển thị toàn bộ nhật ký</div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* LOADING DETAIL (Table 114) */}
      {loadingDetail && (
        <div className="modal-overlay">
          <div style={{ background: "#ffffff", padding: "24px 32px", borderRadius: "12px", color: "#64748b", fontWeight: 600 }}>
            Đang tải dữ liệu…
          </div>
        </div>
      )}

      {/* MÀN 2: MODAL XEM CHI TIẾT DÒNG NHẬT KÝ (3 KHỐI) */}
      {activeDetail && (
        <div className="modal-overlay">
          <div className="audit-detail-modal">
            <div className="modal-header">
              <h2>Chi Tiết Nhật Ký Kiểm Toán #{activeDetail.log_id}</h2>
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

              {/* KHỐI 2: THAY ĐỔI BEFORE / AFTER DIFF */}
              <div className="detail-block">
                <div className="detail-block-title">
                  <span>🔄</span> Thay Đổi Dữ Liệu
                </div>

                {!activeDetail.has_data_changes ? (
                  <div style={{ color: "#64748b", fontSize: "13px", padding: "16px 0", textAlign: "center" }}>
                    Không có thay đổi dữ liệu
                  </div>
                ) : (
                  <div className="diff-container">
                    {activeDetail.diff ? (
                      Object.entries(activeDetail.diff).map(([key, field]) => (
                        <div
                          key={key}
                          className={`diff-field-box ${field.is_changed ? "changed" : ""}`}
                        >
                          <div className="diff-key-name">
                            {field.is_changed ? "⚡ " : ""}{key}
                          </div>
                          <div className="diff-values-compare">
                            <div className="diff-val-old">
                              <strong>Cũ:</strong> {JSON.stringify(field.old) ?? "null"}
                            </div>
                            <div className="diff-val-new">
                              <strong>Mới:</strong> {JSON.stringify(field.new) ?? "null"}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: "12px", color: "#475569" }}>
                        <div><strong>Dữ liệu mới:</strong></div>
                        <pre style={{ background: "#ffffff", padding: "8px", borderRadius: "6px", overflowX: "auto" }}>
                          {JSON.stringify(activeDetail.new_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* KHỐI 3: TRUY VẾT & THIẾT BỊ */}
              <div className="detail-block">
                <div className="detail-block-title">
                  <span>🌐</span> Truy Vết & Thiết Bị
                </div>

                <div className="detail-row">
                  <div className="detail-label">Địa chỉ IP:</div>
                  <div className="detail-value" style={{ fontFamily: "monospace" }}>
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

                {activeDetail.actor_email && (
                  <button
                    type="button"
                    className="btn-trace-actor"
                    onClick={() => handleFilterByActor(activeDetail.actor_email!)}
                  >
                    Xem hoạt động của người này
                  </button>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveDetail(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÀN 4: POPUP XUẤT NHẬT KÝ */}
      {exportModalOpen && (
        <div className="modal-overlay">
          <div className="export-modal-card">
            <div className="popup-tag-small">POPUP</div>
            <div className="export-modal-title">
              <span>📥</span> XUẤT NHẬT KÝ
            </div>

            <div className="export-summary-box">
              <div><strong>Hành động:</strong> {filters.action === "ALL" ? "Tất cả" : filters.action}</div>
              {filters.actor_query && <div><strong>Người thực hiện:</strong> {filters.actor_query}</div>}
              <div><strong>Khoảng thời gian:</strong> {filters.start_date} đến {filters.end_date}</div>
              <div><strong>Tổng số dòng dự kiến:</strong> {listData?.total ?? 0} dòng</div>
            </div>

            {(listData?.total ?? 0) > 10000 && (
              <div className="export-warning-cap">
                ⚠️ Có {listData?.total} dòng, vượt giới hạn 10.000. Hãy thu hẹp bộ lọc!
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px", color: "#334155" }}>
                Định dạng xuất:
              </label>
              <select
                className="filter-select"
                value={exportFormat}
                disabled={isExporting}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="EXCEL">Microsoft Excel (.xlsx)</option>
                <option value="PDF">Tài liệu PDF (.pdf)</option>
                <option value="CSV">Tệp CSV (.csv)</option>
              </select>
            </div>

            {exportErrorMsg && <div className="validation-error-msg" style={{ marginBottom: "12px" }}>⚠️ {exportErrorMsg}</div>}
            {exportSuccessMsg && <div style={{ color: "#16a34a", fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>✓ {exportSuccessMsg}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={isExporting}
                onClick={() => setExportModalOpen(false)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="btn-primary-submit"
                disabled={isExporting || (listData?.total ?? 0) === 0 || (listData?.total ?? 0) > 10000}
                onClick={handleConfirmExport}
              >
                {isExporting ? "Đang xuất nhật ký…" : "Xuất"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
