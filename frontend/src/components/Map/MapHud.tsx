import { type FC } from "react";
import type { Coordinates, MapEngineType } from "../../types/map";

interface MapHudProps {
  engine: MapEngineType;
  coords: Coordinates | null;
  accuracy: number | null;
  isLocating: boolean;
  isFromCache: boolean;
  gpsFixDurationMs: number | null;
  mapLatency: number | null;
  gpsError: string | null;
  loadError: string | null;
}

export const MapHud: FC<MapHudProps> = ({
  engine,
  coords,
  accuracy,
  isLocating,
  isFromCache,
  gpsFixDurationMs,
  mapLatency,
  gpsError,
  loadError,
}) => {
  return (
    <div className="metrics-hud">
      <div className="hud-title">
        <h4>
          <span className={`hud-indicator ${isLocating ? "pulse" : ""}`} />
          Hiệu Năng & GPS Thời Gian Thực
        </h4>
        <span style={{ fontSize: "11px", color: isFromCache ? "#38bdf8" : "#34d399", fontWeight: 600 }}>
          {isFromCache ? "⚡ Cached Warm Start" : isLocating ? "📡 Đang fix GPS..." : "🎯 GPS Locked"}
        </span>
      </div>

      <div className="hud-grid">
        <div className="hud-item">
          <span className="hud-label">
            {engine === "google" ? "Google Maps SDK:" : "Engine:"}
          </span>
          <span className="hud-value highlight-fast">
            {engine === "google"
              ? mapLatency !== null
                ? `${mapLatency} ms`
                : "Đang nạp..."
              : "Direct Google Tile Cluster"}
          </span>
        </div>

        <div className="hud-item">
          <span className="hud-label">Độ trễ GPS:</span>
          <span className="hud-value highlight-blue">
            {gpsFixDurationMs !== null ? `${gpsFixDurationMs} ms` : isLocating ? "Đo đạc..." : "0 ms"}
          </span>
        </div>

        <div className="hud-item">
          <span className="hud-label">Toạ độ GPS (Lat, Lng):</span>
          <span className="hud-value" style={{ fontSize: "11px" }}>
            {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Chờ tín hiệu..."}
          </span>
        </div>

        <div className="hud-item">
          <span className="hud-label">Bán kính chính xác:</span>
          <span className="hud-value highlight-fast">
            {accuracy ? `±${accuracy} m` : "N/A"}
          </span>
        </div>
      </div>

      {gpsError && <div className="error-banner">⚠️ {gpsError}</div>}
      {loadError && <div className="error-banner">❌ {loadError}</div>}
    </div>
  );
};

export default MapHud;
