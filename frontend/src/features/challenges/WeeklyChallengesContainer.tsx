import React, { useState, useEffect } from "react";
import "./challenges.css";
import { challengesApi } from "./challengesApi";
import type { WeeklyChallengesData, ChallengeItem, ChallengeCompletionResult } from "./types";
import { AUTH_STORAGE_KEYS } from "../auth";

interface WeeklyChallengesProps {
  onBackToHome?: () => void;
  onNavigateToAuth?: () => void;
  onNavigateToWallet?: () => void;
}

export const WeeklyChallengesContainer: React.FC<WeeklyChallengesProps> = ({
  onBackToHome,
  onNavigateToAuth,
  onNavigateToWallet,
}) => {
  const [data, setData] = useState<WeeklyChallengesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Màn 2: Modal Nộp minh chứng
  const [activeModalChallenge, setActiveModalChallenge] = useState<ChallengeItem | null>(null);
  const [evidenceImage, setEvidenceImage] = useState<string>("");
  const [evidenceNote, setEvidenceNote] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Màn 3: Popup Hoàn thành thử thách
  const [completionResult, setCompletionResult] = useState<ChallengeCompletionResult | null>(null);

  // Check login
  const isLoggedIn = !!localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await challengesApi.getWeeklyChallenges();
      setData(res);
    } catch (err: any) {
      setError("Không thể tải danh sách thử thách. Vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const handleOpenSubmit = (ch: ChallengeItem) => {
    if (!isLoggedIn) {
      if (onNavigateToAuth) onNavigateToAuth();
      return;
    }
    setActiveModalChallenge(ch);
    setEvidenceImage(ch.evidence_image_url || "");
    setEvidenceNote(ch.evidence_note || "");
    setFormError(null);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      setFormError("Ảnh không hợp lệ (chỉ nhận JPG, PNG, tối đa 5MB)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Ảnh không hợp lệ (chỉ nhận JPG, PNG, tối đa 5MB)");
      return;
    }

    setFormError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setEvidenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitEvidence = async () => {
    if (!activeModalChallenge) return;

    if (!evidenceImage || !evidenceImage.trim()) {
      setFormError("Vui lòng tải lên ảnh minh chứng hoàn thành nhiệm vụ");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await challengesApi.submitChallenge(activeModalChallenge.challenge_id, {
        evidence_image_url: evidenceImage,
        evidence_note: evidenceNote.trim() ? evidenceNote.trim() : undefined,
      });

      // Close Màn 2
      setActiveModalChallenge(null);

      // Open Màn 3 nếu hoàn thành
      if (res.status === "COMPLETED") {
        setCompletionResult(res);
      } else {
        alert(res.message || "Đã nộp minh chứng. Kết quả sẽ được duyệt trong vòng 24h");
      }

      // Refresh list
      await fetchChallenges();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Không thể gửi minh chứng. Vui lòng thử lại";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="challenges-page-container">
      {/* Header */}
      <div className="challenges-header">
        <div className="challenges-header-left">
          <h1>
            <span>🎯</span> Thử Thách Xanh Trong Tuần
          </h1>
          <p>Hoàn thành chuỗi nhiệm vụ sống xanh hàng tuần để tích lũy điểm thưởng và nâng hạng Công dân Xanh</p>
        </div>
        {onBackToHome && (
          <button type="button" className="back-home-btn" onClick={onBackToHome}>
            <span>←</span> Quay lại Bản đồ
          </button>
        )}
      </div>

      {/* Guest Banner */}
      {!isLoggedIn && (
        <div className="guest-banner">
          <div className="guest-banner-text">
            ⚠️ <strong>Chưa đăng nhập:</strong> Đăng nhập để hệ thống ghi nhận tiến độ tuần và cộng điểm thưởng vào ví cá nhân của bạn!
          </div>
          {onNavigateToAuth && (
            <button type="button" className="guest-login-btn" onClick={onNavigateToAuth}>
              Đăng nhập ngay
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <div>Đang tải danh sách thử thách…</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ color: "#ef4444", marginBottom: "12px" }}>{error}</div>
          <button type="button" className="btn-secondary" onClick={fetchChallenges}>
            Thử lại
          </button>
        </div>
      ) : data ? (
        <div className="challenges-layout">
          {/* CỘT TRÁI: TUẦN NÀY */}
          <div className="week-summary-card">
            <div className="week-title-badge">
              <span className="week-code">{data.week_year}</span>
              <span className="countdown-badge">
                <span>⏱️</span> {data.time_left_str}
              </span>
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <span className="progress-label">Tiến độ tuần</span>
                <span className="progress-count">
                  {data.completed_count}/{data.total_count} nhiệm vụ
                </span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${data.progress_percentage}%` }} />
              </div>
            </div>

            <div className="combo-reward-box">
              <div className="combo-icon">🎁</div>
              <div className="combo-title">Phần Thưởng Combo Tuần</div>
              <div className="combo-desc">
                Hoàn thành toàn bộ 5/5 nhiệm vụ để nhận thêm phần thưởng đặc biệt vào ví!
              </div>
              <div className="combo-tag">+{data.combo_reward_points} Điểm Xanh</div>
            </div>

            {data.is_all_completed && (
              <div style={{ background: "#dcfce7", color: "#166534", padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", textAlign: "center" }}>
                🎉 Xuất sắc! Bạn đã hoàn thành toàn bộ thử thách tuần này!
              </div>
            )}
          </div>

          {/* CỘT PHẢI: NHIỆM VỤ */}
          <div className="tasks-container">
            {data.challenges.map((ch) => {
              const isDone = ch.status === "COMPLETED";
              const isPending = ch.status === "PENDING";

              return (
                <div key={ch.challenge_id} className={`task-card ${isDone ? "completed" : ""}`}>
                  <div className="task-left">
                    <div className="task-icon-circle">
                      {ch.icon === "recycle"
                        ? "♻️"
                        : ch.icon === "battery-charging"
                        ? "🔋"
                        : ch.icon === "camera"
                        ? "📷"
                        : ch.icon === "shopping-bag"
                        ? "🛍️"
                        : ch.icon === "bike"
                        ? "🚲"
                        : "🌱"}
                    </div>
                    <div className="task-info">
                      <h3>{ch.title}</h3>
                      <p>{ch.description}</p>
                      <div className="task-meta">
                        <span className="points-pill">+{ch.points_reward} Điểm Xanh</span>
                        <span
                          className={`status-badge ${
                            isDone ? "completed" : isPending ? "pending" : "not-started"
                          }`}
                        >
                          {isDone ? "✓ Đã xong" : isPending ? "⏳ Chờ duyệt" : "Chưa làm"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isDone ? (
                      <button type="button" className="task-action-btn btn-completed-check">
                        ✓ Đã nhận thưởng
                      </button>
                    ) : isPending ? (
                      <button
                        type="button"
                        className="task-action-btn btn-view-evidence"
                        onClick={() => handleOpenSubmit(ch)}
                      >
                        Xem minh chứng
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="task-action-btn btn-open-submit"
                        onClick={() => handleOpenSubmit(ch)}
                      >
                        Nộp minh chứng
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* MÀN 2: MODAL HƯỚNG DẪN & BIỂU MẪU NỘP MINH CHỨNG */}
      {activeModalChallenge && (
        <div className="modal-overlay">
          <div className="evidence-modal">
            <div className="modal-header">
              <h2>Nộp Minh Chứng Thử Thách</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModalChallenge(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body-two-cols">
              {/* CỘT TRÁI: MÔ TẢ YÊU CẦU */}
              <div className="col-description">
                <div className="desc-title">{activeModalChallenge.title}</div>
                <div className="desc-req-title">Yêu cầu hoàn thành:</div>
                <div className="desc-req-content">{activeModalChallenge.requirements}</div>

                <div className="desc-reward-card">
                  <span>Phần thưởng khi hoàn tất:</span>
                  <strong>+{activeModalChallenge.points_reward} Điểm Xanh</strong>
                </div>
              </div>

              {/* CỘT PHẢI: MINH CHỨNG */}
              <div className="col-evidence-form">
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                  Ảnh minh chứng (Bắt buộc):
                </label>

                <div
                  className={`image-upload-box ${formError && !evidenceImage ? "has-error" : ""}`}
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                >
                  {evidenceImage ? (
                    <div>
                      <img src={evidenceImage} alt="Preview" className="image-preview" />
                      <div className="upload-hint">Nhấp vào để chọn ảnh khác</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "36px", marginBottom: "8px" }}>📷</div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                        Bấm để tải ảnh lên hoặc chụp trực tiếp
                      </div>
                      <div className="upload-hint">Định dạng JPG, PNG • Tối đa 5MB</div>
                    </div>
                  )}
                  <input
                    id="file-upload-input"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    style={{ display: "none" }}
                    onChange={handleImageFileChange}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155", display: "block", marginBottom: "6px" }}>
                    Ghi chú hành vi (Tùy chọn, tối đa 200 ký tự):
                  </label>
                  <textarea
                    className="evidence-note-textarea"
                    placeholder="VD: Đã đem 5 viên pin cũ bàn giao tại trạm thu gom..."
                    maxLength={200}
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                  />
                  <div className="char-counter">{evidenceNote.length}/200 ký tự</div>
                </div>

                {formError && <div className="validation-error-msg">⚠️ {formError}</div>}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={isSubmitting}
                onClick={() => setActiveModalChallenge(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary-submit"
                disabled={isSubmitting || activeModalChallenge.status === "COMPLETED"}
                onClick={handleSubmitEvidence}
              >
                {isSubmitting ? "Đang nộp minh chứng…" : "Nộp nhiệm vụ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÀN 3: POPUP CHÚC MỪNG HOÀN THÀNH THỬ THÁCH */}
      {completionResult && (
        <div className="modal-overlay">
          <div className="success-popup-card">
            <div className="popup-tag-small">POPUP</div>
            <div className="popup-trophy-icon">🏆</div>
            <h2 className="popup-title">HOÀN THÀNH THỬ THÁCH</h2>

            <div className="popup-points-badge">+{completionResult.points_awarded} điểm xanh</div>

            {completionResult.combo_awarded > 0 && (
              <div className="popup-combo-text">
                🎁 Thưởng Combo hoàn thành tuần: +{completionResult.combo_awarded} điểm!
              </div>
            )}

            <div className="popup-desc">
              Điểm thưởng đã được cộng ngay vào ví điểm cá nhân của bạn. Tiếp tục hoàn thành các thử thách khác trong tuần nhé!
            </div>

            <div className="popup-actions">
              {onNavigateToWallet && (
                <button
                  type="button"
                  className="btn-view-wallet"
                  onClick={() => {
                    setCompletionResult(null);
                    onNavigateToWallet();
                  }}
                >
                  Xem ví điểm
                </button>
              )}
              <button
                type="button"
                className="btn-close-popup"
                onClick={() => setCompletionResult(null)}
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
