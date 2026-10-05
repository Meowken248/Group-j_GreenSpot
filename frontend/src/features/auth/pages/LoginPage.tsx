import React, { useState, useRef, useEffect } from "react";
import { AuthHeader } from "../components/AuthHeader";
import { AuthFooter } from "../components/AuthFooter";
import { PasswordInput } from "../components/PasswordInput";
import { Toast } from "../components/Toast";
import type { ToastState } from "../types/auth.types";
import { AUTH_STORAGE_KEYS } from "../types/auth.types";
import {
  validateEmail,
  validateLoginPassword,
  sanitizeRedirectUrl,
} from "../utils/validators";
import { loginCitizen, resendOtp } from "../services/authService";
import { resetSessionExpired } from "../services/sessionManager";
import "../styles/RegisterPage.scss";
import "../styles/LoginPage.scss";

interface LoginPageProps {
  onNavigateToRegister: () => void;
  onNavigateToOtp: (email: string) => void;
  onNavigateToForgotPassword?: () => void;
  onLoginSuccess?: (redirectUrl: string) => void;
  onLogoClick?: () => void;
  redirectParam?: string | null;
  initialEmail?: string;
  activatedNotice?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToRegister,
  onNavigateToOtp,
  onNavigateToForgotPassword,
  onLoginSuccess,
  onLogoClick,
  redirectParam,
  initialEmail = "",
  activatedNotice = false,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<{
    email?: string;
    password?: React.ReactNode;
    emailHasError?: boolean;
    passwordHasError?: boolean;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(() => {
    if (activatedNotice) {
      return {
        id: Date.now(),
        type: "success",
        message: "Tài khoản đã kích hoạt thành công! Vui lòng nhập mật khẩu để đăng nhập.",
      };
    }
    return null;
  });

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // 1. Kiểm tra phiên đã tồn tại: nếu đã có token hợp lệ -> chuyển luôn đến Bảng tin
  useEffect(() => {
    resetSessionExpired();
    const existingToken = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (existingToken) {
      const rawRedirect = redirectParam || new URLSearchParams(window.location.search).get("redirect");
      const targetUrl = sanitizeRedirectUrl(rawRedirect, "/geo-feed");
      if (onLoginSuccess) {
        onLoginSuccess(targetUrl);
      } else if (onLogoClick) {
        onLogoClick();
      }
      return;
    }

    // Nếu có initialEmail thì focus vào ô Mật khẩu, ngược lại focus ô Email
    if (initialEmail) {
      setEmail(initialEmail);
      passwordRef.current?.focus();
    } else {
      emailRef.current?.focus();
    }
  }, [onLoginSuccess, onLogoClick, redirectParam, initialEmail]);

  // onBlur ô Email
  const handleEmailBlur = () => {
    const err = validateEmail(email);
    setErrors((prev) => ({
      ...prev,
      email: err || undefined,
      emailHasError: Boolean(err),
    }));
  };

  // onBlur ô Mật khẩu
  const handlePasswordBlur = () => {
    const err = validateLoginPassword(password);
    setErrors((prev) => ({
      ...prev,
      password: err || undefined,
      passwordHasError: Boolean(err),
    }));
  };

  // Bấm Kích hoạt ngay khi tài khoản là PENDING
  const handleActivateNow = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setIsActivating(true);
    try {
      const res = await resendOtp(cleanEmail);
      if (res.success) {
        setToast({
          id: Date.now(),
          type: "success",
          message: "Mã OTP đã được gửi đến email của bạn",
        });
        sessionStorage.setItem(AUTH_STORAGE_KEYS.EMAIL, cleanEmail);
        sessionStorage.setItem(AUTH_STORAGE_KEYS.OTP_SENT_TIME, Date.now().toString());

        setTimeout(() => {
          onNavigateToOtp(cleanEmail);
        }, 800);
      } else if (res.status === "RATE_LIMITED") {
        setToast({
          id: Date.now(),
          type: "error",
          message: "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau 1 giờ",
        });
      } else {
        setToast({
          id: Date.now(),
          type: "error",
          message: "Không thể gửi mã OTP. Vui lòng thử lại sau",
        });
      }
    } catch {
      setToast({
        id: Date.now(),
        type: "error",
        message: "Không thể gửi mã OTP. Vui lòng thử lại sau",
      });
    } finally {
      setIsActivating(false);
    }
  };

  // Bấm Đăng nhập (hoặc nhấn phím Enter trong bất kỳ ô nào)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Kiểm tra hợp lệ client toàn bộ các ô
    const emailErr = validateEmail(email);
    const passErr = validateLoginPassword(password);

    if (emailErr || passErr) {
      setErrors({
        email: emailErr || undefined,
        emailHasError: Boolean(emailErr),
        password: passErr || undefined,
        passwordHasError: Boolean(passErr),
      });

      // Con trỏ chuyển vào ô lỗi đầu tiên theo thứ tự từ trên xuống
      if (emailErr) {
        emailRef.current?.focus();
      } else if (passErr) {
        passwordRef.current?.focus();
      }
      return;
    }

    // 2. Không có lỗi client -> Bắt đầu gọi máy chủ
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await loginCitizen({
        email: email.trim(),
        password,
      });

