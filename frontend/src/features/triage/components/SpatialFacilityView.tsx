import React, { useState, useEffect } from "react";
import {
  TriageEvaluationData,
  SpatialScreenStep,
  FacilityItem,
  FacilityListResponse,
  FacilityDetailProfile,
} from "../types";
import { triageService } from "../services/triageService";

interface SpatialFacilityViewProps {
  incidentData: TriageEvaluationData;
  onBackToTriage: () => void;
}

export const SpatialFacilityView: React.FC<SpatialFacilityViewProps> = ({
  incidentData,
  onBackToTriage,
}) => {
  // Điều hướng 3 màn hình của STT 40:
  // SCREEN_1_MAP_BUFFER -> SCREEN_2_FACILITY_LIST -> SCREEN_3_FACILITY_DETAIL
  const [currentStep, setCurrentStep] = useState<SpatialScreenStep>("SCREEN_1_MAP_BUFFER");

  // State Màn 1/3: Bán kính quét & Checkbox loại cơ sở
  const [radiusMeters, setRadiusMeters] = useState<number>(1000.0); // Mặc định 1 km
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "Trường học",
    "Bệnh viện",
    "Trạm y tế",
  ]);
  const [typeSelectionError, setTypeSelectionError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // State Màn 2/3: Kết quả tìm kiếm & Bộ lọc nhanh
  const [searchResponse, setSearchResponse] = useState<FacilityListResponse | null>(null);
  const [activeFilterType, setActiveFilterType] = useState<string>("ALL");

  // State Màn 3/3: Hồ sơ chi tiết cơ sở được chọn
  const [selectedFacilityDetail, setSelectedFacilityDetail] = useState<FacilityDetailProfile | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isSendingAlert, setIsSendingAlert] = useState<boolean>(false);

  // Toast thông báo 3 giây
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Toggle checkbox loại cơ sở (Màn 1/3)
  const handleToggleType = (typeStr: string) => {
    setSelectedTypes((prev) => {
      const next = prev.includes(typeStr) ? prev.filter((t) => t !== typeStr) : [...prev, typeStr];
      if (next.length > 0) setTypeSelectionError(null);
      return next;
    });
  };

  // Bấm nút "Tìm cơ sở" (Màn 1/3 -> Màn 2/3)
  const handleExecuteSearch = async () => {
    if (selectedTypes.length === 0) {
      setTypeSelectionError("Vui lòng chọn ít nhất một loại cơ sở thiết yếu");
      return;
    }
    setTypeSelectionError(null);
    setIsSearching(true);

    try {
      const res = await triageService.queryFacilitiesInBuffer(
        incidentData.incident_id,
        radiusMeters,
        selectedTypes
      );
      setSearchResponse(res);
      setActiveFilterType("ALL");
      setCurrentStep("SCREEN_2_FACILITY_LIST");
    } catch (err: any) {
      showToast("Lỗi truy vấn cơ sở dữ liệu. Vui lòng thử lại", "error");
    } finally {
      setIsSearching(false);
    }
  };

  // Bấm "Xem chi tiết" của một cơ sở (Màn 2/3 -> Màn 3/3)
  const handleOpenDetail = async (facilityId: number) => {
    setIsLoadingDetail(true);
    try {
      const detail = await triageService.getFacilityDetail(facilityId, incidentData.incident_id);
      setSelectedFacilityDetail(detail);
      setCurrentStep("SCREEN_3_FACILITY_DETAIL");
    } catch (err: any) {
      showToast("Không thể tải hồ sơ chi tiết cơ sở. Vui lòng thử lại", "error");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Nút "Gửi cảnh báo" (Màn 3/3)
  const handleSendAlert = async () => {
    if (!selectedFacilityDetail) return;
    if (!selectedFacilityDetail.can_alert) {
      showToast("Chưa có thông tin liên hệ của cơ sở này", "error");
      return;
    }

    setIsSendingAlert(true);
    try {
      const res = await triageService.sendEmergencyAlert(
        incidentData.incident_id,
        selectedFacilityDetail.facility_id,
        `Cảnh báo ô nhiễm môi trường gần cơ sở: ${incidentData.title} tại ${incidentData.address_text}. Đề nghị đóng cửa sổ và hạn chế hoạt động ngoài trời.`
      );
      showToast(res.message, "success");
    } catch (err: any) {
      showToast("Không thể gửi tin nhắn cảnh báo. Vui lòng thử lại", "error");
    } finally {
      setIsSendingAlert(false);
    }
  };

  // Nút "Gọi điện" (Màn 3/3)
  const handleCall = async () => {
    if (!selectedFacilityDetail?.contact_phone) {
      showToast("Chưa có thông tin liên hệ của cơ sở này", "error");
      return;
    }
    await triageService.logCallInitiated(incidentData.incident_id, selectedFacilityDetail.facility_id);
    window.location.href = `tel:${selectedFacilityDetail.contact_phone.replace(/\s+/g, "")}`;
  };

  // Lọc cơ sở theo activeFilterType
  const displayedFacilities: FacilityItem[] = React.useMemo(() => {
    if (!searchResponse) return [];
    if (activeFilterType === "ALL") return searchResponse.facilities;
    return searchResponse.facilities.filter((f) => f.facility_type === activeFilterType);
  }, [searchResponse, activeFilterType]);

  return (
    <div className="spatial-main-content-flow">
      {/* Toast thông báo nổi 3 giây */}
      {toastMessage && (
        <div className={`triage-toast-notification ${toastType}`}>
          <span>{toastType === "success" ? "✅" : "⚠️"}</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          MÀN 1/3: BẢN ĐỒ VÙNG ĐỆM & TÙY CHỌN BÁN KÍNH (HÌNH 4.40)
          2 KHỐI THEO CHIỀU NGANG: BẢN ĐỒ (Trái) | TUỲ CHỌN (Phải)
         ========================================================================= */}
      {currentStep === "SCREEN_1_MAP_BUFFER" && (
        <div className="spatial-screen-1-grid">
          {/* CỘT TRÁI: KHỐI "BẢN ĐỒ" */}
          <div className="col-map-view">
            <div className="map-header-bar">
              <span>🗺️ BẢN ĐỒ PHÂN TÍCH VÙNG ĐỆM (BUFFER RADIUS GIS)</span>
              <span style={{ color: "#10b981", fontSize: "0.8rem" }}>
                Bán kính: {radiusMeters >= 1000 ? `${radiusMeters / 1000} km` : `${radiusMeters} m`}
              </span>
            </div>

            <div className="map-canvas-container">
              {/* Bản đồ SVG trực quan mô phỏng tâm sự cố và vòng đệm co giãn */}
              <svg width="100%" height="100%" viewBox="0 0 600 460" preserveAspectRatio="xMidYMid slice">
                <defs>
                  {/* Lưới tọa độ bản đồ */}
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" />
                  </pattern>
                  {/* Hiệu ứng gradient vùng đệm */}
                  <radialGradient id="bufferGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                    <stop offset="70%" stopColor="#f97316" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                  </radialGradient>
                </defs>

                <rect width="600" height="460" fill="#0f172a" />
                <rect width="600" height="460" fill="url(#grid)" />

                {/* Các con đường đô thị mô phỏng */}
                <path d="M 0 230 Q 300 210 600 230" stroke="#475569" strokeWidth="12" fill="none" />
                <path d="M 300 0 Q 320 230 300 460" stroke="#475569" strokeWidth="10" fill="none" />
                <path d="M 120 80 L 480 380" stroke="#334155" strokeWidth="6" fill="none" />

                {/* Vòng tròn bán kính vùng đệm (Buffer zone) co giãn theo thời gian thực */}
                {/* 500m -> r=80, 1000m -> r=150, 2000m -> r=220 */}
                {(() => {
                  const circleR = radiusMeters === 500 ? 80 : radiusMeters === 1000 ? 150 : 220;
                  return (
                    <g>
                      <circle
                        cx="300"
                        cy="230"
                        r={circleR}
                        fill="url(#bufferGradient)"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="6,4"
                      />
                      <circle cx="300" cy="230" r={circleR} fill="none" stroke="#f97316" strokeWidth="1" opacity="0.6">
                        <animate attributeName="r" values={`${circleR - 5};${circleR + 5};${circleR - 5}`} dur="3s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  );
                })()}

                {/* Ghim sự cố đỏ ở tâm */}
                <g transform="translate(300, 230)">
                  <circle cx="0" cy="0" r="16" fill="rgba(239, 68, 68, 0.3)" />
                  <circle cx="0" cy="0" r="8" fill="#ef4444" />
                  <path d="M 0 0 L 0 -18" stroke="#ef4444" strokeWidth="3" />
                  <circle cx="0" cy="-18" r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                  <text x="0" y="24" fill="#fca5a5" fontSize="11" fontWeight="bold" textAnchor="middle">
                    TÂM SỰ CỐ
                  </text>
                </g>

                {/* Các điểm cơ sở thiết yếu mô phỏng */}
                {/* 1. Trường Tiểu học Lê Lợi (~45m) */}
                <g transform="translate(325, 215)">
                  <circle cx="0" cy="0" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="8" y="4" fill="#93c5fd" fontSize="10" fontWeight="bold">
                    Trường Lê Lợi (45m)
                  </text>
                </g>

                {/* 2. Bệnh viện Quận 1 (~140m) */}
                <g transform="translate(250, 180)">
                  <circle cx="0" cy="0" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="-90" y="4" fill="#fca5a5" fontSize="10" fontWeight="bold">
                    BV Quận 1 (140m)
                  </text>
                </g>

                {/* 3. Trường Chu Văn An (~180m) */}
                <g transform="translate(370, 280)">
                  <circle cx="0" cy="0" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="8" y="4" fill="#93c5fd" fontSize="10">
                    THCS Chu Văn An (180m)
                  </text>
                </g>
              </svg>
            </div>
          </div>

          {/* CỘT PHẢI: KHỐI "TUỲ CHỌN" */}
          <div className="col-map-options">
            <div>
              <div className="panel-heading">
                <span>⚙️ TUỲ CHỌN PHÂN TÍCH</span>
              </div>

              <div className="options-form">
                {/* Chọn Bán kính quét */}
                <div className="option-group">
                  <div className="group-title">Bán kính quét xung quanh sự cố:</div>
                  <div className="radius-radios">
                    <button
                      type="button"
                      className={`radius-btn ${radiusMeters === 500 ? "active" : ""}`}
                      onClick={() => setRadiusMeters(500)}
                    >
                      500m
                    </button>
                    <button
                      type="button"
                      className={`radius-btn ${radiusMeters === 1000 ? "active" : ""}`}
                      onClick={() => setRadiusMeters(1000)}
                    >
                      1 km (Chuẩn)
                    </button>
                    <button
                      type="button"
                      className={`radius-btn ${radiusMeters === 2000 ? "active" : ""}`}
                      onClick={() => setRadiusMeters(2000)}
                    >
                      2 km
                    </button>
                  </div>
                </div>

                {/* Hộp kiểm đa chọn Loại cơ sở */}
                <div className={`option-group ${typeSelectionError ? "has-error" : ""}`}>
                  <div className="group-title">Nhóm cơ sở thiết yếu cần quét:</div>
                  <div className="checkbox-group-wrapper">
                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes("Trường học")}
                        onChange={() => handleToggleType("Trường học")}
                      />
                      <span>🏫 Trường học (Mầm non, Tiểu học, THCS)</span>
                    </label>

                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes("Bệnh viện")}
                        onChange={() => handleToggleType("Bệnh viện")}
                      />
                      <span>🏥 Bệnh viện & Cơ sở y tế chuyên khoa</span>
                    </label>

                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes("Trạm y tế")}
                        onChange={() => handleToggleType("Trạm y tế")}
                      />
                      <span>🩺 Trạm y tế phường / xã</span>
                    </label>
                  </div>
                  {typeSelectionError && (
                    <div className="group-error-msg">⚠️ {typeSelectionError}</div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                className="btn-find-facilities"
                onClick={handleExecuteSearch}
                disabled={isSearching}
              >
                {isSearching ? "Đang quét cơ sở dữ liệu GIS…" : "🔍 Tìm cơ sở trong bán kính"}
              </button>

              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "0.825rem",
                  cursor: "pointer",
                  marginTop: "0.5rem",
                }}
                onClick={onBackToTriage}
              >
                ← Quay lại Màn hình Tóm tắt AI (STT 39)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MÀN 2/3: BẢNG TỔNG HỢP DANH SÁCH CƠ SỞ THIẾT YẾU TRONG VÙNG ĐỆM (HÌNH 4.40)
          2 KHỐI: BỘ LỌC (Trái) | DANH SÁCH (Phải)
         ========================================================================= */}
      {currentStep === "SCREEN_2_FACILITY_LIST" && searchResponse && (
        <div className="spatial-screen-2-grid">
          {/* CỘT TRÁI: KHỐI "BỘ LỌC" */}
          <div className="col-quick-filters">
            <div className="panel-heading">
              <span>📑 BỘ LỌC NHANH</span>
            </div>

            <div className="filters-list">
              <button
                type="button"
                className={`filter-pill-btn ${activeFilterType === "ALL" ? "active" : ""}`}
                onClick={() => setActiveFilterType("ALL")}
              >
                <span>Tất cả</span>
                <span>({searchResponse.total_found})</span>
              </button>

              <button
                type="button"
                className={`filter-pill-btn ${activeFilterType === "Trường học" ? "active" : ""}`}
                onClick={() => setActiveFilterType("Trường học")}
              >
                <span>Trường học</span>
                <span>({searchResponse.type_counts["Trường học"] || 0})</span>
              </button>

              <button
                type="button"
                className={`filter-pill-btn ${activeFilterType === "Bệnh viện" ? "active" : ""}`}
                onClick={() => setActiveFilterType("Bệnh viện")}
              >
                <span>Bệnh viện</span>
                <span>({searchResponse.type_counts["Bệnh viện"] || 0})</span>
              </button>

              <button
                type="button"
                className={`filter-pill-btn ${activeFilterType === "Trạm y tế" ? "active" : ""}`}
                onClick={() => setActiveFilterType("Trạm y tế")}
              >
                <span>Trạm y tế</span>
                <span>({searchResponse.type_counts["Trạm y tế"] || 0})</span>
              </button>
            </div>

            <button
              type="button"
              className="btn-back-to-map"
              onClick={() => setCurrentStep("SCREEN_1_MAP_BUFFER")}
            >
              ← Thay đổi bán kính / Tiêu chí quét
            </button>
          </div>

          {/* CỘT PHẢI: KHỐI "DANH SÁCH" */}
          <div className="col-facilities-list">
            <div className="panel-heading">
              <span>📋 DANH SÁCH CƠ SỞ CHỊU ẢNH HƯỞNG</span>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Bán kính: {searchResponse.radius_meters >= 1000 ? `${searchResponse.radius_meters / 1000} km` : `${searchResponse.radius_meters} m`}
              </span>
            </div>

            {/* Dòng cảnh báo nhấp nháy đỏ nếu có cơ sở < 100m */}
            {searchResponse.has_critical_nearby && (
              <div className="immediate-risk-banner">
                🚨 Cảnh báo: Có trường học/bệnh viện sát điểm ô nhiễm (&lt; 100m)
              </div>
            )}

            <div className="facilities-items-wrap">
              {displayedFacilities.length > 0 ? (
                displayedFacilities.map((fac) => (
                  <div
                    key={fac.facility_id}
                    className={`facility-row-card ${fac.is_danger_proximity ? "danger-border" : ""}`}
                  >
                    <div className="fac-info">
                      <div className="fac-title">
                        {fac.facility_name}
                      </div>
                      <div className="fac-sub">
                        <span>🏷️ {fac.facility_type}</span>
                        <span>•</span>
                        <span className={`dist-text ${fac.is_danger_proximity ? "danger" : ""}`}>
                          {fac.distance_display}
                        </span>
                        {fac.is_immediate_risk && (
                          <span style={{ color: "#ef4444", fontWeight: "bold" }}>
                            [Rất gần &lt; 100m]
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-view-fac-detail"
                      onClick={() => handleOpenDetail(fac.facility_id)}
                      disabled={isLoadingDetail}
                    >
                      Xem chi tiết →
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-green-message">
                  ✅ Không có cơ sở thiết yếu nào trong bán kính đã chọn
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MÀN 3/3: HỒ SƠ CHI TIẾT MỨC ĐỘ PHƠI NHIỄM & LIÊN HỆ KHẨN CẤP (HÌNH 4.40)
          2 KHỐI THEO CHIỀU NGANG: THÔNG TIN (Trái) | HÀNH ĐỘNG (Phải)
         ========================================================================= */}
      {currentStep === "SCREEN_3_FACILITY_DETAIL" && selectedFacilityDetail && (
        <div className="spatial-screen-3-grid">
          {/* CỘT TRÁI: KHỐI "THÔNG TIN" */}
          <div className="col-facility-info">
            <div className="panel-heading">
              <span>🏢 HỒ SƠ TIẾP XÚC MÔI TRƯỜNG CƠ SỞ</span>
            </div>

            <div className="detail-card-body">
              <div className="detail-field">
                <div className="field-label">Tên cơ sở thiết yếu</div>
                <div className="field-text">
                  <strong>{selectedFacilityDetail.facility_name}</strong> ({selectedFacilityDetail.facility_type})
                </div>
              </div>

              <div className="detail-field">
                <div className="field-label">Địa chỉ cụ thể</div>
                <div className="field-text">📍 {selectedFacilityDetail.address}</div>
              </div>

              <div className="detail-field">
                <div className="field-label">Khoảng cách chim bay tới sự cố</div>
                <div className="field-text" style={{ color: "#10b981", fontWeight: "bold" }}>
                  {selectedFacilityDetail.incident_distance_display || "Trong vùng đệm"}
                </div>
              </div>

              <div className="detail-field">
                <div className="field-label">Đầu mối & Số điện thoại khẩn cấp</div>
                <div className="field-text">
                  <div>👤 {selectedFacilityDetail.contact_person || "Ban giám hiệu / Ban giám đốc"}</div>
                  <div style={{ marginTop: "4px", color: "#60a5fa", fontWeight: "600" }}>
                    📞 {selectedFacilityDetail.contact_phone || "Chưa có thông tin liên hệ của cơ sở này"}
                  </div>
                </div>
              </div>

              <div className="detail-field">
                <div className="field-label">Thang đánh giá mức dễ tổn thương</div>
                <div className="vulnerability-badge">
                  {selectedFacilityDetail.vulnerability_level}
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: KHỐI "HÀNH ĐỘNG" */}
          <div className="col-facility-actions">
            <div>
              <div className="panel-heading">
                <span>⚡ CÔNG CỤ ĐIỀU HÀNH KHẨN CẤP</span>
              </div>

              <div className="actions-stack">
                {/* Nút 1: Gọi điện thoại */}
                <button
                  type="button"
                  className="btn-action-call"
                  onClick={handleCall}
                  disabled={!selectedFacilityDetail.can_call}
                >
                  📞 Gọi điện trực tiếp
                </button>

                {/* Nút 2: Chỉ đường ngắn nhất */}
                <a
                  href={selectedFacilityDetail.directions_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-action-directions"
                  style={{ textDecoration: "none" }}
                >
                  🗺️ Chỉ đường dẫn xe dọn rác
                </a>

                {/* Nút 3: Gửi cảnh báo SMS / Email */}
                <button
                  type="button"
                  className="btn-action-alert"
                  onClick={handleSendAlert}
                  disabled={isSendingAlert || !selectedFacilityDetail.can_alert}
                >
                  {isSendingAlert ? "Đang gửi cảnh báo…" : "📢 Gửi cảnh báo môi trường khẩn"}
                </button>

                {!selectedFacilityDetail.can_call && (
                  <div className="no-contact-hint">
                    ⚠️ Chưa có thông tin liên hệ của cơ sở này (Nút bị làm mờ)
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              className="btn-back-to-list"
              onClick={() => setCurrentStep("SCREEN_2_FACILITY_LIST")}
            >
              ← Quay lại danh sách cơ sở
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
