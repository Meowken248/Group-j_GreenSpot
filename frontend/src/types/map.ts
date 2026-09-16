export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeoLocationState {
  coords: Coordinates | null;
  accuracy: number | null;
  isLocating: boolean;
  error: string | null;
  isFromCache: boolean;
  gpsFixDurationMs: number | null;
}

export type MapEngineType = "google" | "fallback";

export type MapBaseType = "roadmap" | "satellite";

export interface MapMetrics {
  mapLatency: number | null;
  gpsFixDurationMs: number | null;
  coords: Coordinates | null;
  accuracy: number | null;
  isLocating: boolean;
  isFromCache: boolean;
  engine: MapEngineType;
}
