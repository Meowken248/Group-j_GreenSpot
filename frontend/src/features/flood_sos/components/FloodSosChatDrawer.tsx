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
