import React, { useState, useRef, useEffect } from "react";
import type { ScopeType } from "../types/rbac.types";
import { rbacService } from "../services/rbacService";
import "../styles/CreateRolePage.scss";

interface CreateRolePageProps {
  onBackToList: () => void;
  onRoleCreated: (newRoleId: number) => void;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

export const CreateRolePage: React.FC<CreateRolePageProps> = ({
  onBackToList,
  onRoleCreated,
  showToast,
}) => {
  const [roleName, setRoleName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [scope, setScope] = useState<ScopeType>("DISTRICT");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus vào ô tên vai trò khi trang load
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  const validateName = (raw: string): string | null => {
    const cleaned = raw.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      return "Tên vai trò không được để trống";
    }
    if (cleaned.length < 2 || cleaned.length > 30) {
      return "Tên vai trò phải từ 2 đến 30 ký tự";
    }
    const pattern = /^[a-zA-Z0-9\s\-_\u00C0-\u1EF9]+$/;
    if (!pattern.test(cleaned)) {
      return "Tên vai trò chỉ gồm chữ cái tiếng Việt, số, khoảng trắng, dấu '-' và '_'";
    }
    return null;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    const cleanedName = roleName.trim().replace(/\s+/g, " ");
    const error = validateName(cleanedName);
    if (error) {
      setErrorMessage(error);
      if (nameInputRef.current) nameInputRef.current.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const newRole = await rbacService.createRole({
        role_name: cleanedName,
        description: description.trim() || undefined,
        scope,
      });

      showToast("Đã tạo vai trò thành công", "success");
      // Chuyển thẳng sang Màn 3 để thiết lập ma trận quyền
      onRoleCreated(newRole.role_id);
    } catch (err: any) {
      const errData = err?.response?.data;
      if (errData?.error_code === "ROLE_EXISTS") {
        setErrorMessage("Tên vai trò đã tồn tại, vui lòng chọn tên khác");
      } else if (errData?.error_code === "MAX_ROLES_REACHED") {
        setErrorMessage("Đã đạt tối đa 20 vai trò. Vui lòng xoá bớt vai trò không dùng");
      } else {
        const msg = errData?.message || "Không thể tạo vai trò mới. Vui lòng kiểm tra lại";
        setErrorMessage(msg);
      }
      if (nameInputRef.current) nameInputRef.current.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 200) {
      setDescription(val);
    }
  };

  return (
    <div className="create-role-page">
      {/* HEADER & BREADCRUMB */}
      <div className="create-page-header">
        <div className="header-breadcrumb">
          <span className="crumb-item" onClick={onBackToList}>
            Phân quyền vai trò (RBAC)
          </span>
          <span className="crumb-separator">/</span>
          <span className="crumb-current">Thêm vai trò mới</span>
        </div>
        <div className="header-title-row">
          <div>
            <h1>
              <span>➕</span>
              <span>Khởi tạo Vai trò Mới</span>
            </h1>
            <p className="header-desc">
              Tạo vai trò tuỳ chỉnh với phạm vi quản trị phù hợp. Sau khi tạo, bạn sẽ được chuyển sang ma trận để gán quyền.
            </p>
          </div>
        </div>
      </div>

      {/* BỐ CỤC CHIA 2 KHUNG */}
      <div className="create-layout-split">
        {/* KHUNG TRÁI: FORM NHẬP LIỆU */}
        <section className="create-left-pane" aria-labelledby="form-title">
          <div className="pane-title-bar">
            <h2 id="form-title">Thông tin vai trò</h2>
          </div>

          <form onSubmit={handleSubmit}>
            {/* TÊN VAI TRÒ */}
            <div className="form-group">
              <label className="form-label" htmlFor="role-name-input">
                <span>
                  Tên vai trò <span className="required-star">*</span>
                </span>
                <span
                  className={`char-counter ${
                    roleName.length >= 30 ? "at-limit" : roleName.length >= 25 ? "near-limit" : ""
                  }`}
                >
                  {roleName.length}/30
                </span>
              </label>
              <div className="input-wrapper">
                <input
                  id="role-name-input"
                  ref={nameInputRef}
                  type="text"
                  className={`text-input ${errorMessage ? "has-error" : ""}`}
                  placeholder="Ví dụ: Giám sát viên Môi trường Quận 1"
                  value={roleName}
                  maxLength={30}
                  onChange={(e) => {
                    setRoleName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  autoComplete="off"
                  required
                />
              </div>
              {errorMessage && (
                <div className="field-error-msg" role="alert">
                  <span>⚠️</span>
                  <span>{errorMessage}</span>
                </div>
              )}
              <p className="field-hint">
                Từ 2 đến 30 ký tự, hỗ trợ tiếng Việt có dấu, chữ số, khoảng trắng, '-' và '_'. Nhấn Enter để lưu.
              </p>
            </div>

            {/* MÔ TẢ VAI TRÒ */}
            <div className="form-group">
              <label className="form-label" htmlFor="role-desc-input">
                <span>Mô tả vai trò</span>
                <span
                  className={`char-counter ${
                    description.length >= 200
                      ? "at-limit"
                      : description.length >= 180
                      ? "near-limit"
                      : ""
                  }`}
                >
                  {description.length}/200
                </span>
              </label>
              <div className="input-wrapper">
                <textarea
                  id="role-desc-input"
                  className="textarea-input"
                  rows={3}
                  placeholder="Mô tả chức năng, nhiệm vụ hoặc thẩm quyền của vai trò này..."
                  value={description}
                  onChange={handleDescriptionChange}
                  disabled={isSubmitting}
                />
              </div>
              <p className="field-hint">
                Tối đa 200 ký tự. Hệ thống tự động chặn gõ khi đạt giới hạn.
              </p>
            </div>

            {/* PHẠM VI QUẢN TRỊ (SCOPE) */}
            <div className="form-group">
              <label className="form-label">
                <span>Phạm vi quản trị</span>
              </label>
              <div className="scope-radio-grid">
                <label
                  className={`scope-option-card ${scope === "DISTRICT" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value="DISTRICT"
                    checked={scope === "DISTRICT"}
                    onChange={() => setScope("DISTRICT")}
                    disabled={isSubmitting}
                  />
                  <div className="option-text">
                    <span className="option-title">
                      <span>🏢</span>
                      <span>Cấp Quận (Mặc định)</span>
                    </span>
                    <span className="option-desc">
                      Phạm vi thao tác giới hạn trong địa bàn quận/huyện được phân công
                    </span>
                  </div>
                </label>

                <label
                  className={`scope-option-card ${scope === "CITY" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value="CITY"
                    checked={scope === "CITY"}
                    onChange={() => setScope("CITY")}
                    disabled={isSubmitting}
                  />
                  <div className="option-text">
                    <span className="option-title">
                      <span>🌐</span>
                      <span>Toàn thành phố</span>
                    </span>
                    <span className="option-desc">
                      Phạm vi dữ liệu và thẩm quyền bao phủ toàn bộ địa bàn TP. Hồ Chí Minh
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </section>

        {/* KHUNG PHẢI: THAO TÁC & HƯỚNG DẪN */}
        <aside className="create-right-pane">
          <div className="action-card">
            <h3 className="card-title">Thao tác</h3>
            <div className="action-buttons-stack">
              <button
                type="button"
                className="btn-save-role"
                onClick={() => handleSubmit()}
                disabled={isSubmitting || roleName.trim().length === 0}
              >
                {isSubmitting ? "Đang khởi tạo..." : "💾 Lưu vai trò"}
              </button>

              <button
                type="button"
                className="btn-cancel-create"
                onClick={onBackToList}
                disabled={isSubmitting}
              >
                Huỷ bỏ
              </button>
            </div>
          </div>

          <div className="flow-info-card">
            <h4>
              <span>ℹ️</span>
              <span>Quy trình thiết lập vai trò</span>
            </h4>
            <ol>
              <li>Khai báo thông tin cơ bản và phạm vi địa lý của vai trò.</li>
              <li>Hệ thống khởi tạo vai trò mới với ma trận quyền hoàn toàn trống.</li>
              <li>Tự động chuyển tiếp đến Ma trận phân quyền để bạn kích hoạt từng tính năng cụ thể.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
};
