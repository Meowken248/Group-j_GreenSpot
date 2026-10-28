import React, { useEffect } from "react";

interface Screen4SafetyConfirmModalProps {
  sentCount: number;
  hasSmsFallback?: boolean;
  onClose: () => void;
}

export const Screen4SafetyConfirmModal: React.FC<Screen4SafetyConfirmModalProps> = ({
  sentCount,
  hasSmsFallback = false,
  onClose,
}) => {
  // Lắng nghe phím ESC để đóng modal theo yêu cầu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="confirm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="confirm-modal-card">
        {/* Nhãn POPUP góc trái trên đúng Prototype */}
        <span className="alert-modal-tag">POPUP</span>

        {/* Biểu tượng: Icon chiếc khiên xanh lá cây có dấu checkmark trắng */}
        <div className="confirm-shield-icon" aria-hidden="true">
          🛡️
        </div>

        {/* Tiêu đề in đậm: "ĐÃ BÁO AN TOÀN" */}
        <h2 className="confirm-modal-title">ĐÃ BÁO AN TOÀN</h2>

        {/* Thông điệp phản hồi: "Bạn bè đã nhận thông báo" */}
        <div className="confirm-main-msg">Bạn bè đã nhận thông báo</div>

        {/* Dòng phụ: Thông báo đã gửi thành công đến [Số_Người] bạn bè */}
        <div className="confirm-sub-msg">
          Thông báo trạng thái an toàn của bạn đã được gửi thành công đến <strong>{sentCount}</strong> bạn bè trong danh bạ.
        </div>

        {/* Ghi chú SMS Fallback nếu có bạn bè tắt thông báo đẩy */}
        {hasSmsFallback && (
          <div className="sms-fallback-note">
            Đã gửi thông báo. Một số bạn bè tắt thông báo sẽ nhận được tin nhắn SMS thay thế.
          </div>
        )}

        {/* Nút hành động duy nhất: "Đóng" (Hình bầu dục đúng Prototype) */}
        <button
          type="button"
          className="btn-close-confirm-oval"
          onClick={onClose}
          autoFocus
        >
          <span>Đóng</span>
        </button>
      </div>
    </div>
  );
};
