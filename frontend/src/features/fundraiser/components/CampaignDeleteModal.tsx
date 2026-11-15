import React, { useState, useEffect } from "react";
import type { FundraiserCampaignItem } from "../types/fundraiser.types";
import { fundraiserService } from "../services/fundraiserService";

interface CampaignDeleteModalProps {
  isOpen: boolean;
  campaign: FundraiserCampaignItem;
  onClose: () => void;
  onDeleted: () => void;
  onClosedEarly: (updated: FundraiserCampaignItem) => void;
}

export const CampaignDeleteModal: React.FC<CampaignDeleteModalProps> = ({
  isOpen,
  campaign,
  onClose,
  onDeleted,
  onClosedEarly,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const campId = campaign.campaign_id || campaign.id || "";
  const hasDonations = campaign.total_donated > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const handleAction = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (hasDonations) {
        // Đã có tiền quyên góp -> Kết thúc sớm
        const updated = await fundraiserService.closeCampaign(campId);
        onClosedEarly(updated);
      } else {
        // Chưa có tiền quyên góp -> Xoá
        await fundraiserService.deleteCampaign(campId);
        onDeleted();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Không thể xử lý yêu cầu. Vui lòng thử lại";
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fund-modal-overlay"
      data-testid="delete-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div className="fund-modal-box size-small" data-testid="campaign-delete-modal">
        {/* HEADER */}
        <div className="modal-header">
          <div className="header-title-group">
            <span className="popup-badge" style={{ color: hasDonations ? "#f59e0b" : "#ef4444" }}>
              POPUP
            </span>
            <h3>{hasDonations ? "KẾT THÚC SỚM CHIẾN DỊCH" : "XOÁ CHIẾN DỊCH?"}</h3>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            disabled={isProcessing}
            onClick={onClose}
            data-testid="btn-close-delete-modal"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          {errorMsg && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                marginBottom: "0.75rem",
                fontSize: "0.85rem",
              }}
              data-testid="delete-error-banner"
            >
              {errorMsg}
            </div>
          )}

          <div
            style={{
              padding: "0.6rem 0.85rem",
              background: "#f1f5f9",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.9rem",
              color: "#1e293b",
              marginBottom: "1rem",
            }}
          >
            {campaign.title}
          </div>

          <p style={{ margin: 0, fontSize: "0.9rem", color: "#475569", lineHeight: 1.55 }}>
            {hasDonations
              ? "Chiến dịch đã nhận quyên góp nên không thể xoá. Bạn có thể kết thúc sớm chiến dịch"
              : "Bạn chắc chắn muốn xoá chiến dịch này? Hành động này không thể hoàn tác."}
          </p>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <div className="footer-actions-right">
            <button
              type="button"
              className="btn-cancel"
              disabled={isProcessing}
              onClick={onClose}
              data-testid="btn-cancel-delete"
            >
              Huỷ
            </button>

            {hasDonations ? (
              <button
                type="button"
                className="btn-close-early-confirm"
                disabled={isProcessing}
                onClick={handleAction}
                data-testid="btn-confirm-close-early"
              >
                {isProcessing ? "Đang xử lý…" : "Kết thúc sớm"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-delete-confirm"
                disabled={isProcessing}
                onClick={handleAction}
                data-testid="btn-confirm-delete"
              >
                {isProcessing ? "Đang xử lý…" : "Xoá"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
