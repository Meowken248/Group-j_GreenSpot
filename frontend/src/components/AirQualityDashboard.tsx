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

  return (
    <div
      style={{
        height: "100vh",
        overflowY: "auto",
        background: "linear-gradient(180deg, #0b1120 0%, #0f172a 100%)",
        color: "#f8fafc",
        padding: "24px",
        paddingTop: "75px",
        paddingBottom: "50px",
        boxSizing: "border-box",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* HEADER BAR */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "16px",
          }}
        >
          {/* TITLE & LIVE BADGE */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {onBackToMap && (
              <button
                type="button"
                onClick={onBackToMap}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>←</span>
                <span>Về Bản Đồ WebGIS</span>
              </button>
            )}

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                  HỆ THỐNG QUAN TRẮC CHẤT LƯỢNG KHÔNG KHÍ & KHÍ TƯỢNG VIỆT NAM
                </h1>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    color: "#4ade80",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#22c55e",
                      boxShadow: "0 0 8px #22c55e",
                    }}
                  />
                  LIVE RUNTIME
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                Tích hợp 7.1 triệu bản ghi Parquet & Luồng đồng bộ thời gian thực Open-Meteo
              </div>
            </div>
          </div>

          {/* REFRESH & TIMESTAMP */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Cập nhật: {lastRefreshed}</span>
            <button
              type="button"
              onClick={handleRefreshAll}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                background: "rgba(56, 189, 248, 0.1)",
                color: "#38bdf8",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🔄</span>
              <span>Làm Mới</span>
            </button>
          </div>
        </div>

        {/* SUBHEADER: FILTERS TOOLBAR */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "14px",
            background: "rgba(30, 41, 59, 0.4)",
            padding: "12px 18px",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          {/* SCOPE & PROVINCE PICKER */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>Phạm vi:</span>
            <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", borderRadius: "8px", padding: "2px" }}>
              <button
                type="button"
                onClick={() => setScopeMode("nation")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: scopeMode === "nation" ? "#38bdf8" : "transparent",
                  color: scopeMode === "nation" ? "#0f172a" : "#cbd5e1",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Toàn Quốc
              </button>
              <button
                type="button"
                onClick={() => setScopeMode("province")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: scopeMode === "province" ? "#38bdf8" : "transparent",
                  color: scopeMode === "province" ? "#0f172a" : "#cbd5e1",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Theo Tỉnh Thành
              </button>
            </div>

            {/* Province Select */}
            {scopeMode === "province" && (
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(15, 23, 42, 0.9)",
                  color: "#f8fafc",
                  fontSize: "12px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {provinces.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} ({p.macro_region})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* TIMEFRAME SELECTOR */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>Thời gian:</span>
            <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", borderRadius: "8px", padding: "2px" }}>
              {timeOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTimeRange(opt.key)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: timeRange === opt.key ? "#38bdf8" : "transparent",
                    color: timeRange === opt.key ? "#0f172a" : "#cbd5e1",
                    fontSize: "12px",
                    fontWeight: timeRange === opt.key ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "2px",
            overflowX: "auto",
          }}
        >
          {[
            { key: "overview", label: "📊 Tổng Quan", desc: "Chỉ số KPI & Xếp hạng" },
            { key: "pollutants", label: "📈 AQI & Bụi Mịn", desc: "Chuỗi thời gian & Tương quan chất" },
            { key: "weather", label: "🌦️ Khí Tượng", desc: "Nhiệt độ, ẩm & lượng mưa" },
            { key: "interaction", label: "🌪️ Tương Tác Khí Hậu", desc: "Đường cong làm sạch của gió/mưa" },
            { key: "table", label: "📋 Bảng Dữ Liệu 34 Tỉnh", desc: "Tìm kiếm & Tra cứu chi tiết" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabType)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px 10px 0 0",
                  border: "none",
                  borderBottom: isActive ? "3px solid #38bdf8" : "3px solid transparent",
                  background: isActive ? "rgba(30, 41, 59, 0.6)" : "transparent",
                  color: isActive ? "#38bdf8" : "#94a3b8",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "2px",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                <span style={{ fontSize: "10px", color: isActive ? "#7dd3fc" : "#64748b", fontWeight: 400 }}>
                  {tab.desc}
                </span>
              </button>
            );
          })}
        </div>

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
