import React, { useState } from "react";
import type { PublicIncidentDetail } from "./types";
import { trackingApi } from "./services/trackingApi";

export const PublicTrackingContainer: React.FC = () => {
  const [trackingCodeInput, setTrackingCodeInput] = useState("");
  const [incident, setIncident] = useState<PublicIncidentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form đăng ký nhận tin
  const [contactType, setContactType] = useState<"EMAIL" | "PHONE">("EMAIL");
  const [contactValue, setContactValue] = useState("");
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);

  // Form kiểm chứng cộng đồng
  const [verifComment, setVerifComment] = useState("");
  const [verifSuccess, setVerifSuccess] = useState(false);

  // Chế độ xem ảnh Before & After (CN 30 Slider / View Mode)
  const [imgViewMode, setImgViewMode] = useState<"SIDE_BY_SIDE" | "BEFORE_ONLY" | "AFTER_ONLY">("SIDE_BY_SIDE");
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const handleSearch = async (codeToSearch?: string) => {
    const code = (codeToSearch || trackingCodeInput).trim().toUpperCase();
    if (!code) {
      setErrorMsg("TRK_001: Vui lòng nhập mã theo dõi sự cố cần tra cứu.");
      return;
    }
    if (!/^INC-[A-Za-z0-9_-]{3,30}$/i.test(code)) {
      setErrorMsg("TRK_002: Mã sự cố không đúng định dạng chuẩn (Ví dụ đúng: INC-2026-0042).");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const data = await trackingApi.trackIncident(code);
      setIncident(data);
      setSubscribeSuccess(false);
      setVerifSuccess(false);
    } catch (err: any) {
      setIncident(null);
      setErrorMsg(err.response?.data?.detail || "Không tìm thấy hồ sơ sự cố tương ứng với mã đã nhập.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !contactValue) return;
    try {
      await trackingApi.subscribeUpdates({
        tracking_code: incident.tracking_code,
        contact_type: contactType,
        contact_value: contactValue,
      });
      setSubscribeSuccess(true);
      setContactValue("");
    } catch (err: any) {
      alert("Lỗi đăng ký: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleVerifySubmit = async (isClean: boolean) => {
    if (!incident) return;
    try {
      await trackingApi.verifyCleanliness({
        tracking_code: incident.tracking_code,
        is_clean_confirmed: isClean,
        comment: verifComment,
      });
      setVerifSuccess(true);
      setVerifComment("");
      // Cập nhật lại số liệu
      const updated = await trackingApi.trackIncident(incident.tracking_code);
      setIncident(updated);
    } catch (err: any) {
      alert("Lỗi kiểm chứng: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "30px 20px", color: "#F8FAFC" }}>
      {/* Banner giới thiệu */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "36px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          padding: "36px 20px",
          borderRadius: "20px",
          border: "1px solid #334155",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "inline-block", background: "#0284C7", color: "#FFF", padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, marginBottom: "12px" }}>
          CỔNG THÔNG TIN MINH BẠCH DÂN SINH • KHÔNG CẦN ĐĂNG NHẬP
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "0 0 10px", color: "#38BDF8" }}>
          🔍 Tra Cứu Công Khai Tiến Độ Xử Lý Sự Cố Môi Trường (CN 30)
        </h1>
        <p style={{ margin: "0 auto", maxWidth: "680px", color: "#94A3B8", fontSize: "14px", lineHeight: 1.6 }}>
          Nhập mã theo dõi biên nhận để kiểm tra minh bạch toàn bộ quy trình: tiếp nhận, cơ quan phân công, tiến độ thực tế, thời hạn cam kết SLA và hình ảnh đối chứng Before/After.
        </p>

        {/* Thanh tìm kiếm lớn */}
        <div
          style={{
            maxWidth: "680px",
            margin: "24px auto 12px",
            display: "flex",
            gap: "10px",
          }}
        >
          <input
            id="TRK_TXT_CODE"
            type="text"
            placeholder="Nhập mã sự cố (Ví dụ: INC-2026-0042)..."
            value={trackingCodeInput}
            onChange={(e) => setTrackingCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{
              flex: 1,
              background: "#0B1120",
              border: "2px solid #38BDF8",
              borderRadius: "10px",
              padding: "14px 18px",
              color: "#FFF",
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "0.5px",
              boxSizing: "border-box",
            }}
          />
          <button
            id="TRK_BTN_SEARCH"
            type="button"
            onClick={() => handleSearch()}
            disabled={loading}
            style={{
              background: "#0284C7",
              color: "#FFF",
              border: "none",
              borderRadius: "10px",
              padding: "0 28px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.2s",
              boxShadow: "0 4px 12px rgba(2,132,199,0.3)",
            }}
          >
            {loading ? "Đang tra cứu..." : "Tra Cứu"}
          </button>

          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            style={{
              background: "#1E293B",
              color: "#38BDF8",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "0 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Quét mã QR tra cứu biên nhận sự cố"
          >
            <span>📷</span> Mã QR
          </button>
        </div>

        {/* Gợi ý mã mẫu */}
        <div style={{ fontSize: "12px", color: "#64748B" }}>
          Mã thử nghiệm nhanh:{" "}
          <span
            onClick={() => {
              setTrackingCodeInput("INC-2026-0042");
              handleSearch("INC-2026-0042");
            }}
            style={{ color: "#38BDF8", cursor: "pointer", textDecoration: "underline", marginRight: "12px" }}
          >
            INC-2026-0042
          </span>
          <span
            onClick={() => {
              setTrackingCodeInput("INC-2026-TEST");
              handleSearch("INC-2026-TEST");
            }}
            style={{ color: "#38BDF8", cursor: "pointer", textDecoration: "underline" }}
          >
            INC-2026-TEST
          </span>
        </div>
      </div>

      {/* Thông báo lỗi */}
      {errorMsg && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #EF4444",
            color: "#FCA5A5",
            padding: "16px 20px",
            borderRadius: "12px",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* KẾT QUẢ TRA CỨU HỒ SƠ */}
      {incident && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Card 1: Tổng quan hồ sơ & Cam kết SLA */}
          <div
            style={{
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ background: "#0284C7", color: "#FFF", padding: "4px 10px", borderRadius: "6px", fontFamily: "monospace", fontWeight: 700, fontSize: "14px" }}>
                    {incident.tracking_code}
                  </span>
                  <span style={{ background: "#334155", color: "#E2E8F0", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                    {incident.category_name}
                  </span>
                  {incident.is_sla_met !== null && (
                    <span style={{ background: incident.is_sla_met ? "#065F46" : "#991B1B", color: "#FFF", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                      {incident.is_sla_met ? "✓ ĐÚNG HẠN CAM KẾT SLA" : "⚠️ QUÁ HẠN SLA"}
                    </span>
                  )}
                </div>
                <h2 style={{ margin: 0, fontSize: "20px", color: "#F8FAFC" }}>{incident.title}</h2>
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    background: incident.status === "RESOLVED" || incident.status === "CLOSED" ? "#10B981" : "#F59E0B",
                    color: "#FFF",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "13px",
                    textTransform: "uppercase",
                  }}
                >
                  {incident.status === "RESOLVED" ? "ĐÃ XỬ LÝ HOÀN TẤT" : incident.status}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", background: "#0F172A", padding: "16px", borderRadius: "10px", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>📍 Địa chỉ hiện trường:</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#E2E8F0" }}>{incident.address_text}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>📅 Thời điểm gửi phản ánh:</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#E2E8F0" }}>
                  {new Date(incident.reported_at).toLocaleString("vi-VN")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>👤 Người báo (Bảo mật thông tin):</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#E2E8F0" }}>
                  {incident.reporter_phone_masked || "Công dân ẩn danh"}
                </div>
              </div>
            </div>

            <p style={{ fontSize: "14px", color: "#CBD5E1", lineHeight: 1.6, margin: 0 }}>
              {incident.description}
            </p>
          </div>

          {/* Card 2: Thước tiến trình thời gian trực quan (Timeline Stepper) */}
          <div
            id="TRK_STEP_TIMELINE"
            style={{
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <h3 style={{ margin: "0 0 20px", fontSize: "16px", color: "#38BDF8" }}>
              ⏱️ Lộ Trình Tiến Trình Xử Lý Thực Tế (Timeline Stepper)
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", position: "relative" }}>
              {incident.timeline.map((step, idx) => {
                const isDone = step.is_completed;
                const isCur = step.is_current;
                const stepColor = isDone ? "#10B981" : isCur ? "#38BDF8" : "#475569";

                return (
                  <div
                    key={step.step_key}
                    style={{
                      background: isCur ? "rgba(56, 189, 248, 0.08)" : "#0F172A",
                      border: `2px solid ${stepColor}`,
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span
                          style={{
                            background: stepColor,
                            color: "#FFF",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {isDone ? "✓" : idx + 1}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "13px", color: isDone ? "#10B981" : isCur ? "#38BDF8" : "#94A3B8" }}>
                          {step.title}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#CBD5E1", lineHeight: 1.4 }}>
                        {step.description}
                      </div>
                    </div>

                    {step.timestamp && (
                      <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748B" }}>
                        🕒 {new Date(step.timestamp).toLocaleString("vi-VN")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Khung đối chứng ảnh Trước vs Sau (Before & After Images) */}
          <div
            id="TRK_IMG_BEFORE_AFTER"
            style={{
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#38BDF8" }}>
                📸 Minh Chứng Hiện Trường Đối Chiếu (Before & After)
              </h3>

              {/* Chế độ xem ảnh */}
              <div style={{ display: "flex", gap: "6px", background: "#0F172A", padding: "4px", borderRadius: "8px", border: "1px solid #334155" }}>
                <button
                  type="button"
                  onClick={() => setImgViewMode("SIDE_BY_SIDE")}
                  style={{
                    background: imgViewMode === "SIDE_BY_SIDE" ? "#0284C7" : "transparent",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🔄 Song Song
                </button>
                <button
                  type="button"
                  onClick={() => setImgViewMode("BEFORE_ONLY")}
                  style={{
                    background: imgViewMode === "BEFORE_ONLY" ? "#DC2626" : "transparent",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🔴 Trước Dọn Rác
                </button>
                <button
                  type="button"
                  onClick={() => setImgViewMode("AFTER_ONLY")}
                  style={{
                    background: imgViewMode === "AFTER_ONLY" ? "#059669" : "transparent",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🟢 Nghiệm Thu
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: imgViewMode === "SIDE_BY_SIDE" ? "1fr 1fr" : "1fr",
                gap: "20px",
              }}
            >
              {/* Ảnh Before */}
              {(imgViewMode === "SIDE_BY_SIDE" || imgViewMode === "BEFORE_ONLY") && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <span style={{ background: "#DC2626", color: "#FFF", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                      TRƯỚC KHI DỌN (BEFORE)
                    </span>
                  </div>
                  <div style={{ borderRadius: "10px", overflow: "hidden", height: "280px", background: "#0F172A", border: "1px solid #334155" }}>
                    <img
                      src={incident.before_images[0]}
                      alt="Hiện trường lúc phản ánh"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                </div>
              )}

              {/* Ảnh After */}
              {(imgViewMode === "SIDE_BY_SIDE" || imgViewMode === "AFTER_ONLY") && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <span style={{ background: "#10B981", color: "#FFF", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                      SAU KHI DỌN SẠCH (AFTER)
                    </span>
                  </div>
                  <div style={{ borderRadius: "10px", overflow: "hidden", height: "280px", background: "#0F172A", border: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {incident.after_images.length > 0 ? (
                      <img
                        src={incident.after_images[0]}
                        alt="Hiện trường sau nghiệm thu"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ textAlign: "center", color: "#64748B", padding: "20px" }}>
                        ⏳ Đang trong quá trình thu dọn hiện trường. Ảnh nghiệm thu After sẽ được cập nhật ngay khi hoàn tất.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Phản hồi từ chính quyền */}
            {incident.official_feedback && (
              <div
                id="TRK_BOX_RESPONSE"
                style={{
                  marginTop: "20px",
                  background: "rgba(2, 132, 199, 0.08)",
                  borderLeft: "4px solid #0284C7",
                  padding: "14px 18px",
                  borderRadius: "0 8px 8px 0",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#38BDF8", marginBottom: "4px" }}>
                  🏛️ PHẢN HỒI CHÍNH THỨC TỪ CƠ QUAN QUẢN LÝ ĐÔ THỊ:
                </div>
                <div style={{ fontSize: "13px", color: "#E2E8F0", lineHeight: 1.5 }}>
                  {incident.official_feedback}
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Tương tác 2 chiều dành cho người dân (Subscribe & Double-check) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* 1. Đăng ký nhận cập nhật */}
            <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "16px", padding: "20px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "15px", color: "#F8FAFC" }}>
                🔔 Đăng Ký Nhận Thông Báo Cập Nhật Tiến Độ
              </h4>
              <p style={{ fontSize: "12px", color: "#94A3B8", margin: "0 0 14px", lineHeight: 1.5 }}>
                Không cần vào tra cứu mỗi ngày. Hệ thống sẽ tự động gửi email hoặc tin nhắn khi sự cố này chuyển sang bước tiếp theo.
              </p>

              {subscribeSuccess ? (
                <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10B981", color: "#6EE7B7", padding: "12px", borderRadius: "8px", fontSize: "13px" }}>
                  ✓ Đã đăng ký nhận tin thành công! Bạn sẽ nhận được thông báo ngay khi hồ sơ này có chuyển biến mới.
                </div>
              ) : (
                <form onSubmit={handleSubscribeSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <label style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="radio"
                        name="ctype"
                        checked={contactType === "EMAIL"}
                        onChange={() => setContactType("EMAIL")}
                      />
                      Qua Email
                    </label>
                    <label style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="radio"
                        name="ctype"
                        checked={contactType === "PHONE"}
                        onChange={() => setContactType("PHONE")}
                      />
                      Qua Số Điện Thoại
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type={contactType === "EMAIL" ? "email" : "tel"}
                      required
                      placeholder={contactType === "EMAIL" ? "Nhập địa chỉ email của bạn..." : "Nhập số điện thoại..."}
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                      style={{
                        flex: 1,
                        background: "#0F172A",
                        border: "1px solid #334155",
                        color: "#FFF",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "13px",
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: "#0284C7",
                        color: "#FFF",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 16px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Đăng Ký
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* 2. Kiểm chứng cộng đồng (Citizen Double-Check) */}
            <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "16px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, fontSize: "15px", color: "#F8FAFC" }}>
                  👥 Cộng Đồng Kiểm Chứng Hiện Trường
                </h4>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                  👍 {incident.verification_stats.clean_count} sạch • 👎 {incident.verification_stats.dirty_count} chưa sạch
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "#94A3B8", margin: "0 0 14px", lineHeight: 1.5 }}>
                Bạn đang sinh sống gần đây? Hãy bấm xác nhận hiện trường sau dọn dẹp để giúp chính quyền đánh giá đúng thực tế.
              </p>

              {verifSuccess ? (
                <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10B981", color: "#6EE7B7", padding: "12px", borderRadius: "8px", fontSize: "13px" }}>
                  ✓ Cảm ơn bạn đã đóng góp ý kiến kiểm chứng hiện trường vì môi trường đô thị văn minh!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input
                    type="text"
                    placeholder="Ý kiến ngắn (VD: Đã dọn rất sạch, có rắc vôi...)"
                    value={verifComment}
                    onChange={(e) => setVerifComment(e.target.value)}
                    style={{
                      background: "#0F172A",
                      border: "1px solid #334155",
                      color: "#FFF",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => handleVerifySubmit(true)}
                      style={{
                        flex: 1,
                        background: "#059669",
                        color: "#FFF",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      👍 Đã Dọn Sạch Hoàn Toàn
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerifySubmit(false)}
                      style={{
                        flex: 1,
                        background: "#DC2626",
                        color: "#FFF",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      👎 Vẫn Còn Rác / Chưa Sạch
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL MÔ PHỎNG QUÉT MÃ QR TRA CỨU SỰ CỐ (SRS ALTERNATIVE FLOW) */}
      {qrModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "16px",
              padding: "24px",
              color: "#FFF",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", color: "#38BDF8", fontWeight: 700 }}>
                📷 Quét Mã QR Tra Cứu Sự Cố
              </h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#94A3B8", margin: "0 0 16px" }}>
              Hướng camera điện thoại vào mã QR in trên biên nhận phản ánh hoặc quét nhanh mã thử nghiệm bên dưới:
            </p>

            <div
              style={{
                width: "180px",
                height: "180px",
                margin: "0 auto 16px",
                background: "#FFF",
                padding: "10px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
              }}
            >
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://greenspot.hcm.gov.vn/tracking/INC-2026-0042"
                alt="Mã QR Tra Cứu Sự Cố"
                style={{ width: "160px", height: "160px" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  setTrackingCodeInput("INC-2026-0042");
                  setQrModalOpen(false);
                  handleSearch("INC-2026-0042");
                }}
                style={{
                  background: "#0284C7",
                  border: "none",
                  color: "#FFF",
                  borderRadius: "8px",
                  padding: "10px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ⚡ Nhận Diện Ngay [INC-2026-0042]
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                style={{
                  background: "#334155",
                  border: "none",
                  color: "#CBD5E1",
                  borderRadius: "8px",
                  padding: "8px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
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
