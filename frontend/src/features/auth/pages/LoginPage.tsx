import React, { useState } from "react";
import { AuthHeader } from "../components/AuthHeader";
import { AuthFooter } from "../components/AuthFooter";
import { PasswordInput } from "../components/PasswordInput";
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

  return (
    <div className="auth-page-wrapper">
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

          <form className="register-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <input
                type="email"
                className="form-input"
                placeholder="Email hoặc Tên đăng nhập"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <PasswordInput
              id="login-password"
              name="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button type="submit" className="btn-submit">
              Đăng nhập
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
