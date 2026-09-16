import { type FC } from "react";
import type { MapBaseType } from "../../types/map";

interface MapControlsProps {
  isLocating: boolean;
  mapType: MapBaseType;
  showTraffic: boolean;
  showCircle: boolean;
  onRecenter: () => void;
  onToggleMapType: () => void;
  onToggleTraffic: () => void;
  onToggleCircle: () => void;
}

export const MapControls: FC<MapControlsProps> = ({
  isLocating,
  mapType,
  showTraffic,
  showCircle,
  onRecenter,
  onToggleMapType,
  onToggleTraffic,
  onToggleCircle,
}) => {
  const getMapTypeLabel = () => {
    switch (mapType) {
      case "satellite":
        return "Vệ tinh (Google Satellite)";
      case "osm":
        return "OpenStreetMap (OSM)";
      default:
        return "Bản đồ đường (Google Roadmap)";
    }
  };

  return (
    <div className="map-controls-group">
      <button
        className={`control-btn ${isLocating ? "locating" : ""}`}
        onClick={onRecenter}
        title="Định vị lại vị trí GPS của bạn"
      >
        🎯
      </button>

      <button
        className={`control-btn ${mapType !== "roadmap" ? "active" : ""}`}
        onClick={onToggleMapType}
        title={`Đổi kiểu bản đồ (Hiện tại: ${getMapTypeLabel()})`}
      >
        {mapType === "satellite" ? "🛰️" : mapType === "osm" ? "🌐" : "🗺️"}
      </button>

      <button
        className={`control-btn ${showTraffic ? "active" : ""}`}
        onClick={onToggleTraffic}
        title={`Lớp giao thông thời gian thực (${showTraffic ? "Đang BẬT" : "Đang TẮT"})`}
      >
        🚦
      </button>

      <button
        className={`control-btn ${showCircle ? "active" : ""}`}
        onClick={onToggleCircle}
        title={`Vòng tròn bán kính GPS (${showCircle ? "Đang BẬT" : "Đang TẮT"})`}
      >
        ⭕
      </button>
    </div>
  );
};

export default MapControls;
