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
  const [showRightMenu, setShowRightMenu] = useState<boolean>(true);
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

  return (
    <div className="live-radar-root">
      {/* 1. THANH ĐIỀU HƯỚNG ĐỈNH CAO (HEADER DOCK) */}
      <header className="live-radar-header">
        {/* Khối trái: Nút quay lại + Tên chế độ */}
        <div className="live-radar-left-group">
          <button onClick={onClose} className="live-radar-back-btn">
            <span style={{ fontSize: 16 }}>←</span>
            <span>Trở về Bản đồ WebGIS</span>
          </button>

          {/* Huy hiệu Radar Live */}
          <div className="live-radar-status-badge">
            <span className="live-radar-beacon-dot" />
            <span className="live-radar-badge-title">
              Radar Khí tượng & Luồng gió
            </span>
            <span
              className="live-radar-badge-chip"
              style={{
                background: currentOverlayMeta.activeBg,
                color: currentOverlayMeta.activeColor,
                border: `1px solid ${currentOverlayMeta.activeColor}55`,
              }}
            >
              {currentOverlayMeta.icon} {currentOverlayMeta.name}
            </span>
          </div>
        </div>

        {/* Khối giữa: Quick Jump Tọa độ Thành phố Việt Nam */}
        <div className="live-radar-locations-dock">
          {/* Nút định vị GPS của người dùng */}
          <button
            onClick={handleJumpToGps}
            className={`live-radar-gps-btn ${isGpsActive ? "active" : ""}`}
            title="Định vị ngay vị trí GPS của tôi trên bản đồ thời tiết"
          >
            <span style={{ fontSize: 13 }}>🎯</span>
            <span>Vị trí của tôi</span>
            {localGps && (
              <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>
                ({localGps.lat.toFixed(2)}, {localGps.lng.toFixed(2)})
              </span>
            )}
          </button>

          <div className="live-radar-dock-divider" />

          {VIETNAM_LOCATIONS.map((loc) => {
            const isSelected = !isGpsActive && currentLoc.name === loc.name;
            return (
              <button
                key={loc.name}
                onClick={() => {
                  setIsIframeLoading(true);
                  setIsGpsActive(false);
                  setHasMarker(false);
                  setCurrentLoc(loc);
                }}
                className={`live-radar-location-chip ${isSelected ? "active" : ""}`}
              >
                {loc.shortName}
              </button>
            );
          })}
        </div>

        {/* Khối phải: Mô hình dự báo ECMWF/GFS + Nút chức năng */}
        <div className="live-radar-right-group">
          {/* Selector Mô hình ECMWF / GFS */}
          <div className="live-radar-model-switcher">
            <button
              onClick={() => setModel("ecmwf")}
              className={`live-radar-model-btn ${model === "ecmwf" ? "active" : ""}`}
              title="Mô hình ECMWF (Độ phân giải 9km - Chuẩn xác cao nhất)"
            >
              ECMWF (9km)
            </button>
            <button
              onClick={() => setModel("gfs")}
              className={`live-radar-model-btn ${model === "gfs" ? "active" : ""}`}
              title="Mô hình GFS (Độ phân giải 22km)"
            >
              GFS (Mỹ)
            </button>
          </div>

          {/* Nút bật/tắt thanh Menu Lớp khí tượng */}
          <button
            onClick={() => setShowRightMenu((prev) => !prev)}
            className={`live-radar-action-btn ${showRightMenu ? "active" : ""}`}
            title="Ẩn/hiện danh sách các lớp khí tượng"
          >
            <span>☰</span>
            <span>Lớp</span>
          </button>

          {/* Nút làm mới dữ liệu trạm quan trắc */}
          <button
            onClick={() => {
              setIsIframeLoading(true);
              const loc = currentLoc;
              setCurrentLoc({ ...loc });
            }}
            className="live-radar-action-btn"
            title="Làm mới tín hiệu radar"
          >
            <span>🔄</span>
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {/* 2. THANH MENU BÊN PHẢI (RIGHT-HAND OVERLAY MENU) */}
      {showRightMenu && (
        <aside className="live-radar-overlay-panel">
          <div className="live-radar-panel-header">
            <span className="live-radar-panel-title">Lớp khí tượng</span>
            <span className="live-radar-panel-live">● LIVE</span>
          </div>

          {WEATHER_OVERLAYS.map((overlay) => {
            const isActive = activeOverlay === overlay.id;
            return (
              <button
                key={overlay.id}
                onClick={() => {
                  setIsIframeLoading(true);
                  setActiveOverlay(overlay.id);
                }}
                className={`live-radar-overlay-item ${isActive ? "active" : ""}`}
                style={isActive ? { borderLeft: `3px solid ${overlay.activeColor}` } : undefined}
              >
                <span className="live-radar-overlay-item-icon">
                  {overlay.icon}
                </span>
                <div className="live-radar-overlay-item-text">
                  <span className="live-radar-overlay-name">
                    {overlay.name}
                  </span>
                  <span className="live-radar-overlay-unit">
                    Đơn vị: {overlay.unit}
                  </span>
                </div>
              </button>
            );
          })}
        </aside>
      )}

      {/* 3. THANH CHÚ GIẢI THANG ĐO DƯỚI ĐÁY (LEGEND RIBBON) */}
      <footer className="live-radar-legend-card">
        <div className="live-radar-legend-header">
          <div className="live-radar-legend-title-box">
            <span style={{ fontSize: 14 }}>{currentOverlayMeta.icon}</span>
            <span className="live-radar-legend-title">
              Thang đo: {currentOverlayMeta.name} ({currentOverlayMeta.unit})
            </span>
          </div>
          <span className="live-radar-legend-model-badge">
            Mô hình: {model.toUpperCase()}
          </span>
        </div>

        {/* Dải gradient dải màu thời tiết */}
        <div className="live-radar-legend-bar">
          {currentOverlayMeta.legend.map((item, idx) => (
            <div key={idx} className="live-radar-legend-step">
              <div
                className="live-radar-legend-color"
                style={{
                  backgroundColor: item.color,
                  borderRadius: idx === 0 ? "4px 0 0 4px" : idx === currentOverlayMeta.legend.length - 1 ? "0 4px 4px 0" : 0,
                }}
              />
              <span className="live-radar-legend-label">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="live-radar-legend-hint">
          <span>💡 Nhấp chuột trực tiếp lên bản đồ để đo thông số vi khí hậu và gió tại tọa độ</span>
        </div>
      </footer>

      {/* 4. IFRAME NHÚNG TRỰC TIẾP ENGINE (FULL VIEWPORT) */}
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
