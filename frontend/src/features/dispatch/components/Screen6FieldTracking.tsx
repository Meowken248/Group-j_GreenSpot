import React, { useState } from "react";
import type {
  FieldTrackingResponse,
  CloseDispatchOrderRequest,
} from "../types/dispatch.types";
import { DispatchMap } from "./DispatchMap";
import { navigateToRoute } from "../../../routes/appRoutes";

interface Screen6FieldTrackingProps {
  trackingData: FieldTrackingResponse;
  isLoading: boolean;
  onBackToList: () => void;
  onCloseOrder: (payload: CloseDispatchOrderRequest) => Promise<void>;
  onShowWarningToast: (msg: string) => void;
  onShowSuccessToast: (msg: string) => void;
  onRefreshGps?: () => void;
  onUpdateTeamLocation?: (lat: number, lng: number) => Promise<void>;
  onAcceptOrder?: () => Promise<void>;
  onArriveOrder?: () => Promise<void>;
}

export const Screen6FieldTracking: React.FC<Screen6FieldTrackingProps> = ({
  trackingData,
  isLoading,
  onBackToList,
  onCloseOrder,
  onShowWarningToast,
  onShowSuccessToast,
  onRefreshGps,
  onUpdateTeamLocation,
  onAcceptOrder,
  onArriveOrder,
}) => {


  const [showCallModal, setShowCallModal] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);
  const [closeNotes, setCloseNotes] = useState<string>("");

  const {
    order_code,
    status,
    status_label,
    incident_title,
    incident_address,
    incident_lat,
    incident_lng,
    team_name,
    team_phone,
    stepper,
    before_image_url,
    after_image_url,
    can_close_order,
    missing_after_image_warning,
    version,
  } = trackingData;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(team_phone);
    setCopiedPhone(true);
    onShowSuccessToast(`Đã sao chép SĐT đội trưởng: ${team_phone}`);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  const handleCloseOrderClick = async () => {
    if (!can_close_order) {
      const reason =
        missing_after_image_warning ||
        (status !== "COMPLETED"
          ? "Lệnh chưa hoàn tất xử lý hiện trường, không thể đóng nghiệm thu."
          : "Chưa có ảnh nghiệm thu sau xử lý, không thể đóng lệnh.");
      onShowWarningToast(reason);
      return;
    }

    await onCloseOrder({
      version,
      notes: closeNotes.trim() || undefined,
    });
  };

  return (
    <div
      data-testid="screen-field-tracking"
      className="dispatch-workspace dispatch-workspace-form"
      style={{ gridTemplateColumns: "minmax(380px, 1.2fr) minmax(340px, 1fr) minmax(240px, 260px)" }}
    >
      {/* =========================================================================
          CỘT TRÁI: KHỐI "BẢN ĐỒ"
         ========================================================================= */}
      <div className="dispatch-column-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="column-title" style={{ padding: "14px 18px", marginBottom: 0, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <span>🗺️</span>
          <span>BẢN ĐỒ</span>
          <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 500, marginLeft: 12 }}>
            Giám sát hiện trường: {order_code}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.75rem",
              fontWeight: 400,
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                background: "#10b981",
                borderRadius: "50%",
                display: "inline-block",
              }}
            />
            Đang trực tuyến
          </span>
        </div>

        {/* Vị trí đội + vị trí sự cố info strip */}
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "10px 18px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            background: "#f8fafc",
            fontSize: "0.78rem",
          }}
        >
          <div>
            <span style={{ color: "#3b82f6", fontWeight: 700 }}>📍 Vị trí đội:</span>{" "}
            <span style={{ color: "#475569" }}>{team_name}</span>
          </div>
          <div>
            <span style={{ color: "#ef4444", fontWeight: 700 }}>🚩 Vị trí sự cố:</span>{" "}
            <span style={{ color: "#475569" }}>{incident_address}</span>
          </div>
        </div>

        <DispatchMap
          trackingData={trackingData}
          onRefreshGps={onRefreshGps}
          onUpdateTeamLocation={onUpdateTeamLocation}
        />


        {/* Tên sự cố dưới bản đồ */}
        <div
          style={{
            padding: "8px 18px",
            fontSize: "0.8rem",
            color: "#64748b",
            borderTop: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          🔍 <strong>{order_code}</strong> · {incident_title}
        </div>
      </div>

      {/* =========================================================================
          CỘT GIỮA: KHỐI "TIẾN ĐỘ"
         ========================================================================= */}
      <div className="dispatch-column-card">
        <div className="column-title">
          <span>📊</span>
          <span>TIẾN ĐỘ</span>
        </div>

        {/* Stepper 4 bước: Đã giao → Đang đến → Đang xử lý → Hoàn tất */}
        <div className="stepper-vertical" data-testid="tracking-stepper" style={{ marginBottom: 20 }}>
          {stepper.map((step, idx) => {
            let badgeClass = "stepper-dot-pending";
            if (step.is_current) badgeClass = "stepper-dot-current";
            else if (step.is_passed) badgeClass = "stepper-dot-passed";

            return (
              <div
                key={step.key}
                className={`stepper-item ${step.is_current ? "active" : ""} ${step.is_passed ? "completed" : ""}`}
              >
                <div className="stepper-rail">
                  <div className={`stepper-dot ${badgeClass}`}>
                    {step.is_passed ? (
                      <i className="bi bi-check-lg" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  {idx < stepper.length - 1 && <div className="stepper-line" />}
                </div>
                <div className="stepper-content pb-3 ps-2">
                  <div className="fw-semibold text-dark">{step.label}</div>
                  <div className="text-muted small">
                    {step.timestamp ? (
                      <span>
                        <i className="bi bi-clock me-1" />
                        {step.timestamp}
                      </span>
                    ) : (
                      <span className="fst-italic text-secondary">Chờ thực hiện</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ảnh hiện trường */}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 14 }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 10 }}>
            📷 Ảnh hiện trường
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Ảnh trước */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                overflow: "hidden",
                background: "#f1f5f9",
              }}
            >
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#64748b",
                  fontWeight: 700,
                  textAlign: "center",
                  padding: "4px 0",
                  background: "#e2e8f0",
                }}
              >
                Ảnh trước xử lý
              </div>
              <div style={{ aspectRatio: "4/3", position: "relative" }}>
                {before_image_url ? (
                  <img
                    src={before_image_url}
                    alt="Hiện trường ban đầu"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: "0.75rem",
                    }}
                  >
                    Không có ảnh
                  </div>
                )}
              </div>
            </div>

            {/* Ảnh sau */}
            <div
              style={{
                border: `1px solid ${after_image_url ? "#86efac" : "#e2e8f0"}`,
                borderRadius: 8,
                overflow: "hidden",
                background: "#f1f5f9",
              }}
            >
              <div
                style={{
                  fontSize: "0.72rem",
                  color: after_image_url ? "#15803d" : "#64748b",
                  fontWeight: 700,
                  textAlign: "center",
                  padding: "4px 0",
                  background: after_image_url ? "#bbf7d0" : "#e2e8f0",
                }}
              >
                Ảnh sau xử lý
              </div>
              <div style={{ aspectRatio: "4/3", position: "relative" }}>
                {after_image_url ? (
                  <img
                    src={after_image_url}
                    alt="Sau khi hoàn tất"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: "0.72rem",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>☁️</span>
                    Chờ đội tải ảnh nghiệm thu
                  </div>
                )}
              </div>
            </div>
          </div>

          {missing_after_image_warning && (
            <div
              style={{
                background: "#fef9c3",
                border: "1px solid #fde047",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: "0.78rem",
                color: "#92400e",
                marginTop: 8,
              }}
            >
              ⚠️ {missing_after_image_warning}
            </div>
          )}

          {/* Ghi chú đóng lệnh */}
          {can_close_order && (
            <div style={{ marginTop: 12 }}>
              <label
                htmlFor="close-notes-input"
                style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}
              >
                Ghi chú nghiệm thu (tuỳ chọn)
              </label>
              <input
                type="text"
                id="close-notes-input"
                className="form-select"
                style={{ width: "100%", fontSize: "0.82rem", padding: "6px 10px" }}
                placeholder="Xác nhận mặt đường sạch sẽ..."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          CỘT PHẢI: KHỐI "HÀNH ĐỘNG"
         ========================================================================= */}
      <div className="dispatch-column-card">
        <div className="column-title">
          <span>⚡</span>
          <span>HÀNH ĐỘNG</span>
        </div>

        <div className="primary-action-wrap">
          {/* Nút Tiếp nhận lệnh nếu trạng thái đang là ASSIGNED */}
          {status === "ASSIGNED" && onAcceptOrder && (
            <button
              type="button"
              className="btn-create-order-primary btn-pill-lg mb-2"
              onClick={onAcceptOrder}
              disabled={isLoading}
              style={{ background: "#16a34a", borderColor: "#15803d" }}
              data-testid="btn-accept-order"
            >
              <span>✅</span>
              <span>Xác nhận tiếp nhận lệnh</span>
            </button>
          )}

          {/* Nút Đã đến hiện trường nếu trạng thái đang là EN_ROUTE */}
          {status === "EN_ROUTE" && onArriveOrder && (
            <button
              type="button"
              className="btn-create-order-primary btn-pill-lg mb-2"
              onClick={onArriveOrder}
              disabled={isLoading}
              style={{ background: "#2563eb", borderColor: "#1d4ed8" }}
              data-testid="btn-arrive-order"
            >
              <span>📍</span>
              <span>Xác nhận đã đến hiện trường</span>
            </button>
          )}

          {/* Nút Xem lộ trình né ngập đến sự cố (STT 41) */}
          <button
            type="button"
            className="btn-edit-order btn-pill-lg mb-2"
            onClick={() => {
              try {
                const navData = {
                  destLat: incident_lat,
                  destLng: incident_lng,
                  destName: incident_title,
                  destAddress: incident_address,
                };
                localStorage.setItem("greenspot_nav_destination", JSON.stringify(navData));
                navigateToRoute("navigation");
              } catch {
                navigateToRoute("navigation");
              }
            }}
            data-testid="btn-nav-flood-safe"
            style={{ background: "#0284c7", color: "#ffffff", borderColor: "#0369a1" }}
            title="Mở Bản đồ né ngập (STT 41) dẫn đường an toàn cho đội cơ động đến hiện trường"
          >
            <span>🌊</span>
            <span>Chỉ dẫn né ngập đến sự cố</span>
          </button>

          {/* Nút Gọi đội (Pill shape) */}
          <button
            type="button"
            className="btn-edit-order btn-pill-lg mb-2"
            onClick={() => setShowCallModal(true)}
            data-testid="btn-call-team"
          >
            <span>📞</span>
            <span>Gọi đội</span>
          </button>


          {/* Nút Đóng lệnh (Pill shape) */}
          <button
            type="button"
            className={`${can_close_order ? "btn-create-order-primary" : "btn-cancel-order"} btn-pill-lg`}
            onClick={handleCloseOrderClick}
            disabled={isLoading}
            data-testid="btn-close-order"
            style={{ opacity: can_close_order ? 1 : 0.7 }}
          >
            {isLoading ? (
              <>
                <span className="btn-spinner" />
                Đang nghiệm thu...
              </>
            ) : (
              <>
                <span>✅</span>
                <span>Đóng lệnh</span>
              </>
            )}
          </button>

          {/* Nút quay về danh sách */}
          <button
            type="button"
            className="btn-reset-filter btn-pill-secondary mt-3"
            onClick={onBackToList}
          >
            ← Về danh sách
          </button>
        </div>

        {/* Thông tin liên lạc nhỏ */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 16,
            borderTop: "1px solid rgba(0,0,0,0.06)",
            fontSize: "0.78rem",
            color: "#64748b",
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <strong>Đội phụ trách:</strong>
          </div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{team_name}</div>
          <div style={{ color: "#3b82f6" }}>📞 {team_phone}</div>
          <div
            style={{
              marginTop: 8,
              padding: "4px 8px",
              background: `rgba(${status === "COMPLETED" ? "16,185,129" : "59,130,246"},0.1)`,
              borderRadius: 4,
              fontWeight: 700,
              color: status === "COMPLETED" ? "#059669" : "#1d4ed8",
            }}
          >
            {status_label}
          </div>
        </div>
      </div>

      {/* Popup Gọi đội */}
      {showCallModal && (
        <div
          className="modal-backdrop-custom d-flex align-items-center justify-content-center"
          data-testid="modal-call-team"
        >
          <div className="modal-dialog-custom bg-white rounded-3 shadow p-4 text-center">
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#dbeafe",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto 12px",
              }}
            >
              📞
            </div>
            <h4 style={{ fontWeight: 800, marginBottom: 4 }}>Liên hệ Đội cơ động</h4>
            <div style={{ color: "#64748b", marginBottom: 12, fontSize: "0.9rem" }}>
              {team_name}
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "10px 16px",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>
                Số điện thoại liên lạc:
              </div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "#1d4ed8",
                  fontFamily: "monospace",
                }}
              >
                {team_phone}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <a
                href={`tel:${team_phone}`}
                className="btn-create-order-primary"
                style={{ textDecoration: "none", padding: "8px 20px" }}
              >
                Gọi ngay
              </a>
              <button
                type="button"
                className="btn-edit-order"
                onClick={handleCopyPhone}
                style={{ padding: "8px 14px" }}
              >
                {copiedPhone ? "✅ Đã chép" : "📋 Sao chép số"}
              </button>
              <button
                type="button"
                className="btn-reset-filter"
                onClick={() => setShowCallModal(false)}
                style={{ padding: "8px 14px" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
