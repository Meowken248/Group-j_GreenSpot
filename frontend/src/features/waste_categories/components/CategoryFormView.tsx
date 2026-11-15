import React, { useState, useMemo } from "react";
import type {
  WasteCategoryItem,
  WasteCategoryCreateRequest,
  WasteCategoryUpdateRequest,
  SeverityLevel,
} from "../types/wasteCategory.types";
import {
  checkCategoryCodeUnique,
  checkCategoryNameUnique,
} from "../services/wasteCategoryService";

interface Props {
  mode: "create" | "edit";
  initialItem?: WasteCategoryItem | null;
  onSaveCreate: (data: WasteCategoryCreateRequest) => Promise<void>;
  onSaveUpdate: (id: number, data: WasteCategoryUpdateRequest) => Promise<void>;
  onCancelRequest: (hasChanges: boolean) => void;
}

export const CategoryFormView: React.FC<Props> = ({
  mode,
  initialItem,
  onSaveCreate,
  onSaveUpdate,
  onCancelRequest,
}) => {
  const isEdit = mode === "edit";

  // Form State
  const [categoryCode, setCategoryCode] = useState<string>(
    initialItem?.category_code || ""
  );
  const [name, setName] = useState<string>(initialItem?.name || "");
  const [description, setDescription] = useState<string>(
    initialItem?.description || ""
  );
  const [slaHours, setSlaHours] = useState<string>(
    initialItem?.sla_hours?.toString() || "24"
  );
  const [defaultSeverity, setDefaultSeverity] = useState<SeverityLevel>(
    initialItem?.default_severity || "MEDIUM"
  );
  const [slaWarningHours, setSlaWarningHours] = useState<string>(
    initialItem?.sla_warning_hours?.toString() || "4"
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialItem ? initialItem.is_active : true
  );

  // Validation Errors
  const [codeError, setCodeError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);
  const [slaError, setSlaError] = useState<string | null>(null);
  const [warningError, setWarningError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check if form has changed (for Màn 3 button state and Cancel popup)
  const isDirty = useMemo(() => {
    if (!isEdit) {
      return (
        categoryCode.trim().length > 0 ||
        name.trim().length > 0 ||
        description.trim().length > 0 ||
        slaHours !== "24" ||
        defaultSeverity !== "MEDIUM" ||
        slaWarningHours !== "4"
      );
    }
    if (!initialItem) return false;
    return (
      name.trim() !== initialItem.name ||
      (description.trim() || null) !== (initialItem.description || null) ||
      slaHours !== initialItem.sla_hours.toString() ||
      defaultSeverity !== initialItem.default_severity ||
      slaWarningHours !== initialItem.sla_warning_hours.toString() ||
      isActive !== initialItem.is_active
    );
  }, [
    isEdit,
    initialItem,
    categoryCode,
    name,
    description,
    slaHours,
    defaultSeverity,
    slaWarningHours,
    isActive,
  ]);

  // Client Validation
  const validateForm = async (): Promise<boolean> => {
    let valid = true;

    // 1. Mã danh mục (chỉ khi tạo mới)
    if (!isEdit) {
      const codeVal = categoryCode.trim().toUpperCase();
      if (!codeVal) {
        setCodeError("Vui lòng nhập mã danh mục");
        valid = false;
      } else if (codeVal.length > 20 || !/^[A-Z0-9_]+$/.test(codeVal)) {
        setCodeError("Mã chỉ gồm chữ hoa, số, dấu gạch dưới (tối đa 20 ký tự)");
        valid = false;
      } else {
        try {
          const res = await checkCategoryCodeUnique(codeVal);
          if (!res.is_valid) {
            setCodeError(res.message || "Mã danh mục đã tồn tại");
            valid = false;
          } else {
            setCodeError(null);
          }
        } catch {
          // bỏ qua nếu lỗi mạng, backend sẽ validate lại
        }
      }
    }

    // 2. Tên loại rác
    const nameVal = name.trim();
    if (!nameVal) {
      setNameError("Vui lòng nhập tên loại rác");
      valid = false;
    } else if (nameVal.length > 100) {
      setNameError("Tên tối đa 100 ký tự");
      valid = false;
    } else {
      try {
        const res = await checkCategoryNameUnique(
          nameVal,
          isEdit ? initialItem?.category_id : undefined
        );
        if (!res.is_valid) {
          setNameError(res.message || "Tên loại rác đã tồn tại");
          valid = false;
        } else {
          setNameError(null);
        }
      } catch {
        // bỏ qua nếu lỗi mạng
      }
    }

    // 3. Mô tả
    if (description.length > 500) {
      setDescError("Mô tả tối đa 500 ký tự");
      valid = false;
    } else {
      setDescError(null);
    }

    // 4. SLA (giờ)
    const slaNum = parseInt(slaHours, 10);
    if (isNaN(slaNum) || slaNum < 1 || slaNum > 720) {
      setSlaError("Thời hạn SLA phải là số nguyên từ 1 đến 720 giờ");
      valid = false;
    } else {
      setSlaError(null);
    }

    // 5. Cảnh báo trước hạn
    const warnNum = parseInt(slaWarningHours, 10);
    if (isNaN(warnNum) || warnNum < 0) {
      setWarningError("Cảnh báo trước hạn phải là số nguyên không âm");
      valid = false;
    } else if (!isNaN(slaNum) && warnNum >= slaNum) {
      setWarningError("Thời gian cảnh báo phải nhỏ hơn thời hạn SLA");
      valid = false;
    } else {
      setWarningError(null);
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const isValid = await validateForm();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      if (!isEdit) {
        await onSaveCreate({
          category_code: categoryCode.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          default_severity: defaultSeverity,
          sla_hours: parseInt(slaHours, 10),
          sla_warning_hours: parseInt(slaWarningHours, 10),
        });
      } else if (initialItem) {
        await onSaveUpdate(initialItem.category_id, {
          name: name.trim(),
          description: description.trim() || undefined,
          default_severity: defaultSeverity,
          sla_hours: parseInt(slaHours, 10),
          sla_warning_hours: parseInt(slaWarningHours, 10),
          is_active: isActive,
        });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        (isEdit
          ? "Không thể cập nhật danh mục. Vui lòng thử lại"
          : "Không thể lưu danh mục. Vui lòng thử lại");
      setServerError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="category-form-layout">
      {/* KHỐI 1: THÔNG TIN CHUNG */}
      <div className="category-col-panel form-col-general">
        <div className="panel-header">
          <h3 className="panel-title">THÔNG TIN CHUNG</h3>
          <span className="panel-subtitle">Định danh loại rác thải</span>
        </div>

        <div className="panel-body">
          {/* Ô MÃ DANH MỤC */}
          <div className="form-group">
            <label className="field-label" htmlFor="input-category-code">
              Mã danh mục <span className="text-req">*</span>:
            </label>
            <div className="input-with-icon">
              <input
                id="input-category-code"
                type="text"
                className={`custom-input ${codeError ? "input-error" : ""} ${
                  isEdit ? "input-readonly" : ""
                }`}
                placeholder="VD: DOMESTIC_WASTE"
                value={categoryCode}
                onChange={(e) => {
                  setCategoryCode(e.target.value.toUpperCase());
                  if (codeError) setCodeError(null);
                }}
                maxLength={20}
                readOnly={isEdit}
                disabled={isSubmitting}
              />
              {isEdit && <span className="lock-icon" title="Mã danh mục không thể sửa">🔒</span>}
            </div>
            {codeError ? (
              <span className="error-text">{codeError}</span>
            ) : (
              <span className="field-hint">
                {isEdit
                  ? "Mã danh mục chỉ đọc để bảo toàn liên kết dữ liệu cũ."
                  : "Tối đa 20 ký tự (chữ hoa, số, dấu gạch dưới)."}
              </span>
            )}
          </div>

          {/* Ô TÊN LOẠI RÁC */}
          <div className="form-group">
            <div className="label-with-counter">
              <label className="field-label" htmlFor="input-category-name">
                Tên loại rác <span className="text-req">*</span>:
              </label>
              <span
                className={`char-counter ${name.length > 100 ? "over-limit" : ""}`}
              >
                {name.length}/100
              </span>
            </div>
            <input
              id="input-category-name"
              type="text"
              className={`custom-input ${nameError ? "input-error" : ""}`}
              placeholder="VD: Rác thải sinh hoạt ứ đọng"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              maxLength={105}
              disabled={isSubmitting}
            />
            {nameError && <span className="error-text">{nameError}</span>}
          </div>

          {/* Ô MÔ TẢ */}
          <div className="form-group">
            <div className="label-with-counter">
              <label className="field-label" htmlFor="input-category-desc">
                Mô tả:
              </label>
              <span
                className={`char-counter ${
                  description.length > 500 ? "over-limit" : ""
                }`}
              >
                {description.length}/500
              </span>
            </div>
            <textarea
              id="input-category-desc"
              className={`custom-textarea ${descError ? "input-error" : ""}`}
              placeholder="Mô tả đặc điểm nhận diện, dấu hiệu tại hiện trường..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (descError) setDescError(null);
              }}
              rows={5}
              disabled={isSubmitting}
            />
            {descError && <span className="error-text">{descError}</span>}
          </div>
        </div>
      </div>

      {/* KHỐI 2: CẤU HÌNH */}
      <div className="category-col-panel form-col-config">
        <div className="panel-header">
          <h3 className="panel-title">CẤU HÌNH</h3>
          <span className="panel-subtitle">Quy chuẩn SLA & Mức ưu tiên</span>
        </div>

        <div className="panel-body">
          {/* THỜI HẠN XỬ LÝ SLA (GIỜ) */}
          <div className="form-group">
            <label className="field-label" htmlFor="input-sla-hours">
              Thời hạn xử lý SLA (giờ) <span className="text-req">*</span>:
            </label>
            <div className="input-unit-wrapper">
              <input
                id="input-sla-hours"
                type="number"
                min={1}
                max={720}
                className={`custom-input ${slaError ? "input-error" : ""}`}
                value={slaHours}
                onChange={(e) => {
                  setSlaHours(e.target.value);
                  if (slaError) setSlaError(null);
                }}
                disabled={isSubmitting}
              />
              <span className="unit-badge">giờ</span>
            </div>
            {slaError ? (
              <span className="error-text">{slaError}</span>
            ) : (
              <span className="field-hint">Số nguyên từ 1 đến 720 giờ (tối đa 30 ngày).</span>
            )}
          </div>

          {/* MỨC ƯU TIÊN */}
          <div className="form-group">
            <label className="field-label">
              Mức ưu tiên <span className="text-req">*</span>:
            </label>
            <div className="priority-select-cards">
              <button
                type="button"
                className={`priority-card card-low ${
                  defaultSeverity === "LOW" ? "selected" : ""
                }`}
                onClick={() => setDefaultSeverity("LOW")}
                disabled={isSubmitting}
              >
                <span className="p-icon">🟢</span>
                <span className="p-name">Thấp</span>
              </button>

              <button
                type="button"
                className={`priority-card card-medium ${
                  defaultSeverity === "MEDIUM" ? "selected" : ""
                }`}
                onClick={() => setDefaultSeverity("MEDIUM")}
                disabled={isSubmitting}
              >
                <span className="p-icon">🟡</span>
                <span className="p-name">Trung bình</span>
              </button>

              <button
                type="button"
                className={`priority-card card-high ${
                  defaultSeverity === "HIGH" ? "selected" : ""
                }`}
                onClick={() => setDefaultSeverity("HIGH")}
                disabled={isSubmitting}
              >
                <span className="p-icon">⚠️</span>
                <span className="p-name">Cao</span>
              </button>

              <button
                type="button"
                className={`priority-card card-critical ${
                  defaultSeverity === "CRITICAL" ? "selected" : ""
                }`}
                onClick={() => setDefaultSeverity("CRITICAL")}
                disabled={isSubmitting}
              >
                <span className="p-icon">🚨</span>
                <span className="p-name">Khẩn cấp</span>
              </button>
            </div>
          </div>

          {/* CẢNH BÁO TRƯỚC HẠN (GIỜ) */}
          <div className="form-group">
            <label className="field-label" htmlFor="input-sla-warning">
              Cảnh báo trước hạn (giờ) <span className="text-req">*</span>:
            </label>
            <div className="input-unit-wrapper">
              <input
                id="input-sla-warning"
                type="number"
                min={0}
                className={`custom-input ${warningError ? "input-error" : ""}`}
                value={slaWarningHours}
                onChange={(e) => {
                  setSlaWarningHours(e.target.value);
                  if (warningError) setWarningError(null);
                }}
                disabled={isSubmitting}
              />
              <span className="unit-badge">giờ</span>
            </div>
            {warningError ? (
              <span className="error-text">{warningError}</span>
            ) : (
              <span className="field-hint">Hệ thống gửi cảnh báo trước khi hết hạn SLA. Phải nhỏ hơn SLA.</span>
            )}
          </div>

          {/* MÀN 3: CÔNG TẮC TRẠNG THÁI */}
          {isEdit && (
            <div className="form-group status-toggle-group">
              <label className="field-label">Trạng thái áp dụng:</label>
              <div className="toggle-container">
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span className="slider round" />
                </label>
                <span className={`toggle-label-text ${isActive ? "active-txt" : "inactive-txt"}`}>
                  {isActive ? "Đang áp dụng" : "Ngưng áp dụng"}
                </span>
              </div>

              {/* DÒNG CẢNH BÁO MÀU VÀNG NẾU NGƯNG ÁP DỤNG MÀ CÓ PHẢN ÁNH CHƯA XỬ LÝ */}
              {!isActive && initialItem && initialItem.unresolved_incidents_count > 0 && (
                <div className="warning-callout-box">
                  <span className="callout-icon">⚠️</span>
                  <span className="callout-text">
                    Danh mục đang có <strong>{initialItem.unresolved_incidents_count}</strong> phản ánh chưa xử lý. Các phản ánh này vẫn giữ nguyên hạn xử lý.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KHỐI 3: LƯU */}
      <div className="category-col-panel form-col-save">
        <div className="panel-header">
          <h3 className="panel-title">LƯU</h3>
          <span className="panel-subtitle">Xác nhận thao tác</span>
        </div>

        <div className="panel-body save-body">
          {/* DÒNG THÔNG BÁO LỖI TỔNG THỂ */}
          {serverError && (
            <div className="server-error-banner">
              <span>{serverError}</span>
            </div>
          )}

          <div className="save-actions-stack">
            <button
              type="button"
              className={`btn-save-submit ${
                isEdit && !isDirty ? "btn-disabled-clean" : ""
              }`}
              onClick={handleSubmit}
              disabled={isSubmitting || (isEdit && !isDirty)}
            >
              {isSubmitting ? (
                <span>{isEdit ? "Đang cập nhật…" : "Đang lưu danh mục…"}</span>
              ) : (
                <span>{isEdit ? "Cập nhật" : "Lưu"}</span>
              )}
            </button>

            <button
              type="button"
              className="btn-cancel-form"
              onClick={() => onCancelRequest(isDirty)}
              disabled={isSubmitting}
            >
              Huỷ
            </button>
          </div>

          <div className="save-instruction-note">
            <p>
              ℹ️ <strong>Quy tắc hệ thống:</strong> Quy chuẩn SLA chỉ áp dụng cho các phản ánh được tạo sau khi lưu, không làm thay đổi thời hạn của các phản ánh đã ghi nhận trước đó.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
