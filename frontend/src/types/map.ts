export interface Coordinates {
  lat: number;
  lng: number;
}

export type GpsAccuracyLevel = "high" | "medium" | "low" | "approximate";

export interface GeoLocationState {
  coords: Coordinates | null;
  accuracy: number | null;
  accuracyLevel: GpsAccuracyLevel;
  isLocating: boolean;
  isLocked: boolean;
  error: string | null;
  isFromCache: boolean;
  source: "gps" | "cache" | "network" | "fallback";
  gpsFixDurationMs: number | null;
  lastUpdated: number | null;
}

export type MapEngineType = "google" | "fallback";

export type MapBaseType = "roadmap" | "satellite" | "osm";

export interface MapMetrics {
  gpsFixDurationMs: number | null;
  coords: Coordinates | null;
  accuracy: number | null;
  isLocating: boolean;
  isFromCache: boolean;
  mapType: MapBaseType;
}
