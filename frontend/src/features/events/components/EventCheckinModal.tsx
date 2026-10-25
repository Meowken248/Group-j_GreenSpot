import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GreenEvent, CheckinResponse } from "../types/event.types";
import { eventService } from "../services/eventService";

interface EventCheckinModalProps {
  event: GreenEvent;
  isOpen: boolean;
  onClose: () => void;
  onCheckinSuccess: (res: CheckinResponse) => void;
}

// Tính khoảng cách Haversine ở Client để hiển thị chỉ báo thời gian thực
function clientHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const EventCheckinModal: React.FC<EventCheckinModalProps> = ({
  event,
  isOpen,
  onClose,
  onCheckinSuccess,
}) => {
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkinResult, setCheckinResult] = useState<CheckinResponse | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Theo dõi GPS của người dùng
  useEffect(() => {
    if (!isOpen) return;

    if (!navigator.geolocation) {
      setErrorMessage("Trình duyệt của bạn không hỗ trợ định vị GPS.");
      return;
    }

    const successHandler = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy: acc } = pos.coords;
      setUserLat(latitude);
      setUserLon(longitude);
      setAccuracy(acc);

      const d = clientHaversine(latitude, longitude, event.latitude, event.longitude);
      setDistance(d);
    };

    const errorHandler = (err: GeolocationPositionError) => {
      let msg = "Không thể lấy vị trí hiện tại của bạn.";
      if (err.code === err.PERMISSION_DENIED) {
        msg = "Quyền truy cập vị trí bị từ chối. Vui lòng cho phép trình duyệt truy cập GPS.";
      }
      setErrorMessage(msg);
    };

    // Lấy vị trí ngay lập tức và theo dõi liên tục
    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    const watchId = navigator.geolocation.watchPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000,
    });
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isOpen, event.latitude, event.longitude]);

  // Khởi tạo và cập nhật bản đồ WebGIS
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(
        [event.latitude, event.longitude],
        16
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      // 1. Điểm tập trung sự kiện + Vòng tròn 100m
      L.marker([event.latitude, event.longitude])
        .addTo(map)
        .bindPopup(`<b>Điểm tập trung:</b> ${event.title}`)
        .openPopup();

      L.circle([event.latitude, event.longitude], {
        radius: event.checkin_radius_meters || 100,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    const map = mapInstanceRef.current;
    if (userLat !== null && userLon !== null && map) {
      // 2. Chấm định vị người dùng
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLat, userLon]);
      } else {
        userMarkerRef.current = L.circleMarker([userLat, userLon], {
          radius: 8,
          fillColor: "#3b82f6",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup("Vị trí của bạn");
      }

      // 3. Đường nét đứt nối khoảng cách
      if (lineRef.current) {
        lineRef.current.setLatLngs([
          [userLat, userLon],
          [event.latitude, event.longitude],
        ]);
      } else {
        lineRef.current = L.polyline(
          [
            [userLat, userLon],
            [event.latitude, event.longitude],
          ],
          {
            color: "#64748b",
            dashArray: "6, 8",
            weight: 2,
          }
        ).addTo(map);
      }
    }
  }, [isOpen, userLat, userLon, event.latitude, event.longitude, event.title, event.checkin_radius_meters]);

  if (!isOpen) return null;

  // Thực hiện Check-in
  const handleConfirmCheckin = async () => {
    if (userLat === null || userLon === null) {
      setErrorMessage("Đang tìm kiếm tín hiệu GPS... Vui lòng đợi trong giây lát.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const res = await eventService.checkinEvent(event.event_id, {
        latitude: userLat,
        longitude: userLon,
        accuracy: accuracy || 10,
        device_info: navigator.userAgent,
      });

      setCheckinResult(res);
      onCheckinSuccess(res);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Check-in thất bại. Vui lòng thử lại.";
      setErrorMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const isInRadius = distance !== null && distance <= (event.checkin_radius_meters || 100);

  return (
    <div className="event-modal-overlay" data-testid="checkin-modal-overlay">
      <div className="event-modal-box large" data-testid="checkin-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h2>Check-in GPS tại hiện trường</h2>
            <p className="modal-sub">{event.title}</p>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            data-testid="btn-close-checkin-modal"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Nếu đã check-in thành công: Hiển thị POPUP KẾT QUẢ +50 GP (Màn 4/4) */}
        {checkinResult ? (
          <div className="checkin-result-popup" data-testid="checkin-success-card">
            <div className="result-icon">🎉</div>
            <h2 className="result-title success">CHECK-IN THÀNH CÔNG!</h2>
            <p className="result-desc">
              Bạn đã có mặt tại hiện trường chiến dịch Chủ Nhật Xanh và hoàn tất điểm danh.
            </p>

            <div className="points-celebration-card">
              <div className="points-number">+{checkinResult.points_awarded} GP</div>
              <div className="points-sub">Điểm Xanh đã được cộng ngay vào tài khoản!</div>
            </div>

            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
              Khoảng cách ghi nhận: {checkinResult.distance_meters}m • Thời gian:{" "}
              {new Date(checkinResult.checkin_time).toLocaleTimeString("vi-VN")}
            </div>

            <button
              type="button"
              className="btn-finish-checkin"
              data-testid="btn-finish-checkin"
              onClick={onClose}
            >
              Hoàn tất & Đóng
            </button>
          </div>
        ) : (
          /* Khung giao diện WebGIS Check-in trực tiếp */
          <div className="modal-body-scroll">
            {errorMessage && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#b91c1c",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="gps-checkin-container">
              {/* Thanh trạng thái khoảng cách & Sai số */}
              <div className="checkin-status-bar">
                <div className={`distance-indicator ${isInRadius ? "in-radius" : "out-radius"}`}>
                  <span>{isInRadius ? "✅" : "📍"}</span>
                  <span>
                    Khoảng cách tới điểm tập trung:{" "}
                    <strong>{distance !== null ? `${Math.round(distance)}m` : "Đang tính..."}</strong>
                  </span>
                  <span>({isInRadius ? "Hợp lệ" : "Vượt bán kính 100m"})</span>
                </div>

                <div className="accuracy-indicator">
                  Sai số GPS: ±{accuracy ? `${Math.round(accuracy)}m` : "..."}
                </div>
              </div>

              {/* Bản đồ WebGIS hiện trường */}
              <div
                ref={mapContainerRef}
                className="checkin-map-stage"
                data-testid="checkin-map"
              />

              {/* Hướng dẫn quy định check-in */}
              <div className="checkin-instructions-box">
                <strong>📌 Lưu ý quy định check-in tại hiện trường:</strong>
                <ul>
                  <li>Vị trí của bạn phải nằm trong vòng tròn xanh (bán kính 100m quanh điểm tập trung).</li>
                  <li>Độ chính xác GPS yêu cầu sai số dưới 50m. Nếu báo sai số cao, hãy ra nơi thoáng đãng.</li>
                  <li>Mỗi người tham gia chỉ được check-in 1 lần duy nhất để nhận 50 Điểm Xanh.</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ marginTop: "1.5rem" }}>
              <button
                type="button"
                className="btn-my-events-toggle"
                onClick={onClose}
                disabled={loading}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-create-event"
                data-testid="btn-confirm-gps-checkin"
                disabled={loading || !isInRadius}
                onClick={handleConfirmCheckin}
                style={{
                  background: isInRadius
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "#94a3b8",
                  cursor: isInRadius ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "Đang xác thực GPS…" : "Xác nhận Check-in (+50 GP)"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
