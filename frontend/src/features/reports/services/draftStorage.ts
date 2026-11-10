import type { DraftData, ReportFormData, ReportStep } from "../types/report.types";
import { getCurrentUserId } from "../../offline/services/offlineDb";

const BASE_DRAFT_KEY = "greenspot_incident_draft";

export const getScopedDraftKey = (userId?: string): string => {
  const uid = userId || getCurrentUserId();
  return `${BASE_DRAFT_KEY}_${uid}`;
};

export const saveDraft = (formData: ReportFormData, step: ReportStep, userId?: string): void => {
  try {
    const key = getScopedDraftKey(userId);
    const draft: DraftData = {
      formData: {
        ...formData,
        // Loại bỏ instance File không serialize được qua JSON
        media: formData.media.map(({ file, ...rest }) => rest),
      },
      saved_at: new Date().toISOString(),
      current_step: step,
    };
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.error("Lỗi khi lưu bản nháp vào localStorage:", error);
  }
};

export const loadDraft = (userId?: string): DraftData | null => {
  try {
    const key = getScopedDraftKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftData;
    // Kiểm tra tính hợp lệ cơ bản
    if (parsed && parsed.formData) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error("Lỗi khi đọc bản nháp từ localStorage:", error);
    return null;
  }
};

export const clearDraft = (userId?: string): void => {
  try {
    const key = getScopedDraftKey(userId);
    localStorage.removeItem(key);
    // Đồng thời xóa khóa cũ nếu còn tồn đọng
    localStorage.removeItem("greenspot_incident_draft_v1");
  } catch (error) {
    console.error("Lỗi khi xoá bản nháp:", error);
  }
};

export const hasValidDraft = (userId?: string): boolean => {
  const draft = loadDraft(userId);
  if (!draft) return false;
  // Có bản nháp nếu đã nhập tiêu đề, nội dung hoặc đã chọn loại sự cố
  const { title, description, category_id, media } = draft.formData;
  return Boolean(
    (title && title.trim().length > 0) ||
    (description && description.trim().length > 0) ||
    category_id !== null ||
    (media && media.length > 0)
  );
};
