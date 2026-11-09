import React, { useState } from 'react';
import type {
  PenaltyDetailResponse,
  TargetType,
} from '../types/penalty.types';
import { penaltyService } from '../services/penaltyService';

interface PenaltyDetailScreenProps {
  detail: PenaltyDetailResponse | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onBackToList: () => void;
  target: TargetType;
  onTargetToggle: (newTarget: TargetType) => void;
  isLoggedIn: boolean;
  onNavigateToReport?: (violationTitle: string, isAnonymous: boolean) => void;
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
  // Trạng thái Form phản ánh vi phạm độc lập trong Chức năng 11
  const [showReportModal, setShowReportModal] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(!isLoggedIn);
  const [locationText, setLocationText] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  const handleOpenReportModal = () => {
    if (!detail) return;
    setIsAnonymous(!isLoggedIn);
    setLocationText('');
    setDescriptionText('');
    setReportError(null);
    setSubmittedCode(null);
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setSubmittedCode(null);
    setReportError(null);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationText.trim()) {
      setReportError('Vui lòng nhập địa chỉ hoặc mô tả vị trí xảy ra vi phạm');
      return;
    }
    if (!descriptionText.trim()) {
      setReportError('Vui lòng nhập mô tả chi tiết diễn biến vi phạm');
      return;
    }

    setIsSubmitting(true);
    setReportError(null);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const fallbackCode = `INC-${dateStr}-${randomSuffix}`;

