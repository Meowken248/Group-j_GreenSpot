import React, { useState, useEffect } from "react";
import { GreenPointsPolicy } from "./components/GreenPointsPolicy";
import { GreenWallet } from "./components/GreenWallet";
import { EcoRewardsCatalog } from "./components/EcoRewardsCatalog";
import { MyVouchersWallet } from "./components/MyVouchersWallet";
import "./rewards.css";

interface RewardsContainerProps {
  initialTab?: "policy" | "wallet" | "catalog" | "vouchers";
  onBackToHome?: () => void;
  onNavigateToAuth?: () => void;
  onPointsChanged?: () => void;
}

export const RewardsContainer: React.FC<RewardsContainerProps> = ({
  initialTab = "wallet",
  onBackToHome,
  onNavigateToAuth,
  onPointsChanged,
}) => {
  const [activeTab, setActiveTab] = useState<"policy" | "wallet" | "catalog" | "vouchers">(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash === "#policy" || hash === "#rewards-policy") return "policy";
    if (hash === "#wallet" || hash === "#rewards-wallet") return "wallet";
    if (hash === "#catalog" || hash === "#rewards-catalog") return "catalog";
    if (hash === "#vouchers" || hash === "#my-vouchers") return "vouchers";
    return initialTab;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return Boolean(localStorage.getItem("eco_access_token"));
  });

  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("eco_access_token")));
    };
    window.addEventListener("auth_change", checkAuth);
    return () => window.removeEventListener("auth_change", checkAuth);
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#policy" || hash === "#rewards-policy") setActiveTab("policy");
      else if (hash === "#wallet" || hash === "#rewards-wallet") setActiveTab("wallet");
      else if (hash === "#catalog" || hash === "#rewards-catalog") setActiveTab("catalog");
      else if (hash === "#vouchers" || hash === "#my-vouchers") setActiveTab("vouchers");
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleTabChange = (tab: "policy" | "wallet" | "catalog" | "vouchers") => {
    setActiveTab(tab);
    window.location.hash = `#${tab}`;
  };

  const handleAuthRedirect = () => {
    if (onNavigateToAuth) {
      onNavigateToAuth();
    } else {
      window.location.hash = "#login";
    }
  };

  return (
    <div className="rewards-main-viewport">
      {/* THANH TOP BAR ĐIỀU HƯỚNG GIỮA 4 CHỨC NĂNG 28, 29, 30 & 31 */}
      <header className="rewards-top-navigation">
        <div className="rewards-nav-left">
          {onBackToHome && (
            <button
              type="button"
              className="btn-back-home"
              onClick={onBackToHome}
              title="Quay về Bản đồ"
            >
              ← Bản đồ
            </button>
          )}
          <div className="module-title-brand">
            <span className="brand-logo-leaf">🌱</span>
            <div className="brand-texts">
              <span className="brand-sub">HỆ THỐNG CÔNG DÂN XANH</span>
              <strong className="brand-main">Kinh Tế Điểm Thưởng, Ví Điểm & Quà Tặng</strong>
            </div>
          </div>
        </div>

        {/* NÚT CHUYỂN 4 TABS */}
        <div className="rewards-tabs-switcher">
          <button
            type="button"
            className={`tab-switch-btn ${activeTab === "wallet" ? "active" : ""}`}
            onClick={() => handleTabChange("wallet")}
          >
            <span className="tab-icon">💳</span>
            <span className="tab-label">CN 29: Ví Điểm Sinh Thái</span>
          </button>

          <button
            type="button"
            className={`tab-switch-btn ${activeTab === "vouchers" ? "active" : ""}`}
            onClick={() => handleTabChange("vouchers")}
          >
            <span className="tab-icon">🎟️</span>
            <span className="tab-label">CN 31: Voucher Của Tôi</span>
          </button>

          <button
            type="button"
            className={`tab-switch-btn ${activeTab === "catalog" ? "active" : ""}`}
            onClick={() => handleTabChange("catalog")}
          >
            <span className="tab-icon">🏪</span>
            <span className="tab-label">CN 30: Danh Mục Quà & Kho</span>
          </button>

          <button
            type="button"
            className={`tab-switch-btn ${activeTab === "policy" ? "active" : ""}`}
            onClick={() => handleTabChange("policy")}
          >
            <span className="tab-icon">🎯</span>
            <span className="tab-label">CN 28: Tích Lũy Điểm Thưởng</span>
          </button>
        </div>
      </header>

      {/* VIEW NỘI DUNG CHÍNH */}
      <main className="rewards-content-body">
        {activeTab === "wallet" && (
          <GreenWallet
            isLoggedIn={isLoggedIn}
            onNavigateToAuth={handleAuthRedirect}
            onNavigateToPolicy={() => handleTabChange("policy")}
            onNavigateToRewardsCatalog={() => handleTabChange("catalog")}
          />
        )}

        {activeTab === "vouchers" && (
          <MyVouchersWallet
            onExploreRewards={() => handleTabChange("catalog")}
          />
        )}

        {activeTab === "catalog" && (
          <EcoRewardsCatalog
            onRewardRedeemed={() => {
              if (onPointsChanged) onPointsChanged();
            }}
            onNavigateToMyVouchers={() => handleTabChange("vouchers")}
          />
        )}

        {activeTab === "policy" && (
          <GreenPointsPolicy
            isLoggedIn={isLoggedIn}
            onNavigateToAuth={handleAuthRedirect}
            onNavigateToWallet={() => handleTabChange("wallet")}
            onPointsUpdated={onPointsChanged}
          />
        )}
      </main>
    </div>
  );
};
