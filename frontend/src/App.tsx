import { useState } from "react";
import api from "./api/client";
import "./App.css";

function App() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/health");
      setStatus(JSON.stringify(response.data));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to connect to backend");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>EcoReport</h1>
      <p>Project Skeleton</p>
      <div>
        <button onClick={checkHealth} disabled={loading}>
          {loading ? "Checking..." : "Check Backend Health"}
        </button>
      </div>
      {status && (
        <div className="status-box">
          <strong>Backend Response:</strong> {status}
        </div>
      )}
      {error && (
        <div className="status-box" style={{ color: "red" }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export default App;
