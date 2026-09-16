/**
 * Google Maps API Ultra-Fast Singleton Loader with Auth Failure Detection
 * Tối ưu hóa hiệu năng nạp script không đồng bộ, bắt sự kiện gm_authFailure và đo đạc benchmark.
 */

declare global {
  interface Window {
    initMap?: () => void;
    gm_authFailure?: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAOVYRIgupAurZup5y1PRh8Ismb1A3lLao";
const SCRIPT_ID = "google-maps-api-script";

let loadPromise: Promise<typeof google.maps> | null = null;
let loadStartTime = 0;
let loadDurationMs = 0;
const authFailureListeners: Array<() => void> = [];

export function onGoogleMapsAuthFailure(callback: () => void): () => void {
  authFailureListeners.push(callback);
  return () => {
    const idx = authFailureListeners.indexOf(callback);
    if (idx !== -1) authFailureListeners.splice(idx, 1);
  };
}

export function getMapsLoadDuration(): number {
  return loadDurationMs;
}

export function isGoogleMapsLoaded(): boolean {
  return typeof window !== "undefined" && !!window.google?.maps;
}

/**
 * Tải Google Maps API bất đồng bộ theo cơ chế Singleton Promise.
 * Tích hợp loading=async và callback gm_authFailure theo khuyến nghị của Google.
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  // Lắng nghe sự kiện xác thực thất bại từ Google Maps Platform
  if (typeof window !== "undefined") {
    window.gm_authFailure = () => {
      console.error("[Google Maps AuthFailure] Google Maps Platform từ chối API Key (Permission Denied, Billing, hoặc Referrer Restriction).");
      authFailureListeners.forEach((fn) => fn());
    };
  }

  // Nếu đã nạp thành công trước đó, trả về ngay lập tức (0ms)
  if (isGoogleMapsLoaded()) {
    return Promise.resolve(window.google.maps);
  }

  // Nếu đang có tiến trình nạp dở, chia sẻ chung Promise (idempotent)
  if (loadPromise) {
    return loadPromise;
  }

  loadStartTime = performance.now();

  loadPromise = new Promise<typeof google.maps>((resolve, reject) => {
    // Định nghĩa callback toàn cục đón sự kiện từ callback=initMap trong URL
    window.initMap = () => {
      loadDurationMs = Math.round(performance.now() - loadStartTime);
      delete window.initMap;
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error("Google Maps object not found after initMap callback"));
      }
    };

    // Kiểm tra xem thẻ script đã tồn tại trong DOM chưa
    let scriptElement = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!scriptElement) {
      scriptElement = document.createElement("script");
      scriptElement.id = SCRIPT_ID;
      scriptElement.type = "text/javascript";
      scriptElement.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async&libraries=places&callback=initMap`;
      scriptElement.async = true;
      scriptElement.defer = true;

      scriptElement.onerror = () => {
        loadPromise = null;
        delete window.initMap;
        reject(new Error("Lỗi khi tải Google Maps script từ CDN. Vui lòng kiểm tra kết nối mạng hoặc API Key."));
      };

      document.head.appendChild(scriptElement);
    }
  });

  return loadPromise;
}
