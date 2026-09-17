import { useState, useEffect, useCallback, useRef } from "react";
import type { Coordinates, GeoLocationState, GpsAccuracyLevel } from "../types/map";
import { CACHE_KEY, DEFAULT_FALLBACK_LOCATION } from "../constants/mapConstants";

export type { Coordinates, GeoLocationState, GpsAccuracyLevel };
export { DEFAULT_FALLBACK_LOCATION };

// Thời gian hiệu lực tối đa của vị trí lưu trong cache: 5 phút (300,000 ms)
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

// Phân loại mức độ chính xác dựa theo bán kính sai số (mét)
function getAccuracyLevel(accuracy: number): GpsAccuracyLevel {
  if (accuracy <= 15) return "high"; // Đạt chuẩn vệ tinh GPS chính xác cao
  if (accuracy <= 50) return "medium"; // Wi-Fi / Cell triangulation tốt
  if (accuracy <= 150) return "low"; // Tín hiệu trung bình
  return "approximate"; // Tín hiệu thô / IP
}

// Tính khoảng cách giữa 2 tọa độ (theo mét) bằng công thức Haversine
function calculateDistanceMeters(c1: Coordinates, c2: Coordinates): number {
  const R = 6371000; // Bán kính Trái Đất (mét)
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Đọc vị trí khởi tạo ban đầu từ Cache với kiểm tra TTL nghiêm ngặt
function getInitialState(): GeoLocationState {
  if (typeof window === "undefined") {
    return {
      coords: null,
      accuracy: null,
      accuracyLevel: "approximate",
      isLocating: true,
      isLocked: false,
      error: null,
      isFromCache: false,
      source: "gps",
      gpsFixDurationMs: null,
      lastUpdated: null,
    };
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const now = Date.now();
      const age = now - (parsed.timestamp || 0);

      // Chỉ sử dụng nếu cache chưa quá 5 phút
      if (parsed.lat && parsed.lng && age < CACHE_MAX_AGE_MS) {
        const acc = parsed.accuracy || 20;
        return {
          coords: { lat: parsed.lat, lng: parsed.lng },
          accuracy: Math.round(acc),
          accuracyLevel: getAccuracyLevel(acc),
          isLocating: true, // Vẫn tiếp tục tìm tín hiệu tươi mới nhất
          isLocked: acc <= 20,
          error: null,
          isFromCache: true,
          source: "cache",
          gpsFixDurationMs: 0,
          lastUpdated: parsed.timestamp,
        };
      } else {
        // Xóa cache cũ đã hết hạn
        localStorage.removeItem(CACHE_KEY);
      }
    }
  } catch {
    // Bỏ qua lỗi đọc cache
  }

  return {
    coords: null,
    accuracy: null,
    accuracyLevel: "approximate",
    isLocating: true,
    isLocked: false,
    error: null,
    isFromCache: false,
    source: "gps",
    gpsFixDurationMs: null,
    lastUpdated: null,
  };
}

