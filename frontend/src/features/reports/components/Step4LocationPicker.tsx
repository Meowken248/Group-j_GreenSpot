import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { IncidentLocation, ReportFormData } from "../types/report.types";
import {
  reverseGeocodeCoordinates,
  isCoordinatesInHCMC,
} from "../services/reportService";

interface Step4Props {
  formData: ReportFormData;
  onUpdateFormData: (updates: Partial<ReportFormData>) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
}

// Toạ độ mặc định trung tâm TP.HCM (Quận 1 - Nhà thờ Đức Bà)
const DEFAULT_HCMC_CENTER = { lat: 10.7769, lng: 106.7009 };

export const Step4LocationPicker: React.FC<Step4Props> = ({
  formData,
  onUpdateFormData,
  onPrevStep,
  onNextStep,
}) => {
  const [currentLocation, setCurrentLocation] = useState<IncidentLocation | null>(
    formData.location || null
  );
  const [accuracyMeters, setAccuracyMeters] = useState<number>(
    formData.location?.accuracy_meters || 15
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(true);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Tạo icon ghim tuỳ biến: Xanh khi hợp lệ, Đỏ khi ngoài 22 quận/huyện
  const createCustomPinIcon = (isValid: boolean) => {
    const pinColor = isValid ? "#10b981" : "#ef4444";
    const svgHtml = `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 24 24" width="38" height="38" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
        </svg>
      </div>
    `;
    return L.divIcon({
      className: "custom-leaflet-pin",
      html: svgHtml,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    });
  };

  // Cập nhật vị trí và gọi reverse geocode
  const updatePosition = async (lat: number, lng: number, accuracy: number = 15) => {
    setIsLocating(true);
    setErrorMessage(null);
    setWarningMessage(null);

    // 1. Kiểm tra sai số GPS > 50m
    if (accuracy > 50) {
      setWarningMessage(
        "Độ chính xác thấp. Hãy kiểm tra và chỉnh lại ghim trên bản đồ"
      );
    }

    // 2. Kiểm tra có nằm trong 22 quận/huyện TP.HCM không
    const withinHCMC = isCoordinatesInHCMC(lat, lng);
    if (!withinHCMC) {
      setErrorMessage("Vị trí nằm ngoài phạm vi tiếp nhận của hệ thống");
    }

    try {
      const geoResult = await reverseGeocodeCoordinates(lat, lng);
      geoResult.accuracy_meters = Math.round(accuracy);
      geoResult.is_within_hcmc = withinHCMC;

      setCurrentLocation(geoResult);
      setAccuracyMeters(Math.round(accuracy));
      onUpdateFormData({ location: geoResult });

      // Cập nhật marker và circle trên bản đồ
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setIcon(createCustomPinIcon(withinHCMC));
      }
      if (circleRef.current) {
        circleRef.current.setLatLng([lat, lng]);
        circleRef.current.setRadius(accuracy);
        circleRef.current.setStyle({
          color: withinHCMC ? "#10b981" : "#ef4444",
          fillColor: withinHCMC ? "#34d399" : "#f87171",
        });
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([lat, lng]);
      }
    } catch (err) {
      console.warn("Lỗi phân giải vị trí:", err);
    } finally {
      setIsLocating(false);
    }
  };

  // Tự động bắt GPS ngay khi vào màn hình
  const requestCurrentGPS = () => {
    setIsLocating(true);
    setErrorMessage(null);

    if (!navigator.geolocation) {
      setErrorMessage("Trình duyệt không hỗ trợ dịch vụ định vị GPS.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        updatePosition(latitude, longitude, accuracy);
      },
      (err) => {
        setIsLocating(false);
        console.warn("Lỗi bắt GPS:", err);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage(
            "Không truy cập được vị trí. Hãy cấp quyền hoặc chọn vị trí trên bản đồ"
          );
        } else if (err.code === err.TIMEOUT) {
          setErrorMessage("Không lấy được vị trí. Vui lòng thử lại");
        } else {
          setErrorMessage(
            "Không lấy được vị trí. Hãy kiểm tra kết nối mạng và thử lại"
          );
        }
        // Giữ lại vị trí hiện tại hoặc fallback trung tâm TP.HCM
        if (!currentLocation) {
          updatePosition(DEFAULT_HCMC_CENTER.lat, DEFAULT_HCMC_CENTER.lng, 30);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  };

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat = currentLocation?.latitude || DEFAULT_HCMC_CENTER.lat;
    const initialLng = currentLocation?.longitude || DEFAULT_HCMC_CENTER.lng;
    const initialValid = isCoordinatesInHCMC(initialLat, initialLng);

    try {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: true,
      });

      // Lớp bản đồ nền OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors | GreenSpot",
        maxZoom: 19,
      }).addTo(map);

      // Vòng tròn thể hiện sai số GPS
      const circle = L.circle([initialLat, initialLng], {
        radius: accuracyMeters,
        color: initialValid ? "#10b981" : "#ef4444",
        fillColor: initialValid ? "#34d399" : "#f87171",
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);
      circleRef.current = circle;

      // Ghim có thể kéo thả (Draggable Marker)
      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: createCustomPinIcon(initialValid),
      }).addTo(map);
      markerRef.current = marker;

      // Khi người dùng kéo thả ghim sang vị trí mới
      marker.on("dragend", (e: any) => {
        const newLatLng = e.target.getLatLng();
        updatePosition(newLatLng.lat, newLatLng.lng, 10);
      });

      // Khi người dùng click trực tiếp trên bản đồ
      map.on("click", (e: L.LeafletMouseEvent) => {
        updatePosition(e.latlng.lat, e.latlng.lng, 10);
      });

      mapInstanceRef.current = map;
      setIsMapLoaded(true);
    } catch (err) {
      console.error("Lỗi khởi tạo bản đồ:", err);
      setIsMapLoaded(false);
    }

    // Tự động kích hoạt GPS khi chưa có vị trí
    if (!formData.location) {
      requestCurrentGPS();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const isValidLocation = Boolean(
    currentLocation && currentLocation.is_within_hcmc
  );

  return (
    <div className="report-step-content step-4-container">
      <div className="step-header">
        <h2 className="step-title">4. Xác định vị trí sự cố trên bản đồ</h2>
        <p className="step-subtitle">
          Hệ thống tự động định vị GPS hiện tại. Bạn có thể kéo thả ghim hoặc bấm trên bản đồ để căn chỉnh chính xác nơi xảy ra sự cố.
        </p>
      </div>

      {/* THÔNG BÁO LỖI VÀ CẢNH BÁO */}
      {errorMessage && (
        <div className="inline-error-banner location-alert">
          ⛔ {errorMessage}
        </div>
      )}
      {warningMessage && (
        <div className="inline-warning-banner location-alert">
          ⚠️ {warningMessage}
        </div>
      )}

      {/* KHUNG BẢN ĐỒ VÀ GHIM VỊ TRÍ */}
      <div className="section-card map-picker-section">
        <div className="map-wrapper">
          {/* Vòng quay khi đang xác định vị trí */}
          {isLocating && (
            <div className="map-locating-overlay">
              <div className="spinner" />
              <span>Đang xác định vị trí…</span>
            </div>
          )}

          {/* Vùng chứa bản đồ Leaflet */}
          {isMapLoaded ? (
            <div ref={mapContainerRef} className="leaflet-map-element" />
          ) : (
            <div className="map-fallback-box">
              <p>Không tải được bản đồ. Toạ độ GPS vẫn được ghi nhận</p>
              <code>
                Lat: {currentLocation?.latitude.toFixed(6)} | Lng:{" "}
                {currentLocation?.longitude.toFixed(6)}
              </code>
            </div>
          )}

          {/* Hộp độ chính xác GPS nổi trên bản đồ */}
          <div className="accuracy-floating-badge">
            <span className="gps-dot pulse" />
            <span>Sai số GPS: ~{accuracyMeters}m</span>
          </div>
        </div>

        {/* NÚT THAO TÁC BẢN ĐỒ */}
        <div className="map-action-bar">
          <button
            type="button"
            className="btn-secondary btn-recenter-gps"
            onClick={requestCurrentGPS}
            disabled={isLocating}
          >
            🎯 Dùng vị trí hiện tại
          </button>
          <span className="drag-hint">
            💡 <em>Gợi ý: Bạn có thể bấm hoặc kéo ghim để chỉnh lại điểm</em>
          </span>
        </div>
      </div>

      {/* KHUNG ĐỊA CHỈ & QUẬN/HUYỆN */}
      <div className="section-card address-display-section">
        <div className="address-item">
          <label className="field-label">📍 Địa chỉ nhận diện tự động:</label>
          <div className="address-box">
            {currentLocation ? (
              <span className="address-value-text">
                {currentLocation.address_text}
              </span>
            ) : (
              <span className="address-placeholder-text">
                Đang chờ xác định tọa độ...
              </span>
            )}
          </div>
        </div>

        <div className="coords-row">
          <div className="coord-chip">
            <span className="coord-label">Quận / Huyện:</span>
            <span className="coord-val">
              {currentLocation?.district_name || "Thành phố Hồ Chí Minh"}
            </span>
          </div>
          <div className="coord-chip">
            <span className="coord-label">Tọa độ:</span>
            <span className="coord-val">
              {currentLocation
                ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`
                : "Chưa có"}
            </span>
          </div>
          <div className="coord-chip">
            <span className="coord-label">Phạm vi TP.HCM:</span>
            <span
              className={`coord-val ${
                isValidLocation ? "text-emerald" : "text-rose"
              }`}
            >
              {isValidLocation ? "✅ Hợp lệ (22 Quận/Huyện)" : "❌ Ngoài phạm vi"}
            </span>
          </div>
        </div>
      </div>

      {/* KHUNG ĐIỀU HƯỚNG */}
      <div className="navigation-actions-bar">
        <button
          type="button"
          className="btn-secondary btn-back"
          onClick={onPrevStep}
        >
          ← Quay lại
        </button>

        <button
          type="button"
          className={`btn-primary btn-confirm-location ${
            !isValidLocation || isLocating ? "btn-disabled" : ""
          }`}
          onClick={() => {
            if (isValidLocation) {
              onNextStep();
            }
          }}
          disabled={!isValidLocation || isLocating}
        >
          Xác nhận vị trí →
        </button>
      </div>
    </div>
  );
};
