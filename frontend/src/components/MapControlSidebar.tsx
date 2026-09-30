import { useState } from "react";
import type { HCMLocation } from "../data/hcmLocations";
import {
  CATEGORY_CONFIG,
  type EcoLocation,
  type EcoCategory,
} from "../data/hcmEcoLocations";
import type { LivePOI } from "../services/poiService";
import type { LiveWeatherResponse } from "../services/ecoApiService";
import type { ReverseGeocodeResult } from "../services/osmAdvancedService";
import type {
  FloodHotspotProperties,
  GloFASForecastResponse,
} from "../services/floodService";
import {
  MAP_STYLES,
  BUILDING_COLOR_THEMES,
  type BuildingColorTheme,
} from "./EcoMap";
import type { WeatherOverlay } from "./LiveWeatherRadarMap";
import "./MapControlSidebar.css";

export type StyleKey = keyof typeof MAP_STYLES;

export interface MapControlSidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  isSearchingLive: boolean;
  liveSearchResults: LivePOI[];
  setLiveSearchResults: (res: LivePOI[]) => void;
  localSearchResults: {
    ecoMatches: EcoLocation[];
    landmarkMatches?: HCMLocation[];
    poiMatches?: any[];
  };
  onSelectLivePOI: (poi: LivePOI) => void;
  onSelectEcoLocation: (loc: EcoLocation) => void;
  // Detail Inspection Cards
  selectedLocation: EcoLocation | null;
  setSelectedLocation: (loc: EcoLocation | null) => void;
  selectedPOI: LivePOI | null;
  setSelectedPOI: (poi: LivePOI | null) => void;
  selectedFloodSpot: FloodHotspotProperties | null;
  setSelectedFloodSpot: (spot: FloodHotspotProperties | null) => void;
  selectedFloodCoords?: [number, number] | null;
  clickedAddress: ReverseGeocodeResult | null;
  setClickedAddress: (loc: ReverseGeocodeResult | null) => void;
  selectedGloFAS: GloFASForecastResponse | null;
  loadingGloFAS: boolean;
  calculatingRoute: boolean;
  onCalculateRoute: (lng: number, lat: number, destName?: string) => void;
  // Category & POIs
  selectedCategory: EcoCategory | "all";
  setSelectedCategory: (cat: EcoCategory | "all") => void;
  categoryCounts: Record<EcoCategory | "all", number>;
  loadingEco: boolean;
  poiType: "all" | "cafe" | "restaurant" | "shop";
  setPoiType: (type: "all" | "cafe" | "restaurant" | "shop") => void;
  onLoadNearbyPOIs: (type: "all" | "cafe" | "restaurant" | "shop") => void;
  autoFetchPOI: boolean;
  onToggleAutoFetch: () => void;
  loadingPOIs: boolean;
  poiCount: number;
  // Basemaps & 3D
  activeStyle: StyleKey;
  setActiveStyle: (style: StyleKey) => void;
  is3D: boolean;
  onToggle3D: () => void;
  building3DTheme: BuildingColorTheme;
  setBuilding3DTheme: (theme: BuildingColorTheme) => void;
  showDistricts: boolean;
  setShowDistricts: (show: boolean) => void;
  // Weather & Radar
  onOpenRadar: (overlay: WeatherOverlay) => void;
  activeHeatmap: "none" | "temperature" | "aqi" | "risk";
  setActiveHeatmap: (m: "none" | "temperature" | "aqi" | "risk") => void;
  // Flood & Tide
  showFloodWatch: boolean;
  setShowFloodWatch: (show: boolean) => void;
  simulateFlood: boolean;
  setSimulateFlood: (sim: boolean) => void;
  floodData: any | null;
  simulatedRainfallMm: number | null;
  setSimulatedRainfallMm: (val: number | null) => void;
  onInspectGpsGloFAS: () => void;
  loadingGpsGloFAS: boolean;
  onFocusHotspotList?: () => void;
  // Tour
  landmarks: HCMLocation[];
  onSelectLandmark: (loc: HCMLocation) => void;
  // Live Status
  liveWeather: LiveWeatherResponse | null;
}

type SidebarTab = "explore" | "basemap" | "weather" | "flood" | "tour";

