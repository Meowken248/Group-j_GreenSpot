import React, { useState, useEffect, useRef } from "react";
import { AuthHeader } from "../components/AuthHeader";
import { PasswordInput } from "../components/PasswordInput";
import { Toast } from "../components/Toast";
import { validateEmail } from "../utils/validators";
import { forgotPassword, resetPassword } from "../services/authService";
import type { ToastState } from "../types/auth.types";
import "../styles/ForgotPasswordPage.scss";

interface ForgotPasswordPageProps {
  onNavigateToLogin: (email?: string) => void;
  onLogoClick?: () => void;
  initialEmail?: string;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateToLogin,
  onLogoClick,
  initialEmail = "",
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState<string>(initialEmail);
  const [otpCode, setOtpCode] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Lỗi form
  const [emailError, setEmailError] = useState<string>("");
  const [otpError, setOtpError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<string>("");

  // Countdown timer 5 phút (300 giây) cho OTP
  const [countdown, setCountdown] = useState<number>(300);
  const [canResend, setCanResend] = useState<boolean>(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  // Bộ đếm lùi thời hạn OTP
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // BƯỚC 1: Gửi yêu cầu nhận mã OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const err = validateEmail(cleanEmail);
    if (err) {
      setEmailError(err);
      emailRef.current?.focus();
      return;
    }

    setEmailError("");
    setIsSubmitting(true);

    try {
      const res = await forgotPassword(cleanEmail);
      if (res.success) {
        setToast({
          id: Date.now(),
          type: "success",
          message: res.message || "Mã OTP đã được gửi đến email của bạn",
        });
        setStep(2);
        setCountdown(300);
        setCanResend(false);
        setTimeout(() => {
          otpRef.current?.focus();
        }, 100);
      } else {
        setEmailError(res.message);
        setToast({
          id: Date.now(),
          type: "error",
          message: res.message,
        });
      }
    } catch {
      setEmailError("Không thể kết nối đến máy chủ. Vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gửi lại mã OTP khi đang ở bước 2
  const handleResendOtp = async () => {
    if (!canResend && countdown > 240) return; // Cho phép gửi lại sau 60s
    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      if (res.success) {
        setToast({
          id: Date.now(),
          type: "success",
          message: "Mã OTP mới đã được gửi lại thành công",
        });
        setCountdown(300);
        setCanResend(false);
        setOtpCode("");
        setOtpError("");
      } else {
        setToast({
          id: Date.now(),
          type: "error",
          message: res.message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // BƯỚC 2: Xác nhận OTP và đặt lại mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasErr = false;

    // Validate OTP 6 số
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError("Vui lòng nhập đúng 6 chữ số mã OTP");
      hasErr = true;
    } else {
      setOtpError("");
    }

    // Validate mật khẩu mới >= 8 ký tự
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có tối thiểu 8 ký tự");
      hasErr = true;
    } else {
      setPasswordError("");
    }

    // Validate khớp mật khẩu
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Mật khẩu xác nhận không khớp");
      hasErr = true;
    } else {
      setConfirmPasswordError("");
    }

    if (hasErr) return;

    setIsSubmitting(true);

    try {
      const res = await resetPassword({
        email: email.trim(),
        otp_code: otpCode.trim(),
        new_password: newPassword,
      });

      if (res.success) {
        setToast({
          id: Date.now(),
          type: "success",
          message: "Đặt lại mật khẩu thành công! Đang chuyển về Đăng nhập...",
        });
        setTimeout(() => {
          onNavigateToLogin(email.trim());
        }, 1200);
      } else {
        if (res.status === "INVALID_OTP") {
          setOtpError(res.message);
        } else {
          setToast({
            id: Date.now(),
            type: "error",
            message: res.message,
          });
        }
      }
    } catch {
      setToast({
        id: Date.now(),
        type: "error",
        message: "Đặt lại mật khẩu thất bại. Vui lòng thử lại",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <AuthHeader onLogoClick={onLogoClick} isLoggedIn={false} />

      <main className="auth-main-content">
        <section className="forgot-password-card">
          {/* Header */}
          <div className="card-header-section">
            <div className="badge-tag">
              <span>🔑</span>
              <span>{step === 1 ? "QUÊN MẬT KHẨU" : "XÁC THỰC & ĐỔI MẬT KHẨU"}</span>
            </div>
            <h1 className="card-title">
              {step === 1 ? "KHÔI PHỤC MẬT KHẨU" : "ĐẶT LẠI MẬT KHẨU"}
            </h1>
            <p className="card-subtitle">
              {step === 1 ? (
                "Nhập email tài khoản GreenSpot để nhận mã OTP xác thực"
              ) : (
                <>
                  Mã xác thực đã được gửi đến{" "}
                  <span className="highlight-email">{email}</span>
                </>
              )}
            </p>
          </div>

          {/* Form Bước 1: Nhập Email */}
          {step === 1 && (
            <form className="forgot-form" onSubmit={handleSendOtp} noValidate>
              <div className="form-group">
                <label htmlFor="forgot-email" className="form-label">
                  Địa chỉ Email
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  id="forgot-email"
                  name="email"
                  className={`form-input ${emailError ? "has-error" : ""}`}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  disabled={isSubmitting}
                  autoComplete="email"
                  autoFocus
                />
                {emailError && (
                  <span className="input-error-msg" role="alert">
                    {emailError}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="btn-submit-action"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang gửi mã..." : "Gửi mã xác thực"}
              </button>

              <div className="back-action-row">
                <button
                  type="button"
                  className="btn-back-link"
                  onClick={() => onNavigateToLogin(email)}
                  disabled={isSubmitting}
                >
                  ← Quay lại Đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* Form Bước 2: Nhập OTP & Mật khẩu mới */}
          {step === 2 && (
            <form className="forgot-form" onSubmit={handleResetPassword} noValidate>
              {/* Ô nhập OTP 6 số */}
              <div className="form-group">
                <label htmlFor="reset-otp" className="form-label">
                  Mã xác thực OTP (6 chữ số)
                </label>
                <input
                  ref={otpRef}
                  type="text"
                  id="reset-otp"
                  name="otp"
                  maxLength={6}
                  inputMode="numeric"
                  className={`form-input otp-input-field ${otpError ? "has-error" : ""}`}
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setOtpCode(val);
                    if (otpError) setOtpError("");
                  }}
                  disabled={isSubmitting}
                  autoFocus
                />
                {otpError && (
                  <span className="input-error-msg" role="alert">
                    {otpError}
                  </span>
                )}
              </div>

              {/* Hàng đếm ngược & gửi lại OTP */}
              <div className="otp-resend-row">
                <span>
                  {countdown > 0 ? (
                    <>
                      Hiệu lực mã:{" "}
                      <span className="countdown-text">{formatCountdown(countdown)}</span>
                    </>
                  ) : (
                    <span className="countdown-text">Mã OTP đã hết hạn</span>
                  )}
                </span>
                <button
                  type="button"
                  className="btn-resend-otp"
                  onClick={handleResendOtp}
                  disabled={isSubmitting || (!canResend && countdown > 240)}
                >
                  Gửi lại mã
                </button>
              </div>

              {/* Mật khẩu mới */}
              <div className="form-group">
                <label htmlFor="new-password" className="form-label">
                  Mật khẩu mới
                </label>
                <PasswordInput
                  inputRef={newPasswordRef}
                  id="new-password"
                  name="newPassword"
                  placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  disabled={isSubmitting}
                  hasError={Boolean(passwordError)}
                  errorMessage={passwordError}
                />
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div className="form-group">
                <label htmlFor="confirm-new-password" className="form-label">
                  Xác nhận mật khẩu mới
                </label>
                <PasswordInput
                  id="confirm-new-password"
                  name="confirmPassword"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) setConfirmPasswordError("");
                  }}
                  disabled={isSubmitting}
                  hasError={Boolean(confirmPasswordError)}
                  errorMessage={confirmPasswordError}
                />
              </div>

              <button
                type="submit"
                className="btn-submit-action"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận & Đổi mật khẩu"}
              </button>

              <div className="back-action-row">
                <button
                  type="button"
                  className="btn-back-link"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  ← Đổi địa chỉ email khác
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};
