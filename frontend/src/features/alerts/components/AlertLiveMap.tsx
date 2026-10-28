import React, { useState, useEffect, useMemo, useCallback } from "react";
import { alertApi } from "../services/alertApi";
import type { LiveMapPoint } from "../types";

// Tọa độ Bounding Box TP.HCM cho SVG Canvas
const MIN_LNG = 106.40;
const MAX_LNG = 107.02;
const MIN_LAT = 10.37;
const MAX_LAT = 11.16;

const projectToSvg = (lng: number, lat: number, width = 840, height = 520) => {
  const pad = 40;
  const x = pad + ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (width - 2 * pad);
  const y = height - (pad + ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * (height - 2 * pad));
  return { x, y };
};

// Tính khoảng cách Haversine (km)
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export const AlertLiveMap: React.FC = () => {
  const [points, setPoints] = useState<LiveMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedPoint, setSelectedPoint] = useState<LiveMapPoint | null>(null);

  // Vị trí người dùng (Geolocation GPS)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);

  const fetchPoints = useCallback(async () => {
    try {
      setLoading(true);
      const data = await alertApi.getLiveMapPoints({
        category: selectedCategory === "ALL" ? undefined : selectedCategory,
        severity: selectedSeverity === "ALL" ? undefined : selectedSeverity,
      });
      setPoints(data);
      if (data.length > 0 && !selectedPoint) {
        setSelectedPoint(data[0]);
      }
    } catch (e) {
      console.error("Lỗi tải điểm cảnh báo:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedSeverity]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  // MAP_BTN_MY_LOC: Định vị GPS người dùng
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocMsg("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }
    setLocating(true);
    setLocMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocating(false);
        setLocMsg(`Đã định vị vị trí của bạn (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      },
      () => {
        setLocating(false);
        // Fallback trung tâm TP.HCM (Quận 1)
        setUserLocation({ lat: 10.7769, lng: 106.7009 });
        setLocMsg("Không thể lấy GPS chính xác. Đã đặt tâm tại Quận 1, TP.HCM.");
      },
      { timeout: 8000 }
    );
  };

  const userSvgPos = useMemo(() => {
    if (!userLocation) return null;
    return projectToSvg(userLocation.lng, userLocation.lat);
  }, [userLocation]);

  return (
    <div style={{ background: "#0B1120", borderRadius: "16px", border: "1px solid #1E293B", padding: "24px", color: "#F8FAFC" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>🗺️</span>
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#38BDF8" }}>
              Bản Đồ Giám Sát Điểm Cảnh Báo Ô Nhiễm Trực Quan Cho Cộng Đồng (CN 31)
            </h2>
          </div>
          <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "13px" }}>
            Giám sát các điểm nóng ô nhiễm không gian đô thị thời gian thực; định vị khoảng cách an toàn và nhận khuyến nghị phòng hộ y tế tức thì.
          </p>
        </div>

        {/* MAP_BTN_MY_LOC: Nút định vị của tôi */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            id="MAP_BTN_MY_LOC"
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            style={{
              background: userLocation ? "rgba(14, 165, 233, 0.2)" : "#1E293B",
              border: `1px solid ${userLocation ? "#38BDF8" : "#334155"}`,
              color: userLocation ? "#38BDF8" : "#F8FAFC",
              borderRadius: "10px",
              padding: "9px 16px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            <span>🎯</span>
            <span>{locating ? "Đang định vị GPS..." : userLocation ? "Vị Trí Của Tôi (Đã bật)" : "Định Vị Vị Trí Tôi"}</span>
          </button>

          <button
            type="button"
            onClick={fetchPoints}
            style={{
              background: "#1E293B",
              border: "1px solid #334155",
              color: "#94A3B8",
              borderRadius: "10px",
              padding: "9px 12px",
              fontSize: "13px",
              cursor: "pointer",
            }}
            title="Làm mới dữ liệu"
          >
            🔄
          </button>
        </div>
      </div>

      {locMsg && (
        <div style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", color: "#38BDF8", marginBottom: "16px" }}>
          ℹ️ {locMsg}
        </div>
      )}

      {/* MAP_LAYER_FILTER: Bộ lọc lớp chuyên đề ô nhiễm */}
      <div id="MAP_LAYER_FILTER" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "18px", background: "#0F172A", padding: "12px 16px", borderRadius: "12px", border: "1px solid #1E293B" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#94A3B8" }}>Lọc loại ô nhiễm:</span>
        {[
          { code: "ALL", label: "Tất cả loại" },
          { code: "WASTE", label: "🗑️ Rác thải" },
          { code: "AIR", label: "💨 Khói bụi PM2.5" },
          { code: "WATER", label: "🌊 Nước thải" },
          { code: "HAZARDOUS", label: "☣️ Hóa chất / Độc hại" },
        ].map((cat) => (
          <button
            key={cat.code}
            type="button"
            onClick={() => setSelectedCategory(cat.code)}
            style={{
              background: selectedCategory === cat.code ? "#0284C7" : "#1E293B",
              color: "#FFF",
              border: `1px solid ${selectedCategory === cat.code ? "#38BDF8" : "#334155"}`,
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {cat.label}
          </button>
        ))}

        <div style={{ width: "1px", height: "20px", background: "#334155", margin: "0 6px" }} />

        <span style={{ fontSize: "12px", fontWeight: 700, color: "#94A3B8" }}>Cấp độ:</span>
        {[
          { code: "ALL", label: "Mọi cấp độ" },
          { code: "YELLOW", label: "🟡 Vàng (Chú ý)" },
          { code: "ORANGE", label: "🟠 Cam (Nguy cơ)" },
          { code: "RED", label: "🔴 Đỏ (Khẩn cấp)" },
        ].map((sev) => (
          <button
            key={sev.code}
            type="button"
            onClick={() => setSelectedSeverity(sev.code)}
            style={{
              background: selectedSeverity === sev.code ? "#334155" : "#1E293B",
              color: selectedSeverity === sev.code ? "#38BDF8" : "#94A3B8",
              border: `1px solid ${selectedSeverity === sev.code ? "#38BDF8" : "#334155"}`,
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {sev.label}
          </button>
        ))}
      </div>

      {/* KHUNG BẢN ĐỒ MAP_CONTAINER & CHI TIẾT POPUP */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "stretch" }}>
        {/* MAP_CONTAINER Canvas */}
        <div
          id="MAP_CONTAINER"
          style={{
            position: "relative",
            background: "#030712",
            borderRadius: "14px",
            border: "1px solid #1E293B",
            overflow: "hidden",
            minHeight: "520px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {loading && (
            <div style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(15, 23, 42, 0.85)", padding: "6px 14px", borderRadius: "8px", fontSize: "12px", color: "#38BDF8", zIndex: 10 }}>
              Đang tải tọa độ không gian...
            </div>
          )}

          {/* SVG Map Canvas của TP.HCM */}
          <svg viewBox="0 0 840 520" style={{ width: "100%", height: "100%", maxHeight: "540px" }}>
            <defs>
              <radialGradient id="hcmWaterGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0369A1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0B1120" stopOpacity="0" />
              </radialGradient>
              <filter id="glowYellow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glowRed">
                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Đường sông Sài Gòn cách điệu */}
            <path
              d="M 280 20 Q 360 140 440 220 T 520 380 Q 580 440 680 500"
              fill="none"
              stroke="#0284C7"
              strokeWidth="6"
              strokeOpacity="0.3"
            />
            <path
              d="M 200 180 Q 340 260 480 300 T 700 350"
              fill="none"
              stroke="#0369A1"
              strokeWidth="4"
              strokeOpacity="0.2"
            />

            {/* Vị trí của người dùng GPS */}
            {userSvgPos && (
              <g>
                <circle cx={userSvgPos.x} cy={userSvgPos.y} r="20" fill="rgba(56, 189, 248, 0.25)">
                  <animate attributeName="r" values="10;26;10" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={userSvgPos.x} cy={userSvgPos.y} r="6" fill="#38BDF8" stroke="#FFF" strokeWidth="2" />
                <text x={userSvgPos.x + 10} y={userSvgPos.y + 4} fill="#38BDF8" fontSize="11" fontWeight="700">
                  Vị trí của bạn
                </text>
              </g>
            )}

            {/* Các điểm Hotspot cảnh báo */}
            {points.map((p) => {
              const svgPos = projectToSvg(p.longitude, p.latitude);
              const isSelected = selectedPoint?.point_id === p.point_id;
              const color = p.severity_level === "RED" ? "#EF4444" : p.severity_level === "ORANGE" ? "#F59E0B" : "#EAB308";

              return (
                <g
                  key={p.point_id}
                  onClick={() => setSelectedPoint(p)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Vòng pulse phát sáng */}
                  <circle cx={svgPos.x} cy={svgPos.y} r={isSelected ? 18 : 12} fill={color} fillOpacity="0.25">
                    <animate attributeName="r" values="8;20;8" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite" />
                  </circle>

                  {/* Marker Node chính */}
                  <circle
                    cx={svgPos.x}
                    cy={svgPos.y}
                    r={isSelected ? 9 : 7}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 3 : 1.5}
                    filter={p.severity_level === "RED" ? "url(#glowRed)" : "url(#glowYellow)"}
                  />

                  {/* Nhãn mã sự cố khi hover/selected */}
                  {isSelected && (
                    <text
                      x={svgPos.x}
                      y={svgPos.y - 14}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="10"
                      fontWeight="800"
                      style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
                    >
                      {p.tracking_code}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* MAP_LEGEND: Chú giải cấp độ cảnh báo */}
          <div
            id="MAP_LEGEND"
            style={{
              position: "absolute",
              bottom: "16px",
              right: "16px",
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "11px",
              backdropFilter: "blur(8px)",
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 800, color: "#94A3B8", marginBottom: "6px" }}>CHÚ GIẢI CẤP ĐỘ</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 6px #EF4444" }} />
                <span style={{ color: "#FCA5A5", fontWeight: 700 }}>Đỏ: Khẩn cấp nguy hại</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 6px #F59E0B" }} />
                <span style={{ color: "#FCD34D", fontWeight: 700 }}>Cam: Nguy cơ cao</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EAB308", boxShadow: "0 0 6px #EAB308" }} />
                <span style={{ color: "#FEF08A", fontWeight: 700 }}>Vàng: Điểm chú ý</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAP_POPUP_INFO: Khung thông tin chi tiết điểm nóng */}
        <div
          id="MAP_POPUP_INFO"
          style={{
            background: "#0F172A",
            border: "1px solid #1E293B",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {selectedPoint ? (
            <div>
              {/* Header Popup */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span
                  style={{
                    background:
                      selectedPoint.severity_level === "RED"
                        ? "rgba(239, 68, 68, 0.2)"
                        : selectedPoint.severity_level === "ORANGE"
                        ? "rgba(245, 158, 11, 0.2)"
                        : "rgba(234, 179, 8, 0.2)",
                    color:
                      selectedPoint.severity_level === "RED"
                        ? "#F87171"
                        : selectedPoint.severity_level === "ORANGE"
                        ? "#FBBF24"
                        : "#FDE047",
                    border: `1px solid ${
                      selectedPoint.severity_level === "RED" ? "#EF4444" : "#F59E0B"
                    }`,
                    borderRadius: "6px",
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  {selectedPoint.severity_level === "RED"
                    ? "🔴 CẤP ĐỎ: KHẨN CẤP"
                    : selectedPoint.severity_level === "ORANGE"
                    ? "🟠 CẤP CAM: NGUY CƠ"
                    : "🟡 CẤP VÀNG: CHÚ Ý"}
                </span>

                <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>
                  {selectedPoint.tracking_code}
                </span>
              </div>

              {/* Title & Category */}
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC", margin: "0 0 8px", lineHeight: 1.3 }}>
                {selectedPoint.title}
              </h3>

              <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "12px" }}>
                📍 {selectedPoint.address}
              </div>

              {/* Khoảng cách từ vị trí người dùng */}
              {userLocation && (
                <div style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "8px", padding: "8px 12px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>📏</span>
                  <span style={{ fontSize: "12px", color: "#38BDF8", fontWeight: 700 }}>
                    Cách vị trí của bạn: {calculateDistanceKm(userLocation.lat, userLocation.lng, selectedPoint.latitude, selectedPoint.longitude)} km
                  </span>
                </div>
              )}

              {/* Mô tả sự cố */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>
                  Hiện trạng ô nhiễm:
                </div>
                <p style={{ fontSize: "13px", color: "#CBD5E1", margin: 0, lineHeight: 1.4 }}>
                  {selectedPoint.description}
                </p>
              </div>

              {/* Khuyến nghị phòng hộ y tế */}
              <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#F59E0B", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🛡️</span> KHUYẾN NGHỊ AN TOÀN Y TẾ:
                </div>
                <p style={{ fontSize: "12px", color: "#FDE68A", margin: 0, lineHeight: 1.4 }}>
                  {selectedPoint.safety_advice}
                </p>
              </div>

              {/* Ảnh hiện trường nếu có */}
              {selectedPoint.image_url && (
                <div style={{ marginBottom: "16px", borderRadius: "8px", overflow: "hidden", border: "1px solid #334155" }}>
                  <img
                    src={selectedPoint.image_url}
                    alt="Hiện trường ô nhiễm"
                    style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B" }}>
              <span style={{ fontSize: "32px", display: "block", marginBottom: "10px" }}>🎯</span>
              Bấm vào một điểm Marker trên bản đồ để xem chi tiết tình trạng ô nhiễm.
            </div>
          )}

          <div style={{ borderTop: "1px solid #1E293B", paddingTop: "12px", fontSize: "11px", color: "#64748B", display: "flex", justifyContent: "space-between" }}>
            <span>Tọa độ: {selectedPoint ? `${selectedPoint.latitude.toFixed(4)}, ${selectedPoint.longitude.toFixed(4)}` : "--"}</span>
            <span>Cập nhật: {selectedPoint?.created_at || "Vừa xong"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
