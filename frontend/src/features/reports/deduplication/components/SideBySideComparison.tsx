import React, { useState } from 'react';
import type { ComparisonResponse } from '../types/deduplication.types';

interface SideBySideComparisonProps {
  data: ComparisonResponse;
  onBackToList: () => void;
  onOpenMergeModal: () => void;
  onMarkDistinct: () => void;
  isMarkingDistinct: boolean;
  onImageClick: (url: string, caption: string) => void;
}

export const SideBySideComparison: React.FC<SideBySideComparisonProps> = ({
  data,
  onBackToList,
  onOpenMergeModal,
  onMarkDistinct,
  isMarkingDistinct,
  onImageClick,
}) => {
  const { report_a, report_b, ai_conclusion, cluster_name } = data;

  const [imgALoaded, setImgALoaded] = useState(false);
  const [imgAError, setImgAError] = useState(false);
  const [imgBLoaded, setImgBLoaded] = useState(false);
  const [imgBError, setImgBError] = useState(false);

  return (
    <div className="screen-2-container">
      {/* Thanh điều hướng quay lại danh sách Màn 1 */}
      <div className="navigation-bar">
        <button
          type="button"
          className="back-btn"
          onClick={onBackToList}
          aria-label="Quay về danh sách nhóm trùng"
        >
          ← Quay về danh sách nhóm trùng
        </button>
        <span className="view-title">So sánh đối chứng {cluster_name}</span>
      </div>

      <div className="comparison-grid">
        {/* ========================================================================= */}
        {/* KHỐI "BÁO CÁO A" (CỘT TRÁI) */}
        {/* ========================================================================= */}
        <section className="report-card-column" aria-label="Báo cáo A">
          <div className="report-header">
            <h3 className="report-title badge-a">
              <span>BÁO CÁO A (HỒ SƠ GỐC)</span>
              <span className="tracking-badge">#{report_a.tracking_code}</span>
            </h3>
          </div>

          {/* Khung ảnh hiện trường */}
          <div
            className="report-image-box"
            onClick={() => !imgAError && onImageClick(report_a.media_url, `Báo cáo A - ${report_a.title}`)}
            title="Nhấp để phóng to ảnh hiện trường"
            role="button"
            tabIndex={0}
          >
            {!imgALoaded && !imgAError && (
              <div className="image-skeleton" data-testid="skeleton-image-a" />
            )}

            {imgAError ? (
              <div className="image-error-fallback" role="alert">
                <span>⚠️</span>
                <span className="error-text">Không thể tải hình ảnh hiện trường. Vui lòng thử lại</span>
                <button
                  type="button"
                  className="reload-image-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgAError(false);
                    setImgALoaded(false);
                  }}
                >
                  Tải lại
                </button>
              </div>
            ) : (
              <img
                src={report_a.media_url}
                alt={report_a.title}
                className="scene-image"
                style={{ display: imgALoaded ? 'block' : 'none' }}
                onLoad={() => setImgALoaded(true)}
                onError={() => {
                  setImgAError(true);
                  setImgALoaded(false);
                }}
              />
            )}

            {imgALoaded && !imgAError && (
              <span className="image-zoom-hint">🔍 Phóng to ảnh</span>
            )}
          </div>

          {/* Chi tiết nội dung báo cáo A */}
          <div className="report-details-list">
            <div className="detail-item">
              <span className="detail-label">Người gửi phản ánh:</span>
              <span className="detail-val">{report_a.reporter_name}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Thời gian gửi:</span>
              <span className="detail-val timestamp-val">
                📅 {report_a.created_at_display}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Địa chỉ & Tọa độ:</span>
              <span className="detail-val">
                📍 {report_a.address_text} ({report_a.latitude.toFixed(6)}, {report_a.longitude.toFixed(6)})
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Mô tả của công dân A:</span>
              <p className="detail-val description-text">{report_a.description}</p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* KHỐI "BÁO CÁO B" (CỘT GIỮA) */}
        {/* ========================================================================= */}
        <section className="report-card-column" aria-label="Báo cáo B">
          <div className="report-header">
            <h3 className="report-title badge-b">
              <span>BÁO CÁO B (NGHI VẤN TRÙNG LẶP)</span>
              <span className="tracking-badge">#{report_b.tracking_code}</span>
            </h3>
          </div>

          {/* Khung ảnh hiện trường góc chụp B */}
          <div
            className="report-image-box"
            onClick={() => !imgBError && onImageClick(report_b.media_url, `Báo cáo B - ${report_b.title}`)}
            title="Nhấp để phóng to ảnh hiện trường từ góc chụp công dân B"
            role="button"
            tabIndex={0}
          >
            {!imgBLoaded && !imgBError && (
              <div className="image-skeleton" data-testid="skeleton-image-b" />
            )}

            {imgBError ? (
              <div className="image-error-fallback" role="alert">
                <span>⚠️</span>
                <span className="error-text">Không thể tải hình ảnh hiện trường. Vui lòng thử lại</span>
                <button
                  type="button"
                  className="reload-image-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgBError(false);
                    setImgBLoaded(false);
                  }}
                >
                  Tải lại
                </button>
              </div>
            ) : (
              <img
                src={report_b.media_url}
                alt={report_b.title}
                className="scene-image"
                style={{ display: imgBLoaded ? 'block' : 'none' }}
                onLoad={() => setImgBLoaded(true)}
                onError={() => {
                  setImgBError(true);
                  setImgBLoaded(false);
                }}
              />
            )}

            {imgBLoaded && !imgBError && (
              <span className="image-zoom-hint">🔍 Phóng to ảnh</span>
            )}
          </div>

          {/* Chi tiết nội dung báo cáo B */}
          <div className="report-details-list">
            <div className="detail-item">
              <span className="detail-label">Người gửi phản ánh:</span>
              <span className="detail-val">{report_b.reporter_name}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Thời gian gửi:</span>
              <span className="detail-val timestamp-val">
                📅 {report_b.created_at_display}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Địa chỉ & Tọa độ:</span>
              <span className="detail-val">
                📍 {report_b.address_text} ({report_b.latitude.toFixed(6)}, {report_b.longitude.toFixed(6)})
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Mô tả của công dân B:</span>
              <p className="detail-val description-text">{report_b.description}</p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* KHỐI "KẾT LUẬN AI" (CỘT PHẢI) */}
        {/* ========================================================================= */}
        <aside className="ai-conclusion-column" aria-label="Kết luận phân tích AI">
          <div className="conclusion-header">
            <h3 className="conclusion-title">KẾT LUẬN AI</h3>
          </div>

          {/* Chỉ số phân tích */}
          <div className="analysis-score-box">
            <span className="score-label">Tỷ lệ giống nhau AI</span>
            <span className="score-value">{ai_conclusion.similarity_display}</span>
            <p className="score-summary-desc">{ai_conclusion.explanation}</p>
          </div>

          {/* 3 Yếu tố đối soát chi tiết */}
          <div className="factors-checklist">
            <div className="factor-item">
              <span className="factor-name">📏 Khoảng cách GPS (&lt;50m):</span>
              <span className="factor-status">
                {ai_conclusion.gps_distance_m}m {ai_conclusion.gps_distance_m <= 50 ? '✓' : '✗'}
              </span>
            </div>

            <div className="factor-item">
              <span className="factor-name">⏱️ Khoảng cách giờ (&lt;48h):</span>
              <span className="factor-status">
                {ai_conclusion.time_diff_hours}h {ai_conclusion.time_diff_hours <= 48 ? '✓' : '✗'}
              </span>
            </div>

            <div className="factor-item">
              <span className="factor-name">🖼️ Tương đồng ảnh (&gt;80%):</span>
              <span className="factor-status">
                {Math.round(ai_conclusion.visual_similarity)}% {ai_conclusion.visual_similarity >= 80 ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* Các nút hành động chức năng */}
          <div className="action-buttons-group">
            <button
              type="button"
              className="merge-action-btn"
              onClick={onOpenMergeModal}
              data-testid="btn-gop-bao-cao"
            >
              Gộp báo cáo
            </button>

            <button
              type="button"
              className="distinct-action-btn"
              onClick={onMarkDistinct}
              disabled={isMarkingDistinct}
              data-testid="btn-khong-trung"
            >
              {isMarkingDistinct ? 'Đang xử lý...' : 'Không trùng'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
