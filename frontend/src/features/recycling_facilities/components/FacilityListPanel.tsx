import React from "react";
import type { RecyclingFacilityItem } from "../types/recyclingFacility.types";
import { getWasteTypeBadge } from "../types/recyclingFacility.types";

interface FacilityListPanelProps {
  facilities: RecyclingFacilityItem[];
  loading: boolean;
  error: string | null;
  hasFilters: boolean;
  onEdit: (item: RecyclingFacilityItem) => void;
  onDelete: (item: RecyclingFacilityItem) => void;
  onViewQR: (item: RecyclingFacilityItem) => void;
  onAddNew: () => void;
  onRetry: () => void;
}

export const FacilityListPanel: React.FC<FacilityListPanelProps> = ({
  facilities,
  loading,
  error,
  hasFilters,
  onEdit,
  onDelete,
  onViewQR,
  onAddNew,
  onRetry,
}) => {
  // Loại bỏ hậu tố trùng lặp (TP.HCM) ở cuối tên trạm để giao diện tinh gọn, chuyên nghiệp
  const formatFacilityName = (name: string): string => {
    return name.replace(/\s*\((?:TP\.?\s*HCM|TPHCM)\)\s*$/i, "").trim();
  };

  return (
    <div className="facility-col-panel list-panel">
      <div className="panel-header">
        <div className="header-titles">
          <h3 className="panel-title">DANH SÁCH TRẠM TÁI CHẾ</h3>
          <span className="panel-subtitle">
            Mạng lưới điểm thu gom và tiếp nhận rác thải phân loại trên địa bàn TP.HCM
          </span>
        </div>
      </div>

      <div className="panel-body list-body">
        {/* TRẠNG THÁI ĐANG TẢI */}
        {loading && (
          <div className="loading-state-wrapper">
            <div className="spinner-emerald" />
            <p className="loading-text">Đang tải dữ liệu…</p>
          </div>
        )}

        {/* TRẠNG THÁI LỖI */}
        {!loading && error && (
          <div className="error-state-card">
            <span className="error-icon">⚠️</span>
            <h4 className="error-title">Không thể tải danh sách trạm. Vui lòng thử lại</h4>
            <p className="error-desc">{error}</p>
            <button type="button" className="btn-retry-fetch" onClick={onRetry}>
              Thử lại
            </button>
          </div>
        )}

        {/* TRẠNG THÁI RỖNG */}
        {!loading && !error && facilities.length === 0 && (
          <div className="empty-state-card">
            <span className="empty-icon">📍</span>
            <h4 className="empty-title">
              {hasFilters ? "Không tìm thấy trạm phù hợp" : "Chưa có trạm tái chế nào"}
            </h4>
            <p className="empty-desc">
              {hasFilters
                ? "Bộ lọc hoặc tìm kiếm không có kết quả phù hợp."
                : "Hệ thống chưa ghi nhận trạm tái chế nào trong cơ sở dữ liệu."}
            </p>
            {!hasFilters && (
              <button
                type="button"
                className="btn-empty-create"
                onClick={onAddNew}
              >
                + Thêm mới
              </button>
            )}
          </div>
        )}

        {/* BẢNG DỮ LIỆU CHUẨN DOANH NGHIỆP */}
        {!loading && !error && facilities.length > 0 && (
          <div className="table-responsive-wrapper">
            <table className="facility-data-table">
              <thead>
                <tr>
                  <th className="col-code">Mã trạm</th>
                  <th className="col-name">Tên trạm & Địa chỉ</th>
                  <th className="col-district">Quận/Huyện</th>
                  <th className="col-hours">Giờ mở cửa</th>
                  <th className="col-waste-types">Loại rác nhận</th>
                  <th className="col-status">Trạng thái</th>
                  <th className="col-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => {
                  const displayName = formatFacilityName(f.name);
                  const districtName = f.unit_name || f.district_name || "Chưa phân bổ";
                  const wasteTypes = f.accepted_waste_types || [];
                  const visibleTypes = wasteTypes.slice(0, 2);
                  const remainingCount = wasteTypes.length - 2;

                  return (
                    <tr
                      key={f.facility_id}
                      className={`facility-row ${!f.is_active ? "row-inactive" : ""}`}
                    >
                      {/* 1. MÃ TRẠM */}
                      <td className="col-code">
                        <span className="facility-code-badge" title={f.facility_code}>
                          {f.facility_code}
                        </span>
                      </td>

                      {/* 2. TÊN & ĐỊA CHỈ */}
                      <td className="col-name">
                        <div className="facility-primary-name" title={f.name}>
                          {displayName}
                        </div>
                        <div className="facility-sub-address" title={f.address}>
                          <span className="pin-icon">📍</span>
                          <span className="address-text">{f.address}</span>
                        </div>
                        {f.contact_phone && (
                          <div className="facility-contact-sub">
                            <span className="phone-icon">📞</span>
                            <span>{f.contact_phone}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. QUẬN/HUYỆN */}
                      <td className="col-district">
                        <span className="district-tag" title={districtName}>
                          {districtName}
                        </span>
                      </td>

                      {/* 4. GIỜ MỞ CỬA */}
                      <td className="col-hours">
                        <span className="hours-chip">
                          <span className="clock-icon">🕒</span>
                          <span>{f.open_time} - {f.close_time}</span>
                        </span>
                      </td>

                      {/* 5. LOẠI RÁC TIẾP NHẬN (TỐI ĐA 2 BADGES + ĐẾM SỐ CÒN LẠI) */}
                      <td className="col-waste-types">
                        <div className="waste-badges-wrap">
                          {visibleTypes.map((type) => {
                            const badge = getWasteTypeBadge(type);
                            return (
                              <span
                                key={type}
                                className="waste-type-pill"
                                style={{
                                  backgroundColor: badge.bgColor,
                                  borderColor: badge.color,
                                  color: badge.color,
                                }}
                                title={badge.label}
                              >
                                <span className="pill-icon">{badge.icon}</span>
                                <span className="pill-label">{badge.label}</span>
                              </span>
                            );
                          })}

                          {remainingCount > 0 && (
                            <span
                              className="waste-more-pill"
                              title={wasteTypes
                                .slice(2)
                                .map((t) => getWasteTypeBadge(t).label)
                                .join(", ")}
                            >
                              +{remainingCount} loại
                            </span>
                          )}

                          {wasteTypes.length === 0 && (
                            <span className="text-muted">Chưa cấu hình</span>
                          )}
                        </div>
                      </td>

                      {/* 6. TRẠNG THÁI */}
                      <td className="col-status">
                        <span
                          className={`status-pill ${
                            f.is_active ? "status-active" : "status-inactive"
                          }`}
                        >
                          <span className="pill-dot" />
                          <span className="status-label">
                            {f.is_active ? "Đang hoạt động" : "Tạm ngưng"}
                          </span>
                        </span>
                      </td>

                      {/* 7. THAO TÁC */}
                      <td className="col-actions">
                        <div className="action-buttons-group">
                          <button
                            type="button"
                            className="btn-table-action btn-qr"
                            onClick={() => onViewQR(f)}
                            title="Xem & In mã QR trạm"
                          >
                            <span className="btn-icon">📱</span>
                            <span className="btn-text">QR</span>
                          </button>
                          <button
                            type="button"
                            className="btn-table-action btn-edit"
                            onClick={() => onEdit(f)}
                            title="Chỉnh sửa thông tin trạm"
                          >
                            <span className="btn-icon">✏️</span>
                            <span className="btn-text">Sửa</span>
                          </button>
                          <button
                            type="button"
                            className="btn-table-action btn-delete"
                            onClick={() => onDelete(f)}
                            title="Xoá trạm tái chế"
                          >
                            <span className="btn-icon">🗑️</span>
                            <span className="btn-text">Xoá</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
