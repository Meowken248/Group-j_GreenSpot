import { useState, useEffect, useCallback, useRef } from "react";
import type { GeoLocationState } from "../types/map";
import { CACHE_KEY, DEFAULT_FALLBACK_LOCATION } from "../constants/mapConstants";

export type { GeoLocationState };
export { DEFAULT_FALLBACK_LOCATION };

function getInitialState(): GeoLocationState {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.lat && parsed.lng) {
        return {
          coords: { lat: parsed.lat, lng: parsed.lng },
          accuracy: parsed.accuracy || 20,
          isLocating: true,
          error: null,
          isFromCache: true,
          gpsFixDurationMs: 0,
        };
      }
    }
  } catch {
    // Ignore cache read errors
  }

  return {
    coords: null,
    accuracy: null,
    isLocating: true,
    error: null,
    isFromCache: false,
    gpsFixDurationMs: null,
  };
}

export function useFastGeolocation() {
  const [state, setState] = useState<GeoLocationState>(getInitialState);
  const startTimeRef = useRef<number>(0);

  const fetchPosition = useCallback((forceFresh: boolean) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      queueMicrotask(() => {
        setState((prev) => ({
          ...prev,
          isLocating: false,
          error: "Trình duyệt không hỗ trợ Geolocation API.",
        }));
      });
      return;
    }

    startTimeRef.current = performance.now();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const duration = Math.round(performance.now() - startTimeRef.current);
        const { latitude, longitude, accuracy } = position.coords;
        const newCoords = { lat: latitude, lng: longitude };

        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ lat: latitude, lng: longitude, accuracy, timestamp: Date.now() })
          );
        } catch {
          // Ignore cache write errors
        }

        setState({
          coords: newCoords,
          accuracy: Math.round(accuracy),
          isLocating: false,
          error: null,
          isFromCache: false,
          gpsFixDurationMs: duration,
        });
      },
      (err) => {
        let msg = "Không thể lấy vị trí GPS.";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = "Bạn đã từ chối quyền truy cập vị trí. Vui lòng cấp quyền trong cài đặt trình duyệt.";
            break;
          case err.POSITION_UNAVAILABLE:
            msg = "Tín hiệu GPS/Vị trí không khả dụng.";
            break;
          case err.TIMEOUT:
            msg = "Quá thời gian chờ phản hồi GPS.";
            break;
        }

        setState((prev) => ({
          ...prev,
          isLocating: false,
          error: msg,
          coords: prev.coords || DEFAULT_FALLBACK_LOCATION,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: forceFresh ? 0 : 60000,
      }
    );
  }, []);

  useEffect(() => {
    fetchPosition(false);
  }, [fetchPosition]);

  const refreshGps = useCallback(() => {
    setState((prev) => ({ ...prev, isLocating: true, error: null }));
    fetchPosition(true);
  }, [fetchPosition]);

  return {
    ...state,
    refreshGps,
  };
}
