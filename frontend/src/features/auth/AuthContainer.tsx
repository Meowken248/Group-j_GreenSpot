import React, { useState } from "react";
import { RegisterPage } from "./pages/RegisterPage";
import { OtpVerificationPage } from "./pages/OtpVerificationPage";
import { AccountActivatedPage } from "./pages/AccountActivatedPage";
import { LoginPage } from "./pages/LoginPage";
import { DeviceManagementPage } from "./pages/DeviceManagementPage";
import type { AuthView } from "./types/auth.types";
import { AUTH_STORAGE_KEYS } from "./types/auth.types";

interface AuthContainerProps {
  initialView?: AuthView;
  onExitAuth?: () => void;
}

export const AuthContainer: React.FC<AuthContainerProps> = ({
  initialView = "register",
  onExitAuth,
}) => {
  // Xác định màn hình khởi đầu dựa trên trạng thái trong sessionStorage / URL
  const [currentView, setCurrentView] = useState<AuthView>(() => {
    // Nếu URL là /devices hoặc #devices -> mở Quản lý thiết bị
    if (window.location.pathname === "/devices" || window.location.hash === "#devices") {
      return "devices";
    }

    // Nếu URL là /login hoặc #login -> mở Đăng nhập
    if (
      window.location.pathname === "/login" ||
      window.location.pathname.startsWith("/login") ||
      window.location.hash === "#login"
    ) {
      return "login";
    }

    // Nếu vừa kích hoạt xong mà F5 -> chuyển thẳng trang Đăng nhập theo đặc tả Màn 3
    if (sessionStorage.getItem(AUTH_STORAGE_KEYS.IS_ACTIVATED) === "true") {
      return "login";
    }

    // Nếu đang có phiên xác thực OTP dở dang mà F5 -> giữ nguyên Màn 2 theo đặc tả Màn 2
    if (sessionStorage.getItem(AUTH_STORAGE_KEYS.EMAIL)) {
      return "otp";
    }

    return initialView;
  });

  const [pendingEmail, setPendingEmail] = useState<string>(() => {
    return sessionStorage.getItem(AUTH_STORAGE_KEYS.EMAIL) || "";
  });

  const [loginRedirect, setLoginRedirect] = useState<string | undefined>();

  const handleNavigateToLogin = (redirect?: string) => {
    setLoginRedirect(redirect);
    setCurrentView("login");
  };

  const handleNavigateToRegister = () => {
    // Xóa session cũ nếu quay lại đăng ký
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.EMAIL);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.OTP_SENT_TIME);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.IS_ACTIVATED);
    setPendingEmail("");
    setCurrentView("register");
  };

  const handleNavigateToOtp = (email: string) => {
    setPendingEmail(email);
    setCurrentView("otp");
  };

  const handleNavigateToActivated = () => {
    setCurrentView("activated");
  };

  // MÀN QUẢN LÝ THIẾT BỊ (MÀN 2 CHỨC NĂNG 2)
  if (currentView === "devices") {
    return (
      <DeviceManagementPage
        onNavigateToLogin={(redirectUrl?: string) => {
          setLoginRedirect(redirectUrl);
          setCurrentView("login");
        }}
        onLogoClick={onExitAuth}
      />
    );
  }

  // MÀN 3: TÀI KHOẢN ĐÃ KÍCH HOẠT
  if (currentView === "activated") {
    return (
      <AccountActivatedPage
        onNavigateToLogin={handleNavigateToLogin}
        onLogoClick={onExitAuth}
      />
    );
  }

  // MÀN 2: XÁC THỰC EMAIL (KÈM POPUP MÀN 4)
  if (currentView === "otp") {
    return (
      <OtpVerificationPage
        email={pendingEmail}
        onNavigateToLogin={handleNavigateToLogin}
        onNavigateToActivated={handleNavigateToActivated}
        onBackToRegister={handleNavigateToRegister}
        onLogoClick={onExitAuth}
      />
    );
  }

  // MÀN ĐĂNG NHẬP
  if (currentView === "login") {
    return (
      <LoginPage
        onNavigateToRegister={handleNavigateToRegister}
        onNavigateToOtp={handleNavigateToOtp}
        redirectParam={loginRedirect}
        onLoginSuccess={(targetUrl?: string) => {
          setLoginRedirect(undefined);
          if (targetUrl === "/devices" || targetUrl === "#devices") {
            setCurrentView("devices");
          } else if (onExitAuth) {
            onExitAuth();
          }
        }}
        onLogoClick={onExitAuth}
      />
    );
  }

  // MÀN 1: ĐĂNG KÝ TÀI KHOẢN
  return (
    <RegisterPage
      onNavigateToLogin={handleNavigateToLogin}
      onNavigateToOtp={handleNavigateToOtp}
      onLogoClick={onExitAuth}
    />
  );
};

