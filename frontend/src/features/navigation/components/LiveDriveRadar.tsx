import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EarlyWarningAlert, VehicleCategory } from '../types/navigation.types';
import {
  checkEarlyWarningAPI,
  playEmergencyBeep,
  speakVietnamese,
} from '../services/navigationApi';

interface LiveDriveRadarProps {
  selectedVehicle: VehicleCategory;
  onVehicleChange: (vehicle: VehicleCategory) => void;
  onSwitchToRoutePlanning: () => void;
}

// Cung đường mô phỏng lái xe thực tế tại TP.HCM qua điểm ngập Nguyễn Hữu Cảnh
const SIMULATION_ROUTE_WAYPOINTS: [number, number][] = [
  [10.7725, 106.698], // 1. Chợ Bến Thành (Quận 1)
  [10.7769, 106.7009], // 2. Phố đi bộ Nguyễn Huệ
  [10.7798, 106.699], // 3. Nhà thờ Đức Bà
  [10.787, 106.705], // 4. Thảo Cầm Viên
  [10.796, 106.711], // 5. Cầu Thị Nghè / Điện Biên Phủ
  [10.794, 106.7145], // 6. Tiếp cận đường Nguyễn Hữu Cảnh (Cách điểm ngập ~250m)
  [10.792, 106.715], // 7. Điểm ngập Nguyễn Hữu Cảnh (FL-BT-NHC - Ngập 35cm)
  [10.793, 106.718], // 8. Vượt qua điểm ngập / Rẽ hướng Cầu Sài Gòn
  [10.7989, 106.7241], // 9. Cầu Sài Gòn
  [10.802, 106.73], // 10. Thảo Điền (TP. Thủ Đức)
];

const VEHICLE_NAMES: Record<VehicleCategory, string> = {
  MOTORBIKE: 'Xe máy',
  CAR: 'Ô tô',
  BICYCLE: 'Xe đạp',
  WASTE_TRUCK: 'Xe ép rác chuyên dụng',
};

const VEHICLE_THRESHOLDS: Record<VehicleCategory, number> = {
  BICYCLE: 15,
  MOTORBIKE: 25,
  CAR: 35,
  WASTE_TRUCK: 55,
};

const VEHICLE_ICONS: Record<VehicleCategory, string> = {
  MOTORBIKE: '🛵',
  CAR: '🚗',
  BICYCLE: '🚲',
  WASTE_TRUCK: '🚛',
};

