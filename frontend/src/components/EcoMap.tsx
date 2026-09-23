import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Map, { NavigationControl, FullscreenControl, Marker, Popup, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import type { HCMLocation } from "../data/hcmLocations";
import {
  CATEGORY_CONFIG,
  type EcoLocation,
  type EcoCategory,
} from "../data/hcmEcoLocations";
import {
  searchLivePlacesAPI,
  fetchNearbyPOIsAPI,
  type LivePOI,
} from "../services/poiService";
import {
  reverseGeocodeOSM,
  getRouteOSRM,
  type ReverseGeocodeResult,
  type RouteResult,
} from "../services/osmAdvancedService";
import {
  fetchEcoLocationsAPI,
  fetchDistrictBoundariesAPI,
  fetchLandmarksAPI,
  fetchLiveWeatherAPI,
  fetchWeatherHeatmapAPI,
  reportFloodAPI,
  type LiveWeatherResponse,
} from "../services/ecoApiService";
import {
  fetchFloodHotspotsAPI,
  fetchGloFASForecastAPI,
  type FloodHotspotProperties,
  type FloodGeoJSONResponse,
  type GloFASForecastResponse,
  type FloodRoadSegmentProperties,
} from "../services/floodService";
import {
  useFastGeolocation,
  DEFAULT_FALLBACK_LOCATION,
  calculateDistanceMeters,
} from "../hooks/useFastGeolocation";
import LiveWeatherRadarMap, { type WeatherOverlay } from "./LiveWeatherRadarMap";

// Cấu hình danh mục dự phòng an toàn (tránh lỗi undefined khi chưa kịp đồng bộ)
export const DEFAULT_CATEGORY_CFG = {
  name: "Địa điểm môi trường",
  icon: "📍",
  color: "#0284c7",
  bgColor: "rgba(2, 132, 199, 0.12)",
  borderColor: "#38bdf8",
};

export const getCategoryConfig = (category?: string) => {
  if (!category) return DEFAULT_CATEGORY_CFG;
  return (CATEGORY_CONFIG as any)[category] || DEFAULT_CATEGORY_CFG;
};

// Bộ sưu tập bản đồ nền Google Tile Cluster & OpenStreetMap phong phú
export const MAP_STYLES = {
  googleRoadmap: {
    id: "googleRoadmap",
    name: "Google Maps",
    icon: "🗺️",
    sourceName: null,
    isGoogle: true,
    url: {
      version: 8,
      sources: {
        "google-roadmap-tiles": {
          type: "raster",
          tiles: [
            "https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
            "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
            "https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
            "https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
          ],
          tileSize: 256,
          attribution: "© Google Maps (Tile Cluster)",
          maxzoom: 22,
        },
      },
      layers: [
        {
          id: "google-roadmap-layer",
          type: "raster",
          source: "google-roadmap-tiles",
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    },
  },
  googleHybrid: {
    id: "googleHybrid",
    name: "Google Vệ tinh",
    icon: "🛰️",
    sourceName: null,
    isGoogle: true,
    url: {
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
          attribution: "© Google Maps Hybrid (Tile Cluster)",
          maxzoom: 22,
        },
      },
      layers: [
        {
          id: "google-hybrid-layer",
          type: "raster",
          source: "google-hybrid-tiles",
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    },
  },
  googleTraffic: {
    id: "googleTraffic",
    name: "Giao thông",
    icon: "🚦",
    sourceName: null,
    isGoogle: true,
    url: {
      version: 8,
      sources: {
        "google-traffic-tiles": {
          type: "raster",
          tiles: [
            "https://mt0.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}",
            "https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}",
            "https://mt2.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}",
            "https://mt3.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}",
          ],
          tileSize: 256,
          attribution: "© Google Maps Traffic (Tile Cluster)",
          maxzoom: 22,
        },
      },
      layers: [
        {
          id: "google-traffic-layer",
          type: "raster",
          source: "google-traffic-tiles",
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    },
  },
  voyager: {
    id: "voyager",
    name: "Sinh động",
    icon: "🎨",
    sourceName: "carto",
    isGoogle: false,
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
  osmDetailed: {
    id: "osmDetailed",
    name: "Số nhà (OSM)",
    icon: "🏘️",
    sourceName: null,
    isGoogle: false,
    url: {
      version: 8,
      sources: {
        "osm-standard": {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [
        {
          id: "osm-standard-layer",
          type: "raster",
          source: "osm-standard",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  opentopo: {
    id: "opentopo",
    name: "Địa hình",
    icon: "⛰️",
    sourceName: null,
    isGoogle: false,
    url: {
      version: 8,
      sources: {
        "opentopo-tiles": {
          type: "raster",
          tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenTopoMap • Bản đồ địa hình chống ngập",
        },
      },
      layers: [
        {
          id: "opentopo-layer",
          type: "raster",
          source: "opentopo-tiles",
          minzoom: 0,
          maxzoom: 17,
        },
      ],
    },
  },
  dark: {
    id: "dark",
    name: "Ban đêm",
    icon: "🌙",
    sourceName: "carto",
    isGoogle: false,
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
};

export type BuildingColorTheme = "rainbow" | "eco" | "sunset" | "cyber" | "crystal";

export const BUILDING_COLOR_THEMES: Record<
  BuildingColorTheme,
  {
    name: string;
    icon: string;
    desc: string;
    colors: string[];
    expression: any;
  }
> = {
  rainbow: {
    name: "Cầu vồng đô thị",
    icon: "🌈",
    desc: "Đa sắc rực rỡ theo độ cao tầng",
    colors: ["#34d399", "#38bdf8", "#6366f1", "#a855f7", "#ec4899", "#f97316", "#ef4444"],
    expression: [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "render_height"], 16],
      0, "#34d399",    // 0-10m: Ngọc bích / Mint
      12, "#38bdf8",   // 12-20m: Xanh Cyan
      25, "#6366f1",   // 25-35m: Indigo hiện đại
      45, "#a855f7",   // 45-60m: Tím thạch anh
      70, "#ec4899",   // 70-90m: Hồng Magenta
      100, "#f97316",  // 100-130m: Cam san hô
      150, "#ef4444",  // 150m+: Đỏ cờ rực rỡ
    ],
  },
  eco: {
    name: "Xanh sinh thái Eco",
    icon: "🌿",
    desc: "Ngọc lục bảo & Cyan GreenSpot",
    colors: ["#a7f3d0", "#34d399", "#10b981", "#06b6d4", "#0284c7"],
    expression: [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "render_height"], 16],
      0, "#a7f3d0",
      15, "#34d399",
      35, "#10b981",
      65, "#06b6d4",
      110, "#0284c7",
    ],
  },
  sunset: {
    name: "Hoàng hôn rực rỡ",
    icon: "🌆",
    desc: "Vàng hổ phách, cam & tím hoàng hôn",
    colors: ["#fde68a", "#fbbf24", "#f97316", "#e11d48", "#9333ea"],
    expression: [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "render_height"], 16],
      0, "#fde68a",
      15, "#fbbf24",
      35, "#f97316",
      65, "#e11d48",
      110, "#9333ea",
    ],
  },
  cyber: {
    name: "Neon Cyberpunk",
    icon: "⚡",
    desc: "Đèn neon phát quang tương lai",
    colors: ["#00f0ff", "#7000ff", "#ff007f", "#ffe600", "#ff003c"],
    expression: [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "render_height"], 16],
      0, "#00f0ff",
      20, "#7000ff",
      50, "#ff007f",
      90, "#ffe600",
      140, "#ff003c",
    ],
  },
  crystal: {
    name: "Kính cao ốc Crystal",
    icon: "💎",
    desc: "Kính kiến trúc Sapphire hiện đại",
    colors: ["#e0f2fe", "#7dd3fc", "#38bdf8", "#0284c7", "#1e3a8a"],
    expression: [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "render_height"], 16],
      0, "#e0f2fe",
      15, "#7dd3fc",
      35, "#38bdf8",
      65, "#0284c7",
      110, "#1e3a8a",
    ],
  },
};

type StyleKey = keyof typeof MAP_STYLES;

function EcoMap() {
  const mapRef = useRef<MapRef>(null);

  // Hook GPS siêu tốc & độ chính xác cao
  const {
    coords: gpsCoords,
    accuracy: gpsAccuracy,
    accuracyLevel,
    isLocked,
    isLocating: isLocatingGps,
    source: gpsSource,
    error: gpsError,
    refreshGps,
  } = useFastGeolocation();
  const hasAutoCenteredGpsRef = useRef(false);
  const lastCenteredSourceRef = useRef<string | null>(null);
  const lastMouseMoveRef = useRef<number>(0);

  // Tự động căn giữa bản đồ:
  // 1. Khi có tọa độ đầu tiên
  // 2. Tự động nâng cấp bay lại về tâm khi bắt được tín hiệu GPS vệ tinh độ chính xác cao
  useEffect(() => {
    if (gpsCoords && mapRef.current) {
      const isFirstCenter = !hasAutoCenteredGpsRef.current;
      const isUpgradeToRealGps =
        gpsSource === "gps" && lastCenteredSourceRef.current !== "gps";

      if (isFirstCenter || isUpgradeToRealGps) {
        hasAutoCenteredGpsRef.current = true;
        lastCenteredSourceRef.current = gpsSource;
        mapRef.current.flyTo({
          center: [gpsCoords.lng, gpsCoords.lat],
          zoom: gpsSource === "gps" ? 16 : 14,
          duration: 1500,
          essential: true,
        });
      }
    }
  }, [gpsCoords, gpsSource]);

  // States bản đồ & bộ lọc (Mặc định dùng Google Maps Tile Cluster)
  const [activeStyle, setActiveStyle] = useState<StyleKey>("googleRoadmap");
  const [is3D, setIs3D] = useState<boolean>(true);
  // Bảng màu sắc 3D cho các tòa nhà kiến trúc đô thị
  const [building3DTheme, setBuilding3DTheme] = useState<BuildingColorTheme>("rainbow");
  const [show3DColorMenu, setShow3DColorMenu] = useState<boolean>(false);
  const [showDistricts, setShowDistricts] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<EcoCategory | "all">("all");

  // Heatmap States (Bản đồ nhiệt: Nhiệt độ thời tiết, Chỉ số AQI, Mật độ rủi ro)
  const [activeHeatmap, setActiveHeatmap] = useState<"none" | "temperature" | "aqi" | "risk">("none");
  const [showHeatmapMenu, setShowHeatmapMenu] = useState<boolean>(false);
  const [weatherHeatmapData, setWeatherHeatmapData] = useState<FeatureCollection | null>(null);
  const [selectedHeatmapStation, setSelectedHeatmapStation] = useState<any | null>(null);

  // Live Weather Radar State (Mô phỏng trường gió động lực học & dải nhiệt vi khí hậu)
  const [showLiveRadar, setShowLiveRadar] = useState<boolean>(false);
  const [liveRadarOverlay, setLiveRadarOverlay] = useState<WeatherOverlay>("temp");

  // Flood Watch States (Cảnh báo Ngập lụt Đô thị 3 Nguồn: TP.HCM OpenData, Open-Meteo GloFAS & Lượng mưa thông minh)
  const [showFloodWatch, setShowFloodWatch] = useState<boolean>(true);
  const [floodData, setFloodData] = useState<FloodGeoJSONResponse | null>(null);
  const [selectedFloodSpot, setSelectedFloodSpot] = useState<FloodHotspotProperties | null>(null);
  const [selectedGloFAS, setSelectedGloFAS] = useState<GloFASForecastResponse | null>(null);
  const [loadingGloFAS, setLoadingGloFAS] = useState<boolean>(false);
  const [simulatedRainfallMm, setSimulatedRainfallMm] = useState<number | null>(null);
  const [showGloFASModal, setShowGloFASModal] = useState<boolean>(false);
  const [gpsGloFAS, setGpsGloFAS] = useState<GloFASForecastResponse | null>(null);
  const [loadingGpsGloFAS, setLoadingGpsGloFAS] = useState<boolean>(false);
  // Đoạn đường ngập lụt đang được hover chuột
  const [hoveredFloodSegment, setHoveredFloodSegment] = useState<{
    properties: FloodRoadSegmentProperties;
    lngLat: [number, number];
  } | null>(null);
  
  // Selection States
  const [selectedLocation, setSelectedLocation] = useState<EcoLocation | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<LivePOI | null>(null);
  const [clickedAddress, setClickedAddress] = useState<ReverseGeocodeResult | null>(null);
  const [loadingReverse, setLoadingReverse] = useState<boolean>(false);

  // OSRM Routing State (Tuyến đường thực tế)
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState<boolean>(false);

  // Live POIs từ API (Quán ăn, Cafe, Cửa hàng, Số nhà)
  const [livePOIs, setLivePOIs] = useState<LivePOI[]>([]);
  const [loadingPOIs, setLoadingPOIs] = useState<boolean>(false);
  const [autoFetchPOI, setAutoFetchPOI] = useState<boolean>(false);
  const [poiType, setPoiType] = useState<"all" | "cafe" | "restaurant" | "shop">("all");

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [liveSearchResults, setLiveSearchResults] = useState<LivePOI[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState<boolean>(false);

  // Tọa độ
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 10.7745,
    lng: 106.7025,
  });
  // Zoom level hiện tại của bản đồ (điều khiển mức độ chi tiết LOD giống Google Maps)
  const [currentZoom, setCurrentZoom] = useState<number>(14);
  const [hoveredPoiId, setHoveredPoiId] = useState<string | null>(null);
  const [hoveredEcoId, setHoveredEcoId] = useState<string | null>(null);

  // States nạp dữ liệu động từ API (Không khởi tạo cứng)
  const [ecoLocations, setEcoLocations] = useState<EcoLocation[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<{
    all: number;
    incident: number;
    green_spot: number;
    recycling: number;
    sensor: number;
    flood: number;
  }>({ all: 0, incident: 0, green_spot: 0, recycling: 0, sensor: 0, flood: 0 });
  const [loadingEco, setLoadingEco] = useState<boolean>(true);

  const [landmarks, setLandmarks] = useState<HCMLocation[]>([]);
  const [districtBoundaries, setDistrictBoundaries] = useState<FeatureCollection | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherResponse | null>(null);

  // Chế độ hiển thị ngập lụt (Mặc định tắt để sử dụng dữ liệu thực tế từ Weather API & Tide Engine)
  const [simulateFlood, setSimulateFlood] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [contextMenu, setContextMenu] = useState<{ lng: number; lat: number; x: number; y: number } | null>(null);

  // 1. Tải danh sách địa điểm môi trường từ Backend API (PostgreSQL/PostGIS)
  useEffect(() => {
    let isMounted = true;
    setLoadingEco(true);
    fetchEcoLocationsAPI(
      selectedCategory === "all" ? undefined : selectedCategory,
      simulateFlood ? 1.68 : undefined,
      simulateFlood ? 30.0 : undefined
    ).then((res) => {
      if (!isMounted) return;
      if (res && res.data) {
        setEcoLocations(res.data);
        if (res.counts) setCategoryCounts(res.counts);
      }
      setLoadingEco(false);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCategory, simulateFlood, refreshTrigger]);

  // 2. Tải Ranh giới quận/huyện, Điểm Landmark Quick Tour, và Thời tiết thời gian thực
  useEffect(() => {
    fetchDistrictBoundariesAPI().then((data) => {
      if (data) setDistrictBoundaries(data);
    });

    fetchLandmarksAPI().then((data) => {
      if (data && data.length > 0) setLandmarks(data);
    });

    fetchLiveWeatherAPI().then((data) => {
      if (data) setLiveWeather(data);
    });

    // Tải sẵn dữ liệu bản đồ nhiệt thời tiết & AQI toàn quốc
    fetchWeatherHeatmapAPI().then((data) => {
      if (data) setWeatherHeatmapData(data);
    });

    // Định kỳ 3 phút tự động làm mới thời tiết & AQI
    const timer = setInterval(() => {
      fetchLiveWeatherAPI().then((data) => {
        if (data) setLiveWeather(data);
      });
      fetchWeatherHeatmapAPI().then((data) => {
        if (data) setWeatherHeatmapData(data);
      });
    }, 180000);

    return () => clearInterval(timer);
  }, []);

  // 3. Tải dữ liệu ngập lụt đô thị 3 nguồn tích hợp (Cổng TP.HCM, GloFAS & Lượng mưa thông minh)
  const loadFloodData = useCallback((rainMm?: number) => {
    fetchFloodHotspotsAPI(rainMm).then((data) => {
      if (data) setFloodData(data);
    });
  }, []);

  useEffect(() => {
    loadFloodData(simulatedRainfallMm ?? undefined);
    const timer = setInterval(() => {
      loadFloodData(simulatedRainfallMm ?? undefined);
    }, 180000);
    return () => clearInterval(timer);
  }, [loadFloodData, simulatedRainfallMm]);

  // GeoJSON cho bản đồ nhiệt mật độ rủi ro sự cố môi trường
  const incidentRiskGeoJSON = useMemo<FeatureCollection>(() => {
    const features = ecoLocations
      .filter((loc) => loc.category === "incident")
      .map((loc) => {
        let weight = 0.5;
        if (loc.severity === "CRITICAL") weight = 1.0;
        else if (loc.severity === "HIGH") weight = 0.75;
        else if (loc.severity === "LOW") weight = 0.25;

        return {
          type: "Feature" as const,
          id: loc.id,
          geometry: {
            type: "Point" as const,
            coordinates: [loc.longitude, loc.latitude],
          },
          properties: {
            id: loc.id,
            name: loc.name,
            weight,
            severity: loc.severity,
          },
        };
      });

    return {
      type: "FeatureCollection",
      features,
    };
  }, [ecoLocations]);

  // GeoJSON cho các đoạn đường ngập lụt được bôi màu sắc trực quan (Vector LineString)
  const floodRoadSegmentsGeoJSON = useMemo<FeatureCollection | null>(() => {
    if (!showFloodWatch || !floodData?.road_segments || floodData.road_segments.length === 0) {
      return null;
    }
    return {
      type: "FeatureCollection",
      features: floodData.road_segments as any,
    };
  }, [showFloodWatch, floodData]);

  // Tự động gọi API tìm kiếm trực tiếp quán xá, số nhà toàn TP.HCM (Debounce 350ms)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setLiveSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLive(true);
      const results = await searchLivePlacesAPI(searchQuery, mapCenter.lat, mapCenter.lng);
      setLiveSearchResults(results);
      setIsSearchingLive(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, mapCenter]);

  // Tải quán xá, số nhà quanh tọa độ chỉ định
  const handleLoadNearbyPOIs = useCallback(
    async (
      lat: number,
      lng: number,
      type: "all" | "cafe" | "restaurant" | "shop" = poiType,
      reset = false
    ) => {
      setLoadingPOIs(true);
      const pois = await fetchNearbyPOIsAPI(lat, lng, type);

      setLivePOIs((prev) => {
        if (reset || prev.length === 0) return pois.slice(0, 80);
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = pois.filter((p) => !existingIds.has(p.id));
        return [...newItems, ...prev].slice(0, 80);
      });
      setLoadingPOIs(false);
    },
    [poiType]
  );

  // Tự động nạp quán xá khi người dùng kéo bản đồ (Auto-fetch on move)
  // Cho phép nạp từ mức zoom >= 10 để bao quát cấp độ quận/phường
  useEffect(() => {
    if (!autoFetchPOI || currentZoom < 10) return;

    const timer = setTimeout(() => {
      handleLoadNearbyPOIs(mapCenter.lat, mapCenter.lng, poiType, false);
    }, 500);

    return () => clearTimeout(timer);
  }, [mapCenter, autoFetchPOI, poiType, currentZoom, handleLoadNearbyPOIs]);

  // Bật/tắt tự nạp quán xá và tự động quét ngay vị trí hiện tại
  const handleToggleAutoFetch = () => {
    const nextVal = !autoFetchPOI;
    setAutoFetchPOI(nextVal);
    if (nextVal) {
      const center = mapRef.current ? mapRef.current.getCenter() : mapCenter;
      handleLoadNearbyPOIs(center.lat, center.lng, poiType, true);
    }
  };

  // 1. TÍNH NĂNG CLICK BẢN ĐỒ LẤY SỐ NHÀ (REVERSE GEOCODING) & CHỌN ĐOẠN ĐƯỜNG NGẬP
  const handleMapClick = async (e: any) => {
    // 1.0. Kiểm tra nếu click trúng một đoạn đường ngập lụt (Vector LineString)
    if (showFloodWatch) {
      let floodFeat: any = null;
      if (e.features && e.features.length > 0) {
        floodFeat = e.features.find(
          (f: any) =>
            f.layer?.id === "flood-segments-core" ||
            f.layer?.id === "flood-segments-glow" ||
            f.layer?.id === "flood-selected-segment-highlight" ||
            f.layer?.id === "flood-corridor-main" ||
            f.layer?.id === "flood-corridor-glow"
        );
      }
      if (!floodFeat && mapRef.current) {
        const map = mapRef.current.getMap();
        const bbox: [[number, number], [number, number]] = [
          [e.point.x - 8, e.point.y - 8],
          [e.point.x + 8, e.point.y + 8],
        ];
        const queried = map.queryRenderedFeatures(bbox, {
          layers: ["flood-segments-core", "flood-segments-glow", "flood-corridor-main", "flood-corridor-glow"],
        });
        if (queried && queried.length > 0) floodFeat = queried[0];
      }

      if (floodFeat && floodFeat.properties) {
        if (floodFeat.properties.spot_id && floodData) {
          const spotId = floodFeat.properties.spot_id;
          const targetSpot = floodData.features.find((f) => f.id === spotId);
          if (targetSpot) {
            handleSelectFloodSpot(targetSpot.properties, [e.lngLat.lng, e.lngLat.lat]);
            return;
          }
        }
        if (floodFeat.properties.id) {
          const found = ecoLocations.find((l) => l.id === floodFeat.properties.id);
          if (found) {
            handleSelectEcoLocation(found);
            return;
          }
        }
      }
    }

    const { lng, lat } = e.lngLat;
    setLoadingReverse(true);
    setSelectedLocation(null);
    setSelectedPOI(null);

    const result = await reverseGeocodeOSM(lat, lng);
    setClickedAddress(result);
    setLoadingReverse(false);
  };

  // 2. TÍNH NĂNG CHỈ ĐƯỜNG THỰC TẾ OSRM (ROUTING POLYLINE)
  const handleCalculateRoute = async (destLng: number, destLat: number, destName?: string) => {
    setCalculatingRoute(true);

    // Điểm xuất phát: BẮT BUỘC ƯU TIÊN VỊ TRÍ GPS ĐANG ĐỨNG CỦA NGƯỜI DÙNG
    let startLng: number;
    let startLat: number;
    let startLabel: string;

    if (gpsCoords && typeof gpsCoords.lng === "number" && typeof gpsCoords.lat === "number") {
      startLng = gpsCoords.lng;
      startLat = gpsCoords.lat;
      startLabel = "Vị trí GPS của bạn";
    } else {
      startLng = DEFAULT_FALLBACK_LOCATION.lng;
      startLat = DEFAULT_FALLBACK_LOCATION.lat;
      startLabel = "Trung tâm TP.HCM (Chưa có GPS)";
    }

    // Kiểm tra khoảng cách: nếu điểm xuất phát và đích đến quá gần (< 25m)
    const distMeters = calculateDistanceMeters(
      { lat: startLat, lng: startLng },
      { lat: destLat, lng: destLng }
    );

    if (distMeters < 25) {
      alert("Bạn đang ở ngay tại vị trí này rồi (khoảng cách < 25m)! Hãy chọn một địa điểm khác trên bản đồ để vẽ lộ trình.");
      setCalculatingRoute(false);
      return;
    }

    const route = await getRouteOSRM(startLng, startLat, destLng, destLat);
    if (route) {
      setActiveRoute({
        ...route,
        startCoords: [startLng, startLat],
        destCoords: [destLng, destLat],
        destName: destName || clickedAddress?.placeName || "Điểm đến",
        startLabel,
      });
      // Zoom vừa khít cả tuyến đường
      if (mapRef.current) {
        const boundsLng = [Math.min(startLng, destLng), Math.max(startLng, destLng)];
        const boundsLat = [Math.min(startLat, destLat), Math.max(startLat, destLat)];
        mapRef.current.fitBounds(
          [
            [boundsLng[0] - 0.015, boundsLat[0] - 0.015],
            [boundsLng[1] + 0.015, boundsLat[1] + 0.015],
          ],
          { padding: 80, duration: 1500 }
        );
      }
    } else {
      alert("Không thể tính toán lộ trình OSRM giữa 2 điểm này. Vui lòng thử lại!");
    }
    setCalculatingRoute(false);
  };

  // Danh sách địa điểm môi trường hiển thị sau khi lọc
  const filteredLocations = useMemo(() => {
    if (selectedCategory === "all") return ecoLocations;
    return ecoLocations.filter((loc) => loc.category === selectedCategory);
  }, [ecoLocations, selectedCategory]);

  // GeoJSON các đoạn đường ngập úng (LineString / MultiLineString vẽ trực tiếp lên lòng đường)
  const floodCorridorsGeoJSON = useMemo<FeatureCollection>(() => {
    const features: any[] = [];
    ecoLocations.forEach((loc) => {
      // CHỈ vẽ đường màu xanh nếu đường thực sự đang ngập (không phải SAFE)
      if (loc.category === "flood" && loc.roadCorridor && loc.severityLevel !== "SAFE") {
        features.push({
          type: "Feature",
          id: loc.id,
          properties: {
            id: loc.id,
            name: loc.name,
            streetName: loc.name.replace("Điểm ngập ", ""),
            severity: loc.severityLevel || "SAFE",
            depth: loc.metricValue,
            statusText: loc.statusText,
            color: "#0284c7", // Màu xanh nước ngập như người dùng vẽ trong ảnh
          },
          geometry: loc.roadCorridor,
        });
      }
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }, [ecoLocations]);

  // Lọc nội bộ từ dữ liệu đã tải qua API
  const localSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return { ecoMatches: [] as EcoLocation[], landmarkMatches: [] as HCMLocation[] };
    const q = searchQuery.toLowerCase();

    const ecoMatches = ecoLocations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q)
    );

    const landmarkMatches = landmarks.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q))
    );

    return { ecoMatches, landmarkMatches };
  }, [searchQuery, ecoLocations, landmarks]);

  // Điều hướng camera
  const handleFlyToLocation = (lng: number, lat: number, zoom = 16.5, pitch = 55, bearing = -15) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom,
        pitch: is3D ? pitch : 0,
        bearing: is3D ? bearing : 0,
        duration: 2200,
        essential: true,
      });
    }
  };

  // Chọn địa điểm sinh thái
  const handleSelectEcoLocation = (loc: EcoLocation) => {
    setSelectedPOI(null);
    setClickedAddress(null);
    setSelectedLocation(loc);
    handleFlyToLocation(loc.longitude, loc.latitude, 16.5, 55, -20);
  };

  // Chọn quán xá từ Live POI
  const handleSelectLivePOI = (poi: LivePOI) => {
    setSelectedLocation(null);
    setClickedAddress(null);
    setSelectedPOI(poi);

    if (!livePOIs.some((p) => p.id === poi.id)) {
      setLivePOIs((prev) => [poi, ...prev]);
    }

    handleFlyToLocation(poi.longitude, poi.latitude, 17.5, 60, -20);
  };

  // Chọn điểm ngập lụt để xem chi tiết 3 Nguồn (Cổng TP.HCM, GloFAS, Lượng mưa thông minh)
  const handleSelectFloodSpot = async (spot: FloodHotspotProperties, coords: [number, number]) => {
    setSelectedLocation(null);
    setSelectedPOI(null);
    setClickedAddress(null);
    setSelectedFloodSpot(spot);
    setSelectedGloFAS(null);
    handleFlyToLocation(coords[0], coords[1], 16.8, 55, -15);

    setLoadingGloFAS(true);
    try {
      const glofas = await fetchGloFASForecastAPI(coords[1], coords[0]);
      if (glofas) setSelectedGloFAS(glofas);
    } finally {
      setLoadingGloFAS(false);
    }
  };

  // Tra cứu nguy cơ lũ lụt GloFAS tại vị trí GPS hiện tại
  const handleInspectGpsGloFAS = async () => {
    const lat = gpsCoords ? gpsCoords.lat : 10.7765;
    const lng = gpsCoords ? gpsCoords.lng : 106.7009;
    setLoadingGpsGloFAS(true);
    setShowGloFASModal(true);
    try {
      const res = await fetchGloFASForecastAPI(lat, lng);
      if (res) setGpsGloFAS(res);
    } finally {
      setLoadingGpsGloFAS(false);
    }
  };

  // Chọn địa danh Quick Tour
  const handleSelectLandmark = (loc: HCMLocation) => {
    setSelectedLocation(null);
    setSelectedPOI(null);
    setClickedAddress(null);
    setContextMenu(null);
    setMapCenter({ lat: loc.latitude, lng: loc.longitude });
    setCurrentZoom(loc.zoom);
    handleFlyToLocation(loc.longitude, loc.latitude, loc.zoom, loc.pitch, loc.bearing);
    handleLoadNearbyPOIs(loc.latitude, loc.longitude, poiType, true);
  };

  // Chuyển đổi 2D/3D
  const toggle3DView = () => {
    const next3D = !is3D;
    setIs3D(next3D);

    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: next3D ? 58 : 0,
        bearing: next3D ? -20 : 0,
        duration: 1200,
      });
    }
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", userSelect: "none" }}>
      
      {/* 1. KHỐI TÌM KIẾM & BỘ LỌC ĐỒNG BỘ GÓC TRÁI (Apple / Google Maps Style) */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 25,
          width: 380,
          maxWidth: "calc(100vw - 32px)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Khung tìm kiếm & Danh mục chính */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
            border: "1px solid #e2e8f0",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Hàng ô tìm kiếm */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "7px 10px",
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <span style={{ fontSize: 14, marginRight: 8, color: "#64748b", display: "flex", alignItems: "center" }}>
              {isSearchingLive || loadingPOIs ? "⏳" : "🔍"}
            </span>
            <input
              type="text"
              placeholder="Tìm số nhà, hẻm, quán ăn, cafe khắp TP.HCM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13,
                fontWeight: 500,
                color: "#0f172a",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setLiveSearchResults([]);
                  setIsSearchFocused(false);
                }}
                style={{
                  border: "none",
                  background: "#e2e8f0",
                  color: "#64748b",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Hàng nút lọc danh mục chính (Trượt ngang tinh tế) */}
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 2,
              scrollbarWidth: "none",
            }}
          >
            <button
              onClick={() => setSelectedCategory("all")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 10px",
                borderRadius: 20,
                border: selectedCategory === "all" ? "1px solid #0f172a" : "1px solid #e2e8f0",
                background: selectedCategory === "all" ? "#0f172a" : "#ffffff",
                color: selectedCategory === "all" ? "#ffffff" : "#475569",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <span>Tất cả</span>
              <span
                style={{
                  fontSize: 10,
                  background: selectedCategory === "all" ? "rgba(255,255,255,0.2)" : "#f1f5f9",
                  color: selectedCategory === "all" ? "#ffffff" : "#64748b",
                  padding: "1px 5px",
                  borderRadius: 10,
                }}
              >
                {loadingEco ? "..." : categoryCounts.all}
              </span>
            </button>

            {(Object.keys(CATEGORY_CONFIG) as EcoCategory[]).map((catKey) => {
              const cfg = CATEGORY_CONFIG[catKey];
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    borderRadius: 20,
                    border: isSelected ? `1px solid ${cfg.color}` : "1px solid #e2e8f0",
                    background: isSelected ? cfg.color : "#ffffff",
                    color: isSelected ? "#ffffff" : "#475569",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      background: isSelected ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                      color: isSelected ? "#ffffff" : "#64748b",
                      padding: "1px 5px",
                      borderRadius: 10,
                    }}
                  >
                    {loadingEco ? "..." : categoryCounts[catKey]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Thanh công cụ nạp Quán xá & Điểm dịch vụ (Hiện đại, tối giản) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 6,
              borderTop: "1px solid #f1f5f9",
              gap: 4,
            }}
          >
            {/* Phân loại quán */}
            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
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
                  onClick={() => {
                    setPoiType(t.id);
                    const center = mapRef.current ? mapRef.current.getCenter() : mapCenter;
                    handleLoadNearbyPOIs(center.lat, center.lng, t.id, true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    padding: "3px 6px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 10.5,
                    fontWeight: poiType === t.id ? 700 : 500,
                    background: poiType === t.id ? "#0f172a" : "transparent",
                    color: poiType === t.id ? "#ffffff" : "#64748b",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Nút Tự nạp & Quét quanh đây */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button
                onClick={handleToggleAutoFetch}
                title={autoFetchPOI ? "Đang bật tự nạp POI khi di chuyển" : "Bật tự nạp POI khi di chuyển"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: autoFetchPOI ? "1px solid #10b981" : "1px solid #e2e8f0",
                  background: autoFetchPOI ? "#ecfdf5" : "#ffffff",
                  color: autoFetchPOI ? "#059669" : "#64748b",
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 8 }}>{autoFetchPOI ? "🟢" : "⚪"}</span>
                <span>Tự nạp</span>
              </button>

              <button
                onClick={() => {
                  const center = mapRef.current ? mapRef.current.getCenter() : mapCenter;
                  handleLoadNearbyPOIs(center.lat, center.lng, poiType, true);
                }}
                disabled={loadingPOIs}
                title="Quét nạp quán quanh tâm bản đồ"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#0f172a",
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{loadingPOIs ? "⏳" : "⚡"}</span>
                <span>{loadingPOIs ? "Quét..." : "Quét"}</span>
                {livePOIs.length > 0 && (
                  <span style={{ fontSize: 9.5, color: "#64748b" }}>
                    ({livePOIs.length})
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Kết quả tìm kiếm (Dropdown) */}
        {isSearchFocused && (liveSearchResults.length > 0 || localSearchResults.ecoMatches.length > 0) && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
              border: "1px solid #e2e8f0",
              maxHeight: 360,
              overflowY: "auto",
              padding: "6px",
            }}
          >
            {liveSearchResults.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#0f172a", padding: "4px 10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Quán xá & Số nhà (OSM):
                </div>
                {liveSearchResults.map((poi) => (
                  <div
                    key={poi.id}
                    onClick={() => {
                      handleSelectLivePOI(poi);
                      setIsSearchFocused(false);
                      setSearchQuery(poi.name);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 16 }}>{poi.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>
                        {poi.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {poi.fullAddress}
                      </div>
                    </div>
                    {poi.houseNumber && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#475569",
                          background: "#f1f5f9",
                          padding: "2px 6px",
                          borderRadius: 6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Số {poi.houseNumber}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {localSearchResults.ecoMatches.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#059669", padding: "4px 10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Địa điểm môi trường EcoReport:
                </div>
                {localSearchResults.ecoMatches.map((loc) => {
                  const cat = getCategoryConfig(loc.category);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => {
                        handleSelectEcoLocation(loc);
                        setIsSearchFocused(false);
                        setSearchQuery(loc.name);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ fontSize: 16 }}>{cat.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{loc.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{loc.district} • {loc.address}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Thẻ chi tiết Địa điểm / Quán xá / Vị trí click / Điểm ngập lụt 3 Nguồn (Docked thanh lịch bên trái) */}
        {(selectedLocation || selectedPOI || clickedAddress || selectedFloodSpot) && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
              border: "1px solid #e2e8f0",
              padding: "16px",
              maxHeight: "calc(100vh - 120px)",
              overflowY: "auto",
            }}
          >
            {selectedFloodSpot ? (
              <div>
                {/* Header Điểm Ngập Lụt */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 24 }}>
                      {selectedFloodSpot.current_risk_level === "CRITICAL" ? "🚨" : selectedFloodSpot.current_risk_level === "WARNING" ? "🌊" : "💧"}
                    </span>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Điểm Đen Ngập Lụt Đô Thị (3 Nguồn)
                      </div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>
                        {selectedFloodSpot.name}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFloodSpot(null)}
                    style={{
                      border: "none",
                      background: "#f1f5f9",
                      borderRadius: "50%",
                      width: 24,
                      height: 24,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#64748b",
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Huy hiệu Cảnh báo Thời gian thực */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    marginBottom: 10,
                    fontWeight: 700,
                    fontSize: 11.5,
                    background:
                      selectedFloodSpot.current_risk_level === "CRITICAL"
                        ? "#fee2e2"
                        : selectedFloodSpot.current_risk_level === "WARNING"
                        ? "#ffedd5"
                        : selectedFloodSpot.current_risk_level === "ALERT"
                        ? "#fef9c3"
                        : "#e0f2fe",
                    color:
                      selectedFloodSpot.current_risk_level === "CRITICAL"
                        ? "#b91c1c"
                        : selectedFloodSpot.current_risk_level === "WARNING"
                        ? "#c2410c"
                        : selectedFloodSpot.current_risk_level === "ALERT"
                        ? "#a16207"
                        : "#0369a1",
                    border:
                      selectedFloodSpot.current_risk_level === "CRITICAL"
                        ? "1px solid #fca5a5"
                        : "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span>{selectedFloodSpot.current_risk_label}</span>
                </div>

                {/* NGUỒN 1: CỔNG DỮ LIỆU MỞ TP.HCM (SỞ XÂY DỰNG & UDC) */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                    <span>🏛️</span>
                    <span>1. CỔNG DỮ LIỆU MỞ TP.HCM (SỞ XÂY DỰNG)</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, marginBottom: 6 }}>
                    <div>
                      <span style={{ color: "#64748b" }}>Độ sâu chuẩn: </span>
                      <strong style={{ color: "#0f172a" }}>{selectedFloodSpot.historical_depth_cm} cm</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Chiều dài: </span>
                      <strong style={{ color: "#0f172a" }}>{selectedFloodSpot.length_m} m</strong>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "#64748b" }}>Nguyên nhân: </span>
                      <span style={{ fontWeight: 600, color: "#b91c1c" }}>{selectedFloodSpot.cause}</span>
                    </div>
                  </div>
                  {selectedFloodSpot.pump_station && (
                    <div style={{ fontSize: 10.5, color: "#475569", marginBottom: 4 }}>
                      ⚙️ <strong>Tiêu thoát:</strong> {selectedFloodSpot.pump_station}
                    </div>
                  )}
                  {selectedFloodSpot.detour_advice && (
                    <div style={{ fontSize: 10.5, color: "#0369a1", background: "#f0f9ff", padding: "4px 8px", borderRadius: 6, marginTop: 4 }}>
                      💡 <strong>Tránh ngập:</strong> {selectedFloodSpot.detour_advice}
                    </div>
                  )}
                </div>

                {/* NGUỒN 2: CẢNH BÁO THỜI TIẾT THÔNG MINH (RAINFALL TRIGGER) */}
                <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 10, padding: "10px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
                    <span>🌦️</span>
                    <span>2. CẢNH BÁO MƯA THỜI GIAN THỰC (RAINFALL TRIGGER)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: "#78350f" }}>Lượng mưa hiện tại:</span>
                    <strong style={{ color: "#b45309" }}>{selectedFloodSpot.current_rainfall_mm} mm/h</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: "#78350f" }}>Mực nước ngập ước tính:</span>
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
                <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 10, padding: "10px", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#166534" }}>
                      <span>🛰️</span>
                      <span>3. OPEN-METEO GLOFAS (COPERNICUS)</span>
                    </div>
                    <span style={{ fontSize: 9.5, background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                      GloFAS Vệ tinh
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: "#14532d" }}>Lưu lượng Sông Sài Gòn:</span>
                    <strong style={{ color: "#15803d" }}>
                      {selectedFloodSpot.glofas_discharge_m3s ? `${selectedFloodSpot.glofas_discharge_m3s.toLocaleString()} m³/s` : "2,343 m³/s"}
                    </strong>
                  </div>

                  {/* Biểu đồ 7 ngày GloFAS nếu đã fetch */}
                  {selectedGloFAS && selectedGloFAS.forecast_7d && (
                    <div>
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
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      if (floodData) {
                        const feat = floodData.features.find((f) => f.id === selectedFloodSpot.id);
                        if (feat) {
                          handleCalculateRoute(feat.geometry.coordinates[0], feat.geometry.coordinates[1], selectedFloodSpot.name);
                        }
                      }
                    }}
                    disabled={calculatingRoute}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "9px 12px",
                      borderRadius: 10,
                      background: "#0284c7",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <span>🧭</span> {calculatingRoute ? "Đang tính..." : "Chỉ đường tránh ngập"}
                  </button>
                  <button
                    onClick={() => handleInspectGpsGloFAS()}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    title="Xem chi tiết toàn bộ mô hình GloFAS"
                  >
                    📊 GloFAS
                  </button>
                </div>
              </div>
            ) : clickedAddress ? (
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
                      Vị trí đã chọn trên bản đồ
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                      {clickedAddress.placeName}
                    </div>
                  </div>
                  <button
                    onClick={() => setClickedAddress(null)}
                    style={{
                      border: "none",
                      background: "#f1f5f9",
                      borderRadius: "50%",
                      width: 24,
                      height: 24,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#64748b",
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", marginBottom: 12 }}>
                  {clickedAddress.houseNumber && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
                      🏠 Số nhà: {clickedAddress.houseNumber}
                    </div>
                  )}
                  <div style={{ fontSize: 11.5, color: "#475569" }}>
                    📍 {clickedAddress.fullAddress}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleCalculateRoute(clickedAddress.lng, clickedAddress.lat, clickedAddress.placeName || clickedAddress.fullAddress)}
                    disabled={calculatingRoute}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "9px 12px",
                      borderRadius: 10,
                      background: "#0f172a",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <span>🧭</span> {calculatingRoute ? "Đang tính..." : "Chỉ đường từ vị trí của tôi"}
                  </button>
                  <button
                    onClick={() => alert(`Đã ghi nhận tọa độ ${clickedAddress.lat.toFixed(5)}, ${clickedAddress.lng.toFixed(5)} để gửi báo cáo sự cố!`)}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Báo cáo
                  </button>
                </div>
              </div>
            ) : selectedPOI ? (
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{selectedPOI.icon}</span>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        {selectedPOI.categoryName}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                        {selectedPOI.name}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPOI(null)}
                    style={{
                      border: "none",
                      background: "#f1f5f9",
                      borderRadius: "50%",
                      width: 24,
                      height: 24,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#64748b",
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", marginBottom: 12 }}>
                  {selectedPOI.houseNumber && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
                      🏠 Số nhà: {selectedPOI.houseNumber}
                    </div>
                  )}
                  <div style={{ fontSize: 11.5, color: "#475569" }}>
                    📍 {selectedPOI.fullAddress}
                  </div>
                </div>

                <button
                  onClick={() => handleCalculateRoute(selectedPOI.longitude, selectedPOI.latitude, selectedPOI.name)}
                  disabled={calculatingRoute}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span>🧭</span> {calculatingRoute ? "Đang tính..." : "Chỉ đường từ vị trí của tôi"}
                </button>
              </div>
            ) : selectedLocation ? (
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{CATEGORY_CONFIG[selectedLocation.category].icon}</span>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: CATEGORY_CONFIG[selectedLocation.category].color }}>
                        {CATEGORY_CONFIG[selectedLocation.category].name}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                        {selectedLocation.name}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    style={{
                      border: "none",
                      background: "#f1f5f9",
                      borderRadius: "50%",
                      width: 24,
                      height: 24,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#64748b",
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 7px", borderRadius: 6, background: "#f1f5f9", fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: CATEGORY_CONFIG[selectedLocation.category].color }} />
                    {selectedLocation.statusText}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b" }}>
                    📍 {selectedLocation.address} ({selectedLocation.district})
                  </div>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "8px 12px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                    {selectedLocation.metricLabel}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                    {selectedLocation.metricValue}
                  </div>
                </div>

                <button
                  onClick={() => handleCalculateRoute(selectedLocation.longitude, selectedLocation.latitude, selectedLocation.name)}
                  disabled={calculatingRoute}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span>🧭</span> {calculatingRoute ? "Đang tính..." : "Chỉ đường từ vị trí của tôi"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 2. THANH ĐIỀU KHIỂN BẢN ĐỒ & CÁC LỚP BẢN ĐỒ TRỰC TIẾP (Google Maps / Apple Maps Style) */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 412,
          right: 16,
          zIndex: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          pointerEvents: "none",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Dãy nút chọn kiểu bản đồ trực quan */}
        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: 999,
            padding: "4px 8px",
            boxShadow: "0 4px 18px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e2e8f0",
            overflowX: "auto",
            scrollbarWidth: "none",
            maxWidth: "calc(100% - 240px)",
          }}
        >
          {/* Logo brand nhỏ tinh tế */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, paddingRight: 8, marginRight: 4, borderRight: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: 15 }}>🌱</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>EcoReport</span>
          </div>

          {(Object.keys(MAP_STYLES) as StyleKey[]).map((key) => {
            const item = MAP_STYLES[key];
            const isActive = activeStyle === key;
            return (
              <button
                key={key}
                onClick={() => setActiveStyle(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: isActive ? "1px solid #0f172a" : "none",
                  cursor: "pointer",
                  fontSize: 11.5,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? "#0f172a" : "transparent",
                  color: isActive ? "#ffffff" : "#475569",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Cụm công cụ: Ranh giới quận + 3D + GPS */}
        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: 999,
            padding: "4px 8px",
            boxShadow: "0 4px 18px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e2e8f0",
          }}
        >
          {/* Nút bật/tắt Ranh giới khu vực / quận huyện */}
          <button
            onClick={() => setShowDistricts(!showDistricts)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              borderRadius: 999,
              border: showDistricts ? "1px solid #3b82f6" : "none",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: showDistricts ? 700 : 500,
              background: showDistricts ? "#eff6ff" : "transparent",
              color: showDistricts ? "#1d4ed8" : "#475569",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <span>🗺️</span>
            <span>{showDistricts ? "Ẩn ranh giới" : "Ranh giới khu vực"}</span>
          </button>

          {/* NÚT MỞ RADAR KHÍ TƯỢNG ĐỘNG LỰC HỌC (CHẾ ĐỘ MÔ PHỎNG GIÓ & DẢI NHIỆT VI KHÍ HẬU) */}
          <button
            onClick={() => {
              setLiveRadarOverlay("temp");
              setShowLiveRadar(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 999,
              border: "1px solid rgba(249, 115, 22, 0.4)",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: 700,
              background: "linear-gradient(135deg, #ea580c, #c2410c)",
              color: "#ffffff",
              boxShadow: "0 2px 10px rgba(234, 88, 12, 0.35)",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
            title="Mở Radar Khí tượng & Luồng gió động lực học thời gian thực"
          >
            <span style={{ fontSize: 13 }}>🌪️</span>
            <span>Radar Khí tượng</span>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.25)",
                fontSize: 9,
                padding: "1px 5px",
                borderRadius: 4,
                letterSpacing: 0.5,
                fontWeight: 800,
              }}
            >
              LIVE
            </span>
          </button>

          {/* NÚT MỞ BẬT/TẮT CẢNH BÁO NGẬP LỤT (3 NGUỒN TÍCH HỢP) */}
          <button
            onClick={() => setShowFloodWatch(!showFloodWatch)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 999,
              border: showFloodWatch ? "1px solid #0284c7" : "1px solid rgba(2, 132, 199, 0.35)",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: showFloodWatch ? 700 : 500,
              background: showFloodWatch ? "linear-gradient(135deg, #0284c7, #0369a1)" : "transparent",
              color: showFloodWatch ? "#ffffff" : "#0284c7",
              boxShadow: showFloodWatch ? "0 2px 10px rgba(2, 132, 199, 0.35)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
            title="Cảnh báo ngập lụt đô thị tích hợp 3 nguồn: Cổng dữ liệu TP.HCM, Open-Meteo GloFAS & Lượng mưa thông minh"
          >
            <span style={{ fontSize: 13 }}>🌊</span>
            <span>Cảnh báo Ngập lụt</span>
            {floodData && (
              <span
                style={{
                  background: showFloodWatch ? "rgba(255, 255, 255, 0.25)" : "#e0f2fe",
                  color: showFloodWatch ? "#ffffff" : "#0369a1",
                  fontSize: 9.5,
                  padding: "1px 5px",
                  borderRadius: 4,
                  fontWeight: 800,
                }}
              >
                {floodData.total} điểm
              </span>
            )}
          </button>

          {/* Nút Chuyển Đổi Triều Cường Mô Phỏng để hiển thị rõ các đoạn đường ngập úng */}
          <button
            onClick={() => setSimulateFlood(!simulateFlood)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 999,
              border: simulateFlood ? "1px solid #0284c7" : "1px solid rgba(2, 132, 199, 0.35)",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: simulateFlood ? 700 : 500,
              background: simulateFlood
                ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                : "transparent",
              color: simulateFlood ? "#ffffff" : "#0284c7",
              boxShadow: simulateFlood ? "0 2px 10px rgba(2, 132, 199, 0.35)" : "none",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
            title="Bật/Tắt hiển thị các đoạn đường ngập lụt theo mô phỏng triều cường đỉnh 1.68m"
          >
            <span>{simulateFlood ? "🌊 Triều đỉnh 1.68m" : "🌤️ Triều thực tế"}</span>
          </button>

          {/* Nút Menu Bản đồ nhiệt thời tiết & môi trường */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowHeatmapMenu(!showHeatmapMenu)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 11px",
                borderRadius: 999,
                border: activeHeatmap !== "none" ? "1px solid #f97316" : "1px solid transparent",
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: activeHeatmap !== "none" ? 700 : 500,
                background: activeHeatmap !== "none" ? "linear-gradient(135deg, #fff7ed, #ffedd5)" : "transparent",
                color: activeHeatmap !== "none" ? "#c2410c" : "#475569",
                boxShadow: activeHeatmap !== "none" ? "0 2px 8px rgba(249, 115, 22, 0.2)" : "none",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <span>{activeHeatmap === "temperature" ? "🌡️" : activeHeatmap === "aqi" ? "💨" : activeHeatmap === "risk" ? "🚨" : "🔥"}</span>
              <span>
                {activeHeatmap === "temperature"
                  ? "Nhiệt độ (°C)"
                  : activeHeatmap === "aqi"
                  ? "Không khí (AQI)"
                  : activeHeatmap === "risk"
                  ? "Điểm nóng rủi ro"
                  : "Bản đồ nhiệt"}
              </span>
              <span style={{ fontSize: 9 }}>▼</span>
            </button>

            {/* Dropdown Menu chọn chế độ Bản đồ nhiệt */}
            {showHeatmapMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 6,
                  background: "rgba(255, 255, 255, 0.96)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                  border: "1px solid #e2e8f0",
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  zIndex: 50,
                  minWidth: 205,
                }}
              >
                {/* Lựa chọn Radar Khí tượng trực tiếp trong menu */}
                <button
                  onClick={() => {
                    setLiveRadarOverlay("temp");
                    setShowLiveRadar(true);
                    setShowHeatmapMenu(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1px solid #fdba74",
                    background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
                    color: "#c2410c",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 16 }}>🌪️</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span>Radar Khí tượng & Luồng gió</span>
                    <span style={{ fontSize: 10, color: "#ea580c", fontWeight: 500 }}>
                      Mô phỏng trường gió & vi khí hậu trực tiếp
                    </span>
                  </div>
                </button>

                <div style={{ height: 1, backgroundColor: "#f1f5f9", margin: "2px 0" }} />

                <button
                  onClick={() => {
                    setActiveHeatmap("temperature");
                    setShowHeatmapMenu(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: activeHeatmap === "temperature" ? "#fff7ed" : "transparent",
                    color: activeHeatmap === "temperature" ? "#ea580c" : "#334155",
                    fontWeight: activeHeatmap === "temperature" ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>🌡️</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span>Nhiệt độ thời tiết (°C)</span>
                    <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>Dải nhiệt vi khí hậu toàn quốc</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveHeatmap("aqi");
                    setShowHeatmapMenu(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: activeHeatmap === "aqi" ? "#ecfdf5" : "transparent",
                    color: activeHeatmap === "aqi" ? "#059669" : "#334155",
                    fontWeight: activeHeatmap === "aqi" ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>💨</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span>Chất lượng không khí (AQI)</span>
                    <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>Bụi mịn PM2.5 & cảnh báo</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveHeatmap("risk");
                    setShowHeatmapMenu(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: activeHeatmap === "risk" ? "#fef2f2" : "transparent",
                    color: activeHeatmap === "risk" ? "#dc2626" : "#334155",
                    fontWeight: activeHeatmap === "risk" ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>🚨</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span>Điểm nóng sự cố ô nhiễm</span>
                    <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>Mật độ bãi rác & ô nhiễm</span>
                  </div>
                </button>

                {activeHeatmap !== "none" && (
                  <button
                    onClick={() => {
                      setActiveHeatmap("none");
                      setShowHeatmapMenu(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "none",
                      borderTop: "1px solid #f1f5f9",
                      marginTop: 2,
                      background: "transparent",
                      color: "#64748b",
                      fontSize: 11.5,
                      cursor: "pointer",
                    }}
                  >
                    <span>⏹️</span>
                    <span>Tắt bản đồ nhiệt</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Nút 3D / 2D */}
          <button
            onClick={toggle3DView}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              borderRadius: 999,
              border: is3D ? "1px solid #0f172a" : "none",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: is3D ? 700 : 500,
              background: is3D ? "#0f172a" : "transparent",
              color: is3D ? "#ffffff" : "#475569",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <span>{is3D ? "🏢 3D" : "📐 2D"}</span>
          </button>

          {/* Bộ chọn màu sắc 3D khi đang bật 3D trên bản đồ hỗ trợ */}
          {is3D && (activeStyle === "voyager" || activeStyle === "dark") && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShow3DColorMenu(!show3DColorMenu)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid #c084fc",
                  cursor: "pointer",
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #fdf4ff, #fae8ff)",
                  color: "#9333ea",
                  boxShadow: "0 2px 8px rgba(147, 51, 234, 0.15)",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                title="Đổi bảng màu sắc rực rỡ cho tòa nhà 3D"
              >
                <span>{BUILDING_COLOR_THEMES[building3DTheme].icon}</span>
                <span>Màu 3D</span>
                <span style={{ fontSize: 9 }}>▼</span>
              </button>

              {show3DColorMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    background: "rgba(255, 255, 255, 0.98)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderRadius: 14,
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.2)",
                    border: "1px solid #e2e8f0",
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    zIndex: 100,
                    minWidth: 230,
                  }}
                >
                  <div style={{ padding: "3px 6px", fontSize: 10.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Bảng màu tòa nhà 3D
                  </div>
                  {(Object.keys(BUILDING_COLOR_THEMES) as BuildingColorTheme[]).map((themeKey) => {
                    const theme = BUILDING_COLOR_THEMES[themeKey];
                    const isSelected = building3DTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        onClick={() => {
                          setBuilding3DTheme(themeKey);
                          setShow3DColorMenu(false);
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          padding: "7px 9px",
                          borderRadius: 9,
                          border: isSelected ? "1.5px solid #a855f7" : "1px solid transparent",
                          background: isSelected ? "#fdf4ff" : "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 600, color: isSelected ? "#9333ea" : "#1e293b" }}>
                            {theme.icon} {theme.name}
                          </span>
                          {isSelected && <span style={{ fontSize: 11, color: "#9333ea", fontWeight: 800 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 9.5, color: "#64748b" }}>{theme.desc}</span>
                        {/* Dải màu preview */}
                        <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", marginTop: 2 }}>
                          {theme.colors.map((c, idx) => (
                            <div key={idx} style={{ flex: 1, backgroundColor: c }} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Nút Định vị GPS */}
          <button
            onClick={() => {
              refreshGps(true);
              if (gpsCoords && mapRef.current) {
                mapRef.current.flyTo({
                  center: [gpsCoords.lng, gpsCoords.lat],
                  zoom: gpsSource === "gps" ? 16 : 14,
                  pitch: is3D ? 58 : 0,
                  duration: 1200,
                });
              }
            }}
            title={
              gpsCoords
                ? `Vị trí: ${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}\nNguồn: ${
                    gpsSource === "gps"
                      ? "Vệ tinh GPS / Wi-Fi"
                      : gpsSource === "network"
                      ? "Ước tính theo IP mạng"
                      : gpsSource === "cache"
                      ? "Bộ nhớ đệm"
                      : "Mặc định TP.HCM"
                  } (Cấp độ: ${accuracyLevel}, Sai số: ±${gpsAccuracy || 15}m - ${
                    isLocked ? "Đã khóa vệ tinh" : "Đang tinh chỉnh"
                  })\nClick để làm mới và xóa cache.`
                : gpsError || (isLocatingGps ? "Đang tìm kiếm tín hiệu GPS..." : "Chưa có GPS")
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 11px",
              borderRadius: 999,
              border: isLocked ? "1px solid #10b981" : "1px solid #e2e8f0",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: 700,
              background: isLocked ? "#ecfdf5" : gpsCoords ? "#eff6ff" : "#f8fafc",
              color: isLocked ? "#059669" : gpsCoords ? "#2563eb" : "#64748b",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <span>
              {!gpsCoords && isLocatingGps
                ? "🛰️ Đang dò..."
                : isLocked
                ? `🎯 GPS (±${gpsAccuracy || 10}m)`
                : gpsSource === "gps"
                ? `🎯 GPS (±${gpsAccuracy || 25}m)`
                : gpsSource === "network"
                ? "📶 Ước lượng IP"
                : gpsSource === "cache"
                ? "💾 Cache GPS"
                : "📍 Mặc định TP.HCM"}
            </span>
          </button>
        </div>
      </div>

      {/* 3. BẢNG THÔNG BÁO LỘ TRÌNH OSRM ROUTING (Góc trên bên phải, hiển thị khi có lộ trình) */}
      {activeRoute && (
        <div
          style={{
            position: "absolute",
            top: 72,
            right: 16,
            zIndex: 24,
            background: "#ffffff",
            borderRadius: 14,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            border: "1px solid #e2e8f0",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
              Lộ trình OSRM {activeRoute.destName ? `➔ ${activeRoute.destName}` : ""}
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
              {activeRoute.distanceKm} km • ~{activeRoute.durationMin} phút di chuyển
            </div>
            {activeRoute.startLabel && (
              <div style={{ fontSize: 10.5, color: "#64748b" }}>
                Xuất phát: {activeRoute.startLabel}
              </div>
            )}
          </div>
          <button
            onClick={() => setActiveRoute(null)}
            title="Đóng lộ trình"
            style={{
              border: "none",
              background: "#f1f5f9",
              color: "#64748b",
              borderRadius: "50%",
              width: 24,
              height: 24,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 10,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. CHỈ SỐ THỜI TIẾT & AQI TINH GỌN GÓC DƯỚI BÊN TRÁI */}
      <div
        title={
          liveWeather
            ? `${liveWeather.desc} • PM2.5: ${liveWeather.pm25} µg/m³\n${
                mouseCoords ? `Tọa độ chuột: ${mouseCoords.lat.toFixed(4)}°N, ${mouseCoords.lng.toFixed(4)}°E` : ""
              }`
            : mouseCoords
            ? `Tọa độ: ${mouseCoords.lat.toFixed(4)}°N, ${mouseCoords.lng.toFixed(4)}°E`
            : "Thời tiết & Không khí TP.HCM"
        }
        style={{
          position: "absolute",
          bottom: 20,
          left: 16,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(12px)",
          borderRadius: 24,
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e2e8f0",
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: "#0f172a",
          cursor: "default",
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
        <span>{liveWeather ? liveWeather.temp : "28°C"}</span>
        <span style={{ color: "#cbd5e1" }}>•</span>
        <span style={{ color: liveWeather && liveWeather.aqi > 100 ? "#ea580c" : "#059669" }}>
          AQI {liveWeather ? liveWeather.aqi : 42} ({liveWeather ? liveWeather.aqiStatus : "Tốt"})
        </span>
      </div>

      {/* 5. TOUR NHANH ĐỊA DANH GÓC DƯỚI Ở GIỮA */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 8px",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(12px)",
          borderRadius: 24,
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e2e8f0",
          maxWidth: "85vw",
          overflowX: "auto",
          scrollbarWidth: "none",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", paddingLeft: 4, whiteSpace: "nowrap" }}>
          Tour:
        </span>
        {landmarks.map((loc) => (
          <button
            key={loc.id}
            onClick={() => handleSelectLandmark(loc)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 9px",
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              background: "#f8fafc",
              color: "#334155",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#0f172a";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.color = "#334155";
            }}
          >
            <span>{loc.icon || "📍"}</span>
            <span>{loc.name}</span>
          </button>
        ))}
      </div>

      {/* BẢN ĐỒ MAPLIBRE CHÍNH */}
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 106.7025,
          latitude: 10.7745,
          zoom: 14,
          pitch: 50,
          bearing: -15,
        }}
        interactiveLayerIds={showFloodWatch ? ["flood-segments-core", "flood-segments-glow", "flood-corridor-main", "flood-corridor-glow"] : ["flood-corridor-main", "flood-corridor-glow"]}
        onClick={(e) => {
          setContextMenu(null);
          handleMapClick(e);
        }}
        onContextMenu={(e) => {
          e.originalEvent.preventDefault();
          setContextMenu({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            x: e.point.x,
            y: e.point.y,
          });
        }}
        onMove={(e) => {
          setCurrentZoom(e.viewState.zoom);
        }}
        onMoveEnd={(e) => {
          const lat = e.viewState.latitude;
          const lng = e.viewState.longitude;
          setMapCenter({
            lat,
            lng,
          });
          setCurrentZoom(e.viewState.zoom);
          if (autoFetchPOI && e.viewState.zoom >= 10) {
            handleLoadNearbyPOIs(lat, lng, poiType, false);
          }
        }}
        onMouseMove={(e) => {
          // Throttle state update to prevent massive re-rendering
          const now = Date.now();
          if (now - lastMouseMoveRef.current > 75) {
            setMouseCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
            lastMouseMoveRef.current = now;

            if (showFloodWatch) {
              let floodFeat: any = null;
              if (e.features && e.features.length > 0) {
                floodFeat = e.features.find(
                  (f: any) =>
                    f.layer?.id === "flood-segments-core" ||
                    f.layer?.id === "flood-segments-glow"
                );
              }
              if (floodFeat && floodFeat.properties) {
                setHoveredFloodSegment({
                  properties: floodFeat.properties,
                  lngLat: [e.lngLat.lng, e.lngLat.lat],
                });
              } else if (hoveredFloodSegment) {
                setHoveredFloodSegment(null);
              }
            }
          }
        }}
        style={{ width: "100%", height: "100%", cursor: loadingReverse ? "wait" : hoveredFloodSegment ? "pointer" : "default" }}
        mapStyle={MAP_STYLES[activeStyle].url as any}
      >
        <NavigationControl position="bottom-right" />
        <FullscreenControl position="bottom-right" />

        {/* 1. LỚP TÒA NHÀ 3D ĐA SẮC RỰC RỠ (3D COLORFUL ARCHITECTURAL EXTRUSIONS) */}
        {is3D && (activeStyle === "voyager" || activeStyle === "dark") && (
          <Layer
            id="3d-buildings-extrusion"
            source="carto"
            source-layer="building"
            type="fill-extrusion"
            minzoom={13}
            paint={{
              "fill-extrusion-color": BUILDING_COLOR_THEMES[building3DTheme].expression,
              "fill-extrusion-height": ["coalesce", ["get", "render_height"], 16],
              "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
              "fill-extrusion-opacity": activeStyle === "dark" ? 0.88 : 0.92,
              "fill-extrusion-vertical-gradient": true,
            }}
          />
        )}

        {/* 2. LỚP RANH GIỚI CÁC QUẬN / HUYỆN TP.HCM (GeoJSON Polygons từ API) */}
        {showDistricts && districtBoundaries && (
          <Source id="hcm-districts" type="geojson" data={districtBoundaries}>
            <Layer
              id="districts-fill"
              type="fill"
              paint={{
                "fill-color": ["get", "color"],
                "fill-opacity": 0.15,
              }}
            />
            <Layer
              id="districts-border"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": 2.5,
                "line-dasharray": [3, 1],
              }}
            />
          </Source>
        )}

        {/* 2.5. LỚP ĐOẠN ĐƯỜNG NGẬP LỤT & TRIỀU CƯỜNG (FLOODED ROAD CORRIDORS - VẼ TRỰC TIẾP LÊN LÒNG ĐƯỜNG) */}
        {floodCorridorsGeoJSON.features.length > 0 && (
          <Source id="flood-corridors-source" type="geojson" data={floodCorridorsGeoJSON}>
            {/* Lớp 1: Hào quang phát sáng tỏa rộng dưới mặt đường */}
            <Layer
              id="flood-corridor-glow"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#38bdf8",
                "line-width": 18,
                "line-opacity": 0.45,
                "line-blur": 3,
              }}
            />
            {/* Lớp 2: Vệt nước ngập xanh cyan đậm đà chạy dọc lòng đường */}
            <Layer
              id="flood-corridor-main"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#0284c7",
                "line-width": 8.5,
                "line-opacity": 0.92,
              }}
            />
            {/* Lớp 3: Đường vân sóng nước màu trắng chuyển động */}
            <Layer
              id="flood-corridor-wave"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#ffffff",
                "line-width": 2,
                "line-dasharray": [2, 3],
                "line-opacity": 0.85,
              }}
            />
          </Source>
        )}

        {/* 2.6 LỚP BẢN ĐỒ NHIỆT THỜI TIẾT & MÔI TRƯỜNG (MapLibre Heatmap Layers) */}
        {activeHeatmap === "temperature" && weatherHeatmapData && (
          <Source id="weather-temp-heatmap-source" type="geojson" data={weatherHeatmapData}>
            <Layer
              id="weather-temp-heatmap"
              type="heatmap"
              paint={{
                "heatmap-weight": [
                  "interpolate",
                  ["linear"],
                  ["get", "temperature"],
                  18, 0.1,
                  24, 0.35,
                  28, 0.6,
                  32, 0.85,
                  38, 1.0,
                ],
                "heatmap-intensity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  3, 1.2,
                  7, 2.0,
                  12, 3.2,
                ],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(59, 130, 246, 0)",
                  0.12, "rgba(6, 182, 212, 0.5)",
                  0.28, "rgba(16, 185, 129, 0.7)",
                  0.48, "rgba(234, 179, 8, 0.8)",
                  0.70, "rgba(249, 115, 22, 0.9)",
                  1.0, "rgba(239, 68, 68, 0.95)",
                ],
                "heatmap-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  3, 90,
                  6, 160,
                  10, 240,
                  14, 320,
                ],
                "heatmap-opacity": 0.82,
              }}
            />
            <Layer
              id="weather-temp-points"
              type="circle"
              minzoom={6}
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6, 4,
                  11, 10,
                ],
                "circle-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "temperature"],
                  18, "#3b82f6",
                  25, "#10b981",
                  30, "#eab308",
                  34, "#f97316",
                  38, "#ef4444",
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
                "circle-opacity": 0.9,
              }}
            />
          </Source>
        )}

        {activeHeatmap === "aqi" && weatherHeatmapData && (
          <Source id="weather-aqi-heatmap-source" type="geojson" data={weatherHeatmapData}>
            <Layer
              id="weather-aqi-heatmap"
              type="heatmap"
              paint={{
                "heatmap-weight": [
                  "interpolate",
                  ["linear"],
                  ["get", "aqi"],
                  0, 0.1,
                  50, 0.3,
                  100, 0.55,
                  150, 0.8,
                  200, 1.0,
                ],
                "heatmap-intensity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  3, 0.7,
                  8, 1.5,
                  13, 2.8,
                ],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(16, 185, 129, 0)",
                  0.2, "rgba(16, 185, 129, 0.65)",
                  0.45, "rgba(234, 179, 8, 0.75)",
                  0.65, "rgba(249, 115, 22, 0.85)",
                  0.85, "rgba(239, 68, 68, 0.9)",
                  1.0, "rgba(147, 51, 234, 0.95)",
                ],
                "heatmap-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  3, 30,
                  7, 65,
                  11, 110,
                  15, 160,
                ],
                "heatmap-opacity": 0.75,
              }}
            />
            <Layer
              id="weather-aqi-points"
              type="circle"
              minzoom={6}
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6, 4,
                  11, 10,
                ],
                "circle-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "aqi"],
                  0, "#10b981",
                  50, "#eab308",
                  100, "#f97316",
                  150, "#ef4444",
                  200, "#9333ea",
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
                "circle-opacity": 0.9,
              }}
            />
          </Source>
        )}

        {activeHeatmap === "risk" && (
          <Source id="incident-risk-heatmap-source" type="geojson" data={incidentRiskGeoJSON}>
            <Layer
              id="incident-risk-heatmap"
              type="heatmap"
              paint={{
                "heatmap-weight": ["get", "weight"],
                "heatmap-intensity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  4, 0.8,
                  9, 1.8,
                  14, 3.0,
                ],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(254, 240, 138, 0)",
                  0.2, "rgba(234, 179, 8, 0.6)",
                  0.5, "rgba(249, 115, 22, 0.8)",
                  0.8, "rgba(239, 68, 68, 0.9)",
                  1.0, "rgba(185, 28, 28, 0.95)",
                ],
                "heatmap-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  4, 25,
                  8, 55,
                  12, 100,
                ],
                "heatmap-opacity": 0.8,
              }}
            />
          </Source>
        )}

        {/* 2.6. LỚP BÔI MÀU CÁC ĐOẠN ĐƯỜNG BỊ NGẬP LỤT (Vector LineString GeoJSON) */}
        {showFloodWatch && floodRoadSegmentsGeoJSON && (
          <Source id="flood-segments-source" type="geojson" data={floodRoadSegmentsGeoJSON}>
            {/* Lớp hào quang phát sáng mờ phía dưới (Glow / Water Depth Halo) */}
            <Layer
              id="flood-segments-glow"
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round",
              }}
              paint={{
                "line-color": ["get", "glow_color"],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10, 6,
                  13, 12,
                  15, 18,
                  18, 26,
                ],
                "line-blur": 3,
                "line-opacity": 0.85,
              }}
            />

            {/* Lớp tim đường ngập chính rõ nét (Core Crispy Line) */}
            <Layer
              id="flood-segments-core"
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round",
              }}
              paint={{
                "line-color": ["get", "color"],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10, 2.5,
                  13, 5.5,
                  15, 8,
                  18, 12,
                ],
                "line-opacity": 0.95,
              }}
            />

            {/* Lớp viền trắng nét đứt nổi bật khi đoạn đường được chọn */}
            {selectedFloodSpot && (
              <Layer
                id="flood-selected-segment-highlight"
                type="line"
                filter={["==", ["get", "spot_id"], selectedFloodSpot.id]}
                layout={{
                  "line-join": "round",
                  "line-cap": "round",
                }}
                paint={{
                  "line-color": "#ffffff",
                  "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 3.5,
                    13, 7,
                    15, 10,
                    18, 14,
                  ],
                  "line-opacity": 0.9,
                  "line-dasharray": [2, 1.5],
                }}
              />
            )}
          </Source>
        )}

        {/* 3. LỚP VẼ TUYẾN ĐƯỜNG THỰC TẾ OSRM (Glowing Route Polyline) */}
        {activeRoute && (
          <>
            <Source id="osrm-route-source" type="geojson" data={{ type: "Feature", properties: {}, geometry: activeRoute.geometry }}>
              {/* Đường viền phát sáng mờ ngoài */}
              <Layer
                id="route-casing"
                type="line"
                layout={{ "line-join": "round", "line-cap": "round" }}
                paint={{
                  "line-color": "#60a5fa",
                  "line-width": 10,
                  "line-opacity": 0.5,
                }}
              />
              {/* Đường lộ trình chính */}
              <Layer
                id="route-line"
                type="line"
                layout={{ "line-join": "round", "line-cap": "round" }}
                paint={{
                  "line-color": "#2563eb",
                  "line-width": 5,
                }}
              />
            </Source>

            {/* Marker cờ xuất phát */}
            {activeRoute.startCoords && (
              <Marker longitude={activeRoute.startCoords[0]} latitude={activeRoute.startCoords[1]} anchor="bottom">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
                  <div style={{ background: "#059669", color: "#ffffff", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                    🚩 Xuất phát
                  </div>
                  <div style={{ fontSize: 18 }}>📍</div>
                </div>
              </Marker>
            )}

            {/* Marker cờ đích đến */}
            {activeRoute.destCoords && (
              <Marker longitude={activeRoute.destCoords[0]} latitude={activeRoute.destCoords[1]} anchor="bottom">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
                  <div style={{ background: "#dc2626", color: "#ffffff", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                    🏁 {activeRoute.destName || "Đích đến"}
                  </div>
                  <div style={{ fontSize: 18 }}>🏁</div>
                </div>
              </Marker>
            )}
          </>
        )}

        {/* 4. MARKER VỊ TRÍ CLICK BẢN ĐỒ (Google Maps Drop Pin) */}
        {clickedAddress && (
          <Marker longitude={clickedAddress.lng} latitude={clickedAddress.lat} anchor="bottom">
            <div
              style={{
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: "translateY(2px)",
                transition: "transform 0.2s ease",
              }}
              title={clickedAddress.placeName || "Vị trí đã chọn"}
            >
              {/* Google Maps Drop Pin SVG */}
              <svg width="24" height="30" viewBox="0 0 24 30" fill="none" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" }}>
                <path
                  d="M12 0C5.37 0 0 5.37 0 12C0 19.5 12 30 12 30C12 30 24 19.5 24 12C24 5.37 18.63 0 12 0Z"
                  fill="#ea4335"
                />
                <circle cx="12" cy="11" r="5" fill="#ffffff" />
                <circle cx="12" cy="11" r="2.5" fill="#b91c1c" />
              </svg>

              {/* Text label: chỉ hiện khi zoom sát (>= 15.5) với viền trắng halo Google Maps */}
              {currentZoom >= 15.5 && (
                <span
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#b91c1c",
                    textShadow: "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 1px 3px rgba(0,0,0,0.2)",
                    maxWidth: 100,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    pointerEvents: "none",
                  }}
                >
                  {clickedAddress.houseNumber ? `Số ${clickedAddress.houseNumber}` : "Vị trí đã chọn"}
                </span>
              )}
            </div>
          </Marker>
        )}

        {/* 5. HỆ THỐNG MARKER SINH THÁI TP.HCM (Điểm nổi bật thu nhỏ gọn như Google Maps) */}
        {filteredLocations.map((loc) => {
          const cfg = getCategoryConfig(loc.category);
          const isSelected = selectedLocation?.id === loc.id;
          const isHovered = hoveredEcoId === loc.id;
          
          let markerColor = cfg.color;
          let isWarning = loc.status === "pending" || loc.status === "warning";
          
          if (loc.category === "flood") {
            if (loc.severityLevel === "IMPASSABLE" || loc.severityLevel === "SEVERE") {
              markerColor = "#dc2626";
              isWarning = true;
            } else if (loc.severityLevel === "MODERATE") {
              markerColor = "#ea580c";
              isWarning = true;
            } else if (loc.severityLevel === "MINOR") {
              markerColor = "#f59e0b";
              isWarning = true;
            } else {
              markerColor = "#0284c7";
            }
          }

          // Kích thước pin biến đổi theo mức zoom (nhỏ gọn như Google Maps)
          const pinSize = currentZoom < 13.5 ? 18 : currentZoom < 15.5 ? 22 : 26;
          const iconSize = currentZoom < 13.5 ? 10 : currentZoom < 15.5 ? 12 : 14;

          return (
            <Marker
              key={loc.id}
              longitude={loc.longitude}
              latitude={loc.latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleSelectEcoLocation(loc);
              }}
            >
              <div
                onMouseEnter={() => setHoveredEcoId(loc.id)}
                onMouseLeave={() => setHoveredEcoId(null)}
                style={{
                  position: "relative",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transform: isSelected ? "scale(1.25)" : isHovered ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  zIndex: isSelected ? 30 : isHovered ? 25 : 10,
                }}
              >
                {/* Radar ping nếu có cảnh báo */}
                {isWarning && currentZoom >= 13 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: pinSize + 12,
                      height: pinSize + 12,
                      borderRadius: "50%",
                      backgroundColor: markerColor,
                      opacity: 0.38,
                      animation: "radarPing 1.8s infinite",
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Chấm tròn pin Google Maps */}
                <div
                  style={{
                    width: pinSize,
                    height: pinSize,
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    border: `2px solid ${markerColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isSelected
                      ? `0 0 0 4px ${markerColor}44, 0 6px 16px rgba(0,0,0,0.3)`
                      : isHovered
                      ? `0 3px 10px rgba(0,0,0,0.25)`
                      : `0 2px 6px rgba(0,0,0,0.18)`,
                    fontSize: iconSize,
                    color: markerColor,
                  }}
                >
                  {cfg.icon}
                </div>

                {/* Đỉnh nhọn pin phía dưới */}
                <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `5px solid ${markerColor}`, marginTop: -1 }} />

                {/* Badge độ sâu ngập nếu có */}
                {loc.category === "flood" && loc.metricValue && loc.severityLevel && loc.severityLevel !== "SAFE" && (
                  <div
                    style={{
                      position: "absolute",
                      top: -8,
                      right: -12,
                      background: markerColor,
                      color: "#ffffff",
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "1px 5px",
                      borderRadius: 8,
                      border: "1.5px solid #ffffff",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {loc.metricValue.split(" ")[0]}cm
                  </div>
                )}

                {/* Tooltip khi hover */}
                {isHovered && !isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%) translateY(-6px)",
                      backgroundColor: "rgba(15, 23, 42, 0.92)",
                      backdropFilter: "blur(6px)",
                      color: "#ffffff",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                      pointerEvents: "none",
                      zIndex: 60,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>{cfg.icon}</span>
                    <span>{loc.name}</span>
                  </div>
                )}

                {/* Nhãn chữ phong cách Google Maps khi zoom gần */}
                {currentZoom >= 15.5 && (
                  <span
                    style={{
                      marginTop: 2,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: markerColor,
                      textShadow: "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 1px 2px rgba(0,0,0,0.15)",
                      maxWidth: 85,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      lineHeight: 1.2,
                      textAlign: "center",
                    }}
                  >
                    {loc.name}
                  </span>
                )}
              </div>
            </Marker>
          );
        })}

        {/* 6. HỆ THỐNG MARKER QUÁN XÁ & SỐ NHÀ TẢI TỰ ĐỘNG QUA LIVE API (Level of Detail Google Maps) */}
        {currentZoom >= 10 &&
          livePOIs.map((poi) => {
            const isSelected = selectedPOI?.id === poi.id;
            const isHovered = hoveredPoiId === poi.id;

            // Màu chủ đề theo danh mục POI giống Google Maps
            const categoryTheme: Record<string, { bg: string; color: string }> = {
              cafe: { bg: "#ea580c", color: "#ffffff" },
              restaurant: { bg: "#e11d48", color: "#ffffff" },
              shop: { bg: "#2563eb", color: "#ffffff" },
              address: { bg: "#475569", color: "#ffffff" },
              amenity: { bg: "#059669", color: "#ffffff" },
            };
            const theme = categoryTheme[poi.category] || { bg: "#ea580c", color: "#ffffff" };

            // Kích thước pin theo mức zoom (LOD phong cách Google Maps)
            const isVeryLowZoom = currentZoom < 12;
            const isLowZoom = currentZoom >= 12 && currentZoom < 13.5;
            const isHighZoom = currentZoom >= 15.5;
            const dotSize = isHighZoom ? 22 : isLowZoom ? 12 : isVeryLowZoom ? 9 : 17;
            const iconSize = isHighZoom ? 11 : isLowZoom ? 0 : isVeryLowZoom ? 0 : 8.5;
            const showIcon = currentZoom >= 13.5;

            return (
              <Marker
                key={poi.id}
                longitude={poi.longitude}
                latitude={poi.latitude}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handleSelectLivePOI(poi);
                }}
              >
                <div
                  onMouseEnter={() => setHoveredPoiId(poi.id)}
                  onMouseLeave={() => setHoveredPoiId(null)}
                  style={{
                    position: "relative",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    transform: isSelected ? "scale(1.25)" : isHovered ? "scale(1.15)" : "scale(1)",
                    transition: "transform 0.2s ease",
                    zIndex: isSelected ? 40 : isHovered ? 30 : 15,
                  }}
                >
                  {/* Chấm tròn nhỏ gọn phong cách Google Maps */}
                  <div
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: "50%",
                      backgroundColor: theme.bg,
                      color: theme.color,
                      border: "1.5px solid #ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isSelected
                        ? `0 0 0 3px ${theme.bg}55, 0 4px 10px rgba(0,0,0,0.3)`
                        : isHovered
                        ? "0 3px 8px rgba(0,0,0,0.25)"
                        : "0 1.5px 4px rgba(0,0,0,0.2)",
                      fontSize: iconSize,
                    }}
                  >
                    {showIcon && <span>{poi.icon}</span>}
                  </div>

                  {/* Tooltip khi hover */}
                  {isHovered && !isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%) translateY(-6px)",
                        backgroundColor: "rgba(15, 23, 42, 0.92)",
                        backdropFilter: "blur(6px)",
                        color: "#ffffff",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                        pointerEvents: "none",
                        zIndex: 60,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>{poi.icon}</span>
                      <span>{poi.houseNumber ? `Số ${poi.houseNumber}` : poi.name}</span>
                    </div>
                  )}

                  {/* Chữ viền trắng Google Maps (Chỉ hiện khi zoom sát >= 15.5) */}
                  {isHighZoom && (
                    <span
                      style={{
                        marginTop: 2,
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#1e293b",
                        textShadow: "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 1px 2px rgba(0,0,0,0.15)",
                        maxWidth: 85,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        lineHeight: 1.2,
                        textAlign: "center",
                      }}
                    >
                      {poi.houseNumber ? `Số ${poi.houseNumber}` : poi.name}
                    </span>
                  )}
                </div>
              </Marker>
            );
          })}

        {/* 6.5. HỆ THỐNG MARKER ĐIỂM ĐEN NGẬP LỤT ĐÔ THỊ (3 NGUỒN TÍCH HỢP) */}
        {showFloodWatch &&
          floodData &&
          floodData.features.map((feat) => {
            const [fLng, fLat] = feat.geometry.coordinates;
            const p = feat.properties;
            const isSelected = selectedFloodSpot?.id === p.id;
            const isCritical = p.current_risk_level === "CRITICAL";
            const isWarning = p.current_risk_level === "WARNING";
            const isAlert = p.current_risk_level === "ALERT";

            const pinColor = isCritical
              ? "#ef4444"
              : isWarning
              ? "#f97316"
              : isAlert
              ? "#eab308"
              : "#0284c7";

            const pinBg = isCritical
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : isWarning
              ? "linear-gradient(135deg, #f97316, #ea580c)"
              : isAlert
              ? "linear-gradient(135deg, #facc15, #ca8a04)"
              : "linear-gradient(135deg, #38bdf8, #0284c7)";

            const iconSymbol = isCritical ? "🚨" : isWarning ? "🌊" : isAlert ? "⚠️" : "💧";

            return (
              <Marker
                key={feat.id}
                longitude={fLng}
                latitude={fLat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handleSelectFloodSpot(p, [fLng, fLat]);
                }}
              >
                <div
                  style={{
                    position: "relative",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    transform: isSelected ? "scale(1.25)" : "scale(1)",
                    transition: "all 0.25s ease",
                    zIndex: isSelected ? 50 : isCritical ? 45 : 20,
                  }}
                  title={`${p.name} - ${p.current_risk_label}`}
                >
                  {/* Hiệu ứng sóng lan tỏa cảnh báo ngập nếu mức độ cao */}
                  {(isCritical || isWarning) && (
                    <div
                      style={{
                        position: "absolute",
                        top: 2,
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: isCritical ? "rgba(239, 68, 68, 0.4)" : "rgba(249, 115, 22, 0.35)",
                        animation: "radarPing 1.8s infinite ease-out",
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* Huy hiệu độ sâu nổi bật */}
                  <div
                    style={{
                      background: pinBg,
                      color: isAlert ? "#0f172a" : "#ffffff",
                      padding: "3px 8px",
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 800,
                      boxShadow: isSelected
                        ? `0 0 0 3px #ffffff, 0 4px 14px ${pinColor}`
                        : "0 3px 8px rgba(0,0,0,0.25)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      border: "1.5px solid #ffffff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span>{iconSymbol}</span>
                    <span>{p.estimated_depth_cm > 0 ? `${p.estimated_depth_cm}cm` : "An toàn"}</span>
                  </div>

                  {/* Chóp nhọn ghim bản đồ */}
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: `6px solid ${pinColor}`,
                      marginTop: -1,
                    }}
                  />

                  {/* Tên đường khi zoom gần */}
                  {currentZoom >= 13.5 && (
                    <span
                      style={{
                        marginTop: 2,
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: "#0f172a",
                        textShadow: "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff",
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                      }}
                    >
                      {p.street}
                    </span>
                  )}
                </div>
              </Marker>
            );
          })}

        {/* 7. MARKER ĐỊNH VỊ GPS THỜI GIAN THỰC (RADAR HALO & VÒNG BÁN KÍNH SAI SỐ) */}
        {gpsCoords && (
          <Marker longitude={gpsCoords.lng} latitude={gpsCoords.lat} anchor="center">
            <div
              style={{
                position: "relative",
                width: 46,
                height: 46,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              {/* Vòng lan tỏa sóng radar chính xác cao */}
              <div
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: isLocked ? "rgba(16, 185, 129, 0.28)" : "rgba(14, 165, 233, 0.25)",
                  border: isLocked ? "2px solid #10b981" : "2px solid #38bdf8",
                  animation: "radarPing 2s infinite ease-out",
                }}
              />
              {/* Vòng hào quang tĩnh */}
              <div
                style={{
                  position: "absolute",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: isLocked ? "rgba(16, 185, 129, 0.25)" : "rgba(14, 165, 233, 0.2)",
                }}
              />
              {/* Tâm chấm GPS neon */}
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: isLocked ? "#10b981" : "#0284c7",
                  boxShadow: isLocked ? "0 0 14px #10b981" : "0 0 12px #0284c7",
                  border: "2.5px solid #ffffff",
                  zIndex: 2,
                }}
              />
            </div>
          </Marker>
        )}
        {/* Popup chi tiết trạm quan trắc khi click trên bản đồ nhiệt */}
        {selectedHeatmapStation && (
          <Popup
            longitude={selectedHeatmapStation.geometry.coordinates[0]}
            latitude={selectedHeatmapStation.geometry.coordinates[1]}
            anchor="bottom"
            onClose={() => setSelectedHeatmapStation(null)}
            closeOnClick={false}
          >
            <div style={{ padding: "6px 8px", minWidth: 210, fontFamily: "sans-serif" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                  📍 {selectedHeatmapStation.properties.city}
                </span>
                <span style={{ fontSize: 10, background: "#f1f5f9", padding: "2px 6px", borderRadius: 6, color: "#64748b" }}>
                  {selectedHeatmapStation.properties.region}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                <div style={{ background: "#f8fafc", padding: "6px 8px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10, color: "#64748b" }}>🌡️ Nhiệt độ</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#ea580c" }}>
                    {selectedHeatmapStation.properties.temperature}°C
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{selectedHeatmapStation.properties.desc}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "6px 8px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10, color: "#64748b" }}>💨 Chỉ số AQI</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: selectedHeatmapStation.properties.aqi > 100 ? "#dc2626" : "#059669" }}>
                    {selectedHeatmapStation.properties.aqi}
                  </div>
                  <div style={{ fontSize: 10, color: selectedHeatmapStation.properties.aqi > 100 ? "#dc2626" : "#059669" }}>
                    {selectedHeatmapStation.properties.aqiStatus}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", borderTop: "1px solid #f1f5f9", paddingTop: 4 }}>
                <span>💧 Độ ẩm: {selectedHeatmapStation.properties.humidity}%</span>
                <span>🌬️ Gió: {selectedHeatmapStation.properties.wind} km/h</span>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                Bụi mịn PM2.5: {selectedHeatmapStation.properties.pm25} µg/m³
              </div>
            </div>
          </Popup>
        )}

        {/* Popup hiển thị thông tin đoạn đường ngập khi di chuột qua (Hover Tooltip) */}
        {showFloodWatch && hoveredFloodSegment && !selectedFloodSpot && (
          <Popup
            longitude={hoveredFloodSegment.lngLat[0]}
            latitude={hoveredFloodSegment.lngLat[1]}
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            offset={[0, -10]}
          >
            <div style={{ padding: "4px 6px", minWidth: 200, fontFamily: "sans-serif" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: hoveredFloodSegment.properties.color }}>
                  🌊 {hoveredFloodSegment.properties.name}
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: hoveredFloodSegment.properties.color,
                    color: "#ffffff",
                  }}
                >
                  {hoveredFloodSegment.properties.risk_level}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#475569" }}>
                {hoveredFloodSegment.properties.risk_label}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                <span>Độ sâu: <strong style={{ color: hoveredFloodSegment.properties.color }}>{hoveredFloodSegment.properties.estimated_depth_cm} cm</strong></span>
                <span>Dài: {hoveredFloodSegment.properties.length_m}m</span>
              </div>
              <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 2, fontStyle: "italic" }}>
                👉 Nhấp vào đường để mở chi tiết 3 nguồn & lộ trình tránh
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Floating Heatmap Legend (Thước đo chú giải bản đồ nhiệt) */}
      {activeHeatmap !== "none" && (
        <div
          style={{
            position: "absolute",
            bottom: 58,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            background: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(226, 232, 240, 0.85)",
            borderRadius: 16,
            padding: "8px 16px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            pointerEvents: "auto",
            maxWidth: "92vw",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{activeHeatmap === "temperature" ? "🌡️" : activeHeatmap === "aqi" ? "💨" : "🚨"}</span>
              <span>
                {activeHeatmap === "temperature"
                  ? "Bản đồ nhiệt độ thời tiết Việt Nam (°C)"
                  : activeHeatmap === "aqi"
                  ? "Bản đồ ô nhiễm không khí (US AQI & PM2.5)"
                  : "Bản đồ mật độ rủi ro sự cố môi trường"}
              </span>
            </span>
            <button
              onClick={() => setActiveHeatmap("none")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
                fontSize: 14,
                padding: "2px 6px",
                borderRadius: 6,
              }}
              title="Đóng bản đồ nhiệt"
            >
              ✕
            </button>
          </div>

          {/* Thanh gradient dải màu */}
          <div
            style={{
              width: 320,
              height: 10,
              borderRadius: 999,
              background:
                activeHeatmap === "temperature"
                  ? "linear-gradient(to right, #3b82f6, #10b981, #eab308, #f97316, #ef4444)"
                  : activeHeatmap === "aqi"
                  ? "linear-gradient(to right, #10b981, #eab308, #f97316, #ef4444, #9333ea)"
                  : "linear-gradient(to right, #fef08a, #eab308, #f97316, #ef4444, #991b1b)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
            }}
          />

          {/* Mức giá trị */}
          <div style={{ display: "flex", justifyContent: "space-between", width: 320, fontSize: 10, fontWeight: 600, color: "#64748b" }}>
            {activeHeatmap === "temperature" ? (
              <>
                <span style={{ color: "#2563eb" }}>≤ 18°C (Mát)</span>
                <span>25°C</span>
                <span>30°C</span>
                <span>34°C</span>
                <span style={{ color: "#dc2626" }}>≥ 38°C (Nóng gắt)</span>
              </>
            ) : activeHeatmap === "aqi" ? (
              <>
                <span style={{ color: "#059669" }}>0-50 (Tốt)</span>
                <span style={{ color: "#ca8a04" }}>51-100 (TB)</span>
                <span style={{ color: "#ea580c" }}>101-150 (Kém)</span>
                <span style={{ color: "#dc2626" }}>151-200 (Xấu)</span>
                <span style={{ color: "#7e22ce" }}>200+ (Nguy hại)</span>
              </>
            ) : (
              <>
                <span style={{ color: "#ca8a04" }}>Rủi ro thấp</span>
                <span style={{ color: "#ea580c" }}>Trung bình</span>
                <span style={{ color: "#dc2626" }}>Báo động</span>
                <span style={{ color: "#991b1b" }}>Khẩn cấp</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 7.5. HUY HIỆU THANG ĐO CHIỀU CAO TÒA NHÀ 3D (GÓC DƯỚI BÊN PHẢI) */}
      {is3D && (activeStyle === "voyager" || activeStyle === "dark") && activeHeatmap === "none" && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 58,
            zIndex: 30,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: 12,
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 5,
            fontSize: 11,
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontWeight: 700, color: "#1e293b" }}>
              🏢 {BUILDING_COLOR_THEMES[building3DTheme].icon} {BUILDING_COLOR_THEMES[building3DTheme].name}
            </span>
            <span style={{ fontSize: 9.5, color: "#94a3b8" }}>3D Vector</span>
          </div>
          <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 1 }}>
            {BUILDING_COLOR_THEMES[building3DTheme].colors.map((c, idx) => (
              <div key={idx} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#64748b", gap: 8 }}>
            <span>Thấp (0-15m)</span>
            <span>TB (30m)</span>
            <span>Cao ốc (70m+)</span>
            <span>Tháp (150m+)</span>
          </div>
        </div>
      )}

      {/* 7.6. WIDGET GIÁM SÁT NGẬP LỤT ĐÔ THỊ THỜI GIAN THỰC (3 NGUỒN TÍCH HỢP) */}
      {showFloodWatch && floodData && activeHeatmap === "none" && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 16,
            zIndex: 25,
            background: "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
            border: "1px solid #e2e8f0",
            maxWidth: 380,
            width: "calc(100vw - 32px)",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* Header Widget */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>🌊</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
                Giám Sát Ngập Lụt Đô Thị (3 Nguồn)
              </span>
            </div>
            <button
              onClick={() => setShowFloodWatch(false)}
              style={{
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 13,
                padding: "2px 4px",
              }}
              title="Tạm ẩn lớp ngập lụt"
            >
              ✕
            </button>
          </div>

          {/* Dãy nhãn thống kê cấp độ rủi ro */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, textAlign: "center" }}>
            <div style={{ background: "#fee2e2", padding: "4px 2px", borderRadius: 6, border: "1px solid #fca5a5" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>{floodData.summary.criticalCount}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: "#991b1b" }}>Nguy cấp</div>
            </div>
            <div style={{ background: "#ffedd5", padding: "4px 2px", borderRadius: 6, border: "1px solid #fdba74" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#ea580c" }}>{floodData.summary.warningCount}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: "#c2410c" }}>Cảnh báo</div>
            </div>
            <div style={{ background: "#fef9c3", padding: "4px 2px", borderRadius: 6, border: "1px solid #fde047" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#ca8a04" }}>{floodData.summary.alertCount}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: "#a16207" }}>Cảnh giác</div>
            </div>
            <div style={{ background: "#e0f2fe", padding: "4px 2px", borderRadius: 6, border: "1px solid #7dd3fc" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0284c7" }}>{floodData.summary.safeCount}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: "#0369a1" }}>An toàn</div>
            </div>
          </div>

          {/* Dữ liệu đo đạc thực tế */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569", background: "#f8fafc", padding: "6px 10px", borderRadius: 8 }}>
            <span>🌧️ Mưa đo được: <strong style={{ color: "#0f172a" }}>{floodData.summary.currentRainfallMm} mm/h</strong></span>
            <span>🌊 GloFAS: <strong style={{ color: "#0f172a" }}>{Math.round(floodData.summary.saigonRiverDischargeM3s).toLocaleString()} m³/s</strong></span>
          </div>

          {/* Thông tin dải màu đoạn đường ngập */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 10.5,
              color: "#0369a1",
              background: "rgba(2, 132, 199, 0.08)",
              padding: "5px 8px",
              borderRadius: 8,
              border: "1px solid rgba(2, 132, 199, 0.15)",
            }}
          >
            <span>🛣️ <strong>{floodData.road_segments?.length || 30} đoạn đường ngập</strong> được bôi màu</span>
            <span style={{ fontSize: 9.5, color: "#64748b" }}>Nhấp để xem</span>
          </div>

          {/* Thanh kích hoạt kiểm thử mưa (Simulation Trigger) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
              <span>🧪 <strong>Thử nghiệm kích hoạt mưa:</strong></span>
              {simulatedRainfallMm !== null && (
                <button
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
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setSimulatedRainfallMm(0)}
                style={{
                  flex: 1,
                  padding: "4px 2px",
                  borderRadius: 6,
                  border: simulatedRainfallMm === 0 ? "1px solid #0284c7" : "1px solid #e2e8f0",
                  background: simulatedRainfallMm === 0 ? "#e0f2fe" : "#ffffff",
                  color: simulatedRainfallMm === 0 ? "#0369a1" : "#475569",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ☀️ 0mm (Tạnh)
              </button>
              <button
                onClick={() => setSimulatedRainfallMm(25)}
                style={{
                  flex: 1,
                  padding: "4px 2px",
                  borderRadius: 6,
                  border: simulatedRainfallMm === 25 ? "1px solid #f97316" : "1px solid #e2e8f0",
                  background: simulatedRainfallMm === 25 ? "#ffedd5" : "#ffffff",
                  color: simulatedRainfallMm === 25 ? "#c2410c" : "#475569",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🌧️ 25mm (Vừa)
              </button>
              <button
                onClick={() => setSimulatedRainfallMm(55)}
                style={{
                  flex: 1,
                  padding: "4px 2px",
                  borderRadius: 6,
                  border: simulatedRainfallMm === 55 ? "1px solid #ef4444" : "1px solid #e2e8f0",
                  background: simulatedRainfallMm === 55 ? "#fee2e2" : "#ffffff",
                  color: simulatedRainfallMm === 55 ? "#b91c1c" : "#475569",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ⛈️ 55mm (Ngập to)
              </button>
            </div>
          </div>

          {/* Nút Tra cứu GloFAS tại GPS */}
          <button
            onClick={() => handleInspectGpsGloFAS()}
            disabled={loadingGpsGloFAS}
            style={{
              width: "100%",
              padding: "7px",
              borderRadius: 8,
              border: "1px solid #0284c7",
              background: "#f0f9ff",
              color: "#0369a1",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span>🎯</span>
            <span>{loadingGpsGloFAS ? "Đang tra cứu vệ tinh..." : "Tra cứu rủi ro lũ GloFAS tại vị trí của tôi"}</span>
          </button>
        </div>
      )}

      {/* 7.7. MODAL XEM CHI TIẾT DỰ BÁO LŨ GLOFAS 7 NGÀY (OPEN-METEO FLOOD API) */}
      {showGloFASModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            pointerEvents: "auto",
          }}
          onClick={() => setShowGloFASModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 20 }}>🛰️</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                    Dự Báo Thủy Văn & Rủi Ro Lũ Lụt GloFAS
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Nguồn: Open-Meteo Global Flood API (Copernicus Emergency Management)
                </div>
              </div>
              <button
                onClick={() => setShowGloFASModal(false)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            {loadingGpsGloFAS ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🛰️</div>
                <div>Đang kết nối Open-Meteo GloFAS toàn cầu...</div>
              </div>
            ) : gpsGloFAS ? (
              <div>
                {/* Banner trạng thái nguy cơ */}
                <div
                  style={{
                    background:
                      gpsGloFAS.flood_danger_level === "CRITICAL"
                        ? "#fee2e2"
                        : gpsGloFAS.flood_danger_level === "WARNING"
                        ? "#ffedd5"
                        : gpsGloFAS.flood_danger_level === "ALERT"
                        ? "#fef9c3"
                        : "#e0f2fe",
                    color:
                      gpsGloFAS.flood_danger_level === "CRITICAL"
                        ? "#b91c1c"
                        : gpsGloFAS.flood_danger_level === "WARNING"
                        ? "#c2410c"
                        : gpsGloFAS.flood_danger_level === "ALERT"
                        ? "#a16207"
                        : "#0369a1",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{gpsGloFAS.flood_danger_label}</span>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>
                    {gpsGloFAS.current_discharge_m3s.toLocaleString()} m³/s
                  </span>
                </div>

                {/* Thông tin lưu vực */}
                <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                    🌊 <strong>Lưu vực:</strong> {gpsGloFAS.river_name}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    📍 Tọa độ tra cứu: {gpsGloFAS.latitude.toFixed(4)}°N, {gpsGloFAS.longitude.toFixed(4)}°E
                  </div>
                </div>

                {/* Bảng & Biểu đồ dự báo 7 ngày */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                    Dự báo lưu lượng dòng chảy sông ngòi (7 Ngày tới):
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 110, background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
                    {gpsGloFAS.forecast_7d.map((d, i) => {
                      const maxBar = 6000;
                      const h = Math.min(80, Math.max(14, (d.discharge / maxBar) * 80));
                      const isHigh = d.discharge > 3500;
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 8.5, fontWeight: 700, color: isHigh ? "#dc2626" : "#0284c7" }}>
                            {Math.round(d.discharge)}
                          </span>
                          <div
                            style={{
                              width: "100%",
                              height: h,
                              background: isHigh
                                ? "linear-gradient(to top, #ef4444, #dc2626)"
                                : "linear-gradient(to top, #38bdf8, #0284c7)",
                              borderRadius: "4px 4px 0 0",
                            }}
                          />
                          <span style={{ fontSize: 9.5, color: "#64748b", fontWeight: 600 }}>
                            {d.date.split("-")[2]}/{d.date.split("-")[1]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chú giải khoa học */}
                <div style={{ fontSize: 10.5, color: "#64748b", lineHeight: 1.4, background: "#f1f5f9", padding: "8px 12px", borderRadius: 8 }}>
                  💡 <strong>GloFAS (Global Flood Awareness System):</strong> Hệ thống giám sát lũ lụt toàn cầu do Trung tâm Dự báo Hạn vừa Châu Âu (ECMWF) và Ủy ban Châu Âu phát triển, sử dụng vệ tinh viễn thám để mô phỏng lưu lượng dòng chảy và dự báo sớm nguy cơ ngập lụt trước 7-15 ngày.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Hiệu ứng Animation CSS */}
      <style>{`
        @keyframes radarPing {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* 8. CHẾ ĐỘ RADAR KHÍ TƯỢNG ĐỘNG (LIVE PARTICLE STREAMLINES & THERMAL RADAR) */}
      {showLiveRadar && (
        <LiveWeatherRadarMap
          onClose={() => setShowLiveRadar(false)}
          initialOverlay={liveRadarOverlay}
          userGps={gpsCoords}
        />
      )}

      {/* 9. Context Menu (Right Click) Báo Cáo Ngập Lụt */}
      {contextMenu && (
        <div
          style={{
            position: "absolute",
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: "#1e293b",
            color: "white",
            padding: "12px",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            zIndex: 1000,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid #38bdf8",
          }}
          onClick={async (e) => {
            e.stopPropagation();
            const success = await reportFloodAPI(contextMenu.lat, contextMenu.lng, 35);
            setContextMenu(null);
            if (success) {
              alert("Báo cáo ngập lụt thành công! Hệ thống đang tải lại bản đồ...");
              setRefreshTrigger((prev) => prev + 1);
            }
          }}
        >
          <span className="material-symbols-outlined text-blue-400">flood</span>
          <span className="font-semibold text-sm">Báo cáo đoạn đường này đang ngập</span>
        </div>
      )}
    </div>
  );
}

export default EcoMap;
