import { useEffect, useRef, type FC } from "react";
import L from "leaflet";

export type TileLayerType = "google_roadmap" | "google_hybrid" | "google_traffic" | "osm";

interface LeafletFallbackViewProps {
  coords: { lat: number; lng: number } | null;
  accuracy: number | null;
  showCircle: boolean;
  mapType: "roadmap" | "satellite";
  showTraffic: boolean;
  onMapReady?: (map: L.Map) => void;
}

const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };

// Các lớp bản đồ Google Maps và OSM chính hãng không có watermark và tốc độ cực nhanh
const TILE_URLS = {
  google_roadmap: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  google_hybrid: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  google_traffic: "https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}",
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};

export const LeafletFallbackView: FC<LeafletFallbackViewProps> = ({
  coords,
  accuracy,
  showCircle,
  mapType,
  showTraffic,
  onMapReady,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const coordsRef = useRef(coords);
  const accuracyRef = useRef(accuracy);
  const onMapReadyRef = useRef(onMapReady);
  const initialMapTypeRef = useRef(mapType);
  const initialShowTrafficRef = useRef(showTraffic);

  useEffect(() => {
    coordsRef.current = coords;
    accuracyRef.current = accuracy;
    onMapReadyRef.current = onMapReady;
  }, [coords, accuracy, onMapReady]);

  // Xác định URL tile dựa trên loại bản đồ và lớp giao thông
  const getActiveTileUrl = (type: "roadmap" | "satellite", traffic: boolean) => {
    if (traffic) return TILE_URLS.google_traffic;
    if (type === "satellite") return TILE_URLS.google_hybrid;
    return TILE_URLS.google_roadmap;
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialLat = coordsRef.current?.lat || DEFAULT_CENTER.lat;
    const initialLng = coordsRef.current?.lng || DEFAULT_CENTER.lng;
    const initialAccuracy = accuracyRef.current || 30;

    const map = L.map(containerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false, // Tắt watermark và attribution thừa
    });

    // Nạp lớp bản đồ Google Maps chính hãng trực tiếp qua Google Tile Cluster
    const initialUrl = getActiveTileUrl(initialMapTypeRef.current, initialShowTrafficRef.current);
    const tileLayer = L.tileLayer(initialUrl, {
      subdomains: ["0", "1", "2", "3"],
      maxZoom: 21,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Pulse Marker tùy biến với hiệu ứng radar neon xanh
    const pulseIcon = L.divIcon({
      className: "custom-leaflet-pulse-icon",
      html: `
        <div style="position: relative; width: 36px; height: 36px;">
          <div style="
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.35);
            border: 2px solid #10b981;
            animation: beacon-pulse 1.8s infinite;
          "></div>
          <div style="
            position: absolute;
            top: 11px;
            left: 11px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 12px #10b981;
            border: 2px solid #fff;
          "></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([initialLat, initialLng], { icon: pulseIcon }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([initialLat, initialLng], {
      radius: initialAccuracy,
      color: "#10b981",
      fillColor: "#10b981",
      fillOpacity: 0.15,
      weight: 1.5,
    }).addTo(map);
    circleRef.current = circle;

    mapRef.current = map;
    if (onMapReadyRef.current) onMapReadyRef.current(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Cập nhật lớp gạch bản đồ khi đổi kiểu (Vệ tinh / Bản đồ đường / Giao thông)
  useEffect(() => {
    if (!tileLayerRef.current || !mapRef.current) return;
    const targetUrl = getActiveTileUrl(mapType, showTraffic);
    tileLayerRef.current.setUrl(targetUrl);
  }, [mapType, showTraffic]);

  // Cập nhật vị trí GPS khi có tín hiệu mới
  useEffect(() => {
    if (!coords || !mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([coords.lat, coords.lng]);
    }

    if (circleRef.current) {
      circleRef.current.setLatLng([coords.lat, coords.lng]);
      if (accuracy) {
        circleRef.current.setRadius(accuracy);
      }
    }

    mapRef.current.panTo([coords.lat, coords.lng], { animate: true, duration: 0.8 });
  }, [coords, accuracy]);

  // Ẩn/hiện vòng tròn bán kính GPS
  useEffect(() => {
    if (!circleRef.current || !mapRef.current) return;
    if (showCircle) {
      circleRef.current.addTo(mapRef.current);
    } else {
      circleRef.current.remove();
    }
  }, [showCircle]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1, // Giữ z-index thấp để các control nổi lên trên
      }}
    />
  );
};

export default LeafletFallbackView;
