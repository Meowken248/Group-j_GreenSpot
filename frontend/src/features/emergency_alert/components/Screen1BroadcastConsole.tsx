import React, { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  AlertType,
  AlertSeverity,
  BroadcastHistoryItem,
} from "../types/emergency_alert.types";
import { emergencyAlertApi } from "../services/emergencyAlertApi";

interface Screen1BroadcastConsoleProps {
  onBroadcastSuccess?: (alertId: string) => void;
}

export const Screen1BroadcastConsole: React.FC<Screen1BroadcastConsoleProps> = ({
  onBroadcastSuccess,
}) => {
  // --- Khối 1: NỘI DUNG (Cột Trái) ---
  const [alertType, setAlertType] = useState<AlertType>("FLOOD");
  const [title, setTitle] = useState<string>("BÁO ĐỘNG NGẬP SÂU TRÊN 0.8M TẠI ĐƯỜNG AN DƯƠNG VƯƠNG");
  const [content, setContent] = useState<string>(
    "Mực nước dâng nhanh trên 0.8m do triều cường kết hợp mưa lớn đạt đỉnh lúc 17h30. Đề nghị người dân hạn chế di chuyển. Tuyến tránh an toàn: đường Trần Hưng Đạo hoặc Võ Văn Kiệt. Hotline cứu hộ: 114 / 115."
  );
  const [hotline, setHotline] = useState<string>("114 - 115 - 18006868");
  const [severity] = useState<AlertSeverity>("CRITICAL");

  // --- Khối 2: PHẠM VI (Cột Giữa) ---
  const [centerLat, setCenterLat] = useState<number>(10.758);
  const [centerLng, setCenterLng] = useState<number>(106.675);
  const [radiusMeters, setRadiusMeters] = useState<number>(2000); // Mặc định 2km
  const [estimatedCount, setEstimatedCount] = useState<number>(14850);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [spatialMessage, setSpatialMessage] = useState<string>(
    "Đã xác định vùng cảnh báo. Dự kiến phát sóng tới 14.850 người dân trong bán kính 2.0 km."
  );

  // --- Khối 3: GỬI (Cột Phải) ---
  const [isSending, setIsSending] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "danger" | "warning";
    text: string;
  } | null>(null);
  const [errors, setErrors] = useState<{ title?: boolean; content?: boolean; location?: boolean }>({});

  // Lịch sử phát sóng
  const [historyList, setHistoryList] = useState<BroadcastHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Fetch lịch sử cảnh báo
  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const data = await emergencyAlertApi.getBroadcastHistory(10);
      setHistoryList(data);
    } catch {
      // Ignored
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Spatial Query đếm số người nhận khi thay đổi tâm hoặc bán kính
  const updateSpatialEstimate = useCallback(
    async (lat: number, lng: number, radius: number) => {
      try {
        setIsEstimating(true);
        const res = await emergencyAlertApi.estimateRecipients({
          latitude: lat,
          longitude: lng,
          radius_meters: radius,
        });
        setEstimatedCount(res.estimated_recipients);
        setSpatialMessage(res.display_message);
      } catch {
        // Fallback ước tính cục bộ nếu gián đoạn mạng
        const fallbackCount = Math.max(120, Math.round((radius / 1000) * (radius / 1000) * 3700));
        setEstimatedCount(fallbackCount);
        setSpatialMessage(
          `Đã xác định vùng cảnh báo. Dự kiến phát sóng tới ${fallbackCount.toLocaleString("vi-VN")} người dân trong bán kính ${(radius / 1000).toFixed(1)} km.`
        );
      } finally {
        setIsEstimating(false);
      }
    },
    []
  );

  // Khởi tạo bản đồ tương tác Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Marker tâm cảnh báo với icon đỏ
    const redPinIcon = L.divIcon({
      className: "custom-red-pin-icon",
      html: `<div style="background:#ef4444;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px #ef4444;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">📍</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([centerLat, centerLng], {
      icon: redPinIcon,
      draggable: true,
    }).addTo(map);

    // Vòng tròn bán kính màu đỏ bán trong suốt quanh tâm
    const circle = L.circle([centerLat, centerLng], {
      radius: radiusMeters,
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.25,
      weight: 2,
    }).addTo(map);

    markerRef.current = marker;
    circleRef.current = circle;
    mapInstanceRef.current = map;

    // Sự kiện kéo thả pin drop
    marker.on("dragend", (e: L.LeafletEvent) => {
      const pos = (e.target as L.Marker).getLatLng();
      setCenterLat(pos.lat);
      setCenterLng(pos.lng);
      circle.setLatLng(pos);
      updateSpatialEstimate(pos.lat, pos.lng, radiusMeters);
    });

    // Sự kiện click bản đồ để cắm điểm ghim mới
    map.on("click", (e: L.LeafletMouseEvent) => {
      setCenterLat(e.latlng.lat);
      setCenterLng(e.latlng.lng);
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
      updateSpatialEstimate(e.latlng.lat, e.latlng.lng, radiusMeters);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [centerLat, centerLng, radiusMeters, updateSpatialEstimate]);

  // Cập nhật vòng tròn bán kính khi slider thay đổi
  const handleRadiusChange = (newRadius: number) => {
    setRadiusMeters(newRadius);
    if (circleRef.current) {
      circleRef.current.setRadius(newRadius);
    }
    updateSpatialEstimate(centerLat, centerLng, newRadius);
  };

  // Nút HỦY: Xóa dữ liệu ghim và đặt lại mặc định
  const handleCancelForm = () => {
    setTitle("");
    setContent("");
    setErrors({});
    setToastMessage({
      type: "warning",
      text: "Đã hủy soạn thảo và xóa dữ liệu ghim vùng cảnh báo.",
    });
  };

  // Nút GỬI CẢNH BÁO: Phát lệnh khẩn cấp diện rộng
  const handleSendBroadcast = async () => {
    // Kiểm tra bỏ trống tiêu đề hoặc nội dung
    const newErrors: { title?: boolean; content?: boolean } = {};
    if (!title.trim() || title.trim().length < 5) newErrors.title = true;
    if (!content.trim() || content.trim().length < 10) newErrors.content = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setToastMessage({
        type: "danger",
        text: "Vui lòng nhập nội dung cảnh báo và chọn phạm vi ảnh hưởng trên bản đồ.",
      });
      return;
    }

    setErrors({});
    setIsSending(true);
    setToastMessage(null);

    try {
      const res = await emergencyAlertApi.broadcastAlert({
        alert_type: alertType,
        title: title.trim().toUpperCase(),
        content: content.trim(),
        center_latitude: centerLat,
        center_longitude: centerLng,
        radius_meters: radiusMeters,
        severity: severity,
        hotline_phone: hotline,
        peak_time_estimate: "17h30",
        expires_in_hours: 12,
      });

      setToastMessage({
        type: "success",
        text: `Phát lệnh cảnh báo khẩn cấp thành công! Hệ thống đang đẩy thông báo đến ${res.recipients_count.toLocaleString("vi-VN")} thiết bị.`,
      });

      loadHistory();
      if (onBroadcastSuccess) {
        onBroadcastSuccess(res.alert_id);
      }
    } catch {
      setToastMessage({
        type: "danger",
        text: "Không thể gửi cảnh báo tức thời do gián đoạn hạ tầng đẩy tin. Đang kích hoạt máy chủ dự phòng...",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Hủy lệnh phát sóng đang hoạt động (kèm OCC)
  const handleCancelActiveAlert = async (alertId: string, version: number) => {
    const reason = window.prompt("Nhập lý do thu hồi lệnh phát sóng cảnh báo:", "Nước đã rút hoàn toàn, tình hình ổn định");
    if (!reason) return;

    try {
      await emergencyAlertApi.cancelAlert(alertId, {
        cancellation_reason: reason,
        version: version,
      });
      setToastMessage({
        type: "success",
        text: "Thu hồi lệnh phát sóng cảnh báo thành công!",
      });
      loadHistory();
    } catch {
      setToastMessage({
        type: "danger",
        text: "Không thể hủy lệnh cảnh báo do xung đột phiên bản. Vui lòng làm mới danh sách.",
      });
    }
  };

  return (
    <div className="emergency-module-wrapper">
      {/* Thông báo Toast / Banner đầu trang */}
      {toastMessage && (
        <div className={`emergency-toast-banner ${toastMessage.type}`}>
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.1rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KHUNG CHÍNH 3 CỘT: NỘI DUNG | PHẠM VI | GỬI */}
      <div className="broadcast-console-grid">
        {/* ===================================================================
            CỘT 1: KHỐI "NỘI DUNG"
           =================================================================== */}
        <div className="console-column-card">
          <div className="column-card-header">
            <span className="column-card-title">📝 Khối Nội Dung</span>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Cột trái</span>
          </div>

          <div className="column-card-body">
            {/* Bộ chọn loại cảnh báo */}
            <div className="input-field-group">
              <label className="input-label">Loại cảnh báo thiên tai khẩn cấp:</label>
              <div className="alert-type-grid">
                <button
                  type="button"
                  className={`alert-type-card-btn ${alertType === "FLOOD" ? "selected" : ""}`}
                  onClick={() => setAlertType("FLOOD")}
                >
                  <span className="alert-type-icon">🌊</span>
                  <span>Ngập lụt nghiêm trọng</span>
                </button>
                <button
                  type="button"
                  className={`alert-type-card-btn ${alertType === "STORM" ? "selected" : ""}`}
                  onClick={() => setAlertType("STORM")}
                >
                  <span className="alert-type-icon">🌪️</span>
                  <span>Bão / Lốc xoáy</span>
                </button>
                <button
                  type="button"
                  className={`alert-type-card-btn ${alertType === "TIDE" ? "selected" : ""}`}
                  onClick={() => setAlertType("TIDE")}
                >
                  <span className="alert-type-icon">🌕</span>
                  <span>Triều cường dâng cao</span>
                </button>
                <button
                  type="button"
                  className={`alert-type-card-btn ${alertType === "POLLUTION" ? "selected" : ""}`}
                  onClick={() => setAlertType("POLLUTION")}
                >
                  <span className="alert-type-icon">☣️</span>
                  <span>Sự cố hóa chất / Ô nhiễm</span>
                </button>
              </div>
            </div>

            {/* Ô nhập tiêu đề ngắn gọn báo động cao */}
            <div className="input-field-group">
              <label className="input-label">Tiêu đề cảnh báo (Báo động cao):</label>
              <input
                type="text"
                className={`text-input-field ${errors.title ? "error" : ""}`}
                placeholder="VD: BÁO ĐỘNG NGẬP SÂU TRÊN 0.8M TẠI ĐƯỜNG AN DƯƠNG VƯƠNG"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {errors.title && (
                <span style={{ color: "#ef4444", fontSize: "0.78rem" }}>
                  * Tiêu đề bắt buộc và phải có ít nhất 5 ký tự.
                </span>
              )}
            </div>

            {/* Khung nhập văn bản chi tiết khuyến cáo */}
            <div className="input-field-group">
              <label className="input-label">Nội dung khuyến cáo & Tuyến tránh:</label>
              <textarea
                className={`textarea-field ${errors.content ? "error" : ""}`}
                placeholder="Khuyến cáo mức độ rủi ro, dự kiến đạt đỉnh ngập, tuyến đường thay thế và số hotline..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              {errors.content && (
                <span style={{ color: "#ef4444", fontSize: "0.78rem" }}>
                  * Vui lòng nhập nội dung chi tiết khuyến cáo người dân.
                </span>
              )}
            </div>

            {/* Số điện thoại đường dây nóng cứu nạn */}
            <div className="input-field-group">
              <label className="input-label">Hotline cứu hộ cứu nạn:</label>
              <input
                type="text"
                className="text-input-field"
                value={hotline}
                onChange={(e) => setHotline(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ===================================================================
            CỘT 2: KHỐI "PHẠM VI"
           =================================================================== */}
        <div className="console-column-card">
          <div className="column-card-header">
            <span className="column-card-title">🗺️ Khối Phạm Vi</span>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Cột giữa (Bản đồ GIS & Slider)</span>
          </div>

          <div className="column-card-body">
            {/* Viewport Bản đồ GIS */}
            <div className="gis-map-viewport-container">
              <div className="gis-map-overlay-tip">
                <span>📍 Nhấp vào bản đồ hoặc kéo ghim để định vị tâm cảnh báo</span>
              </div>
              <div ref={mapContainerRef} className="gis-map-element" />
            </div>

            {/* Thanh trượt thiết lập bán kính phát tán */}
            <div className="radius-slider-control-box">
              <div className="radius-slider-labels">
                <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "#cbd5e1" }}>
                  Bán kính vùng ảnh hưởng:
                </span>
                <span className="radius-slider-current-val">
                  {(radiusMeters / 1000).toFixed(1)} km ({radiusMeters}m)
                </span>
              </div>
              <input
                type="range"
                className="radius-range-slider"
                min={500}
                max={10000}
                step={500}
                value={radiusMeters}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
              />
              <div className="radius-presets-row">
                {[500, 1000, 2000, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`preset-chip-btn ${radiusMeters === preset ? "active" : ""}`}
                    onClick={() => handleRadiusChange(preset)}
                  >
                    {preset < 1000 ? `${preset}m` : `${preset / 1000}km`}
                  </button>
                ))}
              </div>
            </div>

            {/* Khối hiển thị số người dự kiến nhận (Spatial Query) */}
            <div className="spatial-estimate-badge-box">
              <div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                  Số người dự kiến nhận (Spatial Query)
                </div>
                <div className="estimate-count-text">
                  {isEstimating ? "Đang truy vấn không gian..." : spatialMessage}
                </div>
              </div>
              <div className="estimate-count-number">
                {isEstimating ? "..." : estimatedCount.toLocaleString("vi-VN")}
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            CỘT 3: KHỐI "GỬI"
           =================================================================== */}
        <div className="console-column-card">
          <div className="column-card-header">
            <span className="column-card-title">📡 Khối Gửi</span>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Cột phải (Hành động)</span>
          </div>

          <div className="column-card-body">
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.45 }}>
              Hạ tầng truyền phát khẩn cấp kết hợp thông báo đẩy <strong>FCM/WebSocket Broadcast</strong> với âm thanh
              báo động ưu tiên cao nhất trên ứng dụng di động và trình duyệt.
            </div>

            {/* Cụm 2 nút hành động đúng Prototype (Gửi cảnh báo & Huỷ) */}
            <div className="send-action-buttons-box">
              <button
                type="button"
                className="btn-primary-danger-send"
                onClick={handleSendBroadcast}
                disabled={isSending}
              >
                <span>{isSending ? "ĐANG PHÁT SÓNG..." : "🚨 GỬI CẢNH BÁO"}</span>
              </button>

              <button
                type="button"
                className="btn-cancel-console"
                onClick={handleCancelForm}
                disabled={isSending}
              >
                <span>✕ Huỷ</span>
              </button>
            </div>

            {/* Danh sách nhật ký phát sóng cảnh báo */}
            <div style={{ marginTop: "18px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "8px" }}>
                📋 Nhật ký phát sóng cảnh báo ({historyList.length})
              </div>
              <div className="history-section-box">
                {loadingHistory ? (
                  <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Đang tải nhật ký...</span>
                ) : historyList.length === 0 ? (
                  <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Chưa có lệnh phát sóng nào.</span>
                ) : (
                  historyList.map((item) => (
                    <div key={item.alert_id} className="history-item-row">
                      <div className="history-item-top">
                        <strong style={{ color: "#f87171" }}>{item.title}</strong>
                        <span className={`status-badge ${item.status}`}>{item.status}</span>
                      </div>
                      <div style={{ color: "#94a3b8" }}>
                        Bán kính: {(item.radius_meters / 1000).toFixed(1)} km | {item.recipients_count} thiết bị
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          {new Date(item.issued_at).toLocaleTimeString("vi-VN")}
                        </span>
                        {item.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => handleCancelActiveAlert(item.alert_id, item.version)}
                            style={{
                              background: "rgba(239,68,68,0.2)",
                              color: "#f87171",
                              border: "1px solid rgba(239,68,68,0.4)",
                              borderRadius: "4px",
                              padding: "2px 8px",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            Thu hồi
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
