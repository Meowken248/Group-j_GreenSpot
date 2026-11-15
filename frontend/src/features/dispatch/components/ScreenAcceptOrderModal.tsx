import React from "react";
import type { DispatchOrderItem } from "../types/dispatch.types";

interface ScreenAcceptOrderModalProps {
  order: DispatchOrderItem | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirmAccept: (orderId: string) => Promise<void>;
}

export const ScreenAcceptOrderModal: React.FC<ScreenAcceptOrderModalProps> = ({
  order,
  isOpen,
  isLoading,
  onClose,
  onConfirmAccept,
}) => {
  if (!isOpen || !order) return null;

  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center"
      data-testid="modal-accept-order"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        zIndex: 1060,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="modal-dialog-custom bg-white rounded-3 shadow-2xl p-4 border border-success-subtle"
        style={{ maxWidth: 540, width: "92%", animation: "slideDown 0.25s ease" }}
      >
        {/* Header Thông báo */}
        <div className="d-flex align-items-center mb-3">
          <div
            className="rounded-circle bg-warning-subtle text-warning p-2 me-3 d-flex align-items-center justify-content-center"
            style={{ width: 48, height: 48, flexShrink: 0 }}
          >
            <span style={{ fontSize: "1.5rem" }}>🔔</span>
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="modal-title-custom fw-bold text-dark mb-0">TIẾP NHẬN LỆNH ĐIỀU ĐỘNG</h5>
              <span className="badge bg-danger text-white" style={{ fontSize: "0.72rem" }}>
                {order.priority_label || "Khẩn cấp"}
              </span>
            </div>
            <span className="text-muted small">Mã lệnh tác nghiệp: <strong>{order.order_code}</strong></span>
          </div>
        </div>

        {/* Thông báo nghiệp vụ */}
        <div
          className="alert alert-info py-2 px-3 small mb-3 border-0"
          style={{ background: "#eff6ff", color: "#1e40af", borderRadius: 8 }}
        >
          <i className="bi bi-info-circle me-1 fw-bold"></i>
          Bạn đang đăng nhập bằng tài khoản <strong>{order.team_name}</strong>. Cán bộ điều phối đã điều động đội của bạn đến xử lý sự cố này.
        </div>

        {/* Thông tin sự cố chi tiết */}
        <div
          className="p-3 mb-3 rounded border"
          style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
        >
          <div className="mb-2">
            <span className="text-secondary small d-block">Sự cố môi trường:</span>
            <strong className="text-dark" style={{ fontSize: "0.95rem" }}>
              {order.incident_title}
            </strong>
          </div>

          <div className="mb-2">
            <span className="text-secondary small d-block">Địa điểm hiện trường:</span>
            <span className="text-danger fw-semibold" style={{ fontSize: "0.9rem" }}>
              📍 {order.location_address}
            </span>
          </div>

          <div className="row g-2 pt-2 border-top">
            <div className="col-6">
              <span className="text-secondary small d-block">Đội phản ứng:</span>
              <span className="fw-medium text-dark">{order.team_name}</span>
            </div>
            <div className="col-6">
              <span className="text-secondary small d-block">Hạn chót hoàn tất:</span>
              <span className="fw-medium text-dark">
                {order.deadline ? new Date(order.deadline).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Trong ngày"}
              </span>
            </div>
          </div>
        </div>

        <p className="text-muted small mb-4">
          👉 <em>Sau khi bấm <strong>Xác nhận tiếp nhận</strong>, trạng thái lệnh sẽ chuyển sang <strong>Đang đến (EN_ROUTE)</strong>, hệ thống tự động kích hoạt định vị GPS thời gian thực và dẫn đường theo mặt đường phố thực tế.</em>
        </p>

        {/* Nút hành động */}
        <div className="d-flex flex-column gap-2">
          <button
            type="button"
            className="btn btn-success fw-bold py-2 shadow-sm"
            style={{
              fontSize: "0.95rem",
              borderRadius: "9999px",
              background: "#16a34a",
              borderColor: "#15803d",
            }}
            disabled={isLoading}
            onClick={() => onConfirmAccept(order.order_id)}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Đang xử lý tiếp nhận...
              </>
            ) : (
              <>
                <span className="me-1">✅</span>
                Xác nhận tiếp nhận lệnh & Xuất phát ngay
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary py-2"
            style={{ borderRadius: "9999px", fontSize: "0.9rem" }}
            disabled={isLoading}
            onClick={onClose}
          >
            Để sau (Xem lại sau)
          </button>
        </div>
      </div>
    </div>
  );
};
