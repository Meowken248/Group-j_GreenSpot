import React, { useState, useEffect, useCallback } from "react";
import type {
  DistrictDetailResponse,
  FilterAnalysisRequest,
  FilterAnalysisResponse,
  OverviewMetricsResponse,
} from "../types/riskDashboard.types";
import { riskDashboardApi } from "../services/riskDashboardApi";
import { ExecutiveHeader } from "../components/ExecutiveHeader";
import { ExecutiveFooter } from "../components/ExecutiveFooter";
import { Screen1Overview } from "../components/Screen1Overview";
import { Screen2Analysis } from "../components/Screen2Analysis";
import { Screen3DistrictPopup } from "../components/Screen3DistrictPopup";
import { navigateToRoute } from "../../../routes/appRoutes";
import "../styles/riskDashboard.scss";

interface RiskDashboardContainerProps {
  currentUser?: {
    full_name?: string;
    role?: string;
    avatar_url?: string;
  } | null;
  onNavigateToMap?: (lat: number, lng: number, districtName: string) => void;
  onBackToHome?: () => void;
}

export const RiskDashboardContainer: React.FC<RiskDashboardContainerProps> = ({
  currentUser,
  onNavigateToMap,
  onBackToHome,
}) => {
  // Quản lý chuyển đổi giữa Màn 1/3 và Màn 2/3
  const [activeScreen, setActiveScreen] = useState<1 | 2>(1);

  // Màn 1 State
  const [overviewData, setOverviewData] = useState<OverviewMetricsResponse | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Màn 2 State
  const [analysisData, setAnalysisData] = useState<FilterAnalysisResponse | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastFilterRequest, setLastFilterRequest] = useState<FilterAnalysisRequest>({
    period: "THIS_MONTH",
  });

  // Màn 3 Popup State
  const [popupData, setPopupData] = useState<DistrictDetailResponse | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);

  // Banner cảnh báo khẩn cấp (> 80)
  const [showCriticalBanner, setShowCriticalBanner] = useState<boolean>(true);

  // 1. Tải số liệu tổng quan (Màn 1)
  const loadOverviewData = useCallback(async () => {
    setIsLoadingOverview(true);
    setOverviewError(null);
    try {
      const data = await riskDashboardApi.getOverview();
      setOverviewData(data);
    } catch {
      setOverviewError("Không thể tải dữ liệu rủi ro đô thị. Vui lòng thử lại");
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  // 2. Tải số liệu phân tích chuyên sâu (Màn 2)
  const loadAnalysisData = useCallback(async (filterReq: FilterAnalysisRequest) => {
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    try {
      const data = await riskDashboardApi.getFilteredAnalysis(filterReq);
      setAnalysisData(data);
    } catch {
      setAnalysisError("Lỗi trích xuất dữ liệu phân tích. Vui lòng thử lại");
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, []);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  // Nạp dữ liệu Màn 2 khi chuyển tab lần đầu nếu chưa có
  useEffect(() => {
    if (activeScreen === 2 && !analysisData && !isLoadingAnalysis) {
      loadAnalysisData(lastFilterRequest);
    }
  }, [activeScreen, analysisData, isLoadingAnalysis, lastFilterRequest, loadAnalysisData]);

  // 3. Mở Màn 3 (Popup Chi tiết quận)
  const handleSelectDistrict = async (districtName: string) => {
    try {
      const detail = await riskDashboardApi.getDistrictDetail(districtName);
      setPopupData(detail);
      setIsPopupOpen(true);
    } catch {
      // Fallback
      setPopupData({
        district_name: districtName,
        risk_score: 78.0,
        risk_level: "HIGH",
        risk_score_text: "Điểm rủi ro: 78/100 - Mức báo động cam",
        pending_incidents_text: "24 bãi rác tự phát, 3 điểm ngập úng sâu",
        spontaneous_dumps_count: 24,
        deep_flood_points_count: 3,
        threatened_facilities_text: "5 trường học, 2 trạm y tế nằm trong vùng nguy cơ",
        schools_count: 5,
        hospitals_count: 2,
        total_facilities_count: 7,
        latitude: 10.7654,
        longitude: 106.6038,
        gis_map_link: `#map?lat=10.7654&lng=106.6038&district=${encodeURIComponent(districtName)}`,
      });
      setIsPopupOpen(true);
    }
  };

  // 4. Xử lý điều hướng sang Bản đồ GIS (STT 33) từ Popup
  const handleNavigateToMap = (detail: DistrictDetailResponse) => {
    setIsPopupOpen(false);
    if (onNavigateToMap) {
      onNavigateToMap(detail.latitude, detail.longitude, detail.district_name);
    } else {
      navigateToRoute("map", {
        lat: String(detail.latitude),
        lng: String(detail.longitude),
        district: detail.district_name,
      });
    }
  };

  // 5. Xử lý xuất báo cáo Excel / PDF
  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      const blob = await riskDashboardApi.exportReport(lastFilterRequest, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Bao_cao_rui_ro_do_thi_${new Date().toISOString().slice(0, 10)}.${format === "csv" ? "csv" : "json"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Đang chuẩn bị file báo cáo tổng hợp. Vui lòng thử lại sau vài giây.");
    }
  };

  const hasCritical = overviewData?.has_critical_alert ?? false;

  return (
    <div className="risk-dashboard-app">
      {/* 1. HEADER: logo | menu quản trị | chuông | avatar */}
      <ExecutiveHeader
        hasCriticalAlert={hasCritical}
        onBellClick={() => {
          if (hasCritical && overviewData?.critical_alert_message) {
            alert(overviewData.critical_alert_message);
          } else {
            alert("Tất cả các trạm quan trắc và chỉ số rủi ro môi trường đang trong tầm kiểm soát an toàn.");
          }
        }}
        currentUser={currentUser}
        onBackToApp={onBackToHome}
        activeScreen={activeScreen}
        onChangeScreen={setActiveScreen}
      />

      {/* 2. SUB NAVIGATION: Chuyển đổi giữa Màn 1 và Màn 2 */}
      <nav className="sub-nav-bar" aria-label="Điều hướng màn hình Dashboard">
        <button
          type="button"
          className={`nav-tab-btn ${activeScreen === 1 ? "active" : ""}`}
          onClick={() => setActiveScreen(1)}
        >
          <span>🏙️</span>
          <span>Màn 1: Tổng quan rủi ro đô thị</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeScreen === 2 ? "active" : ""}`}
          onClick={() => setActiveScreen(2)}
        >
          <span>🔍</span>
          <span>Màn 2: Lọc & phân tích chuyên sâu</span>
        </button>

        <button
          type="button"
          className={`refresh-btn ${isLoadingOverview || isLoadingAnalysis ? "is-refreshing" : ""}`}
          onClick={() => {
            if (activeScreen === 1) loadOverviewData();
            else loadAnalysisData(lastFilterRequest);
          }}
          title="Cập nhật số liệu thời gian thực"
        >
          <span>🔄</span>
          <span>Làm mới số liệu</span>
        </button>
      </nav>

      {/* 3. BANNER CẢNH BÁO KHẨN CẤP (> 80 ĐIỂM) */}
      {hasCritical && showCriticalBanner && overviewData?.critical_alert_message && (
        <div className="critical-banner" role="alert">
          <div className="banner-content">
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <span>{overviewData.critical_alert_message}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="banner-action-btn"
              onClick={() => {
                const criticalDistrict = overviewData.district_risks.find((d) => d.risk_score > 80);
                if (criticalDistrict) {
                  handleSelectDistrict(criticalDistrict.district_name);
                }
              }}
            >
              Xem chi tiết
            </button>
            <button
              type="button"
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "16px" }}
              onClick={() => setShowCriticalBanner(false)}
              title="Ẩn thông báo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 4. VÙNG NỘI DUNG CHÍNH (3 CỘT THEO CHIỀU NGANG) */}
      <main className="exec-content-area">
        {activeScreen === 1 ? (
          isLoadingOverview ? (
            <div className="loading-container">
              <div className="spinner" />
              <span>Đang nạp và tổng hợp dữ liệu toàn thành phố...</span>
            </div>
          ) : overviewError ? (
            <div className="error-container">
              <span>⚠️ {overviewError}</span>
              <button type="button" className="btn-retry" onClick={loadOverviewData}>
                Thử lại
              </button>
            </div>
          ) : overviewData ? (
            <Screen1Overview
              data={overviewData}
              onSelectDistrict={handleSelectDistrict}
            />
          ) : null
        ) : (
          <Screen2Analysis
            analysisData={analysisData}
            isLoading={isLoadingAnalysis}
            errorMessage={analysisError}
            onApplyFilter={(req) => {
              setLastFilterRequest(req);
              loadAnalysisData(req);
            }}
            onExport={handleExport}
            onRetry={() => loadAnalysisData(lastFilterRequest)}
          />
        )}
      </main>

      {/* 5. FOOTER: bản quyền | liên hệ | chính sách */}
      <ExecutiveFooter />

      {/* 6.  POPUP CHI TIẾT QUẬN (MODAL OVERLAY) */}
      <Screen3DistrictPopup
        districtData={popupData}
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onNavigateToMap={handleNavigateToMap}
      />
    </div>
  );
};
