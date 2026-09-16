import { useState, useEffect } from "react";
import EcoMap from "./components/EcoMap";
import GoogleMapView from "./components/Map/GoogleMapView";
import api from "./api/client";
import "./App.css";

export type ActiveMapMode = "eco" | "google";

function App() {
  const [activeMap, setActiveMap] = useState<ActiveMapMode>(() => {
    const saved = localStorage.getItem("greenspot_active_map");
    return saved === "google" ? "google" : "eco";
  });

  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const handleSwitchMap = (mode: ActiveMapMode) => {
    setActiveMap(mode);
    localStorage.setItem("greenspot_active_map", mode);
  };

  const checkHealth = async () => {
    setCheckingBackend(true);
    try {
      const response = await api.get("/health");
      setBackendStatus(`Online (${JSON.stringify(response.data)})`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setBackendStatus(`Offline: ${err.message}`);
      } else {
        setBackendStatus("Failed to connect to backend");
      }
    } finally {
      setCheckingBackend(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="app-container">
      {/* 1. HIỂN THỊ ĐỒNG BỘ CẢ 2 BẢN ĐỒ (DUAL ENGINE) */}
      {activeMap === "eco" ? (
        <EcoMap />
      ) : (
        <GoogleMapView />
      )}

      {/* 2. THANH ĐIỀU HƯỚNG CHUYỂN BẢN ĐỒ & DIAGNOSTIC (Top Right) */}
      <div className="top-nav-hub">
        {/* Bộ chuyển đổi Engine bản đồ */}
        <div className="map-engine-switcher" role="tablist" aria-label="Chọn engine bản đồ">
          <button
            type="button"
            role="tab"
            aria-selected={activeMap === "eco"}
            className={`engine-tab-btn ${activeMap === "eco" ? "active" : ""}`}
            onClick={() => handleSwitchMap("eco")}
            title="Bản đồ Môi trường WebGIS (Dữ liệu thời gian thực PostGIS & OpenStreetMap)"
          >
            <span className="engine-icon">🌿</span>
            <span className="engine-text">Bản đồ Môi trường</span>
            <span className="engine-tag">WebGIS</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMap === "google"}
            className={`engine-tab-btn ${activeMap === "google" ? "active" : ""}`}
            onClick={() => handleSwitchMap("google")}
            title="Bản đồ Google Maps Platform (GPS HUD & Vệ tinh/Giao thông)"
          >
            <span className="engine-icon">🗺️</span>
            <span className="engine-text">Google Maps</span>
            <span className="engine-tag">GPS HUD</span>
          </button>
        </div>

        {/* Nút kiểm tra trạng thái Microservice Backend */}
        <div className="quick-status-badge">
          <button
            type="button"
            className="health-badge-btn"
            onClick={() => {
              setShowDrawer((prev) => !prev);
              if (!backendStatus) checkHealth();
            }}
            title="Kiểm tra trạng thái Backend FastAPI"
          >
            <span className={`dot ${backendStatus?.startsWith("Online") ? "online" : "offline"}`} />
            <span>API Service</span>
          </button>

          {showDrawer && (
            <div className="health-popover">
              <div className="popover-header">
                <strong>Backend Diagnostic</strong>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setShowDrawer(false)}
                >
                  ×
                </button>
              </div>
              <p className="popover-desc">
                Kiểm tra kết nối microservice FastAPI backend qua axios client.
              </p>
              <div className="popover-actions">
                <button
                  type="button"
                  className="btn-action"
                  onClick={checkHealth}
                  disabled={checkingBackend}
                >
                  {checkingBackend ? "Đang ping..." : "Ping /health"}
                </button>
              </div>
              {backendStatus && (
                <div
                  className={`status-pill ${
                    backendStatus.startsWith("Online") ? "success" : "warning"
                  }`}
                >
                  {backendStatus}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
