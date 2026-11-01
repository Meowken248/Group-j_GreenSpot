import React, { useState, useEffect } from "react";
import { AUTH_STORAGE_KEYS } from "../auth";
import type {
  ReportStep,
  ReportFormData,
  WasteCategoryItem,
  DraftData,
} from "./types/report.types";
import { INITIAL_FORM_DATA } from "./types/report.types";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  hasValidDraft,
} from "./services/draftStorage";
import { fetchIncidentCategories } from "./services/reportService";
import { StepProgressBar } from "./components/StepProgressBar";
import { Step1CategoryAndDesc } from "./components/Step1CategoryAndDesc";
import { Step2MediaCapture } from "./components/Step2MediaCapture";
import { Step3VoiceInput } from "./components/Step3VoiceInput";
import { Step4LocationPicker } from "./components/Step4LocationPicker";
import { Step5ReviewAndSubmit } from "./components/Step5ReviewAndSubmit";
import { DraftRestoreModal } from "./components/DraftRestoreModal";
import "./ReportContainer.scss";

interface ReportContainerProps {
  onNavigateTab: (tab: string) => void;
  onRequireLogin: (redirectUrl: string) => void;
}

export const ReportContainer: React.FC<ReportContainerProps> = ({
  onNavigateTab,
  onRequireLogin,
}) => {
  const [currentStep, setCurrentStep] = useState<ReportStep>(1);
  const [formData, setFormData] = useState<ReportFormData>(INITIAL_FORM_DATA);
  const [categories, setCategories] = useState<WasteCategoryItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal khôi phục bản nháp
  const [draftModalOpen, setDraftModalOpen] = useState<boolean>(false);
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);

  // 1. Kiểm tra Token đăng nhập hợp lệ (Đặc tả Màn 1)
  useEffect(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      // "Phiên đăng nhập đã hết hạn -> Không hiện Màn 1, chuyển về STT 02 kèm tham số redirect"
      onRequireLogin("/report");
      return;
    }

    // Tải danh mục thực tế từ máy chủ
    fetchIncidentCategories()
      .then((cats) => {
        setCategories(cats);
      })
      .catch((err) => {
        console.warn("Lỗi tải danh mục sự cố:", err);
      });

    // 2. Kiểm tra bản nháp chưa gửi từ lần trước
    if (hasValidDraft()) {
      const saved = loadDraft();
      if (saved) {
        setPendingDraft(saved);
        setDraftModalOpen(true);
      }
    }
  }, [onRequireLogin]);

  // Hiển thị Toast thông báo 2 giây
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  // Cập nhật dữ liệu biểu mẫu
  const handleUpdateFormData = (updates: Partial<ReportFormData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...updates };
      // Tự động lưu nháp ngầm khi cập nhật
      saveDraft(next, currentStep);
      return next;
    });
  };

  // Nút "Lưu nháp" thủ công (Màn 1)
  const handleManualSaveDraft = () => {
    saveDraft(formData, currentStep);
    showToast("Đã lưu nháp");
  };

  // Chấp nhận khôi phục bản nháp
  const handleResumeDraft = () => {
    if (pendingDraft) {
      setFormData(pendingDraft.formData);
      setCurrentStep(pendingDraft.current_step);
    }
    setDraftModalOpen(false);
  };

  // Huỷ bỏ bản nháp và bắt đầu mới
  const handleDiscardDraft = () => {
    clearDraft();
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setDraftModalOpen(false);
  };

  // Chuyển bước tiếp theo
  const handleNextStep = () => {
    if (currentStep < 5) {
      const next = (currentStep + 1) as ReportStep;
      setCurrentStep(next);
      saveDraft(formData, next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Quay lại bước trước
  const handlePrevStep = () => {
    if (currentStep > 1) {
      const prev = (currentStep - 1) as ReportStep;
      setCurrentStep(prev);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Nhảy đến bước đã hoàn thành
  const handleNavigateStep = (step: ReportStep) => {
    if (step <= currentStep) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="report-flow-root">
      {/* TOAST THÔNG BÁO TẠM THỜI (2 GIÂY) */}
      {toastMessage && (
        <div className="report-toast-banner">
          <span className="toast-icon">✅</span>
          <span className="toast-text">{toastMessage}</span>
        </div>
      )}

      {/* POPUP HỎI TIẾP TỤC BẢN NHÁP */}
      <DraftRestoreModal
        isOpen={draftModalOpen}
        draft={pendingDraft}
        onResumeDraft={handleResumeDraft}
        onDiscardDraft={handleDiscardDraft}
      />

      {/* KHUNG NỘI DUNG CHÍNH */}
      <main className="report-main-wrapper">
        <div className="report-card-container">
          {/* THANH TIẾN TRÌNH (TOP BOX 5 BƯỚC) */}
          <StepProgressBar
            currentStep={currentStep}
            onNavigateStep={handleNavigateStep}
          />

          {/* NỘI DUNG TỪNG BƯỚC */}
          <div className="step-body-viewport">
            {currentStep === 1 && (
              <Step1CategoryAndDesc
                formData={formData}
                categories={categories}
                onUpdateFormData={handleUpdateFormData}
                onNextStep={handleNextStep}
                onSaveDraft={handleManualSaveDraft}
              />
            )}

            {currentStep === 2 && (
              <Step2MediaCapture
                formData={formData}
                onUpdateFormData={handleUpdateFormData}
                onPrevStep={handlePrevStep}
                onNextStep={handleNextStep}
              />
            )}

            {currentStep === 3 && (
              <Step3VoiceInput
                formData={formData}
                onUpdateFormData={handleUpdateFormData}
                onPrevStep={handlePrevStep}
                onNextStep={handleNextStep}
              />
            )}

            {currentStep === 4 && (
              <Step4LocationPicker
                formData={formData}
                onUpdateFormData={handleUpdateFormData}
                onPrevStep={handlePrevStep}
                onNextStep={handleNextStep}
              />
            )}

            {currentStep === 5 && (
              <Step5ReviewAndSubmit
                formData={formData}
                onNavigateStep={handleNavigateStep}
                onPrevStep={handlePrevStep}
                onClearDraftAndReset={() => {
                  clearDraft();
                  setFormData(INITIAL_FORM_DATA);
                }}
                onSessionExpired={() => {
                  saveDraft(formData, currentStep);
                  onRequireLogin("/report");
                }}
                onGoHome={() => onNavigateTab("map")}
                onTrackIncident={(_trackingCode) => {
                  // Chuyển sang bản đồ để xem chi tiết
                  onNavigateTab("map");
                }}
              />
            )}
          </div>
        </div>
      </main>

      {/* FOOTER BẢN QUYỀN & CHÍNH SÁCH */}
      <footer className="report-portal-footer">
        <div className="footer-content-inner">
          <div className="footer-left">
            <span className="brand-copy">
              © 2026 GreenSpot EcoReport - Hệ Thống Tiếp Nhận & Xử Lý Sự Cố Đô Thị TP. Hồ Chí Minh
            </span>
          </div>
          <div className="footer-links">
            <a href="#privacy" onClick={(e) => e.preventDefault()}>
              Chính sách bảo mật
            </a>
            <span className="divider">•</span>
            <a href="#contact" onClick={(e) => e.preventDefault()}>
              Đường dây nóng: 1022 (Phản ánh hiện trường)
            </a>
            <span className="divider">•</span>
            <a href="#sla" onClick={(e) => e.preventDefault()}>
              Quy chuẩn SLA đô thị
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
