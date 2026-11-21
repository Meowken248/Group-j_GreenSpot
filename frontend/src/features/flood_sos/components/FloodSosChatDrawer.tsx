import React, { useState } from "react";
import type { ChatMessageItem } from "../types/flood_sos.types";

interface FloodSosChatDrawerProps {
  isOpen: boolean;
  messages: ChatMessageItem[];
  currentSenderType: "VICTIM" | "RESCUER";
  currentSenderName: string;
  onSendMessage: (content: string) => Promise<void>;
  onClose: () => void;
}

export const FloodSosChatDrawer: React.FC<FloodSosChatDrawerProps> = ({
  isOpen,
  messages,
  currentSenderType,
  currentSenderName,
  onSendMessage,
  onClose,
}) => {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(inputText.trim());
      setInputText("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-drawer" data-testid="chat-drawer">
      <div className="chat-header">
        <div>
          <h4>💬 Trao đổi nhận diện khẩn cấp</h4>
          <small className="chat-sender-info">
            Người gửi: {currentSenderName} ({currentSenderType === "VICTIM" ? "Người cần cứu" : "Đội cứu hộ"})
          </small>
        </div>
        <button
          type="button"
          className="btn-close-chat"
          onClick={onClose}
          aria-label="Đóng chat"
          data-testid="btn-close-chat"
        >
          ✕
        </button>
      </div>

      {/* Thông báo phạm vi tiếp nhận và thông báo cho Ban quản trị/TNV */}
      <div
        className="chat-notification-channel"
        style={{
          background: "#ebf8ff",
          borderBottom: "1px solid #bee3f8",
          padding: "0.45rem 1rem",
          fontSize: "0.75rem",
          color: "#2b6cb0",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
        data-testid="chat-notification-channel"
      >
        <span>📢</span>
        <span>
          <strong>Kênh thông báo đồng bộ:</strong> Tin nhắn được gửi trực tiếp tới{" "}
          <strong>Đội cứu hộ tiếp nhận</strong> và tự động thông báo tới{" "}
          <strong>Ban quản trị & Admin điều phối</strong>.
        </span>
      </div>

      <div className="chat-messages" data-testid="chat-messages-container">
        {messages.map((m) => {
          const typeClass =
            m.sender_type === "SYSTEM"
              ? "system"
              : m.sender_type === "VICTIM"
              ? "victim"
              : "rescuer";

          return (
            <div key={m.message_id} className={`chat-msg ${typeClass}`}>
              <div className="sender">
                {m.sender_type === "SYSTEM"
                  ? "Hệ thống"
                  : m.sender_name || (m.sender_type === "VICTIM" ? "Người gặp nạn" : "Người cứu hộ")}
              </div>
              <div>{m.content}</div>
              {m.sender_type !== "SYSTEM" && (
                <div
                  style={{
                    fontSize: "0.68rem",
                    marginTop: "0.25rem",
                    opacity: 0.85,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <span>✓ Đã thông báo tới Ban quản trị & Đội cứu hộ</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nhập dấu hiệu nhận diện (VD: áo mưa vàng, cờ đỏ...)"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          data-testid="input-chat-message"
        />
        <button type="submit" disabled={isSending} data-testid="btn-send-chat">
          {isSending ? "..." : "Gửi"}
        </button>
      </form>
    </div>
  );
};
