import React, { useState } from 'react';
import type { QuickCategoryStat } from '../types/penalty.types';

interface PenaltySearchScreenProps {
  keyword: string;
  onKeywordChange: (val: string) => void;
  onSearch: (customKeyword?: string) => void;
  onSelectCategory: (catName: string) => void;
  categories: QuickCategoryStat[];
  isLoadingCategories: boolean;
  categoryError: string | null;
  onRetryCategories: () => void;
}

const SAMPLE_KEYWORDS = [
  'vứt tàn thuốc',
  'đổ rác vỉa hè',
  'karaoke loa kéo',
  'xả nước thải',
  'đốt rác công nghiệp',
];

export const PenaltySearchScreen: React.FC<PenaltySearchScreenProps> = ({
  keyword,
  onKeywordChange,
  onSearch,
  onSelectCategory,
  categories,
  isLoadingCategories,
  categoryError,
  onRetryCategories,
}) => {
  const [hasEmptyError, setHasEmptyError] = useState(false);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) {
      setHasEmptyError(true);
      return;
    }
    setHasEmptyError(false);
    onSearch();
  };

  const handleSampleClick = (sample: string) => {
    onKeywordChange(sample);
    setHasEmptyError(false);
    onSearch(sample);
  };

  return (
    <div className="pl-screen-one-grid" data-testid="penalty-screen-search">
      {/* KHỐI TÌM KIẾM (CỘT TRÁI) */}
      <div className="pl-search-panel">
        <h2 className="panel-heading">
          <span>🔍</span>
          <span>TÌM KIẾM QUY ĐỊNH</span>
        </h2>

        <form onSubmit={handleSearchSubmit} noValidate>
          <div className="search-input-group">
            <span className="search-icon-prefix" aria-hidden="true">🔎</span>
            <input
              type="text"
              className={`pl-search-input ${hasEmptyError ? 'error-border' : ''}`}
              placeholder="Nhập hành vi (VD: vứt tàn thuốc, đổ rác vỉa hè...)"
              value={keyword}
              onChange={(e) => {
                onKeywordChange(e.target.value);
                if (hasEmptyError && e.target.value.trim()) {
                  setHasEmptyError(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit();
                }
              }}
              aria-label="Từ khóa tìm kiếm hành vi vi phạm"
            />
          </div>

          {hasEmptyError && (
            <div className="error-prompt-msg" role="alert" data-testid="search-empty-error">
              <span>⚠️</span>
              <span>Vui lòng nhập từ khoá tìm kiếm</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-search-submit"
            aria-label="Nút Tìm kiếm"
          >
            <span>Tìm quy định</span>
            <span>➔</span>
          </button>
        </form>

        <div className="search-sample-tags">
          <div className="sample-label">Gợi ý từ khóa vi phạm phổ biến:</div>
          <div className="tag-cloud">
            {SAMPLE_KEYWORDS.map((sample) => (
              <button
                key={sample}
                type="button"
                className="sample-tag-btn"
                onClick={() => handleSampleClick(sample)}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KHỐI LĨNH VỰC MÔI TRƯỜNG (CỘT PHẢI) */}
      <div className="pl-category-panel">
        <div className="category-heading-box">
          <h2 className="category-title">
            <span>📚</span>
            <span>LĨNH VỰC MÔI TRƯỜNG</span>
          </h2>
          <span className="category-tip">Chọn chuyên đề pháp luật cần tra cứu</span>
        </div>

        {isLoadingCategories ? (
          <div className="pl-skeleton-loader" data-testid="categories-skeleton">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        ) : categoryError ? (
          <div className="pl-error-state-card" role="alert" data-testid="categories-error">
            <div className="error-icon">📡</div>
            <p className="error-msg">Không thể kết nối máy chủ. Vui lòng kiểm tra lại mạng</p>
            <button
              type="button"
              className="btn-retry"
              onClick={onRetryCategories}
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="category-cards-grid">
            {categories.map((cat) => (
              <div
                key={cat.category_name}
                className="quick-cat-card"
                onClick={() => onSelectCategory(cat.category_name)}
                role="button"
                tabIndex={0}
                aria-label={`Danh mục ${cat.category_name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectCategory(cat.category_name);
                  }
                }}
              >
                <div>
                  <div className="cat-card-header">
                    <div className="cat-icon-avatar">{cat.icon}</div>
                    <div>
                      <h3 className="cat-name">{cat.category_name}</h3>
                      <span className="cat-count-badge">{cat.count} điều khoản</span>
                    </div>
                  </div>
                  <p className="cat-desc">{cat.description}</p>
                </div>

                <div className="cat-card-footer">
                  <span className="cat-arrow">Tra cứu ngay →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
