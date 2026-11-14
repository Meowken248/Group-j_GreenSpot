export interface QRScanPayload {
  code: string;
  user_lat?: number;
  user_lng?: number;
}

export interface QRScanResult {
  success: boolean;
  title: string;
  location_name: string;
  point_reward: number;
  message: string;
  scanned_at: string;
  new_total_points: number;
  distance_meters?: number | null;
}

export interface QRCodeDetail {
  code: string;
  title: string;
  location_name: string;
  point_reward: number;
  qr_type: string;
  lat: number;
  lng: number;
  max_distance_meters?: number;
  is_active?: boolean;
  description?: string | null;
  created_at?: string | null;
}

export interface QRCodeCreatePayload {
  code: string;
  title: string;
  location_name: string;
  point_reward: number;
  qr_type: string;
  lat: number;
  lng: number;
  max_distance_meters?: number;
  description?: string;
}

export interface QRCodeListResult {
  items: QRCodeDetail[];
  total: number;
  page: number;
  limit: number;
}

