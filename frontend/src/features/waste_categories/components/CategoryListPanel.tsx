import React from "react";
import type { WasteCategoryItem, SeverityLevel } from "../types/wasteCategory.types";

interface Props {
  categories: WasteCategoryItem[];
  loading: boolean;
  error: string | null;
  hasFilters: boolean;
  onEdit: (item: WasteCategoryItem) => void;
  onDelete: (item: WasteCategoryItem) => void;
  onAddNew: () => void;
  onRetry: () => void;
}

const renderSeverityBadge = (level: SeverityLevel) => {
  switch (level) {
    case "CRITICAL":
      return <span className="badge-severity critical">🚨 Khẩn cấp</span>;
    case "HIGH":
      return <span className="badge-severity high">⚠️ Cao</span>;
    case "MEDIUM":
      return <span className="badge-severity medium">🟡 Trung bình</span>;
    case "LOW":
    default:
      return <span className="badge-severity low">🟢 Thấp</span>;
  }
};

export const CategoryListPanel: React.FC<Props> = ({
  categories,
  loading,
  error,
  hasFilters,
  onEdit,
  onDelete,
  onAddNew,
  onRetry,
}) => {
  return (
    <div className="category-col-panel list-panel">
      <div className="panel-header">
        <h3 className="panel-title">DANH SÁCH DANH MỤC RÁC</h3>
        <span className="panel-subtitle">Quy chuẩn & Thời hạn SLA cam kết</span>
      </div>

      <div className="panel-body">
        {/* TRẠNG THÁI: ĐANG TẢI DỮ LIỆU */}
        {loading ? (
          <div className="list-state-box loading-box">
            <div className="spinner-orbit" />
            <p className="state-message">Đang tải dữ liệu…</p>
          </div>
        ) : error ? (
          /* TRẠNG THÁI: LỖI MẠNG HOẶC MÁY CHỦ */
          <div className="list-state-box error-box">
            <span className="state-icon">⚠️</span>
            <p className="state-message">Không thể tải danh mục. Vui lòng thử lại</p>
            <p className="error-detail-sub">{error}</p>
            <button type="button" className="btn-retry" onClick={onRetry}>
              🔄 Thử lại
            </button>
          </div>
        ) : categories.length === 0 ? (
          /* TRẠNG THÁI: TRỐNG */
          hasFilters ? (
            /* LỌC HOẶC TÌM KIẾM KHÔNG CÓ KẾT QUẢ */
            <div className="list-state-box empty-search-box">
              <span className="state-icon">🔎</span>
              <p className="state-message">Không tìm thấy danh mục phù hợp</p>
              <p className="state-sub">Vui lòng thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc trạng thái.</p>
            </div>
          ) : (
            /* CHƯA CÓ DANH MỤC NÀO TRONG HỆ THỐNG */
            <div className="list-state-box empty-box">
              <span className="state-icon">🗑️</span>
              <p className="state-message">Chưa có danh mục rác thải nào</p>
              <p className="state-sub">Hệ thống chưa thiết lập loại rác thải. Hãy tạo danh mục đầu tiên.</p>
              <button type="button" className="btn-add-empty" onClick={onAddNew}>
                + Thêm mới
              </button>
            </div>
          )
        ) : (
          /* DANH SÁCH DANH MỤC (TABLE / CARD ROWS) */
          <div className="category-table-wrapper">
            <table className="category-table">
              <thead>
                <tr>
                  <th className="col-code">Mã</th>
                  <th className="col-name">Tên loại rác</th>
                  <th className="col-sla">SLA (giờ)</th>
                  <th className="col-severity">Mức ưu tiên</th>
                  <th className="col-status">Trạng thái</th>
                  <th className="col-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const isInactive = !cat.is_active;
                  return (
                    <tr
                      key={cat.category_id}
                      className={`category-row ${isInactive ? "row-inactive" : ""}`}
                    >
                      {/* CỘT MÃ */}
                      <td className="col-code">
                        <span className="code-pill">{cat.category_code}</span>
                      </td>

                      {/* CỘT TÊN & MÔ TẢ */}
                      <td className="col-name">
                        <div className="name-primary">{cat.name}</div>
                        {cat.description && (
                          <div className="desc-secondary" title={cat.description}>
                            {cat.description}
                          </div>
                        )}
                        {cat.unresolved_incidents_count > 0 && (
                          <div className="open-incidents-tag">
                            🔔 {cat.unresolved_incidents_count} phản ánh đang xử lý
                          </div>
                        )}
                      </td>

                      {/* CỘT THỜI HẠN SLA */}
                      <td className="col-sla">
                        <span className="sla-value">{cat.sla_hours} giờ</span>
                        {cat.sla_warning_hours > 0 && (
                          <span className="sla-warn-sub">
                            Báo trước: {cat.sla_warning_hours}h
                          </span>
                        )}
                      </td>

                      {/* CỘT MỨC ƯU TIÊN */}
                      <td className="col-severity">
                        {renderSeverityBadge(cat.default_severity)}
                      </td>

                      {/* CỘT TRẠNG THÁI */}
                      <td className="col-status">
                        {cat.is_active ? (
                          <span className="status-badge badge-active">
                            🟢 Đang áp dụng
                          </span>
                        ) : (
                          <span className="status-badge badge-inactive">
                            ⚪ Ngưng áp dụng
                          </span>
                        )}
                      </td>

                      {/* CỘT THAO TÁC: SỬA & XOÁ */}
                      <td className="col-actions">
                        <div className="row-action-btns">
                          <button
                            type="button"
                            className="btn-row-action btn-edit"
                            onClick={() => onEdit(cat)}
                            title="Sửa danh mục"
                          >
                            <span>Sửa</span>
                          </button>
                          <button
                            type="button"
                            className="btn-row-action btn-delete"
                            onClick={() => onDelete(cat)}
                            title="Xóa danh mục"
                          >
                            <span>Xoá</span>
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
