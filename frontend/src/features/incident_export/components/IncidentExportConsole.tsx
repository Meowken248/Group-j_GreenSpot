import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  IconFilter,
  IconDownload,
  IconAlertCircle,
  IconFileSpreadsheet,
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
} from "./ExportIcons";
import type {
  ExportMetadataOptionsResponse,
  IncidentExportFilterParams,
  IncidentPreviewItem,
} from "../types/incident_export.types";

export interface ConsoleImperativeHandle {
  focusDistrict: () => void;
  focusDate: () => void;
}

interface IncidentExportConsoleProps {
  filterOptions: ExportMetadataOptionsResponse;
  filterParams: IncidentExportFilterParams;
  onFilterChange: (newParams: Partial<IncidentExportFilterParams>) => void;
  onApplyFilter: () => void;
  items: IncidentPreviewItem[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  isLoading: boolean;
  errorMessage: string | null;
  onOpenExportModal: () => void;
  onOpenEmptyModal: () => void;
}

export const IncidentExportConsole = forwardRef<
  ConsoleImperativeHandle,
  IncidentExportConsoleProps
>(({
  filterOptions,
  filterParams,
  onFilterChange,
  onApplyFilter,
  items,
  totalRecords,
  totalPages,
  currentPage,
  onPageChange,
  isLoading,
  errorMessage,
  onOpenExportModal,
  onOpenEmptyModal,
}, ref) => {
  const districtSelectRef = useRef<HTMLSelectElement>(null);
  const fromDateInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusDistrict: () => {
      districtSelectRef.current?.focus();
    },
    focusDate: () => {
      fromDateInputRef.current?.focus();
    },
  }));

  const handleQuickRangeClick = (rangeVal: string) => {
    if (filterParams.quick_range === rangeVal) {
      onFilterChange({ quick_range: undefined });
    } else {
      onFilterChange({ quick_range: rangeVal });
    }
  };

  const handleExportButtonClick = () => {
    if (totalRecords > 0) {
      onOpenExportModal();
    } else {
      onOpenEmptyModal();
    }
  };

  return (
    <div className="console-main-body" data-testid="incident-export-console">
      {/* Banner cảnh báo đỏ khi lỗi truy vấn cơ sở dữ liệu */}
      {errorMessage && (
        <div className="error-banner-alert" data-testid="error-banner-alert">
          <IconAlertCircle className="icon" size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tiêu đề & mô tả phân hệ */}
      <div className="console-heading-section">
        <div className="title-col">
          <h2>Quản lý & Trích xuất dữ liệu sự cố môi trường</h2>
          <p>
            Lọc linh hoạt các sự cố ô nhiễm/ngập úng đô thị theo nhiều tiêu chí, xem trước dữ liệu và xuất báo cáo Excel/PDF.
          </p>
        </div>
      </div>

      {/* 3 KHỐI LÀM VIỆC CHÍNH */}
      <div className="three-column-workspace">
        {/* =================================================================== */}
        {/* 1. KHỐI "BỘ LỌC" (CỘT TRÁI) */}
        {/* =================================================================== */}
        <div className="col-filter-card" data-testid="col-filter-card">
          <div className="block-title">
            <IconFilter size={18} color="#1E5E3A" />
            BỘ LỌC
          </div>

          <form
            className="filter-form"
            onSubmit={(e) => {
              e.preventDefault();
              onApplyFilter();
            }}
          >
            {/* Quận / Huyện */}
            <div className="form-group">
              <label htmlFor="filter-district">Quận / Huyện</label>
              <select
                id="filter-district"
                ref={districtSelectRef}
                value={filterParams.district}
                onChange={(e) => onFilterChange({ district: e.target.value })}
                data-testid="select-district"
              >
                {filterOptions.districts.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            {/* Loại sự cố */}
            <div className="form-group">
              <label htmlFor="filter-category">Loại sự cố</label>
              <select
                id="filter-category"
                value={filterParams.category}
                onChange={(e) => onFilterChange({ category: e.target.value })}
                data-testid="select-category"
              >
                {filterOptions.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Trạng thái */}
            <div className="form-group">
              <label htmlFor="filter-status">Trạng thái</label>
              <select
                id="filter-status"
                value={filterParams.status}
                onChange={(e) => onFilterChange({ status: e.target.value })}
                data-testid="select-status"
              >
                {filterOptions.statuses.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Khoảng ngày (Từ ngày - Đến ngày) */}
            <div className="form-group">
              <label>Khoảng thời gian (Ngày)</label>
              <div className="date-range-row">
                <input
                  type="date"
                  ref={fromDateInputRef}
                  value={filterParams.from_date || ""}
                  onChange={(e) =>
                    onFilterChange({ from_date: e.target.value, quick_range: undefined })
                  }
                  title="Từ ngày"
                  data-testid="input-from-date"
                />
                <input
                  type="date"
                  value={filterParams.to_date || ""}
                  onChange={(e) =>
                    onFilterChange({ to_date: e.target.value, quick_range: undefined })
                  }
                  title="Đến ngày"
                  data-testid="input-to-date"
                />
              </div>

              {/* Chọn nhanh ngày */}
              <div className="quick-range-chips">
                {filterOptions.quick_ranges.map((qr) => (
                  <button
                    key={qr.value}
                    type="button"
                    className={`chip-btn ${filterParams.quick_range === qr.value ? "active" : ""}`}
                    onClick={() => handleQuickRangeClick(qr.value)}
                    data-testid={`quick-range-${qr.value.toLowerCase()}`}
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nút "Áp dụng" màu lam */}
            <button
              type="submit"
              className="btn-apply-filter"
              disabled={isLoading}
              data-testid="btn-apply-filter"
            >
              <IconSearch size={16} />
              {isLoading ? "Đang truy vấn..." : "Áp dụng"}
            </button>
          </form>
        </div>

        {/* =================================================================== */}
        {/* 2. KHỐI "DANH SÁCH" (CỘT GIỮA) */}
        {/* =================================================================== */}
        <div className="col-list-card" data-testid="col-list-card">
          <div className="list-header-row">
            <h3 className="block-title">DANH SÁCH</h3>
            <div className="result-summary-message" data-testid="result-summary-message">
              {totalRecords > 0
                ? `Tìm thấy ${totalRecords} bản ghi sự cố phù hợp với bộ lọc.`
                : "Không có dữ liệu sự cố nào phù hợp để xuất báo cáo."}
            </div>
          </div>

          {/* Bảng dữ liệu xem trước */}
          <div className="preview-table-container">
            {items.length > 0 ? (
              <table className="preview-table" data-testid="preview-table">
                <thead>
                  <tr>
                    <th className="th-code">Mã</th>
                    <th className="th-cat">Loại</th>
                    <th className="th-dist">Quận</th>
                    <th className="th-status">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.incident_id} data-testid={`row-${item.tracking_code}`}>
                      <td className="td-code" title={item.title}>
                        {item.tracking_code}
                      </td>
                      <td title={item.category_name}>{item.category_name}</td>
                      <td title={item.address_text}>{item.district_name}</td>
                      <td className="td-status">
                        <span
                          className={`status-badge status-${(item.status_code || "pending").toLowerCase()}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-table-state" data-testid="empty-table-state">
                <div className="empty-icon">📂</div>
                <p>Không có bản ghi sự cố nào phù hợp với điều kiện lọc hiện tại.</p>
              </div>
            )}
          </div>

          {/* Phân trang chân bảng */}
          {totalPages > 1 && (
            <div className="pagination-footer" data-testid="pagination-footer">
              <span>
                Trang {currentPage} / {totalPages} (Tổng {totalRecords} sự cố)
              </span>
              <div className="page-buttons">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
                  data-testid="btn-prev-page"
                >
                  <IconChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoading}
                  data-testid="btn-next-page"
                >
                  <IconChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 3. KHỐI "THAO TÁC" (CỘT PHẢI) */}
        {/* =================================================================== */}
        <div className="col-action-card" data-testid="col-action-card">
          <div className="block-title">THAO TÁC</div>

          <div className="action-body">
            <div className="action-info-box">
              <div className="info-title">
                <IconFileSpreadsheet size={16} color="#1E5E3A" />
                Trích xuất báo cáo
              </div>
              <div>
                Hệ thống hỗ trợ kết xuất danh sách dữ liệu ra định dạng bảng tính <strong>Excel (.xlsx)</strong> hoặc tài liệu in ấn hành chính <strong>PDF (.pdf)</strong> theo đúng tiêu chuẩn.
              </div>
            </div>

            {/* Nút "Xuất danh sách" (Primary Action) */}
            <button
              type="button"
              className="btn-export-primary"
              onClick={handleExportButtonClick}
              data-testid="btn-export-trigger"
            >
              <IconDownload size={20} />
              Xuất danh sách
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

IncidentExportConsole.displayName = "IncidentExportConsole";
