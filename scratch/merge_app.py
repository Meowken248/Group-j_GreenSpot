import os

with open(r"c:\Group-j_GreenSpot\frontend\src\App.tsx", "r", encoding="utf-8") as f:
    raw = f.read()

parts = raw.split("<<<<<<< HEAD\n")
subparts = parts[1].split("\n=======\n")
head = subparts[0]

# 1. Bổ sung các imports từ master vào đầu file
master_imports = """import { EmergencyAlertContainer } from "./features/emergency_alert";
import { FloodSosContainer } from "./features/flood_sos";
import { IncidentExportContainer } from "./features/incident_export";
import { AdminDashboardContainer } from "./features/admin_dashboard";
import { RewardsContainer } from "./features/rewards";
import { WeeklyChallengesContainer } from "./features/challenges/WeeklyChallengesContainer";
import { AuditLogContainer } from "./features/audit_logs/AuditLogContainer";
import { WasteHandbookContainer } from "./features/waste_handbook/WasteHandbookContainer";
import { LeaderboardContainer } from "./features/leaderboard/LeaderboardContainer";
import { MultiModeHeatmapContainer } from "./features/heatmap/MultiModeHeatmapContainer";
import { QRScanContainer } from "./features/qr_scan/QRScanContainer";
import { LuckyWheelContainer } from "./features/lucky_wheel/LuckyWheelContainer";
import { MilestoneContainer } from "./features/milestone/MilestoneContainer";
import { APP_ROUTES, resolveTabFromUrl, navigateToRoute } from "./routes/appRoutes";
import type { ActiveTab } from "./routes/appRoutes";
"""

head = head.replace('import api from "./api/client";\nimport "./App.css";', master_imports + '\nimport api from "./api/client";\nimport "./App.css";')

# 2. Thay thế type ActiveTab để kế thừa từ appRoutes
old_type_block = """export type TabType =
  | "map"
  | "dashboard"
  | "auth"
  | "rbac"
  | "users"
  | "profile"
  | "friends"
  | "voice"
  | "report"
  | "incidents"
  | "waste_categories"
  | "recycling_facilities"
  | "dedup"
  | "settings"
  | "penalties"
  | "penalty-reports"
  | "posts"
  | "messages"
  | "groups"
  | "triage"
  | "navigation"
  | "risk-dashboard"
  | "dispatch"
  | "hotspots"
  | "ai-assistant"
  | "events"
  | "fundraiser";

export type ActiveTab = TabType;"""

new_type_block = """export type { ActiveTab };
export type TabType = ActiveTab;"""

head = head.replace(old_type_block, new_type_block)

# 3. Cập nhật navigateTo để hỗ trợ cả navigateToRoute
old_nav_def = """  const navigateTo = (tab: ActiveTab, targetHash?: string) => {
    setActiveTab(tab);
    if (targetHash) {
      window.location.hash = targetHash;
    } else {
      window.location.hash = `#${tab}`;
    }
    setOpenDropdown(null);
    setUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };"""

new_nav_def = """  const navigateTo = (tab: ActiveTab, targetHash?: string) => {
    setActiveTab(tab);
    try {
      navigateToRoute(tab);
    } catch {}
    if (targetHash) {
      window.location.hash = targetHash;
    } else {
      window.location.hash = `#${tab}`;
    }
    setOpenDropdown(null);
    setUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };"""

head = head.replace(old_nav_def, new_nav_def)

# 4. Thêm nút quick-sos-btn trên header khối phải
old_right_actions = """        {/* KHỐI PHẢI: TIỆN ÍCH & TÀI KHOẢN */}
        <div className="header-right-actions">"""

new_right_actions = """        {/* KHỐI PHẢI: TIỆN ÍCH & TÀI KHOẢN */}
        <div className="header-right-actions">
          {/* Nút SOS Cứu hộ khẩn cấp */}
          <button
            type="button"
            className={`quick-sos-btn ${activeTab === "flood-sos" ? "active" : ""}`}
            onClick={() => navigateTo("flood-sos", "#flood-sos")}
            title="Cứu nạn ngập lụt khẩn cấp (Flood SOS - STT 46)"
            data-testid="quick-sos-btn"
          >
            <span className="sos-pulse-icon">🚨</span>
            <span>SOS NGẬP LỤT</span>
          </button>"""

head = head.replace(old_right_actions, new_right_actions)

