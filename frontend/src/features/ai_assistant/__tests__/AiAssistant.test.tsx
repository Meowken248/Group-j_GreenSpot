import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { AiChatBox } from "../components/AiChatBox";
import { AiChatHistoryModal } from "../components/AiChatHistoryModal";
import { AiAssistantWidget } from "../components/AiAssistantWidget";
import { aiAssistantService } from "../services/aiAssistantService";

// Mock API service
vi.mock("../services/aiAssistantService", () => ({
  aiAssistantService: {
    getSuggestedPrompts: vi.fn(),
    sendQuery: vi.fn(),
    stopGenerating: vi.fn(),
    getConversations: vi.fn(),
    getConversationDetail: vi.fn(),
    deleteConversation: vi.fn(),
  },
}));

describe("Feature STT 24: AI chat box (Trợ lý AI Môi trường & Nền tảng GreenSpot)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    (aiAssistantService.getSuggestedPrompts as any).mockResolvedValue([
      {
        id: "prompt-pin",
        text: "Pin cũ và bình ắc quy thì bỏ vào thùng rác nào?",
        category: "waste",
      },
      {
        id: "prompt-fine",
        text: "Vứt rác sinh hoạt bừa bãi trên vỉa hè bị phạt bao nhiêu tiền?",
        category: "penalty",
      },
      {
        id: "prompt-recycle",
        text: "Tìm trạm tái chế và điểm tiếp nhận rác nguy hại tại TP.HCM",
        category: "facility",
      },
    ]);
  });

  // =========================================================================
  // MÀN 1/4: KHUNG CHAT AI & VALIDATION
  // =========================================================================
  describe("Màn 1/4: Khung chat AI & Soạn thảo câu hỏi", () => {
    it("Hiển thị đầy đủ 2 khối: Khối GỢI Ý (trái) và Khối HỘI THOẠI (phải)", async () => {
      render(
        <AiChatBox
          currentUserName="Anh Tú"
          isLoggedIn={true}
          onOpenLoginModal={vi.fn()}
          onOpenHistoryModal={vi.fn()}
        />
      );

      expect(screen.getByTestId("ai-suggestions-panel")).toBeInTheDocument();
      expect(screen.getByTestId("ai-conversation-panel")).toBeInTheDocument();
      expect(screen.getByTestId("empty-welcome")).toBeInTheDocument();
      expect(screen.getByText(/Xin chào Anh Tú!/i)).toBeInTheDocument();

      // Đợi load câu hỏi gợi ý
      await waitFor(() => {
        expect(
          screen.getByText("Pin cũ và bình ắc quy thì bỏ vào thùng rác nào?")
        ).toBeInTheDocument();
      });
    });

    it("Validation: Nút Gửi bị vô hiệu hóa khi ô nhập trống hoặc chỉ có khoảng trắng", async () => {
      render(
        <AiChatBox
          isLoggedIn={true}
          onOpenLoginModal={vi.fn()}
          onOpenHistoryModal={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("prompt-prompt-pin")).toBeInTheDocument();
      });

      const sendBtn = screen.getByTestId("btn-send-chat");
      const input = screen.getByTestId("input-chat-question");

      expect(sendBtn).toBeDisabled();

      fireEvent.change(input, { target: { value: "   " } });
      expect(sendBtn).toBeDisabled();

      fireEvent.change(input, { target: { value: "Pin cũ bỏ ở đâu?" } });
      expect(sendBtn).not.toBeDisabled();
      expect(screen.getByTestId("char-counter")).toHaveTextContent("16/500");
    });

    it("Validation: Vượt quá 500 ký tự sẽ chuyển màu đỏ và vô hiệu hóa nút Gửi", async () => {
      render(
        <AiChatBox
          isLoggedIn={true}
          onOpenLoginModal={vi.fn()}
          onOpenHistoryModal={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("prompt-prompt-pin")).toBeInTheDocument();
      });

      const input = screen.getByTestId("input-chat-question");
      const longText = "A".repeat(501);

      fireEvent.change(input, { target: { value: longText } });

      const counter = screen.getByTestId("char-counter");
      expect(counter).toHaveClass("overflow");
      expect(counter).toHaveTextContent("501/500");
      expect(screen.getByTestId("btn-send-chat")).toBeDisabled();
    });

    it("Người dùng chưa đăng nhập: Gửi câu hỏi sẽ kích hoạt popup nhắc đăng nhập", async () => {
      const mockLoginModal = vi.fn();
      render(
        <AiChatBox
          isLoggedIn={false}
          onOpenLoginModal={mockLoginModal}
          onOpenHistoryModal={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("prompt-prompt-pin")).toBeInTheDocument();
      });

      const input = screen.getByTestId("input-chat-question");
      expect(input).toBeDisabled();
      expect(
        screen.getByPlaceholderText("Vui lòng đăng nhập để sử dụng trợ lý AI")
      ).toBeInTheDocument();
    });

    it("Bấm thẻ câu hỏi mẫu gợi ý sẽ gửi ngay câu hỏi đó cho AI", async () => {
      (aiAssistantService.sendQuery as any).mockResolvedValue({
        conversation_id: "conv-123",
        conversation_title: "Pin cũ bỏ vào đâu?",
        user_message: {
          message_id: "m-user-1",
          conversation_id: "conv-123",
          sender_type: "user",
          content: "Pin cũ và bình ắc quy thì bỏ vào thùng rác nào?",
          is_out_of_scope: false,
          is_stopped: false,
          created_at: new Date().toISOString(),
        },
        ai_message: {
          message_id: "m-ai-1",
          conversation_id: "conv-123",
          sender_type: "ai",
          content: "Pin cũ là chất thải nguy hại, mang đến trạm tái chế gần nhất.",
          is_out_of_scope: false,
          is_stopped: false,
          created_at: new Date().toISOString(),
        },
        has_context_warning: false,
      });

      render(
        <AiChatBox
          isLoggedIn={true}
          onOpenLoginModal={vi.fn()}
          onOpenHistoryModal={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("prompt-prompt-pin")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("prompt-prompt-pin"));

      await waitFor(() => {
        expect(aiAssistantService.sendQuery).toHaveBeenCalledWith(
          "Pin cũ và bình ắc quy thì bỏ vào thùng rác nào?",
          undefined,
          expect.any(AbortSignal)
        );
        expect(
          screen.getByText("Pin cũ là chất thải nguy hại, mang đến trạm tái chế gần nhất.")
        ).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // MÀN 2/4: AI ĐANG TRẢ LỜI & DỪNG TRẢ LỜI
  // =========================================================================
  describe("Màn 2/4: Trạng thái AI đang trả lời & Nút Dừng trả lời", () => {
    it("Hiển thị nút 'Dừng trả lời' khi AI đang sinh văn bản và ngắt tiến trình khi bấm", async () => {
      // Giả lập API trễ có lắng nghe AbortSignal
      (aiAssistantService.sendQuery as any).mockImplementation(
        (_text: string, _convId?: string, signal?: AbortSignal) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(
              () =>
                resolve({
                  conversation_id: "conv-abc",
                  conversation_title: "Test",
                  user_message: {
                    message_id: "u1",
                    conversation_id: "conv-abc",
                    sender_type: "user",
                    content: "Hỏi",
                    is_out_of_scope: false,
                    is_stopped: false,
                    created_at: new Date().toISOString(),
                  },
                  ai_message: {
                    message_id: "a1",
                    conversation_id: "conv-abc",
                    sender_type: "ai",
                    content: "Đáp",
                    is_out_of_scope: false,
                    is_stopped: false,
                    created_at: new Date().toISOString(),
                  },
                  has_context_warning: false,
                }),
              500
            );

            if (signal) {
              signal.addEventListener("abort", () => {
                clearTimeout(timer);
                const abortErr = new Error("Canceled");
                abortErr.name = "CanceledError";
                reject(abortErr);
              });
            }
          })
      );

      render(
        <AiChatBox
          isLoggedIn={true}
          onOpenLoginModal={vi.fn()}
          onOpenHistoryModal={vi.fn()}
        />
      );

      const input = screen.getByTestId("input-chat-question");
      fireEvent.change(input, { target: { value: "Câu hỏi đang xử lý" } });
      fireEvent.click(screen.getByTestId("btn-send-chat"));

      // Kiểm tra thanh hiển thị đang sinh nội dung
      expect(screen.getByTestId("ai-typing-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("btn-stop-generating")).toBeInTheDocument();

      // Bấm Dừng trả lời
      fireEvent.click(screen.getByTestId("btn-stop-generating"));

      // Sau khi dừng, nút dừng biến mất và mở lại ô nhập
      await waitFor(() => {
        expect(screen.queryByTestId("btn-stop-generating")).not.toBeInTheDocument();
        expect(input).not.toBeDisabled();
      });
    });

    it("Hiển thị thanh cảnh báo màu vàng khi hội thoại vượt quá 10 tin nhắn", async () => {
      const elevenMessages = Array.from({ length: 11 }, (_, i) => ({
        message_id: `msg-${i}`,
        conversation_id: "conv-long",
        sender_type: (i % 2 === 0 ? "user" : "ai") as "user" | "ai",
        content: `Nội dung tin nhắn số ${i + 1}`,
        is_out_of_scope: false,
        is_stopped: false,
        created_at: new Date().toISOString(),
      }));

      render(
        <AiChatBox
          isLoggedIn={true}
          onOpenLoginModal={vi.fn()}
          onOpenHistoryModal={vi.fn()}
          activeConversationId="conv-long"
          initialMessages={elevenMessages}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("prompt-prompt-pin")).toBeInTheDocument();
      });

      expect(screen.getByTestId("context-warning-bar")).toBeInTheDocument();
      expect(
        screen.getByText(/Hội thoại đã dài\. Hãy bắt đầu cuộc trò chuyện mới/i)
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // MÀN 3/4: LỊCH SỬ TRÒ CHUYỆN & MÀN 4/4: POPUP XOÁ
  // =========================================================================
  describe("Màn 3/4 & 4/4: Lịch sử trò chuyện và Popup xác nhận xoá", () => {
    it("Màn 3/4: Hiển thị danh sách cuộc trò chuyện phân trang và hỗ trợ nạp lại", async () => {
      (aiAssistantService.getConversations as any).mockResolvedValue({
        items: [
          {
            conversation_id: "c-1",
            title: "Pin cũ bỏ vào đâu?",
            message_count: 2,
            last_message_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        total_pages: 1,
      });

      (aiAssistantService.getConversationDetail as any).mockResolvedValue({
        conversation_id: "c-1",
        title: "Pin cũ bỏ vào đâu?",
        message_count: 2,
        messages: [
          {
            message_id: "m1",
            conversation_id: "c-1",
            sender_type: "user",
            content: "Pin cũ bỏ ở đâu?",
            is_out_of_scope: false,
            is_stopped: false,
            created_at: new Date().toISOString(),
          },
        ],
      });

      const mockSelect = vi.fn();
      const mockClose = vi.fn();

      render(
        <AiChatHistoryModal
          isOpen={true}
          onClose={mockClose}
          onSelectConversation={mockSelect}
          onStartNewChat={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Pin cũ bỏ vào đâu?")).toBeInTheDocument();
        expect(screen.getByText(/2 tin nhắn/i)).toBeInTheDocument();
      });

      // Bấm "Mở lại"
      fireEvent.click(screen.getByTestId("btn-open-c-1"));

      await waitFor(() => {
        expect(aiAssistantService.getConversationDetail).toHaveBeenCalledWith("c-1");
        expect(mockSelect).toHaveBeenCalledWith("c-1", expect.any(Array));
        expect(mockClose).toHaveBeenCalled();
      });
    });

    it("Màn 4/4: Bấm 'Xoá' mở Popup xác nhận xoá vĩnh viễn và thực hiện gọi API", async () => {
      (aiAssistantService.getConversations as any).mockResolvedValue({
        items: [
          {
            conversation_id: "c-delete",
            title: "Hội thoại thử nghiệm sắp xóa",
            message_count: 4,
            last_message_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        total_pages: 1,
      });
      (aiAssistantService.deleteConversation as any).mockResolvedValue(undefined);

      render(
        <AiChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onSelectConversation={vi.fn()}
          onStartNewChat={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("btn-delete-c-delete")).toBeInTheDocument();
      });

      // Bấm Xoá ở dòng
      fireEvent.click(screen.getByTestId("btn-delete-c-delete"));

      // Hiện Modal Màn 4/4
      const deleteModal = screen.getByTestId("delete-confirm-modal");
      expect(deleteModal).toBeInTheDocument();
      expect(within(deleteModal).getByText("XOÁ LỊCH SỬ?")).toBeInTheDocument();
      expect(
        within(deleteModal).getByText(/Hội thoại thử nghiệm sắp xóa/i)
      ).toBeInTheDocument();

      // Bấm xác nhận xoá
      fireEvent.click(screen.getByTestId("btn-confirm-delete"));

      await waitFor(() => {
        expect(aiAssistantService.deleteConversation).toHaveBeenCalledWith("c-delete");
      });
    });
  });

  // =========================================================================
  // FLOATING WIDGET & INTEGRATION
  // =========================================================================
  describe("Floating Action Button & Widget Mở nhanh", () => {
    it("Hiển thị nút FAB tròn ở góc màn hình và mở popup khi nhấp chuột", async () => {
      render(<AiAssistantWidget />);

      const fab = screen.getByTestId("ai-assistant-fab");
      expect(fab).toBeInTheDocument();

      fireEvent.click(fab);

      expect(screen.getByTestId("ai-widget-overlay")).toBeInTheDocument();
      expect(
        screen.getByText(/GreenSpot AI Environmental & Platform Assistant/i)
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId("prompt-prompt-pin")).toBeInTheDocument();
      });
    });
  });
});
