import React, { useState, useEffect } from "react";
import type {
  IncidentComboboxItem,
  TeamOptionItem,
  DispatchPriority,
  CreateDispatchOrderRequest,
} from "../types/dispatch.types";

interface Screen2CreateOrderProps {
  incidents: IncidentComboboxItem[];
  teams: TeamOptionItem[];
  isLoading: boolean;
  onCancel: () => void;
  onSubmitCreate: (payload: CreateDispatchOrderRequest) => Promise<void>;
  onShowWarningToast: (msg: string) => void;
}

export const Screen2CreateOrder: React.FC<Screen2CreateOrderProps> = ({
  incidents,
  teams,
  isLoading,
  onCancel,
  onSubmitCreate,
  onShowWarningToast,
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [priority, setPriority] = useState<DispatchPriority>("HIGH");
  const [deadline, setDeadline] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auto set default deadline (current time + 4 hours)
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 4);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    setDeadline(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  }, []);

  // Pre-select first incident if available
  useEffect(() => {
    if (incidents.length > 0 && !selectedIncidentId) {
      setSelectedIncidentId(incidents[0].incident_id);
    }
  }, [incidents, selectedIncidentId]);

  // Pre-select closest available team
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      const bestTeam = [...teams].sort((a, b) => a.distance_km - b.distance_km)[0];
      if (bestTeam) setSelectedTeamId(bestTeam.team_id);
    }
  }, [teams, selectedTeamId]);

  const activeIncident = incidents.find((i) => i.incident_id === selectedIncidentId);
  const activeTeam = teams.find((t) => t.team_id === selectedTeamId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!selectedIncidentId) {
      errors.incident = "Vui lòng chọn sự cố môi trường cần xử lý";
    }
    if (!selectedTeamId) {
      errors.team = "Vui lòng chọn đội phản ứng cơ động tiếp nhận";
    }
    if (!deadline) {
      errors.deadline = "Vui lòng chọn thời hạn hoàn tất cam kết SLA";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      onShowWarningToast("Vui lòng điền đầy đủ các thông tin bắt buộc trước khi giao lệnh.");
      return;
    }

    setFieldErrors({});
    await onSubmitCreate({
      incident_id: selectedIncidentId,
      team_id: selectedTeamId,
      priority,
      deadline,
    });
  };

  return (
    <div className="dispatch-screen-container" data-testid="screen-create-order">
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
              <h2 className="dispatch-section-title mb-0">Tạo lệnh điều động xử lý hiện trường mới</h2>
              <p className="text-muted small mb-0">
                Phân bổ lực lượng phản ứng cơ động, thiết lập mức độ ưu tiên và thời hạn cam kết SLA
              </p>
            </div>
          </div>
          <span className="badge bg-primary px-3 py-2">Khởi tạo tác nghiệp</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* CỘT TRÁI: KHỐI SỰ CỐ */}
          <div className="col-lg-4 col-md-12">
            <div className="dispatch-panel h-100">
              <div className="dispatch-panel-header">
                <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                <h3 className="dispatch-panel-title">Thông tin sự cố môi trường</h3>
              </div>

              <div className="mb-3">
                <label htmlFor="select-incident" className="form-label required-label">
                  Sự cố cần xử lý
                </label>
                <select
                  id="select-incident"
                  className={`form-select ${fieldErrors.incident ? "is-invalid" : ""}`}
                  value={selectedIncidentId}
                  onChange={(e) => setSelectedIncidentId(e.target.value)}
                >
                  <option value="">-- Chọn sự cố chưa phân công --</option>
                  {incidents.map((inc) => (
                    <option key={inc.incident_id} value={inc.incident_id}>
                      [{inc.urgency}] {inc.title} - {inc.district}
                    </option>
                  ))}
                </select>
                {fieldErrors.incident && (
                  <div className="invalid-feedback">{fieldErrors.incident}</div>
                )}
              </div>

              {activeIncident ? (
                <div className="incident-extracted-info p-3 bg-light rounded border">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="badge bg-danger-subtle text-danger border border-danger">
                      {activeIncident.urgency}
                    </span>
                    <span className="text-muted small">Mã: {activeIncident.incident_code}</span>
                  </div>

                  <h6 className="fw-bold text-dark mb-2">{activeIncident.title}</h6>

                  <div className="mb-2 small">
                    <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                    <strong>Địa điểm:</strong> {activeIncident.location_address}
                  </div>

                  <div className="mb-2 small">
                    <i className="bi bi-compass text-primary me-1"></i>
                    <strong>Toạ độ GPS:</strong> {activeIncident.latitude.toFixed(5)}, {activeIncident.longitude.toFixed(5)}
                  </div>

                  <div className="small">
                    <i className="bi bi-tag text-secondary me-1"></i>
                    <strong>Phân loại:</strong> {activeIncident.category}
                  </div>
                </div>
              ) : (
                <div className="alert alert-secondary text-center py-4">
                  <i className="bi bi-pin-map fs-3 d-block mb-2 text-muted"></i>
                  <span>Chọn sự cố từ danh sách trên để xem thông tin trích xuất toạ độ GPS</span>
                </div>
              )}
            </div>
          </div>

          {/* CỘT GIỮA: KHỐI PHÂN CÔNG */}
          <div className="col-lg-5 col-md-12">
            <div className="dispatch-panel h-100">
              <div className="dispatch-panel-header">
                <i className="bi bi-people-fill text-primary me-2"></i>
                <h3 className="dispatch-panel-title">Phân công lực lượng & Thời hạn</h3>
              </div>

              {/* Đội thực hiện */}
              <div className="mb-3">
                <label htmlFor="select-team" className="form-label required-label">
                  Đội phản ứng cơ động tiếp nhận
                </label>
                <select
                  id="select-team"
                  className={`form-select ${fieldErrors.team ? "is-invalid" : ""}`}
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">-- Chọn đội xử lý --</option>
                  {teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name} - {t.distance_label} ({t.current_status === "AVAILABLE" ? "Sẵn sàng" : "Đang làm nhiệm vụ"})
                    </option>
                  ))}
                </select>
                {fieldErrors.team && (
                  <div className="invalid-feedback">{fieldErrors.team}</div>
                )}
              </div>

              {/* Cảnh báo nếu đội được chọn đang bận */}
              {activeTeam?.is_busy_with_urgent && (
                <div className="alert alert-warning d-flex align-items-center py-2 px-3 mb-3">
                  <i className="bi bi-exclamation-triangle-fill text-warning me-2 fs-5"></i>
                  <div className="small">
                    <strong>Lưu ý:</strong> {activeTeam.team_name} hiện đang xử lý một sự cố khẩn cấp khác. Việc điều động thêm có thể kéo dài thời gian tiếp cận hiện trường.
                  </div>
                </div>
              )}

              {/* Mức độ ưu tiên */}
              <div className="mb-3">
                <label className="form-label required-label d-block">Mức độ ưu tiên xử lý</label>
                <div className="priority-radio-group d-flex gap-2 flex-wrap">
                  <div className="form-check priority-check-card border rounded p-2 flex-fill">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="priorityOption"
                      id="prio-low"
                      checked={priority === "LOW"}
                      onChange={() => setPriority("LOW")}
                    />
                    <label className="form-check-label ps-1 text-muted" htmlFor="prio-low">
                      Thấp
                    </label>
                  </div>
                  <div className="form-check priority-check-card border rounded p-2 flex-fill">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="priorityOption"
                      id="prio-medium"
                      checked={priority === "MEDIUM"}
                      onChange={() => setPriority("MEDIUM")}
                    />
                    <label className="form-check-label ps-1 text-primary" htmlFor="prio-medium">
                      Trung bình
                    </label>
                  </div>
                  <div className="form-check priority-check-card border rounded p-2 flex-fill">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="priorityOption"
                      id="prio-high"
                      checked={priority === "HIGH"}
                      onChange={() => setPriority("HIGH")}
                    />
                    <label className="form-check-label ps-1 text-warning fw-semibold" htmlFor="prio-high">
                      Cao
                    </label>
                  </div>
                  <div className="form-check priority-check-card border rounded p-2 flex-fill border-danger-subtle bg-danger-subtle">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="priorityOption"
                      id="prio-urgent"
                      checked={priority === "URGENT"}
                      onChange={() => setPriority("URGENT")}
                    />
                    <label className="form-check-label ps-1 text-danger fw-bold" htmlFor="prio-urgent">
                      Khẩn cấp
                    </label>
                  </div>
                </div>
              </div>

              {/* Hạn xử lý SLA */}
              <div className="mb-3">
                <label htmlFor="input-deadline" className="form-label required-label">
                  Thời hạn hoàn tất cam kết SLA (Deadline)
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-calendar-event"></i>
                  </span>
                  <input
                    type="datetime-local"
                    id="input-deadline"
                    className={`form-control ${fieldErrors.deadline ? "is-invalid" : ""}`}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                  {fieldErrors.deadline && (
                    <div className="invalid-feedback">{fieldErrors.deadline}</div>
                  )}
                </div>
                <div className="form-text">
                  Thời hạn quy chuẩn SLA đối với mức {priority === "URGENT" ? "Khẩn cấp: trong vòng 2-4 giờ" : "thông thường: trong ngày"}.
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: KHỐI LƯU */}
          <div className="col-lg-3 col-md-12">
            <div className="dispatch-panel h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="dispatch-panel-header">
                  <i className="bi bi-send-check text-success me-2"></i>
                  <h3 className="dispatch-panel-title">Xác nhận giao lệnh</h3>
                </div>

                <div className="dispatch-summary-box p-3 bg-light rounded border mb-4">
                  <div className="small text-muted mb-2">Tóm tắt lệnh điều động:</div>
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-2">
                      <i className="bi bi-check2 text-success me-1"></i>
                      <strong>Trạng thái lệnh:</strong> Sẽ chuyển thành "Đã giao"
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-bell text-warning me-1"></i>
                      <strong>Thông báo:</strong> Tự động gửi thông báo đẩy đến Đội trưởng tiếp nhận
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-shield-check text-primary me-1"></i>
                      <strong>Giám sát:</strong> Kích hoạt tọa độ GPS và lộ trình trên bản đồ
                    </li>
                  </ul>
                </div>
              </div>

              <div className="dispatch-actions-stack">
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 mb-2 d-flex align-items-center justify-content-center fw-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Đang điều phối...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-fill me-2"></i>Giao lệnh
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
