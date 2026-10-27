import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HCM_DISTRICTS, type CreateEventPayload, type GreenEvent } from "../types/event.types";
import { eventService } from "../services/eventService";
import { EVENT_MESSAGES } from "../utils/eventMessages";
import {
  isoToLocalInput,
  localInputToIso,
  MIN_LEAD_TIME_MS,
  resolveMediaUrl,
  toLocalInputValue,
} from "../utils/datetime";
import { isWithinHcm, nearestDistrict } from "../utils/geo";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedEvent: GreenEvent) => void;
  /** Truyền vào khi chỉnh sửa sự kiện đã có. */
  event?: GreenEvent | null;
  onToast?: (message: string, type?: "success" | "error") => void;
}

type FormErrors = Partial<
  Record<
    | "title"
    | "description"
    | "cover"
    | "startTime"
    | "endTime"
    | "address"
    | "maxParticipants"
    | "location",
    string
  >
>;

const MAX_COVER_BYTES = 5 * 1024 * 1024;

const defaultStart = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(7, 0, 0, 0);
  return toLocalInputValue(date);
};

const defaultEnd = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(11, 0, 0, 0);
  return toLocalInputValue(date);
};

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  event = null,
  onToast,
}) => {
  const isEdit = Boolean(event);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [district, setDistrict] = useState(HCM_DISTRICTS[0]);
  const [address, setAddress] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number>(50);
  const [lat, setLat] = useState<number>(10.7735);
  const [lon, setLon] = useState<number>(106.7068);

  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  const resetForm = useCallback(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setCoverImageUrl(event.cover_image_url);
      setStartTime(isoToLocalInput(event.start_time));
      setEndTime(isoToLocalInput(event.end_time));
      setDistrict(event.district);
      setAddress(event.address);
      setMaxParticipants(event.max_participants);
      setLat(event.latitude);
      setLon(event.longitude);
    } else {
      setTitle("");
      setDescription("");
      setCoverImageUrl("");
      setStartTime(defaultStart());
      setEndTime(defaultEnd());
      setDistrict(HCM_DISTRICTS[0]);
      setAddress("");
      setMaxParticipants(50);
      setLat(10.7735);
      setLon(106.7068);
    }
    setErrorMessage(null);
    setFieldErrors({});
    setShowDiscardConfirm(false);
  }, [event]);

  useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen, resetForm]);

  // Bản đồ chọn điểm tập trung (vòng tròn bán kính 100m)
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
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

    const applyPosition = (nextLat: number, nextLon: number) => {
      setLat(nextLat);
      setLon(nextLon);
      setDistrict(nearestDistrict(nextLat, nextLon));
      setFieldErrors((prev) => ({
        ...prev,
        location: isWithinHcm(nextLat, nextLon) ? undefined : EVENT_MESSAGES.VALIDATION_OUTSIDE_HCM,
      }));
    };

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      circle.setLatLng(pos);
      applyPosition(pos.lat, pos.lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
      applyPosition(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;


    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const hasUnsavedChanges = () => {
    if (isEdit && event) {
      return (
        title !== event.title ||
        description !== event.description ||
        address !== event.address ||
        district !== event.district ||
        maxParticipants !== event.max_participants
      );
    }
    return Boolean(title.trim() || description.trim() || address.trim());
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const handleCoverFile = async (file?: File | null) => {
    if (!file) return;
    setErrorMessage(null);

    const isAllowedType =
      ["image/jpeg", "image/png"].includes(file.type) || /\.(jpe?g|png)$/i.test(file.name);
    if (!isAllowedType) {
      setFieldErrors((prev) => ({ ...prev, cover: EVENT_MESSAGES.VALIDATION_COVER_TYPE }));
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setFieldErrors((prev) => ({ ...prev, cover: EVENT_MESSAGES.VALIDATION_COVER_SIZE }));
      return;
    }

    setFieldErrors((prev) => ({ ...prev, cover: undefined }));
    setUploadingCover(true);
    try {
      const res = await eventService.uploadCover(file);
      setCoverImageUrl(res.url);
      onToast?.(EVENT_MESSAGES.COVER_UPLOAD_SUCCESS);
    } catch {
      setFieldErrors((prev) => ({ ...prev, cover: EVENT_MESSAGES.COVER_UPLOAD_ERROR }));
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUseMapAddress = async () => {
    if (typeof fetch !== "function") return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { display_name?: string };
      if (data.display_name) {
        setAddress(data.display_name.slice(0, 255));
      }
    } catch {
      // Bỏ qua khi không có mạng / dịch vụ bản đồ không phản hồi
    }
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedAddress = address.trim();

    if (!trimmedTitle) errors.title = EVENT_MESSAGES.VALIDATION_TITLE_REQUIRED;
    else if (trimmedTitle.length > 100) errors.title = EVENT_MESSAGES.VALIDATION_TITLE_MAX;

    if (!trimmedDescription) errors.description = EVENT_MESSAGES.VALIDATION_DESCRIPTION_REQUIRED;
    else if (trimmedDescription.length < 10)
      errors.description = EVENT_MESSAGES.VALIDATION_DESCRIPTION_MIN;
    else if (trimmedDescription.length > 2000)
      errors.description = EVENT_MESSAGES.VALIDATION_DESCRIPTION_MAX;

    if (!coverImageUrl.trim()) errors.cover = EVENT_MESSAGES.VALIDATION_COVER_REQUIRED;

    if (!startTime) errors.startTime = EVENT_MESSAGES.VALIDATION_START_REQUIRED;
    else {
      const startMs = new Date(startTime).getTime();
      // Backend chỉ áp quy tắc 24 giờ khi giờ bắt đầu thực sự bị thay đổi, nên khi chỉ sửa
      // nội dung của sự kiện diễn ra trong 24 giờ tới (giữ nguyên giờ) thì vẫn cho lưu.
      const keepsOriginalStart =
        isEdit && event ? startTime === isoToLocalInput(event.start_time) : false;
      if (Number.isNaN(startMs)) errors.startTime = EVENT_MESSAGES.VALIDATION_START_REQUIRED;
      else if (startMs < Date.now() + MIN_LEAD_TIME_MS && !keepsOriginalStart)
        errors.startTime = EVENT_MESSAGES.VALIDATION_START_MIN_24H;
      if (endTime) {
        const endMs = new Date(endTime).getTime();
        if (!Number.isNaN(endMs) && endMs <= startMs)
          errors.endTime = EVENT_MESSAGES.VALIDATION_END_AFTER_START;
      }
    }

    if (!trimmedAddress) errors.address = EVENT_MESSAGES.VALIDATION_ADDRESS_REQUIRED;
    else if (trimmedAddress.length < 5) errors.address = EVENT_MESSAGES.VALIDATION_ADDRESS_MIN;

    if (maxParticipants < 5 || maxParticipants > 500)
      errors.maxParticipants = EVENT_MESSAGES.VALIDATION_MAX_PARTICIPANTS;
    else if (isEdit && event && maxParticipants < event.current_participants)
      errors.maxParticipants = EVENT_MESSAGES.VALIDATION_MAX_PARTICIPANTS_LT_CURRENT;

    if (!isWithinHcm(lat, lon)) errors.location = EVENT_MESSAGES.VALIDATION_OUTSIDE_HCM;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const extractErrorMessage = (err: unknown): string => {
    const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      return String((detail as { message: unknown }).message);
    }
    return EVENT_MESSAGES.SAVE_ERROR;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!validate()) return;

    const payload: CreateEventPayload = {
      title: title.trim(),
      description: description.trim(),
      cover_image_url: coverImageUrl.trim(),
      start_time: localInputToIso(startTime) as string,
      end_time: localInputToIso(endTime),
      latitude: lat,
      longitude: lon,
      address: address.trim(),
      district,
      max_participants: Number(maxParticipants),
    };

    try {
      setLoading(true);
      const saved =
        isEdit && event
          ? await eventService.updateEvent(event.event_id, { ...payload, version: event.version })
          : await eventService.createEvent(payload);
      onToast?.(isEdit ? EVENT_MESSAGES.UPDATE_SUCCESS : EVENT_MESSAGES.CREATE_SUCCESS);
      onSuccess(saved);
      onClose();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Portal ra body để overlay luôn phủ đúng viewport, không bị khối cha cắt/neo lệch
  return createPortal(
    <div className="event-modal-overlay" data-testid="create-event-modal-overlay">
      <div className="event-modal-box large" data-testid="create-event-modal">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h2>{isEdit ? EVENT_MESSAGES.EDIT_TITLE : EVENT_MESSAGES.CREATE_TITLE}</h2>
            <p className="modal-sub">
              {isEdit ? EVENT_MESSAGES.EDIT_SUBTITLE : EVENT_MESSAGES.CREATE_SUBTITLE}
            </p>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            data-testid="btn-close-create-modal"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body-scroll" noValidate>
          {errorMessage && (
            <div className="form-alert" role="alert">
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
                className={fieldErrors.title ? "input-invalid" : ""}
              />
              {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
            </div>

            {/* 2. Ảnh bìa - upload thật */}
            <div className="form-group">
              <label>
                Ảnh bìa sự kiện (JPG/PNG, tối đa 5MB) <span className="required-star">*</span>
              </label>
              <div className="cover-upload-area">
                {coverImageUrl ? (
                  <div className="cover-preview-wrapper">
                    <img
                      src={resolveMediaUrl(coverImageUrl)}
                      alt="Ảnh bìa xem trước"
                      className="preview-cover-img"
                    />
                    <div className="cover-preview-actions">
                      <button
                        type="button"
                        className="btn-my-events-toggle"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingCover}
                      >
                        {uploadingCover
                          ? EVENT_MESSAGES.UPLOADING_COVER
                          : "Đổi ảnh bìa khác"}
                      </button>
                      <button
                        type="button"
                        className="btn-my-events-toggle"
                        onClick={() => setCoverImageUrl("")}
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="upload-prompt"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingCover}
                    data-testid="btn-upload-cover"
                  >
                    <span className="upload-icon">📸</span>
                    <span className="upload-title">
                      {uploadingCover
                        ? EVENT_MESSAGES.UPLOADING_COVER
                        : "Nhấp để chọn ảnh bìa từ thiết bị"}
                    </span>
                    <span className="upload-rule">Định dạng JPG/PNG, dung lượng tối đa 5MB</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="cover-file-input"
                  onChange={(e) => {
                    handleCoverFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />

                <input
                  type="text"
                  className="cover-url-input"
                  value={coverImageUrl.startsWith("http") ? coverImageUrl : ""}
                  placeholder="Hoặc dán URL ảnh bìa (https://...)"
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                />
              </div>
              {fieldErrors.cover && <span className="field-error">{fieldErrors.cover}</span>}
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
                  className={fieldErrors.startTime ? "input-invalid" : ""}
                />
                {fieldErrors.startTime && (
                  <span className="field-error">{fieldErrors.startTime}</span>
                )}
              </div>

              <div className="form-group">
                <label>Ngày giờ kết thúc dự kiến</label>
                <input
                  type="datetime-local"
                  data-testid="input-event-end-time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={fieldErrors.endTime ? "input-invalid" : ""}
                />
                {fieldErrors.endTime && <span className="field-error">{fieldErrors.endTime}</span>}
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
                <span className="field-hint">
                  Tự động cập nhật theo vị trí ghim trên bản đồ bên dưới.
                </span>
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
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value, 10) || 0)}
                  className={fieldErrors.maxParticipants ? "input-invalid" : ""}
                />
                {fieldErrors.maxParticipants && (
                  <span className="field-error">{fieldErrors.maxParticipants}</span>
                )}
              </div>
            </div>

            {/* 5. Địa chỉ chi tiết */}
            <div className="form-group">
              <label>
                Địa chỉ tập trung cụ thể <span className="required-star">*</span>
              </label>
              <div className="address-input-row">
                <input
                  type="text"
                  data-testid="input-event-address"
                  placeholder="VD: Cổng chính Công viên Lê Văn Tám, Đường Hai Bà Trưng"
                  maxLength={255}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={fieldErrors.address ? "input-invalid" : ""}
                />
                <button
                  type="button"
                  className="btn-my-events-toggle"
                  onClick={handleUseMapAddress}
                >
                  📍 Lấy từ bản đồ
                </button>
              </div>
              {fieldErrors.address && <span className="field-error">{fieldErrors.address}</span>}
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
              {fieldErrors.location && <span className="field-error">{fieldErrors.location}</span>}
            </div>

            {/* 7. Mô tả chi tiết & Vật dụng mang theo */}
            <div className="form-group">
              <label>
                Mô tả chi tiết &amp; Vật dụng cần mang theo{" "}
                <span className="required-star">*</span>
                <span className="char-hint">{description.length}/2000</span>
              </label>
              <textarea
                data-testid="textarea-event-desc"
                placeholder="Nêu rõ nội dung hoạt động dọn dẹp, đồng phục, dụng cụ gắp rác, bình nước cá nhân..."
                maxLength={2000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={fieldErrors.description ? "input-invalid" : ""}
              />
              {fieldErrors.description && (
                <span className="field-error">{fieldErrors.description}</span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-my-events-toggle"
              onClick={handleClose}
              disabled={loading}
            >
              {EVENT_MESSAGES.CANCEL}
            </button>
            <button
              type="submit"
              className="btn-create-event"
              data-testid="btn-submit-create-event"
              disabled={loading || uploadingCover}
            >
              {loading
                ? isEdit
                  ? EVENT_MESSAGES.SAVING
                  : EVENT_MESSAGES.SUBMITTING
                : isEdit
                ? EVENT_MESSAGES.SAVE
                : EVENT_MESSAGES.SUBMIT}
            </button>
          </div>
        </form>

        {showDiscardConfirm && (
          <div className="discard-confirm-overlay" data-testid="discard-confirm">
            <div className="discard-confirm-box">
              <h3>{EVENT_MESSAGES.DISCARD_TITLE}</h3>
              <p>{EVENT_MESSAGES.DISCARD_DESCRIPTION}</p>
              <div className="discard-confirm-actions">
                <button
                  type="button"
                  className="btn-my-events-toggle"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  {EVENT_MESSAGES.DISCARD_CANCEL}
                </button>
                <button
                  type="button"
                  className="btn-create-event"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                >
                  {EVENT_MESSAGES.DISCARD_CONFIRM}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};





