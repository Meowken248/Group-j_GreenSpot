import React, { useState } from "react";
import type {
  ReportFormData,
  ReportStep,
  DuplicateIncident,
  IncidentSubmissionResult,
} from "../types/report.types";
import {
  submitIncidentReport,
  checkNearbyDuplicates,
} from "../services/reportService";
import { DuplicateWarningModal } from "./DuplicateWarningModal";

interface Step5Props {
  formData: ReportFormData;
  onNavigateStep: (step: ReportStep) => void;
  onPrevStep: () => void;
  onClearDraftAndReset: () => void;
  onSessionExpired: () => void;
  onGoHome: () => void;
  onTrackIncident: (trackingCode: string) => void;
}

export const Step5ReviewAndSubmit: React.FC<Step5Props> = ({
  formData,
  onNavigateStep,
  onPrevStep,
  onClearDraftAndReset,
  onSessionExpired,
  onGoHome,
  onTrackIncident,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<IncidentSubmissionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [networkWarning, setNetworkWarning] = useState<string | null>(null);

  // Modal cảnh báo trùng lặp
  const [duplicateModalOpen, setDuplicateModalOpen] = useState<boolean>(false);
  const [duplicateList, setDuplicateList] = useState<DuplicateIncident[]>([]);

  // Kiểm tra thiếu thông tin bắt buộc
  const missingCategory = !formData.category_id;
  const missingTitle = !formData.title || formData.title.trim().length === 0;
  const missingMedia = !formData.media || formData.media.length === 0;
  const missingLocation = !formData.location || !formData.location.is_within_hcmc;
  const hasMissingFields = missingCategory || missingTitle || missingMedia || missingLocation;

  // Thực thi gửi phản ánh lên máy chủ
  const executeSubmission = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setNetworkWarning(null);

    // Kiểm tra mất mạng
    if (!navigator.onLine) {
      setIsSubmitting(false);
      setNetworkWarning("Mất kết nối. Phản ánh đã được lưu và sẽ gửi khi có mạng");
      return;
    }

    try {
      const result = await submitIncidentReport(formData);
      setSubmissionResult(result);
      onClearDraftAndReset(); // Xoá dữ liệu nháp sau khi gửi thành công
    } catch (err: any) {
      console.error("Lỗi khi gửi phản ánh:", err);
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 401) {
        // Token hết hạn trong lúc đang gửi: Tự động lưu nháp và chuyển về Login
        onSessionExpired();
      } else if (status === 429) {
        // Giới hạn tần suất gửi (anti-spam)
        setErrorMessage("Bạn gửi phản ánh quá nhiều. Vui lòng thử lại sau");
      } else if (status === 400 && typeof detail === "string") {
        setErrorMessage(detail);
      } else {
        setErrorMessage("Không thể gửi phản ánh. Vui lòng thử lại");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nút bấm "Gửi phản ánh": Trước khi gửi, kiểm tra phản ánh trùng lặp gần đây
  const handleInitiateSubmit = async () => {
    if (hasMissingFields) {
      setErrorMessage("Phản ánh còn thiếu thông tin. Vui lòng bổ sung");
      return;
    }

    if (!formData.location) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Kiểm tra báo cáo tương tự gần vị trí này (100m)
      const dupCheck = await checkNearbyDuplicates(
        formData.location.latitude,
        formData.location.longitude,
        formData.category_id,
        100
      );

      if (dupCheck.has_duplicate && dupCheck.duplicates.length > 0) {
        setDuplicateList(dupCheck.duplicates);
        setDuplicateModalOpen(true);
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn("Lỗi kiểm tra trùng lặp:", err);
    }

    // Nếu không trùng lặp, tiến hành gửi ngay
    await executeSubmission();
  };

  return (
    <div className="report-step-content step-5-container">
      <div className="step-header">
        <h2 className="step-title">5. Xác nhận thông tin & Gửi phản ánh</h2>
        <p className="step-subtitle">
          Vui lòng rà soát lại toàn bộ thông tin phản ánh trước khi gửi vào hệ thống tiếp nhận đô thị.
        </p>
      </div>

      {/* THÔNG BÁO LỖI HOẶC CẢNH BÁO */}
      {errorMessage && (
        <div className="inline-error-banner submit-alert">
          ⛔ {errorMessage}
        </div>
      )}
      {networkWarning && (
        <div className="inline-warning-banner submit-alert">
          📶 {networkWarning}
        </div>
      )}

      {/* GIAO DIỆN SAU KHI GỬI THÀNH CÔNG (KHUNG KẾT QUẢ) */}
      {submissionResult ? (
        <div className="section-card success-result-card">
          <div className="success-badge-icon">🎉</div>
          <h3 className="success-heading">Tiếp nhận phản ánh thành công!</h3>
          <p className="success-submessage">
            {submissionResult.message}
          </p>

          <div className="result-details-grid">
            <div className="result-metric">
              <span className="metric-label">MÃ SỰ CỐ ĐÔ THỊ</span>
              <span className="metric-code">{submissionResult.tracking_code}</span>
            </div>
            <div className="result-metric">
              <span className="metric-label">CAM KẾT THỜI HẠN XỬ LÝ (SLA)</span>
              <span className="metric-sla">Trong vòng {submissionResult.sla_hours} giờ</span>
            </div>
            <div className="result-metric">
              <span className="metric-label">ĐIỂM XANH VINH DANH</span>
              <span className="metric-points">+{submissionResult.green_points_awarded} GreenPoints</span>
            </div>
            <div className="result-metric">
              <span className="metric-label">ĐƠN VỊ TIẾP NHẬN</span>
              <span className="metric-unit">{submissionResult.unit_name || "UBND TP. Hồ Chí Minh"}</span>
            </div>
          </div>

          <div className="result-nav-actions">
            <button
              type="button"
              className="btn-secondary btn-home"
              onClick={onGoHome}
            >
              🏠 Về trang chủ
            </button>
            <button
              type="button"
              className="btn-primary btn-track"
              onClick={() => onTrackIncident(submissionResult.tracking_code)}
            >
              📍 Theo dõi sự cố
            </button>
          </div>
        </div>
      ) : (
        /* GIAO DIỆN TÓM TẮT TRƯỚC KHI GỬI */
        <>
          {/* MỤC 1: LOẠI VÀ MÔ TẢ */}
          <div className={`section-card review-card ${missingCategory || missingTitle ? "has-missing-border" : ""}`}>
            <div className="review-card-header">
              <div className="review-card-title-row">
                <span className="review-step-num">1</span>
                <h3 className="review-card-title">Loại sự cố & Mô tả ban đầu</h3>
              </div>
              <button
                type="button"
                className="btn-edit-step"
                onClick={() => onNavigateStep(1)}
                disabled={isSubmitting}
              >
                ✏️ Sửa
              </button>
            </div>

            <div className="review-card-body">
              <div className="review-field-row">
                <span className="field-k">Loại sự cố:</span>
                <span className="field-v category-tag">
                  {formData.category_name || "Chưa chọn loại sự cố"}
                </span>
                <span className={`severity-tag severity-${formData.severity.toLowerCase()}`}>
                  Mức: {formData.severity === "CRITICAL" ? "Khẩn cấp" : formData.severity === "HIGH" ? "Cao" : "Bình thường"}
                </span>
              </div>

              <div className="review-field-row">
                <span className="field-k">Tiêu đề:</span>
                <span className="field-v font-bold">{formData.title || "(Chưa có tiêu đề)"}</span>
              </div>

              <div className="review-field-row">
                <span className="field-k">Nội dung chi tiết:</span>
                <p className="field-v desc-multiline">
                  {formData.description || "(Chưa có mô tả)"}
                </p>
              </div>
            </div>
          </div>

          {/* MỤC 2: TỆP ĐÍNH KÈM (WATERMARK PREVIEW) */}
          <div className={`section-card review-card ${missingMedia ? "has-missing-border" : ""}`}>
            <div className="review-card-header">
              <div className="review-card-title-row">
                <span className="review-step-num">2</span>
                <h3 className="review-card-title">
                  Bằng chứng tệp đính kèm ({formData.media.length} tệp)
                </h3>
              </div>
              <button
                type="button"
                className="btn-edit-step"
                onClick={() => onNavigateStep(2)}
                disabled={isSubmitting}
              >
                ✏️ Sửa
              </button>
            </div>

            <div className="review-card-body">
              {formData.media.length === 0 ? (
                <p className="missing-hint-text">
                  ⚠️ Chưa có ảnh hoặc video nào. Bắt buộc thêm ít nhất 1 ảnh/video.
                </p>
              ) : (
                <div className="review-media-grid">
                  {formData.media.map((m, idx) => (
                    <div key={m.id} className="review-media-thumb">
                      <img
                        src={m.thumbnail_url || m.file_url}
                        alt={`Bằng chứng ${idx + 1}`}
                      />
                      <span className="review-wm-badge">
                        {m.media_type === "VIDEO" ? "🎥 Video (Watermarked)" : "🛡️ Watermark GPS"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MỤC 3: GIỌNG NÓI (NẾU CÓ) */}
          {formData.voice_text && (
            <div className="section-card review-card">
              <div className="review-card-header">
                <div className="review-card-title-row">
                  <span className="review-step-num">3</span>
                  <h3 className="review-card-title">Ghi âm hiện trường đã chuyển đổi</h3>
                </div>
                <button
                  type="button"
                  className="btn-edit-step"
                  onClick={() => onNavigateStep(3)}
                  disabled={isSubmitting}
                >
                  ✏️ Sửa
                </button>
              </div>
              <div className="review-card-body">
                <p className="voice-text-quote">"{formData.voice_text}"</p>
              </div>
            </div>
          )}

          {/* MỤC 4: VỊ TRÍ SỰ CỐ */}
          <div className={`section-card review-card ${missingLocation ? "has-missing-border" : ""}`}>
            <div className="review-card-header">
              <div className="review-card-title-row">
                <span className="review-step-num">4</span>
                <h3 className="review-card-title">Vị trí & Địa bàn xử lý</h3>
              </div>
              <button
                type="button"
                className="btn-edit-step"
                onClick={() => onNavigateStep(4)}
                disabled={isSubmitting}
              >
                ✏️ Sửa
              </button>
            </div>

            <div className="review-card-body">
              <div className="review-location-summary">
                <p className="review-address-text">
                  📍 <strong>Địa chỉ:</strong> {formData.location?.address_text || "Chưa xác định"}
                </p>
                <div className="review-location-pills">
                  <span className="pill">
                    Quận/Huyện: {formData.location?.district_name || "TP. Hồ Chí Minh"}
                  </span>
                  <span className="pill">
                    Tọa độ: {formData.location ? `${formData.location.latitude.toFixed(5)}, ${formData.location.longitude.toFixed(5)}` : "Chưa có"}
                  </span>
                  <span className={`pill ${formData.location?.is_within_hcmc ? "pill-green" : "pill-red"}`}>
                    {formData.location?.is_within_hcmc ? "Thuộc 22 Quận/Huyện TP.HCM" : "Ngoài phạm vi tiếp nhận"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* NÚT THAO TÁC GỬI PHẢN ÁNH */}
          <div className="navigation-actions-bar">
            <button
              type="button"
              className="btn-secondary btn-back"
              onClick={onPrevStep}
              disabled={isSubmitting}
            >
              ← Quay lại
            </button>

            <button
              type="button"
              className={`btn-primary btn-submit-report ${isSubmitting ? "loading" : ""} ${hasMissingFields ? "btn-dimmed" : ""}`}
              onClick={handleInitiateSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang gửi phản ánh…" : "🚀 Gửi phản ánh"}
            </button>
          </div>
        </>
      )}

      {/* POPUP CẢNH BÁO SỰ CỐ TƯƠNG TỰ GẦN ĐÂY */}
      <DuplicateWarningModal
        isOpen={duplicateModalOpen}
        duplicates={duplicateList}
        onConfirmSendAnyway={async () => {
          setDuplicateModalOpen(false);
          await executeSubmission();
        }}
        onViewExistingIncident={(dup) => {
          setDuplicateModalOpen(false);
          onTrackIncident(dup.tracking_code);
        }}
        onClose={() => setDuplicateModalOpen(false)}
      />
    </div>
  );
};

