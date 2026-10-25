import React, { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GreenEvent, CheckinResponse } from "../types/event.types";
import { eventService } from "../services/eventService";
import { EVENT_MESSAGES } from "../utils/eventMessages";
import { formatDateTime } from "../utils/datetime";
import { haversineMeters } from "../utils/geo";

interface EventCheckinModalProps {
  event: GreenEvent;
  isOpen: boolean;
  onClose: () => void;
  onCheckinSuccess: (res: CheckinResponse) => void;
  onToast?: (message: string, type?: "success" | "error") => void;
}

type GpsStatus = "locating" | "ready" | "denied" | "unsupported";

const MAX_ACCURACY_METERS = 50;

export const EventCheckinModal: React.FC<EventCheckinModalProps> = ({
  event,
  isOpen,
  onClose,
  onCheckinSuccess,
  onToast,
}) => {
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("locating");

  const [loading, setLoading] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [checkinResult, setCheckinResult] = useState<CheckinResponse | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("unsupported");
      setFailureMessage(EVENT_MESSAGES.CHECKIN_UNSUPPORTED);
      return;
    }

    setFailureMessage(null);
    setGpsStatus("locating");

    const successHandler = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy: acc } = pos.coords;
      setUserLat(latitude);
      setUserLon(longitude);
      setAccuracy(acc);
      setDistance(haversineMeters(latitude, longitude, event.latitude, event.longitude));
      setGpsStatus("ready");
    };

    const errorHandler = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGpsStatus("denied");
        setFailureMessage(EVENT_MESSAGES.CHECKIN_DENIED);
      } else {
        setGpsStatus("locating");
        setFailureMessage("Không thể lấy vị trí hiện tại. Vui lòng thử lại.");
      }
    };

    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    stopWatching();
    watchIdRef.current = navigator.geolocation.watchPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000,
    });
  }, [event.latitude, event.longitude, stopWatching]);

  // Theo dõi GPS khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    requestPosition();
    return () => stopWatching();
  }, [isOpen, requestPosition, stopWatching]);

  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      userMarkerRef.current = null;
      lineRef.current = null;
      setCheckinResult(null);
      setFailureMessage(null);
      return;
    }
    userMarkerRef.current = null;
    lineRef.current = null;
  }, [isOpen]);


  // Bản đồ hiện trường
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([event.latitude, event.longitude], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

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
      setTimeout(() => map.invalidateSize(), 200);
    }

    const map = mapInstanceRef.current;
    if (userLat !== null && userLon !== null && map) {
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

      const points: L.LatLngExpression[] = [
        [userLat, userLon],
        [event.latitude, event.longitude],
      ];
      if (lineRef.current) {
        lineRef.current.setLatLngs(points);
      } else {
        lineRef.current = L.polyline(points, {
          color: "#64748b",
          dashArray: "6, 8",
          weight: 2,
        }).addTo(map);
      }
    }
  }, [
    isOpen,
    userLat,
    userLon,
    event.latitude,
    event.longitude,
    event.title,
    event.checkin_radius_meters,
  ]);

  if (!isOpen) return null;

  const radius = event.checkin_radius_meters || 100;
  const isInRadius = distance !== null && distance <= radius;
  const isAccuracyOk = accuracy !== null && accuracy <= MAX_ACCURACY_METERS;
  // Heuristic phát hiện GPS giả lập: sai số gần như tuyệt đối 0m
  const isSuspiciousGps = accuracy !== null && accuracy < 1;
  const canConfirm =
    gpsStatus === "ready" &&
    userLat !== null &&
    userLon !== null &&
    isInRadius &&
    isAccuracyOk &&
    !isSuspiciousGps;

  const handleConfirmCheckin = async () => {
    if (userLat === null || userLon === null) {
      setFailureMessage(EVENT_MESSAGES.CHECKIN_LOCATING);
      return;
    }
    if (isSuspiciousGps) {
      setFailureMessage(EVENT_MESSAGES.CHECKIN_FAKE_GPS);
      return;
    }

    try {
      setLoading(true);
      setFailureMessage(null);

      const res = await eventService.checkinEvent(event.event_id, {
        latitude: userLat,
        longitude: userLon,
        accuracy: accuracy ?? 10,
        device_info: navigator.userAgent,
      });

      setCheckinResult(res);
      onCheckinSuccess(res);
      onToast?.(res.message);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      setFailureMessage(typeof detail === "string" ? detail : EVENT_MESSAGES.CHECKIN_FAILED);
    } finally {
      setLoading(false);
      stopWatching();
    }
  };

  return (
    <div className="event-modal-overlay" data-testid="checkin-modal-overlay">
      <div className="event-modal-box large" data-testid="checkin-modal">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h2>Check-in GPS tại hiện trường</h2>
            <p className="modal-sub">
              {event.title} · {EVENT_MESSAGES.CHECKIN_START_AT}:{" "}
              {formatDateTime(event.start_time)}
            </p>
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

        {checkinResult ? (
          <div className="checkin-result-popup" data-testid="checkin-success-card">
            <div className="result-icon">🎉</div>
            <h2 className="result-title success">{EVENT_MESSAGES.CHECKIN_SUCCESS}</h2>
            <p className="result-desc">
              Bạn đã có mặt tại hiện trường chiến dịch Chủ Nhật Xanh và hoàn tất điểm danh.
            </p>

            <div className="points-celebration-card">
              <div className="points-number">+{checkinResult.points_awarded} GP</div>
              <div className="points-sub">
                {checkinResult.points_awarded > 0
                  ? "Điểm Xanh đã được cộng ngay vào tài khoản!"
                  : EVENT_MESSAGES.CHECKIN_DAILY_CAP}
              </div>
            </div>

            <div className="checkin-result-meta">
              Khoảng cách ghi nhận: {checkinResult.distance_meters}m · Sai số:{" "}
              {checkinResult.accuracy_meters}m · Thời gian:{" "}
              {new Date(checkinResult.checkin_time).toLocaleTimeString("vi-VN")}
            </div>
            <div className="checkin-result-meta">
              Điểm Xanh hôm nay: {checkinResult.daily_points_earned}/
              {checkinResult.daily_points_cap} GP · Tổng tích lũy:{" "}
              {checkinResult.total_green_points} GP
            </div>

            <button
              type="button"
              className="btn-finish-checkin"
              data-testid="btn-finish-checkin"
              onClick={onClose}
            >
              {EVENT_MESSAGES.CHECKIN_FINISH}
            </button>
          </div>
        ) : (
          <div className="modal-body-scroll">
            {failureMessage && (
              <div className="checkin-failure-card" data-testid="checkin-failure" role="alert">
                <div className="failure-icon">⚠️</div>
                <div>
                  <strong>{EVENT_MESSAGES.CHECKIN_FAILED}</strong>
                  <p>{failureMessage}</p>
                </div>
                <button
                  type="button"
                  className="btn-my-events-toggle"
                  data-testid="btn-retry-checkin"
                  onClick={() => {
                    setFailureMessage(null);
                    requestPosition();
                  }}
                >
                  {EVENT_MESSAGES.CHECKIN_RETRY}
                </button>
              </div>
            )}

            <div className="gps-checkin-container">
              <div className="checkin-status-bar">
                <div className={`distance-indicator ${isInRadius ? "in-radius" : "out-radius"}`}>
                  <span>{isInRadius ? "✅" : "📍"}</span>
                  <span>
                    {EVENT_MESSAGES.CHECKIN_DISTANCE}:{" "}
                    <strong>{distance !== null ? `${Math.round(distance)}m` : "…"}</strong>
                  </span>
                  <span>{isInRadius ? "Hợp lệ" : `Vượt bán kính ${radius}m`}</span>
                </div>

                <div className={`accuracy-indicator ${isAccuracyOk ? "" : "accuracy-warning"}`}>
                  {EVENT_MESSAGES.CHECKIN_ACCURACY}: ±
                  {accuracy !== null ? `${Math.round(accuracy)}m` : "…"}
                  {!isAccuracyOk && accuracy !== null && ` (> ${MAX_ACCURACY_METERS}m)`}
                </div>
              </div>

              {gpsStatus === "locating" && (
                <p className="gps-status-note">{EVENT_MESSAGES.CHECKIN_LOCATING}</p>
              )}
              {gpsStatus === "denied" && (
                <p className="gps-status-note error">{EVENT_MESSAGES.CHECKIN_DENIED}</p>
              )}
              {isSuspiciousGps && (
                <p className="gps-status-note error">{EVENT_MESSAGES.CHECKIN_FAKE_GPS}</p>
              )}

              <div
                ref={mapContainerRef}
                className="checkin-map-stage"
                data-testid="checkin-map"
              />

              <div className="checkin-instructions-box">
                <strong>📌 Lưu ý quy định check-in tại hiện trường:</strong>
                <ul>
                  <li>{EVENT_MESSAGES.CHECKIN_RULE_RADIUS}</li>
                  <li>{EVENT_MESSAGES.CHECKIN_RULE_ACCURACY}</li>
                  <li>{EVENT_MESSAGES.CHECKIN_RULE_ONCE}</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-my-events-toggle"
                onClick={onClose}
                disabled={loading}
              >
                {EVENT_MESSAGES.CHECKIN_CLOSE}
              </button>
              <button
                type="button"
                className="btn-create-event"
                data-testid="btn-confirm-gps-checkin"
                disabled={loading || !canConfirm}
                onClick={handleConfirmCheckin}
              >
                {loading ? EVENT_MESSAGES.CHECKIN_CONFIRMING : EVENT_MESSAGES.CHECKIN_CONFIRM}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


