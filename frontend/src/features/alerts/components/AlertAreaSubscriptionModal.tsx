import React, { useState, useEffect } from "react";
import { alertApi } from "../services/alertApi";
import type { AlertSubscriptionPreference } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
}

const DISTRICT_OPTIONS = [
  { code: "QUAN_1", name: "Quận 1", icon: "🏛️" },
  { code: "QUAN_3", name: "Quận 3", icon: "🌳" },
  { code: "TP_THU_DUC", name: "TP. Thủ Đức", icon: "🏙️" },
  { code: "BINH_THANH", name: "Quận Bình Thạnh", icon: "🌉" },
  { code: "GO_VAP", name: "Quận Gò Vấp", icon: "✈️" },
  { code: "QUAN_7", name: "Quận 7 (Khu Nam)", icon: "⛵" },
  { code: "TAN_BINH", name: "Quận Tân Bình", icon: "🏢" },
  { code: "QUAN_10", name: "Quận 10", icon: "🏥" },
];

export const AlertAreaSubscriptionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
}) => {
  const [districts, setDistricts] = useState<string[]>(["QUAN_1", "QUAN_3", "TP_THU_DUC"]);
  const [minSeverity, setMinSeverity] = useState<string>("ALL");
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [emailAddress, setEmailAddress] = useState(userEmail || "citizen@greenspot.vn");
  const [isMuted, setIsMuted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchSub = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data: AlertSubscriptionPreference = await alertApi.getAlertSubscription(userId);
        if (data) {
          setDistricts(data.subscribed_districts || []);
          setMinSeverity(data.min_severity_level || "ALL");
          setNotifyInApp(data.notify_in_app);
          setNotifyEmail(data.notify_email);
          if (data.email_address) setEmailAddress(data.email_address);
          setIsMuted(data.is_muted);
        }
      } catch (err: any) {
        console.error("Lỗi lấy cấu hình đăng ký:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSub();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleToggleDistrict = (code: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (districts.includes(code)) {
      setDistricts(districts.filter((d) => d !== code));
    } else {
      // SUB_001: Giới hạn tối đa 5 khu vực địa bàn
      if (districts.length >= 5) {
        setErrorMsg("SUB_001: Bạn chỉ có thể đăng ký theo dõi tối đa 5 khu vực địa bàn.");
        return;
      }
      setDistricts([...districts, code]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // SUB_001
    if (districts.length > 5) {
      setErrorMsg("SUB_001: Bạn chỉ có thể đăng ký theo dõi tối đa 5 khu vực địa bàn.");
      return;
    }

    // SUB_002
    if (!isMuted && !notifyInApp && !notifyEmail) {
      setErrorMsg("SUB_002: Vui lòng giữ ít nhất một kênh nhận tin (Web hoặc Email) hoạt động.");
      return;
    }

    // SUB_003
    if (notifyEmail) {
      const emailRegex = /^[\w\.-]+@([\w-]+\.)+[\w-]{2,4}$/;
      if (!emailAddress || !emailRegex.test(emailAddress)) {
        setErrorMsg("SUB_003: Địa chỉ email chưa được xác minh hoặc không đúng định dạng.");
        return;
      }
    }

    try {
      setSaving(true);
      await alertApi.updateAlertSubscription(
        {
          subscribed_districts: districts,
          min_severity_level: minSeverity,
          notify_in_app: notifyInApp,
          notify_email: notifyEmail,
          email_address: emailAddress,
          is_muted: isMuted,
        },
        userId
      );
      setSuccessMsg("Lưu cấu hình sở thích nhận tin cảnh báo thành công!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || "Lỗi lưu cấu hình nhận tin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(3, 7, 18, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#0F172A",
          border: "1px solid #334155",
          borderRadius: "18px",
          maxWidth: "580px",
          width: "100%",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          color: "#F8FAFC",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1E293B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#38BDF8", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚙️</span> Cài Đặt Nhận Tin Cảnh Báo Cá Nhân Hóa (CN 32)
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94A3B8" }}>
              Tùy chỉnh nhận tin tức ô nhiễm sát sườn theo khu vực cư trú của bạn (Tối đa 5 địa bàn).
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#94A3B8", fontSize: "20px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} style={{ padding: "20px 24px" }}>
          {errorMsg && (
            <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #EF4444", borderRadius: "8px", padding: "10px 14px", color: "#FCA5A5", fontSize: "12px", marginBottom: "16px" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid #22C55E", borderRadius: "8px", padding: "10px 14px", color: "#86EFAC", fontSize: "12px", marginBottom: "16px" }}>
              ✅ {successMsg}
            </div>
          )}

          {/* MỤC 1: SUB_CHK_DISTRICTS - Chọn khu vực theo dõi */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9" }}>
                1. Địa bàn bạn quan tâm cư trú (Tối đa 5 khu vực):
              </label>
              <span style={{ fontSize: "12px", color: districts.length > 5 ? "#EF4444" : "#38BDF8", fontWeight: 700 }}>
                {districts.length}/5 khu vực
              </span>
            </div>

            <div id="SUB_CHK_DISTRICTS" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {DISTRICT_OPTIONS.map((d) => {
                const isChecked = districts.includes(d.code);
                return (
                  <label
                    key={d.code}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: isChecked ? "rgba(14, 165, 233, 0.15)" : "#1E293B",
                      border: `1px solid ${isChecked ? "#0284C7" : "#334155"}`,
                      borderRadius: "10px",
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: isChecked ? "#38BDF8" : "#CBD5E1",
                      transition: "all 0.2s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleDistrict(d.code)}
                      style={{ accentColor: "#0284C7" }}
                    />
                    <span>{d.icon}</span>
                    <span style={{ fontWeight: 600 }}>{d.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* MỤC 2: SUB_SLD_MIN_LEVEL - Ngưỡng cảnh báo tối thiểu */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#F1F5F9", marginBottom: "8px" }}>
              2. Ngưỡng mức độ cảnh báo tối thiểu muốn nhận:
            </label>
            <div id="SUB_SLD_MIN_LEVEL" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { code: "ALL", label: "Tất cả cấp độ", desc: "Vàng, Cam, Đỏ" },
                { code: "ORANGE_RED", label: "Chỉ Cam & Đỏ", desc: "Bỏ qua ô nhiễm nhẹ" },
                { code: "RED_ONLY", label: "Chỉ mức Đỏ", desc: "Chỉ nhận sự cố khẩn cấp" },
              ].map((lvl) => (
                <button
                  key={lvl.code}
                  type="button"
                  onClick={() => setMinSeverity(lvl.code)}
                  style={{
                    background: minSeverity === lvl.code ? "#0284C7" : "#1E293B",
                    color: "#FFF",
                    border: `1px solid ${minSeverity === lvl.code ? "#38BDF8" : "#334155"}`,
                    borderRadius: "10px",
                    padding: "8px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700 }}>{lvl.label}</div>
                  <div style={{ fontSize: "10px", color: minSeverity === lvl.code ? "#E0F2FE" : "#94A3B8" }}>{lvl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* MỤC 3: SUB_SWT_IN_APP & SUB_SWT_EMAIL - Kênh nhận tin */}
          <div style={{ marginBottom: "22px", background: "#0B1120", padding: "14px", borderRadius: "12px", border: "1px solid #1E293B" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#F1F5F9", marginBottom: "10px" }}>
              3. Phương thức nhận thông báo đẩy:
            </label>

            {/* In-App Toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#F8FAFC" }}>🔔 Chuông thông báo trên Web (In-App)</div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>Nhận chấm đỏ và tin tức thời gian thực trên thanh điều hướng.</div>
              </div>
              <input
                id="SUB_SWT_IN_APP"
                type="checkbox"
                checked={notifyInApp}
                onChange={(e) => setNotifyInApp(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#0284C7", cursor: "pointer" }}
              />
            </div>

            {/* Email Toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: notifyEmail ? "10px" : "0" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#F8FAFC" }}>📧 Thư điện tử (Email)</div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>Gửi cảnh báo đến hòm thư khi có biến động ô nhiễm khẩn cấp.</div>
              </div>
              <input
                id="SUB_SWT_EMAIL"
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#0284C7", cursor: "pointer" }}
              />
            </div>

            {notifyEmail && (
              <div style={{ marginTop: "8px" }}>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Nhập email của bạn (ví dụ: citizen@greenspot.vn)"
                  style={{
                    width: "100%",
                    background: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#FFF",
                    fontSize: "12px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#1E293B",
                border: "1px solid #334155",
                color: "#94A3B8",
                borderRadius: "10px",
                padding: "9px 18px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Hủy
            </button>
            <button
              id="SUB_BTN_SAVE"
              type="submit"
              disabled={saving || loading}
              style={{
                background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
                border: "none",
                color: "#FFF",
                borderRadius: "10px",
                padding: "9px 22px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.4)",
              }}
            >
              {saving ? "Đang lưu cấu hình..." : "Lưu Cài Đặt (CN 32)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
