import React, { useState, useEffect } from "react";
import type { UserActiveAlertResponse } from "../types/emergency_alert.types";
import { emergencyAlertApi } from "../services/emergencyAlertApi";
import { EmergencyHeader } from "../components/EmergencyHeader";
import { EmergencyFooter } from "../components/EmergencyFooter";
import { Screen1BroadcastConsole } from "../components/Screen1BroadcastConsole";
import { Screen2AlertModal } from "../components/Screen2AlertModal";
import { Screen3SafetyCheck } from "../components/Screen3SafetyCheck";
import { Screen4SafetyConfirmModal } from "../components/Screen4SafetyConfirmModal";
import "../styles/emergency_alert.css";

interface EmergencyAlertContainerProps {
  initialView?: "CONSOLE" | "SAFETY_CHECK";
  onNavigateHome?: () => void;
  onNavigateFeed?: () => void;
  onNavigateSafeRoute?: () => void;
  currentUser?: {
    full_name?: string;
    role?: string;
  } | null;
}

export const EmergencyAlertContainer: React.FC<EmergencyAlertContainerProps> = ({
  initialView = "CONSOLE",
  onNavigateHome,
  onNavigateFeed,
  onNavigateSafeRoute,
  currentUser,
}) => {
  const [currentView, setCurrentView] = useState<"CONSOLE" | "SAFETY_CHECK">(initialView);

  // Màn 2/4 Alert Modal State
  const [activeAlert, setActiveAlert] = useState<UserActiveAlertResponse | null>(null);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);

  // Màn 4/4 Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmedSentCount, setConfirmedSentCount] = useState<number>(0);
  const [hasSmsFallback, setHasSmsFallback] = useState<boolean>(false);

  // Tự động kiểm tra cảnh báo khẩn cấp trong vùng geofencing khi mount
  useEffect(() => {
    const checkGeofenceAlert = async () => {
      try {
        const lat = 10.758;
        const lng = 106.675;
        const res = await emergencyAlertApi.getActiveAlertForUser(lat, lng);
        if (res.has_active_alert) {
          setActiveAlert(res);
          setShowAlertModal(true);
        }
      } catch {
        // Ignored
      }
    };
    checkGeofenceAlert();
  }, []);

  // Mô phỏng kích hoạt khẩn cấp Màn 2/4 để kiểm tra giao diện
  const handleTriggerSimulateAlert = () => {
    setActiveAlert({
      has_active_alert: true,
      alert_id: "demo-alert-45",
      alert_type: "FLOOD",
      title: "CẢNH BÁO KHẨN CẤP",
      content:
        "Ngập nặng trên 0.8m do triều cường kết hợp mưa lớn đạt đỉnh trong 15 phút tới. Nguy cơ ngập sâu và cô lập cục bộ.",
      situation_message: "Ngập nặng trong bán kính 2 km quanh bạn",
      radius_meters: 2000,
      severity: "CRITICAL",
      hotline_phone: "114 - 115 - 18006868",
      safe_routes_summary: "Đường Trần Hưng Đạo hoặc đường Võ Văn Kiệt",
    });
    setShowAlertModal(true);
  };

  // Màn 2/4 -> Nút "Tôi an toàn": Chuyển sang Màn 3/4 Safety Check
  const handleNavigateFromModalToSafetyCheck = () => {
    setShowAlertModal(false);
    setCurrentView("SAFETY_CHECK");
  };

  // Màn 2/4 -> Nút "Xem chi tiết": Chuyển sang bản đồ tránh ngập STT 41
  const handleNavigateFromModalToSafeRoute = () => {
    setShowAlertModal(false);
    if (onNavigateSafeRoute) {
      onNavigateSafeRoute();
    }
  };

  // Màn 3/4 -> Bấm "Gửi cho bạn bè" thành công: Mở Màn 4/4 Confirm Modal
  const handleSafetyCheckSendSuccess = (sentCount: number, smsFallback: boolean) => {
    setConfirmedSentCount(sentCount);
    setHasSmsFallback(smsFallback);
    setShowConfirmModal(true);
  };

  // Màn 4/4 -> Bấm "Đóng": Chuyển hướng về Bảng tin cộng đồng STT 08
  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false);
    if (onNavigateFeed) {
      onNavigateFeed();
    } else if (onNavigateHome) {
      onNavigateHome();
    }
  };

  const userRole = currentUser?.role || "ADMIN";
  const userFullName = currentUser?.full_name || (userRole === "ADMIN" ? "Cán bộ Ban Chỉ huy PCTT" : "Công dân sinh thái");

  return (
    <div className="emergency-module-wrapper">
      {/* HEADER QUẢN TRỊ & ĐIỀU HƯỚNG THEO PROTOTYPE */}
      <EmergencyHeader
        currentView={currentView}
        onSwitchView={setCurrentView}
        onTriggerSimulateAlert={handleTriggerSimulateAlert}
        onBackToHome={onNavigateHome}
        userFullName={userFullName}
        userRole={userRole}
      />

      {/* NỘI DUNG MÀN HÌNH CHÍNH (MÀN 1/4 HOẶC MÀN 3/4) */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {currentView === "CONSOLE" ? (
          <Screen1BroadcastConsole
            onBroadcastSuccess={() => {
              // Sau khi phát sóng thành công, cho phép cán bộ thử nghiệm xem Modal người dân
              handleTriggerSimulateAlert();
            }}
          />
        ) : (
          <Screen3SafetyCheck
            onSendSuccess={handleSafetyCheckSendSuccess}
            onNavigateFeed={onNavigateFeed}
          />
        )}
      </main>

      {/* MÀN 2/4: POPUP CẢNH BÁO KHẨN CẤP NHẤP NHÁY (KHI CÓ GÓI TIN MÁY CHỦ HOẶC TEST) */}
      {showAlertModal && activeAlert && (
        <Screen2AlertModal
          alertData={activeAlert}
          onNavigateSafetyCheck={handleNavigateFromModalToSafetyCheck}
          onNavigateSafeRoute={handleNavigateFromModalToSafeRoute}
          onClose={() => setShowAlertModal(false)}
        />
      )}

      {/* MÀN 4/4: POPUP XÁC NHẬN HOÀN TẤT BÁO AN TOÀN (KHI GỬI XONG MÀN 3/4) */}
      {showConfirmModal && (
        <Screen4SafetyConfirmModal
          sentCount={confirmedSentCount}
          hasSmsFallback={hasSmsFallback}
          onClose={handleCloseConfirmModal}
        />
      )}

      {/* FOOTER ĐỒNG BỘ THEO PROTOTYPE */}
      <EmergencyFooter />
    </div>
  );
};