# 5. Bổ sung các case render cho 13 tab của master
master_render_cases = """        ) : activeTab === "rewards" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <RewardsContainer
              onBackToHome={() => {
                navigateTo("map", "#map");
              }}
              onNavigateToAuth={() => {
                const currentH = window.location.hash || "#wallet";
                sessionStorage.setItem("greenspot_target_hash", currentH);
                setAuthRedirectUrl(currentH);
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "challenges" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <WeeklyChallengesContainer
              onBackToHome={() => {
                navigateTo("map", "#map");
              }}
              onNavigateToAuth={() => {
                sessionStorage.setItem("greenspot_target_hash", "#challenges");
                setAuthRedirectUrl("/challenges");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
              onNavigateToWallet={() => {
                navigateTo("rewards", "#wallet");
              }}
            />
          </div>
        ) : activeTab === "audit-logs" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <AuditLogContainer
              onBackToHome={() => {
                navigateTo("map", "#map");
              }}
              onNavigateToAuth={() => {
                sessionStorage.setItem("greenspot_target_hash", "#audit-logs");
                setAuthRedirectUrl("/audit-logs");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "handbook" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <WasteHandbookContainer
              onBackToHome={() => {
                navigateTo("map", "#map");
              }}
              onNavigateToMap={(_facilityType) => {
                navigateTo("map", "#map");
              }}
            />
          </div>
        ) : activeTab === "leaderboard" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <LeaderboardContainer
              onNavigateLogin={() => {
                sessionStorage.setItem("greenspot_target_hash", "#leaderboard");
                setAuthRedirectUrl("/leaderboard");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
              onNavigateHeatmap={(_districtCode) => {
                navigateTo("heatmap", "#heatmap");
              }}
            />
          </div>
        ) : activeTab === "heatmap" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#0b0f19" }}>
            <MultiModeHeatmapContainer
              onNavigateDistrictReport={(_districtCode) => {
                navigateTo("map", "#map");
              }}
            />
          </div>
        ) : activeTab === "qr-scan" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <QRScanContainer
              onBackToHome={() => {
                navigateTo("map", "#map");
              }}
              onNavigateWallet={() => {
                navigateTo("rewards", "#wallet");
              }}
              onNavigateLogin={() => {
                sessionStorage.setItem("greenspot_target_hash", "#qr-scan");
                setAuthRedirectUrl("/qr-scan");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "lucky-wheel" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <LuckyWheelContainer
              onBackToHome={() => {
                navigateTo("map", "#map");
              }}
              onNavigateLogin={() => {
                sessionStorage.setItem("greenspot_target_hash", "#lucky-wheel");
                setAuthRedirectUrl("/lucky-wheel");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "milestone" ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", background: "#f8fafc" }}>
            <MilestoneContainer
              onBackToHome={() => {
                navigateTo("map", "#map");
              }}
              onNavigateLogin={() => {
                sessionStorage.setItem("greenspot_target_hash", "#milestone");
                setAuthRedirectUrl("/milestone");
                setActiveTab("auth");
                window.location.hash = "#login";
              }}
            />
          </div>
        ) : activeTab === "emergency-alert" || activeTab === "safety-check" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <EmergencyAlertContainer
              initialView={activeTab === "safety-check" ? "SAFETY_CHECK" : "CONSOLE"}
              currentUser={currentUser}
              onNavigateHome={() => {
                navigateTo("map", "#map");
              }}
              onNavigateFeed={() => {
                navigateTo("posts", "#posts");
              }}
              onNavigateSafeRoute={() => {
                navigateTo("navigation", "#navigation");
              }}
            />
          </div>
        ) : activeTab === "flood-sos" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <FloodSosContainer />
          </div>
        ) : activeTab === "incident-export" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <IncidentExportContainer />
          </div>
        ) : activeTab === "admin-dashboard" ? (
          <div className={`app-view-container ${isDarkMode ? "dark-theme" : "light-theme"}`}>
            <AdminDashboardContainer
              onNavigateHome={() => {
                navigateTo("map", "#map");
              }}
            />
          </div>"""

# Chèn master_render_cases trước khối cuối: `) : (`
old_render_end = """) : (
        /* Mặc định an toàn cho khách vãng lai và tab map: Bản đồ số WebGIS công cộng */"""

new_render_end = master_render_cases + "\n" + old_render_end
head = head.replace(old_render_end, new_render_end)

# Ghi đè vào App.tsx
with open(r"c:\Group-j_GreenSpot\frontend\src\App.tsx", "w", encoding="utf-8") as f:
    f.write(head)

print("Merged App.tsx successfully!")