      // 3. Đăng nhập thành công
      if (result.success && result.data) {
        setToast({
          id: Date.now(),
          type: "success",
          message: "Đăng nhập thành công",
        });

        // Hai token được lưu vào localStorage theo đặc tả
        localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, result.data.access_token);
        localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, result.data.refresh_token);
        localStorage.setItem(AUTH_STORAGE_KEYS.USER_INFO, JSON.stringify(result.data.user));

        // Thông báo đồng bộ trạng thái đăng nhập cho toàn bộ ứng dụng
        window.dispatchEvent(new Event("auth_change"));

        // Kiểm tra an toàn tham số redirect
        const rawRedirect = redirectParam || new URLSearchParams(window.location.search).get("redirect");
        const targetUrl = sanitizeRedirectUrl(rawRedirect, "/geo-feed");

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(targetUrl);
          } else if (onLogoClick) {
            onLogoClick();
          }
        }, 1000);
        return;
      }

      // 4. Xử lý các mã lỗi theo bảng hiển thị đặc tả
      if (result.status === "INVALID_CREDENTIALS") {
        // Cả 2 ô viền đỏ, dòng chữ đỏ hiển thị dưới ô Mật khẩu, ô Mật khẩu bị xóa nội dung, con trỏ về ô Mật khẩu
        setErrors({
          emailHasError: true,
          passwordHasError: true,
          password: "Email hoặc mật khẩu không đúng",
        });
        setPassword("");
        setTimeout(() => {
          passwordRef.current?.focus();
        }, 50);
      } else if (result.status === "LOGIN_LOCKED") {
        // Đã sai 5 lần trong 15 phút: chữ đỏ dưới ô Mật khẩu, ô Mật khẩu bị xóa
        setErrors({
          passwordHasError: true,
          password: "Bạn đã nhập sai quá 5 lần. Vui lòng thử lại sau 15 phút",
        });
        setPassword("");
      } else if (result.status === "NOT_ACTIVATED") {
        // Tài khoản chưa kích hoạt (PENDING): Chữ đỏ dưới ô Mật khẩu, chữ "Kích hoạt ngay" là liên kết
        setErrors({
          passwordHasError: true,
          password: (
            <span>
              Tài khoản chưa được kích hoạt.{" "}
              <button
                type="button"
                className="btn-inline-activate"
                onClick={handleActivateNow}
                disabled={isActivating || isSubmitting}
              >
                {isActivating ? "Đang gửi mã..." : "Kích hoạt ngay"}
              </button>
            </span>
          ),
        });
      } else if (result.status === "ACCOUNT_LOCKED") {
        // Tài khoản bị khóa (LOCKED)
        setErrors({
          passwordHasError: true,
          password: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên",
        });
      } else {
        // Mất kết nối hoặc lỗi máy chủ: Toast đỏ 3 giây, giữ nguyên dữ liệu
        setToast({
          id: Date.now(),
          type: "error",
          message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
        });
      }
    } catch {
      setToast({
        id: Date.now(),
        type: "error",
        message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nút "Quên mật khẩu?": Dữ liệu đang nhập không được lưu
  const handleForgotPassword = () => {
    setEmail("");
    setPassword("");
    setErrors({});
    if (onNavigateToForgotPassword) {
      onNavigateToForgotPassword();
    } else {
      setToast({
        id: Date.now(),
        type: "error",
        message: "Chuyển sang trang Quên mật khẩu",
      });
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Toast thông báo 3 giây */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header: chuông và avatar mờ không bấm được */}
      <AuthHeader onLogoClick={onLogoClick} isLoggedIn={false} />

      <main className="auth-main-content">
        <section className="login-card">
          <div className="card-header-section">
            <div className="badge-tag">
              <span>🔐</span>
              <span>ĐĂNG NHẬP HỆ THỐNG</span>
            </div>
            <h1 className="card-title">CÔNG DÂN GREENSPOT</h1>
            <p className="card-subtitle">
              Đăng nhập để đóng góp phản ánh môi trường và tích lũy điểm thưởng xanh
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Ô Email */}
            <div className="form-group">
              <input
                ref={emailRef}
                type="email"
                id="login-email"
                name="email"
                className={`form-input ${errors.emailHasError ? "has-error" : ""}`}
                placeholder="Email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                autoComplete="email"
                disabled={isSubmitting}
                aria-invalid={errors.emailHasError}
                aria-describedby={errors.email ? "login-email-error" : undefined}
              />
              {errors.email && (
                <span id="login-email-error" className="input-error-msg" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            {/* Ô Mật khẩu */}
            <PasswordInput
              inputRef={passwordRef}
              id="login-password"
              name="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handlePasswordBlur}
              autoComplete="current-password"
              disabled={isSubmitting}
              hasError={errors.passwordHasError}
              errorMessage={errors.password}
            />

            {/* Nút Quên mật khẩu? */}
            <div className="form-extra-actions">
              <button
                type="button"
                className="btn-forgot-password"
                onClick={handleForgotPassword}
                disabled={isSubmitting}
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Nút Đăng nhập */}
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="btn-spinner" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>

            {/* Chuyển sang Đăng ký */}
            <div className="switch-auth-action">
              <button
                type="button"
                className="btn-switch-register"
                onClick={onNavigateToRegister}
                disabled={isSubmitting}
              >
                Chưa có tài khoản?
                <span>Đăng ký ngay</span>
              </button>
            </div>
          </form>
        </section>
      </main>

      <AuthFooter />
    </div>
  );
};
