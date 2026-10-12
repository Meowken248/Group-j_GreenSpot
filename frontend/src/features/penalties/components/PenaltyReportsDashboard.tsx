import React, { useState, useEffect, useCallback } from 'react';
import type {
  PenaltyReportItem,
  PenaltyReportStatsResponse,
  PenaltyReportStatus,
} from '../types/penalty.types';
import { penaltyService } from '../services/penaltyService';
import '../styles/PenaltyLookup.scss';

interface PenaltyReportsDashboardProps {
  currentUser?: any;
  onBackToPenalties?: () => void;
}

export const PenaltyReportsDashboard: React.FC<PenaltyReportsDashboardProps> = ({
  currentUser,
  onBackToPenalties,
}) => {
  // Bộ lọc danh sách
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [anonFilter, setAnonFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);

  // Dữ liệu
  const [reports, setReports] = useState<PenaltyReportItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState<PenaltyReportStatsResponse>({
    total: 0,
    pending: 0,
    verified: 0,
    resolved: 0,
    rejected: 0,
  });

  // Trạng thái loading / error
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal xem chi tiết & cập nhật
  const [selectedReport, setSelectedReport] = useState<PenaltyReportItem | null>(null);
  const [newStatus, setNewStatus] = useState<PenaltyReportStatus>('PENDING');
  const [officerNote, setOfficerNote] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);

  // 1. Tải dữ liệu phản ánh & thống kê
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const isAnonParam = anonFilter === 'ANON' ? true : anonFilter === 'ACCOUNT' ? false : undefined;
      const [listRes, statsRes] = await Promise.all([
        penaltyService.getPenaltyReports({
          status: statusFilter,
          query: searchQuery,
          is_anonymous: isAnonParam,
          page,
          limit: 10,
        }),
        penaltyService.getPenaltyReportStats().catch(() => ({
          total: 0,
          pending: 0,
          verified: 0,
          resolved: 0,
          rejected: 0,
        })),
      ]);

      setReports(listRes.items || []);
      setTotal(listRes.total || 0);
      setTotalPages(listRes.total_pages || 1);
      setStats(statsRes);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail?.message || 'Không thể tải danh sách phản ánh vi phạm.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, anonFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Mở modal chi tiết
  const handleOpenDetailModal = (item: PenaltyReportItem) => {
    setSelectedReport(item);
    setNewStatus(item.status);
    setOfficerNote(item.officer_note || '');
    setUpdateSuccessMsg(null);
  };

  const handleCloseDetailModal = () => {
    setSelectedReport(null);
    setUpdateSuccessMsg(null);
  };

  // 3. Xử lý cập nhật trạng thái phản ánh
  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setIsUpdating(true);
    try {
      const updated = await penaltyService.updatePenaltyReportStatus(selectedReport.id, {
        status: newStatus,
        officer_note: officerNote.trim() || undefined,
      });

      setSelectedReport(updated);
      setUpdateSuccessMsg('Cập nhật trạng thái hồ sơ thành công!');

      // Cập nhật lại danh sách tại chỗ
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

      // Làm mới thống kê
      penaltyService.getPenaltyReportStats().then(setStats).catch(() => {});
    } catch (err: any) {
      alert(err?.response?.data?.detail?.message || 'Cập nhật trạng thái thất bại.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const getStatusBadge = (status: PenaltyReportStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="status-badge badge-pending">⏳ Chờ xác minh</span>;
      case 'VERIFIED':
        return <span className="status-badge badge-verified">🔍 Đã xác minh</span>;
      case 'RESOLVED':
        return <span className="status-badge badge-resolved">✅ Đã xử lý / Xử phạt</span>;
      case 'REJECTED':
        return <span className="status-badge badge-rejected">❌ Từ chối</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="penalty-lookup-wrapper penalty-reports-dashboard" data-testid="penalty-reports-dashboard">
      <div className="pl-container">
        {/* HEADER BAR & BREADCRUMB */}
        <header className="pl-header-bar" role="banner">
          <nav className="pl-breadcrumb" aria-label="Điều hướng phân cấp">
            <span
              className="crumb-link"
              onClick={onBackToPenalties}
              role="button"
              tabIndex={0}
            >
              Hệ thống pháp luật môi trường
            </span>
            <span>/</span>
            <span className="current">Quản lý phản ánh vi phạm</span>
          </nav>

          <div className="pl-header-title-box">
            <h1 className="pl-main-title">
              <span className="title-icon">📢</span>
              <span>Giám Sát & Xử Lý Phản Ánh Vi Phạm Môi Trường</span>
            </h1>
            <div className="pl-decree-badge">
              <span>Căn cứ: Nghị định 45/2022/NĐ-CP</span>
            </div>
          </div>

          <p className="pl-sub-desc">
            Phân hệ dành cho Cán bộ địa bàn & Quản trị viên tiếp nhận, thẩm tra hiện trường và cập nhật quyết định xử phạt hành chính đối với các hành vi vi phạm môi trường đô thị.
          </p>
        </header>

        {/* THỐNG KÊ NHANH (KPI BENTO CARDS) */}
        <section className="reports-kpi-grid" aria-label="Thống kê phản ánh">
          <div
            className={`kpi-card ${statusFilter === 'ALL' ? 'active-kpi' : ''}`}
            onClick={() => { setStatusFilter('ALL'); setPage(1); }}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-icon">📑</div>
            <div className="kpi-content">
              <span className="kpi-value">{stats.total}</span>
              <span className="kpi-label">Tổng phản ánh</span>
            </div>
          </div>

          <div
            className={`kpi-card kpi-pending ${statusFilter === 'PENDING' ? 'active-kpi' : ''}`}
            onClick={() => { setStatusFilter('PENDING'); setPage(1); }}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-icon">⏳</div>
            <div className="kpi-content">
              <span className="kpi-value">{stats.pending}</span>
              <span className="kpi-label">Chờ xác minh</span>
            </div>
          </div>

          <div
            className={`kpi-card kpi-verified ${statusFilter === 'VERIFIED' ? 'active-kpi' : ''}`}
            onClick={() => { setStatusFilter('VERIFIED'); setPage(1); }}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-icon">🔍</div>
            <div className="kpi-content">
              <span className="kpi-value">{stats.verified}</span>
              <span className="kpi-label">Đã xác minh</span>
            </div>
          </div>

          <div
            className={`kpi-card kpi-resolved ${statusFilter === 'RESOLVED' ? 'active-kpi' : ''}`}
            onClick={() => { setStatusFilter('RESOLVED'); setPage(1); }}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-icon">✅</div>
            <div className="kpi-content">
              <span className="kpi-value">{stats.resolved}</span>
              <span className="kpi-label">Đã xử phạt / xong</span>
            </div>
          </div>

          <div
            className={`kpi-card kpi-rejected ${statusFilter === 'REJECTED' ? 'active-kpi' : ''}`}
            onClick={() => { setStatusFilter('REJECTED'); setPage(1); }}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-icon">❌</div>
            <div className="kpi-content">
              <span className="kpi-value">{stats.rejected}</span>
              <span className="kpi-label">Từ chối</span>
            </div>
          </div>
        </section>

        {/* THANH TÌM KIẾM & BỘ LỌC */}
        <section className="reports-toolbar-card" aria-label="Bộ lọc và tìm kiếm">
          <div className="toolbar-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Tìm theo mã INC-, hành vi vi phạm, địa chỉ, người gửi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              data-testid="reports-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="toolbar-filters-group">
            {/* LỌC TRẠNG THÁI */}
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Lọc theo trạng thái"
              data-testid="status-filter-select"
            >
              <option value="ALL">Mọi trạng thái ({stats.total})</option>
              <option value="PENDING">Chờ xác minh ({stats.pending})</option>
              <option value="VERIFIED">Đã xác minh ({stats.verified})</option>
              <option value="RESOLVED">Đã xử phạt ({stats.resolved})</option>
              <option value="REJECTED">Từ chối ({stats.rejected})</option>
            </select>

            {/* LỌC DANH TÍNH */}
            <select
              className="filter-select"
              value={anonFilter}
              onChange={(e) => {
                setAnonFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Lọc theo danh tính"
              data-testid="anon-filter-select"
            >
              <option value="ALL">Tất cả hình thức</option>
              <option value="ACCOUNT">👤 Bằng tài khoản</option>
              <option value="ANON">🕵️ Ẩn danh</option>
            </select>

            <button
              type="button"
              className="btn-refresh-data"
              onClick={fetchData}
              title="Làm mới dữ liệu"
            >
              🔄 Làm mới
            </button>
          </div>
        </section>

        {/* NỘI DUNG DANH SÁCH BÁO CÁO */}
        <main className="reports-table-container">
          {isLoading ? (
            <div className="reports-loading-box" data-testid="reports-loading">
              <div className="pl-spinner" />
              <p>Đang tải danh sách hồ sơ phản ánh vi phạm...</p>
            </div>
          ) : errorMessage ? (
            <div className="pl-error-state-card" role="alert" data-testid="reports-error">
              <div className="error-icon">📡</div>
              <p className="error-msg">{errorMessage}</p>
              <button type="button" className="btn-retry" onClick={fetchData}>
                Thử lại
              </button>
            </div>
          ) : reports.length === 0 ? (
            <div className="reports-empty-box" data-testid="reports-empty">
              <div className="empty-icon">📭</div>
              <h3>Không tìm thấy phản ánh nào phù hợp</h3>
              <p>Thử điều chỉnh từ khóa tìm kiếm hoặc chọn lọc trạng thái khác.</p>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="reports-data-table" data-testid="reports-table">
                <thead>
                  <tr>
                    <th>Mã hồ sơ</th>
                    <th>Hành vi vi phạm & Căn cứ</th>
                    <th>Địa điểm vi phạm</th>
                    <th>Người gửi</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th className="th-action">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((item) => (
                    <tr key={item.id} className="report-row" data-testid={`report-row-${item.id}`}>
                      <td className="col-code">
                        <strong className="code-text">{item.tracking_code}</strong>
                      </td>
                      <td className="col-violation">
                        <div className="violation-title">{item.violation_title}</div>
                        <div className="legal-basis-sub">{item.legal_basis}</div>
                        <div className="fine-badge">{item.fine_range}</div>
                      </td>
                      <td className="col-address">
                        <span title={item.address_text}>{item.address_text}</span>
                      </td>
                      <td className="col-reporter">
                        {item.is_anonymous ? (
                          <span className="reporter-tag anon">🕵️ Ẩn danh</span>
                        ) : (
                          <span className="reporter-tag account">👤 {item.reporter_name || 'Tài khoản'}</span>
                        )}
                      </td>
                      <td className="col-date">
                        <span>{formatDate(item.created_at)}</span>
                      </td>
                      <td className="col-status">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="col-action">
                        <button
                          type="button"
                          className="btn-view-report-detail"
                          onClick={() => handleOpenDetailModal(item)}
                          data-testid={`btn-view-${item.id}`}
                        >
                          👁️ Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* PHÂN TRANG */}
              {totalPages > 1 && (
                <div className="reports-pagination-bar" data-testid="reports-pagination">
                  <button
                    type="button"
                    className="btn-page-nav"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ◀ Trang trước
                  </button>
                  <span className="page-indicator">
                    Trang <strong>{page}</strong> / {totalPages} (Tổng {total} hồ sơ)
                  </span>
                  <button
                    type="button"
                    className="btn-page-nav"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Trang sau ▶
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* MODAL CHI TIẾT & CẬP NHẬT TRẠNG THÁI */}
        {selectedReport && (
          <div className="pl-modal-overlay" role="dialog" aria-modal="true">
            <div className="pl-modal-card report-officer-modal-card" data-testid="report-officer-modal">
              <div className="report-modal-header">
                <div className="header-title-box">
                  <span className="header-icon">📑</span>
                  <div>
                    <h3 className="modal-title">Hồ sơ phản ánh #{selectedReport.tracking_code}</h3>
                    <p className="modal-subtitle">Ghi nhận lúc: {formatDate(selectedReport.created_at)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close-x"
                  onClick={handleCloseDetailModal}
                  aria-label="Đóng cửa sổ"
                >
                  ✕
                </button>
              </div>

              {/* THÔNG TIN CHI TIẾT VI PHẠM */}
              <div className="report-detail-body">
                <div className="detail-meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">Hành vi vi phạm:</span>
                    <strong className="meta-val highlight">{selectedReport.violation_title}</strong>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Căn cứ pháp lý:</span>
                    <span className="meta-val">{selectedReport.legal_basis}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Khung tiền phạt:</span>
                    <span className="meta-val fine-highlight">{selectedReport.fine_range}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Người phản ánh:</span>
                    <span className="meta-val">
                      {selectedReport.is_anonymous ? '🕵️ Ẩn danh (Bảo mật)' : `👤 ${selectedReport.reporter_name || 'Tài khoản công dân'}`}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-label">📍 Địa điểm xảy ra vi phạm:</div>
                  <div className="section-content address-content">{selectedReport.address_text}</div>
                </div>

                <div className="detail-section">
                  <div className="section-label">📝 Diễn biến / Tình tiết phản ánh:</div>
                  <div className="section-content desc-content">{selectedReport.description}</div>
                </div>

                {/* FORM CÁN BỘ XỬ LÝ */}
                <form onSubmit={handleSaveStatus} className="officer-action-form">
                  <h4 className="form-heading">⚖️ Quyết định xử lý của Cán bộ tiếp nhận:</h4>

                  <div className="form-row">
                    <label htmlFor="select-new-status" className="field-group-label">
                      Trạng thái giải quyết:
                    </label>
                    <select
                      id="select-new-status"
                      className="form-control-input"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as PenaltyReportStatus)}
                      data-testid="officer-status-select"
                    >
                      <option value="PENDING">⏳ Chờ xác minh hiện trường</option>
                      <option value="VERIFIED">🔍 Đã xác minh đúng vi phạm</option>
                      <option value="RESOLVED">✅ Đã lập biên bản / Xử phạt hành chính</option>
                      <option value="REJECTED">❌ Từ chối / Không đủ căn cứ</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label htmlFor="officer-note-input" className="field-group-label">
                      Ghi chú / Số hiệu biên bản xử lý:
                    </label>
                    <textarea
                      id="officer-note-input"
                      className="form-control-textarea"
                      rows={3}
                      placeholder="VD: Đã cử tổ trật tự xuống kiểm tra ngày 12/10, lập biên bản số 45/BB-VPHC và ra quyết định xử phạt 1.500.000đ..."
                      value={officerNote}
                      onChange={(e) => setOfficerNote(e.target.value)}
                      data-testid="officer-note-textarea"
                    />
                  </div>

                  {updateSuccessMsg && (
                    <div className="officer-success-alert" role="alert" data-testid="officer-success-alert">
                      <span>✅</span>
                      <span>{updateSuccessMsg}</span>
                    </div>
                  )}

                  <div className="report-form-footer">
                    <button
                      type="button"
                      className="btn-cancel-report"
                      onClick={handleCloseDetailModal}
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      className="btn-submit-report-action"
                      disabled={isUpdating}
                      data-testid="btn-save-officer-status"
                    >
                      {isUpdating ? 'Đang lưu...' : '💾 Lưu kết quả xử lý'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PenaltyReportsDashboard;
