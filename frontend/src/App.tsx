import { useState, useEffect } from "react";
import EcoMap from "./components/EcoMap";
import AirQualityDashboard from "./components/AirQualityDashboard";
import { VoiceAssistant } from "./components/VoiceAssistant";
import api from "./api/client";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState<"map" | "dashboard" | "voice">("map");
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

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
      {/* THANH ĐIỀU HƯỚNG CHUYỂN ĐỔI CHẾ ĐỘ VIEW (TOP CENTER) */}
      <nav className={`view-mode-switcher ${activeTab === "dashboard" || activeTab === "voice" ? "dark-mode" : ""}`} aria-label="Chế độ hiển thị">
        <button
          type="button"
          className={`view-tab-btn ${activeTab === "map" ? "active" : ""}`}
          onClick={() => setActiveTab("map")}
          title="Bản đồ không gian xanh, ngập lụt & trạm IoT"
        >
          <span>🗺️</span>
          <span>Bản đồ WebGIS</span>
        </button>
        <button
          type="button"
          className={`view-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
          title="Bảng điều khiển phân tích chất lượng không khí & khí tượng toàn quốc"
        >
          <span>📊</span>
          <span>Phân tích AQI & Khí hậu</span>
        </button>
        <button
          type="button"
          className={`view-tab-btn ${activeTab === "voice" ? "active" : ""}`}
          onClick={() => setActiveTab("voice")}
          title="Trợ lý giọng nói rảnh tay (Hands-free Voice Assistant)"
        >
          <span>🎙️</span>
          <span>Trợ lý Giọng nói</span>
        </button>
      </nav>

      {/* VIEW NỘI DUNG CHÍNH: MAP, DASHBOARD HOẶC VOICE ASSISTANT */}
      {activeTab === "map" && <EcoMap />}
      {activeTab === "dashboard" && (
        <AirQualityDashboard onBackToMap={() => setActiveTab("map")} />
      )}
      {activeTab === "voice" && (
        <VoiceAssistant
          onClose={() => setActiveTab("map")}
          onNavigateToFeature={(target) => {
            if (target === "dashboard_aqi") {
              setActiveTab("dashboard");
            } else {
              setActiveTab("map");
            }
          }}
        />
      )}

      {/* NÚT TRỢ LÝ GIỌNG NÓI NHANH NỔI (FLOATING QUICK ACTION KHI Ở MAP HOẶC DASHBOARD) */}
      {activeTab !== "voice" && (
        <button
          type="button"
          className="floating-voice-quick-btn"
          onClick={() => setActiveTab("voice")}
          title="Bật Trợ lý giọng nói rảnh tay"
          aria-label="Trợ lý giọng nói"
        >
          <span className="floating-mic-icon">🎙️</span>
          <span className="floating-mic-label">Trợ lý ảo</span>
        </button>
      )}

      {/* NÚT KIỂM TRA MICROSERVICE BACKEND (GÓC TRÊN BÊN PHẢI) */}
      <div className="quick-status-badge">
        <button
          type="button"
          className={`health-badge-btn ${activeTab === "dashboard" ? "dark-mode" : ""}`}
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
          <div className={`health-popover ${activeTab === "dashboard" ? "dark-mode" : ""}`}>
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
                className={`status-pill ${backendStatus.startsWith("Online") ? "success" : "warning"
                  }`}
              >
                {backendStatus}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
