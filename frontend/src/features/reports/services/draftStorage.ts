import type { DraftData, ReportFormData, ReportStep } from "../types/report.types";

const DRAFT_STORAGE_KEY = "greenspot_incident_draft_v1";

export const saveDraft = (formData: ReportFormData, step: ReportStep): void => {
  try {
    const draft: DraftData = {
      formData: {
        ...formData,
        // Loại bỏ instance File không serialize được qua JSON
        media: formData.media.map(({ file, ...rest }) => rest),
      },
      saved_at: new Date().toISOString(),
      current_step: step,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error("Lỗi khi lưu bản nháp vào localStorage:", error);
  }
};

export const loadDraft = (): DraftData | null => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
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

export const clearDraft = (): void => {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.error("Lỗi khi xoá bản nháp:", error);
  }
};

export const hasValidDraft = (): boolean => {
  const draft = loadDraft();
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

