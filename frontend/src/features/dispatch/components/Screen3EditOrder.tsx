import React, { useState } from "react";
import type {
  DispatchOrderItem,
  TeamOptionItem,
  EditDispatchOrderRequest,
} from "../types/dispatch.types";

interface Screen3EditOrderProps {
  order: DispatchOrderItem;
  teams: TeamOptionItem[];
  isLoading: boolean;
  onCancel: () => void;
  onSubmitEdit: (payload: EditDispatchOrderRequest) => Promise<void>;
  onShowWarningToast: (msg: string) => void;
}

export const Screen3EditOrder: React.FC<Screen3EditOrderProps> = ({
  order,
  teams,
  isLoading,
  onCancel,
  onSubmitEdit,
  onShowWarningToast,
}) => {
  const isCompleted = order.status === "COMPLETED";
  const isCancelled = order.status === "CANCELLED";
  const isReadOnly = isCompleted || isCancelled;

  const [selectedTeamId, setSelectedTeamId] = useState<string>(order.team_id);
  const [deadline, setDeadline] = useState<string>(() => {
    if (!order.deadline) return "";
    try {
      const d = new Date(order.deadline);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch {
      return "";
    }
  });
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const errors: Record<string, string> = {};

    if (!selectedTeamId) {
      errors.team = "Vui lòng chọn đội xử lý điều chuyển";
    }
    if (!deadline) {
      errors.deadline = "Vui lòng nhập thời hạn xử lý SLA";
    }
    if (!adjustmentNotes.trim()) {
      errors.notes = "Vui lòng nhập lý do điều chỉnh phân công (bắt buộc)";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      onShowWarningToast("Vui lòng nhập đầy đủ lý do điều chỉnh và thông tin phân công.");
      return;
    }

    setFieldErrors({});
    await onSubmitEdit({
      team_id: selectedTeamId,
      deadline,
      adjustment_notes: adjustmentNotes.trim(),
      version: order.version,
    });
  };

  return (
    <div className="dispatch-screen-container" data-testid="screen-edit-order">
      <div className="dispatch-card-header mb-4">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm me-3"
              onClick={onCancel}
              title="Quay lại danh sách"
            >
              <i className="bi bi-arrow-left me-1"></i>Quay lại
            </button>
            <div>
              <h2 className="dispatch-section-title mb-0">
                Điều chỉnh phân công lệnh: {order.order_code}
              </h2>
              <p className="text-muted small mb-0">
                Cập nhật đội tiếp nhận tác nghiệp, gia hạn SLA và lưu nhật ký điều chuyển
              </p>
            </div>
          </div>
          <span
            className="badge px-3 py-2"
            style={{ backgroundColor: order.status_color || "#2563eb", color: "#fff" }}
          >
            {order.status_label}
          </span>
        </div>
      </div>

      {isCompleted && (
        <div className="alert alert-info d-flex align-items-center mb-4">
          <i className="bi bi-lock-fill fs-4 me-3 text-primary"></i>
          <div>
            <strong>Lệnh đã hoàn tất:</strong> Hồ sơ lệnh xử lý đã được nghiệm thu đóng thành công.
            Toàn bộ thông tin được khoá theo quy định lưu trữ, không thể chỉnh sửa.
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="alert alert-secondary d-flex align-items-center mb-4">
          <i className="bi bi-slash-circle-fill fs-4 me-3 text-danger"></i>
          <div>
            <strong>Lệnh đã bị huỷ:</strong> Lệnh điều phối này đã bị huỷ trước đó và không thể điều chỉnh tiếp.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* CỘT TRÁI: KHỐI LỆNH HIỆN TẠI (READ-ONLY) */}
          <div className="col-lg-4 col-md-12">
            <div className="dispatch-panel h-100">
              <div className="dispatch-panel-header">
                <i className="bi bi-info-circle-fill text-info me-2"></i>
                <h3 className="dispatch-panel-title">Hồ sơ lệnh hiện tại</h3>
              </div>

              <div className="read-only-detail-list">
                <div className="detail-item mb-3 p-2 bg-light rounded border">
                  <div className="text-muted small">Mã lệnh điều phối</div>
                  <div className="fw-bold text-primary font-monospace">{order.order_code}</div>
                </div>

                <div className="detail-item mb-3 p-2 bg-light rounded border">
                  <div className="text-muted small">Sự cố hiện trường</div>
                  <div className="fw-semibold text-dark">{order.incident_title}</div>
                  <div className="small text-muted mt-1">
                    <i className="bi bi-geo-alt me-1 text-danger"></i>
                    {order.location_address}
                  </div>
                </div>

                <div className="detail-item mb-3 p-2 bg-light rounded border">
                  <div className="text-muted small">Đội đang phụ trách</div>
                  <div className="fw-semibold text-dark">{order.team_name}</div>
                  <div className="small text-muted">SĐT: {order.team_phone}</div>
                </div>

                <div className="detail-item mb-3 p-2 bg-light rounded border">
                  <div className="text-muted small">Thời hạn cam kết SLA hiện tại</div>
                  <div className="fw-semibold text-danger">
                    {order.deadline ? new Date(order.deadline).toLocaleString("vi-VN") : "Chưa đặt"}
                  </div>
                </div>

                <div className="detail-item p-2 bg-light rounded border">
                  <div className="text-muted small">Phiên bản giao dịch (OCC)</div>
                  <div className="fw-bold text-secondary font-monospace">Version {order.version}</div>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT GIỮA: KHỐI PHÂN CÔNG (EDITABLE) */}
          <div className="col-lg-5 col-md-12">
            <div className="dispatch-panel h-100">
              <div className="dispatch-panel-header">
                <i className="bi bi-sliders text-primary me-2"></i>
                <h3 className="dispatch-panel-title">Nội dung điều chỉnh</h3>
              </div>

              {/* Đổi đội thực hiện */}
              <div className="mb-3">
                <label htmlFor="edit-select-team" className="form-label required-label">
                  Đổi đội phản ứng cơ động tiếp nhận
                </label>
                <select
                  id="edit-select-team"
                  className={`form-select ${fieldErrors.team ? "is-invalid" : ""}`}
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={isReadOnly}
                >
                  {teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name} - {t.distance_label} ({t.current_status === "AVAILABLE" ? "Sẵn sàng" : "Đang làm nhiệm vụ"})
                    </option>
                  ))}
                </select>
                {fieldErrors.team && (
                  <div className="invalid-feedback">{fieldErrors.team}</div>
                )}
                <div className="form-text">
                  Lựa chọn đội khác nếu đội cũ gặp trục trặc kỹ thuật hoặc cần ưu tiên sự cố khác.
                </div>
              </div>

              {/* Đổi hạn xử lý SLA */}
              <div className="mb-3">
                <label htmlFor="edit-input-deadline" className="form-label required-label">
                  Điều chỉnh thời hạn cam kết SLA
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-clock-history"></i>
                  </span>
                  <input
                    type="datetime-local"
                    id="edit-input-deadline"
                    className={`form-control ${fieldErrors.deadline ? "is-invalid" : ""}`}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    disabled={isReadOnly}
                  />
                  {fieldErrors.deadline && (
                    <div className="invalid-feedback">{fieldErrors.deadline}</div>
                  )}
                </div>
                <div className="form-text">Cho phép gia hạn hoặc rút ngắn thời gian xử lý hiện trường.</div>
              </div>

              {/* Lý do điều chỉnh (Bắt buộc) */}
              <div className="mb-3">
                <label htmlFor="edit-input-notes" className="form-label required-label">
                  Lý do điều chỉnh phân công
                </label>
                <textarea
                  id="edit-input-notes"
                  rows={4}
                  className={`form-control ${fieldErrors.notes ? "is-invalid" : ""}`}
                  placeholder="Ví dụ: Đội cũ xe nạo vét gặp sự cố cơ học, điều chuyển sang Đội 2 để bảo đảm tiến độ cam kết..."
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  disabled={isReadOnly}
                />
                {fieldErrors.notes && (
                  <div className="invalid-feedback">{fieldErrors.notes}</div>
                )}
                <div className="form-text">
                  Bắt buộc nhập lý do để lưu vết vào nhật ký kiểm toán hệ thống.
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: KHỐI LƯU */}
          <div className="col-lg-3 col-md-12">
            <div className="dispatch-panel h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="dispatch-panel-header">
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  <h3 className="dispatch-panel-title">Lưu thay đổi</h3>
                </div>

                <div className="alert alert-light border small text-muted mb-4">
                  <p className="mb-2">
                    <i className="bi bi-arrow-repeat text-primary me-1"></i>
                    Sau khi cập nhật thành công:
                  </p>
                  <ul className="ps-3 mb-0">
                    <li>Thông tin đội mới sẽ được cập nhật tức thì.</li>
                    <li>Đội mới nhận thông báo điều động bổ sung.</li>
                    <li>Dữ liệu lịch sử sẽ được lưu vết kiểm toán.</li>
                  </ul>
                </div>
              </div>

              <div className="dispatch-actions-stack">
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 mb-2 d-flex align-items-center justify-content-center fw-semibold"
                  disabled={isReadOnly || isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>Cập nhật
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary w-100 py-2"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  <i className="bi bi-x-circle me-1"></i>Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
