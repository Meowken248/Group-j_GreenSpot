import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  DualRouteResponse,
  GeoLocationPoint,
  ScreenStep,
} from '../types/navigation.types';

interface InteractiveMapProps {
  currentStep: ScreenStep;
  origin: GeoLocationPoint;
  destination: GeoLocationPoint;
  planData: DualRouteResponse | null;
  selectedRouteType: 'FASTEST' | 'SAFEST';
  onOriginMapPick: (lat: number, lng: number) => void;
  onDestinationMapPick: (lat: number, lng: number) => void;
  onFindRouteClick: () => void;
  onSelectRouteClick: () => void;
  isCalculating: boolean;
  mapNetworkError: boolean;
  onRetryMapLoad: () => void;
  flashingHazardId?: string | null;
}

// Lớp bản đồ Google Maps và OpenStreetMap chính hãng tốc độ cao
const MAP_TILES = {
  roadmap: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  satellite: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  currentStep,
  origin,
  destination,
  planData,
  selectedRouteType,
  onOriginMapPick,
  onDestinationMapPick,
  onFindRouteClick,
  onSelectRouteClick,
  isCalculating,
  mapNetworkError,
  onRetryMapLoad,
  flashingHazardId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.FeatureGroup | null>(null);

  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [pickMode, setPickMode] = useState<'origin' | 'destination'>('origin');

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      // Tọa độ mặc định trung tâm TP. Hồ Chí Minh
      const defaultCenter: L.LatLngTuple =
        origin.latitude && origin.longitude
          ? [origin.latitude, origin.longitude]
          : [10.7769, 106.7009];

      const map = L.map(containerRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      // Thêm nút zoom ở góc trên phải
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Nạp tile layer Google Maps sắc nét
      const tileLayer = L.tileLayer(MAP_TILES[mapType], {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Group chứa các marker, polyline, vùng ngập
      const layersGroup = L.featureGroup().addTo(map);
      layersGroupRef.current = layersGroup;

      // Xử lý sự kiện click trên bản đồ để chọn tọa độ
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (pickMode === 'origin') {
          onOriginMapPick(lat, lng);
          setPickMode('destination');
        } else {
          onDestinationMapPick(lat, lng);
          setPickMode('origin');
        }
      });

      mapRef.current = map;

      // Cập nhật lại kích thước hiển thị sau khi mount
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    } catch (err) {
      console.warn('Leaflet map initialization skipped or not supported:', err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Thay đổi loại bản đồ (Đường phố / Vệ tinh)
  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(MAP_TILES[mapType]);
  }, [mapType]);

  // Cập nhật các marker, polyline và vùng ngập khi dữ liệu thay đổi
  useEffect(() => {
    const map = mapRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup) return;

    layersGroup.clearLayers();
    const boundsCoords: L.LatLngTuple[] = [];

    // 1. Ghim Điểm đi (A - Xanh lá)
    if (origin.latitude && origin.longitude) {
      const originLatLng: L.LatLngTuple = [origin.latitude, origin.longitude];
      boundsCoords.push(originLatLng);

      const pinIconA = L.divIcon({
        className: 'leaflet-custom-pin-a',
        html: `
          <div class="map-pin-pulse-wrapper pin-origin">
            <div class="pin-halo pin-halo-green"></div>
            <div class="pin-badge pin-badge-green">A</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker(originLatLng, { icon: pinIconA })
        .bindPopup(`<strong>Điểm đi (A):</strong><br/>${origin.name || 'Tọa độ GPS'}`)
        .addTo(layersGroup);
    }

    // 2. Ghim Điểm đến (B - Đỏ)
    if (destination.latitude && destination.longitude) {
      const destLatLng: L.LatLngTuple = [destination.latitude, destination.longitude];
      boundsCoords.push(destLatLng);

      const pinIconB = L.divIcon({
        className: 'leaflet-custom-pin-b',
        html: `
          <div class="map-pin-pulse-wrapper pin-dest">
            <div class="pin-halo pin-halo-red"></div>
            <div class="pin-badge pin-badge-red">B</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker(destLatLng, { icon: pinIconB })
        .bindPopup(`<strong>Điểm đến (B):</strong><br/>${destination.name || 'Tọa độ GPS'}`)
        .addTo(layersGroup);
    }

    // 3. Vẽ 2 tuyến đường & Điểm ngập nước khi đã có dữ liệu planData
    if (planData) {
      // Tuyến nhanh nhất: Màu cam/đỏ nét đứt
      if (planData.fastest_route.coordinates && planData.fastest_route.coordinates.length > 0) {
        const fastPoints: L.LatLngTuple[] = planData.fastest_route.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );
        fastPoints.forEach((p) => boundsCoords.push(p));

        const isFastSelected = selectedRouteType === 'FASTEST';
        const fastPolyline = L.polyline(fastPoints, {
          color: isFastSelected ? '#ef4444' : '#f97316',
          weight: isFastSelected ? 7 : 5,
          opacity: isFastSelected ? 0.95 : 0.65,
          dashArray: planData.fastest_route.hazard_count > 0 ? '8, 8' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layersGroup);

        fastPolyline.bindTooltip(
          `⚡ Tuyến nhanh nhất: ${planData.fastest_route.duration_formatted} (${planData.fastest_route.hazard_count} điểm ngập)`,
          { sticky: true }
        );
      }

      // Tuyến an toàn nhất: Màu xanh lá cây đậm
      if (planData.safest_route.coordinates && planData.safest_route.coordinates.length > 0) {
        const safePoints: L.LatLngTuple[] = planData.safest_route.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );
        safePoints.forEach((p) => boundsCoords.push(p));

        const isSafeSelected = selectedRouteType === 'SAFEST';
        const safePolyline = L.polyline(safePoints, {
          color: '#10b981',
          weight: isSafeSelected ? 7 : 5,
          opacity: isSafeSelected ? 1.0 : 0.7,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layersGroup);

        safePolyline.bindTooltip(
          `🛡️ Tuyến an toàn nhất: ${planData.safest_route.duration_formatted} (0 điểm ngập)`,
          { sticky: true }
        );
      }

      // Các điểm ngập nước cảnh báo trên tuyến nhanh
      planData.fastest_route.hazards_on_route.forEach((hazard) => {
        const hazardPoint: L.LatLngTuple = [hazard.latitude, hazard.longitude];
        boundsCoords.push(hazardPoint);

        const isFlashing = flashingHazardId === hazard.hazard_id;

        // Vòng nguy hiểm bán kính 60m
        L.circle(hazardPoint, {
          radius: 70,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: isFlashing ? 0.45 : 0.25,
          weight: 2,
        }).addTo(layersGroup);

        // Icon tam giác cảnh báo
        const hazardIcon = L.divIcon({
          className: 'leaflet-hazard-marker',
          html: `
            <div class="map-hazard-badge ${isFlashing ? 'hazard-flash' : ''}">
              ⚠️
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        L.marker(hazardPoint, { icon: hazardIcon })
          .bindPopup(`
            <div style="font-size: 13px; line-height: 1.4; color: #0f172a;">
              <strong style="color: #ef4444; font-size: 14px;">⚠️ ${hazard.street_name}</strong><br/>
              <span>Mực nước ngập ước tính: <strong>${hazard.predicted_depth_cm} cm</strong></span><br/>
              <span style="color: #64748b; font-size: 11px;">Mức độ rủi ro: ${hazard.severity_level}</span>
            </div>
          `)
          .addTo(layersGroup);
      });
    }

    // Tự động căn chỉnh bản đồ vừa khít toàn bộ tuyến đường và điểm mốc
    if (boundsCoords.length >= 2) {
      const bounds = L.latLngBounds(boundsCoords);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (boundsCoords.length === 1) {
      map.setView(boundsCoords[0], 15);
    }
  }, [origin, destination, planData, selectedRouteType, flashingHazardId]);

  return (
    <div className="map-block">
      {/* Cảnh báo lỗi mạng khi tải bản đồ giao thông */}
      {mapNetworkError ? (
        <div className="map-error-overlay">
          <span style={{ fontSize: '2.5rem' }}>📡</span>
          <div className="error-msg">Không thể tải bản đồ giao thông. Vui lòng thử lại</div>
          <button type="button" className="retry-btn" onClick={onRetryMapLoad}>
            🔄 Thử lại
          </button>
        </div>
      ) : (
        <div className="map-canvas-wrapper">
          {/* Thanh công cụ bản đồ: Chế độ chọn ghim & Chuyển loại bản đồ */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              border: '1px solid #334155',
              color: '#cbd5e1',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            {currentStep === 1 && (
              <>
                <span style={{ fontWeight: 600 }}>Chạm bản đồ:</span>
                <button
                  type="button"
                  style={{
                    background: pickMode === 'origin' ? '#10b981' : '#334155',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                  onClick={() => setPickMode('origin')}
                >
                  🟢 Điểm đi (A)
                </button>
                <button
                  type="button"
                  style={{
                    background: pickMode === 'destination' ? '#ef4444' : '#334155',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                  onClick={() => setPickMode('destination')}
                >
                  🔴 Điểm đến (B)
                </button>
                <span style={{ color: '#475569' }}>|</span>
              </>
            )}

            {/* Chuyển loại bản đồ Google Maps / Vệ tinh */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                style={{
                  background: mapType === 'roadmap' ? '#2563eb' : '#1e293b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                }}
                onClick={() => setMapType('roadmap')}
              >
                🗺️ Đường phố
              </button>
              <button
                type="button"
                style={{
                  background: mapType === 'satellite' ? '#2563eb' : '#1e293b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                }}
                onClick={() => setMapType('satellite')}
              >
                🛰️ Vệ tinh
              </button>
            </div>
          </div>

          {/* Container Leaflet Map tương tác thực tế */}
          <div
            ref={containerRef}
            className="real-leaflet-map"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '480px',
              backgroundColor: '#0b1329',
              cursor: currentStep === 1 ? 'crosshair' : 'grab',
            }}
          />

          {/* Nút tác vụ nổi phía dưới bản đồ */}
          <div className="map-bottom-cta">
            {currentStep === 1 && (
              <button
                type="button"
                className="cta-primary-btn"
                disabled={isCalculating}
                onClick={onFindRouteClick}
              >
                <span>{isCalculating ? 'Đang tính toán tuyến đường an toàn…' : '🔍 Tìm đường'}</span>
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                className={`cta-primary-btn ${selectedRouteType === 'FASTEST' ? 'btn-fast-accept' : ''}`}
                onClick={onSelectRouteClick}
              >
                <span>
                  {selectedRouteType === 'SAFEST'
                    ? '🛡️ Chọn tuyến an toàn'
                    : '⚡ Chọn tuyến nhanh (chấp nhận ngập)'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
