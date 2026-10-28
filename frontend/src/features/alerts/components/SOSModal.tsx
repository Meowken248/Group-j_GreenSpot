import React, { useState, useEffect } from "react";
import { alertApi } from "../services/alertApi";

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({ isOpen, onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [incidentType, setIncidentType] = useState<"CHAY_DOC" | "TRAN_HOA_CHAT" | "NUOC_DOC" | "KHAC">("CHAY_DOC");
  const [note, setNote] = useState("");
  const [addressText, setAddressText] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  // Tự động định vị GPS khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessResult(null);
      if ("geolocation" in navigator) {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLat(pos.coords.latitude);
            setLng(pos.coords.longitude);
            setLocating(false);
          },
          (err) => {
            console.warn("Lỗi GPS:", err);
            // Default tọa độ trung tâm TP.HCM nếu không cấp quyền
            setLat(10.8494);
            setLng(106.7584);
            setLocating(false);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        setLat(10.8494);
        setLng(106.7584);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate phone number (SOS_001)
    const cleanPhone = phoneNumber.replace(/[\s\.\-\(\)]/g, "");
    if (!/^0[35789]\d{8}$/.test(cleanPhone)) {
      setErrorMsg("SOS_001: Vui lòng nhập số điện thoại di động Việt Nam 10 chữ số hợp lệ để cán bộ liên hệ xác minh ngay.");
      return;
    }

    if (lat === null || lng === null) {
      setErrorMsg("SOS_002: Vui lòng cho phép định vị vị trí hiện tại của sự cố.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await alertApi.submitSOSAlert({
        phone_number: cleanPhone,
        incident_type: incidentType,
        latitude: lat,
        longitude: lng,
        address_text: addressText || `Tọa độ GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        note: note.trim(),
      });
      setSuccessResult(res);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Lỗi khi gửi tín hiệu SOS.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#0f172a",
          border: "2px solid #ef4444",
          borderRadius: "16px",
          boxShadow: "0 20px 25px -5px rgba(239, 68, 68, 0.3)",
          overflow: "hidden",
          color: "#f8fafc",
        }}
      >
        {/* Header đỏ nguy cấp */}
        <div
          style={{
            background: "linear-gradient(90deg, #b91c1c 0%, #dc2626 100%)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>🚨</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                KÊNH BÁO NGUY CẤP MÔI TRƯỜNG (SOS)
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#fecaca" }}>
                Ưu tiên số 1 - Chuyển tiếp tức thì đến Ban trực ban 24/7
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Nội dung Form */}
        <div style={{ padding: "20px" }}>
          {successResult ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  margin: "0 auto 16px",
                }}
              >
                ✓
              </div>
              <h4 style={{ fontSize: "18px", color: "#22c55e", margin: "0 0 8px" }}>
                ĐÃ PHÁT TÍN HIỆU CỨU NẠN THÀNH CÔNG!
              </h4>
              <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 16px" }}>
                Mã hồ sơ theo dõi khẩn cấp:{" "}
                <strong style={{ color: "#38bdf8", fontSize: "15px" }}>{successResult.tracking_code}</strong>
                <br />
                {successResult.message}
              </p>

              <div
                style={{
                  background: "#1e293b",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "20px",
                  fontSize: "12px",
                  color: "#cbd5e1",
                }}
              >
                Cán bộ phản ứng nhanh đang tiến hành liên hệ xác minh qua số điện thoại{" "}
                <strong style={{ color: "#fbbf24" }}>{phoneNumber}</strong>. Vui lòng giữ máy!
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <a
                  href={`tel:${successResult.hotline}`}
                  style={{
                    flex: 1,
                    background: "#dc2626",
                    color: "#fff",
                    padding: "10px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  📞 Gọi Hotline {successResult.hotline}
                </a>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    background: "#334155",
                    color: "#fff",
                    border: "none",
                    padding: "10px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Đóng Hộp Thoại
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {errorMsg && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid #ef4444",
                    color: "#fca5a5",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "12px",
                    marginBottom: "16px",
                  }}
                >
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Loại nguy cấp */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                  LOẠI SỰ CỐ NGUY CẤP <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[
                    { id: "CHAY_DOC", label: "🔥 Cháy rác khói độc" },
                    { id: "TRAN_HOA_CHAT", label: "☣️ Tràn hóa chất" },
                    { id: "NUOC_DOC", label: "🧪 Nước thải nguy hại" },
                    { id: "KHAC", label: "⚡ Sự cố khẩn cấp khác" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIncidentType(item.id as any)}
                      style={{
                        padding: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: incidentType === item.id ? "2px solid #ef4444" : "1px solid #334155",
                        background: incidentType === item.id ? "rgba(239, 68, 68, 0.2)" : "#1e293b",
                        color: incidentType === item.id ? "#fca5a5" : "#94a3b8",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Số điện thoại */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                  SỐ ĐIỆN THOẠI LIÊN HỆ GẤP <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0912345678 (10 số)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              {/* Tọa độ vị trí */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1" }}>
                    VỊ TRÍ HIỆN TRƯỜNG <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <span style={{ fontSize: "11px", color: locating ? "#fbbf24" : "#22c55e" }}>
                    {locating ? "Đang dò GPS..." : "📍 Đã ghim tọa độ"}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Địa chỉ cụ thể hoặc mốc nhận diện xung quanh..."
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
                {lat && lng && (
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    Tọa độ GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
                  </div>
                )}
              </div>

              {/* Mô tả thêm */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                  MÔ TẢ MỨC ĐỘ NGUY HIỂM / KHÓ THỞ (NẾU CÓ)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Khói đen bốc cao từ bãi rác, mùi hắc nồng nặc làm trẻ em xung quanh bị ho cay mắt..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Nút gửi */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                    border: "none",
                    color: "#fff",
                    padding: "12px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.4)",
                  }}
                >
                  {submitting ? "Đang phát tín hiệu SOS..." : "🚀 GỬI TÍN HIỆU SOS KHẨN CẤP"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
