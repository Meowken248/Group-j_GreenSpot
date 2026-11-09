import React from 'react';
import type { NavigationRoutePlan } from '../types/navigation.types';

interface Screen3DirectionsProps {
  routePlan: NavigationRoutePlan;
  isNavigating: boolean;
  onStartNavigation: () => void;
  onShareRoute: () => void;
  onSimulateOffRoute: () => void;
  onBackToCompare: () => void;
}

export const Screen3Directions: React.FC<Screen3DirectionsProps> = ({
  routePlan,
  isNavigating,
  onStartNavigation,
  onShareRoute,
  onSimulateOffRoute,
  onBackToCompare,
}) => {
  return (
    <div className="two-column-layout">
      {/* CỘT TRÁI: CHỈ ĐƯỜNG */}
      <div className="panel-card directions-block">
        <h2 className="panel-title">
          <span>🧭 CHỈ ĐƯỜNG CHI TIẾT</span>
          <span className="panel-badge">{routePlan.duration_formatted}</span>
        </h2>

        {/* Danh sách từng bước rẽ */}
        <div className="turn-steps-list">
          {routePlan.turn_steps.map((st) => (
            <div key={st.step_number} className="step-item">
              <div className="step-icon-box">
                {st.maneuver === 'arrive'
                  ? '🏁'
                  : st.maneuver.includes('right')
                  ? '↱'
                  : st.maneuver.includes('left')
                  ? '↰'
                  : '↑'}
              </div>
              <div className="step-content">
                <div className="step-instruction">{st.instruction}</div>
                <div className="step-distance">
                  {st.distance_meters > 1000
                    ? `${(st.distance_meters / 1000).toFixed(1)} km`
                    : `${Math.round(st.distance_meters)} mét`}{' '}
                  • {Math.ceil(st.duration_seconds / 60)} phút
                </div>
                {st.avoid_reason && (
                  <div className="step-avoid-badge">🛡️ {st.avoid_reason}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Điểm ngập đã tránh */}
        {routePlan.avoided_hazards && routePlan.avoided_hazards.length > 0 && (
          <div className="avoided-hotspots-section">
            <div className="section-heading">
              <span>🌊 ĐIỂM NGẬP ĐÃ TRÁNH ({routePlan.avoided_hazards.length})</span>
            </div>
            {routePlan.avoided_hazards.map((hz, idx) => (
              <div key={idx} className="avoided-item">
                <strong>{hz.street_name}</strong>: Ngập sâu ~{hz.predicted_depth_cm}cm (Đã chủ động bẻ lái né vùng ngập để bảo vệ phương tiện)
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CỘT PHẢI: HÀNH ĐỘNG */}
      <div className="panel-card" style={{ justifyContent: 'center' }}>
        <h2 className="panel-title">
          <span>⚡ HÀNH ĐỘNG</span>
          <span className="panel-badge">Màn 3/4</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="cta-primary-btn"
            onClick={onStartNavigation}
          >
            <span>{isNavigating ? '🟢 Đang dẫn đường GPS' : '🚀 Bắt đầu đi'}</span>
          </button>

          <button
            type="button"
            className="cta-secondary-btn"
            onClick={onShareRoute}
          >
            <span>🔗 Chia sẻ tuyến</span>
          </button>

          {isNavigating && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.85rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '0.4rem' }}>
                📡 Chế độ giám sát ngập thời gian thực đang chạy ngầm...
              </div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>
                Nếu phát hiện điểm ngập mới phát sinh trên tuyến (&lt; 500m), popup cảnh báo khẩn cấp sẽ lập tức kích hoạt.
              </p>

              <button
                type="button"
                style={{
                  marginTop: '0.75rem',
                  background: 'transparent',
                  border: '1px dashed #fbbf24',
                  color: '#fbbf24',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
                onClick={onSimulateOffRoute}
              >
                Mô phỏng đi chệch tuyến (Reroute)
              </button>
            </div>
          )}

          <button
            type="button"
            style={{
              marginTop: '1.5rem',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              textAlign: 'center',
            }}
            onClick={onBackToCompare}
          >
            ← Quay lại so sánh 2 tuyến
          </button>
        </div>
      </div>
    </div>
  );
};
