import React, { useState } from "react";
import type {
  ReportFormData,
  WasteCategoryItem,
  IncidentSeverity,
} from "../types/report.types";

interface Step1Props {
  formData: ReportFormData;
  categories: WasteCategoryItem[];
  onUpdateFormData: (updates: Partial<ReportFormData>) => void;
  onNextStep: () => void;
  onSaveDraft: () => void;
}

interface CategoryCardDef {
  key: string;
  name: string;
  icon: string;
  desc: string;
  matchingCodes: string[];
}

const FOUR_CATEGORIES: CategoryCardDef[] = [
  {
    key: "WASTE",
    name: "Rác thải",
    icon: "🗑️",
    desc: "Rác sinh hoạt ứ đọng, xà bần, phế thải công cộng",
    matchingCodes: ["DOMESTIC_WASTE", "CONSTRUCTION_DEBRIS", "HAZARDOUS_WASTE"],
  },
  {
    key: "FLOOD",
    name: "Ngập úng",
    icon: "🌊",
    desc: "Điểm nghẽn hố ga cống rãnh, ngập nước triều cường",
    matchingCodes: ["DRAINAGE_BLOCK"],
  },
  {
    key: "POLLUTION",
    name: "Ô nhiễm",
    icon: "⚠️",
    desc: "Ô nhiễm kênh rạch nguồn nước, mùi hôi khí thải độc hại",
    matchingCodes: ["WATERWAY_POLLUTION"],
  },
  {
    key: "OTHER",
    name: "Khác",
    icon: "❓",
    desc: "Sự cố môi trường đô thị khác chưa được phân loại",
    matchingCodes: ["OTHER"],
  },
];

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string; badgeClass: string }[] = [
  { value: "MEDIUM", label: "Bình thường", badgeClass: "severity-normal" },
  { value: "HIGH", label: "Cao", badgeClass: "severity-high" },
  { value: "CRITICAL", label: "Khẩn cấp", badgeClass: "severity-critical" },
];

