import React from "react";

interface FacilityActionPanelProps {
  total: number;
  activeCount: number;
  inactiveCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddNew: () => void;
  disabled?: boolean;
}

export const FacilityActionPanel: React.FC<FacilityActionPanelProps> = ({
  total,
  activeCount,
  inactiveCount,
  currentPage,
  totalPages,
  onPageChange,
  onAddNew,
  disabled = false,
}) => {
  // Tạo danh sách các số trang cần hiển thị
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="facility-col-panel action-panel">
      <div className="panel-header">
        <h3 className="panel-title">THAO TÁC & THỐNG KÊ</h3>
        <span className="panel-subtitle">Hành động và điều hướng dữ liệu</span>
      </div>

      <div className="panel-body action-body">
        {/* NÚT THÊM TRẠM MỚI */}
        <div className="create-section">
          <button
            type="button"
            className="btn-create-facility"
            onClick={onAddNew}
            disabled={disabled}
          >
            <span className="create-icon">➕</span>
            <span className="create-text">Thêm trạm mới</span>
          </button>
        </div>

        {/* THẺ THỐNG KÊ NHANH MẠNG LƯỚI */}
        <div className="stats-card-group">
          <h4 className="stats-heading">Tổng quan mạng lưới:</h4>

          <div className="stat-row">
            <span className="stat-label">Tổng số trạm:</span>
            <span className="stat-value total-val">{total}</span>
          </div>

          <div className="stat-row">
            <span className="stat-label">
              <span className="stat-indicator active-dot" />
              Đang hoạt động:
            </span>
            <span className="stat-value active-val">{activeCount}</span>
          </div>

          <div className="stat-row">
            <span className="stat-label">
              <span className="stat-indicator inactive-dot" />
              Ngưng hoạt động:
            </span>
            <span className="stat-value inactive-val">{inactiveCount}</span>
          </div>
        </div>

        {/* ĐIỀU HƯỚNG PHÂN TRANG */}
        <div className="pagination-card">
          <h4 className="pagination-heading">Phân trang dữ liệu:</h4>
          <div className="pagination-info">
            Trang <strong>{currentPage}</strong> / {totalPages || 1} (Tổng {total} trạm)
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="btn-page-nav"
              disabled={currentPage <= 1 || disabled}
              onClick={() => onPageChange(currentPage - 1)}
              title="Trang trước"
            >
              ◀
            </button>

            {getPageNumbers().map((p) => (
              <button
                key={p}
                type="button"
                className={`btn-page-num ${p === currentPage ? "current" : ""}`}
                disabled={disabled}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              className="btn-page-nav"
              disabled={currentPage >= totalPages || disabled}
              onClick={() => onPageChange(currentPage + 1)}
              title="Trang tiếp theo"
            >
              ▶
            </button>
          </div>
        </div>

        {/* GHI CHÚ VẬN HÀNH DOANH NGHIỆP */}
        <div className="operational-note-card">
          <div className="note-title">
            <span>🌐</span> Đồng bộ không gian WebGIS
          </div>
          <p className="note-content">
            Các trạm ở trạng thái <strong>Đang hoạt động</strong> được hiển thị trực tiếp lên bản đồ WebGIS TP.HCM và sẵn sàng tiếp nhận người dân quét mã QR để tích điểm xanh.
          </p>
        </div>
      </div>
    </div>
  );
};

