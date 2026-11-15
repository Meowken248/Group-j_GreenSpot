export interface ChatbotPromptSuggestion {
  id: string;
  text: string;
  category: string;
}

export interface ChatbotMessageItem {
  message_id: string;
  conversation_id: string;
  sender_type: "user" | "ai";
  content: string;
  is_out_of_scope: boolean;
  is_stopped: boolean;
  created_at: string;
}

export interface ChatbotConversationItem {
  conversation_id: string;
  title: string;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ChatbotQueryResponse {
  conversation_id: string;
  conversation_title: string;
  user_message: ChatbotMessageItem;
  ai_message: ChatbotMessageItem;
  has_context_warning: boolean;
  context_warning_message?: string;
}

export interface ChatbotConversationListResponse {
  items: ChatbotConversationItem[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface ChatbotConversationDetailResponse extends ChatbotConversationItem {
  messages: ChatbotMessageItem[];
}
