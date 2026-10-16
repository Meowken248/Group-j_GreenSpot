import React, { useState } from "react";
import type {
  HotspotCluster,
  TopHotspotItem,
  IncidentType,
  TimeRange,
} from "../types/hotspot.types";

interface Screen1HotspotMapProps {
  clusters: HotspotCluster[];
  top5: TopHotspotItem[];
  selectedClusterId: string | null;
  onSelectCluster: (clusterId: string) => void;
  onOpenDetailModal: () => void;
  incidentType: IncidentType;
  onChangeIncidentType: (type: IncidentType) => void;
  timeRange: TimeRange;
  onChangeTimeRange: (range: TimeRange) => void;
  startDate?: string;
  endDate?: string;
  onChangeStartDate?: (d: string) => void;
  onChangeEndDate?: (d: string) => void;
  tileServerError: boolean;
  onRetryTiles: () => void;
  isLoading: boolean;
}

export const Screen1HotspotMap: React.FC<Screen1HotspotMapProps> = ({
  clusters,
  top5,
  selectedClusterId,
  onSelectCluster,
  onOpenDetailModal,
  incidentType,
  onChangeIncidentType,
  timeRange,
  onChangeTimeRange,
  startDate = "",
  endDate = "",
  onChangeStartDate,
  onChangeEndDate,
  tileServerError,
  onRetryTiles,
  isLoading,
}) => {
  const [mapZoom, setMapZoom] = useState(12);

  // Tính toạ độ SVG ảo tương đối với toạ độ TP.HCM (lat: 10.74 - 10.82, lng: 106.60 - 106.74)
  const getSvgCoordinates = (lat: number, lng: number) => {
    const minLat = 10.72;
    const maxLat = 10.84;
    const minLng = 106.58;
    const maxLng = 106.76;

    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    // Đảo ngược trục Y do toạ độ màn hình đi từ trên xuống dưới
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;

    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    };
  };

  const getRiskClass = (level: string) => {
    switch (level) {
      case "VERY_CRITICAL":
        return "very-critical";
      case "CRITICAL":
        return "critical";
      default:
        return "potential";
    }
  };

  return (
    <div className="screen1-layout" data-testid="screen1-hotspot-map">
      {/* CỘT TRÁI: BỘ LỌC */}
      <aside className="filter-card" aria-label="Bộ lọc điểm nóng">
        <div className="filter-group">
          <label htmlFor="filter-incident-type" className="filter-label">
            Loại sự cố
          </label>
          <select
            id="filter-incident-type"
            className="custom-select"
            value={incidentType}
            onChange={(e) => onChangeIncidentType(e.target.value as IncidentType)}
            data-testid="filter-incident-type"
          >
            <option value="ALL">Tất cả sự cố</option>
            <option value="SPONTANEOUS_DUMP">Rác thải tự phát</option>
            <option value="FLOODING">Ngập úng đô thị</option>
            <option value="WATER_POLLUTION">Xả thải nguồn nước</option>
            <option value="AIR_POLLUTION">Ô nhiễm không khí</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-time-range" className="filter-label">
            Khoảng thời gian
          </label>
          <select
            id="filter-time-range"
            className="custom-select"
            value={timeRange}
            onChange={(e) => onChangeTimeRange(e.target.value as TimeRange)}
            data-testid="filter-time-range"
          >
            <option value="7_DAYS">7 ngày qua</option>
            <option value="30_DAYS">30 ngày qua</option>
            <option value="THIS_QUARTER">Quý này</option>
            <option value="CUSTOM">Tùy chỉnh</option>
          </select>
        </div>

        {timeRange === "CUSTOM" && (
          <>
            <div className="filter-group">
              <label htmlFor="filter-start-date" className="filter-label">
                Từ ngày
              </label>
              <input
                id="filter-start-date"
                type="date"
                className="custom-input"
                value={startDate}
                onChange={(e) => onChangeStartDate?.(e.target.value)}
                data-testid="filter-start-date"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="filter-end-date" className="filter-label">
                Đến ngày
              </label>
              <input
                id="filter-end-date"
                type="date"
                className="custom-input"
                value={endDate}
                onChange={(e) => onChangeEndDate?.(e.target.value)}
                data-testid="filter-end-date"
              />
            </div>
          </>
        )}

        <div className="filter-summary-meta">
          <strong>Thuật toán:</strong> Kernel Density Estimation (KDE) bán kính 300m - 500m theo thời gian thực.
        </div>
      </aside>

      {/* CỘT GIỮA: BẢN ĐỒ KHÔNG GIAN GIS */}
      <section className="map-canvas-container" aria-label="Bản đồ điểm nóng GIS">
        <div className="map-toolbar">
          <div className="toolbar-left">
            <span className="map-badge-counter" data-testid="hotspot-count-badge">
              🔥 {clusters.length} Cụm điểm nóng phát hiện
            </span>
          </div>

          <div className="toolbar-right">
            <button
              type="button"
              className="btn-view-detail"
              onClick={onOpenDetailModal}
              data-testid="btn-view-detail"
            >
              <span>🔍</span>
              <span>Xem chi tiết</span>
            </button>
          </div>
        </div>

        {/* Khung bản đồ tương tác hoặc fallback lỗi tile */}
        <div className="interactive-map-area" data-testid="interactive-map-area">
          {tileServerError ? (
            <div className="tile-error-fallback" data-testid="tile-error-fallback">
              <span className="error-icon">⚠️</span>
              <p className="error-text">
                Lỗi kết nối máy chủ bản đồ tile GIS - Vui lòng thử tải lại
              </p>
              <button
                type="button"
                className="btn-retry-tiles"
                onClick={onRetryTiles}
                data-testid="btn-retry-tiles"
              >
                <span>🔄</span>
                <span>Thử tải lại</span>
              </button>
            </div>
          ) : clusters.length === 0 && !isLoading ? (
            <div className="empty-hotspot-state" data-testid="empty-hotspot-state">
              <span className="empty-icon">🍃</span>
              <p className="empty-msg">
                Không phát hiện cụm điểm nóng nào trong bộ lọc đã chọn
              </p>
            </div>
          ) : (
            <svg
              className="hotspot-svg-layer"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-label="KDE Heatmap Layer"
            >
              {/* Vòng lan toả nhiệt KDE Gradient */}
              {clusters.map((cluster) => {
                const pos = getSvgCoordinates(cluster.latitude, cluster.longitude);
                const isSelected = selectedClusterId === cluster.id;
                const riskClass = getRiskClass(cluster.risk_level);
                // Bán kính phụ thuộc mức nghiêm trọng và mật độ
                const radius = cluster.risk_level === "VERY_CRITICAL" ? 7 : cluster.risk_level === "CRITICAL" ? 5.5 : 4.5;

                return (
                  <g
                    key={cluster.id}
                    onClick={() => {
                      onSelectCluster(cluster.id);
                    }}
                    style={{ cursor: "pointer" }}
                    data-testid={`hotspot-circle-${cluster.id}`}
                  >
                    {/* Lớp nhiệt mờ bên ngoài */}
                    <circle
                      cx={`${pos.x}%`}
                      cy={`${pos.y}%`}
                      r={`${radius * 1.5}%`}
                      className={`heat-circle ${riskClass}`}
                      opacity="0.3"
                    />
                    {/* Vòng tròn trọng tâm */}
                    <circle
                      cx={`${pos.x}%`}
                      cy={`${pos.y}%`}
                      r={`${radius}%`}
                      className={`heat-circle ${riskClass} ${isSelected ? "selected" : ""}`}
                    />
                    {/* Nhãn điểm nóng */}
                    <text
                      x={`${pos.x}%`}
                      y={`${pos.y + radius + 3}%`}
                      textAnchor="middle"
                      className="hotspot-pin-label"
                    >
                      {cluster.title} ({cluster.incident_count})
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Bảng chú giải Gradient KDE */}
          <div className="map-legend-card" aria-label="Bảng chú giải nhiệt độ ô nhiễm">
            <div className="legend-title">Mức độ nghiêm trọng (KDE)</div>
            <div className="legend-items">
              <div className="legend-row">
                <span className="color-dot red" />
                <span>Đỏ đậm: Rất nghiêm trọng</span>
              </div>
              <div className="legend-row">
                <span className="color-dot orange" />
                <span>Cam: Nghiêm trọng</span>
              </div>
              <div className="legend-row">
                <span className="color-dot yellow" />
                <span>Vàng: Nguy cơ tiềm ẩn</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CỘT PHẢI: TOP 5 ĐIỂM NÓNG ĐÔ THỊ */}
      <aside className="top5-card" aria-label="Top 5 điểm nóng đô thị">
        <div className="top5-header">
          <h2 className="card-title">Top 5 điểm nóng đô thị</h2>
          <span className="top5-tag">Mật độ cao nhất</span>
        </div>

        <div className="top5-list" data-testid="top5-list">
          {top5.map((item) => {
            const isSelected = selectedClusterId === item.id;
            return (
              <div
                key={item.id}
                className={`top-item ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectCluster(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectCluster(item.id);
                  }
                }}
                data-testid={`top5-item-${item.rank}`}
              >
                <div className={`top-rank-badge rank-${item.rank}`}>{item.rank}</div>
                <div className="top-info">
                  <div className="top-item-title" title={item.title}>
                    {item.title}
                  </div>
                  <div className="top-item-sub">
                    {item.district} • {item.trend}
                  </div>
                </div>
                <div className="top-count-badge" title="Số lượng sự cố ghi nhận">
                  {item.incident_count} sự cố
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
};