export const Step1CategoryAndDesc: React.FC<Step1Props> = ({
  formData,
  categories,
  onUpdateFormData,
  onNextStep,
  onSaveDraft,
}) => {
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>(() => {
    if (formData.category_code) {
      const found = FOUR_CATEGORIES.find((c) =>
        c.matchingCodes.includes(formData.category_code) || c.key === formData.category_code
      );
      if (found) return found.key;
    }
    return "";
  });

  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);

  // Giới hạn ký tự
  const titleLen = formData.title.length;
  const descLen = formData.description.length;
  const isTitleOver = titleLen > 100;
  const isDescOver = descLen > 500;

  // Xử lý chọn 1 trong 4 thẻ lớn
  const handleSelectCategory = (card: CategoryCardDef) => {
    setSelectedCategoryKey(card.key);
    setCategoryError(null);

    // Tìm danh mục tương ứng từ database để lấy SLA và category_id thật
    let matchedDbCat = categories.find((c) => card.matchingCodes.includes(c.category_code));
    if (!matchedDbCat && categories.length > 0) {
      matchedDbCat = categories[0];
    }

    if (matchedDbCat) {
      onUpdateFormData({
        category_id: matchedDbCat.category_id,
        category_code: matchedDbCat.category_code,
        category_name: card.name,
      });
    } else {
      onUpdateFormData({
        category_id: 1,
        category_code: card.key,
        category_name: card.name,
      });
    }

    // Nếu chuyển sang thẻ khác và trước đó có lỗi 'Khác', xóa lỗi
    if (card.key !== "OTHER") {
      setDescError(null);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onUpdateFormData({ title: val });
    if (val.trim().length > 0) {
      if (val.length > 100) {
        setTitleError("Tiêu đề tối đa 100 ký tự");
      } else {
        setTitleError(null);
      }
    }
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onUpdateFormData({ description: val });
    if (val.length > 500) {
      setDescError("Nội dung tối đa 500 ký tự");
    } else if (selectedCategoryKey === "OTHER" && val.trim().length === 0) {
      setDescError("Vui lòng mô tả sự cố khi chọn loại Khác");
    } else {
      setDescError(null);
    }
  };

  // Kiểm tra tính hợp lệ trước khi chuyển sang Bước 2
  const validateAndProceed = () => {
    let hasError = false;

    // 1. Kiểm tra loại sự cố
    if (!selectedCategoryKey || !formData.category_id) {
      setCategoryError("Vui lòng chọn loại sự cố");
      hasError = true;
    } else {
      setCategoryError(null);
    }

    // 2. Kiểm tra tiêu đề
    if (!formData.title || formData.title.trim().length === 0) {
      setTitleError("Vui lòng nhập tiêu đề");
      hasError = true;
    } else if (formData.title.length > 100) {
      setTitleError("Tiêu đề tối đa 100 ký tự");
      hasError = true;
    } else {
      setTitleError(null);
    }

    // 3. Ràng buộc: Chọn "Khác" thì bắt buộc nhập mô tả
    if (selectedCategoryKey === "OTHER" && (!formData.description || formData.description.trim().length === 0)) {
      setDescError("Vui lòng mô tả sự cố khi chọn loại Khác");
      hasError = true;
    } else if (formData.description.length > 500) {
      setDescError("Nội dung tối đa 500 ký tự");
      hasError = true;
    }

    if (!hasError) {
      onNextStep();
    }
  };

  // Điều kiện enable nút Tiếp tục: Đã chọn loại và có tiêu đề hợp lệ và không vượt ký tự
  const isContinueDisabled =
    !selectedCategoryKey ||
    formData.title.trim().length === 0 ||
    isTitleOver ||
    isDescOver ||
    (selectedCategoryKey === "OTHER" && formData.description.trim().length === 0);

  return (
    <div className="report-step-content step-1-container">
      <div className="step-header">
        <h2 className="step-title">1. Phân loại sự cố & Mô tả ban đầu</h2>
        <p className="step-subtitle">
          Vui lòng chọn loại sự cố và nhập mô tả để hệ thống phân tuyến đúng đơn vị xử lý và áp dụng thời hạn cam kết (SLA).
        </p>
      </div>

      {/* KHUNG CHỌN LOẠI SỰ CỐ */}
      <div className="section-card category-section">
        <div className="section-heading">
          <label className="section-label">
            Chọn loại sự cố môi trường <span className="required">*</span>
          </label>
          {categoryError && <div className="inline-error-banner">{categoryError}</div>}
        </div>

        <div className="category-grid">
          {FOUR_CATEGORIES.map((cat) => {
            const isSelected = selectedCategoryKey === cat.key;
            return (
              <div
                key={cat.key}
                className={`category-card ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelectCategory(cat)}
                role="button"
                tabIndex={0}
              >
                <div className="cat-icon-wrapper">
                  <span className="cat-emoji">{cat.icon}</span>
                </div>
                <div className="cat-info">
                  <h3 className="cat-name">{cat.name}</h3>
                  <p className="cat-desc">{cat.desc}</p>
                </div>
                <div className="cat-radio-indicator">
                  <div className={`radio-circle ${isSelected ? "checked" : ""}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KHUNG MÔ TẢ */}
      <div className="section-card description-section">
        {/* Ô TIÊU ĐỀ */}
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="report-title" className="field-label">
              Tiêu đề sự cố <span className="required">*</span>
            </label>
            <span className={`char-counter ${isTitleOver ? "counter-error" : ""}`}>
              {titleLen}/100
            </span>
          </div>
          <input
            id="report-title"
            type="text"
            className={`form-input ${titleError || isTitleOver ? "input-error" : ""}`}
            placeholder="Ví dụ: Bãi rác tự phát bốc mùi gần trường học, nắp cống bị vỡ..."
            value={formData.title}
            onChange={handleTitleChange}
            maxLength={110}
          />
          {titleError && <p className="field-error-text">{titleError}</p>}
        </div>

        {/* Ô NỘI DUNG */}
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="report-desc" className="field-label">
              Nội dung mô tả chi tiết {selectedCategoryKey === "OTHER" && <span className="required">*</span>}
            </label>
            <span className={`char-counter ${isDescOver ? "counter-error" : ""}`}>
              {descLen}/500
            </span>
          </div>
          <textarea
            id="report-desc"
            rows={4}
            className={`form-textarea ${descError || isDescOver ? "input-error" : ""}`}
            placeholder={
              selectedCategoryKey === "OTHER"
                ? "Bắt buộc nhập mô tả chi tiết khi chọn loại sự cố Khác..."
                : "Mô tả cụ thể hiện trạng, thời điểm xảy ra sự cố và mức độ ảnh hưởng đến khu vực xung quanh..."
            }
            value={formData.description}
            onChange={handleDescChange}
            maxLength={520}
          />
          {descError && <p className="field-error-text">{descError}</p>}
        </div>

        {/* MỨC KHẨN CẤP */}
        <div className="form-group">
          <label className="field-label">Mức độ khẩn cấp</label>
          <div className="severity-options-row">
            {SEVERITY_OPTIONS.map((opt) => {
              const isChosen = formData.severity === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`severity-pill ${opt.badgeClass} ${isChosen ? "active" : ""}`}
                  onClick={() => onUpdateFormData({ severity: opt.value })}
                >
                  <span className="dot" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KHUNG ĐIỀU HƯỚNG */}
      <div className="navigation-actions-bar">
        <button
          type="button"
          className="btn-secondary btn-save-draft"
          onClick={onSaveDraft}
        >
          💾 Lưu nháp
        </button>

        <button
          type="button"
          className={`btn-primary btn-continue ${isContinueDisabled ? "btn-disabled" : ""}`}
          onClick={validateAndProceed}
          disabled={isContinueDisabled}
        >
          Tiếp tục →
        </button>
      </div>
    </div>
  );
};
