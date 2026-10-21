import React, { useState } from "react";
import { AiChatBox } from "./AiChatBox";
import { AiChatHistoryModal } from "./AiChatHistoryModal";
import type { ChatbotMessageItem } from "../types/aiAssistant.types";
import "../styles/AiAssistant.scss";

interface AiAssistantPageProps {
  currentUser?: {
    user_id: string;
    full_name?: string;
    email?: string;
  } | null;
  onNavigateToLogin?: () => void;
  onBackToHome?: () => void;
}

export const AiAssistantPage: React.FC<AiAssistantPageProps> = ({
  currentUser,
  onNavigateToLogin,
  onBackToHome,
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [activeMessages, setActiveMessages] = useState<ChatbotMessageItem[]>([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const isLoggedIn = !!currentUser;
  const currentUserName = currentUser?.full_name || "Bạn";

  const handleSelectConversation = (
    convId: string,
    messages: ChatbotMessageItem[]
  ) => {
    setActiveConversationId(convId);
    setActiveMessages(messages);
  };

  const handleNewChat = () => {
    setActiveConversationId(undefined);
    setActiveMessages([]);
  };

  return (
    <div className="ai-assistant-page" data-testid="ai-assistant-full-page">
      {onBackToHome && (
        <div
          className="ai-page-header-nav"
          style={{
            padding: "0.5rem 1rem",
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={onBackToHome}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              color: "#10b981",
              fontSize: "0.875rem",
            }}
          >
            ← Quay lại Bản đồ
          </button>
        </div>
      )}
      <AiChatBox
        currentUserName={currentUserName}
        isLoggedIn={isLoggedIn}
        onOpenLoginModal={() => setShowLoginPrompt(true)}
        onOpenHistoryModal={() => setIsHistoryOpen(true)}
        activeConversationId={activeConversationId}
        initialMessages={activeMessages}
        onConversationCreated={(id) => setActiveConversationId(id)}
        onNewChat={handleNewChat}
      />

      {/* MÀN 3/4 (Lịch sử) & MÀN 4/4 (Popup Xoá) */}
      <AiChatHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectConversation={handleSelectConversation}
        onStartNewChat={handleNewChat}
      />

      {/* POPUP NHẮC ĐĂNG NHẬP CHO KHÁCH (Màn 1/4) */}
      {showLoginPrompt && (
        <div
          className="ai-modal-overlay"
          style={{ zIndex: 10002 }}
          data-testid="page-login-required-modal"
        >
          <div className="delete-confirm-popup" style={{ maxWidth: "420px" }}>
            <span className="popup-badge" style={{ color: "#10b981" }}>
              XÁC THỰC
            </span>
            <h3>Vui lòng đăng nhập</h3>
            <p>Vui lòng đăng nhập để sử dụng trợ lý AI và lưu lại lịch sử câu hỏi của bạn.</p>
            <div className="popup-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowLoginPrompt(false)}
              >
                Để sau
              </button>
              <button
                type="button"
                className="btn-confirm-delete"
                style={{ background: "#10b981" }}
                data-testid="btn-page-login"
                onClick={() => {
                  setShowLoginPrompt(false);
                  if (onNavigateToLogin) {
                    onNavigateToLogin();
                  } else {
                    window.location.hash = "#auth";
                  }
                }}
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
