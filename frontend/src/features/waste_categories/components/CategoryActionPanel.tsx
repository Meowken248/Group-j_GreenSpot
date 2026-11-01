import React from "react";

interface Props {
  total: number;
  activeCount: number;
  inactiveCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddNew: () => void;
  disabled?: boolean;
}

export const CategoryActionPanel: React.FC<Props> = ({
  total,
  activeCount,
  inactiveCount,
  currentPage,
  totalPages,
  onPageChange,
  onAddNew,
  disabled = false,
}) => {
  return (
    <div className="category-col-panel action-panel">
      <div className="panel-header">
        <h3 className="panel-title">THAO TÁC</h3>
        <span className="panel-subtitle">Hành động & Phân trang</span>
      </div>

      <div className="panel-body action-body">
        {/* NÚT THÊM MỚI (Mở Màn 2) */}
        <div className="main-create-section">
          <button
            type="button"
            className="btn-create-category"
            onClick={onAddNew}
            disabled={disabled}
            title="Thêm mới danh mục rác thải đô thị"
          >
            <span className="plus-icon">+</span>
            <span className="btn-text">Thêm mới</span>
          </button>
        </div>

        {/* KHỐI THỐNG KÊ NHANH */}
        <div className="stats-metric-card">
          <div className="metric-header">
            <span className="metric-title">Thống kê danh mục</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Tổng cộng:</span>
            <span className="metric-number total-num">{total}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Đang áp dụng:</span>
            <span className="metric-number active-num">{activeCount}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Ngưng áp dụng:</span>
            <span className="metric-number inactive-num">{inactiveCount}</span>
          </div>
        </div>

        {/* PHÂN TRANG (PAGINATION) */}
        <div className="pagination-wrapper">
          <div className="pagination-info">
            <span>Trang <strong>{currentPage}</strong> / {totalPages || 1}</span>
            <span className="page-summary">({total} danh mục)</span>
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="btn-page-nav"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={disabled || currentPage <= 1}
              title="Trang trước"
            >
              ‹
            </button>

            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1)
              .filter((p) => {
                // Hiển thị tối đa 5 trang xung quanh trang hiện tại
                return (
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1
                );
              })
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <React.Fragment key={p}>
                    {prev && p - prev > 1 && <span className="page-ellipsis">…</span>}
                    <button
                      type="button"
                      className={`btn-page-number ${p === currentPage ? "active" : ""}`}
                      onClick={() => onPageChange(p)}
                      disabled={disabled}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              className="btn-page-nav"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={disabled || currentPage >= totalPages}
              title="Trang sau"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