export default function MapControlSidebar(props: MapControlSidebarProps) {
  const {
    isOpen,
    onToggleOpen,
    searchQuery,
    setSearchQuery,
    isSearchFocused,
    setIsSearchFocused,
    isSearchingLive,
    liveSearchResults,
    setLiveSearchResults,
    localSearchResults,
    onSelectLivePOI,
    onSelectEcoLocation,
    // Inspection cards
    selectedLocation,
    setSelectedLocation,
    selectedPOI,
    setSelectedPOI,
    selectedFloodSpot,
    setSelectedFloodSpot,
    selectedFloodCoords,
    clickedAddress,
    setClickedAddress,
    selectedGloFAS,
    loadingGloFAS,
    calculatingRoute,
    onCalculateRoute,
    // Categories & POIs
    selectedCategory,
    setSelectedCategory,
    categoryCounts,
    loadingEco,
    poiType,
    setPoiType,
    onLoadNearbyPOIs,
    autoFetchPOI,
    onToggleAutoFetch,
    loadingPOIs,
    poiCount,
    activeStyle,
    setActiveStyle,
    is3D,
    onToggle3D,
    building3DTheme,
    setBuilding3DTheme,
    showDistricts,
    setShowDistricts,
    onOpenRadar,
    activeHeatmap,
    setActiveHeatmap,
    showFloodWatch,
    setShowFloodWatch,
    simulateFlood,
    setSimulateFlood,
    floodData,
    simulatedRainfallMm,
    setSimulatedRainfallMm,
    onInspectGpsGloFAS,
    loadingGpsGloFAS,
    onFocusHotspotList,
    landmarks,
    onSelectLandmark,
    liveWeather,
  } = props;

  const [activeTab, setActiveTab] = useState<SidebarTab>("explore");
  const [showColorThemeSubmenu, setShowColorThemeSubmenu] = useState(false);

  return (
    <>
      {/* Nút mở nhanh Sidebar khi bị thu gọn */}
      {!isOpen && (
        <button
          type="button"
          className="webgis-sidebar-floating-toggle"
          onClick={onToggleOpen}
          title="Mở Bảng điều khiển WebGIS (Ctrl + B)"
        >
          <span style={{ fontSize: 15 }}>🌱</span>
          <span>Bộ điều khiển WebGIS</span>
          <span style={{ fontSize: 11, color: "#64748b" }}>☰</span>
        </button>
      )}

      {/* Khung Sidebar chính */}
      <aside
        className={`webgis-sidebar-container ${isOpen ? "" : "collapsed"}`}
        aria-label="Bảng điều khiển WebGIS"
      >
        {/* 1. Header & Brand Bar */}
        <div className="sidebar-header">
          <div className="sidebar-brand-group">
            <div className="sidebar-brand-icon">🌱</div>
            <div>
              <div className="sidebar-brand-text">EcoReport WebGIS</div>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <span className="sidebar-brand-badge">Hệ sinh thái thông minh</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onToggleOpen}
            title="Thu gọn bảng điều khiển (Ctrl + B)"
          >
            ✕
          </button>
        </div>

        {/* 2. Ô tìm kiếm đa năng cố định */}
        <div className="sidebar-search-box">
          <div className="sidebar-search-input-wrapper">
            <span className="sidebar-search-icon">🔍</span>
            <input
              type="text"
              className="sidebar-search-input"
              placeholder="Tìm số nhà, hẻm, quán ăn, cafe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
            />
            {isSearchingLive && (
              <span style={{ fontSize: 10, color: "#94a3b8", marginRight: 4 }}>
                ⏳
              </span>
            )}
            {searchQuery && (
              <button
                type="button"
                className="sidebar-search-clear"
                onClick={() => {
                  setSearchQuery("");
                  setLiveSearchResults([]);
                  setIsSearchFocused(false);
                }}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown kết quả tìm kiếm */}
          {isSearchFocused &&
            (liveSearchResults.length > 0 ||
              localSearchResults.ecoMatches.length > 0) && (
              <div className="sidebar-search-dropdown">
                {liveSearchResults.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div className="search-dropdown-section-title">
                      Quán xá & Số nhà (OSM):
                    </div>
                    {liveSearchResults.map((poi) => (
                      <div
                        key={poi.id}
                        className="search-dropdown-item"
                        onClick={() => {
                          onSelectLivePOI(poi);
                          setIsSearchFocused(false);
                          setSearchQuery(poi.name);
                        }}
                      >
                        <span style={{ fontSize: 14 }}>📍</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#0f172a",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {poi.name}
                          </div>
                          <div
                            style={{
                              fontSize: 10.5,
                              color: "#64748b",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {poi.fullAddress || poi.district || "TP. Hồ Chí Minh"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {localSearchResults.ecoMatches.length > 0 && (
                  <div>
                    <div className="search-dropdown-section-title">
                      Điểm quan trắc & Không gian xanh:
                    </div>
                    {localSearchResults.ecoMatches.map((loc) => {
                      const cfg =
                        (CATEGORY_CONFIG as any)[loc.category] || {};
                      return (
                        <div
                          key={loc.id}
                          className="search-dropdown-item"
                          onClick={() => {
                            onSelectEcoLocation(loc);
                            setIsSearchFocused(false);
                            setSearchQuery(loc.name);
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{cfg.icon || "🌱"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#0f172a",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {loc.name}
                            </div>
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "#64748b",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {loc.district} • {cfg.name || loc.category}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
        </div>

        {/* 3. Thanh Chuyển Tab Chức Năng (5-Column Grid, 100% visible, No overflow) */}
        <nav className="sidebar-tabs-bar" aria-label="Phân nhóm chức năng WebGIS">
          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === "explore" ? "active" : ""}`}
            onClick={() => setActiveTab("explore")}
            title="Điểm môi trường & Tiện ích quán xá"
          >
            <div className="sidebar-tab-icon">
              <span>📍</span>
              <span className="sidebar-tab-badge">
                {loadingEco ? ".." : categoryCounts.all}
              </span>
            </div>
            <span className="sidebar-tab-title">Khám phá</span>
          </button>

          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === "basemap" ? "active" : ""}`}
            onClick={() => setActiveTab("basemap")}
            title="Lớp bản đồ nền & Chế độ 3D"
          >
            <div className="sidebar-tab-icon">
              <span>🗺️</span>
            </div>
            <span className="sidebar-tab-title">Bản đồ 3D</span>
          </button>

          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === "flood" ? "active" : ""}`}
            onClick={() => setActiveTab("flood")}
            title="Giám sát ngập lụt & triều cường (3 nguồn)"
          >
            <div className="sidebar-tab-icon">
              <span>🌊</span>
              {floodData && (
                <span
                  className="sidebar-tab-badge"
                  style={{
                    background:
                      floodData.summary.criticalCount > 0 ? "#ef4444" : undefined,
                    color:
                      floodData.summary.criticalCount > 0 ? "#ffffff" : undefined,
                  }}
                >
                  {floodData.total}
                </span>
              )}
            </div>
            <span className="sidebar-tab-title">Ngập lụt</span>
          </button>

          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === "weather" ? "active" : ""}`}
            onClick={() => setActiveTab("weather")}
            title="Radar Khí tượng & Bản đồ nhiệt Heatmap"
          >
            <div className="sidebar-tab-icon">
              <span>🌪️</span>
            </div>
            <span className="sidebar-tab-title">Khí tượng</span>
          </button>

          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === "tour" ? "active" : ""}`}
            onClick={() => setActiveTab("tour")}
            title="Tour danh lam thắng cảnh Việt Nam"
          >
            <div className="sidebar-tab-icon">
              <span>🧭</span>
            </div>
            <span className="sidebar-tab-title">Tour 3D</span>
          </button>
        </nav>

        {/* 4. Nội dung chi tiết theo từng Tab */}
        <div className="sidebar-content-scroll">
          {/* INSPECTOR CARD: HIỂN THỊ CHI TIẾT ĐỊA ĐIỂM/ĐIỂM NGẬP/QUÁN XÁ KHI ĐƯỢC CHỌN */}
          {selectedFloodSpot && (
            <div className="sidebar-inspector-card">
              <div className="inspector-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🌊</span>
                  <div>
                    <div className="inspector-card-tag">Điểm ngập lụt đô thị (3 Nguồn)</div>
                    <div className="inspector-card-title">{selectedFloodSpot.name}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="inspector-close-btn"
                  onClick={() => setSelectedFloodSpot(null)}
                  title="Đóng chi tiết"
                >
                  ✕
                </button>
              </div>

              {/* Huy hiệu Cảnh báo Thời gian thực */}
              <div
                className={`flood-risk-banner risk-${selectedFloodSpot.current_risk_level?.toLowerCase() || "watch"}`}
              >
                <span>{selectedFloodSpot.current_risk_label}</span>
                <span style={{ fontSize: 11, fontWeight: 800 }}>
                  ~{selectedFloodSpot.estimated_depth_cm} cm
                </span>
              </div>

              {/* NGUỒN 1: CỔNG DỮ LIỆU MỞ TP.HCM (SỞ XÂY DỰNG & UDC) */}
              <div className="inspector-source-box">
                <div className="inspector-source-header">
                  <span>🏛️</span>
                  <span>1. CỔNG DỮ LIỆU MỞ TP.HCM (SỞ XÂY DỰNG)</span>
                </div>
                <div className="inspector-grid-2col">
                  <div>
                    <span className="inspector-label">Độ sâu chuẩn: </span>
                    <strong>{selectedFloodSpot.historical_depth_cm} cm</strong>
                  </div>
                  <div>
                    <span className="inspector-label">Chiều dài: </span>
                    <strong>{selectedFloodSpot.length_m} m</strong>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <span className="inspector-label">Nguyên nhân: </span>
                    <span style={{ color: "#b91c1c", fontWeight: 600 }}>{selectedFloodSpot.cause}</span>
                  </div>
                </div>
                {selectedFloodSpot.pump_station && (
                  <div className="inspector-subtext">
                    ⚙️ <strong>Tiêu thoát:</strong> {selectedFloodSpot.pump_station}
                  </div>
                )}
                {selectedFloodSpot.detour_advice && (
                  <div className="inspector-advice">
                    💡 <strong>Tránh ngập:</strong> {selectedFloodSpot.detour_advice}
                  </div>
                )}
              </div>

              {/* NGUỒN 2: CẢNH BÁO MƯA THỜI GIAN THỰC (RAINFALL TRIGGER) */}
              <div className="inspector-source-box warning-box">
                <div className="inspector-source-header" style={{ color: "#92400e" }}>
                  <span>🌦️</span>
                  <span>2. CẢNH BÁO MƯA THỜI GIAN THỰC</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "#78350f" }}>Lượng mưa hiện tại:</span>
                  <strong style={{ color: "#b45309" }}>{selectedFloodSpot.current_rainfall_mm} mm/h</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: "#78350f" }}>Mực nước ước tính:</span>
                  <strong style={{ color: selectedFloodSpot.estimated_depth_cm > 25 ? "#dc2626" : "#0284c7" }}>
                    ~{selectedFloodSpot.estimated_depth_cm} cm
                  </strong>
                </div>
                <div style={{ fontSize: 10.5, color: "#92400e", borderTop: "1px dashed #fde68a", paddingTop: 4 }}>
                  {selectedFloodSpot.estimated_depth_cm >= 35
                    ? "⚠️ Cực kỳ nguy hiểm: Xe máy ngập pô chết máy, ô tô nguy cơ thủy kích."
                    : selectedFloodSpot.estimated_depth_cm >= 20
                    ? "⚠️ Ngập nửa bánh xe máy, di chuyển rất khó khăn."
                    : "✅ Mực nước thấp hoặc nước rút, phương tiện lưu thông bình thường."}
                </div>
              </div>

              {/* NGUỒN 3: OPEN-METEO GLOBAL FLOOD API (COPERNICUS GLOFAS) */}
              <div className="inspector-source-box glofas-box">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#166534" }}>
                    <span>🛰️</span>
                    <span>3. OPEN-METEO GLOFAS (COPERNICUS)</span>
                  </div>
                  <span className="sidebar-brand-badge">GloFAS Vệ tinh</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: "#14532d" }}>Lưu lượng Sông Sài Gòn:</span>
                  <strong style={{ color: "#15803d" }}>
                    {selectedFloodSpot.glofas_discharge_m3s
                      ? `${selectedFloodSpot.glofas_discharge_m3s.toLocaleString()} m³/s`
                      : "2,343 m³/s"}
                  </strong>
                </div>

                {selectedGloFAS && selectedGloFAS.forecast_7d && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#166534", marginBottom: 4 }}>
                      Dự báo dòng chảy 7 ngày tới (m³/s):
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 42, background: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "4px 6px" }}>
                      {selectedGloFAS.forecast_7d.map((day, idx) => {
                        const maxVal = 5000;
                        const barHeight = Math.min(32, Math.max(8, (day.discharge / maxVal) * 32));
                        const isHigh = day.discharge > 3500;
                        return (
                          <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <div
                              title={`${day.date}: ${day.discharge} m³/s`}
                              style={{
                                width: "100%",
                                height: barHeight,
                                background: isHigh ? "#ef4444" : "#10b981",
                                borderRadius: "3px 3px 0 0",
                              }}
                            />
                            <span style={{ fontSize: 8, color: "#64748b" }}>
                              {day.date.split("-")[2]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {loadingGloFAS && (
                  <div style={{ fontSize: 10, color: "#15803d", textAlign: "center", padding: "4px 0" }}>
                    Đang đồng bộ vệ tinh GloFAS...
                  </div>
                )}
              </div>

              {/* Các nút hành động */}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="inspector-action-primary"
                  onClick={() => {
                    if (selectedFloodCoords) {
                      onCalculateRoute(selectedFloodCoords[0], selectedFloodCoords[1], selectedFloodSpot.name);
                    } else if (floodData) {
                      const feat = floodData.features.find((f: any) => f.id === selectedFloodSpot.id);
                      if (feat) {
                        onCalculateRoute(feat.geometry.coordinates[0], feat.geometry.coordinates[1], selectedFloodSpot.name);
                      }
                    }
                  }}
                  disabled={calculatingRoute}
                >
                  <span>🧭</span>
                  <span>{calculatingRoute ? "Đang tính..." : "Chỉ đường tránh ngập"}</span>
                </button>
                <button
                  type="button"
                  className="inspector-action-secondary"
                  onClick={onInspectGpsGloFAS}
                  title="Xem chi tiết toàn bộ mô hình GloFAS"
                >
                  <span>📊 GloFAS</span>
                </button>
              </div>
            </div>
          )}

          {clickedAddress && (
            <div className="sidebar-inspector-card">
              <div className="inspector-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📍</span>
                  <div>
                    <div className="inspector-card-tag" style={{ color: "#2563eb" }}>Vị trí đã chọn trên bản đồ</div>
                    <div className="inspector-card-title">{clickedAddress.placeName}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="inspector-close-btn"
                  onClick={() => setClickedAddress(null)}
                  title="Đóng chi tiết"
                >
                  ✕
                </button>
              </div>

              <div className="inspector-source-box">
                {clickedAddress.houseNumber && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
                    🏠 Số nhà: {clickedAddress.houseNumber}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: "#475569" }}>
                  📍 {clickedAddress.fullAddress}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="inspector-action-primary"
                  onClick={() =>
                    onCalculateRoute(
                      clickedAddress.lng,
                      clickedAddress.lat,
                      clickedAddress.placeName || clickedAddress.fullAddress
                    )
                  }
                  disabled={calculatingRoute}
                >
                  <span>🧭</span>
                  <span>{calculatingRoute ? "Đang tính..." : "Chỉ đường từ vị trí của tôi"}</span>
                </button>
                <button
                  type="button"
                  className="inspector-action-secondary"
                  onClick={() =>
                    alert(
                      `Đã ghi nhận tọa độ ${clickedAddress.lat.toFixed(5)}, ${clickedAddress.lng.toFixed(
                        5
                      )} để gửi báo cáo sự cố!`
                    )
                  }
                >
                  <span>⚠️ Báo cáo</span>
                </button>
              </div>
            </div>
          )}

          {selectedPOI && (
            <div className="sidebar-inspector-card">
              <div className="inspector-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{selectedPOI.icon || "📍"}</span>
                  <div>
                    <div className="inspector-card-tag">{selectedPOI.categoryName}</div>
                    <div className="inspector-card-title">{selectedPOI.name}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="inspector-close-btn"
                  onClick={() => setSelectedPOI(null)}
                  title="Đóng chi tiết"
                >
                  ✕
                </button>
              </div>

              <div className="inspector-source-box">
                {selectedPOI.houseNumber && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
                    🏠 Số nhà: {selectedPOI.houseNumber}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: "#475569" }}>
                  📍 {selectedPOI.fullAddress}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="inspector-action-primary"
                  style={{ width: "100%" }}
                  onClick={() =>
                    onCalculateRoute(selectedPOI.longitude, selectedPOI.latitude, selectedPOI.name)
                  }
                  disabled={calculatingRoute}
                >
                  <span>🧭</span>
                  <span>{calculatingRoute ? "Đang tính..." : "Chỉ đường từ vị trí của tôi"}</span>
                </button>
              </div>
            </div>
          )}

          {selectedLocation && (() => {
            const cfg =
              (CATEGORY_CONFIG as any)[selectedLocation.category] || {
                icon: "🌱",
                color: "#10b981",
                name: "Sinh thái",
              };
            return (
              <div className="sidebar-inspector-card">
                <div className="inspector-card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                    <div>
                      <div className="inspector-card-tag" style={{ color: cfg.color }}>
                        {cfg.name}
                      </div>
                      <div className="inspector-card-title">{selectedLocation.name}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inspector-close-btn"
                    onClick={() => setSelectedLocation(null)}
                    title="Đóng chi tiết"
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    marginBottom: 8,
                    color: "#64748b",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: cfg.color,
                    }}
                  />
                  <span>{selectedLocation.statusText}</span>
                  <span>•</span>
                  <span>
                    📍 {selectedLocation.address} ({selectedLocation.district})
                  </span>
                </div>

                <div className="inspector-source-box">
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedLocation.metricLabel}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      marginTop: 2,
                    }}
                  >
                    {selectedLocation.metricValue}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="inspector-action-primary"
                    style={{ width: "100%" }}
                    onClick={() =>
                      onCalculateRoute(
                        selectedLocation.longitude,
                        selectedLocation.latitude,
                        selectedLocation.name
                      )
                    }
                    disabled={calculatingRoute}
                  >
                    <span>🧭</span>
                    <span>
                      {calculatingRoute
                        ? "Đang tính..."
                        : "Chỉ đường từ vị trí của tôi"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* TAB 1: KHÁM PHÁ & POI */}
          {activeTab === "explore" && (
            <>
              {/* Module: Điểm Môi Trường & Quan Trắc */}
              <div className="sidebar-module-card">
                <div className="sidebar-module-header">
                  <div className="sidebar-module-title">
                    <span>🌱</span>
                    <span>Danh mục Môi Trường</span>
                  </div>
                  <span className="sidebar-module-subtitle">
                    {categoryCounts.all} điểm dữ liệu
                  </span>
                </div>

                <div className="category-filter-list">
                  <button
                    type="button"
                    className={`category-filter-item ${
                      selectedCategory === "all" ? "active" : ""
                    }`}
                    style={{
                      background:
                        selectedCategory === "all" ? "#0f172a" : undefined,
                    }}
                    onClick={() => setSelectedCategory("all")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🌐</span>
                      <span>Tất cả danh mục môi trường</span>
                    </div>
                    <span className="category-filter-count">
                      {loadingEco ? "..." : categoryCounts.all}
                    </span>
                  </button>

                  {(Object.keys(CATEGORY_CONFIG) as EcoCategory[]).map(
                    (catKey) => {
                      const cfg = CATEGORY_CONFIG[catKey];
                      const isSelected = selectedCategory === catKey;
                      return (
                        <button
                          key={catKey}
                          type="button"
                          className={`category-filter-item ${
                            isSelected ? "active" : ""
                          }`}
                          style={{
                            background: isSelected ? cfg.color : undefined,
                          }}
                          onClick={() => setSelectedCategory(catKey)}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span>{cfg.icon}</span>
                            <span>{cfg.name}</span>
                          </div>
                          <span className="category-filter-count">
                            {loadingEco ? "..." : categoryCounts[catKey]}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Module: Quán Xá & Tiện Ích Đô Thị */}
              <div className="sidebar-module-card">
                <div className="sidebar-module-header">
                  <div className="sidebar-module-title">
                    <span>☕</span>
                    <span>Quán xá & Điểm dịch vụ</span>
                  </div>
                  <span className="sidebar-module-subtitle">Nguồn OpenStreetMap</span>
                </div>

                {/* Hàng 1: 4 loại địa điểm (Tất cả, Cafe, Ăn uống, Cửa hàng) */}
                <div className="poi-types-grid">
                  {(
                    [
                      { id: "all", label: "Tất cả", icon: "📍" },
                      { id: "cafe", label: "Cafe", icon: "☕" },
                      { id: "restaurant", label: "Ăn uống", icon: "🍜" },
                      { id: "shop", label: "Cửa hàng", icon: "🛍️" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`poi-btn ${poiType === t.id ? "active" : ""}`}
                      onClick={() => {
                        setPoiType(t.id);
                        onLoadNearbyPOIs(t.id);
                      }}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Hàng 2: Nút Tự nạp & Quét quanh đây */}
                <div className="poi-actions-row">
                  <button
                    type="button"
                    className={`poi-action-btn ${autoFetchPOI ? "active" : ""}`}
                    onClick={onToggleAutoFetch}
                    title={
                      autoFetchPOI
                        ? "Đang bật tự nạp POI khi di chuyển"
                        : "Bật tự nạp POI khi di chuyển"
                    }
                  >
                    <span>{autoFetchPOI ? "🟢" : "⚪"}</span>
                    <span>{autoFetchPOI ? "Tự nạp: BẬT" : "Tự nạp: TẮT"}</span>
                  </button>

                  <button
                    type="button"
                    className="poi-action-btn"
                    onClick={() => onLoadNearbyPOIs(poiType)}
                    disabled={loadingPOIs}
                    title="Quét nạp quán quanh tâm bản đồ"
                  >
                    <span>{loadingPOIs ? "⏳" : "⚡"}</span>
                    <span>{loadingPOIs ? "Đang quét..." : "Quét quanh đây"}</span>
                    {poiCount > 0 && (
                      <span className="poi-badge-count">
                        ({poiCount})
                      </span>
                    )}
                  </button>
                </div>

                {/* Hàng 3: Trạng thái tiện ích (Lấp đầy khoảng trắng và hướng dẫn người dùng) */}
                <div className="poi-status-hint">
                  <span style={{ fontSize: 13 }}>ℹ️</span>
                  <span>
                    {poiCount > 0
                      ? `Đang hiển thị ${poiCount} địa điểm quanh tầm nhìn trên bản đồ.`
                      : "Chưa nạp địa điểm nào. Nhấn 'Quét quanh đây' để tìm kiếm quán xá gần bạn."}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: LỚP BẢN ĐỒ & 3D */}
          {activeTab === "basemap" && (
            <>
              {/* Module: Chọn kiểu bản đồ nền */}
              <div className="sidebar-module-card">
                <div className="sidebar-module-header">
                  <div className="sidebar-module-title">
                    <span>🗺️</span>
                    <span>Kiểu bản đồ nền (Basemap)</span>
                  </div>
                  <span className="sidebar-module-subtitle">Google / OSM / Carto</span>
                </div>

                <div className="basemap-grid">
                  {(Object.keys(MAP_STYLES) as StyleKey[]).map((key) => {
                    const item = MAP_STYLES[key];
                    const isActive = activeStyle === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`basemap-card-btn ${isActive ? "active" : ""}`}
                        onClick={() => setActiveStyle(key)}
                      >
                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Module: Chế độ 3D & Ranh Giới Khu Vực */}
              <div className="sidebar-module-card">
                <div className="sidebar-module-header">
                  <div className="sidebar-module-title">
                    <span>🏢</span>
                    <span>Không gian & Ranh giới</span>
                  </div>
                </div>

                <div className="tools-toggle-row">
                  {/* Nút 3D / 2D */}
                  <button
                    type="button"
                    className={`tool-toggle-btn ${is3D ? "active" : ""}`}
                    onClick={onToggle3D}
                  >
                    <span>{is3D ? "🏢 3D Không gian" : "📐 2D Mặt phẳng"}</span>
                  </button>

                  {/* Nút Ranh giới quận huyện */}
                  <button
                    type="button"
                    className={`tool-toggle-btn ${showDistricts ? "active-blue" : ""}`}
                    onClick={() => setShowDistricts(!showDistricts)}
                  >
                    <span>🗺️</span>
                    <span>{showDistricts ? "Ẩn ranh giới" : "Hiện ranh giới"}</span>
                  </button>
                </div>

                {/* Bộ chọn màu sắc tòa nhà 3D (khi đang bật 3D) */}
                {is3D && (
                  <div className="color-3d-picker">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#7e22ce",
                        }}
                      >
                        🎨 Màu sắc tòa nhà 3D:{" "}
                        {BUILDING_COLOR_THEMES[building3DTheme].name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setShowColorThemeSubmenu(!showColorThemeSubmenu)
                        }
                        style={{
                          border: "none",
                          background: "none",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#9333ea",
                          cursor: "pointer",
                        }}
                      >
                        {showColorThemeSubmenu ? "Thu nhỏ ▲" : "Đổi bảng màu ▼"}
                      </button>
                    </div>

                    <div className="color-3d-btn-group">
                      {(
                        Object.keys(
                          BUILDING_COLOR_THEMES
                        ) as BuildingColorTheme[]
                      ).map((themeKey) => {
                        const theme = BUILDING_COLOR_THEMES[themeKey];
                        const isSelected = building3DTheme === themeKey;
                        return (
                          <button
                            key={themeKey}
                            type="button"
                            className={`color-3d-swatch-btn ${
                              isSelected ? "active" : ""
                            }`}
                            onClick={() => setBuilding3DTheme(themeKey)}
                            title={theme.desc}
                          >
                            <span>{theme.icon}</span>
                            <span>{theme.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 3: NGẬP LỤT & THỦY TRIỀU */}
          {activeTab === "flood" && (
            <>
              {/* Module: Công tắc Cảnh báo Ngập lụt & Triều cường */}
              <div className="sidebar-module-card">
                <div className="sidebar-module-header">
                  <div className="sidebar-module-title">
                    <span>🌊</span>
                    <span>Cảnh Báo Ngập Lụt Đô Thị</span>
                  </div>
                  <span className="sidebar-module-subtitle">Tích hợp 3 nguồn</span>
                </div>

                <div className="flood-toggles-row">
                  <button
                    type="button"
                    className={`tool-toggle-btn ${
                      showFloodWatch ? "active-blue" : ""
                    }`}
                    onClick={() => setShowFloodWatch(!showFloodWatch)}
                  >
                    <span>🌊 Lớp điểm ngập</span>
                    <span
                      style={{
                        fontSize: 9.5,
                        background: showFloodWatch ? "#dbeafe" : "#f1f5f9",
                        color: showFloodWatch ? "#1d4ed8" : "#64748b",
                        padding: "1px 5px",
                        borderRadius: 4,
                        fontWeight: 800,
                      }}
                    >
                      {floodData ? `${floodData.total} điểm` : "30 điểm"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`tool-toggle-btn ${
                      simulateFlood ? "active-blue" : ""
                    }`}
                    onClick={() => setSimulateFlood(!simulateFlood)}
                  >
                    <span>
                      {simulateFlood ? "🌊 Triều đỉnh 1.68m" : "🌤️ Triều thực tế"}
                    </span>
                  </button>
                </div>

                {/* Bảng thống kê cấp độ rủi ro & GloFAS */}
                {floodData && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      paddingTop: 8,
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    <div className="flood-risk-stat-grid">
                      <div className="flood-stat-box critical">
                        <div style={{ fontSize: 13, fontWeight: 800 }}>
                          {floodData.summary.criticalCount}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700 }}>
                          Nguy cấp
                        </div>
                      </div>
                      <div className="flood-stat-box warning">
                        <div style={{ fontSize: 13, fontWeight: 800 }}>
                          {floodData.summary.warningCount}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700 }}>
                          Cảnh báo
                        </div>
                      </div>
                      <div className="flood-stat-box watch">
                        <div style={{ fontSize: 13, fontWeight: 800 }}>
                          {floodData.summary.watchCount}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700 }}>
                          Cảnh giác
                        </div>
                      </div>
                      <div className="flood-stat-box safe">
                        <div style={{ fontSize: 13, fontWeight: 800 }}>
                          {floodData.summary.safeCount}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700 }}>
                          An toàn
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: "#475569",
                        background: "#f8fafc",
                        padding: "6px 10px",
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <span>🌧️ Mưa đo được: </span>
                        <strong>{floodData.summary.currentRainfallMm} mm/h</strong>
                      </div>
                      <div>
                        <span>🌊 GloFAS: </span>
                        <strong>{Math.round(floodData.summary.saigonRiverDischargeM3s).toLocaleString()} m³/s</strong>
                      </div>
                    </div>

                    {/* Nút xem danh sách đoạn đường ngập */}
                    {onFocusHotspotList && (
                      <button
                        type="button"
                        onClick={onFocusHotspotList}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#0284c7",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "left",
                          padding: "2px 0",
                        }}
                      >
                        🛣️ {floodData.road_segments?.length || 30} đoạn đường ngập được bôi màu (Nhấp để xem)
                      </button>
                    )}

                    {/* Thử nghiệm kích hoạt kịch bản mưa */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
                        <span>⚡ <strong>Thử nghiệm kích hoạt mưa:</strong></span>
                        {simulatedRainfallMm !== null && (
                          <button
                            type="button"
                            onClick={() => setSimulatedRainfallMm(null)}
                            style={{
                              border: "none",
                              background: "none",
                              color: "#0284c7",
                              cursor: "pointer",
                              fontSize: 10,
                              fontWeight: 600,
                              padding: 0,
                            }}
                          >
                            (Về thời gian thực)
                          </button>
                        )}
                      </div>
                      <div className="flood-scenario-row">
                        <button
                          type="button"
                          className={`flood-scenario-btn ${
                            simulatedRainfallMm === 0 ? "active" : ""
                          }`}
                          onClick={() => setSimulatedRainfallMm(0)}
                        >
                          ☀️ 0mm (Tạnh)
                        </button>
                        <button
                          type="button"
                          className={`flood-scenario-btn ${
                            simulatedRainfallMm === 25 ? "active" : ""
                          }`}
                          onClick={() => setSimulatedRainfallMm(25)}
                        >
                          🌧️ 25mm (Vừa)
                        </button>
                        <button
                          type="button"
                          className={`flood-scenario-btn ${
                            simulatedRainfallMm === 55 ? "active" : ""
                          }`}
                          onClick={() => setSimulatedRainfallMm(55)}
                        >
                          ⛈️ 55mm (Ngập to)
                        </button>
                      </div>
                    </div>

                    {/* Tra cứu rủi ro GloFAS tại vị trí của tôi */}
                    <button
                      type="button"
                      className="glofas-lookup-btn"
                      onClick={onInspectGpsGloFAS}
                      disabled={loadingGpsGloFAS}
                    >
                      <span>🎯</span>
                      <span>
                        {loadingGpsGloFAS
                          ? "Đang tra cứu vệ tinh..."
                          : "Tra cứu rủi ro lũ GloFAS tại vị trí của tôi"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 4: KHÍ TƯỢNG & BẢN ĐỒ NHIỆT */}
          {activeTab === "weather" && (
            <>
              {/* Module: Radar Khí Tượng Động Lực Học */}
              <div className="sidebar-module-card">
                <div className="sidebar-module-header">
                  <div className="sidebar-module-title">
                    <span>🌪️</span>
                    <span>Radar Khí Tượng Toàn Diện</span>
                  </div>
                  <span className="sidebar-brand-badge">LIVE SIMULATION</span>
                </div>

                <p
                  style={{
                    fontSize: 11.5,
                    color: "#64748b",
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  Mô phỏng trường gió động lực học, dải nhiệt vi khí hậu, độ ẩm
                  và hướng di chuyển của các dòng khí quyển thời gian thực.
                </p>

                <button
                  type="button"
                  className="radar-live-hero-btn"
                  onClick={() => onOpenRadar("temp")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🌪️</span>
                    <div style={{ textAlign: "left" }}>
                      <div>Khởi động Radar Khí tượng</div>
                      <div
                        style={{
                          fontSize: 10,
                          opacity: 0.85,
                          fontWeight: 500,
                        }}
                      >
                        Trực quan hóa luồng gió & nhiệt vi khí hậu
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 13 }}>➔</span>
                </button>
              </div>

              {/* Module: Lớp Bản Đồ Nhiệt Môi Trường */}
              <div className="sidebar-module-card">
                <div className="sidebar-module-header">
                  <div className="sidebar-module-title">
                    <span>🔥</span>
                    <span>Bản Đồ Nhiệt (Heatmap)</span>
                  </div>
                </div>

                <div className="heatmap-selector-grid">
                  <button
                    type="button"
                    className={`heatmap-mode-btn ${
                      activeHeatmap === "none" ? "active" : ""
                    }`}
                    onClick={() => setActiveHeatmap("none")}
                  >
                    <span>⏹️</span>
                    <span>Tắt bản đồ nhiệt</span>
                  </button>

                  <button
                    type="button"
                    className={`heatmap-mode-btn ${
                      activeHeatmap === "temperature" ? "active" : ""
                    }`}
                    onClick={() => setActiveHeatmap("temperature")}
                  >
                    <span>🌡️</span>
                    <span>Nhiệt độ (°C)</span>
                  </button>

                  <button
                    type="button"
                    className={`heatmap-mode-btn ${
                      activeHeatmap === "aqi" ? "active" : ""
                    }`}
                    onClick={() => setActiveHeatmap("aqi")}
                  >
                    <span>💨</span>
                    <span>Không khí (AQI)</span>
                  </button>

                  <button
                    type="button"
                    className={`heatmap-mode-btn ${
                      activeHeatmap === "risk" ? "active" : ""
                    }`}
                    onClick={() => setActiveHeatmap("risk")}
                  >
                    <span>🚨</span>
                    <span>Điểm nóng rủi ro</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* TAB 5: TOUR DANH LAM THẮNG CẢNH */}
          {activeTab === "tour" && (
            <div className="sidebar-module-card">
              <div className="sidebar-module-header">
                <div className="sidebar-module-title">
                  <span>🧭</span>
                  <span>Tour Địa Danh Việt Nam</span>
                </div>
                <span className="sidebar-module-subtitle">9 điểm tiêu biểu</span>
              </div>

              <div className="landmarks-grid">
                {landmarks.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    className="landmark-item-btn"
                    onClick={() => onSelectLandmark(loc)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 14 }}>{loc.icon || "📍"}</span>
                      <span>{loc.name}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>➔</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. Footer Thông Tin Trực Tiếp */}
        <div className="sidebar-footer">
          <div className="sidebar-live-pill">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#10b981",
              }}
            />
            <span>{liveWeather ? liveWeather.temp : "28°C"}</span>
            <span style={{ color: "#cbd5e1" }}>•</span>
            <span
              style={{
                color:
                  liveWeather && liveWeather.aqi > 100 ? "#ea580c" : "#059669",
              }}
            >
              AQI {liveWeather ? liveWeather.aqi : 42} (
              {liveWeather ? liveWeather.aqiStatus : "Tốt"})
            </span>
          </div>

          <span style={{ fontSize: 10, color: "#94a3b8" }}>
            Hệ số an toàn: Cao
          </span>
        </div>
      </aside>
    </>
  );
}
