import React, { useState, useEffect } from "react";
import type { DistrictItem } from "../types/recyclingFacility.types";
import { CustomSelectDropdown } from "./CustomSelectDropdown";

interface FacilityFilterPanelProps {
  initialSearch?: string;
  initialStatus?: "ALL" | "ACTIVE" | "INACTIVE";
  initialUnitId?: number;
  districts: DistrictItem[];
  onApply: (search: string, status: "ALL" | "ACTIVE" | "INACTIVE", unitId?: number) => void;
  onReset: () => void;
  disabled?: boolean;
}

export const FacilityFilterPanel: React.FC<FacilityFilterPanelProps> = ({
  initialSearch = "",
  initialStatus = "ALL",
  initialUnitId,
  districts,
  onApply,
  onReset,
  disabled = false,
}) => {
  const [search, setSearch] = useState<string>(initialSearch);
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">(initialStatus);
  const [selectedUnitId, setSelectedUnitId] = useState<number | undefined>(initialUnitId);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setSelectedUnitId(initialUnitId);
  }, [initialUnitId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(search.trim(), status, selectedUnitId);
  };

  const handleReset = () => {
    setSearch("");
    setStatus("ALL");
    setSelectedUnitId(undefined);
    onReset();
  };

  return (
    <div className="facility-col-panel filter-panel">
      <div className="panel-header">
        <h3 className="panel-title">BỘ LỌC</h3>
        <span className="panel-subtitle">Tra cứu mạng lưới trạm</span>
      </div>

      <div className="panel-body">
        <form className="filter-form" onSubmit={handleSubmit}>
          {/* TÌM KIẾM THEO MÃ HOẶC TÊN TRẠM */}
          <div className="form-group">
            <label className="field-label" htmlFor="filter-search-facility">
              Tìm kiếm trạm:
            </label>
            <div className="input-search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                id="filter-search-facility"
                type="text"
                className="custom-input search-input"
                placeholder="Nhập mã trạm hoặc tên trạm…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={disabled}
              />
              {search && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearch("")}
                  title="Xoá từ khoá tìm kiếm"
                  disabled={disabled}
                >
                  ✕
                </button>
              )}
            </div>
            <span className="field-hint">Hỗ trợ tìm kiếm theo mã (REC-...) hoặc tên trạm.</span>
          </div>

          {/* TRẠNG THÁI HOẠT ĐỘNG (RADIO) */}
          <div className="form-group">
            <label className="field-label">Trạng thái trạm:</label>
            <div className="radio-group-vertical">
              <label className={`radio-label ${status === "ALL" ? "checked" : ""}`}>
                <input
                  type="radio"
                  name="status_filter"
                  value="ALL"
                  checked={status === "ALL"}
                  onChange={() => setStatus("ALL")}
                  disabled={disabled}
                />
                <span className="radio-indicator" />
                <span className="radio-text">Tất cả</span>
              </label>

              <label className={`radio-label ${status === "ACTIVE" ? "checked" : ""}`}>
                <input
                  type="radio"
                  name="status_filter"
                  value="ACTIVE"
                  checked={status === "ACTIVE"}
                  onChange={() => setStatus("ACTIVE")}
                  disabled={disabled}
                />
                <span className="radio-indicator" />
                <span className="radio-text">
                  <span className="status-dot dot-active" />
                  Đang hoạt động
                </span>
              </label>

              <label className={`radio-label ${status === "INACTIVE" ? "checked" : ""}`}>
                <input
                  type="radio"
                  name="status_filter"
                  value="INACTIVE"
                  checked={status === "INACTIVE"}
                  onChange={() => setStatus("INACTIVE")}
                  disabled={disabled}
                />
                <span className="radio-indicator" />
                <span className="radio-text">
                  <span className="status-dot dot-inactive" />
                  Ngưng hoạt động
                </span>
              </label>
            </div>
          </div>

          {/* CHỌN QUẬN / HUYỆN */}
          <div className="form-group">
            <label className="field-label" htmlFor="filter-district-select">
              Khu vực Quận/Huyện:
            </label>
            <CustomSelectDropdown
              id="filter-district-select"
              value={selectedUnitId}
              options={districts.map((d) => ({
                value: d.unit_id,
                label: d.unit_name || d.name || `Khu vực ${d.unit_id}`,
              }))}
              placeholder="-- Tất cả 22 quận/huyện --"
              hasSearch={true}
              disabled={disabled}
              onChange={(val) => {
                setSelectedUnitId(val ? (typeof val === "number" ? val : parseInt(String(val), 10)) : undefined);
              }}
            />
            <span className="field-hint">Phân loại trạm theo địa bàn hành chính TP.HCM.</span>
          </div>

          {/* NÚT THAO TÁC LỌC */}
          <div className="filter-button-group">
            <button
              type="submit"
              className="btn-apply-filter"
              disabled={disabled}
            >
              Áp dụng
            </button>
            <button
              type="button"
              className="btn-reset-filter"
              onClick={handleReset}
              disabled={disabled}
            >
              Đặt lại
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

