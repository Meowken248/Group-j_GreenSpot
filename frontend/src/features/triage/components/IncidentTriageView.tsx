import React, { useState, useEffect } from "react";
import type { TriageEvaluationData, TriageScreenStep } from "../types";
import { triageService } from "../services/triageService";

interface IncidentTriageViewProps {
  data: TriageEvaluationData;
  onRefreshData: () => Promise<void>;
  onNavigateToSpatial: () => void;
}

export const IncidentTriageView: React.FC<IncidentTriageViewProps> = ({
  data,
  onRefreshData,
  onNavigateToSpatial,
}) => {
  // Điều khiển các màn hình: SCREEN_1_SUMMARY -> SCREEN_2_EXPLAIN -> SCREEN_3_OVERRIDE_POPUP
  const [currentStep, setCurrentStep] = useState<TriageScreenStep>("SCREEN_1_SUMMARY");

  // State tóm tắt AI & Loading xoay tròn 2s cho nút "Tạo lại tóm tắt"
  const [summaryText, setSummaryText] = useState<string>(data.ai_summary || "");
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // State Màn 3/3 Popup Human-in-the-loop
  const [targetPriority, setTargetPriority] = useState<string>("Cao");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isSavingDecision, setIsSavingDecision] = useState<boolean>(false);

  // Toast thông báo 3 giây
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  useEffect(() => {
    setSummaryText(data.ai_summary || "");
    // Mặc định mức điều chỉnh khác với mức AI hiện tại
    const priorities = ["Khẩn cấp", "Cao", "Trung bình", "Thấp"];
    const other = priorities.find((p) => p !== data.ai_suggested_priority) || "Cao";
    setTargetPriority(other);
  }, [data]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Nút "Tạo lại tóm tắt" (Màn 1/3)
  const handleRegenerateSummary = async () => {
    setIsRegenerating(true);
    setServerError(null);
    try {
      // Giả lập trễ nhẹ đúng 2 giây để người dùng thấy vòng quay loading rõ ràng
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const res = await triageService.regenerateSummary(data.incident_id);
      setSummaryText(res.ai_summary);
      showToast("Đã cập nhật bản tóm tắt AI mới");
    } catch (err: any) {
      setServerError("Không thể kết nối dịch vụ AI. Vui lòng thử lại");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Nút "Chấp nhận" gợi ý AI (Màn 2/3)
  const handleAcceptPriority = async () => {
    setIsSavingDecision(true);
    try {
      const res = await triageService.acceptPriority(data.incident_id, data.version);
      showToast(res.message, "success");
      await onRefreshData();
      // Chuyển sang màn 1 hoặc chuyển sang điều phối / không gian
      setCurrentStep("SCREEN_1_SUMMARY");
    } catch (err: any) {
      if (err.response?.status === 409) {
        showToast("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang!", "error");
        await onRefreshData();
      } else {
        showToast("Lỗi phân tích rủi ro. Vui lòng thử lại", "error");
      }
    } finally {
      setIsSavingDecision(false);
    }
  };

  // Bấm nút "Xác nhận" trên Popup (Màn 3/3)
  const handleConfirmOverride = async () => {
    const trimmed = overrideReason.trim();
    if (!trimmed) {
      setReasonError("Vui lòng nhập lý do thay đổi mức ưu tiên");
      return;
    }
    if (trimmed.length > 200) {
      setReasonError("Lý do không được vượt quá 200 ký tự");
      return;
    }

    setReasonError(null);
    setIsSavingDecision(true);

    try {
      await triageService.overridePriority(
        data.incident_id,
        targetPriority,
        trimmed,
        data.version
      );
      showToast("Đã cập nhật mức ưu tiên mới thành công", "success");
      await onRefreshData();
      setCurrentStep("SCREEN_1_SUMMARY");
      setOverrideReason("");
    } catch (err: any) {
      if (err.response?.status === 409) {
        showToast("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại!", "error");
        await onRefreshData();
      } else {
        showToast("Không thể lưu quyết định. Vui lòng thử lại", "error");
      }
    } finally {
      setIsSavingDecision(false);
    }
  };

  // Bấm Huỷ hoặc nhấn phím Esc trên Popup (Màn 3/3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && currentStep === "SCREEN_3_OVERRIDE_POPUP" && !isSavingDecision) {
        setCurrentStep("SCREEN_2_EXPLAIN");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, isSavingDecision]);

  return (
    <div className="triage-main-content-flow">
      {/* Toast thông báo nổi 3 giây */}
      {toastMessage && (
        <div className={`triage-toast-notification ${toastType}`}>
          <span>{toastType === "success" ? "✅" : "⚠️"}</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          MÀN 1/3: CHI TIẾT SỰ CỐ + TÓM TẮT AI (HÌNH 4.39)
          3 KHỐI THEO CHIỀU NGANG TỪ TRÁI SANG PHẢI:
          THÔNG TIN SỰ CỐ (Trái) | TÓM TẮT AI (Giữa) | ƯU TIÊN (Phải)
         ========================================================================= */}
      {currentStep === "SCREEN_1_SUMMARY" && (
        <div className="triage-screen-1-grid">
          {/* CỘT TRÁI: KHỐI "THÔNG TIN SỰ CỐ" */}
          <div className="col-incident-info">
            <div className="panel-heading">
              <span>📍</span>
              <span>THÔNG TIN SỰ CỐ</span>
            </div>

            <div className="incident-meta-list">
              <div className="meta-item">
                <div className="meta-label">Mã theo dõi / Tiêu đề</div>
                <div className="meta-value-text">
                  <strong>{data.tracking_code}</strong>: {data.title}
                </div>
              </div>

              <div className="meta-item">
                <div className="meta-label">Mô tả chi tiết ban đầu của công dân</div>
                <div className="meta-value-text">{data.description}</div>
              </div>

              <div className="meta-item">
                <div className="meta-label">Tọa độ GPS & Địa chỉ hành chính</div>
                <div className="meta-value-text">
                  <div>📌 {data.address_text}</div>
                  <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "#94a3b8" }}>
                    GPS: ({data.latitude.toFixed(6)}, {data.longitude.toFixed(6)})
                  </div>
                </div>
              </div>

              <div className="meta-media-preview">
                <div className="meta-label">Ảnh / Video hiện trường</div>
                {data.media_urls && data.media_urls.length > 0 ? (
                  <img
                    src={data.media_urls[0]}
                    alt="Hiện trường sự cố"
                    className="media-image"
                  />
                ) : (
                  <div className="no-media-box">Chưa có ảnh đính kèm từ người dân</div>
                )}
              </div>
            </div>
          </div>

          {/* CỘT GIỮA: KHỐI "TÓM TẮT AI" */}
          <div className="col-ai-summary">
            <div className="panel-heading">
              <span>🤖 TÓM TẮT AI</span>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "normal" }}>
                LLM Tinh chỉnh đô thị
              </span>
            </div>

            <div className="summary-content-box">
              <div className="summary-text-card">
                {isRegenerating ? (
                  <div className="loading-overlay">
                    <div className="spinner" />
                    <span>Đang tạo lại bản tóm tắt AI…</span>
                  </div>
                ) : serverError ? (
                  <div>
                    <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>{serverError}</p>
                    <button
                      type="button"
                      className="btn-regenerate"
                      onClick={handleRegenerateSummary}
                      style={{ marginTop: "1rem" }}
                    >
                      Thử lại
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="summary-paragraph">
                      {summaryText || "Đang trích xuất nội dung cô đọng..."}
                    </p>
                    {data.is_too_short && (
                      <div className="short-desc-warning">
                        ⚠️ Mô tả sự cố quá ngắn để AI tóm tắt
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                type="button"
                className="btn-regenerate"
                onClick={handleRegenerateSummary}
                disabled={isRegenerating}
              >
                🔄 Tạo lại tóm tắt
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: KHỐI "ƯU TIÊN" */}
          <div className="col-priority-recommend">
            <div className="panel-heading">
              <span>⚡ MỨC ĐỘ ƯU TIÊN</span>
            </div>

            <div className="priority-presentation">
              <div className="priority-badge-big">
                <span className="label-hint">Đề xuất thuật toán TPS:</span>
                <span className={`priority-value-display ${data.priority_color}`}>
                  Gợi ý: {data.ai_suggested_priority}
                </span>
                <span className="sla-commitment-text">
                  Điểm rủi ro: <strong>{data.ai_triage_score}/100</strong>
                </span>
                <span className="sla-commitment-text">
                  Cam kết hoàn thành: <strong>trong {data.sla_resolve_hours} giờ</strong>
                </span>
              </div>

              <div className="action-row">
                <button
                  type="button"
                  className="btn-view-reason"
                  onClick={() => setCurrentStep("SCREEN_2_EXPLAIN")}
                >
                  🔍 Xem lý do (Explainable AI)
                </button>
                <button
                  type="button"
                  style={{
                    background: "transparent",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    padding: "0.55rem",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                  onClick={onNavigateToSpatial}
                >
                  🌐 Quét vùng đệm cơ sở thiết yếu (STT 40)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MÀN 2/3: BẢNG GIẢI TRÌNH CĂN CỨ RA QUYẾT ĐỊNH CỦA THUẬT TOÁN AI (XAI)
          2 KHỐI THEO CHIỀU NGANG: PHÂN TÍCH (Trái) | QUYẾT ĐỊNH (Phải)
         ========================================================================= */}
      {currentStep === "SCREEN_2_EXPLAIN" && (
        <div className="triage-screen-2-grid">
          {/* CỘT TRÁI: KHỐI "PHÂN TÍCH" */}
          <div className="col-xai-analysis">
            <div className="panel-heading">
              <span>📊 BẢNG PHÂN TÍCH RỦI RO (XAI LOGIC)</span>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Mã: {data.tracking_code}
              </span>
            </div>

            <div className="risk-score-banner">
              <div className="banner-left">
                <div className="score-title">Điểm rủi ro tổng hợp (TPS)</div>
                <div className="score-number">{data.ai_triage_score}/100</div>
              </div>
              <div className="banner-right">Mức độ: {data.ai_suggested_priority}</div>
            </div>

            <div className="tps-breakdown-table">
              <div className="section-subtitle">
                Yếu tố tác động (Risk Factors) do AI & GIS phát hiện:
              </div>
              <div className="factors-list">
                {data.risk_factors && data.risk_factors.length > 0 ? (
                  data.risk_factors.map((factor, idx) => (
                    <div key={idx} className="factor-item">
                      <div className="factor-bullet" />
                      <span>{factor}</span>
                    </div>
                  ))
                ) : (
                  <div className="factor-item">
                    <span>Không phát hiện yếu tố rủi ro đặc biệt</span>
                  </div>
                )}
              </div>
            </div>

            <div className="score-formula-box">
              <div>
                <strong>Công thức chuẩn hóa TPS:</strong>
              </div>
              <div>
                min( 100, BaseSeverity × 0.40 + ProximityRisk × 0.30 + ScaleFactor × 0.20 + UrgencyNLP × 0.10 )
              </div>
              <div style={{ marginTop: "6px", color: "#10b981" }}>
                = ({data.base_severity_score} × 0.4) + ({data.proximity_risk_score} × 0.3) + ({data.scale_factor_score} × 0.2) + ({data.urgency_nlp_score} × 0.1) = <strong>{data.ai_triage_score} điểm</strong>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: KHỐI "QUYẾT ĐỊNH" */}
          <div className="col-xai-decision">
            <div className="panel-heading">
              <span>⚖️ QUYẾT ĐỊNH ĐIỀU PHỐI</span>
            </div>

            <div className="decision-recommend-card">
              <div className="card-tag">Đề xuất chính thức từ mô hình AI:</div>
              <div
                className="card-val"
                style={{
                  color:
                    data.priority_color === "red"
                      ? "#ef4444"
                      : data.priority_color === "orange"
                      ? "#f97316"
                      : data.priority_color === "yellow"
                      ? "#eab308"
                      : "#22c55e",
                }}
              >
                Gợi ý AI: {data.ai_suggested_priority}
              </div>
              <div className="sla-note">
                Thời hạn cam kết giải quyết (SLA):{" "}
                <strong>trong {data.sla_resolve_hours} giờ</strong>
              </div>
            </div>

            <div className="decision-actions">
              <button
                type="button"
                className="btn-accept"
                onClick={handleAcceptPriority}
                disabled={isSavingDecision}
              >
                {isSavingDecision ? "Đang xử lý…" : "✓ Chấp nhận đề xuất"}
              </button>

              <button
                type="button"
                className="btn-choose-other"
                onClick={() => setCurrentStep("SCREEN_3_OVERRIDE_POPUP")}
                disabled={isSavingDecision}
              >
                ✎ Chọn mức khác (Human-in-the-loop)
              </button>

              <button
                type="button"
                className="btn-back-screen1"
                onClick={() => setCurrentStep("SCREEN_1_SUMMARY")}
              >
                ← Quay lại xem chi tiết sự cố
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MÀN 3/3: POPUP TÙY CHỈNH & ĐIỀU CHỈNH MỨC ĐỘ ƯU TIÊN (HUMAN-IN-THE-LOOP)
          Hiển thị đè ở giữa màn hình, làm mờ nền phía sau (Backdrop Overlay)
         ========================================================================= */}
      {currentStep === "SCREEN_3_OVERRIDE_POPUP" && (
        <div className="triage-popup-overlay">
          <div className="triage-popup-dialog">
            <div className="popup-subtag">POPUP</div>
            <div className="popup-title">ĐỔI MỨC ƯU TIÊN?</div>

            <div className="popup-field-group">
              <label className="field-label">Mức thay đổi:</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Từ</span>
                <span
                  style={{
                    fontWeight: "bold",
                    color: "#f97316",
                    background: "rgba(249, 115, 22, 0.15)",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "4px",
                  }}
                >
                  {data.ai_suggested_priority}
                </span>
                <span style={{ color: "#94a3b8" }}>→</span>
                <select
                  className="priority-select-control"
                  style={{ width: "auto", flex: 1 }}
                  value={targetPriority}
                  onChange={(e) => setTargetPriority(e.target.value)}
                  disabled={isSavingDecision}
                >
                  <option value="Khẩn cấp">Khẩn cấp (SLA: 4 giờ)</option>
                  <option value="Cao">Cao (SLA: 12 giờ)</option>
                  <option value="Trung bình">Trung bình (SLA: 24 giờ)</option>
                  <option value="Thấp">Thấp (SLA: 48 giờ)</option>
                </select>
              </div>
            </div>

            <div className="popup-field-group">
              <label className="field-label">
                Ô Ghi chú (Lý do điều chỉnh bắt buộc):
              </label>
              <textarea
                className={`reason-textarea ${reasonError ? "has-error" : ""}`}
                placeholder="VD: Bãi rác chắn cổng trường học, cần điều xe dọn gấp trước giờ học sinh tan trường..."
                value={overrideReason}
                maxLength={200}
                onChange={(e) => {
                  setOverrideReason(e.target.value);
                  if (reasonError) setReasonError(null);
                }}
                disabled={isSavingDecision}
              />
              <div className="char-counter">{overrideReason.length}/200 ký tự</div>
              {reasonError && <div className="field-error-msg">⚠️ {reasonError}</div>}
            </div>

            <div className="popup-button-bar">
              <button
                type="button"
                className="btn-confirm"
                onClick={handleConfirmOverride}
                disabled={isSavingDecision}
              >
                {isSavingDecision ? "Đang lưu quyết định…" : "Xác nhận"}
              </button>

              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setReasonError(null);
                  setCurrentStep("SCREEN_2_EXPLAIN");
                }}
                disabled={isSavingDecision}
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
