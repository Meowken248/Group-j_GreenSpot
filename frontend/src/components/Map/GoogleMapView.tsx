import { useEffect, useRef, useState, useCallback, type FC } from "react";
import { loadGoogleMaps, getMapsLoadDuration, onGoogleMapsAuthFailure } from "../../services/mapLoader";
import { useFastGeolocation, DEFAULT_FALLBACK_LOCATION } from "../../hooks/useFastGeolocation";
import LeafletFallbackView from "./LeafletFallbackView";
import "./map.css";

// Dark modern styling for Google Maps
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
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

const createGpsMarkerIcon = () => {
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

export const GoogleMapView: FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const searchMarkerRef = useRef<google.maps.Marker | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  const [engine, setEngine] = useState<"google" | "fallback">("google");
  const [authFailed, setAuthFailed] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapLatency, setMapLatency] = useState<number | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [showTraffic, setShowTraffic] = useState(false);
  const [showCircle, setShowCircle] = useState(true);

  // Hook định vị GPS siêu tốc song song
  const {
    coords,
    accuracy,
    isLocating,
    error: gpsError,
    isFromCache,
    gpsFixDurationMs,
    refreshGps,
  } = useFastGeolocation();

  const coordsRef = useRef(coords);
  const accuracyRef = useRef(accuracy);

  useEffect(() => {
    coordsRef.current = coords;
    accuracyRef.current = accuracy;
  }, [coords, accuracy]);

  // Lắng nghe sự kiện xác thực thất bại từ Google Maps Platform
  useEffect(() => {
    const unsub = onGoogleMapsAuthFailure(() => {
      setAuthFailed(true);
      setShowConfigModal(true);
    });
    return unsub;
  }, []);

  // Khởi tạo Google Maps ngay lập tức song song với Geolocation
  useEffect(() => {
    let isCancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (isCancelled || !mapContainerRef.current) return;

        const initialCenter = coordsRef.current || DEFAULT_FALLBACK_LOCATION;
        const initialAccuracy = accuracyRef.current || 25;
        const duration = getMapsLoadDuration();
        setMapLatency(duration);

        // Khởi tạo bản đồ với các cấu hình tối ưu hiệu năng
        const map = new maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 16,
          styles: DARK_MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: maps.ControlPosition.RIGHT_CENTER,
          },
          gestureHandling: "greedy",
          mapTypeId: maps.MapTypeId.ROADMAP,
        });

        mapInstanceRef.current = map;

        // Tạo Marker GPS người dùng
        const marker = new maps.Marker({
          position: initialCenter,
          map: map,
          title: "Vị trí GPS của bạn",
          icon: {
            url: createGpsMarkerIcon(),
            scaledSize: new maps.Size(36, 36),
            anchor: new maps.Point(18, 18),
          },
          optimized: true,
          zIndex: 999,
        });
        userMarkerRef.current = marker;

        // Tạo Vòng tròn bán kính độ chính xác
        const circle = new maps.Circle({
          center: initialCenter,
          radius: initialAccuracy,
          map: map,
          fillColor: "#10b981",
          fillOpacity: 0.12,
          strokeColor: "#34d399",
          strokeOpacity: 0.4,
          strokeWeight: 1,
        });
        accuracyCircleRef.current = circle;

        // Tích hợp Google Places Autocomplete
        if (searchInputRef.current && maps.places) {
          const autocomplete = new maps.places.Autocomplete(searchInputRef.current, {
            fields: ["geometry", "name", "formatted_address"],
          });
          autocomplete.bindTo("bounds", map);

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry?.location) return;

            map.panTo(place.geometry.location);
            map.setZoom(17);

            if (searchMarkerRef.current) {
              searchMarkerRef.current.setMap(null);
            }

            searchMarkerRef.current = new maps.Marker({
              map,
              position: place.geometry.location,
              title: place.name || "Địa điểm tìm kiếm",
              animation: maps.Animation.DROP,
            });
          });
        }

        setIsMapReady(true);
      })
      .catch((err) => {
        if (!isCancelled) {
          setLoadError(err.message || "Không thể tải Google Maps.");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Cập nhật vị trí Marker và Accuracy Circle ngay khi GPS có toạ độ mới
  useEffect(() => {
    if (!coords || !mapInstanceRef.current) return;

    const latLng = new google.maps.LatLng(coords.lat, coords.lng);

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(latLng);
    }

    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setCenter(latLng);
      if (accuracy) {
        accuracyCircleRef.current.setRadius(accuracy);
      }
    }

    mapInstanceRef.current.panTo(latLng);
  }, [coords, accuracy]);

  // Điều khiển hiển thị Vòng tròn bán kính
  useEffect(() => {
    if (accuracyCircleRef.current && mapInstanceRef.current) {
      accuracyCircleRef.current.setMap(showCircle ? mapInstanceRef.current : null);
    }
  }, [showCircle]);

  // Chuyển đổi loại bản đồ (Roadmap / Satellite)
  const toggleMapType = useCallback(() => {
    const nextType = mapType === "roadmap" ? "satellite" : "roadmap";
    setMapType(nextType);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(
        nextType === "satellite" ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP
      );
      if (nextType === "roadmap") {
        mapInstanceRef.current.setOptions({ styles: DARK_MAP_STYLES });
      } else {
        mapInstanceRef.current.setOptions({ styles: [] });
      }
    }
  }, [mapType]);

  // Bật/tắt Traffic Layer
  const toggleTraffic = useCallback(() => {
    const nextTraffic = !showTraffic;
    setShowTraffic(nextTraffic);
    if (mapInstanceRef.current) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(nextTraffic ? mapInstanceRef.current : null);
    }
  }, [showTraffic]);

  // Nút định vị lại ngay lập tức
  const handleRecenter = useCallback(() => {
    if (coords && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(coords);
      mapInstanceRef.current.setZoom(17);
    }
    refreshGps();
  }, [coords, refreshGps]);

  return (
    <div className="map-wrapper">
      {/* Dynamic Engine: Google Maps hoặc Leaflet Fallback */}
      {engine === "google" ? (
        <div ref={mapContainerRef} className="map-canvas-container" />
      ) : (
        <LeafletFallbackView
          coords={coords}
          accuracy={accuracy}
          showCircle={showCircle}
          mapType={mapType}
          showTraffic={showTraffic}
        />
      )}

      {/* Loading Overlay */}
      {engine === "google" && !isMapReady && !loadError && (
        <div className="map-loading-overlay">
          <div className="loader-spinner" />
          <div className="loading-text">Đang nạp Google Maps Pipeline...</div>
        </div>
      )}

      {/* Thông báo lỗi Google Cloud Key nếu có sự cố bản quyền / referrer */}
      {authFailed && (
        <div className="key-alert-banner">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            <div className="alert-text">
              <strong>Google Maps Platform: Lỗi "Permission Denied" từ API Key</strong>
              <span>
                {engine === "google"
                  ? "API Key bị giới hạn tên miền (Referrer restriction) hoặc chưa bật Billing/Maps JavaScript API trên Google Cloud Console."
                  : "Đang hiển thị chế độ Bản Đồ Dự Phòng tốc độ cao (OpenStreetMap / CartoDB) với đầy đủ GPS."}
              </span>
            </div>
          </div>
          <div className="alert-buttons">
            <button
              className="btn-switch-engine"
              onClick={() => setEngine(engine === "google" ? "fallback" : "google")}
            >
              {engine === "google" ? "🚀 Chuyển sang Bản Đồ Dự Phòng (OSM)" : "🔄 Thử lại Google Maps"}
            </button>
            <button className="btn-guide" onClick={() => setShowConfigModal(true)}>
              ⚙️ Cách Khắc Phục Key
            </button>
          </div>
        </div>
      )}

      {/* Header Bar với Brand và Ô Tìm Kiếm Places */}
      <div className="map-header-bar">
        <div className="map-header-left">
          <div className="app-brand">
            <div className="brand-icon">G</div>
            <span className="brand-name">GreenSpot</span>
            <span className="brand-badge">{engine === "google" ? "Google Maps" : "OSM Fallback"}</span>
          </div>
        </div>

        {engine === "google" && (
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              className="places-input"
              placeholder="Tìm kiếm địa điểm, công viên, toà nhà (Places API)..."
            />
          </div>
        )}
      </div>

      {/* Performance HUD Card */}
      <div className="metrics-hud">
        <div className="hud-title">
          <h4>
            <span className={`hud-indicator ${isLocating ? "pulse" : ""}`} />
            Hiệu Năng & GPS Thời Gian Thực
          </h4>
          <span style={{ fontSize: "11px", color: isFromCache ? "#38bdf8" : "#34d399", fontWeight: 600 }}>
            {isFromCache ? "⚡ Cached Warm Start" : isLocating ? "📡 Đang fix GPS..." : "🎯 GPS Locked"}
          </span>
        </div>

        <div className="hud-grid">
          <div className="hud-item">
            <span className="hud-label">Google Maps SDK:</span>
            <span className="hud-value highlight-fast">
              {mapLatency !== null ? `${mapLatency} ms` : "Đang nạp..."}
            </span>
          </div>

          <div className="hud-item">
            <span className="hud-label">Độ trễ GPS:</span>
            <span className="hud-value highlight-blue">
              {gpsFixDurationMs !== null ? `${gpsFixDurationMs} ms` : isLocating ? "Đo đạc..." : "0 ms"}
            </span>
          </div>

          <div className="hud-item">
            <span className="hud-label">Toạ độ GPS (Lat, Lng):</span>
            <span className="hud-value" style={{ fontSize: "11px" }}>
              {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Chờ tín hiệu..."}
            </span>
          </div>

          <div className="hud-item">
            <span className="hud-label">Bán kính chính xác:</span>
            <span className="hud-value highlight-fast">
              {accuracy ? `±${accuracy} m` : "N/A"}
            </span>
          </div>
        </div>

        {gpsError && <div className="error-banner">⚠️ {gpsError}</div>}
        {loadError && <div className="error-banner">❌ {loadError}</div>}
      </div>

      {/* Floating Controls */}
      <div className="map-controls-group">
        <button
          className={`control-btn ${isLocating ? "locating" : ""}`}
          onClick={handleRecenter}
          title="Định vị lại vị trí của tôi"
        >
          🎯
        </button>

        <button
          className="control-btn"
          onClick={() => setEngine((prev) => (prev === "google" ? "fallback" : "google"))}
          title={`Đổi động cơ hiển thị (Hiện tại: ${engine === "google" ? "Google Maps SDK" : "Google Tiles Core"})`}
        >
          🔄
        </button>

        <button
          className={`control-btn ${mapType === "satellite" ? "active" : ""}`}
          onClick={toggleMapType}
          title="Đổi kiểu bản đồ (Vệ tinh / Bản đồ đường)"
        >
          🗺️
        </button>

        <button
          className={`control-btn ${showTraffic ? "active" : ""}`}
          onClick={toggleTraffic}
          title="Bật / Tắt lớp giao thông thời gian thực"
        >
          🚦
        </button>

        <button
          className={`control-btn ${showCircle ? "active" : ""}`}
          onClick={() => setShowCircle((prev) => !prev)}
          title="Bật / Tắt vòng tròn bán kính GPS"
        >
          ⭕
        </button>
      </div>

      {/* Modal Hướng Dẫn Cấu Hình Google Cloud Console */}
      {showConfigModal && (
        <div className="config-modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="config-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-badge">Google Cloud Guide</span>
                <h3>Hướng Dẫn Khắc Phục Lỗi "Permission Denied"</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setShowConfigModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <p className="intro-p">
                Google Maps API đã tải thành công nhưng máy chủ Google từ chối cấp quyền nạp map tiles (hiển thị mờ và thông báo <em>"Rất tiếc! Đã xảy ra lỗi"</em>). Hãy làm theo 3 bước sau để khắc phục:
              </p>

              <div className="steps-list">
                <div className="step-box">
                  <div className="step-num">1</div>
                  <div className="step-info">
                    <h4>Cấu hình HTTP Referrers (Tên miền cho phép)</h4>
                    <p>API Key có thể đang bị chặn trên <code>localhost</code>. Vào <strong>Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</strong>, mở API Key này:</p>
                    <div className="code-hint">
                      Thêm vào danh sách Website restrictions:<br />
                      <code>http://localhost:*/*</code><br />
                      <code>http://127.0.0.1:*/*</code>
                    </div>
                  </div>
                </div>

                <div className="step-box">
                  <div className="step-num">2</div>
                  <div className="step-info">
                    <h4>Bật "Maps JavaScript API"</h4>
                    <p>Vào mục <strong>APIs &amp; Services &gt; Enabled APIs &amp; Services</strong>. Đảm bảo <strong>Maps JavaScript API</strong> và <strong>Places API</strong> đã được bật (Enable).</p>
                  </div>
                </div>

                <div className="step-box">
                  <div className="step-num">3</div>
                  <div className="step-info">
                    <h4>Kiểm tra Tài Khoản Thanh Toán (Billing)</h4>
                    <p>Google Maps Platform yêu cầu dự án phải gắn thẻ thanh toán (được tặng $200 miễn phí mỗi tháng) để các tile bản đồ không bị mờ watermark.</p>
                  </div>
                </div>
              </div>

              <div className="modal-tip-box">
                💡 <strong>Gợi ý:</strong> Bạn có thể bấm nút <strong>"Chuyển sang Bản Đồ Dự Phòng (OSM)"</strong> để tiếp tục sử dụng ngay lập tức mà không cần chờ cấu hình xong Google Cloud.
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-primary-action"
                onClick={() => {
                  setEngine("fallback");
                  setShowConfigModal(false);
                }}
              >
                Dùng Ngay Bản Đồ Dự Phòng
              </button>
              <button className="btn-secondary-action" onClick={() => setShowConfigModal(false)}>
                Đã Hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default GoogleMapView;
