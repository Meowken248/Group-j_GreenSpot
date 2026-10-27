import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
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

const MAP_TILES = {
  roadmap: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  satellite: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
};

// Dữ liệu cơ sở mẫu fallback khi chưa kết nối CSDL hoặc đang tải
const FALLBACK_FACILITIES: FacilityItem[] = [
  {
    facility_id: 26,
    facility_name: "Trường Tiểu học Lê Lợi",
    facility_type: "Trường học",
    address: "128 Lê Lợi, P. Bến Nghé, Quận 1",
    distance_meters: 45,
    distance_display: "Cách 45m",
    is_danger_proximity: true,
    is_immediate_risk: true,
    contact_phone: "028 3829 4567",
    vulnerability_level: "RẤT CAO",
    latitude: 10.77265,
    longitude: 106.69835,
  },
  {
    facility_id: 27,
    facility_name: "Bệnh viện Quận 1 (Cơ sở 1)",
    facility_type: "Bệnh viện",
    address: "338 Hai Bà Trưng, P. Tân Định, Quận 1",
    distance_meters: 140,
    distance_display: "Cách 140m",
    is_danger_proximity: true,
    is_immediate_risk: false,
    contact_phone: "028 3820 1234",
    vulnerability_level: "CAO",
    latitude: 10.7734,
    longitude: 106.6972,
  },
  {
    facility_id: 28,
    facility_name: "Trường THCS Chu Văn An",
    facility_type: "Trường học",
    address: "115 Cống Quỳnh, P. Nguyễn Cư Trinh, Quận 1",
    distance_meters: 180,
    distance_display: "Cách 180m",
    is_danger_proximity: true,
    is_immediate_risk: false,
    contact_phone: "028 3836 7890",
    vulnerability_level: "CAO",
    latitude: 10.7711,
    longitude: 106.6988,
  },
];

