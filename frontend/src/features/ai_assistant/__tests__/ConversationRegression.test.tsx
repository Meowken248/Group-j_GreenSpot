import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AiAssistantPage } from "../components/AiAssistantPage";
import { aiAssistantService } from "../services/aiAssistantService";

vi.mock("../services/aiAssistantService", () => ({aiAssistantService: {getSuggestedPrompts: vi.fn(), sendQuery: vi.fn(), getConversations: vi.fn()}}));

it("trang AI giữ câu trả lời đầu tiên sau khi server cấp mã hội thoại", async () => {
  vi.mocked(aiAssistantService.getSuggestedPrompts).mockResolvedValue([]);
  const message = {conversation_id: "conv", is_out_of_scope: false, is_stopped: false, created_at: "2026-11-16T01:00:00Z"};
  vi.mocked(aiAssistantService.sendQuery).mockResolvedValue({conversation_id: "conv", conversation_title: "Rác", has_context_warning: false,
    user_message: {...message, message_id: "user", sender_type: "user", content: "Phân loại rác thế nào?"},
    ai_message: {...message, message_id: "ai", sender_type: "ai", content: "Hãy tách riêng rác tái chế."}});
  render(<AiAssistantPage currentUser={{user_id: "u", full_name: "Tú"}}/>);
  fireEvent.change(screen.getByTestId("input-chat-question"), {target: {value: "Phân loại rác thế nào?"}});
  fireEvent.click(screen.getByTestId("btn-send-chat"));
  await waitFor(() => expect(screen.getByText("Hãy tách riêng rác tái chế.")).toBeInTheDocument());
  expect(screen.getByText("Phân loại rác thế nào?")).toBeInTheDocument();
});
