import React, { useState, useMemo, useEffect } from "react";
import type {
  RecyclingFacilityItem,
  RecyclingFacilityCreateRequest,
  RecyclingFacilityUpdateRequest,
  DistrictItem,
} from "../types/recyclingFacility.types";
import { AVAILABLE_WASTE_TYPES } from "../types/recyclingFacility.types";
import {
  checkFacilityNameUnique,
  checkFacilityProximity,
} from "../services/recyclingFacilityService";
import { FacilityMiniMapPicker, isCoordinatesInHCMC } from "./FacilityMiniMapPicker";
import { CustomSelectDropdown } from "./CustomSelectDropdown";

interface FacilityFormViewProps {
  mode: "create" | "edit";
  initialItem?: RecyclingFacilityItem | null;
  districts: DistrictItem[];
  onSaveCreate: (data: RecyclingFacilityCreateRequest) => Promise<void>;
  onSaveUpdate: (id: number, data: RecyclingFacilityUpdateRequest) => Promise<void>;
  onCancelRequest: (hasChanges: boolean) => void;
  onReload?: () => void;
}

export const FacilityFormView: React.FC<FacilityFormViewProps> = ({
  mode,
  initialItem,
  districts,
  onSaveCreate,
  onSaveUpdate,
  onCancelRequest,
  onReload,
}) => {
  const isEdit = mode === "edit";

  // Form State
  const [name, setName] = useState<string>(initialItem?.name || "");
  const [address, setAddress] = useState<string>(initialItem?.address || "");
  const [unitId, setUnitId] = useState<number | undefined>(
    initialItem?.unit_id || (districts.length > 0 ? districts[0].unit_id : undefined)
  );
  const [contactPhone, setContactPhone] = useState<string>(
    initialItem?.contact_phone || ""
  );
  const [managingOrg, setManagingOrg] = useState<string>(
    initialItem?.managing_org || ""
  );

  // GIS Coordinates (Default: Quận 1 TP.HCM nếu tạo mới)
  const [latitude, setLatitude] = useState<number>(
    initialItem?.latitude ?? 10.7769
  );
  const [longitude, setLongitude] = useState<number>(
    initialItem?.longitude ?? 106.7009
  );

  // Waste types & Operating hours
  const [acceptedWasteTypes, setAcceptedWasteTypes] = useState<string[]>(
    initialItem?.accepted_waste_types || ["PIN_CU", "THIET_BI_DIEN_TU", "NHUA"]
  );
  const [openTime, setOpenTime] = useState<string>(
    initialItem?.open_time || "07:30"
  );
  const [closeTime, setCloseTime] = useState<string>(
    initialItem?.close_time || "17:00"
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialItem ? initialItem.is_active : true
  );

  // Validation States
  const [nameError, setNameError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [wasteTypesError, setWasteTypesError] = useState<string | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [proximityWarning, setProximityWarning] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tự động gán unitId mặc định khi danh sách quận được tải về
  useEffect(() => {
    if (!unitId && districts.length > 0) {
      setUnitId(districts[0].unit_id);
    }
  }, [districts, unitId]);

  // Kiểm tra trạng thái thay đổi form (Dirty check)
  const isDirty = useMemo(() => {
    if (!isEdit) {
      return (
        name.trim().length > 0 ||
        address.trim().length > 0 ||
        contactPhone.trim().length > 0 ||
        managingOrg.trim().length > 0 ||
        latitude !== 10.7769 ||
        longitude !== 106.7009 ||
        openTime !== "07:30" ||
        closeTime !== "17:00"
      );
    }
    if (!initialItem) return false;
    return (
      name.trim() !== initialItem.name ||
      address.trim() !== initialItem.address ||
      unitId !== initialItem.unit_id ||
      (contactPhone.trim() || "") !== (initialItem.contact_phone || "") ||
      (managingOrg.trim() || "") !== (initialItem.managing_org || "") ||
      Math.abs(latitude - initialItem.latitude) > 0.000001 ||
      Math.abs(longitude - initialItem.longitude) > 0.000001 ||
      JSON.stringify(acceptedWasteTypes) !== JSON.stringify(initialItem.accepted_waste_types) ||
      openTime !== initialItem.open_time ||
      closeTime !== initialItem.close_time ||
      isActive !== initialItem.is_active
    );
  }, [
    isEdit,
    initialItem,
    name,
    address,
    unitId,
    contactPhone,
    managingOrg,
    latitude,
    longitude,
    acceptedWasteTypes,
    openTime,
    closeTime,
    isActive,
  ]);

  // Kiểm tra khoảng cách PostGIS khi toạ độ thay đổi (Debounce)
  useEffect(() => {
    if (!isCoordinatesInHCMC(latitude, longitude)) {
      setProximityWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await checkFacilityProximity(
          latitude,
          longitude,
          isEdit ? initialItem?.facility_id : undefined
        );
        if (!res.is_valid) {
          setProximityWarning(res.message || "Vị trí này đã có trạm khác trong phạm vi 20m");
        } else {
          setProximityWarning(null);
        }
      } catch {
        // Bỏ qua lỗi mạng nền
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [latitude, longitude, isEdit, initialItem]);

  // Toggle chọn loại rác tiếp nhận
  const handleToggleWasteType = (code: string) => {
    if (acceptedWasteTypes.includes(code)) {
      if (acceptedWasteTypes.length <= 1) {
        setWasteTypesError("Trạm phải tiếp nhận ít nhất một loại rác tái chế");
        return;
      }
      setAcceptedWasteTypes(acceptedWasteTypes.filter((t) => t !== code));
    } else {
      setAcceptedWasteTypes([...acceptedWasteTypes, code]);
    }
    if (wasteTypesError) setWasteTypesError(null);
  };

  // Client Validation
  const validateForm = async (): Promise<boolean> => {
    let valid = true;

    // 1. Tên trạm
    const cleanName = name.trim();
    if (!cleanName) {
      setNameError("Vui lòng nhập tên trạm");
      valid = false;
    } else if (cleanName.length > 100) {
      setNameError("Tên tối đa 100 ký tự");
      valid = false;
    } else {
      setNameError(null);
    }

    // 2. Địa chỉ
    const cleanAddress = address.trim();
    if (!cleanAddress) {
      setAddressError("Vui lòng nhập địa chỉ");
      valid = false;
    } else if (cleanAddress.length > 200) {
      setAddressError("Địa chỉ tối đa 200 ký tự");
      valid = false;
    } else {
      setAddressError(null);
    }

    // 3. Quận / Huyện
    if (!unitId) {
      setUnitError("Vui lòng chọn quận/huyện");
      valid = false;
    } else {
      setUnitError(null);
    }

    // 4. Toạ độ
    if (isNaN(latitude) || isNaN(longitude)) {
      setCoordsError("Vui lòng ghim vị trí đặt trạm");
      valid = false;
    } else if (!isCoordinatesInHCMC(latitude, longitude)) {
      setCoordsError("Vị trí nằm ngoài phạm vi hỗ trợ của hệ thống");
      valid = false;
    } else {
      setCoordsError(null);
    }

    // 5. Loại rác
    if (!acceptedWasteTypes || acceptedWasteTypes.length === 0) {
      setWasteTypesError("Vui lòng chọn ít nhất 1 loại rác");
      valid = false;
    } else {
      setWasteTypesError(null);
    }

    // 6. Giờ hoạt động
    if (!openTime || !closeTime) {
      setHoursError("Vui lòng nhập giờ mở cửa");
      valid = false;
    } else if (openTime >= closeTime) {
      setHoursError("Giờ đóng cửa phải sau giờ mở cửa");
      valid = false;
    } else {
      setHoursError(null);
    }

    if (!valid) return false;

    // 7. Kiểm tra trùng tên theo Quận/Huyện qua API
    if (unitId) {
      try {
        const checkRes = await checkFacilityNameUnique(
          cleanName,
          unitId,
          isEdit ? initialItem?.facility_id : undefined
        );
        if (!checkRes.is_valid) {
          setNameError(checkRes.message || "Tên trạm đã tồn tại trong quận/huyện này");
          return false;
        }
      } catch {
        // Cho phép tiếp tục nếu lỗi mạng không nghiêm trọng
      }
    }

    // 8. Kiểm tra khoảng cách 20m qua API
    try {
      const proxRes = await checkFacilityProximity(
        latitude,
        longitude,
        isEdit ? initialItem?.facility_id : undefined
      );
      if (!proxRes.is_valid) {
        setCoordsError(proxRes.message || "Vị trí này đã có trạm khác trong bán kính 20m");
        return false;
      }
    } catch {
      // Bỏ qua
    }

    return true;
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const isValid = await validateForm();
    if (!isValid) return;

    try {
      setIsSubmitting(true);
      if (isEdit && initialItem) {
        const updateData: RecyclingFacilityUpdateRequest = {
          name: name.trim(),
          address: address.trim(),
          unit_id: unitId!,
          latitude,
          longitude,
          accepted_waste_types: acceptedWasteTypes,
          open_time: openTime,
          close_time: closeTime,
          is_active: isActive,
          version: initialItem.version,
          contact_phone: contactPhone.trim() || undefined,
          managing_org: managingOrg.trim() || undefined,
        };
        await onSaveUpdate(initialItem.facility_id, updateData);
      } else {
        const createData: RecyclingFacilityCreateRequest = {
          name: name.trim(),
          address: address.trim(),
          unit_id: unitId!,
          latitude,
          longitude,
          accepted_waste_types: acceptedWasteTypes,
          open_time: openTime,
          close_time: closeTime,
          contact_phone: contactPhone.trim() || undefined,
          managing_org: managingOrg.trim() || undefined,
        };
        await onSaveCreate(createData);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Có lỗi xảy ra khi lưu thông tin trạm. Vui lòng thử lại";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="three-columns-layout form-view-layout">
      {/* KHỐI 1: THÔNG TIN CHUNG */}
      <div className="facility-col-panel form-col-general">
        <div className="panel-header">
          <h3 className="panel-title">THÔNG TIN CHUNG</h3>
          <span className="panel-subtitle">Tên trạm, địa chỉ & đơn vị phụ trách</span>
        </div>

        <div className="panel-body">
          {/* TÊN TRẠM */}
          <div className="form-group">
            <div className="label-row">
              <label className="field-label" htmlFor="input-facility-name">
                Tên trạm tiếp nhận <span className="text-req">*</span>:
              </label>
              <span
                className={`char-count ${
                  name.length > 100 ? "count-overflow" : ""
                }`}
              >
                {name.length}/100
              </span>
            </div>
            <input
              id="input-facility-name"
              type="text"
              className={`custom-input ${nameError ? "input-error" : ""}`}
              placeholder="VD: Điểm Tiếp Nhận Rác Tái Chế Nguyễn Huệ"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              disabled={isSubmitting}
            />
            {nameError ? (
              <span className="error-text">{nameError}</span>
            ) : (
              <span className="field-hint">
                Tên trạm phải duy nhất trong phạm vi mỗi quận/huyện.
              </span>
            )}
          </div>

          {/* QUẬN / HUYỆN */}
          <div className="form-group">
            <label className="field-label" htmlFor="input-facility-unit">
              Quận/Huyện trực thuộc <span className="text-req">*</span>:
            </label>
            <CustomSelectDropdown
              id="input-facility-unit"
              value={unitId}
              options={districts.map((d) => ({
                value: d.unit_id,
                label: d.unit_name || d.name || `Khu vực ${d.unit_id}`,
              }))}
              placeholder="-- Chọn quận/huyện --"
              hasSearch={true}
              disabled={isSubmitting}
              error={Boolean(unitError)}
              onChange={(val) => {
                setUnitId(val ? (typeof val === "number" ? val : parseInt(String(val), 10)) : undefined);
                if (unitError) setUnitError(null);
              }}
            />
            {unitError && <span className="error-text">{unitError}</span>}
          </div>

          {/* ĐỊA CHỈ CHI TIẾT */}
          <div className="form-group">
            <div className="label-row">
              <label className="field-label" htmlFor="input-facility-address">
                Địa chỉ chi tiết <span className="text-req">*</span>:
              </label>
              <span
                className={`char-count ${
                  address.length > 200 ? "count-overflow" : ""
                }`}
              >
                {address.length}/200
              </span>
            </div>
            <textarea
              id="input-facility-address"
              className={`custom-textarea ${addressError ? "input-error" : ""}`}
              placeholder="VD: Số 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (addressError) setAddressError(null);
              }}
              rows={3}
              disabled={isSubmitting}
            />
            {addressError && <span className="error-text">{addressError}</span>}
          </div>

          {/* SỐ ĐIỆN THOẠI LIÊN HỆ */}
          <div className="form-group">
            <label className="field-label" htmlFor="input-facility-phone">
              Số điện thoại đường dây nóng:
            </label>
            <input
              id="input-facility-phone"
              type="text"
              className="custom-input"
              placeholder="VD: 028.3822.1234"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={isSubmitting}
            />
            <span className="field-hint">Số hotline hỗ trợ người dân gửi rác (tuỳ chọn).</span>
          </div>

          {/* ĐƠN VỊ QUẢN LÝ */}
          <div className="form-group">
            <label className="field-label" htmlFor="input-facility-org">
              Đơn vị quản lý / vận hành:
            </label>
            <input
              id="input-facility-org"
              type="text"
              className="custom-input"
              placeholder="VD: Công ty TNHH MTV Môi Trường Đô Thị TP.HCM"
              value={managingOrg}
              onChange={(e) => setManagingOrg(e.target.value)}
              disabled={isSubmitting}
            />
            <span className="field-hint">Đơn vị chịu trách nhiệm gom và tái chế (tuỳ chọn).</span>
          </div>
        </div>
      </div>

      {/* KHỐI 2: CẤU HÌNH & VỊ TRÍ GIS */}
      <div className="facility-col-panel form-col-config">
        <div className="panel-header">
          <h3 className="panel-title">CẤU HÌNH & VỊ TRÍ GIS</h3>
          <span className="panel-subtitle">Toạ độ không gian, loại rác & giờ mở cửa</span>
        </div>

        <div className="panel-body">
          {/* BẢN ĐỒ VỊ TRÍ GIS TƯƠNG TÁC */}
          <div className="form-group">
            <label className="field-label">
              Vị trí ghim toạ độ bản đồ <span className="text-req">*</span>:
            </label>
            <FacilityMiniMapPicker
              latitude={latitude}
              longitude={longitude}
              onChangeLocation={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
                if (coordsError) setCoordsError(null);
              }}
              disabled={isSubmitting}
              proximityWarning={proximityWarning}
            />
            {coordsError && <span className="error-text">{coordsError}</span>}
          </div>

          {/* LOẠI RÁC TIẾP NHẬN */}
          <div className="form-group">
            <label className="field-label">
              Danh mục rác tiếp nhận <span className="text-req">*</span>:
            </label>
            <div className="waste-type-checkbox-grid">
              {AVAILABLE_WASTE_TYPES.map((type) => {
                const checked = acceptedWasteTypes.includes(type.code);
                return (
                  <button
                    key={type.code}
                    type="button"
                    className={`waste-select-card ${checked ? "selected" : ""}`}
                    onClick={() => handleToggleWasteType(type.code)}
                    disabled={isSubmitting}
                  >
                    <span className="waste-card-icon">{type.icon}</span>
                    <span className="waste-card-label">{type.label}</span>
                    <span className="waste-card-checkbox">
                      {checked ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            {wasteTypesError && <span className="error-text">{wasteTypesError}</span>}
          </div>

          {/* GIỜ HOẠT ĐỘNG */}
          <div className="form-group hours-group">
            <label className="field-label">
              Thời gian tiếp nhận hàng ngày <span className="text-req">*</span>:
            </label>
            <div className="time-range-inputs">
              <div className="time-input-col">
                <span className="sub-label">Giờ mở cửa:</span>
                <input
                  type="time"
                  className="custom-input time-input"
                  value={openTime}
                  onChange={(e) => {
                    setOpenTime(e.target.value);
                    if (hoursError) setHoursError(null);
                  }}
                  disabled={isSubmitting}
                />
              </div>

              <span className="time-sep">đến</span>

              <div className="time-input-col">
                <span className="sub-label">Giờ đóng cửa:</span>
                <input
                  type="time"
                  className="custom-input time-input"
                  value={closeTime}
                  onChange={(e) => {
                    setCloseTime(e.target.value);
                    if (hoursError) setHoursError(null);
                  }}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {hoursError && <span className="error-text">{hoursError}</span>}
          </div>

          {/* CHỈ CÓ Ở MÀN 3: CÔNG TẮC TRẠNG THÁI */}
          {isEdit && (
            <div className="form-group status-toggle-group">
              <label className="field-label">Trạng thái trạm:</label>
              <div className="toggle-container">
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span className="slider round" />
                </label>
                <span
                  className={`toggle-label-text ${
                    isActive ? "active-txt" : "inactive-txt"
                  }`}
                >
                  {isActive ? "Đang hoạt động" : "Tạm ngưng"}
                </span>
              </div>

              {!isActive && (
                <div className="warning-callout-box">
                  <span className="callout-icon">⚠️</span>
                  <span className="callout-text">
                    Trạm sẽ bị ẩn khỏi bản đồ và kết quả tra cứu của công dân
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KHỐI 3: LƯU & XÁC NHẬN */}
      <div className="facility-col-panel form-col-save">
        <div className="panel-header">
          <h3 className="panel-title">LƯU</h3>
          <span className="panel-subtitle">Mã trạm & Xác nhận thao tác</span>
        </div>

        <div className="panel-body save-body">
          {/* HIỂN THỊ MÃ TRẠM VÀ MÃ QR */}
          <div className="code-preview-section">
            <label className="field-label">Mã định danh trạm:</label>
            {isEdit && initialItem ? (
              <div className="readonly-badge-box">
                <span className="code-highlight">{initialItem.facility_code}</span>
                <span className="code-sub">Mã trạm cố định không thể sửa</span>
              </div>
            ) : (
              <div className="auto-code-hint-box">
                <span className="auto-badge">TỰ ĐỘNG SINH</span>
                <p className="auto-desc">
                  Mã trạm sẽ được hệ thống tự động sinh theo mẫu:
                  <br />
                  <code>REC-{"{QUẬN}"}-{"{STT:02d}"}</code>
                  <br />
                  (Ví dụ: <code>REC-Q1-01</code>, <code>REC-TPTD-02</code>)
                </p>
              </div>
            )}
          </div>

          {/* DÒNG THÔNG BÁO LỖI TỔNG THỂ NẾU SERVER TRẢ VỀ */}
          {serverError && (
            <div className="server-error-banner">
              <span className="error-text-content">{serverError}</span>
              {(serverError.includes("thay đổi bởi người khác") ||
                serverError.includes("tải lại")) &&
                onReload && (
                  <button
                    type="button"
                    className="btn-reload-action"
                    onClick={() => {
                      setServerError(null);
                      onReload();
                    }}
                  >
                    🔄 Tải lại
                  </button>
                )}
            </div>
          )}

          {/* NÚT THAO TÁC */}
          <div className="save-actions-stack">
            <button
              type="button"
              className={`btn-save-submit ${
                isEdit && !isDirty ? "btn-disabled-clean" : ""
              }`}
              onClick={handleSubmit}
              disabled={isSubmitting || (isEdit && !isDirty)}
            >
              {isSubmitting ? (
                <span>{isEdit ? "Đang cập nhật…" : "Đang lưu trạm…"}</span>
              ) : (
                <span>{isEdit ? "Cập nhật" : "Lưu trạm"}</span>
              )}
            </button>

            <button
              type="button"
              className="btn-cancel-form"
              onClick={() => onCancelRequest(isDirty)}
              disabled={isSubmitting}
            >
              Huỷ
            </button>
          </div>

          {/* GHI CHÚ QUY TẮC BẢO TOÀN DỮ LIỆU */}
          <div className="save-instruction-note">
            <p>
              🛡️ <strong>Quy chuẩn hệ thống:</strong> Mã trạm và Mã QR sau khi lưu sẽ được bảo toàn tuyệt đối để biển báo vật lý in tại điểm thu gom không bị vô hiệu hoá.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

