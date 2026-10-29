import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CreateFloodSosPayload } from "../types/flood_sos.types";

interface FloodSosDispatchScreenProps {
  onTriggerConfirm: (data: CreateFloodSosPayload) => void;
}

export const FloodSosDispatchScreen: React.FC<FloodSosDispatchScreenProps> = ({
  onTriggerConfirm,
}) => {
  // Khối TÌNH HUỐNG
  const [victimName, setVictimName] = useState("Người dân vùng ngập");
  const [victimPhone, setVictimPhone] = useState("0908112233");
  const [totalVictims, setTotalVictims] = useState<number | "">(3);
  const [elderlyCount, setElderlyCount] = useState<number>(1);
  const [childrenCount, setChildrenCount] = useState<number>(1);
  const [medicalUrgentCount, setMedicalUrgentCount] = useState<number>(0);
  const [description, setDescription] = useState(
    "Nước dâng ngang ngực, mất điện, trần nhà sắp ngập, cần phao cứu sinh gấp",
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    "https://images.unsplash.com/photo-1547683905-f686c993aae5",
  );
  const [errors, setErrors] = useState<{ totalVictims?: string; address?: string }>({});

  // Khối VỊ TRÍ
  const [latitude, setLatitude] = useState<number>(10.7428);
  const [longitude, setLongitude] = useState<number>(106.6625);
  const [addressText, setAddressText] = useState("Hẻm 42 Bến Phú Định, Phường 16, Quận 8, TP.HCM");
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number>(5);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string>(
    "Đã định vị tọa độ GPS của bạn (Độ chính xác: ±5m).",
  );
  const [isScanningGps, setIsScanningGps] = useState<boolean>(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState<boolean>(false);

  const fetchCurrentLocation = (highAccuracy: boolean = false) => {
    setIsScanningGps(true);
    if (!navigator.geolocation) {
      setGpsPermissionDenied(true);
      setGpsStatusMessage("Thiết bị không hỗ trợ định vị GPS tự động.");
      setIsScanningGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy || 5);
        setLatitude(lat);
        setLongitude(lng);
        setGpsAccuracyMeters(acc);
        setGpsPermissionDenied(false);
        setGpsStatusMessage(`Đã định vị tọa độ GPS của bạn (Độ chính xác: ±${acc}m).`);
        setIsScanningGps(false);
      },
      (_err) => {
        // Fallback giả lập vị trí vùng ngập an toàn nếu trình duyệt từ chối quyền
        setGpsPermissionDenied(true);
        setGpsStatusMessage(
          "Không thể xác định vị trí. Vui lòng bật GPS hoặc tự nhập địa chỉ mắc kẹt.",
        );
        setIsScanningGps(false);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  // Tự động quét GPS khi nạp màn hình
  useEffect(() => {
    fetchCurrentLocation(true);
  }, []);

  // Khởi tạo bản đồ tương tác Leaflet
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

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
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const redPinIcon = L.divIcon({
        className: "custom-sos-pin-icon",
        html: `<div style="background:#e53e3e;width:28px;height:28px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px rgba(229,62,62,0.8);display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;">📍</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([latitude, longitude], {
        icon: redPinIcon,
        draggable: true,
      }).addTo(map);

      const circle = L.circle([latitude, longitude], {
        radius: 3000,
        color: "#e53e3e",
        fillColor: "#e53e3e",
        fillOpacity: 0.12,
        weight: 2,
        dashArray: "4, 6",
      }).addTo(map);

      marker.on("dragend", (e: L.LeafletEvent) => {
        const pos = (e.target as L.Marker).getLatLng();
        setLatitude(Number(pos.lat.toFixed(6)));
        setLongitude(Number(pos.lng.toFixed(6)));
        circle.setLatLng(pos);
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        setLatitude(Number(e.latlng.lat.toFixed(6)));
        setLongitude(Number(e.latlng.lng.toFixed(6)));
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
      });

      markerRef.current = marker;
      circleRef.current = circle;
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
      console.warn("Leaflet map initialization skipped in this environment:", err);
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

  // Đồng bộ vị trí bản đồ khi toạ độ thay đổi qua GPS
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      }
      if (circleRef.current) {
        circleRef.current.setLatLng([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendSosClick = () => {
    const newErrors: { totalVictims?: string; address?: string } = {};

    if (totalVictims === "" || Number(totalVictims) < 1) {
      newErrors.totalVictims = "Vui lòng nhập ước tính số người cần cứu hộ.";
    }

    if (!addressText.trim()) {
      newErrors.address = "Vui lòng nhập địa chỉ hiện trường nơi bạn mắc kẹt.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const payload: CreateFloodSosPayload = {
      victim_name: victimName,
      victim_phone: victimPhone,
      total_victims: Number(totalVictims),
      elderly_count: elderlyCount,
      children_count: childrenCount,
      medical_urgent_count: medicalUrgentCount,
      description,
      image_url: imageUrl,
      latitude,
      longitude,
      address_text: addressText,
      severity_level: "CRITICAL",
      flood_depth_meters: 1.2,
    };

    onTriggerConfirm(payload);
  };

  return (
    <div className="dispatch-screen-container" data-testid="dispatch-screen">
      <div className="screen-header-banner">
        <h2>Phát tín hiệu Cấp cứu Khẩn cấp (Emergency SOS Dispatch)</h2>
        <p>
          Dành cho người dân mắc kẹt tại vùng ngập sâu, lũ dâng cao hoặc sạt lở nguy hiểm. Tín hiệu
          sẽ được phát sóng tức thì tới tình nguyện viên và đội phản ứng nhanh cơ sở trong bán kính
          3km.
        </p>
      </div>

      <div className="dispatch-grid">
        {/* =================================================================== */}
        {/* CỘT TRÁI: TÌNH HUỐNG                                                */}
        {/* =================================================================== */}
        <section className="col-card" data-testid="col-situation">
          <div className="col-header">
            <h3>TÌNH HUỐNG</h3>
          </div>

          <div className="col-content situation-form">
            <div className="form-group">
              <label htmlFor="total-victims-input">
                Số người cần cứu <span className="required">*</span>
              </label>
              <input
                id="total-victims-input"
                data-testid="input-total-victims"
                type="number"
                min="1"
                max="50"
                placeholder="Nhập tổng số người..."
                value={totalVictims}
                className={errors.totalVictims ? "input-error" : ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                  setTotalVictims(val);
                  if (errors.totalVictims) {
                    setErrors((prev) => ({ ...prev, totalVictims: undefined }));
                  }
                }}
              />
              {errors.totalVictims && (
                <span className="error-hint" data-testid="error-total-victims">
                  {errors.totalVictims}
                </span>
              )}
            </div>

            {/* Phân loại cụ thể */}
            <div className="victim-sub-counters">
              <div className="sub-counter-item">
                <span>Người già</span>
                <input
                  type="number"
                  min="0"
                  value={elderlyCount}
                  onChange={(e) => setElderlyCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  aria-label="Số người già"
                />
              </div>
              <div className="sub-counter-item">
                <span>Trẻ nhỏ</span>
                <input
                  type="number"
                  min="0"
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  aria-label="Số trẻ nhỏ"
                />
              </div>
              <div className="sub-counter-item">
                <span>Cần y tế gấp</span>
                <input
                  type="number"
                  min="0"
                  value={medicalUrgentCount}
                  onChange={(e) =>
                    setMedicalUrgentCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  aria-label="Số người cần hỗ trợ y tế"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description-input">
                Mô tả chi tiết tình trạng <span className="required">*</span>
              </label>
              <textarea
                id="description-input"
                data-testid="input-description"
                rows={3}
                placeholder="VD: Nước dâng ngang ngực, mất điện, trần nhà sắp ngập, cần phao cứu sinh gấp..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Ảnh chụp hiện trường</label>
              <div
                className="image-upload-zone"
                onClick={() => document.getElementById("file-upload-input")?.click()}
                data-testid="image-upload-zone"
              >
                <input
                  type="file"
                  id="file-upload-input"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
                {imageUrl ? (
                  <div className="preview-box">
                    <img src={imageUrl} alt="Ảnh hiện trường nước ngập" />
                    <button
                      type="button"
                      className="remove-img-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl(null);
                      }}
                      title="Gỡ ảnh"
                      aria-label="Gỡ ảnh"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="upload-icon">📷</div>
                    <p>Bấm để chụp hoặc tải ảnh hiện trường giúp đội cứu nạn định vị cột mốc</p>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="victim-name-input">Họ và tên người cần cứu</label>
              <input
                id="victim-name-input"
                type="text"
                data-testid="input-victim-name"
                value={victimName}
                onChange={(e) => setVictimName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone-input">Số điện thoại liên hệ</label>
              <input
                id="phone-input"
                type="text"
                value={victimPhone}
                onChange={(e) => setVictimPhone(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* CỘT GIỮA: VỊ TRÍ                                                   */}
        {/* =================================================================== */}
        <section className="col-card" data-testid="col-location">
          <div className="col-header">
            <h3>VỊ TRÍ</h3>
          </div>

          <div className="col-content location-panel">
            {gpsPermissionDenied ? (
              <div className="gps-warning-banner" data-testid="gps-warning">
                ⚠️ Không thể xác định vị trí tự động. Vui lòng bật GPS hoặc tự nhập địa chỉ mắc kẹt
                bên dưới.
              </div>
            ) : (
              <div className="gps-status-box" data-testid="gps-status-box">
                <div className="gps-badge">
                  <span className="dot" />
                  <span>GPS TỰ ĐỘNG KẾT NỐI</span>
                </div>
                <div className="coords">
                  Tọa độ: {latitude.toFixed(6)}, {longitude.toFixed(6)} (±{gpsAccuracyMeters}m)
                </div>
                <div className="accuracy-text">{gpsStatusMessage}</div>
              </div>
            )}

            <button
              type="button"
              className={`btn-high-accuracy ${isScanningGps ? "loading" : ""}`}
              onClick={() => fetchCurrentLocation(true)}
              data-testid="btn-use-current-location"
            >
              📍 {isScanningGps ? "Đang quét GPS chính xác cao..." : "Dùng vị trí hiện tại"}
            </button>

            <div className="manual-address-input">
              <label htmlFor="manual-address">
                Địa chỉ ước tính hoặc tự nhập <span className="required">*</span>
              </label>
              <input
                id="manual-address"
                data-testid="input-address"
                type="text"
                placeholder="Số nhà, hẻm, tên đường, phường/xã, quận/huyện..."
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
              />
              {errors.address && <span className="error-hint">{errors.address}</span>}
            </div>

            {/* Bản đồ định vị Leaflet thực tế */}
            <div
              className="mini-map-preview"
              data-testid="mini-map-preview"
              style={{
                position: "relative",
                height: "180px",
                width: "100%",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                ref={mapContainerRef}
                style={{ width: "100%", height: "100%", zIndex: 1 }}
              />
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* CỘT PHẢI: GỬI                                                      */}
        {/* =================================================================== */}
        <section className="col-card" data-testid="col-send">
          <div className="col-header">
            <h3>GỬI</h3>
          </div>

          <div className="col-content dispatch-action-col">
            <div className="summary-check-card">
              <div className="summary-row">
                <span className="label">Tổng số người:</span>
                <span className="val">{totalVictims || 0} người</span>
              </div>
              <div className="summary-row">
                <span className="label">Ưu tiên cứu hộ:</span>
                <span className="val" style={{ color: "#e53e3e" }}>
                  Khẩn cấp (Nước dâng)
                </span>
              </div>
              <div className="summary-row">
                <span className="label">Phạm vi phát sóng:</span>
                <span className="val">Bán kính 3km</span>
              </div>
              <div className="summary-row">
                <span className="label">Kênh truyền:</span>
                <span className="val">WebSocket + FCM</span>
              </div>
            </div>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn-send-sos-primary"
                onClick={handleSendSosClick}
                data-testid="btn-dispatch-sos"
                aria-label="Gửi yêu cầu cứu hộ khẩn cấp"
              >
                <span>🆘 GỬI SOS</span>
                <span className="btn-sub">Bấm để xác nhận phát tín hiệu cấp cứu</span>
              </button>

              <div className="support-hotline-hint">
                Trường hợp nguy kịch đe dọa tính mạng, gọi ngay: <strong>112 / 114 / 115</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
