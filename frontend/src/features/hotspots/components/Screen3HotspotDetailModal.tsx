import React from "react";
import type { HotspotDetailResponse, SuggestedDispatchOrder } from "../types/hotspot.types";

interface Screen3HotspotDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: HotspotDetailResponse | null;
  isLoading: boolean;
  onCreateDispatch: (prefillData: SuggestedDispatchOrder) => void;
  onViewActiveOrder: (orderId: string) => void;
}

export const Screen3HotspotDetailModal: React.FC<Screen3HotspotDetailModalProps> = ({
  isOpen,
  onClose,
  detail,
  isLoading,
  onCreateDispatch,
  onViewActiveOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="hotspot-modal-backdrop"
      onClick={onClose}
      data-testid="hotspot-modal-backdrop"
    >
      <div
        className="hotspot-modal-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="hotspot-detail-title"
        data-testid="hotspot-detail-modal"
      >
        <div className="modal-head">
          <div>
            <h2 id="hotspot-detail-title" className="modal-title">
              CHI TIẾT ĐIỂM NÓNG
            </h2>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", fontWeight: 500 }}>
              Số sự cố | Xu hướng | Dự báo 48h
            </div>
          </div>
          <button
            type="button"
            className="modal-close-icon"
            onClick={onClose}
            aria-label="Đóng popup"
            data-testid="btn-close-modal-icon"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {isLoading || !detail ? (
            <div className="skeleton-box" style={{ width: "100%", height: "200px" }} />
          ) : (
            <>
              <div className="modal-info-panel">
                <div className="info-row">
                  <span className="info-label">Tên điểm nóng</span>
                  <span className="info-value" data-testid="detail-title">
                    {detail.title}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Mã cụm</span>
                  <span className="info-value" data-testid="detail-code">
                    {detail.cluster_code}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Loại sự cố</span>
                  <span className="info-value" data-testid="detail-incident-type">
                    {detail.incident_type_label}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Số sự cố tích luỹ</span>
                  <span className="info-value" data-testid="detail-incident-count">
                    {detail.incident_count} sự cố
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Mức độ nghiêm trọng</span>
                  <span className="info-value" data-testid="detail-risk-level">
                    {detail.risk_level_label}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Xu hướng biến động</span>
                  <span className="info-value" data-testid="detail-trend">
                    {detail.trend}
                  </span>
                </div>

                <div className="info-row" style={{ gridColumn: "span 2" }}>
                  <span className="info-label">Dự báo 48 giờ tới</span>
                  <span className="info-value" data-testid="detail-forecast-48h">
                    {detail.forecast_48h}
                  </span>
                </div>
              </div>

              {/* Thông báo nếu đã có lệnh xử lý đang hoạt động */}
              {detail.has_active_order && (
                <div className="active-order-notice" data-testid="active-order-notice">
                  <span>🚨</span>
                  <span>
                    Điểm nóng này hiện đã có lệnh xử lý đang thực thi (
                    <strong>{detail.active_dispatch_order_id}</strong>). Bạn có muốn xem tiến độ?
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            data-testid="btn-close-modal"
          >
            Đóng
          </button>

          {detail?.has_active_order && detail.active_dispatch_order_id && (
            <button
              type="button"
              className="btn-view-active-order"
              onClick={() => onViewActiveOrder(detail.active_dispatch_order_id!)}
              data-testid="btn-view-active-order"
            >
              <span>📍</span>
              <span>Xem lệnh hiện tại</span>
            </button>
          )}

          <button
            type="button"
            className="btn-create-dispatch"
            onClick={() => {
              if (detail?.suggested_dispatch) {
                onCreateDispatch(detail.suggested_dispatch);
              }
            }}
            disabled={!detail}
            data-testid="btn-create-dispatch"
          >
            <span>➕</span>
            <span>Tạo lệnh xử lý</span>
          </button>
        </div>
      </div>
    </div>
  );
};
