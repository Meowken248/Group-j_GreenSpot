import React, { useState, useMemo } from "react";
import "./LiveWeatherRadarMap.css";

export type WeatherOverlay =
  | "temp"
  | "wind"
  | "radar"
  | "rain"
  | "clouds"
  | "waves"
  | "satellite"
  | "pressure";

export interface WeatherLocation {
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  zoom: number;
}

export const VIETNAM_LOCATIONS: WeatherLocation[] = [
  { name: "Toàn cảnh Việt Nam", shortName: "🇻🇳 Toàn quốc", lat: 14.058, lon: 108.277, zoom: 6 },
  { name: "TP. Hồ Chí Minh", shortName: "🏙️ TP.HCM", lat: 10.776, lon: 106.7, zoom: 9 },
  { name: "Thủ đô Hà Nội", shortName: "🏛️ Hà Nội", lat: 21.028, lon: 105.854, zoom: 9 },
  { name: "Thành phố Đà Nẵng", shortName: "🌊 Đà Nẵng", lat: 16.054, lon: 108.202, zoom: 9 },
  { name: "Cần Thơ & Tây Nam Bộ", shortName: "🌾 Cần Thơ", lat: 10.045, lon: 105.746, zoom: 9 },
  { name: "Nha Trang & Nam Trung Bộ", shortName: "🏖️ Nha Trang", lat: 12.238, lon: 109.196, zoom: 9 },
  { name: "Hải Phòng & Vịnh Bắc Bộ", shortName: "⚓ Hải Phòng", lat: 20.844, lon: 106.688, zoom: 9 },
  { name: "Quần đảo Hoàng Sa - Trường Sa", shortName: "🏝️ Biển Đông", lat: 13.0, lon: 113.5, zoom: 6 },
];

