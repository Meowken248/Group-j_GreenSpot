import { describe, it, expect, beforeEach } from "vitest";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  hasValidDraft,
} from "../services/draftStorage";
import { INITIAL_FORM_DATA } from "../types/report.types";

describe("draftStorage - Quản lý bản nháp phản ánh sự cố", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("trả về false và null khi chưa có bản nháp", () => {
    expect(hasValidDraft()).toBe(false);
    expect(loadDraft()).toBeNull();
  });

  it("lưu và đọc bản nháp thành công", () => {
    const testData = {
      ...INITIAL_FORM_DATA,
      title: "Bãi rác tự phát bốc mùi",
      description: "Đoạn đường Nguyễn Thị Minh Khai",
      category_id: 1,
      category_code: "DOMESTIC_WASTE",
      category_name: "Rác thải",
    };

    saveDraft(testData, 1);
    expect(hasValidDraft()).toBe(true);

    const loaded = loadDraft();
    expect(loaded).not.toBeNull();
    expect(loaded?.formData.title).toBe("Bãi rác tự phát bốc mùi");
    expect(loaded?.current_step).toBe(1);
  });

  it("xoá bản nháp thành công khi hoàn tất", () => {
    const testData = {
      ...INITIAL_FORM_DATA,
      title: "Ngập úng đường Võ Văn Ngân",
      category_id: 2,
    };

    saveDraft(testData, 2);
    expect(hasValidDraft()).toBe(true);

    clearDraft();
    expect(hasValidDraft()).toBe(false);
    expect(loadDraft()).toBeNull();
  });
});