const makeUserCarIcon = (vehicle: VehicleCategory) =>
  L.divIcon({
    className: 'live-gps-user-puck',
    html: `
      <div class="user-live-radar-container">
        <div class="radar-ping-wave"></div>
        <div class="user-vehicle-puck">
          <span style="font-size: 16px;">${VEHICLE_ICONS[vehicle]}</span>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

const MAP_TILES = {
  roadmap: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  satellite: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
};

export const LiveDriveRadar: React.FC<LiveDriveRadarProps> = ({
  selectedVehicle,
  onVehicleChange,
  onSwitchToRoutePlanning,
}) => {
  // Tọa độ người dùng hiện tại (Mặc định trung tâm TP.HCM hoặc GPS thật)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 10.7725,
    lng: 106.698,
  });
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStepIndex, setSimStepIndex] = useState<number>(0);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Trạng thái cảnh báo phía trước (Early warning ahead)
  const [alertAhead, setAlertAhead] = useState<EarlyWarningAlert | null>(null);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radarCircleRef = useRef<L.Circle | null>(null);
  const hazardsGroupRef = useRef<L.FeatureGroup | null>(null);

  // 1. Tự động lấy GPS thiết bị thực tế khi mở màn hình
  useEffect(() => {
    if (!navigator.geolocation) return;

    // Lấy vị trí ngay lập tức
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isSimulating) {
          setCurrentCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setSpeedKmh(pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 28);
        }
      },
      (err) => {
        console.warn('Geolocation access fallback to center HCM:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Bật watchPosition theo dõi di chuyển
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isSimulating) {
          setCurrentCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setSpeedKmh(pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 32);
        }
      },
      () => {},
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isSimulating]);

  // 2. Chế độ Mô phỏng Lái xe di chuyển trên đường (Simulator)
  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      setSimStepIndex((prevIdx) => {
        const nextIdx = (prevIdx + 1) % SIMULATION_ROUTE_WAYPOINTS.length;
        const [lat, lng] = SIMULATION_ROUTE_WAYPOINTS[nextIdx];
        setCurrentCoords({ lat, lng });
        setSpeedKmh(35);
        return nextIdx;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [isSimulating]);

  // 3. Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [currentCoords.lat, currentCoords.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      const tileLayer = L.tileLayer(MAP_TILES[mapType], {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Group chứa các điểm ngập xung quanh
      const hazardsGroup = L.featureGroup().addTo(map);
      hazardsGroupRef.current = hazardsGroup;

      const userMarker = L.marker([currentCoords.lat, currentCoords.lng], {
        icon: makeUserCarIcon(selectedVehicle),
      }).addTo(map);
      userMarkerRef.current = userMarker;

      // Vòng tròn radar quét bán kính 500m
      const radarCircle = L.circle([currentCoords.lat, currentCoords.lng], {
        radius: 600,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.1,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(map);
      radarCircleRef.current = radarCircle;

      mapRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    } catch (err) {
      console.warn('Leaflet live radar map init warning:', err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 4. Cập nhật URL tile khi đổi kiểu bản đồ
  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(MAP_TILES[mapType]);
  }, [mapType]);

  // 5. Cập nhật vị trí xe & Gọi API kiểm tra ngập phía trước khi xe di chuyển
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Di chuyển marker và cập nhật icon xe bám theo trạng thái
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([currentCoords.lat, currentCoords.lng]);
      userMarkerRef.current.setIcon(makeUserCarIcon(selectedVehicle));
    }
    if (radarCircleRef.current) {
      radarCircleRef.current.setLatLng([currentCoords.lat, currentCoords.lng]);
    }

    // Tự động căn tâm bản đồ theo xe mượt mà
    map.panTo([currentCoords.lat, currentCoords.lng], { animate: true, duration: 1.0 });

    // Gọi API quét cảnh báo ngập phía trước (< 1000m)
    checkEarlyWarningAPI(currentCoords.lat, currentCoords.lng, [], selectedVehicle)
      .then((alert) => {
        setAlertAhead(alert);

        if (hazardsGroupRef.current) {
          hazardsGroupRef.current.clearLayers();
          if (alert.has_hazard_ahead && alert.hazard) {
            const hazardIcon = L.divIcon({
              className: 'live-hazard-badge-pin',
              html: `
                <div style="background: rgba(239, 68, 68, 0.95); color: #ffffff; padding: 4px 8px; border-radius: 8px; font-weight: 700; font-size: 11px; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                  <span>🌊</span>
                  <span>${alert.hazard.street_name}: ${alert.hazard.predicted_depth_cm}cm</span>
                </div>
              `,
              iconSize: [120, 28],
              iconAnchor: [60, 14],
            });

            L.marker([alert.hazard.latitude, alert.hazard.longitude], { icon: hazardIcon })
              .bindPopup(
                `<b>Điểm ngập: ${alert.hazard.street_name}</b><br/>Độ sâu dự báo: ${alert.hazard.predicted_depth_cm} cm`
              )
              .addTo(hazardsGroupRef.current);
          }
        }

        if (alert.has_hazard_ahead && alert.hazard) {
          // Đổi màu radar sang đỏ nguy hiểm
          if (radarCircleRef.current) {
            radarCircleRef.current.setStyle({
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.2,
            });
          }

          // Phát âm thanh và giọng nói nếu chưa phát trong 10 giây qua
          const now = Date.now();
          if (voiceEnabled && now - lastAlertTime > 10000) {
            setLastAlertTime(now);
            playEmergencyBeep();
            const roundedDist = alert.distance_ahead_meters || 150;
            speakVietnamese(
              `Cảnh báo! Phía trước ${roundedDist} mét, đường ${alert.hazard.street_name} đang ngập ${alert.hazard.predicted_depth_cm} centimét. Nguy cơ chết máy cao!`
            );
          }
        } else {
          // Trở lại radar xanh an toàn
          if (radarCircleRef.current) {
            radarCircleRef.current.setStyle({
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.1,
            });
          }
        }
      })
      .catch(() => {});
  }, [currentCoords, selectedVehicle, voiceEnabled, lastAlertTime]);

  // Nút tâm vị trí xe
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([currentCoords.lat, currentCoords.lng], 16, { animate: true });
    }
  };

  const currentVehicleThreshold = VEHICLE_THRESHOLDS[selectedVehicle];

  return (
    <div className="live-drive-radar-wrapper">
      {/* ----------------------------------------------------------------------
          HUD HEADER CẢNH BÁO ĐOẠN ĐƯỜNG PHÍA TRƯỚC (NHƯ GOOGLE MAPS)
         ---------------------------------------------------------------------- */}
      <div className={`live-radar-hud-header ${alertAhead?.has_hazard_ahead ? 'hud-hazard' : 'hud-safe'}`}>
        <div className="hud-content-left">
          {alertAhead?.has_hazard_ahead && alertAhead.hazard ? (
            <>
              <div className="hud-status-badge hazard-badge">
                <span className="pulse-dot-red"></span>
                <span>🚨 CẢNH BÁO NGẬP PHÍA TRƯỚC ({alertAhead.distance_ahead_meters}m)</span>
              </div>
              <div className="hud-main-title">
                {alertAhead.hazard.street_name} đang ngập sâu {alertAhead.hazard.predicted_depth_cm} cm
              </div>
              <div className="hud-sub-desc">
                ⚠️ Vượt ngưỡng an toàn ({currentVehicleThreshold}cm) của {VEHICLE_NAMES[selectedVehicle]}. Nguy cơ chết máy cao!
              </div>
            </>
          ) : (
            <>
              <div className="hud-status-badge safe-badge">
                <span className="pulse-dot-green"></span>
                <span>🟢 ĐOẠN ĐƯỜNG PHÍA TRƯỚC AN TOÀN - THÔNG THOÁNG</span>
              </div>
              <div className="hud-main-title">Mặt đường khô ráo, không có điểm đen ngập úng</div>
              <div className="hud-sub-desc">
                Radar đang quét liên tục 360° bán kính 1km xung quanh xe của bạn theo thời gian thực.
              </div>
            </>
          )}
        </div>

        {/* Cụm thông số đồng hồ tốc độ và nút thao tác */}
        <div className="hud-content-right">
          <div className="speed-gauge-box">
            <span className="speed-number">{speedKmh}</span>
            <span className="speed-unit">km/h</span>
          </div>

          <div className="hud-controls-stack">
            <button
              type="button"
              className={`voice-toggle-btn ${voiceEnabled ? 'active' : ''}`}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              title={voiceEnabled ? 'Tắt giọng nói cảnh báo' : 'Bật giọng nói cảnh báo'}
            >
              {voiceEnabled ? '🔊 Giọng nói: Bật' : '🔇 Giọng nói: Tắt'}
            </button>

            <button
              type="button"
              className={`sim-drive-btn ${isSimulating ? 'sim-active' : ''}`}
              onClick={() => {
                setIsSimulating(!isSimulating);
                if (!isSimulating) setSpeedKmh(35);
                else setSpeedKmh(0);
              }}
            >
              {isSimulating
                ? `⏹️ Dừng lái (${simStepIndex + 1}/${SIMULATION_ROUTE_WAYPOINTS.length})`
                : '▶️ Mô phỏng lái xe'}
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          KHỐI BẢN ĐỒ LEAFLET TRỰC QUAN VỊ TRÍ XE & VÙNG QUÉT RADAR
         ---------------------------------------------------------------------- */}
      <div className="live-radar-map-container">
        {/* Nút chuyển lớp bản đồ & Nút Vị trí xe */}
        <div className="map-floating-top-controls">
          <div className="map-type-pills">
            <button
              type="button"
              className={mapType === 'roadmap' ? 'active' : ''}
              onClick={() => setMapType('roadmap')}
            >
              🗺️ Đường phố
            </button>
            <button
              type="button"
              className={mapType === 'satellite' ? 'active' : ''}
              onClick={() => setMapType('satellite')}
            >
              🛰️ Vệ tinh
            </button>
          </div>

          <button type="button" className="recenter-gps-btn" onClick={handleRecenter}>
            🎯 Về vị trí xe
          </button>
        </div>

        {/* Bản đồ Leaflet Google Roadmap */}
        <div
          ref={mapContainerRef}
          className="real-leaflet-map"
          style={{ width: '100%', height: '100%', minHeight: '520px' }}
        />

        {/* ----------------------------------------------------------------------
            THANH ĐIỀU KHIỂN DƯỚI ĐÁY BẢN ĐỒ: CHỌN XE & CHUYỂN CHẾ ĐỘ
           ---------------------------------------------------------------------- */}
        <div className="live-radar-bottom-bar">
          <div className="vehicle-selector-hud">
            <span className="label-text">Phương tiện di chuyển:</span>
            <div className="vehicle-pills-row">
              <button
                type="button"
                className={`v-pill ${selectedVehicle === 'MOTORBIKE' ? 'active' : ''}`}
                onClick={() => onVehicleChange('MOTORBIKE')}
              >
                🛵 Xe máy (≤25cm)
              </button>
              <button
                type="button"
                className={`v-pill ${selectedVehicle === 'CAR' ? 'active' : ''}`}
                onClick={() => onVehicleChange('CAR')}
              >
                🚗 Ô tô (≤35cm)
              </button>
              <button
                type="button"
                className={`v-pill ${selectedVehicle === 'BICYCLE' ? 'active' : ''}`}
                onClick={() => onVehicleChange('BICYCLE')}
              >
                🚲 Xe đạp (≤15cm)
              </button>
              <button
                type="button"
                className={`v-pill ${selectedVehicle === 'WASTE_TRUCK' ? 'active' : ''}`}
                onClick={() => onVehicleChange('WASTE_TRUCK')}
              >
                🚛 Xe ép rác (≤55cm)
              </button>
            </div>
          </div>

          <button
            type="button"
            className="switch-to-plan-btn"
            onClick={onSwitchToRoutePlanning}
          >
            🗺️ Chuyển sang Lập lộ trình A ➔ B
          </button>
        </div>
      </div>
    </div>
  );
};
