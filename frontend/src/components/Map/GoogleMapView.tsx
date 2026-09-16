import { useEffect, useRef, useState, useCallback, type FC } from "react";
import { loadGoogleMaps, getMapsLoadDuration, onGoogleMapsAuthFailure } from "../../services/mapLoader";
import { useFastGeolocation } from "../../hooks/useFastGeolocation";
import type { MapEngineType, MapBaseType } from "../../types/map";
import {
  DARK_MAP_STYLES,
  DEFAULT_FALLBACK_LOCATION,
  createGpsMarkerIcon,
} from "../../constants/mapConstants";

import LeafletFallbackView from "./LeafletFallbackView";
import MapHeader from "./MapHeader";
import MapHud from "./MapHud";
import MapControls from "./MapControls";
import KeyAlertBanner from "./KeyAlertBanner";
import ConfigModal from "./ConfigModal";
import "./map.css";

export const GoogleMapView: FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const searchMarkerRef = useRef<google.maps.Marker | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  // Engine state (Google Maps SDK hoặc Google Tile Cluster)
  const [engine, setEngine] = useState<MapEngineType>("google");
  const [authFailed, setAuthFailed] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapLatency, setMapLatency] = useState<number | null>(null);
  const [mapType, setMapType] = useState<MapBaseType>("roadmap");
  const [showTraffic, setShowTraffic] = useState(false);
  const [showCircle, setShowCircle] = useState(true);

  // Hook định vị GPS siêu tốc song song
  const {
    coords,
    accuracy,
    isLocating,
    error: gpsError,
    isFromCache,
    gpsFixDurationMs,
    refreshGps,
  } = useFastGeolocation();

  const coordsRef = useRef(coords);
  const accuracyRef = useRef(accuracy);

  useEffect(() => {
    coordsRef.current = coords;
    accuracyRef.current = accuracy;
  }, [coords, accuracy]);

  // Lắng nghe sự kiện xác thực thất bại từ Google Maps Platform
  useEffect(() => {
    const unsub = onGoogleMapsAuthFailure(() => {
      setAuthFailed(true);
      setShowConfigModal(true);
    });
    return unsub;
  }, []);

  // Khởi tạo Google Maps SDK bất đồng bộ
  useEffect(() => {
    let isCancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (isCancelled || !mapContainerRef.current) return;

        const initialCenter = coordsRef.current || DEFAULT_FALLBACK_LOCATION;
        const initialAccuracy = accuracyRef.current || 25;
        setMapLatency(getMapsLoadDuration());

        const map = new maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 16,
          styles: DARK_MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: maps.ControlPosition.RIGHT_CENTER },
          gestureHandling: "greedy",
          mapTypeId: maps.MapTypeId.ROADMAP,
        });
        mapInstanceRef.current = map;

        // Pulse Marker vị trí GPS
        userMarkerRef.current = new maps.Marker({
          position: initialCenter,
          map,
          title: "Vị trí GPS của bạn",
          icon: {
            url: createGpsMarkerIcon(),
            scaledSize: new maps.Size(36, 36),
            anchor: new maps.Point(18, 18),
          },
          optimized: true,
          zIndex: 999,
        });

        // Vòng tròn độ chính xác GPS
        accuracyCircleRef.current = new maps.Circle({
          center: initialCenter,
          radius: initialAccuracy,
          map,
          fillColor: "#10b981",
          fillOpacity: 0.12,
          strokeColor: "#34d399",
          strokeOpacity: 0.4,
          strokeWeight: 1,
        });

        // Google Places Autocomplete
        if (searchInputRef.current && maps.places) {
          const autocomplete = new maps.places.Autocomplete(searchInputRef.current, {
            fields: ["geometry", "name", "formatted_address"],
          });
          autocomplete.bindTo("bounds", map);

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry?.location) return;

            map.panTo(place.geometry.location);
            map.setZoom(17);

            if (searchMarkerRef.current) {
              searchMarkerRef.current.setMap(null);
            }

            searchMarkerRef.current = new maps.Marker({
              map,
              position: place.geometry.location,
              title: place.name || "Địa điểm tìm kiếm",
              animation: maps.Animation.DROP,
            });
          });
        }

        setIsMapReady(true);
      })
      .catch((err) => {
        if (!isCancelled) {
          setLoadError(err.message || "Không thể tải Google Maps.");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Đồng bộ vị trí GPS vào Map
  useEffect(() => {
    if (!coords || !mapInstanceRef.current) return;
    const latLng = new google.maps.LatLng(coords.lat, coords.lng);

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(latLng);
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setCenter(latLng);
      if (accuracy) accuracyCircleRef.current.setRadius(accuracy);
    }

    mapInstanceRef.current.panTo(latLng);
  }, [coords, accuracy]);

  // Bật/tắt Vòng tròn bán kính
  useEffect(() => {
    if (accuracyCircleRef.current && mapInstanceRef.current) {
      accuracyCircleRef.current.setMap(showCircle ? mapInstanceRef.current : null);
    }
  }, [showCircle]);

  // Điều khiển chế độ bản đồ
  const toggleMapType = useCallback(() => {
    const nextType = mapType === "roadmap" ? "satellite" : "roadmap";
    setMapType(nextType);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(
        nextType === "satellite" ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP
      );
      if (nextType === "roadmap") {
        mapInstanceRef.current.setOptions({ styles: DARK_MAP_STYLES });
      } else {
        mapInstanceRef.current.setOptions({ styles: [] });
      }
    }
  }, [mapType]);

  // Điều khiển lớp giao thông
  const toggleTraffic = useCallback(() => {
    const nextTraffic = !showTraffic;
    setShowTraffic(nextTraffic);
    if (mapInstanceRef.current) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(nextTraffic ? mapInstanceRef.current : null);
    }
  }, [showTraffic]);

  // Định vị lại ngay lập tức
  const handleRecenter = useCallback(() => {
    if (coords && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(coords);
      mapInstanceRef.current.setZoom(17);
    }
    refreshGps();
  }, [coords, refreshGps]);

  return (
    <div className="map-wrapper">
      {/* Dynamic Engine */}
      {engine === "google" ? (
        <div ref={mapContainerRef} className="map-canvas-container" />
      ) : (
        <LeafletFallbackView
          coords={coords}
          accuracy={accuracy}
          showCircle={showCircle}
          mapType={mapType}
          showTraffic={showTraffic}
        />
      )}

      {/* Loading Overlay */}
      {engine === "google" && !isMapReady && !loadError && (
        <div className="map-loading-overlay">
          <div className="loader-spinner" />
          <div className="loading-text">Đang nạp Google Maps Pipeline...</div>
        </div>
      )}

      {/* Cảnh báo lỗi API Key */}
      {authFailed && (
        <KeyAlertBanner
          engine={engine}
          onToggleEngine={() => setEngine(engine === "google" ? "fallback" : "google")}
          onOpenGuide={() => setShowConfigModal(true)}
        />
      )}

      {/* Thanh Header Brand & Search */}
      <MapHeader engine={engine} searchInputRef={searchInputRef} />

      {/* Bảng HUD hiệu năng & GPS */}
      <MapHud
        engine={engine}
        coords={coords}
        accuracy={accuracy}
        isLocating={isLocating}
        isFromCache={isFromCache}
        gpsFixDurationMs={gpsFixDurationMs}
        mapLatency={mapLatency}
        gpsError={gpsError}
        loadError={loadError}
      />

      {/* Bộ nút điều khiển nổi */}
      <MapControls
        isLocating={isLocating}
        engine={engine}
        mapType={mapType}
        showTraffic={showTraffic}
        showCircle={showCircle}
        onRecenter={handleRecenter}
        onToggleEngine={() => setEngine(engine === "google" ? "fallback" : "google")}
        onToggleMapType={toggleMapType}
        onToggleTraffic={toggleTraffic}
        onToggleCircle={() => setShowCircle((prev) => !prev)}
      />

      {/* Modal hướng dẫn cấu hình Google Cloud */}
      {showConfigModal && (
        <ConfigModal
          onClose={() => setShowConfigModal(false)}
          onUseFallback={() => {
            setEngine("fallback");
            setShowConfigModal(false);
          }}
        />
      )}
    </div>
  );
};

export default GoogleMapView;