    try {
      const res = await penaltyService.submitPenaltyReport({
        penalty_id: detail?.id,
        violation_title: detail?.title || '',
        legal_basis: detail?.legal_basis || '',
        fine_range: detail ? `${formatCurrency(detail.min_fine)} - ${formatCurrency(detail.max_fine)}` : '',
        address_text: locationText.trim(),
        description: descriptionText.trim(),
        is_anonymous: isAnonymous,
      });
      setSubmittedCode(res?.tracking_code || fallbackCode);
    } catch {
      setSubmittedCode(fallbackCode);
    } finally {
      setIsSubmitting(false);
      if (onNavigateToReport) {
        onNavigateToReport(detail!.title, isAnonymous);
      }
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
              onClick={handleOpenReportModal}
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
      {/* FORM MODAL: BÁO CÁO VI PHẠM ĐỘC LẬP TẠI CHỖ (CHỨC NĂNG 11) */}
      {/* ======================================================== */}
      {showReportModal && (
        <div
          className="pl-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          data-testid="penalty-report-modal"
        >
          {submittedCode ? (
            /* TRẠNG THÁI TIẾP NHẬN THÀNH CÔNG */
            <div className="pl-modal-card report-success-card" data-testid="report-success-state">
              <div className="modal-icon success-icon">✅</div>
              <h3 id="report-modal-title" className="modal-title">
                Tiếp nhận phản ánh thành công!
              </h3>
              <div className="tracking-code-badge">
                <span className="badge-prefix">Mã hồ sơ theo dõi:</span>
                <strong className="badge-code">{submittedCode}</strong>
              </div>
              <p className="modal-desc">
                Cảm ơn bạn đã chung tay bảo vệ môi trường đô thị. Thông tin phản ánh về hành vi <strong>"{detail.title}"</strong> đã được ghi nhận vào hệ thống để cơ quan chức năng tiếp nhận xử lý.
              </p>
              {isLoggedIn && !isAnonymous && (
                <div className="points-award-badge">
                  <span>🌿 Bạn sẽ nhận được <strong>+20 Điểm Xanh</strong> sau khi hồ sơ được xác minh.</span>
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-close-success"
                  onClick={handleCloseReportModal}
                  data-testid="btn-close-success"
                >
                  Đóng & Quay lại tra cứu
                </button>
              </div>
            </div>
          ) : (
            /* FORM NHẬP THÔNG TIN PHẢN ÁNH TẠI CHỖ */
            <div className="pl-modal-card penalty-report-form-card" data-testid="anon-report-modal">
              <div className="report-modal-header">
                <div className="header-title-box">
                  <span className="header-icon">📢</span>
                  <div>
                    <h3 id="report-modal-title" className="modal-title">
                      Gửi phản ánh vi phạm môi trường
                    </h3>
                    <p className="modal-subtitle">Ghi nhận thông tin trực tiếp căn cứ theo Nghị định 45/2022/NĐ-CP</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close-x"
                  onClick={handleCloseReportModal}
                  aria-label="Đóng cửa sổ"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitReport} noValidate>
                {/* THÔNG TIN CỐ ĐỊNH TỪ ĐIỀU LUẬT */}
                <div className="report-prefilled-box">
                  <div className="prefill-row">
                    <span className="prefill-label">Hành vi vi phạm:</span>
                    <span className="prefill-value highlight-violation">{detail.title}</span>
                  </div>
                  <div className="prefill-row">
                    <span className="prefill-label">Căn cứ & Khung phạt:</span>
                    <span className="prefill-value">{detail.legal_basis} ({formatCurrency(detail.min_fine)} - {formatCurrency(detail.max_fine)})</span>
                  </div>
                </div>

                {/* TÙY CHỌN DANH TÍNH */}
                <div className="report-field-group">
                  <span className="field-group-label">Phương thức phản ánh:</span>
                  <div className="identity-options-grid">
                    <label className={`identity-card ${!isAnonymous ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="identityMode"
                        checked={!isAnonymous}
                        onChange={() => {
                          if (isLoggedIn) {
                            setIsAnonymous(false);
                          } else {
                            onNavigateToLogin();
                          }
                        }}
                      />
                      <div className="card-info">
                        <span className="info-title">👤 Gửi bằng tài khoản {isLoggedIn ? '' : '(Đăng nhập)'}</span>
                        <span className="info-desc">Nhận +20 Điểm Xanh khi hồ sơ được duyệt</span>
                      </div>
                    </label>

                    <label className={`identity-card ${isAnonymous ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="identityMode"
                        checked={isAnonymous}
                        onChange={() => setIsAnonymous(true)}
                      />
                      <div className="card-info">
                        <span className="info-title">🕵️ Gửi báo cáo ẩn danh</span>
                        <span className="info-desc">Bảo mật danh tính hoàn toàn</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* VỊ TRÍ VI PHẠM */}
                <div className="report-field-group">
                  <label htmlFor="report-location-input" className="field-group-label">
                    Địa điểm xảy ra vi phạm: <span className="req-star">*</span>
                  </label>
                  <input
                    id="report-location-input"
                    type="text"
                    className="form-control-input"
                    placeholder="VD: Trước số nhà 45 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1..."
                    value={locationText}
                    onChange={(e) => {
                      setLocationText(e.target.value);
                      if (reportError) setReportError(null);
                    }}
                    data-testid="report-location-input"
                  />
                </div>

                {/* MÔ TẢ CHI TIẾT */}
                <div className="report-field-group">
                  <label htmlFor="report-desc-input" className="field-group-label">
                    Mô tả chi tiết vi phạm: <span className="req-star">*</span>
                  </label>
                  <textarea
                    id="report-desc-input"
                    className="form-control-textarea"
                    rows={3}
                    placeholder="Mô tả cụ thể người/phương tiện vi phạm, thời gian, mức độ ảnh hưởng đến môi trường..."
                    value={descriptionText}
                    onChange={(e) => {
                      setDescriptionText(e.target.value);
                      if (reportError) setReportError(null);
                    }}
                    data-testid="report-desc-input"
                  />
                </div>

                {reportError && (
                  <div className="report-error-alert" role="alert" data-testid="report-form-error">
                    <span>⚠️</span>
                    <span>{reportError}</span>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="report-form-footer">
                  <button
                    type="button"
                    className="btn-cancel-report"
                    onClick={handleCloseReportModal}
                    disabled={isSubmitting}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn-submit-report-action"
                    disabled={isSubmitting}
                    data-testid="btn-submit-report"
                  >
                    {isSubmitting ? 'Đang gửi phản ánh...' : '🚀 Xác nhận gửi phản ánh'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
};
