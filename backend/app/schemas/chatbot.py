import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ChatbotPromptSuggestion(BaseModel):
    id: str
    text: str
    category: str


class ChatbotQueryRequest(BaseModel):
    """
    Request gửi câu hỏi cho Trợ lý AI (Màn 1/4 & 2/4):
    - question: Câu hỏi văn bản, bắt buộc, tối đa 500 ký tự theo đặc tả
    - conversation_id: Mã cuộc trò chuyện nếu tiếp tục chuỗi hội thoại cũ
    """
    question: str = Field(..., description="Câu hỏi gửi cho AI (tối đa 500 ký tự)")
    conversation_id: Optional[uuid.UUID] = Field(None, description="ID cuộc trò chuyện (nếu có)")

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Vui lòng nhập câu hỏi, nội dung không được để trống")
        if len(clean) > 500:
            raise ValueError("Câu hỏi tối đa 500 ký tự")
        return clean


class ChatbotMessageResponse(BaseModel):
    """Chi tiết một tin nhắn trong cuộc hội thoại"""
    message_id: uuid.UUID
    conversation_id: uuid.UUID
    sender_type: str = Field(..., description="'user' hoặc 'ai'")
    content: str
    is_out_of_scope: bool = False
    is_stopped: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class ChatbotQueryResponse(BaseModel):
    """Phản hồi sau khi AI trả lời thành công"""
    conversation_id: uuid.UUID
    conversation_title: str
    user_message: ChatbotMessageResponse
    ai_message: ChatbotMessageResponse
    has_context_warning: bool = Field(
        False,
        description="Bật khi hội thoại vượt quá 10 tin nhắn ngữ cảnh (SRS p. 196)"
    )
    context_warning_message: Optional[str] = None


class ChatbotConversationResponse(BaseModel):
    """Thông tin tóm tắt cuộc trò chuyện cho danh sách Màn 3/4"""
    conversation_id: uuid.UUID
    title: str
    message_count: int
    last_message_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    version: int

    class Config:
        from_attributes = True


class ChatbotConversationDetailResponse(ChatbotConversationResponse):
    """Chi tiết cuộc trò chuyện kèm danh sách tin nhắn"""
    messages: List[ChatbotMessageResponse] = []


class ChatbotConversationListResponse(BaseModel):
    """Danh sách cuộc trò chuyện phân trang 10 mục/trang"""
    items: List[ChatbotConversationResponse]
    total: int
    page: int
    size: int
    total_pages: int


class ChatbotStopRequest(BaseModel):
    conversation_id: uuid.UUID


class ChatbotStopResponse(BaseModel):
    success: bool
    message: str = "Đã dừng trả lời"
