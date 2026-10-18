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
  const [copiedGps, setCopiedGps] = useState<boolean>(false);

  // Set default deadline (current time + 4 hours)
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

  useEffect(() => {
    setQuickDeadline(4);
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

  const handleCopyGps = () => {
    if (!activeIncident) return;
    const text = `${activeIncident.latitude.toFixed(5)}, ${activeIncident.longitude.toFixed(5)}`;
    navigator.clipboard.writeText(text);
    setCopiedGps(true);
    setTimeout(() => setCopiedGps(false), 2000);
  };

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

  const getPriorityLabel = (p: DispatchPriority) => {
    switch (p) {
      case "URGENT":
        return "Khẩn cấp";
      case "HIGH":
        return "Cao";
      case "MEDIUM":
        return "Trung bình";
      case "LOW":
        return "Thấp";
      default:
        return p;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="screen-create-order"
      className="dispatch-workspace dispatch-workspace-form"
    >
      {/* =========================================================================
          CỘT TRÁI: KHỐI "SỰ CỐ"
         ========================================================================= */}
      <div className="dispatch-column-card">
        <div className="column-title">
          <span className="col-icon">⚠️</span>
          <span className="col-heading">SỰ CỐ</span>
          <span className="subtitle-hint ms-auto">
            Tạo lệnh điều động xử lý hiện trường mới
          </span>
        </div>

        <div className="form-inner-content">
          {/* 1. Hộp chọn sự cố */}
          <div className="form-group mb-3">
            <label htmlFor="select-incident" className="form-label-styled">
              Chọn sự cố cần xử lý <span className="text-danger">*</span>
            </label>
            <select
              id="select-incident"
              className={`form-select-styled ${fieldErrors.incident ? "is-invalid" : ""}`}
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
              <div className="form-error-msg">{fieldErrors.incident}</div>
            )}
          </div>

          {/* 2. Chi tiết hồ sơ sự cố (Dossier Card) */}
          {activeIncident ? (
            <div className="incident-dossier-card">
              <div className="dossier-header">
                <span className="category-pill">
                  {activeIncident.category === "Rác thải"
                    ? "🗑️ Rác thải tự phát"
                    : activeIncident.category === "Ngập úng"
                    ? "🌊 Ngập úng đô thị"
                    : `⚠️ ${activeIncident.category}`}
                </span>
                <span className={`urgency-badge urgency-${activeIncident.urgency}`}>
                  {activeIncident.urgency}
                </span>
              </div>

              <div className="dossier-title">{activeIncident.title}</div>

              {/* Vị trí read-only text container */}
              <div className="read-only-box">
                <label className="ro-label">Vị trí hiện trường</label>
                <div className="ro-address">
                  <span className="pin-icon">📍 </span>
                  <span className="address-text">{activeIncident.location_address}</span>
                </div>

                <div className="gps-info-bar">
                  <span className="gps-tag">
                    GPS: {activeIncident.latitude.toFixed(5)}, {activeIncident.longitude.toFixed(5)}
                  </span>
                  <button
                    type="button"
                    className="btn-copy-chip"
                    onClick={handleCopyGps}
                    title="Sao chép toạ độ GPS"
                  >
                    {copiedGps ? "✓ Đã sao chép" : "📋 Sao chép"}
                  </button>
                </div>

                <div className="meta-details-row">
                  <span>Khu vực: <strong>{activeIncident.ward || activeIncident.district}</strong></span>
                  <span>Mã SC: <strong>{activeIncident.incident_code || activeIncident.incident_id}</strong></span>
                </div>
              </div>

              {/* Mini vector location preview strip */}
              <div className="mini-location-map-strip">
                <div className="radar-ping-dot"></div>
                <span>Tọa độ đã định vị vệ tinh chính xác trong bán kính 15m</span>
              </div>
            </div>
          ) : (
            <div className="empty-prompt-box">
              <span className="prompt-icon">📌</span>
              <span>Vui lòng chọn sự cố từ danh sách thả xuống ở trên</span>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          CỘT GIỮA: KHỐI "PHÂN CÔNG"
         ========================================================================= */}
      <div className="dispatch-column-card">
        <div className="column-title">
          <span className="col-icon">👥</span>
          <span className="col-heading">PHÂN CÔNG</span>
        </div>

        <div className="form-inner-content">
          {/* 1. Chọn đội tiếp nhận */}
          <div className="form-group mb-3">
            <label htmlFor="select-team" className="form-label-styled">
              Chọn đội phản ứng cơ động <span className="text-danger">*</span>
            </label>
            <select
              id="select-team"
              className={`form-select-styled ${fieldErrors.team ? "is-invalid" : ""}`}
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="">-- Chọn đội xử lý --</option>
              {teams.map((t) => (
                <option key={t.team_id} value={t.team_id}>
                  {t.team_name} - {t.distance_label} (
                  {t.current_status === "AVAILABLE" ? "Sẵn sàng" : "Đang làm nhiệm vụ"})
                </option>
              ))}
            </select>
            {fieldErrors.team && <div className="form-error-msg">{fieldErrors.team}</div>}
          </div>

          {/* Thẻ thông tin đội đã chọn */}
          {activeTeam && (
            <div className="team-profile-card mb-3">
              <div className="team-card-top">
                <div className="team-avatar">🚛</div>
                <div className="team-meta">
                  <div className="team-name-strong">{activeTeam.team_name}</div>
                  <div className="team-phone-link">
                    <span>📞 {activeTeam.phone}</span>
                  </div>
                </div>
                <div
                  className={`team-status-chip ${
                    activeTeam.current_status === "AVAILABLE" ? "status-ready" : "status-busy"
                  }`}
                >
                  {activeTeam.current_status === "AVAILABLE" ? "🟢 Sẵn sàng" : "🟡 Đang bận"}
                </div>
              </div>

              <div className="team-distance-banner">
                <span>📍 Khoảng cách: <strong>{activeTeam.distance_label}</strong></span>
                <span>⏱️ Ước tính: <strong>~{Math.round(activeTeam.distance_km * 3.5)} phút</strong></span>
              </div>

              {activeTeam.is_busy_with_urgent && (
                <div className="team-urgent-warning">
                  ⚠️ Đội đang xử lý sự cố khẩn khác. Có thể kéo dài thời gian tiếp cận hiện trường.
                </div>
              )}
            </div>
          )}

          {/* 2. Mức ưu tiên */}
          <div className="form-group mb-3">
            <label className="form-label-styled">Mức độ ưu tiên điều động</label>
            <div className="priority-selector-grid">
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as DispatchPriority[]).map((p) => {
                const isSelected = priority === p;
                return (
                  <label
                    key={p}
                    className={`priority-chip-option priority-${p} ${isSelected ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="priorityOption"
                      checked={isSelected}
                      onChange={() => setPriority(p)}
                      className="priority-radio-input"
                    />
                    <span className="priority-dot"></span>
                    <span className="priority-name">{getPriorityLabel(p)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Hạn hoàn thành (SLA) */}
          <div className="form-group mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="input-deadline" className="form-label-styled mb-0">
                Hạn hoàn thành (SLA) <span className="text-danger">*</span>
              </label>
              <span className="sla-hint-tag">Cam kết xử lý</span>
            </div>

            <input
              type="datetime-local"
              id="input-deadline"
              className={`form-select-styled ${fieldErrors.deadline ? "is-invalid" : ""}`}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            {fieldErrors.deadline && (
              <div className="form-error-msg">{fieldErrors.deadline}</div>
            )}

            {/* Quick Preset Buttons */}
            <div className="quick-presets-row mt-2">
              <span className="quick-label">Gợi ý nhanh:</span>
              <button
                type="button"
                className="preset-btn"
                onClick={() => setQuickDeadline(2)}
              >
                +2 giờ (Khẩn)
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => setQuickDeadline(4)}
              >
                +4 giờ (Chuẩn)
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => setQuickDeadline(8)}
              >
                +8 giờ (Trong ngày)
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => setQuickDeadline(24)}
              >
                +24 giờ (Thường)
              </button>
            </div>
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
          {/* Tóm tắt phiếu điều động (Dispatch Order Preview) */}
          <div className="order-summary-card mb-auto">
            <div className="summary-card-header">
              <span className="summary-title">Phiếu tóm tắt phân công</span>
              <span className="badge-new">Mới</span>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span className="summary-label">Sự cố:</span>
                <span className="summary-val text-truncate" title={activeIncident?.title}>
                  {activeIncident ? activeIncident.title : "—"}
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Đội nhận:</span>
                <span className="summary-val">
                  {activeTeam ? activeTeam.team_name : "—"}
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Ưu tiên:</span>
                <span className={`summary-val priority-val priority-${priority}`}>
                  {getPriorityLabel(priority)}
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Hạn SLA:</span>
                <span className="summary-val">
                  {deadline ? new Date(deadline).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—"}
                </span>
              </div>
            </div>

            <div className="summary-checklist">
              <div className="checklist-item">
                <span className="check-icon">✓</span>
                <span>Toạ độ định vị GPS hợp lệ</span>
              </div>
              <div className="checklist-item">
                <span className="check-icon">✓</span>
                <span>Đội cơ động trong bán kính phân công</span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Oval Pill Shape matching wireframe prototype) */}
          <div className="primary-action-wrap mt-3">
            <button
              type="submit"
              className="btn-create-order-primary btn-pill-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="btn-spinner" />
                  Đang điều phối...
                </>
              ) : (
                <>
                  <span className="btn-icon">📤</span>
                  <span>Giao lệnh</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-reset-filter btn-pill-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Huỷ
            </button>

            <div className="dispatch-disclaimer mt-2">
              💡 Lệnh điều động sẽ được gửi tức thì đến thiết bị của Đội trưởng trên hiện trường.
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
