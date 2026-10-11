import React, { useState } from "react";

interface Props {
  initialSearch: string;
  initialStatus: "ALL" | "ACTIVE" | "INACTIVE";
  onApply: (search: string, status: "ALL" | "ACTIVE" | "INACTIVE") => void;
  onReset: () => void;
  disabled?: boolean;
}

export const CategoryFilterPanel: React.FC<Props> = ({
  initialSearch,
  initialStatus,
  onApply,
  onReset,
  disabled = false,
}) => {
  const [search, setSearch] = useState<string>(initialSearch);
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">(initialStatus);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(search, status);
  };

  const handleReset = () => {
    setSearch("");
    setStatus("ALL");
    onReset();
  };

  return (
    <div className="category-col-panel filter-panel">
      <div className="panel-header">
        <h3 className="panel-title">BỘ LỌC</h3>
        <span className="panel-subtitle">Tìm kiếm & Phân loại</span>
      </div>

      <form onSubmit={handleSubmit} className="panel-body filter-form">
        {/* Ô TÌM KIẾM */}
        <div className="form-group">
          <label className="field-label" htmlFor="filter-search-input">
            Ô tìm kiếm:
          </label>
          <div className="input-search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              id="filter-search-input"
              type="text"
              className="custom-input search-input"
              placeholder="Nhập mã hoặc tên loại rác..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={disabled}
            />
            {search && (
              <button
                type="button"
                className="btn-clear-input"
                onClick={() => setSearch("")}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
          <span className="field-hint">Tìm theo mã (VD: DOMESTIC_WASTE) hoặc tên loại rác</span>
        </div>

        {/* BỘ LỌC TRẠNG THÁI */}
        <div className="form-group">
          <label className="field-label">Trạng thái:</label>
          <div className="status-radio-group">
            <label className={`radio-pill ${status === "ALL" ? "selected" : ""}`}>
              <input
                type="radio"
                name="filter-status"
                value="ALL"
                checked={status === "ALL"}
                onChange={() => setStatus("ALL")}
                disabled={disabled}
              />
              <span className="radio-dot" />
              <span>Tất cả</span>
            </label>

            <label className={`radio-pill ${status === "ACTIVE" ? "selected" : ""}`}>
              <input
                type="radio"
                name="filter-status"
                value="ACTIVE"
                checked={status === "ACTIVE"}
                onChange={() => setStatus("ACTIVE")}
                disabled={disabled}
              />
              <span className="radio-dot active-dot" />
              <span>Đang áp dụng</span>
            </label>

            <label className={`radio-pill ${status === "INACTIVE" ? "selected" : ""}`}>
              <input
                type="radio"
                name="filter-status"
                value="INACTIVE"
                checked={status === "INACTIVE"}
                onChange={() => setStatus("INACTIVE")}
                disabled={disabled}
              />
              <span className="radio-dot inactive-dot" />
              <span>Ngưng áp dụng</span>
            </label>
          </div>
        </div>

        {/* NÚT THAO TÁC LỌC */}
        <div className="filter-actions">
          <button
            type="submit"
            className="btn-panel-action btn-apply"
            disabled={disabled}
          >
            <span>Áp dụng</span>
          </button>

          {(search || status !== "ALL") && (
            <button
              type="button"
              className="btn-panel-action btn-reset"
              onClick={handleReset}
              disabled={disabled}
            >
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

