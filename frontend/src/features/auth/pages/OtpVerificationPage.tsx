import React from "react";
import { AuthHeader } from "../components/AuthHeader";
import { AuthFooter } from "../components/AuthFooter";
import "../styles/RegisterPage.scss";

interface OtpVerificationPageProps {
  email: string;
  onNavigateToLogin: () => void;
  onBackToRegister: () => void;
  onLogoClick?: () => void;
}

export const OtpVerificationPage: React.FC<OtpVerificationPageProps> = ({
  email,
  onNavigateToLogin,
  onBackToRegister,
  onLogoClick,
}) => {
  return (
    <div className="auth-page-wrapper">
      <AuthHeader onLogoClick={onLogoClick} />

      <main className="auth-main-content">
        <section className="register-card" style={{ textAlign: "center" }}>
          <div className="card-header-section" style={{ marginBottom: "1.5rem" }}>
            <div className="badge-tag">
              <span>📩</span>
              <span>XÁC THỰC EMAIL</span>
            </div>
            <h1 className="card-title">KÍCH HOẠT TÀI KHOẢN</h1>
            <p className="card-subtitle">
              Mã xác thực OTP gồm 6 chữ số đã được gửi đến địa chỉ email:
            </p>
            <div style={{
              margin: "12px 0",
              padding: "10px 14px",
              background: "#ecfdf5",
              borderRadius: "8px",
              border: "1px solid #a7f3d0",
              color: "#047857",
              fontWeight: 700,
              fontSize: "1.05rem",
              wordBreak: "break-all"
            }}>
              {email || "email_cua_ban@domain.com"}
            </div>
          </div>

          <p style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.6, margin: "1.5rem 0" }}>
            (Đây là <strong>Màn 2: Nhập OTP Email</strong> - Sẵn sàng kết nối để kích hoạt tài khoản Công dân số khi hoàn thiện API tiếp theo).
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              type="button"
              className="btn-submit"
              onClick={onNavigateToLogin}
            >
              Chuyển đến Đăng nhập
            </button>
            <button
              type="button"
              onClick={onBackToRegister}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                fontSize: "0.9rem",
                cursor: "pointer",
                padding: "8px"
              }}
            >
              ← Quay lại chỉnh sửa thông tin đăng ký
            </button>
          </div>
        </section>
      </main>

      <AuthFooter />
    </div>
  );
};
