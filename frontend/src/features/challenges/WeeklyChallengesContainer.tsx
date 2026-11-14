import React, { useState, useEffect } from "react";
import "./challenges.css";
import { challengesApi } from "./challengesApi";
import type {
  WeeklyChallengesData,
  ChallengeItem,
  ChallengeCompletionResult,
  AdminChallengeItem,
  ChallengeCreatePayload,
  ChallengeUpdatePayload,
  AdminSubmissionItem,
} from "./types";
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
  // Check login & role
  const isLoggedIn = !!localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  let userRole = "";
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
    const u = raw ? JSON.parse(raw) : null;
    userRole = u?.role || u?.role_code || "";
  } catch {}
  const isAdmin = userRole === "ADMIN";

  // Tab mode for Admin: "citizen" | "admin_manage" | "admin_review"
  const [activeViewTab, setActiveViewTab] = useState<"citizen" | "admin_manage" | "admin_review">("citizen");

  // ==========================================
  // CITIZEN STATE
  // ==========================================
  const [data, setData] = useState<WeeklyChallengesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Màn 2: Modal Nộp minh chứng
  const [activeModalChallenge, setActiveModalChallenge] = useState<ChallengeItem | null>(null);
  const [evidenceImage, setEvidenceImage] = useState<string>("");
  const [evidenceNote, setEvidenceNote] = useState<string>("");
  const [evidenceMeta, setEvidenceMeta] = useState<{
    fileName: string;
    originalKb: number;
    compressedKb: number;
    fingerprint: string;
  } | null>(null);
  const [isCommitted, setIsCommitted] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Màn 3: Popup Hoàn thành thử thách
  const [completionResult, setCompletionResult] = useState<ChallengeCompletionResult | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: any) => {
    const text = typeof msg === "string" ? msg : msg?.message || (msg ? JSON.stringify(msg) : "");
    setToastMsg(text);
    setTimeout(() => setToastMsg(null), 3000);
  };

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

  const computeQuickFingerprint = (str: string): string => {
    let h1 = 0xdeadbeef ^ str.length;
    let h2 = 0x41c6ce57 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0").toUpperCase() + (h1 >>> 0).toString(16).padStart(8, "0").toUpperCase();
  };

  const handleOpenSubmit = (ch: ChallengeItem) => {
    if (!isLoggedIn) {
      if (onNavigateToAuth) onNavigateToAuth();
      return;
    }
    setActiveModalChallenge(ch);
    setEvidenceImage(ch.evidence_image_url || "");
    setEvidenceNote(ch.evidence_note || "");
    setEvidenceMeta(null);
    setIsCommitted(true);
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
    const originalKb = Math.max(1, Math.round(file.size / 1024));
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
          const compressedKb = Math.max(1, Math.round((compressedDataUrl.length * 3) / 4 / 1024));
          const fp = computeQuickFingerprint(compressedDataUrl);
          setEvidenceImage(compressedDataUrl);
          setEvidenceMeta({
            fileName: file.name,
            originalKb,
            compressedKb,
            fingerprint: fp,
          });
        } else {
          const fp = computeQuickFingerprint(rawDataUrl);
          setEvidenceImage(rawDataUrl);
          setEvidenceMeta({
            fileName: file.name,
            originalKb,
            compressedKb: originalKb,
            fingerprint: fp,
          });
        }
      };
      img.onerror = () => {
        setEvidenceImage(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitEvidence = async () => {
    if (!activeModalChallenge) return;

    if (!evidenceImage || !evidenceImage.trim()) {
      setFormError("Vui lòng tải lên ảnh minh chứng hoàn thành nhiệm vụ");
      return;
    }

    if (!isCommitted) {
      setFormError("Vui lòng tích xác nhận cam kết minh chứng thực tế trước khi gửi");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await challengesApi.submitChallenge(activeModalChallenge.challenge_id, {
        evidence_image_url: evidenceImage,
        evidence_note: evidenceNote.trim() ? evidenceNote.trim() : undefined,
      });

      // Close modal
      setActiveModalChallenge(null);

      if (res.status === "COMPLETED") {
        setCompletionResult(res);
      } else {
        showToast(res.message || "Đã nộp minh chứng thành công. Cán bộ sẽ duyệt trong 24h!");
      }

      await fetchChallenges();
      if (isAdmin) fetchAdminSubmissions();
    } catch (err: any) {
      const raw = err.response?.data?.detail;
      const msg = typeof raw === "string" ? raw : raw?.message || "Không thể gửi minh chứng. Vui lòng thử lại";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // ADMIN: QUẢN TRỊ THỬ THÁCH (CRUD)
  // ==========================================
  const [adminChallenges, setAdminChallenges] = useState<AdminChallengeItem[]>([]);
  const [loadingAdminChallenges, setLoadingAdminChallenges] = useState<boolean>(false);
  const [challengeModalMode, setChallengeModalMode] = useState<"create" | "edit" | null>(null);
  const [editingChallenge, setEditingChallenge] = useState<AdminChallengeItem | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPoints, setFormPoints] = useState(30);
  const [formCategory, setFormCategory] = useState("DAILY_HABIT");
  const [formIcon, setFormIcon] = useState("leaf");
  const [formReq, setFormReq] = useState("");
  const [formAutoVerify, setFormAutoVerify] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOrderIndex, setFormOrderIndex] = useState(1);
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [challengeFormErr, setChallengeFormErr] = useState<string | null>(null);

  const fetchAdminChallenges = async () => {
    try {
      setLoadingAdminChallenges(true);
      const res = await challengesApi.adminGetAllChallenges();
      setAdminChallenges(res.challenges);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingAdminChallenges(false);
    }
  };

  const openCreateChallengeModal = () => {
    setEditingChallenge(null);
    setFormTitle("");
    setFormDesc("");
    setFormPoints(30);
    setFormCategory("DAILY_HABIT");
    setFormIcon("leaf");
    setFormReq("");
    setFormAutoVerify(false);
    setFormIsActive(true);
    setFormOrderIndex(adminChallenges.length + 1);
    setChallengeFormErr(null);
    setChallengeModalMode("create");
  };

  const openEditChallengeModal = (ch: AdminChallengeItem) => {
    setEditingChallenge(ch);
    setFormTitle(ch.title);
    setFormDesc(ch.description);
    setFormPoints(ch.points_reward);
    setFormCategory(ch.category);
    setFormIcon(ch.icon);
    setFormReq(ch.requirements);
    setFormAutoVerify(ch.is_auto_verify);
    setFormIsActive(ch.is_active);
    setFormOrderIndex(ch.order_index);
    setChallengeFormErr(null);
    setChallengeModalMode("edit");
  };

  const handleSaveChallenge = async () => {
    if (!formTitle.trim()) {
      setChallengeFormErr("Vui lòng nhập tiêu đề thử thách");
      return;
    }
    if (!formDesc.trim()) {
      setChallengeFormErr("Vui lòng nhập mô tả nhiệm vụ");
      return;
    }
    if (!formReq.trim()) {
      setChallengeFormErr("Vui lòng nhập yêu cầu minh chứng nộp");
      return;
    }

    try {
      setSavingChallenge(true);
      setChallengeFormErr(null);

      if (challengeModalMode === "create") {
        const payload: ChallengeCreatePayload = {
          title: formTitle.trim(),
          description: formDesc.trim(),
          points_reward: Number(formPoints),
          category: formCategory,
          icon: formIcon,
          requirements: formReq.trim(),
          is_auto_verify: formAutoVerify,
          is_active: formIsActive,
          order_index: Number(formOrderIndex),
        };
        await challengesApi.adminCreateChallenge(payload);
        showToast("Đã thêm mới thử thách xanh thành công!");
      } else if (challengeModalMode === "edit" && editingChallenge) {
        const payload: ChallengeUpdatePayload = {
          title: formTitle.trim(),
          description: formDesc.trim(),
          points_reward: Number(formPoints),
          category: formCategory,
          icon: formIcon,
          requirements: formReq.trim(),
          is_auto_verify: formAutoVerify,
          is_active: formIsActive,
          order_index: Number(formOrderIndex),
        };
        await challengesApi.adminUpdateChallenge(editingChallenge.challenge_id, payload);
        showToast("Đã cập nhật thử thách thành công!");
      }

      setChallengeModalMode(null);
      await fetchAdminChallenges();
      await fetchChallenges();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Lỗi lưu thử thách. Vui lòng thử lại";
      setChallengeFormErr(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSavingChallenge(false);
    }
  };

  const handleToggleActive = async (ch: AdminChallengeItem) => {
    try {
      const res = await challengesApi.adminToggleActive(ch.challenge_id);
      showToast(`Đã ${res.is_active ? "kích hoạt" : "ẩn"} thử thách: ${ch.title}`);
      await fetchAdminChallenges();
      await fetchChallenges();
    } catch (err: any) {
      showToast("Không thể đổi trạng thái thử thách");
    }
  };

  const handleDeleteChallenge = async (ch: AdminChallengeItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thử thách "${ch.title}"? Dữ liệu nộp của công dân có thể bị ảnh hưởng.`)) {
      return;
    }
    try {
      await challengesApi.adminDeleteChallenge(ch.challenge_id);
      showToast("Đã xóa thử thách thành công");
      await fetchAdminChallenges();
      await fetchChallenges();
    } catch (err: any) {
      showToast("Không thể xóa thử thách này");
    }
  };

  // ==========================================
  // ADMIN: DUYỆT MINH CHỨNG NỘP (WORKFLOW)
  // ==========================================
  const [adminSubmissions, setAdminSubmissions] = useState<AdminSubmissionItem[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);
  const [submissionFilterStatus, setSubmissionFilterStatus] = useState<string>("ALL");
  const [submissionSearch, setSubmissionSearch] = useState<string>("");
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Reject Modal
  const [rejectingSub, setRejectingSub] = useState<AdminSubmissionItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [isProcessingReview, setIsProcessingReview] = useState<boolean>(false);

  // Zoom Image Modal
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string; note?: string } | null>(null);

  const fetchAdminSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const res = await challengesApi.adminGetSubmissions({
        status: submissionFilterStatus !== "ALL" ? submissionFilterStatus : undefined,
        search: submissionSearch.trim() || undefined,
      });
      setAdminSubmissions(res.submissions);
      setPendingCount(res.pending_count);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminChallenges();
      fetchAdminSubmissions();
    }
  }, [isAdmin]);

  const handleReviewApprove = async (sub: AdminSubmissionItem) => {
    if (!window.confirm(`Xác nhận duyệt minh chứng của "${sub.user_name}"? Hệ thống sẽ cộng +${sub.points_reward} điểm xanh vào ví công dân.`)) {
      return;
    }
    try {
      setIsProcessingReview(true);
      const res = await challengesApi.adminReviewSubmission(sub.id, { action: "APPROVE" });
      showToast(res.message);
      await fetchAdminSubmissions();
      await fetchChallenges();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Lỗi khi duyệt minh chứng");
    } finally {
      setIsProcessingReview(false);
    }
  };

  const handleOpenRejectModal = (sub: AdminSubmissionItem) => {
    setRejectingSub(sub);
    setRejectReason("Ảnh minh chứng bị mờ, không nhìn rõ hành động hoặc không khớp nội dung thử thách");
  };

  const handleConfirmReject = async () => {
    if (!rejectingSub) return;
    if (!rejectReason.trim()) {
      showToast("Vui lòng nhập lý do từ chối để công dân biết và nộp lại");
      return;
    }
    try {
      setIsProcessingReview(true);
      const res = await challengesApi.adminReviewSubmission(rejectingSub.id, {
        action: "REJECT",
        rejection_reason: rejectReason.trim(),
      });
      showToast(res.message);
      setRejectingSub(null);
      await fetchAdminSubmissions();
      await fetchChallenges();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Lỗi khi từ chối minh chứng");
    } finally {
      setIsProcessingReview(false);
    }
  };

  return (
    <div className="challenges-page-container">
      {/* Toast Notification */}
      {toastMsg && <div className="challenge-toast">{toastMsg}</div>}

      {/* Header */}
      <div className="challenges-header">
        <div className="challenges-header-left">
          <h1>
            <span>🎯</span> Thử Thách Xanh Trong Tuần
          </h1>
          <p>
            {isAdmin
              ? "Cổng quản trị nhiệm vụ xanh, thiết lập điểm thưởng & hội đồng duyệt minh chứng công dân"
              : "Hoàn thành chuỗi nhiệm vụ sống xanh hàng tuần để tích lũy điểm thưởng và nâng hạng Công dân Xanh"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {onNavigateToWallet && (
            <button type="button" className="btn-wallet-shortcut" onClick={onNavigateToWallet}>
              <span>🌱</span> Ví Điểm Xanh
            </button>
          )}
          {onBackToHome && (
            <button type="button" className="back-home-btn" onClick={onBackToHome}>
              <span>←</span> Quay lại Bản đồ
            </button>
          )}
        </div>
      </div>

      {/* Guest Banner */}
      {!isLoggedIn && (
        <div className="guest-banner">
          <div className="guest-banner-text">
            👋 Chào bạn! Bạn đang xem danh sách thử thách ở chế độ khách. Hãy đăng nhập để hệ thống ghi nhận tiến độ nộp
            minh chứng và cộng điểm thưởng vào tài khoản của bạn.
          </div>
          <button type="button" className="guest-login-btn" onClick={onNavigateToAuth}>
            Đăng nhập ngay
          </button>
        </div>
      )}

      {/* ADMIN SEGMENTED TABS */}
      {isAdmin && (
        <div className="admin-view-nav">
          <button
            type="button"
            className={`admin-view-btn ${activeViewTab === "citizen" ? "active" : ""}`}
            onClick={() => setActiveViewTab("citizen")}
          >
            <span>🎯</span> Thử Thách Của Tôi (Giao diện Công Dân)
          </button>
          <button
            type="button"
            className={`admin-view-btn ${activeViewTab === "admin_manage" ? "active" : ""}`}
            onClick={() => {
              setActiveViewTab("admin_manage");
              fetchAdminChallenges();
            }}
          >
            <span>🛠️</span> Quản Trị Danh Mục Thử Thách
          </button>
          <button
            type="button"
            className={`admin-view-btn ${activeViewTab === "admin_review" ? "active" : ""}`}
            onClick={() => {
              setActiveViewTab("admin_review");
              fetchAdminSubmissions();
            }}
          >
            <span>📋</span> Duyệt Minh Chứng Nộp
            {pendingCount > 0 && <span className="pending-pill">{pendingCount} chờ duyệt</span>}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 1: GIAO DIỆN CÔNG DÂN (LÀM THỬ THÁCH)               */}
      {/* ======================================================== */}
      {activeViewTab === "citizen" && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <div style={{ fontSize: "16px", fontWeight: "600" }}>Đang tải danh sách thử thách tuần…</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ color: "#ef4444", marginBottom: "12px", fontSize: "15px" }}>⚠️ {error}</div>
              <button type="button" className="btn-secondary" onClick={fetchChallenges}>
                Thử lại
              </button>
            </div>
          ) : data ? (
            <div className="challenges-layout">
              {/* CỘT TRÁI: TIẾN ĐỘ & ĐỒNG HỒ */}
              <div className="challenges-sidebar">
                {/* Card 1: Chu kỳ tuần & Đồng hồ đếm ngược */}
                <div className="challenge-card countdown-card">
                  <div className="card-badge">Chu kỳ hiện tại</div>
                  <div className="week-label">Tuần {data.week_year}</div>
                  <div className="countdown-timer-box">
                    <div className="timer-icon">⏳</div>
                    <div className="timer-text">
                      <div className="timer-title">Thời gian còn lại:</div>
                      <div className="timer-countdown">{data.time_left_str}</div>
                    </div>
                  </div>
                  <div className="week-reset-hint">
                    Thử thách và thanh tiến độ sẽ được tự động làm mới vào 00:00 sáng Thứ Hai hàng tuần.
                  </div>
                </div>

                {/* Card 2: Thanh tiến độ hoàn thành */}
                <div className="challenge-card progress-card">
                  <div className="progress-header">
                    <span className="progress-title">Tiến Độ Tuần Này</span>
                    <span className="progress-fraction">
                      <strong>{data.completed_count}</strong> / {data.total_count}
                    </span>
                  </div>

                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${data.progress_percentage}%` }} />
                  </div>
                  <div className="progress-percentage-label">{data.progress_percentage}% hoàn thành</div>

                  {data.is_all_completed ? (
                    <div className="combo-complete-badge">
                      <span>🎉</span>
                      <div>
                        <strong>Xuất sắc!</strong> Bạn đã hoàn thành{" "}
                        <strong>
                          {data.completed_count}/{data.total_count}
                        </strong>{" "}
                        thử thách và nhận trọn bộ combo +{data.combo_reward_points} Điểm Xanh!
                      </div>
                    </div>
                  ) : (
                    <div className="combo-reward-hint">
                      <span className="gift-icon">🎁</span>
                      <div>
                        Hoàn thành đủ <strong>{data.total_count}/{data.total_count}</strong> thử thách tuần này để nhận
                        thưởng <strong>Combo +{data.combo_reward_points} Điểm Xanh</strong>!
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CỘT PHẢI: DANH SÁCH 5 THỬ THÁCH */}
              <div className="challenges-main-list">
                <div className="list-title-bar">
                  <h2>Nhiệm Vụ Sống Xanh Trong Tuần</h2>
                  <span className="list-count-badge">{data.challenges.length} nhiệm vụ</span>
                </div>

                <div className="challenges-grid">
                  {data.challenges.map((ch) => {
                    const isDone = ch.status === "COMPLETED";
                    const isPending = ch.status === "PENDING";
                    const isRejected = ch.status === "REJECTED";

                    return (
                      <div
                        key={ch.challenge_id}
                        className={`challenge-item-card ${isDone ? "is-done" : isPending ? "is-pending" : isRejected ? "is-rejected" : ""}`}
                      >
                        <div className="ch-card-header">
                          <div className="ch-icon-wrapper">
                            <span>
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
                                : ch.icon === "trash"
                                ? "🗑️"
                                : "🌱"}
                            </span>
                          </div>

                          <div className="ch-meta">
                            <span className="ch-category-pill">{ch.category}</span>
                            <span className="ch-points-pill">+{ch.points_reward} Điểm Xanh</span>
                            {ch.is_auto_verify ? (
                              <span
                                className="badge-tag-auto"
                                style={{ fontSize: "11px", padding: "3px 8px" }}
                                title="Hệ thống kiểm tra mã băm SHA-256 chống trùng ảnh và cộng điểm tức thì"
                              >
                                ⚡ Duyệt tự động (SHA-256)
                              </span>
                            ) : (
                              <span
                                className="badge-tag-manual"
                                style={{ fontSize: "11px", padding: "3px 8px" }}
                                title="Cán bộ môi trường kiểm tra hình ảnh minh chứng trong vòng 24h"
                              >
                                🛡️ Cán bộ hậu kiểm
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ch-card-body">
                          <h3 className="ch-title">{ch.title}</h3>
                          <p className="ch-desc">{ch.description}</p>

                          <div className="ch-requirements">
                            <div className="req-label">📌 Yêu cầu minh chứng:</div>
                            <div className="req-text">{ch.requirements}</div>
                          </div>

                          {/* REJECTION REASON BOX */}
                          {isRejected && ch.rejection_reason && (
                            <div className="ch-rejection-box">
                              <div className="rejection-title">❌ Minh chứng chưa được duyệt:</div>
                              <div className="rejection-desc">{ch.rejection_reason}</div>
                            </div>
                          )}
                        </div>

                        <div className="ch-card-footer">
                          {isDone ? (
                            <div className="status-badge-completed">
                              <span>✅</span> Đã hoàn thành (+{ch.points_reward}đ)
                            </div>
                          ) : isPending ? (
                            <div className="status-badge-pending">
                              <span>⏳</span> Đang chờ cán bộ duyệt minh chứng
                            </div>
                          ) : isRejected ? (
                            <button
                              type="button"
                              className="btn-submit-evidence btn-resubmit"
                              onClick={() => handleOpenSubmit(ch)}
                            >
                              <span>🔄</span> Nộp Lại Minh Chứng
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-submit-evidence"
                              onClick={() => handleOpenSubmit(ch)}
                            >
                              <span>📷</span> Nộp Minh Chứng
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: QUẢN TRỊ THỬ THÁCH (CRUD PHÍA ADMIN)             */}
      {/* ======================================================== */}
      {isAdmin && activeViewTab === "admin_manage" && (
        <div className="admin-section-container">
          <div className="admin-section-header">
            <div>
              <h2>Danh Mục Thử Thách Xanh Tuần (CMS)</h2>
              <p>Quản lý nội dung thử thách, số điểm thưởng, tiêu chí nộp ảnh và trạng thái kích hoạt</p>
            </div>
            <button type="button" className="btn-add-primary" onClick={openCreateChallengeModal}>
              <span>➕</span> Thêm Thử Thách Mới
            </button>
          </div>

          {loadingAdminChallenges ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Đang tải danh mục thử thách…</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Nhiệm Vụ</th>
                    <th>Nhóm & Điểm</th>
                    <th>Hình Thức Duyệt</th>
                    <th>Tham Gia / Hoàn Thành</th>
                    <th>Trạng Thái</th>
                    <th style={{ textAlign: "right" }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {adminChallenges.map((ch, idx) => (
                    <tr key={ch.challenge_id} className={!ch.is_active ? "row-inactive" : ""}>
                      <td style={{ fontWeight: "600", color: "#64748b" }}>{ch.order_index || idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                          {ch.icon === "recycle" ? "♻️ " : ch.icon === "camera" ? "📷 " : "🌱 "}
                          {ch.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", maxWidth: "340px", lineHeight: 1.4 }}>
                          {ch.description}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: "700", color: "#16a34a" }}>+{ch.points_reward} Điểm</div>
                        <span className="ch-category-pill" style={{ fontSize: "10px", marginTop: "4px" }}>
                          {ch.category}
                        </span>
                      </td>
                      <td>
                        {ch.is_auto_verify ? (
                          <span className="badge-tag-auto">⚡ Tự động duyệt</span>
                        ) : (
                          <span className="badge-tag-manual">👤 Cán bộ duyệt</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: "13px" }}>
                          <strong>{ch.completed_count}</strong> / {ch.participants_count} bài nộp
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`status-toggle-btn ${ch.is_active ? "active" : "inactive"}`}
                          onClick={() => handleToggleActive(ch)}
                          title="Bấm để bật/tắt kích hoạt"
                        >
                          {ch.is_active ? "Đang bật" : "Đã tắt"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn-icon-action btn-edit"
                            onClick={() => openEditChallengeModal(ch)}
                            title="Sửa thử thách"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            type="button"
                            className="btn-icon-action btn-delete"
                            onClick={() => handleDeleteChallenge(ch)}
                            title="Xóa thử thách"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: DUYỆT MINH CHỨNG NỘP (VERIFICATION WORKFLOW)     */}
      {/* ======================================================== */}
      {isAdmin && activeViewTab === "admin_review" && (
        <div className="admin-section-container">
          <div className="admin-section-header">
            <div>
              <h2>Hội Đồng Xét Duyệt Minh Chứng Nộp Của Công Dân</h2>
              <p>Xem xét hình ảnh bằng chứng công dân thực hiện thử thách và quyết định cộng điểm thưởng</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="btn-secondary" onClick={fetchAdminSubmissions}>
                🔄 Làm mới
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="admin-filter-bar">
            <div className="filter-group">
              <label>Trạng thái:</label>
              <select
                value={submissionFilterStatus}
                onChange={(e) => {
                  setSubmissionFilterStatus(e.target.value);
                  setTimeout(() => fetchAdminSubmissions(), 0);
                }}
              >
                <option value="ALL">Tất cả bài nộp</option>
                <option value="PENDING">Chờ duyệt ({pendingCount})</option>
                <option value="COMPLETED">Đã duyệt (Thành công)</option>
                <option value="REJECTED">Đã từ chối</option>
              </select>
            </div>

            <div className="filter-group" style={{ flex: 1 }}>
              <label>Tìm kiếm công dân:</label>
              <input
                type="text"
                placeholder="Gõ tên hoặc email người nộp..."
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchAdminSubmissions()}
              />
            </div>

            <button type="button" className="btn-secondary" onClick={fetchAdminSubmissions}>
              Lọc
            </button>
          </div>

          {loadingSubmissions ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Đang tải danh sách bài nộp…</div>
          ) : adminSubmissions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b", background: "#ffffff", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📭</div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>Không có bài nộp nào phù hợp</div>
              <p style={{ margin: "4px 0 0", fontSize: "13px" }}>Không tìm thấy bài nộp minh chứng nào với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <div className="submissions-grid">
              {adminSubmissions.map((sub) => {
                const isPending = sub.status === "PENDING";
                const isApproved = sub.status === "COMPLETED";
                const isRejected = sub.status === "REJECTED";

                return (
                  <div key={sub.id} className={`submission-card ${isPending ? "sub-pending" : ""}`}>
                    <div className="sub-card-header">
                      <div className="sub-user-info">
                        <div className="user-avatar">{sub.user_name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="user-fullname">{sub.user_name}</div>
                          <div className="user-email">{sub.user_email}</div>
                        </div>
                      </div>

                      <div className="sub-status-col">
                        {isPending && <span className="sub-badge badge-pending">Chờ duyệt ⏳</span>}
                        {isApproved && <span className="sub-badge badge-approved">Đã duyệt ✅</span>}
                        {isRejected && <span className="sub-badge badge-rejected">Từ chối ❌</span>}
                        <div className="sub-week-tag">Tuần {sub.week_year}</div>
                      </div>
                    </div>

                    <div className="sub-challenge-title">
                      <strong>Nhiệm vụ:</strong> {sub.challenge_title} (+{sub.points_reward}đ)
                    </div>

                    {sub.evidence_note && (
                      <div className="sub-note-box">
                        <strong>Ghi chú:</strong> "{sub.evidence_note}"
                      </div>
                    )}

                    {/* Image thumbnail with zoom trigger */}
                    {sub.evidence_image_url ? (
                      <div
                        className="sub-img-thumb-container"
                        onClick={() =>
                          setZoomedImage({
                            url: sub.evidence_image_url!,
                            title: `${sub.user_name} • ${sub.challenge_title}`,
                            note: sub.evidence_note || undefined,
                          })
                        }
                      >
                        <img src={sub.evidence_image_url} alt="Minh chứng" className="sub-img-thumb" />
                        <div className="thumb-zoom-overlay">
                          <span>🔍 Xem ảnh to</span>
                        </div>
                      </div>
                    ) : (
                      <div className="sub-no-img">Không có ảnh đính kèm</div>
                    )}

                    {sub.rejection_reason && (
                      <div className="sub-rejected-reason-box">
                        <strong>Lý do từ chối:</strong> {sub.rejection_reason}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="sub-card-actions">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            className="btn-review-approve"
                            onClick={() => handleReviewApprove(sub)}
                            disabled={isProcessingReview}
                          >
                            <span>✅</span> Duyệt (+{sub.points_reward}đ)
                          </button>
                          <button
                            type="button"
                            className="btn-review-reject"
                            onClick={() => handleOpenRejectModal(sub)}
                            disabled={isProcessingReview}
                          >
                            <span>❌</span> Từ chối
                          </button>
                        </>
                      ) : isApproved ? (
                        <div className="sub-finished-text text-green">
                          Đã cộng +{sub.points_reward} điểm vào ví công dân
                        </div>
                      ) : (
                        <div className="sub-finished-text text-red">
                          Đã gửi lý do từ chối, công dân có thể nộp lại
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL MÀN 2: NỘP MINH CHỨNG THỬ THÁCH (CÔNG DÂN)        */}
      {/* ======================================================== */}
      {activeModalChallenge && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="modal-header-left">
                <h3>Nộp Minh Chứng Thử Thách</h3>
                <div className="modal-ch-title">{activeModalChallenge.title}</div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModalChallenge(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Requirements reminder */}
              <div className="req-reminder-box">
                <div className="req-reminder-title">📌 Yêu cầu minh chứng:</div>
                <div className="req-reminder-content">{activeModalChallenge.requirements}</div>
              </div>

              {formError && <div className="modal-form-error">⚠️ {formError}</div>}

              {/* Upload image area */}
              <div className="form-group">
                <label className="form-label">
                  Ảnh minh chứng <span className="required-star">*</span>
                </label>
                <div className="upload-dropzone">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    id="challenge-file-input"
                    onChange={handleImageFileChange}
                    style={{ display: "none" }}
                  />
                  <label htmlFor="challenge-file-input" className="dropzone-label">
                    {evidenceImage ? (
                      <div className="preview-container">
                        <img src={evidenceImage} alt="Xem trước" className="image-preview" />
                        {evidenceMeta && (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              background: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              fontSize: "12px",
                              color: "#166534",
                              textAlign: "left",
                            }}
                          >
                            <div>
                              <strong>🛡️ Mã vân tay ảnh (Anti-Duplicate Hash):</strong>{" "}
                              <code style={{ fontWeight: 700 }}>#{evidenceMeta.fingerprint}</code>
                            </div>
                            <div style={{ marginTop: "2px", color: "#15803d" }}>
                              ⚡ Đã nén tối ưu Client-side: <strong>{evidenceMeta.originalKb} KB</strong> →{" "}
                              <strong>{evidenceMeta.compressedKb} KB</strong> (Giảm tải CSDL & kiểm tra chống nộp trùng)
                            </div>
                          </div>
                        )}
                        <div className="btn-change-image">Đổi ảnh khác</div>
                      </div>
                    ) : (
                      <div className="dropzone-placeholder">
                        <span className="upload-icon">📷</span>
                        <div className="upload-title">Chụp ảnh trực tiếp hoặc tải ảnh minh chứng rõ nét</div>
                        <div className="upload-hint">
                          Định dạng JPG, PNG (tối đa 5MB • Tự động nén tối ưu & băm SHA-256 chống nộp ảnh trùng)
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Note input */}
              <div className="form-group">
                <label className="form-label">
                  Ghi chú hoàn thành <span className="optional-text">(tùy chọn, tối đa 200 ký tự)</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  maxLength={200}
                  placeholder="Ví dụ: Đã đem 6 viên pin cũ đổi tại Trạm Xanh Phường Bến Nghé..."
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                />
                <div className="char-count">{evidenceNote.length}/200 ký tự</div>
              </div>

              {/* Cam kết minh chứng thực tế */}
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  color: "#334155",
                }}
              >
                <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isCommitted}
                    onChange={(e) => setIsCommitted(e.target.checked)}
                    style={{ marginTop: "3px" }}
                  />
                  <span>
                    <strong>Cam kết Công dân Xanh:</strong> Tôi xác nhận hình ảnh trên là minh chứng thực tế do chính tôi
                    thực hiện trong tuần này. Hệ thống tự động đối chiếu mã băm <code>SHA-256</code> chống nộp trùng ảnh và
                    ghi nhận vào Nhật ký Kiểm toán (Audit Log).
                  </span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setActiveModalChallenge(null)}
                disabled={isSubmitting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                onClick={handleSubmitEvidence}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang gửi..." : "Gửi Minh Chứng Hoàn Thành"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL MÀN 3: POPUP HOÀN THÀNH & CỘNG ĐIỂM (CÔNG DÂN)      */}
      {/* ======================================================== */}
      {completionResult && (
        <div className="modal-backdrop">
          <div className="modal-dialog completion-dialog">
            <div className="confetti-badge">🎉</div>
            <h2>Hoàn Thành Thử Thách!</h2>
            <div className="completion-ch-title">{completionResult.title}</div>

            <div className="points-awarded-card">
              <div className="points-number">+{completionResult.points_awarded}</div>
              <div className="points-label">Điểm Xanh Đã Được Cộng</div>
            </div>

            {completionResult.combo_awarded > 0 && (
              <div className="combo-awarded-banner">
                <span>🎁</span>
                <div>
                  Thưởng thêm <strong>+{completionResult.combo_awarded} Điểm Combo</strong> do hoàn thành toàn bộ nhiệm vụ
                  tuần!
                </div>
              </div>
            )}

            <div className="new-balance-hint">
              Số dư ví hiện tại: <strong>{completionResult.new_balance} Điểm Xanh</strong>
            </div>

            <div className="completion-actions">
              <button
                type="button"
                className="btn-modal-submit"
                onClick={() => setCompletionResult(null)}
              >
                Tiếp Tục
              </button>
              {onNavigateToWallet && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setCompletionResult(null);
                    onNavigateToWallet();
                  }}
                >
                  Xem Ví & Đổi Quà
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADMIN THÊM / SỬA THỬ THÁCH                        */}
      {/* ======================================================== */}
      {challengeModalMode && (
        <div className="modal-backdrop">
          <div className="modal-dialog admin-edit-dialog">
            <div className="modal-header">
              <h3>
                {challengeModalMode === "create" ? "➕ Thêm Thử Thách Mới" : "✏️ Chỉnh Sửa Thử Thách Xanh"}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setChallengeModalMode(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {challengeFormErr && <div className="modal-form-error">⚠️ {challengeFormErr}</div>}

              <div className="form-group">
                <label className="form-label">
                  Tiêu đề thử thách <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Phân loại rác tại nguồn, Ngày không túi nilon..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Mô tả chi tiết <span className="required-star">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Mô tả hành vi xanh cần thực hiện..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Điểm thưởng (Điểm Xanh):</label>
                  <input
                    type="number"
                    className="form-input"
                    min={5}
                    max={500}
                    value={formPoints}
                    onChange={(e) => setFormPoints(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Thứ tự hiển thị:</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    value={formOrderIndex}
                    onChange={(e) => setFormOrderIndex(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Nhóm nhiệm vụ:</label>
                  <select
                    className="form-input"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="DAILY_HABIT">Thói quen hàng ngày (DAILY_HABIT)</option>
                    <option value="WASTE_SORTING">Phân loại rác (WASTE_SORTING)</option>
                    <option value="HAZARDOUS">Rác nguy hại (HAZARDOUS)</option>
                    <option value="PLASTIC_FREE">Không đồ nhựa (PLASTIC_FREE)</option>
                    <option value="GREEN_MOBILITY">Di chuyển xanh (GREEN_MOBILITY)</option>
                    <option value="CIVIC_REPORT">Báo cáo đô thị (CIVIC_REPORT)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Biểu tượng (Icon):</label>
                  <select className="form-input" value={formIcon} onChange={(e) => setFormIcon(e.target.value)}>
                    <option value="leaf">🌱 Chiếc lá</option>
                    <option value="recycle">♻️ Tái chế</option>
                    <option value="battery-charging">🔋 Thu hồi pin</option>
                    <option value="shopping-bag">🛍️ Túi vải</option>
                    <option value="bike">🚲 Xe đạp</option>
                    <option value="camera">📷 Máy ảnh</option>
                    <option value="trash">🗑️ Thùng rác</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Yêu cầu minh chứng nộp ảnh <span className="required-star">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Ví dụ: Chụp ảnh rõ nét túi rác phân loại, hoặc ảnh xe đạp..."
                  value={formReq}
                  onChange={(e) => setFormReq(e.target.value)}
                />
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formAutoVerify}
                    onChange={(e) => setFormAutoVerify(e.target.checked)}
                  />
                  <span>
                    <strong>⚡ Tự động duyệt ngay:</strong> Cộng điểm tức thì khi công dân nộp ảnh hợp lệ
                  </span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <span>
                    <strong>Kích hoạt:</strong> Hiển thị thử thách này cho toàn bộ công dân trong tuần
                  </span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setChallengeModalMode(null)}
                disabled={savingChallenge}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                onClick={handleSaveChallenge}
                disabled={savingChallenge}
              >
                {savingChallenge ? "Đang lưu..." : "Lưu Thử Thách"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADMIN TỪ CHỐI MINH CHỨNG (KÈM LÝ DO)               */}
      {/* ======================================================== */}
      {rejectingSub && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>❌ Từ Chối Minh Chứng Của Công Dân</h3>
              <button type="button" className="modal-close-btn" onClick={() => setRejectingSub(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: "14px", fontSize: "14px", color: "#334155" }}>
                Người nộp: <strong>{rejectingSub.user_name}</strong> ({rejectingSub.user_email})<br />
                Thử thách: <strong>{rejectingSub.challenge_title}</strong>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Lý do từ chối <span className="required-star">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do cụ thể để công dân biết nguyên nhân và nộp lại..."
                />
              </div>

              <div style={{ fontSize: "12px", color: "#64748b" }}>
                💡 Thông báo từ chối này sẽ xuất hiện trên màn hình thử thách của công dân kèm nút "Nộp lại minh chứng".
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setRejectingSub(null)}
                disabled={isProcessingReview}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-modal-reject-confirm"
                onClick={handleConfirmReject}
                disabled={isProcessingReview}
              >
                {isProcessingReview ? "Đang xử lý..." : "Xác Nhận Từ Chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ZOOM XEM ẢNH MINH CHỨNG                            */}
      {/* ======================================================== */}
      {zoomedImage && (
        <div className="modal-backdrop" onClick={() => setZoomedImage(null)}>
          <div className="modal-dialog image-zoom-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: "700", color: "#0f172a" }}>{zoomedImage.title}</div>
              <button type="button" className="modal-close-btn" onClick={() => setZoomedImage(null)}>
                ✕
              </button>
            </div>
            <div className="zoom-body">
              <img src={zoomedImage.url} alt="Minh chứng chi tiết" className="zoomed-img" />
              {zoomedImage.note && <div className="zoom-caption">"{zoomedImage.note}"</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
