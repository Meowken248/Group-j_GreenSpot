import React from 'react';
import type { DuplicateClusterListItem } from '../types/deduplication.types';

interface ClusterListProps {
  clusters: DuplicateClusterListItem[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onSelectCompare: (cluster: DuplicateClusterListItem) => void;
}

export const ClusterList: React.FC<ClusterListProps> = ({
  clusters,
  isLoading,
  errorMessage,
  onRetry,
  onSelectCompare,
}) => {
  return (
    <section className="clusters-panel" aria-label="Danh sách nhóm trùng">
      <div className="panel-header">
        <h2 className="panel-title">
          <span>📑</span>
          <span>NHÓM TRÙNG</span>
        </h2>
        {!isLoading && !errorMessage && clusters.length > 0 && (
          <span className="cluster-counter-badge">{clusters.length} cụm phát hiện</span>
        )}
      </div>

      {/* 1. Trạng thái Đang nạp: "AI đang phân tích dữ liệu hình ảnh và toạ độ…" */}
      {isLoading ? (
        <div className="ai-loading-container" role="status" aria-live="polite">
          <div className="loading-spinner" />
          <p className="loading-text">AI đang phân tích dữ liệu hình ảnh và toạ độ…</p>
        </div>
      ) : errorMessage ? (
        /* 2. Trạng thái Lỗi máy chủ AI: "Không thể kết nối dịch vụ AI. Vui lòng thử lại" */
        <div className="error-state-container" role="alert">
          <div className="error-icon">⚠️</div>
          <p className="error-message">Không thể kết nối dịch vụ AI. Vui lòng thử lại</p>
          <button type="button" className="retry-btn" onClick={onRetry}>
            Thử lại
          </button>
        </div>
      ) : clusters.length === 0 ? (
        /* 3. Trạng thái Không có báo cáo nào bị trùng lặp: "Không phát hiện báo cáo trùng lặp nào" */
        <div className="empty-state-container" role="status">
          <div className="empty-icon">✅</div>
          <h3 className="empty-title">Không phát hiện báo cáo trùng lặp nào</h3>
          <p className="empty-desc">
            Khu vực hiện tại không có phản ánh trùng khớp GPS, thời gian hoặc ảnh hiện trường. Toàn bộ hồ sơ đang ở trạng thái độc lập an toàn.
          </p>
        </div>
      ) : (
        /* 4. Danh sách các cụm báo cáo trùng */
        <div className="clusters-list">
          {clusters.map((cluster) => {
            const similarityPercent = Math.round(cluster.similarity_rate);
            return (
              <article key={cluster.cluster_id} className="cluster-card" data-testid={`cluster-card-${cluster.cluster_id}`}>
                <div className="cluster-info">
                  <div className="cluster-title-line">
                    <span className="cluster-name">{cluster.cluster_name}</span>
                    <span className="report-count-tag">{cluster.report_count} báo cáo</span>
                    <span className="similarity-tag">giống {similarityPercent}%</span>
                  </div>

                  <div className="cluster-meta-line">
                    {cluster.district_name && (
                      <span className="meta-district">📍 {cluster.district_name}</span>
                    )}
                    <div className="meta-factors">
                      <span>📏 Lệch {cluster.gps_distance_m}m</span>
                      <span>⏱️ Cách {cluster.time_diff_hours}h</span>
                      <span>🖼️ Ảnh {Math.round(cluster.visual_similarity)}%</span>
                    </div>
                  </div>
                </div>

                <div className="cluster-action">
                  <button
                    type="button"
                    className="compare-btn"
                    onClick={() => onSelectCompare(cluster)}
                    data-testid={`btn-compare-${cluster.cluster_id}`}
                    aria-label={`So sánh ${cluster.cluster_name}`}
                  >
                    So sánh
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
