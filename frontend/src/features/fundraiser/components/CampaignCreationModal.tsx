import React, { useState } from "react";
import type { FundraiserCampaignCreateInput } from "../types/fundraiser.types";
import { HCMC_DISTRICTS } from "../types/fundraiser.types";
import { fundraiserService } from "../services/fundraiserService";

interface CampaignCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pendingCampaignCount?: number;
}

export const CampaignCreationModal: React.FC<CampaignCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  pendingCampaignCount = 0,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [district, setDistrict] = useState("Quận 1");
  const [targetAmountRaw, setTargetAmountRaw] = useState("");
  const [endDate, setEndDate] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  if (!isOpen) return null;

  const isFormDirty =
    !!title.trim() ||
    !!description.trim() ||
    !!targetAmountRaw ||
    !!endDate ||
    !!bankAccountName.trim() ||
    !!bankAccountNumber.trim() ||
    !!coverImageUrl;

  const handleCancelClick = () => {
    if (isFormDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleTargetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setTargetAmountRaw("");
      return;
    }
    const num = parseInt(rawValue, 10);
    setTargetAmountRaw(new Intl.NumberFormat("vi-VN").format(num));
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        cover_image: "Ảnh không hợp lệ (chỉ nhận JPG, PNG, tối đa 5MB)",
      }));
      return;
    }

    try {
      setIsUploadingImage(true);
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.cover_image;
        return copy;
      });
      const res = await fundraiserService.uploadImage(file);
      setCoverImageUrl(res.url);
    } catch {
      // Fallback preview local nếu upload API chưa khởi động
      const localUrl = URL.createObjectURL(file);
      setCoverImageUrl(localUrl);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      newErrors.title = "Vui lòng nhập tên chiến dịch";
    } else if (trimmedTitle.length > 100) {
      newErrors.title = "Tên tối đa 100 ký tự";
    }

    if (!trimmedDesc) {
      newErrors.description = "Vui lòng nhập mô tả chiến dịch";
    } else if (trimmedDesc.length > 2000) {
      newErrors.description = "Mô tả tối đa 2000 ký tự";
    }

    const numericAmount = parseInt(targetAmountRaw.replace(/\D/g, ""), 10);
    if (!numericAmount || numericAmount <= 0) {
      newErrors.target_amount = "Mục tiêu phải là số lớn hơn 0";
    }

    if (!endDate) {
      newErrors.end_date = "Hạn chót phải từ ngày mai và tối đa 90 ngày";
    } else {
      const selected = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + 1);
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 90);

      if (selected < minDate || selected > maxDate) {
        newErrors.end_date = "Hạn chót phải từ ngày mai và tối đa 90 ngày";
      }
    }

    if (!bankAccountName.trim() || !bankAccountNumber.trim() || !bankName.trim()) {
      newErrors.bank_info = "Vui lòng nhập đầy đủ thông tin tài khoản nhận";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (pendingCampaignCount >= 3) {
      setGeneralError("Bạn đang có 3 chiến dịch chờ duyệt. Vui lòng đợi duyệt xong");
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    const numericAmount = parseInt(targetAmountRaw.replace(/\D/g, ""), 10);

    const payload: FundraiserCampaignCreateInput = {
      title: title.trim(),
      description: description.trim(),
      district,
      target_amount: numericAmount,
      end_date: endDate,
      cover_image_url:
        coverImageUrl ||
        "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      bank_account_name: bankAccountName.trim(),
      bank_account_number: bankAccountNumber.trim(),
      bank_name: bankName.trim(),
    };

    try {
      await fundraiserService.createCampaign(payload);
      onSuccess();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Không thể gửi chiến dịch. Vui lòng thử lại";
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || pendingCampaignCount >= 3;

  return (
    <div className="fund-modal-overlay" data-testid="campaign-creation-modal">
      <div className="fund-modal-box size-large">
        {/* HEADER */}
        <div className="modal-header">
          <div className="header-title-group">
            <span className="popup-badge">KHỞI TẠO CHIẾN DỊCH</span>
            <h2>Tạo Chiến Dịch Gây Quỹ Môi Trường</h2>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={handleCancelClick}
            data-testid="btn-close-create-modal"
          >
            ×
          </button>
        </div>

        {/* BODY (3 KHỐI THEO CHIỀU NGANG - MÀN 2) */}
        <form onSubmit={handleSubmit} className="modal-body" data-testid="create-campaign-form">
          {pendingCampaignCount >= 3 && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                marginBottom: "1.25rem",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
              data-testid="banner-pending-limit"
            >
              ⚠️ Bạn đang có 3 chiến dịch chờ duyệt. Vui lòng đợi duyệt xong
            </div>
          )}

          {generalError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                marginBottom: "1.25rem",
                fontSize: "0.875rem",
              }}
              data-testid="banner-general-error"
            >
              {generalError}
            </div>
          )}

          {/* KHỐI 1: THÔNG TIN CHUNG */}
          <div className="form-section-card">
            <h3 className="section-heading">📝 1. KHỐI THÔNG TIN</h3>

            <div className="form-group">
              <label htmlFor="create-title">
                Tên chiến dịch <span className="req">*</span>
              </label>
              <input
                id="create-title"
                type="text"
                placeholder="VD: Chung tay làm sạch kênh Nhiêu Lộc - Thị Nghè"
                value={title}
                maxLength={105}
                onChange={(e) => setTitle(e.target.value)}
                className={errors.title ? "has-error" : ""}
                data-testid="input-campaign-title"
              />
              <div className={`char-counter ${title.length > 100 ? "overflow" : ""}`}>
                {title.length}/100 ký tự
              </div>
              {errors.title && <div className="field-error-text">{errors.title}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="create-desc">
                Mô tả chi tiết mục đích gây quỹ <span className="req">*</span>
              </label>
              <textarea
                id="create-desc"
                rows={4}
                placeholder="Nêu rõ mục đích sử dụng quỹ, địa điểm triển khai, các hạng mục cần mua sắm và đối tượng thụ hưởng…"
                value={description}
                maxLength={2050}
                onChange={(e) => setDescription(e.target.value)}
                className={errors.description ? "has-error" : ""}
                data-testid="input-campaign-desc"
              />
              <div className={`char-counter ${description.length > 2000 ? "overflow" : ""}`}>
                {description.length}/2000 ký tự
              </div>
              {errors.description && (
                <div className="field-error-text">{errors.description}</div>
              )}
            </div>

            <div className="form-group">
              <label>Ảnh bìa đại diện chiến dịch (JPG, PNG, tối đa 5MB)</label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageFileChange}
                data-testid="input-campaign-cover-file"
              />
              {isUploadingImage && (
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
                  ⏳ Đang tải ảnh lên…
                </div>
              )}
              {errors.cover_image && (
                <div className="field-error-text">{errors.cover_image}</div>
              )}

              {coverImageUrl && (
                <div style={{ marginTop: "0.75rem", borderRadius: "8px", overflow: "hidden", maxHeight: "160px" }}>
                  <img
                    src={coverImageUrl}
                    alt="Xem trước ảnh bìa"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    data-testid="img-cover-preview"
                  />
                </div>
              )}
            </div>
          </div>

          {/* KHỐI 2: MỤC TIÊU & THỜI HẠN */}
          <div className="form-section-card">
            <h3 className="section-heading">🎯 2. KHỐI MỤC TIÊU</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label htmlFor="create-target">
                  Mục tiêu gây quỹ (VNĐ) <span className="req">*</span>
                </label>
                <input
                  id="create-target"
                  type="text"
                  placeholder="VD: 50.000.000"
                  value={targetAmountRaw}
                  onChange={handleTargetAmountChange}
                  className={errors.target_amount ? "has-error" : ""}
                  data-testid="input-campaign-target"
                />
                {errors.target_amount && (
                  <div className="field-error-text">{errors.target_amount}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="create-end-date">
                  Hạn chót (tối đa 90 ngày) <span className="req">*</span>
                </label>
                <input
                  id="create-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={errors.end_date ? "has-error" : ""}
                  data-testid="input-campaign-end-date"
                />
                {errors.end_date && (
                  <div className="field-error-text">{errors.end_date}</div>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "0.5rem" }}>
              <label htmlFor="create-district">
                Địa bàn triển khai (Quận/Huyện) <span className="req">*</span>
              </label>
              <select
                id="create-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                data-testid="select-campaign-district"
              >
                {HCMC_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KHỐI 3: TÀI KHOẢN NHẬN TIỀN (BẢO MẬT) */}
          <div className="form-section-card">
            <h3 className="section-heading">
              🔒 3. KHỐI TÀI KHOẢN NHẬN TIỀN{" "}
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>
                (Bảo mật: Chỉ Quản trị viên xem khi duyệt)
              </span>
            </h3>

            <div className="form-group">
              <label htmlFor="create-bank-name">
                Tên Ngân hàng <span className="req">*</span>
              </label>
              <input
                id="create-bank-name"
                type="text"
                placeholder="VD: Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                data-testid="input-bank-name"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label htmlFor="create-account-name">
                  Tên chủ tài khoản <span className="req">*</span>
                </label>
                <input
                  id="create-account-name"
                  type="text"
                  placeholder="VD: NGUYEN VAN A"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  data-testid="input-bank-account-name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-account-number">
                  Số tài khoản <span className="req">*</span>
                </label>
                <input
                  id="create-account-number"
                  type="text"
                  placeholder="VD: 1019283746"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  data-testid="input-bank-account-number"
                />
              </div>
            </div>

            {errors.bank_info && (
              <div className="field-error-text" style={{ marginTop: "0.5rem" }}>
                {errors.bank_info}
              </div>
            )}
          </div>

          {/* FOOTER NÚT THAO TÁC */}
          <div className="modal-footer" style={{ margin: "0 -1.5rem -1.5rem" }}>
            <div className="footer-actions-right">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCancelClick}
                disabled={isSubmitting}
                data-testid="btn-cancel-create"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-submit-primary"
                disabled={isSubmitDisabled}
                data-testid="btn-submit-create"
              >
                {isSubmitting ? "Đang gửi chiến dịch…" : "Đăng chiến dịch"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* POPUP XÁC NHẬN KHI BẤM HUỶ (MÀN 2) */}
      {showDiscardConfirm && (
        <div className="fund-modal-overlay" style={{ zIndex: 10002 }} data-testid="discard-confirm-modal">
          <div className="fund-modal-box size-small">
            <div className="modal-header">
              <div className="header-title-group">
                <span className="popup-badge" style={{ color: "#f59e0b" }}>
                  XÁC NHẬN
                </span>
                <h3>Bạn có thay đổi chưa lưu</h3>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: "#475569" }}>
                Bạn có thay đổi chưa lưu. Bạn muốn thoát?
              </p>
            </div>
            <div className="modal-footer">
              <div className="footer-actions-right">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowDiscardConfirm(false)}
                  data-testid="btn-stay"
                >
                  Ở lại
                </button>
                <button
                  type="button"
                  className="btn-delete-confirm"
                  style={{ background: "#dc2626" }}
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  data-testid="btn-discard-exit"
                >
                  Thoát
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

