import React from 'react';
import { DualRouteResponse } from '../types/navigation.types';

interface Screen2CompareProps {
  planData: DualRouteResponse;
  selectedRouteType: 'FASTEST' | 'SAFEST';
  onSelectRouteType: (t: 'FASTEST' | 'SAFEST') => void;
  isLoadingTide: boolean;
  onBackToInput: () => void;
}

export const Screen2Compare: React.FC<Screen2CompareProps> = ({
  planData,
  selectedRouteType,
  onSelectRouteType,
  isLoadingTide,
  onBackToInput,
}) => {
  const { fastest_route, safest_route, all_clear, all_flooded, summary_message } = planData;

  return (
    <>
      {/* CỘT TRÁI: TUYẾN NHANH NHẤT */}
      <div
        className={`route-compare-card fastest-card ${
          selectedRouteType === 'FASTEST' ? 'selected' : ''
        } ${fastest_route.hazard_count > 0 ? 'has-hazards' : ''}`}
        onClick={() => onSelectRouteType('FASTEST')}
      >
        <div className="card-header-badge badge-fast">
          <span>⚡ TUYẾN NHANH NHẤT</span>
        </div>

        {isLoadingTide ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
            <span>🔄 Đang nạp dữ liệu triều cường...</span>
          </div>
        ) : (
          <>
            <div className="stat-main">{fastest_route.duration_formatted}</div>

            <div
              className={`hazard-stat-box ${
                fastest_route.hazard_count > 0 ? 'hazard-danger' : 'hazard-safe'
              }`}
            >
              <strong>Số điểm ngập: {fastest_route.hazard_count}</strong>
              {fastest_route.hazard_count > 0 ? (
                <div style={{ marginTop: '0.35rem', fontSize: '0.8rem' }}>
                  ⚠️ Cảnh báo có {fastest_route.hazard_count} đoạn ngập nước (mức ngập sâu tới {fastest_route.max_depth_cm}cm, nguy cơ chết máy cao).
                </div>
              ) : (
                <div style={{ marginTop: '0.35rem', fontSize: '0.8rem' }}>
                  ✓ Đoạn đường khô ráo, lưu thông thuận lợi.
                </div>
              )}
            </div>

            {fastest_route.hazards_on_route.length > 0 && (
              <div className="hazard-detail-list">
                {fastest_route.hazards_on_route.map((hz, i) => (
                  <div key={i} className="hazard-tag">
                    🌊 {hz.street_name}: ngập ~{hz.predicted_depth_cm}cm
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* CỘT GIỮA: TUYẾN AN TOÀN NHẤT */}
      <div
        className={`route-compare-card safest-card ${
          selectedRouteType === 'SAFEST' ? 'selected' : ''
        }`}
        onClick={() => onSelectRouteType('SAFEST')}
      >
        <div className="card-header-badge badge-safe">
          <span>🛡️ TUYẾN AN TOÀN NHẤT</span>
        </div>

        {isLoadingTide ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
            <span>🔄 Đang phân tích rủi ro ngập...</span>
          </div>
        ) : (
          <>
            <div className="stat-main">{safest_route.duration_formatted}</div>

            <div className="hazard-stat-box hazard-safe">
              <strong>Số điểm ngập: {safest_route.hazard_count}</strong>
              <div style={{ marginTop: '0.35rem', fontSize: '0.8rem' }}>
                ✓ Đảm bảo mặt đường cao ráo, hoàn toàn né tránh các vùng ngập úng.
              </div>
            </div>

            {safest_route.avoided_hazards.length > 0 && (
              <div className="hazard-detail-list" style={{ marginTop: '0.85rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Điểm ngập đã né:</span>
                {safest_route.avoided_hazards.map((hz, i) => (
                  <div key={i} className="hazard-tag" style={{ color: '#34d399' }}>
                    ✓ Đã bẻ lái qua {hz.street_name}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button
          type="button"
          style={{
            marginTop: 'auto',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '0.8rem',
            cursor: 'pointer',
            paddingTop: '1rem',
            textDecoration: 'underline',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onBackToInput();
          }}
        >
          ← Chỉnh sửa điểm đi / đến
        </button>
      </div>
    </>
  );
};
