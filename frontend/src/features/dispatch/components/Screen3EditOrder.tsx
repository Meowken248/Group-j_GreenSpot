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

  const setQuickDeadline = (hoursToAdd: number) => {
    const target = new Date();
    target.setHours(target.getHours() + hoursToAdd);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    const hh = String(target.getHours()).padStart(2, "0");
    const min = String(target.getMinutes()).padStart(2, "0");
    setDeadline(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  };

  const handleApplyQuickNote = (noteText: string) => {
    setAdjustmentNotes((prev) => (prev ? `${prev}; ${noteText}` : noteText));
  };

  const activeNewTeam = teams.find((t) => t.team_id === selectedTeamId);

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
    <form
      onSubmit={handleSubmit}
      data-testid="screen-edit-order"
      className="dispatch-workspace dispatch-workspace-form"
    >
      {/* =========================================================================
          CỘT TRÁI: KHỐI "LỆNH HIỆN TẠI"
         ========================================================================= */}
      <div className="dispatch-column-card">
        <div className="column-title">
          <span className="col-icon">📄</span>
          <span className="col-heading">LỆNH HIỆN TẠI</span>
          <span className="subtitle-hint ms-auto">
            Hồ sơ lệnh hiện tại
          </span>
        </div>

        <div className="form-inner-content">
          {isCompleted && (
            <div className="alert-badge-locked mb-3">
              🔒 Lệnh đã hoàn tất — hồ sơ được khoá theo quy định lưu trữ.
            </div>
          )}

          {isCancelled && (
            <div className="alert-badge-locked mb-3">
              🚫 Lệnh đã bị huỷ — không thể điều chỉnh tiếp.
            </div>
          )}

          {/* Dữ liệu cũ điền sẵn (read-only dossier) */}
          <div className="existing-order-dossier">
            <div className="dossier-code-strip">
              <span className="label">Mã lệnh điều động:</span>
              <span className="order-code-badge">{order.order_code}</span>
            </div>

            <div className="read-only-box mb-2">
              <label className="ro-label">Sự cố hiện trường</label>
              <div className="ro-incident-title">{order.incident_title}</div>
              <div className="ro-incident-loc">📍 {order.location_address}</div>
            </div>

            <div className="read-only-box mb-2">
              <label className="ro-label">Đội đang phụ trách</label>
              <div className="d-flex align-items-center justify-content-between">
                <span className="ro-team-name">{order.team_name}</span>
                <span className="ro-team-phone">📞 {order.team_phone}</span>
              </div>
            </div>

            <div className="read-only-box mb-2">
              <label className="ro-label">Hạn cam kết SLA hiện tại</label>
              <div className="ro-deadline-text">
                {order.deadline
                  ? new Date(order.deadline).toLocaleString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "Chưa đặt"}
              </div>
            </div>

            <div className="read-only-box">
              <label className="ro-label">Trạng thái hiện tại</label>
              <div className="mt-1">
                <span
                  className={`status-badge status-${order.status}`}
                  style={{ backgroundColor: order.status_color }}
                >
                  {order.status_label}
                </span>
                <span className="version-tag ms-2">v{order.version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CỘT GIỮA: KHỐI "PHÂN CÔNG"
         ========================================================================= */}
      <div className="dispatch-column-card">
        <div className="column-title">
          <span className="col-icon">🔄</span>
          <span className="col-heading">PHÂN CÔNG</span>
        </div>

        <div className="form-inner-content">
          {/* Đổi đội */}
          <div className="form-group mb-3">
            <label htmlFor="edit-select-team" className="form-label-styled">
              Điều chuyển sang đội tiếp nhận mới <span className="text-danger">*</span>
            </label>
            <select
              id="edit-select-team"
              className={`form-select-styled ${fieldErrors.team ? "is-invalid" : ""}`}
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              disabled={isReadOnly}
            >
              {teams.map((t) => (
                <option key={t.team_id} value={t.team_id}>
                  {t.team_name} - {t.distance_label} (
                  {t.current_status === "AVAILABLE" ? "Sẵn sàng" : "Đang làm nhiệm vụ"})
                </option>
              ))}
            </select>
            {fieldErrors.team && (
              <div className="form-error-msg">{fieldErrors.team}</div>
            )}
          </div>

          {/* New team preview card */}
          {activeNewTeam && (
            <div className="team-profile-card mb-3">
              <div className="team-card-top">
                <div className="team-avatar">🚛</div>
                <div className="team-meta">
                  <div className="team-name-strong">{activeNewTeam.team_name}</div>
                  <div className="team-phone-link">
                    <span>📞 {activeNewTeam.phone}</span>
                  </div>
                </div>
                <div
                  className={`team-status-chip ${
                    activeNewTeam.current_status === "AVAILABLE" ? "status-ready" : "status-busy"
                  }`}
                >
                  {activeNewTeam.current_status === "AVAILABLE" ? "🟢 Sẵn sàng" : "🟡 Đang bận"}
                </div>
              </div>
              <div className="team-distance-banner">
                <span>Khoảng cách: <strong>{activeNewTeam.distance_label}</strong></span>
                <span>Thời gian: <strong>~{Math.round(activeNewTeam.distance_km * 3.5)} phút</strong></span>
              </div>
            </div>
          )}

          {/* Đổi hạn SLA */}
          <div className="form-group mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="edit-input-deadline" className="form-label-styled mb-0">
                Điều chỉnh hạn hoàn thành SLA <span className="text-danger">*</span>
              </label>
              <span className="sla-hint-tag">Gia hạn cam kết</span>
            </div>
            <input
              type="datetime-local"
              id="edit-input-deadline"
              className={`form-select-styled ${fieldErrors.deadline ? "is-invalid" : ""}`}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isReadOnly}
            />
            {fieldErrors.deadline && (
              <div className="form-error-msg">{fieldErrors.deadline}</div>
            )}

            {!isReadOnly && (
              <div className="quick-presets-row mt-2">
                <span className="quick-label">Gia hạn:</span>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setQuickDeadline(2)}
                >
                  +2 giờ
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setQuickDeadline(4)}
                >
                  +4 giờ
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setQuickDeadline(12)}
                >
                  +12 giờ
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setQuickDeadline(24)}
                >
                  +24 giờ
                </button>
              </div>
            )}
          </div>

          {/* Ghi chú lý do điều chỉnh */}
          <div className="form-group mb-3">
            <label htmlFor="edit-input-notes" className="form-label-styled">
              Lý do điều chỉnh phân công <span className="text-danger">*</span>
            </label>
            <textarea
              id="edit-input-notes"
              rows={3}
              className={`form-select-styled ${fieldErrors.notes ? "is-invalid" : ""}`}
              placeholder="Đội cũ xe nạo vét gặp sự cố, điều chuyển sang đội khác..."
              value={adjustmentNotes}
              onChange={(e) => setAdjustmentNotes(e.target.value)}
              disabled={isReadOnly}
            />
            {fieldErrors.notes && (
              <div className="form-error-msg">{fieldErrors.notes}</div>
            )}

            {!isReadOnly && (
              <div className="quick-notes-chips mt-2">
                <span className="quick-label">Lý do mẫu:</span>
                <button
                  type="button"
                  className="quick-note-chip"
                  onClick={() => handleApplyQuickNote("Đội cũ xe nạo vét gặp sự cố")}
                >
                  Xe cơ động hỏng
                </button>
                <button
                  type="button"
                  className="quick-note-chip"
                  onClick={() => handleApplyQuickNote("Tắc đường do triều cường dâng cao")}
                >
                  Triều cường cản trở
                </button>
                <button
                  type="button"
                  className="quick-note-chip"
                  onClick={() => handleApplyQuickNote("Tăng cường theo chỉ đạo Ban chỉ huy")}
                >
                  Chỉ đạo Ban chỉ huy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          CỘT PHẢI: KHỐI "LƯU"
         ========================================================================= */}
      <div className="dispatch-column-card">
        <div className="column-title">
          <span className="col-icon">💾</span>
          <span className="col-heading">LƯU</span>
        </div>

        <div className="form-inner-content d-flex flex-column h-100">
          {/* Tóm tắt so sánh thay đổi (Audit Diff Preview) */}
          <div className="order-summary-card mb-auto">
            <div className="summary-card-header">
              <span className="summary-title">So sánh điều chỉnh</span>
              <span className="badge-new">v{order.version} ➔ v{order.version + 1}</span>
            </div>

            <div className="summary-list">
              <div className="diff-item">
                <div className="diff-header">Đội phụ trách:</div>
                <div className="diff-body">
                  <span className="diff-old">{order.team_name}</span>
                  <span className="diff-arrow">➔</span>
                  <span className="diff-new">{activeNewTeam ? activeNewTeam.team_name : "Chưa chọn"}</span>
                </div>
              </div>

              <div className="diff-item mt-2">
                <div className="diff-header">Hạn hoàn thành SLA:</div>
                <div className="diff-body">
                  <span className="diff-new">
                    {deadline ? new Date(deadline).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="summary-checklist mt-3">
              <div className="checklist-item">
                <span className="check-icon">✓</span>
                <span>Lưu vết lịch sử tái phân bổ vào audit log</span>
              </div>
              <div className="checklist-item">
                <span className="check-icon">✓</span>
                <span>Gửi thông báo đổi lệnh đến cả 2 đội</span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Oval Pill Shape) */}
          <div className="primary-action-wrap mt-3">
            <button
              type="submit"
              className="btn-create-order-primary btn-pill-lg"
              disabled={isReadOnly || isLoading}
              style={isReadOnly ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              {isLoading ? "Đang cập nhật..." : "Cập nhật"}
            </button>

            <button
              type="button"
              className="btn-reset-filter btn-pill-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Huỷ
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
