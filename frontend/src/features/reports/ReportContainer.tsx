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
import { fetchIncidentCategories, isCoordinatesInHCMC } from "./services/reportService";
import { StepProgressBar } from "./components/StepProgressBar";
import { Step1CategoryAndDesc } from "./components/Step1CategoryAndDesc";
import { Step2MediaCapture } from "./components/Step2MediaCapture";
import { Step3VoiceInput } from "./components/Step3VoiceInput";
import { Step4LocationPicker } from "./components/Step4LocationPicker";
import { Step5ReviewAndSubmit } from "./components/Step5ReviewAndSubmit";
import { DraftRestoreModal } from "./components/DraftRestoreModal";
import { OfflineOutboxPage } from "../offline/pages/OfflineOutboxPage";
import { saveDraftToDb, getDraftById, listUserDrafts, deleteDraftFromDb } from "../offline/services/draftRepository";
import { getCurrentUserId } from "../offline/services/offlineDb";
import type { OfflineDraft, OfflineQueueItem } from "../offline/types/offline.types";
import "./ReportContainer.scss";

interface ReportContainerProps {
  onNavigateTab: (tab: string) => void;
  onRequireLogin: (redirectUrl: string) => void;
  initialDraftId?: string | null;
  editingQueueItem?: OfflineQueueItem | null;
  onClearEditingItem?: () => void;
}