export function useFastGeolocation() {
  const [state, setState] = useState<GeoLocationState>(getInitialState);
  const stateRef = useRef(state);
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Fallback định vị qua IP khi GPS phần cứng bị từ chối hoặc không khả dụng
  const fetchIpFallback = useCallback(async () => {
    if (stateRef.current.coords && !stateRef.current.isFromCache) return;

    try {
      abortControllerRef.current = new AbortController();
      const res = await fetch("https://ipapi.co/json/", {
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error("IP API failed");
      const data = await res.json();

      if (data.latitude && data.longitude) {
        const ipCoords = { lat: data.latitude, lng: data.longitude };
        setState((prev) => {
          // Không đè nếu đã có GPS thực sự
          if (prev.coords && prev.source === "gps") return prev;
          return {
            ...prev,
            coords: ipCoords,
            accuracy: 3000,
            accuracyLevel: "approximate",
            isLocating: false,
            isLocked: false,
            error: null,
            isFromCache: false,
            source: "network",
            gpsFixDurationMs: Math.round(performance.now() - startTimeRef.current),
            lastUpdated: Date.now(),
          };
        });
      }
    } catch {
      // Nếu fallback IP cũng lỗi, gán tọa độ mặc định
      setState((prev) => ({
        ...prev,
        isLocating: false,
        coords: prev.coords || DEFAULT_FALLBACK_LOCATION,
        source: prev.coords ? prev.source : "fallback",
      }));
    }
  }, []);

  // Xử lý cập nhật tọa độ có lọc nhiễu vi mô và tinh chỉnh độ chính xác tăng dần
  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    const duration = Math.round(performance.now() - startTimeRef.current);
    const { latitude, longitude, accuracy } = position.coords;
    const roundedAcc = Math.round(accuracy);
    const newCoords: Coordinates = { lat: latitude, lng: longitude };

    const prev = stateRef.current;
    if (prev.coords) {
      const distanceMoved = calculateDistanceMeters(prev.coords, newCoords);
      // Lọc bỏ nhiễu vi mô (< 2.5m) nếu độ chính xác không cải thiện vượt bậc
      if (distanceMoved < 2.5 && roundedAcc >= (prev.accuracy || 999)) {
        return;
      }
    }

    const accuracyLevel = getAccuracyLevel(roundedAcc);
    const isLocked = roundedAcc <= 20;

    // Lưu vào localStorage phục vụ warm-start lần kế tiếp
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          lat: latitude,
          lng: longitude,
          accuracy: roundedAcc,
          timestamp: Date.now(),
        })
      );
    } catch {
      // Bỏ qua lỗi ghi cache
    }

    setState({
      coords: newCoords,
      accuracy: roundedAcc,
      accuracyLevel,
      isLocating: !isLocked, // Tiếp tục quét nếu chưa khóa độ chính xác cao
      isLocked,
      error: null,
      isFromCache: false,
      source: "gps",
      gpsFixDurationMs: duration,
      lastUpdated: Date.now(),
    });
  }, []);

  // Kích hoạt định vị độ chính xác cao hai giai đoạn
  const startLocating = useCallback(
    (forceFresh = false) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        setState((prev) => ({
          ...prev,
          isLocating: false,
          error: "Trình duyệt không hỗ trợ Geolocation API.",
          coords: prev.coords || DEFAULT_FALLBACK_LOCATION,
          source: "fallback",
        }));
        return;
      }

      // Hủy theo dõi cũ nếu đang chạy
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      startTimeRef.current = performance.now();
      setState((prev) => ({ ...prev, isLocating: true, error: null }));

      // Giai đoạn 1: Bắt nhanh vị trí ban đầu qua getCurrentPosition
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handlePositionUpdate(pos);
        },
        (err) => {
          // Nếu bị lỗi ngay từ đầu (ví dụ người dùng từ chối quyền), kích hoạt fallback IP
          if (err.code === err.PERMISSION_DENIED) {
            setState((prev) => ({
              ...prev,
              isLocating: false,
              error: "Bạn đã từ chối quyền truy cập GPS. Đang hiển thị vị trí ước lượng qua mạng.",
            }));
            fetchIpFallback();
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: forceFresh ? 0 : 30000,
        }
      );

      // Giai đoạn 2: Theo dõi liên tục vệ tinh GPS với watchPosition độ chính xác cao
      try {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            handlePositionUpdate(pos);
          },
          (err) => {
            let msg = "Không thể khóa tín hiệu vệ tinh GPS.";
            if (err.code === err.PERMISSION_DENIED) {
              msg = "Quyền định vị GPS bị chặn.";
              fetchIpFallback();
            } else if (err.code === err.TIMEOUT && !stateRef.current.coords) {
              msg = "Quá thời gian phản hồi GPS. Đang thử vị trí qua mạng...";
              fetchIpFallback();
            }

            setState((prev) => ({
              ...prev,
              isLocating: false,
              error: prev.coords ? null : msg,
              coords: prev.coords || DEFAULT_FALLBACK_LOCATION,
            }));
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
        watchIdRef.current = id;
      } catch (e) {
        console.warn("Lỗi khởi tạo watchPosition:", e);
      }
    },
    [handlePositionUpdate, fetchIpFallback]
  );

  useEffect(() => {
    startLocating(false);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [startLocating]);

  // Hàm làm mới định vị cưỡng bức khi người dùng bấm nút GPS
  const refreshGps = useCallback(() => {
    startLocating(true);
  }, [startLocating]);

  return {
    ...state,
    refreshGps,
  };
}
