import React, { useState, useEffect } from "react";
import { AiChatBox } from "./AiChatBox";
import { AiChatHistoryModal } from "./AiChatHistoryModal";
import type { ChatbotMessageItem } from "../types/aiAssistant.types";
import { AUTH_STORAGE_KEYS } from "../../auth/types/auth.types";
import "../styles/AiAssistant.scss";

interface AiAssistantWidgetProps {
  onNavigateToLogin?: () => void;
}

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({
  onNavigateToLogin,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [activeMessages, setActiveMessages] = useState<ChatbotMessageItem[]>([]);

  // Kiểm tra trạng thái đăng nhập
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  const isLoggedIn = !!token;
  let userFullName = "Bạn";
  try {
    const rawUserInfo = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
    if (rawUserInfo) {
      const parsed = JSON.parse(rawUserInfo);
      if (parsed?.full_name) {
        userFullName = parsed.full_name;
      }
    }
  } catch {
    // fallback mặc định
  }

  // Lắng nghe URL hash `#ai-assistant`
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#ai-assistant") {
        setIsOpen(true);
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  const handleOpenLogin = () => {
    setShowLoginPrompt(true);
  };

  const handleSelectConversationFromHistory = (
    convId: string,
    messages: ChatbotMessageItem[]
  ) => {
    setActiveConversationId(convId);
    setActiveMessages(messages);
  };

  const handleStartNewChat = () => {
    setActiveConversationId(undefined);
    setActiveMessages([]);
  };

  return (
    <>
      {/* 1. NÚT NỔI FLOATING ACTION BUTTON (Góc dưới phải) */}
      {!isOpen && (
        <button
          type="button"
          className="ai-assistant-fab"
          data-testid="ai-assistant-fab"
          title="Trợ lý AI Môi trường GreenSpot"
          onClick={() => setIsOpen(true)}
        >
          <span className="fab-icon">🤖</span>
          <span className="fab-badge">AI</span>
        </button>
      )}

      {/* 2. CỬA SỔ TOÀN MÀN HÌNH / DRAWER TRỢ LÝ AI */}
      {isOpen && (
        <div
          className="ai-modal-overlay"
          data-testid="ai-widget-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1200px",
              height: "90vh",
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Header thanh công cụ cửa sổ trợ lý */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.85rem 1.25rem",
                background: "#0f172a",
                color: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.25rem" }}>🌿</span>
                <span style={{ fontWeight: 700, fontSize: "1rem" }}>
                  GreenSpot AI Environmental & Platform Assistant (STT 24)
                </span>
              </div>
              <button
                type="button"
                data-testid="btn-close-ai-widget"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#cbd5e1",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                onClick={() => {
                  setIsOpen(false);
                  if (window.location.hash === "#ai-assistant") {
                    window.location.hash = "";
                  }
                }}
              >
                ×
              </button>
            </div>

            {/* Thân giao diện AI Chat Box (Màn 1/4 & 2/4) */}
            <div style={{ flex: 1, overflow: "hidden", background: "#f8fafc" }}>
              <AiChatBox
                currentUserName={userFullName}
                isLoggedIn={isLoggedIn}
                onOpenLoginModal={handleOpenLogin}
                onOpenHistoryModal={() => setIsHistoryOpen(true)}
                activeConversationId={activeConversationId}
                initialMessages={activeMessages}
                onConversationCreated={(id) => setActiveConversationId(id)}
                onNewChat={handleStartNewChat}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL LỊCH SỬ TRÒ CHUYỆN (Màn 3/4) & XÓA (Màn 4/4) */}
      <AiChatHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectConversation={handleSelectConversationFromHistory}
        onStartNewChat={handleStartNewChat}
      />

      {/* 4. POPUP NHẮC ĐĂNG NHẬP CHO KHÁCH (Màn 1/4) */}
      {showLoginPrompt && (
        <div
          className="ai-modal-overlay"
          style={{ zIndex: 10002 }}
          data-testid="login-required-modal"
        >
          <div className="delete-confirm-popup" style={{ maxWidth: "400px" }}>
            <span className="popup-badge" style={{ color: "#10b981" }}>
              ĐĂNG NHẬP
            </span>
            <h3>Yêu cầu đăng nhập</h3>
            <p>Vui lòng đăng nhập để sử dụng trợ lý AI và lưu lại lịch sử trò chuyện của bạn.</p>
            <div className="popup-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowLoginPrompt(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-confirm-delete"
                style={{ background: "#10b981" }}
                data-testid="btn-go-to-login"
                onClick={() => {
                  setShowLoginPrompt(false);
                  setIsOpen(false);
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
    </>
  );
};
