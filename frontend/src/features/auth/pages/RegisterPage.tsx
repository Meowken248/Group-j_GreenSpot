import React, { useState, useRef, useEffect } from "react";
import { AuthHeader } from "../components/AuthHeader";
import { AuthFooter } from "../components/AuthFooter";
import { PasswordInput } from "../components/PasswordInput";
import { Toast } from "../components/Toast";
import type { RegisterFormData, ToastState } from "../types/auth.types";
import {
  validateFullName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  normalizeFullName,
} from "../utils/validators";
import { registerCitizen } from "../services/authService";
import "../styles/RegisterPage.scss";

interface RegisterPageProps {
  onNavigateToLogin: () => void;
  onNavigateToOtp: (email: string) => void;
  onLogoClick?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateToLogin,
  onNavigateToOtp,
  onLogoClick,
}) => {
  // 1. Quản lý dữ liệu form
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // 2. Quản lý thông báo lỗi từng ô
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    emailIsActiveAccount?: boolean; // Cờ nhận biết email đã kích hoạt để hiển thị link "đăng nhập"
    password?: string;
    confirmPassword?: string;
  }>({});

  // 3. Quản lý trạng thái đang xử lý (loading)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 4. Quản lý thông báo Toast 3s góc trên bên phải
  const [toast, setToast] = useState<ToastState | null>(null);

  // 5. Refs để quản lý focus vào ô lỗi đầu tiên từ trên xuống
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  // Đặc tả: Khi mở màn hình, con trỏ tự động đặt vào ô Họ tên
  useEffect(() => {
    fullNameRef.current?.focus();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({
      id: Date.now(),
      message,
      type,
    });
  };

  // Cập nhật giá trị input
  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Khi người dùng gõ vào ô email, nếu trước đó có lỗi email đã đăng ký thì xóa trạng thái đó
    if (field === "email" && errors.emailIsActiveAccount) {
      setErrors((prev) => ({ ...prev, email: undefined, emailIsActiveAccount: false }));
    }

    // Đặc tả: "Nếu người dùng sửa ô Mật khẩu sau khi đã nhập ô này (Nhập lại MK), hệ thống kiểm tra lại ngay"
    if (field === "password" && formData.confirmPassword) {
      const confirmErr = validateConfirmPassword(formData.confirmPassword, value);
      setErrors((prev) => ({
        ...prev,
        confirmPassword: confirmErr || undefined,
      }));
    }
  };

  // Kiểm tra khi rời ô (onBlur)
  const handleBlur = (field: keyof RegisterFormData) => {
    let error: string | null = null;

    switch (field) {
      case "fullName":
        error = validateFullName(formData.fullName);
        setErrors((prev) => ({ ...prev, fullName: error || undefined }));
        break;
      case "email":
        // Nếu không phải đang hiển thị thông báo email đã active từ server thì mới validate frontend
        if (!errors.emailIsActiveAccount) {
          error = validateEmail(formData.email);
          setErrors((prev) => ({ ...prev, email: error || undefined }));
        }
        break;
      case "password":
        error = validatePassword(formData.password);
        setErrors((prev) => ({ ...prev, password: error || undefined }));
        // Đồng thời nếu ô nhập lại đã có thì check lại
        if (formData.confirmPassword) {
          const confirmErr = validateConfirmPassword(formData.confirmPassword, formData.password);
          setErrors((prev) => ({ ...prev, confirmPassword: confirmErr || undefined }));
        }
        break;
      case "confirmPassword":
        error = validateConfirmPassword(formData.confirmPassword, formData.password);
        setErrors((prev) => ({ ...prev, confirmPassword: error || undefined }));
        break;
    }
  };

  // Xử lý gửi Form (Khi bấm nút Đăng ký hoặc phím Enter)
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // 1. Kiểm tra toàn bộ các ô cùng lúc
    const fullNameErr = validateFullName(formData.fullName);
    const emailErr = validateEmail(formData.email);
    const passwordErr = validatePassword(formData.password);
    const confirmPasswordErr = validateConfirmPassword(formData.confirmPassword, formData.password);

    const newErrors = {
      fullName: fullNameErr || undefined,
      email: emailErr || undefined,
      emailIsActiveAccount: false,
      password: passwordErr || undefined,
      confirmPassword: confirmPasswordErr || undefined,
    };

    setErrors(newErrors);

    // 2. Nếu còn ít nhất một ô lỗi: không gọi máy chủ, focus vào ô lỗi đầu tiên từ trên xuống
    const hasAnyError = Boolean(fullNameErr || emailErr || passwordErr || confirmPasswordErr);

    if (hasAnyError) {
      if (fullNameErr) {
        fullNameRef.current?.focus();
      } else if (emailErr) {
        emailRef.current?.focus();
      } else if (passwordErr) {
        passwordRef.current?.focus();
      } else if (confirmPasswordErr) {
        confirmPasswordRef.current?.focus();
      }
      return;
    }

    // 3. Mọi ô đều hợp lệ -> Chuyển sang trạng thái đang xử lý, khóa form
    setIsSubmitting(true);

    try {
      const result = await registerCitizen({
        full_name: normalizeFullName(formData.fullName),
        email: formData.email.trim(),
        password: formData.password,
      });

      if (result.success) {
        // Đăng ký thành công hoặc tài khoản PENDING được cấp lại OTP
        showToast(result.message || "Mã OTP đã được gửi đến email của bạn", "success");

        // Sau 1 khoảng ngắn hoặc trực tiếp chuyển sang Màn 2 kèm email
        setTimeout(() => {
          onNavigateToOtp(formData.email.trim());
        }, 800);
      } else {
        // Mở lại các ô nhập
        setIsSubmitting(false);

        switch (result.status) {
          case "EMAIL_EXISTS":
            // Email đã thuộc về tài khoản đã kích hoạt (ACTIVE)
            // Ô Email viền đỏ, chữ đỏ ngay dưới ô, chữ "đăng nhập" là link
            setErrors((prev) => ({
              ...prev,
              email: "Email này đã được đăng ký. Vui lòng ",
              emailIsActiveAccount: true,
            }));
            emailRef.current?.focus();
            break;

          case "RATE_LIMITED":
            // Yêu cầu gửi OTP vượt giới hạn (quá 5 lần trong 1 giờ)
            showToast(result.message, "error");
            break;

          case "EMAIL_SEND_FAILED":
            // Gửi email OTP thất bại
            showToast(result.message, "error");
            break;

          case "NETWORK_ERROR":
          case "UNKNOWN_ERROR":
          default:
            // Mất kết nối hoặc máy chủ lỗi
            showToast("Không thể kết nối đến máy chủ. Vui lòng thử lại", "error");
            break;
        }
      }
    } catch {
      setIsSubmitting(false);
      showToast("Không thể kết nối đến máy chủ. Vui lòng thử lại", "error");
    }
  };

  // Phím Enter có tác dụng như bấm nút Đăng ký
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Toast thông báo ở góc trên bên phải */}
      <Toast toast={toast} onClose={() => setToast(null)} duration={3000} />

      {/* Header từ trên xuống */}
      <AuthHeader onLogoClick={onLogoClick} />

      {/* Nội dung chính giữa màn hình */}
      <main className="auth-main-content">
        <section className="register-card" aria-labelledby="register-heading">
          <div className="card-header-section">
            <div className="badge-tag">
              <span>🌿</span>
              <span>CÔNG DÂN SỐ XANH</span>
            </div>
            <h1 id="register-heading" className="card-title">ĐĂNG KÝ TÀI KHOẢN</h1>
            <p className="card-subtitle">
              Gia nhập cộng đồng GreenSpot để chung tay bảo vệ môi trường và nhận điểm xanh
            </p>
          </div>

          <form
            className="register-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            noValidate
          >
            {/* Ô 1: Họ tên */}
            <div className="form-group">
              <input
                ref={fullNameRef}
                id="fullName"
                name="fullName"
                type="text"
                className={`form-input ${errors.fullName ? "has-error" : ""}`}
                placeholder="Họ tên"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                onBlur={() => handleBlur("fullName")}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
              />
              {errors.fullName && (
                <span id="fullName-error" className="input-error-msg" role="alert">
                  {errors.fullName}
                </span>
              )}
            </div>

            {/* Ô 2: Email */}
            <div className="form-group">
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                className={`form-input ${errors.email ? "has-error" : ""}`}
                placeholder="Email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <span id="email-error" className="input-error-msg" role="alert">
                  {errors.email}
                  {errors.emailIsActiveAccount && (
                    <button
                      type="button"
                      className="login-inline-link"
                      onClick={onNavigateToLogin}
                    >
                      đăng nhập
                    </button>
                  )}
                </span>
              )}
            </div>

            {/* Ô 3: Mật khẩu */}
            <PasswordInput
              inputRef={passwordRef}
              id="password"
              name="password"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              hasError={Boolean(errors.password)}
              errorMessage={errors.password}
              autoComplete="new-password"
            />

            {/* Ô 4: Nhập lại mật khẩu */}
            <PasswordInput
              inputRef={confirmPasswordRef}
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              onBlur={() => handleBlur("confirmPassword")}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              hasError={Boolean(errors.confirmPassword)}
              errorMessage={errors.confirmPassword}
              autoComplete="new-password"
            />

            {/* Nút "Đăng ký" */}
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  <span>Đang xử lý đăng ký...</span>
                </>
              ) : (
                <span>Đăng ký</span>
              )}
            </button>

            {/* Nút "Đã có tài khoản? Đăng nhập" */}
            <div className="switch-auth-action">
              <button
                type="button"
                className="btn-switch-login"
                onClick={onNavigateToLogin}
                disabled={isSubmitting}
              >
                Đã có tài khoản?
                <span>Đăng nhập</span>
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* Footer dưới cùng */}
      <AuthFooter />
    </div>
  );
};
