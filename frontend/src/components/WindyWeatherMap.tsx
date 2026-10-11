
import React, { useState, useMemo } from "react";

export type WindyOverlay =
  | "temp"
  | "wind"
  | "radar"
  | "rain"
  | "clouds"
  | "waves"
  | "satellite"
  | "pressure";

export interface WindyLocation {
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  zoom: number;
}

export const VIETNAM_LOCATIONS: WindyLocation[] = [
  { name: "Toàn cảnh Việt Nam", shortName: "🇻🇳 Toàn quốc", lat: 14.058, lon: 108.277, zoom: 6 },
  { name: "TP. Hồ Chí Minh", shortName: "🏙️ TP.HCM", lat: 10.776, lon: 106.7, zoom: 9 },
  { name: "Thủ đô Hà Nội", shortName: "🏛️ Hà Nội", lat: 21.028, lon: 105.854, zoom: 9 },
  { name: "Thành phố Đà Nẵng", shortName: "🌊 Đà Nẵng", lat: 16.054, lon: 108.202, zoom: 9 },
  { name: "Cần Thơ & Tây Nam Bộ", shortName: "🌾 Cần Thơ", lat: 10.045, lon: 105.746, zoom: 9 },
  { name: "Nha Trang & Nam Trung Bộ", shortName: "🏖️ Nha Trang", lat: 12.238, lon: 109.196, zoom: 9 },
  { name: "Hải Phòng & Vịnh Bắc Bộ", shortName: "⚓ Hải Phòng", lat: 20.844, lon: 106.688, zoom: 9 },
  { name: "Quần đảo Hoàng Sa - Trường Sa", shortName: "🏝️ Biển Đông", lat: 13.0, lon: 113.5, zoom: 6 },
];

