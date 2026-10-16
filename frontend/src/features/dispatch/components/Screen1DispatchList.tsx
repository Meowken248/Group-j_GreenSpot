import React, { useState } from "react";
import type {
  DispatchOrderItem,
  DispatchListFilter,
  TeamOptionItem,
} from "../types/dispatch.types";

interface Screen1DispatchListProps {
  orders: DispatchOrderItem[];
  teams: TeamOptionItem[];
  selectedOrderId: string | null;
  onSelectOrder: (order: DispatchOrderItem) => void;
  onApplyFilters: (filters: DispatchListFilter) => void;
  onResetFilters: () => void;
  onNavigateToCreate: () => void;
  onNavigateToEdit: (order: DispatchOrderItem) => void;
  onOpenCancelModal: (order: DispatchOrderItem) => void;
  onOpenTracking: (order: DispatchOrderItem) => void;
  onShowWarningToast: (msg: string) => void;
  newlyCreatedOrderCode?: string | null;
}

export const Screen1DispatchList: React.FC<Screen1DispatchListProps> = ({
  orders,
  teams,
  selectedOrderId,
  onSelectOrder,
  onApplyFilters,
  onResetFilters,
  onNavigateToCreate,
  onNavigateToEdit,
  onOpenCancelModal,
  onOpenTracking,
  onShowWarningToast,
  newlyCreatedOrderCode,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("ALL");

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters({
      status: statusFilter,
      team_id: teamFilter,
    });
  };

  const handleEditClick = () => {
    const selected = orders.find((o) => o.order_id === selectedOrderId);
    if (!selected) {
      onShowWarningToast("Vui lòng chọn một lệnh xử lý từ danh sách trước khi thực hiện thao tác.");
      return;
    }
    onNavigateToEdit(selected);
  };

  const handleCancelClick = () => {
    const selected = orders.find((o) => o.order_id === selectedOrderId);
    if (!selected) {
      onShowWarningToast("Vui lòng chọn một lệnh xử lý từ danh sách trước khi thực hiện thao tác.");
      return;
    }
    onOpenCancelModal(selected);
  };

  return (
    <div className="dispatch-workspace">
      {/* =========================================================================
          CỘT TRÁI: KHỐI "BỘ LỌC"
         ========================================================================= */}
      <div className="dispatch-column-card">
        <div className="column-title">
          <span>🔍</span>
          <span>BỘ LỌC</span>
        </div>

        <form onSubmit={handleFilterSubmit} className="filter-form-group">
          {/* 1. Trạng thái lệnh */}
          <div>
            <label htmlFor="filter-status">Trạng thái lệnh</label>
            <select
              id="filter-status"
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ASSIGNED">Đã giao</option>
              <option value="EN_ROUTE">Đang đến</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="COMPLETED">Hoàn tất</option>
              <option value="CANCELLED">Đã huỷ</option>
            </select>
          </div>

          {/* 2. Đội cơ động phụ trách */}
          <div>
            <label htmlFor="filter-team">Đội phụ trách</label>
            <select
              id="filter-team"
              className="form-select"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="ALL">Tất cả các đội</option>
              {teams.map((t) => (
                <option key={t.team_id} value={t.team_id}>
                  {t.team_name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Nút Áp dụng */}
          <button type="submit" className="btn-apply-filter">
            Áp dụng
          </button>

          {/* Nút Đặt lại */}
          {(statusFilter !== "ALL" || teamFilter !== "ALL") && (
            <button
              type="button"
              className="btn-reset-filter"
              onClick={() => {
                setStatusFilter("ALL");
                setTeamFilter("ALL");
                onResetFilters();
              }}
            >
              Đặt lại bộ lọc
            </button>
          )}
        </form>
      </div>

      {/* =========================================================================
          CỘT GIỮA: KHỐI "LỆNH XỬ LÝ"
         ========================================================================= */}
      <div className="dispatch-column-card" style={{ flex: 1 }}>
        <div className="column-title">
          <span>📋</span>
          <span>LỆNH XỬ LÝ</span>
          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 400, marginLeft: "auto" }}>
            (Tổng số: {orders.length} lệnh)
          </span>
        </div>

        <div className="orders-table-container">
          {orders.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon">📁</div>
              <p>Không tìm thấy lệnh xử lý nào phù hợp với bộ lọc đã chọn.</p>
              <button
                type="button"
                className="btn-reset-filter"
                onClick={() => {
                  setStatusFilter("ALL");
                  setTeamFilter("ALL");
                  onResetFilters();
                }}
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="table-scroll-area">
              <table className="dispatch-data-table" aria-label="Bảng danh sách lệnh xử lý hiện trường">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Sự cố</th>
                    <th>Đội</th>
                    <th>Mức độ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const isSelected = order.order_id === selectedOrderId;
                    const isNew = order.order_code === newlyCreatedOrderCode;

                    return (
                      <tr
                        key={order.order_id}
                        className={`${isSelected ? "selected-row" : ""} ${isNew ? "highlight-new" : ""}`}
                        onClick={() => onSelectOrder(order)}
                        onDoubleClick={() => onOpenTracking(order)}
                        title="Bấm để chọn thao tác; Nhấp đúp để xem chi tiết theo dõi hiện trường"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSelectOrder(order);
                        }}
                      >
                        {/* Mã */}
                        <td style={{ fontWeight: 800, color: "#0284c7" }}>
                          {order.order_code}
                        </td>

                        {/* Sự cố */}
                        <td>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>
                            {order.incident_title}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            📍 {order.location_address}
                          </div>
                        </td>

                        {/* Đội */}
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.team_name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            📞 {order.team_phone}
                          </div>
                        </td>

                        {/* Mức độ */}
                        <td>
                          <span className={`priority-badge priority-${order.priority}`}>
                            {order.priority_label}
                          </span>
                        </td>

                        {/* Trạng thái */}
                        <td>
                          <span
                            className={`status-badge status-${order.status}`}
                            style={{ backgroundColor: order.status_color }}
                          >
                            {order.status_label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Thanh công cụ thao tác hàng lệnh */}
          <div className="table-actions-toolbar">
            <button
              type="button"
              className="btn-edit-order"
              onClick={handleEditClick}
              title="Sửa thông tin phân công của lệnh đã chọn"
            >
              <span>✏️</span>
              <span>Sửa</span>
            </button>

            <button
              type="button"
              className="btn-cancel-order"
              onClick={handleCancelClick}
              title="Huỷ bỏ lệnh xử lý hiện trường đã chọn"
            >
              <span>🛑</span>
              <span>Huỷ lệnh</span>
            </button>

            <span className="hint-double-click">
              💡 Nhấp đúp vào bất kỳ hàng lệnh nào để mở Theo dõi hiện trường
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CỘT PHẢI: KHỐI "THAO TÁC"
         ========================================================================= */}
      <div className="dispatch-column-card">
        <div className="column-title">
          <span>⚡</span>
          <span>THAO TÁC</span>
        </div>

        <div className="primary-action-wrap">
          <button
            type="button"
            className="btn-create-order-primary"
            onClick={onNavigateToCreate}
            title="Khởi tạo và điều động lệnh mới cho sự cố khẩn cấp"
          >
            <span>➕</span>
            <span>Tạo lệnh mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
