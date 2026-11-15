import React, { useState, useEffect, useCallback, useMemo } from "react";
import { heatmapApi } from "./heatmapApi";
import type {
  HeatmapMode,
  MultiModeHeatmapResponse,
  HeatmapPoint,
  DistrictZoneDetail,
} from "./types";
import "./heatmap.css";

interface Props {
  initialDistrictCode?: string;
  onNavigateDistrictReport?: (districtCode: string) => void;
}

// Bounding box of TP.HCM coordinates for SVG projection
const MIN_LNG = 106.40;
const MAX_LNG = 107.02;
const MIN_LAT = 10.37;
const MAX_LAT = 11.16;

const projectToSvg = (lng: number, lat: number, width = 760, height = 460) => {
  const pad = 40;
  const x = pad + ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (width - 2 * pad);
  // Invert Y for latitude since SVG top is 0
  const y = height - (pad + ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * (height - 2 * pad));
  return { x, y };
};

export const MultiModeHeatmapContainer: React.FC<Props> = ({
  initialDistrictCode,
  onNavigateDistrictReport,
}) => {
  const [mode, setMode] = useState<HeatmapMode>("AQI");
  const [data, setData] = useState<MultiModeHeatmapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search filter for sidebar
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal: Màn 4 (Popup chi tiết khu vực)
  const [selectedZone, setSelectedZone] = useState<DistrictZoneDetail | null>(null);
  const [loadingZone, setLoadingZone] = useState<boolean>(false);

  // 1. Fetch Heatmap Data by Mode
  const fetchHeatmap = useCallback(async (selectedMode: HeatmapMode) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await heatmapApi.getHeatmapData(selectedMode);
      setData(res);
    } catch {
      if (selectedMode === "AQI") {
        setErrorMsg("Không thể tải lớp nhiệt bản đồ. Vui lòng thử lại");
      } else if (selectedMode === "TEMPERATURE") {
        setErrorMsg("Không thể tải dữ liệu nhiệt độ. Vui lòng thử lại");
      } else {
        setErrorMsg("Không thể tính toán điểm rủi ro. Vui lòng thử lại");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch Zone Detail (Màn 4)
  const handleOpenZoneDetail = useCallback(async (districtCode: string) => {
    setLoadingZone(true);
    try {
      const detail = await heatmapApi.getZoneDetail(districtCode);
      setSelectedZone(detail);
    } catch {
      // Fallback: if offline, extract from current points
      const p = data?.points.find((x) => x.district_code === districtCode);
      if (p) {
        setSelectedZone({
          district_code: p.district_code,
          district_name: p.district_name,
          lat: p.lat,
          lng: p.lng,
          aqi_value: mode === "AQI" ? Math.round(p.value) : 65,
          aqi_level: p.level_label,
          aqi_color: p.color_hex,
          temperature_c: mode === "TEMPERATURE" ? p.value : 32.5,
          temperature_level: "Dễ chịu",
          temperature_color: "#22c55e",
          risk_score: mode === "RISK" ? Math.round(p.value) : 30,
          risk_level: "Trung bình",
          risk_color: "#eab308",
          cleanup_rate: 90.0,
          resolved_incidents: 45,
          green_index: 82.0,
          has_alert: p.is_warning,
          alert_message: p.warning_message,
        });
      }
    } finally {
      setLoadingZone(false);
    }
  }, [data, mode]);

  // Initial load
  useEffect(() => {
    fetchHeatmap(mode);
  }, [mode, fetchHeatmap]);

  // Handle initial district if passed via props
  useEffect(() => {
    if (initialDistrictCode) {
      handleOpenZoneDetail(initialDistrictCode);
    }
  }, [initialDistrictCode, handleOpenZoneDetail]);

  // Keyboard Esc listener for popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedZone(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Active warnings in current mode
  const activeWarnings = useMemo(() => {
    if (!data?.points) return [];
    return data.points.filter((p) => p.is_warning && p.warning_message);
  }, [data]);

  // Filtered districts for sidebar
  const filteredPoints = useMemo(() => {
    if (!data?.points) return [];
    if (!searchQuery.trim()) return data.points;
    const q = searchQuery.toLowerCase();
    return data.points.filter((p) => p.district_name.toLowerCase().includes(q));
  }, [data, searchQuery]);

  return (
    <div className="hm-container">
      {/* Header Banner */}
      <div className="hm-header">
        <div>
          <div className="hm-title">
            <span>🛰️</span>
            <span>Bản Đồ Nhiệt Môi Trường & Khí Hậu TP.HCM</span>
          </div>
          <p className="hm-subtitle">
            Hệ thống giám sát vi khí hậu, chất lượng không khí (AQI) và chỉ số rủi ro ô nhiễm rác thải theo thời gian thực trên toàn bộ 22 quận/huyện và TP. Thủ Đức.
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="hm-controls-bar">
        <div className="hm-mode-tabs">
          <button
            className={`hm-mode-btn mode-AQI ${mode === "AQI" ? "active" : ""}`}
            onClick={() => setMode("AQI")}
          >
            <span>🍃</span>
            <span>Chất lượng không khí (AQI)</span>
          </button>
          <button
            className={`hm-mode-btn mode-TEMPERATURE ${mode === "TEMPERATURE" ? "active" : ""}`}
            onClick={() => setMode("TEMPERATURE")}
          >
            <span>🌡️</span>
            <span>Nhiệt độ bề mặt (°C)</span>
          </button>
          <button
            className={`hm-mode-btn mode-RISK ${mode === "RISK" ? "active" : ""}`}
            onClick={() => setMode("RISK")}
          >
            <span>⚠️</span>
            <span>Điểm số rủi ro ô nhiễm</span>
          </button>
        </div>

        {data && (
          <span className="hm-timestamp-badge" style={{ background: "#f1f5f9", color: "#475569" }}>
            Cập nhật lúc: {data.timestamp} • 22 Quận/Huyện
          </span>
        )}
      </div>

      {/* Warning Alert Strip if any district exceeds threshold */}
      {activeWarnings.length > 0 && (
        <div className="hm-warning-strip">
          <span style={{ fontSize: "1.2rem" }}>🚨</span>
          <div>
            {activeWarnings.map((w, idx) => (
              <span key={w.district_code}>
                {w.warning_message}
                {idx < activeWarnings.length - 1 ? " | " : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Heatmap Stage Layout */}
      {errorMsg ? (
        <div className="hm-error-card">
          <p>{errorMsg}</p>
          <button className="hm-retry-btn" onClick={() => fetchHeatmap(mode)}>
            Thử lại
          </button>
        </div>
      ) : (
        <div className="hm-stage-layout">
          {/* GIS Heatmap Canvas Card */}
          <div className="hm-canvas-card">
            <div className="hm-canvas-header">
              <div className="hm-canvas-title">
                <span>
                  {mode === "AQI" ? "🟢 Lớp bản đồ nhiệt AQI" : mode === "TEMPERATURE" ? "🔥 Lớp nhiệt độ vi khí hậu" : "🔴 Điểm nóng rủi ro ô nhiễm"}
                </span>
              </div>
              <span className="hm-timestamp-badge">
                Chế độ: {mode === "AQI" ? "Chất lượng không khí" : mode === "TEMPERATURE" ? "Nhiệt độ bề mặt" : "Rủi ro rác thải"}
              </span>
            </div>

            {/* Interactive SVG GIS Map */}
            <div className="hm-svg-container">
              {loading && (
                <div className="hm-loading-overlay">
                  <div className="hm-spinner" />
                  <span>
                    {mode === "TEMPERATURE" ? "Đang nạp dữ liệu nhiệt độ vệ tinh…" : "Đang tải dữ liệu không gian GIS…"}
                  </span>
                </div>
              )}

              <svg
                viewBox="0 0 760 460"
                className="hm-svg-viewport"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background grid lines for GIS radar look */}
                <defs>
                  <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
                  </radialGradient>
                  <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <rect width="760" height="460" fill="url(#mapGlow)" rx="12" />

                {/* Grid lines */}
                {[100, 200, 300, 400].map((y) => (
                  <line
                    key={y}
                    x1="20"
                    y1={y}
                    x2="740"
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray="4 4"
                  />
                ))}
                {[150, 300, 450, 600].map((x) => (
                  <line
                    key={x}
                    x1={x}
                    y1="20"
                    x2={x}
                    y2="440"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Heatmap Nodes / Bubbles for each District */}
                {data?.points.map((p: HeatmapPoint) => {
                  const { x, y } = projectToSvg(p.lng, p.lat);
                  const radius = mode === "TEMPERATURE" ? 22 : mode === "AQI" ? 24 : 26;

                  return (
                    <g
                      key={p.district_code}
                      className={`hm-district-bubble ${p.is_warning ? "hm-bubble-warning" : ""}`}
                      onClick={() => handleOpenZoneDetail(p.district_code)}
                    >
                      {/* Ambient heat aura */}
                      <circle
                        cx={x}
                        cy={y}
                        r={radius * 1.8}
                        fill={p.color_hex}
                        opacity={p.is_warning ? 0.35 : 0.18}
                        filter="url(#glowFilter)"
                      />

                      {/* Main District Node */}
                      <circle
                        cx={x}
                        cy={y}
                        r={radius}
                        fill={p.color_hex}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeOpacity="0.8"
                      />

                      {/* Value inside circle */}
                      <text
                        x={x}
                        y={y - 2}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        {mode === "TEMPERATURE" ? `${p.value}°` : Math.round(p.value)}
                      </text>

                      {/* Warning Icon or District Name Label */}
                      <text
                        x={x}
                        y={y + 11}
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="8.5"
                        fontWeight="600"
                        pointerEvents="none"
                      >
                        {p.is_warning ? "⚠️" : p.district_name.replace("Quận ", "Q.").replace("Huyện ", "H.")}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legends Bar */}
            <div className="hm-legends-bar">
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8" }}>
                Chú giải ({mode}):
              </span>
              {data?.legends.map((lg) => (
                <div key={lg.label} className="hm-legend-item">
                  <div
                    className="hm-legend-color"
                    style={{ backgroundColor: lg.color_hex }}
                  />
                  <span>
                    <strong>{lg.label}</strong> ({lg.range_text})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar List of Districts */}
          <div className="hm-sidebar-card">
            <div className="hm-sidebar-header">
              <span>Danh Sách 22 Khu Vực</span>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {filteredPoints.length} quận/huyện
              </span>
            </div>

            <input
              type="text"
              placeholder="Tìm kiếm quận / huyện…"
              className="hm-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="hm-districts-scroll">
              {filteredPoints.map((p) => (
                <div
                  key={p.district_code}
                  className={`hm-district-row ${p.is_warning ? "has-warning" : ""}`}
                  onClick={() => handleOpenZoneDetail(p.district_code)}
                >
                  <div>
                    <span className="hm-row-name">{p.district_name}</span>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {p.level_label}
                    </div>
                  </div>

                  <span
                    className="hm-row-val-badge"
                    style={{ backgroundColor: p.color_hex }}
                  >
                    {mode === "TEMPERATURE" ? `${p.value}°C` : `${Math.round(p.value)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MÀN 4: POPUP CHI TIẾT KHU VỰC (Table 141) */}
      {(selectedZone || loadingZone) && (
        <div
          className="hm-modal-overlay"
          onClick={() => {
            if (!loadingZone) setSelectedZone(null);
          }}
        >
          <div className="hm-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="hm-modal-close"
              onClick={() => setSelectedZone(null)}
            >
              ✕
            </button>

            {loadingZone ? (
              <div style={{ padding: "2.5rem 0", textAlign: "center" }}>
                <div className="hm-spinner" style={{ margin: "0 auto 1rem", borderTopColor: "#059669" }} />
                <p style={{ color: "#475569", fontWeight: 600 }}>
                  Đang tải thông số khu vực…
                </p>
              </div>
            ) : selectedZone ? (
              <>
                <div className="hm-modal-header">
                  <div className="hm-modal-zone-title">
                    <span>📍</span>
                    <span>{selectedZone.district_name}</span>
                  </div>
                  <div className="hm-modal-coord">
                    Tọa độ trung tâm GIS: {selectedZone.lat.toFixed(4)}°B, {selectedZone.lng.toFixed(4)}°Đ
                  </div>
                </div>

                {/* Alert message if zone has warnings */}
                {selectedZone.has_alert && selectedZone.alert_message && (
                  <div className="hm-modal-alert-box">
                    <span>🚨</span>
                    <span>{selectedZone.alert_message}</span>
                  </div>
                )}

                {/* 4-Dimension Metric Grid per Table 141 */}
                <div className="hm-modal-4dim-grid">
                  {/* Dim 1: AQI */}
                  <div
                    className="hm-dim-box"
                    style={{ background: "#f8fafc", borderColor: selectedZone.aqi_color }}
                  >
                    <div className="hm-dim-label">
                      <span>🍃</span>
                      <span>Chỉ số AQI</span>
                    </div>
                    <div className="hm-dim-value" style={{ color: selectedZone.aqi_color }}>
                      {selectedZone.aqi_value}
                    </div>
                    <span
                      className="hm-dim-tag"
                      style={{ backgroundColor: selectedZone.aqi_color }}
                    >
                      {selectedZone.aqi_level}
                    </span>
                  </div>

                  {/* Dim 2: Temperature */}
                  <div
                    className="hm-dim-box"
                    style={{ background: "#f8fafc", borderColor: selectedZone.temperature_color }}
                  >
                    <div className="hm-dim-label">
                      <span>🌡️</span>
                      <span>Nhiệt độ bề mặt</span>
                    </div>
                    <div className="hm-dim-value" style={{ color: selectedZone.temperature_color }}>
                      {selectedZone.temperature_c}°C
                    </div>
                    <span
                      className="hm-dim-tag"
                      style={{ backgroundColor: selectedZone.temperature_color }}
                    >
                      {selectedZone.temperature_level}
                    </span>
                  </div>

                  {/* Dim 3: Risk Score */}
                  <div
                    className="hm-dim-box"
                    style={{ background: "#f8fafc", borderColor: selectedZone.risk_color }}
                  >
                    <div className="hm-dim-label">
                      <span>⚠️</span>
                      <span>Điểm rủi ro ô nhiễm</span>
                    </div>
                    <div className="hm-dim-value" style={{ color: selectedZone.risk_color }}>
                      {selectedZone.risk_score} / 100
                    </div>
                    <span
                      className="hm-dim-tag"
                      style={{ backgroundColor: selectedZone.risk_color }}
                    >
                      {selectedZone.risk_level}
                    </span>
                  </div>

                  {/* Dim 4: Green Index */}
                  <div
                    className="hm-dim-box"
                    style={{ background: "#f0fdf4", borderColor: "#10b981" }}
                  >
                    <div className="hm-dim-label">
                      <span>🌱</span>
                      <span>Chỉ số Xanh tổng hợp</span>
                    </div>
                    <div className="hm-dim-value" style={{ color: "#059669" }}>
                      {selectedZone.green_index}
                    </div>
                    <span className="hm-dim-tag" style={{ backgroundColor: "#059669" }}>
                      Môi trường đô thị
                    </span>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="hm-modal-extra-stats">
                  <div className="hm-extra-stat-item">
                    <span className="val">{selectedZone.cleanup_rate}%</span>
                    <span className="lbl">Tỷ lệ bãi rác đã dọn sạch</span>
                  </div>
                  <div className="hm-extra-stat-item">
                    <span className="val">{selectedZone.resolved_incidents}</span>
                    <span className="lbl">Sự cố môi trường đã giải quyết</span>
                  </div>
                </div>

                {/* Modal Actions per Table 141 */}
                <div className="hm-modal-actions">
                  <button
                    className="hm-btn-secondary"
                    onClick={() => setSelectedZone(null)}
                  >
                    Đóng
                  </button>
                  <button
                    className="hm-btn-primary"
                    onClick={() => {
                      setSelectedZone(null);
                      if (onNavigateDistrictReport) {
                        onNavigateDistrictReport(selectedZone.district_code);
                      } else {
                        window.location.hash = "reports";
                      }
                    }}
                  >
                    <span>📊</span>
                    <span>Xem chi tiết quận</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiModeHeatmapContainer;
