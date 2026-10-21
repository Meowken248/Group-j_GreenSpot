import api from "../../../api/client";
import type {
  ChatbotPromptSuggestion,
  ChatbotQueryResponse,
  ChatbotConversationListResponse,
  ChatbotConversationDetailResponse,
} from "../types/aiAssistant.types";

const BASE_URL = "/api/v1/ai/chatbot";

export const aiAssistantService = {
  /**
   * Lấy danh sách câu hỏi mẫu gợi ý (Màn 1/4)
   */
  async getSuggestedPrompts(): Promise<ChatbotPromptSuggestion[]> {
    const res = await api.get<ChatbotPromptSuggestion[]>(`${BASE_URL}/suggested-prompts`);
    return res.data;
  },

  /**
   * Gửi câu hỏi cho AI (Màn 1/4 & 2/4)
   */
  async sendQuery(
    question: string,
    conversationId?: string,
    signal?: AbortSignal
  ): Promise<ChatbotQueryResponse> {
    const res = await api.post<ChatbotQueryResponse>(
      `${BASE_URL}/query`,
      {
        question,
        conversation_id: conversationId || null,
      },
      { signal }
    );
    return res.data;
  },

  /**
   * Dừng sinh nội dung khi AI đang trả lời (Màn 2/4)
   */
  async stopGenerating(conversationId: string): Promise<void> {
    await api.post(`${BASE_URL}/stop`, {
      conversation_id: conversationId,
    });
  },

  /**
   * Lấy danh sách lịch sử cuộc trò chuyện (Màn 3/4)
   */
  async getConversations(
    page: number = 1,
    size: number = 10
  ): Promise<ChatbotConversationListResponse> {
    const res = await api.get<ChatbotConversationListResponse>(`${BASE_URL}/conversations`, {
      params: { page, size },
    });
    return res.data;
  },

  /**
   * Lấy chi tiết cuộc trò chuyện kèm tin nhắn (Màn 3/4 -> Màn 1/4)
   */
  async getConversationDetail(
    conversationId: string
  ): Promise<ChatbotConversationDetailResponse> {
    const res = await api.get<ChatbotConversationDetailResponse>(
      `${BASE_URL}/conversations/${conversationId}`
    );
    return res.data;
  },

  /**
   * Xóa cứng cuộc trò chuyện (Màn 4/4)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`${BASE_URL}/conversations/${conversationId}`);
  },
};
