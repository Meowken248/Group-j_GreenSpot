import { type FC } from "react";
import type { MapEngineType } from "../../types/map";

interface KeyAlertBannerProps {
  engine: MapEngineType;
  onToggleEngine: () => void;
  onOpenGuide: () => void;
}

export const KeyAlertBanner: FC<KeyAlertBannerProps> = ({
  engine,
  onToggleEngine,
  onOpenGuide,
}) => {
  return (
    <div className="key-alert-banner">
      <div className="alert-content">
        <span className="alert-icon">⚠️</span>
        <div className="alert-text">
          <strong>Google Maps Platform: Lỗi "Permission Denied" từ API Key</strong>
          <span>
            {engine === "google"
              ? "API Key bị giới hạn tên miền (Referrer restriction) hoặc chưa bật Billing/Maps JavaScript API trên Google Cloud Console."
              : "Đang hiển thị chế độ Bản Đồ Dự Phòng (Google Tile Cluster) tốc độ cao với đầy đủ GPS."}
          </span>
        </div>
      </div>
      <div className="alert-buttons">
        <button className="btn-switch-engine" onClick={onToggleEngine}>
          {engine === "google"
            ? "🚀 Chuyển sang Google Tile Cluster (Zero Error)"
            : "🔄 Thử lại Google Maps SDK"}
        </button>
        <button className="btn-guide" onClick={onOpenGuide}>
          ⚙️ Cách Khắc Phục Key
        </button>
      </div>
    </div>
  );
};

export default KeyAlertBanner;
