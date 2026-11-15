import React, { useEffect, useState } from "react";
import type { ClaimPointResponse } from "../types";

interface PointRewardModalProps {
  data: ClaimPointResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onViewWallet: () => void;
}

export const PointRewardModal: React.FC<PointRewardModalProps> = ({
  data,
  isOpen,
  onClose,
  onViewWallet,
}) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen || !data) return;
    setCountdown(5);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, data, onClose]);

  if (!isOpen || !data) return null;

  return (
    <div
      className="reward-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-modal-title"
    >
      <div
        className="reward-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nhãn POPUP theo quy chuẩn đặc tả báo cáo */}
        <div className="modal-header-tag">POPUP</div>

        {/* Hiệu ứng tia sáng sinh thái & icon vinh danh */}
        <div className="reward-glow-ring">
          <span className="reward-trophy-icon">
            {data.tier_upgraded ? "👑" : "🌱"}
          </span>
        </div>

        {/* Tiêu đề in đậm +{n} ĐIỂM XANH */}
        <h2 id="reward-modal-title" className="reward-points-title">
          +{data.points_awarded} ĐIỂM XANH
        </h2>

        {/* Dòng nội dung giải thích hành vi vừa hoàn thành */}
        <p className="reward-action-subtitle">
          Bạn vừa nhận điểm từ hành động xanh:
        </p>
        <div className="reward-action-badge">
          ✨ {data.action_title}
        </div>

        {/* Hiển thị vinh danh nếu thăng cấp danh hiệu mới */}
        {data.tier_upgraded && (
          <div className="tier-upgrade-banner">
            <span className="tier-star">⭐</span>
            <strong>
              CHÚC MỪNG BẠN ĐÃ THĂNG LÊN {data.upgraded_tier_name?.toUpperCase()}!
            </strong>
            <span className="tier-star">⭐</span>
          </div>
        )}

        {/* Thẻ tóm tắt thông tin số dư & mã giao dịch đối soát */}
        <div className="reward-summary-box">
          <div className="summary-row">
            <span className="label">Số dư mới trong ví:</span>
            <span className="value balance-val">
              {data.new_balance.toLocaleString("vi-VN")} Điểm Xanh
            </span>
          </div>
          <div className="summary-row">
            <span className="label">Cấp hiện tại:</span>
            <span className="value tier-val">
              {data.current_tier.badge_icon} {data.current_tier.tier_name}
            </span>
          </div>
          <div className="summary-row">
            <span className="label">Mã chứng từ:</span>
            <span className="value code-val">{data.transaction_code}</span>
          </div>
        </div>

        {/* Hai nút chức năng theo đặc tả SRS Báo cáo */}
        <div className="modal-actions-row">
          <button
            type="button"
            className="btn-modal-action btn-view-wallet"
            onClick={onViewWallet}
          >
            <span>💳</span>
            <span>Xem ví điểm</span>
          </button>
          <button
            type="button"
            className="btn-modal-action btn-close-modal"
            onClick={onClose}
          >
            <span>Đóng ({countdown}s)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
