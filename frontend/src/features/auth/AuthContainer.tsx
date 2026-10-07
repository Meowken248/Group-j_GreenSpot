import React, { useState } from "react";
import { RegisterPage } from "./pages/RegisterPage";
import { OtpVerificationPage } from "./pages/OtpVerificationPage";
import { AccountActivatedPage } from "./pages/AccountActivatedPage";
import { LoginPage } from "./pages/LoginPage";
import { DeviceManagementPage } from "./pages/DeviceManagementPage";
import { SessionExpiredModal } from "./components/SessionExpiredModal";
import { subscribeSessionExpired } from "./services/sessionManager";
import type { AuthView } from "./types/auth.types";
import { AUTH_STORAGE_KEYS } from "./types/auth.types";

interface AuthContainerProps {
  initialView?: AuthView;
  onExitAuth?: () => void;
  redirectUrl?: string;
}

export const AuthContainer: React.FC<AuthContainerProps> = ({
  initialView = "register",
  onExitAuth,
  redirectUrl,
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

  const [loginRedirect, setLoginRedirect] = useState<string | undefined>(redirectUrl);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);

  // Lắng nghe sự kiện phiên hết hạn từ Axios Interceptor (Singleton)
  React.useEffect(() => {
    const unsub = subscribeSessionExpired(() => {
      setSessionExpiredOpen(true);
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    if (redirectUrl) {
      setLoginRedirect(redirectUrl);
    }
  }, [redirectUrl]);

  React.useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);

  const [isFromActivation, setIsFromActivation] = useState(false);

  const handleNavigateToLogin = (redirect?: string, email?: string) => {
    if (email) {
      setPendingEmail(email);
      setIsFromActivation(true);
    }
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
    setIsFromActivation(false);
    setCurrentView("register");
  };

  const handleNavigateToOtp = (email: string) => {
    setPendingEmail(email);
    setCurrentView("otp");
  };

  const handleNavigateToActivated = () => {
    setCurrentView("activated");
  };

  const renderCurrentView = () => {
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
          email={pendingEmail}
          onNavigateToLogin={(redirect, email) => {
            handleNavigateToLogin(redirect, email || pendingEmail);
          }}
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
          initialEmail={pendingEmail}
          activatedNotice={isFromActivation}
          redirectParam={loginRedirect}
          onLoginSuccess={(targetUrl?: string) => {
            setIsFromActivation(false);
            setPendingEmail("");
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

  return (
    <>
      <SessionExpiredModal
        isOpen={sessionExpiredOpen}
        onRelogin={(targetRedirect) => {
          setSessionExpiredOpen(false);
          setLoginRedirect(targetRedirect);
          setCurrentView("login");
        }}
      />
      {renderCurrentView()}
    </>
  );
};


