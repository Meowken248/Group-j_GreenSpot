import React, { useState } from "react";
import type { LanguageCode } from "../types";
import { getT } from "../translations";
import { changePasswordApi } from "../services";
import { DiscardConfirmModal } from "./DiscardConfirmModal";

interface ChangePasswordTabProps {
  currentLang: LanguageCode;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
  onLogoutRedirect: () => void;
}

export const ChangePasswordTab: React.FC<ChangePasswordTabProps> = ({
  currentLang,
  onSuccessToast,
  onErrorToast,
  onLogoutRedirect,
}) => {
  const t = getT(currentLang);

  // Form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status & Validation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Realtime password criteria checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[@$!%*?&_\-#^+=()<>[\]{}|~]/.test(newPassword);
  const isPasswordValid =
    hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecial;

  // Kiểm tra form có dữ liệu chưa
  const hasAnyInput = Boolean(
    currentPassword.trim() || newPassword.trim() || confirmPassword.trim()
  );

  const handleCancelClick = () => {
    if (hasAnyInput) {
      setShowDiscardModal(true);
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage(null);
    setShowDiscardModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage(currentLang === "VI" ? "Vui lòng nhập mật khẩu hiện tại" : "Current password is required");
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage(t.pwdWeakError);
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage(t.pwdSameError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t.pwdMismatchError);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await changePasswordApi({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.success) {
        // Thông báo thành công và đếm ngược tự động đăng xuất sau 3 giây theo đặc tả
        onSuccessToast(t.pwdSuccessToast);
        resetForm();

        setTimeout(() => {
          onLogoutRedirect();
        }, 3000);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const errorCode = typeof detail === "object" ? detail.error_code : null;
      let msg = typeof detail === "object" ? detail.message : err.message;

      if (errorCode === "WRONG_CURRENT_PASSWORD") {
        msg = currentLang === "VI" ? "Mật khẩu hiện tại không chính xác" : "Current password is incorrect";
      } else if (errorCode === "SAME_AS_OLD_PASSWORD") {
        msg = t.pwdSameError;
      } else if (errorCode === "CONFIRM_PASSWORD_MISMATCH") {
        msg = t.pwdMismatchError;
      } else if (errorCode === "WEAK_PASSWORD") {
        msg = t.pwdWeakError;
      }

      setErrorMessage(msg || "Không thể đổi mật khẩu. Vui lòng thử lại.");
      onErrorToast(msg || "Đổi mật khẩu thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="settings-password-form">
        <div className="settings-password-form__header">
          <h2 className="settings-password-form__title">{t.pwdTitle}</h2>
          <p className="settings-password-form__desc">{t.pwdSubtitle}</p>
        </div>

        {errorMessage && (
          <div className="settings-password-form__error-alert">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="settings-password-form__fields">
            {/* TRƯỜNG 1: MẬT KHẨU HIỆN TẠI */}
            <div className="settings-password-form__field">
              <label className="settings-password-form__label">
                {t.lblCurrentPwd} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div className="settings-password-form__input-wrapper">
                <input
                  type={showCurrent ? "text" : "password"}
                  className="settings-password-form__input"
                  placeholder={t.placeholderCurrentPwd}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="settings-password-form__eye-btn"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  title={showCurrent ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  {showCurrent ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            {/* TRƯỜNG 2: MẬT KHẨU MỚI */}
            <div className="settings-password-form__field">
              <label className="settings-password-form__label">
                {t.lblNewPwd} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div className="settings-password-form__input-wrapper">
                <input
                  type={showNew ? "text" : "password"}
                  className="settings-password-form__input"
                  placeholder={t.placeholderNewPwd}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="settings-password-form__eye-btn"
                  onClick={() => setShowNew((prev) => !prev)}
                  title={showNew ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  {showNew ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            {/* QUY CHUẨN AN TOÀN MẬT KHẨU REALTIME */}
            <div className="settings-password-form__rules">
              <h4 className="settings-password-form__rules-title">{t.pwdReqTitle}</h4>
              <ul className="settings-password-form__rules-list">
                <li
                  className={`settings-password-form__rules-item ${
                    hasMinLength ? "settings-password-form__rules-item--valid" : ""
                  }`}
                >
                  <span>{hasMinLength ? "✓" : "○"}</span>
                  <span>{t.reqLength}</span>
                </li>
                <li
                  className={`settings-password-form__rules-item ${
                    hasUppercase ? "settings-password-form__rules-item--valid" : ""
                  }`}
                >
                  <span>{hasUppercase ? "✓" : "○"}</span>
                  <span>{t.reqUppercase}</span>
                </li>
                <li
                  className={`settings-password-form__rules-item ${
                    hasLowercase ? "settings-password-form__rules-item--valid" : ""
                  }`}
                >
                  <span>{hasLowercase ? "✓" : "○"}</span>
                  <span>{t.reqLowercase}</span>
                </li>
                <li
                  className={`settings-password-form__rules-item ${
                    hasDigit ? "settings-password-form__rules-item--valid" : ""
                  }`}
                >
                  <span>{hasDigit ? "✓" : "○"}</span>
                  <span>{t.reqDigit}</span>
                </li>
                <li
                  className={`settings-password-form__rules-item ${
                    hasSpecial ? "settings-password-form__rules-item--valid" : ""
                  }`}
                >
                  <span>{hasSpecial ? "✓" : "○"}</span>
                  <span>{t.reqSpecial}</span>
                </li>
              </ul>
            </div>

            {/* TRƯỜNG 3: XÁC NHẬN MẬT KHẨU MỚI */}
            <div className="settings-password-form__field">
              <label className="settings-password-form__label">
                {t.lblConfirmPwd} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div className="settings-password-form__input-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="settings-password-form__input"
                  placeholder={t.placeholderConfirmPwd}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="settings-password-form__eye-btn"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  title={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  {showConfirm ? "👁️" : "🙈"}
                </button>
              </div>
            </div>
          </div>

          <div className="settings-password-form__actions">
            <button
              type="button"
              className="btn-settings-outline"
              onClick={handleCancelClick}
              disabled={isSubmitting}
            >
              <span>✕</span>
              <span>{t.btnCancel}</span>
            </button>

            <button
              type="submit"
              className="btn-settings-primary"
              disabled={isSubmitting || !isPasswordValid || !currentPassword || !confirmPassword}
            >
              <span>🔒</span>
              <span>{isSubmitting ? t.btnUpdatingPwd : t.btnSubmitPwd}</span>
            </button>
          </div>
        </form>
      </div>

      {/* MODAL CẢNH BÁO XÁC NHẬN HỦY NẾU ĐÃ NHẬP DỮ LIỆU */}
      {showDiscardModal && (
        <DiscardConfirmModal
          currentLang={currentLang}
          onKeepEditing={() => setShowDiscardModal(false)}
          onConfirmDiscard={resetForm}
        />
      )}
    </>
  );
};
