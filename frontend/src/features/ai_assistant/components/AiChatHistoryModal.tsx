import React, { useState, useEffect } from "react";
import { aiAssistantService } from "../services/aiAssistantService";
import type {
  ChatbotConversationItem,
  ChatbotMessageItem,
} from "../types/aiAssistant.types";
import "../styles/AiAssistant.scss";

interface AiChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (
    conversationId: string,
    messages: ChatbotMessageItem[]
  ) => void;
  onStartNewChat: () => void;
}

export const AiChatHistoryModal: React.FC<AiChatHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectConversation,
  onStartNewChat,
}) => {
  const [conversations, setConversations] = useState<ChatbotConversationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái Popup xóa (Màn 4/4)
  const [conversationToDelete, setConversationToDelete] =
    useState<ChatbotConversationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchConversations = async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await aiAssistantService.getConversations(targetPage, 10);
      setConversations(res.items);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.total_pages);
    } catch {
      setError("Không thể tải lịch sử trò chuyện. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations(1);
    }
  }, [isOpen]);

  const handleOpenConversation = async (conv: ChatbotConversationItem) => {
    try {
      const detail = await aiAssistantService.getConversationDetail(
        conv.conversation_id
      );
      onSelectConversation(conv.conversation_id, detail.messages);
      onClose();
    } catch {
      setError("Cuộc trò chuyện không còn tồn tại.");
      fetchConversations(page);
    }
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;
    setIsDeleting(true);
    try {
      await aiAssistantService.deleteConversation(
        conversationToDelete.conversation_id
      );
      setConversationToDelete(null);
      setToastMessage("Đã xoá cuộc trò chuyện");
      setTimeout(() => setToastMessage(null), 3000);

      // Nếu trang hiện tại không còn dữ liệu sau khi xóa, lùi về trang trước
      const remainingOnPage = conversations.length - 1;
      const targetPage = remainingOnPage === 0 && page > 1 ? page - 1 : page;
      await fetchConversations(targetPage);
    } catch {
      setError("Không thể xoá cuộc trò chuyện. Vui lòng thử lại.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="ai-modal-overlay"
      data-testid="ai-history-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !conversationToDelete) {
          onClose();
        }
      }}
    >
      {/* Toast thông báo nhanh 3 giây */}
      {toastMessage && (
        <div
          data-testid="history-toast"
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "#10b981",
            color: "#ffffff",
            padding: "0.75rem 1.25rem",
            borderRadius: "8px",
            fontWeight: 600,
            zIndex: 10001,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* MÀN 3/4: LỊCH SỬ TRÒ CHUYỆN */}
      <div className="history-modal-content">
        <div className="modal-header">
          <h3>📜 Lịch sử các cuộc trò chuyện ({total})</h3>
          <button
            type="button"
            className="btn-close"
            data-testid="btn-close-history"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
              Đang tải dữ liệu…
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", color: "#ef4444", padding: "1.5rem" }}>
              {error}
            </div>
          ) : conversations.length === 0 ? (
            <div className="empty-history" data-testid="empty-history">
              <p>Bạn chưa có cuộc trò chuyện nào</p>
              <button
                type="button"
                className="btn-create-chat"
                data-testid="btn-empty-new-chat"
                onClick={() => {
                  onStartNewChat();
                  onClose();
                }}
              >
                ➕ Bắt đầu cuộc trò chuyện mới
              </button>
            </div>
          ) : (
            <div className="history-items-list" data-testid="history-items-list">
              {conversations.map((c) => (
                <div
                  key={c.conversation_id}
                  className="history-row"
                  data-testid={`history-item-${c.conversation_id}`}
                >
                  <div
                    className="row-main"
                    onClick={() => handleOpenConversation(c)}
                  >
                    <div className="row-title">{c.title}</div>
                    <div className="row-meta">
                      <span>🕒 {formatDate(c.updated_at || c.created_at)}</span>
                      <span>💬 {c.message_count} tin nhắn</span>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn-open"
                      data-testid={`btn-open-${c.conversation_id}`}
                      onClick={() => handleOpenConversation(c)}
                    >
                      Mở lại
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      data-testid={`btn-delete-${c.conversation_id}`}
                      onClick={() => setConversationToDelete(c)}
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span className="retention-note">
            Cuộc trò chuyện không có hoạt động trong 90 ngày sẽ được hệ thống tự động xoá.
          </span>
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-page"
                disabled={page <= 1 || isLoading}
                onClick={() => fetchConversations(page - 1)}
              >
                ◀ Trước
              </button>
              <span className="page-info">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                className="btn-page"
                disabled={page >= totalPages || isLoading}
                onClick={() => fetchConversations(page + 1)}
              >
                Sau ▶
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MÀN 4/4: POPUP XÁC NHẬN XOÁ LỊCH SỬ */}
      {conversationToDelete && (
        <div
          className="ai-modal-overlay"
          style={{ zIndex: 10000 }}
          data-testid="delete-confirm-modal"
        >
          <div className="delete-confirm-popup">
            <span className="popup-badge">POPUP</span>
            <h3>XOÁ LỊCH SỬ?</h3>
            <div className="target-title">
              "{conversationToDelete.title}" ({conversationToDelete.message_count} tin nhắn)
            </div>
            <p>
              Cuộc trò chuyện sẽ bị xoá vĩnh viễn khỏi tài khoản của bạn và không thể khôi phục.
            </p>
            <div className="popup-actions">
              <button
                type="button"
                className="btn-cancel"
                disabled={isDeleting}
                onClick={() => setConversationToDelete(null)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="btn-confirm-delete"
                data-testid="btn-confirm-delete"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? "Đang xoá…" : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
