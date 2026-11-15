import React, { useState, useEffect } from "react";
import type { GroupType, GroupPrivacy, CreateGroupPayload, AdministrativeMetadata } from "../types/group";
import { groupService } from "../services/groupService";

interface CreateGroupFormProps {
  groupType: GroupType;
  metadata: AdministrativeMetadata;
  userDistrict?: string | null;
  onCancel: () => void;
  onSuccess: (createdGroup: any) => void;
}

export const CreateGroupForm: React.FC<CreateGroupFormProps> = ({
  groupType,
  metadata,
  userDistrict,
  onCancel,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const defaultProvince =
    metadata.provinces && metadata.provinces.length > 0
      ? metadata.provinces[0]
      : "Thành phố Hồ Chí Minh";
  const [province, setProvince] = useState<string>(defaultProvince);

  const availableDistricts =
    metadata.districts_by_province && metadata.districts_by_province[province]
      ? metadata.districts_by_province[province]
      : metadata.districts || [];

  const [district, setDistrict] = useState<string>(
    userDistrict && availableDistricts.includes(userDistrict)
      ? userDistrict
      : availableDistricts[0] || ""
  );

  const availableWards =
    metadata.wards_by_district && metadata.wards_by_district[district]
      ? metadata.wards_by_district[district]
      : [];

  const [ward, setWard] = useState<string>(availableWards[0] || "");
  const [themeTopic, setThemeTopic] = useState(metadata.theme_topics[0] || "");
  const [privacy, setPrivacy] = useState<GroupPrivacy>("PUBLIC");

  const [coverImageUrl, setCoverImageUrl] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    description?: string;
    scope?: string;
    cover?: string;
    general?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Khi thay đổi Tỉnh / Thành phố, tự động chọn Quận / Huyện đầu tiên của tỉnh đó
  useEffect(() => {
    if (groupType !== "THEME") {
      const districtsForProv =
        metadata.districts_by_province && metadata.districts_by_province[province]
          ? metadata.districts_by_province[province]
          : metadata.districts || [];
      if (!districtsForProv.includes(district)) {
        setDistrict(districtsForProv[0] || "");
      }
    }
  }, [province, metadata.districts_by_province, metadata.districts, groupType, district]);

  // Khi thay đổi quận, reset phường
  useEffect(() => {
    if (groupType === "WARD" && district) {
      const wardsForDist = metadata.wards_by_district[district] || [];
      setWard(wardsForDist[0] || "");
    }
  }, [district, groupType, metadata.wards_by_district]);

  // Kiểm tra form dirty (đã nhập dữ liệu chưa)
  const isDirty = Boolean(
    name.trim() ||
    description.trim() ||
    coverFile ||
    coverPreview ||
    (groupType === "THEME" && themeTopic !== metadata.theme_topics[0])
  );

  const handleCancelClick = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onCancel();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng theo SRS: chỉ nhận JPG, PNG (tối đa 5MB)
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        cover: "Ảnh không hợp lệ (chỉ nhận JPG, PNG, tối đa 5MB)",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        cover: "Ảnh không hợp lệ (chỉ nhận JPG, PNG, tối đa 5MB)",
      }));
      return;
    }

    setFieldErrors((prev) => ({ ...prev, cover: undefined }));
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));

    // Upload ngay hoặc upload khi submit
    try {
      const uploadRes = await groupService.uploadCover(file);
      setCoverImageUrl(uploadRes.url);
    } catch (err: any) {
      setFieldErrors((prev) => ({
        ...prev,
        cover: err.response?.data?.detail || "Không thể tải lên ảnh bìa",
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) {
      errors.name = "Vui lòng nhập tên nhóm";
    } else if (name.trim().length > 50) {
      errors.name = "Tên nhóm tối đa 50 ký tự";
    }

    if (description.trim().length > 300) {
      errors.description = "Mô tả tối đa 300 ký tự";
    }

    if (groupType === "DISTRICT" && (!province || !district)) {
      errors.scope = "Vui lòng chọn Tỉnh/Thành phố và Quận/Huyện cho nhóm";
    } else if (groupType === "WARD" && (!province || !district || !ward)) {
      errors.scope = "Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện và Phường/Xã cho nhóm";
    } else if (groupType === "THEME" && !themeTopic) {
      errors.scope = "Vui lòng chọn phạm vi cho nhóm";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setFieldErrors({});

    const payload: CreateGroupPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      group_type: groupType,
      province: groupType !== "THEME" ? province : undefined,
      district: groupType !== "THEME" ? district : undefined,
      ward: groupType === "WARD" ? ward : undefined,
      theme_topic: groupType === "THEME" ? themeTopic : undefined,
      privacy: privacy,
      cover_image_url: coverImageUrl || undefined,
      avatar_url: coverImageUrl || undefined,
    };

    try {
      const created = await groupService.createGroup(payload);
      setIsSubmitting(false);
      onSuccess(created);
    } catch (err: any) {
      setIsSubmitting(false);
      const detail = err.response?.data?.detail || "Không thể tạo nhóm. Vui lòng thử lại";

      if (detail.includes("tên nhóm") || detail.includes("Tên nhóm")) {
        setFieldErrors((prev) => ({ ...prev, name: detail }));
      } else if (detail.includes("phạm vi")) {
        setFieldErrors((prev) => ({ ...prev, scope: detail }));
      } else {
        setFieldErrors((prev) => ({ ...prev, general: detail }));
      }
    }
  };

  return (
    <div className="create-form-wrapper" data-testid="create-group-form">
      <div className="form-header-bar">
        <h2>TẠO NHÓM MỚI</h2>
        <div className="selected-badge">
          <span>{groupType === "DISTRICT" ? "🏘️ Theo quận" : groupType === "WARD" ? "🏡 Theo phường" : "🌿 Theo chủ đề"}</span>
        </div>
      </div>

      {fieldErrors.general && (
        <div className="limit-warning-banner" data-testid="form-general-error">
          <span>⚠️</span>
          <span>{fieldErrors.general}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid-sections">
          {/* KHỐI 1: THÔNG TIN */}
          <div className="form-section">
            <div className="section-heading">Thông tin nhóm</div>

            <div className="form-field">
              <label htmlFor="group-name-input">
                Tên nhóm <span className="required">*</span>
              </label>
              <input
                id="group-name-input"
                data-testid="input-group-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Ví dụ: Nhóm Tình Nguyện Xanh..."
                className={fieldErrors.name ? "error" : ""}
                disabled={isSubmitting}
                maxLength={60}
              />
              <div className={`char-counter ${name.length > 50 ? "danger" : ""}`}>
                {name.length}/50 ký tự
              </div>
              {fieldErrors.name && (
                <div className="field-error-msg" data-testid="error-group-name">
                  <span>⚠️</span> {fieldErrors.name}
                </div>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="group-desc-input">Mô tả nhóm</label>
              <textarea
                id="group-desc-input"
                data-testid="textarea-group-desc"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: undefined }));
                }}
                rows={3}
                placeholder="Mô tả mục tiêu hoạt động, quy định chung của nhóm..."
                className={fieldErrors.description ? "error" : ""}
                disabled={isSubmitting}
                maxLength={350}
              />
              <div className={`char-counter ${description.length > 300 ? "danger" : ""}`}>
                {description.length}/300 ký tự
              </div>
              {fieldErrors.description && (
                <div className="field-error-msg" data-testid="error-group-desc">
                  <span>⚠️</span> {fieldErrors.description}
                </div>
              )}
            </div>

            <div className="form-field">
              <label>Ảnh bìa nhóm (JPG, PNG, tối đa 5MB)</label>
              <label className="cover-upload-box" htmlFor="cover-file-input">
                {coverPreview ? (
                  <img src={coverPreview} alt="Ảnh bìa xem trước" className="preview-image" />
                ) : (
                  <div className="upload-prompt">
                    <div className="upload-icon">📸</div>
                    <div>Nhấp để chọn ảnh bìa cho nhóm</div>
                  </div>
                )}
                <input
                  id="cover-file-input"
                  data-testid="input-cover-file"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  disabled={isSubmitting}
                />
              </label>
              {fieldErrors.cover && (
                <div className="field-error-msg" data-testid="error-cover-file">
                  <span>⚠️</span> {fieldErrors.cover}
                </div>
              )}
            </div>
          </div>

          {/* KHỐI 2: PHẠM VI & QUYỀN RIÊNG TƯ */}
          <div className="form-section">
            <div className="section-heading">Phạm vi hoạt động</div>

            {groupType === "DISTRICT" && (
              <>
                <div className="form-field">
                  <label htmlFor="province-select">
                    Chọn Tỉnh / Thành phố <span className="required">*</span>
                  </label>
                  <select
                    id="province-select"
                    data-testid="select-province"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {(metadata.provinces || ["Thành phố Hồ Chí Minh"]).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="district-select">
                    Chọn Quận / Huyện <span className="required">*</span>
                  </label>
                  <select
                    id="district-select"
                    data-testid="select-district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {groupType === "WARD" && (
              <>
                <div className="form-field">
                  <label htmlFor="ward-province-select">
                    Chọn Tỉnh / Thành phố <span className="required">*</span>
                  </label>
                  <select
                    id="ward-province-select"
                    data-testid="select-ward-province"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {(metadata.provinces || ["Thành phố Hồ Chí Minh"]).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="ward-district-select">
                    Chọn Quận / Huyện <span className="required">*</span>
                  </label>
                  <select
                    id="ward-district-select"
                    data-testid="select-ward-district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="ward-select">
                    Chọn Phường / Xã <span className="required">*</span>
                  </label>
                  <select
                    id="ward-select"
                    data-testid="select-ward"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {availableWards.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {groupType === "THEME" && (
              <div className="form-field">
                <label htmlFor="theme-topic-select">
                  Chọn Chủ đề môi trường <span className="required">*</span>
                </label>
                <select
                  id="theme-topic-select"
                  data-testid="select-theme-topic"
                  value={themeTopic}
                  onChange={(e) => setThemeTopic(e.target.value)}
                  disabled={isSubmitting}
                >
                  {metadata.theme_topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {fieldErrors.scope && (
              <div className="field-error-msg" data-testid="error-group-scope">
                <span>⚠️</span> {fieldErrors.scope}
              </div>
            )}

            <div className="form-field" style={{ marginTop: 24 }}>
              <label>Quyền riêng tư</label>
              <div className="privacy-options">
                <label className={`radio-label ${privacy === "PUBLIC" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="privacy"
                    value="PUBLIC"
                    checked={privacy === "PUBLIC"}
                    onChange={() => setPrivacy("PUBLIC")}
                    disabled={isSubmitting}
                  />
                  <span>🌐 Công khai</span>
                </label>
                <label className={`radio-label ${privacy === "PRIVATE" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="privacy"
                    value="PRIVATE"
                    checked={privacy === "PRIVATE"}
                    onChange={() => setPrivacy("PRIVATE")}
                    disabled={isSubmitting}
                  />
                  <span>🔒 Riêng tư</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 3: NÚT BẤM */}
        <div className="form-actions-bar">
          <button
            type="button"
            className="btn-cancel"
            onClick={handleCancelClick}
            disabled={isSubmitting}
            data-testid="btn-cancel-create"
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={isSubmitting || !name.trim()}
            data-testid="btn-submit-create"
          >
            {isSubmitting ? "Đang tạo nhóm…" : "Tạo nhóm"}
          </button>
        </div>
      </form>

      {/* POPUP XÁC NHẬN THOÁT NẾU ĐÃ NHẬP DỮ LIỆU */}
      {showDiscardConfirm && (
        <div className="group-modal-backdrop" data-testid="discard-confirm-modal">
          <div className="modal-dialog">
            <div className="modal-tag">POPUP</div>
            <div className="modal-title">BẠN MUỐN THOÁT?</div>
            <div className="modal-description">
              Bạn có thay đổi chưa lưu. Bạn muốn thoát?
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDiscardConfirm(false)}
                data-testid="btn-stay-form"
              >
                Ở lại
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onCancel();
                }}
                data-testid="btn-discard-exit"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

