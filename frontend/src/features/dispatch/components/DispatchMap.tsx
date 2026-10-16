import React, { useState } from "react";
import type { FieldTrackingResponse } from "../types/dispatch.types";

interface DispatchMapProps {
  trackingData: FieldTrackingResponse;
  onRefreshGps?: () => void;
}

export const DispatchMap: React.FC<DispatchMapProps> = ({
  trackingData,
  onRefreshGps,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");

  const {
    incident_title,
    incident_address,
    incident_radius_meters,
    team_name,
    team_phone,
    eta_minutes,
    is_gps_active,
    gps_lost_warning,
  } = trackingData;

  return (
    <div className="dispatch-map-container" data-testid="dispatch-map">
      {/* Map Control Toolbar */}
      <div className="dispatch-map-toolbar">
        <div className="map-toolbar-left">
          <span className="map-layer-indicator">
            <i className="bi bi-geo-alt-fill text-danger me-1"></i>
            {incident_address}
          </span>
        </div>
        <div className="map-toolbar-right">
          <div className="btn-group btn-group-sm me-2" role="group">
            <button
              type="button"
              className={`btn ${mapType === "standard" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setMapType("standard")}
            >
              <i className="bi bi-map me-1"></i>Bản đồ
            </button>
            <button
              type="button"
              className={`btn ${mapType === "satellite" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setMapType("satellite")}
            >
              <i className="bi bi-layers me-1"></i>Vệ tinh
            </button>
          </div>
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className="btn btn-outline-secondary"
              title="Phóng to"
              onClick={() => setZoomLevel((z) => Math.min(18, z + 1))}
            >
              <i className="bi bi-plus-lg"></i>
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              title="Thu nhỏ"
              onClick={() => setZoomLevel((z) => Math.max(10, z - 1))}
            >
              <i className="bi bi-dash-lg"></i>
            </button>
            {onRefreshGps && (
              <button
                type="button"
                className="btn btn-outline-primary"
                title="Cập nhật GPS"
                onClick={onRefreshGps}
              >
                <i className="bi bi-arrow-repeat"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* GPS Warning Banner if signal lost */}
      {(!is_gps_active || gps_lost_warning) && (
        <div
          className="dispatch-map-warning-banner"
          data-testid="gps-warning-banner"
          role="alert"
        >
          <div className="d-flex align-items-center">
            <span className="pulse-warning-dot me-2"></span>
            <i className="bi bi-exclamation-triangle-fill me-2 fs-5 text-warning"></i>
            <div>
              <strong>Cảnh báo tín hiệu GPS: </strong>
              <span>
                {gps_lost_warning ||
                  `Mất tín hiệu GPS từ ${team_name} (cập nhật lần cuối: hơn 5 phút trước) - Vui lòng liên hệ qua bộ đàm hoặc SĐT: ${team_phone}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Map View Canvas (Interactive vector GIS presentation) */}
      <div className={`map-canvas-wrapper ${mapType === "satellite" ? "satellite-bg" : "standard-bg"}`}>
        <svg
          className="map-vector-overlay"
          viewBox="0 0 800 500"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Incident pulse animation */}
            <radialGradient id="incidentGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </radialGradient>
            {/* Team radar glow */}
            <radialGradient id="teamGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </radialGradient>
            {/* Line pattern */}
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#2563eb" />
            </marker>
          </defs>

          {/* Urban Street Grid Vectors */}
          <g className="map-grid-lines" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.65">
            <line x1="50" y1="120" x2="750" y2="120" />
            <line x1="80" y1="260" x2="720" y2="260" />
            <line x1="120" y1="390" x2="760" y2="390" />
            <line x1="200" y1="40" x2="200" y2="460" />
            <line x1="420" y1="40" x2="420" y2="460" />
            <line x1="640" y1="40" x2="640" y2="460" />
          </g>

          {/* Incident Warning Radius */}
          <circle
            cx="580"
            cy="180"
            r={Math.min(90, Math.max(45, (incident_radius_meters / 50) * 50))}
            fill="url(#incidentGlow)"
            className="incident-radius-pulse"
          />
          <circle
            cx="580"
            cy="180"
            r={Math.min(90, Math.max(45, (incident_radius_meters / 50) * 50))}
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Dispatch Navigation Route (Dashline with arrow) */}
          <path
            d="M 230 330 C 320 330, 380 230, 580 180"
            fill="none"
            stroke="#2563eb"
            strokeWidth="3.5"
            strokeDasharray="7 5"
            markerEnd="url(#arrowhead)"
            className="dispatch-route-path"
          />
        </svg>

        {/* Team Vehicle Marker */}
        <div
          className="map-marker-pin team-marker"
          style={{ left: "28%", top: "66%" }}
          data-testid="team-marker"
        >
          <div className="marker-radar-wave"></div>
          <div className="marker-vehicle-badge">
            <i className="bi bi-truck text-white"></i>
          </div>
          <div className="marker-callout team-callout">
            <div className="callout-header">
              <span className="team-callout-title">{team_name}</span>
              <span className="badge bg-primary ms-1">Đang đến</span>
            </div>
            <div className="callout-detail">
              <i className="bi bi-clock-history me-1"></i>
              <span>Dự kiến đến (ETA): <strong>{eta_minutes} phút</strong></span>
            </div>
            <div className="callout-detail text-muted">
              <i className="bi bi-telephone me-1"></i>
              <span>{team_phone}</span>
            </div>
          </div>
        </div>

        {/* Incident Marker */}
        <div
          className="map-marker-pin incident-marker"
          style={{ left: "72.5%", top: "36%" }}
          data-testid="incident-marker"
        >
          <div className="marker-incident-glow"></div>
          <div className="marker-incident-badge">
            <i className="bi bi-exclamation-diamond-fill text-white"></i>
          </div>
          <div className="marker-callout incident-callout">
            <div className="callout-header">
              <span className="incident-callout-title">{incident_title}</span>
            </div>
            <div className="callout-detail text-danger">
              <i className="bi bi-geo-alt me-1"></i>
              <span>{incident_address}</span>
            </div>
            <div className="callout-detail text-muted">
              <i className="bi bi-shield-exclamation me-1"></i>
              <span>Bán kính giám sát: {incident_radius_meters}m</span>
            </div>
          </div>
        </div>

        {/* Map Legend Footer */}
        <div className="map-legend-overlay">
          <div className="legend-item">
            <span className="legend-indicator team-color"></span>
            <span>Vị trí Đội phản ứng cơ động</span>
          </div>
          <div className="legend-item">
            <span className="legend-indicator incident-color"></span>
            <span>Điểm sự cố hiện trường</span>
          </div>
          <div className="legend-item">
            <span className="legend-indicator route-color"></span>
            <span>Tuyến đường điều phối</span>
          </div>
          <div className="legend-item">
            <span className="text-muted small">Thu phóng: {zoomLevel}x</span>
          </div>
        </div>
      </div>
    </div>
  );
};
