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
  const circleRef = useRef<L.Circle | null>(null);

  // Mặc định tọa độ trung tâm TP.HCM (Quận 1)
  const [currentLat, setCurrentLat] = useState<number>(initialLocation?.latitude || 10.7769);
  const [currentLng, setCurrentLng] = useState<number>(initialLocation?.longitude || 106.7009);
  const [address, setAddress] = useState<string>(
    initialLocation?.address || "Đang xác định địa chỉ…"
  );

  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);
  const [boundsError, setBoundsError] = useState<string | null>(null);

  // Kiểm tra phạm vi hỗ trợ (Lãnh thổ Việt Nam)
  const isWithinSupportedBounds = (lat: number, lng: number) => {
    return lat >= 8.0 && lat <= 24.0 && lng >= 102.0 && lng <= 110.0;
  };

  // 1. Cập nhật Reverse Geocoding khi toạ độ đổi (lấy số nhà & tên đường thật)
  const updateAddressForCoords = async (lat: number, lng: number) => {
    if (!isWithinSupportedBounds(lat, lng)) {
      setBoundsError("Vị trí nằm ngoài khu vực hỗ trợ của hệ thống");
      return;
    }
    setBoundsError(null);
    setIsResolvingAddress(true);
    try {
      const resolvedAddress = await postService.reverseGeocode(lat, lng);
      setAddress(resolvedAddress);
    } catch {
      setAddress(`Khu vực toạ độ (${lat.toFixed(4)}, ${lng.toFixed(4)}), TP. Hồ Chí Minh`);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  // 2. Khởi tạo bản đồ Leaflet với Google Roadmap Tile Cluster siêu nét
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const startLat = initialLocation?.latitude || 10.7769;
    const startLng = initialLocation?.longitude || 106.7009;

    setCurrentLat(startLat);
    setCurrentLng(startLng);
    setAddress(initialLocation?.address || "Đang xác định địa chỉ…");

    // Dọn dẹp map cũ nếu có
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    const map = L.map(mapContainerRef.current).setView([startLat, startLng], 16);
    mapInstanceRef.current = map;

    // Lớp bản đồ Google Roadmap Tile Cluster: Sắc nét, đầy đủ số nhà và tên đường, không bao giờ bị xám
    L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      subdomains: ["0", "1", "2", "3"],
      attribution: "© Google Maps (Roadmap Tiles)",
    }).addTo(map);

    // Tạo icon ghim vị trí chuẩn
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

    // Sự kiện kéo thả ghim đến đúng số nhà mong muốn
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

    // Cập nhật địa chỉ ban đầu nếu chưa có
    if (!initialLocation?.address || initialLocation.address.startsWith("Tọa độ:")) {
      updateAddressForCoords(startLat, startLng);
    }

    // Tự động căn chỉnh khung hình tránh hiện tượng viền xám
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 600);

    return () => {
      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, initialLocation]);

  // 3. Xử lý nút "Dùng vị trí hiện tại" (GPS chuẩn xác cao)
  const handleUseCurrentLocation = () => {
    setGpsWarning(null);
    setBoundsError(null);

    if (!navigator.geolocation) {
      setGpsWarning("Thiết bị hoặc trình duyệt không hỗ trợ Geolocation");
      return;
    }

    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingGPS(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 15);

        setCurrentLat(lat);
        setCurrentLng(lng);
        setGpsAccuracy(accuracy);

        if (mapInstanceRef.current && markerRef.current) {
          // Bay tới vị trí GPS với độ phóng to 17 (thấy rõ từng số nhà và góc phố)
          mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
          markerRef.current.setLatLng([lat, lng]);

          // Vẽ vòng tròn bán kính sai số GPS (Accuracy Circle)
          if (circleRef.current) {
            circleRef.current.remove();
            circleRef.current = null;
          }
          const accuracyCircle = L.circle([lat, lng], {
            radius: accuracy,
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            weight: 1.5,
            dashArray: "4, 4",
          }).addTo(mapInstanceRef.current);
          circleRef.current = accuracyCircle;
        }

        await updateAddressForCoords(lat, lng);
      },
      (err) => {
        setIsLocatingGPS(false);
        console.warn("Lỗi GPS:", err.message);
        setGpsWarning("Không thể lấy vị trí. Vui lòng cho phép quyền truy cập vị trí trên trình duyệt");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

            {/* Banner địa chỉ: Cho phép chỉnh sửa chữ trực tiếp & hiển thị toạ độ */}
            <div className="map-address-banner">
              <span className="pin-icon">{isInvalidBounds ? "⚠️" : isResolvingAddress ? "🔄" : "📍"}</span>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="text"
                    value={address}
                    disabled={isResolvingAddress}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Đang xác định số nhà, tên đường thực tế…"
                    className="address-edit-input"
                    title="Bạn có thể chỉnh sửa hoặc bổ sung số nhà/tên đường cụ thể tại đây"
                    style={{
                      width: "100%",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#0f172a",
                      backgroundColor: "#fff",
                      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    Toạ độ GPS: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
                  </span>
                  {gpsAccuracy && (
                    <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600 }}>
                      Vùng sai số thiết bị: ~{gpsAccuracy}m
                    </span>
                  )}
                </div>
              </div>
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

              {/* Hộp gợi ý thao tác chuẩn */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#1e40af", lineHeight: 1.5 }}>
                💡 <strong>Gợi ý:</strong> Sau khi bấm <em>Dùng vị trí hiện tại</em>, bạn có thể click trực tiếp hoặc kéo ghim trên bản đồ để chỉnh vào đúng điểm đứng thật. Bạn cũng có thể sửa trực tiếp số nhà vào ô bên dưới.
              </div>
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
