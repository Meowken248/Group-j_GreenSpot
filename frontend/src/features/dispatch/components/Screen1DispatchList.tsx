import React, { useState, useMemo } from "react";
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
  onAcceptOrder?: (orderId: string) => Promise<void>;
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
  onAcceptOrder,
}) => {

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.order_code.toLowerCase().includes(q) ||
        o.incident_title.toLowerCase().includes(q) ||
        o.team_name.toLowerCase().includes(q) ||
        o.location_address.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters({
      status: statusFilter,
      team_id: teamFilter,
    });
  };

  const selectedOrder = orders.find((o) => o.order_id === selectedOrderId);

  const handleEditClick = () => {
    if (!selectedOrder) {
      onShowWarningToast("Vui lòng chọn một lệnh xử lý từ danh sách trước khi thực hiện thao tác.");
      return;
    }
    onNavigateToEdit(selectedOrder);
  };

  const handleCancelClick = () => {
    if (!selectedOrder) {
      onShowWarningToast("Vui lòng chọn một lệnh xử lý từ danh sách trước khi thực hiện thao tác.");
      return;
    }
    onOpenCancelModal(selectedOrder);
  };

  const handleTrackingClick = () => {
    if (!selectedOrder) {
      onShowWarningToast("Vui lòng chọn một lệnh xử lý từ danh sách để theo dõi hiện trường.");
      return;
    }
    onOpenTracking(selectedOrder);
  };

  // Stats
  const urgentCount = orders.filter((o) => o.priority === "URGENT").length;
  const inProgressCount = orders.filter((o) => o.status === "IN_PROGRESS" || o.status === "EN_ROUTE").length;
  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;

  return (
    <div className="dispatch-workspace dispatch-workspace-list">
      {/* =========================================================================
          CỘT TRÁI: KHỐI "BỘ LỌC"
         ========================================================================= */}
      <div className="dispatch-column-card">
        <div className="column-title">
          <span className="col-icon">🔍</span>
          <span className="col-heading">BỘ LỌC</span>
        </div>

        <form onSubmit={handleFilterSubmit} className="filter-form-group">
          {/* 1. Trạng thái lệnh */}
          <div className="form-group">
            <label htmlFor="filter-status" className="form-label-styled">
              Trạng thái lệnh
            </label>
            <select
              id="filter-status"
              className="form-select-styled"
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
          <div className="form-group">
            <label htmlFor="filter-team" className="form-label-styled">
              Đội phụ trách
            </label>
            <select
              id="filter-team"
              className="form-select-styled"
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

          {/* 3. Nút Áp dụng (Oval pill) */}
          <button type="submit" className="btn-apply-filter btn-pill-lg">
            Áp dụng
          </button>

          {/* Nút Đặt lại */}
          {(statusFilter !== "ALL" || teamFilter !== "ALL") && (
            <button
              type="button"
              className="btn-reset-filter btn-pill-secondary"
              onClick={() => {
                setStatusFilter("ALL");
                setTeamFilter("ALL");
                onResetFilters();
              }}
            >
              Đặt lại bộ lọc
            </button>
          )}

          {/* Quick filter guide */}
          <div className="filter-quick-tips mt-auto pt-3">
            <div className="tip-title">⚡ Hướng dẫn nhanh</div>
            <div className="tip-body">
              • Bấm 1 lần vào hàng để chọn lệnh.
              <br />
              • Nhấp đúp vào hàng để xem <strong>Theo dõi hiện trường</strong>.
            </div>
          </div>
        </form>
      </div>

      {/* =========================================================================
          CỘT GIỮA: KHỐI "LỆNH XỬ LÝ"
         ========================================================================= */}
      <div className="dispatch-column-card flex-grow-1">
        <div className="column-title">
          <span className="col-icon">📋</span>
          <span className="col-heading">LỆNH XỬ LÝ</span>
          <span className="badge-count-pill ms-auto">
            Tổng số: {filteredOrders.length} lệnh
          </span>
        </div>

        {/* Quick Search inside Table */}
        <div className="table-search-bar mb-2">
          <span className="search-icon">🔎</span>
          <input
            type="text"
            className="search-input"
            placeholder="Tìm nhanh theo mã lệnh, tên sự cố, địa chỉ, đội phụ trách..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="orders-table-container">
          {filteredOrders.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon">📁</div>
              <p className="fw-semibold text-secondary">
                Không tìm thấy lệnh xử lý nào phù hợp với bộ lọc đã chọn.
              </p>
              <button
                type="button"
                className="btn-reset-filter btn-pill-secondary"
                onClick={() => {
                  setStatusFilter("ALL");
                  setTeamFilter("ALL");
                  setSearchQuery("");
                  onResetFilters();
                }}
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="table-scroll-area">
              <table
                className="dispatch-data-table"
                aria-label="Bảng danh sách lệnh xử lý hiện trường"
              >
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Mã</th>
                    <th>Sự cố</th>
                    <th style={{ width: 180 }}>Đội</th>
                    <th style={{ width: 110 }}>Mức độ</th>
                    <th style={{ width: 120 }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const isSelected = order.order_id === selectedOrderId;
                    const isNew = order.order_code === newlyCreatedOrderCode;

                    return (
                      <tr
                        key={order.order_id}
                        data-testid={`order-row-${order.order_id}`}
                        className={`${isSelected ? "selected-row" : ""} ${isNew ? "highlight-new" : ""}`}
                        onClick={() => onSelectOrder(order)}
                        onDoubleClick={() => onOpenTracking(order)}
                        title="Bấm để chọn; Nhấp đúp để xem chi tiết theo dõi hiện trường"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSelectOrder(order);
                        }}
                      >
                        {/* Mã */}
                        <td>
                          <span className="order-code-text">{order.order_code}</span>
                        </td>

                        {/* Sự cố */}
                        <td>
                          <div className="incident-title-cell">{order.incident_title}</div>
                          <div className="incident-loc-sub">📍 {order.location_address}</div>
                        </td>

                        {/* Đội */}
                        <td>
                          <div className="team-name-cell">{order.team_name}</div>
                          <div className="team-phone-sub">📞 {order.team_phone}</div>
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
                            <span className="status-dot"></span>
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

          {/* Thanh công cụ thao tác hàng lệnh (Oval pill buttons) */}
          <div className="table-actions-toolbar">
            {selectedOrder?.status === "ASSIGNED" && onAcceptOrder && (
              <button
                type="button"
                className="btn-create-order-primary btn-pill-action"
                style={{ background: "#16a34a", borderColor: "#15803d" }}
                onClick={() => onAcceptOrder(selectedOrder.order_id)}
                title="Đội xử lý xác nhận tiếp nhận lệnh điều phối"
              >
                <span>✅</span>
                <span>Tiếp nhận</span>
              </button>
            )}

            <button
              type="button"
              className="btn-edit-order btn-pill-action"
              onClick={handleEditClick}
              title="Sửa thông tin phân công của lệnh đã chọn"
            >
              <span>✏️</span>
              <span>Sửa</span>
            </button>

            <button
              type="button"
              className="btn-cancel-order btn-pill-action"
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
          <span className="col-icon">⚡</span>
          <span className="col-heading">THAO TÁC</span>
        </div>

        <div className="primary-action-wrap d-flex flex-column h-100">
          {/* Nút Tạo lệnh mới (Prominent primary button) */}
          <button
            type="button"
            className="btn-create-order-primary btn-pill-lg"
            onClick={onNavigateToCreate}
            title="Khởi tạo và điều động lệnh mới cho sự cố khẩn cấp"
          >
            <span className="btn-icon">➕</span>
            <span>Tạo lệnh mới</span>
          </button>

          {/* Action button: Xác nhận tiếp nhận lệnh nếu trạng thái là ASSIGNED */}
          {selectedOrder && selectedOrder.status === "ASSIGNED" && onAcceptOrder && (
            <button
              type="button"
              className="btn-create-order-primary btn-pill-lg mt-2 w-100"
              style={{ background: "#16a34a", borderColor: "#15803d", justifyContent: "center" }}
              onClick={() => onAcceptOrder(selectedOrder.order_id)}
              title="Đội hiện trường xác nhận tiếp nhận và xuất phát"
            >
              <span>✅</span>
              <span>Tiếp nhận lệnh</span>
            </button>
          )}

          {/* Action button: Theo dõi hiện trường nếu đã chọn lệnh */}
          {selectedOrder && (
            <button
              type="button"
              className="btn-edit-order btn-pill-action mt-2 w-100"
              onClick={handleTrackingClick}
              style={{ justifyContent: "center" }}
              title="Xem giám sát hiện trường, bản đồ vệ tinh và ảnh nghiệm thu"
            >
              <span>🗺️</span>
              <span>Theo dõi hiện trường</span>
            </button>
          )}


          {/* Thống kê tác nghiệp nhanh (KPI mini cards) */}
          <div className="command-kpi-panel mt-auto pt-3">
            <div className="kpi-panel-title">Tình hình tác nghiệp</div>
            <div className="kpi-grid">
              <div className="kpi-mini-card kpi-total">
                <div className="kpi-num">{orders.length}</div>
                <div className="kpi-lbl">Tổng lệnh</div>
              </div>

              <div className="kpi-mini-card kpi-progress">
                <div className="kpi-num">{inProgressCount}</div>
                <div className="kpi-lbl">Đang làm</div>
              </div>

              <div className="kpi-mini-card kpi-urgent">
                <div className="kpi-num">{urgentCount}</div>
                <div className="kpi-lbl">Khẩn cấp</div>
              </div>

              <div className="kpi-mini-card kpi-completed">
                <div className="kpi-num">{completedCount}</div>
                <div className="kpi-lbl">Hoàn tất</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
