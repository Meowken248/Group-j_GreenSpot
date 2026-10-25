import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HCM_DISTRICTS, type CreateEventPayload, type GreenEvent } from "../types/event.types";
import { eventService } from "../services/eventService";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEvent: GreenEvent) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(
    "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop"
  );
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [district, setDistrict] = useState(HCM_DISTRICTS[0]);
  const [address, setAddress] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number>(50);
  const [lat, setLat] = useState<number>(10.7735);
  const [lon, setLon] = useState<number>(106.7068);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Khởi tạo thời gian mặc định là ngày mai + 2 tiếng (đảm bảo > 24h)
  useEffect(() => {
    if (isOpen) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 2);
      defaultDate.setHours(7, 0, 0, 0);
      const iso = defaultDate.toISOString().slice(0, 16);
      setStartTime(iso);

      const defaultEnd = new Date(defaultDate);
      defaultEnd.setHours(11, 0, 0, 0);
      setEndTime(defaultEnd.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  // Khởi tạo Leaflet Map Picker
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapContainerRef.current).setView([lat, lon], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
    const circle = L.circle([lat, lon], {
      radius: 100,
      color: "#10b981",
      fillColor: "#10b981",
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setLat(pos.lat);
      setLon(pos.lng);
      circle.setLatLng(pos);
    });

    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
      setLat(e.latlng.lat);
      setLon(e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    // Fix render Leaflet inside modal
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (title.trim() || description.trim() || address.trim()) {
      if (window.confirm("Bạn có thay đổi chưa lưu. Bạn muốn thoát?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!title.trim() || title.length > 100) {
      setErrorMessage("Tên sự kiện là bắt buộc và tối đa 100 ký tự.");
      return;
    }
    if (!description.trim() || description.length > 2000) {
      setErrorMessage("Mô tả sự kiện là bắt buộc và tối đa 2000 ký tự.");
      return;
    }
    if (!startTime) {
      setErrorMessage("Vui lòng chọn thời gian bắt đầu sự kiện.");
      return;
    }
    const startDt = new Date(startTime);
    const now = new Date();
    if (startDt.getTime() < now.getTime() + 24 * 60 * 60 * 1000) {
      setErrorMessage("Thời gian bắt đầu sự kiện phải sau thời điểm hiện tại ít nhất 24 giờ.");
      return;
    }
    if (maxParticipants < 5 || maxParticipants > 500) {
      setErrorMessage("Số người tham gia tối đa phải từ 5 đến 500 người.");
      return;
    }
    if (!address.trim()) {
      setErrorMessage("Vui lòng nhập địa chỉ tập trung chi tiết.");
      return;
    }

    const payload: CreateEventPayload = {
      title: title.trim(),
      description: description.trim(),
      cover_image_url: coverImageUrl.trim(),
      start_time: startDt.toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
      latitude: lat,
      longitude: lon,
      address: address.trim(),
      district,
      max_participants: Number(maxParticipants),
    };

    try {
      setLoading(true);
      const newEv = await eventService.createEvent(payload);
      alert("Đăng sự kiện thành công! Sự kiện đã được gửi duyệt tới Quản trị viên.");
      onSuccess(newEv);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Không thể tạo sự kiện. Vui lòng thử lại.";
      setErrorMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-modal-overlay" data-testid="create-event-modal-overlay">
      <div className="event-modal-box large" data-testid="create-event-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h2>Tổ chức Sự kiện Chủ Nhật Xanh mới</h2>
            <p className="modal-sub">
              Khởi xướng chiến dịch dọn vệ sinh, trồng cây hoặc thu gom rác cộng đồng
            </p>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            data-testid="btn-close-create-modal"
            onClick={handleCancel}
          >
            ×
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body-scroll">
          {errorMessage && (
            <div
              style={{
                background: "#fef2f2",
                color: "#b91c1c",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          <div className="create-event-form">
            {/* 1. Tên sự kiện */}
            <div className="form-group">
              <label>
                Tên sự kiện / chiến dịch <span className="required-star">*</span>
                <span className="char-hint">{title.length}/100</span>
              </label>
              <input
                type="text"
                data-testid="input-event-title"
                placeholder="VD: Chủ Nhật Xanh: Làm sạch công viên Bến Bạch Đằng"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* 2. Ảnh bìa */}
            <div className="form-group">
              <label>
                Ảnh bìa sự kiện (JPG/PNG max 5MB) <span className="required-star">*</span>
              </label>
              <div className="cover-upload-area">
                {coverImageUrl ? (
                  <div>
                    <img
                      src={coverImageUrl}
                      alt="Ảnh bìa xem trước"
                      className="preview-cover-img"
                    />
                    <div style={{ marginTop: "0.5rem" }}>
                      <input
                        type="text"
                        value={coverImageUrl}
                        onChange={(e) => setCoverImageUrl(e.target.value)}
                        placeholder="Dán link ảnh bìa (hoặc dùng ảnh mặc định)"
                        style={{ width: "100%", fontSize: "0.8rem" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="upload-prompt">
                    <div className="upload-icon">📸</div>
                    <div className="upload-title">Nhấp để chọn ảnh bìa hoặc dán URL ảnh</div>
                    <div className="upload-rule">Định dạng JPG/PNG, tối đa 5MB</div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Thời gian bắt đầu và kết thúc */}
            <div className="form-row-2">
              <div className="form-group">
                <label>
                  Ngày giờ bắt đầu <span className="required-star">*</span>
                  <span className="char-hint">(Sau hiện tại ≥ 24h)</span>
                </label>
                <input
                  type="datetime-local"
                  data-testid="input-event-start-time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Ngày giờ kết thúc dự kiến</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* 4. Địa điểm & Quy mô */}
            <div className="form-row-2">
              <div className="form-group">
                <label>
                  Quận/Huyện TP.HCM <span className="required-star">*</span>
                </label>
                <select
                  data-testid="select-event-district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  {HCM_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Số người tối đa <span className="required-star">*</span>
                  <span className="char-hint">(5 - 500 người)</span>
                </label>
                <input
                  type="number"
                  data-testid="input-event-max-participants"
                  min={5}
                  max={500}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 5)}
                  required
                />
              </div>
            </div>

            {/* 5. Địa chỉ chi tiết */}
            <div className="form-group">
              <label>
                Địa chỉ tập trung cụ thể <span className="required-star">*</span>
              </label>
              <input
                type="text"
                data-testid="input-event-address"
                placeholder="VD: Cổng chính Công viên Lê Văn Tám, Đường Hai Bà Trưng"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            {/* 6. Bản đồ ghim vị trí WebGIS (Bán kính 100m) */}
            <div className="form-group">
              <label>
                Ghim vị trí điểm tập trung trên bản đồ
                <span className="char-hint">
                  Tọa độ: {lat.toFixed(5)}, {lon.toFixed(5)} (Vòng tròn 100m là vùng check-in)
                </span>
              </label>
              <div
                ref={mapContainerRef}
                className="map-picker-container"
                data-testid="event-map-picker"
              />
            </div>

            {/* 7. Mô tả chi tiết & Vật dụng mang theo */}
            <div className="form-group">
              <label>
                Mô tả chi tiết & Vật dụng cần mang theo <span className="required-star">*</span>
                <span className="char-hint">{description.length}/2000</span>
              </label>
              <textarea
                data-testid="textarea-event-desc"
                placeholder="Nêu rõ nội dung hoạt động dọn dẹp, đồng phục, dụng cụ gắp rác, bình nước cá nhân..."
                maxLength={2000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="modal-footer" style={{ marginTop: "1.5rem" }}>
            <button
              type="button"
              className="btn-my-events-toggle"
              onClick={handleCancel}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn-create-event"
              data-testid="btn-submit-create-event"
              disabled={loading}
            >
              {loading ? "Đang gửi duyệt…" : "Đăng sự kiện (Gửi duyệt)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
