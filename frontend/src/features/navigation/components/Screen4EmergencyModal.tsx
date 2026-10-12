import React, { useEffect } from 'react';
import type { EarlyWarningAlert } from '../types/navigation.types';
import { playEmergencyBeep, speakVietnamese } from '../services/navigationApi';

interface Screen4EmergencyModalProps {
  alertData: EarlyWarningAlert;
  onReroute: () => void;
  onContinue: () => void;
}

export const Screen4EmergencyModal: React.FC<Screen4EmergencyModalProps> = ({
  alertData,
  onReroute,
  onContinue,
}) => {
  // Khi popup kích hoạt: Phát âm thanh bíp bíp và giọng đọc AI qua loa
  useEffect(() => {
    playEmergencyBeep();
    const timer = setTimeout(() => {
      const voiceText =
        alertData.voice_announcement ||
        `Cảnh báo, phía trước ${Math.round(
          alertData.distance_ahead_meters || 300
        )} mét có điểm ngập sâu, bạn có muốn đổi tuyến?`;
      speakVietnamese(voiceText);
    }, 250);

    return () => clearTimeout(timer);
  }, [alertData]);

  const distanceMeters = Math.round(alertData.distance_ahead_meters || 300);
  const waterLevelText =
    alertData.water_level_display || 'Mực nước: 0.45m - Nguy cơ chết máy cao';

  return (
    <div className="emergency-modal-backdrop">
      <div className="emergency-modal-card">
        {/* Dòng nhỏ POPUP */}
        <span className="popup-tag">POPUP</span>

        {/* Tiêu đề in đậm màu đỏ */}
        <h2 className="popup-title">CẢNH BÁO NGẬP</h2>

        {/* Cảnh báo khoảng cách */}
        <div className="popup-distance">
          Phía trước {distanceMeters}m có điểm ngập sâu
        </div>

        {/* Mực nước ước tính */}
        <div className="popup-depth-desc">{waterLevelText}</div>

        {/* Hai nút chức năng */}
        <div className="popup-actions">
          <button
            type="button"
            className="btn-change-route"
            onClick={onReroute}
          >
            🔄 Đổi tuyến
          </button>

          <button
            type="button"
            className="btn-continue"
            onClick={onContinue}
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
};
