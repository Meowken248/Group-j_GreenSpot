import React, { useState, useEffect } from "react";
import type { FundraiserCampaignItem } from "../types/fundraiser.types";
import { fundraiserService } from "../services/fundraiserService";

interface DonationModalProps {
  isOpen: boolean;
  campaign: FundraiserCampaignItem;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000];

export const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  campaign,
  onClose,
  onSuccess,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(50000);
  const [customAmountRaw, setCustomAmountRaw] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const currentAmount = selectedPreset !== null ? selectedPreset : parseInt(customAmountRaw.replace(/\D/g, ""), 10) || 0;

  // Xác định mã ngân hàng cho VietQR chuẩn Napas247
  const getBankCode = (bName?: string | null) => {
    const s = (bName || "").toLowerCase();
    if (s.includes("techcombank")) return "TCB";
    if (s.includes("vietcombank")) return "VCB";
    if (s.includes("vietinbank") || s.includes("công thương")) return "CTG";
    if (s.includes("bidv") || s.includes("đầu tư")) return "BIDV";
    if (s.includes("quân đội") || s.includes("mbbank") || s.includes("mb")) return "MB";
    if (s.includes("sacombank")) return "STB";
    if (s.includes("acb") || s.includes("á châu")) return "ACB";
    if (s.includes("vpbank")) return "VPB";
    if (s.includes("tpbank")) return "TPB";
    return "VCB";
  };

  const bankCode = getBankCode(campaign.bank_name);
  const bankAccountNo = campaign.bank_account_number || "19038291038472";
  const bankAccountOwner = campaign.bank_account_name || "BAN DIEU HANH QUY XANH";
  const qrTransferContent = `Ung ho ${campaign.campaign_id?.slice(0, 6) || "XANH"} ${campaign.title.slice(0, 18)}`;

  const vietQrUrl = `https://img.vietqr.io/image/${bankCode}-${bankAccountNo}-compact2.png?amount=${currentAmount > 0 ? currentAmount : 50000}&addInfo=${encodeURIComponent(qrTransferContent)}&accountName=${encodeURIComponent(bankAccountOwner)}`;

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmountRaw("");
    setErrorText(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPreset(null);
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setCustomAmountRaw("");
      return;
    }
    const num = parseInt(raw, 10);
    setCustomAmountRaw(new Intl.NumberFormat("vi-VN").format(num));
    setErrorText(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (!currentAmount) {
      setErrorText("Vui lòng chọn hoặc nhập số tiền quyên góp");
      return;
    }

    if (currentAmount < 10000) {
      setErrorText("Số tiền tối thiểu là 10.000 VNĐ");
      return;
    }

    if (message.length > 200) {
      setErrorText("Lời nhắn tối đa 200 ký tự");
      return;
    }

    const campId = campaign.campaign_id || campaign.id || "";
    setIsSubmitting(true);
    try {
      await fundraiserService.donate(campId, {
        amount: currentAmount,
        message: message.trim() || undefined,
        is_anonymous: isAnonymous,
      });
      onSuccess(currentAmount);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Thanh toán không thành công. Vui lòng thử lại";
      setErrorText(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fund-modal-overlay"
      data-testid="donation-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="fund-modal-box size-small" data-testid="donation-modal">
        {/* HEADER */}
        <div className="modal-header">
          <div className="header-title-group">
            <span className="popup-badge">POPUP</span>
            <h3>QUYÊN GÓP</h3>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            disabled={isSubmitting}
            onClick={onClose}
            data-testid="btn-close-donation-modal"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="modal-body" data-testid="donation-form">
          <div style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#475569" }}>
            Chiến dịch: <strong>{campaign.title}</strong>
          </div>

          {errorText && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
              }}
              data-testid="donation-error-banner"
            >
              {errorText}
            </div>
          )}

          {/* KHUNG CHỌN SỐ TIỀN */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Chọn số tiền quyên góp
            </label>
            <div className="preset-amounts-grid">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`btn-preset ${selectedPreset === amt ? "active" : ""}`}
                  onClick={() => handlePresetClick(amt)}
                  data-testid={`btn-preset-${amt}`}
                >
                  {new Intl.NumberFormat("vi-VN").format(amt)} đ
                </button>
              ))}
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <label htmlFor="custom-amount-input" style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.3rem" }}>
                Hoặc nhập số tiền khác (tối thiểu 10.000 VNĐ)
              </label>
              <input
                id="custom-amount-input"
                type="text"
                placeholder="Nhập số tiền tuỳ ý (VNĐ)"
                value={customAmountRaw}
                onChange={handleCustomAmountChange}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  border: `1px solid ${currentAmount < 10000 && customAmountRaw ? "#ef4444" : "#e2e8f0"}`,
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
                data-testid="input-custom-donation-amount"
              />
            </div>
          </div>

          {/* KHỐI VIETQR THANH TOÁN TỰ ĐỘNG CHUẨN NAPAS247 */}
          <div className="vietqr-payment-card" data-testid="vietqr-payment-card">
            <div className="vietqr-card-header">
              <span className="napas-badge">NAPAS 24/7 • VIETQR</span>
              <span className="qr-title">Quét mã ngân hàng chuyển khoản nhanh</span>
            </div>

            <div className="vietqr-card-body">
              <div className="qr-image-wrapper">
                <img
                  src={vietQrUrl}
                  alt="Mã VietQR thanh toán tự động"
                  className="qr-img"
                  onError={(e) => {
                    // Fallback placeholder nếu mạng offline
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <span className="qr-guide-text">Mở app Ngân hàng hoặc Ví để quét</span>
              </div>

              <div className="bank-details-box">
                <div className="bank-row">
                  <span className="label">Ngân hàng:</span>
                  <span className="val bold">{campaign.bank_name || "Ngân hàng Việt Nam"}</span>
                </div>
                <div className="bank-row">
                  <span className="label">Số tài khoản:</span>
                  <div className="copy-val-wrap">
                    <span className="val highlight">{bankAccountNo}</span>
                    <button
                      type="button"
                      className="btn-copy-mini"
                      onClick={() => handleCopy(bankAccountNo, "acc")}
                    >
                      {copiedField === "acc" ? "✓ Đã chép" : "Sao chép"}
                    </button>
                  </div>
                </div>
                <div className="bank-row">
                  <span className="label">Chủ tài khoản:</span>
                  <span className="val uppercase">{bankAccountOwner}</span>
                </div>
                <div className="bank-row">
                  <span className="label">Số tiền:</span>
                  <div className="copy-val-wrap">
                    <span className="val amount-text">
                      {new Intl.NumberFormat("vi-VN").format(currentAmount > 0 ? currentAmount : 50000)} đ
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KHỐI CAM KẾT BẢO CHỨNG MINH BẠCH */}
          <div className="trust-assurance-card">
            <span className="shield-icon">🛡️</span>
            <div className="trust-text">
              <strong>Cam kết bảo trợ tài chính GreenSpot:</strong>
              <p>
                100% số tiền ủng hộ được chuyển vào tài khoản thiện nguyện đã kiểm duyệt CCCD/ĐKKD.
                Chủ quỹ có nghĩa vụ công khai minh chứng và hóa đơn chứng từ giải ngân cho toàn thể cộng đồng.
              </p>
            </div>
          </div>

          {/* KHUNG LỜI NHẮN & ẨN DANH */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="donation-message-input" style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              Lời nhắn gửi gắm (không bắt buộc)
            </label>
            <input
              id="donation-message-input"
              type="text"
              maxLength={205}
              placeholder="VD: Chúc chiến dịch thành công tốt đẹp!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
              data-testid="input-donation-message"
            />
            <div style={{ textAlign: "right", fontSize: "0.75rem", color: message.length > 200 ? "#ef4444" : "#94a3b8", marginTop: "0.25rem" }}>
              {message.length}/200 ký tự
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              id="anonymous-checkbox"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
              data-testid="checkbox-anonymous"
            />
            <label htmlFor="anonymous-checkbox" style={{ fontSize: "0.875rem", color: "#334155", cursor: "pointer", userSelect: "none" }}>
              Quyên góp ẩn danh (tên hiển thị là "Mạnh thường quân ẩn danh")
            </label>
          </div>

          {/* FOOTER NÚT XÁC NHẬN */}
          <div className="modal-footer" style={{ margin: "1.25rem -1.5rem -1.5rem" }}>
            <div className="footer-actions-right">
              <button
                type="button"
                className="btn-cancel"
                disabled={isSubmitting}
                onClick={onClose}
                data-testid="btn-cancel-donation"
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="btn-submit-primary"
                disabled={isSubmitting}
                data-testid="btn-confirm-donation"
              >
                {isSubmitting ? "Đang kết nối cổng thanh toán…" : "Xác nhận"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
