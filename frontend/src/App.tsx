import { useState } from "react";
import GoogleMapView from "./components/Map/GoogleMapView";
import api from "./api/client";
import "./App.css";

function App() {
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

  return (
    <div className="app-container">
      {/* High Performance Google Map & GPS Layer */}
      <GoogleMapView />

      {/* Collapsible Backend Diagnostic Badge (Top Right) */}
      <div className="quick-status-badge">
        <button
          className="health-badge-btn"
          onClick={() => {
            setShowDrawer((prev) => !prev);
            if (!backendStatus) checkHealth();
          }}
          title="Kiểm tra trạng thái Backend"
        >
          <span className="dot online" />
          <span>API Service</span>
        </button>

        {showDrawer && (
          <div className="health-popover">
            <div className="popover-header">
              <strong>Backend Diagnostic</strong>
              <button className="close-btn" onClick={() => setShowDrawer(false)}>×</button>
            </div>
            <p className="popover-desc">Kiểm tra kết nối microservice FastAPI backend qua axios client.</p>
            <div className="popover-actions">
              <button
                className="btn-action"
                onClick={checkHealth}
                disabled={checkingBackend}
              >
                {checkingBackend ? "Đang ping..." : "Ping /health"}
              </button>
            </div>
            {backendStatus && (
              <div className={`status-pill ${backendStatus.startsWith("Online") ? "success" : "warning"}`}>
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
