import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoProvinceItem } from "./types";

interface VietnamGeoMapCardProps {
  provinces: GeoProvinceItem[];
  selectedProvince?: string;
  onSelectProvince?: (slug: string) => void;
  height?: number | string;
}

// 1. Esri World Dark Gray Canvas: 100% Free, crisp, no API key required, zero watermarks
const ESRI_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-dark-base": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "© Esri, HERE, Garmin, OpenStreetMap",
      maxzoom: 16,
    },
    "esri-dark-labels": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    {
      id: "esri-dark-base-layer",
      type: "raster",
      source: "esri-dark-base",
      minzoom: 0,
      maxzoom: 16,
    },
    {
      id: "esri-dark-labels-layer",
      type: "raster",
      source: "esri-dark-labels",
      minzoom: 0,
      maxzoom: 16,
      paint: {
        "raster-opacity": 0.85,
      },
    },
  ],
};

// 2. Google Hybrid Satellite: Clean raster tiles for visual satellite inspection
const GOOGLE_HYBRID_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "google-hybrid-tiles": {
      type: "raster",
      tiles: [
        "https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        "https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        "https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      ],
      tileSize: 256,
      attribution: "© Google Maps Hybrid",
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: "google-hybrid-layer",
      type: "raster",
      source: "google-hybrid-tiles",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export const VietnamGeoMapCard: React.FC<VietnamGeoMapCardProps> = ({
  provinces,
  selectedProvince,
  onSelectProvince,
  height = 420,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [activeMetric, setActiveMetric] = useState<"aqi" | "pm2_5">("aqi");
  const [basemapMode, setBasemapMode] = useState<"dark" | "satellite">("dark");
  const [hoveredProvince, setHoveredProvince] = useState<GeoProvinceItem | null>(null);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: ESRI_DARK_STYLE,
      center: [108.0, 16.0], // Center of Vietnam
      zoom: 5.1,
      minZoom: 4.5,
      maxZoom: 14,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleSwitchBasemap = (mode: "dark" | "satellite") => {
    setBasemapMode(mode);
    if (mapRef.current) {
      mapRef.current.setStyle(mode === "dark" ? ESRI_DARK_STYLE : GOOGLE_HYBRID_STYLE);
    }
  };


  // Sync Markers when provinces, metric, or selection change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    provinces.forEach((prov) => {
      if (prov.lat == null || prov.lon == null) return;

      const isSelected = selectedProvince === prov.slug;
      const displayVal = activeMetric === "aqi" ? Math.round(prov.aqi) : prov.pm2_5.toFixed(1);
      const color = prov.meta.color || "#38bdf8";

      // Create Outer Wrapper for MapLibre positioning (NEVER touch container.style.transform!)
      const container = document.createElement("div");
      container.className = "geo-marker-wrapper";
      container.style.cssText = `
        cursor: pointer;
        user-select: none;
        z-index: ${isSelected ? "25" : "5"};
      `;

      // Create Inner macOS Squircle Pill for scaling & effects
      const innerPill = document.createElement("div");
      innerPill.className = `geo-aqi-pill ${isSelected ? "selected" : ""}`;
      innerPill.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        background: rgba(28, 28, 30, 0.92);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid ${isSelected ? "#ffffff" : color};
        border-radius: 9999px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 10px ${color}55;
        transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 160ms ease, border-color 160ms ease;
        transform: ${isSelected ? "scale(1.15)" : "scale(1)"};
      `;

      innerPill.innerHTML = `
        <span style="
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 6px ${color};
          flex-shrink: 0;
        "></span>
        <span style="
          font-size: 11px;
          font-weight: 700;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
          line-height: 1;
        ">${displayVal}</span>
      `;

      container.appendChild(innerPill);

      container.addEventListener("mouseenter", () => {
        innerPill.style.transform = "scale(1.25)";
        innerPill.style.boxShadow = `0 4px 14px rgba(0, 0, 0, 0.6), 0 0 14px ${color}`;
        container.style.zIndex = "50";
        setHoveredProvince(prov);
      });

      container.addEventListener("mouseleave", () => {
        innerPill.style.transform = isSelected ? "scale(1.15)" : "scale(1)";
        innerPill.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.5), 0 0 10px ${color}55`;
        container.style.zIndex = isSelected ? "25" : "5";
        setHoveredProvince(null);
      });

      container.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onSelectProvince) {
          onSelectProvince(prov.slug);
        }
      });

      const marker = new maplibregl.Marker({ element: container })
        .setLngLat([prov.lon, prov.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [provinces, activeMetric, selectedProvince, onSelectProvince]);

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [108.0, 16.0],
        zoom: 5.1,
        speed: 1.2,
      });
    }
  };

  // Fly to selected province
  useEffect(() => {
    if (!selectedProvince || !mapRef.current) return;
    const target = provinces.find((p) => p.slug === selectedProvince);
    if (target && target.lat != null && target.lon != null) {
      mapRef.current.flyTo({
        center: [target.lon, target.lat],
        zoom: 6.8,
        speed: 1.2,
      });
    }
  }, [selectedProvince, provinces]);


  return (
    <div
      style={{
        position: "relative",
        borderRadius: "16px",
        overflow: "hidden",
        border: "0.5px solid rgba(255, 255, 255, 0.12)",
        background: "rgba(28, 28, 30, 0.75)",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
        height,
      }}
    >
      {/* MapLibre DOM */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Floating Header Overlay: Title & Metric Switcher */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          left: "14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 10,
        }}
      >
        {/* Title Badge & Reset View Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              background: "rgba(28, 28, 30, 0.85)",
              backdropFilter: "saturate(180%) blur(16px)",
              WebkitBackdropFilter: "saturate(180%) blur(16px)",
              borderRadius: "10px",
              border: "0.5px solid rgba(255, 255, 255, 0.15)",
              color: "#f8fafc",
              fontSize: "12px",
              fontWeight: 700,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
            }}
          >
            <span>🗺️</span>
            <span>Bản Đồ Phân Bổ 34 Tỉnh Thành</span>
            <span
              style={{
                padding: "1px 6px",
                borderRadius: "4px",
                background: "rgba(10, 132, 255, 0.2)",
                color: "#0a84ff",
                fontSize: "10px",
              }}
            >
              {provinces.length} trạm
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetView}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 10px",
              background: "rgba(28, 28, 30, 0.85)",
              backdropFilter: "saturate(180%) blur(16px)",
              WebkitBackdropFilter: "saturate(180%) blur(16px)",
              borderRadius: "10px",
              border: "0.5px solid rgba(255, 255, 255, 0.15)",
              color: "#38bdf8",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
              transition: "all 150ms ease",
            }}
            title="Đưa góc nhìn về toàn cảnh Việt Nam"
          >
            <span>🇻🇳</span>
            <span>Toàn Cảnh</span>
          </button>
        </div>

        {/* Metric Segmented Control & Basemap Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Basemap Switcher */}
          <div
            style={{
              display: "flex",
              background: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(12px)",
              borderRadius: "8px",
              padding: "2px",
              border: "0.5px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              type="button"
              onClick={() => handleSwitchBasemap("dark")}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: basemapMode === "dark" ? "rgba(255, 255, 255, 0.2)" : "transparent",
                color: basemapMode === "dark" ? "#ffffff" : "#a1a1a6",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
              title="Bản đồ nền tối Esri Dark Canvas (Không watermark)"
            >
              🌙 Tối
            </button>
            <button
              type="button"
              onClick={() => handleSwitchBasemap("satellite")}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: basemapMode === "satellite" ? "rgba(255, 255, 255, 0.2)" : "transparent",
                color: basemapMode === "satellite" ? "#ffffff" : "#a1a1a6",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
              title="Bản đồ Google Vệ Tinh"
            >
              🛰️ Vệ Tinh
            </button>
          </div>

          {/* Metric Segmented Control */}
          <div
            style={{
              display: "flex",
              background: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(12px)",
              borderRadius: "8px",
              padding: "2px",
              border: "0.5px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveMetric("aqi")}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                background: activeMetric === "aqi" ? "#0a84ff" : "transparent",
                color: activeMetric === "aqi" ? "#ffffff" : "#a1a1a6",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              Chỉ số AQI
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric("pm2_5")}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                background: activeMetric === "pm2_5" ? "#0a84ff" : "transparent",
                color: activeMetric === "pm2_5" ? "#ffffff" : "#a1a1a6",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              Bụi PM2.5
            </button>
          </div>
        </div>
      </div>

      {/* Hover Information HUD */}
      {hoveredProvince && (
        <div
          style={{
            position: "absolute",
            bottom: "14px",
            left: "14px",
            zIndex: 10,
            padding: "8px 12px",
            background: "rgba(28, 28, 30, 0.92)",
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
            borderRadius: "10px",
            border: `0.5px solid ${hoveredProvince.meta.color}60`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#f8fafc" }}>
              {hoveredProvince.name}
            </div>
            <div style={{ fontSize: "10px", color: "#a1a1a6" }}>
              {hoveredProvince.region}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: hoveredProvince.meta.color,
              }}
            >
              {Math.round(hoveredProvince.aqi)} AQI
            </span>
            <span
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: `${hoveredProvince.meta.color}25`,
                color: hoveredProvince.meta.color,
                fontWeight: 600,
              }}
            >
              {hoveredProvince.meta.label}
            </span>
          </div>

          <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
            PM2.5: <strong>{hoveredProvince.pm2_5} µg/m³</strong>
          </div>
        </div>
      )}

      {/* Legend strip on bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: "14px",
          right: "14px",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "5px 10px",
          background: "rgba(28, 28, 30, 0.85)",
          backdropFilter: "blur(12px)",
          borderRadius: "8px",
          border: "0.5px solid rgba(255, 255, 255, 0.1)",
          fontSize: "10px",
          color: "#a1a1a6",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} /> Tốt
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#eab308" }} /> Vừa phải
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316" }} /> Nhạy cảm
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} /> Xấu
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7" }} /> Rất xấu
        </span>
      </div>
    </div>
  );
};

export default VietnamGeoMapCard;