export const WEATHER_OVERLAYS = [
  {
    id: "temp" as WeatherOverlay,
    name: "Nhiệt độ",
    icon: "🌡️",
    unit: "°C",
    desc: "Bản đồ nhiệt động nhiệt vi khí hậu",
    activeColor: "#f97316",
    activeBg: "linear-gradient(135deg, rgba(249, 115, 22, 0.25), rgba(239, 68, 68, 0.35))",
    legend: [
      { label: "-20°", color: "#3b82f6" },
      { label: "-10°", color: "#06b6d4" },
      { label: "0°", color: "#10b981" },
      { label: "10°", color: "#84cc16" },
      { label: "20°", color: "#eab308" },
      { label: "30°", color: "#f97316" },
      { label: "40°+", color: "#ef4444" },
    ],
  },
  {
    id: "wind" as WeatherOverlay,
    name: "Gió & Dòng hạt",
    icon: "💨",
    unit: "km/h",
    desc: "Luồng hạt gió chuyển động thời gian thực",
    activeColor: "#06b6d4",
    activeBg: "linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(59, 130, 246, 0.35))",
    legend: [
      { label: "0", color: "#64748b" },
      { label: "15", color: "#38bdf8" },
      { label: "30", color: "#34d399" },
      { label: "50", color: "#facc15" },
      { label: "70", color: "#fb923c" },
      { label: "90+ km/h", color: "#f43f5e" },
    ],
  },
  {
    id: "radar" as WeatherOverlay,
    name: "Radar thời tiết",
    icon: "🛰️",
    unit: "dBZ",
    desc: "Radar phản hồi mây mưa trực tiếp",
    activeColor: "#3b82f6",
    activeBg: "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(99, 102, 241, 0.35))",
    legend: [
      { label: "Mưa nhẹ", color: "#60a5fa" },
      { label: "Vừa", color: "#34d399" },
      { label: "To", color: "#facc15" },
      { label: "Rất to", color: "#f97316" },
      { label: "Mưa đá/Bão", color: "#dc2626" },
    ],
  },
  {
    id: "rain" as WeatherOverlay,
    name: "Mưa & Sét",
    icon: "🌧️",
    unit: "mm/h",
    desc: "Mật độ mây dông & tích lũy lượng mưa",
    activeColor: "#8b5cf6",
    activeBg: "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(168, 85, 247, 0.35))",
    legend: [
      { label: "0 mm", color: "#475569" },
      { label: "1.5 mm", color: "#38bdf8" },
      { label: "5 mm", color: "#22c55e" },
      { label: "15 mm", color: "#eab308" },
      { label: "30+ mm", color: "#ec4899" },
    ],
  },
  {
    id: "clouds" as WeatherOverlay,
    name: "Mây che phủ",
    icon: "☁️",
    unit: "%",
    desc: "Độ che phủ mây tầng thấp & mây đối lưu",
    activeColor: "#94a3b8",
    activeBg: "linear-gradient(135deg, rgba(148, 163, 184, 0.25), rgba(203, 213, 225, 0.35))",
    legend: [
      { label: "Quang đãng (0%)", color: "#0284c7" },
      { label: "25%", color: "#38bdf8" },
      { label: "50%", color: "#94a3b8" },
      { label: "75%", color: "#cbd5e1" },
      { label: "U ám (100%)", color: "#f8fafc" },
    ],
  },
  {
    id: "waves" as WeatherOverlay,
    name: "Sóng biển",
    icon: "🌊",
    unit: "m",
    desc: "Độ cao sóng biển Đông & hướng sóng",
    activeColor: "#0ea5e9",
    activeBg: "linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(37, 99, 235, 0.35))",
    legend: [
      { label: "0.5m (Êm)", color: "#38bdf8" },
      { label: "1.5m", color: "#22c55e" },
      { label: "2.5m (Động)", color: "#f59e0b" },
      { label: "4m+ (Biển động dữ dội)", color: "#ef4444" },
    ],
  },
  {
    id: "satellite" as WeatherOverlay,
    name: "Ảnh vệ tinh",
    icon: "🌍",
    unit: "Quang phổ",
    desc: "Ảnh chụp vệ tinh khí tượng hồng ngoại",
    activeColor: "#10b981",
    activeBg: "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.35))",
    legend: [
      { label: "Không mây", color: "#0f172a" },
      { label: "Mây mỏng", color: "#64748b" },
      { label: "Mây dày", color: "#cbd5e1" },
      { label: "Đối lưu mạnh", color: "#ffffff" },
    ],
  },
  {
    id: "pressure" as WeatherOverlay,
    name: "Khí áp & Tâm bão",
    icon: "🌀",
    unit: "hPa",
    desc: "Đường đẳng áp & vùng áp thấp nhiệt đới",
    activeColor: "#eab308",
    activeBg: "linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(245, 158, 11, 0.35))",
    legend: [
      { label: "980 hPa (Áp thấp/Bão)", color: "#dc2626" },
      { label: "1000 hPa", color: "#f97316" },
      { label: "1013 hPa (Chuẩn)", color: "#10b981" },
      { label: "1025 hPa (Cao áp)", color: "#3b82f6" },
    ],
  },
];

interface LiveWeatherRadarMapProps {
  onClose: () => void;
  initialOverlay?: WeatherOverlay;
  userGps?: { lat: number; lng: number } | null;
}

