import React, { useState, useEffect, useCallback } from "react";
import api from "../api/client";
import type {
  Province,
  OverviewData,
  TrendData,
  PollutantDetailsData,
  WeatherData,
  InteractionData,
  ProvinceTableRow,
} from "./dashboard/types";

import OverviewTab from "./dashboard/OverviewTab";
import PollutantsTab from "./dashboard/PollutantsTab";
import WeatherTab from "./dashboard/WeatherTab";
import InteractionTab from "./dashboard/InteractionTab";
import DataTableTab from "./dashboard/DataTableTab";
import "./dashboard/dashboard.css";

interface AirQualityDashboardProps {
  onBackToMap?: () => void;
}

type TabType = "overview" | "pollutants" | "weather" | "interaction" | "table";

export const AirQualityDashboard: React.FC<AirQualityDashboardProps> = ({ onBackToMap }) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Filter States
  const [scopeMode, setScopeMode] = useState<"nation" | "province">("nation");
  const [selectedProvince, setSelectedProvince] = useState<string>("ho_chi_minh");
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [selectedPollutant, setSelectedPollutant] = useState<string>("pm2_5");

  // Metadata
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString("vi-VN"));

  // Data States
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [pollutantData, setPollutantData] = useState<PollutantDetailsData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [interactionData, setInteractionData] = useState<InteractionData | null>(null);
  const [tableData, setTableData] = useState<ProvinceTableRow[]>([]);

  // Loading States
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingInteraction, setLoadingInteraction] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);

  // 1. Fetch Provinces list once
  useEffect(() => {
    api
      .get<Province[]>("/api/v1/air-quality/provinces")
      .then((res) => {
        setProvinces(res.data);
      })
      .catch((err) => console.error("Error fetching provinces:", err));
  }, []);

  // 2. Fetch Overview Data
  const fetchOverview = useCallback(() => {
    setLoadingOverview(true);
    const slugParam = scopeMode === "province" ? selectedProvince : "";
    api
      .get<OverviewData>("/api/v1/air-quality/overview", {
        params: { province_slug: slugParam, time_range: timeRange },
      })
      .then((res) => setOverviewData(res.data))
      .catch((err) => console.error("Error overview:", err))
      .finally(() => setLoadingOverview(false));
  }, [scopeMode, selectedProvince, timeRange]);

  // 3. Fetch Trend Data & Pollutants Data
  const fetchTrend = useCallback(() => {
    setLoadingTrend(true);
    const targetSlug = scopeMode === "province" ? selectedProvince : "ho_chi_minh";
    Promise.all([
      api.get<TrendData>(`/api/v1/air-quality/provinces/${targetSlug}/trend`, {
        params: { time_range: timeRange },
      }),
      api.get<PollutantDetailsData>(`/api/v1/air-quality/provinces/${targetSlug}/pollutants`, {
        params: { time_range: timeRange, selected_pollutant: selectedPollutant },
      }),
    ])
      .then(([trendRes, pollRes]) => {
        setTrendData(trendRes.data);
        setPollutantData(pollRes.data);
      })
      .catch((err) => console.error("Error trend:", err))
      .finally(() => setLoadingTrend(false));
  }, [scopeMode, selectedProvince, timeRange, selectedPollutant]);

  // 4. Fetch Weather Data
  const fetchWeather = useCallback(() => {
    setLoadingWeather(true);
    const slugParam = scopeMode === "province" ? selectedProvince : "";
    api
      .get<WeatherData>("/api/v1/air-quality/weather", {
        params: { province_slug: slugParam },
      })
      .then((res) => setWeatherData(res.data))
      .catch((err) => console.error("Error weather:", err))
      .finally(() => setLoadingWeather(false));
  }, [scopeMode, selectedProvince]);

  // 5. Fetch Interaction Data
  const fetchInteraction = useCallback(() => {
    setLoadingInteraction(true);
    const slugParam = scopeMode === "province" ? selectedProvince : "";
    api
      .get<InteractionData>("/api/v1/air-quality/interaction", {
        params: { province_slug: slugParam },
      })
      .then((res) => setInteractionData(res.data))
      .catch((err) => console.error("Error interaction:", err))
      .finally(() => setLoadingInteraction(false));
  }, [scopeMode, selectedProvince]);

  // 6. Fetch Table Data
  const fetchTable = useCallback(() => {
    setLoadingTable(true);
    api
      .get<ProvinceTableRow[]>("/api/v1/air-quality/table")
      .then((res) => setTableData(res.data))
      .catch((err) => console.error("Error table:", err))
      .finally(() => setLoadingTable(false));
  }, []);

  // Trigger relevant fetch when tab or filters change
  useEffect(() => {
    if (activeTab === "overview") fetchOverview();
    else if (activeTab === "pollutants") fetchTrend();
    else if (activeTab === "weather") fetchWeather();
    else if (activeTab === "interaction") fetchInteraction();
    else if (activeTab === "table") fetchTable();
  }, [activeTab, fetchOverview, fetchTrend, fetchWeather, fetchInteraction, fetchTable]);

  const handleRefreshAll = () => {
    setLastRefreshed(new Date().toLocaleTimeString("vi-VN"));
    fetchOverview();
    fetchTrend();
    fetchWeather();
    fetchInteraction();
    fetchTable();
  };

  // Keyboard Shortcuts: Esc to return to map, Cmd+R to refresh, Cmd+1..5 to switch tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBackToMap?.();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        handleRefreshAll();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault();
        setActiveTab("overview");
      } else if ((e.metaKey || e.ctrlKey) && e.key === "2") {
        e.preventDefault();
        setActiveTab("pollutants");
      } else if ((e.metaKey || e.ctrlKey) && e.key === "3") {
        e.preventDefault();
        setActiveTab("weather");
      } else if ((e.metaKey || e.ctrlKey) && e.key === "4") {
        e.preventDefault();
        setActiveTab("interaction");
      } else if ((e.metaKey || e.ctrlKey) && e.key === "5") {
        e.preventDefault();
        setActiveTab("table");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBackToMap, handleRefreshAll]);

  const handleSelectProvinceFromAnywhere = (slug: string) => {
    setScopeMode("province");
    setSelectedProvince(slug);
    setActiveTab("overview");
  };

  const timeOptions = [
    { key: "24h", label: "24 Giờ" },
    { key: "7d", label: "7 Ngày" },
    { key: "30d", label: "30 Ngày" },
    { key: "2025", label: "Năm 2025" },
  ];

  const tabsConfig = [
    { key: "overview", label: "Tổng Quan AQI", desc: "KPI & Bản đồ 34 Tỉnh", icon: "📊", kbd: "⌘1" },
    { key: "pollutants", label: "Bụi Mịn & Khí Độc", desc: "6 Chất & Giờ cao điểm", icon: "📈", kbd: "⌘2" },
    { key: "weather", label: "Khí Tượng Học", desc: "Nhiệt, ẩm & vi khí hậu", icon: "🌦️", kbd: "⌘3" },
    { key: "interaction", label: "Tương Tác Khí Hậu", desc: "Làm sạch gió & mưa", icon: "🌪️", kbd: "⌘4" },
    { key: "table", label: "Bảng Tra Cứu 34 Tỉnh", desc: "Tìm kiếm & lọc số liệu", icon: "📋", kbd: "⌘5" },
  ];

  return (
    <div className="macos-dashboard-root">
      <div className="macos-dashboard-content">
        {/* =========================================================================
            1. UNIFIED macOS TITLEBAR (Window Header, Traffic Lights & Live Status)
            ========================================================================= */}
        <header className="macos-titlebar-container">
          <div className="macos-titlebar-left">
            {/* macOS Traffic Lights */}
            <div className="macos-traffic-lights" title="Điều khiển cửa sổ">
              <button
                type="button"
                className="macos-traffic-light close"
                onClick={onBackToMap}
                title="Đóng bảng phân tích (Về WebGIS) - Phím Esc"
              >
                <span className="macos-traffic-light-glyph">✕</span>
              </button>
              <button
                type="button"
                className="macos-traffic-light minimize"
                onClick={() => window.scrollTo({ top: 320, behavior: "smooth" })}
                title="Cuộn nhanh xuống dữ liệu"
              >
                <span className="macos-traffic-light-glyph">−</span>
              </button>
              <button
                type="button"
                className="macos-traffic-light zoom"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                }}
                title="Bật/Tắt toàn màn hình"
              >
                <span className="macos-traffic-light-glyph">+</span>
              </button>
            </div>

            {onBackToMap && (
              <button
                type="button"
                className="macos-titlebar-back-btn"
                onClick={onBackToMap}
                title="Quay lại Bản đồ không gian xanh & Ngập lụt (Esc)"
              >
                <span>←</span>
                <span>Bản Đồ WebGIS</span>
                <kbd className="macos-kbd">Esc</kbd>
              </button>
            )}
          </div>

          {/* Title & Live Runtime Badge */}
          <div className="macos-titlebar-center">
            <span className="macos-titlebar-title">
              HỆ THỐNG QUAN TRẮC CHẤT LƯỢNG KHÔNG KHÍ & KHÍ TƯỢNG
            </span>
            <span className="macos-live-badge">
              <span className="macos-live-dot" />
              LIVE RUNTIME
            </span>
          </div>

          {/* Right Action: Timestamp & Refresh */}
          <div className="macos-titlebar-right">
            <span className="macos-last-refresh-text">Cập nhật: {lastRefreshed}</span>
            <button
              type="button"
              className="macos-titlebar-refresh-btn"
              onClick={handleRefreshAll}
              title="Cập nhật lại toàn bộ các luồng quan trắc (⌘R)"
            >
              <span>🔄</span>
              <span>Làm Mới</span>
              <kbd className="macos-kbd">⌘R</kbd>
            </button>
          </div>
        </header>

        {/* =========================================================================
            2. FILTER TOOLBAR (macOS Inset Trench & Segmented Control)
            ========================================================================= */}
        <section className="macos-filter-toolbar">
          {/* Scope Selection (Nation vs Province) */}
          <div className="macos-filter-group">
            <span className="macos-filter-label">Phạm vi quan sát:</span>
            <div className="macos-segmented-trench">
              <button
                type="button"
                className={`macos-segmented-btn ${scopeMode === "nation" ? "active" : ""}`}
                onClick={() => setScopeMode("nation")}
              >
                🇻🇳 Toàn Quốc (34 Tỉnh)
              </button>
              <button
                type="button"
                className={`macos-segmented-btn ${scopeMode === "province" ? "active" : ""}`}
                onClick={() => setScopeMode("province")}
              >
                📍 Theo Tỉnh Thành
              </button>
            </div>

            {scopeMode === "province" && (
              <select
                className="macos-select-dropdown"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                aria-label="Chọn tỉnh thành theo dõi"
              >
                {provinces.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} ({p.macro_region})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Timeframe Selection */}
          <div className="macos-filter-group">
            <span className="macos-filter-label">Chu kỳ phân tích:</span>
            <div className="macos-segmented-trench">
              {timeOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`macos-segmented-btn ${timeRange === opt.key ? "active" : ""}`}
                  onClick={() => setTimeRange(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. TABS NAVIGATION STRIP (macOS Glass Trench with Keyboard Shortcuts)
            ========================================================================= */}
        <nav className="macos-tabs-strip" aria-label="Các mô-đun quan trắc">
          {tabsConfig.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`macos-tab-item-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key as TabType)}
                title={`${tab.label} (${tab.kbd})`}
              >
                <div className="macos-tab-item-title">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <kbd className="macos-kbd">{tab.kbd}</kbd>
                </div>
                <span className="macos-tab-item-subtitle">{tab.desc}</span>
              </button>
            );
          })}
        </nav>


        {/* TAB CONTENTS */}
        <div style={{ marginTop: "8px" }}>
          {activeTab === "overview" && (
            <OverviewTab
              data={overviewData}
              loading={loadingOverview}
              onSelectProvince={handleSelectProvinceFromAnywhere}
            />
          )}

          {activeTab === "pollutants" && (
            <PollutantsTab
              trendData={trendData}
              pollutantData={pollutantData}
              selectedPollutant={selectedPollutant}
              onSelectPollutant={setSelectedPollutant}
              loading={loadingTrend}
            />
          )}

          {activeTab === "weather" && (
            <WeatherTab data={weatherData} loading={loadingWeather} />
          )}

          {activeTab === "interaction" && (
            <InteractionTab
              data={interactionData}
              loading={loadingInteraction}
              onSelectProvince={handleSelectProvinceFromAnywhere}
            />
          )}

          {activeTab === "table" && (
            <DataTableTab
              rows={tableData}
              loading={loadingTable}
              onSelectProvince={handleSelectProvinceFromAnywhere}
            />
          )}
        </div>
      </div>
    </div>
  );
};
export default AirQualityDashboard;
