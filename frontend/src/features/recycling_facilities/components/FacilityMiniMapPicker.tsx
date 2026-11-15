import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface FacilityMiniMapPickerProps {
  latitude: number;
  longitude: number;
  onChangeLocation: (lat: number, lng: number) => void;
  disabled?: boolean;
  proximityWarning?: string | null;
}

const DEFAULT_HCMC_CENTER = { lat: 10.7769, lng: 106.7009 };

// Ranh giới toạ độ 22 quận/huyện TP.HCM
export const isCoordinatesInHCMC = (lat: number, lng: number): boolean => {
  return lat >= 10.35 && lat <= 11.16 && lng >= 106.35 && lng <= 107.03;
};

export const FacilityMiniMapPicker: React.FC<FacilityMiniMapPickerProps> = ({
  latitude,
  longitude,
  onChangeLocation,
  disabled = false,
  proximityWarning = null,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const isValidCoords =
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude !== 0 &&
    longitude !== 0 &&
    isCoordinatesInHCMC(latitude, longitude);

  // Tạo icon ghim tuỳ biến: Xanh khi hợp lệ, Đỏ khi ngoài ranh giới
  const createPinIcon = (valid: boolean) => {
    const pinColor = valid ? "#059669" : "#dc2626";
    const svgHtml = `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
        </svg>
      </div>
    `;
    return L.divIcon({
      className: "custom-facility-pin",
      html: svgHtml,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
    });
  };

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = isValidCoords ? latitude : DEFAULT_HCMC_CENTER.lat;
    const initialLng = isValidCoords ? longitude : DEFAULT_HCMC_CENTER.lng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      draggable: !disabled,
      icon: createPinIcon(isValidCoords),
    }).addTo(map);

    marker.on("dragend", (e) => {
      const pos = e.target.getLatLng();
      const newLat = parseFloat(pos.lat.toFixed(6));
      const newLng = parseFloat(pos.lng.toFixed(6));
      onChangeLocation(newLat, newLng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      const newLat = parseFloat(e.latlng.lat.toFixed(6));
      const newLng = parseFloat(e.latlng.lng.toFixed(6));
      onChangeLocation(newLat, newLng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Cập nhật marker khi toạ độ thay đổi từ bên ngoài
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) return;

    const valid = isCoordinatesInHCMC(latitude, longitude);
    markerRef.current.setLatLng([latitude, longitude]);
    markerRef.current.setIcon(createPinIcon(valid));
    mapInstanceRef.current.panTo([latitude, longitude]);
  }, [latitude, longitude]);

  // Lấy vị trí GPS hiện tại của thiết bị
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Trình duyệt không hỗ trợ định vị GPS");
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        onChangeLocation(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        setGeoError(`Không thể lấy vị trí hiện tại (${err.message})`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="facility-mini-map-wrapper">
      <div className="mini-map-toolbar">
        <div className="coords-readout">
          <span className="coord-chip">
            <strong>Vĩ độ (Lat):</strong> {latitude ? latitude.toFixed(6) : "Chưa chọn"}
          </span>
          <span className="coord-chip">
            <strong>Kinh độ (Lng):</strong> {longitude ? longitude.toFixed(6) : "Chưa chọn"}
          </span>
        </div>
        <button
          type="button"
          className="btn-locate-me"
          onClick={handleGetCurrentLocation}
          disabled={disabled || isLocating}
          title="Lấy toạ độ GPS vị trí hiện tại của thiết bị"
        >
          {isLocating ? "Đang định vị…" : "📍 Vị trí hiện tại"}
        </button>
      </div>

      {geoError && <div className="map-warning-bar">{geoError}</div>}
      {proximityWarning && (
        <div className="map-warning-bar proximity-warning">
          <span>⚠️ {proximityWarning}</span>
        </div>
      )}
      {!isValidCoords && (
        <div className="map-warning-bar out-of-bounds">
          <span>⚠️ Vị trí phải nằm trong ranh giới 22 quận/huyện TP.HCM</span>
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="mini-map-container"
        style={{ height: "260px", width: "100%", borderRadius: "10px", zIndex: 1 }}
      />
      <span className="mini-map-hint">
        💡 <em>Nhấp chuột vào bản đồ hoặc kéo thả ghim màu xanh để xác định chính xác vị trí trạm.</em>
      </span>
    </div>
  );
};

