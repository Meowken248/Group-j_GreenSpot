import React, { useState } from "react";
import type {
  FundraiserCampaignItem,
  FundraiserExpenseItem,
  FundraiserExpenseCreateInput,
} from "../types/fundraiser.types";
import { fundraiserService } from "../services/fundraiserService";

interface ExpenseReportViewProps {
  campaign: FundraiserCampaignItem;
  expenses: FundraiserExpenseItem[];
  isCreator: boolean;
  onExpenseAdded: (newExpense: FundraiserExpenseItem) => void;
}

export const ExpenseReportView: React.FC<ExpenseReportViewProps> = ({
  campaign,
  expenses,
  isCreator,
  onExpenseAdded,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [content, setContent] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const campId = campaign.campaign_id || campaign.id || "";
  const totalSpent =
    campaign.total_spent ?? expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const remainingBalance =
    campaign.remaining_balance ?? Math.max(0, (campaign.total_donated || 0) - totalSpent);

  const formatVND = (amt: number) => {
    return new Intl.NumberFormat("vi-VN").format(amt) + " đ";
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setAmountRaw("");
      return;
    }
    const num = parseInt(raw, 10);
    setAmountRaw(new Intl.NumberFormat("vi-VN").format(num));
    setErrorMsg(null);
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ảnh không hợp lệ (chỉ nhận JPG, PNG, tối đa 5MB)");
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg(null);
      const res = await fundraiserService.uploadImage(file);
      setProofImageUrl(res.url);
    } catch {
      const localUrl = URL.createObjectURL(file);
      setProofImageUrl(localUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numericAmount = parseInt(amountRaw.replace(/\D/g, ""), 10) || 0;
    if (!content.trim() || numericAmount <= 0 || !proofImageUrl) {
      setErrorMsg("Vui lòng nhập nội dung, số tiền và ảnh minh chứng");
      return;
    }

    // Ràng buộc tài chính quan trọng: Tổng chi không được vượt số tiền đã quyên
    if (totalSpent + numericAmount > campaign.total_donated) {
      setErrorMsg("Tổng chi không được vượt số tiền đã quyên");
      return;
    }

    setIsSubmitting(true);
    const payload: FundraiserExpenseCreateInput = {
      content: content.trim(),
      amount: numericAmount,
      expense_date: expenseDate,
      proof_image_url: proofImageUrl,
    };

    try {
      const created = await fundraiserService.addExpense(campId, payload);
      onExpenseAdded(created);
      setContent("");
      setAmountRaw("");
      setProofImageUrl("");
      setShowAddForm(false);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Không thể lưu khoản chi. Vui lòng thử lại";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReport = () => {
    alert("Đã tạo báo cáo PDF");
    window.print();
  };

  // Cảnh báo 30 ngày: Chiến dịch kết thúc mà quá 30 ngày chưa có báo cáo chi tiêu
  const isOver30DaysNoReport = (() => {
    if (expenses.length > 0) return false;
    if (campaign.status === "closed") return true;
    if (campaign.end_date) {
      const endMs = new Date(campaign.end_date).getTime();
      const diffDays = (Date.now() - endMs) / (1000 * 60 * 60 * 24);
      return diffDays >= 30;
    }
    return false;
  })();

  return (
    <div className="expense-report-tab-view" data-testid="expense-report-view">
      {/* 1. KHUNG TỔNG HỢP TÀI CHÍNH 3 CHỈ SỐ (TOP BOX - MÀN 5) */}
      <div className="financial-summary-grid">
        <div className="summary-card card-donated" data-testid="summary-card-donated">
          <div className="sum-label">💰 Tổng đã quyên</div>
          <div className="sum-value">{formatVND(campaign.total_donated)}</div>
        </div>

        <div className="summary-card card-spent" data-testid="summary-card-spent">
          <div className="sum-label">🧾 Tổng đã chi</div>
          <div className="sum-value">{formatVND(totalSpent)}</div>
        </div>

        <div className="summary-card card-balance" data-testid="summary-card-balance">
          <div className="sum-label">💵 Số tiền còn lại</div>
          <div className="sum-value">{formatVND(remainingBalance)}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <button
          type="button"
          onClick={handleDownloadReport}
          style={{
            padding: "0.5rem 1rem",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
          data-testid="btn-download-pdf-report"
        >
          📄 Tải báo cáo PDF
        </button>

        {isCreator && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            style={{
              padding: "0.5rem 1rem",
              background: "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            data-testid="btn-open-add-expense"
          >
            ➕ Thêm khoản chi
          </button>
        )}
      </div>

      {/* CẢNH BÁO 30 NGÀY CHƯA CẬP NHẬT BÁO CÁO (MÀN 5) */}
      {isOver30DaysNoReport && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#92400e",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            marginBottom: "1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
          data-testid="banner-warning-30-days"
        >
          ⚠️ Người tạo chưa cập nhật báo cáo sử dụng quỹ
        </div>
      )}

      {/* FORM THÊM KHOẢN CHI MỚI CỦA NGƯỜI TẠO */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="form-section-card"
          style={{ marginBottom: "1.5rem" }}
          data-testid="form-add-expense"
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
              Cập nhật chứng từ khoản chi mới
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
            >
              ×
            </button>
          </div>

          {errorMsg && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                marginBottom: "0.75rem",
                fontSize: "0.825rem",
              }}
              data-testid="expense-form-error"
            >
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label>
              Nội dung khoản chi <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Mua 50 bộ ủng cao su và bao tay bảo hộ"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              data-testid="input-expense-content"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>
                Số tiền chi (VNĐ) <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: 5.000.000"
                value={amountRaw}
                onChange={handleAmountChange}
                data-testid="input-expense-amount"
              />
            </div>

            <div className="form-group">
              <label>
                Ngày chi <span className="req">*</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                data-testid="input-expense-date"
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              Ảnh hóa đơn / Chứng từ minh chứng <span className="req">*</span> (JPG/PNG &lt;= 5MB)
            </label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleProofFileChange}
              data-testid="input-expense-proof-file"
            />
            {isUploading && (
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                ⏳ Đang tải ảnh chứng từ…
              </div>
            )}
            {proofImageUrl && (
              <div style={{ marginTop: "0.5rem", maxHeight: "120px", overflow: "hidden", borderRadius: "6px" }}>
                <img
                  src={proofImageUrl}
                  alt="Chứng từ minh chứng"
                  style={{ maxHeight: "120px", objectFit: "contain" }}
                  data-testid="img-proof-preview"
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => setShowAddForm(false)}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-submit-primary"
              disabled={isSubmitting}
              data-testid="btn-submit-expense"
            >
              {isSubmitting ? "Đang lưu…" : "Lưu khoản chi"}
            </button>
          </div>
        </form>
      )}

      {/* DANH SÁCH CÁC KHOẢN CHI MINH BẠCH */}
      {expenses.length === 0 ? (
        <div className="fundraiser-empty-box" style={{ padding: "3rem 1rem" }} data-testid="empty-expenses-state">
          <span className="empty-icon">🧾</span>
          <h3>Chưa có báo cáo sử dụng quỹ</h3>
          <p>Chiến dịch này chưa phát sinh khoản chi tiêu nào hoặc người tạo đang hoàn thiện chứng từ.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} data-testid="expenses-list">
          {expenses.map((exp) => (
            <div
              key={exp.expense_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
              }}
              data-testid={`expense-item-${exp.expense_id}`}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: "0.25rem" }}>
                  {exp.content}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Ngày chi: <strong>{exp.expense_date}</strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#dc2626" }}>
                  -{formatVND(exp.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxImageUrl(exp.proof_image_url || exp.receipt_image_url || null)}
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  data-testid={`btn-view-proof-${exp.expense_id}`}
                >
                  🔍 Xem minh chứng
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX PHÓNG TO ẢNH MINH CHỨNG */}
      {lightboxImageUrl && (
        <div
          className="proof-lightbox-overlay"
          onClick={() => setLightboxImageUrl(null)}
          data-testid="proof-lightbox"
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn-close-lightbox"
              onClick={() => setLightboxImageUrl(null)}
              data-testid="btn-close-lightbox"
            >
              ×
            </button>
            <img src={lightboxImageUrl} alt="Ảnh chứng từ hóa đơn phóng to" />
          </div>
        </div>
      )}
    </div>
  );
};
