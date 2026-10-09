import React, { useState } from 'react';
import type {
  PenaltyDetailResponse,
  TargetType,
} from '../types/penalty.types';

interface PenaltyDetailScreenProps {
  detail: PenaltyDetailResponse | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onBackToList: () => void;
  target: TargetType;
  onTargetToggle: (newTarget: TargetType) => void;
  isLoggedIn: boolean;
  onNavigateToReport: (violationTitle: string, isAnonymous: boolean) => void;
  onNavigateToLogin: () => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
};

export const PenaltyDetailScreen: React.FC<PenaltyDetailScreenProps> = ({
  detail,
  isLoading,
  errorMessage,
  onRetry,
  onBackToList,
  target,
  onTargetToggle,
  isLoggedIn,
  onNavigateToReport,
  onNavigateToLogin,
}) => {
  const [showAnonModal, setShowAnonModal] = useState(false);

  const handleReportClick = () => {
    if (!detail) return;
    // Luôn mở Popup để người dùng chủ động lựa chọn Báo cáo ẩn danh hoặc Nhận điểm tích lũy
    setShowAnonModal(true);
  };

  const handleSelectAnonymous = () => {
    if (!detail) return;
    setShowAnonModal(false);
    onNavigateToReport(detail.title, true);
  };

  const handleSelectLogin = () => {
    if (!detail) return;
    setShowAnonModal(false);
    if (isLoggedIn) {
      onNavigateToReport(detail.title, false);
    } else {
      onNavigateToLogin();
    }
  };

  if (isLoading) {
    return (
      <div className="pl-screen-three-grid" data-testid="detail-skeleton">
        <div className="pl-detail-column-card">
          <div className="pl-skeleton-loader">
            <div className="skeleton-line" style={{ height: 28 }} />
            <div className="skeleton-line" style={{ height: 80 }} />
          </div>
        </div>
        <div className="pl-detail-column-card">
          <div className="pl-skeleton-loader">
            <div className="skeleton-line" style={{ height: 28 }} />
            <div className="skeleton-line" style={{ height: 80 }} />
          </div>
        </div>
        <div className="pl-detail-column-card">
          <div className="pl-skeleton-loader">
            <div className="skeleton-line" style={{ height: 28 }} />
            <div className="skeleton-line" style={{ height: 80 }} />
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !detail) {
    return (
      <div className="pl-error-state-card" role="alert" data-testid="detail-error">
        <div className="error-icon">📡</div>
        <p className="error-msg">Không thể tải chi tiết điều luật. Vui lòng thử lại</p>
        <button type="button" className="btn-retry" onClick={onRetry}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="pl-screen-three-grid" data-testid="penalty-screen-detail">
        {/* ======================================================== */}
        {/* KHỐI 1: HÀNH VI VI PHẠM (CỘT TRÁI) */}
        {/* ======================================================== */}
        <section className="pl-detail-column-card" aria-label="Khối hành vi vi phạm">
          <div>
            <h2 className="col-header">
              <span>📋</span>
              <span>HÀNH VI VI PHẠM</span>
            </h2>

            <div className="col-body">
              <div className="detail-field-group">
                <span className="field-label">Tên hành vi vi phạm:</span>
                <p className="field-text-content" style={{ fontWeight: 700 }}>
                  {detail.title}
                </p>
              </div>

              <div className="detail-field-group">
                <span className="field-label">Mô tả nguyên văn điều luật:</span>
                <p className="field-text-content">
                  {detail.description}
                </p>
              </div>

              {detail.aggravating_circumstances && (
                <div className="aggravating-box">
                  <div className="box-title">⚠️ Tình tiết tăng nặng / Tái phạm:</div>
                  <p className="box-text">{detail.aggravating_circumstances}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* KHỐI 2: MỨC PHẠT (CỘT GIỮA) */}
        {/* ======================================================== */}
        <section className="pl-detail-column-card" aria-label="Khối mức phạt">
          <div>
            <h2 className="col-header">
              <span>💰</span>
              <span>MỨC PHẠT TIỀN & BIỆN PHÁP</span>
            </h2>

            <div className="col-body">
              {/* Nút chuyển đổi đối tượng nhanh giữa Cá nhân & Tổ chức */}
              <div className="target-toggle-switch">
                <span className="toggle-label">
                  Áp dụng: {target === 'INDIVIDUAL' ? 'Cá nhân' : 'Tổ chức (x2)'}
                </span>
                <button
                  type="button"
                  className="btn-switch-target"
                  onClick={() => onTargetToggle(target === 'INDIVIDUAL' ? 'ORGANIZATION' : 'INDIVIDUAL')}
                >
                  Đổi sang {target === 'INDIVIDUAL' ? 'Tổ chức' : 'Cá nhân'}
                </button>
              </div>

              <div className="fine-stat-cards">
                <div className="fine-stat-item">
                  <span className="fine-lbl">Mức phạt tối thiểu:</span>
                  <span className="fine-val">{formatCurrency(detail.min_fine)}</span>
                </div>

                <div className="fine-stat-item highlight-avg">
                  <span className="fine-lbl">Mức phạt trung bình:</span>
                  <span className="fine-val">{formatCurrency(detail.avg_fine)}</span>
                </div>

                <div className="fine-stat-item">
                  <span className="fine-lbl">Mức phạt tối đa:</span>
                  <span className="fine-val">{formatCurrency(detail.max_fine)}</span>
                </div>
              </div>

              {detail.supplementary_measures && (
                <div className="supplementary-box">
                  <div className="box-title">🛠️ Biện pháp khắc phục bổ sung:</div>
                  <p className="box-text">{detail.supplementary_measures}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* KHỐI 3: CĂN CỨ PHÁP LÝ (CỘT PHẢI) */}
        {/* ======================================================== */}
        <section className="pl-detail-column-card" aria-label="Khối căn cứ pháp lý">
          <div>
            <h2 className="col-header">
              <span>🏛️</span>
              <span>CĂN CỨ PHÁP LÝ</span>
            </h2>

            <div className="col-body">
              {/* Nhãn cảnh báo nếu điều khoản có văn bản sửa đổi */}
              {detail.amendment_warning && (
                <div className="amendment-alert-box" role="status">
                  <span className="alert-icon">⚠️</span>
                  <span className="alert-msg">
                    Quy định này đã được cập nhật bởi Nghị định mới
                  </span>
                </div>
              )}

              <div className="detail-field-group">
                <span className="field-label">Văn bản quy định:</span>
                <p className="field-text-content" style={{ fontWeight: 700, color: '#0369a1' }}>
                  {detail.legal_basis}
                </p>
              </div>

              {detail.effective_date && (
                <div className="detail-field-group">
                  <span className="field-label">Ngày có hiệu lực thi hành:</span>
                  <p className="field-text-content">
                    {detail.effective_date}
                  </p>
                </div>
              )}

              <div className="detail-field-group">
                <span className="field-label">Lĩnh vực chuyên môn:</span>
                <p className="field-text-content">
                  {detail.domain}
                </p>
              </div>
            </div>
          </div>

          <div className="col-action-box">
            <button
              type="button"
              className="btn-report-violation"
              onClick={handleReportClick}
              aria-label="Báo cáo vi phạm này"
            >
              <span>🚨</span>
              <span>Báo cáo vi phạm</span>
            </button>

            <button
              type="button"
              className="btn-back-to-list"
              onClick={onBackToList}
            >
              ← Quay lại danh sách
            </button>
          </div>
        </section>
      </div>

      {/* ======================================================== */}
      {/* POPUP MODAL: BÁO CÁO ẨN DANH HOẶC ĐĂNG NHẬP */}
      {/* ======================================================== */}
      {showAnonModal && (
        <div
          className="pl-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="anon-modal-title"
          data-testid="anon-report-modal"
        >
          <div className="pl-modal-card">
            <div className="modal-icon">🌱</div>
            <h3 id="anon-modal-title" className="modal-title">
              Xác nhận phương thức phản ánh
            </h3>
            <p className="modal-desc">
              Bạn có thể báo cáo ẩn danh hoặc đăng nhập để nhận điểm
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-login"
                onClick={handleSelectLogin}
              >
                <span>{isLoggedIn ? '🌿' : '🔑'}</span>
                <span>{isLoggedIn ? 'Gửi bằng tài khoản này (Nhận điểm xanh)' : 'Đăng nhập ngay (Nhận điểm xanh)'}</span>
              </button>

              <button
                type="button"
                className="btn-modal-anon"
                onClick={handleSelectAnonymous}
              >
                <span>🕵️</span>
                <span>Tiếp tục gửi báo cáo ẩn danh</span>
              </button>

              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowAnonModal(false)}
              >
                Huỷ bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
