import React, { useState } from "react";
import type {
  FieldTrackingResponse,
  CloseDispatchOrderRequest,
} from "../types/dispatch.types";
import { DispatchMap } from "./DispatchMap";

interface Screen6FieldTrackingProps {
  trackingData: FieldTrackingResponse;
  isLoading: boolean;
  onBackToList: () => void;
  onCloseOrder: (payload: CloseDispatchOrderRequest) => Promise<void>;
  onShowWarningToast: (msg: string) => void;
  onShowSuccessToast: (msg: string) => void;
}

export const Screen6FieldTracking: React.FC<Screen6FieldTrackingProps> = ({
  trackingData,
  isLoading,
  onBackToList,
  onCloseOrder,
  onShowWarningToast,
  onShowSuccessToast,
}) => {
  const [showCallModal, setShowCallModal] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);
  const [closeNotes, setCloseNotes] = useState<string>("");

  const {
    order_code,
    status,
    status_label,
    priority,
    incident_title,
    incident_address,
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
    <div className="dispatch-screen-container" data-testid="screen-field-tracking">
      {/* Top Header */}
      <div className="dispatch-card-header mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm me-3"
              onClick={onBackToList}
              title="Quay lại danh sách lệnh"
            >
              <i className="bi bi-arrow-left me-1"></i>Quay lại danh sách
            </button>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h2 className="dispatch-section-title mb-0">
                  Giám sát hiện trường: {order_code}
                </h2>
                <span className="badge bg-danger text-uppercase">{priority}</span>
              </div>
              <p className="text-muted small mb-0">
                Theo dõi định vị GPS thời gian thực, tiến độ xử lý và hình ảnh nghiệm thu thực địa
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary px-3 py-2 fs-6">
              <i className="bi bi-activity me-1"></i>{status_label}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Map, Right = Progress & Evidence */}
      <div className="row g-4 mb-4">
        {/* KHỐI BẢN ĐỒ (Cột lớn bên trái) */}
        <div className="col-lg-8 col-md-12">
          <div className="dispatch-panel p-0 overflow-hidden">
            <div className="p-3 border-bottom bg-light d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="bi bi-compass-fill text-primary me-2"></i>
                <h3 className="dispatch-panel-title mb-0">Bản đồ định vị GPS & Tuyến đường</h3>
              </div>
              <span className="badge bg-success-subtle text-success border border-success">
                Đang trực tuyến
              </span>
            </div>

            <DispatchMap trackingData={trackingData} />
          </div>
        </div>

        {/* KHỐI TIẾN ĐỘ & ẢNH NGHIỆM THU (Cột bên phải) */}
        <div className="col-lg-4 col-md-12">
          <div className="dispatch-panel h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="dispatch-panel-header">
                <i className="bi bi-diagram-3-fill text-success me-2"></i>
                <h3 className="dispatch-panel-title">Tiến độ tác nghiệp 4 bước</h3>
              </div>

              {/* Stepper 4 bước */}
              <div className="stepper-vertical mb-4" data-testid="tracking-stepper">
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
                            <i className="bi bi-check-lg"></i>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        {idx < stepper.length - 1 && <div className="stepper-line"></div>}
                      </div>
                      <div className="stepper-content pb-3 ps-2">
                        <div className="fw-semibold text-dark">{step.label}</div>
                        <div className="text-muted small">
                          {step.timestamp ? (
                            <span>
                              <i className="bi bi-clock me-1"></i>
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

              {/* KHU VỰC ẢNH HIỆN TRƯỜNG */}
              <div className="evidence-photos-section border-top pt-3">
                <h5 className="fw-bold fs-6 mb-3">
                  <i className="bi bi-camera-fill text-primary me-2"></i>Ảnh kiểm chứng hiện trường
                </h5>

                <div className="row g-2">
                  {/* Ảnh trước xử lý */}
                  <div className="col-6">
                    <div className="photo-card border rounded p-2 text-center bg-light">
                      <div className="small fw-semibold text-muted mb-1">Ảnh trước xử lý</div>
                      <div className="photo-preview-wrapper ratio ratio-4x3 rounded overflow-hidden bg-dark-subtle">
                        {before_image_url ? (
                          <img
                            src={before_image_url}
                            alt="Hiện trường ban đầu"
                            className="img-fluid object-fit-cover"
                          />
                        ) : (
                          <div className="d-flex align-items-center justify-content-center text-muted small">
                            Không có ảnh
                          </div>
                        )}
                      </div>
                      <span className="badge bg-secondary-subtle text-dark border mt-1 small">
                        Ban đầu
                      </span>
                    </div>
                  </div>

                  {/* Ảnh sau xử lý */}
                  <div className="col-6">
                    <div className="photo-card border rounded p-2 text-center bg-light">
                      <div className="small fw-semibold text-muted mb-1">Ảnh sau xử lý</div>
                      <div className="photo-preview-wrapper ratio ratio-4x3 rounded overflow-hidden bg-dark-subtle">
                        {after_image_url ? (
                          <img
                            src={after_image_url}
                            alt="Sau khi hoàn tất"
                            className="img-fluid object-fit-cover"
                          />
                        ) : (
                          <div className="d-flex flex-column align-items-center justify-content-center p-2 text-muted small bg-body-tertiary">
                            <i className="bi bi-cloud-arrow-up fs-3 text-secondary mb-1"></i>
                            <span className="small text-center">Chờ đội tải ảnh nghiệm thu</span>
                          </div>
                        )}
                      </div>
                      <span
                        className={`badge ${after_image_url ? "bg-success" : "bg-warning text-dark"} mt-1 small`}
                      >
                        {after_image_url ? "Đã nghiệm thu" : "Chờ ảnh"}
                      </span>
                    </div>
                  </div>
                </div>

                {missing_after_image_warning && (
                  <div className="alert alert-warning small py-2 px-3 mt-3 mb-0">
                    <i className="bi bi-shield-exclamation me-1"></i>
                    {missing_after_image_warning}
                  </div>
                )}
              </div>
            </div>

            {/* Ghi chú khi đóng lệnh nếu có */}
            {can_close_order && (
              <div className="mt-3 pt-3 border-top">
                <label htmlFor="close-notes-input" className="form-label small fw-semibold text-muted">
                  Ghi chú nghiệm thu (tuỳ chọn):
                </label>
                <input
                  type="text"
                  id="close-notes-input"
                  className="form-control form-control-sm"
                  placeholder="Xác nhận mặt đường sạch sẽ, không còn rác thải..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KHỐI HÀNH ĐỘNG (Thanh công cụ dưới) */}
      <div className="dispatch-action-footer-bar p-3 bg-white rounded border shadow-sm d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <div className="small text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Điều phối viên: Đang liên lạc với <strong>{team_name}</strong>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Nút Gọi đội */}
          <button
            type="button"
            className="btn btn-outline-primary px-3 d-flex align-items-center"
            onClick={() => setShowCallModal(true)}
            data-testid="btn-call-team"
          >
            <i className="bi bi-telephone-fill me-2"></i>Gọi đội
          </button>

          {/* Nút Đóng lệnh */}
          <button
            type="button"
            className={`btn px-4 d-flex align-items-center fw-semibold ${
              can_close_order ? "btn-success" : "btn-secondary opacity-75"
            }`}
            onClick={handleCloseOrderClick}
            disabled={isLoading}
            data-testid="btn-close-order"
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Đang nghiệm thu...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle-fill me-2"></i>Đóng lệnh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Popup Gọi đội */}
      {showCallModal && (
        <div
          className="modal-backdrop-custom d-flex align-items-center justify-content-center"
          data-testid="modal-call-team"
        >
          <div className="modal-dialog-custom bg-white rounded-3 shadow p-4 text-center">
            <div className="rounded-circle bg-primary-subtle text-primary p-3 mx-auto mb-3 d-inline-flex">
              <i className="bi bi-telephone-outbound-fill display-5"></i>
            </div>
            <h4 className="fw-bold mb-1">Liên hệ Đội cơ động</h4>
            <div className="text-muted mb-3">{team_name}</div>

            <div className="p-3 bg-light rounded border mb-3">
              <div className="small text-muted mb-1">Số điện thoại liên lạc trực tiếp:</div>
              <div className="fs-3 fw-bold text-primary font-monospace">{team_phone}</div>
            </div>

            <div className="d-flex justify-content-center gap-2">
              <a
                href={`tel:${team_phone}`}
                className="btn btn-primary px-4 d-flex align-items-center"
              >
                <i className="bi bi-telephone-fill me-2"></i>Gọi ngay
              </a>
              <button
                type="button"
                className="btn btn-outline-secondary px-3"
                onClick={handleCopyPhone}
              >
                <i className={`bi ${copiedPhone ? "bi-check-lg text-success" : "bi-copy"} me-1`}></i>
                {copiedPhone ? "Đã chép" : "Sao chép số"}
              </button>
              <button
                type="button"
                className="btn btn-light px-3"
                onClick={() => setShowCallModal(false)}
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
