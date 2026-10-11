import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationData } from "../types/postTypes";
import { postService } from "../services/postService";

interface LocationPickerModalProps {
  isOpen: boolean;
  initialLocation?: LocationData | null;
  onConfirm: (loc: LocationData) => void;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  initialLocation,
  onConfirm,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Mặc định tọa độ trung tâm TP.HCM (Quận 1)
  const [currentLat, setCurrentLat] = useState<number>(initialLocation?.latitude || 10.7769);
  const [currentLng, setCurrentLng] = useState<number>(initialLocation?.longitude || 106.7009);
  const [address, setAddress] = useState<string>(
    initialLocation?.address || "Đang xác định địa chỉ…"
  );

  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);
  const [boundsError, setBoundsError] = useState<string | null>(null);

  // Kiểm tra phạm vi hỗ trợ (Lãnh thổ Việt Nam)
  const isWithinSupportedBounds = (lat: number, lng: number) => {
    return lat >= 8.0 && lat <= 24.0 && lng >= 102.0 && lng <= 110.0;
  };

  // 1. Cập nhật Reverse Geocoding khi toạ độ đổi
  const updateAddressForCoords = async (lat: number, lng: number) => {
    if (!isWithinSupportedBounds(lat, lng)) {
      setBoundsError("Vị trí nằm ngoài khu vực hỗ trợ của hệ thống");
      return;
    }
    setBoundsError(null);
    const resolvedAddress = await postService.reverseGeocode(lat, lng);
    setAddress(resolvedAddress);
  };

  // 2. Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const startLat = initialLocation?.latitude || 10.7769;
    const startLng = initialLocation?.longitude || 106.7009;

    setCurrentLat(startLat);
    setCurrentLng(startLng);

    // Dọn dẹp map cũ nếu có
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current).setView([startLat, startLng], 15);
    mapInstanceRef.current = map;

    // Lớp bản đồ OpenStreetMap chuẩn
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Tạo icon ghim
    const defaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    const marker = L.marker([startLat, startLng], {
      draggable: true,
      icon: defaultIcon,
    }).addTo(map);
    markerRef.current = marker;

    // Sự kiện kéo thả ghim
    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      setCurrentLat(pos.lat);
      setCurrentLng(pos.lng);
      await updateAddressForCoords(pos.lat, pos.lng);
    });

    // Sự kiện nhấp trực tiếp trên bản đồ
    map.on("click", async (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setCurrentLat(e.latlng.lat);
      setCurrentLng(e.latlng.lng);
      await updateAddressForCoords(e.latlng.lat, e.latlng.lng);
    });

    // Cập nhật địa chỉ ban đầu
    if (!initialLocation?.address) {
      updateAddressForCoords(startLat, startLng);
    }

    // Fix resize tile render issue
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // 3. Xử lý nút "Dùng vị trí hiện tại" (GPS)
  const handleUseCurrentLocation = () => {
    setGpsWarning(null);
    setBoundsError(null);

    if (!navigator.geolocation) {
      setGpsWarning("Không thể lấy vị trí. Vui lòng bật định vị thiết bị");
      return;
    }

    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingGPS(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCurrentLat(lat);
        setCurrentLng(lng);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }

        await updateAddressForCoords(lat, lng);
      },
      (err) => {
        setIsLocatingGPS(false);
        console.warn("Lỗi GPS:", err.message);
        setGpsWarning("Không thể lấy vị trí. Vui lòng bật định vị thiết bị");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 4. Xác nhận vị trí
  const handleConfirmLocation = () => {
    if (!isWithinSupportedBounds(currentLat, currentLng)) {
      setBoundsError("Vị trí nằm ngoài khu vực hỗ trợ của hệ thống");
      return;
    }

    onConfirm({
      latitude: currentLat,
      longitude: currentLng,
      address,
    });
    onClose();
  };

  if (!isOpen) return null;

  const isInvalidBounds = !isWithinSupportedBounds(currentLat, currentLng);

  return (
    <div className="location-modal-backdrop" onClick={onClose}>
      <div className="location-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">📍 Gắn vị trí không gian địa lý</div>
          <button type="button" className="close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Thân 2 khối: Khối Bản đồ (Trái) & Khối Thao tác (Phải) */}
        <div className="modal-body">
          {/* CỘT TRÁI: BẢN ĐỒ TƯƠNG TÁC */}
          <div className="col-map">
            <div ref={mapContainerRef} className="map-canvas" />
            <div className="map-address-banner">
              <span className="pin-icon">{isInvalidBounds ? "⚠️" : "📍"}</span>
              <span className="address-text">{address}</span>
            </div>
          </div>

          {/* CỘT PHẢI: THAO TÁC */}
          <div className="col-actions">
            <div className="action-group">
              <button
                type="button"
                className="btn-gps"
                disabled={isLocatingGPS}
                onClick={handleUseCurrentLocation}
              >
                <span>{isLocatingGPS ? "🔄" : "🎯"}</span>
                <span>{isLocatingGPS ? "Đang xác định vị trí…" : "Dùng vị trí hiện tại"}</span>
              </button>

              {gpsWarning && <div className="gps-warning-text">{gpsWarning}</div>}
              {boundsError && <div className="bounds-error-text">{boundsError}</div>}
            </div>

            <button
              type="button"
              className="btn-confirm-location"
              disabled={isInvalidBounds}
              onClick={handleConfirmLocation}
            >
              Xác nhận vị trí
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
