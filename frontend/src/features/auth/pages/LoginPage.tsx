import React, { useState } from "react";
import { AuthHeader } from "../components/AuthHeader";
import { AuthFooter } from "../components/AuthFooter";
import { PasswordInput } from "../components/PasswordInput";
import { Toast } from "../components/Toast";
import type { ToastState } from "../types/auth.types";
import { loginCitizen } from "../services/authService";
import "../styles/RegisterPage.scss";

interface LoginPageProps {
  onNavigateToRegister: () => void;
  onLogoClick?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToRegister,
  onLogoClick,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setToast({
        type: "error",
        message: "Vui lòng nhập địa chỉ email",
      });
      return;
    }

    if (!password) {
      setToast({
        type: "error",
        message: "Vui lòng nhập mật khẩu",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginCitizen({
        email: email.trim(),
        password,
      });

      if (result.success && result.userData) {
        setToast({
          type: "success",
          message: result.message,
        });

        // Lưu thông tin người dùng vào localStorage
        localStorage.setItem("greenspot_user", JSON.stringify(result.userData));

        // Tự động chuyển hướng về trang chủ/bản đồ sau 1.5s
        setTimeout(() => {
          if (onLogoClick) {
            onLogoClick();
          } else {
            window.location.reload();
          }
        }, 1500);
      } else {
        setToast({
          type: "error",
          message: result.message,
        });
      }
    } catch {
      setToast({
        type: "error",
        message: "Có lỗi xảy ra trong quá trình đăng nhập",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Toast thông báo */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <AuthHeader onLogoClick={onLogoClick} />

      <main className="auth-main-content">
        <section className="register-card">
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

          <form className="register-form" onSubmit={handleLogin}>
            <div className="form-group">
              <input
                type="email"
                className="form-input"
                placeholder="Email hoặc Tên đăng nhập"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>

            <PasswordInput
              id="login-password"
              name="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isSubmitting}
            />

            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xác thực..." : "Đăng nhập"}
            </button>

            <div className="switch-auth-action">
              <button
                type="button"
                className="btn-switch-login"
                onClick={onNavigateToRegister}
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

