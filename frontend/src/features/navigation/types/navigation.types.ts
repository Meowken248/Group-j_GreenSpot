/**
 * TypeScript Interfaces & Types for Flood-Aware Navigation Routing (STT 41).
 * Strictly typed contracts for all 4 screens.
 */

export type VehicleCategory = 'MOTORBIKE' | 'CAR' | 'BICYCLE' | 'WASTE_TRUCK';

export interface VehicleOption {
  type: VehicleCategory;
  name: string;
  icon: string;
  thresholdCm: number;
  description: string;
}

export interface GeoLocationPoint {
  name: string;
  latitude: number;
  longitude: number;
}

export interface FloodHazardDetail {
  hazard_id: string;
  street_name: string;
  latitude: number;
  longitude: number;
  predicted_depth_cm: number;
  water_level_display: string;
  severity_level: 'MINOR' | 'MODERATE' | 'SEVERE' | 'IMPASSABLE';
  distance_from_origin_meters?: number;
  is_blocker_for_vehicle?: boolean;
}

export interface RouteTurnStep {
  step_number: number;
  instruction: string;
  distance_meters: number;
  duration_seconds: number;
  street_name: string;
  maneuver: string;
  avoid_reason?: string | null;
}

export interface NavigationRoutePlan {
  route_id: string;
  route_type: 'FASTEST' | 'SAFEST';
  duration_minutes: number;
  distance_km: number;
  duration_formatted: string;
  hazard_count: number;
  max_depth_cm: number;
  status: 'CLEAR' | 'CAUTION' | 'AVOID' | 'IMPASSABLE';
  coordinates: [number, number][]; // [lng, lat]
  turn_steps: RouteTurnStep[];
  hazards_on_route: FloodHazardDetail[];
  avoided_hazards: FloodHazardDetail[];
}

export interface DualRouteResponse {
  origin: GeoLocationPoint;
  destination: GeoLocationPoint;
  vehicle_type: VehicleCategory;
  vehicle_threshold_cm: number;
  fastest_route: NavigationRoutePlan;
  safest_route: NavigationRoutePlan;
  all_clear: boolean;
  all_flooded: boolean;
  summary_message?: string | null;
  advisory_recommendation?: string | null;
}

export interface EarlyWarningAlert {
  has_hazard_ahead: boolean;
  hazard?: FloodHazardDetail | null;
  distance_ahead_meters?: number | null;
  alert_title: string;
  alert_message?: string | null;
  water_level_display?: string | null;
  voice_announcement?: string | null;
  suggested_reroute_available: boolean;
}

export type ScreenStep = 1 | 2 | 3 | 4;
