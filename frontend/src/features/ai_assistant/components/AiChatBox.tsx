import React, { useState, useEffect, useRef } from "react";
import { aiAssistantService } from "../services/aiAssistantService";
import { RichMessage } from "./RichMessage";
import type {
  ChatbotPromptSuggestion,
  ChatbotMessageItem,
} from "../types/aiAssistant.types";
import "../styles/AiAssistant.scss";

interface AiChatBoxProps {
  currentUserName?: string;
  isLoggedIn: boolean;
  onOpenLoginModal: () => void;
  onOpenHistoryModal: () => void;
  activeConversationId?: string;
  initialMessages?: ChatbotMessageItem[];
  onConversationCreated?: (id: string, title: string) => void;
  onNewChat?: () => void;
}

const EMPTY_MESSAGES: ChatbotMessageItem[] = [];

export const AiChatBox: React.FC<AiChatBoxProps> = ({
  currentUserName = "Bạn",
  isLoggedIn,
  onOpenLoginModal,
  onOpenHistoryModal,
  activeConversationId,
  initialMessages = EMPTY_MESSAGES,
  onConversationCreated,
  onNewChat,
}) => {
  const [messages, setMessages] = useState<ChatbotMessageItem[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [suggestedPrompts, setSuggestedPrompts] = useState<ChatbotPromptSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasContextWarning, setHasContextWarning] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(activeConversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Đồng bộ initial messages khi mở lại cuộc trò chuyện từ Màn 3/4
  useEffect(() => {
    if (activeConversationId) {
      setMessages(initialMessages);
      setConversationId(activeConversationId);
      setHasContextWarning(initialMessages.length > 10);
    } else {
      setMessages(initialMessages.length > 0 ? initialMessages : EMPTY_MESSAGES);
      setConversationId(undefined);
      setHasContextWarning(initialMessages.length > 10);
    }
    setErrorMessage(null);
    setRateLimitError(null);
  }, [activeConversationId, initialMessages]);

  // Tải danh sách câu hỏi mẫu gợi ý
  useEffect(() => {
    let mounted = true;
    aiAssistantService
      .getSuggestedPrompts()
      .then((prompts) => {
        if (mounted) setSuggestedPrompts(prompts);
      })
      .catch(() => {
        // Fallback câu hỏi gợi ý nếu offline
        if (mounted) {
          setSuggestedPrompts([
            {
              id: "pin",
              text: "Pin cũ và bình ắc quy thì bỏ vào thùng rác nào?",
              category: "waste",
            },
            {
              id: "fine",
              text: "Vứt rác sinh hoạt bừa bãi trên vỉa hè bị phạt bao nhiêu tiền?",
              category: "penalty",
            },
            {
              id: "recycle",
              text: "Tìm trạm tái chế và điểm tiếp nhận rác nguy hại tại TP.HCM",
              category: "facility",
            },
            {
              id: "points",
              text: "Làm sao để tích luỹ Điểm Xanh và thăng hạng Công dân Xanh?",
              category: "rewards",
            },
          ]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Gửi câu hỏi
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || text.length > 500 || isGenerating) return;

    if (!isLoggedIn) {
      onOpenLoginModal();
      return;
    }

    setErrorMessage(null);
    setRateLimitError(null);

    const nowIso = new Date().toISOString();
    const tempUserMsg: ChatbotMessageItem = {
      message_id: `temp-${Date.now()}`,
      conversation_id: conversationId || "new",
      sender_type: "user",
      content: text,
      is_out_of_scope: false,
      is_stopped: false,
      created_at: nowIso,
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputText("");
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await aiAssistantService.sendQuery(
        text,
        conversationId,
        controller.signal
      );

      setConversationId(res.conversation_id);
      if (!conversationId && onConversationCreated) {
        onConversationCreated(res.conversation_id, res.conversation_title);
      }

      setHasContextWarning(res.has_context_warning);

      // Thay thế tin nhắn tạm bằng tin nhắn thực tế từ server
      setMessages((prev) => [
        ...prev.filter((m) => m.message_id !== tempUserMsg.message_id),
        res.user_message,
        res.ai_message,
      ]);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") {
        // Đã dừng trả lời bởi người dùng
        return;
      }

      if (err?.response?.status === 429) {
        setRateLimitError(
          err.response.data?.detail ||
            "Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau 60 phút"
        );
      } else {
        const errorText =
          err?.code === "ECONNABORTED" || err?.message?.includes("timeout")
            ? "Trợ lý phản hồi chậm. Vui lòng thử lại"
            : "Không thể nhận phản hồi. Vui lòng thử lại";
        setErrorMessage(errorText);

        // Thêm bong bóng tin nhắn lỗi kèm nút Thử lại
        const errorAiMsg: ChatbotMessageItem = {
          message_id: `err-${Date.now()}`,
          conversation_id: conversationId || "new",
          sender_type: "ai",
          content: errorText,
          is_out_of_scope: false,
          is_stopped: false,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorAiMsg]);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Dừng trả lời
  const handleStopGenerating = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);

    if (conversationId) {
      try {
        await aiAssistantService.stopGenerating(conversationId);
      } catch {
        // Bỏ qua lỗi ngắt kết nối
      }
    }

    // Đánh dấu dừng lại cho tin nhắn
    setMessages((prev) => {
      const copy = [...prev];
      if (copy.length > 0 && copy[copy.length - 1].sender_type === "ai") {
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          is_stopped: true,
        };
      }
      return copy;
    });
  };

  // Format thời gian hiển thị (ví dụ 14:30)
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="ai-assistant-container" data-testid="ai-assistant-page">
      {/* KHỐI 1: GỢI Ý (Bên trái) */}
      <section className="ai-suggestions-panel" data-testid="ai-suggestions-panel">
        <div className="panel-header">
          <h3>
            <span className="icon">🌱</span> Câu hỏi thường gặp
          </h3>
        </div>

        <div className="prompts-list">
          {suggestedPrompts.map((p) => (
            <div
              key={p.id}
              className="prompt-card"
              role="button"
              tabIndex={0}
              data-testid={`prompt-${p.id}`}
              onClick={() => handleSendMessage(p.text)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSendMessage(p.text);
                }
              }}
            >
              <span className="prompt-tag">GỢI Ý</span>
              <div className="prompt-text">{p.text}</div>
            </div>
          ))}
        </div>

        <div className="panel-footer-actions">
          <button
            type="button"
            className="btn-history"
            data-testid="btn-open-history"
            onClick={onOpenHistoryModal}
          >
            <span>📜 Lịch sử trò chuyện</span>
          </button>
          <button
            type="button"
            className="btn-new-chat"
            data-testid="btn-start-new-chat"
            onClick={() => {
              if (onNewChat) onNewChat();
              setMessages([]);
              setConversationId(undefined);
              setHasContextWarning(false);
              setErrorMessage(null);
            }}
          >
            <span>➕ Cuộc trò chuyện mới</span>
          </button>
        </div>
      </section>

      {/* KHỐI 2: HỘI THOẠI (Bên phải) */}
      <section className="ai-conversation-panel" data-testid="ai-conversation-panel">
        {/* Header khối hội thoại */}
        <div className="conversation-header">
          <div className="header-info">
            <div className="avatar-robot">🤖</div>
            <div className="title-meta">
              <h2>Trợ lý Môi trường GreenSpot</h2>
              <div className="status-indicator">
                <span className="dot"></span>
                <span>Sẵn sàng hỗ trợ 24/7</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn-action"
              onClick={onOpenHistoryModal}
            >
              Lịch sử
            </button>
          </div>
        </div>

        {/* Cảnh báo ngữ cảnh dài (> 10 tin nhắn) */}
        {hasContextWarning && (
          <div className="context-warning-bar" data-testid="context-warning-bar">
            <span className="warning-icon">⚠️</span>
            <span>
              Hội thoại đã dài. Hãy bắt đầu cuộc trò chuyện mới để có câu trả lời chính xác hơn
            </span>
          </div>
        )}

        {/* Vùng cuộn tin nhắn */}
        <div className="messages-scroll-area" data-testid="messages-scroll-area">
          {messages.length === 0 ? (
            <div className="empty-welcome-card" data-testid="empty-welcome">
              <div className="welcome-avatar">🌿</div>
              <h3>Xin chào {currentUserName}!</h3>
              <p>
                Tôi là Trợ lý AI Sinh thái của GreenSpot. Tôi có thể hỗ trợ bạn phân loại rác,
                tra cứu mức phạt quy định xử phạt theo Nghị định 45/2022/NĐ-CP, tìm trạm tái chế,
                giải đáp về thời tiết – khí hậu, hệ sinh thái và môi trường Trái Đất,
                cùng hướng dẫn sử dụng hệ thống.
              </p>
              <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#10b981" }}>
                Hãy chọn một câu hỏi gợi ý bên trái hoặc nhập câu hỏi bên dưới nhé!
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.message_id}
                className={`message-wrapper ${m.sender_type}`}
                data-testid={`message-${m.sender_type}`}
              >
                <div
                  className={`bubble ${m.is_out_of_scope ? "out-of-scope" : ""} ${
                    m.content.includes("Không thể nhận phản hồi") ||
                    m.content.includes("Trợ lý phản hồi chậm")
                      ? "error-bubble"
                      : ""
                  }`}
                >
                  <RichMessage content={m.content} />
                  {m.is_stopped && (
                    <div className="stopped-badge">Đã dừng trả lời</div>
                  )}
                  {(m.content.includes("Không thể nhận phản hồi") ||
                    m.content.includes("Trợ lý phản hồi chậm")) && (
                    <div>
                      <button
                        type="button"
                        className="btn-retry"
                        onClick={() => {
                          const lastUserMsg = [...messages]
                            .reverse()
                            .find((item) => item.sender_type === "user");
                          if (lastUserMsg) {
                            handleSendMessage(lastUserMsg.content);
                          }
                        }}
                      >
                        🔄 Thử lại
                      </button>
                    </div>
                  )}
                </div>
                <span className="message-time">{formatTime(m.created_at)}</span>
              </div>
            ))
          )}

          {/* Trạng thái AI đang soạn (Màn 2/4) */}
          {isGenerating && (
            <div className="ai-typing-indicator" data-testid="ai-typing-indicator">
              <span>AI đang soạn câu trả lời…</span>
              <div className="dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Thanh nút dừng trả lời khi AI đang sinh nội dung (Màn 2/4) */}
        {isGenerating && (
          <div className="generating-control-bar" data-testid="generating-control-bar">
            <span className="generating-text">Đang nhận dữ liệu từ mô hình AI...</span>
            <button
              type="button"
              className="btn-stop"
              data-testid="btn-stop-generating"
              onClick={handleStopGenerating}
            >
              ⏹ Dừng trả lời
            </button>
          </div>
        )}

        {/* Khuyến cáo pháp lý bắt buộc */}
        <div className="legal-disclaimer-bar">
          Câu trả lời của AI mang tính tham khảo, không thay thế văn bản pháp luật chính thức.
        </div>

        {/* Vùng soạn thảo câu hỏi */}
        <div className="composer-area">
          {rateLimitError && (
            <div className="rate-limit-warning" data-testid="rate-limit-warning">
              {rateLimitError}
            </div>
          )}
          {errorMessage && (
            <div className="rate-limit-warning" style={{ background: "#fef2f2", color: "#b91c1c" }}>
              {errorMessage}
            </div>
          )}

          <div
            className={`composer-box ${
              inputText.length > 500 ? "has-error" : ""
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={2}
              placeholder={
                isLoggedIn
                  ? "Nhập câu hỏi của bạn về môi trường, phân loại rác, quy định xử phạt... (Enter để gửi)"
                  : "Vui lòng đăng nhập để sử dụng trợ lý AI"
              }
              value={inputText}
              disabled={isGenerating || !!rateLimitError || !isLoggedIn}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              data-testid="input-chat-question"
            />
            <div className="composer-controls">
              <span
                className={`char-counter ${
                  inputText.length > 500 ? "overflow" : ""
                }`}
                data-testid="char-counter"
              >
                {inputText.length}/500
              </span>
              <button
                type="button"
                className="btn-send"
                data-testid="btn-send-chat"
                disabled={
                  !inputText.trim() ||
                  inputText.length > 500 ||
                  isGenerating ||
                  !!rateLimitError ||
                  !isLoggedIn
                }
                onClick={() => handleSendMessage()}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
