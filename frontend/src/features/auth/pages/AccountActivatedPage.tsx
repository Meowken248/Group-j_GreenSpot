import React, { useEffect, useState } from "react";
import { AuthHeader } from "../components/AuthHeader";
import { AuthFooter } from "../components/AuthFooter";
import { Toast } from "../components/Toast";
import type { ToastState } from "../types/auth.types";
import { AUTH_STORAGE_KEYS } from "../types/auth.types";
import "../styles/AccountActivatedPage.scss";

interface AccountActivatedPageProps {
  onNavigateToLogin: (redirectUrl?: string, email?: string) => void;
  onLogoClick?: () => void;
  email?: string;
}

export const AccountActivatedPage: React.FC<AccountActivatedPageProps> = ({
  onNavigateToLogin,
  onLogoClick,
  email,
}) => {
  const [countdown, setCountdown] = useState(3);

  // Toast xanh hiện 3 giây: "Kích hoạt tài khoản thành công" theo đặc tả
  const [toast, setToast] = useState<ToastState | null>({
    id: Date.now(),
    message: "Kích hoạt tài khoản thành công",
    type: "success",
  });

  const handleGoToLogin = () => {
    const activatedEmail = email || sessionStorage.getItem(AUTH_STORAGE_KEYS.EMAIL) || "";
    // Dọn dẹp session tạm thời
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.OTP_SENT_TIME);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.IS_ACTIVATED);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.EMAIL);

    onNavigateToLogin(undefined, activatedEmail);
  };

  useEffect(() => {
    // Đánh dấu tài khoản đã kích hoạt trong session
    sessionStorage.setItem(AUTH_STORAGE_KEYS.IS_ACTIVATED, "true");

    // Xử lý nút Quay lại (Back) của trình duyệt
    window.history.pushState({ page: "activated" }, "");

    const handlePopState = () => {
      handleGoToLogin();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Tự động đếm ngược 3s chuyển về màn hình Đăng nhập
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGoToLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="activated-page-wrapper">
      {/* Toast thông báo ở góc trên bên phải */}
      <Toast toast={toast} onClose={() => setToast(null)} duration={3000} />

      {/* Header từ trên xuống */}
      <AuthHeader onLogoClick={onLogoClick} />

      {/* Nội dung chính Màn 3 */}
      <main className="activated-main-content">
        <section className="activated-card" aria-labelledby="activated-heading">
          <div className="success-celebration-badge" aria-hidden="true">
            🌱
          </div>

          <h1 id="activated-heading" className="card-title">
            TÀI KHOẢN ĐÃ KÍCH HOẠT
          </h1>

          <p className="card-welcome-message">
            Chào mừng công dân xanh!
          </p>

          <p className="card-instructions">
            Tài khoản của bạn đã được xác thực danh tính thành công. Hãy đăng nhập để bắt đầu đóng góp báo cáo sinh thái và nhận điểm xanh.
          </p>

          <p style={{ fontSize: "13px", color: "#10b981", fontWeight: 600, margin: "14px 0 6px 0" }}>
            ⏱️ Đang tự động chuyển đến màn hình Đăng nhập sau {countdown}s...
          </p>

          {/* Nút "Đăng nhập ngay" */}
          <button
            type="button"
            className="btn-login-now"
            onClick={handleGoToLogin}
            autoFocus
          >
            Đăng nhập ngay ({countdown}s)
          </button>
        </section>
      </main>

      {/* Footer dưới cùng */}
      <AuthFooter />
    </div>
  );
};