export const LiveWeatherRadarMap: React.FC<LiveWeatherRadarMapProps> = ({
  onClose,
  initialOverlay = "temp",
  userGps = null,
}) => {
  const [activeOverlay, setActiveOverlay] = useState<WeatherOverlay>(initialOverlay);
  const [currentLoc, setCurrentLoc] = useState<WeatherLocation>(VIETNAM_LOCATIONS[0]);
  const [model, setModel] = useState<"ecmwf" | "gfs">("ecmwf");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);
  const [hasMarker, setHasMarker] = useState<boolean>(false);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [localGps, setLocalGps] = useState<{ lat: number; lng: number } | null>(userGps);

  // Cập nhật khi prop userGps thay đổi từ hook định vị
  React.useEffect(() => {
    if (userGps) {
      setLocalGps(userGps);
    }
  }, [userGps]);

  // Nhảy ngay tới tọa độ GPS của người dùng
  const handleJumpToGps = () => {
    const activeGps = localGps || userGps;
    if (activeGps) {
      setIsIframeLoading(true);
      setIsGpsActive(true);
      setHasMarker(true);
      setCurrentLoc({
        name: `Vị trí GPS (${activeGps.lat.toFixed(4)}, ${activeGps.lng.toFixed(4)})`,
        shortName: "🎯 Vị trí của tôi",
        lat: activeGps.lat,
        lon: activeGps.lng,
        zoom: 10,
      });
    } else if (navigator.geolocation) {
      setIsIframeLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setLocalGps({ lat, lng: lon });
          setIsGpsActive(true);
          setHasMarker(true);
          setCurrentLoc({
            name: `Vị trí GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
            shortName: "🎯 Vị trí của tôi",
            lat,
            lon,
            zoom: 10,
          });
        },
        (err) => {
          console.warn("Lỗi GPS:", err);
          setIsIframeLoading(false);
          alert("Không thể truy cập GPS trình duyệt. Vui lòng cho phép quyền truy cập vị trí.");
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      alert("Thiết bị hoặc trình duyệt không hỗ trợ Geolocation API.");
    }
  };

  // Xây dựng URL nhúng radar khí tượng với đầy đủ tùy chọn hiển thị & marker GPS
  const radarEngineSrc = useMemo(() => {
    const markerFlag = hasMarker ? "true" : "";
    return `https://embed.windy.com/embed2.html?lat=${currentLoc.lat}&lon=${currentLoc.lon}&detailLat=${currentLoc.lat}&detailLon=${currentLoc.lon}&width=100%25&height=100%25&zoom=${currentLoc.zoom}&level=surface&overlay=${activeOverlay}&product=${model}&menu=&message=true&marker=${markerFlag}&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
  }, [currentLoc, activeOverlay, model, hasMarker]);

  const currentOverlayMeta = useMemo(() => {
    return WEATHER_OVERLAYS.find((o) => o.id === activeOverlay) || WEATHER_OVERLAYS[0];
  }, [activeOverlay]);

  // Global Keyboard Shortcuts (macOS standard: Esc / ⌘W to close radar, ⌘M to collapse)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w")) {
        e.preventDefault();
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="live-radar-root">
      {/* 1. NÚT NỔI MỞ SIDEBAR & QUAY LẠI KHI THU GỌN */}
      {!isSidebarOpen && (
        <>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="radar-sidebar-floating-toggle"
            title="Mở menu điều khiển radar khí tượng"
          >
            <span style={{ fontSize: 16 }}>☰</span>
            <span>Điều Khiển Radar</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="radar-floating-back-btn"
            title="Trở về Bản đồ WebGIS"
          >
            <span>←</span>
            <span>Bản đồ WebGIS</span>
          </button>
        </>
      )}

      {/* 2. MASTER RADAR SIDEBAR (BÊN TRÁI) */}
      <aside className={`radar-sidebar-container ${!isSidebarOpen ? "collapsed" : ""}`}>
        {/* Header: macOS Traffic Lights & Nút trở về */}
        <div className="radar-sidebar-header">
          <div className="macos-traffic-lights">
            <button
              type="button"
              className="traffic-light close"
              onClick={onClose}
              title="Đóng / Trở về Bản đồ WebGIS (⌘W)"
            >
              <span className="traffic-light-glyph">✕</span>
            </button>
            <button
              type="button"
              className="traffic-light minimize"
              onClick={() => setIsSidebarOpen(false)}
              title="Thu nhỏ thanh điều khiển radar"
            >
              <span className="traffic-light-glyph">−</span>
            </button>
            <button
              type="button"
              className="traffic-light maximize"
              onClick={() => {
                setIsIframeLoading(true);
                setCurrentLoc({ ...currentLoc });
              }}
              title="Làm mới góc nhìn radar"
            >
              <span className="traffic-light-glyph">+</span>
            </button>
          </div>

          <button onClick={onClose} className="radar-back-btn" title="Trở về Bản đồ WebGIS (Esc hoặc ⌘W)">
            <span>←</span>
            <span>Trở về WebGIS</span>
            <kbd className="kbd" style={{ marginLeft: 4 }}>Esc</kbd>
          </button>
        </div>

        {/* Mode Banner: Tiêu đề & Huy hiệu Live */}
        <div className="radar-mode-banner">
          <div className="radar-banner-brand">
            <div className="radar-brand-icon">
              <span>{currentOverlayMeta.icon}</span>
            </div>
            <div className="radar-banner-info">
              <span className="radar-banner-title">Radar Khí Tượng</span>
              <span className="radar-banner-desc">
                <span className="radar-beacon-dot" />
                <span>Trực tiếp</span>
              </span>
            </div>
          </div>
          <span
            className="radar-active-overlay-chip"
            style={{
              background: currentOverlayMeta.activeBg,
              color: currentOverlayMeta.activeColor,
              border: `1px solid ${currentOverlayMeta.activeColor}55`,
            }}
          >
            {currentOverlayMeta.name} ({currentOverlayMeta.unit})
          </span>
        </div>

        {/* Thân cuộn Sidebar */}
        <div className="radar-sidebar-body">
          {/* Section 1: Mô hình & Làm mới */}
          <div className="radar-card-section">
            <div className="radar-section-header">
              <span className="radar-section-title">
                <span>⚙️</span>
                <span>Mô hình dự báo</span>
              </span>
              <span className="radar-section-badge">{model.toUpperCase()}</span>
            </div>
            <div className="radar-model-row">
              <div className="radar-model-switcher">
                <button
                  type="button"
                  onClick={() => setModel("ecmwf")}
                  className={`radar-model-btn ${model === "ecmwf" ? "active" : ""}`}
                  title="ECMWF: Độ phân giải 9km - Chuẩn xác cao nhất"
                >
                  ECMWF (9km)
                </button>
                <button
                  type="button"
                  onClick={() => setModel("gfs")}
                  className={`radar-model-btn ${model === "gfs" ? "active" : ""}`}
                  title="GFS: Mô hình của NOAA Mỹ (22km)"
                >
                  GFS (Mỹ)
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsIframeLoading(true);
                  const loc = currentLoc;
                  setCurrentLoc({ ...loc });
                }}
                className="radar-refresh-btn"
                title="Làm mới tín hiệu trạm quan trắc"
              >
                <span>🔄</span>
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* Section 2: Lớp khí tượng (8 Lớp) */}
          <div className="radar-card-section">
            <div className="radar-section-header">
              <span className="radar-section-title">
                <span>🛰️</span>
                <span>Lớp khí tượng (8 Lớp)</span>
              </span>
              <span className="radar-section-badge">● LIVE</span>
            </div>
            <div className="radar-overlays-grid">
              {WEATHER_OVERLAYS.map((overlay) => {
                const isActive = activeOverlay === overlay.id;
                return (
                  <button
                    key={overlay.id}
                    type="button"
                    onClick={() => {
                      setIsIframeLoading(true);
                      setActiveOverlay(overlay.id);
                    }}
                    className={`radar-overlay-btn ${isActive ? "active" : ""}`}
                    style={isActive ? { borderLeft: `3px solid ${overlay.activeColor}` } : undefined}
                  >
                    <span className="radar-overlay-icon">{overlay.icon}</span>
                    <div className="radar-overlay-info">
                      <span className="radar-overlay-name">{overlay.name}</span>
                      <span className="radar-overlay-unit">{overlay.unit}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Thước đo & Chú giải thang màu */}
          <div className="radar-card-section">
            <div className="radar-section-header">
              <span className="radar-section-title">
                <span>📊</span>
                <span>Thang đo {currentOverlayMeta.name}</span>
              </span>
              <span style={{ fontSize: 10, color: "#64748b" }}>{currentOverlayMeta.unit}</span>
            </div>

            <div className="radar-legend-container">
              <div className="radar-legend-header-row">
                <span className="radar-legend-title">
                  {currentOverlayMeta.icon} {currentOverlayMeta.name}
                </span>
                <span className="radar-legend-desc">{currentOverlayMeta.desc}</span>
              </div>

              <div className="radar-legend-steps">
                {currentOverlayMeta.legend.map((item, idx) => (
                  <div key={idx} className="radar-legend-step-col">
                    <div
                      className="radar-legend-color-box"
                      style={{
                        backgroundColor: item.color,
                        borderRadius:
                          idx === 0
                            ? "4px 0 0 4px"
                            : idx === currentOverlayMeta.legend.length - 1
                              ? "0 4px 4px 0"
                              : 0,
                      }}
                    />
                    <span className="radar-legend-label-text">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="radar-legend-hint">
                <span>💡 Nhấp chuột trực tiếp lên bản đồ để đo thông số vi khí hậu và gió tại điểm</span>
              </div>
            </div>
          </div>

          {/* Section 4: Khu vực quan sát & GPS */}
          <div className="radar-card-section">
            <div className="radar-section-header">
              <span className="radar-section-title">
                <span>📍</span>
                <span>Khu vực quan sát</span>
              </span>
              <span className="radar-section-badge">{currentLoc.shortName}</span>
            </div>

            {/* Nút định vị GPS */}
            <button
              type="button"
              onClick={handleJumpToGps}
              className={`radar-gps-full-btn ${isGpsActive ? "active" : ""}`}
              title="Định vị ngay vị trí GPS của tôi trên bản đồ thời tiết"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 14 }}>🎯</span>
                <span>Vị trí GPS của tôi</span>
              </div>
              {localGps && (
                <span style={{ fontSize: 10, opacity: 0.85 }}>
                  ({localGps.lat.toFixed(2)}, {localGps.lng.toFixed(2)})
                </span>
              )}
            </button>

            {/* Lưới 8 điểm mốc khu vực */}
            <div className="radar-locations-grid">
              {VIETNAM_LOCATIONS.map((loc) => {
                const isSelected = !isGpsActive && currentLoc.name === loc.name;
                return (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => {
                      setIsIframeLoading(true);
                      setIsGpsActive(false);
                      setHasMarker(false);
                      setCurrentLoc(loc);
                    }}
                    className={`radar-location-btn ${isSelected ? "active" : ""}`}
                  >
                    <span>{loc.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Sidebar */}
        <div className="radar-sidebar-footer">
          <div className="radar-footer-source">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
            <span>Trạm quan trắc Windy Live</span>
          </div>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Độ trễ: ~0s</span>
        </div>
      </aside>

      {/* 3. IFRAME NHÚNG TRỰC TIẾP ENGINE (FULL VIEWPORT) */}
      <div style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#0f172a" }}>
        {isIframeLoading && (
          <div className="live-radar-loading-overlay">
            <div className="live-radar-spinner" />
            <span className="live-radar-loading-text">
              Đang kết nối trạm Radar Khí tượng ({currentLoc.name})...
            </span>
          </div>
        )}

        <iframe
          src={radarEngineSrc}
          title="Hệ thống Radar Khí tượng & Luồng gió Thời gian thực"
          width="100%"
          height="100%"
          style={{
            border: "none",
            width: "100%",
            height: "100%",
            display: "block",
          }}
          onLoad={() => setIsIframeLoading(false)}
          allow="geolocation; fullscreen"
        />
      </div>
    </div>
  );
};

export default LiveWeatherRadarMap;