export const SpatialFacilityView: React.FC<SpatialFacilityViewProps> = ({
  incidentData,
  onBackToTriage,
}) => {
  // Điều hướng 3 màn hình của STT 40:
  // SCREEN_1_MAP_BUFFER -> SCREEN_2_FACILITY_LIST -> SCREEN_3_FACILITY_DETAIL
  const [currentStep, setCurrentStep] = useState<SpatialScreenStep>("SCREEN_1_MAP_BUFFER");

  // State  Bán kính quét & Checkbox loại cơ sở
  const [radiusMeters, setRadiusMeters] = useState<number>(1000.0); // Mặc định 1 km
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "Trường học",
    "Bệnh viện",
    "Trạm y tế",
  ]);
  const [typeSelectionError, setTypeSelectionError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // State  Kết quả tìm kiếm & Bộ lọc nhanh
  const [searchResponse, setSearchResponse] = useState<FacilityListResponse | null>(null);
  const [activeFilterType, setActiveFilterType] = useState<string>("ALL");

  // State  Hồ sơ chi tiết cơ sở được chọn
  const [selectedFacilityDetail, setSelectedFacilityDetail] = useState<FacilityDetailProfile | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isSendingAlert, setIsSendingAlert] = useState<boolean>(false);

  // Leaflet Map state & refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.FeatureGroup | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");

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

  // Tự động nạp danh sách cơ sở ban đầu khi mở màn hình
  useEffect(() => {
    if (incidentData?.incident_id) {
      triageService
        .queryFacilitiesInBuffer(incidentData.incident_id, radiusMeters, selectedTypes)
        .then((res) => {
          setSearchResponse(res);
        })
        .catch(() => {
          // Bỏ qua lỗi ngầm định, sử dụng dữ liệu fallback nếu chưa có DB
        });
    }
  }, [incidentData?.incident_id]);

  // Khởi tạo bản đồ Leaflet khi ở SCREEN_1_MAP_BUFFER
  useEffect(() => {
    if (currentStep !== "SCREEN_1_MAP_BUFFER") {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const centerLat = incidentData.latitude || 10.7725;
      const centerLng = incidentData.longitude || 106.698;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      const tileLayer = L.tileLayer(MAP_TILES[mapType], {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 21,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      const layersGroup = L.featureGroup().addTo(map);
      layersGroupRef.current = layersGroup;

      mapRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    } catch (err) {
      console.warn("Leaflet map initialization skipped or not supported:", err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [currentStep]);

  // Thay đổi kiểu bản đồ (Đường phố / Vệ tinh)
  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(MAP_TILES[mapType]);
  }, [mapType]);

  // Cập nhật Ghim tâm sự cố, Vòng đệm bán kính (Buffer Circle) và các cơ sở thiết yếu
  useEffect(() => {
    const map = mapRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup || currentStep !== "SCREEN_1_MAP_BUFFER") return;

    layersGroup.clearLayers();

    const centerLat = incidentData.latitude || 10.7725;
    const centerLng = incidentData.longitude || 106.698;
    const centerLatLng: L.LatLngTuple = [centerLat, centerLng];

    // 1. Ghim Tâm sự cố đỏ nhấp nháy
    const incidentIcon = L.divIcon({
      className: "spatial-incident-badge",
      html: `
        <div class="pin-halo"></div>
        <div class="pin-badge">🚨</div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    L.marker(centerLatLng, { icon: incidentIcon })
      .bindPopup(`
        <div style="font-size: 13px; line-height: 1.4; color: #0f172a;">
          <strong style="color: #ef4444; font-size: 14px;">🚨 TÂM SỰ CỐ MÔI TRƯỜNG</strong><br/>
          <span style="font-weight: 600; color: #1e293b;">${incidentData.tracking_code}</span>: ${incidentData.title}<br/>
          <span style="color: #64748b; font-size: 12px;">📍 ${incidentData.address_text}</span>
        </div>
      `)
      .addTo(layersGroup);

    // 2. Vòng tròn bán kính vùng đệm (Buffer Zone)
    const bufferCircle = L.circle(centerLatLng, {
      radius: radiusMeters,
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.12,
      dashArray: "6, 6",
      weight: 2,
    }).addTo(layersGroup);

    // 3. Hiển thị các cơ sở thiết yếu xung quanh tâm
    const rawFacilities = searchResponse?.facilities?.length
      ? searchResponse.facilities
      : FALLBACK_FACILITIES;

    // Lọc theo các loại được chọn
    const activeFacilities = rawFacilities.filter((f) =>
      selectedTypes.includes(f.facility_type)
    );

    activeFacilities.forEach((fac) => {
      const facLat = fac.latitude || centerLat + 0.0005;
      const facLng = fac.longitude || centerLng + 0.0005;

      const isSchool = fac.facility_type === "Trường học";
      const isHospital = fac.facility_type === "Bệnh viện";
      const badgeClass = isSchool
        ? "facility-school"
        : isHospital
          ? "facility-hospital"
          : "facility-clinic";
      const badgeIcon = isSchool ? "🏫" : isHospital ? "🏥" : "🩺";

      const facMarkerIcon = L.divIcon({
        className: "custom-fac-pin",
        html: `
          <div class="spatial-facility-badge ${badgeClass}" title="${fac.facility_name}">
            ${badgeIcon}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupHtml = document.createElement("div");
      popupHtml.style.cssText = "font-size: 13px; line-height: 1.4; color: #0f172a; min-width: 180px;";
      popupHtml.innerHTML = `
        <strong style="color: #0f172a; font-size: 13.5px;">${badgeIcon} ${fac.facility_name}</strong><br/>
        <span style="color: #64748b; font-size: 12px;">${fac.address}</span><br/>
        <div style="margin: 4px 0;">
          <span style="color: ${fac.is_danger_proximity ? "#ef4444" : "#10b981"}; font-weight: 700;">
            ${fac.distance_display}
          </span>
          ${fac.is_immediate_risk ? ' <span style="background: #fee2e2; color: #b91c1c; font-size: 10px; padding: 1px 4px; border-radius: 4px; font-weight: 700;">RẤT GẦN &lt;100m</span>' : ""}
        </div>
        ${fac.contact_phone ? `<span style="font-size: 11.5px; color: #475569;">📞 ${fac.contact_phone}</span><br/>` : ""}
        <button id="view-fac-btn-${fac.facility_id}" style="margin-top: 6px; width: 100%; background: #2563eb; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 600;">
          Xem hồ sơ chi tiết →
        </button>
      `;

      const marker = L.marker([facLat, facLng], { icon: facMarkerIcon })
        .bindPopup(popupHtml)
        .addTo(layersGroup);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`view-fac-btn-${fac.facility_id}`);
        if (btn) {
          btn.onclick = () => {
            handleOpenDetail(fac.facility_id);
          };
        }
      });
    });

    // Căn chỉnh khung nhìn vừa khít vòng đệm bán kính
    map.fitBounds(bufferCircle.getBounds(), { padding: [35, 35], maxZoom: 18 });
  }, [
    incidentData,
    radiusMeters,
    selectedTypes,
    searchResponse,
    currentStep,
  ]);

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
    } catch {
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
    } catch {
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
    } catch {
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
           BẢN ĐỒ VÙNG ĐỆM & TÙY CHỌN BÁN KÍNH (HÌNH 4.40)
          2 KHỐI THEO CHIỀU NGANG: BẢN ĐỒ (Trái) | TUỲ CHỌN (Phải)
         ========================================================================= */}
      {currentStep === "SCREEN_1_MAP_BUFFER" && (
        <div className="spatial-screen-1-grid">
          {/* CỘT TRÁI: KHỐI "BẢN ĐỒ" */}
          <div className="col-map-view">
            <div className="map-header-bar">
              <span>🗺️ BẢN ĐỒ PHÂN TÍCH VÙNG ĐỆM (BUFFER RADIUS GIS)</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {/* Nút chuyển đổi Đường phố / Vệ tinh */}
                <div style={{ display: "flex", gap: "3px" }}>
                  <button
                    type="button"
                    style={{
                      background: mapType === "roadmap" ? "#2563eb" : "#334155",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "2px 7px",
                      cursor: "pointer",
                      fontSize: "0.72rem",
                    }}
                    onClick={() => setMapType("roadmap")}
                  >
                    🗺️ Đường phố
                  </button>
                  <button
                    type="button"
                    style={{
                      background: mapType === "satellite" ? "#2563eb" : "#334155",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "2px 7px",
                      cursor: "pointer",
                      fontSize: "0.72rem",
                    }}
                    onClick={() => setMapType("satellite")}
                  >
                    🛰️ Vệ tinh
                  </button>
                </div>
                <span className="map-radius-badge">
                  Bán kính: {radiusMeters >= 1000 ? `${radiusMeters / 1000} km` : `${radiusMeters} m`}
                </span>
              </div>
            </div>

            <div className="map-canvas-container">
              {/* Bản đồ Leaflet tương tác thực tế với lớp gạch Google Maps & PostGIS Buffer */}
              <div
                ref={mapContainerRef}
                className="spatial-leaflet-map"
                style={{ width: "100%", height: "100%", minHeight: "440px" }}
              />
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
                className="btn-back-to-triage-sub"
                onClick={onBackToTriage}
              >
                ← Quay lại Màn hình Tóm tắt AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
           BẢNG TỔNG HỢP DANH SÁCH CƠ SỞ THIẾT YẾU TRONG VÙNG ĐỆM (HÌNH 4.40)
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
              <span className="filter-header-count">
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
                          <span className="dist-danger-flag">
                            [Rất gần &lt; 100m]
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-open-profile"
                      onClick={() => handleOpenDetail(fac.facility_id)}
                      disabled={isLoadingDetail}
                    >
                      {isLoadingDetail ? "Đang tải…" : "Xem chi tiết →"}
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-facilities-view">
                  Không tìm thấy cơ sở thiết yếu nào trong bán kính đã chọn.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
           HỒ SƠ CHI TIẾT CƠ SỞ & CÔNG CỤ ĐIỀU HÀNH (HÌNH 4.40)
          2 KHỐI: THÔNG TIN CƠ SỞ (Trái) | HÀNH ĐỘNG (Phải)
         ========================================================================= */}
      {currentStep === "SCREEN_3_FACILITY_DETAIL" && selectedFacilityDetail && (
        <div className="spatial-screen-3-grid">
          {/* CỘT TRÁI: KHỐI "THÔNG TIN CƠ SỞ" */}
          <div className="col-facility-detail-card">
            <div className="panel-heading">
              <span>🏥 HỒ SƠ CƠ SỞ THIẾT YẾU</span>
              <button
                type="button"
                className="btn-back-to-list-link"
                onClick={() => setCurrentStep("SCREEN_2_FACILITY_LIST")}
              >
                ← Quay lại danh sách
              </button>
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
                <div className="field-text detail-distance-val">
                  {selectedFacilityDetail.incident_distance_display || "Trong vùng đệm"}
                </div>
              </div>

              <div className="detail-field">
                <div className="field-label">Đầu mối & Số điện thoại khẩn cấp</div>
                <div className="field-text">
                  <div>👤 {selectedFacilityDetail.contact_person || "Ban giám hiệu / Ban giám đốc"}</div>
                  <div className="contact-phone-val">
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
                  className="btn-action-directions btn-action-directions-link"
                >
                  🗺️ Chỉ đường dẫn xe dọn rác
                </a>

                {/* Nút 3: Gửi cảnh báo SMS / Email */}
                <button
                  type="button"
                  className="btn-action-send-alert"
                  onClick={handleSendAlert}
                  disabled={isSendingAlert || !selectedFacilityDetail.can_alert}
                >
                  {isSendingAlert ? "Đang gửi cảnh báo khẩn…" : "📢 Gửi cảnh báo khẩn cấp"}
                </button>
              </div>
            </div>

            <div className="action-hint-note">
              ℹ️ Các thao tác liên hệ và chỉ đường đều được ghi tự động vào Nhật ký kiểm toán hệ thống.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
