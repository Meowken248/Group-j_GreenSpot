import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { VolunteerSosCard } from "../types/flood_sos.types";

interface VolunteerResponseDashboardProps {
  cards: VolunteerSosCard[];
  volunteerLat: number;
  volunteerLng: number;
  onAccept: (card: VolunteerSosCard) => Promise<void>;
  onSkip: (card: VolunteerSosCard) => Promise<void>;
  newAlertToast?: string | null;
}

export const VolunteerResponseDashboard: React.FC<VolunteerResponseDashboardProps> = ({
  cards,
  volunteerLat,
  volunteerLng,
  onAccept,
  onSkip,
  newAlertToast,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    cards.length > 0 ? cards[0].request_id : null,
  );
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const selectedCard = cards.find((c) => c.request_id === selectedCardId) || cards[0];

  const handleAcceptClick = async (card: VolunteerSosCard) => {
    setAcceptingId(card.request_id);
    try {
      await onAccept(card);
    } finally {
      setAcceptingId(null);
    }
  };

  // Khởi tạo bản đồ tương tác Leaflet
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      try {
        mapInstanceRef.current?.invalidateSize();
      } catch {
        // ignore in test
      }
    };

    try {
      const map = L.map(mapContainerRef.current, {
        center: [volunteerLat, volunteerLng],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      timer = setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          // ignore in test
        }
      }, 250);

      window.addEventListener("resize", handleResize);
    } catch (err) {
      console.warn("Leaflet map init skipped in this environment:", err);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Cập nhật marker, vòng bán kính và tuyến tiếp cận trên bản đồ khi selectedCard hoặc cards thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Vòng tròn bán kính phản ứng 3km quanh Tình nguyện viên
    L.circle([volunteerLat, volunteerLng], {
      radius: 3000,
      color: "#3182ce",
      fillColor: "#3182ce",
      fillOpacity: 0.08,
      weight: 2,
      dashArray: "5, 8",
    }).addTo(layerGroup);

    // 2. Marker Tình nguyện viên (Xuồng máy - Blue)
    const volunteerIcon = L.divIcon({
      className: "volunteer-pin-icon",
      html: `<div style="background:#3182ce;width:38px;height:38px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px rgba(49,130,206,0.8);display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;">🚤</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
    L.marker([volunteerLat, volunteerLng], { icon: volunteerIcon })
      .bindPopup(`<strong>Bạn (Tình nguyện viên)</strong><br/>Tọa độ: ${volunteerLat.toFixed(4)}, ${volunteerLng.toFixed(4)}`)
      .addTo(layerGroup);

    // 3. Marker các ca cứu hộ
    cards.forEach((card) => {
      const isCurrent = card.request_id === selectedCard?.request_id;
      const victimIcon = L.divIcon({
        className: "victim-sos-pin-icon",
        html: `<div style="background:${isCurrent ? "#e53e3e" : "#dd6b20"};width:${isCurrent ? "42px" : "32px"};height:${isCurrent ? "42px" : "32px"};border-radius:50%;border:3px solid #fff;box-shadow:0 0 14px rgba(229,62,62,0.9);display:flex;align-items:center;justify-content:center;font-size:${isCurrent ? "18px" : "14px"};color:#fff;animation:${isCurrent ? "pulseGlow 1.8s infinite ease-in-out" : "none"};">🆘</div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      const m = L.marker([card.latitude, card.longitude], { icon: victimIcon })
        .bindPopup(`<strong>${card.victim_name}</strong><br/>${card.address_text}<br/>Khoảng cách: ${card.distance_text}`)
        .addTo(layerGroup);

      m.on("click", () => {
        setSelectedCardId(card.request_id);
      });
    });

    // 4. Tuyến đường tiếp cận an toàn kết nối TNV -> Nạn nhân được chọn
    if (selectedCard) {
      const latlngs: L.LatLngExpression[] = [
        [volunteerLat, volunteerLng],
        [selectedCard.latitude, selectedCard.longitude],
      ];
      L.polyline(latlngs, {
        color: "#e53e3e",
        weight: 3,
        dashArray: "6, 8",
        opacity: 0.9,
      }).addTo(layerGroup);

      try {
        const bounds = L.latLngBounds([
          [volunteerLat, volunteerLng],
          [selectedCard.latitude, selectedCard.longitude],
        ]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } catch {
        // Safe fallback in test env
      }
    }
  }, [volunteerLat, volunteerLng, cards, selectedCard]);

  return (
    <div className="volunteer-dashboard-container" data-testid="volunteer-dashboard">
      {/* Banner thông báo SOS mới nhấp nháy chuông */}
      {newAlertToast && (
        <div
          style={{
            background: "#fed7d7",
            border: "1px solid #feb2b2",
            color: "#9b2c2c",
            borderRadius: "8px",
            padding: "0.85rem 1.25rem",
            marginBottom: "1.25rem",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
          data-testid="sos-alert-banner"
        >
          <span>🔔</span>
          <span>{newAlertToast}</span>
        </div>
      )}

      <div className="dashboard-grid">
        {/* =================================================================== */}
        {/* CỘT TRÁI: YÊU CẦU GẦN BẠN                                           */}
        {/* =================================================================== */}
        <section className="requests-list-col" data-testid="col-nearby-requests">
          <div className="col-title-bar">
            <h2>YÊU CẦU GẦN BẠN</h2>
            <span className="radius-tag">Bán kính quét: 3.0km</span>
          </div>

          {cards.length === 0 ? (
            <div className="empty-state" data-testid="empty-requests-notice">
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🛡️</div>
              <p>Hiện không có yêu cầu cấp cứu ngập lụt nào trong bán kính 3km.</p>
              <p style={{ fontSize: "0.8rem" }}>
                Hệ thống đang tiếp tục lắng nghe tín hiệu khẩn cấp theo thời gian thực...
              </p>
            </div>
          ) : (
            cards.map((card) => {
              const isSelected = card.request_id === selectedCardId;
              const isBusy = acceptingId === card.request_id;

              return (
                <div
                  key={card.request_id}
                  className={`sos-card-item ${isSelected ? "active-card" : ""}`}
                  onClick={() => setSelectedCardId(card.request_id)}
                  data-testid={`sos-card-${card.request_id}`}
                >
                  <div className="card-top">
                    <div className="badge-group">
                      <span className="badge-severity">
                        {card.severity_level === "CRITICAL"
                          ? "Khẩn cấp"
                          : card.severity_level}
                        {card.flood_depth_meters ? ` - Nước ngập ${card.flood_depth_meters}m` : ""}
                      </span>
                      <span className="badge-depth">{card.sos_code}</span>
                    </div>
                    <div className="distance-badge">{card.distance_text}</div>
                  </div>

                  <div className="card-body">
                    <div className="people-count">
                      👥 {card.total_victims} người gặp nạn
                      {card.elderly_count > 0 && ` (${card.elderly_count} người già)`}
                      {card.children_count > 0 && ` (${card.children_count} trẻ nhỏ)`}
                      {card.medical_urgent_count > 0 && " • 🚨 Cần hỗ trợ y tế"}
                    </div>
                    <div className="desc">{card.description}</div>
                    <div className="address">📍 {card.address_text}</div>
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn-accept-sos"
                      disabled={isBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptClick(card);
                      }}
                      data-testid={`btn-accept-${card.request_id}`}
                    >
                      {isBusy ? "Đang khóa quyền..." : "Nhận yêu cầu"}
                    </button>

                    <button
                      type="button"
                      className="btn-skip-sos"
                      disabled={isBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSkip(card);
                      }}
                      data-testid={`btn-skip-${card.request_id}`}
                    >
                      Bỏ qua
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* =================================================================== */}
        {/* CỘT PHẢI: BẢN ĐỒ                                                   */}
        {/* =================================================================== */}
        <section className="map-display-col" data-testid="col-map">
          <div className="map-header">
            <h3>BẢN ĐỒ TIẾP CẬN CỨU HỘ</h3>
            <div className="map-legend">
              <div className="legend-item">
                <span className="pin red" />
                <span>Người kêu cứu</span>
              </div>
              <div className="legend-item">
                <span className="pin blue" />
                <span>Tình nguyện viên</span>
              </div>
            </div>
          </div>

          <div
            className="map-canvas-container"
            data-testid="map-canvas"
            style={{ position: "relative", width: "100%", height: "100%", minHeight: "520px" }}
          >
            {/* Real Leaflet Map */}
            <div
              ref={mapContainerRef}
              style={{
                width: "100%",
                height: "100%",
                minHeight: "520px",
                zIndex: 1,
              }}
            />

            {/* Hidden accessibility/testing markers */}
            <div data-testid="marker-volunteer" style={{ display: "none" }}>
              Bạn (TNV) [{volunteerLat.toFixed(3)}, {volunteerLng.toFixed(3)}]
            </div>
            {selectedCard && (
              <div data-testid="marker-victim" style={{ display: "none" }}>
                {selectedCard.victim_name} ({selectedCard.distance_text})
              </div>
            )}

            {/* Tuyến đường tiếp cận an toàn */}
            <div
              style={{
                position: "absolute",
                bottom: "1rem",
                left: "1rem",
                right: "1rem",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(6px)",
                borderRadius: "8px",
                padding: "0.85rem 1.25rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.85rem",
                zIndex: 1000,
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <strong>Hướng tuyến tiếp cận:</strong> Tránh đoạn ngập sâu ngã tư Bến Phú Định,
                khuyến nghị ca nô đi dọc bờ kênh.
              </div>
              <div style={{ color: "#38a169", fontWeight: "700" }}>
                Độ sâu an toàn xuồng máy: 0.9m - 1.5m
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
