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
  type LiveWeatherResponse,
} from "../services/ecoApiService";
import {
  useFastGeolocation,
  DEFAULT_FALLBACK_LOCATION,
  calculateDistanceMeters,
} from "../hooks/useFastGeolocation";

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
  }>({ all: 0, incident: 0, green_spot: 0, recycling: 0, sensor: 0 });
  const [loadingEco, setLoadingEco] = useState<boolean>(true);

  const [landmarks, setLandmarks] = useState<HCMLocation[]>([]);
  const [districtBoundaries, setDistrictBoundaries] = useState<FeatureCollection | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherResponse | null>(null);

  // 1. Tải danh sách địa điểm môi trường từ Backend API (PostgreSQL/PostGIS)
  useEffect(() => {
    let isMounted = true;
    setLoadingEco(true);
    fetchEcoLocationsAPI(selectedCategory === "all" ? undefined : selectedCategory).then((res) => {
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
  }, [selectedCategory]);

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

  // 1. TÍNH NĂNG CLICK BẢN ĐỒ LẤY SỐ NHÀ (REVERSE GEOCODING)
  const handleMapClick = async (e: any) => {
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
                  const cat = CATEGORY_CONFIG[loc.category];
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

        {/* Thẻ chi tiết Địa điểm / Quán xá / Vị trí click (Docked thanh lịch bên trái) */}
        {(selectedLocation || selectedPOI || clickedAddress) && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
              border: "1px solid #e2e8f0",
              padding: "16px",
            }}
          >
            {clickedAddress ? (
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
          {/* Nút bật/tắt Ranh giới quận/huyện */}
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
            <span>{showDistricts ? "Ẩn ranh giới" : "Ranh giới quận"}</span>
          </button>

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
        onClick={handleMapClick}
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
          if (now - lastMouseMoveRef.current > 100) {
            setMouseCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
            lastMouseMoveRef.current = now;
          }
        }}
        style={{ width: "100%", height: "100%", cursor: loadingReverse ? "wait" : "default" }}
        mapStyle={MAP_STYLES[activeStyle].url as any}
      >
        <NavigationControl position="bottom-right" />
        <FullscreenControl position="bottom-right" />

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
          const cfg = CATEGORY_CONFIG[loc.category];
          const isSelected = selectedLocation?.id === loc.id;
          const isHovered = hoveredEcoId === loc.id;
          const isWarning = loc.status === "pending" || loc.status === "warning";

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
                      backgroundColor: cfg.color,
                      opacity: 0.35,
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
                    border: `${pinSize >= 22 ? 2 : 1.5}px solid ${cfg.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isSelected
                      ? `0 0 0 3px ${cfg.color}55, 0 4px 12px rgba(0,0,0,0.3)`
                      : isHovered
                      ? `0 3px 10px rgba(0,0,0,0.25)`
                      : `0 2px 6px rgba(0,0,0,0.18)`,
                    fontSize: iconSize,
                    color: cfg.color,
                  }}
                >
                  {cfg.icon}
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
                      color: cfg.color,
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
      </Map>

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
    </div>
  );
}

export default EcoMap;
