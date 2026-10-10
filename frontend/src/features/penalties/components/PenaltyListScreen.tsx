import React from 'react';
import type {
  PenaltySummaryItem,
  TargetType,
} from '../types/penalty.types';

interface PenaltyListScreenProps {
  keyword: string;
  domain: string;
  quickCategory: string | null;
  target: TargetType;
  onTargetChange: (newTarget: TargetType) => void;
  onDomainChange: (newDomain: string) => void;
  availableDomains: string[];
  domainCounts?: Record<string, number>;
  items: PenaltySummaryItem[];
  total: number;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onViewDetail: (id: string) => void;
  onBackToSearch: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
};

export const PenaltyListScreen: React.FC<PenaltyListScreenProps> = ({
  keyword,
  domain,
  quickCategory,
  target,
  onTargetChange,
  onDomainChange,
  availableDomains,
  domainCounts,
  items,
  total,
  isLoading,
  errorMessage,
  onRetry,
  onViewDetail,
  onBackToSearch,
  hasMore,
  onLoadMore,
}) => {
  const totalAllCount = domainCounts
    ? Object.values(domainCounts).reduce((acc, curr) => acc + curr, 0)
    : 0;
  return (
    <div className="pl-screen-two-grid" data-testid="penalty-screen-list">
      {/* KHỐI BỘ LỌC (CỘT TRÁI) */}
      <aside className="pl-filter-panel" aria-label="Bộ lọc tra cứu">
        <h2 className="filter-panel-title">
          <span>⚙️</span>
          <span>BỘ LỌC QUY ĐỊNH</span>
        </h2>

        {/* 1. Lọc Đối tượng áp dụng (Cá nhân vs Tổ chức x2) */}
        <div className="filter-section">
          <span className="filter-section-label">Đối tượng vi phạm:</span>
          <div className="target-radio-group" role="radiogroup" aria-label="Đối tượng áp dụng">
            <div
              className={`target-radio-card ${target === 'INDIVIDUAL' ? 'active' : ''}`}
              onClick={() => onTargetChange('INDIVIDUAL')}
              role="radio"
              aria-checked={target === 'INDIVIDUAL'}
              tabIndex={0}
            >
              <div className="target-radio-circle" />
              <div className="target-info">
                <span className="target-name">Cá nhân</span>
                <span className="target-rule-note">Khung mức phạt tiêu chuẩn</span>
              </div>
            </div>

            <div
              className={`target-radio-card ${target === 'ORGANIZATION' ? 'active' : ''}`}
              onClick={() => onTargetChange('ORGANIZATION')}
              role="radio"
              aria-checked={target === 'ORGANIZATION'}
              tabIndex={0}
            >
              <div className="target-radio-circle" />
              <div className="target-info">
                <span className="target-name">Tổ chức</span>
                <span className="target-rule-note">Mức phạt gấp đôi (x2) theo luật</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Lọc Lĩnh vực chuyên đề */}
        <div className="filter-section">
          <span className="filter-section-label">Lĩnh vực chuyên đề:</span>
          <div className="domain-select-group">
            <button
              type="button"
              className={`domain-chip ${domain === 'ALL' ? 'active' : ''}`}
              onClick={() => onDomainChange('ALL')}
            >
              <span>Tất cả lĩnh vực</span>
              {totalAllCount > 0 && (
                <span className="domain-count-badge">{totalAllCount}</span>
              )}
            </button>
            {availableDomains.map((dom) => (
              <button
                key={dom}
                type="button"
                className={`domain-chip ${domain === dom ? 'active' : ''}`}
                onClick={() => onDomainChange(dom)}
              >
                <span>{dom}</span>
                {domainCounts && domainCounts[dom] !== undefined && (
                  <span className="domain-count-badge">{domainCounts[dom]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn-reset-filters"
          onClick={onBackToSearch}
        >
          ← Quay lại trang tìm kiếm
        </button>
      </aside>

      {/* KHỐI KẾT QUẢ (CỘT PHẢI) */}
      <section className="pl-results-panel" aria-label="Danh sách kết quả tra cứu">
        <div className="results-header-box">
          <div className="results-count-text">
            <span>Kết quả: </span>
            <span className="highlight-count">{total} quy định</span>
            {keyword && <span> cho từ khóa &quot;{keyword}&quot;</span>}
            {quickCategory && <span> thuộc nhóm &quot;{quickCategory}&quot;</span>}
          </div>

          <div className="current-target-indicator">
            <span>Áp dụng: {target === 'INDIVIDUAL' ? 'Cá nhân' : 'Tổ chức (x2)'}</span>
          </div>
        </div>

        {/* Trạng thái Loading */}
        {isLoading && items.length === 0 ? (
          <div className="pl-skeleton-loader" data-testid="results-skeleton">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <p style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              Đang tìm kiếm quy định…
            </p>
          </div>
        ) : errorMessage ? (
          /* Trạng thái Lỗi CSDL */
          <div className="pl-error-state-card" role="alert" data-testid="results-error">
            <div className="error-icon">⚠️</div>
            <p className="error-msg">Lỗi truy vấn dữ liệu pháp luật. Vui lòng thử lại</p>
            <button
              type="button"
              className="btn-retry"
              onClick={onRetry}
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          /* Trạng thái Không tìm thấy */
          <div className="pl-empty-state-card" data-testid="results-empty">
            <div className="empty-icon">📁</div>
            <h3 className="empty-title">
              {domain !== 'ALL' && keyword
                ? `Không tìm thấy quy định trong lĩnh vực "${domain}"`
                : 'Không tìm thấy quy định phù hợp với từ khoá'}
            </h3>
            {domain !== 'ALL' && keyword ? (
              <div className="empty-suggestion-box">
                <p className="empty-tip">
                  Hành vi <strong>&quot;{keyword}&quot;</strong> có thể thuộc một lĩnh vực chuyên môn khác.
                </p>
                <div className="empty-suggestion-actions">
                  <button
                    type="button"
                    className="btn-suggestion-action"
                    onClick={() => onDomainChange('ALL')}
                  >
                    <span>🌐</span>
                    <span>Tìm &quot;{keyword}&quot; trong Tất cả lĩnh vực</span>
                  </button>
                  <button
                    type="button"
                    className="btn-suggestion-secondary"
                    onClick={onBackToSearch}
                  >
                    ← Quay lại trang tìm kiếm
                  </button>
                </div>
              </div>
            ) : (
              <p className="empty-tip">Vui lòng thử lại với từ khóa khác hoặc chuyển sang danh mục phổ biến.</p>
            )}
          </div>
        ) : (
          /* Danh sách kết quả */
          <>
            <div className="results-list" data-testid="results-list">
              {items.map((item) => (
                <div key={item.id} className="result-row-card">
                  <div className="result-main-col">
                    <h3 className="result-title">{item.title}</h3>
                    <div className="result-meta-line">
                      <span className="meta-domain">🏷️ {item.domain}</span>
                      <span className="meta-basis">📜 {item.legal_basis}</span>
                    </div>
                  </div>

                  <div className="result-fine-col">
                    <div className="fine-badge" data-testid={`fine-badge-${item.id}`}>
                      {formatCurrency(item.displayed_min_fine)} – {formatCurrency(item.displayed_max_fine)}
                    </div>
                    <div className="fine-target-sublabel">
                      Mức phạt {target === 'INDIVIDUAL' ? 'Cá nhân' : 'Tổ chức'}
                    </div>
                  </div>

                  <div className="result-action-col">
                    <button
                      type="button"
                      className="btn-view-detail"
                      onClick={() => onViewDetail(item.id)}
                      aria-label={`Xem chi tiết ${item.title}`}
                    >
                      Xem chi tiết →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="load-more-box">
                <button
                  type="button"
                  className="btn-load-more"
                  onClick={onLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang tải thêm…' : 'Tải thêm kết quả ↓'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
