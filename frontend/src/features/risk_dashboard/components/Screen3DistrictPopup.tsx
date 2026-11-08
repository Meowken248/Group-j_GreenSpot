import React, { useEffect, useRef } from "react";
import type { DistrictDetailResponse } from "../types/riskDashboard.types";
import { navigateToRoute } from "../../../routes/appRoutes";

interface Screen3DistrictPopupProps {
  districtData: DistrictDetailResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMap: (district: DistrictDetailResponse) => void;
}

export const Screen3DistrictPopup: React.FC<Screen3DistrictPopupProps> = ({
  districtData,
  isOpen,
  onClose,
  onNavigateToMap,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Lắng nghe sự kiện phím Esc để đóng popup nhanh chóng theo quy tắc
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !districtData) return null;

  // Xử lý khi nhấp chuột ra ngoài vùng nền mờ
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const getRiskColor = (score: number) => {
    if (score > 80) return "#ef4444";
    if (score >= 60) return "#f59e0b";
    if (score >= 40) return "#eab308";
    return "#10b981";
  };

  return (
    <div
      className="district-popup-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-district-title"
    >
      <div className="district-popup-card" ref={cardRef}>
        {/* Dòng chữ nhỏ "POPUP" theo đúng wireframe */}
        <span className="popup-badge-small">POPUP</span>

        {/* Tiêu đề in đậm "CHI TIẾT QUẬN" theo đúng wireframe */}
        <h2 id="popup-district-title" className="popup-title-bold">
          CHI TIẾT QUẬN
        </h2>

        {/* Tên quận */}
        <div className="district-name-heading">
          📍 {districtData.district_name}
        </div>

        {/* Các trường dữ liệu quan trọng: Điểm rủi ro | Sự cố | Cơ sở thiết yếu */}
        <div className="popup-data-grid">
          {/* 1. Điểm rủi ro */}
          <div className="data-box">
            <span className="box-label">Điểm rủi ro</span>
            <div className="box-value" style={{ color: getRiskColor(districtData.risk_score) }}>
              {districtData.risk_score_text}
            </div>
          </div>

          {/* 2. Sự cố tồn đọng */}
          <div className="data-box">
            <span className="box-label">Sự cố tồn đọng</span>
            <div className="box-value" style={{ color: "#ef4444" }}>
              ⚠️ {districtData.pending_incidents_text}
            </div>
          </div>

          {/* 3. Cơ sở thiết yếu bị đe dọa */}
          <div className="data-box">
            <span className="box-label">Cơ sở thiết yếu bị đe dọa (Buffer 300m)</span>
            <div className="box-value" style={{ color: "#d97706" }}>
              🏥 {districtData.threatened_facilities_text}
            </div>
          </div>
        </div>

        {/* Khung nút chức năng theo đúng wireframe */}
        <div className="popup-actions">
          {/* Nút "Xem bản đồ" */}
          <button
            type="button"
            className="btn-map-view"
            onClick={() => onNavigateToMap(districtData)}
            title="Điều hướng sang Bản đồ nhiệt không gian GIS hoặc EcoMap"
          >
            <span>🗺️</span>
            <span>Xem bản đồ</span>
          </button>

          {/* Nút Xem điểm nóng quận này (STT 44) */}
          <button
            type="button"
            className="btn-map-view"
            onClick={() => {
              navigateToRoute("hotspots", { district: districtData.district_name });
              onClose();
            }}
            style={{ background: "#dc2626", borderColor: "#b91c1c", color: "#ffffff" }}
            title="Xem phân tích điểm nóng mật độ cao KDE và dự báo 7 ngày của quận này"
          >
            <span>🔥</span>
            <span>Xem điểm nóng</span>
          </button>

          {/* Nút Xem lệnh điều phối quận này */}
          <button
            type="button"
            className="btn-map-view"
            onClick={() => {
              navigateToRoute("dispatch", { district: districtData.district_name });
              onClose();
            }}
            style={{ background: "#2563eb", borderColor: "#1d4ed8", color: "#ffffff" }}
            title="Xem danh sách lệnh điều phối tác nghiệp hiện trường của quận này"
          >
            <span>⚡</span>
            <span>Xem điều phối</span>
          </button>

          {/* Nút "Đóng" */}
          <button
            type="button"
            className="btn-close-popup"
            onClick={onClose}
            title="Đóng popup và quay về giao diện Dashboard (Esc)"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
