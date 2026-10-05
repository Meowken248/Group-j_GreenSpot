import React, { useEffect, useState } from "react";
import { AuthHeader } from "../components/AuthHeader";
import { AuthFooter } from "../components/AuthFooter";
import { Toast } from "../components/Toast";
import type { ToastState } from "../types/auth.types";
import { AUTH_STORAGE_KEYS } from "../types/auth.types";
import "../styles/AccountActivatedPage.scss";

interface AccountActivatedPageProps {
  onNavigateToLogin: () => void;
  onLogoClick?: () => void;
}

export const AccountActivatedPage: React.FC<AccountActivatedPageProps> = ({
  onNavigateToLogin,
  onLogoClick,
}) => {
  // Toast xanh hiện 3 giây: "Kích hoạt tài khoản thành công" theo đặc tả
  const [toast, setToast] = useState<ToastState | null>({
    id: Date.now(),
    message: "Kích hoạt tài khoản thành công",
    type: "success",
  });

  useEffect(() => {
    // Đánh dấu tài khoản đã kích hoạt trong session
    sessionStorage.setItem(AUTH_STORAGE_KEYS.IS_ACTIVATED, "true");

    // Xử lý nút Quay lại (Back) của trình duyệt:
    // Đẩy một state vào history, khi người dùng bấm Back sẽ kích hoạt popstate -> chuyển sang Đăng nhập thay vì quay lại Màn 2
    window.history.pushState({ page: "activated" }, "");

    const handlePopState = () => {
      handleGoToLogin();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleGoToLogin = () => {
    // Xóa toàn bộ thông tin tạm lưu trong sessionStorage của quy trình đăng ký theo đặc tả
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.EMAIL);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.OTP_SENT_TIME);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.IS_ACTIVATED);

    onNavigateToLogin();
  };

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

          {/* Nút "Đăng nhập ngay" */}
          <button
            type="button"
            className="btn-login-now"
            onClick={handleGoToLogin}
            autoFocus
          >
            Đăng nhập ngay
          </button>
        </section>
      </main>

      {/* Footer dưới cùng */}
      <AuthFooter />
    </div>
  );
};
