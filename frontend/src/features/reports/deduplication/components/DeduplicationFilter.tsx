import React from 'react';
import type { DistrictOption } from '../types/deduplication.types';

interface DeduplicationFilterProps {
  districts: DistrictOption[];
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  minSimilarity: number | null;
  onSimilarityChange: (similarity: number | null) => void;
  onResetFilter: () => void;
}

export const DeduplicationFilter: React.FC<DeduplicationFilterProps> = ({
  districts,
  selectedDistrict,
  onDistrictChange,
  minSimilarity,
  onSimilarityChange,
  onResetFilter,
}) => {
  const currentThreshold = minSimilarity ?? 0;

  return (
    <aside className="filter-panel" aria-label="Bộ lọc báo cáo trùng lặp">
      <div className="panel-header">
        <h2 className="panel-title">
          <span>🔍</span>
          <span>BỘ LỌC</span>
        </h2>
      </div>

      {/* Lọc theo Quận/Huyện */}
      <div className="filter-group">
        <label htmlFor="filter-district-select" className="filter-label">
          Quận / Huyện
        </label>
        <select
          id="filter-district-select"
          className="filter-select"
          value={selectedDistrict}
          onChange={(e) => onDistrictChange(e.target.value)}
        >
          {districts.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lọc theo Mức giống nhau (%) */}
      <div className="filter-group">
        <label htmlFor="filter-similarity-slider" className="filter-label">
          Mức giống nhau (%)
        </label>

        {/* Các mốc tùy chọn nhanh */}
        <div className="similarity-presets">
          <button
            type="button"
            className={`preset-chip ${minSimilarity === null || minSimilarity === 0 ? 'active' : ''}`}
            onClick={() => onSimilarityChange(null)}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`preset-chip ${minSimilarity === 70 ? 'active' : ''}`}
            onClick={() => onSimilarityChange(70)}
          >
            &gt; 70%
          </button>
          <button
            type="button"
            className={`preset-chip ${minSimilarity === 80 ? 'active' : ''}`}
            onClick={() => onSimilarityChange(80)}
          >
            &gt; 80%
          </button>
        </div>

        <div className="similarity-presets" style={{ marginTop: '8px' }}>
          <button
            type="button"
            className={`preset-chip ${minSimilarity === 85 ? 'active' : ''}`}
            onClick={() => onSimilarityChange(85)}
          >
            &gt; 85%
          </button>
          <button
            type="button"
            className={`preset-chip ${minSimilarity === 90 ? 'active' : ''}`}
            onClick={() => onSimilarityChange(90)}
          >
            &gt; 90%
          </button>
          <button
            type="button"
            className={`preset-chip ${minSimilarity === 95 ? 'active' : ''}`}
            onClick={() => onSimilarityChange(95)}
          >
            &gt; 95%
          </button>
        </div>

        {/* Thanh trượt điều chỉnh tỷ lệ tương đồng */}
        <div className="slider-wrapper">
          <input
            id="filter-similarity-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            className="range-slider"
            value={currentThreshold}
            onChange={(e) => onSimilarityChange(Number(e.target.value))}
            aria-label="Thanh trượt ngưỡng tương đồng"
          />
          <div className="slider-value-display">
            <span>Ngưỡng tối thiểu:</span>
            <span className="current-threshold">
              {currentThreshold > 0 ? `≥ ${currentThreshold}%` : 'Tất cả (≥ 0%)'}
            </span>
          </div>
        </div>
      </div>

      <div className="filter-actions">
        <button type="button" className="reset-btn" onClick={onResetFilter}>
          ↺ Đặt lại bộ lọc
        </button>
      </div>
    </aside>
  );
};
