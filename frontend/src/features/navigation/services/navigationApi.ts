/**
 * API Service for Flood-Aware Navigation Routing (STT 41).
 * Communicates with backend endpoints and provides audio/TTS synthesis helpers.
 */

import type {
  DualRouteResponse,
  EarlyWarningAlert,
  GeoLocationPoint,
  NavigationRoutePlan,
  VehicleCategory,
} from '../types/navigation.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchRouteAutocomplete(query: string): Promise<GeoLocationPoint[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/navigation/autocomplete?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) throw new Error('Failed to fetch autocomplete');
    return await res.json();
  } catch (err) {
    console.warn('Fallback to local locations for autocomplete', err);
    return [
      { name: `${query} (TP.HCM)`, latitude: 10.7769, longitude: 106.7009 },
      { name: 'Chợ Bến Thành, Quận 1', latitude: 10.7725, longitude: 106.698 },
      { name: 'Landmark 81, Bình Thạnh', latitude: 10.7951, longitude: 106.7218 },
    ];
  }
}

export async function calculateDualRoutesAPI(
  origin: GeoLocationPoint,
  destination: GeoLocationPoint,
  vehicleType: VehicleCategory
): Promise<DualRouteResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/navigation/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      vehicle_type: vehicleType,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Không thể tính toán tuyến đường an toàn');
  }

  return await res.json();
}

export async function checkEarlyWarningAPI(
  curLat: number,
  curLng: number,
  routeCoords: [number, number][],
  vehicleType: VehicleCategory
): Promise<EarlyWarningAlert> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/navigation/early-warning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_latitude: curLat,
        current_longitude: curLng,
        route_coordinates: routeCoords,
        vehicle_type: vehicleType,
      }),
    });
    if (!res.ok) throw new Error('Early warning check failed');
    return await res.json();
  } catch (err) {
    return {
      has_hazard_ahead: false,
      alert_title: 'CẢNH BÁO NGẬP',
      suggested_reroute_available: true,
    };
  }
}

export async function rerouteAvoidingFloodAPI(
  currLoc: GeoLocationPoint,
  destination: GeoLocationPoint,
  vehicleType: VehicleCategory,
  hazardId?: string
): Promise<NavigationRoutePlan> {
  const res = await fetch(`${API_BASE_URL}/api/v1/navigation/reroute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_location: currLoc,
      destination,
      vehicle_type: vehicleType,
      avoid_hazard_id: hazardId,
    }),
  });

  if (!res.ok) {
    throw new Error('Không thể tái định tuyến tránh ngập');
  }

  return await res.json();
}

/**
 * Phát âm thanh còi báo động / Bíp bíp bằng Web Audio API
 */
export function playEmergencyBeep(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.3);

    gain1.gain.setValueAtTime(0.35, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start();
    osc1.stop(ctx.currentTime + 0.5);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

/**
 * Giọng đọc AI tiếng Việt (SpeechSynthesis)
 */
export function speakVietnamese(text: string): void {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.startsWith('vi'));
    if (viVoice) {
      utterance.voice = viVoice;
    }
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('SpeechSynthesis error', err);
  }
}
