import React, { useState } from 'react';
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
  const [pickMode, setPickMode] = useState<'origin' | 'destination'>('origin');

  // Chuyển đổi tọa độ GPS (lat, lng) sang phần trăm Viewport (x%, y%)
  const minLat = 10.72;
  const maxLat = 10.83;
  const minLng = 106.63;
  const maxLng = 106.75;

  const latToY = (lat: number) => 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
  const lngToX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100;

  const originX = lngToX(origin.longitude);
  const originY = latToY(origin.latitude);
  const destX = lngToX(destination.longitude);
  const destY = latToY(destination.latitude);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const clickedLng = minLng + (clickX / 100) * (maxLng - minLng);
    const clickedLat = maxLat - (clickY / 100) * (maxLat - minLat);

    if (pickMode === 'origin') {
      onOriginMapPick(clickedLat, clickedLng);
      setPickMode('destination');
    } else {
      onDestinationMapPick(clickedLat, clickedLng);
      setPickMode('origin');
    }
  };

  const renderRoutePolyline = (
    coords: [number, number][],
    strokeColor: string,
    strokeWidth: number,
    dash?: string
  ) => {
    if (!coords || coords.length === 0) return null;
    const pointsStr = coords
      .map(([lng, lat]) => `${lngToX(lng)},${latToY(lat)}`)
      .join(' ');

    return (
      <polyline
        points={pointsStr}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

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
          {/* Tooltip hướng dẫn chọn tọa độ trên bản đồ */}
          {currentStep === 1 && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 20,
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                border: '1px solid #334155',
                color: '#cbd5e1',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <span>Chạm bản đồ để đổi:</span>
              <button
                type="button"
                style={{
                  background: pickMode === 'origin' ? '#10b981' : '#334155',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
                onClick={() => setPickMode('origin')}
              >
                Ghim Điểm đi (Xanh)
              </button>
              <button
                type="button"
                style={{
                  background: pickMode === 'destination' ? '#ef4444' : '#334155',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
                onClick={() => setPickMode('destination')}
              >
                Ghim Điểm đến (Đỏ)
              </button>
            </div>
          )}

          {/* SVG Map Canvas */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
            onClick={handleMapClick}
          >
            {/* Sông Sài Gòn & Kênh rạch thủy văn */}
            <path
              d="M 50,0 Q 65,30 55,60 T 70,100"
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="4"
              opacity="0.4"
            />
            <path
              d="M 20,40 Q 40,55 55,60 T 90,80"
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="2.5"
              opacity="0.3"
            />

            {/* Mạng lưới đường phố cơ bản */}
            <line x1="10" y1="30" x2="90" y2="30" stroke="#1e293b" strokeWidth="1" />
            <line x1="10" y1="60" x2="90" y2="60" stroke="#1e293b" strokeWidth="1" />
            <line x1="35" y1="5" x2="35" y2="95" stroke="#1e293b" strokeWidth="1" />
            <line x1="70" y1="5" x2="70" y2="95" stroke="#1e293b" strokeWidth="1" />

            {/* Render 2 tuyến đường trên bản đồ (Screen 2 & Screen 3) */}
            {planData && (
              <>
                {/* Tuyến nhanh nhất: Màu cam/đỏ */}
                {renderRoutePolyline(
                  planData.fastest_route.coordinates,
                  '#f97316',
                  selectedRouteType === 'FASTEST' ? 2.5 : 1.5,
                  planData.fastest_route.hazard_count > 0 ? '3, 2' : undefined
                )}

                {/* Tuyến an toàn nhất: Tô dải màu xanh lá cây đậm */}
                {renderRoutePolyline(
                  planData.safest_route.coordinates,
                  '#059669',
                  selectedRouteType === 'SAFEST' ? 3.0 : 2.0
                )}

                {/* Điểm vũng ngập cảnh báo (Tô màu cam/đỏ trên tuyến nhanh) */}
                {planData.fastest_route.hazards_on_route.map((hz, idx) => {
                  const hx = lngToX(hz.longitude);
                  const hy = latToY(hz.latitude);
                  const isFlashing = flashingHazardId === hz.hazard_id;

                  return (
                    <g key={idx}>
                      <circle
                        cx={hx}
                        cy={hy}
                        r={isFlashing ? 3.5 : 2.5}
                        fill="#ef4444"
                        opacity="0.9"
                      >
                        {isFlashing && (
                          <animate
                            attributeName="opacity"
                            values="0.3;1;0.3"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        )}
                      </circle>
                      <circle cx={hx} cy={hy} r="1" fill="#ffffff" />
                    </g>
                  );
                })}
              </>
            )}

            {/* Ghim điểm đi: Màu xanh lá */}
            {origin.latitude && (
              <g>
                <circle cx={originX} cy={originY} r="3" fill="#10b981" stroke="#ffffff" strokeWidth="0.8" />
                <circle cx={originX} cy={originY} r="1" fill="#ffffff" />
                <text x={originX + 2.5} y={originY - 2.5} fill="#34d399" fontSize="2.8" fontWeight="bold">
                  A (Đi)
                </text>
              </g>
            )}

            {/* Ghim điểm đến: Màu đỏ */}
            {destination.latitude && (
              <g>
                <circle cx={destX} cy={destY} r="3" fill="#ef4444" stroke="#ffffff" strokeWidth="0.8" />
                <circle cx={destX} cy={destY} r="1" fill="#ffffff" />
                <text x={destX + 2.5} y={destY - 2.5} fill="#f87171" fontSize="2.8" fontWeight="bold">
                  B (Đến)
                </text>
              </g>
            )}
          </svg>

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
