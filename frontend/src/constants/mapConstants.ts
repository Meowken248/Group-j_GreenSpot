import type { Coordinates } from "../types/map";

export const CACHE_KEY = "greenspot_last_gps_v1";

// Vị trí fallback mặc định: TP. Hồ Chí Minh
export const DEFAULT_FALLBACK_LOCATION: Coordinates = {
  lat: 10.7769,
  lng: 106.7009,
};

// Cụm máy chủ gạch bản đồ Google Maps và OpenStreetMap chính hãng
export const TILE_URLS = {
  google_roadmap: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  google_hybrid: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  google_traffic: "https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}",
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};

// Dark theme tinh chỉnh hiện đại cho Google Maps JavaScript SDK
export const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#14532d" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4ade80" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#e2e8f0" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#0f766e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#134e4a" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#99f6e4" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0c4a6e" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }],
  },
];

// SVG Icon tùy biến cho vị trí GPS người dùng với hiệu ứng radar glow
export const createGpsMarkerIcon = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#10b981" flood-opacity="0.9"/>
        </filter>
      </defs>
      <circle cx="18" cy="18" r="14" fill="#10b981" fill-opacity="0.25" stroke="#10b981" stroke-width="2"/>
      <circle cx="18" cy="18" r="7" fill="#10b981" filter="url(#glow)"/>
      <circle cx="18" cy="18" r="3" fill="#ffffff"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