export const ReportContainer: React.FC<ReportContainerProps> = ({
  onNavigateTab,
  onRequireLogin,
  initialDraftId,
  editingQueueItem,
  onClearEditingItem,
}) => {
  const [currentStep, setCurrentStep] = useState<ReportStep>(1);
  const [formData, setFormData] = useState<ReportFormData>(INITIAL_FORM_DATA);
  const [categories, setCategories] = useState<WasteCategoryItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal khôi phục bản nháp
  const [draftModalOpen, setDraftModalOpen] = useState<boolean>(false);
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);
  const [pendingIndexedDraft, setPendingIndexedDraft] = useState<OfflineDraft | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(initialDraftId || null);
  const [editingQueueItemId, setEditingQueueItemId] = useState<string | null>(() => {
    return editingQueueItem ? editingQueueItem.queue_id : null;
  });
  const [isOutboxViewOpen, setIsOutboxViewOpen] = useState<boolean>(false);

  useEffect(() => {
    if (editingQueueItem) {
      setEditingQueueItemId(editingQueueItem.queue_id);
    }
  }, [editingQueueItem]);

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

      // 2. Nếu có bản nháp từ tham số hoặc mục sửa từ hàng đợi
      if (initialDraftId) {
        setActiveDraftId(initialDraftId);
        handleResumeIndexedDbDraft(initialDraftId);
        return;
      }

      if (editingQueueItem) {
        setFormData({
          category_id: editingQueueItem.category_id,
          category_code: "",
          category_name: editingQueueItem.category_name,
          title: editingQueueItem.title,
          description: editingQueueItem.description,
          severity: editingQueueItem.severity,
          media: (editingQueueItem.media_blobs || []).map((m) => ({
            id: m.client_file_id,
            file: new File([m.blob], m.name, { type: m.mime_type }),
            preview_url: URL.createObjectURL(m.blob),
            file_url: "",
            thumbnail_url: "",
            media_type: m.media_type,
            mime_type: m.mime_type,
            file_size_bytes: m.size,
          })),
          location: {
            latitude: editingQueueItem.latitude,
            longitude: editingQueueItem.longitude,
            address_text: editingQueueItem.address_text,
            source: "PIN",
            is_within_hcmc: isCoordinatesInHCMC(editingQueueItem.latitude, editingQueueItem.longitude),
            accuracy_meters: 10,
          },
          is_anonymous: editingQueueItem.is_anonymous,
          reporter_phone: editingQueueItem.reporter_phone,
          voice_blob: editingQueueItem.voice_blob || null,
        } as any);
        setCurrentStep(1);
        showToast("Đang sửa phản ánh từ hàng đợi");
        return;
      }

      // 3. Kiểm tra bản nháp chưa gửi của chính tài khoản hiện tại (ưu tiên IndexedDB đầy đủ Blob)
      const currentUid = getCurrentUserId();
      listUserDrafts(currentUid)
        .then((dbDrafts) => {
          if (dbDrafts && dbDrafts.length > 0) {
            const latest = dbDrafts[0];
            setPendingIndexedDraft(latest);
            setPendingDraft({
              formData: latest.formData,
              current_step: latest.current_step || 1,
              saved_at: latest.saved_at,
            });
            setDraftModalOpen(true);
          } else if (hasValidDraft(currentUid)) {
            const saved = loadDraft(currentUid);
            if (saved) {
              setPendingDraft(saved);
              setDraftModalOpen(true);
            }
          }
        })
        .catch(() => {
          if (hasValidDraft(currentUid)) {
            const saved = loadDraft(currentUid);
            if (saved) {
              setPendingDraft(saved);
              setDraftModalOpen(true);
            }
          }
        });
    }, [onRequireLogin, initialDraftId, editingQueueItem]);

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
        const currentUid = getCurrentUserId();
        // Tự động lưu nháp ngầm vào localStorage & IndexedDB theo user_id (R04, R18)
        saveDraft(next, currentStep, currentUid);
        saveDraftToDb({
          draft_id: `draft_${currentUid}`,
          user_id: currentUid,
          title: next.title || "Bản nháp phản ánh",
          formData: next,
          media_blobs: [],
          voice_blob: (next as any).voice_blob || null,
          saved_at: new Date().toISOString(),
          current_step: currentStep,
          updated_at: Date.now(),
        }).catch(() => {});
        return next;
      });
    };

    // Nút "Lưu nháp" thủ công (Màn 1)
    const handleManualSaveDraft = () => {
      const currentUid = getCurrentUserId();
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const mediaBlobs = (formData.media || []).map((m, idx) => ({
        client_file_id: m.id || `file_${idx}_${Date.now()}`,
        blob: m.file || new Blob([], { type: m.mime_type || "image/jpeg" }),
        name: m.file?.name || `media_${idx}.jpg`,
        media_type: (m.media_type as any) || "IMAGE",
        mime_type: m.mime_type || "image/jpeg",
        size: m.file_size_bytes || m.file?.size || 0,
        captured_at: new Date().toISOString(),
      }));

      saveDraftToDb({
        draft_id: draftId,
        user_id: currentUid,
        title: formData.title || "Bản nháp phản ánh",
        formData,
        media_blobs: mediaBlobs,
        voice_blob: (formData as any).voice_blob || null,
        saved_at: new Date().toISOString(),
        current_step: currentStep,
        updated_at: Date.now(),
      })
        .then(() => {
          setActiveDraftId(draftId);
          saveDraft(formData, currentStep, currentUid);
          showToast("Đã lưu nháp vào thiết bị thành công");
        })
        .catch((err) => {
          console.error("Lỗi khi lưu nháp:", err);
          showToast(err.message || "Không thể lưu nháp do bộ nhớ thiết bị đầy.");
        });
    };

  // Nạp bản nháp từ IndexedDB theo draft_id (R16), tái tạo File objects từ Blob
  const handleResumeIndexedDbDraft = async (draftId: string) => {
    try {
      const draft = await getDraftById(draftId);
      if (draft && draft.formData) {
        setActiveDraftId(draftId);
        const hydratedMedia = (draft.media_blobs && draft.media_blobs.length > 0)
          ? draft.media_blobs.map((m) => ({
              id: m.client_file_id,
              file: new File([m.blob], m.name, { type: m.mime_type }),
              preview_url: URL.createObjectURL(m.blob),
              file_url: "",
              thumbnail_url: "",
              media_type: (m.media_type === "VIDEO" ? "VIDEO" : "IMAGE") as "IMAGE" | "VIDEO",
              mime_type: m.mime_type,
              file_size_bytes: m.size,
            }))
          : (draft.formData.media || []);

        const resolvedLocation = draft.formData.location
          ? {
              ...draft.formData.location,
              is_within_hcmc: isCoordinatesInHCMC(
                draft.formData.location.latitude,
                draft.formData.location.longitude
              ),
            }
          : undefined;

        setFormData({
          ...draft.formData,
          location: resolvedLocation || draft.formData.location,
          media: hydratedMedia,
          voice_blob: draft.voice_blob || (draft.formData as any).voice_blob || null,
        } as any);
        setCurrentStep(draft.current_step || 1);
        setIsOutboxViewOpen(false);
        showToast("Đã mở lại bản nháp");
      }
    } catch (e) {
      console.warn("Không mở được bản nháp:", e);
    }
  };

  // Chấp nhận khôi phục bản nháp (ưu tiên dữ liệu IndexedDB có nhị phân Blob)
  const handleResumeDraft = () => {
    if (pendingIndexedDraft) {
      setActiveDraftId(pendingIndexedDraft.draft_id);
      const hydratedMedia = (pendingIndexedDraft.media_blobs && pendingIndexedDraft.media_blobs.length > 0)
        ? pendingIndexedDraft.media_blobs.map((m) => ({
            id: m.client_file_id,
            file: new File([m.blob], m.name, { type: m.mime_type }),
            preview_url: URL.createObjectURL(m.blob),
            file_url: "",
            thumbnail_url: "",
            media_type: (m.media_type === "VIDEO" ? "VIDEO" : "IMAGE") as "IMAGE" | "VIDEO",
            mime_type: m.mime_type,
            file_size_bytes: m.size,
          }))
        : (pendingIndexedDraft.formData.media || []);

      const resolvedLocation = pendingIndexedDraft.formData.location
        ? {
            ...pendingIndexedDraft.formData.location,
            is_within_hcmc: isCoordinatesInHCMC(
              pendingIndexedDraft.formData.location.latitude,
              pendingIndexedDraft.formData.location.longitude
            ),
          }
        : undefined;

      setFormData({
        ...pendingIndexedDraft.formData,
        location: resolvedLocation || pendingIndexedDraft.formData.location,
        media: hydratedMedia,
        voice_blob: pendingIndexedDraft.voice_blob || (pendingIndexedDraft.formData as any).voice_blob || null,
      } as any);
      setCurrentStep(pendingIndexedDraft.current_step || 1);
    } else if (pendingDraft) {
      const resolvedLocation = pendingDraft.formData.location
        ? {
            ...pendingDraft.formData.location,
            is_within_hcmc: isCoordinatesInHCMC(
              pendingDraft.formData.location.latitude,
              pendingDraft.formData.location.longitude
            ),
          }
        : undefined;
      setFormData({
        ...pendingDraft.formData,
        location: resolvedLocation || pendingDraft.formData.location,
      });
      setCurrentStep(pendingDraft.current_step);
    }
    setDraftModalOpen(false);
  };

  // Huỷ bỏ bản nháp và bắt đầu mới
  const handleDiscardDraft = async () => {
    const currentUid = getCurrentUserId();
    clearDraft(currentUid);
    const draftIdsToDelete = new Set<string>();
    if (activeDraftId) draftIdsToDelete.add(activeDraftId);
    if (pendingIndexedDraft?.draft_id) draftIdsToDelete.add(pendingIndexedDraft.draft_id);
    draftIdsToDelete.add(`draft_${currentUid}`);

    for (const did of draftIdsToDelete) {
      await deleteDraftFromDb(did).catch(() => {});
    }

    setActiveDraftId(null);
    setPendingIndexedDraft(null);
    setPendingDraft(null);
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setDraftModalOpen(false);
  };

  // Chuyển bước tiếp theo
  const handleNextStep = () => {
    if (currentStep < 5) {
      const next = (currentStep + 1) as ReportStep;
      setCurrentStep(next);
      saveDraft(formData, next, getCurrentUserId());
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

  if (isOutboxViewOpen) {
    return (
      <OfflineOutboxPage
        onBackToReport={() => setIsOutboxViewOpen(false)}
        onResumeDraft={handleResumeIndexedDbDraft}
      />
    );
  }

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
                editingQueueItemId={editingQueueItemId}
                onClearDraftAndReset={async () => {
                  const currentUid = getCurrentUserId();
                  clearDraft(currentUid);
                  const draftIdsToDelete = new Set<string>();
                  if (activeDraftId) draftIdsToDelete.add(activeDraftId);
                  if (pendingIndexedDraft?.draft_id) draftIdsToDelete.add(pendingIndexedDraft.draft_id);
                  draftIdsToDelete.add(`draft_${currentUid}`);

                  for (const did of draftIdsToDelete) {
                    await deleteDraftFromDb(did).catch(() => {});
                  }

                  setActiveDraftId(null);
                  setPendingIndexedDraft(null);
                  setPendingDraft(null);
                  setFormData(INITIAL_FORM_DATA);
                  setEditingQueueItemId(null);
                  onClearEditingItem?.();
                }}
                onSessionExpired={() => {
                  saveDraft(formData, currentStep, getCurrentUserId());
                  onRequireLogin("/report");
                }}
                onGoHome={() => onNavigateTab("map")}
                onTrackIncident={(_trackingCode) => {
                  // Chuyển sang bản đồ để xem chi tiết
                  onNavigateTab("map");
                }}
                onOpenOutbox={() => setIsOutboxViewOpen(true)}
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
