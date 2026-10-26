import React from 'react';
import type { DualRouteResponse } from '../types/navigation.types';

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
  const { fastest_route, safest_route, all_clear, all_flooded, advisory_recommendation } =
    planData;

  // =========================================================================
  // KỊCH BẢN 1: CẢ 2 TUYẾN ĐỀU KHÔ RÁO, KHÔNG BỊ NGẬP
  // "Hai tuyến gộp làm một, ưu tiên tuyến ngắn nhất"
  // =========================================================================
  if (all_clear) {
    return (
      <div
        className="route-compare-card safest-card selected"
        style={{ gridColumn: 'span 2' }}
        onClick={() => onSelectRouteType('SAFEST')}
      >
        <div className="card-header-badge badge-safe">
          <span>🌟 TUYẾN AN TOÀN DUY NHẤT (GỘP TUYẾN)</span>
        </div>

        <div style={{ color: '#34d399', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
          Tất cả các tuyến đường đều an toàn, không có ngập
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
          Hai tuyến gộp làm một, ưu tiên tuyến ngắn nhất để tối ưu thời gian lưu thông.
        </p>

        <div className="stat-main">{fastest_route.duration_formatted}</div>

        <div className="hazard-stat-box hazard-safe">
          <strong>Số điểm ngập: 0</strong>
          <div style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>
            ✓ Toàn bộ mặt đường cao ráo, lưu thông thông suốt.
          </div>
        </div>

        <button
          type="button"
          style={{
            marginTop: 'auto',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '0.85rem',
            cursor: 'pointer',
            paddingTop: '1.25rem',
            textDecoration: 'underline',
            textAlign: 'left',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onBackToInput();
          }}
        >
          ← Chỉnh sửa điểm đi / đến
        </button>
      </div>
    );
  }

  // =========================================================================
  // KỊCH BẢN TIÊU CHUẨN HOẶC TẤT CẢ TUYẾN ĐỀU BỊ NGẬP DO MƯA LỚN
  // =========================================================================
  return (
    <>
      {all_flooded && (
        <div
          style={{
            gridColumn: 'span 2',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            color: '#fca5a5',
            fontSize: '0.88rem',
            marginBottom: '0.25rem',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ef4444', marginBottom: '0.3rem' }}>
            ⚠️ Cảnh báo: Toàn bộ lộ trình đều có điểm ngập sâu
          </div>
          <div>
            {advisory_recommendation ||
              'Hiển thị phương án có mực ngập thấp nhất kèm lời khuyên hoãn chuyến đi.'}
          </div>
        </div>
      )}

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
                  ⚠️ Cảnh báo có {fastest_route.hazard_count} đoạn ngập nước (mức ngập sâu tới{' '}
                  {fastest_route.max_depth_cm}cm, nguy cơ chết máy cao).
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
                {safest_route.hazard_count === 0
                  ? '✓ Đảm bảo mặt đường cao ráo, hoàn toàn né tránh các vùng ngập úng.'
                  : `Phương án có mực ngập thấp nhất (${safest_route.max_depth_cm}cm).`}
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
