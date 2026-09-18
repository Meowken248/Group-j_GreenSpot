import { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchFloodPointsAPI,
  FLOOD_LEVEL_CONFIG,
  type FloodPoint,
  type FloodLevel,
} from "../services/floodService";
import "./FloodMapPanel.css";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FloodMapPanelProps {
  /** Callback khi đóng panel */
  onClose: () => void;
  /** Callback bay đến 1 điểm trên bản đồ */
  onFlyTo?: (lng: number, lat: number) => void;
  /** Trả danh sách điểm ngập ra ngoài để parent render markers */
  onPointsLoaded?: (points: FloodPoint[]) => void;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const LEVEL_KEYS = Object.keys(FLOOD_LEVEL_CONFIG) as FloodLevel[];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FloodMapPanel({
  onClose,
  onFlyTo,
  onPointsLoaded,
}: FloodMapPanelProps) {
  const [points, setPoints] = useState<FloodPoint[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<FloodLevel | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // ---- Load data khi thay đổi bộ lọc level ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setApiError("");
      try {
        const data = await fetchFloodPointsAPI(selectedLevel);
        if (!cancelled) {
          setPoints(data);
          onPointsLoaded?.(data);
        }
      } catch {
        if (!cancelled) {
          setApiError(
            "Không kết nối được backend. Hãy kiểm tra FastAPI đang chạy ở cổng 8000."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedLevel, onPointsLoaded]);

  // ---- Lọc client-side theo từ khóa tìm kiếm ----
  const filteredPoints = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return points;
    return points.filter(
      (p) =>
        p.road.toLowerCase().includes(keyword) ||
        p.district.toLowerCase().includes(keyword)
    );
  }, [points, search]);

  // ---- Đếm theo level ----
  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const lvl of LEVEL_KEYS) {
      acc[lvl] = points.filter((p) => p.level === lvl).length;
    }
    return acc;
  }, [points]);

  const handleFlyTo = useCallback(
    (point: FloodPoint) => {
      onFlyTo?.(point.lng, point.lat);
    },
    [onFlyTo]
  );

  // ---- Render ----
  return (
    <div className="flood-panel-overlay">
      {/* Header */}
      <div className="flood-panel-header">
        <div className="flood-panel-header-left">
          <p className="flood-panel-eyebrow">HCM Flood Monitor</p>
          <h2 className="flood-panel-title">Theo dõi ngập TP.HCM</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="flood-demo-badge">DEMO</span>
          <button
            type="button"
            className="flood-panel-close-btn"
            onClick={onClose}
            title="Đóng panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flood-panel-body">
        {/* Search */}
        <div className="flood-section">
          <label className="flood-search-label" htmlFor="flood-search">
            Tìm tuyến đường / khu vực
          </label>
          <input
            id="flood-search"
            className="flood-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ví dụ: Nguyễn Hữu Cảnh"
          />
        </div>

        {/* Level filter */}
        <div className="flood-section">
          <div className="flood-section-title-row">
            <h3>Mức độ ngập</h3>
            <button
              type="button"
              className="flood-text-button"
              onClick={() => setSelectedLevel("ALL")}
            >
              Tất cả
            </button>
          </div>

          <div className="flood-level-grid">
            {LEVEL_KEYS.map((key) => {
              const cfg = FLOOD_LEVEL_CONFIG[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={`flood-level-card ${key.toLowerCase()} ${
                    selectedLevel === key ? "active" : ""
                  }`}
                  onClick={() => setSelectedLevel(key)}
                >
                  <span>{cfg.label}</span>
                  <strong>{counts[key] ?? 0}</strong>
                </button>
              );
            })}
          </div>
        </div>

        {/* Point list */}
        <div className="flood-section">
          <div className="flood-section-title-row">
            <h3>Điểm đang hiển thị</h3>
            <span className="flood-counter">{filteredPoints.length}</span>
          </div>

          {loading && <p className="flood-state-text">Đang tải dữ liệu...</p>}
          {apiError && <p className="flood-error-text">{apiError}</p>}

          {!loading && !apiError && filteredPoints.length === 0 && (
            <p className="flood-empty-text">Không có điểm ngập nào.</p>
          )}

          {!loading &&
            !apiError &&
            filteredPoints.map((point) => {
              const cfg = FLOOD_LEVEL_CONFIG[point.level];
              return (
                <button
                  key={point.id}
                  type="button"
                  className="flood-point-card"
                  onClick={() => handleFlyTo(point)}
                >
                  <div className="flood-point-card-top">
                    <div className="flood-point-card-info">
                      <strong>{point.road}</strong>
                      <span>{point.district}</span>
                    </div>
                    <span
                      className={`flood-status-badge ${point.level.toLowerCase()}`}
                    >
                      {cfg?.label}
                    </span>
                  </div>
                  <div className="flood-depth-row">
                    <span>Độ sâu ước tính</span>
                    <strong>{point.water_depth_cm} cm</strong>
                  </div>
                  <small>Cập nhật: {formatDate(point.updated_at)}</small>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