export const WINDY_OVERLAYS = [
  {
    id: "temp" as WindyOverlay,
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
    id: "wind" as WindyOverlay,
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
    id: "radar" as WindyOverlay,
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
    id: "rain" as WindyOverlay,
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
    id: "clouds" as WindyOverlay,
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
    id: "waves" as WindyOverlay,
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
    id: "satellite" as WindyOverlay,
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
    id: "pressure" as WindyOverlay,
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

interface WindyWeatherMapProps {
  onClose: () => void;
  initialOverlay?: WindyOverlay;
}

export const WindyWeatherMap: React.FC<WindyWeatherMapProps> = ({
  onClose,
  initialOverlay = "temp",
}) => {
  const [activeOverlay, setActiveOverlay] = useState<WindyOverlay>(initialOverlay);
  const [currentLoc, setCurrentLoc] = useState<WindyLocation>(VIETNAM_LOCATIONS[0]);
  const [model, setModel] = useState<"ecmwf" | "gfs">("ecmwf");
  const [showRightMenu, setShowRightMenu] = useState<boolean>(true);
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);

  // Xây dựng URL nhúng Windy chính thức với đầy đủ tùy chọn hiển thị
  const windySrc = useMemo(() => {
    return `https://embed.windy.com/embed2.html?lat=${currentLoc.lat}&lon=${currentLoc.lon}&detailLat=${currentLoc.lat}&detailLon=${currentLoc.lon}&width=100%25&height=100%25&zoom=${currentLoc.zoom}&level=surface&overlay=${activeOverlay}&product=${model}&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
  }, [currentLoc, activeOverlay, model]);

  const currentOverlayMeta = useMemo(() => {
    return WINDY_OVERLAYS.find((o) => o.id === activeOverlay) || WINDY_OVERLAYS[0];
  }, [activeOverlay]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        zIndex: 1100,
        backgroundColor: "#0b132b",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 1. THANH ĐIỀU HƯỚNG ĐỈNH CAO (HEADER DOCK) */}
      <header
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          zIndex: 1200,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {/* Khối trái: Nút quay lại + Tên chế độ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            pointerEvents: "auto",
          }}
        >
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 9999,
              color: "#f8fafc",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateX(-2px)";
              e.currentTarget.style.borderColor = "#38bdf8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
            }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            <span>Trở về Bản đồ Sự cố</span>
          </button>

          {/* Huy hiệu Windy Live */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(249, 115, 22, 0.4)",
              borderRadius: 9999,
              boxShadow: "0 8px 30px rgba(249, 115, 22, 0.25)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                boxShadow: "0 0 10px #ef4444",
                display: "inline-block",
                animation: "pulse 1.5s infinite",
              }}
            />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 12.5 }}>
              Windy.com Radar Thời tiết & Gió
            </span>
            <span
              style={{
                background: currentOverlayMeta.activeBg,
                color: currentOverlayMeta.activeColor,
                border: `1px solid ${currentOverlayMeta.activeColor}`,
                padding: "2px 8px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {currentOverlayMeta.icon} {currentOverlayMeta.name}
            </span>
          </div>
        </div>

        {/* Khối giữa: Quick Jump Tọa độ Thành phố Việt Nam */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            padding: "4px 8px",
            borderRadius: 9999,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            pointerEvents: "auto",
            maxWidth: "100%",
            overflowX: "auto",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
          }}
        >
          {VIETNAM_LOCATIONS.map((loc) => {
            const isSelected = currentLoc.name === loc.name;
            return (
              <button
                key={loc.name}
                onClick={() => {
                  setIsIframeLoading(true);
                  setCurrentLoc(loc);
                }}
                style={{
                  padding: "5px 11px",
                  borderRadius: 9999,
                  border: isSelected ? "1px solid #38bdf8" : "1px solid transparent",
                  background: isSelected
                    ? "linear-gradient(135deg, rgba(14, 165, 233, 0.35), rgba(59, 130, 246, 0.4))"
                    : "transparent",
                  color: isSelected ? "#38bdf8" : "#cbd5e1",
                  fontSize: 11.5,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {loc.shortName}
              </button>
            );
          })}
        </div>

        {/* Khối phải: Mô hình dự báo ECMWF/GFS + Nút Tab ngoài */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            pointerEvents: "auto",
          }}
        >
          {/* Selector Mô hình ECMWF / GFS */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(20px)",
              padding: 3,
              borderRadius: 9999,
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <button
              onClick={() => setModel("ecmwf")}
              style={{
                padding: "5px 10px",
                borderRadius: 9999,
                border: "none",
                background: model === "ecmwf" ? "#f97316" : "transparent",
                color: model === "ecmwf" ? "#fff" : "#94a3b8",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Mô hình ECMWF Châu Âu (Độ phân giải 9km - Chuẩn xác cao nhất)"
            >
              ECMWF (9km)
            </button>
            <button
              onClick={() => setModel("gfs")}
              style={{
                padding: "5px 10px",
                borderRadius: 9999,
                border: "none",
                background: model === "gfs" ? "#f97316" : "transparent",
                color: model === "gfs" ? "#fff" : "#94a3b8",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Mô hình GFS Hoa Kỳ (Độ phân giải 22km)"
            >
              GFS (Mỹ)
            </button>
          </div>

          {/* Nút bật/tắt thanh Menu Lớp khí tượng */}
          <button
            onClick={() => setShowRightMenu((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              background: showRightMenu ? "rgba(249, 115, 22, 0.25)" : "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(20px)",
              border: showRightMenu ? "1px solid #f97316" : "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 9999,
              color: showRightMenu ? "#f97316" : "#cbd5e1",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Ẩn/hiện danh sách các lớp khí tượng Windy"
          >
            <span>☰</span>
            <span>Lớp</span>
          </button>

          {/* Mở tab windy.com trực tiếp */}
          <a
            href={`https://www.windy.com/vi/-${encodeURIComponent(currentOverlayMeta.name)}-${activeOverlay}?${activeOverlay},${currentLoc.lat},${currentLoc.lon},${currentLoc.zoom}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 9999,
              color: "#94a3b8",
              fontSize: 11.5,
              textDecoration: "none",
              fontWeight: 600,
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4)",
            }}
            title="Mở toàn màn hình trên trang chủ Windy.com"
          >
            <span>↗</span>
            <span>Windy.com</span>
          </a>
        </div>
      </header>

      {/* 2. THANH MENU BÊN PHẢI (RIGHT-HAND OVERLAY MENU - GIỐNG CHÍNH XÁC HÌNH USER CHỤP) */}
      {showRightMenu && (
        <aside
          style={{
            position: "absolute",
            top: 80,
            right: 14,
            zIndex: 1200,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: 16,
            padding: 8,
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
            maxHeight: "calc(100vh - 180px)",
            overflowY: "auto",
          }}
        >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 8px 6px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            marginBottom: 2,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Lớp khí tượng
          </span>
          <span style={{ fontSize: 10, color: "#64748b" }}>Windy</span>
        </div>

        {WINDY_OVERLAYS.map((overlay) => {
          const isActive = activeOverlay === overlay.id;
          return (
            <button
              key={overlay.id}
              onClick={() => {
                setIsIframeLoading(true);
                setActiveOverlay(overlay.id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 10,
                border: isActive ? `1.5px solid ${overlay.activeColor}` : "1.5px solid transparent",
                background: isActive ? overlay.activeBg : "rgba(255, 255, 255, 0.03)",
                color: isActive ? "#ffffff" : "#cbd5e1",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isActive ? `0 4px 20px ${overlay.activeColor}33` : "none",
                minWidth: 165,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.color = "#f8fafc";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  e.currentTarget.style.color = "#cbd5e1";
                }
              }}
            >
              <span style={{ fontSize: 18, filter: isActive ? "drop-shadow(0 0 8px currentColor)" : "none" }}>
                {overlay.icon}
              </span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 600 }}>
                  {overlay.name}
                </span>
                <span style={{ fontSize: 10, color: isActive ? overlay.activeColor : "#64748b" }}>
                  Đơn vị: {overlay.unit}
                </span>
              </div>
            </button>
          );
        })}
      </aside>
      )}

      {/* 3. THANH CHÚ GIẢI THANG ĐO DƯỚI ĐÁY (LEGEND RIBBON) */}
      <footer
        style={{
          position: "absolute",
          bottom: 24,
          left: 16,
          zIndex: 1200,
          background: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 14,
          padding: "10px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5)",
          maxWidth: 460,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>{currentOverlayMeta.icon}</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 12.5 }}>
              Thang đo: {currentOverlayMeta.name} ({currentOverlayMeta.unit})
            </span>
          </div>
          <span style={{ color: "#94a3b8", fontSize: 11 }}>
            Mô hình: {model.toUpperCase()}
          </span>
        </div>

        {/* Dải gradient dải màu thời tiết */}
        <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
          {currentOverlayMeta.legend.map((item, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 8,
                  borderRadius: idx === 0 ? "4px 0 0 4px" : idx === currentOverlayMeta.legend.length - 1 ? "0 4px 4px 0" : 0,
                  backgroundColor: item.color,
                  boxShadow: `0 0 6px ${item.color}66`,
                }}
              />
              <span style={{ fontSize: 9.5, color: "#94a3b8", whiteSpace: "nowrap" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10.5, color: "#64748b" }}>
            💡 Nhấp chuột trực tiếp lên bản đồ để đo thông số thời tiết và gió tại tọa độ
          </span>
        </div>
      </footer>

      {/* 4. IFRAME NHÚNG TRỰC TIẾP WINDY ENGINE (FULL VIEWPORT) */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          backgroundColor: "#0f172a",
        }}
      >
        {isIframeLoading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#0b132b",
              zIndex: 10,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "3px solid rgba(249, 115, 22, 0.2)",
                borderTopColor: "#f97316",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ color: "#f8fafc", fontSize: 14, fontWeight: 600 }}>
              Đang kết nối trạm Radar Khí tượng Windy ({currentLoc.name})...
            </span>
          </div>
        )}

        <iframe
          src={windySrc}
          title="Windy.com Vietnam Live Meteorological Radar"
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

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export default WindyWeatherMap;
