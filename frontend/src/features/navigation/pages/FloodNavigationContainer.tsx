import React, { useState, useEffect } from 'react';
import '../styles/navigation.scss';

import type {
  DualRouteResponse,
  EarlyWarningAlert,
  GeoLocationPoint,
  NavigationRoutePlan,
  ScreenStep,
  VehicleCategory,
} from '../types/navigation.types';

import {
  calculateDualRoutesAPI,
  checkEarlyWarningAPI,
  rerouteAvoidingFloodAPI,
  speakVietnamese,
} from '../services/navigationApi';

import { Screen1Input } from '../components/Screen1Input';
import { Screen2Compare } from '../components/Screen2Compare';
import { Screen3Directions } from '../components/Screen3Directions';
import { Screen4EmergencyModal } from '../components/Screen4EmergencyModal';
import { InteractiveMap } from '../components/InteractiveMap';
import {
  getLocalPreferences,
  saveLocalPreferences,
  applyThemeToDocument,
  subscribeThemeChange,
} from '../../settings';

export const FloodNavigationContainer: React.FC = () => {
  // Navigation State
  const [currentStep, setCurrentStep] = useState<ScreenStep>(1);

  // Mặc định: Điểm đi (Bến Thành), Điểm đến (Landmark 81)
  const [origin, setOrigin] = useState<GeoLocationPoint>({
    name: 'Chợ Bến Thành, Quận 1',
    latitude: 10.7725,
    longitude: 106.698,
  });

  const [destination, setDestination] = useState<GeoLocationPoint>({
    name: 'Landmark 81, Quận Bình Thạnh',
    latitude: 10.7951,
    longitude: 106.7218,
  });

  // Mặc định phương tiện là Xe máy
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory>('MOTORBIKE');

  // Lộ trình & Phương án
  const [planData, setPlanData] = useState<DualRouteResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'FASTEST' | 'SAFEST'>('SAFEST');
  const [activeRoutePlan, setActiveRoutePlan] = useState<NavigationRoutePlan | null>(null);

  // Trạng thái xử lý
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoadingTide, setIsLoadingTide] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mapNetworkError, setMapNetworkError] = useState(false);

  // Cảnh báo & Thông báo
  const [validationError, setValidationError] = useState<string | null>(null);
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Quản lý Giao diện Sáng / Tối (Light / Dark Theme)
  const [currentTheme, setCurrentTheme] = useState<'LIGHT' | 'DARK'>(() => {
    try {
      return getLocalPreferences().theme;
    } catch {
      return 'LIGHT';
    }
  });

  useEffect(() => {
    try {
      const unsub = subscribeThemeChange((newTheme) => {
        setCurrentTheme(newTheme);
      });
      return unsub;
    } catch {
      return undefined;
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = currentTheme === 'DARK' ? 'LIGHT' : 'DARK';
    try {
      const prefs = getLocalPreferences();
      saveLocalPreferences({ ...prefs, theme: nextTheme });
      applyThemeToDocument(nextTheme);
    } catch {
      // ignore
    }
    setCurrentTheme(nextTheme);
  };

  // Màn 4/4: Popup khẩn cấp
  const [emergencyAlert, setEmergencyAlert] = useState<EarlyWarningAlert | null>(null);
  const [flashingHazardId, setFlashingHazardId] = useState<string | null>(null);

  // Toast auto-dismiss after 2-3s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Kiểm tra điểm đến né ngập được truyền từ Điều phối (STT 43) hoặc Trợ lý giọng nói (STT 37)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("greenspot_nav_destination");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          const lat = Number(parsed.destLat ?? parsed.latitude);
          const lng = Number(parsed.destLng ?? parsed.longitude);
          const name = parsed.destName || parsed.destAddress || parsed.name || "Vị trí sự cố cần đến";
          if (!isNaN(lat) && !isNaN(lng)) {
            setDestination({
              name,
              latitude: lat,
              longitude: lng,
            });
            setToastMessage({
              text: `📍 Đã thiết lập điểm đến né ngập: ${name}`,
              type: "success",
            });
          }
          localStorage.removeItem("greenspot_nav_destination");
        }
      }
    } catch {}
  }, []);

  // Bắt GPS thiết bị người dùng
  const handleGpsRequest = () => {
    setGpsWarning(null);
    if (!navigator.geolocation) {
      setGpsWarning('Không thể lấy vị trí. Hãy bật định vị thiết bị');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({
          name: 'Vị trí hiện tại của tôi',
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
        });
        setToastMessage({
          text: 'Đã xác định vị trí GPS thiết bị thành công',
          type: 'success',
        });
      },
      (err) => {
        console.warn('Geolocation error', err);
        setGpsWarning('Không thể lấy vị trí. Hãy bật định vị thiết bị');
      },
      { timeout: 7000 }
    );
  };

  // Nút "Tìm đường" (Màn 1 -> Màn 2)
  const handleFindRoute = async () => {
    setValidationError(null);

    // Rule 1: Để trống điểm đi hoặc điểm đến
    if (!origin.name.trim() || !destination.name.trim()) {
      setValidationError('Vui lòng nhập đầy đủ điểm đi và điểm đến');
      return;
    }

    // Rule 2: Điểm đi và điểm đến trùng nhau
    const isSameName = origin.name.trim().toLowerCase() === destination.name.trim().toLowerCase();
    const isSameCoords =
      Math.abs(origin.latitude - destination.latitude) < 0.0001 &&
      Math.abs(origin.longitude - destination.longitude) < 0.0001;

    if (isSameName || isSameCoords) {
      setValidationError('Điểm đi và điểm đến không được trùng nhau');
      return;
    }

    // Tiến hành tính toán
    setIsCalculating(true);
    setToastMessage({
      text: 'Đang tính toán tuyến đường an toàn…',
      type: 'info',
    });

    try {
      setIsLoadingTide(true);
      const data = await calculateDualRoutesAPI(origin, destination, selectedVehicle);
      setPlanData(data);
      setSelectedRouteType('SAFEST');
      setActiveRoutePlan(data.safest_route);

      // Chuyển sang Màn 2 (So sánh 2 tuyến)
      setCurrentStep(2);

      if (data.all_clear) {
        setToastMessage({
          text: 'Tất cả các tuyến đường đều an toàn, không có ngập',
          type: 'success',
        });
      } else if (data.all_flooded) {
        setToastMessage({
          text: 'Cảnh báo: Toàn bộ lộ trình đều có điểm ngập sâu',
          type: 'warning',
        });
      }
    } catch (err) {
      console.error(err);
      setToastMessage({
        text: 'Không thể tính toán tuyến đường. Vui lòng thử lại',
        type: 'warning',
      });
    } finally {
      setIsCalculating(false);
      setIsLoadingTide(false);
    }
  };

  // Chọn tuyến (Màn 2 -> Màn 3)
  const handleSelectRoute = () => {
    if (!planData) return;
    const chosen = selectedRouteType === 'SAFEST' ? planData.safest_route : planData.fastest_route;
    setActiveRoutePlan(chosen);
    setCurrentStep(3);
  };

  // Bắt đầu đi (Navigation Mode)
  const handleStartNavigation = () => {
    setIsNavigating(true);
    setToastMessage({
      text: 'Bắt đầu dẫn đường theo tuyến an toàn',
      type: 'success',
    });

    // Bật giọng đọc chỉ dẫn rảnh tay
    speakVietnamese('Bắt đầu dẫn đường theo tuyến an toàn. Chúc bạn một chuyến đi bình an.');

    // Giả lập hệ thống chạy ngầm giám sát ngập:
    // Sau 4 giây, phát hiện điểm ngập mới phát sinh trên tuyến (< 500m) -> bật Màn 4 Popup
    setTimeout(async () => {
      if (activeRoutePlan) {
        const warning = await checkEarlyWarningAPI(
          origin.latitude,
          origin.longitude,
          activeRoutePlan.coordinates,
          selectedVehicle
        );

        const alertMsg = warning.alert_message || 'Cảnh báo: Phía trước 300m có điểm ngập sâu';
        setToastMessage({
          text: alertMsg,
          type: 'warning',
        });

        // Kích hoạt Popup khẩn cấp
        setEmergencyAlert(
          warning.has_hazard_ahead
            ? warning
            : {
                has_hazard_ahead: true,
                distance_ahead_meters: 300,
                alert_title: 'CẢNH BÁO NGẬP',
                alert_message: alertMsg,
                water_level_display: 'Mực nước: 0.45m - Nguy cơ chết máy cao',
                voice_announcement:
                  'Cảnh báo, phía trước ba trăm mét có điểm ngập sâu, bạn có muốn đổi tuyến?',
                suggested_reroute_available: true,
              }
        );
      }
    }, 4000);
  };

  // Nút Chia sẻ tuyến
  const handleShareRoute = async () => {
    const shareUrl = `${window.location.origin}#navigation?from=${encodeURIComponent(
      origin.name
    )}&to=${encodeURIComponent(destination.name)}&v=${selectedVehicle}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage({
        text: 'Đã sao chép liên kết lộ trình an toàn',
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 2000);
    } catch {
      setToastMessage({
        text: 'Đã sao chép liên kết lộ trình an toàn',
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  // Người dùng đi chệch khỏi tuyến an toàn
  const handleSimulateOffRoute = async () => {
    setToastMessage({
      text: 'Đang tính toán lại lộ trình an toàn…',
      type: 'info',
    });

    speakVietnamese('Bạn đã đi chệch khỏi tuyến an toàn. Đang tính toán lại lộ trình an toàn.');

    try {
      const newPlan = await rerouteAvoidingFloodAPI(origin, destination, selectedVehicle);
      setActiveRoutePlan(newPlan);
      setToastMessage({
        text: 'Đã cập nhật lại lộ trình an toàn mới',
        type: 'success',
      });
    } catch (err) {
      console.warn(err);
    }
  };

  // Popup Màn 4: Bấm "Đổi tuyến"
  const handleEmergencyReroute = async () => {
    setEmergencyAlert(null);
    setToastMessage({
      text: 'Đã tìm thấy tuyến đường mới an toàn hơn',
      type: 'success',
    });

    speakVietnamese('Đã tìm thấy tuyến đường mới an toàn hơn. Vui lòng rẽ tại ngã rẽ kế tiếp.');

    try {
      const newPlan = await rerouteAvoidingFloodAPI(origin, destination, selectedVehicle);
      setActiveRoutePlan(newPlan);
    } catch (err) {
      console.warn(err);
    }
  };

  // Popup Màn 4: Bấm "Tiếp tục"
  const handleEmergencyContinue = () => {
    setEmergencyAlert(null);
    // Giữ nguyên tuyến, nhấp nháy icon điểm ngập trên bản đồ
    setFlashingHazardId('FL-WARN-300');
  };

  return (
    <div className={`flood-navigation-container ${currentTheme === 'DARK' ? 'dark-theme dark-mode' : 'light-theme light-mode'}`}>
      {/* ------------------------------------------------------------------ */}
      {/* HEADER: logo | menu | theme toggle | chuông | avatar */}
      {/* ------------------------------------------------------------------ */}
      <header className="nav-header">
        <div className="header-left">
          <div className="brand-logo">
            <span className="logo-icon">🌿</span>
            <span>GreenSpot SafeNav</span>
          </div>
          <span className="feature-tag">Tránh Ngập Đô Thị</span>
        </div>

        <nav className="header-nav">
          <a href="#map" className="nav-link">Bản đồ số</a>
          <a href="#navigation" className="nav-link active">Định tuyến tránh ngập</a>
          <a href="#triage" className="nav-link">Báo cáo ngập</a>
          <a href="#dashboard" className="nav-link">Chất lượng khí</a>
        </nav>

        <div className="header-right">
          <button
            type="button"
            className="theme-nav-toggle-btn"
            onClick={handleToggleTheme}
            title={currentTheme === 'DARK' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
            aria-label="Đổi giao diện sáng tối"
          >
            <span>{currentTheme === 'DARK' ? '☀️' : '🌙'}</span>
            <span>{currentTheme === 'DARK' ? 'Sáng' : 'Tối'}</span>
          </button>
          <button type="button" className="icon-btn" title="Thông báo khẩn cấp">
            <span style={{ fontSize: '1.2rem' }}>🔔</span>
          </button>
          <div className="avatar" title="Tài khoản cá nhân">
            <span>GS</span>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* PHẦN GIỮA: NỘI DUNG TỪNG MÀN HÌNH (MÀN 1 -> MÀN 3) */}
      {/* ------------------------------------------------------------------ */}
      <main className="nav-main-content">
        {/* Banner thông báo trạng thái */}
        {toastMessage && (
          <div className={`system-toast-banner toast-${toastMessage.type}`}>
            <span>ℹ️</span>
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* MÀN 1: NHẬP ĐIỂM ĐI / ĐẾN */}
        {currentStep === 1 && (
          <div className="two-column-layout">
            <Screen1Input
              origin={origin}
              destination={destination}
              selectedVehicle={selectedVehicle}
              onOriginChange={setOrigin}
              onDestinationChange={setDestination}
              onVehicleChange={setSelectedVehicle}
              validationError={validationError}
              gpsWarning={gpsWarning}
              onClearErrors={() => {
                setValidationError(null);
                setGpsWarning(null);
              }}
              onGpsRequested={handleGpsRequest}
            />

                <InteractiveMap
                  currentStep={1}
                  origin={origin}
                  destination={destination}
                  planData={null}
                  selectedRouteType={selectedRouteType}
                  onOriginMapPick={(lat, lng) =>
                    setOrigin({ name: `Tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`, latitude: lat, longitude: lng })
                  }
                  onDestinationMapPick={(lat, lng) =>
                    setDestination({ name: `Tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`, latitude: lat, longitude: lng })
                  }
                  onFindRouteClick={handleFindRoute}
                  onSelectRouteClick={() => {}}
                  isCalculating={isCalculating}
                  mapNetworkError={mapNetworkError}
                  onRetryMapLoad={() => setMapNetworkError(false)}
                />
              </div>
            )}

            {/* MÀN 2: SO SÁNH 2 TUYẾN (3 KHỐI THEO CHIỀU NGANG) */}
            {currentStep === 2 && planData && (
              <div className="three-column-layout">
                <Screen2Compare
                  planData={planData}
                  selectedRouteType={selectedRouteType}
                  onSelectRouteType={setSelectedRouteType}
                  isLoadingTide={isLoadingTide}
                  onBackToInput={() => setCurrentStep(1)}
                />

                <InteractiveMap
                  currentStep={2}
                  origin={origin}
                  destination={destination}
                  planData={planData}
                  selectedRouteType={selectedRouteType}
                  onOriginMapPick={() => {}}
                  onDestinationMapPick={() => {}}
                  onFindRouteClick={() => {}}
                  onSelectRouteClick={handleSelectRoute}
                  isCalculating={false}
                  mapNetworkError={mapNetworkError}
                  onRetryMapLoad={() => setMapNetworkError(false)}
                  flashingHazardId={flashingHazardId}
                />
              </div>
            )}

            {/* MÀN 3: CHI TIẾT TUYẾN AN TOÀN */}
            {currentStep === 3 && activeRoutePlan && (
              <Screen3Directions
                routePlan={activeRoutePlan}
                isNavigating={isNavigating}
                onStartNavigation={handleStartNavigation}
                onShareRoute={handleShareRoute}
                onSimulateOffRoute={handleSimulateOffRoute}
                onBackToCompare={() => setCurrentStep(2)}
              />
            )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* MÀN 4: POPUP CẢNH BÁO ĐIỂM NGẬP TRÊN TUYẾN (< 500m) */}
      {/* ------------------------------------------------------------------ */}
      {emergencyAlert && emergencyAlert.has_hazard_ahead && (
        <Screen4EmergencyModal
          alertData={emergencyAlert}
          onReroute={handleEmergencyReroute}
          onContinue={handleEmergencyContinue}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER: bản quyền | liên hệ | chính sách */}
      {/* ------------------------------------------------------------------ */}
      <footer className="nav-footer">
        <div>
          <span>© 2026 GreenSpot / EcoReport Vietnam. Bản quyền thuộc về Nhóm J.</span>
        </div>
        <div className="footer-links">
          <a href="#privacy">Chính sách bảo mật</a>
          <a href="#terms">Điều khoản sử dụng</a>
          <a href="#contact">Liên hệ trạm quan trắc</a>
        </div>
      </footer>
    </div>
  );
};
