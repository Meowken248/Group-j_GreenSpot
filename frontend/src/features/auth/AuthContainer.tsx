import React, { useState } from "react";
import { RegisterPage } from "./pages/RegisterPage";
import { OtpVerificationPage } from "./pages/OtpVerificationPage";
import { LoginPage } from "./pages/LoginPage";
import type { AuthView } from "./types/auth.types";

interface AuthContainerProps {
  initialView?: AuthView;
  onExitAuth?: () => void;
}

export const AuthContainer: React.FC<AuthContainerProps> = ({
  initialView = "register",
  onExitAuth,
}) => {
  const [currentView, setCurrentView] = useState<AuthView>(initialView);
  const [pendingEmail, setPendingEmail] = useState<string>("");

  const handleNavigateToLogin = () => {
    setCurrentView("login");
  };

  const handleNavigateToRegister = () => {
    setCurrentView("register");
  };

  const handleNavigateToOtp = (email: string) => {
    setPendingEmail(email);
    setCurrentView("otp");
  };

  if (currentView === "otp") {
    return (
      <OtpVerificationPage
        email={pendingEmail}
        onNavigateToLogin={handleNavigateToLogin}
        onBackToRegister={handleNavigateToRegister}
        onLogoClick={onExitAuth}
      />
    );
  }

  if (currentView === "login") {
    return (
      <LoginPage
        onNavigateToRegister={handleNavigateToRegister}
        onLogoClick={onExitAuth}
      />
    );
  }

  return (
    <RegisterPage
      onNavigateToLogin={handleNavigateToLogin}
      onNavigateToOtp={handleNavigateToOtp}
      onLogoClick={onExitAuth}
    />
  );
};
