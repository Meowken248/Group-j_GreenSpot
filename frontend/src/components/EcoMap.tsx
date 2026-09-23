import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Map, { NavigationControl, FullscreenControl, Marker, Source, Layer, type MapRef } from "react-map-gl/maplibre";
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
  reportFloodAPI,
  type LiveWeatherResponse,
} from "../services/ecoApiService";
import { useFastGeolocation } from "../hooks/useFastGeolocation";

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

type StyleKey = keyof typeof MAP_STYLES;

function EcoMap() {
  const mapRef = useRef<MapRef>(null);

  // Hook GPS siêu tốc
  const { coords: gpsCoords, refreshGps } = useFastGeolocation();

  // States bản đồ & bộ lọc (Mặc định dùng Google Maps Tile Cluster)
  const [activeStyle, setActiveStyle] = useState<StyleKey>("googleRoadmap");
  const [is3D, setIs3D] = useState<boolean>(true);
  const [showDistricts, setShowDistricts] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<EcoCategory | "all">("all");
  
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

    // Định kỳ 3 phút tự động làm mới thời tiết & AQI
    const timer = setInterval(() => {
      fetchLiveWeatherAPI().then((data) => {
        if (data) setLiveWeather(data);
      });
    }, 180000);

    return () => clearInterval(timer);
  }, []);

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
  const handleLoadNearbyPOIs = useCallback(async (lat: number, lng: number, type: "all" | "cafe" | "restaurant" | "shop" = poiType) => {
    setLoadingPOIs(true);
    const pois = await fetchNearbyPOIsAPI(lat, lng, type);
    
    setLivePOIs((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const newItems = pois.filter((p) => !existingIds.has(p.id));
      return [...newItems, ...prev].slice(0, 80);
    });
    setLoadingPOIs(false);
  }, [poiType]);

  // Tự động nạp quán xá khi người dùng kéo bản đồ (Auto-fetch on move)
  useEffect(() => {
    if (!autoFetchPOI) return;

    const timer = setTimeout(() => {
      handleLoadNearbyPOIs(mapCenter.lat, mapCenter.lng, poiType);
    }, 600);

    return () => clearTimeout(timer);
  }, [mapCenter, autoFetchPOI, poiType, handleLoadNearbyPOIs]);

  // 1. TÍNH NĂNG CLICK BẢN ĐỒ LẤY SỐ NHÀ (REVERSE GEOCODING) HOẶC CLICK VÀO ĐOẠN ĐƯỜNG NGẬP
  const handleMapClick = async (e: any) => {
    // Nếu click vào đoạn đường ngập
    if (e.features && e.features.length > 0) {
      const f = e.features.find((feat: any) => feat.layer.id === "flood-corridor-main" || feat.layer.id === "flood-corridor-glow");
      if (f && f.properties && f.properties.id) {
        const found = ecoLocations.find((l) => l.id === f.properties.id);
        if (found) {
          handleSelectEcoLocation(found);
          return;
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
  const handleCalculateRoute = async (destLng: number, destLat: number) => {
    setCalculatingRoute(true);
    // Tính toán từ vị trí tâm bản đồ hoặc điểm click đến đích
    const startLng = clickedAddress ? clickedAddress.lng : mapCenter.lng;
    const startLat = clickedAddress ? clickedAddress.lat : mapCenter.lat;

    const route = await getRouteOSRM(startLng, startLat, destLng, destLat);
    if (route) {
      setActiveRoute(route);
      // Zoom vừa khít cả tuyến đường
      if (mapRef.current) {
        const boundsLng = [Math.min(startLng, destLng), Math.max(startLng, destLng)];
        const boundsLat = [Math.min(startLat, destLat), Math.max(startLat, destLat)];
        mapRef.current.fitBounds(
          [
            [boundsLng[0] - 0.01, boundsLat[0] - 0.01],
            [boundsLng[1] + 0.01, boundsLat[1] + 0.01],
          ],
          { padding: 80, duration: 1500 }
        );
      }
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

  // Chọn địa danh Quick Tour
  const handleSelectLandmark = (loc: HCMLocation) => {
    setSelectedLocation(null);
    setSelectedPOI(null);
    setClickedAddress(null);
    setContextMenu(null);
    handleFlyToLocation(loc.longitude, loc.latitude, loc.zoom, loc.pitch, loc.bearing);
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
      
      {/* 1. THANH TÌM KIẾM ĐỊA ĐIỂM / QUÁN XÁ / SỐ NHÀ TOÀN TP.HCM */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 25,
          width: 370,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: 16,
            padding: "9px 14px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.85)",
          }}
        >
          <span style={{ fontSize: 16, marginRight: 8, opacity: 0.7 }}>
            {isSearchingLive ? "⏳" : "🔍"}
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
                background: "rgba(0,0,0,0.06)",
                borderRadius: "50%",
                width: 22,
                height: 22,
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Menu kết quả tìm kiếm */}
        {isSearchFocused && searchQuery.trim().length > 0 && (
          <div
            style={{
              marginTop: 8,
              background: "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderRadius: 16,
              boxShadow: "0 14px 40px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.85)",
              maxHeight: 380,
              overflowY: "auto",
              padding: "6px",
            }}
          >
            {liveSearchResults.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#f97316", padding: "4px 10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ⚡ Quán xá & Số nhà thực tế (OSM):
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
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(249, 115, 22, 0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 18 }}>{poi.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                        {poi.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        📍 {poi.fullAddress}
                      </div>
                    </div>
                    {poi.houseNumber && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#c2410c",
                          background: "#ffedd5",
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
                  🌱 Địa điểm môi trường EcoReport:
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
                        borderRadius: 10,
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ fontSize: 18 }}>{cat.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{loc.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{loc.district} • {loc.address}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. THANH TIỆN ÍCH NẠP QUÁN XÁ & BỘ LỌC + RANH GIỚI QUẬN (Bên trái) */}
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 16,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: "430px",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Hàng 1: Nút nạp quán xá + Chế độ Tự nạp khi lướt + Nút Bật ranh giới quận */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => handleLoadNearbyPOIs(mapCenter.lat, mapCenter.lng, poiType)}
            disabled={loadingPOIs}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 14,
              border: "1px solid #ea580c",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: 700,
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
              transition: "all 0.2s ease",
            }}
          >
            <span>{loadingPOIs ? "⏳" : "⚡"}</span>
            <span>{loadingPOIs ? "Đang quét..." : "Nạp quán quanh đây"}</span>
            {livePOIs.length > 0 && (
              <span style={{ background: "#ffffff", color: "#ea580c", padding: "1px 5px", borderRadius: 8, fontSize: 10 }}>
                {livePOIs.length}
              </span>
            )}
          </button>

          {/* Toggle tự nạp */}
          <button
            onClick={() => setAutoFetchPOI(!autoFetchPOI)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 14,
              border: autoFetchPOI ? "1px solid #16a34a" : "1px solid rgba(255,255,255,0.8)",
              background: autoFetchPOI ? "#dcfce7" : "rgba(255, 255, 255, 0.9)",
              color: autoFetchPOI ? "#15803d" : "#475569",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              backdropFilter: "blur(12px)",
            }}
          >
            <span>{autoFetchPOI ? "🟢" : "⚪"}</span>
            <span>Tự nạp</span>
          </button>

          {/* Nút bật/tắt Ranh giới quận/huyện */}
          <button
            onClick={() => setShowDistricts(!showDistricts)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 14,
              border: showDistricts ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.8)",
              background: showDistricts ? "#eff6ff" : "rgba(255, 255, 255, 0.9)",
              color: showDistricts ? "#1d4ed8" : "#475569",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              backdropFilter: "blur(12px)",
            }}
          >
            <span>🗺️</span>
            <span>{showDistricts ? "Ẩn ranh giới" : "Ranh giới quận"}</span>
          </button>
        </div>

        {/* Hàng 1.5: Bộ lọc loại quán xá & tiện ích OSM */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", background: "rgba(255,255,255,0.75)", padding: "3px 6px", borderRadius: 12, backdropFilter: "blur(8px)", width: "fit-content" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginRight: 2 }}>Loại quán:</span>
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
                handleLoadNearbyPOIs(mapCenter.lat, mapCenter.lng, t.id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 7px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 10.5,
                fontWeight: poiType === t.id ? 700 : 500,
                background: poiType === t.id ? "#ea580c" : "transparent",
                color: poiType === t.id ? "#ffffff" : "#475569",
                transition: "all 0.15s ease",
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Hàng 2: Bộ lọc danh mục môi trường (Dữ liệu API) */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setSelectedCategory("all")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 9px",
              borderRadius: 12,
              border: selectedCategory === "all" ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: selectedCategory === "all" ? 700 : 500,
              background: selectedCategory === "all" ? "#10b981" : "rgba(255, 255, 255, 0.88)",
              color: selectedCategory === "all" ? "#ffffff" : "#334155",
              backdropFilter: "blur(12px)",
            }}
          >
            <span>🌐 Tất cả ({loadingEco ? "..." : categoryCounts.all})</span>
          </button>

          {(Object.keys(CATEGORY_CONFIG) as EcoCategory[]).map((catKey) => {
            const cfg = getCategoryConfig(catKey);
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 9px",
                  borderRadius: 12,
                  border: isSelected ? `1px solid ${cfg.color}` : "1px solid rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? cfg.color : "rgba(255, 255, 255, 0.88)",
                  color: isSelected ? "#ffffff" : "#334155",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.name} ({loadingEco ? "..." : categoryCounts[catKey]})</span>
              </button>
            );
          })}

          {/* Nút Chuyển Đổi Triều Cường Mô Phỏng để hiển thị rõ các đoạn đường ngập úng */}
          <button
            onClick={() => setSimulateFlood(!simulateFlood)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 12,
              border: simulateFlood ? "1px solid #0284c7" : "1px solid rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              background: simulateFlood
                ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                : "rgba(255, 255, 255, 0.88)",
              color: simulateFlood ? "#ffffff" : "#0369a1",
              boxShadow: simulateFlood ? "0 4px 14px rgba(2, 132, 199, 0.35)" : "none",
              backdropFilter: "blur(12px)",
              transition: "all 0.2s ease",
            }}
            title="Bật/Tắt hiển thị các đoạn đường ngập lụt theo mô phỏng triều cường đỉnh 1.68m"
          >
            <span>{simulateFlood ? "🌊 Triều đỉnh 1.68m (Đang ngập)" : "🌤️ Triều thực tế"}</span>
          </button>
        </div>
      </div>

      {/* 3. THANH ĐIỀU KHIỂN STYLE BẢN ĐỒ & 3D (Ở giữa phía trên) */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 15,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          background: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 999,
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.85)",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 6, borderRight: "1px solid rgba(0,0,0,0.08)" }}>
          <span style={{ fontSize: 18 }}>🌱</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#1b4332", letterSpacing: "-0.4px" }}>EcoReport</span>
          {MAP_STYLES[activeStyle].isGoogle && (
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#059669",
                padding: "2px 7px",
                borderRadius: 999,
                border: "1px solid rgba(16, 185, 129, 0.35)",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span>⚡</span> Google Cluster
            </span>
          )}
        </div>

        {/* Các nút chọn kiểu bản đồ */}
        <div style={{ display: "flex", gap: 3 }}>
          {(Object.keys(MAP_STYLES) as StyleKey[]).map((key) => {
            const item = MAP_STYLES[key];
            const isActive = activeStyle === key;
            const isGoogle = item.isGoogle;
            return (
              <button
                key={key}
                onClick={() => setActiveStyle(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  borderRadius: 20,
                  border: isGoogle && isActive ? "1px solid #10b981" : "none",
                  cursor: "pointer",
                  fontSize: 11.5,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive
                    ? (isGoogle ? "linear-gradient(135deg, #059669 0%, #10b981 100%)" : "#2d6a4f")
                    : "transparent",
                  color: isActive ? "#ffffff" : "#475569",
                  transition: "all 0.2s ease",
                  boxShadow: isActive ? "0 4px 12px rgba(16, 185, 129, 0.35)" : "none",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
                {isGoogle && (
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 800,
                      background: isActive ? "rgba(0,0,0,0.22)" : "rgba(16,185,129,0.12)",
                      color: isActive ? "#ffffff" : "#059669",
                      padding: "1px 4px",
                      borderRadius: 4,
                      marginLeft: 1,
                    }}
                  >
                    G
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Nút bật/tắt 3D */}
        <button
          onClick={toggle3DView}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 10px",
            borderRadius: 20,
            border: is3D ? "1px solid #10b981" : "1px solid #cbd5e1",
            cursor: "pointer",
            fontSize: 11.5,
            fontWeight: 700,
            background: is3D ? "linear-gradient(135deg, #059669 0%, #10b981 100%)" : "rgba(241, 245, 249, 0.8)",
            color: is3D ? "#ffffff" : "#64748b",
            transition: "all 0.2s ease",
            boxShadow: is3D ? "0 4px 12px rgba(16, 185, 129, 0.35)" : "none",
            marginLeft: 2,
          }}
        >
          <span>{is3D ? "🏢 3D" : "📐 2D"}</span>
        </button>

        {/* Nút định vị GPS siêu tốc */}
        <button
          onClick={() => {
            refreshGps();
            if (gpsCoords && mapRef.current) {
              mapRef.current.flyTo({
                center: [gpsCoords.lng, gpsCoords.lat],
                zoom: 16,
                pitch: is3D ? 58 : 0,
                duration: 1200,
              });
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 10px",
            borderRadius: 20,
            border: gpsCoords ? "1px solid #10b981" : "1px solid #cbd5e1",
            cursor: "pointer",
            fontSize: 11.5,
            fontWeight: 700,
            background: gpsCoords ? "rgba(16, 185, 129, 0.12)" : "rgba(241, 245, 249, 0.8)",
            color: gpsCoords ? "#059669" : "#64748b",
            transition: "all 0.2s ease",
            marginLeft: 2,
          }}
          title={gpsCoords ? `Vị trí GPS: ${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : "Đang tìm GPS..."}
        >
          <span>🎯 GPS</span>
        </button>
      </div>

      {/* 4. BẢNG THÔNG BÁO LỘ TRÌNH OSRM ROUTING (Góc trên bên phải) */}
      {activeRoute && (
        <div
          style={{
            position: "absolute",
            top: 76,
            right: 20,
            zIndex: 35,
            background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
            color: "#ffffff",
            borderRadius: 18,
            padding: "12px 18px",
            boxShadow: "0 12px 36px rgba(37, 99, 235, 0.35)",
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: "uppercase" }}>
              🚗 Lộ trình OSRM thực tế
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
              {activeRoute.distanceKm} km • ~{activeRoute.durationMin} phút di chuyển
            </div>
          </div>
          <button
            onClick={() => setActiveRoute(null)}
            style={{
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "#ffffff",
              borderRadius: "50%",
              width: 26,
              height: 26,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 5. THẺ CHI TIẾT ĐỊA ĐIỂM / QUÁN XÁ / VỊ TRÍ CLICK (Detail Card) */}
      {(selectedLocation || selectedPOI || clickedAddress) && (
        <div
          style={{
            position: "absolute",
            top: activeRoute ? 140 : 80,
            right: 20,
            zIndex: 30,
            width: 360,
            background: "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: 20,
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.85)",
            padding: "18px 20px",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {clickedAddress ? (
            /* Chi tiết vị trí người dùng vừa click trên bản đồ (Reverse Geocoding) */
            <div>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 26 }}>📍</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
                      Vị trí bạn đã bấm (Reverse Geocode)
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                      {clickedAddress.placeName}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setClickedAddress(null)}
                  style={{
                    border: "none",
                    background: "rgba(0,0,0,0.06)",
                    borderRadius: "50%",
                    width: 26,
                    height: 26,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
                {clickedAddress.houseNumber && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", marginBottom: 3 }}>
                    🏠 Số nhà: {clickedAddress.houseNumber}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#334155" }}>
                  📍 {clickedAddress.fullAddress}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleCalculateRoute(clickedAddress.lng, clickedAddress.lat)}
                  disabled={calculatingRoute}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "9px 14px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
                  }}
                >
                  <span>🧭</span> {calculatingRoute ? "Đang tính..." : "Vẽ đường đi OSRM"}
                </button>
                <button
                  onClick={() => alert(`Đã ghi nhận tọa độ ${clickedAddress.lat.toFixed(5)}, ${clickedAddress.lng.toFixed(5)} để gửi báo cáo sự cố!`)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 12,
                    border: "1px solid #10b981",
                    background: "#ecfdf5",
                    color: "#059669",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📢 Báo cáo tại đây
                </button>
              </div>
            </div>
          ) : selectedPOI ? (
            /* Chi tiết Quán xá / Số nhà từ Live API */
            <div>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 26 }}>{selectedPOI.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#ea580c", textTransform: "uppercase" }}>
                      {selectedPOI.categoryName}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                      {selectedPOI.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPOI(null)}
                  style={{
                    border: "none",
                    background: "rgba(0,0,0,0.06)",
                    borderRadius: "50%",
                    width: 26,
                    height: 26,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
                {selectedPOI.houseNumber && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#c2410c", marginBottom: 3 }}>
                    🏠 Số nhà: {selectedPOI.houseNumber}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#475569" }}>
                  📍 {selectedPOI.fullAddress}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleCalculateRoute(selectedPOI.longitude, selectedPOI.latitude)}
                  disabled={calculatingRoute}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "9px 14px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(234, 88, 12, 0.35)",
                  }}
                >
                  <span>🧭</span> {calculatingRoute ? "Đang tính..." : "Chỉ đường OSRM"}
                </button>
              </div>
            </div>
          ) : selectedLocation ? (
            /* Chi tiết Địa điểm Môi trường */
            <div>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{getCategoryConfig(selectedLocation.category).icon}</span>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: getCategoryConfig(selectedLocation.category).color }}>
                      {getCategoryConfig(selectedLocation.category).name}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                      {selectedLocation.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  style={{
                    border: "none",
                    background: "rgba(0,0,0,0.06)",
                    borderRadius: "50%",
                    width: 26,
                    height: 26,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: selectedLocation.category === "flood" && (selectedLocation.severityLevel === "SEVERE" || selectedLocation.severityLevel === "IMPASSABLE") ? "#fee2e2" : selectedLocation.category === "flood" && selectedLocation.severityLevel === "MODERATE" ? "#ffedd5" : "#f1f5f9",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: selectedLocation.category === "flood" && (selectedLocation.severityLevel === "SEVERE" || selectedLocation.severityLevel === "IMPASSABLE") ? "#dc2626" : selectedLocation.category === "flood" && selectedLocation.severityLevel === "MODERATE" ? "#c2410c" : "#334155",
                  marginBottom: 6
                }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: selectedLocation.category === "flood" && (selectedLocation.severityLevel === "SEVERE" || selectedLocation.severityLevel === "IMPASSABLE") ? "#dc2626" : getCategoryConfig(selectedLocation.category).color
                  }} />
                  {selectedLocation.statusText}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  📍 {selectedLocation.address} ({selectedLocation.district})
                </div>
              </div>

              {selectedLocation.category === "flood" ? (
                /* Card chuyên biệt cho Điểm Ngập & Triều Cường */
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}>
                    <div style={{ background: "#f0f9ff", borderRadius: 12, padding: "9px 12px", border: "1px solid #bae6fd" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>
                        Mức ngập dự báo
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#0c4a6e", marginTop: 2 }}>
                        {selectedLocation.metricValue}
                      </div>
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "9px 12px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Nguyên nhân chính
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                        {selectedLocation.causeDesc || "Triều cường đô thị"}
                      </div>
                    </div>
                  </div>

                  {/* Khả năng lưu thông phương tiện */}
                  <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase" }}>
                      Khả năng lưu thông:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>🛵 Xe máy:</span>
                        <span style={{ fontWeight: 700, color: selectedLocation.isImpassableBikes ? "#dc2626" : "#16a34a" }}>
                          {selectedLocation.isImpassableBikes ? "❌ Nguy cơ chết máy cao" : "✅ Lưu thông bình thường"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>🚗 Ô tô con:</span>
                        <span style={{ fontWeight: 700, color: selectedLocation.isImpassableCars ? "#dc2626" : "#16a34a" }}>
                          {selectedLocation.isImpassableCars ? "❌ Nguy cơ ngập gầm xe" : "✅ Lưu thông an toàn"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lời khuyên an toàn */}
                  <div style={{ background: "#fffbeb", borderRadius: 12, padding: "9px 12px", border: "1px solid #fef3c7", fontSize: 11.5, color: "#92400e", lineHeight: 1.4 }}>
                    ⚠️ {selectedLocation.description}
                  </div>
                </div>
              ) : (
                <div style={{ background: "#f8fafc", borderRadius: 14, padding: "10px 14px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                    {selectedLocation.metricLabel}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                    {selectedLocation.metricValue}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleCalculateRoute(selectedLocation.longitude, selectedLocation.latitude)}
                  disabled={calculatingRoute}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35)",
                  }}
                >
                  <span>🧭</span> {calculatingRoute ? "Đang tính..." : "Chỉ đường OSRM"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 6. BỘ ĐIỀU HƯỚNG "QUICK TOUR TP.HCM" */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 15,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 24,
          boxShadow: "0 10px 35px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          maxWidth: "92vw",
          overflowX: "auto",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#047857", whiteSpace: "nowrap" }}>
          ✨ Tour nhanh:
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {landmarks.map((loc) => (
            <button
              key={loc.id}
              onClick={() => handleSelectLandmark(loc)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 13px",
                borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.06)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                background: "rgba(255, 255, 255, 0.9)",
                color: "#1e293b",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              <span>{loc.icon || "📍"}</span>
              <span>{loc.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 7. WIDGET MÔI TRƯỜNG & CHỈ SỐ KHÔNG KHÍ TP.HCM (LIVE API) */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 20,
          zIndex: 15,
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(16px)",
          borderRadius: 18,
          padding: "12px 16px",
          boxShadow: "0 8px 28px rgba(0, 0, 0, 0.12)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          fontFamily: "'Inter', sans-serif",
          minWidth: 200,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            Khí hậu TP.HCM
          </span>
          <span style={{ fontSize: 9.5, color: "#059669", fontWeight: 700, background: "#ecfdf5", padding: "1px 5px", borderRadius: 6 }}>
            Trực tiếp API
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
              {liveWeather ? liveWeather.temp : "28°C"}
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              {liveWeather ? liveWeather.desc : "Nắng ấm ven sông"}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: liveWeather && liveWeather.aqi > 100 ? "#ea580c" : "#059669" }}>
                AQI {liveWeather ? liveWeather.aqi : 42}
              </span>
              <span style={{
                fontSize: 10,
                background: liveWeather && liveWeather.aqi > 100 ? "#ffedd5" : "#dcfce7",
                color: liveWeather && liveWeather.aqi > 100 ? "#c2410c" : "#15803d",
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: 6,
              }}>
                {liveWeather ? liveWeather.aqiStatus : "Tốt"}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: "#64748b" }}>
              {liveWeather ? `PM2.5: ${liveWeather.pm25} µg/m³` : "Chất lượng trong lành"}
            </div>
          </div>
          {liveWeather?.tide && (
            <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: liveWeather.tide.alert_level === "ALERT_3" ? "#dc2626" : liveWeather.tide.alert_level === "ALERT_2" ? "#ea580c" : liveWeather.tide.alert_level === "ALERT_1" ? "#f59e0b" : "#0284c7"
                }}>
                  🌊 {liveWeather.tide.water_level_m >= 0 ? `+${liveWeather.tide.water_level_m.toFixed(2)}m` : `${liveWeather.tide.water_level_m.toFixed(2)}m`}
                </span>
                <span style={{
                  fontSize: 9.5,
                  background: liveWeather.tide.alert_level === "NORMAL" ? "#e0f2fe" : "#fee2e2",
                  color: liveWeather.tide.alert_level === "NORMAL" ? "#0369a1" : "#dc2626",
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 6,
                }}>
                  {liveWeather.tide.state_label}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: "#64748b" }}>
                Trạm Phú An ({liveWeather.tide.alert_label})
              </div>
            </div>
          )}
        </div>
        {mouseCoords && (
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #f1f5f9", fontSize: 10.5, color: "#94a3b8", fontFamily: "monospace" }}>
            📍 {mouseCoords.lat.toFixed(4)}°N, {mouseCoords.lng.toFixed(4)}°E
          </div>
        )}
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
        onMoveEnd={(e) => {
          setMapCenter({
            lat: e.viewState.latitude,
            lng: e.viewState.longitude,
          });
        }}
        onMouseMove={(e) => {
          setMouseCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        }}
        style={{ width: "100%", height: "100%", cursor: loadingReverse ? "wait" : "default" }}
        interactiveLayerIds={["eco-points", "flood-corridor-main", "flood-corridor-glow"]}
        mapStyle={MAP_STYLES[activeStyle].url as any}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />

        {/* 1. LỚP TÒA NHÀ 3D */}
        {is3D && (activeStyle === "voyager" || activeStyle === "dark") && (
          <Layer
            id="3d-buildings-extrusion"
            source="carto"
            source-layer="building"
            type="fill-extrusion"
            minzoom={14}
            paint={{
              "fill-extrusion-color": activeStyle === "dark" ? "#1e293b" : "#e2e8f0",
              "fill-extrusion-height": ["coalesce", ["get", "render_height"], 18],
              "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
              "fill-extrusion-opacity": 0.85,
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
            {/* Lớp 2: Vệt nước ngập xanh cyan đậm đà chạy dọc lòng đường (giống hệt hình vẽ người dùng) */}
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

        {/* 3. LỚP VẼ TUYẾN ĐƯỜNG THỰC TẾ OSRM (Glowing Route Polyline) */}
        {activeRoute && (
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
        )}

        {/* 4. MARKER VỊ TRÍ CLICK BẢN ĐỒ (Reverse Geocode Pin) */}
        {clickedAddress && (
          <Marker longitude={clickedAddress.lng} latitude={clickedAddress.lat} anchor="bottom">
            <div style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  background: "#1d4ed8",
                  color: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  boxShadow: "0 4px 14px rgba(29, 78, 216, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                }}
              >
                <span>📍</span>
                <span>{clickedAddress.houseNumber ? `Số ${clickedAddress.houseNumber}` : "Vị trí đã chọn"}</span>
              </div>
              <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "6px solid #1d4ed8" }} />
            </div>
          </Marker>
        )}

        {/* 5. HỆ THỐNG MARKER SINH THÁI TP.HCM */}
        {filteredLocations.map((loc) => {
          const cfg = getCategoryConfig(loc.category);
          const isSelected = selectedLocation?.id === loc.id;
          
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

          return (
            <Marker
              key={loc.id}
              longitude={loc.longitude}
              latitude={loc.latitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleSelectEcoLocation(loc);
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
                  transition: "transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  zIndex: isSelected ? 25 : 5,
                }}
              >
                {isWarning && (
                  <div
                    style={{
                      position: "absolute",
                      top: 2,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: markerColor,
                      opacity: 0.4,
                      animation: "radarPing 1.8s infinite",
                    }}
                  />
                )}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    border: `2.5px solid ${markerColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isSelected
                      ? `0 0 0 4px ${markerColor}44, 0 6px 16px rgba(0,0,0,0.3)`
                      : `0 3px 10px rgba(0,0,0,0.15)`,
                    fontSize: 16,
                  }}
                >
                  {cfg.icon}
                </div>
                {loc.category === "flood" && loc.severityLevel && loc.severityLevel !== "SAFE" && (
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
                <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `6px solid ${markerColor}`, marginTop: -1 }} />
              </div>
            </Marker>
          );
        })}

        {/* 6. HỆ THỐNG MARKER QUÁN XÁ & SỐ NHÀ TẢI TỰ ĐỘNG QUA LIVE API */}
        {livePOIs.map((poi) => {
          const isSelected = selectedPOI?.id === poi.id;
          return (
            <Marker
              key={poi.id}
              longitude={poi.longitude}
              latitude={poi.latitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleSelectLivePOI(poi);
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
                  transition: "transform 0.2s ease",
                  zIndex: isSelected ? 30 : 10,
                }}
              >
                <div
                  style={{
                    padding: "4px 8px",
                    borderRadius: 14,
                    backgroundColor: isSelected ? "#ea580c" : "#ffffff",
                    border: isSelected ? "2px solid #ffffff" : "2px solid #f97316",
                    color: isSelected ? "#ffffff" : "#c2410c",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    boxShadow: "0 3px 10px rgba(234, 88, 12, 0.25)",
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>{poi.icon}</span>
                  <span>{poi.houseNumber ? `Số ${poi.houseNumber}` : poi.name}</span>
                </div>
                <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: isSelected ? "5px solid #ea580c" : "5px solid #f97316" }} />
              </div>
            </Marker>
          );
        })}

        {/* 7. MARKER ĐỊNH VỊ GPS THỜI GIAN THỰC (PULSE BEACON NEON XANH) */}
        {gpsCoords && (
          <Marker longitude={gpsCoords.lng} latitude={gpsCoords.lat} anchor="center">
            <div style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.35)",
                  border: "2px solid #10b981",
                  animation: "radarPing 1.8s infinite",
                }}
              />
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 12px #10b981",
                  border: "2px solid #ffffff",
                  zIndex: 2,
                }}
              />
            </div>
          </Marker>
        )}
      </Map>

      {/* Hiệu ứng Animation CSS */}
      <style>{`
        @keyframes radarPing {
          0% { transform: translateX(-50%) scale(0.8); opacity: 0.8; }
          100% { transform: translateX(-50%) scale(2.2); opacity: 0; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* 11. Context Menu (Right Click) Báo Cáo Ngập Lụt */}
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
            border: "1px solid #38bdf8"
          }}
          onClick={async (e) => {
            e.stopPropagation();
            const success = await reportFloodAPI(contextMenu.lat, contextMenu.lng, 35);
            setContextMenu(null);
            if (success) {
              alert("Báo cáo ngập lụt thành công! Hệ thống đang tải lại bản đồ...");
              setRefreshTrigger((prev) => prev + 1); // Tải lại bản đồ
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
