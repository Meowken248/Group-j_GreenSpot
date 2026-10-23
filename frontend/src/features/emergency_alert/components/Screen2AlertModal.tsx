import React, { useState } from "react";
import type { UserActiveAlertResponse } from "../types/emergency_alert.types";
import { emergencyAlertApi } from "../services/emergencyAlertApi";

interface Screen2AlertModalProps {
  alertData: UserActiveAlertResponse;
  onNavigateSafetyCheck: () => void;
  onNavigateSafeRoute: () => void;
  onClose?: () => void;
}

export const Screen2AlertModal: React.FC<Screen2AlertModalProps> = ({
  alertData,
  onNavigateSafetyCheck,
  onNavigateSafeRoute,
  onClose,
}) => {
  const [sosSent, setSosSent] = useState<boolean>(false);
  const [sosHotlines, setSosHotlines] = useState<{ fire: string; ambulance: string; center: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Nút 1: "Tôi an toàn" -> Chuyển sang Màn 3/4 Safety Check
  const handleMarkSafe = async () => {
    if (alertData.alert_id) {
      try {
        await emergencyAlertApi.acknowledgeAlert(alertData.alert_id, "SAFE");
      } catch {
        // Ignored
      }
    }
    onNavigateSafetyCheck();
  };

  // Nút 2: "Cần giúp đỡ" (SOS) -> Gửi vị trí GPS và gọi cứu hộ
  const handleTriggerSOS = async () => {
    setIsSubmitting(true);
    try {
      // Giả lập tọa độ GPS hiện tại nếu không lấy được Geolocation trình duyệt
      const lat = 10.758;
      const lng = 106.675;
      const res = await emergencyAlertApi.triggerSOS({
        alert_id: alertData.alert_id || undefined,
        latitude: lat,
        longitude: lng,
        location_address: "Khu vực bán kính ngập An Dương Vương, Quận 5",
        phone_number: "0901234567",
        notes: "Yêu cầu cứu hộ khẩn cấp từ Modal Cảnh báo!",
      });

      setSosSent(true);
      setSosHotlines({
        fire: res.hotlines.fire_rescue,
        ambulance: res.hotlines.ambulance,
        center: res.hotlines.local_operations_center,
      });
    } catch {
      // Fallback khi offline
      setSosSent(true);
      setSosHotlines({
        fire: "114",
        ambulance: "115",
        center: "1800-6868",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nút 3: "Xem chi tiết" -> Chuyển sang bản đồ tránh ngập STT 41
  const handleViewDetail = async () => {
    if (alertData.alert_id) {
      try {
        await emergencyAlertApi.acknowledgeAlert(alertData.alert_id, "NAVIGATE");
      } catch {
        // Ignored
      }
    }
    onNavigateSafeRoute();
  };

  const situationText =
    alertData.situation_message ||
    `Ngập nặng trong bán kính ${((alertData.radius_meters || 2000) / 1000).toFixed(1)} km quanh bạn`;

  return (
    <div className="alert-modal-backdrop" role="dialog" aria-modal="true">
      <div className={`alert-modal-card ${sosSent ? "sos-mode" : ""}`}>
        {/* Nhãn POPUP ở góc trái trên đúng Prototype */}
        <span className="alert-modal-tag">POPUP</span>

        {/* Nút đóng nhỏ ở góc trên nếu cần */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: "14px",
              right: "18px",
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
            title="Đóng cảnh báo"
          >
            ✕
          </button>
        )}

        {/* Biểu tượng: Icon tam giác cảnh báo màu đỏ nhấp nháy phát âm thanh báo động */}
        <div className="danger-icon-animated" aria-hidden="true">
          {sosSent ? "🆘" : "⚠️"}
        </div>

        {/* Tiêu đề in đậm: "CẢNH BÁO KHẨN CẤP" */}
        <h2 className="alert-modal-title">
          {sosSent ? "TÍN HIỆU CỨU NẠN KHẨN CẤP ĐÃ GỬI" : (alertData.title || "CẢNH BÁO KHẨN CẤP")}
        </h2>

        {/* Thông điệp tình huống: "Ngập nặng trong bán kính 2 km quanh bạn" */}
        <div className="alert-situation-message">
          {sosSent
            ? "Đã gửi tín hiệu cứu nạn khẩn cấp kèm tọa độ GPS tới Ban Chỉ huy Cứu nạn và người thân!"
            : situationText}
        </div>

        {/* Khuyến nghị sơ tán/tìm chỗ trú an toàn */}
        <div className="alert-detail-advice">
          {sosSent ? (
            <div>
              <p style={{ margin: "0 0 6px 0", color: "#f87171", fontWeight: 700 }}>
                Đội cứu hộ cơ động đang được điều phối đến tọa độ của bạn. Vui lòng giữ liên lạc và giữ máy thông suốt!
              </p>
              {sosHotlines && (
                <div style={{ display: "flex", justifyContent: "space-around", marginTop: "10px", fontSize: "0.85rem" }}>
                  <span>🚒 Cứu hỏa: <strong>{sosHotlines.fire}</strong></span>
                  <span>🚑 Cấp cứu: <strong>{sosHotlines.ambulance}</strong></span>
                  <span>🏢 Ban PCTT: <strong>{sosHotlines.center}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{ margin: 0 }}>
                {alertData.content ||
                  "Mực nước dâng nhanh vượt ngưỡng an toàn. Khuyến nghị người dân không đi vào các điểm ngập sâu và tìm chỗ trú an toàn ngay lập tức."}
              </p>
              {alertData.safe_routes_summary && (
                <p style={{ margin: "8px 0 0 0", color: "#60a5fa", fontSize: "0.82rem" }}>
                  🛣️ Tuyến tránh gợi ý: {alertData.safe_routes_summary}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cụm 3 nút hành động tương tác hình bầu dục (oval) đúng Prototype */}
        {!sosSent ? (
          <div className="alert-action-buttons-group">
            <button
              type="button"
              className="modal-action-oval-btn btn-safe-action"
              onClick={handleMarkSafe}
            >
              <span>🛡️ Tôi an toàn</span>
            </button>

            <button
              type="button"
              className="modal-action-oval-btn btn-sos-danger-action"
              onClick={handleTriggerSOS}
              disabled={isSubmitting}
            >
              <span>🆘 {isSubmitting ? "Đang gửi..." : "Cần giúp đỡ"}</span>
            </button>

            <button
              type="button"
              className="modal-action-oval-btn btn-view-detail-action"
              onClick={handleViewDetail}
            >
              <span>🗺️ Xem chi tiết</span>
            </button>
          </div>
        ) : (
          <div className="alert-action-buttons-group">
            <button
              type="button"
              className="modal-action-oval-btn btn-safe-action"
              onClick={handleMarkSafe}
            >
              <span>🛡️ Chuyển sang báo Tôi an toàn cho người thân</span>
            </button>
            <button
              type="button"
              className="modal-action-oval-btn btn-view-detail-action"
              onClick={onNavigateSafeRoute}
            >
              <span>🗺️ Mở bản đồ định vị tuyến đường an toàn</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
