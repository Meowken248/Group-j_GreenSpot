import React, { useState, useRef } from "react";
import "./AirQualityDashboard.css";

interface AirQualityDashboardProps {
  onBackToMap?: () => void;
}

export const AirQualityDashboard: React.FC<AirQualityDashboardProps> = ({ onBackToMap }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic host so it works via localhost or IP
  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const dashboardUrl = `http://${hostname}:8501/?embed=true`;

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`aq-dashboard-container ${isFullscreen ? "is-fullscreen" : ""}`}
    >
      {/* Top Navigation & Status Bar */}
      <header className="aq-dashboard-header">
        <div className="aq-header-left">
          {onBackToMap && (
            <button
              type="button"
              className="aq-btn-back"
              onClick={onBackToMap}
              title="Quay lại Bản đồ Môi trường WebGIS"
            >
              ← Bản đồ WebGIS
            </button>
          )}
          <div className="aq-header-title-group">
            <h1 className="aq-header-title">
              <span className="aq-title-icon">📊</span> Phân tích Chỉ số Chất lượng Không khí & Khí tượng
            </h1>
            <div className="aq-header-badges">
              <span className="aq-badge live">● Live Real-Time</span>
              <span className="aq-badge info">34 Tỉnh/Thành</span>
              <span className="aq-badge stats">7.1M Records (ECMWF & CAMS)</span>
            </div>
          </div>
        </div>

        <div className="aq-header-actions">
          <button
            type="button"
            className="aq-action-btn"
            onClick={handleRefresh}
            title="Tải lại Dashboard & Cập nhật số liệu"
          >
            🔄 Làm mới
          </button>

          <button
            type="button"
            className="aq-action-btn"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
          >
            {isFullscreen ? "🗗 Thu nhỏ" : "⛶ Toàn màn hình"}
          </button>

          <a
            href={`http://${hostname}:8501`}
            target="_blank"
            rel="noopener noreferrer"
            className="aq-action-btn external"
            title="Mở Dashboard trong cửa sổ riêng biệt"
          >
            ↗ Cửa sổ riêng
          </a>
        </div>
      </header>

      {/* Embedded Streamlit Frame */}
      <div className="aq-iframe-wrapper">
        {isLoading && (
          <div className="aq-loading-overlay">
            <div className="aq-spinner" />
            <p className="aq-loading-text">
              Đang kết nối trung tâm dữ liệu không khí thời gian thực...
            </p>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={dashboardUrl}
          title="Vietnam Air Quality & Meteorology Dashboard"
          className="aq-dashboard-iframe"
          onLoad={() => setIsLoading(false)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
        />
      </div>
    </div>
  );
};

export default AirQualityDashboard;
