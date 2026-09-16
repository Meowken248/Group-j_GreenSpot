import { type FC } from "react";
import type { MapBaseType, MapEngineType } from "../../types/map";

interface MapControlsProps {
  isLocating: boolean;
  engine: MapEngineType;
  mapType: MapBaseType;
  showTraffic: boolean;
  showCircle: boolean;
  onRecenter: () => void;
  onToggleEngine: () => void;
  onToggleMapType: () => void;
  onToggleTraffic: () => void;
  onToggleCircle: () => void;
}

export const MapControls: FC<MapControlsProps> = ({
  isLocating,
  engine,
  mapType,
  showTraffic,
  showCircle,
  onRecenter,
  onToggleEngine,
  onToggleMapType,
  onToggleTraffic,
  onToggleCircle,
}) => {
  return (
    <div className="map-controls-group">
      <button
        className={`control-btn ${isLocating ? "locating" : ""}`}
        onClick={onRecenter}
        title="Định vị lại vị trí của tôi"
      >
        🎯
      </button>

      <button
        className="control-btn"
        onClick={onToggleEngine}
        title={`Đổi động cơ hiển thị (Hiện tại: ${engine === "google" ? "Google Maps SDK" : "Google Tiles Core"})`}
      >
        🔄
      </button>

      <button
        className={`control-btn ${mapType === "satellite" ? "active" : ""}`}
        onClick={onToggleMapType}
        title="Đổi kiểu bản đồ (Vệ tinh / Bản đồ đường)"
      >
        🗺️
      </button>

      <button
        className={`control-btn ${showTraffic ? "active" : ""}`}
        onClick={onToggleTraffic}
        title="Bật / Tắt lớp giao thông thời gian thực"
      >
        🚦
      </button>

      <button
        className={`control-btn ${showCircle ? "active" : ""}`}
        onClick={onToggleCircle}
        title="Bật / Tắt vòng tròn bán kính GPS"
      >
        ⭕
      </button>
    </div>
  );
};

export default MapControls;
